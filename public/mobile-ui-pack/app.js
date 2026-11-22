/* Offline UI prototype inspired by the two supplied mobile recordings.
   This is a local front-end demo. It does not sign in to or connect to any service. */
const $ = (s, root=document) => root.querySelector(s);
const screen = $('#screen'), topbar = $('#topbar'), modalLayer = $('#modalLayer');
const defaults = {
  fastAnswers:true, suggestions:true, webSearch:true, librarySearch:true,
  push:true, emailUpdates:true, backgroundVoice:true, defaultAssistant:false,
  improveModel:true, saveHistory:true, referenceMemory:true, useMemory:true,
  showPreview:true, readReceipts:false, sounds:true, haptics:true,
  requireUnlock:false, personalisation:true, chatNotifications:true,
  accent:'Blue', language:'English', voiceModel:'Live', voice:'Vale', voiceLanguage:'Auto-detect', visualAnswers:'Default', nickname:'',
  customInstructions:'', occupation:'', aboutYou:'', userName:'Demo User', userEmail:'demo@example.com'
};
let prefs = {...defaults, ...JSON.parse(localStorage.getItem('mobileAIPrefs') || '{}')};
let currentPage = 'home', historyStack = [], drawerOpen = false, toastTimer, activePreferenceKey = null;
const pageTitles = {
  home:'ChatGPT', settings:'Settings', account:'Account', workspace:'Workspace', customize:'Customize ChatGPT',
  general:'General', personalization:'Personalization', notifications:'Notifications', marketing:'Marketing',
  voice:'Voice', safety:'Safety', parental:'Parental controls', security:'Security', advancedSecurity:'Advanced account security',
  usage:'Usage and limits', storage:'Storage', plugins:'Plugins', permissions:'Permissions', appearance:'Appearance',
  privacy:'Privacy center', data:'Data controls', export:'Export your data', projects:'Projects', library:'Library',
  explore:'Explore', login:'Log in or sign up', emailLogin:'Continue with email', phoneLogin:'Continue with phone',
  profile:'Profile', search:'Search settings', subscription:'Subscription'
};
function save(){ localStorage.setItem('mobileAIPrefs', JSON.stringify(prefs)); }
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function header(){
  const title = pageTitles[currentPage] || currentPage;
  topbar.innerHTML = `<button class="icon-btn" data-action="back" aria-label="Back">‹</button><div class="bar-title">${esc(title)}</div><button class="icon-btn ghost" data-action="headerAction" aria-label="More">${currentPage==='settings'?'ⓘ':currentPage==='home'?'⌕':''}</button>`;
}
function nav(page){ if(page===currentPage) return; historyStack.push(currentPage); currentPage=page; drawerOpen=false; render(); }
function back(){ if(drawerOpen){drawerOpen=false;render();return;} currentPage=historyStack.pop() || 'settings'; render(); }
function row(label, page, icon='', sub='', value=''){return `<button class="row" data-page="${page}">${icon?`<span class="row-icon">${icon}</span>`:''}<span class="row-main"><span class="row-label">${esc(label)}</span>${sub?`<span class="row-sub">${esc(sub)}</span>`:''}</span>${value?`<span class="row-value">${esc(value)}</span>`:''}<span class="chevron">›</span></button>`;}
function actionRow(label, action, icon='', sub='', value=''){return `<button class="row" data-action="${action}">${icon?`<span class="row-icon">${icon}</span>`:''}<span class="row-main"><span class="row-label">${esc(label)}</span>${sub?`<span class="row-sub">${esc(sub)}</span>`:''}</span>${value?`<span class="row-value">${esc(value)}</span>`:''}<span class="chevron">›</span></button>`;}
function group(content, tight=false){return `<div class="group ${tight?'tight':''}">${content}</div>`;}
function toggle(key,label,note='') { const on=!!prefs[key]; return `<div class="switch-row"><div class="switch-copy"><div class="switch-title">${esc(label)}</div>${note?`<div class="switch-note">${esc(note)}</div>`:''}</div><button class="switch" role="switch" aria-checked="${on}" aria-label="${esc(label)}" data-toggle="${key}"></button></div>`; }
function section(label){return `<div class="section-label">${esc(label)}</div>`;}
function help(t){return `<p class="help">${t}</p>`;}
function settingsPage(){return `${group(row('Account','account','◉',prefs.userName,prefs.userName)+row('Workspace','workspace','▢','Personal','Personal')+row('Upgrade to ChatGPT Plus','subscription','✧','',''),true)}
${group(row('Customize ChatGPT','customize','♧','Personality, memory, plugins and more'),true)}
${group(row('General','general','⚙')+row('Usage and limits','usage','▧')+row('Notifications','notifications','♧')+row('Voice','voice','〽')+row('Safety','safety','⬡')+row('Security and login','security','♙')+row('Data controls','data','▣')+row('Privacy center','privacy','▤')+row('Appearance','appearance','◐')+row('Plugins','plugins','✣'))}
<div class="search-dock"><span>⌕</span><input id="settingsSearch" placeholder="Search settings" aria-label="Search settings"></div>`;}
function accountPage(){return `<div class="center"><div class="account-avatar">CC</div><div class="row-label">${esc(prefs.userName)}</div><div class="small-muted">${esc(prefs.userEmail)}</div></div>${group(row('Email','emailLogin','✉',prefs.userEmail)+row('App','home','♙','18 or older')+row('Subscription','subscription','▣','Free','Free')+row('Upgrade to ChatGPT Plus','subscription','✧','',''))}${group(actionRow('Log out','logout','⇥','',''),'')}`;}
function workspacePage(){return `${group(row('Workspace name','workspace','▢','Personal')+row('Members','workspace','♙','Only you')+row('Workspace settings','workspace','⚙'))}${help('Manage your workspace preferences and members. These controls are local demo settings only.')}`;}
function customizePage(){return `${group(row('Personalization','personalization','☷','Memory, nickname and custom instructions')+row('Plugins','plugins','✣','Connect apps and services')+row('General','general','⚙','Appearance and app preferences'))}${group(toggle('useMemory','Reference saved memories','Let the assistant use saved memories in this demo.')+toggle('referenceMemory','Reference chat history','Use past conversations as context in this demo.'))}`;}
function generalPage(){return `${section('Personal preferences')}
<button class="pill" data-action="accent">Accent color <span><i class="color-dot"></i>${esc(prefs.accent)}　⌄</span></button>
<label class="small-muted" for="nickname">Nickname</label><input class="field" id="nickname" placeholder="Choose nickname" value="${esc(prefs.nickname)}">
<button class="pill" data-action="language">App language <span>${esc(prefs.language)}　⌄</span></button>
${group(actionRow('Reference photos','photos','▧','','Add'),true)}${help('These photos help ChatGPT create images that look more like you.')}
${section('Intelligence')}
<button class="pill" data-action="visual">Visual answers <span>${esc(prefs.visualAnswers)}　⌄</span></button>
${group(toggle('fastAnswers','Fast answers','ChatGPT can use general knowledge to give fast, in-depth answers. These are not personalized and do not use memory.')+toggle('suggestions','Homepage suggestions','ChatGPT can give you suggestions by searching connected plugins.')+toggle('webSearch','Web search')+toggle('librarySearch','Library search'))}`;}
function personalizationPage(){return `${section('About you')}
<label class="small-muted">What should ChatGPT call you?</label><input class="field" id="nickname2" placeholder="Your name" value="${esc(prefs.nickname)}">
<label class="small-muted">Occupation</label><input class="field" id="occupation" placeholder="Add your role or occupation" value="${esc(prefs.occupation)}">
<label class="small-muted">More about you</label><textarea class="field" id="aboutYou" placeholder="Interests, preferences, or anything else you'd like ChatGPT to know">${esc(prefs.aboutYou)}</textarea>
${section('Personalization')}${group(toggle('personalisation','Enable personalization','Customize responses using your preferences.')+toggle('useMemory','Reference saved memories')+toggle('referenceMemory','Reference chat history'))}
${section('Custom instructions')}<textarea class="field" id="customInstructions" placeholder="What would you like ChatGPT to know and how would you like it to respond?">${esc(prefs.customInstructions)}</textarea><button class="primary" data-action="savePersonal">Save</button>`;}
function notificationsPage(){return `${section('Messages')}${group(toggle('chatNotifications','Chat notifications')+toggle('readReceipts','Read receipts')+toggle('sounds','Sounds')+toggle('haptics','Haptics'))}${row('Marketing and product updates','marketing','♧','Choose where you will be notified')}`;}
function marketingPage(){return `${section('Where you’ll be notified')}${group(toggle('push','Push')+toggle('emailUpdates','Email'))}${help('Stay in the loop on new tools and features.')}`;}
function voicePage(){return `<button class="pill" data-action="voiceModel">Model <span>${esc(prefs.voiceModel)}　⌄</span></button>${group(actionRow('Voice','voiceChoice','◖','',prefs.voice)+`<button class="row" data-action="voiceLanguage"><span class="row-main"><span class="row-label">Language</span></span><span class="row-value">${esc(prefs.voiceLanguage)}</span><span class="chevron">⌄</span></button>`+actionRow('Dictation history','dictation','▤'))}
${group(toggle('backgroundVoice','Background conversations','Keep the conversation going in other apps or while your screen is off. Learn more.')+toggle('defaultAssistant','Use as default assistant','Set ChatGPT as your default digital assistant in Android settings'))}`;}
function safetyPage(){return `${group(row('Parental controls','parental','♧','Family settings')+row('Memory','memory','▤','Manage what ChatGPT remembers')+row('Privacy center','privacy','▣','Your privacy choices'))}${help('Review safety and privacy options, and manage personalization preferences.')}`;}
function parentalPage(){return `<p class="setting-note">Parents and teens can link accounts, giving parents tools to adjust certain features, set limits and add safeguards that work for their family. <span class="link" data-action="learn">Learn more</span></p>${group(actionRow('Add family member','addFamily','','',''))}`;}
function securityPage(){return `${group(actionRow('Passkeys','passkeys','♙','Add a passkey for faster, safer sign-in')+actionRow('Locked chats','lockedChats','▣','Account PIN')+actionRow('Multi-factor authentication','mfa','⬡','Authenticator app','Off')+actionRow('Active sessions','sessions','◉','View all devices and sessions','2'))}${group(toggle('requireUnlock','Require device unlock','Use your screen lock or biometrics to unlock protected content.')+row('Advanced account security','advancedSecurity','♙','Extra protection for your account'))}`;}
function advancedSecurityPage(){return `${group(actionRow('Advanced account security','advancedToggle','','','Disabled')+actionRow('Learn more about advanced security','learn','↗'))}${help('Adds the highest level of account security by requiring strong sign-in methods and applying stricter protections to help prevent unauthorized access.')}`;}
function usagePage(){return `${group(row('Plan','subscription','▣','Free')+row('Message limits','usage','◷','View current usage')+row('Storage','storage','▤','302 MB of 512 MB used')+row('Manage plan','subscription','✧'))}`;}
function storagePage(){return `<div class="center" style="padding:18px 0 8px"><div class="small-muted">Storage</div><div class="row-label" style="margin-top:12px">302 MB of 512 MB used</div></div><div class="progress"><span></span></div>${group(row('Files','storage','▤','','199 MB')+row('Images','storage','▧','','104 MB'))}`;}
function pluginsPage(){return `${section('Installed')}${group(`<div class="row"><span class="row-icon">▣</span><span class="row-main"><span class="row-label">App integrations</span><span class="row-sub">Your connected apps appear here</span></span></div>`)}${section('Popular')}${group(actionRow('Gmail','connectGmail','✉','Read and manage Gmail','＋')+actionRow('Google Drive','connectDrive','◉','Drive: Docs, Sheets or Slides','♙')+actionRow('Health','connectHealth','♥','Explore your health data in ChatGPT','＋')+actionRow('GitHub','connectGithub','◉','Triage PRs, issues, CI and publish flows','•••'))}${row('App permissions','permissions','⚙','Choose what connected apps can do')}`;}
function permissionsPage(){return `${section('Preferences')}${group(actionRow('Permissions','permissionMode','◉','',prefs.permissionMode||'Always ask')+actionRow('Allow read actions','readPermissions','◉','Review access for read actions')+actionRow('Allow write actions','writePermissions','◉','Review access for write actions'))}${help('Choose when apps ask for permission before taking actions.')}`;}
function appearancePage(){return `${section('Theme')}${group(actionRow('Color theme','theme','','',prefs.theme||'System')+actionRow('Accent color','accent','','',prefs.accent)+actionRow('App icon','appIcon','','','Default'))}${section('Display')}${group(toggle('showPreview','Show message previews')+toggle('sounds','Interface sounds'))}`;}
function dataPage(){return `${section('Data controls')}${group(toggle('improveModel','Improve the model for everyone','Help improve AI models by sharing eligible content.')+toggle('saveHistory','Chat history','Save conversations in your history.')+actionRow('Archived chats','archiveChats','▤','Manage archived chats')+actionRow('Export data','export','⇩','Download a copy of your data')+actionRow('Delete all chats','deleteChats','⌫','','')+actionRow('Delete account','deleteAccount','⌫','',''))}`;}
function privacyPage(){return `<div class="center"><div class="hero-mark">♙</div><div class="hero-title">Privacy center</div><p class="hero-copy">Learn how your data is used and manage your privacy choices.</p></div>${group(row('Improve the model','data','▣','Choose how your content is used')+row('Export your data','export','⇩','Download a copy of your information')+row('Manage your data','data','▤','Chat history and saved memories')+row('Delete your account','data','⌫'))}<button class="outline" data-action="learn">Learn more</button>`;}
function exportPage(){return `<div class="center"><div class="hero-mark">⇩</div><div class="hero-title">Export your data</div><p class="hero-copy">Download a copy of your chats and account information saved in this demo.</p></div>${group(row('Export format','export','▤','JSON archive','JSON')+row('Email address','account','✉','',prefs.userEmail))}<button class="primary" data-action="export">Request export</button>${help('A local demo file will be created in your browser. No email will be sent.')}`;}
function homePage(){return `<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 2px 18px"><span style="font-size:22px;font-weight:700">ChatGPT</span><button class="icon-btn" data-action="drawer">☰</button></div><div class="hero-mark">✳</div><div class="hero-title">What can I help with?</div><p class="hero-copy">This is an offline interface preview. Try the settings and controls.</p><div class="card-grid"><button class="tile" data-page="explore"><div class="tile-icon">✧</div><div class="tile-title">Explore</div><div class="tile-sub">Discover tools and GPTs</div></button><button class="tile" data-page="projects"><div class="tile-icon">▢</div><div class="tile-title">Projects</div><div class="tile-sub">Organize your work</div></button><button class="tile" data-page="library"><div class="tile-icon">▤</div><div class="tile-title">Library</div><div class="tile-sub">Your saved items</div></button><button class="tile" data-page="settings"><div class="tile-icon">⚙</div><div class="tile-title">Settings</div><div class="tile-sub">Personalize the app</div></button></div>${group(row('Settings','settings','⚙')+row('Plugins','plugins','✣')+row('Account','account','◉'))}`;}
function projectsPage(){return `${section('Your projects')}${group(actionRow('Create a project','newProject','＋','Start a new workspace')+row('Personal','projects','▢','Your private project'))}<button class="primary" data-action="newProject">＋ New project</button>`;}
function libraryPage(){return `${section('Your library')}${group(row('Images','library','▧','Saved images')+row('Files','library','▤','Uploaded files')+row('Archived chats','data','▣'))}`;}
function explorePage(){return `${section('Discover')}${group(row('Writing','explore','✎','Draft, edit and brainstorm')+row('Productivity','explore','▦','Plan and organize')+row('Learning','explore','▤','Understand new topics')+row('Programming','explore','⌘','Build and debug'))}`;}
function loginPage(){return `<div class="center"><div class="hero-mark">✳</div><div class="hero-title">ChatGPT</div><p class="hero-copy">Log in or sign up<br>You'll get smarter responses and can upload files, images and more.</p></div><button class="primary" data-page="emailLogin">Continue with email</button><button class="outline" data-action="google">G　Continue with Google</button><button class="outline" data-page="phoneLogin">☎　Continue with phone</button><p class="small-muted center">Terms of use · Privacy policy</p>`;}
function emailLoginPage(){return `${section('Email')}<input class="field" type="email" id="loginEmail" placeholder="Email address"><button class="primary" data-action="continueEmail">Continue</button><p class="small-muted center">By continuing, you agree to our Terms and Privacy Policy.</p>`;}
function phoneLoginPage(){return `${section('Country / region')}<button class="pill" data-action="country">Nigeria +234 <span>⌄</span></button><input class="field" placeholder="Phone number" inputmode="tel"><button class="primary" data-action="phoneContinue">Continue</button>`;}
function profilePage(){return `<div class="center"><div class="account-avatar">CC</div><div class="row-label">${esc(prefs.userName)}</div><div class="small-muted">${esc(prefs.userEmail)}</div></div>${group(row('Account','account','◉')+row('Settings','settings','⚙')+row('Help center','profile','?'))}`;}

