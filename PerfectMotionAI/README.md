# PerfectMotion AI

PerfectMotion AI is a separate Android motion-mirroring app. The Android project is in this folder; the OpenAI-backed image preparation service is in `server/`.

## What is implemented

- Pick an image from the phone. The app then requests camera permission and opens the front camera.
- Show the uploaded image and front-camera preview side by side.
- Run Google ML Kit pose detection on-device using CameraX streaming frames.
- Draw a live pose skeleton over the camera preview.
- Send only the selected still image to the configured AI server. The server uses the OpenAI Responses API to estimate normalized body-joint locations.
- Separate the uploaded person from the background on-device using ML Kit selfie segmentation.
- Deform a 2D bitmap mesh using those image landmarks and the live camera landmarks.
- Export the current rendered still frame through a server-side 8K canvas upscaler (7680x4320 landscape or 4320x7680 portrait).
- Keep the OpenAI API key on the server, never in the Android application.

## Android build

Open this folder in Android Studio with Android SDK 37 and JDK 17 installed, or use the GitHub Actions workflow at `.github/workflows/perfectmotion-ai-android.yml`.

The workflow builds a debug APK and publishes it as an artifact named `PerfectMotionAI-debug-apk`. The application ID is `com.perfectmotion.ai.debug` for the debug build.

## OpenAI image service

Deploy `server/` to a Node.js 22 host that provides HTTPS. Set these server environment variables:

- `OPENAI_API_KEY`: a project API key created in OpenAI Platform.
- `OPENAI_VISION_MODEL`: defaults to `gpt-6.2-astra`, a vision-capable Responses API model.
- `PERFECTMOTION_API_TOKEN`: a long random app access token shared with the Android app.
- `PORT`: optional; defaults to `8080`.

For example, create an app token with `openssl rand -hex 32`. Put the token in the server's secret settings and in the app's Settings screen. Do not use the OpenAI API key as the app token.

The Android app's Settings screen takes:
1. The deployed HTTPS server URL.
2. The app access token.

After saving both values, upload an image again to run the AI rig-preparation step. The app also provides an 8K-upscaled still-frame export button once the image rig has been prepared.

### Where to put your OpenAI API key

Never paste the OpenAI API key into a GitHub source file, Android Settings, or this chat. Put it in the backend host's encrypted environment variables:

1. Open the PerfectMotion AI project in Railway.
2. Open the `perfectmotion-ai-api` service and select **Variables**.
3. Add `OPENAI_API_KEY` and paste the key value there.
4. Add `PERFECTMOTION_API_TOKEN` with a separate random app token, not the OpenAI key.
5. Deploy/redeploy the service after saving.

The Railway project has been created, but the connected Free plan currently refuses to provision a service because its resource limit is reached. Once Railway permits a service to be created, the variables above are the exact place for the key. The service root directory must be `/PerfectMotionAI/server`, and its health check path is `/health`.

## Motion and output quality

Camera frames are analysed locally with ML Kit and are not sent to the AI server. Only the selected, background-isolated still image is uploaded for body-landmark estimation. The server requests `store: false` from the Responses API and does not save the image.

The export endpoint creates an 8K-sized canvas and uses Lanczos resampling to enlarge the rendered frame. This is 8K upscaling, not native 8K detail generation. OpenAI's current image-generation API maximum is 3840x2160, so the 8K export step enlarges pixels rather than recovering details absent from the original.

This build uses image landmarks and a 2D mesh deformation rig. Segmentation reduces background warping, but this is not yet a full 3D reconstruction, motion-synthesis video engine, or a guarantee of anatomically perfect movement. Hidden limbs and body parts not visible in the source photo cannot be recreated faithfully from the single image.

## Project layout

- `app/`: Kotlin + Jetpack Compose Android app.
- `server/`: Node.js OpenAI Responses API service.
- `.github/workflows/perfectmotion-ai-android.yml`: APK build workflow.

## Build versions

The project uses Android Gradle Plugin 9.5.0, Gradle 9.6.0 in CI, Kotlin 2.4.10, Compose BOM 2026.09.00, CameraX 1.7.0, and ML Kit Pose Detection 18.0.0-beta5.
