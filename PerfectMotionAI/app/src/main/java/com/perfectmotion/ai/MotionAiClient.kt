package com.perfectmotion.ai

import android.graphics.Bitmap
import android.util.Base64
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL

data class AudioUpload(
    val name: String,
    val mimeType: String,
    val bytes: ByteArray
)

object MotionAiClient {
    private val baseUrl: String
        get() = BuildConfig.DEFAULT_AI_SERVER_URL.trimEnd('/')

    fun prepareAvatar(image: Bitmap): Map<String, Point2> {
        val response = postJson(
            "/api/prepare-avatar",
            JSONObject().put("imageDataUrl", imageDataUrl(image))
        )
        if (!response.optBoolean("success", false)) {
            throw IOException(response.optString("error", "Image analysis failed."))
        }
        val joints = response.optJSONObject("referencePose")
            ?: throw IOException("The AI server did not return body landmarks.")
        val result = linkedMapOf<String, Point2>()
        BodyJoints.names.forEach { name ->
            val point = joints.optJSONObject(name) ?: return@forEach
            val x = point.optDouble("x", Double.NaN)
            val y = point.optDouble("y", Double.NaN)
            if (x.isFinite() && y.isFinite()) {
                result[name] = Point2(
                    x.toFloat().coerceIn(0f, 1f),
                    y.toFloat().coerceIn(0f, 1f)
                )
            }
        }
        if (result.size < 5) {
            throw IOException("Not enough body landmarks were found. Try a full-body photo.")
        }
        return result
    }

    fun export8kFrame(image: Bitmap): ByteArray {
        val connection = (URL("$baseUrl/api/export-8k").openConnection() as HttpURLConnection).apply {
            requestMethod = "POST"
            connectTimeout = 15_000
            readTimeout = 120_000
            doOutput = true
            setRequestProperty("Content-Type", "application/json")
            setRequestProperty("Accept", "image/webp")
        }
        return try {
            val body = JSONObject()
                .put("imageDataUrl", imageDataUrl(image))
                .toString()
                .toByteArray(Charsets.UTF_8)
            connection.outputStream.use { it.write(body) }
            val status = connection.responseCode
            if (status !in 200..299) {
                throw IOException(readError(connection))
            }
            connection.inputStream.use { it.readBytes() }
        } finally {
            connection.disconnect()
        }
    }

    fun createVoiceConsent(
        name: String,
        language: String,
        recording: AudioUpload
    ): String {
        val response = postJson(
            "/api/voice-consents",
            JSONObject()
                .put("name", name)
                .put("language", language)
                .put("recordingDataUrl", audioDataUrl(recording))
                .put("fileName", recording.name)
        )
        return response.optString("id").takeIf { it.isNotBlank() }
            ?: throw IOException(response.optString("error", "Voice consent upload failed."))
    }

    fun createCustomVoice(
        name: String,
        consentId: String,
        sample: AudioUpload
    ): String {
        val response = postJson(
            "/api/voices",
            JSONObject()
                .put("name", name)
                .put("consentId", consentId)
                .put("audioSampleDataUrl", audioDataUrl(sample))
                .put("fileName", sample.name)
        )
        return response.optString("id").takeIf { it.isNotBlank() }
            ?: throw IOException(response.optString("error", "Custom voice creation failed."))
    }

    fun synthesizeSpeechPreview(text: String, voiceId: String): ByteArray {
        val connection = (URL("$baseUrl/api/speech-preview").openConnection() as HttpURLConnection).apply {
            requestMethod = "POST"
            connectTimeout = 15_000
            readTimeout = 120_000
            doOutput = true
            setRequestProperty("Content-Type", "application/json")
            setRequestProperty("Accept", "audio/mpeg")
        }
        return try {
            val body = JSONObject()
                .put("text", text)
                .put("voiceId", voiceId)
                .toString()
                .toByteArray(Charsets.UTF_8)
            connection.outputStream.use { it.write(body) }
            val status = connection.responseCode
            if (status !in 200..299) {
                throw IOException(readError(connection))
            }
            connection.inputStream.use { it.readBytes() }
        } finally {
            connection.disconnect()
        }
    }

    private fun postJson(path: String, body: JSONObject): JSONObject {
        val connection = (URL("$baseUrl$path").openConnection() as HttpURLConnection).apply {
            requestMethod = "POST"
            connectTimeout = 15_000
            readTimeout = 120_000
            doOutput = true
            setRequestProperty("Content-Type", "application/json")
            setRequestProperty("Accept", "application/json")
        }
        return try {
            connection.outputStream.use {
                it.write(body.toString().toByteArray(Charsets.UTF_8))
            }
            val status = connection.responseCode
            val responseText = if (status in 200..299) {
                connection.inputStream.bufferedReader().use { it.readText() }
            } else {
                throw IOException(readError(connection))
            }
            JSONObject(responseText)
        } finally {
            connection.disconnect()
        }
    }

    private fun readError(connection: HttpURLConnection): String {
        val response = connection.errorStream?.bufferedReader()?.use { it.readText() }.orEmpty()
        val message = runCatching { JSONObject(response).optString("error") }.getOrNull()
        return message?.takeIf { it.isNotBlank() }
            ?: "AI server request failed with HTTP ${connection.responseCode}."
    }

    private fun imageDataUrl(image: Bitmap): String {
        val bytes = ByteArrayOutputStream().use { output ->
            image.compress(Bitmap.CompressFormat.PNG, 100, output)
            output.toByteArray()
        }
        return "data:image/png;base64," + Base64.encodeToString(bytes, Base64.NO_WRAP)
    }

    private fun audioDataUrl(audio: AudioUpload): String {
        return "data:${audio.mimeType};base64," +
            Base64.encodeToString(audio.bytes, Base64.NO_WRAP)
    }
}
