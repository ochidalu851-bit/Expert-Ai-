package com.perfectmotion.ai

import com.google.mediapipe.tasks.vision.poselandmarker.PoseLandmarkerResult

data class Point3(
    val x: Float,
    val y: Float,
    val z: Float
)

data class Point2(
    val x: Float,
    val y: Float,
    val z: Float = 0f,
    val world: Point3? = null,
    val visibility: Float = 1f
)

/**
 * MediaPipe's 33-point body layout, in official landmark index order.
 * Image coordinates are normalized; world coordinates are in metres.
 */
object PoseLandmarkMapper {
    val landmarkNames = listOf(
        "nose",
        "left_eye_inner", "left_eye", "left_eye_outer",
        "right_eye_inner", "right_eye", "right_eye_outer",
        "left_ear", "right_ear",
        "mouth_left", "mouth_right",
        "left_shoulder", "right_shoulder",
        "left_elbow", "right_elbow",
        "left_wrist", "right_wrist",
        "left_pinky", "right_pinky",
        "left_index", "right_index",
        "left_thumb", "right_thumb",
        "left_hip", "right_hip",
        "left_knee", "right_knee",
        "left_ankle", "right_ankle",
        "left_heel", "right_heel",
        "left_foot_index", "right_foot_index"
    )

    fun map(result: PoseLandmarkerResult): Map<String, Point2> {
        val imageLandmarks = result.landmarks().firstOrNull() ?: return emptyMap()
        val worldLandmarks = result.worldLandmarks().firstOrNull().orEmpty()
        val mapped = linkedMapOf<String, Point2>()

        landmarkNames.forEachIndexed { index, name ->
            val landmark = imageLandmarks.getOrNull(index) ?: return@forEachIndexed
            val visibility = landmark.visibility().orElse(1f)
            val presence = landmark.presence().orElse(1f)
            if (visibility < 0.30f || presence < 0.30f) return@forEachIndexed

            val worldLandmark = worldLandmarks.getOrNull(index)
            mapped[name] = Point2(
                x = landmark.x().coerceIn(-0.15f, 1.15f),
                y = landmark.y().coerceIn(-0.15f, 1.15f),
                z = landmark.z(),
                world = worldLandmark?.let {
                    Point3(it.x(), it.y(), it.z())
                },
                visibility = minOf(visibility, presence)
            )
        }
        return mapped
    }
}

object BodyJoints {
    val names = PoseLandmarkMapper.landmarkNames

    // MediaPipe pose connections, including the face outline, shoulders, arms,
    // hands, torso, legs and feet.
    val bones = listOf(
        "nose" to "left_eye_inner",
        "left_eye_inner" to "left_eye",
        "left_eye" to "left_eye_outer",
        "left_eye_outer" to "left_ear",
        "nose" to "right_eye_inner",
        "right_eye_inner" to "right_eye",
        "right_eye" to "right_eye_outer",
        "right_eye_outer" to "right_ear",
        "mouth_left" to "mouth_right",
        "left_shoulder" to "left_ear",
        "right_shoulder" to "right_ear",
        "left_shoulder" to "right_shoulder",
        "left_shoulder" to "left_elbow",
        "left_elbow" to "left_wrist",
        "left_wrist" to "left_pinky",
        "left_wrist" to "left_index",
        "left_wrist" to "left_thumb",
        "right_shoulder" to "right_elbow",
        "right_elbow" to "right_wrist",
        "right_wrist" to "right_pinky",
        "right_wrist" to "right_index",
        "right_wrist" to "right_thumb",
        "left_shoulder" to "left_hip",
        "right_shoulder" to "right_hip",
        "left_hip" to "right_hip",
        "left_hip" to "left_knee",
        "left_knee" to "left_ankle",
        "left_ankle" to "left_heel",
        "left_ankle" to "left_foot_index",
        "right_hip" to "right_knee",
        "right_knee" to "right_ankle",
        "right_ankle" to "right_heel",
        "right_ankle" to "right_foot_index"
    )
}