/* Expanded screens added after reviewing both supplied recordings. */
Object.assign(defaults, {
  styleTone:'Default', warmth:55, enthusiasm:55, headersLists:true, emoji:true,
  scheduledBriefing:false, outfitSuggestions:false, fridayRecommendations:false,
  greetingExchange:false, personalizedAds:false, preciseLocation:false,
  useLocation:false, permissionMode:'Allow low-risk actions',
  countryCode:'Nigeria +234', chatDraft:'', projectName:'', chatHistory:[], projects:[],
  memoryItems:['Prefers concise explanations','Interested in creative image prompts'],
  currentVoiceSession:false, showImageTemplates:true
});
for (const [k,v] of Object.entries(defaults)) if (prefs[k] === undefined) prefs[k] = v;
Object.assign(pageTitles, {
  personality:'Personality', memory:'Memory', calendar:'Calendar', contacts:'Contacts', wallet:'Wallet',
  passwords:'Passwords', location:'Location', historyData:'History and data', adsControls:'Ads controls',
  personalizedAds:'Personalized ads', chatPrivacy:'Chat privacy', dataAccess:'Data use and access',
  exportFaq:'Export or delete your data', mfaInfo:'Multi-factor authentication (MFA)',
  browsePlugins:'Browse plugins', projectCreate:'New project', chat:'ChatGPT', images:'Images',
  voiceMode:'Voice', remote:'Remote', scheduled:'Scheduled', codex:'Codex', accountChooser:'Choose an account'
});
function sliderControl(key,label,sub=''){
  const v=Math.max(0,Math.min(100,Number(prefs[key] ?? 50)));
  return `<div class="slider-control"><div class="slider-head"><span>${esc(label)}</span><span id="${key}Value">${v}</span></div>${sub?`<p class="slider-sub">${esc(sub)}</p>`:''}<input type="range" min="0" max="100" value="${v}" data-range="${key}" aria-label="${esc(label)}"></div>`;
}
function personalityPage(){return `${section('Style and tone')}<button class="pill" data-action="styleTone">Style and tone <span>${esc(prefs.styleTone||'Default')}　⌄</span></button>${group(sliderControl('warmth','Warmth')+sliderControl('enthusiasm','Enthusiasm')+toggle('headersLists','Headers and lists')+toggle('emoji','Emoji'))}${section('Custom instructions')}<textarea class="field" id="personalityInstructions" placeholder="Share anything else you’d like ChatGPT to consider in its response">${esc(prefs.personalityInstructions||'')}</textarea><button class="primary" data-action="savePersonality">Save changes</button>`;}
function memoryPage(){return `${section('Memory')}${group(toggle('useMemory','Reference saved memories','Allow ChatGPT to use saved memories when responding.')+toggle('referenceMemory','Reference chat history','Allow ChatGPT to reference previous chats.'))}<div class="section-label">Saved memories</div>${group((prefs.memoryItems||[]).map((x,i)=>`<div class="row"><span class="row-main"><span class="row-label">${esc(x)}</span><span class="row-sub">Saved memory · demo item</span></span><button class="mini-action" data-action="removeMemory" data-index="${i}">Remove</button></div>`).join('')||'<div class="empty-note">No saved memories yet.</div>')}<button class="outline" data-action="clearMemories">Clear all memories</button>${help('Memory controls are stored only in this browser prototype.')}`;}
function customizePage(){return `${group(row('Personality','personality','◉',prefs.styleTone||'Default')+row('Memory','memory','▤','1 hour ago')+row('Plugins','plugins','✣','4 added'))}${group(row('Email','emailConnect','✉','Set up')+row('Calendar','calendar','▦','Set up')+row('Contacts','contacts','♙','Set up')+row('Wallet','wallet','▣','Coming soon')+row('Passwords','passwords','♙',`${(prefs.savedPasswords||[]).length} items`))}${group(row('Location','location','🌐','Set up'))}`;}
function emailConnectPage(){return `<div class="integration-hero"><div class="integration-icon">✉</div><h2>Email</h2><p>Connect your email to find messages, summarize conversations and draft replies.</p></div>${group(row('Connection status','emailConnect','✉','Not connected')+row('Permissions','permissions','⚙','Choose access level'))}<button class="primary" data-action="setupEmail">Add email</button>${help('This local prototype does not connect to an email provider.')}`;}
function calendarPage(){return `<div class="integration-card"><div class="integration-icon">▦</div><h2>Calendar</h2><p>Plan your day, schedule meetings and manage your calendar.</p></div><div class="empty-note">No calendars connected. Add a calendar to get started.</div><button class="primary bottom-action" data-action="setupCalendar">Add calendar</button>`;}
function contactsPage(){return `<div class="integration-card"><div class="integration-icon">♙</div><h2>Contacts</h2><p>Find people and keep contact details available to your assistant.</p></div><div class="empty-note">No contacts connected.</div><button class="primary bottom-action" data-action="setupContacts">Add contacts</button>`;}
function walletPage(){return `<div class="integration-card"><div class="integration-icon">▣</div><h2>Wallet</h2><p>Wallet integration is shown as a coming-soon feature in the reference interface.</p></div>${group(row('Status','wallet','▣','Coming soon'))}`;}
function passwordsPage(){return `<div class="integration-card"><div class="integration-icon">♙</div><h2>Passwords</h2><p>Manage the password integration shown in the reference interface.</p></div>${group(row('Saved items','passwords','▤',`${(prefs.savedPasswords||[]).length} items`))}<button class="outline" data-action="setupPasswords">Set up passwords</button>${help('No passwords are stored or accessed by this demo.')}`;}
function locationPage(){return `<div class="center"><div class="large-icon">⌖</div><div class="hero-title">Location</div><p class="hero-copy">Learn more about how ChatGPT uses location information.</p></div><button class="primary" data-action="manageLocation">Manage ↗</button><div class="faq-list">${faq('When does ChatGPT use location information?','ChatGPT may estimate your general area from your IP address to improve local results and help protect your account. Precise location is controlled separately.')}${faq('How do I turn precise location on or off?','You can enable or disable precise location in your device or app permissions. This prototype stores only a local demo preference.')}${faq('Does ChatGPT save my precise location?','This prototype does not collect, store or transmit your location.')}${faq('Does ChatGPT share my precise location?','No location is shared by this offline demonstration.')}</div><button class="outline" data-action="learn">Learn more ↗</button>`;}
function faq(q,a){return `<details class="faq"><summary>${esc(q)}<span class="faq-plus">＋</span></summary><p>${esc(a)}</p></details>`;}
function pluginsPage(){return `${section('Preferences')}${group(actionRow('Permissions','permissionMode','◉','',prefs.permissionMode||'Allow low-risk actions'))}${section('Added')}${group(actionRow('AppDeploy','pluginAppDeploy','▣','Deployment tool','›')+actionRow('appdesigns','pluginAppDesigns','◧','Design integration','›')+actionRow('GitHub','connectGithub','◉','Triage PRs, issues, CI and publish flows','›')+actionRow('Plugin Management','pluginManagement','✣','Manage installed plugins','›'))}${section('Popular')}${group(actionRow('Gmail','connectGmail','✉','Read and manage Gmail','＋')+actionRow('Google Drive','connectDrive','◉','Docs, Sheets or Slides','♙')+actionRow('Health','connectHealth','♥','Explore health data','＋')+actionRow('GitHub','connectGithub','◉','Code and repositories','•••'))}${row('New & noteworthy','browsePlugins','✦','Recent plugins')}${row('Browse plugins','browsePlugins','▦','Explore available integrations')}`;}
function permissionsPage(){return `${section('Preferences')}${group(actionRow('Permissions','permissionMode','◉','',prefs.permissionMode||'Allow low-risk actions'))}<div class="section-label">Added apps</div>${group(row('AppDeploy','plugins','▣')+row('appdesigns','plugins','◧')+row('GitHub','plugins','◉')+row('Plugin Management','plugins','✣'))}<button class="outline" data-page="browsePlugins">Browse plugins</button>${help('Choose what connected apps are allowed to do. All permissions here are simulated locally.')}`;}
function browsePluginsPage(){return `${section('Discover plugins')}<input class="field" id="pluginSearch" placeholder="Search plugins"><div class="plugin-grid">${[['Gmail','✉','Email'],['Google Drive','◉','Files'],['Health','♥','Health data'],['GitHub','◉','Developer tools'],['AppDeploy','▣','Deployment'],['appdesigns','◧','Design']].map(([n,i,d])=>`<button class="plugin-card" data-action="pluginInstall" data-plugin="${n}"><span>${i}</span><b>${n}</b><small>${d}</small><em>${(prefs.installedPlugins||[]).includes(n)?'✓ Added':'＋ Add'}</em></button>`).join('')}</div>`;}
function settingsPage(){return `${group(row('Account','account','◉',prefs.userName,prefs.userName)+row('Workspace','workspace','▢','Personal','Personal')+row('Upgrade to ChatGPT Plus','subscription','✧','',''),true)}${group(row('Customize ChatGPT','customize','♧','Personality, memory, plugins and more'),true)}${group(row('General','general','⚙')+row('Usage and limits','usage','▧')+row('Notifications','notifications','♧')+row('Voice','voice','〽')+row('Safety','safety','⬡')+row('Security and login','security','♙')+row('Codex','codex','⌘')+row('Storage','storage','▤')+row('Privacy center','privacy','▣')+row('History and data','historyData','▤')+row('Ads controls','adsControls','◉'))}<div class="search-dock"><span>⌕</span><input id="settingsSearch" placeholder="Search settings" aria-label="Search settings"></div>`;}
function historyDataPage(){return `${group(toggle('improveModel','Improve the model for everyone','Allow your content to be used to improve our models for you and others.')+actionRow('Export Data','export','⇩')+actionRow('Delete OpenAI account','deleteAccount','⌫'))}${section('Apps with access')}${group(row('Do apps have access to your contact information?','contacts','♙','Manage connected app access'))}${section('Chat history')}${group(row('View archived chats','archivedChats','▤')+actionRow('Archive chat history','archiveHistory','▤')+actionRow('Clear chat history','deleteChats','⌫'))}`;}
function privacyPage(){return `<div class="privacy-hero"><div class="large-icon">▣</div><h2>Privacy center</h2><p>Clear answers about privacy. Simple ways to stay in control.</p></div>${section('Explore your options')}${group(row('Personalized chats & ads','personalizedAds','◉')+row('Chat privacy','chatPrivacy','▣')+row('Data use & access','dataAccess','▤'))}${section('Our approach to privacy')}<div class="privacy-tiles"><div><b>♙</b><span>We don't sell your data</span></div><div><b>⬡</b><span>We secure your information</span></div></div>${section('Learn and act')}<div class="learn-tiles"><button data-page="exportFaq">Export or delete your data</button><button data-page="personalizedAds">Personalized ads</button><button data-page="historyData">History and data</button></div>`;}
function personalizedAdsPage(){return `<div class="center"><div class="large-icon">⚑</div><div class="hero-title">Personalized ads</div><p class="hero-copy">Choose whether the ads you see are personalized using your data.</p></div><button class="primary" data-page="adsControls">Manage ↗</button><div class="faq-list">${faq('How do personalized ads work?','Personalized ads may use activity and preferences to make ads more relevant. This prototype does not serve or personalize advertisements.')}${faq('Can ads affect ChatGPT’s answers?','No. Ads and assistant responses are separate in this demo.')}${faq('How do I manage personalized ads?','Use the local preference switch on the Ads controls page.')}</div><button class="outline" data-action="learn">Learn more ↗</button>`;}
function adsControlsPage(){return `${section('Ads controls')}${group(toggle('personalizedAds','Personalized ads','Use information to personalize ads in this demonstration.'))}${help('The switch changes only the local demonstration preference; this app does not display ads.')}${row('About personalized ads','personalizedAds','⚑')}`;}
function chatPrivacyPage(){return `${section('Chat privacy')}${group(toggle('saveHistory','Save chat history')+toggle('readReceipts','Read receipts')+toggle('requireUnlock','Require device unlock'))}${help('These demo controls are saved in this browser only.')}`;}
function dataAccessPage(){return `${section('Data use and access')}${group(row('Export your data','exportFaq','⇩')+row('History and data','historyData','▤')+row('Connected apps','permissions','✣'))}`;}
function exportFaqPage(){return `<div class="center"><div class="large-icon">⇩</div><div class="hero-title">Export or delete your data</div><p class="hero-copy">Download a copy of your data, delete chats or permanently delete your account.</p></div><button class="primary" data-page="export">Manage ↗</button><div class="faq-list">${faq('What’s included in a data export?','Your export in a real service may include chat history and relevant account data. This demo exports only its local preferences.')}${faq('How do I export my data?','Open Export your data and choose Request export to download the local JSON preferences file.')}${faq('Can I delete chats without deleting my account?','This prototype can clear only its demo chat list. It cannot access or delete any real account data.')}${faq('What happens if I delete my account?','No real account can be deleted from this offline demonstration.')}</div><button class="outline" data-action="learn">Learn more ↗</button>`;}
function mfaInfoPage(){return `<div class="center"><div class="large-icon">♙</div><div class="hero-title">Multi-factor authentication (MFA)</div><p class="hero-copy">Add an extra verification step to help protect your account when you log in.</p></div><button class="primary" data-page="security">Manage ↗</button><div class="faq-list">${faq('What are the benefits of MFA?','MFA adds another verification step beyond a password.')}${faq('What verification methods can I use?','Available methods depend on the real service and account. This demo does not verify identity.')}${faq('How do I turn multi-factor authentication on or off?','Open Security and login to view the simulated MFA preference.')}</div><button class="outline" data-action="learn">Learn more ↗</button>`;}
function codexPage(){return `${section('Codex')}${group(row('Codex preferences','codex','⌘','Developer tools')+toggle('codexNotifications','Codex notifications')+toggle('codexBackground','Background tasks'))}${help('Codex controls are visual demo settings only.')}`;}
function storagePage(){return `<div class="storage-screen"><div class="storage-grip"></div><div class="center"><div class="hero-title">Storage</div><p class="hero-copy">302 MB of 512 MB used</p></div><div class="progress"><span></span></div>${group(row('Files','library','▤','','199 MB')+row('Images','library','▧','','104 MB'))}</div>`;}
function projectsPage(){return `<div class="filter-pills"><button class="filter-pill active" data-filter="All">All</button><button class="filter-pill" data-filter="Created by you">Created by you</button><button class="filter-pill" data-filter="Shared with you">Shared with you</button></div>${(prefs.projects||[]).length?group((prefs.projects||[]).map((n,i)=>row(n,'projectCreate','▢','Created by you')).join('')):`<div class="empty-state"><div class="empty-icon">▣</div><h3>No projects yet</h3><p>Create a project to organize chats around a topic or sources.</p><button class="primary" data-page="projectCreate">New project</button></div>`}<div class="search-dock"><span>⌕</span><input id="projectSearch" placeholder="Search"></div>`;}
function projectCreatePage(){return `${section('Project details')}<label class="small-muted" for="projectName">Project name</label><input class="field" id="projectName" placeholder="Enter a project name" value="${esc(prefs.projectName||'')}"><label class="small-muted" for="projectInstructions">Instructions</label><textarea class="field" id="projectInstructions" placeholder="What should this project focus on?"></textarea><button class="primary" data-action="saveProject">Create project</button>`;}
function homePage(){return `<div class="home-actions"><button class="icon-btn" data-action="drawer">☰</button><button class="upgrade-chip" data-page="subscription">✦ Get Plus</button><button class="icon-btn" data-page="chat">◌</button></div><div class="home-space"></div><div class="home-shortcuts"><button data-page="images">▧　Create an image or sticker</button><button data-page="chat">✎　Write or edit</button></div><div class="chat-composer"><button data-action="composerPlus">＋</button><input id="homePrompt" placeholder="Ask ChatGPT"><button data-page="voiceMode">◖</button><button class="send-button" data-action="sendHome">↑</button></div>`;}
function chatPage(){return `<div class="chat-thread">${(prefs.chatHistory||[]).map(m=>`<div class="chat-bubble ${m.role==='user'?'user-bubble':'assistant-bubble'}">${esc(m.text)}</div>`).join('')||'<div class="chat-empty">Your conversation will appear here.</div>'}</div><div class="chat-composer"><button data-action="composerPlus">＋</button><input id="chatInput" placeholder="Message ChatGPT"><button data-action="voiceMode">◖</button><button class="send-button" data-action="sendChat">↑</button></div>`;}
function imagesPage(){const tab=prefs.imagesTab||'Trending';const sets={Trending:[['assets/gallery/trending_1.jpg','Anime reaction','Anime reaction'],['assets/gallery/trending_2.jpg','Aerial view','Aerial view'],['assets/gallery/trending_3.jpg','Collector’s tin','Collector’s tin'],['assets/gallery/trending_4.jpg','80s flashback','80s flashback'],['assets/gallery/trending_5.jpg','Character portrait','Character portrait'],['assets/gallery/trending_6.jpg','Minimal flower','Minimal flower']],Templates:[['assets/gallery/template_1.jpg','Product photo','Product photo'],['assets/gallery/template_2.jpg','Merch','Merch'],['assets/gallery/template_3.jpg','Infographic','Infographic'],['assets/gallery/template_4.jpg','Flyer','Flyer'],['assets/gallery/template_5.jpg','Book cover','Book cover'],['assets/gallery/template_6.jpg','App mockup','App mockup']]};return `<div class="filter-pills"><button class="filter-pill ${tab==='Trending'?'active':''}" data-filter="Trending">Trending</button><button class="filter-pill ${tab==='Templates'?'active':''}" data-filter="Templates">Templates</button></div><div class="image-gallery">${sets[tab].map(([src,alt,name])=>`<button class="image-card photo-card" data-action="imagePrompt" data-prompt="${name}"><img src="${src}" alt="${alt}"></button>`).join('')}</div><div class="chat-composer"><button data-action="attachImage">▧</button><input id="imagePrompt" placeholder="Describe an image"><button data-action="voiceMode">◖</button><button class="send-button" data-action="sendImagePrompt">↑</button></div>`;}
function voiceModePage(){return `<div class="voice-mode"><div class="voice-orb"></div><div class="voice-note">${prefs.currentVoiceSession?'Listening…':'Voice conversation'}</div><div class="voice-bottom"><button data-action="toggleVoiceSession">${prefs.currentVoiceSession?'Pause':'Start speaking'}</button><button data-action="toggleMic">${prefs.micMuted?'Unmute mic':'Mute mic'}</button><button class="close-voice" data-page="home">×</button></div></div>`;}
function remotePage(){return `<div class="center"><div class="large-icon">▣</div><div class="hero-title">Remote</div><p class="hero-copy">Remote tools shown in the reference navigation.</p></div>${group(row('Open remote workspace','home','⌘','Demo only'))}`;}
function scheduledPage(){return `${section('Scheduled tasks')}${group(toggle('scheduledBriefing','Schedule daily briefing')+toggle('outfitSuggestions','Schedule outfit suggestions')+toggle('fridayRecommendations','Schedule Friday recommendations')+toggle('greetingExchange','Greeting exchange'))}${help('These switches save local preferences. No scheduled jobs will run.')}`;}
function accountChooserPage(){return `<div class="center"><div class="hero-mark">✳</div><div class="hero-title">Choose an account</div><p class="hero-copy">Continue with a demo account or choose another sign-in method.</p></div>${group(row('Demo account','profile','◉','demo.account@example.com')+row('Another demo account','profile','◉','second.account@example.com'))}<button class="outline" data-action="google">Continue with Google</button><button class="outline" data-page="login">Log in another way</button>`;}
function explorePage(){return `<div class="card-grid"><button class="tile" data-page="images"><div class="tile-icon">▧</div><div class="tile-title">Images</div><div class="tile-sub">Trending and templates</div></button><button class="tile" data-page="projects"><div class="tile-icon">▣</div><div class="tile-title">Projects</div><div class="tile-sub">Organize your work</div></button><button class="tile" data-page="plugins"><div class="tile-icon">✣</div><div class="tile-title">Plugins</div><div class="tile-sub">Connected apps</div></button><button class="tile" data-page="voiceMode"><div class="tile-icon">◖</div><div class="tile-title">Voice</div><div class="tile-sub">Talk with ChatGPT</div></button></div>`;}


