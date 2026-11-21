package com.perfectmotion.ai

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Camera
import android.graphics.Canvas
import android.graphics.Matrix
import android.graphics.Paint
import android.graphics.RectF
import android.view.View
import kotlin.math.atan2
import kotlin.math.exp
import kotlin.math.max
import kotlin.math.sqrt

/**
 * Depth-assisted 2.5D motion puppet. Live joint changes are retargeted to the
 * uploaded subject; perspective, torso turn and camera-distance scaling add
 * depth cues. A single still photo cannot reveal hidden surfaces or become a
 * complete rotatable 3D human.
 */
class AvatarMeshView(context: Context) : View(context) {
    private var bitmap: Bitmap? = null
    private var sourcePose: Map<String, Point2> = emptyMap()
    private var livePose: Map<String, Point2> = emptyMap()
    private var baselinePose: Map<String, Point2> = emptyMap()

    private val meshColumns = 48
    private val meshRows = 68
    private val vertices = FloatArray((meshColumns + 1) * (meshRows + 1) * 2)
    private val paint = Paint(Paint.ANTI_ALIAS_FLAG or Paint.FILTER_BITMAP_FLAG)
    private val imageRect = RectF()
    private val projectionCamera = Camera()
    private val projectionMatrix = Matrix()

    fun setFrame(
        image: Bitmap?,
        reference: Map<String, Point2>,
        live: Map<String, Point2>,
        baseline: Map<String, Point2>
    ) {
        bitmap = image
        sourcePose = reference
        livePose = live
        baselinePose = baseline
        invalidate()
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        val image = bitmap ?: return
        if (width <= 0 || height <= 0) return

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

        val pairs = jointPairs()
        if (pairs.size < 3) {
            canvas.drawBitmap(image, null, imageRect, paint)
            return
        }

        fillMesh(pairs)
        applyPerspectiveProjection(canvas)
        canvas.drawBitmapMesh(image, meshColumns, meshRows, vertices, 0, null, 0, paint)
        canvas.restore()
    }

    private fun jointPairs(): List<JointPair> {
        val pairs = mutableListOf<JointPair>()
        BodyJoints.names.forEach { name ->
            val source = sourcePose[name] ?: return@forEach
            val baseline = baselinePose[name] ?: return@forEach
            val current = livePose[name] ?: return@forEach
            val target = Point2(
                (source.x + (current.x - baseline.x) * 1.55f).coerceIn(-0.35f, 1.35f),
                (source.y + (current.y - baseline.y) * 1.55f).coerceIn(-0.35f, 1.35f)
            )
            pairs += JointPair(source, target)
        }
        return pairs
    }

    private fun fillMesh(pairs: List<JointPair>) {
        val radius = 0.135f
        var index = 0
        for (row in 0..meshRows) {
            val v = row.toFloat() / meshRows
            for (column in 0..meshColumns) {
                val u = column.toFloat() / meshColumns
                var dx = 0f
                var dy = 0f
                var weightTotal = 0f
                pairs.forEach { pair ->
                    val dist2 = (u - pair.source.x) * (u - pair.source.x) +
                        (v - pair.source.y) * (v - pair.source.y)
                    val weight = exp(-dist2 / (2f * radius * radius))
                    dx += (pair.target.x - pair.source.x) * weight
                    dy += (pair.target.y - pair.source.y) * weight
                    weightTotal += weight
                }
                if (weightTotal > 0.0001f) {
                    dx = (dx / weightTotal).coerceIn(-0.55f, 0.55f)
                    dy = (dy / weightTotal).coerceIn(-0.55f, 0.55f)
                }
                vertices[index++] = imageRect.left + (u + dx) * imageRect.width()
                vertices[index++] = imageRect.top + (v + dy) * imageRect.height()
            }
        }
    }

