package com.perfectmotion.ai

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.media.MediaPlayer
import android.net.Uri
import android.os.Bundle
import android.provider.OpenableColumns
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CameraAlt
import androidx.compose.material.icons.filled.Image
import androidx.compose.material.icons.filled.Mic
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.UploadFile
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.lifecycle.compose.LocalLifecycleOwner
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.File
import java.util.concurrent.Executors

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        hideSystemBars()
        setContent {
            PerfectMotionTheme {
                PerfectMotionHome()
            }
        }
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) hideSystemBars()
    }

    private fun hideSystemBars() {
        WindowCompat.setDecorFitsSystemWindows(window, false)
        WindowInsetsControllerCompat(window, window.decorView).apply {
            hide(WindowInsetsCompat.Type.systemBars())
            systemBarsBehavior =
                WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
        }
    }
}

private val Midnight = Color(0xFF030817)
private val Panel = Color(0xE6101630)
private val Accent = Color(0xFF39DDFB)
private val Violet = Color(0xFFB83CFF)
private val Muted = Color(0xFFB6C3D8)
private const val ENGLISH_VOICE_CONSENT =
    "I am the owner of this voice and I consent to OpenAI using this voice to create a synthetic voice model."

@Composable
private fun PerfectMotionTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = darkColorScheme(
            primary = Accent,
            secondary = Violet,
            background = Midnight,
            surface = Panel,
            onPrimary = Midnight,
            onBackground = Color.White,
            onSurface = Color.White
        ),
        content = content
    )
}

