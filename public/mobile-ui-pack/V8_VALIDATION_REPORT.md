# Nexa AI v8.0 validation report

## Changes

- Added connector detail pages with video-visible publisher, app targets, capabilities and available information fields.
- Added individual skill detail pages, local Use skill switches and Use in chat draft action.
- Added connector installation consent sheet with data-use explanations; Continue adds a local demo entry only.
- Added Camera, Photos, Files, Plugins and Think harder to the composer plus menu.
- Added Camera capture hint, multiple-image picker, app-style Recent Files browser, search/type filters and device upload picker.
- Added nested tool menu: Create image, Search, Thinking, Deep research, Study and OpenAI Platform.
- Added clearable composer mode chips and more navigation entries to the drawer.

## Automated checks

- v8 interaction QA: **31 passed, 0 failed**.
- The suite checks Gmail, Google Drive, GitHub, ElevenLabs skill/app information; connector consent; the five Add menu items; nested Plugins tools; Camera/Photos pickers; Files browsing and recent-item attach; Think harder, Search, Thinking, Deep research, Study; existing 58-row plugin directory; and existing nine chat overflow actions.
- JavaScript syntax: all root and QA `.js` files passed `node --check`.
- JSON validation: all 10 JSON files parsed successfully.
- `index.html` references: every linked CSS/JavaScript file exists.
- ZIP packaging: `unzip -t` passed with no compressed-data errors; latest archive contains `v8-enhancements.js`, both video comparison files, validation/feature manifests, the QA suite, full plugin catalogue and activity library.
- SHA-256 manifest: regenerated after the v8 source and documentation updates.

## Test boundary

The environment used Node VM interaction tests. A headless Chromium HTTP smoke attempt did not return a DOM result in this environment (the process stalled during startup/runtime); therefore no full visual browser pass is claimed. Real Android-device testing was not available in this pass. Camera and Photos require browser/OS support; OAuth, external plugin APIs, live AI and remote search/research services are not connected.

## Data and privacy boundary

- User-selected file metadata is retained locally in browser storage; file bytes are not uploaded.
- Provider installation and permission selection are local demo states only.
- Unreadable skill instructions and unknown publisher/API/authentication/permission fields are marked not supplied / not verified.
- No private reasoning is exposed by Thinking or Think harder modes.
