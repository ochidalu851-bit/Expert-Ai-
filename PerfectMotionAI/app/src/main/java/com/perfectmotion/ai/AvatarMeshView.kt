package com.perfectmotion.ai

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.RectF
import android.view.View
import kotlin.math.exp
import kotlin.math.min

/**
 * Deforms a regular image mesh using paired source-image and live-camera joints.
 * This is an initial 2D motion-transfer rig; it does not reconstruct hidden body
 * parts or remove the photo background.
 */
class AvatarMeshView(context: Context) : View(context) {
    private var bitmap: Bitmap? = null
    private var sourcePose: Map<String, Point2> = emptyMap()
    private var livePose: Map<String, Point2> = emptyMap()

    private val meshColumns = 22
    private val meshRows = 30
    private val vertices = FloatArray((meshColumns + 1) * (meshRows + 1) * 2)
    private val paint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG)
    private val imageRect = RectF()

    fun setFrame(
        image: Bitmap?,
        reference: Map<String, Point2>,
        live: Map<String, Point2>
    ) {
        bitmap = image
        sourcePose = reference
        livePose = live
        invalidate()
    }

    fun renderFullResolutionFrame(): Bitmap? {
        val image = bitmap ?: return null
        val output = Bitmap.createBitmap(
            image.width,
            image.height,
            Bitmap.Config.ARGB_8888
        )
        val canvas = Canvas(output)
        val bounds = RectF(0f, 0f, image.width.toFloat(), image.height.toFloat())

        val usableJoints = sourcePose.keys
            .intersect(livePose.keys)
            .filter { it in BodyJoints.names }

        if (usableJoints.size < 5) {
            canvas.drawBitmap(image, null, bounds, paint)
            return output
        }

        val exportVertices = FloatArray((meshColumns + 1) * (meshRows + 1) * 2)
        val radius = 0.17f
        var index = 0
        for (row in 0..meshRows) {
            val v = row.toFloat() / meshRows
            for (column in 0..meshColumns) {
                val u = column.toFloat() / meshColumns
                var displacementX = 0f
                var displacementY = 0f
                var totalWeight = 0f

                usableJoints.forEach { name ->
                    val source = sourcePose[name] ?: return@forEach
                    val target = livePose[name] ?: return@forEach
                    val dx = target.x - source.x
                    val dy = target.y - source.y
                    val distanceSquared =
                        (u - source.x) * (u - source.x) +
                        (v - source.y) * (v - source.y)
                    val weight = exp(-distanceSquared / (2f * radius * radius))
                    displacementX += dx * weight
                    displacementY += dy * weight
                    totalWeight += weight
                }

                if (totalWeight > 0.0001f) {
                    displacementX /= totalWeight
                    displacementY /= totalWeight
                }

                exportVertices[index++] = bounds.left + (u + displacementX) * image.width
                exportVertices[index++] = bounds.top + (v + displacementY) * image.height
            }
        }

        canvas.drawBitmapMesh(
            image,
            meshColumns,
            meshRows,
            exportVertices,
            0,
            null,
            0,
            paint
        )
        return output
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        val image = bitmap ?: return
        if (width <= 0 || height <= 0) return

        val scale = min(
            width.toFloat() / image.width.toFloat(),
            height.toFloat() / image.height.toFloat()
        )
        val drawWidth = image.width * scale
        val drawHeight = image.height * scale
        imageRect.set(
            (width - drawWidth) / 2f,
            (height - drawHeight) / 2f,
            (width + drawWidth) / 2f,
            (height + drawHeight) / 2f
        )

        val usableJoints = sourcePose.keys
            .intersect(livePose.keys)
            .filter { it in BodyJoints.names }

        if (usableJoints.size < 5) {
            canvas.drawBitmap(image, null, imageRect, paint)
            return
        }

        val radius = 0.17f
        var vertexIndex = 0
        for (row in 0..meshRows) {
            val v = row.toFloat() / meshRows
            for (column in 0..meshColumns) {
                val u = column.toFloat() / meshColumns
                var displacementX = 0f
                var displacementY = 0f
                var totalWeight = 0f

                usableJoints.forEach { name ->
                    val source = sourcePose[name] ?: return@forEach
                    val target = livePose[name] ?: return@forEach
                    val dx = target.x - source.x
                    val dy = target.y - source.y
                    val distanceSquared =
                        (u - source.x) * (u - source.x) +
                        (v - source.y) * (v - source.y)
                    val weight = exp(-distanceSquared / (2f * radius * radius))
                    displacementX += dx * weight
                    displacementY += dy * weight
                    totalWeight += weight
                }

                if (totalWeight > 0.0001f) {
                    displacementX /= totalWeight
                    displacementY /= totalWeight
                }

                vertices[vertexIndex++] = imageRect.left + (u + displacementX) * drawWidth
                vertices[vertexIndex++] = imageRect.top + (v + displacementY) * drawHeight
            }
        }

        canvas.drawBitmapMesh(
            image,
            meshColumns,
            meshRows,
            vertices,
            0,
            null,
            0,
            paint
        )
    }
}