@Composable
private fun PerfectMotionHome() {
    val context = LocalContext.current
    val preferences = remember {
        context.getSharedPreferences(
            "perfect_motion_settings",
            Context.MODE_PRIVATE
        )
    }
    val scope = rememberCoroutineScope()

    var uploadedImage by remember { mutableStateOf<Bitmap?>(null) }
    var backgroundImage by remember { mutableStateOf<Bitmap?>(null) }
    var livePose by remember { mutableStateOf<Map<String, Point2>>(emptyMap()) }
    var baselineLivePose by remember { mutableStateOf<Map<String, Point2>>(emptyMap()) }
    var referencePose by remember { mutableStateOf<Map<String, Point2>>(emptyMap()) }
    var referenceSourceImage by remember { mutableStateOf<Bitmap?>(null) }
    var cameraAllowed by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.CAMERA
            ) == PackageManager.PERMISSION_GRANTED
        )
    }
    var status by remember { mutableStateOf("Upload a clear photo with the head, shoulders and arms visible.") }
    var isPreparing by remember { mutableStateOf(false) }
    var isSegmenting by remember { mutableStateOf(false) }
    var isCreatingVoice by remember { mutableStateOf(false) }
    var showVoiceDialog by remember { mutableStateOf(false) }
    var voiceName by remember {
        mutableStateOf(preferences.getString("voice_name", "My voice") ?: "My voice")
    }
    var savedVoiceId by remember {
        mutableStateOf(preferences.getString("voice_id", "") ?: "")
    }
    var consentAudio by remember { mutableStateOf<AudioUpload?>(null) }
    var sampleAudio by remember { mutableStateOf<AudioUpload?>(null) }
    var ownerConsent by remember { mutableStateOf(false) }
    var voiceError by remember { mutableStateOf("") }
    var audioPickTarget by remember { mutableStateOf("consent") }

    val cameraPermission = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        cameraAllowed = granted
        status = if (granted) {
            "Camera tracking is ready. Keep your full body in view."
        } else {
            "Camera access is needed to mirror your movement."
        }
    }

    val imagePicker = rememberLauncherForActivityResult(
        ActivityResultContracts.GetContent()
    ) { uri ->
        if (uri != null) {
            val decoded = runCatching {
                context.contentResolver.openInputStream(uri)?.use {
                    BitmapFactory.decodeStream(it)
                }
            }.getOrNull()

            if (decoded == null) {
                status = "The selected image could not be opened."
            } else {
                uploadedImage = null
                backgroundImage = decoded
                referenceSourceImage = decoded
                referencePose = emptyMap()
                livePose = emptyMap()
                baselineLivePose = emptyMap()
                isSegmenting = true
                status = "Separating the person from the background…"

                ImageSubjectSegmenter.prepareLayers(decoded) { layers, _ ->
                    if (layers != null) {
                        backgroundImage = layers.background
                        uploadedImage = layers.subject
                        status = "Person separated. Background fixed. Preparing the body rig…"
                    } else {
                        backgroundImage = decoded
                        uploadedImage = null
                        status = "Could not separate this person cleanly. Try a clearer photo with a simple background."
                    }
                    isSegmenting = false
                }

                if (ContextCompat.checkSelfPermission(
                        context,
                        Manifest.permission.CAMERA
                    ) == PackageManager.PERMISSION_GRANTED
                ) {
                    cameraAllowed = true
                } else {
                    cameraPermission.launch(Manifest.permission.CAMERA)
                }
            }
        }
    }

    val audioPicker = rememberLauncherForActivityResult(
        ActivityResultContracts.GetContent()
    ) { uri ->
        if (uri != null) {
            scope.launch {
                val audio = withContext(Dispatchers.IO) {
                    readAudioUpload(context, uri)
                }
                if (audio == null) {
                    voiceError = "Could not read that audio file."
                } else if (audio.bytes.size > 10 * 1024 * 1024) {
                    voiceError = "Each voice recording must be 10 MB or smaller."
                } else if (!isSupportedVoiceMime(audio.mimeType)) {
                    voiceError = "Choose MP3, WAV, OGG, AAC, FLAC, WEBM or MP4 audio."
                } else {
                    if (audioPickTarget == "consent") {
                        consentAudio = audio
                        voiceError = "Consent recording selected."
                    } else {
                        sampleAudio = audio
                        voiceError = "Voice sample selected."
                    }
                }
            }
        }
    }

    LaunchedEffect(referenceSourceImage) {
        val source = referenceSourceImage ?: return@LaunchedEffect
        isPreparing = true
        status = "Finding body joints on this phone…"
        try {
            val joints = withContext(Dispatchers.Default) {
                PhotoPoseAnalyzer.detect(source)
            }
            referencePose = joints
            status = if (joints.size >= 3) {
                "Photo rig ready. Stand in view and move to animate it."
            } else {
                "Could not find enough body joints. Try a clear photo with the head and shoulders visible."
            }
        } catch (error: Exception) {
            status = "Photo pose detection failed: ${error.message ?: "try another clear photo"}"
        } finally {
            isPreparing = false
        }
    }

    Surface(modifier = Modifier.fillMaxSize(), color = Midnight) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Midnight)
        ) {
            if (referenceSourceImage != null) {
                AndroidView(
                    factory = { viewContext -> AvatarMeshView(viewContext) },
                    modifier = Modifier.fillMaxSize(),
                    update = { view ->
                        view.setFrame(
                            backgroundImage ?: referenceSourceImage,
                            uploadedImage,
                            referencePose,
                            livePose,
                            baselineLivePose
                        )
                    }
                )
            } else {
                Column(
                    modifier = Modifier
                        .align(Alignment.Center)
                        .padding(horizontal = 30.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Icon(
                        Icons.Filled.Image,
                        contentDescription = null,
                        tint = Accent,
                        modifier = Modifier.size(68.dp)
                    )
                    Spacer(Modifier.height(14.dp))
                    Text(
                        "Your photo appears here",
                        color = Color.White,
                        fontSize = 22.sp,
                        fontWeight = FontWeight.Bold,
                        textAlign = TextAlign.Center
                    )
                    Spacer(Modifier.height(7.dp))
                    Text(
                        "Upload a clear, full-body image. It will fill the screen while your live camera stays in a small preview.",
                        color = Muted,
                        fontSize = 13.sp,
                        lineHeight = 19.sp,
                        textAlign = TextAlign.Center
                    )
                    Spacer(Modifier.height(18.dp))
                    Button(
                        onClick = { imagePicker.launch("image/*") },
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Accent,
                            contentColor = Midnight
                        )
                    ) {
                        Icon(Icons.Filled.UploadFile, contentDescription = null)
                        Spacer(Modifier.width(8.dp))
                        Text("Upload image", fontWeight = FontWeight.Bold)
                    }
                }
            }

            Column(
                modifier = Modifier
                    .align(Alignment.TopStart)
                    .padding(start = 18.dp, top = 18.dp)
            ) {
                Text(
                    "PerfectMotion AI",
                    color = Color.White,
                    fontWeight = FontWeight.ExtraBold,
                    fontSize = 20.sp
                )
                Text(
                    "LIVE MOTION MIRROR",
                    color = Accent,
                    fontWeight = FontWeight.Bold,
                    fontSize = 9.sp,
                    letterSpacing = 2.sp
                )
            }

            Surface(
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .padding(top = 16.dp, end = 14.dp)
                    .size(width = 116.dp, height = 158.dp),
                shape = RoundedCornerShape(22.dp),
                color = Color(0xFF080B18),
                border = androidx.compose.foundation.BorderStroke(1.5.dp, Accent)
            ) {
                Box(Modifier.fillMaxSize()) {
                    when {
                        !cameraAllowed -> Column(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(8.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                            verticalArrangement = Arrangement.Center
                        ) {
                            Icon(
                                Icons.Filled.CameraAlt,
                                contentDescription = null,
                                tint = Accent,
                                modifier = Modifier.size(24.dp)
                            )
                            Spacer(Modifier.height(5.dp))
                            Text(
                                "Camera",
                                color = Color.White,
                                fontSize = 11.sp
                            )
                            Text(
                                "Enable",
                                color = Accent,
                                fontSize = 10.sp
                            )
                            IconButton(
                                onClick = {
                                    cameraPermission.launch(Manifest.permission.CAMERA)
                                },
                                modifier = Modifier.size(34.dp)
                            ) {
                                Icon(
                                    Icons.Filled.CameraAlt,
                                    contentDescription = "Enable camera",
                                    tint = Color.White
                                )
                            }
                        }
                        referenceSourceImage == null -> Text(
                            "Your camera",
                            modifier = Modifier.align(Alignment.Center),
                            color = Muted,
                            fontSize = 11.sp
                        )
                        else -> CameraMirrorPane(
                            modifier = Modifier.fillMaxSize(),
                            onPose = { pose ->
                                livePose = pose
                                if (baselineLivePose.size < 3 && pose.size >= 3) {
                                    baselineLivePose = pose.toMap()
                                    status = "Motion linked. The person moves while the background stays fixed."
                                }
                            }
                        )
                    }
                    Text(
                        "YOU",
                        modifier = Modifier
                            .align(Alignment.BottomStart)
                            .padding(7.dp)
                            .clip(RoundedCornerShape(6.dp))
                            .background(Color(0xAA030817))
                            .padding(horizontal = 7.dp, vertical = 3.dp),
                        color = Color.White,
                        fontWeight = FontWeight.Bold,
                        fontSize = 9.sp
                    )
                }
            }

            if (referenceSourceImage != null) {
                Row(
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .fillMaxWidth()
                        .padding(horizontal = 18.dp, vertical = 22.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Text(
                        when {
                            isSegmenting -> "SEPARATING PERSON"
                            isPreparing -> "PREPARING BODY RIG"
                            uploadedImage == null -> "PERSON CUT-OUT UNAVAILABLE"
                            referencePose.size < 3 -> "PHOTO RIG NOT READY"
                            livePose.size >= 3 && baselineLivePose.size >= 3 -> "LIVE BODY MOTION"
                            else -> "CAMERA: FINDING BODY"
                        },
                        modifier = Modifier
                            .weight(1f)
                            .clip(RoundedCornerShape(18.dp))
                            .background(Color(0xCC080F25))
                            .padding(horizontal = 14.dp, vertical = 12.dp),
                        color = if (uploadedImage != null && referencePose.size >= 3 && livePose.size >= 3) Accent else Color.White,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 0.8.sp,
                        maxLines = 1
                    )
                    Surface(
                        shape = CircleShape,
                        color = Color(0xE6101630),
                        border = androidx.compose.foundation.BorderStroke(1.5.dp, Accent)
                    ) {
                        IconButton(
                            onClick = {
                                voiceError = ""
                                consentAudio = null
                                sampleAudio = null
                                ownerConsent = false
                                showVoiceDialog = true
                            },
                            modifier = Modifier.size(54.dp)
                        ) {
                            Icon(
                                Icons.Filled.Mic,
                                contentDescription = if (savedVoiceId.isBlank()) "Upload voice" else "My voice",
                                tint = Accent,
                                modifier = Modifier.size(25.dp)
                            )
                        }
                    }
                }
            }
        }
    }

    if (showVoiceDialog) {
        AlertDialog(
            onDismissRequest = { if (!isCreatingVoice) showVoiceDialog = false },
            title = { Text("Your preferred AI voice") },
            text = {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(9.dp)
                ) {
                    Text(
                        "Upload a consent recording and a voice sample from the same adult speaker. This creates a reusable synthetic voice when your OpenAI project has custom-voice access.",
                        fontSize = 12.sp,
                        lineHeight = 17.sp
                    )
                    OutlinedTextField(
                        value = voiceName,
                        onValueChange = { voiceName = it },
                        label = { Text("Voice name") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                    Text(
                        "Required consent sentence (English):",
                        color = Accent,
                        fontWeight = FontWeight.Bold,
                        fontSize = 11.sp
                    )
                    Text(
                        ENGLISH_VOICE_CONSENT,
                        color = Color.White,
                        fontSize = 11.sp,
                        lineHeight = 16.sp
                    )
                    OutlinedButton(
                        onClick = {
                            audioPickTarget = "consent"
                            audioPicker.launch("audio/*")
                        },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Icon(Icons.Filled.UploadFile, contentDescription = null)
                        Spacer(Modifier.width(7.dp))
                        Text(
                            consentAudio?.name ?: "Upload consent recording",
                            maxLines = 1
                        )
                    }
                    OutlinedButton(
                        onClick = {
                            audioPickTarget = "sample"
                            audioPicker.launch("audio/*")
                        },
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        Icon(Icons.Filled.Mic, contentDescription = null)
                        Spacer(Modifier.width(7.dp))
                        Text(
                            sampleAudio?.name ?: "Upload preferred voice sample",
                            maxLines = 1
                        )
                    }
                    Text(
                        "Use a quiet 10–60 second sample with at least five seconds of actual speech and 15 or more spoken text tokens. Each file must be 10 MB or smaller. The consent and sample must be the same adult speaker.",
                        color = Muted,
                        fontSize = 10.sp,
                        lineHeight = 14.sp
                    )
                    Row(
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Checkbox(
                            checked = ownerConsent,
                            onCheckedChange = { ownerConsent = it }
                        )
                        Text(
                            "I own this voice or have the speaker's explicit permission.",
                            color = Color.White,
                            fontSize = 10.sp,
                            lineHeight = 14.sp
                        )
                    }
                    if (voiceError.isNotBlank()) {
                        Text(
                            voiceError,
                            color = if (voiceError.startsWith("Voice created")) Color(0xFF8DEAB5) else Color(0xFFFFC1C1),
                            fontSize = 11.sp
                        )
                    }
                    if (savedVoiceId.isNotBlank()) {
                        Text(
                            "Saved voice on this device: ${preferences.getString("voice_name", "My voice")}",
                            color = Color(0xFF8DEAB5),
                            fontSize = 11.sp
                        )
                        OutlinedButton(
                            onClick = {
                                scope.launch {
                                    try {
                                        status = "Generating a short voice preview…"
                                        val audio = withContext(Dispatchers.IO) {
                                            MotionAiClient.synthesizeSpeechPreview(
                                                "Hello! This is my preferred voice in PerfectMotion AI.",
                                                savedVoiceId
                                            )
                                        }
                                        playAudioPreview(context, audio) {
                                            status = it
                                        }
                                    } catch (error: Exception) {
                                        voiceError = error.message ?: "Voice preview failed."
                                    }
                                }
                            },
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Icon(Icons.Filled.PlayArrow, contentDescription = null)
                            Spacer(Modifier.width(6.dp))
                            Text("Preview saved voice")
                        }
                    }
                }
            },
            confirmButton = {
                Button(
                    enabled = !isCreatingVoice &&
                        voiceName.isNotBlank() &&
                        consentAudio != null &&
                        sampleAudio != null &&
                        ownerConsent,
                    onClick = {
                        val consent = consentAudio
                        val sample = sampleAudio
                        if (consent == null || sample == null) return@Button
                        isCreatingVoice = true
                        voiceError = "Uploading consent and creating your voice…"
                        scope.launch {
                            try {
                                val consentId = withContext(Dispatchers.IO) {
                                    MotionAiClient.createVoiceConsent(
                                        voiceName.trim(),
                                        "en",
                                        consent
                                    )
                                }
                                val voiceId = withContext(Dispatchers.IO) {
                                    MotionAiClient.createCustomVoice(
                                        voiceName.trim(),
                                        consentId,
                                        sample
                                    )
                                }
                                savedVoiceId = voiceId
                                preferences.edit()
                                    .putString("voice_id", voiceId)
                                    .putString("voice_name", voiceName.trim())
                                    .apply()
                                voiceError = "Voice created and saved on this device."
                                status = "Your preferred voice is ready for speech previews."
                            } catch (error: Exception) {
                                voiceError = error.message
                                    ?: "Voice creation failed. Check custom-voice access in your OpenAI project."
                            } finally {
                                isCreatingVoice = false
                            }
                        }
                    }
                ) {
                    Text(if (isCreatingVoice) "Creating…" else "Create my voice")
                }
            },
            dismissButton = {
                OutlinedButton(
                    onClick = { showVoiceDialog = false },
                    enabled = !isCreatingVoice
                ) {
                    Text("Close")
                }
            }
        )
    }
}

private fun readAudioUpload(context: Context, uri: Uri): AudioUpload? {
    val mime = context.contentResolver.getType(uri)
        ?.substringBefore(";")
        ?.lowercase()
        ?: "audio/mpeg"
    val name = runCatching {
        context.contentResolver.query(
            uri,
            arrayOf(OpenableColumns.DISPLAY_NAME),
            null,
            null,
            null
        )?.use { cursor ->
            if (cursor.moveToFirst()) {
                cursor.getString(cursor.getColumnIndexOrThrow(OpenableColumns.DISPLAY_NAME))
            } else null
        }
    }.getOrNull() ?: "voice-recording"
    val bytes = context.contentResolver.openInputStream(uri)?.use { it.readBytes() } ?: return null
    return AudioUpload(name, mime, bytes)
}

private fun isSupportedVoiceMime(mime: String): Boolean {
    return mime in setOf(
        "audio/mpeg",
        "audio/wav",
        "audio/x-wav",
        "audio/ogg",
        "audio/aac",
        "audio/flac",
        "audio/webm",
        "audio/mp4"
    )
}

private fun playAudioPreview(
    context: Context,
    bytes: ByteArray,
    onStatus: (String) -> Unit
) {
    val file = File(context.cacheDir, "perfectmotion-voice-preview.mp3")
    file.writeBytes(bytes)
    val player = MediaPlayer()
    player.setOnPreparedListener {
        it.start()
        onStatus("Playing your saved voice preview.")
    }
    player.setOnCompletionListener {
        it.release()
        file.delete()
        onStatus("Voice preview finished.")
    }
    player.setOnErrorListener { mediaPlayer, _, _ ->
        mediaPlayer.release()
        file.delete()
        onStatus("Could not play the voice preview.")
        true
    }
    player.setDataSource(file.absolutePath)
    player.prepareAsync()
}

@Composable
private fun CameraMirrorPane(
    modifier: Modifier = Modifier,
    onPose: (Map<String, Point2>) -> Unit
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val latestOnPose = rememberUpdatedState(onPose)
    var overlayPose by remember { mutableStateOf<Map<String, Point2>>(emptyMap()) }
    val previewView = remember(context) {
        PreviewView(context).apply {
            scaleType = PreviewView.ScaleType.FILL_CENTER
            implementationMode = PreviewView.ImplementationMode.COMPATIBLE
        }
    }
    val executor = remember { Executors.newSingleThreadExecutor() }
    val analyzer = remember {
        PoseAnalyzer { points ->
            overlayPose = points
            latestOnPose.value(points)
        }
    }

    DisposableEffect(lifecycleOwner, previewView) {
        var disposed = false
        var provider: ProcessCameraProvider? = null
        val future = ProcessCameraProvider.getInstance(context)

        future.addListener({
            if (!disposed) {
                runCatching {
                    val cameraProvider = future.get()
                    provider = cameraProvider
                    val preview = Preview.Builder()
                        .build()
                        .also { it.setSurfaceProvider(previewView.surfaceProvider) }
                    val analysis = ImageAnalysis.Builder()
                        .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
                        .build()
                        .also { it.setAnalyzer(executor, analyzer) }
                    cameraProvider.unbindAll()
                    cameraProvider.bindToLifecycle(
                        lifecycleOwner,
                        CameraSelector.DEFAULT_FRONT_CAMERA,
                        preview,
                        analysis
                    )
                }
            }
        }, ContextCompat.getMainExecutor(context))

        onDispose {
            disposed = true
            provider?.unbindAll()
            analyzer.close()
            executor.shutdown()
        }
    }

    Box(modifier) {
        AndroidView(
            factory = { previewView },
            modifier = Modifier.fillMaxSize()
        )
        val currentPose = overlayPose
        Canvas(Modifier.fillMaxSize()) {
            BodyJoints.bones.forEach { (startName, endName) ->
                val start = currentPose[startName]
                val end = currentPose[endName]
                if (start != null && end != null) {
                    drawLine(
                        color = Accent.copy(alpha = 0.82f),
                        start = androidx.compose.ui.geometry.Offset(
                            (1f - start.x) * size.width,
                            start.y * size.height
                        ),
                        end = androidx.compose.ui.geometry.Offset(
                            (1f - end.x) * size.width,
                            end.y * size.height
                        ),
                        strokeWidth = 2f
                    )
                }
            }
            currentPose.values.forEach { point ->
                drawCircle(
                    color = Accent,
                    radius = 3f,
                    center = androidx.compose.ui.geometry.Offset(
                        (1f - point.x) * size.width,
                        point.y * size.height
                    )
                )
            }
        }
    }
}
