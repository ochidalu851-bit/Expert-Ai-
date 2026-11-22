# Nexa AI v7.0 validation report

Build date: 2026-11-10
Package target: `mobile_ai_ui_text_pack_v7.zip`

## Results

- JavaScript parse checks: PASS (`app.js`, `catalogue-ui.js`, `integrations-ui.js`, `v7-enhancements.js`).
- JSON parsing: PASS (all `.json` files in the package).
- v7 interaction suite: PASS (19 assertions).
- Video 3 plugin/chat integration suite: PASS (all assertions in `qa/test_video3_integrations.js`).
- Activity/status library: 422 records present; original source vocabulary was not supplied, so they are labeled generated proposed draft.
- Imported catalogue summary: 12,618 unique stable IDs and 12,629 extracted source-row occurrences, including 11 stable IDs represented in multiple snapshots.
- Source listing kinds: 11,316 apps, 1,263 plugins and 39 connectors.
- Main entry point loads scripts in dependency order: `app.js`, `plugin_catalogue.js`, `catalogue-ui.js`, `integrations-ui.js`, `v7-enhancements.js`.
- ZIP integrity: checked after archive creation with `unzip -t`.

## v7 interactions tested

1. Settings includes Verify age, Trusted contact and Email.
2. Per-app permission screen offers Always ask, Allow read actions and Allow low-risk actions.
3. Plugin Management get app permissions opens the app-specific page.
4. An app permission change is saved against the selected app, without changing another app.
5. Dependency inspection opens its own page and labels missing dependency metadata as not supplied / not verified.
6. Update app permissions opens the selector and persists the app-specific local setting.
7. Composer attachment menu opens the local file picker.
8. File selection stores metadata (name, size, MIME type, modified timestamp), not file bytes.
9. Temporary-chat messages remain outside regular chat history.
10. Regular chat sends still append to regular history.
11. Temporary-chat Save moves the local messages into regular history.
12. Age confirmation changes a local demo flag only.
13. Trusted contact changes a local demo flag only.
14. Temporary-chat controls expose Save to history and End.
15. Enter sends; Shift+Enter is left available for multiline composition.

## Visual test boundary

A full Chromium visual pass was attempted but the browser runtime blocked navigation to both local file URLs and localhost (`ERR_BLOCKED_BY_ADMINISTRATOR`). Therefore the package has syntax and event-level interaction verification, but a successful full visual/browser render is not claimed.

## Important service limitations

- Plugin permissions, dependency inspection, adding/removing apps and connection states are local demo state. They do not call external providers or grant real permissions.
- The attachment picker records file metadata only; it does not upload file contents.
- Verify age and Trusted contact are demo toggles, not real identity checks or contact linking.
- Temporary chat is isolated within this browser prototype; it is not a server-side privacy guarantee.
- No AI model, live search, OAuth, external app API, real scheduling backend, or account security service is connected.
