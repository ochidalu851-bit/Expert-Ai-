package com.perfectmotion.ai

import android.util.Base64
import org.json.JSONObject
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

    private fun audioDataUrl(audio: AudioUpload): String {
        return "data:${audio.mimeType};base64," +
            Base64.encodeToString(audio.bytes, Base64.NO_WRAP)
    }
}