function securityPage(){return `${group(row('Passkeys','passkeys','♙','Security keys and passkeys')+row('Locked chats','lockedChats','▣','Account PIN')+row('Multi-factor authentication','mfa','⬡','Authenticator app',prefs.mfaEnabled?'On':'Off')+row('Active sessions','sessions','◉','View devices and sessions','2'))}${group(toggle('requireUnlock','Require device unlock','Use your screen lock or biometrics to unlock protected content.')+row('Advanced account security','advancedSecurity','♙','Extra protection for your account'))}`;}
function passkeysPage(){return `<div class="center"><div class="large-icon">♙</div><div class="hero-title">Add a passkey</div><p class="hero-copy">Passkeys are more secure than a password and adding one takes less than a minute.</p></div><button class="primary" data-action="addPasskey">♙　Add a security key or a Passkey</button>${help('This is a demo screen. No passkey will be created on your device.')}`;}
function lockedChatsPage(){return `${section('Locked chats')}${group(actionRow('Account PIN','setAccountPin','▣','Set or change your PIN'))}${help('Use a PIN to control access to locked chats in the reference interface.')}`;}
function mfaPage(){return `${section('Multi-factor authentication')}${group(row('Authenticator app','mfaInfo','⬡','Learn about verification',prefs.mfaEnabled?'On':'Off')+toggle('mfaEnabled','Enable multi-factor authentication','Local demo switch only.'))}${row('Learn about MFA','mfaInfo','↗')}`;}
function sessionsPage(){return `${section('Active sessions')}${group(row('This device','sessions','▣','Android · Current session')+row('Other device','sessions','▣','Demo session · Last active recently'))}<button class="outline" data-action="signOutSessions">Log out of all other devices</button>${help('Session records are sample entries and are not linked to a real account.')}`;}
function loginPage(){return `<div class="center login-hero"><div class="hero-mark">✳</div><div class="hero-title">ChatGPT</div><p class="hero-copy">Log in or sign up<br>Get smarter responses and upload files, images and more.</p></div><button class="primary" data-page="accountChooser">Continue with this account</button><button class="outline" data-action="google">G　Continue with Google</button><button class="outline" data-page="emailLogin">Log in another way</button><p class="small-muted center">Terms of use · Privacy policy</p>`;}
function drawer(){const quick=[['scheduledBriefing','Schedule daily briefing'],['outfitSuggestions','Schedule outfit suggestions'],['fridayRecommendations','Schedule Friday recommendations'],['greetingExchange','Greeting exchange']];return `<nav class="drawer"><div class="drawer-head"><h2>ChatGPT</h2><button class="icon-btn" data-action="searchDrawer">⌕</button></div><button class="drawer-item" data-page="library">▤　Library</button><button class="drawer-item" data-page="customize">☷　Customize</button><button class="drawer-item" data-page="projects">▣　Projects</button><button class="drawer-item" data-page="remote">▣　Remote</button><button class="drawer-item" data-page="scheduled">◷　Scheduled</button><button class="drawer-item" data-page="plugins">✣　Plugins</button><div class="drawer-divider"></div><div class="drawer-shortcuts">${quick.map(([k,l])=>`<div class="drawer-schedule-row"><span>${l}</span><button class="switch" role="switch" aria-checked="${!!prefs[k]}" aria-label="${l}" data-toggle="${k}"></button></div>`).join('')}</div><button class="drawer-item" data-page="chat">See all chats…</button><div class="drawer-foot"><button class="drawer-item" data-page="home">✎　Chat</button><button class="drawer-item" data-page="profile">◉　${esc(prefs.userName)}</button><button class="drawer-item" data-page="settings">⚙　Settings</button></div></nav>`;}


function phoneLoginPage(){return `${section('Country / region')}<button class="pill" data-action="country">${esc(prefs.countryCode||'Nigeria +234')} <span>⌄</span></button><input class="field" placeholder="Phone number" inputmode="tel"><button class="primary" data-action="phoneContinue">Continue</button>`;}
function archivedChatsPage(){return `${section('Archived chats')}${group((prefs.archivedChats||[]).map(x=>row(x,'chat','▤','Archived conversation')).join('')||'<div class="empty-note">No archived chats in this demo.</div>')}`;}

const pages={settings:settingsPage,account:accountPage,workspace:workspacePage,customize:customizePage,general:generalPage,personalization:personalizationPage,notifications:notificationsPage,marketing:marketingPage,voice:voicePage,safety:safetyPage,parental:parentalPage,security:securityPage,advancedSecurity:advancedSecurityPage,usage:usagePage,storage:storagePage,plugins:pluginsPage,permissions:permissionsPage,appearance:appearancePage,data:dataPage,privacy:privacyPage,export:exportPage,home:homePage,projects:projectsPage,library:libraryPage,explore:explorePage,login:loginPage,emailLogin:emailLoginPage,phoneLogin:phoneLoginPage,profile:profilePage,subscription:()=>`${group(row('Current plan','subscription','▣','Free')+row('Upgrade to Plus','subscription','✧','More access and features'))}`};

Object.assign(pages, {
  personality:personalityPage, memory:memoryPage, emailConnect:emailConnectPage,
  calendar:calendarPage, contacts:contactsPage, wallet:walletPage, passwords:passwordsPage,
  location:locationPage, historyData:historyDataPage, adsControls:adsControlsPage,
  personalizedAds:personalizedAdsPage, chatPrivacy:chatPrivacyPage, dataAccess:dataAccessPage,
  exportFaq:exportFaqPage, mfaInfo:mfaInfoPage, browsePlugins:browsePluginsPage,
  projectCreate:projectCreatePage, chat:chatPage, images:imagesPage, voiceMode:voiceModePage,
  remote:remotePage, scheduled:scheduledPage, codex:codexPage, accountChooser:accountChooserPage,
  plugins:pluginsPage, permissions:permissionsPage, customize:customizePage,
  settings:settingsPage, home:homePage, projects:projectsPage, privacy:privacyPage,
  storage:storagePage, explore:explorePage, passkeys:passkeysPage, lockedChats:lockedChatsPage,
  mfa:mfaPage, sessions:sessionsPage, archivedChats:archivedChatsPage
});

function render(){header(); screen.innerHTML=(pages[currentPage]||settingsPage)(); if(drawerOpen) screen.insertAdjacentHTML('afterbegin',drawer());}
function drawer(){const quick=[['scheduledBriefing','Schedule daily briefing'],['outfitSuggestions','Schedule outfit suggestions'],['fridayRecommendations','Schedule Friday recommendations'],['greetingExchange','Greeting exchange']];return `<nav class="drawer"><div class="drawer-head"><h2>ChatGPT</h2><button class="icon-btn" data-action="searchDrawer">⌕</button></div><button class="drawer-item" data-page="library">▤　Library</button><button class="drawer-item" data-page="customize">☷　Customize</button><button class="drawer-item" data-page="projects">▣　Projects</button><button class="drawer-item" data-page="remote">▣　Remote</button><button class="drawer-item" data-page="scheduled">◷　Scheduled</button><button class="drawer-item" data-page="plugins">✣　Plugins</button><div class="drawer-divider"></div><div class="drawer-shortcuts">${quick.map(([k,l])=>`<div class="drawer-schedule-row"><span>${l}</span><button class="switch" role="switch" aria-checked="${!!prefs[k]}" aria-label="${l}" data-toggle="${k}"></button></div>`).join('')}</div><button class="drawer-item" data-page="chat">See all chats…</button><div class="drawer-foot"><button class="drawer-item" data-page="home">✎　Chat</button><button class="drawer-item" data-page="profile">◉　${esc(prefs.userName)}</button><button class="drawer-item" data-page="settings">⚙　Settings</button></div></nav>`;}
function toast(msg){clearTimeout(toastTimer); let old=$('.toast'); if(old) old.remove(); const t=document.createElement('div');t.className='toast';t.textContent=msg;$('#device').append(t);toastTimer=setTimeout(()=>t.remove(),2600);}
function openModal(title,copy,options=[]){modalLayer.hidden=false;modalLayer.innerHTML=`<div class="modal"><div class="modal-handle"></div><div class="modal-title">${esc(title)}</div>${copy?`<p class="modal-copy">${esc(copy)}</p>`:''}${options.map(o=>`<button class="option" data-choice="${esc(o.value)}">${esc(o.label)}</button>`).join('')}<button class="secondary" data-action="closeModal">Cancel</button></div>`;}
function confirm(title,copy,yes, danger=false){modalLayer.hidden=false;modalLayer.innerHTML=`<div class="modal"><div class="modal-handle"></div><div class="modal-title">${esc(title)}</div><p class="modal-copy">${esc(copy)}</p><button class="${danger?'secondary':'primary'}" data-confirm="${yes}">${danger?'Continue':'Confirm'}</button><button class="secondary" data-action="closeModal">Cancel</button></div>`;}
function exportFile(){const payload={exportedAt:new Date().toISOString(),prototype:'Offline mobile UI demo',preferences:prefs};const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='mobile-ai-demo-data.json';a.click();URL.revokeObjectURL(url);toast('Demo data export created.');}
function choose(action){const lists={accent:['Blue','Green','Purple','Orange','Pink','Default'],language:['English','French','Spanish','Portuguese','Arabic','Chinese','Hindi'],visual:['Default','Always','On demand'],voiceModel:['Live','Standard'],voiceChoice:['Vale','Juniper','Arbor','Cove','Ember','Maple','Sol'],voiceLanguage:['Auto-detect','Afrikaans','Albanian','Arabic','Azerbaijani','Bengali','Bulgarian','Catalan','Chinese','Croatian','Czech','Danish','Dutch','English','Estonian','Finnish','French','German','Greek','Gujarati','Hebrew','Hindi','Hungarian','Icelandic','Indonesian','Italian','Japanese','Kannada','Korean','Latvian','Lithuanian','Malay','Malayalam','Marathi','Nepali','Norwegian','Persian','Polish','Portuguese','Punjabi','Romanian','Russian','Serbian','Slovak','Slovenian','Spanish','Swahili','Swedish','Tagalog','Tamil','Telugu','Thai','Traditional Chinese (Hong Kong)','Traditional Chinese (Taiwan)','Turkish','Ukrainian','Urdu','Vietnamese','Welsh','Yoruba'],theme:['System','Dark','Light'],appIcon:['Default','Classic','Minimal','Glow'],permissionMode:['Always ask','Allow once','Allow during this chat']};const keyMap={accent:'accent',language:'language',visual:'visualAnswers',voiceModel:'voiceModel',voiceChoice:'voice',voiceLanguage:'voiceLanguage',theme:'theme',appIcon:'appIcon',permissionMode:'permissionMode'};if(lists[action]){activePreferenceKey=keyMap[action];openModal(({accent:'Accent color',language:'App language',visual:'Visual answers',voiceModel:'Model',voiceChoice:'Choose a voice',voiceLanguage:'Voice language',theme:'Color theme',appIcon:'App icon',permissionMode:'Permission preferences'})[action],'Select an option.',lists[action].map(x=>({label:(prefs[keyMap[action]]===x?'✓　':'')+x,value:x})));}else if(action==='logout'){confirm('Log out?','This demo does not have an active account session. Return to the welcome screen?','logout',true);}else if(action==='photos'){openModal('Reference photos','Choose a local demo option.',[{label:'Add a photo (demo)',value:'photo'},{label:'Manage reference photos',value:'manage'}]);}else if(action==='deleteChats'||action==='deleteAccount'){confirm(action==='deleteChats'?'Delete all chats?':'Delete account?','This is a visual demo. No real account or chats will be deleted.','demoDelete',true);}else if(action==='export'){exportFile();}else if(action==='addFamily'){openModal('Add family member','Family linking is not connected in this offline prototype.',[{label:'Learn about family settings',value:'learn'}]);}else if(action==='passkeys'||action==='lockedChats'||action==='mfa'||action==='sessions'||action==='dictation'||action==='archiveChats'||action==='connectGmail'||action==='connectDrive'||action==='connectHealth'||action==='connectGithub'||action==='readPermissions'||action==='writePermissions'||action==='permissionMode'||action==='advancedToggle'||action==='learn'||action==='google'||action==='country'||action==='newProject'){toast('This action is a demo placeholder.');}else if(action==='defaultAssistant'){prefs.defaultAssistant=!prefs.defaultAssistant;save();render();}else if(action==='headerAction'){openModal('About this prototype','This is an offline UI demonstration. It is not the official ChatGPT application.',[{label:'Open home screen',value:'home'}]);}}
function clickChoice(value){
  if(value==='home'){nav('home');}
  else if(value==='photo'||value==='manage'||value==='learn'){toast('This option is a demo placeholder.');}
  else if(activePreferenceKey){prefs[activePreferenceKey]=value;save();render();toast('Preference updated.');}
  else {toast('This option is a demo placeholder.');}
  activePreferenceKey=null;modalLayer.hidden=true;
}
function handleAction(action){if(action==='back')return back();if(action==='drawer'){drawerOpen=!drawerOpen;render();return;}if(action==='closeModal'){modalLayer.hidden=true;return;}if(action==='savePersonal'){prefs.nickname=$('#nickname2')?.value||'';prefs.occupation=$('#occupation')?.value||'';prefs.aboutYou=$('#aboutYou')?.value||'';prefs.customInstructions=$('#customInstructions')?.value||'';save();toast('Personalization saved.');return;}if(action==='continueEmail'){const v=$('#loginEmail')?.value||'';if(!v.includes('@')){toast('Enter a valid email address.');return;}prefs.userEmail=v;save();toast('Demo email saved. No sign-in was performed.');nav('home');return;}if(action==='phoneContinue'){toast('Phone sign-in is not connected in this demo.');return;}if(action==='google'){toast('Google sign-in is not connected in this demo.');return;}choose(action);}

const baseHandleAction = handleAction;
handleAction = function(action, element){
  if(action==='styleTone'){
    activePreferenceKey='styleTone';
    openModal('Style and tone','Choose the response style.', ['Default','Professional','Friendly','Candid','Quirky','Efficient','Nerdy','Cynical'].map(x=>({label:(prefs.styleTone===x?'✓　':'')+x,value:x})));
  } else if(action==='permissionMode'){
    activePreferenceKey='permissionMode';
    openModal('Permissions','Choose when connected apps may take actions.', ['Always ask','Allow read actions','Allow low-risk actions'].map(x=>({label:(prefs.permissionMode===x?'◉　':'○　')+x,value:x})));
  } else if(action==='country'){
    activePreferenceKey='countryCode';
    openModal('Choose your country code','Select a country or region.', ['Nigeria +234','United States +1','United Kingdom +44','Ghana +233','South Africa +27','India +91','Canada +1','Australia +61','Kenya +254','United Arab Emirates +971'].map(x=>({label:(prefs.countryCode===x?'✓　':'')+x,value:x})));
  } else if(action==='savePersonality'){
    prefs.personalityInstructions=$('#personalityInstructions')?.value||''; save(); toast('Personality preferences saved.'); render();
  } else if(action==='saveProject'){
    const name=($('#projectName')?.value||'').trim();
    if(!name){toast('Enter a project name first.');return;}
    prefs.projects=[...(prefs.projects||[]),name]; prefs.projectName=''; save(); nav('projects'); toast('Project created in this demo.');
  } else if(action==='sendChat'||action==='sendHome'||action==='sendImagePrompt'){
    const field=action==='sendHome'?'#homePrompt':action==='sendImagePrompt'?'#imagePrompt':'#chatInput';
    const value=($(field)?.value||'').trim(); if(!value){toast('Type a message first.');return;}
    prefs.chatHistory=[...(prefs.chatHistory||[]),{role:'user',text:value},{role:'assistant',text:'This is a local interface preview. Connect an AI service to receive live responses.'}];
    save(); nav('chat');
  } else if(action==='imagePrompt'){
    prefs.selectedImagePrompt=$('#imagePrompt')?.value || element?.dataset?.prompt || document.querySelector('[data-prompt]')?.dataset.prompt || 'Create an image';
    nav('chat');
  } else if(action==='toggleVoiceSession'){
    prefs.currentVoiceSession=!prefs.currentVoiceSession; save(); render();
  } else if(action==='toggleMic'){
    prefs.micMuted=!prefs.micMuted; save(); render();
  } else if(action==='manageLocation'){
    activePreferenceKey='useLocation'; openModal('Location settings','Toggle the local location demonstration.',[{label:'Allow location in this demo',value:'true'},{label:'Keep location off',value:'false'}]);
  } else if(action==='removeMemory'){
    const idx=Number(element?.dataset?.index ?? -1);
    if(idx>=0){prefs.memoryItems.splice(idx,1);save();render();}
  } else if(action==='clearMemories'){
    confirm('Clear saved memories?','Only the sample memories in this local demo will be removed.','clearDemoMemories',true);
  } else if(action==='pluginInstall'||action==='connectGmail'||action==='connectDrive'||action==='connectHealth'||action==='connectGithub') {
    const plug=element?.dataset?.plugin || ({connectGmail:'Gmail',connectDrive:'Google Drive',connectHealth:'Health',connectGithub:'GitHub'}[action]||'Plugin');
    prefs.installedPlugins=[...new Set([...(prefs.installedPlugins||[]),plug])]; save(); toast(plug+' added to the local demo list.'); render();
  } else if(action==='addPasskey'||action==='setAccountPin'||action==='signOutSessions'||action==='searchDrawer') {
    toast('Demo only: security and search services are not connected.');
  } else if(action==='setupEmail'||action==='setupCalendar'||action==='setupContacts'||action==='setupWallet'||action==='setupPasswords'||action==='setupLocation'||action==='pluginAppDeploy'||action==='pluginAppDesigns'||action==='pluginManagement'||action==='attachImage'||action==='composerPlus'||action==='learn'||action==='dictation'||action==='archiveHistory'||action==='archivedChats'||action==='passkeys'||action==='lockedChats'||action==='mfa'||action==='sessions'||action==='advancedToggle'||action==='archiveChats'){
    toast('Demo only: this action does not connect to an external service.');
  } else if(action==='sendImagePrompt'){
    toast('Image prompt saved in the local preview.');
  } else {
    baseHandleAction(action);
  }
};
const baseClickChoice = clickChoice;
clickChoice = function(value){
  if(activePreferenceKey==='useLocation'){
    prefs.useLocation=value==='true'; save(); activePreferenceKey=null; modalLayer.hidden=true; render(); toast('Location demo preference updated.');
  } else { baseClickChoice(value); }
};

