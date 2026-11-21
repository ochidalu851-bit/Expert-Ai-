package com.perfectmotion.ai
import android.graphics.Bitmap
import com.google.android.gms.tasks.Tasks
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.pose.Pose
import com.google.mlkit.vision.pose.PoseDetection
import com.google.mlkit.vision.pose.PoseLandmark
import com.google.mlkit.vision.pose.defaults.PoseDetectorOptions

/** Runs reference-photo pose detection locally, without consuming OpenAI API credits. */
object PhotoPoseAnalyzer {
    private const val MAX_SIDE = 1440
    private const val MIN_CONFIDENCE = 0.30f

    fun detect(bitmap: Bitmap): Map<String, Point2> {
        val longest = maxOf(bitmap.width, bitmap.height)
        val working = if (longest > MAX_SIDE) {
            val ratio = MAX_SIDE.toFloat() / longest
            Bitmap.createScaledBitmap(
                bitmap,
                (bitmap.width * ratio).toInt().coerceAtLeast(1),
                (bitmap.height * ratio).toInt().coerceAtLeast(1),
                true
            )
        } else bitmap

        val detector = PoseDetection.getClient(
            PoseDetectorOptions.Builder()
                .setDetectorMode(PoseDetectorOptions.SINGLE_IMAGE_MODE)
                .build()
        )
        return try {
            val pose = Tasks.await(detector.process(InputImage.fromBitmap(working, 0)))
            mapPose(pose, working.width.toFloat(), working.height.toFloat())
        } finally {
            detector.close()
            if (working !== bitmap && !working.isRecycled) working.recycle()
        }
    }

    private fun mapPose(pose: Pose, width: Float, height: Float): Map<String, Point2> {
        val mapping = listOf(
            "nose" to PoseLandmark.NOSE,
            "left_shoulder" to PoseLandmark.LEFT_SHOULDER,
            "right_shoulder" to PoseLandmark.RIGHT_SHOULDER,
            "left_elbow" to PoseLandmark.LEFT_ELBOW,
            "right_elbow" to PoseLandmark.RIGHT_ELBOW,
            "left_wrist" to PoseLandmark.LEFT_WRIST,
            "right_wrist" to PoseLandmark.RIGHT_WRIST,
            "left_hip" to PoseLandmark.LEFT_HIP,
            "right_hip" to PoseLandmark.RIGHT_HIP,
            "left_knee" to PoseLandmark.LEFT_KNEE,
            "right_knee" to PoseLandmark.RIGHT_KNEE,
            "left_ankle" to PoseLandmark.LEFT_ANKLE,
            "right_ankle" to PoseLandmark.RIGHT_ANKLE
        )
        val result = linkedMapOf<String, Point2>()
        mapping.forEach { (name, type) ->
            val landmark = pose.getPoseLandmark(type) ?: return@forEach
            if (landmark.inFrameLikelihood < MIN_CONFIDENCE) return@forEach
            result[name] = Point2(
                (landmark.position.x / width).coerceIn(0f, 1f),
                (landmark.position.y / height).coerceIn(0f, 1f)
            )
        }
        return result
    }
}
