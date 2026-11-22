# Video comparison — v8.0 (2026-11-10)

This pass reviews the two newly uploaded recordings inside `1.zip`:
- `Record_2026-11-10-11-54-59.mp4` (162.56 seconds, 480×1066)
- `Record_2026-11-10-12-12-44.mp4` (37.39 seconds, 480×1066)

## Recording A — app integrations and skill details

- [x] App list and Plugins navigation retained from the earlier build.
- [x] Individual app details include icon/monogram, title, publisher when visible, description, app targets, information fields and install action.
- [x] Gmail suggested action cards.
- [x] Google Drive supported app/skill entries: Google Docs, Google Drive Comments, Google Sheets and Google Slides.
- [x] Google Sheets individual skill detail with source-first and verification workflow description; text too small/obscured to reproduce exactly is not claimed as an exact transcript.
- [x] GitHub detail: GitHub and GitHub Enterprise app targets, Interactive and Write capability, developer label OpenAI, website label github.com; exact version and policy URLs remain unverified.
- [x] ElevenLabs description and four clearly visible skill names: `agent-simplification`, `agents`, `agents.platform`, `architect-agent-memory`.
- [x] Tripsy and Dropbox detail routes; unseen publisher/API/permission fields remain not supplied / not verified.
- [x] Connector consent sheet explains memory/chat sharing, suggested prompts and model improvement.
- [x] Install plugin button and separate installed/not-connected demo state.

## Recording B — composer tools and files

- [x] Composer plus sheet includes Camera, Photos, Files, Plugins and Think harder.
- [x] Camera launches an image input with environment-facing capture hint on supported mobile browsers.
- [x] Photos launches a multi-image picker.
- [x] Files opens an app-style file page with Upload files, Recent, type filters, search and local recent items.
- [x] Upload files opens the device file picker; selected file metadata is stored locally and can be attached to a draft.
- [x] Plugins opens a second tool menu with Create image, Search, Thinking, Deep research, Study and OpenAI Platform.
- [x] Think harder toggles a visible local mode chip.
- [x] Search, Thinking, Deep research and Study mode selections are visible and clearable.

## Additional navigation

- [x] Images, Search, Codex, Explore and Upgrade to Pro added to the existing drawer without removing the prior drawer links.

## Limitations

- Camera capture and Photos behavior depend on browser/Android support. A web view may open its native picker rather than render the operating system camera UI inside the page.
- File attachment is local metadata only. The demo does not retain binary files or send them to an AI service.
- Connector consent is a local preview. It does not authenticate, install a provider integration or grant real scopes.
- Search, Deep research and Thinking modes do not call external services in this offline package. Hidden reasoning is not displayed.
- Some skill labels/instructions and provider metadata are too small or obscured in the video. They remain marked not supplied / not verified; illustrative skill task cards are labelled as examples.