screen.addEventListener('click',e=>{const toggleBtn=e.target.closest('[data-toggle]');if(toggleBtn){const key=toggleBtn.dataset.toggle;prefs[key]=!prefs[key];save();toggleBtn.setAttribute('aria-checked',String(prefs[key]));return;}
const pageBtn=e.target.closest('[data-page]');if(pageBtn){nav(pageBtn.dataset.page);return;}
const act=e.target.closest('[data-action]');if(act){handleAction(act.dataset.action,act);return;}
const choice=e.target.closest('[data-choice]');if(choice){clickChoice(choice.dataset.choice);return;}
const conf=e.target.closest('[data-confirm]');if(conf){const x=conf.dataset.confirm;modalLayer.hidden=true;if(x==='logout')nav('login');else toast('No real data was changed.');return;}});
screen.addEventListener('input',e=>{
  const r=e.target.closest('[data-range]');
  if(r){prefs[r.dataset.range]=Number(r.value);const out=document.getElementById(r.dataset.range+'Value');if(out)out.textContent=r.value;save();}
  if(e.target.id==='pluginSearch'){const q=e.target.value.toLowerCase();screen.querySelectorAll('.plugin-card').forEach(c=>c.style.display=c.innerText.toLowerCase().includes(q)?'flex':'none');}
  if(e.target.id==='projectSearch'){const q=e.target.value.toLowerCase();screen.querySelectorAll('.row').forEach(c=>c.style.display=c.innerText.toLowerCase().includes(q)?'flex':'none');}
});

modalLayer.addEventListener('click',e=>{const choice=e.target.closest('[data-choice]');if(choice){clickChoice(choice.dataset.choice);return;}const conf=e.target.closest('[data-confirm]');if(conf){const x=conf.dataset.confirm;modalLayer.hidden=true;if(x==='logout')nav('login');else toast('No real data was changed.');return;}const act=e.target.closest('[data-action]');if(act){handleAction(act.dataset.action,act);return;}if(e.target===modalLayer)modalLayer.hidden=true;});
screen.addEventListener('change',e=>{if(e.target.id==='nickname'){prefs.nickname=e.target.value;save();}});
screen.addEventListener('input',e=>{if(e.target.id==='settingsSearch'){const q=e.target.value.toLowerCase();const rows=[...screen.querySelectorAll('.row')];rows.forEach(r=>r.style.display=r.innerText.toLowerCase().includes(q)?'flex':'none');}});
$('#clock').textContent=new Intl.DateTimeFormat('en',{hour:'numeric',minute:'2-digit',hour12:false}).format(new Date());
render();

modalLayer.addEventListener('click',e=>{
  const confirmBtn=e.target.closest('[data-confirm="clearDemoMemories"]');
  if(confirmBtn){prefs.memoryItems=[];save();modalLayer.hidden=true;render();toast('Demo memories cleared.');}
});

screen.addEventListener('click',e=>{
  const f=e.target.closest('[data-filter]');
  if(f){
    if(currentPage==='images'){prefs.imagesTab=f.dataset.filter;save();render();return;}
    const group=f.parentElement; group.querySelectorAll('[data-filter]').forEach(x=>x.classList.toggle('active',x===f));
    if(currentPage==='projects'){
      screen.querySelectorAll('.row').forEach(r=>{r.style.display=(f.dataset.filter==='Shared with you'?'none':'flex');});
    }
  }
});
/* Version 3 completeness pass: additional screens and local interactions from both recordings. */
const v3Defaults = {
  enableMemory: true, reduceSensitiveContent: false, trustedContactAdded: false,
  lockdownMode: false, automaticRecharge: false, activeNotificationCategory: 'Codex',
  notificationSettings: {}, connections: {}, archivedChats: [], recentChatTitle: 'Write ChatGPT Functions Chart',
  temporaryChat: false, activePlugin: 'AppDeploy', resourceTitle: 'Help center',
  appIssueText: '', referencePhotoNames: [], currentVoiceSession: false, micMuted: true,
  usageRemaining: 100, currentVoice: 'Vale',
  notificationCategories: ['Codex','Group chats','Health','Library','Marketing','Personalized tips','Projects','Responses','Tasks','Usage']
};
for (const [k,v] of Object.entries(v3Defaults)) if (prefs[k] === undefined) prefs[k] = v;
if (prefs.connections === null || typeof prefs.connections !== 'object') prefs.connections = {};
if (prefs.notificationSettings === null || typeof prefs.notificationSettings !== 'object') prefs.notificationSettings = {};
Object.assign(pageTitles, {
  subscription:'Get ChatGPT Plus', voiceChoices:'Choose a voice', memoryInfo:'Memory', memorySummary:'Memory summary',
  savedMemories:'Saved memories', temporaryChats:'Temporary Chats', modelImprovement:'Model improvement',
  personalizedChatsAds:'Personalized chats & ads', privacyCommitment:'We don’t sell your data', privacySecurity:'We secure your information',
  trustedContact:'Trusted contact', securityHistory:'Security history', lockdownMode:'Lockdown mode',
  notificationDetail:'Notifications', adTopics:'Ad topics', allChats:'Chats', dictationHistory:'Dictation history',
  countrySelector:'Choose your country code', emailVerification:'Verify your email', phoneVerification:'Verify your phone',
  integrationSetup:'Connect app', pluginDetail:'Plugin details', privacyPolicy:'Privacy policy', privacyRequest:'Submit a privacy request',
  helpCenter:'Help center', licenses:'Licenses', modelImproveInfo:'Model improvement'
});

const V3_COUNTRIES = [["Afghanistan","+93"],["Albania","+355"],["Algeria","+213"],["American Samoa","+1684"],["Andorra","+376"],["Angola","+244"],["Anguilla","+1264"],["Antigua and Barbuda","+1268"],["Argentina","+54"],["Armenia","+374"],["Aruba","+297"],["Australia","+61"],["Austria","+43"],["Azerbaijan","+994"],["Bahamas","+1242"],["Bahrain","+973"],["Bangladesh","+880"],["Barbados","+1246"],["Belarus","+375"],["Belgium","+32"],["Belize","+501"],["Benin","+229"],["Bermuda","+1441"],["Bhutan","+975"],["Bolivia, Plurinational State of","+591"],["Bosnia and Herzegovina","+387"],["Botswana","+267"],["Brazil","+55"],["British Indian Ocean Territory","+246"],["Brunei Darussalam","+673"],["Bulgaria","+359"],["Burkina Faso","+226"],["Burundi","+257"],["Cabo Verde","+238"],["Cambodia","+855"],["Cameroon","+237"],["Canada","+1"],["Cayman Islands","+1345"],["Central African Republic","+236"],["Chad","+235"],["Chile","+56"],["China","+86"],["Christmas Island","+61"],["Cocos (Keeling) Islands","+61"],["Colombia","+57"],["Comoros","+269"],["Congo","+242"],["Congo, The Democratic Republic of the","+243"],["Cook Islands","+682"],["Costa Rica","+506"],["Croatia","+385"],["Cuba","+53"],["Curaçao","+599"],["Cyprus","+357"],["Czechia","+420"],["Côte d'Ivoire","+225"],["Denmark","+45"],["Djibouti","+253"],["Dominica","+1767"],["Dominican Republic","+1809 / +1829 / +1849"],["Ecuador","+593"],["Egypt","+20"],["El Salvador","+503"],["Equatorial Guinea","+240"],["Eritrea","+291"],["Estonia","+372"],["Eswatini","+268"],["Ethiopia","+251"],["Faroe Islands","+298"],["Fiji","+679"],["Finland","+358"],["France","+33"],["French Guiana","+594"],["French Polynesia","+689"],["Gabon","+241"],["Gambia","+220"],["Georgia","+995"],["Germany","+49"],["Ghana","+233"],["Gibraltar","+350"],["Greece","+30"],["Greenland","+299"],["Grenada","+1473"],["Guadeloupe","+590"],["Guam","+1671"],["Guatemala","+502"],["Guernsey","+44"],["Guinea","+224"],["Guinea-Bissau","+245"],["Guyana","+592"],["Haiti","+509"],["Holy See (Vatican City State)","+39"],["Honduras","+504"],["Hong Kong","+852"],["Hungary","+36"],["Iceland","+354"],["India","+91"],["Indonesia","+62"],["Iran, Islamic Republic of","+98"],["Iraq","+964"],["Ireland","+353"],["Isle of Man","+44"],["Israel","+972"],["Italy","+39"],["Jamaica","+1876"],["Japan","+81"],["Jersey","+44"],["Jordan","+962"],["Kazakhstan","+76 / +77"],["Kenya","+254"],["Kiribati","+686"],["Korea, Democratic People's Republic of","+850"],["Korea, Republic of","+82"],["Kuwait","+965"],["Kyrgyzstan","+996"],["Lao People's Democratic Republic","+856"],["Latvia","+371"],["Lebanon","+961"],["Lesotho","+266"],["Liberia","+231"],["Libya","+218"],["Liechtenstein","+423"],["Lithuania","+370"],["Luxembourg","+352"],["Macao","+853"],["Madagascar","+261"],["Malawi","+265"],["Malaysia","+60"],["Maldives","+960"],["Mali","+223"],["Malta","+356"],["Marshall Islands","+692"],["Martinique","+596"],["Mauritania","+222"],["Mauritius","+230"],["Mayotte","+262"],["Mexico","+52"],["Micronesia, Federated States of","+691"],["Moldova, Republic of","+373"],["Monaco","+377"],["Mongolia","+976"],["Montserrat","+1664"],["Morocco","+212"],["Mozambique","+258"],["Myanmar","+95"],["Namibia","+264"],["Nauru","+674"],["Nepal","+977"],["Netherlands","+31"],["New Caledonia","+687"],["New Zealand","+64"],["Nicaragua","+505"],["Niger","+227"],["Nigeria","+234"],["Niue","+683"],["Norfolk Island","+672"],["North Macedonia","+389"],["Northern Mariana Islands","+1670"],["Norway","+47"],["Oman","+968"],["Pakistan","+92"],["Palau","+680"],["Palestine, State of","+970"],["Panama","+507"],["Papua New Guinea","+675"],["Paraguay","+595"],["Peru","+51"],["Philippines","+63"],["Poland","+48"],["Portugal","+351"],["Puerto Rico","+1787 / +1939"],["Qatar","+974"],["Romania","+40"],["Russian Federation","+7"],["Rwanda","+250"],["Réunion","+262"],["Saint Kitts and Nevis","+1869"],["Saint Lucia","+1758"],["Saint Pierre and Miquelon","+508"],["Saint Vincent and the Grenadines","+1784"],["Samoa","+685"],["San Marino","+378"],["Saudi Arabia","+966"],["Senegal","+221"],["Serbia","+381"],["Seychelles","+248"],["Sierra Leone","+232"],["Singapore","+65"],["Slovakia","+421"],["Slovenia","+386"],["Solomon Islands","+677"],["Somalia","+252"],["South Africa","+27"],["South Georgia and the South Sandwich Islands","+500"],["South Sudan","+211"],["Spain","+34"],["Sri Lanka","+94"],["Sudan","+249"],["Suriname","+597"],["Svalbard and Jan Mayen","+4779"],["Sweden","+46"],["Switzerland","+41"],["Syrian Arab Republic","+963"],["Taiwan, Province of China","+886"],["Tajikistan","+992"],["Tanzania, United Republic of","+255"],["Thailand","+66"],["Timor-Leste","+670"],["Togo","+228"],["Tokelau","+690"],["Tonga","+676"],["Trinidad and Tobago","+1868"],["Tunisia","+216"],["Turkmenistan","+993"],["Turks and Caicos Islands","+1649"],["Tuvalu","+688"],["Uganda","+256"],["Ukraine","+380"],["United Arab Emirates","+971"],["United Kingdom","+44"],["United States","+1"],["Uruguay","+598"],["Uzbekistan","+998"],["Vanuatu","+678"],["Venezuela, Bolivarian Republic of","+58"],["Viet Nam","+84"],["Virgin Islands, British","+1284"],["Virgin Islands, U.S.","+1340"],["Wallis and Futuna","+681"],["Western Sahara","+212"],["Yemen","+967"],["Zambia","+260"],["Zimbabwe","+263"]];

