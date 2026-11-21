package com.perfectmotion.ai

import android.content.Context
import android.graphics.Bitmap
import com.google.mediapipe.framework.image.BitmapImageBuilder
import com.google.mediapipe.tasks.core.BaseOptions
import com.google.mediapipe.tasks.vision.core.RunningMode
import com.google.mediapipe.tasks.vision.poselandmarker.PoseLandmarker

/** Uses the same 33-point 3D model for the uploaded reference image. */
object PhotoPoseAnalyzer {
    private const val MAX_SIDE = 1440

    fun detect(context: Context, bitmap: Bitmap): Map<String, Point2> {
        val longest = maxOf(bitmap.width, bitmap.height)
        val working = if (longest > MAX_SIDE) {
            val ratio = MAX_SIDE.toFloat() / longest.toFloat()
            Bitmap.createScaledBitmap(
                bitmap,
                (bitmap.width * ratio).toInt().coerceAtLeast(1),
                (bitmap.height * ratio).toInt().coerceAtLeast(1),
                true
            )
        } else {
            bitmap
        }

        val landmarker = PoseLandmarker.createFromOptions(
            context.applicationContext,
            PoseLandmarker.PoseLandmarkerOptions.builder()
                .setBaseOptions(
                    BaseOptions.builder()
                        .setModelAssetPath("pose_landmarker_lite.task")
                        .build()
                )
                .setRunningMode(RunningMode.IMAGE)
                .setNumPoses(1)
                .setMinPoseDetectionConfidence(0.35f)
                .setMinPosePresenceConfidence(0.35f)
                .build()
        )

        return try {
            val mpImage = BitmapImageBuilder(working).build()
            val result = landmarker.detect(mpImage)
            PoseLandmarkMapper.map(result)
        } finally {
            landmarker.close()
            if (working !== bitmap && !working.isRecycled) working.recycle()
        }
    }
}
