package com.perfectmotion.ai

import android.Manifest
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.os.Bundle
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
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.CameraAlt
import androidx.compose.material.icons.outlined.Cloud
import androidx.compose.material.icons.outlined.Image
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
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
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import androidx.lifecycle.compose.LocalLifecycleOwner
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.util.concurrent.Executors

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            PerfectMotionTheme {
                PerfectMotionHome()
            }
        }
    }
}

private val Midnight = Color(0xFF080E18)
private val Panel = Color(0xFF111C2B)
private val Accent = Color(0xFF55E4D0)
private val Muted = Color(0xFF9BAABD)

@Composable
private fun PerfectMotionTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = darkColorScheme(
            primary = Accent,
            secondary = Color(0xFF8AB4FF),
            background = Midnight,
            surface = Panel,
            onPrimary = Midnight,
            onBackground = Color(0xFFF2F6FA),
            onSurface = Color(0xFFF2F6FA)
        ),
        content = content
    )
}

@Composable
private fun PerfectMotionHome() {
    val context = LocalContext.current
    val preferences = remember {
        context.getSharedPreferences("perfect_motion_settings", android.content.Context.MODE_PRIVATE)
    }

    var uploadedImage by remember { mutableStateOf<Bitmap?>(null) }
    var cameraAllowed by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(
                context,
                Manifest.permission.CAMERA
            ) == PackageManager.PERMISSION_GRANTED
        )
    }
    var livePose by remember { mutableStateOf<Map<String, Point2>>(emptyMap()) }
    var referencePose by remember { mutableStateOf<Map<String, Point2>>(emptyMap()) }
    var status by remember { mutableStateOf("Upload a full-body image to begin") }
    var isPreparing by remember { mutableStateOf(false) }
    var showSettings by remember { mutableStateOf(false) }
    var serverUrl by remember {
        mutableStateOf(
            preferences.getString("server_url", BuildConfig.DEFAULT_AI_SERVER_URL) ?: ""
        )
    }
    var appToken by remember {
        mutableStateOf(preferences.getString("app_token", "") ?: "")
    }
    var serverUrlDraft by remember { mutableStateOf(serverUrl) }
    var tokenDraft by remember { mutableStateOf(appToken) }

    val cameraPermission = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        cameraAllowed = granted
        status = if (granted) {
            "Camera is ready. Stand back so your full body is visible."
        } else {
            "Camera permission is needed to mirror your movement."
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
                status = "That image could not be opened. Please choose another image."
            } else {
                uploadedImage = decoded
                referencePose = emptyMap()
                livePose = emptyMap()
                status = "Image loaded. Opening your front camera…"
                val hasPermission = ContextCompat.checkSelfPermission(
                    context,
                    Manifest.permission.CAMERA
                ) == PackageManager.PERMISSION_GRANTED
                if (hasPermission) {
                    cameraAllowed = true
                } else {
                    cameraPermission.launch(Manifest.permission.CAMERA)
                }
            }
        }
    }

    LaunchedEffect(uploadedImage, serverUrl, appToken) {
        val image = uploadedImage ?: return@LaunchedEffect
        if (serverUrl.isBlank() || appToken.isBlank()) {
            status = if (cameraAllowed) {
                "Camera tracking is on. Add your AI server URL and app token in Settings to prepare the image rig."
            } else {
                "Image loaded. Allow camera access and connect the AI server in Settings."
            }
            return@LaunchedEffect
        }

        isPreparing = true
        status = "OpenAI is analysing the uploaded image and locating body landmarks…"
        try {
            val joints = withContext(Dispatchers.IO) {
                MotionAiClient.prepareAvatar(
                    image = image,
                    baseUrl = serverUrl,
                    appToken = appToken
                )
            }
            referencePose = joints
            status = if (joints.size >= 5) {
                "AI rig prepared. Move in front of the camera to animate the image."
            } else {
                "AI could not find enough visible body joints. Try a clear, full-body photo."
            }
        } catch (error: Exception) {
            status = "AI preparation failed: ${error.message ?: "check your server settings"}"
        } finally {
            isPreparing = false
        }
    }

    Surface(
        modifier = Modifier.fillMaxSize(),
        color = Midnight
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(Midnight)
                .padding(horizontal = 16.dp, vertical = 14.dp)
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Column {
                    Text(
                        text = "PERFECTMOTION",
                        color = Color.White,
                        fontSize = 20.sp,
                        fontWeight = FontWeight.ExtraBold,
                        letterSpacing = 1.8.sp
                    )
                    Text(
                        text = "AI MOTION MIRROR",
                        color = Accent,
                        fontSize = 10.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 2.4.sp
                    )
                }
                IconButton(onClick = {
                    serverUrlDraft = serverUrl
                    tokenDraft = appToken
                    showSettings = true
                }) {
                    Icon(
                        imageVector = Icons.Outlined.Settings,
                        contentDescription = "Settings",
                        tint = Color.White
                    )
                }
            }

            Spacer(Modifier.height(12.dp))

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(330.dp),
                horizontalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Card(
                    modifier = Modifier.weight(1f).fillMaxSize(),
                    shape = RoundedCornerShape(20.dp),
                    colors = CardDefaults.cardColors(containerColor = Panel)
                ) {
                    Column(Modifier.fillMaxSize().padding(9.dp)) {
                        PanelTitle("YOUR IMAGE", Icons.Outlined.Image)
                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(14.dp))
                                .background(Color(0xFF09121F)),
                            contentAlignment = Alignment.Center
                        ) {
                            if (uploadedImage != null) {
                                AndroidView(
                                    factory = { AvatarMeshView(it) },
                                    modifier = Modifier.fillMaxSize(),
                                    update = {
                                        it.setFrame(uploadedImage, referencePose, livePose)
                                    }
                                )
                            } else {
                                Column(
                                    horizontalAlignment = Alignment.CenterHorizontally,
                                    verticalArrangement = Arrangement.Center
                                ) {
                                    Icon(
                                        imageVector = Icons.Outlined.Image,
                                        contentDescription = null,
                                        tint = Accent,
                                        modifier = Modifier.size(32.dp)
                                    )
                                    Spacer(Modifier.height(8.dp))
                                    Text(
                                        "Upload a person",
                                        color = Color.White,
                                        fontSize = 13.sp,
                                        fontWeight = FontWeight.SemiBold
                                    )
                                    Text(
                                        "Full body works best",
                                        color = Muted,
                                        fontSize = 10.sp
                                    )
                                }
                            }
                        }
                    }
                }

                Card(
                    modifier = Modifier.weight(1f).fillMaxSize(),
                    shape = RoundedCornerShape(20.dp),
                    colors = CardDefaults.cardColors(containerColor = Panel)
                ) {
                    Column(Modifier.fillMaxSize().padding(9.dp)) {
                        PanelTitle("LIVE CAMERA", Icons.Outlined.CameraAlt)
                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(14.dp))
                                .background(Color(0xFF09121F)),
                            contentAlignment = Alignment.Center
                        ) {
                            when {
                                uploadedImage == null -> Text(
                                    "Camera opens after upload",
                                    color = Muted,
                                    fontSize = 11.sp
                                )
                                !cameraAllowed -> Column(
                                    horizontalAlignment = Alignment.CenterHorizontally
                                ) {
                                    Text(
                                        "Camera permission needed",
                                        color = Color.White,
                                        fontSize = 11.sp
                                    )
                                    Spacer(Modifier.height(8.dp))
                                    Button(
                                        onClick = {
                                            cameraPermission.launch(Manifest.permission.CAMERA)
                                        },
                                        colors = ButtonDefaults.buttonColors(
                                            containerColor = Accent,
                                            contentColor = Midnight
                                        )
                                    ) {
                                        Text("Enable camera", fontSize = 11.sp)
                                    }
                                }
                                else -> CameraMirrorPane(
                                    onPose = { livePose = it }
                                )
                            }
                        }
                    }
                }
            }

            Spacer(Modifier.height(14.dp))

            Button(
                onClick = { imagePicker.launch("image/*") },
                modifier = Modifier.fillMaxWidth().height(52.dp),
                shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = Accent,
                    contentColor = Midnight
                )
            ) {
                Icon(Icons.Outlined.Image, contentDescription = null)
                Spacer(Modifier.size(8.dp))
                Text(
                    if (uploadedImage == null) "UPLOAD IMAGE & OPEN CAMERA" else "CHANGE IMAGE",
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 0.5.sp
                )
            }

            Spacer(Modifier.height(12.dp))

            Card(
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(16.dp),
                colors = CardDefaults.cardColors(containerColor = Panel)
            ) {
                Column(Modifier.padding(14.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Icon(
                            imageVector = Icons.Outlined.Cloud,
                            contentDescription = null,
                            tint = Accent,
                            modifier = Modifier.size(18.dp)
                        )
                        Spacer(Modifier.size(8.dp))
                        Text(
                            "MOTION STATUS",
                            color = Accent,
                            fontWeight = FontWeight.Bold,
                            fontSize = 11.sp,
                            letterSpacing = 1.2.sp
                        )
                        Spacer(Modifier.weight(1f))
                        if (isPreparing) {
                            Text("AI WORKING", color = Color(0xFFFFD166), fontSize = 9.sp)
                        } else if (cameraAllowed && livePose.isNotEmpty()) {
                            Text("TRACKING", color = Accent, fontSize = 9.sp)
                        }
                    }
                    Spacer(Modifier.height(7.dp))
                    Text(
                        status,
                        color = Color(0xFFE5EDF6),
                        fontSize = 12.sp,
                        lineHeight = 17.sp
                    )
                    Spacer(Modifier.height(7.dp))
                    Text(
                        "Camera frames are processed on this phone. Only the uploaded image is sent to your configured AI server for landmark analysis.",
                        color = Muted,
                        fontSize = 10.sp,
                        lineHeight = 14.sp
                    )
                }
            }

            Spacer(Modifier.height(10.dp))
            Text(
                "Tip: use a clear, front-facing, full-body image and keep your whole body visible in the camera.",
                color = Muted,
                fontSize = 10.sp,
                lineHeight = 14.sp
            )
        }
    }

    if (showSettings) {
        AlertDialog(
            onDismissRequest = { showSettings = false },
            title = { Text("AI connection") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(
                        "Enter the HTTPS URL of your PerfectMotion AI server and its app token. Never paste your OpenAI API key here.",
                        fontSize = 12.sp
                    )
                    OutlinedTextField(
                        value = serverUrlDraft,
                        onValueChange = { serverUrlDraft = it },
                        label = { Text("AI server URL") },
                        placeholder = { Text("https://your-server.example.com") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                    OutlinedTextField(
                        value = tokenDraft,
                        onValueChange = { tokenDraft = it },
                        label = { Text("App access token") },
                        singleLine = true,
                        modifier = Modifier.fillMaxWidth()
                    )
                }
            },
            confirmButton = {
                Button(onClick = {
                    serverUrl = serverUrlDraft.trim().trimEnd('/')
                    appToken = tokenDraft.trim()
                    preferences.edit()
                        .putString("server_url", serverUrl)
                        .putString("app_token", appToken)
                        .apply()
                    showSettings = false
                }) {
                    Text("Save")
                }
            },
            dismissButton = {
                OutlinedButton(onClick = { showSettings = false }) {
                    Text("Cancel")
                }
            }
        )
    }
}