function v3RowStatus(label, action, category, status='On') {
  return `<button class="row" data-action="${action}" data-category="${esc(category)}"><span class="row-main"><span class="row-label">${esc(label)}</span></span><span class="row-value">${esc(status)}</span><span class="chevron">›</span></button>`;
}
function v3FaqPage(icon,title,description,questions,managePage,manageLabel='Manage') {
  return `<div class="info-hero"><div class="large-icon">${icon}</div><h2>${esc(title)}</h2><p>${esc(description)}</p></div>${managePage?`<button class="primary" data-page="${managePage}">${esc(manageLabel)}　↗</button>`:''}<div class="faq-list">${questions.map(([q,a])=>faq(q,a)).join('')}</div><button class="outline" data-action="learn">Learn more　↗</button>`;
}
function v3SubscriptionPage(){
  const features=[['Core model','Included','Included'],['Advanced models and memory','—','✓'],['Higher quality image creation','—','✓'],['Scheduled task automations','—','✓'],['Email and calendar connections','—','✓'],['20 GB file storage','—','✓'],['Codex for coding','—','✓']];
  return `<div class="plus-screen"><button class="icon-btn plus-close" data-page="settings">×</button><div class="plus-spark">✦</div><h1>Get ChatGPT Plus</h1><p>Personalized AI for life and work</p><div class="plan-table"><div class="plan-head"><span>Features</span><span>Free</span><span>Plus</span></div>${features.map(([n,f,p])=>`<div class="plan-row"><span>${n}</span><span>${f==='Included'?'✓':'—'}</span><span>${p==='Included'?'✓':'✓'}</span></div>`).join('')}</div><button class="primary" data-action="subscribePlus">Upgrade to Plus</button><p class="plan-foot">Auto-renews monthly. Cancel anytime.</p><button class="text-button" data-action="restoreSubscription">Restore subscription</button><button class="text-button" data-action="comparePlans">Compare plans</button><p class="demo-caption">Subscription actions are not connected in this offline demo.</p></div>`;
}
function v3UsagePage(){return `${section('Agentic usage limit')}<div class="usage-card"><div class="usage-line"><span>Usage limit</span><b>100% remaining</b></div><div class="progress"><span style="width:100%"></span></div><small>Resets at the next usage window (demo)</small></div>${section('Usage limit resets')}<button class="pill" data-action="usageInfo">No usage limit resets available at this time.　ⓘ</button>${section('Credits')}<div class="usage-card"><button class="row" data-action="toggleRecharge"><span class="row-main"><span class="row-label">Automatic recharge</span></span><span class="row-value">${prefs.automaticRecharge?'On':'Off'}</span><span class="chevron">›</span></button><p class="switch-note">Credits extend usage beyond your plan limits.</p></div>`;}
function v3NotificationsPage(){
  const cats=prefs.notificationCategories||v3Defaults.notificationCategories;
  return `${group(cats.map(c=>v3RowStatus(c,'openNotificationCategory',c,'On')).join(''))}${help('Choose which types of notifications you receive. Each category can be adjusted separately in this demo.')}`;
}
function v3NotificationDetailPage(){
  const c=prefs.activeNotificationCategory||'Codex';
  const key=c.replace(/[^a-z0-9]/gi,'');
  const push=`notif_${key}_push`, email=`notif_${key}_email`, inapp=`notif_${key}_inapp`;
  for (const k of [push,email,inapp]) if (prefs[k]===undefined) prefs[k]=true;
  return `<div class="info-hero compact"><div class="large-icon">♧</div><h2>${esc(c)}</h2><p>Manage ${esc(c.toLowerCase())} notifications.</p></div>${group(toggle(push,'Push notifications')+toggle(email,'Email notifications')+toggle(inapp,'In-app notifications'))}${help('These switches store preferences in this browser only.')}`;
}
function v3SafetyPage(){return `${group(toggle('reduceSensitiveContent','Reduce sensitive content','Add extra safeguards around sensitive topics and limit certain types of content in ChatGPT.')+`<div class="setting-note">Add extra safeguards around sensitive topics and limit certain types of content in ChatGPT. <span class="link" data-action="learn">Learn more</span></div>`+row('Trusted contact','trustedContact','♙','Get support from someone who knows you')+row('Parental controls','parental','♧','Family settings'))}`;}
function v3TrustedContactPage(){return `<div class="info-hero"><div class="large-icon">♙</div><h2>Trusted contact</h2><p>Having a trusted contact can make it easier to get support from someone that knows you.</p></div>${group(row('Status','trustedContact','♙',prefs.trustedContactAdded?'Added in this demo':'Not set up'))}<button class="primary" data-action="addTrustedContact">${prefs.trustedContactAdded?'Manage trusted contact':'Add trusted contact'}</button>${help('Trusted-contact setup is a demo only. No contact details are uploaded or sent.')}`;}
function v3SecurityPage(){return `${section('Security keys & passkeys')}${group(row('Passkeys','passkeys','♙','Add a passkey for faster, safer sign-in')+row('Locked chats','lockedChats','▣','Account PIN'))}${section('Multi-factor authentication')}${group(row('Authenticator app','mfa','⬡','Require an extra sign-in challenge',prefs.mfaEnabled?'On':'Off'))}${help('If you are unable to pass this challenge, you may have the option to recover your account.')}${section('Sessions')}${group(row('Active sessions','sessions','◉','View devices that have accessed your account','2'))}${help('Review active sessions, remove trusted devices or log out of all sessions.')}${group(toggle('requireUnlock','Require device unlock','Use your screen lock or biometrics to unlock Codex and Remote.'))}${section('Account protection')}${group(row('Security history','securityHistory','◷','Review recent sign-in activity')+row('Advanced account security','advancedSecurity','♙','Extra protection for your account')+row('Lockdown mode','lockdownMode','▣','Additional account protections'))}`;}
function v3SecurityHistoryPage(){
  const events=[
    ['Logged in to ChatGPT app','Android device · Current session','Today · Recent activity'],
    ['Logged out of your account','Android device','Recent activity'],
    ['Logged in to ChatGPT app','Mobile device','Earlier this week'],
    ['Logged out of your account','Mobile device','Earlier this week']
  ];
  return `<div class="section-label">Recent activity</div>${group(events.map(([a,b,c],i)=>`<div class="history-event"><span class="history-icon">${i%2?'⇥':'⇤'}</span><div><b>${a}</b><small>${b}</small><small>${c}</small></div></div>`).join(''))}${help('Sample security events only. This screen is not connected to a real account or device log.')}`;
}
function v3LockdownPage(){return `${section('Lockdown mode')}${group(toggle('lockdownMode','Enable lockdown mode','Use stronger restrictions to help protect your account from targeted attacks.'))}${help('This is a local display preference only. It does not change the security of your real account or device.')}`;}
function v3MemoryPage(){return `${group(toggle('enableMemory','Enable memory','Let ChatGPT personalize your experience based on your chats, files and connected apps. Memory may include sensitive information you provide.'))}${help('Learn more about how memory works.',)}${group(row('Memory summary','memorySummary','▤','View what ChatGPT has learned about you'))}<p class="setting-note">View an overview of what ChatGPT has learned about you. Use <span class="link" data-page="personalization">custom instructions</span> for information you would like it to always keep in mind. You can still manage your old <span class="link" data-page="savedMemories">saved memories</span>.</p><button class="outline" data-page="memoryInfo">Learn more about memory　↗</button>`;}
function v3MemorySummaryPage(){return `<div class="info-hero compact"><div class="large-icon">▤</div><h2>Memory summary</h2><p>A local sample overview of details that may be useful between chats.</p></div>${group((prefs.memoryItems||[]).map((m,i)=>`<div class="row"><span class="row-main"><span class="row-label">${esc(m)}</span><span class="row-sub">Sample memory</span></span><button class="mini-action" data-action="removeMemory" data-index="${i}">Remove</button></div>`).join('')||'<div class="empty-note">No saved memories in this demo.</div>')}${group(row('Manage saved memories','savedMemories','▤')+row('Custom instructions','personalization','✎'))}`;}
function v3SavedMemoriesPage(){return `${section('Saved memories')}${group((prefs.memoryItems||[]).map((m,i)=>`<div class="row"><span class="row-main"><span class="row-label">${esc(m)}</span><span class="row-sub">Saved memory · demo item</span></span><button class="mini-action" data-action="removeMemory" data-index="${i}">Remove</button></div>`).join('')||'<div class="empty-note">No saved memories yet.</div>')}<button class="outline" data-action="clearMemories">Clear all memories</button>${help('Only sample memories in this browser can be changed.')}`;}
function v3MemoryInfoPage(){return v3FaqPage('▤','Memory','ChatGPT can remember helpful details between chats, so your answers become more personalized over time.',[
  ['How does memory work?','When enabled, memory can help ChatGPT remember useful context from your chats and personalize future responses.'],
  ['Who can access my memories?','Memory in this demonstration is stored only in this browser. It is not visible to other users.'],
  ['How can I see what ChatGPT remembers about me?','Open Memory summary to review the sample memories shown in this prototype.'],
  ['What if I don’t want ChatGPT to remember something about me?','You can remove an individual sample memory, clear all demo memories, or use Temporary Chats.']
],'memory','Manage');}
function v3TemporaryChatsPage(){return v3FaqPage('◌','Temporary Chats','Start a chat that stays out of your history unless you save it.',[
  ['What are temporary chats?','Temporary chats stay out of the chat list unless you choose to save them. In this demo, temporary chats are not stored in the saved chat list.'],
  ['How can I choose whether a temporary chat is personalized?','When starting a temporary chat, choose whether to use your saved demo preferences or start without them.'],
  ['What happens if I save a temporary chat?','It becomes a regular demo chat and appears in the chat list.'],
  ['How are temporary chats different from locked chats?','Temporary chats are designed not to appear in history; locked chats are regular chats with an added access restriction.']
],'home','New temporary chat');}
function v3ModelImprovementPage(){return v3FaqPage('▥','Model improvement','Choose whether your chats help improve OpenAI’s models.',[
  ['How does model improvement work?','If you choose to share eligible conversations, they may be used to improve model quality. This prototype does not send any content to a model provider.'],
  ['Is my personal information used to improve models?','This offline prototype does not collect or transmit personal information.'],
  ['What happens if I turn model improvement off?','The local preference is saved as off. No real account setting is changed.']
],'historyData','Manage');}
function v3PersonalizedChatsAdsPage(){return `<div class="info-hero"><div class="large-icon">◷</div><h2>Personalized chats & ads</h2><p>Customize how ChatGPT responds, remembers details and adapts to you.</p></div>${group(row('Memory','memory','▤','ChatGPT can remember helpful details between chats, so your answers become more personalized over time.')+row('Personalized ads','personalizedAds','⚑','Choose whether ads are personalized using your data.')+row('Location','location','⌖','Learn more about how ChatGPT uses location information.'))}`;}
function v3PrivacyPage(){return `<div class="privacy-hero"><div class="large-icon">▣</div><h2>Privacy center</h2><p>Clear answers about privacy. Simple ways to stay in control.</p></div>${section('Explore your options')}${group(row('Personalized chats & ads','personalizedChatsAds','◷')+row('Chat privacy','chatPrivacy','▣')+row('Data use & access','dataAccess','♙'))}${section('Our approach to privacy')}<div class="privacy-tiles"><button data-page="privacyCommitment"><b>▣</b><span>We don’t sell your data</span></button><button data-page="privacySecurity"><b>♢</b><span>We secure your information</span></button></div>${section('Learn and act')}<div class="learn-tiles"><button data-page="privacyCommitment">How ChatGPT learns about the world while protecting privacy</button><button data-page="privacySecurity">Introducing account security</button></div>${section('Helpful resources')}${group(row('Privacy policy','privacyPolicy','▤')+row('Submit a privacy request','privacyRequest','✉')+row('Help center','helpCenter','?'))}`;}
function v3PrivacyCommitmentPage(){return `<div class="resource-banner blue-banner">▣</div><div class="info-hero"><h2>We don’t sell your data</h2><p>We don’t share your conversations with advertisers or marketing partners, and we don’t sell your data to anyone.</p></div>${section('Helpful resources')}${group(row('Ad personalization','personalizedAds','⚑')+row('Ad topics','adTopics','▧'))}`;}
function v3PrivacySecurityPage(){return `<div class="resource-banner purple-banner">♢</div><div class="info-hero"><h2>We secure your information</h2><p>Review the security and privacy controls available in this interface prototype.</p></div>${group(row('Security and login','security','♙')+row('Security history','securityHistory','◷')+row('Advanced account security','advancedSecurity','▣')+row('Lockdown mode','lockdownMode','⬡'))}`;}
function v3DataAccessPage(){return `<div class="info-hero"><div class="large-icon">♙</div><h2>Data use & access</h2><p>Manage how your data is used and help secure your account.</p></div>${group(row('Plugins & apps','permissions','✣','Learn how data is shared when you connect ChatGPT to your favorite tools')+row('Multi-factor authentication (MFA)','mfaInfo','♙','Add an extra verification step to help protect your account when you log in')+row('Model improvement','modelImprovement','▥','Choose whether your chats help improve future models')+row('Export or delete your data','exportFaq','⇩','Download a copy of your data, delete chats or permanently delete your account'))}`;}
function v3AdsControlsPage(){return `${section('Ad preferences')}${group(toggle('personalizedAds','Personalized ads','Choose whether ads in this demo would be tailored using your information.')+row('Ad topics','adTopics','▧','Review sample ad topic controls'))}${help('No advertisements are displayed by this offline prototype.')}`;}
function v3AdTopicsPage(){return `${section('Ad topics')}${group(['Technology','Entertainment','Shopping','Travel','Education'].map((x,i)=>toggle('adTopic'+i,x,'Sample topic preference')).join(''))}${help('These are sample preferences only. No ads are served by this prototype.')}`;}
function v3HistoryDataPage(){return `${group(toggle('improveModel','Improve the model for everyone','Allow eligible content to be used to improve models. This local demo does not send chat content anywhere.')+`<div class="setting-note">Allow your content to be used to improve models. <span class="link" data-page="modelImprovement">Learn more</span></div>`+actionRow('Export Data','export','⇩')+actionRow('Delete OpenAI account','deleteAccount','⌫'))}${section('Apps with access')}${group(`<div class="setting-note">${Object.values(prefs.connections||{}).some(Boolean)?'Demo app connections are listed in Customize.':'No apps have access to your contact information.'}</div>`+row('Manage connected apps','customize','✣','Manage the apps that can receive your contact information'))}${section('Chat history')}${group(row('View archived chats','archivedChats','▤')+actionRow('Archive chat history','archiveHistory','▤')+actionRow('Clear chat history','deleteChats','⌫'))}`;}
function v3UsageLimitInfo(){openModal('Usage limit resets','There are no usage limit resets available at this time in this sample screen.',[{label:'OK',value:'close'}]);}
function v3MemoryFaqPage(){return v3MemoryInfoPage();}
function v3VoicePage(){return `${buttonPill('Model',prefs.voiceModel||'Live','voiceModel')}${group(`<button class="row" data-page="voiceChoices"><span class="row-main"><span class="row-label">Voice</span></span><span class="row-value">${esc(prefs.voice||'Vale')}</span><span class="chevron">›</span></button>`+`<button class="row" data-action="voiceLanguage"><span class="row-main"><span class="row-label">Language</span></span><span class="row-value">${esc(prefs.voiceLanguage||'Auto-detect')}</span><span class="chevron">⌄</span></button>`+row('Dictation history','dictationHistory','▤'))}${group(toggle('backgroundVoice','Background conversations','Keep the conversation going in other apps or while your screen is off.')+toggle('defaultAssistant','Use as default assistant','Set ChatGPT as your default digital assistant in Android settings'))}`;}
function buttonPill(label,value,action){return `<button class="pill" data-action="${action}">${esc(label)} <span>${esc(value)}　⌄</span></button>`;}
function v3VoiceChoicesPage(){
  const groups=[['English','Vale','Juniper','Arbor','Cove','Ember','Maple','Sol'],['Japanese','Rindō','Himari'],['Hindi','Leher','Neer'],['Korean','Hanul','Haetsol'],['Mexican Spanish','Arrullo','Tinta']];
  return `${groups.map(([lang,...names])=>`${section(lang)}${group(names.map(n=>`<button class="row" data-action="chooseVoice" data-voice="${esc(n)}"><span class="row-main"><span class="row-label">${esc(n)}</span></span>${prefs.voice===n?'<span class="row-value">✓</span>':''}</button>`).join(''))}`).join('')}`;
}
function v3VoiceModePage(){return `<div class="voice-stage"><div class="voice-stage-top"><button class="icon-btn" data-action="drawer">☰</button><button class="icon-btn" data-action="voiceSettings">☷</button></div><div class="voice-orb"></div><div class="voice-stage-bottom"><div class="voice-tip"><b>Background conversations</b><span>Voice can now keep your conversation going when you lock your phone. You can turn this off anytime in settings.</span><button data-action="dismissVoiceTip">×</button></div><div class="voice-input"><input placeholder="Ask ChatGPT" id="voiceInput"><button data-action="toggleMic">${prefs.micMuted?'◉':'◍'}</button><button class="close-voice" data-page="home">×</button></div></div></div>`;}
function v3DictationHistoryPage(){return `<div class="empty-state"><div class="empty-icon">▤</div><h3>No dictation history</h3><p>Dictated messages from voice input would appear here.</p></div>`;}
function v3PluginsPage(){
 const added=['AppDeploy','appdesigns','GitHub','Plugin Management'];
 const popular=[['Gmail','Read and manage Gmail','＋'],['Google Drive','Drive: Docs, Sheets or Slides','♙'],['Health','Explore your health data in ChatGPT','＋'],['GitHub','Triage PRs, issues, CI and publish flows','•••']];
 return `${section('Preferences')}${group(actionRow('Permissions','permissionMode','◉','Choose when apps can take actions',prefs.permissionMode||'Allow low-risk actions'))}${section('Added')}${group(added.map((n,i)=>`<button class="row" data-action="openPluginDetail" data-plugin="${esc(n)}"><span class="row-icon">${['▣','◧','◉','✣'][i]}</span><span class="row-main"><span class="row-label">${esc(n)}</span></span><span class="chevron">›</span></button>`).join(''))}${section('Popular')}${group(popular.map(([n,d,s])=>`<button class="row" data-action="openPluginDetail" data-plugin="${esc(n)}"><span class="row-main"><span class="row-label">${esc(n)}</span><span class="row-sub">${esc(d)}</span></span><span class="row-value">${(prefs.installedPlugins||[]).includes(n)?'Added':s}</span><span class="chevron">›</span></button>`).join(''))}${row('New & noteworthy','browsePlugins','✦','Recent plugins')}${row('Browse plugins','browsePlugins','▦','Explore available integrations')}`;
}
function v3PluginDetailPage(){const n=prefs.activePlugin||'AppDeploy';const isAdded=['AppDeploy','appdesigns','GitHub','Plugin Management'].includes(n)||(prefs.installedPlugins||[]).includes(n);return `<div class="info-hero"><div class="large-icon">✣</div><h2>${esc(n)}</h2><p>${esc(n)} appears in the app integrations demo list. External access is not available in this offline pack.</p></div>${group(row('Status','pluginDetail','▣',isAdded?'Listed in demo':'Available to add')+row('Permissions','permissions','⚙','Choose what this app may do'))}<button class="primary" data-action="togglePluginInstall" data-plugin="${esc(n)}">${isAdded?'Remove from demo list':'Add to demo list'}</button>`;}
function v3CustomizePage(){
 const conn=n=>prefs.connections[n]?'Connected (demo)':'Set up';
 return `${group(row('Personality','personality','◉',prefs.styleTone||'Default')+row('Memory','memory','▤','1 hour ago')+row('Plugins','plugins','✣',`${(prefs.installedPlugins||['AppDeploy','appdesigns','GitHub','Plugin Management']).length} added`))}${group(row('Email','emailConnect','✉',conn('Email'))+row('Calendar','calendar','▦',conn('Calendar'))+row('Contacts','contacts','♙',conn('Contacts'))+row('Wallet','wallet','▣','Coming soon')+row('Passwords','passwords','♙',`${(prefs.savedPasswords||[]).length} items`))}${group(row('Location','location','⌖',prefs.useLocation?'On':'Set up'))}`;
}
function v3EmailConnectPage(){return `<div class="integration-card"><div class="integration-icon">✉</div><h2>Email</h2><p>Find messages, summarize conversations and draft replies.</p></div>${group(row('Connection status','emailConnect','✉',prefs.connections.Email?'Connected in demo':'Not connected')+row('Permissions','permissions','⚙','Choose access level'))}<button class="primary" data-action="setupEmail">${prefs.connections.Email?'Manage email':'Add email'}</button>${help('Email connection is simulated locally. No mailbox is accessed.')}`;}
function v3CalendarPage(){return `<div class="integration-card"><div class="integration-icon">▦</div><h2>Calendar</h2><p>Plan your day, schedule meetings and manage your calendar.</p></div>${prefs.connections.Calendar?'<div class="empty-note">Demo calendar connected. No real events are loaded.</div>':'<div class="empty-note">No calendars connected. Add a calendar to get started.</div>'}<button class="primary bottom-action" data-action="setupCalendar">${prefs.connections.Calendar?'Manage calendar':'Add calendar'}</button>`;}
function v3ContactsPage(){return `<div class="integration-card"><div class="integration-icon">♙</div><h2>Contacts</h2><p>Find people and keep contact details available to your assistant.</p></div>${prefs.connections.Contacts?'<div class="empty-note">Demo contacts access enabled. No real contacts are loaded.</div>':'<div class="empty-note">No contacts connected.</div>'}<button class="primary bottom-action" data-action="setupContacts">${prefs.connections.Contacts?'Manage contacts':'Add contacts'}</button>`;}
function v3SettingsPage(){return `${group(row('Account','account','◉',prefs.userName,prefs.userName)+row('Workspace','workspace','▢','Personal','Personal')+row('Upgrade to ChatGPT Plus','subscription','✧','',''),true)}${group(row('Customize ChatGPT','customize','♧','Personality, memory, plugins and more'),true)}${group(row('General','general','⚙')+row('Usage and limits','usage','▧')+row('Notifications','notifications','♧')+row('Voice','voice','〽')+row('Safety','safety','⬡')+row('Security and login','security','♙')+row('Codex','codex','⌘')+row('Storage','storage','▤')+row('Privacy center','privacy','▣')+row('History and data','historyData','▤')+row('Ads controls','adsControls','◉'))}<div class="search-dock"><span>⌕</span><input id="settingsSearch" placeholder="Search settings" aria-label="Search settings"></div>`;}
function v3HomePage(){return `<div class="home-actions"><button class="icon-btn" data-action="drawer">☰</button><button class="upgrade-chip" data-page="subscription">✦ Get Plus</button><button class="icon-btn" data-page="chat">◌</button></div><div class="home-space"></div><div class="home-shortcuts"><button data-page="images">▧　Create an image or sticker</button><button data-page="chat">✎　Write or edit</button><button data-page="temporaryChats">◌　Temporary chat</button></div><div class="chat-composer"><button data-action="composerPlus">＋</button><input id="homePrompt" placeholder="Ask ChatGPT"><button data-action="voiceInput">♩</button><button data-page="voiceMode">◖</button><button class="send-button" data-action="sendHome">↑</button></div>`;}
function v3Drawer(){
 const quick=[['scheduledBriefing','Schedule daily briefing'],['outfitSuggestions','Schedule outfit suggestions'],['fridayRecommendations','Schedule Friday recommendations'],['greetingExchange','Greeting exchange']];
 return `<nav class="drawer"><div class="drawer-head"><h2>ChatGPT</h2><button class="icon-btn" data-action="searchDrawer">⌕</button></div><button class="drawer-item" data-page="library">▤　Library</button><button class="drawer-item" data-page="customize">☷　Customize</button><button class="drawer-item" data-page="projects">▣　Projects</button><button class="drawer-item" data-page="remote">▣　Remote</button><button class="drawer-item" data-page="scheduled">◷　Scheduled</button><button class="drawer-item" data-page="plugins">✣　Plugins</button><div class="drawer-divider"></div><div class="drawer-shortcuts">${quick.map(([k,l])=>`<div class="drawer-schedule-row"><span>${l}</span><button class="switch" role="switch" aria-checked="${!!prefs[k]}" aria-label="${l}" data-toggle="${k}"></button></div>`).join('')}</div><button class="drawer-item" data-action="openRecentChat">✎　${esc(prefs.recentChatTitle||'Write ChatGPT Functions Chart')}</button><button class="drawer-item muted-drawer" data-page="allChats">See all…</button><div class="drawer-foot"><button class="drawer-item" data-page="home">✎　Chat</button><button class="drawer-item" data-page="profile">◉　${esc(prefs.userName)}</button><button class="drawer-item" data-page="settings">⚙　Settings</button></div></nav>`;
}
function v3AllChatsPage(){return `${section('Recent')}${group(row(prefs.recentChatTitle||'Write ChatGPT Functions Chart','chat','✎','Recent conversation')+row('Start a new chat','home','＋'))}${section('More')}${group(row('Projects','projects','▣')+row('Library','library','▤'))}`;}
function v3CountrySelectorPage(){return `<input class="field" id="countrySearch" placeholder="Search country or calling code"><div class="country-list">${V3_COUNTRIES.map(([n,c])=>`<button class="row" data-action="chooseCountry" data-country="${esc(n+' '+c)}"><span class="row-main"><span class="row-label">${esc(n)}</span></span><span class="row-value">${esc(c)}</span></button>`).join('')}</div>`;}
function v3PhoneLoginPage(){return `${section('Country / region')}<button class="pill" data-page="countrySelector">${esc(prefs.countryCode||'Nigeria +234')} <span>⌄</span></button><input class="field" id="phoneNumber" placeholder="Phone number" inputmode="tel"><button class="primary" data-action="phoneContinue">Continue</button><p class="small-muted center">This is a local sign-in flow demonstration only.</p>`;}
function v3EmailLoginPage(){return `${section('Email')}<input class="field" type="email" id="loginEmail" placeholder="Email address"><button class="primary" data-action="continueEmail">Continue</button><p class="small-muted center">Terms of use · Privacy policy</p>`;}
function v3EmailVerificationPage(){return `<div class="info-hero"><div class="large-icon">✉</div><h2>Check your email</h2><p>A demo verification code would be sent to ${esc(prefs.userEmail)}. No email is actually sent.</p></div><input class="field" id="verificationCode" inputmode="numeric" placeholder="Enter 6-digit code"><button class="primary" data-action="verifyDemoCode">Continue</button>`;}
function v3PhoneVerificationPage(){return `<div class="info-hero"><div class="large-icon">♙</div><h2>Verify your phone</h2><p>Enter the demo code for ${esc(prefs.countryCode||'Nigeria +234')} ${esc(prefs.phoneNumber||'')}.</p></div><input class="field" id="verificationCode" inputmode="numeric" placeholder="Enter 6-digit code"><button class="primary" data-action="verifyDemoCode">Continue</button>`;}
function v3InfoResourcePage(){const t=prefs.resourceTitle||'Help center';return `<div class="info-hero"><div class="large-icon">ⓘ</div><h2>${esc(t)}</h2><p>This reference screen is available for navigation and visual testing. External links and account services are not connected in this offline package.</p></div>${group(row('Back to Privacy center','privacy','▣')+row('Settings','settings','⚙'))}`;}
function v3PrivacyCenterAction(){openModal('Privacy center resources','Choose a resource to preview.',[{label:'Privacy policy',value:'privacyPolicy'},{label:'Submit a privacy request',value:'privacyRequest'},{label:'Help center',value:'helpCenter'}]);}

