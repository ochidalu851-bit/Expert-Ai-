package com.perfectmotion.ai

import android.graphics.Bitmap
import android.util.Base64
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL

object MotionAiClient {
    fun prepareAvatar(
        image: Bitmap,
        baseUrl: String,
        appToken: String
    ): Map<String, Point2> {
        val imageBytes = ByteArrayOutputStream().use { output ->
            image.compress(Bitmap.CompressFormat.JPEG, 88, output)
            output.toByteArray()
        }
        val imageDataUrl =
            "data:image/jpeg;base64," + Base64.encodeToString(imageBytes, Base64.NO_WRAP)

        val endpoint = URL(baseUrl.trimEnd('/') + "/api/prepare-avatar")
        val connection = (endpoint.openConnection() as HttpURLConnection).apply {
            requestMethod = "POST"
            connectTimeout = 15_000
            readTimeout = 90_000
            doOutput = true
            setRequestProperty("Content-Type", "application/json")
            setRequestProperty("Accept", "application/json")
            setRequestProperty("X-App-Token", appToken)
        }

        try {
            val body = JSONObject()
                .put("imageDataUrl", imageDataUrl)
                .toString()
                .toByteArray(Charsets.UTF_8)

            connection.outputStream.use { it.write(body) }

            val status = connection.responseCode
            val responseStream = if (status in 200..299) {
                connection.inputStream
            } else {
                connection.errorStream
            }
            val responseText = responseStream?.bufferedReader()?.use { it.readText() }.orEmpty()
            val response = runCatching { JSONObject(responseText) }.getOrElse {
                throw IOException("The AI server returned an unreadable response.")
            }

            if (status !in 200..299 || !response.optBoolean("success", false)) {
                throw IOException(
                    response.optString("error").ifBlank {
                        "AI server request failed with HTTP $status."
                    }
                )
            }

            val joints = response.optJSONObject("referencePose")
                ?: throw IOException("The AI server did not return body landmarks.")

            val result = linkedMapOf<String, Point2>()
            BodyJoints.names.forEach { name ->
                val point = joints.optJSONObject(name)
                if (point != null) {
                    val x = point.optDouble("x", Double.NaN)
                    val y = point.optDouble("y", Double.NaN)
                    if (x.isFinite() && y.isFinite()) {
                        result[name] = Point2(
                            x.toFloat().coerceIn(0f, 1f),
                            y.toFloat().coerceIn(0f, 1f)
                        )
                    }
                }
            }

            if (result.size < 5) {
                throw IOException("Not enough body landmarks were found. Try a full-body image.")
            }
            return result
        } finally {
            connection.disconnect()
        }
    }
}
