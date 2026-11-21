package com.perfectmotion.ai

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.RectF
import android.view.View
import kotlin.math.exp
import kotlin.math.max

/**
 * Applies live landmark-driven 2D mesh deformation to the uploaded image.
 * This is local real-time 2D animation, not full 3D reconstruction.
 */
class AvatarMeshView(context: Context) : View(context) {
    private var bitmap: Bitmap? = null
    private var sourcePose: Map<String, Point2> = emptyMap()
    private var livePose: Map<String, Point2> = emptyMap()

    private val meshColumns = 36
    private val meshRows = 48
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
        if (image == null || reference.isEmpty()) {
            livePose = emptyMap()
        } else if (live.isNotEmpty()) {
            val previous = livePose
            livePose = live.mapValues { (name, target) ->
                val old = previous[name]
                if (old == null) target else Point2(
                    old.x * 0.35f + target.x * 0.65f,
                    old.y * 0.35f + target.y * 0.65f
                )
            }
        }
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
        val usableJoints = usableJoints()
        if (usableJoints.size < 5) {
            canvas.drawBitmap(
                image,
                null,
                RectF(0f, 0f, image.width.toFloat(), image.height.toFloat()),
                paint
            )
            return output
        }

        val exportVertices = FloatArray((meshColumns + 1) * (meshRows + 1) * 2)
        fillMesh(exportVertices, image.width.toFloat(), image.height.toFloat(), usableJoints)
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

        // Center-crop so the uploaded photo occupies the full screen.
        val scale = max(
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

        val usable = usableJoints()
        if (usable.size < 5) {
            canvas.drawBitmap(image, null, imageRect, paint)
            return
        }

        fillMesh(vertices, drawWidth, drawHeight, usable)
        for (index in vertices.indices step 2) {
            vertices[index] += imageRect.left
            vertices[index + 1] += imageRect.top
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

    private fun usableJoints(): List<String> {
        return sourcePose.keys
            .intersect(livePose.keys)
            .filter { it in BodyJoints.names }
    }

    private fun fillMesh(
        target: FloatArray,
        targetWidth: Float,
        targetHeight: Float,
        usableJoints: List<String>
    ) {
        val radius = 0.15f
        var index = 0
        for (row in 0..meshRows) {
            val v = row.toFloat() / meshRows
            for (column in 0..meshColumns) {
                val u = column.toFloat() / meshColumns
                var dx = 0f
                var dy = 0f
                var total = 0f
                usableJoints.forEach { name ->
                    val from = sourcePose[name] ?: return@forEach
                    val to = livePose[name] ?: return@forEach
                    val distance = (u - from.x) * (u - from.x) +
                        (v - from.y) * (v - from.y)
                    val weight = exp(-distance / (2f * radius * radius))
                    dx += (to.x - from.x) * weight
                    dy += (to.y - from.y) * weight
                    total += weight
                }
                if (total > 0.0001f) {
                    dx = (dx / total).coerceIn(-0.45f, 0.45f)
                    dy = (dy / total).coerceIn(-0.45f, 0.45f)
                }
                target[index++] = (u + dx) * targetWidth
                target[index++] = (v + dy) * targetHeight
            }
        }
    }
}
