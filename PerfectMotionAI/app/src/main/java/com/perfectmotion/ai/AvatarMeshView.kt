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
 * Draws a stationary, inpainted background and animates only the segmented
 * foreground person. The mesh is influenced by body bones and joints rather
 * than warping the original full photograph.
 *
 * This is a 2.5D single-image puppet, not a reconstructed 3D human model.
 */
class AvatarMeshView(context: Context) : View(context) {
    private var backgroundBitmap: Bitmap? = null
    private var subjectBitmap: Bitmap? = null
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
        background: Bitmap?,
        subject: Bitmap?,
        reference: Map<String, Point2>,
        live: Map<String, Point2>,
        baseline: Map<String, Point2>
    ) {
        backgroundBitmap = background
        subjectBitmap = subject
        sourcePose = reference
        livePose = live
        baselinePose = baseline
        invalidate()
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        val background = backgroundBitmap ?: subjectBitmap ?: return
        if (width <= 0 || height <= 0) return

        val scale = max(
            width.toFloat() / background.width.toFloat(),
            height.toFloat() / background.height.toFloat()
        )
        val drawWidth = background.width * scale
        val drawHeight = background.height * scale
        imageRect.set(
            (width - drawWidth) / 2f,
            (height - drawHeight) / 2f,
            (width + drawWidth) / 2f,
            (height + drawHeight) / 2f
        )

        // The clean plate is drawn once and is never transformed by the live pose.
        canvas.drawBitmap(background, null, imageRect, paint)

        val subject = subjectBitmap ?: return
        val bones = boneMotions()
        val joints = jointMotions()
        if (bones.isEmpty() && joints.size < 3) {
            canvas.drawBitmap(subject, null, imageRect, paint)
            return
        }

        fillMesh(bones, joints)
        applyPerspectiveProjection(canvas)
        canvas.drawBitmapMesh(subject, meshColumns, meshRows, vertices, 0, null, 0, paint)
        canvas.restore()
    }

    private fun jointMotions(): Map<String, JointMotion> {
        val result = linkedMapOf<String, JointMotion>()
        BodyJoints.names.forEach { name ->
            val source = sourcePose[name] ?: return@forEach
            val baseline = baselinePose[name] ?: return@forEach
            val current = livePose[name] ?: return@forEach
            val target = Point2(
                x = (source.x + (current.x - baseline.x) * 1.55f).coerceIn(-0.25f, 1.25f),
                y = (source.y + (current.y - baseline.y) * 1.55f).coerceIn(-0.25f, 1.25f),
                z = source.z + (current.z - baseline.z) * 1.35f,
                world = current.world,
                visibility = current.visibility
            )
            result[name] = JointMotion(source, target)
        }
        return result
    }

    private fun boneMotions(): List<BoneMotion> {
        val joints = jointMotions()
        return BodyJoints.bones.mapNotNull { (startName, endName) ->
            val start = joints[startName] ?: return@mapNotNull null
            val end = joints[endName] ?: return@mapNotNull null
            BoneMotion(start, end)
        }
    }

    /**
     * Local bone influence makes elbows, knees and shoulders bend independently.
     * Vertices far from the skeleton receive no displacement, preventing the
     * whole photo/background from drifting with every camera movement.
     */
    private fun fillMesh(bones: List<BoneMotion>, joints: Map<String, JointMotion>) {
        val boneRadius = 0.105f
        val jointRadius = 0.075f
        var index = 0

        for (row in 0..meshRows) {
            val v = row.toFloat() / meshRows
            for (column in 0..meshColumns) {
                val u = column.toFloat() / meshColumns
                var dx = 0f
                var dy = 0f
                var weightTotal = 0f

                bones.forEach { bone ->
                    val ax = bone.start.source.x
                    val ay = bone.start.source.y
                    val vx = bone.end.source.x - ax
                    val vy = bone.end.source.y - ay
                    val lengthSquared = vx * vx + vy * vy
                    if (lengthSquared > 0.00001f) {
                        val t = (((u - ax) * vx + (v - ay) * vy) / lengthSquared)
                            .coerceIn(0f, 1f)
                        val closestX = ax + vx * t
                        val closestY = ay + vy * t
                        val ddx = u - closestX
                        val ddy = v - closestY
                        val distanceSquared = ddx * ddx + ddy * ddy
                        if (distanceSquared <= boneRadius * boneRadius * 8f) {
                            val weight = exp(-distanceSquared / (2f * boneRadius * boneRadius))
                            val startDx = bone.start.target.x - bone.start.source.x
                            val startDy = bone.start.target.y - bone.start.source.y
                            val endDx = bone.end.target.x - bone.end.source.x
                            val endDy = bone.end.target.y - bone.end.source.y
                            dx += (startDx + (endDx - startDx) * t) * weight
                            dy += (startDy + (endDy - startDy) * t) * weight
                            weightTotal += weight
                        }
                    }
                }

                joints.values.forEach { joint ->
                    val ddx = u - joint.source.x
                    val ddy = v - joint.source.y
                    val distanceSquared = ddx * ddx + ddy * ddy
                    if (distanceSquared <= jointRadius * jointRadius * 8f) {
                        val weight = exp(-distanceSquared / (2f * jointRadius * jointRadius))
                        dx += (joint.target.x - joint.source.x) * weight
                        dy += (joint.target.y - joint.source.y) * weight
                        weightTotal += weight
                    }
                }

                if (weightTotal > 0.0001f) {
                    dx = (dx / weightTotal).coerceIn(-0.32f, 0.32f)
                    dy = (dy / weightTotal).coerceIn(-0.32f, 0.32f)
                } else {
                    dx = 0f
                    dy = 0f
                }

                vertices[index++] = imageRect.left + (u + dx) * imageRect.width()
                vertices[index++] = imageRect.top + (v + dy) * imageRect.height()
            }
        }
    }

    /**
     * Depth cues are applied to the cut-out subject only because the background
     * has already been drawn before this transformation is saved.
     */
    private fun applyPerspectiveProjection(canvas: Canvas) {
        val baseLeft = baselinePose["left_shoulder"]
        val baseRight = baselinePose["right_shoulder"]
        val liveLeft = livePose["left_shoulder"]
        val liveRight = livePose["right_shoulder"]
        val baseWidth = distance(baseLeft, baseRight)
        val currentWidth = distance(liveLeft, liveRight)
        val shoulderWidthScale = if (baseWidth > 0.04f && currentWidth > 0.01f) {
            (currentWidth / baseWidth).coerceIn(0.88f, 1.14f)
        } else 1f
        val baseDepth = ((baselinePose["left_shoulder"]?.z ?: 0f) +
            (baselinePose["right_shoulder"]?.z ?: 0f)) / 2f
        val liveDepth = ((livePose["left_shoulder"]?.z ?: baseDepth) +
            (livePose["right_shoulder"]?.z ?: baseDepth)) / 2f
        // MediaPipe's normalized z gets smaller as a point approaches the camera.
        val zDepthScale = (1f + (baseDepth - liveDepth) * 0.72f).coerceIn(0.90f, 1.10f)
        val depthScale = (shoulderWidthScale * zDepthScale).coerceIn(0.82f, 1.18f)

        val baseMid = midpoint(baseLeft, baseRight)
        val liveMid = midpoint(liveLeft, liveRight)
        val baseNoseOffset = normalizedOffset(baselinePose["nose"], baseMid, baseWidth)
        val liveNoseOffset = normalizedOffset(livePose["nose"], liveMid, currentWidth)
        val yaw = ((liveNoseOffset - baseNoseOffset) * 42f).coerceIn(-16f, 16f)

        val baseAngle = angle(baseLeft, baseRight)
        val liveAngle = angle(liveLeft, liveRight)
        val roll = wrapAngle(liveAngle - baseAngle).times(0.55f).coerceIn(-12f, 12f)

        val baseHeadDrop = (baselinePose["nose"]?.y ?: 0f) - (baseMid?.y ?: 0f)
        val liveHeadDrop = (livePose["nose"]?.y ?: 0f) - (liveMid?.y ?: 0f)
        val pitch = ((liveHeadDrop - baseHeadDrop) * 60f).coerceIn(-12f, 12f)

        val baseHips = midpoint(baselinePose["left_hip"], baselinePose["right_hip"])
        val liveHips = midpoint(livePose["left_hip"], livePose["right_hip"])
        val panX = ((liveHips?.x ?: 0.5f) - (baseHips?.x ?: 0.5f)) * width * 0.22f
        val panY = ((liveHips?.y ?: 0.5f) - (baseHips?.y ?: 0.5f)) * height * 0.18f

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
            (0.98f + (depthScale - 1f) * 0.25f).coerceIn(0.92f, 1.08f),
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

    private data class JointMotion(val source: Point2, val target: Point2)
    private data class BoneMotion(val start: JointMotion, val end: JointMotion)
}
