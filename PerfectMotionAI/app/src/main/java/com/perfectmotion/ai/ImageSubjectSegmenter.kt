package com.perfectmotion.ai

import android.graphics.Bitmap
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.segmentation.Segmentation
import com.google.mlkit.vision.segmentation.selfie.SelfieSegmenterOptions
import kotlin.math.roundToInt

data class SubjectLayers(
    val background: Bitmap,
    val subject: Bitmap
)

/**
 * Separates the foreground subject from the source photo.
 *
 * The background is kept as a separate, stationary clean plate. The person is
 * returned as a transparent bitmap that can be animated without moving the
 * original background.
 *
 * The clean plate uses edge-to-edge color interpolation inside the foreground
 * mask. This removes the static duplicate subject on simple backgrounds; it is
 * not generative reconstruction and may look imperfect on detailed scenery.
 */
object ImageSubjectSegmenter {
    private const val MAX_SIDE = 1440
    private const val FOREGROUND_THRESHOLD = 0.10f
    private const val MASK_DILATION = 2

    fun prepareLayers(
        source: Bitmap,
        onComplete: (SubjectLayers?, Exception?) -> Unit
    ) {
        val longest = maxOf(source.width, source.height)
        val working = if (longest > MAX_SIDE) {
            val ratio = MAX_SIDE.toFloat() / longest.toFloat()
            Bitmap.createScaledBitmap(
                source,
                (source.width * ratio).roundToInt().coerceAtLeast(1),
                (source.height * ratio).roundToInt().coerceAtLeast(1),
                true
            )
        } else {
            source
        }

        val options = SelfieSegmenterOptions.Builder()
            .setDetectorMode(SelfieSegmenterOptions.SINGLE_IMAGE_MODE)
            .build()
        val segmenter = Segmentation.getClient(options)

        segmenter.process(InputImage.fromBitmap(working, 0))
            .addOnSuccessListener { mask ->
                try {
                    val width = working.width
                    val height = working.height
                    val count = width * height
                    val sourcePixels = IntArray(count)
                    working.getPixels(sourcePixels, 0, width, 0, 0, width, height)

                    val maskValues = readMask(mask, width, height)
                    if (maskValues.none { it > 0.20f }) {
                        throw IllegalStateException("No clear foreground person was detected.")
                    }

                    val subjectPixels = sourcePixels.copyOf()
                    for (index in subjectPixels.indices) {
                        val originalAlpha = (sourcePixels[index] ushr 24) and 0xFF
                        val alpha = (originalAlpha * maskValues[index])
                            .roundToInt().coerceIn(0, 255)
                        subjectPixels[index] =
                            (sourcePixels[index] and 0x00FFFFFF) or (alpha shl 24)
                    }

                    val inpaintMask = createInpaintMask(maskValues, width, height)
                    val backgroundPixels = makeCleanPlate(
                        sourcePixels,
                        inpaintMask,
                        width,
                        height
                    )

                    val background = Bitmap.createBitmap(
                        width,
                        height,
                        Bitmap.Config.ARGB_8888
                    )
                    background.setPixels(backgroundPixels, 0, width, 0, 0, width, height)

                    val subject = Bitmap.createBitmap(
                        width,
                        height,
                        Bitmap.Config.ARGB_8888
                    )
                    subject.setPixels(subjectPixels, 0, width, 0, 0, width, height)

                    onComplete(SubjectLayers(background, subject), null)
                } catch (error: Exception) {
                    onComplete(null, error)
                } finally {
                    if (working !== source && !working.isRecycled) {
                        working.recycle()
                    }
                }
            }
            .addOnFailureListener { error ->
                onComplete(null, error)
                if (working !== source && !working.isRecycled) {
                    working.recycle()
                }
            }
            .addOnCompleteListener {
                segmenter.close()
            }
    }

    private fun readMask(
        mask: com.google.mlkit.vision.segmentation.SegmentationMask,
        imageWidth: Int,
        imageHeight: Int
    ): FloatArray {
        val maskWidth = mask.width
        val maskHeight = mask.height
        val values = FloatArray(imageWidth * imageHeight)
        val buffer = mask.buffer
        buffer.rewind()

        val maskValues = FloatArray(maskWidth * maskHeight)
        for (index in maskValues.indices) {
            maskValues[index] = if (buffer.hasRemaining()) {
                buffer.float.coerceIn(0f, 1f)
            } else {
                0f
            }
        }

        for (y in 0 until imageHeight) {
            val maskY = (y.toFloat() / imageHeight * maskHeight)
                .toInt().coerceIn(0, maskHeight - 1)
            for (x in 0 until imageWidth) {
                val maskX = (x.toFloat() / imageWidth * maskWidth)
                    .toInt().coerceIn(0, maskWidth - 1)
                values[y * imageWidth + x] = maskValues[maskY * maskWidth + maskX]
            }
        }
        return values
    }

