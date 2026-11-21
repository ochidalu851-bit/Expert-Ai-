# PerfectMotion AI

PerfectMotion AI is a separate Android motion-mirroring app. The Android project is in this folder; the OpenAI-backed image preparation service is in `server/`.

## What is implemented

- Pick an image from the phone. The app then requests camera permission and opens the front camera.
- Show the uploaded image and front-camera preview side by side.
- Run Google ML Kit pose detection on-device using CameraX streaming frames.
- Draw a live pose skeleton over the camera preview.
- Send only the selected still image to the configured AI server. The server uses the OpenAI Responses API to estimate normalized body-joint locations.
- Deform a 2D bitmap mesh using those image landmarks and the live camera landmarks.
- Keep the OpenAI API key on the server, never in the Android application.

## Android build

Open this folder in Android Studio with Android SDK 37 and JDK 17 installed, or use the GitHub Actions workflow at `.github/workflows/perfectmotion-ai-android.yml`.

The workflow builds a debug APK and publishes it as an artifact named `PerfectMotionAI-debug-apk`. The application ID is `com.perfectmotion.ai.debug` for the debug build.

## OpenAI image service

Deploy `server/` to a Node.js 22 host that provides HTTPS. Set these server environment variables:

- `OPENAI_API_KEY`: a project API key created in OpenAI Platform.
- `OPENAI_VISION_MODEL`: defaults to `gpt-6.2-astra`; change this to a vision-capable model available to your OpenAI project if needed.
- `PERFECTMOTION_API_TOKEN`: a long random app access token shared with the Android app.
- `PORT`: optional; defaults to `8080`.

For example, create an app token with `openssl rand -hex 32`. Put the token in the server's secret settings and in the app's Settings screen. Do not use the OpenAI API key as the app token.

The Android app's Settings screen takes:
1. The deployed HTTPS server URL.
2. The app access token.

After saving both values, upload an image again to run the AI rig-preparation step.

## Privacy and limitations

Camera frames are analysed locally with ML Kit and are not sent to the AI server. Only the still image selected by the user is uploaded for body-landmark estimation. The server requests `store: false` from the Responses API and does not save the image.

The first version uses approximate 2D joint landmarks and a mesh warp. It is not yet full 3D motion capture, perfect anatomical deformation, background removal, or a generative video pipeline. A still photo's background can bend with the mesh, hidden body parts cannot be reconstructed reliably, and image-analysis landmarks are estimates. Clear, mostly front-facing, full-body images work best.

## Project layout

- `app/`: Kotlin + Jetpack Compose Android app.
- `server/`: Node.js OpenAI Responses API service.
- `.github/workflows/perfectmotion-ai-android.yml`: APK build workflow.

## Build versions

The project uses Android Gradle Plugin 9.5.0, Gradle 9.6.0 in CI, Kotlin 2.4.10, Compose BOM 2026.09.00, CameraX 1.7.0, and ML Kit Pose Detection 18.0.0-beta5.
