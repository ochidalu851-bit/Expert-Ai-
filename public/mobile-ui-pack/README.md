# Nexa AI Mobile UI, App Catalogue & Status Library (v8.0)

An offline, mobile-first HTML/CSS/JavaScript recreation of the visible interface flows in the supplied screen recordings, including the November 10 plugin-directory, app-skill/integration and composer/file-picker recordings. This is a visual and interaction prototype, not the official ChatGPT application and not a copy of its private source code.

## Run it

1. Extract `mobile_ai_ui_text_pack_v8.zip`.
2. Open `ai_mobile_ui_pack/index.html` in a modern browser.
3. The prototype opens on the home screen. Use the hamburger menu to reach Images, Search, Library, Codex, Projects, Explore, Upgrade to Pro, Customize, Remote, Scheduled, Plugins, profile and Settings.
4. For best phone behavior, open the folder through a static web server or hosting service if the browser restricts local-file navigation.

No build tools, internet connection or package installation are required.

## What is included

### Home, chat, images and navigation
- ChatGPT-style home screen with hamburger, Get Plus, voice shortcut, Create an image or sticker, Write or edit, and message composer.
- Chat welcome and sample conversation states, add-menu sheet, temporary-chat flow, local chat history, and voice conversation screen.
- Images screen with Trending and Templates tabs and 12 local gallery thumbnails based on the supplied recording.
- Voice-mode screen with the video-sourced circular sky orb, background-conversations information card, microphone toggle, voice settings shortcut and close control.
- Drawer entries for Library, Customize, Projects, Remote, Scheduled, Plugins, recent conversation, See all, Chat, Profile and Settings.
- Scheduled drawer switches, with the same initial on/off pattern as the video.
- Projects with All / Created by you / Shared with you filters, search, empty state and project creation.

### Account and sign-in flows
- Account profile with demo email, age status, free plan, upgrade and log-out confirmation.
- Welcome/login screen, continue-with-this-account, Google demo action, alternate login, email and phone forms, verification preview, country code search and long account chooser.
- Account chooser names and emails are fictional examples; personal account information from the recording is not copied.

### Customize and general preferences
- Customize overview with Personality, Memory, Plugins, Email, Calendar, Contacts, Wallet, Passwords and Location.
- Personality style/tone picker, Warmth and Enthusiasm sliders, Headers and lists and Emoji switches, custom instructions and Save.
- Memory enabled switch, Memory summary, saved-memory removal and clear-all confirmation, and Memory FAQs.
- General settings: accent color, nickname, app language, reference-photo filename picker, Visual answers, Fast answers, Homepage suggestions, Web search and Library search.
- Reference photos are not uploaded; only selected file names are shown in the browser demo.

### Settings, usage and notifications
- Settings hub for Account, Workspace, Plus, Customize, General, Usage and limits, Notifications, Voice, Safety, Security and login, Codex, Storage, Privacy center, History and data and Ads controls.
- Plus feature comparison, Upgrade, Restore subscription and Compare plans actions.
- Agentic usage meter, usage reset information, Credits and Automatic recharge switch.
- Ten notification categories: Codex, Group chats, Health, Library, Marketing, Personalized tips, Projects, Responses, Tasks and Usage. Each category opens Push, Email and In-app switches.
- Voice model, voice list and language, dictation history, Background conversations and Use as default assistant switches.
- Settings information menu with Report app issue, Help center, Terms of use, Privacy policy, Licenses and build information.

### Plugins and app integrations
- Installed plugin icons and the Popular list.
- New & noteworthy Communication options: Outlook Email, Slack, Hostinger mail and Teams.
- New & noteworthy Creativity options: Canva and Higgsfield.
- Browse plugins, plugin search, plugin detail pages and local add/remove states.
- Permissions sheet with Always ask, Allow read actions and Allow low-risk actions, each with explanatory text.
- Email, Calendar, Contacts, Wallet and Passwords preview screens.