    private fun createInpaintMask(
        maskValues: FloatArray,
        width: Int,
        height: Int
    ): BooleanArray {
        val core = BooleanArray(maskValues.size) { index ->
            maskValues[index] >= FOREGROUND_THRESHOLD
        }
        val expanded = core.copyOf()

        for (y in 0 until height) {
            for (x in 0 until width) {
                val index = y * width + x
                if (!core[index]) continue
                for (dy in -MASK_DILATION..MASK_DILATION) {
                    val ny = y + dy
                    if (ny !in 0 until height) continue
                    for (dx in -MASK_DILATION..MASK_DILATION) {
                        val nx = x + dx
                        if (nx in 0 until width) {
                            expanded[ny * width + nx] = true
                        }
                    }
                }
            }
        }
        return expanded
    }

    /**
     * Builds a stationary clean plate by interpolating from unmasked pixels
     * across scan lines. Horizontal and vertical candidates are averaged where
     * both exist, with directional fallbacks at the image edges.
     */
    private fun makeCleanPlate(
        source: IntArray,
        mask: BooleanArray,
        width: Int,
        height: Int
    ): IntArray {
        val count = source.size
        val horizontal = IntArray(count)
        val vertical = IntArray(count)
        val hasHorizontal = BooleanArray(count)
        val hasVertical = BooleanArray(count)

        for (y in 0 until height) {
            var x = 0
            while (x < width) {
                if (!mask[y * width + x]) {
                    x++
                    continue
                }
                val start = x
                while (x < width && mask[y * width + x]) x++
                val end = x - 1
                val left = start - 1
                val right = x

                for (fillX in start..end) {
                    val index = y * width + fillX
                    when {
                        left >= 0 && right < width -> {
                            val t = (fillX - left).toFloat() / (right - left).toFloat()
                            horizontal[index] = mixColor(source[y * width + left], source[y * width + right], t)
                            hasHorizontal[index] = true
                        }
                        left >= 0 -> {
                            horizontal[index] = source[y * width + left]
                            hasHorizontal[index] = true
                        }
                        right < width -> {
                            horizontal[index] = source[y * width + right]
                            hasHorizontal[index] = true
                        }
                    }
                }
            }
        }

        for (x in 0 until width) {
            var y = 0
            while (y < height) {
                if (!mask[y * width + x]) {
                    y++
                    continue
                }
                val start = y
                while (y < height && mask[y * width + x]) y++
                val end = y - 1
                val top = start - 1
                val bottom = y

                for (fillY in start..end) {
                    val index = fillY * width + x
                    when {
                        top >= 0 && bottom < height -> {
                            val t = (fillY - top).toFloat() / (bottom - top).toFloat()
                            vertical[index] = mixColor(source[top * width + x], source[bottom * width + x], t)
                            hasVertical[index] = true
                        }
                        top >= 0 -> {
                            vertical[index] = source[top * width + x]
                            hasVertical[index] = true
                        }
                        bottom < height -> {
                            vertical[index] = source[bottom * width + x]
                            hasVertical[index] = true
                        }
                    }
                }
            }
        }

        val result = source.copyOf()
        for (index in result.indices) {
            if (!mask[index]) continue
            result[index] = when {
                hasHorizontal[index] && hasVertical[index] ->
                    mixColor(horizontal[index], vertical[index], 0.5f)
                hasHorizontal[index] -> horizontal[index]
                hasVertical[index] -> vertical[index]
                else -> source[index]
            }
        }
        return result
    }

    private fun mixColor(first: Int, second: Int, amount: Float): Int {
        val t = amount.coerceIn(0f, 1f)
        fun channel(shift: Int): Int {
            val a = (first ushr shift) and 0xFF
            val b = (second ushr shift) and 0xFF
            return (a + (b - a) * t).roundToInt().coerceIn(0, 255)
        }
        return (channel(24) shl 24) or
            (channel(16) shl 16) or
            (channel(8) shl 8) or
            channel(0)
    }
}
