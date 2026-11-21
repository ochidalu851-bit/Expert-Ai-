package com.perfectmotion.ai

import android.os.Handler
import android.os.Looper
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageProxy
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.pose.PoseDetection
import com.google.mlkit.vision.pose.PoseLandmark
import com.google.mlkit.vision.pose.defaults.PoseDetectorOptions

class PoseAnalyzer(
    private val onPose: (Map<String, Point2>) -> Unit
) : ImageAnalysis.Analyzer {
    private val mainHandler = Handler(Looper.getMainLooper())
    private val detector = PoseDetection.getClient(
        PoseDetectorOptions.Builder()
            .setDetectorMode(PoseDetectorOptions.STREAM_MODE)
            .build()
    )

    override fun analyze(imageProxy: ImageProxy) {
        val mediaImage = imageProxy.image
        if (mediaImage == null) {
            imageProxy.close()
            return
        }

        val rotation = imageProxy.imageInfo.rotationDegrees
        val input = InputImage.fromMediaImage(mediaImage, rotation)
        val uprightWidth = if (rotation == 90 || rotation == 270) {
            imageProxy.height.toFloat()
        } else {
            imageProxy.width.toFloat()
        }
        val uprightHeight = if (rotation == 90 || rotation == 270) {
            imageProxy.width.toFloat()
        } else {
            imageProxy.height.toFloat()
        }

        detector.process(input)
            .addOnSuccessListener { pose ->
                val points = linkedMapOf<String, Point2>()
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

                mapping.forEach { (name, type) ->
                    val landmark = pose.getPoseLandmark(type)
                    if (landmark != null && landmark.inFrameLikelihood >= 0.35f) {
                        val rawX = (landmark.position.x / uprightWidth).coerceIn(0f, 1f)
                        val x = 1f - rawX
                        val y = (landmark.position.y / uprightHeight).coerceIn(0f, 1f)
                        points[name] = Point2(x, y)
                    }
                }

                mainHandler.post {
                    onPose(points)
                }
            }
            .addOnFailureListener {
                mainHandler.post {
                    onPose(emptyMap())
                }
            }
            .addOnCompleteListener {
                imageProxy.close()
            }
    }

    fun close() {
        detector.close()
    }
}