### New plugin directory and chat actions (v7.0)
- Plugin directory from the latest recordings, with Installed, Popular, New & noteworthy, and 14 visible capability categories.
- 58 visible app rows, each with a dedicated row/detail action and an independent **+** button; 57 rows have a plus button and Google Drive retains the lock indicator shown in the recording.
- Categories: Productivity, Communication, Creativity, Developer Tools, Fitness, Finance, Travel, Entertainment, Education, Business & Operations, Data & Analytics, Scientific Research, Security and Other.
- New & noteworthy includes iCloud Mail and iCloud Calendar.
- Plugin detail pages clearly label publisher, official endpoints, APIs, permissions and authentication as not supplied / not verified when the recordings do not provide them.
- Added apps show as added to this local demo only; they are not described as externally connected. Customize displays the live added-app count, and the Permissions screen lists the added demo apps.
- Plugin Management detail includes Skills, Read actions and Write actions. The `plugin-management` skill page has a local Use skill switch plus guidance sections.
- Read action previews: get app permissions and get plugin dependencies. Write action previews: Uninstall app and Update app permissions.
- Conversation overflow menu: Share, Pin, Lock chat, Add to project, Uploaded files, Find in chat, Add to home, Archive and Delete.
- Assistant response actions: Copy, positive/negative feedback, Read aloud, Share and More.
- Local interactions include project assignment, file-name picker, conversation search, saved-to-home, archive/restore, pin/lock status and delete. Share and speech playback use browser support where available.

### Safety, security, privacy and data
- Safety: Reduce sensitive content, Trusted contact and Parental controls.
- Security: Passkeys, Locked chats/Account PIN preview, MFA, Active sessions, Require device unlock, Security history, Advanced account security and Lockdown mode.
- Privacy Center, Personalized chats & ads, Chat privacy, Data use & access, Personalized ads, Ad topics, Location FAQ, Memory FAQ, Temporary Chats FAQ, Model improvement FAQ and Export/delete FAQ.
- Privacy explainer pages: We don't sell your data and We secure your information.
- History and data: Improve the model for everyone, Export Data, Delete account preview, connected-app summary, archived chats, Archive chat history and Clear chat history.
- Storage usage preview.


### v7 functional completion pass
- Plugin Management `get app permissions` now opens a dedicated per-app permission screen; modes are saved independently for each app rather than only in one global preference.
- `update app permissions` offers a chooser that writes the selected per-app local preference. Provider-granted scopes remain unverified.
- `get plugin dependencies` opens a dedicated dependency-inspection page. Dependencies, service requirements and version constraints are marked not supplied / not verified when the recording does not provide them.
- Composer **+ → Add photos and files** opens a browser/device file picker. The demo stores file names, sizes, MIME types and modification timestamps only; it does not upload or retain file bytes. Uploaded-file management includes remove controls.
- Temporary-chat messages are kept separate from regular chat history. The chat shows **Save to history** and **End** controls so a temporary conversation can be saved or discarded locally.
- The chat composer sends with Enter (Shift+Enter remains available for multiline entry) as well as the send button.
- Settings now includes the visible Verify age, Trusted contact, Parental controls and Email rows. Age confirmation and Trusted contact are local demo states, not identity or account verification.


### Connector apps, skills and installation (v8.0)
- App-specific connector details include title, icon/monogram, publisher where visible, description, supported app targets, skills, capabilities, developer, website, version, policy links, authentication and permission status.
- Gmail, Google Drive, GitHub, ElevenLabs, Tripsy and other video-visible app details have dedicated views. Four video-visible Google Drive skill labels and four ElevenLabs skill names are preserved.
- Skill cards open individual pages with a local Use skill switch and Use in chat action. Task examples that are not official skill names are explicitly labelled illustrative.
- Install plugin and directory + actions open a consent sheet describing memory/chat context, suggested prompts and model-improvement considerations. Continue adds an app to the local demo only; it never claims the external provider is connected.

### Composer, Camera, Photos, Files and tool shortcuts (v8.0)
- Composer plus menu matches the new video: Camera, Photos, Files, Plugins and Think harder.
- Camera uses a browser file input with an environment-facing capture hint where supported; Photos uses an image-only multi-select picker.
- Files opens an app-style Recent files browser with Upload files, Recent/Images/Documents/Videos filters, search and local recent file metadata. Device selection is handled by the browser/Android picker.
- Plugins opens a nested menu: Create image, Search, Thinking, Deep research, Study and OpenAI Platform.
- Think harder, Search, Thinking, Deep research and Study expose clearable local composer mode chips. They do not call live AI, Search or Deep Research services in this offline package, and no hidden reasoning is displayed.
- File selection stores names, MIME types, sizes and modification timestamps only. File bytes are not uploaded to an assistant service.

## Interactions and storage

