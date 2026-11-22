# Change log

## v3.0 — thorough pass against both complete recordings

- Reviewed both supplied recordings end-to-end with timestamped frame sheets and detail frames.
- Rebuilt the distributable ZIP from the latest source folder; the preceding v2 ZIP had stale app.js and styles.css files.
- Matched the drawer's three initially enabled schedule switches and one disabled switch.
- Added the voice orb crop from the voice-mode frame and improved the full-screen voice layout, information banner, microphone control and close control.
- Expanded the sample account chooser while replacing personally identifying labels with fictional demo accounts.
- Included 13 cropped plugin marks for the Installed, Popular, Communication and Creativity lists.
- Expanded the comparison manifest to include ten notification categories with three channel switches each, detailed plugin permissions, safety/security screens, the memory and temporary-chat FAQs, privacy explainer pages, usage meter and Credits section.
- Refined the documentation to describe which functions are local-only demonstrations and which Android or cloud behaviors cannot be recreated offline.

## v2.0 — first expansion after video comparison

- Added Personality, Customize, Memory, Location, Plugins, Permissions, Projects, Images, Chat, Voice, privacy, data, security and expanded settings flows.
- Added local gallery thumbnails and country/voice selection options.

## v1.0 — initial prototype

- Basic mobile settings/navigation UI and local on/off controls.


## v5.0 — MCPTOP catalogue import and integration
- Loaded the 12,618-record catalogue into the app after the base UI script; Plugins now opens a searchable directory.
- Added per-record details, 12 inferred Nexa capability-family filters, status vocabulary browser and source provenance.
- Preserved 12,629 extracted row occurrences and full record-level snapshot values across 11 stable-ID overlaps.
- Added OpenApps November 8 missing-source notice; no records or taxonomy labels fabricated.
- Added complete MCPTOP data import guide and raw compressed occurrence export.
- Removed demo controls that could falsely mark an external connector as connected.

## v6.0 — second video feature integration (2026-11-10)
- Added a video-matched categorized plugin directory with 58 individually listed entries across Popular, New & noteworthy, Productivity, Communication, Creativity, Developer Tools, Fitness, Finance, Travel, Entertainment, Education, Business & Operations, Data & Analytics, Scientific Research, Security and Other.
- Added a separate + button beside every available listing. Google Drive retains the lock indicator shown in the video. Adding/removing changes a local demo list only and never claims an external connection.
- Added Installed apps, live added-count in Customize, plugin permissions preferences and plugin detail screens with missing publisher/API/authentication fields explicitly unverified.
- Added Plugin Management detail with Skills, Read actions, Write actions, a Use skill switch, and its skill-guidance screen.
- Added video-observed conversation menu actions: Share, Pin, Lock chat, Add to project, Uploaded files, Find in chat, Add to home, Archive and Delete; added response copy/feedback/read/share controls.
- Added local demo handling for project assignment, uploaded-file names, chat search, pin/lock states, home shortcuts, archive/restore and delete.
- Preserved the full imported 12,618-record catalogue as a separate searchable source catalogue.


## v8.0 — connector skills and composer tool flows (2026-11-10)
- Reviewed the two newly supplied videos (162.56 seconds and 37.39 seconds) and added a video-specific function map and comparison checklist.
- Rebuilt app detail pages with app targets, publisher/developer fields where visible, descriptions, capabilities, website/version/policy fields, authentication/permission status and source notes.
- Added Gmail task cards, Google Drive skill chips, the four readable ElevenLabs skill names, and individual skill details with local Use skill switches and Use in chat.
- Added an app-specific install consent sheet covering memory/chat context, suggested prompts and model-improvement disclosures. Continue adds a local demo entry only; no external connection is claimed.
- Replaced the composer plus menu with Camera, Photos, Files, Plugins and Think harder.
- Added browser/device camera capture and multi-photo inputs, plus an app-style Recent Files picker with search, type filters, Upload files and device file selection.
- Added nested Plugins shortcuts: Create image, Search, Thinking, Deep research, Study and OpenAI Platform.
- Added visible and clearable composer mode chips for Think harder, Search, Thinking, Deep research and Study; no hidden reasoning is exposed.
- Added Images, Search, Codex, Explore and Upgrade to Pro to the drawer while retaining existing navigation.
- Added `v8-enhancements.js`, `VIDEO4_FUNCTION_MAP.json`, `VIDEO4_COMPARISON.md`, `V8_FEATURE_MANIFEST.json`, `V8_VALIDATION_REPORT.md` and `qa/test_v8_video.js`.
- V8 QA: 31/31 event-level interaction checks passed; JavaScript syntax, JSON parsing and index asset-reference checks passed.
- Device camera/photo pickers and provider authentication remain browser/OS/provider dependent; file bytes are not uploaded and external tools are not connected.

## v7.0 — functional completion after the latest recordings (2026-11-10)
- Added per-app permission settings with independent local permission modes; the global default no longer overwrites every plugin's individual choice.
- Converted Plugin Management “get app permissions” into an app-specific detail screen and “get plugin dependencies” into a dependency detail screen. Unknown scopes, dependency names and version requirements stay explicitly not supplied / not verified.
- Made “Update app permissions” open a per-app permission chooser; no real provider grants are claimed.
- Connected the composer Add photos and files action to a local file picker. File name, size, MIME type and modified time are held as metadata only; file bytes are not uploaded. Added file removal.
- Isolated temporary-chat messages from regular history, added Save to history and End controls, and kept the delete/archive flows local.
- Added Enter-to-send support to the chat and home composer.
- Added the latest recording’s Verify age, Trusted contact and Email settings rows; age and trusted-contact states are explicitly demo-only.
- Added `v7-enhancements.js` and event-level QA coverage.