    /**
     * Relative shoulder width estimates approach/retreat; nose shift against
     * the shoulder line estimates turn; shoulder slope and head drop estimate lean.
     */
    private fun applyPerspectiveProjection(canvas: Canvas) {
        val baseLeft = baselinePose["left_shoulder"]
        val baseRight = baselinePose["right_shoulder"]
        val liveLeft = livePose["left_shoulder"]
        val liveRight = livePose["right_shoulder"]
        val baseWidth = distance(baseLeft, baseRight)
        val currentWidth = distance(liveLeft, liveRight)
        val depthScale = if (baseWidth > 0.04f && currentWidth > 0.01f) {
            (currentWidth / baseWidth).coerceIn(0.78f, 1.25f)
        } else 1f

        val baseMid = midpoint(baseLeft, baseRight)
        val liveMid = midpoint(liveLeft, liveRight)
        val baseNoseOffset = normalizedOffset(baselinePose["nose"], baseMid, baseWidth)
        val liveNoseOffset = normalizedOffset(livePose["nose"], liveMid, currentWidth)
        val yaw = ((liveNoseOffset - baseNoseOffset) * 62f).coerceIn(-24f, 24f)

        val baseAngle = angle(baseLeft, baseRight)
        val liveAngle = angle(liveLeft, liveRight)
        val roll = wrapAngle(liveAngle - baseAngle).times(0.75f).coerceIn(-18f, 18f)

        val baseHeadDrop = (baselinePose["nose"]?.y ?: 0f) - (baseMid?.y ?: 0f)
        val liveHeadDrop = (livePose["nose"]?.y ?: 0f) - (liveMid?.y ?: 0f)
        val pitch = ((liveHeadDrop - baseHeadDrop) * 85f).coerceIn(-16f, 16f)

        val baseHips = midpoint(baselinePose["left_hip"], baselinePose["right_hip"])
        val liveHips = midpoint(livePose["left_hip"], livePose["right_hip"])
        val panX = ((liveHips?.x ?: 0.5f) - (baseHips?.x ?: 0.5f)) * width * 0.48f
        val panY = ((liveHips?.y ?: 0.5f) - (baseHips?.y ?: 0.5f)) * height * 0.36f

        projectionCamera.save()
        projectionCamera.rotateY(yaw)
        projectionCamera.rotateX(pitch)
        projectionCamera.rotateZ(roll)
        projectionCamera.getMatrix(projectionMatrix)
        projectionCamera.restore()
        projectionMatrix.preTranslate(-width / 2f, -height / 2f)
        projectionMatrix.postTranslate(width / 2f, height / 2f)

        canvas.save()
        canvas.concat(projectionMatrix)
        canvas.translate(panX, panY)
        canvas.scale(
            depthScale,
            (0.96f + (depthScale - 1f) * 0.35f).coerceIn(0.88f, 1.10f),
            width / 2f,
            height * 0.53f
        )
    }

    private fun distance(a: Point2?, b: Point2?): Float {
        if (a == null || b == null) return 0f
        val dx = a.x - b.x
        val dy = a.y - b.y
        return sqrt(dx * dx + dy * dy)
    }

    private fun midpoint(a: Point2?, b: Point2?): Point2? {
        if (a == null || b == null) return null
        return Point2((a.x + b.x) / 2f, (a.y + b.y) / 2f)
    }

    private fun angle(a: Point2?, b: Point2?): Float {
        if (a == null || b == null) return 0f
        return Math.toDegrees(atan2((b.y - a.y).toDouble(), (b.x - a.x).toDouble())).toFloat()
    }

    private fun normalizedOffset(point: Point2?, center: Point2?, span: Float): Float {
        if (point == null || center == null || span < 0.01f) return 0f
        return (point.x - center.x) / span
    }

    private fun wrapAngle(degrees: Float): Float {
        var result = degrees
        while (result > 180f) result -= 360f
        while (result < -180f) result += 360f
        return result
    }

    private data class JointPair(val source: Point2, val target: Point2)
}