Object.assign(pages, {
  subscription:v3SubscriptionPage, usage:v3UsagePage, notifications:v3NotificationsPage, notificationDetail:v3NotificationDetailPage,
  safety:v3SafetyPage, trustedContact:v3TrustedContactPage, security:v3SecurityPage, securityHistory:v3SecurityHistoryPage, lockdownMode:v3LockdownPage,
  memory:v3MemoryPage, memorySummary:v3MemorySummaryPage, savedMemories:v3SavedMemoriesPage, memoryInfo:v3MemoryInfoPage, temporaryChats:v3TemporaryChatsPage,
  modelImprovement:v3ModelImprovementPage, personalizedChatsAds:v3PersonalizedChatsAdsPage, privacy:v3PrivacyPage, privacyCommitment:v3PrivacyCommitmentPage,
  privacySecurity:v3PrivacySecurityPage, dataAccess:v3DataAccessPage, adsControls:v3AdsControlsPage, adTopics:v3AdTopicsPage, historyData:v3HistoryDataPage,
  voice:v3VoicePage, voiceChoices:v3VoiceChoicesPage, dictationHistory:v3DictationHistoryPage, voiceMode:v3VoiceModePage,
  plugins:v3PluginsPage, pluginDetail:v3PluginDetailPage, customize:v3CustomizePage, emailConnect:v3EmailConnectPage, calendar:v3CalendarPage, contacts:v3ContactsPage,
  settings:v3SettingsPage, home:v3HomePage, allChats:v3AllChatsPage, countrySelector:v3CountrySelectorPage, phoneLogin:v3PhoneLoginPage, emailLogin:v3EmailLoginPage,
  emailVerification:v3EmailVerificationPage, phoneVerification:v3PhoneVerificationPage, privacyPolicy:v3InfoResourcePage, privacyRequest:v3InfoResourcePage,
  helpCenter:v3InfoResourcePage, licenses:v3InfoResourcePage
});

const v3HandleActionBase = handleAction;
handleAction = function(action, element) {
  if (action==='headerAction') {
    if (currentPage==='settings') openModal('About & help','ChatGPT-style mobile interface · Offline reference build 3.0',[{label:'Report app issue',value:'reportIssue'},{label:'Help center',value:'helpCenter'},{label:'Terms of use',value:'terms'},{label:'Privacy policy',value:'privacyPolicy'},{label:'Licenses',value:'licenses'},{label:'ChatGPT for Android · Demo build',value:'appInfo'}]);
    else v3HandleActionBase(action,element);
  } else if (action==='subscribePlus') toast('Subscription checkout is not connected in this demo.');
  else if (action==='restoreSubscription') toast('No real subscription is connected to restore.');
  else if (action==='comparePlans') openModal('Compare plans','The reference shows a Free and Plus comparison. Payment and plan changes are unavailable in this offline demo.');
  else if (action==='usageInfo') v3UsageLimitInfo();
  else if (action==='toggleRecharge') { prefs.automaticRecharge=!prefs.automaticRecharge; save(); render(); }
  else if (action==='openNotificationCategory') { prefs.activeNotificationCategory=element?.dataset?.category||'Codex'; save(); nav('notificationDetail'); }
  else if (action==='addTrustedContact') openModal('Trusted contact','Trusted-contact linking is not connected. No contact information is collected.',[{label:'Continue (demo)',value:'trustedDemo'}]);
  else if (action==='openPluginDetail') { prefs.activePlugin=element?.dataset?.plugin||'Plugin'; save(); nav('pluginDetail'); }
  else if (action==='togglePluginInstall') { const n=element?.dataset?.plugin||prefs.activePlugin; prefs.installedPlugins=prefs.installedPlugins||[]; if(prefs.installedPlugins.includes(n)) prefs.installedPlugins=prefs.installedPlugins.filter(x=>x!==n); else prefs.installedPlugins.push(n); save(); render(); }
  else if (action==='setupEmail'||action==='setupCalendar'||action==='setupContacts') {
    const n=action==='setupEmail'?'Email':action==='setupCalendar'?'Calendar':'Contacts'; activePreferenceKey='connection:'+n;
    openModal('Connect '+n,'Choose a local demonstration state. No external account is accessed.',[{label:'Connect demo '+n.toLowerCase(),value:'connected'},{label:'Keep disconnected',value:'disconnected'}]);
  }
  else if (action==='setupPasswords') openModal('Passwords','This UI can show the Passwords screen, but it will not collect or store real passwords.');
  else if (action==='setupWallet') toast('Wallet is marked Coming soon in the reference interface.');
  else if (action==='chooseVoice') { prefs.voice=element?.dataset?.voice||'Vale'; save(); nav('voice'); }
  else if (action==='voiceSettings') openModal('Voice settings','Background conversation and microphone controls are available on the Voice settings screen.',[{label:'Open Voice settings',value:'voiceSettings'}]);
  else if (action==='dismissVoiceTip') { prefs.voiceTipDismissed=true; save(); render(); }
  else if (action==='voiceInput') nav('voiceMode');
  else if (action==='openRecentChat') { prefs.chatHistory=prefs.chatHistory?.length?prefs.chatHistory:[{role:'user',text:'Write ChatGPT Functions Chart'},{role:'assistant',text:'This is a saved sample conversation from the reference navigation.'}]; save(); nav('chat'); }
  else if (action==='chooseCountry') { prefs.countryCode=element?.dataset?.country||'Nigeria +234'; save(); nav('phoneLogin'); }
  else if (action==='phoneContinue') { const n=$('#phoneNumber')?.value?.trim()||''; if(!n){toast('Enter a phone number to continue.');return;} prefs.phoneNumber=n; save(); nav('phoneVerification'); }
  else if (action==='continueEmail') { const v=$('#loginEmail')?.value?.trim()||''; if(!v.includes('@')){toast('Enter a valid email address.');return;} prefs.userEmail=v; save(); nav('emailVerification'); }
  else if (action==='verifyDemoCode') { toast('Sign-in is simulated. No account has been authenticated.'); nav('home'); }
  else if (action==='composerPlus') openModal('Add to your message','Choose a composer action.',[{label:'Add photos and files',value:'attach'},{label:'Create an image',value:'createImage'},{label:'Start a temporary chat',value:'temporary'},{label:'Search the web',value:'webSearch'}]);
  else if (action==='voiceMode') nav('voiceMode');
  else if (action==='archiveHistory') confirm('Archive chat history?','This will move only the sample conversation list in this browser to Archived chats.','archiveDemoHistory',true);
  else if (action==='deleteChats') confirm('Clear chat history?','Only local demo conversations will be cleared. No real account data will be changed.','clearDemoHistory',true);
  else if (action==='trustedContactManage') nav('trustedContact');
  else if (action==='openPrivacyResource') v3PrivacyCenterAction();
  else if (action==='appInfo') toast('Nexa AI UI & catalogue · Version 7.0');
  else if (action==='reportIssue') { prefs.resourceTitle='Report app issue'; nav('helpCenter'); }
  else if (action==='terms') { prefs.resourceTitle='Terms of use'; nav('helpCenter'); }
  else if (action==='learn') toast('External help links are not available in the offline prototype.');
  else v3HandleActionBase(action,element);
};

const v3ClickChoiceBase = clickChoice;
clickChoice = function(value) {
  if (activePreferenceKey && activePreferenceKey.startsWith('connection:')) {
    const n=activePreferenceKey.split(':')[1]; prefs.connections[n]=value==='connected'; save(); activePreferenceKey=null; modalLayer.hidden=true; render(); toast(value==='connected'?n+' demo connection enabled.':n+' left disconnected.');
  } else if (value==='trustedDemo') { prefs.trustedContactAdded=true; save(); modalLayer.hidden=true; render(); toast('Trusted contact demo enabled.'); }
  else if (value==='privacyPolicy'||value==='privacyRequest'||value==='helpCenter'||value==='licenses'||value==='terms') { prefs.resourceTitle=value==='privacyPolicy'?'Privacy policy':value==='privacyRequest'?'Submit a privacy request':value==='licenses'?'Licenses':value==='terms'?'Terms of use':'Help center'; modalLayer.hidden=true; nav(value==='terms'?'helpCenter':value); }
  else if (value==='reportIssue') { prefs.resourceTitle='Report app issue'; modalLayer.hidden=true; nav('helpCenter'); }
  else if (value==='appInfo') { modalLayer.hidden=true; toast('Nexa AI UI & catalogue · Version 7.0'); }
  else if (value==='voiceSettings') { modalLayer.hidden=true; nav('voice'); }
  else if (value==='attach'||value==='createImage'||value==='temporary'||value==='webSearch') {
    modalLayer.hidden=true;
    if(value==='createImage') nav('images'); else if(value==='temporary') nav('temporaryChats'); else if(value==='webSearch') toast('Web search is not connected in this offline demo.'); else toast('File attachment is not connected in this browser demo.');
  } else if (value==='close') { modalLayer.hidden=true; }
  else v3ClickChoiceBase(value);
};

const v3ConfirmHandler = (e)=>{
 const c=e.target.closest('[data-confirm]'); if(!c) return;
 const action=c.dataset.confirm;
 if(action==='archiveDemoHistory') { prefs.archivedChats=[...(prefs.archivedChats||[]),...(prefs.chatHistory||[]).filter(x=>x.role==='user').map(x=>x.text)]; prefs.chatHistory=[]; save(); modalLayer.hidden=true; render(); toast('Demo chat history archived.'); }
 if(action==='clearDemoHistory') { prefs.chatHistory=[]; save(); modalLayer.hidden=true; render(); toast('Demo chat history cleared.'); }
};
modalLayer.addEventListener('click',v3ConfirmHandler);

// Add custom list filtering after the original listeners.
screen.addEventListener('input',e=>{
 if(e.target.id==='countrySearch') { const q=e.target.value.toLowerCase(); screen.querySelectorAll('.country-list .row').forEach(r=>r.style.display=r.innerText.toLowerCase().includes(q)?'flex':'none'); }
});

// Keep the settings menu and in-screen header title aligned with the selected detail.
header = function(){
 const title = currentPage==='notificationDetail' ? (prefs.activeNotificationCategory||'Notifications') : (pageTitles[currentPage]||currentPage);
 topbar.innerHTML=`<button class="icon-btn" data-action="back" aria-label="Back">‹</button><div class="bar-title">${esc(title)}</div><button class="icon-btn ${currentPage==='home'||currentPage==='voiceMode'?'':'ghost'}" data-action="${currentPage==='settings'?'headerAction':currentPage==='voiceMode'?'voiceSettings':'headerAction'}" aria-label="More">${currentPage==='settings'?'ⓘ':currentPage==='home'?'⌕':currentPage==='voiceMode'?'☷':''}</button>`;
};
drawer = v3Drawer;

if (prefs.userName==='Chidera Chimeziri') prefs.userName='Demo User';
if (prefs.userEmail==='chidera@example.com') prefs.userEmail='demo@example.com';
/* Apply the V4 completeness refinement. */
/* Version 4 completeness and functional refinement after a second frame-by-frame review. */
Object.assign(pageTitles, {
  referencePhotos:'Reference photos', newNoteworthy:'New & noteworthy', browsePlugins:'Browse plugins',
  pluginDetail:'Plugin details', permissions:'Permissions', profile:'Profile', accountChooser:'Choose an account',
  chat:'ChatGPT', notificationDetail:'Notifications', privacyPolicy:'Privacy policy', privacyRequest:'Submit a privacy request',
  helpCenter:'Help center', licenses:'Licenses', temporaryChats:'Temporary Chats'
});

