/* Expert AI: live service bridge for the original mobile UI pack. */
(() => {
  'use strict';
  const APP = 'nexa-mobile-ui';
  const pending = new Map();
  let sequence = 0;
  let activeUser = null;
  let preferenceTimer = 0;

  const notify = message => {
    if (typeof toast === 'function') toast(message);
    else console.info('[Expert AI]', message);
  };
  const friendlyError = error => error instanceof Error ? error.message : 'The live service request failed.';

  const DISPLAY_SIZES = {
    small: { label: 'Small', pixels: 13 },
    medium: { label: 'Standard', pixels: 15 },
    large: { label: 'Large', pixels: 17 },
    extraLarge: { label: 'Extra large', pixels: 19 }
  };

  const DISPLAY_FONTS = [
    { value: 'system', label: 'System default', family: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
    { value: 'inter', label: 'Inter', family: '"Inter", sans-serif' },
    { value: 'roboto', label: 'Roboto', family: '"Roboto", sans-serif' },
    { value: 'openSans', label: 'Open Sans', family: '"Open Sans", sans-serif' },
    { value: 'lato', label: 'Lato', family: '"Lato", sans-serif' },
    { value: 'montserrat', label: 'Montserrat', family: '"Montserrat", sans-serif' },
    { value: 'poppins', label: 'Poppins', family: '"Poppins", sans-serif' },
    { value: 'nunito', label: 'Nunito', family: '"Nunito", sans-serif' },
    { value: 'sourceSans', label: 'Source Sans 3', family: '"Source Sans 3", sans-serif' },
    { value: 'ubuntu', label: 'Ubuntu', family: '"Ubuntu", sans-serif' },
    { value: 'merriweather', label: 'Merriweather', family: '"Merriweather", Georgia, serif' },
    { value: 'playfair', label: 'Playfair Display', family: '"Playfair Display", Georgia, serif' },
    { value: 'arial', label: 'Arial', family: 'Arial, Helvetica, sans-serif' },
    { value: 'georgia', label: 'Georgia', family: 'Georgia, "Times New Roman", serif' },
    { value: 'verdana', label: 'Verdana', family: 'Verdana, Geneva, sans-serif' }
  ];

  function applyFontAndDisplay() {
    const size = DISPLAY_SIZES[prefs.fontSize] || DISPLAY_SIZES.medium;
    const font = DISPLAY_FONTS.find(item => item.value === prefs.fontFamily) || DISPLAY_FONTS[0];
    const pixels = size.pixels;

    document.documentElement.style.setProperty('--expert-display-font-size', pixels + 'px');
    document.documentElement.style.setProperty('--expert-chat-font-size', pixels + 'px');
    document.documentElement.style.setProperty('--expert-font-family', font.family);

    const root = typeof screen !== 'undefined' && screen instanceof HTMLElement
      ? screen
      : document.body;
    root.dataset.expertDisplayRoot = 'true';

    let style = document.getElementById('expert-font-display-style');
    if (!style) {
      style = document.createElement('style');
      style.id = 'expert-font-display-style';
      document.head.appendChild(style);
    }
    style.textContent = [
      '[data-expert-display-root],[data-expert-display-root] button,[data-expert-display-root] input,[data-expert-display-root] textarea,[data-expert-display-root] select,[data-expert-display-root] a,[data-expert-display-root] label,[data-expert-display-root] p,[data-expert-display-root] span:not(.icon):not(.row-icon):not(.chevron),[data-expert-display-root] h1,[data-expert-display-root] h2,[data-expert-display-root] h3,[data-expert-display-root] li{font-family:var(--expert-font-family)!important}',
      '[data-expert-display-root] .row-label,[data-expert-display-root] button,[data-expert-display-root] input,[data-expert-display-root] textarea,[data-expert-display-root] select,[data-expert-display-root] label{font-size:var(--expert-display-font-size)!important}',
      '[data-expert-display-root] .row-sub,[data-expert-display-root] .help,[data-expert-display-root] .small-muted,[data-expert-display-root] .setting-note{font-size:calc(var(--expert-display-font-size)*.84)!important}',
      '[data-expert-display-root] .section-label{font-size:calc(var(--expert-display-font-size)*.76)!important}',
      '[data-expert-display-root] .chat-thread .chat-bubble{font-size:var(--expert-chat-font-size)!important}',
      '[data-expert-display-root] .chat-thread .chat-bubble p,[data-expert-display-root] .chat-thread .chat-bubble li,[data-expert-display-root] .chat-thread .chat-bubble blockquote{font-size:inherit!important}',
      '.expert-font-display-option{width:100%;text-align:left}',
      '.expert-font-display-option.is-selected{border-color:var(--expert-accent,#5b83ff)!important;background:#30343c!important}'
    ].join('');

    let googleFonts = document.getElementById('expert-google-fonts');
    if (!googleFonts) {
      googleFonts = document.createElement('link');
      googleFonts.id = 'expert-google-fonts';
      googleFonts.rel = 'stylesheet';
      googleFonts.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Roboto:wght@400;500;700&family=Open+Sans:wght@400;500;600;700&family=Lato:wght@400;700&family=Montserrat:wght@400;500;600;700&family=Poppins:wght@400;500;600;700&family=Nunito:wght@400;600;700&family=Source+Sans+3:wght@400;600;700&family=Ubuntu:wght@400;500;700&family=Merriweather:wght@400;700&family=Playfair+Display:wght@400;700&display=swap';
      document.head.appendChild(googleFonts);
    }
  }

  function request(action, payload = {}) {
    return new Promise((resolve, reject) => {
      const requestId = APP + '-' + Date.now() + '-' + (++sequence);
      const timeout = window.setTimeout(() => {
        pending.delete(requestId);
        reject(new Error('The live service did not respond. Please try again.'));
      }, 120000);
      pending.set(requestId, { resolve, reject, timeout });
      window.parent.postMessage({ app: APP, type: 'request', requestId, action, payload }, window.location.origin);
    });
  }

  function serverPreferences() {
    const keys = [
      'nickname', 'occupation', 'aboutYou', 'customInstructions',
      'personalityInstructions', 'styleTone', 'personalisation', 'useMemory',
      'referenceMemory', 'memoryItems', 'computedAge', 'demoAgeVerified', 'trustedContactAdded', 'browserNotificationPermission', 'reasoningMode', 'saveHistory', 'temporaryChat', 'accent', 'language', 'fastAnswers',
      'suggestions', 'webSearch', 'librarySearch', 'voiceModel', 'voice',
      'warmth', 'enthusiasm', 'headersLists', 'emoji', 'installedPlugins',
      'pluginPermissionSettings', 'permissionMode',
      'voiceLanguage', 'visualAnswers', 'push', 'emailUpdates',
      'chatNotifications', 'readReceipts', 'sounds', 'haptics',
      'contactEmail', 'contactPhone', 'phoneCountry', 'birthDate', 'ageAttestedAt',
      'profilePicturePath', 'accent', 'browserBookmarks', 'browserUrl', 'browserHistory',
      'adTopics', 'defaultAssistantPrompt', 'preferredModel', 'speechLanguage',
      'aiResponseMode', 'messageFeedback', 'fontSize', 'fontFamily',
      'pluginManagementSkillEnabled', 'pluginPermissionMode', 'familyInviteCode', 'familyLinked', 'familyLinkNotice',
      'videoPluginAdded', 'connectorInstallState', 'connectorSkillEnabled', 'pluginPermissionSettings',
      'pluginPermissionModes', 'installedCatalogueRecordIds', 'activePermissionApp', 'activeVideoPlugin',
      'activePluginRecordId', 'activeConnectorSkill', 'videoPluginCollapsed', 'archivedChats',
      'archivedChatIds', 'savedHomeChats', 'savedHomeChatIds', 'projectAssignments',
      'chatPinned', 'chatLocked', 'chatOrganization', 'studyMode', 'composerToolMode',
      'scheduledBriefing', 'outfitSuggestions', 'fridayRecommendations', 'greetingExchange',
      'notificationCategories', 'notificationSettings', 'activeNotificationCategory',
      'defaultAssistant', 'theme', 'imagesTab', 'selectedImagePrompt', 'automaticRecharge',
      'useLocation', 'referencePhotoNames', 'pluginStates', 'activePlugin', 'activeDependencyApp',
      'chatFindQuery', 'recentChatTitle', 'voiceTipDismissed', 'v8FilesTab', 'v8FilesQuery',
      'chatFileMeta', 'recentLocalFiles', 'pluginInstallPending', 'pluginInstallUrl'
    ];
    return Object.fromEntries(keys.filter(key => prefs[key] !== undefined).map(key => [key, prefs[key]]));
  }

  function persist() {
    if (!activeUser) return;
    localStorage.setItem('nexaAIPrefs:' + activeUser.userId, JSON.stringify(prefs));
    window.clearTimeout(preferenceTimer);
    preferenceTimer = window.setTimeout(() => {
      request('preferences.save', { preferences: serverPreferences() }).catch(error => {
        notify(error.message || 'Your preferences could not be synced.');
      });
    }, 650);
  }

  const originalSave = save;
  save = function() {
    originalSave();
    persist();
  };

  function mapMessages(messages) {
    return (messages || []).map(item => ({
      role: item.role === 'assistant' ? 'assistant' : 'user',
      text: item.content || item.text || '',
      created_at: item.created_at
    }));
  }

  function updateChat(chat, temporary) {
    const mapped = mapMessages(chat && chat.messages ? chat.messages : []);
    if (temporary) {
      prefs.temporaryMessages = mapped;
    } else {
      const previousToken = prefs.activeConversationToken;
      prefs.chatHistory = mapped;
      prefs.activeChatId = chat && chat.id ? chat.id : null;
      if (chat && chat.id) {
        const organization = Object.assign({}, prefs.chatOrganization || {});
        if (previousToken && organization[previousToken] && !organization[chat.id]) {
          organization[chat.id] = organization[previousToken];
          delete organization[previousToken];
          prefs.chatOrganization = organization;
        }
        prefs.activeConversationToken = 'chat:' + chat.id;
        const state = (prefs.chatOrganization || {})[chat.id] || {};
        prefs.chatPinned = !!state.pinned;
        prefs.chatLocked = !!state.locked;
      }
      prefs.recentChatTitle = chat && chat.title ? chat.title : 'New conversation';
    }
    persist();
    render();
  }

  function applyHostInit(data) {
    activeUser = data.user || null;
    if (!activeUser) return;
    const key = 'nexaAIPrefs:' + activeUser.userId;
    let local = {};
    try { local = JSON.parse(localStorage.getItem(key) || '{}'); } catch { local = {}; }
    prefs = { ...defaults, ...local, ...(data.preferences || {}) };
    if (!Object.prototype.hasOwnProperty.call(DISPLAY_SIZES, prefs.fontSize)) prefs.fontSize = 'medium';
    if (!DISPLAY_FONTS.some(item => item.value === prefs.fontFamily)) prefs.fontFamily = 'system';
    applyFontAndDisplay();
    if (!Array.isArray(local.memoryItems) && !Array.isArray((data.preferences || {}).memoryItems)) {
      prefs.memoryItems = [];
    }
    prefs.userName = activeUser.name || activeUser.email || 'Expert AI user';
    prefs.userEmail = activeUser.email || '';
    prefs.liveProjects = data.projects || [];
    prefs.projects = prefs.liveProjects.map(item => item.name);
    prefs.liveChats = data.chats || [];
    prefs.liveFiles = data.files || [];
    prefs.liveIntegrations = data.integrations || [];
    prefs.recentLocalFiles = prefs.liveFiles.map(item => ({
      id: item.id, name: item.name, size: item.size,
      type: item.content_type, url: item.url, origin: 'Your Expert AI library'
    }));
    const latest = prefs.liveChats[0];
    const explicitlySelected = Object.prototype.hasOwnProperty.call(local, 'activeChatId');
    const savedSelection = explicitlySelected && local.activeChatId
      ? prefs.liveChats.find(item => item.id === local.activeChatId)
      : null;
    const intentionalNewChat = explicitlySelected && local.activeChatId === null && !!local.activeConversationToken;
    if (savedSelection) {
      prefs.chatHistory = mapMessages(savedSelection.messages || []);
      prefs.activeChatId = savedSelection.id;
      prefs.activeConversationToken = local.activeConversationToken || 'chat:' + savedSelection.id;
      prefs.recentChatTitle = savedSelection.title || 'New conversation';
    } else if (intentionalNewChat) {
      prefs.chatHistory = Array.isArray(local.chatHistory) ? local.chatHistory : [];
      prefs.activeChatId = null;
      prefs.activeConversationToken = local.activeConversationToken;
      prefs.recentChatTitle = 'New conversation';
    } else if (latest) {
      prefs.chatHistory = mapMessages(latest.messages || []);
      prefs.activeChatId = latest.id;
      prefs.activeConversationToken = 'chat:' + latest.id;
      prefs.recentChatTitle = latest.title || 'New conversation';
    } else {
      prefs.chatHistory = [];
      prefs.activeChatId = null;
      prefs.activeConversationToken = 'new-' + Date.now() + '-' + Math.random().toString(36).slice(2);
      prefs.recentChatTitle = 'New conversation';
    }
    localStorage.setItem(key, JSON.stringify(prefs));
    render();
    if (data.notice) notify(data.notice);
  }

  window.addEventListener('message', event => {
    if (event.source !== window.parent || event.origin !== window.location.origin) return;
    const message = event.data;
    if (!message || message.app !== APP) return;
    if (message.type === 'host-init') { applyHostInit(message); return; }
    if (message.type === 'push-message') {
      const payload = message.payload || {};
      notify((payload.title ? payload.title + ': ' : '') + (payload.body || 'You have a new notification.'));
      return;
    }
    if (message.type === 'response' && message.requestId) {
      const item = pending.get(message.requestId);
      if (!item) return;
      pending.delete(message.requestId);
      window.clearTimeout(item.timeout);
      if (message.ok) item.resolve(message.data);
      else item.reject(new Error(message.error || 'The live service request failed.'));
    }
  });

  async function sendMessage(action) {
    if (window.EXPERT_AI_LIVE && typeof window.EXPERT_AI_LIVE.sendMessage === 'function') {
      return window.EXPERT_AI_LIVE.sendMessage(action);
    }
    const selector = action === 'sendHome' ? '#homePrompt' : '#chatInput';
    const field = document.querySelector(selector);
    const value = (field && field.value ? field.value : '').trim();
    if (!value) { notify('Type a message first.'); return; }
    const temporary = !!prefs.temporaryChat;
    const attachmentIds = (prefs.pendingLiveAttachmentIds || []).slice(0, 5);
    notify('Sending your message…');
    try {
      const result = await request('chat.send', {
        message: value,
        chatId: temporary ? null : (prefs.activeChatId || null),
        thinkingMode: prefs.aiResponseMode === 'ADVANCED' || prefs.reasoningMode === 'high' || prefs.composerToolMode === 'Thinking' ? 'DEEP' : 'FAST',
        responseMode: ['LIVE', 'ADVANCED', 'STANDARD'].includes(prefs.aiResponseMode) ? prefs.aiResponseMode : 'STANDARD',
        taskMode: prefs.studyMode === true ? 'STUDY' : 'NORMAL',
        attachmentIds,
        temporary
      });
      prefs.pendingLiveAttachmentIds = [];
      prefs.pendingChatFiles = [];
      if (field) field.value = '';
      updateChat(result.chat, temporary);
      if (!temporary) {
        prefs.liveChats = result.chat ? [result.chat, ...(prefs.liveChats || []).filter(item => item.id !== result.chat.id)] : prefs.liveChats;
      }
      if (currentPage !== 'chat') nav('chat');
      notify('Expert AI replied.');
    } catch (error) { notify(friendlyError(error)); }
  }

  async function generateImage() {
    const field = document.querySelector('#imagePrompt');
    const prompt = (field && field.value ? field.value : prefs.selectedImagePrompt || '').trim();
    if (!prompt) { notify('Describe the image you want to create.'); return; }
    notify('Creating your image…');
    if (window.EXPERT_AI_LIVE?.setActivity) window.EXPERT_AI_LIVE.setActivity('Creating your image…');
    try {
      const result = await request('image.generate', { prompt });
      prefs.generatedImages = [{ ...result, prompt, created_at: Date.now() }, ...(prefs.generatedImages || [])].slice(0, 20);
      if (field) field.value = '';
      persist();
      render();
      if (window.EXPERT_AI_LIVE?.clearActivity) window.EXPERT_AI_LIVE.clearActivity();
      notify('Image created and saved to your library.');
    } catch (error) {
      if (window.EXPERT_AI_LIVE?.clearActivity) window.EXPERT_AI_LIVE.clearActivity();
      notify(friendlyError(error));
    }
  }

  async function createProject() {
    const name = (document.querySelector('#projectName')?.value || '').trim();
    const description = (document.querySelector('#projectInstructions')?.value || '').trim();
    if (!name) { notify('Enter a project name first.'); return; }
    try {
      const project = await request('projects.create', { name, description });
      prefs.liveProjects = [project, ...(prefs.liveProjects || [])];
      prefs.projects = prefs.liveProjects.map(item => item.name);
      persist();
      nav('projects');
      notify('Project saved to your account.');
    } catch (error) { notify(friendlyError(error)); }
  }

  async function runResearch() {
    const field = document.querySelector('#nexaResearchUrl');
    const url = (field && field.value ? field.value : '').trim();
    if (!url) { notify('Enter a public webpage URL.'); return; }
    notify('Reading the webpage and preparing a summary…');
    if (window.EXPERT_AI_LIVE?.setActivity) window.EXPERT_AI_LIVE.setActivity('Researching webpage…');
    try {
      prefs.latestResearch = await request('research.url', { url });
      persist();
      render();
      if (window.EXPERT_AI_LIVE?.clearActivity) window.EXPERT_AI_LIVE.clearActivity();
      notify('Research summary is ready.');
    } catch (error) {
      if (window.EXPERT_AI_LIVE?.clearActivity) window.EXPERT_AI_LIVE.clearActivity();
      notify(friendlyError(error));
    }
  }

  function providerFor(name) {
    const value = String(name || '').toLowerCase();
    if (value === 'google' || value.includes('gmail') || value.includes('google drive') || value === 'google workspace') return 'google';
    if (value === 'github' || value.includes('github')) return 'github';
    if (value === 'slack' || value.includes('slack')) return 'slack';
    return '';
  }

  function askToConnect(name) {
    const provider = providerFor(name);
    if (!provider) { notify('This provider needs its own live connector and credentials.'); return; }
    openModal(
      'Connect ' + name,
      'Continue to the provider sign-in page to authorize this account. The service is marked Connected only after the provider callback succeeds.',
      [{ label: 'Continue to provider', value: 'nexaConnect:' + provider }, { label: 'Cancel', value: 'nexaCancelConnect' }]
    );
  }

  async function beginConnection(provider) {
    try { await request('integrations.connect', { provider }); }
    catch (error) { notify(friendlyError(error)); }
  }

  async function uploadFiles(input) {
    const files = [...(input.files || [])].slice(0, 20);
    if (!files.length) return;
    const attachToChat = input.id !== 'referencePhotoInput';
    let uploaded = 0;
    if (window.EXPERT_AI_LIVE?.setActivity) window.EXPERT_AI_LIVE.setActivity('Uploading ' + files.length + ' file(s)…');
    for (const file of files) {
      if (file.size > 4 * 1024 * 1024) { notify(file.name + ' is over the 4 MB upload limit.'); continue; }
      try {
        const bytes = new Uint8Array(await file.arrayBuffer());
        let binary = '';
        for (let offset = 0; offset < bytes.length; offset += 0x8000) {
          binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
        }
        const result = await request('files.upload', {
          name: file.name,
          contentType: file.type || 'application/octet-stream',
          size: file.size,
          contentBase64: btoa(binary),
          temporary: prefs.temporaryChat === true
        });
        const item = {
          id: result.id, name: result.name, size: file.size, type: file.type,
          url: result.url, origin: 'Uploaded to Expert AI'
        };
        prefs.recentLocalFiles = [item, ...(prefs.recentLocalFiles || [])].slice(0, 100);
        prefs.liveFiles = [result, ...(prefs.liveFiles || [])];
        if (attachToChat) {
          prefs.pendingLiveAttachmentIds = [...new Set([...(prefs.pendingLiveAttachmentIds || []), result.id])].slice(0, 5);
          prefs.pendingChatFiles = [...(prefs.pendingChatFiles || []), { name: file.name, size: file.size, type: file.type }];
        } else {
          prefs.referencePhotoNames = [...new Set([...(prefs.referencePhotoNames || []), file.name])];
        }
        uploaded += 1;
      } catch (error) { notify(file.name + ': ' + friendlyError(error)); }
    }
    input.value = '';
    if (window.EXPERT_AI_LIVE?.clearActivity) window.EXPERT_AI_LIVE.clearActivity();
    persist();
    if (uploaded) {
      render();
      notify(uploaded + ' file(s) uploaded to your secure library' + (attachToChat ? ' and attached to the chat.' : '.'));
      if (attachToChat && currentPage !== 'chat') nav('chat');
    }
  }

  async function openSavedChat(chatId) {
    try {
      const result = await request('chats.open', { id: chatId });
      updateChat(result.chat, false);
      nav('chat');
    } catch (error) { notify(friendlyError(error)); }
  }

  function speak(text) {
    if (!text) return;
    request('voice.synthesize', { text }).then(result => {
      const audio = new Audio('data:' + result.contentType + ';base64,' + result.audioBase64);
      return audio.play();
    }).catch(() => {
      if ('speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined') {
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
        notify('Reading aloud with your device voice.');
      } else {
        notify('Voice synthesis is not configured and device speech is unavailable.');
      }
    });
  }

  function dictate() {
    const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!Speech) { notify('Speech input is not supported by this browser.'); return; }
    const recognition = new Speech();
    recognition.lang = prefs.voiceLanguage === 'Auto-detect' ? 'en-NG' : prefs.voiceLanguage;
    recognition.interimResults = false;
    recognition.onresult = event => {
      const text = event.results?.[0]?.[0]?.transcript || '';
      const field = document.querySelector('#chatInput, #homePrompt, #imagePrompt');
      if (field) { field.value = text; field.focus(); }
      notify('Voice input captured. Review it and press send.');
    };
    recognition.onerror = () => notify('Speech input ended. You can type instead.');
    recognition.start();
  }

  const originalHandleAction = handleAction;
  handleAction = function(action, element) {
    if (action === 'setExpertDisplaySetting') {
      const kind = element?.dataset?.displayKind || '';
      const selected = element?.dataset?.displayValue || '';
      if (kind === 'size' && Object.prototype.hasOwnProperty.call(DISPLAY_SIZES, selected)) {
        prefs.fontSize = selected;
      } else if (kind === 'font' && DISPLAY_FONTS.some(item => item.value === selected)) {
        prefs.fontFamily = selected;
      } else {
        return;
      }
      applyFontAndDisplay();
      persist();
      render();
      notify('Font & display updated.');
      return;
    }
    if (action === 'sendChat' || action === 'sendHome') { sendMessage(action); return; }
    if (action === 'sendImagePrompt') { generateImage(); return; }
    if (action === 'saveProject') { createProject(); return; }
    if (action === 'runNexaResearch') { runResearch(); return; }
    if (action === 'logout') { request('identity.signout').catch(error => notify(friendlyError(error))); return; }
    if (action === 'shareExpertApp') {
      const url = window.location.origin + '/';
      const shareData = { title: 'Expert AI', text: 'Open Expert AI — your personal AI workspace.', url };
      if (navigator.share) {
        navigator.share(shareData).catch(error => {
          if (error && error.name !== 'AbortError') notify('Sharing is not available right now.');
        });
      } else if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(() => notify('Expert AI link copied. Send it to someone to share the app.'))
          .catch(() => notify('Copy the app link from your browser address bar to share Expert AI.'));
      } else {
        notify('Copy the app link from your browser address bar to share Expert AI.');
      }
      return;
    }
    if (action === 'nexaNewChat') {
      prefs.activeChatId = null;
      prefs.activeConversationToken = 'new-' + Date.now() + '-' + Math.random().toString(36).slice(2);
      prefs.chatHistory = [];
      prefs.temporaryMessages = [];
      prefs.branchContextMessages = [];
      prefs.pendingLiveAttachmentIds = [];
      prefs.pendingChatFiles = [];
      prefs.temporaryChat = false;
      prefs.expertShowJumpToLatest = false;
      persist();
      nav('chat');
      return;
    }
    if (action === 'nexaOpenChat') { openSavedChat(element?.dataset?.chatId || ''); return; }
    if (action === 'v8AttachRecentFile') {
      const item = (prefs.recentLocalFiles || []).find(file => file.name === (element?.dataset?.name || ''));
      if (!item?.id) { notify('Upload this file to your library before attaching it.'); return; }
      prefs.pendingLiveAttachmentIds = [...new Set([...(prefs.pendingLiveAttachmentIds || []), item.id])].slice(0, 5);
      prefs.pendingChatFiles = [...(prefs.pendingChatFiles || []), { name: item.name, size: item.size, type: item.type }];
      persist();
      nav('chat');
      notify(item.name + ' attached to this conversation.');
      return;
    }
    if (action === 'nexaConnect') { askToConnect(element?.dataset?.providerName || element?.dataset?.plugin || ''); return; }
    if (action === 'v8InstallConnector') { askToConnect(element?.dataset?.plugin || prefs.activeVideoPlugin || ''); return; }
    if (action === 'connectGmail' || action === 'connectDrive') { askToConnect('Google Workspace'); return; }
    if (action === 'connectGithub') { askToConnect('GitHub'); return; }
    if (action === 'voiceInput' || action === 'dictate') { dictate(); return; }
    if (action === 'chatMessageAction' && element?.dataset?.messageAction === 'read') {
      const list = prefs.temporaryChat ? (prefs.temporaryMessages || []) : (prefs.chatHistory || []);
      speak(list[Number(element.dataset.messageIndex)]?.text || '');
      return;
    }
    if (action === 'v8Search' || action === 'v8DeepResearch') { nav('liveResearch'); return; }
    if (action === 'pluginInstall') {
      const name = element?.dataset?.plugin || '';
      if (providerFor(name)) { askToConnect(name); return; }
      notify('This catalogue listing is informational until its provider has a live connector.');
      return;
    }
    originalHandleAction(action, element);
  };

  const originalClickChoice = clickChoice;
  clickChoice = function(value) {
    if (String(value).startsWith('nexaConnect:')) {
      modalLayer.hidden = true;
      beginConnection(String(value).split(':')[1]);
      return;
    }
    if (value === 'nexaCancelConnect') { modalLayer.hidden = true; return; }
    if (value === 'webSearch' || value === 'v8Search') {
      modalLayer.hidden = true;
      nav('liveResearch');
      return;
    }
    originalClickChoice(value);
  };


  const previousCustomizeAction = handleAction;
  handleAction = function(action, element) {
    if (action === 'nexaAddMemory') {
      const field = document.getElementById('nexaMemoryInput');
      const value = (field && field.value ? field.value : '').trim();
      if (!value) {
        notify('Write a memory before saving it.');
        return;
      }
      if (value.length > 500) {
        notify('A saved memory can contain up to 500 characters.');
        return;
      }
      const items = Array.isArray(prefs.memoryItems) ? prefs.memoryItems : [];
      prefs.memoryItems = [...new Set([...items, value])].slice(0, 50);
      save();
      render();
      notify('Memory saved to your Expert AI account.');
      return;
    }
    if (action === 'clearMemories') {
      openModal(
        'Clear saved memories?',
        'This removes the saved memory notes from your Expert AI account. This cannot be undone.',
        [
          { label: 'Clear saved memories', value: 'nexaConfirmClearMemories' },
          { label: 'Cancel', value: 'nexaCancelClearMemories' }
        ]
      );
      return;
    }
    previousCustomizeAction(action, element);
  };

  const previousCustomizeChoice = clickChoice;
  clickChoice = function(value) {
    if (value === 'nexaConfirmClearMemories') {
      modalLayer.hidden = true;
      prefs.memoryItems = [];
      save();
      render();
      notify('Saved memories cleared from your account.');
      return;
    }
    if (value === 'nexaCancelClearMemories') {
      modalLayer.hidden = true;
      return;
    }
    previousCustomizeChoice(value);
  };

  const originalRender = render;
  render = function() {
    originalRender();
    const walker = document.createTreeWalker(screen, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      node.nodeValue = (node.nodeValue || '')
        .replace(/ChatGPT/g, 'Expert AI')
        .replace('This is an offline interface preview. Try the settings and controls.', 'Your live AI workspace is ready. Ask a question, create an image or open your tools.')
        .replace('This is a local interface preview. Connect an AI service to receive live responses.', 'Expert AI is responding through your live secure account.');
    }
    screen.querySelectorAll('[placeholder], [aria-label], [title]').forEach(element => {
      ['placeholder', 'aria-label', 'title'].forEach(attribute => {
        const value = element.getAttribute(attribute);
        if (value) element.setAttribute(attribute, value.replace(/ChatGPT/g, 'Expert AI'));
      });
    });
  };

  pages.liveResearch = function() {
    const result = prefs.latestResearch;
    return '<div class="section-label">LIVE WEBPAGE RESEARCH</div>' +
      '<div class="group" style="padding:15px"><div class="row-label">Research a webpage</div>' +
      '<p class="small-muted">Enter a public webpage URL. Expert AI retrieves readable page content and prepares a source-grounded summary.</p>' +
      '<input class="field" id="nexaResearchUrl" type="url" placeholder="https://example.com/article" value="' + esc(result?.url || '') + '">' +
      '<button class="primary" data-action="runNexaResearch">Research webpage</button></div>' +
      (result ? '<section class="video-plugin-detail"><h2>' + esc(result.title) + '</h2><p><a href="' + esc(result.url) + '" target="_blank" rel="noopener noreferrer">Open source webpage ↗</a></p><div class="setting-note" style="white-space:pre-wrap">' + esc(result.summary) + '</div></section>' : '');
  };
  pageTitles.liveResearch = 'Webpage research';

  pageTitles.settings = 'Settings';
  pageTitles.customize = 'Customize Expert AI';
  pageTitles.personality = 'Personality';
  pageTitles.memory = 'Memory';
  pageTitles.fontDisplay = 'Font & display';
  pageTitles.plugins = 'Plugins';

  pages.settings = function() {
    return `
      ${group(
        row('Account', 'account', '◉', prefs.userName || 'Signed in', prefs.userName || 'Signed in') +
        row('Workspace', 'workspace', '', 'Personal', 'Personal') +
        '<button type="button" class="row" data-action="shareExpertApp"><span class="row-main"><span class="row-label">Share Expert AI</span><span class="row-sub">Send the app link to someone</span></span><span class="row-value">Share</span></button>' +
        row('Age confirmation', 'verifyAge', '✓', 'Self-declared date of birth', prefs.ageAttestedAt ? 'Confirmed' : 'Not confirmed') +
        row('Upgrade plan', 'subscription', '✧', 'More access and features') +
        row('Usage and limits', 'usage', '▧', '') +
        row('Trusted contact', 'trustedContact', '♙', prefs.trustedContactAdded ? 'Added' : 'Not set up') +
        row('Parental controls', 'parental', '♡', 'Family settings') +
        '<div class="row expert-static-email" aria-label="Sign-in email"><span class="row-main"><span class="row-label">Sign-in email</span><span class="row-sub">' + esc(prefs.userEmail || 'Email unavailable') + '</span></span><span class="row-value">Account</span></div>'
      , true)}
      ${group(actionRow('Accent color', 'accent', '◉', '', prefs.accent || 'Blue'), true)}
      ${group(row('Font & display', 'fontDisplay', 'Aa', 'Font family and text size', (DISPLAY_FONTS.find(item => item.value === prefs.fontFamily)?.label || 'System default') + ' · ' + (DISPLAY_SIZES[prefs.fontSize]?.label || 'Standard')), true)}
      ${group(row('Customize Expert AI', 'customize', '♧', 'Personality, memory, plugins and more'), true)}
      ${group(
        row('General', 'general', '⚙') +
        row('Notifications', 'notifications', '♧') +
        row('Voice', 'voice', '〽') +
        row('Model', 'expertLanguage', '◉', 'AI response mode', prefs.aiResponseMode === 'LIVE' ? 'Live' : prefs.aiResponseMode === 'ADVANCED' ? 'Advanced' : 'Standard') +
        row('Safety', 'safety', '⬡') +
        row('Security and login', 'security', '♙') +
        row('Codex', 'codex', '⌘') +
        row('Storage', 'storage', '▤') +
        row('Privacy center', 'privacy', '▣') +
        row('History and data', 'historyData', '▤') +
        row('Ads controls', 'adsControls', '◉') +
        row('Plugins', 'plugins', '✣')
      )}
      <div class="search-dock"><span>⌕</span><input id="settingsSearch" placeholder="Search settings" aria-label="Search settings"></div>`;
  };

  pages.customize = function() {
    return (
      '<div class="section-label">CUSTOMIZE NEXA AI</div>' +
      '<p class="help">Personality, memory, plugins and more. Choose how Expert AI responds and which connected tools it can use.</p>' +
      group(
        row('Personality', 'personality', '◉', prefs.styleTone || 'Default response style') +
        row('Memory', 'memory', '▤', (prefs.memoryItems || []).length + ' saved memories') +
        row('Plugins', 'plugins', '✣', (prefs.installedPlugins || []).length + ' locally selected · provider status below')
      ) +
      group(
        row('Personalization', 'personalization', '☷', 'Nickname, occupation and custom instructions') +
        row('General', 'general', '⚙', 'Language, appearance and response preferences') +
        row('Connected services', 'liveConnections', '⌘', 'Google, GitHub, Slack and voice setup')
      ) +
      '<p class="help">Changes to personality, memory and preferences are saved to your signed-in account.</p>'
    );
  };

  pages.fontDisplay = function() {
    const sizeOptions = Object.entries(DISPLAY_SIZES).map(([value, option]) =>
      '<button type="button" class="row expert-font-display-option' +
        (prefs.fontSize === value ? ' is-selected' : '') +
        '" data-action="setExpertDisplaySetting" data-display-kind="size" data-display-value="' + value +
        '" aria-pressed="' + (prefs.fontSize === value ? 'true' : 'false') + '">' +
        '<span class="row-main"><span class="row-label">' + option.label +
        '</span><span class="row-sub">Set display and chat text to ' + option.pixels + ' px</span></span>' +
        '<span class="row-value">' + (prefs.fontSize === value ? 'Selected' : '') + '</span></button>'
    ).join('');

    const fontOptions = DISPLAY_FONTS.map(font =>
      '<button type="button" class="row expert-font-display-option' +
        (prefs.fontFamily === font.value ? ' is-selected' : '') +
        '" data-action="setExpertDisplaySetting" data-display-kind="font" data-display-value="' + font.value +
        '" aria-pressed="' + (prefs.fontFamily === font.value ? 'true' : 'false') + '">' +
        '<span class="row-main"><span class="row-label" style="font-family:' + font.family + '">' + font.label +
        '</span><span class="row-sub">Aa Bb Cc 123</span></span>' +
        '<span class="row-value">' + (prefs.fontFamily === font.value ? 'Selected' : '') + '</span></button>'
    ).join('');

    return (
      '<div class="section-label">DISPLAY SIZE</div>' +
      '<p class="help">Choose the text size used throughout Settings, AI replies and your messages.</p>' +
      group(sizeOptions) +
      '<div class="section-label">FONT FAMILY</div>' +
      '<p class="help">Choose a font for the app interface, settings and both sides of your chats.</p>' +
      group(fontOptions)
    );
  };

  pages.memory = function() {
    const memories = Array.isArray(prefs.memoryItems) ? prefs.memoryItems : [];
    const rows = memories.map((item, index) =>
      '<div class="row">' +
        '<span class="row-main"><span class="row-label">' + esc(item) + '</span>' +
        '<span class="row-sub">Saved to your Expert AI account</span></span>' +
        '<button class="mini-action" data-action="removeMemory" data-index="' + index + '">Remove</button>' +
      '</div>'
    ).join('');

    return (
      '<div class="section-label">MEMORY CONTROLS</div>' +
      group(
        toggle('useMemory', 'Reference saved memories', 'Use the memory notes below to personalize future answers.') +
        toggle('referenceMemory', 'Reference chat history', 'Use previous conversations as context when responding.')
      ) +
      '<div class="section-label">SAVED MEMORIES</div>' +
      group(
        rows || '<div class="empty-note">You have no saved memories yet.</div>'
      ) +
      '<div class="group" style="padding:14px">' +
        '<label class="small-muted" for="nexaMemoryInput">Add a memory</label>' +
        '<textarea class="field" id="nexaMemoryInput" maxlength="500" placeholder="For example: I prefer step-by-step explanations."></textarea>' +
        '<button class="primary" data-action="nexaAddMemory">Save memory</button>' +
      '</div>' +
      '<button class="outline" data-action="clearMemories">Clear all memories</button>' +
      '<p class="help">Saved memories belong to your signed-in account. You can remove individual notes or clear them at any time. Turn off Reference saved memories to stop using them in new answers.</p>'
    );
  };

  const originalPluginsWithLiveStatus = pages.plugins;
  pages.plugins = function() {
    const integrations = prefs.liveIntegrations || [];
    const connectionRows = integrations.map(item => {
      const state = item.connected
        ? 'Connected'
        : item.credentials_ready
          ? 'Ready to connect'
          : 'Setup required';
      const action = item.provider === 'elevenlabs'
        ? '<span class="row-value">' + state + '</span>'
        : '<button class="mini-action" data-action="nexaConnect" data-provider-name="' +
          esc(item.provider) + '">' + (item.connected ? 'Reconnect' : 'Connect') + '</button>';
      return (
        '<div class="row"><span class="row-main"><span class="row-label">' +
        esc(item.name) + '</span><span class="row-sub">' + esc(item.note || '') +
        '</span></span><span class="row-value">' + state + '</span>' + action + '</div>'
      );
    }).join('');

    return (
      '<div class="section-label">LIVE PROVIDER CONNECTIONS</div>' +
      group(connectionRows || '<div class="empty-note">Provider status is not available yet.</div>') +
      '<p class="help">Adding a catalogue item does not connect an external account. Google, GitHub and Slack require provider credentials and approval; ElevenLabs requires its API key.</p>' +
      (typeof originalPluginsWithLiveStatus === 'function' ? originalPluginsWithLiveStatus() : '')
    );
  };

  const originalHomeWithCustomize = pages.home;
  pages.home = function() {
    const home = typeof originalHomeWithCustomize === 'function'
      ? originalHomeWithCustomize()
      : '';
    return home +
      '<div class="group" style="margin-top:14px">' +
        row('Customize Expert AI', 'customize', '♧', 'Personality, memory, plugins and more') +
      '</div>';
  };


  pages.liveConnections = function() {
    const items = prefs.liveIntegrations || [];
    return '<div class="section-label">CONNECTED SERVICES</div>' +
      '<p class="small-muted">A service is marked connected only after its provider callback succeeds. Missing provider credentials must be added in the app configuration.</p>' +
      items.map(item => '<div class="row"><span class="row-main"><span class="row-label">' + esc(item.name) +
        '</span><span class="row-sub">' + esc(item.note || '') + '</span></span><span class="row-value">' +
        (item.connected ? 'Connected' : item.credentials_ready ? 'Ready to connect' : 'Setup required') +
        '</span>' + (item.provider !== 'elevenlabs' ? '<button class="mini-action" data-action="nexaConnect" data-provider-name="' +
        esc(item.provider) + '">' + (item.connected ? 'Reconnect' : 'Connect') + '</button>' : '') + '</div>').join('') +
      '<p class="small-muted">Google Workspace provides Gmail and Drive access after OAuth approval. GitHub and Slack require separate credentials.</p>';
  };
  pageTitles.liveConnections = 'Connected services';

  pages.allChats = function() {
    const items = prefs.liveChats || [];
    return '<div class="section-label">YOUR SAVED CHATS</div><button class="primary" data-action="nexaNewChat">＋ New chat</button>' +
      items.map(item => '<button class="row" data-action="nexaOpenChat" data-chat-id="' + esc(item.id) +
        '"><span class="row-main"><span class="row-label">' + esc(item.title || 'Conversation') +
        '</span><span class="row-sub">' + new Date(item.updated_at || Date.now()).toLocaleString() +
        '</span></span><span class="chevron">›</span></button>').join('') +
      (items.length ? '' : '<div class="empty-note">No saved conversations yet.</div>');
  };
  pageTitles.allChats = 'Chat history';

  pages.projects = function() {
    const items = prefs.liveProjects || [];
    return '<div class="section-label">YOUR LIVE PROJECTS</div><button class="primary" data-page="projectCreate">＋ New project</button>' +
      items.map(item => '<div class="row"><span class="row-main"><span class="row-label">' + esc(item.name) +
        '</span><span class="row-sub">' + esc(item.description || 'Personal workspace') +
        '</span></span><span class="row-value">' + new Date(item.updated_at || Date.now()).toLocaleDateString() +
        '</span></div>').join('') +
      (items.length ? '' : '<div class="empty-note">Your saved projects will appear here.</div>');
  };

  const originalLibrary = pages.library;
  pages.library = function() {
    const items = prefs.liveFiles || [];
    return originalLibrary() + '<div class="section-label">FILES SAVED TO YOUR ACCOUNT</div>' +
      items.map(item => '<a class="row" href="' + esc(item.url || '#') +
        '" target="_blank" rel="noopener noreferrer"><span class="row-main"><span class="row-label">' + esc(item.name) +
        '</span><span class="row-sub">' + esc(item.content_type || 'File') + ' · ' +
        Number(item.size || 0).toLocaleString() + ' bytes</span></span><span class="chevron">↗</span></a>').join('') +
      (items.length ? '' : '<div class="empty-note">Your uploaded files will appear here.</div>') +
      '<button class="outline" data-page="filesPicker">Browse recent files</button>';
  };

  const originalImages = pages.images || imagesPage;
  pages.images = function() {
    const images = prefs.generatedImages || [];
    return originalImages() + (images.length ?
      '<div class="section-label">IMAGES CREATED WITH NEXA AI</div><div class="image-gallery">' +
      images.map(item => '<a class="image-card" href="' + esc(item.url) +
        '" target="_blank" rel="noopener noreferrer"><img src="' + esc(item.url) +
        '" alt="' + esc(item.prompt || 'Generated image') + '"></a>').join('') + '</div>' : '');
  };

  const originalDrawer = drawer;
  drawer = function() {
    let html = originalDrawer();
    html = html.replace('<button class="drawer-item" data-page="library">',
      '<button class="drawer-item" data-page="allChats">▤　Chat history</button>' +
      '<button class="drawer-item" data-page="liveConnections">⌘　Connected services</button>' +
      '<button class="drawer-item" data-page="library">');
    html = html.replace('data-page="chat">See all chats…', 'data-page="allChats">See all chats…');
    html = html.replace('data-page="customize">☷　Customize</button>', 'data-page="customize">☷　Customize Expert AI</button>');
    return html;
  };

  document.addEventListener('change', event => {
    const input = event.target;
    if (!input || !['nexaAttachmentInput', 'nexaCameraInput', 'nexaPhotosInput',
      'nexaDeviceFilesInput', 'chatUploadInput', 'referencePhotoInput'].includes(input.id)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    uploadFiles(input);
  }, true);

  document.addEventListener('keydown', event => {
    if (event.key !== 'Enter' || event.shiftKey || event.isComposing) return;
    if (event.target?.id === 'chatInput') { event.preventDefault(); sendMessage('sendChat'); }
    if (event.target?.id === 'homePrompt') { event.preventDefault(); sendMessage('sendHome'); }
    if (event.target?.id === 'imagePrompt') { event.preventDefault(); generateImage(); }
    if (event.target?.id === 'nexaResearchUrl') { event.preventDefault(); runResearch(); }
  }, true);

  const loader = document.getElementById('packLoader');
  if (loader) loader.remove();
  window.NEXA_LIVE_BRIDGE = { request };
  window.EXPERT_AI_LIVE = {
    request,
    persist,
    notify,
    getUser: () => activeUser,
  };
  const expertEnhancements = document.createElement('script');
  expertEnhancements.src = '/mobile-ui-pack/expert-ai-upgrades.js?v=fixed-chat-no-activity-20261123';
  expertEnhancements.onload = () => {
    const messageActions = document.createElement('script');
    messageActions.src = '/mobile-ui-pack/message-actions.js?v=5';
    messageActions.onload = () => {
      const headerMenuFix = document.createElement('script');
      headerMenuFix.src = '/mobile-ui-pack/header-menu-position.js?v=1';
      const announceReady = () => {
        window.parent.postMessage({ app: APP, type: 'ready' }, window.location.origin);
        render();
      };
      const loadPackLiveFeatures = () => {
        const packFeatures = document.createElement('script');
        packFeatures.src = '/mobile-ui-pack/pack-live-features.js?v=1';
        packFeatures.onload = () => {
          const advanced = document.createElement('script');
          advanced.src = '/mobile-ui-pack/advanced-features.js?v=1';
          advanced.onload = announceReady;
          advanced.onerror = () => {
            console.warn('Advanced features could not be loaded; continuing with the original workspace.');
            announceReady();
          };
          document.body.appendChild(advanced);
        };
        packFeatures.onerror = () => {
          console.warn('The imported UI pack account-feature layer could not be loaded; continuing with the workspace.');
          announceReady();
        };
        document.body.appendChild(packFeatures);
      };
      headerMenuFix.onload = loadPackLiveFeatures;
      headerMenuFix.onerror = loadPackLiveFeatures;
      document.body.appendChild(headerMenuFix);
    };
    messageActions.onerror = () => {
      console.warn('Expert AI message actions could not be loaded; continuing with the mobile workspace.');
      window.parent.postMessage({ app: APP, type: 'ready' }, window.location.origin);
      render();
    };
    document.body.appendChild(messageActions);
  };
  expertEnhancements.onerror = () => {
    console.error('Expert AI enhancement layer could not be loaded.');
    window.parent.postMessage({ app: APP, type: 'ready' }, window.location.origin);
    render();
  };
  document.body.appendChild(expertEnhancements);
})();