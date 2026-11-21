package com.perfectmotion.ai

data class Point2(
    val x: Float,
    val y: Float
)

object BodyJoints {
    val names = listOf(
        "nose",
        "left_shoulder", "right_shoulder",
        "left_elbow", "right_elbow",
        "left_wrist", "right_wrist",
        "left_hip", "right_hip",
        "left_knee", "right_knee",
        "left_ankle", "right_ankle"
    )

    val bones = listOf(
        "left_shoulder" to "right_shoulder",
        "left_shoulder" to "left_elbow",
        "left_elbow" to "left_wrist",
        "right_shoulder" to "right_elbow",
        "right_elbow" to "right_wrist",
        "left_shoulder" to "left_hip",
        "right_shoulder" to "right_hip",
        "left_hip" to "right_hip",
        "left_hip" to "left_knee",
        "left_knee" to "left_ankle",
        "right_hip" to "right_knee",
        "right_knee" to "right_ankle",
        "nose" to "left_shoulder",
        "nose" to "right_shoulder"
    )
}