function v4HomePage(){
  return `<div class="home-space"></div>
  <div class="home-shortcuts">
    <button data-page="images"><span>▧</span> Create an image or sticker</button>
    <button data-page="chat"><span>✎</span> Write or edit</button>
  </div>
  <div class="chat-composer"><button data-action="composerPlus" aria-label="Add">＋</button><input id="homePrompt" placeholder="Ask ChatGPT"><button data-action="voiceInput" aria-label="Microphone">♩</button><button class="send-button voice-send" data-page="voiceMode" aria-label="Start voice">◖</button></div>`;
}
function v4ChatPage(){
  const messages=prefs.temporaryChat?(prefs.temporaryMessages||[]):(prefs.chatHistory||[]);
  return `${prefs.temporaryChat?'<div class="temporary-pill">◌　Temporary chat</div>':''}
  ${messages.length?`<div class="chat-thread">${messages.map(m=>`<div class="chat-bubble ${m.role==='user'?'user-bubble':'assistant-bubble'}">${esc(m.text)}</div>`).join('')}</div>`:`<div class="chat-welcome"><h2>What would you like help with?</h2><p>I can help you learn a language, suggest things to watch, or anything else.</p></div>`}
  <div class="chat-composer"><button data-action="composerPlus" aria-label="Add">＋</button><input id="chatInput" placeholder="Reply to ChatGPT" value="${esc(prefs.selectedImagePrompt||'')}"><button data-action="voiceInput" aria-label="Microphone">♩</button><button class="voice-send" data-page="voiceMode" aria-label="Voice conversation">◖</button><button class="send-button" data-action="sendChat" aria-label="Send">↑</button></div>`;
}
function v4StartTemporaryChat(){prefs.temporaryChat=true;prefs.temporaryMessages=[];save();nav('chat');}
function v4NotificationsPage(){
  const cats=prefs.notificationCategories||v3Defaults.notificationCategories;
  return `${group(cats.map(c=>{
    const k=c.replace(/[^a-z0-9]/gi,'');
    const enabled=prefs[`notif_${k}_push`]!==false||prefs[`notif_${k}_email`]!==false||prefs[`notif_${k}_inapp`]!==false;
    return v3RowStatus(c,'openNotificationCategory',c,enabled?'On':'Off');
  }).join(''))}`;
}
function v4UsagePage(){
  const amount=Number(prefs.usageRemaining??100);
  return `${section('Agentic usage limit')}<div class="usage-card"><div class="usage-line"><span>Usage limit</span><b>${amount}x remaining</b></div><div class="progress"><span style="width:${Math.max(0,Math.min(100,amount))}%"></span></div><small>Usage limit resets at the next usage window (demo)</small></div>${section('Usage limit resets')}<button class="pill" data-action="usageInfo">No usage limit resets available at this time.　ⓘ</button>${section('Credits')}<div class="usage-card"><button class="row" data-action="toggleRecharge"><span class="row-main"><span class="row-label">Automatic recharge</span></span><span class="row-value">${prefs.automaticRecharge?'On':'Off'}</span><span class="chevron">›</span></button><p class="switch-note">Credits extend usage beyond your plan limits.</p></div>`;
}
function v4PluginCard(name,desc,icon='✣',state='＋'){
 return `<button class="row plugin-directory-row" data-action="openPluginDetail" data-plugin="${esc(name)}"><span class="plugin-directory-icon">${icon}</span><span class="row-main"><span class="row-label">${esc(name)}</span><span class="row-sub">${esc(desc)}</span></span><span class="row-value">${esc(state)}</span></button>`;
}
function v4PluginsPage(){
 const added=[['AppDeploy','▣'],['appdesigns','◧'],['GitHub','◉'],['Plugin Management','✣']];
 const popular=[['Gmail','Read and manage Gmail','✉','＋'],['Google Drive','Drive, Docs, Sheets or Slides','◉','♙'],['Health','Explore your health data in ChatGPT','♥','＋'],['GitHub','Triage PRs, issues, CI and publish flows','◉','•••']];
 return `${section('Installed')}<div class="installed-plugin-icons">${added.map(([n,ic])=>`<button data-action="openPluginDetail" data-plugin="${esc(n)}" aria-label="${esc(n)}">${ic}</button>`).join('')}</div>${section('Popular')}<div class="group">${popular.map(([n,d,ic,s])=>v4PluginCard(n,d,ic,(prefs.pluginStates?.[n]===true?'Added':prefs.pluginStates?.[n]===false?'＋':s))).join('')}</div><button class="row" data-page="newNoteworthy"><span class="row-main"><span class="row-label">New & noteworthy</span></span><span class="chevron">›</span></button><div class="search-dock"><span>⌕</span><input id="pluginSearch" placeholder="Search plugins"></div>`;
}
function v4NewNoteworthyPage(){
 const items=[['Outlook Email','Triage Outlook inboxes','▣'],['Slack','Read and manage Slack','✥'],['Hostinger mail','Use Hostinger mail','✉'],['Teams','Summarize Teams and follow up','▦'],['Canva','Create, review, edit designs','C'],['Higgsfield','Every image and video model','〰']];
 return `${section('Communication')}${group(items.slice(0,4).map(([n,d,i])=>v4PluginCard(n,d,i)).join(''))}${section('Creativity')}${group(items.slice(4).map(([n,d,i])=>v4PluginCard(n,d,i)).join(''))}${section('More to explore')}${group(v4PluginCard('Google Drive','Files, Docs, Sheets or Slides','◉')+v4PluginCard('Health','Explore your health data in ChatGPT','♥')+v4PluginCard('GitHub','Triage PRs, issues and code','◉'))}<div class="search-dock"><span>⌕</span><input id="pluginSearch" placeholder="Search plugins"></div>`;
}
function v4BrowsePluginsPage(){
 return `${section('Browse plugins')}<div class="plugin-category-grid"><button data-page="newNoteworthy">✉<b>Communication</b></button><button data-page="newNoteworthy">✦<b>Creativity</b></button><button data-page="newNoteworthy">⌕<b>Research & analysis</b></button><button data-page="newNoteworthy">▦<b>Productivity</b></button></div>${section('Popular plugins')}${group(v4PluginCard('Gmail','Read and manage Gmail','✉')+v4PluginCard('Google Drive','Drive, Docs, Sheets or Slides','◉')+v4PluginCard('Health','Explore your health data in ChatGPT','♥')+v4PluginCard('GitHub','Code, issues and pull requests','◉'))}<div class="search-dock"><span>⌕</span><input id="pluginSearch" placeholder="Search plugins"></div>`;
}
function v4PermissionsPage(){
 return `${section('Preferences')}${group(actionRow('Permissions','permissionMode','◉','Choose how connected apps can act',prefs.permissionMode||'Allow low-risk actions'))}${section('Added apps')}${group(['AppDeploy','appdesigns','GitHub','Plugin Management'].map((n,i)=>`<button class="row" data-action="openPluginDetail" data-plugin="${esc(n)}"><span class="row-icon">${['▣','◧','◉','✣'][i]}</span><span class="row-main"><span class="row-label">${esc(n)}</span></span><span class="chevron">›</span></button>`).join(''))}<button class="outline" data-page="browsePlugins">Browse plugins</button>${help('Permission choices are saved only in this browser. No external app can read or change your data.')}`;
}
function v4PluginDetailPage(){
 const n=prefs.activePlugin||'AppDeploy';
 const initial=['AppDeploy','appdesigns','GitHub','Plugin Management'].includes(n);
 const added=prefs.pluginStates?.[n]??initial;
 return `<div class="info-hero compact"><div class="large-icon">✣</div><h2>${esc(n)}</h2><p>${esc(n)} appears in the reference app list. This page previews its details without contacting the provider.</p></div>${group(row('Status','pluginDetail','▣',added?'Added':'Not added')+actionRow('Permissions','permissionMode','⚙','Choose when this app can act',prefs.permissionMode||'Allow low-risk actions'))}<button class="primary" data-action="togglePluginInstall" data-plugin="${esc(n)}">${added?'Remove app':'Add app'}</button>${help('No external account is connected by this demonstration.')}`;
}
function v4GeneralPage(){
 return `${section('Personal preferences')}${group(actionRow('Accent color','accent','◉','',prefs.accent||'Blue')+`<div class="field-wrap"><label class="small-muted" for="nickname">Nickname</label><input class="field" id="nickname" placeholder="Choose nickname" value="${esc(prefs.nickname||'')}"></div>`+actionRow('App language','language','文','',prefs.language||'English')+row('Reference photos','referencePhotos','▧',`${(prefs.referencePhotoNames||[]).length} added`,'Add'))}${section('Intelligence')}${group(actionRow('Visual answers','visual','▧','',prefs.visualAnswers||'Default')+toggle('fastAnswers','Fast answers','Get quick answers using general knowledge.')+toggle('suggestions','Homepage suggestions','Get suggestions on the home screen.')+toggle('webSearch','Web search','Search the web when useful.')+toggle('librarySearch','Library search','Search your files and saved items.'))}`;
}
function v4ReferencePhotosPage(){
 const names=prefs.referencePhotoNames||[];
 return `<div class="info-hero compact"><div class="large-icon">▧</div><h2>Reference photos</h2><p>These photos help create images that look more like you. Choose photos from this device for this browser demo.</p></div><label class="primary file-button" for="referencePhotoInput">＋ Add photos</label><input id="referencePhotoInput" type="file" accept="image/*" multiple hidden>${names.length?`${section('Added photos')}${group(names.map((n,i)=>`<div class="row"><span class="row-main"><span class="row-label">${esc(n)}</span></span><button class="mini-action" data-action="removeReferencePhoto" data-index="${i}">Remove</button></div>`).join(''))}`:'<div class="empty-note">No reference photos added.</div>'}${help('Selected images are not uploaded. Only their filenames are saved in this demo.')}`;
}
function v4MemoryPage(){
 return `${group(toggle('enableMemory','Enable memory','Let ChatGPT personalize your experience based on your chats, files and connected apps. Memory may include sensitive information you provide.'))}<p class="setting-note"><span class="link" data-page="memoryInfo">Learn more</span></p>${group(row('Memory summary','memorySummary','▤','View an overview of what ChatGPT has learned about you'))}<p class="setting-note">Use <span class="link" data-page="personalization">custom instructions</span> for details you want ChatGPT to always keep in mind. You can still manage your <span class="link" data-page="savedMemories">saved memories</span>.</p>`;
}
function v4TemporaryChatsPage(){
 return `<div class="info-hero"><div class="large-icon">◌</div><h2>Temporary Chats</h2><p>Start a chat that stays out of your history unless you save it.</p></div><button class="primary" data-action="newTemporaryChat">New temporary chat　↗</button><div class="faq-list">${faq('What are temporary chats?','Temporary chats stay out of your history unless you choose to save them. They do not create or update memories, and are not used to improve models in this demonstration.')}${faq('How can I choose whether a temporary chat is personalized?','Choose to use saved demo preferences or start without personalization when you create the chat.')}${faq('What happens if I save a temporary chat?','A saved temporary chat becomes a regular conversation and appears in chat history.')}${faq('How are temporary chats different from locked chats?','Temporary chats are kept out of history. Locked chats are regular conversations with an additional access restriction.')}</div><button class="outline" data-action="learn">Learn more　↗</button>`;
}
function v4VoiceChoicesPage(){
 const groups=[['Featured','Miko'],['Hindi','Leher','Neer'],['Japanese','Rindō','Himari'],['Korean','Hanul','Haetsol'],['Mexican Spanish','Arrullo','Tinta'],['English','Vale','Juniper','Arbor','Cove','Ember','Maple','Sol']];
 return groups.map(([lang,...voices])=>`${section(lang)}${group(voices.map(n=>`<button class="row" data-action="chooseVoice" data-voice="${esc(n)}"><span class="row-main"><span class="row-label">${esc(n)}</span></span>${prefs.voice===n?'<span class="row-value">✓</span>':''}</button>`).join(''))}`).join('');
}
function v4ProfilePage(){
 return `<div class="profile-summary"><div class="account-avatar">DU</div><h2>${esc(prefs.userName||'Demo User')}</h2><p>${esc(prefs.userEmail||'demo@example.com')}</p></div>${group(row('Email','emailLogin','✉',prefs.userEmail||'demo@example.com')+row('App','general','▣','18 or older')+row('Subscription','subscription','▣','Free','Free')+row('Upgrade to ChatGPT Plus','subscription','✦'))}<button class="row danger-row" data-action="logout">⇥　Log out</button>`;
}
function v4AccountChooserPage(){
 const accounts=[['DU','Demo User','demo.user@example.com'],['AM','Alex Morgan','alex.morgan@example.com'],['JS','Jordan Smith','jordan.smith@example.com'],['TC','Taylor Chen','taylor.chen@example.com'],['SK','Sam Kim','sam.kim@example.com'],['RP','Riley Parker','riley.parker@example.com'],['JM','Jamie Miller','jamie.miller@example.com']];
 return `<div class="account-chooser-title"><div class="hero-mark">✳</div><h2>Choose an account</h2><p>Continue with an account already used on this device.</p></div>${group(accounts.map(([i,n,e])=>`<button class="row account-choice" data-action="chooseDemoAccount" data-initials="${i}" data-name="${esc(n)}" data-email="${esc(e)}"><span class="account-mini">${i}</span><span class="row-main"><span class="row-label">${esc(n)}</span><span class="row-sub">${esc(e)}</span></span><span class="chevron">›</span></button>`).join(''))}<button class="outline" data-page="login">Log in another way</button>`;
}
function v4PluginPermissionDescription(mode){
 const map={
  'Always ask':'ChatGPT will ask before reading or making changes.',
  'Allow read actions':'ChatGPT can read information without asking, but will ask before making changes.',
  'Allow low-risk actions':'ChatGPT can complete low-risk actions, but may ask before actions involving sensitive information.'
 };
 return map[mode]||'';
}
function v4PrivacyPage(){
 return `${v3PrivacyPage()}`;
}
function v4HistoryDataPage(){
 return `${group(toggle('improveModel','Improve the model for everyone','Allow your content to be used to improve models in this demonstration.')+`<div class="setting-note"><span class="link" data-page="modelImprovement">Learn more</span></div>`+actionRow('Export Data','export','⇩')+actionRow('Delete OpenAI account','deleteAccount','⌫'))}${section('Apps with access')}${group(`<div class="setting-note">No apps have access to your contact information.</div>`+row('Manage apps','customize','✣','Review connected apps'))}${section('Chat history')}${group(row('View archived chats','archivedChats','▤')+actionRow('Archive chat history','archiveHistory','▤')+actionRow('Clear chat history','deleteChats','⌫'))}`;
}
function v4ChatPrivacyPage(){
 return `<div class="info-hero compact"><div class="large-icon">▣</div><h2>Chat privacy</h2><p>Manage how chats are stored and protected in this interface.</p></div>${group(toggle('saveHistory','Save chat history','Keep your regular demo conversations in the chat list.')+toggle('requireUnlock','Require device unlock','Require device authentication for protected features.'))}${group(row('Temporary Chats','temporaryChats','◌','Chats kept out of history')+row('Memory','memory','▤','Manage saved personalization'))}${help('These switches save only local demo preferences.')}`;
}
function v4MfaInfoPage(){
 return v3FaqPage('♙','Multi-factor authentication (MFA)','Add another step to help protect your account when you log in.',[
  ['What are the benefits of MFA?','MFA adds another verification step beyond your password, helping protect an account if a password is exposed.'],
  ['What verification methods can I use?','Depending on the service, methods can include an authenticator app or another supported verification factor.'],
  ['How can I turn MFA on or off?','Open Security and login, choose Authenticator app and use the available setting. This demo changes only local display state.']
 ],'security','Manage');
}
function v4ExportFaqPage(){
 return v3FaqPage('⇩','Export or delete your data','Learn how to download your data or remove information from an account.',[
  ['What is included in a data export?','A data export can include chat history and other account information associated with the account.'],
  ['How do I export my data?','Choose Export Data in History and data. This prototype downloads a JSON file containing its local demo preferences.'],
  ['Can I delete chats without deleting my account?','Yes. Chat history controls can archive or clear local demo conversations separately from the account.'],
  ['How do I delete my account?','Account deletion is a permanent service action. The delete button in this prototype does not contact a real account service.']
 ],'historyData','Manage');
}
function v4InfoResourcePage(){
 const routeTitle={privacyPolicy:'Privacy policy',privacyRequest:'Submit a privacy request',helpCenter:'Help center',licenses:'Licenses'}[currentPage];
 const title=(currentPage==='helpCenter'&&prefs.resourceTitle&&prefs.resourceTitle!=='Help center')?prefs.resourceTitle:(routeTitle||'Help center');
 const copy={
  'Privacy policy':'Review how information is collected, used, retained and protected. This offline prototype does not transmit personal data.',
  'Submit a privacy request':'A real privacy request would be submitted through the service provider. This offline demonstration cannot submit or track a request.',
  'Help center':'Browse help topics about account access, settings, privacy, security and app features. External help pages are not loaded in this offline demo.',
  'Licenses':'This package contains original interface code and local demonstration assets. No third-party font files are bundled.',
  'Terms of use':'This screen is a local reference for the Terms of use entry. No legal agreement is accepted or changed here.',
  'Report app issue':'Use the official app support channel to report an issue. This offline demo does not submit diagnostic information.'
 };
 return `<div class="info-hero"><div class="large-icon">ⓘ</div><h2>${esc(title)}</h2><p>${esc(copy[title]||'This information screen is included for navigation and visual reference. External services are unavailable offline.')}</p></div>${group(row('Privacy center','privacy','▣')+row('Settings','settings','⚙'))}`;
}
function v4UsageAndPrivacyPages(){
  // Intentionally separate the overview page from the FAQ/detail pages seen in the recordings.
  return `<div class="info-hero"><div class="large-icon">◷</div><h2>Personalized chats & ads</h2><p>Customize how ChatGPT responds, remembers details and adapts to you.</p></div>${group(row('Memory','memory','▤','ChatGPT can remember helpful details between chats.')+row('Personalized ads','personalizedAds','⚑','Choose whether ads are personalized using your data.')+row('Location','location','⌖','Learn more about how ChatGPT uses location information.'))}`;
}
function v4ChooseAccountAction(element){
  prefs.userName=element.dataset.name||'Demo User';
  prefs.userEmail=element.dataset.email||'demo@example.com';
  save(); nav('home'); toast('Demo account selected. No account was authenticated.');
}

// Make option sheets support short explanatory text, as shown on the plugin permission sheet.
openModal = function(title,copy,options=[]){
  modalLayer.hidden=false;
  modalLayer.innerHTML=`<div class="modal"><div class="modal-handle"></div><div class="modal-title">${esc(title)}</div>${copy?`<p class="modal-copy">${esc(copy)}</p>`:''}${options.map(o=>`<button class="option" data-choice="${esc(o.value)}">${o.label?`<strong>${esc(o.label)}</strong>`:''}${o.description?`<small>${esc(o.description)}</small>`:''}</button>`).join('')}<button class="secondary" data-action="closeModal">Cancel</button></div>`;
};

Object.assign(pages, {
  home:v4HomePage, chat:v4ChatPage, notifications:v4NotificationsPage, usage:v4UsagePage,
  plugins:v4PluginsPage, newNoteworthy:v4NewNoteworthyPage, browsePlugins:v4BrowsePluginsPage, permissions:v4PermissionsPage,
  pluginDetail:v4PluginDetailPage, general:v4GeneralPage, referencePhotos:v4ReferencePhotosPage, memory:v4MemoryPage,
  temporaryChats:v4TemporaryChatsPage, voiceChoices:v4VoiceChoicesPage, profile:v4ProfilePage, accountChooser:v4AccountChooserPage,
  privacy:v4PrivacyPage, historyData:v4HistoryDataPage, chatPrivacy:v4ChatPrivacyPage,
  mfaInfo:v4MfaInfoPage, exportFaq:v4ExportFaqPage,
  personalizedChatsAds:v4UsageAndPrivacyPages, privacyPolicy:v4InfoResourcePage, privacyRequest:v4InfoResourcePage,
  helpCenter:v4InfoResourcePage, licenses:v4InfoResourcePage
});

