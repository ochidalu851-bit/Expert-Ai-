package com.perfectmotion.ai

import android.content.Context
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.util.Log
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import com.google.mediapipe.framework.image.BitmapImageBuilder
import com.google.mediapipe.tasks.core.BaseOptions
import com.google.mediapipe.tasks.vision.core.ImageProcessingOptions
import com.google.mediapipe.tasks.vision.core.RunningMode
import com.google.mediapipe.tasks.vision.poselandmarker.PoseLandmarker
import kotlin.math.abs

/**
 * On-device, continuous 33-point pose tracking.
 *
 * The detector runs in MediaPipe LIVE_STREAM mode and returns both normalized
 * image coordinates and 3D world coordinates. A light temporal filter reduces
 * jitter while preserving responsive movement.
 */
class PoseAnalyzer(
    context: Context,
    private val onPose: (Map<String, Point2>) -> Unit
) : ImageAnalysis.Analyzer {
    private val mainHandler = Handler(Looper.getMainLooper())
    private val lock = Any()
    private var previousPose: Map<String, Point2> = emptyMap()
    @Volatile private var isClosed = false

    private val landmarker: PoseLandmarker = PoseLandmarker.createFromOptions(
        context.applicationContext,
        PoseLandmarker.PoseLandmarkerOptions.builder()
            .setBaseOptions(
                BaseOptions.builder()
                    .setModelAssetPath("pose_landmarker_lite.task")
                    .build()
            )
            .setRunningMode(RunningMode.LIVE_STREAM)
            .setNumPoses(1)
            .setMinPoseDetectionConfidence(0.45f)
            .setMinPosePresenceConfidence(0.45f)
            .setMinTrackingConfidence(0.45f)
            .setOutputSegmentationMasks(false)
            .setResultListener { result, _ ->
                if (isClosed) return@setResultListener
                val detected = PoseLandmarkMapper.map(result)
                if (detected.isNotEmpty()) {
                    val filtered = smooth(detected)
                    mainHandler.post {
                        if (!isClosed) onPose(filtered)
                    }
                }
            }
            .setErrorListener { error ->
                Log.w("PerfectMotionAI", "MediaPipe pose tracking error", error)
            }
            .build()
    )

    override fun analyze(imageProxy: ImageProxy) {
        if (isClosed) {
            imageProxy.close()
            return
        }

        try {
            // Convert CameraX's YUV frame to a bitmap so CameraX can release the
            // ImageProxy immediately while MediaPipe processes the copied frame.
            val bitmap = imageProxy.toBitmap()
            val mpImage = BitmapImageBuilder(bitmap).build()
            val processingOptions = ImageProcessingOptions.builder()
                .setRotationDegrees(imageProxy.imageInfo.rotationDegrees)
                .build()

            landmarker.detectAsync(
                mpImage,
                processingOptions,
                SystemClock.uptimeMillis()
            )
        } catch (error: Exception) {
            Log.w("PerfectMotionAI", "Could not submit camera frame to MediaPipe", error)
        } finally {
            imageProxy.close()
        }
    }

    private fun smooth(next: Map<String, Point2>): Map<String, Point2> {
        synchronized(lock) {
            val alpha = 0.62f
            val filtered = next.mapValues { (name, current) ->
                val previous = previousPose[name]
                if (previous == null || abs(current.x - previous.x) > 0.42f ||
                    abs(current.y - previous.y) > 0.42f
                ) {
                    current
                } else {
                    Point2(
                        x = previous.x + (current.x - previous.x) * alpha,
                        y = previous.y + (current.y - previous.y) * alpha,
                        z = previous.z + (current.z - previous.z) * alpha,
                        world = current.world,
                        visibility = current.visibility
                    )
                }
            }
            previousPose = filtered
            return filtered
        }
    }

    fun close() {
        isClosed = true
        landmarker.close()
        synchronized(lock) {
            previousPose = emptyMap()
        }
    }
}
