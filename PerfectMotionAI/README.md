# PerfectMotion AI

PerfectMotion AI is an Android camera-driven motion-mirroring app.

## Current motion flow

1. Select a photo from the phone.
2. ML Kit detects the photo subject's body landmarks locally on the device. This photo-analysis step does not call OpenAI and does not consume OpenAI API credits.
3. ML Kit selfie segmentation attempts to isolate the subject from the photo background.
4. CameraX streams front-camera frames and ML Kit estimates live body landmarks locally.
5. The first reliable camera pose becomes the user's neutral starting pose. Subsequent joint movement is transferred to matching joints in the uploaded image.
6. A high-resolution 2D mesh, camera perspective projection, torso turn, lean and shoulder-span scaling create a depth-assisted 2.5D animation response.

The uploaded photo remains the full-screen subject. The live camera stays in a small top-right preview. When a photo is loaded, the standalone Photo and 8K Export buttons are not shown; the bottom overlay contains only a compact motion state and the voice-upload control.

## Motion accuracy and 3D limitations

This is live, on-device, depth-assisted **2.5D photo animation**, not a complete volumetric 3D human reconstruction. The camera tracks the person and transfers their relative body-joint movement to the uploaded photo in real time. Perspective rotation and depth-style scaling respond to turning and moving closer to or farther from the camera.

A single flat image cannot reveal hidden limbs, a person's back, or unseen side surfaces. Those parts cannot be reconstructed reliably without a multi-view capture or a dedicated 3D reconstruction model and rig. The quality depends on visible joints in both the uploaded photo and the camera preview. For best results, upload a clear photo where the head, shoulders, arms and torso are visible, and frame the corresponding body parts inside the camera preview.

## Android requirements

- Minimum Android version: Android 7.0 (API 24).
- Java 17.
- CameraX live frame capture.
- ML Kit Pose Detection for both reference photo and live camera.
- ML Kit selfie segmentation for photo subject isolation.

## Custom voice

The preferred-voice flow uploads a consent recording and a voice sample from the same adult speaker to OpenAI, when the API organisation has access to recording-based custom voices. It also supports generating a preview from the saved voice.

This voice feature still uses the OpenAI backend and can require API credits and enabled custom-voice access. Voice IDs are currently stored on the local device; account-based voice sync and full duplex real-time voice conversation are not implemented.

## Backend

The Railway service is used by the custom-voice endpoints. The app no longer calls the backend to analyse uploaded photos, so motion setup remains available when the OpenAI project has no remaining credits.

- Service: `perfectmotion-ai-api`
- Base URL: `https://perfectmotion-ai-api-production.up.railway.app`
- Keep `OPENAI_API_KEY` on Railway only; never embed it in the APK or commit it to GitHub.

## Build

The GitHub Actions workflow at `.github/workflows/perfectmotion-ai-android.yml` builds a debug APK and publishes the artifact named `PerfectMotionAI-debug-apk`.

The debug application ID is `com.perfectmotion.ai.debug`.
