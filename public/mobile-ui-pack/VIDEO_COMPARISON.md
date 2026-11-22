# Detailed video comparison — v7.0 (cumulative video audit)

The two supplied files were reviewed as separate recordings: the shorter account/sign-in/plugins recording (about 2 min 37 sec) and the longer home/customize/settings recording (about 12 min 04 sec). This checklist compares visible interface elements, not private application source code or backend behavior.

## Recording A — account, sign-in and app/plugin permissions

- [x] Account profile: avatar, email, age 18+, Free subscription, Upgrade Plus and Log out.
- [x] Welcome screen: continue with this account, Google sign-in option and alternate login route.
- [x] Alternate email and phone sign-in forms plus verification preview.
- [x] Country/region picker with search and a long calling-code list, including Nigeria +234.
- [x] Account chooser with a scrollable list of fictional demo profiles.
- [x] Settings drawer and account navigation.
- [x] Plugins screen: Installed app marks, Popular apps and search.
- [x] New & noteworthy: Communication group (Outlook Email, Slack, Hostinger mail, Teams) and Creativity group (Canva, Higgsfield).
- [x] Plugin preferences and Added apps list.
- [x] Permission selector with all three reference modes and explanatory descriptions: Always ask, Allow read actions and Allow low-risk actions.
- [x] Browse plugins and plugin detail/add/remove preview.

## Recording B — home, customization, settings and voice

### Home, chat, images and projects
- [x] Home top controls, Get Plus, voice shortcut, empty home space, image/writing shortcuts and composer.
- [x] Chat welcome text, reply composer, add menu and local conversation preview.
- [x] Images gallery with Trending and Templates tabs and 12 reference thumbnails.
- [x] Projects with All / Created by you / Shared with you filters, search and new-project flow.
- [x] Drawer entries: Library, Customize, Projects, Remote, Scheduled and Plugins, recent chat, See all, Chat, Profile and Settings.
- [x] Drawer quick schedule switches: daily briefing, outfit suggestions and Friday recommendations initially enabled; greeting exchange initially disabled.

### Customize and General
- [x] Customize overview: Personality, Memory, Plugins, Email, Calendar, Contacts, Wallet, Passwords and Location.
- [x] Personality: style/tone options, Warmth and Enthusiasm sliders, Headers and lists switch, Emoji switch, custom instructions and Save.
- [x] Email, Calendar, Contacts, Wallet and Passwords preview/setup routes.
- [x] Location screen and precise-location information/choices.
- [x] General: accent, nickname, app language, reference photos, Visual answers, Fast answers, Homepage suggestions, Web search and Library search.

### Settings, plans and notifications
- [x] Settings hub: Account, Workspace, Plus, Customize, General, Usage and limits, Notifications, Voice, Safety, Security and login, Codex, Storage, Privacy center, History and data and Ads controls.
- [x] Settings information menu: Report app issue, Help center, Terms, Privacy policy, Licenses and app/build information.
- [x] Plus comparison table, upgrade/restore/compare actions and auto-renewal/cancel text.
- [x] Usage and limits: Agentic usage meter, usage-reset information, Credits and Automatic recharge Off/On.
- [x] Ten notification categories (Codex, Group chats, Health, Library, Marketing, Personalized tips, Projects, Responses, Tasks, Usage), each with Push, Email and In-app controls.
- [x] Voice: Model, voice, language, Dictation history, Background conversations and default-assistant option.

### Safety, security, privacy and data
- [x] Safety: Reduce sensitive content, Trusted contact and Parental controls.
- [x] Security and login: Passkeys, Locked chats/Account PIN, MFA, Active sessions, Require device unlock, Security history, Advanced account security and Lockdown mode.
- [x] Storage sheet-style usage view with Files and Images amounts.
- [x] Memory: Enable memory, Memory summary, Saved memories and memory FAQ.
- [x] Temporary Chats information page and FAQ, plus local temporary-chat creation.
- [x] Data use & access: Plugins & apps, MFA, Model improvement and Export/delete data information.
- [x] Personalized chats & ads overview, Personalized ads FAQ, Ad topics and Location FAQ.
- [x] Privacy Center, privacy resources, We don't sell your data, We secure your information and supporting routes.
- [x] History and data: Improve the model for everyone, Export Data, Delete account preview, Apps with access, archived chats, Archive chat history and Clear chat history.

### Voice mode
- [x] Full-screen dark voice layout, top-left menu, top-right voice settings, circular blue-sky orb, background-conversations notice, Ask ChatGPT field, microphone control and close button.

## Known differences that cannot be matched from these recordings alone