@Composable
private fun PanelTitle(
    label: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector
) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(bottom = 8.dp),
        verticalAlignment = Alignment.CenterVertically
    ) {
        Icon(icon, contentDescription = null, tint = Accent, modifier = Modifier.size(14.dp))
        Spacer(Modifier.size(5.dp))
        Text(
            label,
            color = Color.White,
            fontWeight = FontWeight.Bold,
            fontSize = 9.sp,
            letterSpacing = 0.8.sp
        )
    }
}

@Composable
private fun CameraMirrorPane(
    onPose: (Map<String, Point2>) -> Unit
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val latestOnPose = rememberUpdatedState(onPose)
    var overlayPose by remember { mutableStateOf<Map<String, Point2>>(emptyMap()) }
    val previewView = remember(context) {
        PreviewView(context).apply {
            scaleType = PreviewView.ScaleType.FIT_CENTER
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

    Box(Modifier.fillMaxSize()) {
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
                        color = Accent.copy(alpha = 0.85f),
                        start = androidx.compose.ui.geometry.Offset(
                            start.x * size.width,
                            start.y * size.height
                        ),
                        end = androidx.compose.ui.geometry.Offset(
                            end.x * size.width,
                            end.y * size.height
                        ),
                        strokeWidth = 2.2f
                    )
                }
            }
            currentPose.values.forEach { point ->
                drawCircle(
                    color = Accent,
                    radius = 3.5f,
                    center = androidx.compose.ui.geometry.Offset(
                        point.x * size.width,
                        point.y * size.height
                    )
                )
            }
        }
    }
}
