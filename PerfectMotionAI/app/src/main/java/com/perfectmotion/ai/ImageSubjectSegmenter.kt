package com.perfectmotion.ai

import android.graphics.Bitmap
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.segmentation.Segmentation
import com.google.mlkit.vision.segmentation.selfie.SelfieSegmenterOptions

object ImageSubjectSegmenter {
    fun cutOut(
        bitmap: Bitmap,
        onComplete: (Bitmap?, Exception?) -> Unit
    ) {
        val options = SelfieSegmenterOptions.Builder()
            .setDetectorMode(SelfieSegmenterOptions.SINGLE_IMAGE_MODE)
            .build()
        val segmenter = Segmentation.getClient(options)

        segmenter.process(InputImage.fromBitmap(bitmap, 0))
            .addOnSuccessListener { mask ->
                try {
                    val width = bitmap.width
                    val height = bitmap.height
                    val maskBuffer = mask.buffer
                    maskBuffer.rewind()

                    val pixels = IntArray(width * height)
                    bitmap.getPixels(pixels, 0, width, 0, 0, width, height)

                    if (mask.width == width && mask.height == height) {
                        for (index in pixels.indices) {
                            val foreground = maskBuffer.float.coerceIn(0f, 1f)
                            val oldAlpha = (pixels[index] ushr 24) and 0xFF
                            val alpha = (oldAlpha * foreground).toInt().coerceIn(0, 255)
                            pixels[index] = (pixels[index] and 0x00FFFFFF) or (alpha shl 24)
                        }
                    } else {
                        val maskWidth = mask.width
                        val maskHeight = mask.height
                        val maskValues = FloatArray(maskWidth * maskHeight)
                        for (index in maskValues.indices) {
                            maskValues[index] = maskBuffer.float.coerceIn(0f, 1f)
                        }
                        for (y in 0 until height) {
                            val maskY = (y.toFloat() / height * maskHeight)
                                .toInt().coerceIn(0, maskHeight - 1)
                            for (x in 0 until width) {
                                val maskX = (x.toFloat() / width * maskWidth)
                                    .toInt().coerceIn(0, maskWidth - 1)
                                val index = y * width + x
                                val oldAlpha = (pixels[index] ushr 24) and 0xFF
                                val alpha = (oldAlpha * maskValues[maskY * maskWidth + maskX])
                                    .toInt().coerceIn(0, 255)
                                pixels[index] = (pixels[index] and 0x00FFFFFF) or (alpha shl 24)
                            }
                        }
                    }

                    val cutout = Bitmap.createBitmap(
                        width,
                        height,
                        Bitmap.Config.ARGB_8888
                    )
                    cutout.setPixels(pixels, 0, width, 0, 0, width, height)
                    onComplete(cutout, null)
                } catch (error: Exception) {
                    onComplete(null, error)
                }
            }
            .addOnFailureListener { error ->
                onComplete(null, error)
            }
            .addOnCompleteListener {
                segmenter.close()
            }
    }
}