const v4BaseAction=handleAction;
handleAction=function(action,element){
 if(action==='permissionMode'){
   activePreferenceKey='permissionMode';
   const opts=[
     ['Always ask','ChatGPT will ask before reading or making changes.'],
     ['Allow read actions','ChatGPT can read information without asking, but will ask before making changes.'],
     ['Allow low-risk actions','ChatGPT can complete low-risk actions, but may ask before actions involving sensitive information.']
   ];
   openModal('Permissions','Choose how connected apps may take actions.',opts.map(([label,description])=>({label:(prefs.permissionMode===label?'◉　':'○　')+label,description,value:label})));
 } else if(action==='readPermissions'){
   activePreferenceKey='permissionMode'; openModal('Allow read actions','Connected apps can read approved information without asking each time, but must ask before making changes.',[{label:'Choose Allow read actions',value:'Allow read actions'}]);
 } else if(action==='writePermissions'){
   activePreferenceKey='permissionMode'; openModal('Allow low-risk actions','Apps may complete low-risk actions, while changes involving sensitive information may require approval.',[{label:'Choose Allow low-risk actions',value:'Allow low-risk actions'}]);
 } else if(action==='newTemporaryChat') v4StartTemporaryChat();
 else if(action==='photos') nav('referencePhotos');
 else if(action==='removeReferencePhoto') {const i=Number(element?.dataset?.index);prefs.referencePhotoNames=(prefs.referencePhotoNames||[]).filter((_,j)=>j!==i);save();render();}
 else if(action==='togglePluginInstall'){
   const n=element?.dataset?.plugin||prefs.activePlugin||'Plugin'; const was=prefs.pluginStates?.[n]??['AppDeploy','appdesigns','GitHub','Plugin Management'].includes(n);
   prefs.pluginStates=prefs.pluginStates||{}; prefs.pluginStates[n]=!was; prefs.installedPlugins=prefs.installedPlugins||[];
   if(prefs.pluginStates[n]&&!prefs.installedPlugins.includes(n))prefs.installedPlugins.push(n);
   if(!prefs.pluginStates[n])prefs.installedPlugins=prefs.installedPlugins.filter(x=>x!==n);
   save();render();
 } else if(action==='chooseDemoAccount') v4ChooseAccountAction(element);
 else if(action==='newTemporaryChat') v4StartTemporaryChat();
 else if(action==='sendChat'||action==='sendHome'){
   const field=action==='sendHome'?'#homePrompt':'#chatInput'; const value=($(field)?.value||'').trim();
   if(!value){toast('Type a message first.');return;}
   if(prefs.temporaryChat){prefs.temporaryMessages=[...(prefs.temporaryMessages||[]),{role:'user',text:value},{role:'assistant',text:'This is a local interface preview. Connect an AI service to receive live responses.'}];render();}
   else {prefs.chatHistory=[...(prefs.chatHistory||[]),{role:'user',text:value},{role:'assistant',text:'This is a local interface preview. Connect an AI service to receive live responses.'}];save();nav('chat');}
 } else if(action==='composerPlus') openModal('Add to your message','Choose a composer action.',[{label:'Add photos and files',value:'attach'},{label:'Create an image',value:'createImage'},{label:'Start a temporary chat',value:'temporary'},{label:'Search the web',value:'webSearch'}]);
 else v4BaseAction(action,element);
};

const v4BaseChoice=clickChoice;
clickChoice=function(value){
 if(value==='temporary'){modalLayer.hidden=true;v4StartTemporaryChat();}
 else if(value==='attach'){modalLayer.hidden=true;toast('File picker is available on a connected device; this offline preview does not upload files.');}
 else if(value==='createImage'){modalLayer.hidden=true;nav('images');}
 else if(value==='webSearch'){modalLayer.hidden=true;toast('Web search is not connected in this offline preview.');}
 else v4BaseChoice(value);
};

// Header variants match the video layouts: compact home controls, page titles elsewhere, full-screen voice.
header=function(){
  if(currentPage==='voiceMode'){
    topbar.style.display='none'; topbar.className='topbar'; return;
  }
  topbar.style.display='grid';
  if(currentPage==='home'){
    topbar.className='topbar home-topbar';
    topbar.innerHTML=`<button class="icon-btn" data-action="drawer" aria-label="Open menu">☰</button><button class="upgrade-chip" data-page="subscription">✦　Get Plus</button><button class="icon-btn home-voice" data-page="voiceMode" aria-label="Voice conversation">◌</button>`;
    return;
  }
  topbar.className='topbar';
  const title=currentPage==='notificationDetail'?(prefs.activeNotificationCategory||'Notifications'):(pageTitles[currentPage]||currentPage);
  const right=currentPage==='settings'?'ⓘ':currentPage==='chat'?'⋮':'';
  topbar.innerHTML=`<button class="icon-btn" data-action="back" aria-label="Back">‹</button><div class="bar-title">${esc(title)}</div><button class="icon-btn ${right?'':'ghost'}" data-action="${currentPage==='settings'?'headerAction':currentPage==='chat'?'chatOptions':'headerAction'}" aria-label="More">${right}</button>`;
};

// Keep the temporary conversation transient and photo names local to this browser.
screen.addEventListener('change',e=>{
 if(e.target.id==='referencePhotoInput'){
   const files=[...(e.target.files||[])];
   prefs.referencePhotoNames=[...(prefs.referencePhotoNames||[]),...files.map(f=>f.name)].slice(0,20);
   save();render();toast('Photo names added to the local demo. Images were not uploaded.');
 }
});
screen.addEventListener('input',e=>{
 if(e.target.id==='nickname'){prefs.nickname=e.target.value;save();}
});

// V4 supplementary navigation and interaction wiring.
pages.search=function(){return `<div class="search-dock search-page-dock"><span>⌕</span><input id="allSearch" placeholder="Search chats, settings and projects"></div>${section('Recent chats')}${group(row(prefs.recentChatTitle||'Write ChatGPT Functions Chart','chat','✎','Recent conversation')+row('Projects','projects','▣')+row('Library','library','▤')+row('Settings','settings','⚙'))}`;};
pages.profile=v4ProfilePage;
header=header;
topbar.addEventListener('click',e=>{
 const p=e.target.closest('[data-page]'); if(p){nav(p.dataset.page);return;}
 const a=e.target.closest('[data-action]'); if(a){handleAction(a.dataset.action,a);return;}
 const t=e.target.closest('[data-toggle]'); if(t){const k=t.dataset.toggle;prefs[k]=!prefs[k];save();t.setAttribute('aria-checked',String(prefs[k]));return;}
});
const v4ActionBase2=handleAction;
handleAction=function(action,element){
 if(action==='searchDrawer'){nav('search');}
 else if(action==='chatOptions'){openModal('Chat options','Choose an action for this sample conversation.',[{label:'Start a temporary chat',value:'temporary'},{label:'Open settings',value:'openSettings'},{label:'Close',value:'close'}]);}
 else if(action==='toggleMic'){prefs.micMuted=!prefs.micMuted;save();render();}
 else if(action==='toggleVoiceSession'){prefs.currentVoiceSession=!prefs.currentVoiceSession;save();render();}
 else v4ActionBase2(action,element);
};
const v4ChoiceBase2=clickChoice;
clickChoice=function(value){
 if(value==='openSettings'){modalLayer.hidden=true;nav('settings');}
 else v4ChoiceBase2(value);
};
screen.addEventListener('input',e=>{
 if(e.target.id==='pluginSearch'){
   const q=e.target.value.toLowerCase();
   screen.querySelectorAll('.plugin-directory-row,.plugin-card').forEach(r=>r.style.display=r.innerText.toLowerCase().includes(q)?'flex':'none');
 }
 if(e.target.id==='allSearch'){
   const q=e.target.value.toLowerCase();
   screen.querySelectorAll('.row').forEach(r=>r.style.display=r.innerText.toLowerCase().includes(q)?'flex':'none');
 }
});

/* Video-sourced plugin artwork and the remaining small control behaviors. */
const pluginArt={
 'AppDeploy':'assets/plugins/appdeploy.jpg','appdesigns':'assets/plugins/appdesigns.jpg','Plugin Management':'assets/plugins/plugin_management.jpg',
 'Gmail':'assets/plugins/gmail.jpg','Google Drive':'assets/plugins/google_drive.jpg','Health':'assets/plugins/health.jpg','GitHub':'assets/plugins/github.jpg',
 'Outlook Email':'assets/plugins/outlook_email.jpg','Slack':'assets/plugins/slack.jpg','Hostinger mail':'assets/plugins/hostinger_mail.jpg',
 'Teams':'assets/plugins/teams.jpg','Canva':'assets/plugins/canva.jpg','Higgsfield':'assets/plugins/higgsfield.jpg'
};
v4PluginCard=function(name,desc,icon='✣',state='＋'){
 const src=pluginArt[name];
 return `<button class="row plugin-directory-row" data-action="openPluginDetail" data-plugin="${esc(name)}">${src?`<img class="plugin-art" src="${src}" alt="">`:`<span class="plugin-directory-icon">${icon}</span>`}<span class="row-main"><span class="row-label">${esc(name)}</span><span class="row-sub">${esc(desc)}</span></span><span class="row-value">${esc(state)}</span></button>`;
};
pages.plugins=function(){
 const added=['AppDeploy','appdesigns','GitHub','Plugin Management'];
 const popular=[['Gmail','Read and manage Gmail','✉','＋'],['Google Drive','Drive, Docs, Sheets or Slides','◉','♙'],['Health','Explore your health data in ChatGPT','♥','＋'],['GitHub','Triage PRs, issues, CI and publish flows','◉','•••']];
 return `${section('Installed')}<div class="installed-plugin-icons">${added.map(n=>`<button data-action="openPluginDetail" data-plugin="${esc(n)}" aria-label="${esc(n)}"><img src="${pluginArt[n]}" alt=""></button>`).join('')}</div>${section('Popular')}<div class="group">${popular.map(([n,d,ic,s])=>v4PluginCard(n,d,ic,(prefs.pluginStates?.[n]===true?'Added':prefs.pluginStates?.[n]===false?'＋':s))).join('')}</div><button class="row" data-page="newNoteworthy"><span class="row-main"><span class="row-label">New & noteworthy</span></span><span class="chevron">›</span></button><button class="row" data-page="browsePlugins"><span class="row-main"><span class="row-label">Browse plugins</span></span><span class="chevron">›</span></button><div class="search-dock"><span>⌕</span><input id="pluginSearch" placeholder="Search plugins"></div>`;
};
pages.newNoteworthy=function(){
 const items=[['Outlook Email','Triage Outlook inboxes','▣'],['Slack','Read and manage Slack','✥'],['Hostinger mail','Use Hostinger mail','✉'],['Teams','Summarize Teams and follow up','▦'],['Canva','Create, review, edit designs','C'],['Higgsfield','Every image and video model','〰']];
 return `${section('Communication')}${group(items.slice(0,4).map(([n,d,i])=>v4PluginCard(n,d,i)).join(''))}${section('Creativity')}${group(items.slice(4).map(([n,d,i])=>v4PluginCard(n,d,i)).join(''))}${section('More to explore')}${group(v4PluginCard('Google Drive','Files, Docs, Sheets or Slides','◉')+v4PluginCard('Health','Explore your health data in ChatGPT','♥')+v4PluginCard('GitHub','Triage PRs, issues and code','◉'))}<div class="search-dock"><span>⌕</span><input id="pluginSearch" placeholder="Search plugins"></div>`;
};
pages.browsePlugins=function(){
 return `${section('Browse plugins')}<div class="plugin-category-grid"><button data-page="newNoteworthy">✉<b>Communication</b></button><button data-page="newNoteworthy">✦<b>Creativity</b></button><button data-page="newNoteworthy">⌕<b>Research & analysis</b></button><button data-page="newNoteworthy">▦<b>Productivity</b></button></div>${section('Popular plugins')}${group(v4PluginCard('Gmail','Read and manage Gmail','✉')+v4PluginCard('Google Drive','Drive, Docs, Sheets or Slides','◉')+v4PluginCard('Health','Explore your health data in ChatGPT','♥')+v4PluginCard('GitHub','Code, issues and pull requests','◉'))}<div class="search-dock"><span>⌕</span><input id="pluginSearch" placeholder="Search plugins"></div>`;
};
pages.advancedSecurity=function(){return `${section('Advanced account security')}${group(toggle('advancedSecurityEnabled','Advanced account security','Require stronger sign-in methods and apply extra protections to help prevent unauthorized access.'))}${help('This switch changes only the local display state. It does not change the security of a real account.')}${row('Learn more about advanced security','helpCenter','↗')}`;};
pages.lockedChats=function(){return `${section('Locked chats')}${group(actionRow('Account PIN','setAccountPin','▣',prefs.accountPinSet?'Demo PIN configured':'Set or change your PIN'))}${help('The app may ask for a PIN before opening locked chats. This prototype never asks for or stores a real PIN.')}`;};
pages.sessions=function(){const count=(prefs.demoSessions||['This device','Other device']).length;return `${section('Active sessions')}${group((prefs.demoSessions||['This device','Other device']).map((n,i)=>row(n,'sessions','▣',i===0?'Android · Current session':'Demo session · Last active recently')).join(''))}<button class="outline" data-action="signOutSessions">Log out of all other devices (${Math.max(0,count-1)})</button>${help('These are sample sessions only and are not linked to a real account.')}`;};
pages.appearance=appearancePage;

const v5ActionBase=handleAction;
handleAction=function(action,element){
 if(action==='advancedToggle'){prefs.advancedSecurityEnabled=!prefs.advancedSecurityEnabled;save();render();toast('Advanced security demo preference updated.');}
 else if(action==='addPasskey'){openModal('Add a passkey','Passkey creation requires your device security provider and cannot be completed by this offline demo.',[{label:'Learn about passkeys',value:'learn'}]);}
 else if(action==='setAccountPin'){openModal('Account PIN','A real PIN should never be entered into this offline prototype. This option only previews the setup flow.',[{label:'Mark demo PIN as configured',value:'setDemoPin'}]);}
 else if(action==='signOutSessions'){confirm('Log out of other devices?','Only the sample session list in this browser will be updated.','clearDemoSessions',true);}
 else if(action==='addFamily'){openModal('Add family member','Family linking requires a real account and is not available offline.',[{label:'Learn about parental controls',value:'learn'}]);}
 else if(action==='newProject'){nav('projectCreate');}
 else if(action==='archiveChats'){nav('archivedChats');}
 else v5ActionBase(action,element);
};
const v5ChoiceBase=clickChoice;
clickChoice=function(value){
 if(value==='setDemoPin'){prefs.accountPinSet=true;save();modalLayer.hidden=true;render();toast('Demo PIN status updated. No PIN was collected.');}
 else v5ChoiceBase(value);
};
const v5ConfirmBase=modalLayer.addEventListener;
modalLayer.addEventListener('click',e=>{
 const c=e.target.closest('[data-confirm="clearDemoSessions"]');
 if(c){prefs.demoSessions=(prefs.demoSessions||['This device','Other device']).slice(0,1);save();modalLayer.hidden=true;render();toast('Sample sessions updated.');}
});

/* V6 final audit pass: correct reference defaults and reuse the visible voice orb artwork. */
if (!prefs.videoReferenceDefaultsV6) {
  prefs.scheduledBriefing = true;
  prefs.outfitSuggestions = true;
  prefs.fridayRecommendations = true;
  prefs.greetingExchange = false;
  prefs.videoReferenceDefaultsV6 = true;
  save();
}

pages.voiceMode = function v6VoiceModePage(){
  return `<div class="voice-stage"><div class="voice-stage-top"><button class="icon-btn" data-action="drawer" aria-label="Open menu">☰</button><button class="icon-btn" data-action="voiceSettings" aria-label="Voice settings">☷</button></div><img class="voice-orb voice-orb-reference" src="assets/voice-orb.png" alt="Blue sky voice animation orb"><div class="voice-stage-bottom"><div class="voice-tip" ${prefs.voiceTipDismissed?'hidden':''}><b>Background conversations</b><span>Voice can now keep your conversation going when you lock your phone. You can turn this off anytime in settings.</span><button data-action="dismissVoiceTip" aria-label="Dismiss">×</button></div><div class="voice-input"><input placeholder="Ask ChatGPT" id="voiceInput"><button data-action="toggleMic" aria-label="Toggle microphone">${prefs.micMuted?'◉':'◍'}</button><button class="close-voice" data-page="home" aria-label="Close voice">×</button></div></div></div>`;
};

pages.accountChooser = function v6AccountChooserPage(){
  const accounts=[
    ['DU','Demo User','demo.user@example.com'],
    ['AM','Alex Morgan','alex.morgan@example.com'],
    ['JS','Jordan Smith','jordan.smith@example.com'],
    ['TC','Taylor Chen','taylor.chen@example.com'],
    ['SK','Sam Kim','sam.kim@example.com'],
    ['RP','Riley Parker','riley.parker@example.com'],
    ['JM','Jamie Miller','jamie.miller@example.com'],
    ['AB','Avery Brooks','avery.brooks@example.com'],
    ['CD','Casey Davis','casey.davis@example.com'],
    ['MP','Morgan Patel','morgan.patel@example.com'],
    ['JL','Jordan Lee','jordan.lee@example.com']
  ];
  return `<div class="account-chooser-title"><div class="hero-mark">✳</div><h2>Choose an account</h2><p>Continue with an account already used on this device.</p></div>${group(accounts.map(([i,n,e])=>`<button class="row account-choice" data-action="chooseDemoAccount" data-initials="${i}" data-name="${esc(n)}" data-email="${esc(e)}"><span class="account-mini">${i}</span><span class="row-main"><span class="row-label">${esc(n)}</span><span class="row-sub">${esc(e)}</span></span><span class="chevron">›</span></button>`).join(''))}<button class="outline" data-page="login">Log in another way</button>`;
};

/* V6: make the alternate sign-in path expose both visible entry methods. */
pages.emailLogin = function(){
  return `${section('Email')}<input class="field" type="email" id="loginEmail" placeholder="Email address"><button class="primary" data-action="continueEmail">Continue</button><button class="outline" data-page="phoneLogin">Continue with phone</button><p class="small-muted center">By continuing, you agree to the Terms of use and Privacy policy. This is a local sign-in preview only.</p>`;
};
pages.phoneLogin = function(){
  return `${section('Country / region')}<button class="pill" data-page="countrySelector">${esc(prefs.countryCode||'Nigeria +234')} <span>⌄</span></button><input class="field" id="phoneNumber" placeholder="Phone number" inputmode="tel"><button class="primary" data-action="phoneContinue">Continue</button><button class="outline" data-page="emailLogin">Continue with email</button><p class="small-muted center">This is a local sign-in flow preview only.</p>`;
};