- The exact app font cannot be reliably identified from video pixels. The prototype uses a system-font fallback stack and does not include a proprietary font file.
- Android keyboard, status/navigation bars, native account chooser UI, Android permission dialogs and device settings belong to the operating system; the prototype provides browser forms or visual previews instead.
- The recordings do not provide the app source code, animation assets or service APIs. AI responses, image generation, Google sign-in, real connected apps/plugins, background scheduling, payment, location services, account-security actions and data export/deletion against an actual account are not implemented.
- User-specific account names, emails and security events were replaced with fictional demo content rather than copied from the recording.
- Some screen text and spacing are approximated where the video is too small or motion-blurred to read confidently.

## Recording C — plugin directory, Plugin Management skill and conversation actions (2026-11-10)
- [x] Plugin directory: Installed, Popular and New & noteworthy sections, with a persistent Search plugins field.
- [x] Separate plus button on each available plugin row; a row tap opens details, and the plus tap adds/removes without opening the details page.
- [x] Lock indicator for Google Drive, with a detail notice that its lock/authentication meaning is not supplied by the video.
- [x] Categories and visible entries: Productivity (Notion, Google Calendar, Dropbox, Metricool); Communication (Slack, Hostinger Mail, Outlook Email, Teams); Creativity (Canva, Higgsfield, Figma, Product Design); Developer Tools (Vercel, TinyFish, Lovable); Fitness (Gym, Tredict); Finance (Interactive Brokers, Public Equity Investing, Binance, Longbridge); Travel (Booking.com, Skyscanner, Trip.com, Flight Network); Entertainment (Daily Tarot, Flaim Fantasy, Spotify); Education (Consensus, SciSpace, Zotero, Acumen by Talarion); Business & Operations (Shopify, Sales, vidIQ, Windsor.ai); Data & Analytics (Data, GSC Wizard, PostHog, Blockscout); Scientific Research (Undermind, Life Sciences Literature, NGS Analysis Workbench, Life Sciences Databases); Security (Codex Security, Malwarebytes, PrivacyHawk, AJAXX Data Scrubber); Other (LinkedIn, Kleinanzeigen, Etsy, Ask Tarot Cards).
- [x] New & noteworthy entries visible in the video: iCloud Mail and iCloud Calendar.
- [x] Plugin Management installed-app page: Skills / plugin-management, Read actions (get app permissions, get plugin dependencies), Write actions (Uninstall app, Update app permissions).
- [x] Skill detail screen with Use skill switch and sections for choosing capabilities, finding/suggesting plugins and managing existing plugins.
- [x] Conversation overflow menu: Share, Pin, Lock chat, Add to project, Uploaded files, Find in chat, Add to home, Archive and Delete.
- [x] Assistant response action strip: Copy, positive/negative feedback, Read aloud, Share and More.
- [x] Uploaded files listing, chat search, local pin/lock state, project assignment, saved-to-home listing, archive/restore and delete demo flows.

### Recording C limitations
- The video shows a Google Drive lock icon, but does not explain its meaning; the prototype leaves its connection/authentication state unverified.
- Publishers, official endpoint URLs, precise APIs, authentication flows and permission scopes are not readable/provided for most app listings. They are marked not supplied / not verified in the detail screens.
- Plus adds a row to the local Nexa AI demo only; actual provider authentication and external app connections are not implemented.
- Share, read-aloud and external upload actions depend on browser/device capabilities or a real backend. Where these are unavailable, the interface explains that limitation rather than pretending an external action succeeded.
- The category entry displayed as “Gym” and the name “Flaim Fantasy” follow the visible video text; those names are not independently verified.


## v7 functional completion audit (2026-11-10)
- [x] Per-plugin permission page: individual selection for Always ask, Allow read actions and Allow low-risk actions.
- [x] Plugin Management get app permissions opens a dedicated permissions detail view.
- [x] Plugin Management get plugin dependencies opens a dedicated detail view; unknown dependencies, services and version constraints remain not supplied / not verified.
- [x] Update app permissions opens a per-app chooser and persists the local preference independently.
- [x] Composer plus attachment option opens a file picker; metadata-only local file list and remove control. No binary upload is claimed.
- [x] Temporary chat uses a separate message array and exposes Save to history and End actions.
- [x] Enter sends chat/home messages; Shift+Enter can be used for multiline text.
- [x] Settings includes Verify age, Trusted contact, Parental controls and Email rows from the latest settings recording.
- [x] Age confirmation and Trusted contact can be toggled in local demo state; neither is represented as real verification or account linking.

### v7 verification status
- JavaScript syntax checks: passed for app.js, catalogue-ui.js, integrations-ui.js and v7-enhancements.js.
- Node interaction suites: passed for the prior video plugin/chat actions and the v7 per-app permission, attachment, temporary-chat, keyboard-send and settings flows.
- Full Chromium visual run: not completed; the browser environment blocked navigation to local files and localhost.