Navigation, option sheets, FAQs, sliders, filters, search fields and local switches work in the prototype. Preference changes persist in browser `localStorage`. Chat, project, memory, plugin and notification data are sample/local only. The Export Data control creates a JSON file with the prototype preferences.

The project was checked with JavaScript syntax validation, route/navigation checks, local asset-path checks, the video plugin/chat interaction suite and a v7 event-level test suite. The v7 suite checks per-app permission state, dependency inspection with unknown fields preserved, file-picker invocation and local metadata handling, temporary-chat isolation/save, Enter-to-send, age confirmation and Trusted contact demo state. A full Chromium visual pass could not be completed in this environment because browser navigation to local files/localhost was blocked; this limitation is recorded in the validation report.

## Important limitations

- This is not the official ChatGPT application and does not contain OpenAI's private source code.
- Google sign-in, email/SMS verification, AI replies, image generation, live web search, Gmail/Calendar/Drive/Contacts/Health/GitHub connections, real plugin permissions, background scheduling, payment/subscription changes, parental linking, Trusted contact, device unlock, MFA, passkeys, wallet, passwords, precise location and real account-security actions are not connected. Camera/Photos and tool-mode previews are added in v8.0 but remain device/provider dependent.
- Local switches and forms change only the prototype's browser state. Demo accounts, security events, usage amounts and memory examples are fictional.
- The Android status bar, native keyboard, system permission screens and device settings are controlled by the operating system and are not recreated by this HTML package.
- The exact font cannot be identified reliably from screen recordings. The package uses a handwritten-style system-font fallback stack; it does not bundle a proprietary app font.
- Layout dimensions, colors and some text are approximations from the recordings; source code and original design assets were not provided.

## Files

- `index.html` — mobile viewport and app shell
- `styles.css` — dark theme, rows, panels, controls, modals and screen layouts
- `app.js` — screen catalogue, routing, preferences and local interactions
- `UI_TEXT_PACK.json` — screen and control inventory
- `VIDEO_COMPARISON.md` — detailed comparison with all supplied recordings
- `CHANGELOG.md` — revision history
- `assets/gallery/` — image gallery thumbnails from the recording
- `assets/plugins/` — matching plugin app-icon crops from the recordings
- `integrations-ui.js` — v6 plugin directory, plugin-management skill/actions and conversation overflow actions
- `v7-enhancements.js` — per-plugin permission screens, dependency detail, local attachments, temporary-chat isolation and settings refinements
- `v8-enhancements.js` — connector app details/skills/consent, Camera/Photos/Files pickers, tool menu and composer modes
- `VIDEO4_FUNCTION_MAP.json` / `VIDEO4_COMPARISON.md` — inventory and comparison of the latest supplied videos
- `V8_FEATURE_MANIFEST.json` / `V8_VALIDATION_REPORT.md` — v8 feature and QA results
- `qa/test_v8_video.js` — repeatable v8 interaction regression suite
- `V7_FEATURE_MANIFEST.json` — machine-readable list of v7 features, verification and limitations
- `qa/test_v7.js` and `qa/test_video3_integrations.js` — repeatable event-level test suites
- `V7_VALIDATION_REPORT.md` — final syntax, data, interaction and packaging checks
- `qa-v7-smoke.html` — browser-based interaction checklist (for environments that allow local/localhost browser navigation)
- `VIDEO3_PLUGIN_DIRECTORY.json` — 58 video-observed plugin listing records with unverified metadata clearly marked
- `VIDEO3_FUNCTION_MAP.json` — action/function map for the new recordings
- `assets/voice-orb.png` — circular voice orb crop from the recording


## Imported plugin catalogue (carried forward from v7.0)

- 12,618 unique stable IDs and 12,629 source row occurrences extracted from the seven supplied MCPTOP PDFs.
- Search by app name, publisher, source category, capability family, capability keyword, slug and short description.
- Individual record details include source-provided icon URL, publisher, description, family mapping, functions, tool/action data, APIs, permissions, authentication, availability/connection/verification state and dated source-version fields.
- All missing fields are shown as `not supplied / not verified`. No record is described as installed or connected merely because it appears in the directory.
- The imported PDFs do not contain the full November 9 snapshot or the OpenApps November 8 individual records. See `NEXA_AI_DATA_IMPORT_GUIDE.md` and `CATALOGUE_IMPORT_MANIFEST.json`.
- The 422 activity messages are a generated proposed draft because the original exact vocabulary was not in the supplied files.
