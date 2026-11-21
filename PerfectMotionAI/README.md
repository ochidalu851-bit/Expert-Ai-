# PerfectMotion AI

PerfectMotion AI is an Android app for live camera-driven 2D movement mirroring. The Android project is in this folder; the OpenAI-backed preparation and voice service is in `server/`.

## Android experience

- Choose a person photo from the phone.
- The uploaded person fills the screen; the front-camera preview stays in a small floating window.
- Android status and navigation bars are hidden during the motion experience to provide an immersive full-screen view.
- CameraX streams front-camera frames and Google ML Kit estimates pose landmarks on-device.
- The live camera landmarks are used immediately to deform a 2D mesh of the uploaded photo.
- ML Kit selfie segmentation attempts to isolate the person before animation.
- The user can export the current rendered still frame as an 8K-sized WebP.
- The launcher graphic is included in `app/src/main/res/mipmap-anydpi/ic_launcher.xml`.

Minimum Android version: Android 7.0 (API 24).

## Custom voice upload

The app includes an upload flow for a user's preferred recorded voice. It asks for two recordings from the same adult speaker:

1. A consent recording using the exact supported OpenAI consent sentence shown in the app.
2. A 10–60 second voice sample with at least five seconds of speech and at least 15 spoken text tokens.

Both files must be 10 MiB or smaller and use one of the supported audio MIME types. The app submits the recordings to the OpenAI custom-voice endpoints and lets the user preview a saved voice with a short generated speech sample.

**Important limitations:**
- Recording-based custom voice creation is restricted to OpenAI organisations that have been granted access. The upload will return an explanatory error when the project is not enabled.
- The custom voice ID is currently saved in local app preferences on that device. This project does not yet have user accounts or cloud profile sync.
- This is a voice-upload and speech-preview workflow; full duplex, real-time conversational voice calling is not implemented yet.
- The speaker must own the voice or give explicit permission. Do not impersonate another person.

## OpenAI backend

The live backend URL is fixed in the Android build configuration:

`https://perfectmotion-ai-api-production.up.railway.app`

The OpenAI API key stays on Railway and is never included in the APK or exposed in the app Settings screen.

Required Railway service variables:

- `OPENAI_API_KEY`: the rotated OpenAI Platform project API key.
- `OPENAI_VISION_MODEL`: optional; defaults to `gpt-6.2-astra`.
- `PORT`: optional; defaults to `8080`.

The Android app no longer exposes an AI server URL or app access-token field. The backend currently uses an IP-based request limit (20 requests per IP per hour) rather than per-user authentication. **This is not a complete production security boundary**; before releasing to a broad public audience, add sign-in and short-lived per-user server sessions.

## Build

The GitHub Actions workflow at `.github/workflows/perfectmotion-ai-android.yml` builds a debug APK and publishes the artifact named `PerfectMotionAI-debug-apk`.

The debug application ID is `com.perfectmotion.ai.debug`. The Android project is configured for Android API 24 or newer and uses Java 17.

## Motion and export limits

The live movement effect is a local, real-time **2D mesh warp** driven by estimated body landmarks. It is not a full 3D reconstruction or a generated motion-synthesis video. A single still photo cannot reveal hidden body parts or the back of a person, and the result depends on source-image quality and visible joints.

The 8K export creates an 8K-sized canvas and upscales the current rendered frame. This is 8K upscaling, not native 8K detail recovery.
