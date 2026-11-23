/* Expert AI upgrades: account, navigation, browser, voice, plugins and durable chat outbox. */
(() => {
  'use strict';
  const live = window.EXPERT_AI_LIVE;
  if (!live) return;
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
  const wait = ms => new Promise(resolve => window.setTimeout(resolve, ms));
  const notify = message => live.notify ? live.notify(message) : toast(message);
  const persist = () => { if (typeof save === 'function') save(); else if (live.persist) live.persist(); };
  const accentMap = {
    Default: '#5b83ff', Blue: '#5b83ff', Green: '#20b981',
    Purple: '#9b7bff', Orange: '#f59e0b', Pink: '#ec6bb8'
  };
  const countryCodes = [
    ['Nigeria', '+234'], ['United States', '+1'], ['United Kingdom', '+44'],
    ['Ghana', '+233'], ['Kenya', '+254'], ['South Africa', '+27'],
    ['India', '+91'], ['Canada', '+1'], ['Australia', '+61'],
    ['United Arab Emirates', '+971'], ['Germany', '+49'], ['France', '+33'],
    ['Brazil', '+55'], ['Egypt', '+20'], ['Japan', '+81']
  ];
  const originalPages = {};
  const saveOriginal = key => { if (!originalPages[key] && pages[key]) originalPages[key] = pages[key]; };
  const title = (key, value) => { pageTitles[key] = value; };

  function setAccent() {
    const color = accentMap[prefs.accent || 'Blue'] || accentMap.Blue;
    document.documentElement.style.setProperty('--expert-accent', color);
    document.documentElement.style.setProperty('--accent', color);
    const style = document.getElementById('expert-accent-style') || document.createElement('style');
    style.id = 'expert-accent-style';
    style.textContent = '.primary,.send-button,.nexa-send-button,.v8-install-btn{background:var(--expert-accent)!important}.expert-accent-dot{background:var(--expert-accent)}.expert-link{color:var(--expert-accent)}';
    document.head.appendChild(style);
  }

  function brandStaticText() {
    document.title = 'Expert AI';
    const walker = document.createTreeWalker(screen, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const parent = node.parentElement;
      if (!parent || parent.closest('.chat-thread,.user-bubble,.assistant-bubble,input,textarea,script,style')) continue;
      let value = node.nodeValue || '';
      value = value.replace(/Expert AI/g, 'Expert AI').replace(/ChatGPT/g, 'Expert AI');
      value = value.replace(/local demo/gi, 'local setting').replace(/in this demo/gi, 'in this app');
      value = value.replace(/demo conversation/gi, 'conversation');
      value = value.replace(/demo state/gi, 'saved state');
      value = value.replace(/sample preference/gi, 'saved preference');
      value = value.replace(/sample notification/gi, 'browser notification');
      value = value.replace(/\bdemo\b/gi, 'saved setting');
      value = value.replace(/\bprototype\b/gi, 'settings screen');
      node.nodeValue = value;
    }
    screen.querySelectorAll('[placeholder],[aria-label],[title]').forEach(el => {
      ['placeholder','aria-label','title'].forEach(attr => {
        const value = el.getAttribute(attr);
        if (value) el.setAttribute(attr, value.replace(/Expert AI|ChatGPT/g, 'Expert AI'));
      });
    });
    setAccent();
  }

  function captureDrafts(page) {
    if (!page || !screen) return;
    prefs.expertDrafts = prefs.expertDrafts || {};
    const fields = {};
    screen.querySelectorAll('input[id],textarea[id],select[id]').forEach(el => {
      if (el.type === 'file' || el.type === 'password') return;
      fields[el.id] = el.value;
    });
    if (Object.keys(fields).length) prefs.expertDrafts[page] = fields;
    prefs.expertScroll = prefs.expertScroll || {};
    prefs.expertScroll[page] = screen.scrollTop || 0;
    persist();
  }

  function restoreDrafts(page) {
    const fields = prefs.expertDrafts && prefs.expertDrafts[page];
    if (fields) Object.keys(fields).forEach(id => {
      const el = document.getElementById(id);
      if (el && el !== document.activeElement && el.type !== 'file') el.value = fields[id];
    });
    const scroll = prefs.expertScroll && prefs.expertScroll[page];
    if (typeof scroll === 'number') window.requestAnimationFrame(() => { screen.scrollTop = scroll; });
  }

  const originalNav = nav;
  nav = function(page) {
    captureDrafts(currentPage);
    originalNav(page);
  };
  const originalBack = back;
  back = function() {
    captureDrafts(currentPage);
    originalBack();
  };
  const originalRender = render;
  render = function() {
    const preserveChatScroll = currentPage === 'chat' && screen.dataset.expertLastRenderedPage === 'chat';
    const previousChatScroll = screen.scrollTop;
    const wasNearChatBottom = screen.scrollHeight - screen.clientHeight - previousChatScroll < 120;
    originalRender();
    brandStaticText();
    if (currentPage === 'chat') decorateChatProgress();
    restoreDrafts(currentPage);
    if (preserveChatScroll) {
      window.requestAnimationFrame(() => {
        if (currentPage !== 'chat') return;
        screen.scrollTop = wasNearChatBottom ? screen.scrollHeight : previousChatScroll;
      });
    }
    screen.dataset.expertLastRenderedPage = currentPage;
    if (prefs.expertActivity && currentPage !== 'chat' && !screen.querySelector('.expert-activity-global')) {
      const item = document.createElement('div');
      item.className = 'expert-activity expert-activity-global';
      const pulse = document.createElement('span');
      pulse.className = 'expert-pulse';
      item.appendChild(pulse);
      item.appendChild(document.createTextNode(String(prefs.expertActivity)));
      screen.insertBefore(item, screen.firstChild);
    }
  };
  document.addEventListener('input', event => {
    const el = event.target;
    if (!el || !el.id || !['INPUT','TEXTAREA','SELECT'].includes(el.tagName) || el.type === 'file' || el.type === 'password') return;
    prefs.expertDrafts = prefs.expertDrafts || {};
    prefs.expertDrafts[currentPage] = prefs.expertDrafts[currentPage] || {};
    prefs.expertDrafts[currentPage][el.id] = el.value;
    try {
      const user = live.getUser();
      if (user && user.userId) localStorage.setItem('expertAIDrafts:' + user.userId, JSON.stringify(prefs.expertDrafts));
    } catch (_) {}
  }, true);

  /* Remove the customization shortcut from Home and the drawer; it remains in Settings. */
  saveOriginal('home');
  pages.home = function() {
    let html = originalPages.home();
    html = html.replace(/<div class="group" style="margin-top:14px">[\s\S]*?Customize Expert AI[\s\S]*?<\/div>/i, '');
    return html;
  };
  const previousDrawer = drawer;
  drawer = function() {
    let html = previousDrawer();
    html = html.replace(/<button[^>]*data-page="customize"[^>]*>[\s\S]*?<\/button>/gi, '');
    return html;
  };

  /* Chat composer: fixed layout, a clear Think Harder control and recorder status. */
  const brainIcon = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4.5a3.2 3.2 0 0 0-5.9 1.7 3.1 3.1 0 0 0-1.2 5.6A3.2 3.2 0 0 0 7.3 18c.8 1.2 2.7 1.6 4.7.7V4.5Z"/><path d="M12 4.5a3.2 3.2 0 0 1 5.9 1.7 3.1 3.1 0 0 1 1.2 5.6 3.2 3.2 0 0 1-2.4 6.2c-.8 1.2-2.7 1.6-4.7.7"/><path d="M8.3 8.5c1.1.1 1.7.8 1.8 1.8M7.1 13c1.2-.4 2.2.1 2.6 1.2m6-5.7c-1.1.1-1.7.8-1.8 1.8m2.9 2.7c-1.2-.4-2.2.1-2.6 1.2"/></svg>';
  const thinkButton = () => {
    const active = prefs.aiResponseMode === 'ADVANCED' || prefs.reasoningMode === 'high';
    if (!active) return '';
    return '<button type="button" class="expert-think-toggle is-active" data-action="expertThinkToggle" aria-label="Disable Think Harder" aria-pressed="true" title="Think Harder is on">' +
      brainIcon + '</button>';
  };
  function recordingMarkup() {
    if (recording) {
      return '<div class="expert-recorder-bar is-recording"><span class="expert-recorder-dot"></span><span>Recording — speak now, then tap Stop</span><button type="button" data-action="expertStopRecording">Stop</button></div>';
    }
    if (prefs.expertRecordingReady) {
      return '<div class="expert-recorder-bar is-ready"><span class="expert-recorder-dot"></span><span>Recording stopped. Review your text, then press Send.</span><button type="button" data-action="expertClearRecording">Clear</button></div>';
    }
    return '';
  }
  const statusMarkup = () => {
    const queue = readOutbox().filter(item => (prefs.temporaryChat ? item.temporary : !item.temporary));
    const activity = prefs.expertActivity ? '<div class="expert-activity"><span class="expert-pulse"></span>' + esc(prefs.expertActivity) + '</div>' : '';
    const pending = queue.map(item => '<div class="expert-activity"><span class="expert-pulse"></span>' +
      esc(item.status || 'Waiting to send…') + '</div>').join('');
    return activity + pending;
  };

  /* High-visibility composer controls: recorder, live voice chat and send. */
  const composerMicIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="3" width="6" height="12" rx="3"></rect><path d="M5 11a7 7 0 0 0 14 0M12 18v3M8 21h8"></path></svg>';
  const composerVoiceIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10v4M7 7v10M11 4v16M15 7v10M19 10v4M22 11v2"></path></svg>';
  const composerSendIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M5.5 11.5 12 5l6.5 6.5"></path></svg>';
  function emphasizeComposerControls(html) {
    html = html.replace(/<button\b(?=[^>]*data-action="voiceInput")[^>]*>[\s\S]*?<\/button>/i,
      '<button type="button" class="expert-composer-control expert-voice-recognition" data-action="voiceInput" aria-label="Voice recognition" title="Start voice recognition">' + composerMicIcon + '</button>');
    html = html.replace(/<button\b(?=[^>]*data-page="(?:voiceMode|expertVoiceChat)")[^>]*>[\s\S]*?<\/button>/i,
      '<button type="button" class="expert-composer-control expert-voice-chat" data-page="expertVoiceChat" aria-label="Voice chat" title="Start voice chat">' + composerVoiceIcon + '</button>');
    html = html.replace(/<button\b[^>]*class="[^"]*\bsend-button\b[^"]*"[^>]*>[\s\S]*?<\/button>/i, button => {
      let updated = button.replace(/class="([^"]*)"/i, (_, classes) => 'class="' + classes + ' expert-send-button"');
      updated = updated.replace(/aria-label="[^"]*"/i, 'aria-label="Send message"');
      updated = updated.replace(/title="[^"]*"/i, 'title="Send message"');
      return updated.replace(/>[\s\S]*<\/button>$/i, '>' + composerSendIcon + '</button>');
    });
    return html;
  }

  saveOriginal('chat');
  pages.chat = function() {
    let html = originalPages.chat();
    html = html.replace(/(<button[^>]*data-action="voiceInput"[^>]*>[\s\S]*?<\/button>)/i, thinkButton() + '$1');
    html = html.replace(/data-page="voiceMode"/g, 'data-page="expertVoiceChat"');
    html = html.replace(/<div class="chat-composer([^"]*)">/, recordingMarkup() + '<div class="chat-composer$1 expert-fixed-composer">');
    return emphasizeComposerControls(html);
  };
  saveOriginal('home');
  const brandedHome = pages.home;
  pages.home = function() {
    let html = brandedHome();
    html = html.replace(/(<button[^>]*data-action="voiceInput"[^>]*>[\s\S]*?<\/button>)/i, thinkButton() + '$1');
    html = html.replace(/data-page="voiceMode"/g, 'data-page="expertVoiceChat"');
    html = html.replace(/<div class="chat-composer([^"]*)">/, recordingMarkup() + '<div class="chat-composer$1 expert-fixed-composer">');
    return emphasizeComposerControls(html);
  };

  const style = document.createElement('style');
  style.textContent = [
    '.chat-composer.nexa-composer.expert-fixed-composer{position:sticky;bottom:calc(env(safe-area-inset-bottom,0px) + 6px);z-index:20;flex-shrink:0;background:#202020;border:1px solid #474747;box-shadow:0 8px 26px rgba(0,0,0,.28)}',
    '.expert-think-toggle{display:inline-flex;align-items:center;justify-content:center;flex:0 0 34px;width:34px;height:34px;border:1px solid var(--expert-accent);border-radius:50%;background:var(--expert-accent);color:#fff;padding:0;cursor:pointer;position:relative;z-index:2;pointer-events:auto}',
    '.expert-think-toggle svg{display:block;width:18px;height:18px;pointer-events:none}.expert-think-toggle.is-active{box-shadow:0 0 0 3px rgba(91,131,255,.16)}',
    '.chat-thread .chat-bubble{font-size:15px;font-weight:400;line-height:1.55}',
    '.chat-thread .user-bubble{display:block!important;width:fit-content!important;max-width:76%!important;min-width:0!important;box-sizing:border-box!important;white-space:pre-wrap;overflow-wrap:anywhere;font-weight:400!important}',
    '.expert-send-status{display:flex;align-items:center;gap:7px;width:max-content;max-width:76%;margin:4px 0 8px auto;padding:3px 7px;color:#a6a6a6;font-size:11px;line-height:1.4;background:transparent}',
    '.expert-send-dot{width:7px;height:7px;flex:0 0 7px;border-radius:50%;background:var(--expert-accent);animation:expertPulse 1.1s ease-in-out infinite}',
    '.expert-ai-thinking{display:flex;align-items:center;align-self:flex-start;gap:9px;margin:6px 0 10px 2px;color:#b8b8b8;font-size:13px;line-height:1.4}',
    '.expert-thinking-indicator{display:inline-flex;align-items:center;gap:3px;height:14px}',
    '.expert-thinking-indicator i{display:block;width:5px;height:5px;border-radius:50%;background:var(--expert-accent);animation:expertThink 1s ease-in-out infinite}',
    '.expert-thinking-indicator i:nth-child(2){animation-delay:.15s}.expert-thinking-indicator i:nth-child(3){animation-delay:.3s}',
    '@keyframes expertThink{0%,60%,100%{opacity:.35;transform:translateY(0)}30%{opacity:1;transform:translateY(-3px)}}',
    '.expert-ad-toggle{display:flex!important;grid-template-columns:none!important;flex-direction:row-reverse;justify-content:space-between;width:100%;align-items:center;gap:12px;padding:9px 0;color:#eee!important;font-size:14px!important;cursor:pointer}',
    '.expert-ad-toggle input{position:absolute;width:1px;height:1px;opacity:0;pointer-events:none}',
    '.expert-ad-track{width:46px;height:26px;flex:0 0 46px;border-radius:30px;background:#555;position:relative;transition:background .18s ease}',
    '.expert-ad-track:after{content:"";position:absolute;left:3px;top:3px;width:20px;height:20px;border-radius:50%;background:#fff;transition:transform .18s ease}',
    '.expert-ad-toggle input:checked + .expert-ad-track{background:var(--expert-accent)}.expert-ad-toggle input:checked + .expert-ad-track:after{transform:translateX(20px)}',
    '.expert-ad-toggle input:focus-visible + .expert-ad-track{outline:2px solid #fff;outline-offset:3px}',
    '#modalLayer{position:fixed!important;left:10px!important;right:auto!important;top:auto!important;bottom:calc(env(safe-area-inset-bottom,0px) + 80px)!important;width:min(260px,calc(100vw - 116px))!important;max-width:calc(100vw - 116px)!important;max-height:56vh!important;overflow-y:auto!important;z-index:100000!important;isolation:isolate;background:#242424!important;border:1px solid #484848!important;border-radius:16px!important;box-shadow:0 14px 40px rgba(0,0,0,.5)!important;pointer-events:auto!important}',
    '#modalLayer[hidden]{display:none!important}#modalLayer button,#modalLayer a{pointer-events:auto!important}',
    '#modalLayer [role="dialog"],#modalLayer .modal,#modalLayer .modal-card{position:static!important;left:auto!important;right:auto!important;top:auto!important;bottom:auto!important;width:100%!important;max-width:100%!important;max-height:inherit!important;overflow:visible!important;transform:none!important;margin:0!important;z-index:100001!important}',
    '.chat-composer.nexa-composer.expert-fixed-composer{position:sticky;z-index:35!important}',
    '.expert-ad-toggle .expert-ad-track{flex:0 0 46px}',
    '.expert-recorder-bar{display:flex;align-items:center;gap:9px;margin:8px 4px;padding:10px 12px;border-radius:14px;background:#252525;color:#eee;font-size:12px}.expert-recorder-bar span:nth-child(2){flex:1}.expert-recorder-bar button{border:0;border-radius:10px;padding:7px 12px;background:#454545;color:#fff;font-weight:800}.expert-recorder-bar.is-recording{background:#321d20;color:#fff}.expert-recorder-bar.is-ready{background:#1e2b25}.expert-recorder-dot{width:9px;height:9px;flex:0 0 9px;border-radius:50%;background:#f04452}.expert-recorder-bar.is-recording .expert-recorder-dot{animation:expertPulse .9s infinite}.expert-recorder-bar.is-ready .expert-recorder-dot{background:#35b879}',
    '.expert-activity{display:flex;align-items:center;gap:9px;margin:8px 4px;padding:8px 12px;border-radius:13px;background:#191919;color:#d6d6d6;font-size:12px}',
    '.expert-pulse{width:8px;height:8px;flex:0 0 8px;border-radius:50%;background:var(--expert-accent);animation:expertPulse 1.2s ease-in-out infinite}',
    '@keyframes expertPulse{50%{opacity:.28;transform:scale(.75)}}',
    '.expert-form{display:grid;gap:10px;padding:15px}.expert-form label{display:grid;gap:6px;color:#aaa;font-size:13px}.expert-form input,.expert-form select,.expert-form textarea{width:100%;padding:12px;border:1px solid #414141;border-radius:12px;background:#151515;color:#fff;font:inherit}.expert-form button,.expert-action{min-height:44px;border:0;border-radius:13px;background:var(--expert-accent);color:#fff;padding:10px 14px;font-weight:700}',
    '.expert-avatar{width:78px;height:78px;object-fit:cover;border-radius:50%;border:2px solid var(--expert-accent);background:#282828}',
    '.expert-card{padding:15px;margin:10px 0;border:1px solid #414141;border-radius:20px;background:#232323}.expert-card h3{margin:0 0 8px}.expert-muted{color:#aaa;font-size:12px;line-height:1.5}',
    '.expert-model-mode-label{color:#aaa;font-size:13px;font-weight:650;margin-top:5px}.expert-model-mode-options{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.expert-model-option{display:flex!important;min-width:0;min-height:80px!important;flex-direction:column;align-items:flex-start;justify-content:center;gap:5px;padding:10px!important;border:1px solid #484848!important;border-radius:13px!important;background:#242424!important;color:#eee!important;text-align:left}.expert-model-option strong{font-size:12px}.expert-model-option span{font-size:10px;line-height:1.35;color:#aaa}.expert-model-option.is-selected{border-color:var(--expert-accent)!important;background:#30343c!important;box-shadow:inset 0 0 0 1px var(--expert-accent)}',
    '.expert-accent-option{display:flex!important;width:100%!important;align-items:center;justify-content:space-between!important;gap:12px}.expert-accent-option.is-selected{border-color:var(--expert-accent)!important}.expert-accent-dot{width:14px;height:14px;flex:0 0 14px;margin-left:auto;border:1px solid rgba(255,255,255,.45);border-radius:50%;display:inline-block}',
    '.expert-account-actions{margin:14px 0 4px;padding:0 15px}.expert-account-logout{display:block;width:100%;min-height:48px;border:1px solid #704b4b!important;border-radius:13px!important;background:#342323!important;color:#ffe1e1!important;font-weight:750!important}',
    '.expert-readonly-email{padding:12px 14px;border:1px solid #414141;border-radius:12px;background:#151515;color:#f4f4f4;font-weight:700;overflow-wrap:anywhere}',
    '.expert-static-email{cursor:default;pointer-events:none}.expert-static-email .row-main{min-width:0}.expert-static-email .row-sub{overflow-wrap:anywhere;white-space:normal}',
    '.expert-browser-frame{width:100%;height:58vh;min-height:360px;border:1px solid #444;border-radius:14px;background:#fff}.expert-browser-toolbar{display:flex;gap:8px;align-items:center;margin:10px 0}.expert-browser-toolbar button{border:0;border-radius:10px;background:#2a2a2a;color:white;padding:9px 12px}.expert-browser-address{display:flex;gap:6px}.expert-browser-address input{min-width:0;flex:1;padding:11px;border-radius:12px;background:#171717;color:#fff;border:1px solid #444}',
    '.expert-voice-shell{display:flex;min-height:68vh;flex-direction:column;align-items:center;justify-content:center;gap:24px}.expert-voice-orb{width:180px;height:180px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#b9eaff,#4e7dff 42%,#4e32a8 75%);box-shadow:0 0 0 15px rgba(91,131,255,.08),0 0 65px rgba(91,131,255,.28);animation:expertOrb 3s ease-in-out infinite}.expert-voice-orb.is-speaking{animation:expertOrb .75s ease-in-out infinite}@keyframes expertOrb{50%{transform:scale(1.08);filter:brightness(1.2)}}',
    '.expert-plugin-topline{display:flex;align-items:center;justify-content:space-between;margin:4px 0 18px;font-weight:700}.expert-plugin-topline button{width:42px;height:42px;border-radius:50%;background:#303030;color:#fff;border:0;font-size:21px}.expert-plugin-hero{display:flex;align-items:center;gap:15px;margin:14px 0 24px}.expert-plugin-hero img,.expert-plugin-icon{width:76px;height:76px;border-radius:18px;object-fit:contain;background:#147c72;padding:12px}.expert-plugin-icon{display:grid;place-items:center;color:#fff;font-size:30px;font-weight:800}.expert-plugin-hero h2{margin:0}.expert-plugin-hero p{margin:5px 0;color:#aaa}.expert-plugin-actions{display:grid;gap:10px}.expert-plugin-actions button,.expert-plugin-list button{width:100%;padding:15px;border:1px solid #414141;border-radius:16px;background:#2b2b2b;color:#fff;text-align:left}.expert-plugin-info{display:grid;grid-template-columns:1fr 1fr;gap:12px;padding:12px 0;border-bottom:1px solid #333}.expert-plugin-info span:first-child{color:#aaa}.expert-plugin-info span:last-child{overflow-wrap:anywhere}.expert-skill-chip{display:inline-flex;margin:5px;padding:12px 16px;border-radius:30px;background:#252525;color:#fff}',
    '.expert-browser-bookmark{display:block;padding:12px;border-bottom:1px solid #333;color:#fff;text-decoration:none}',
  ].join('');
  style.textContent += [
    '.chat-composer.expert-fixed-composer{display:flex!important;align-items:center!important;gap:7px!important;width:100%!important;box-sizing:border-box!important;padding:8px 9px!important;min-height:68px!important;overflow:visible!important}',
    '.chat-composer.expert-fixed-composer>button{display:inline-flex!important;align-items:center!important;justify-content:center!important;visibility:visible!important;opacity:1!important;position:relative!important;z-index:3!important;flex-shrink:0!important;margin:0!important;padding:0!important;line-height:1!important;font-weight:800!important}',
    '.chat-composer.expert-fixed-composer>button:first-child:not(.expert-think-toggle){width:42px!important;height:42px!important;min-width:42px!important;flex:0 0 42px!important;border:1px solid #505050!important;border-radius:50%!important;background:#333!important;color:#fff!important;font-size:26px!important;font-weight:800!important}',
    '.chat-composer.expert-fixed-composer>input{display:block!important;flex:1 1 auto!important;min-width:58px!important;width:auto!important;padding:0 3px!important;background:transparent!important;color:#fff!important;font-size:16px!important;font-weight:550!important;line-height:1.3!important}',
    '.chat-composer .expert-composer-control{width:44px!important;height:44px!important;min-width:44px!important;flex:0 0 44px!important;border-radius:50%!important;border:1px solid #829cf1!important;background:#303747!important;color:#fff!important;box-shadow:0 0 0 2px rgba(91,131,255,.14)!important}',
    '.chat-composer .expert-voice-chat{width:48px!important;height:48px!important;min-width:48px!important;flex:0 0 48px!important;border:0!important;background:var(--expert-accent,#5b83ff)!important;color:#fff!important;box-shadow:0 3px 13px rgba(91,131,255,.42)!important}',
    '.chat-composer .expert-send-button{display:inline-flex!important;align-items:center!important;justify-content:center!important;width:46px!important;height:46px!important;min-width:46px!important;flex:0 0 46px!important;padding:0!important;border:1px solid rgba(255,255,255,.35)!important;border-radius:50%!important;background:var(--expert-accent,#5b83ff)!important;color:#fff!important;font-size:24px!important;font-weight:900!important;box-shadow:0 3px 13px rgba(91,131,255,.4)!important}',
    '.chat-composer .expert-composer-control svg,.chat-composer .expert-send-button svg{display:block!important;width:24px!important;height:24px!important;fill:none!important;stroke:currentColor!important;stroke-width:2.7!important;stroke-linecap:round!important;stroke-linejoin:round!important;pointer-events:none!important}',
    '.chat-composer .expert-send-button svg{width:25px!important;height:25px!important;stroke-width:3!important}',
    '.chat-composer.expert-fixed-composer>.expert-think-toggle{width:36px!important;height:36px!important;min-width:36px!important;flex:0 0 36px!important}',
    '.chat-composer.expert-fixed-composer>button:focus-visible{outline:3px solid #fff!important;outline-offset:2px!important}',
    '@media(max-width:380px){.chat-composer.expert-fixed-composer{gap:5px!important;padding:7px!important}.chat-composer.expert-fixed-composer>button:first-child:not(.expert-think-toggle){width:39px!important;height:39px!important;min-width:39px!important;flex-basis:39px!important}.chat-composer .expert-composer-control{width:41px!important;height:41px!important;min-width:41px!important;flex-basis:41px!important}.chat-composer .expert-voice-chat{width:44px!important;height:44px!important;min-width:44px!important;flex-basis:44px!important}.chat-composer .expert-send-button{width:43px!important;height:43px!important;min-width:43px!important;flex-basis:43px!important}.chat-composer.expert-fixed-composer>input{font-size:14px!important;min-width:48px!important}}',
  ].join('');
  document.head.appendChild(style);

  /* Durable outbox: user message is visible immediately and remains pending until a connection returns. */
  const outboxKey = () => {
    const user = live.getUser();
    return 'expertAIOutbox:' + (user && user.userId ? user.userId : 'guest');
  };
  function readOutbox() {
    try { return JSON.parse(localStorage.getItem(outboxKey()) || '[]'); }
    catch (_) { return []; }
  }
  function writeOutbox(items) {
    localStorage.setItem(outboxKey(), JSON.stringify(items));
  }
  function decorateChatProgress() {
    if (currentPage !== 'chat' || !screen) return;
    const thread = screen.querySelector('.chat-thread');
    if (!thread) return;
    thread.querySelectorAll('.expert-send-status,.expert-ai-thinking').forEach(node => node.remove());
    const pending = readOutbox().filter(item =>
      (prefs.temporaryChat || prefs.saveHistory === false ? item.temporary : !item.temporary) &&
      (!item.sessionKey || item.sessionKey === prefs.activeConversationToken)
    );
    const bubbles = Array.from(thread.querySelectorAll('.user-bubble'));
    const matched = new Set();
    const normalize = value => String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
    pending.slice().reverse().forEach(item => {
      const expected = normalize(item.text);
      const bubble = bubbles.slice().reverse().find(node => {
        if (matched.has(node)) return false;
        const actual = normalize(node.textContent);
        return expected && (actual === expected || actual.includes(expected) || expected.includes(actual.slice(0, 48)));
      }) || bubbles.slice().reverse().find(node => !matched.has(node));
      if (!bubble) return;
      matched.add(bubble);
      const status = document.createElement('div');
      status.className = 'expert-send-status';
      status.dataset.clientId = item.id;
      const dot = document.createElement('span');
      dot.className = 'expert-send-dot';
      dot.setAttribute('aria-hidden', 'true');
      const label = document.createElement('span');
      label.textContent = item.status || 'Sending…';
      status.append(dot, label);
      bubble.insertAdjacentElement('afterend', status);
    });
    if (prefs.expertAIThinking && pending.length) {
      const thinking = document.createElement('div');
      thinking.className = 'expert-ai-thinking';
      const indicator = document.createElement('span');
      indicator.className = 'expert-thinking-indicator';
      indicator.setAttribute('aria-hidden', 'true');
      indicator.innerHTML = '<i></i><i></i><i></i>';
      const label = document.createElement('span');
      label.textContent = 'Thinking';
      thinking.append(indicator, label);
      const latestPending = pending[pending.length - 1];
      const status = thread.querySelector('.expert-send-status[data-client-id="' + latestPending.id + '"]');
      const latestBubble = bubbles[bubbles.length - 1];
      const anchor = status || latestBubble;
      if (anchor) anchor.insertAdjacentElement('afterend', thinking);
      else thread.appendChild(thinking);
    }
  }
  function showBackgroundReply(message) {
    if (!document.hidden || !('Notification' in window) || Notification.permission !== 'granted') return;
    const body = String(message || 'Your reply is ready.').slice(0, 150);
    live.request('notifications.show', { body }).catch(() => {});
  }
  let draining = false;
  async function drainOutbox() {
    if (draining || !navigator.onLine) return;
    draining = true;
    try {
      while (navigator.onLine) {
        const items = readOutbox();
        if (!items.length) break;
        const item = items[0];
        item.status = 'Sending…';
        if (!item.sessionKey || item.sessionKey === prefs.activeConversationToken) prefs.expertAIThinking = true;
        writeOutbox(items);
        if (currentPage === 'chat' && (!item.sessionKey || item.sessionKey === prefs.activeConversationToken)) render();
        const started = Date.now();
        try {
          const result = await live.request('chat.send', {
            message: item.text,
            chatId: item.chatId || null,
            thinkingMode: item.thinkingMode,
            responseMode: item.responseMode || 'STANDARD',
            contextMessages: item.contextMessages || [],
            messages: item.temporary ? (item.messages || []) : undefined,
            attachmentIds: item.attachmentIds || [],
            temporary: item.temporary === true
          });
          const remaining = 1000 - (Date.now() - started);
          if (remaining > 0) await wait(remaining);
          const next = readOutbox().filter(entry => entry.id !== item.id);
          if (!item.temporary && result.chat && result.chat.id) {
            next.forEach(entry => {
              if (!entry.temporary && !entry.chatId && entry.sessionKey === item.sessionKey) {
                entry.chatId = result.chat.id;
              }
            });
          }
          const isActiveSession = item.sessionKey === prefs.activeConversationToken;
          prefs.expertAIThinking = isActiveSession && next.some(entry => entry.sessionKey === prefs.activeConversationToken);
          writeOutbox(next);
          const mapped = (result.chat && result.chat.messages ? result.chat.messages : []).map(message => ({
            role: message.role === 'assistant' ? 'assistant' : 'user',
            text: message.content || message.text || '',
            created_at: message.created_at
          }));
          const replyMessage = mapped.length ? mapped[mapped.length - 1] : null;
          if (replyMessage && replyMessage.role === 'assistant') showBackgroundReply(replyMessage.text);
          if (result.chat && result.chat.id) {
            prefs.liveChats = [result.chat, ...(prefs.liveChats || []).filter(chat => chat.id !== result.chat.id)];
          }
          if (isActiveSession && item.temporary) {
            prefs.temporaryMessages = mapped.concat(next.filter(entry => entry.temporary && entry.sessionKey === item.sessionKey).map(entry => ({
              role: 'user', text: entry.text, created_at: entry.createdAt, pending: true
            })));
          } else if (isActiveSession) {
            prefs.chatHistory = mapped.concat(next.filter(entry => !entry.temporary && entry.sessionKey === item.sessionKey).map(entry => ({
              role: 'user', text: entry.text, created_at: entry.createdAt, pending: true
            })));
            prefs.activeChatId = result.chat && result.chat.id ? result.chat.id : prefs.activeChatId;
          }
          persist();
          if (currentPage === 'chat' && isActiveSession) render();
        } catch (error) {
          if (item.sessionKey === prefs.activeConversationToken) prefs.expertAIThinking = false;
          const remaining = readOutbox();
          const pending = remaining.find(entry => entry.id === item.id);
          if (pending) pending.status = navigator.onLine
            ? 'Connection interrupted — retrying automatically…'
            : 'Waiting for your internet connection…';
          writeOutbox(remaining);
          if (currentPage === 'chat' && item.sessionKey === prefs.activeConversationToken) render();
          if (navigator.onLine && item.retryCount < 4) {
            item.retryCount = (item.retryCount || 0) + 1;
            const changed = readOutbox();
            const stored = changed.find(entry => entry.id === item.id);
            if (stored) stored.retryCount = item.retryCount;
            writeOutbox(changed);
            await wait(Math.min(15000, 1500 * Math.pow(2, item.retryCount)));
            continue;
          }
          break;
        }
      }
    } finally {
      draining = false;
    }
  }
  window.addEventListener('online', () => {
    const queue = readOutbox();
    queue.forEach(item => item.status = 'Connection restored — sending…');
    writeOutbox(queue);
    drainOutbox();
  });
  window.addEventListener('offline', () => {
    const queue = readOutbox();
    queue.forEach(item => item.status = 'Waiting for your internet connection…');
    writeOutbox(queue);
    if (currentPage === 'chat') render();
  });
  window.addEventListener('message', event => {
    if (event.source !== window.parent || event.origin !== window.location.origin) return;
    if (event.data && event.data.type === 'host-init') {
      const pending = readOutbox();
      if (pending.length) {
        const activePending = pending.filter(item => !item.sessionKey || item.sessionKey === prefs.activeConversationToken);
        const list = prefs.temporaryChat || prefs.saveHistory === false
          ? (prefs.temporaryMessages || [])
          : (prefs.chatHistory || []);
        activePending.forEach(item => {
          if (!list.some(message => message.clientId === item.id)) list.push({
            role: 'user', text: item.text, created_at: item.createdAt, clientId: item.id, pending: true
          });
        });
        if (prefs.temporaryChat || prefs.saveHistory === false) prefs.temporaryMessages = list;
        else prefs.chatHistory = list;
        drainOutbox();
      }
    }
  });
  window.EXPERT_AI_LIVE.sendMessage = function(action) {
    const field = document.querySelector(action === 'sendHome' ? '#homePrompt' : '#chatInput');
    const text = String(field && field.value || '').trim();
    if (!text) { notify('Type a message first.'); return; }
    if (action === 'sendHome') {
      prefs.activeChatId = null;
      prefs.activeConversationToken = 'new-' + Date.now() + '-' + Math.random().toString(36).slice(2);
      prefs.chatHistory = [];
      prefs.temporaryMessages = [];
      prefs.branchContextMessages = [];
      prefs.pendingLiveAttachmentIds = [];
      prefs.pendingChatFiles = [];
      prefs.expertShowJumpToLatest = false;
    }
    const isTemporary = !!prefs.temporaryChat || prefs.saveHistory === false;
    if (!prefs.activeConversationToken) {
      prefs.activeConversationToken = prefs.activeChatId
        ? 'chat:' + prefs.activeChatId
        : 'new-' + Date.now() + '-' + Math.random().toString(36).slice(2);
    }
    const branchContext = prefs.branchContextMessages || [];
    const item = {
      id: 'expert-' + Date.now() + '-' + Math.random().toString(36).slice(2),
      text,
      chatId: isTemporary ? null : (prefs.activeChatId || null),
      sessionKey: prefs.activeConversationToken,
      temporary: isTemporary,
      responseMode: prefs.aiResponseMode || 'STANDARD',
      contextMessages: (!isTemporary && !prefs.activeChatId) ? branchContext.slice(-30) : [],
      messages: isTemporary ? ((prefs.temporaryMessages || []).length
        ? (prefs.temporaryMessages || []).map(entry => ({
          role: entry.role === 'assistant' ? 'assistant' : 'user',
          content: entry.text || entry.content || ''
        })).slice(-30)
        : branchContext.slice(-30)) : [],
      thinkingMode: prefs.aiResponseMode === 'ADVANCED' || prefs.reasoningMode === 'high' || prefs.composerToolMode === 'Thinking' ? 'DEEP' : 'FAST',
      attachmentIds: (prefs.pendingLiveAttachmentIds || []).slice(0, 5),
      createdAt: Date.now(),
      status: navigator.onLine ? 'Sending…' : 'Waiting for your internet connection…',
      retryCount: 0
    };
    prefs.expertShowJumpToLatest = false;
    prefs.expertForceScrollToLatest = true;
    if (!prefs.activeChatId && branchContext.length) prefs.branchContextMessages = [];
    if (field) field.value = '';
    const composerPage = action === 'sendHome' ? 'home' : 'chat';
    const composerId = action === 'sendHome' ? 'homePrompt' : 'chatInput';
    prefs.expertDrafts = prefs.expertDrafts || {};
    prefs.expertDrafts[composerPage] = prefs.expertDrafts[composerPage] || {};
    prefs.expertDrafts[composerPage][composerId] = '';
    try {
      const user = live.getUser();
      if (user && user.userId) {
        localStorage.setItem('expertAIDrafts:' + user.userId, JSON.stringify(prefs.expertDrafts));
      }
    } catch (_) {}
    prefs.expertRecordingReady = false;
    prefs.pendingLiveAttachmentIds = [];
    prefs.pendingChatFiles = [];
    const messages = item.temporary ? (prefs.temporaryMessages || []) : (prefs.chatHistory || []);
    messages.push({ role: 'user', text, created_at: item.createdAt, clientId: item.id, pending: true });
    if (item.temporary) prefs.temporaryMessages = messages;
    else prefs.chatHistory = messages;
    const queue = readOutbox();
    queue.push(item);
    writeOutbox(queue);
    persist();
    if (currentPage !== 'chat') nav('chat');
    render();
    drainOutbox();
  };

  /* Account/profile/contact data are saved as unverified contact preferences, not login credentials. */
  const countryOptions = countryCodes.map(item => '<option value="' + item[1] + '">' + esc(item[0]) + ' (' + item[1] + ')</option>').join('');
  pages.account = function() {
    return '<div class="section-label">YOUR EXPERT AI ACCOUNT</div><div class="expert-card">' +
      '<div style="display:flex;gap:14px;align-items:center"><img class="expert-avatar" src="' + esc(prefs.profilePictureUrl || (live.getUser() && live.getUser().picture) || '') + '" alt="Profile picture">' +
      '<div><b>' + esc(prefs.userName || 'Account') + '</b><p class="expert-muted">' + esc(prefs.userEmail || '') + '</p>' +
      '<label class="expert-action" for="expertAvatarInput">Change profile picture</label><input id="expertAvatarInput" type="file" accept="image/*" hidden></div></div></div>' +
      '<div class="expert-form"><label>Sign-in email</label><div class="expert-readonly-email">' + esc((live.getUser() && live.getUser().email) || prefs.userEmail || 'Email unavailable') + '</div>' +
      '<label>Country calling code<input id="expertPhoneCountry" type="text" inputmode="tel" value="' + esc(prefs.phoneCountry || '+234') + '" placeholder="+234"></label>' +
      '<div class="expert-muted">Examples: +234 Nigeria · +44 United Kingdom · +1 United States. Enter any international calling code.</div>' +
      '<label>Phone number<input id="expertPhoneNumber" type="tel" value="' + esc(prefs.contactPhone || '') + '" placeholder="8012345678"></label>' +
      '<p class="expert-muted">Your phone contact is saved without OTP verification. It is not used to sign in or prove ownership of the number.</p>' +
      '<label>Date of birth<input id="expertBirthDate" type="date" value="' + esc(prefs.birthDate || '') + '"></label>' +
      '<p class="expert-muted" id="expertAgePreview">Calculated age: ' + (Number.isFinite(Number(prefs.computedAge)) ? esc(prefs.computedAge) : 'Not calculated') + '</p>' +
      '<button data-action="expertSaveAccount">Save account details</button></div>' +
      '<div class="expert-account-actions"><button type="button" class="expert-action expert-account-logout" data-action="logout">Log out</button></div>';
  };
  title('account', 'Account');
  pages.trustedContact = function() {
    return '<div class="section-label">TRUSTED CONTACT</div><div class="expert-card"><h3>Use your saved phone contact</h3>' +
      '<p class="expert-muted">This is your saved, unverified phone contact. It is not a verified identity or guaranteed account-recovery method.</p>' +
      '<p>' + esc(prefs.phoneCountry || '+234') + ' ' + esc(prefs.contactPhone || 'No phone contact saved') + '</p>' +
      '<button class="expert-action" data-page="account">Add or edit phone contact</button></div>';
  };
  pages.emailLogin = function() {
    return '<div class="section-label">SIGN-IN EMAIL</div><div class="expert-card"><h3>Account email</h3>' +
      '<div class="expert-readonly-email">' + esc((live.getUser() && live.getUser().email) || prefs.userEmail || 'Email unavailable') + '</div>' +
      '<p class="expert-muted">This is the permanent email address used by your current login provider. It is displayed for reference and cannot be edited from Expert AI settings.</p></div>';
  };
  pages.verifyAge = function() {
    return '<div class="section-label">AGE CONFIRMATION</div><div class="expert-form"><label>Date of birth<input id="expertBirthDate" type="date" value="' +
      esc(prefs.birthDate || '') + '"></label><p class="expert-muted" id="expertAgePreview">Calculated age: ' +
      (Number.isFinite(Number(prefs.computedAge)) ? esc(prefs.computedAge) : 'Not calculated') +
      '</p><button data-action="expertSaveAge">Confirm my age</button><p class="expert-muted">This is self-declared age confirmation. It does not verify identity or official age documents.</p></div>';
  };
  pages.accent = function() {
    return '<div class="section-label">ACCENT COLOR</div><div class="expert-plugin-list expert-accent-list">' +
      ['Default','Blue','Green','Purple','Orange','Pink'].map(name =>
        '<button class="expert-accent-option' + ((prefs.accent || 'Default') === name ? ' is-selected' : '') + '" data-action="expertSetAccent" data-accent="' + name + '" aria-pressed="' + ((prefs.accent || 'Default') === name) + '">' +
        '<span>' + name + '</span><span class="expert-accent-dot" style="background:' + accentMap[name] + '" aria-hidden="true"></span></button>'
      ).join('') +
      '</div>';
  };
  title('accent','Accent color');
  const originalGeneralPage = pages.general;
  pages.general = function() {
    const original = typeof originalGeneralPage === 'function' ? originalGeneralPage() : '<div class="section-label">GENERAL</div>';
    return original +
      '<div class="section-label">EXPERT AI OPTIONS</div><div class="expert-plugin-list">' +
      '<button data-page="expertAssistant">Use Expert AI as default assistant　›</button></div>';
  };
  pages.expertAssistant = function() {
    return '<div class="section-label">DEFAULT ASSISTANT</div><div class="expert-card"><p>Android controls which app is your default digital assistant. Expert AI cannot change this setting silently from a website or PWA.</p>' +
      '<p class="expert-muted">On Android, open Settings → Apps → Default apps → Digital assistant app and select the supported assistant app.</p>' +
      '<button class="expert-action" data-action="expertOpenAssistantSettings">Open Android assistant settings</button></div>';
  };
  title('expertAssistant','Default assistant');
  pages.expertLanguage = function() {
    const languages = [
      ['af-ZA','Afrikaans'],['sq-AL','Albanian'],['am-ET','Amharic'],['ar-SA','Arabic (Saudi Arabia)'],['ar-EG','Arabic (Egypt)'],['ar-AE','Arabic (UAE)'],['ar-MA','Arabic (Morocco)'],
      ['hy-AM','Armenian'],['az-AZ','Azerbaijani'],['eu-ES','Basque'],['bn-BD','Bengali (Bangladesh)'],['bn-IN','Bengali (India)'],['bs-BA','Bosnian'],['bg-BG','Bulgarian'],['my-MM','Burmese'],
      ['ca-ES','Catalan'],['zh-CN','Chinese (Mandarin, Simplified)'],['zh-TW','Chinese (Mandarin, Traditional)'],['hr-HR','Croatian'],['cs-CZ','Czech'],['da-DK','Danish'],['nl-NL','Dutch'],['en-AU','English (Australia)'],
      ['en-CA','English (Canada)'],['en-IN','English (India)'],['en-IE','English (Ireland)'],['en-NG','English (Nigeria)'],['en-NZ','English (New Zealand)'],['en-ZA','English (South Africa)'],['en-GB','English (United Kingdom)'],['en-US','English (United States)'],
      ['et-EE','Estonian'],['fil-PH','Filipino'],['fi-FI','Finnish'],['fr-CA','French (Canada)'],['fr-FR','French (France)'],['gl-ES','Galician'],['ka-GE','Georgian'],['de-AT','German (Austria)'],
      ['de-DE','German (Germany)'],['de-CH','German (Switzerland)'],['el-GR','Greek'],['gu-IN','Gujarati'],['ha-NG','Hausa'],['he-IL','Hebrew'],['hi-IN','Hindi'],['hu-HU','Hungarian'],
      ['is-IS','Icelandic'],['ig-NG','Igbo'],['id-ID','Indonesian'],['ga-IE','Irish'],['it-IT','Italian'],['ja-JP','Japanese'],['jv-ID','Javanese'],['kn-IN','Kannada'],
      ['kk-KZ','Kazakh'],['km-KH','Khmer'],['rw-RW','Kinyarwanda'],['ko-KR','Korean'],['ku-TR','Kurdish'],['ky-KG','Kyrgyz'],['lo-LA','Lao'],['lv-LV','Latvian'],
      ['lt-LT','Lithuanian'],['lb-LU','Luxembourgish'],['mk-MK','Macedonian'],['ms-MY','Malay'],['ml-IN','Malayalam'],['mt-MT','Maltese'],['mi-NZ','Māori'],['mr-IN','Marathi'],
      ['mn-MN','Mongolian'],['ne-NP','Nepali'],['nb-NO','Norwegian Bokmål'],['nn-NO','Norwegian Nynorsk'],['or-IN','Odia'],['ps-AF','Pashto'],['fa-IR','Persian'],['pl-PL','Polish'],
      ['pt-BR','Portuguese (Brazil)'],['pt-PT','Portuguese (Portugal)'],['pa-IN','Punjabi'],['ro-RO','Romanian'],['ru-RU','Russian'],['sr-RS','Serbian'],['si-LK','Sinhala'],['sk-SK','Slovak'],
      ['sl-SI','Slovenian'],['so-SO','Somali'],['st-ZA','Southern Sotho'],['es-AR','Spanish (Argentina)'],['es-MX','Spanish (Mexico)'],['es-ES','Spanish (Spain)'],['es-US','Spanish (United States)'],['sw-KE','Swahili (Kenya)'],
      ['sw-TZ','Swahili (Tanzania)'],['sv-SE','Swedish'],['tl-PH','Tagalog'],['ta-IN','Tamil (India)'],['ta-LK','Tamil (Sri Lanka)'],['te-IN','Telugu'],['th-TH','Thai'],['ti-ET','Tigrinya'],
      ['tr-TR','Turkish'],['uk-UA','Ukrainian'],['ur-IN','Urdu (India)'],['ur-PK','Urdu (Pakistan)'],['uz-UZ','Uzbek'],['vi-VN','Vietnamese'],['cy-GB','Welsh'],['xh-ZA','Xhosa'],
      ['yo-NG','Yoruba'],['zu-ZA','Zulu'],['sn-ZW','Shona'],['ln-CD','Lingala'],['om-ET','Oromo'],['wo-SN','Wolof'],['ak-GH','Akan'],['ee-GH','Ewe'],['rw-RW','Kinyarwanda'],
      ['so-ET','Somali (Ethiopia)'],['nso-ZA','Northern Sotho'],['tn-ZA','Tswana'],['ve-ZA','Venda'],['ts-ZA','Tsonga'],['ss-ZA','Swati'],['ny-MW','Chichewa'],['mg-MG','Malagasy'],
      ['zu-ZA','Zulu (South Africa)'],['pa-PK','Punjabi (Pakistan)'],['sd-PK','Sindhi'],['sa-IN','Sanskrit'],['as-IN','Assamese'],['kok-IN','Konkani'],['doi-IN','Dogri'],['ks-IN','Kashmiri'],
      ['br-FR','Breton'],['co-FR','Corsican'],['fo-FO','Faroese'],['gd-GB','Scottish Gaelic'],['se-NO','Northern Sami'],['fy-NL','West Frisian'],['oc-FR','Occitan'],['rm-CH','Romansh'],
      ['be-BY','Belarusian'],['bs-BA','Bosnian (Latin)'],['fo-FO','Faroese'],['hy-AM','Armenian (Armenia)'],['az-AZ','Azerbaijani (Azerbaijan)'],['ka-GE','Georgian (Georgia)']
    ];
    const locale = prefs.speechLanguage || 'en-US';
    if (!languages.some(item => item[0] === locale)) languages.unshift([locale, 'Saved locale (' + locale + ')']);
    const responseMode = prefs.aiResponseMode || (prefs.preferredModel === 'DEEP' ? 'ADVANCED' : 'STANDARD');
    return '<div class="section-label">MODEL</div><div class="expert-form"><div class="expert-model-mode-label">AI response mode</div><div class="expert-model-mode-options">' +
      [['LIVE','Live','Quick, direct answers'],['ADVANCED','Advanced','Deeper reasoning'],['STANDARD','Standard','Balanced detail']].map(item =>
        '<button type="button" class="expert-model-option' + (responseMode === item[0] ? ' is-selected' : '') + '" data-action="expertSelectModelMode" data-mode="' + item[0] + '" aria-pressed="' + (responseMode === item[0]) + '">' +
        '<strong>' + item[1] + '</strong><span>' + item[2] + '</span></button>'
      ).join('') +
      '</div><label>Speech recognition language or locale<select id="expertSpeechLanguage">' +
      languages.map(item => '<option value="' + esc(item[0]) + '"' + (item[0] === locale ? ' selected' : '') + '>' + esc(item[1]) + ' (' + esc(item[0]) + ')</option>').join('') +
      '</select></label><button data-action="expertSaveLanguage">Save preferences</button>' +
      '<p class="expert-muted">Choose a language from the list. Actual speech recognition availability depends on the browser, device and language services enabled there.</p></div>';
  };
  title('expertLanguage','Model');

  pages.storage = function() {
    const files = prefs.liveFiles || [];
    const used = files.reduce((sum, file) => sum + (Number(file.size) || 0), 0);
    const quota = 512 * 1024 * 1024;
    const pct = Math.min(100, used / quota * 100);
    return '<div class="section-label">YOUR STORAGE</div><div class="expert-card"><h3>' +
      (used / 1048576).toFixed(2) + ' MB of 512 MB used</h3><div style="height:9px;background:#444;border-radius:8px;overflow:hidden"><div style="height:100%;width:' + pct.toFixed(2) + '%;background:var(--expert-accent)"></div></div>' +
      '<p class="expert-muted">Usage is calculated from files recorded in your account. Temporary uploads are removed after 24 hours. Saved files and profile pictures are not cleared automatically.</p>' +
      files.map(file => '<div class="expert-plugin-info"><span>' + esc(file.name) + '</span><span>' + (Number(file.size || 0) / 1024).toFixed(1) + ' KB</span></div>').join('') +
      '</div>';
  };
  pages.adsControls = function() {
    const topics = ['Technology','Entertainment','Shopping','Travel'];
    const chosen = prefs.adTopics || [];
    return '<div class="section-label">AD TOPIC PREFERENCES</div><div class="expert-form">' +
      topics.map(topic => '<label class="expert-ad-toggle"><input type="checkbox" role="switch" class="expert-ad-topic" value="' + topic + '"' +
        (chosen.includes(topic) ? ' checked' : '') + '><span class="expert-ad-track" aria-hidden="true"></span><span>' + topic + '</span></label>').join('') +
      '<p class="expert-muted">Your topic preferences are saved as you switch them. Ad delivery still depends on an advertising provider being configured.</p></div>';
  };
  pages.parental = function() {
    const members = prefs.familyMembers || [];
    const links = prefs.familyLinkedTo || [];
    return '<div class="section-label">FAMILY LINKING</div><div class="expert-card"><p>Link another Expert AI account with consent. A child link can apply safety preferences to Expert AI chat and image generation only; it does not control the device or other apps.</p>' +
      '<label>Invite type<select id="expertFamilyRole"><option value="member">Family member</option><option value="child">Child account</option></select></label>' +
      '<button class="expert-action" data-action="expertCreateFamilyInvite">Create invite code</button>' +
      (prefs.familyInviteCode ? '<div class="expert-plugin-info"><span>Current invite code</span><b>' + esc(prefs.familyInviteCode) + '</b></div><button data-action="expertCopyFamilyCode">Copy invite code</button>' : '') +
      '<label>Join with invite code<input id="expertFamilyJoinCode" placeholder="Enter invite code"></label><button data-action="expertJoinFamily">Join family</button></div>' +
      '<div class="section-label">LINKED ACCOUNTS</div>' +
      members.map(item => '<div class="expert-card"><b>' + esc(item.display_name || 'Family member') + '</b><p class="expert-muted">' + esc(item.role || 'member') + '</p>' +
        (item.role === 'child' ? '<label><input type="checkbox" class="expert-family-safe" data-member-id="' + esc(item.id) + '"' + (item.safe_mode !== false ? ' checked' : '') + '> Safe responses</label><label><input type="checkbox" class="expert-family-images" data-member-id="' + esc(item.id) + '"' + (item.allow_images === true ? ' checked' : '') + '> Allow image generation</label><button data-action="expertSaveFamilyControls" data-member-id="' + esc(item.id) + '">Save controls</button>' : '') + '</div>').join('') +
      links.map(item => '<div class="expert-card"><b>Linked to ' + esc(item.owner_name || 'Family account') + '</b><p class="expert-muted">Your role: ' + esc(item.role || 'member') + '</p></div>').join('') +
      ((!members.length && !links.length) ? '<p class="expert-muted">No family accounts linked yet.</p>' : '');
  };
  title('parental','Family and parental controls');
  delete pages.expertBrowser;
  delete pageTitles.expertBrowser;

  pages.codex = function() {
    return '<div class="section-label">CODE SCANNER</div><div class="expert-card"><p>Scan a QR code supported by your device browser, or paste code/text manually.</p>' +
      '<video id="expertScannerVideo" autoplay playsinline style="width:100%;max-height:260px;border-radius:14px;background:#111"></video>' +
      '<button class="expert-action" data-action="expertStartScanner">Start camera scanner</button><button class="outline" data-action="expertStopScanner">Stop scanner</button>' +
      '<textarea id="expertScanResult" class="field" placeholder="Scanned code or text"></textarea><p class="expert-muted">Camera scanning requires permission and browser BarcodeDetector support. You can paste or type content as a fallback.</p></div>';
  };

  /* Plugin Management overview and gear/settings/action screens, matching the supplied screenshots. */
  function currentPluginName() { return prefs.activeVideoPlugin || 'Plugin Management'; }
  function catalogueRecord(name) {
    const data = window.NEXA_PLUGIN_CATALOGUE || {};
    const records = Array.isArray(data.records) ? data.records : [];
    return records.find(item => String(item.name || '').toLowerCase() === String(name).toLowerCase()) || null;
  }
  function urlForPlugin(name, record) {
    const known = {
      Notion: 'https://www.notion.so/login',
      GitHub: 'https://github.com/login',
      Gmail: 'https://accounts.google.com/',
      'Google Drive': 'https://accounts.google.com/',
      Slack: 'https://slack.com/signin',
      Canva: 'https://www.canva.com/login/',
      Dropbox: 'https://www.dropbox.com/login',
      ElevenLabs: 'https://elevenlabs.io/sign-in',
      'Google Calendar': 'https://accounts.google.com/'
    };
    return known[name] || (record && (record.publisherUrl || record.directoryUrl)) || 'https://chatgpt.com/';
  }
  function integration(name) {
    const provider = name === 'Gmail' || name === 'Google Drive' || name === 'Google Calendar' ? 'google' :
      name === 'GitHub' ? 'github' : name === 'Slack' ? 'slack' : name === 'Notion' ? 'notion' : '';
    return (prefs.liveIntegrations || []).find(item => item.provider === provider) || null;
  }
  const officialPluginIcons = {
    Notion: 'https://cdn.simpleicons.org/notion/FFFFFF',
    GitHub: 'https://cdn.simpleicons.org/github/FFFFFF',
    Slack: 'https://cdn.simpleicons.org/slack/FFFFFF',
    Gmail: 'https://cdn.simpleicons.org/gmail/FFFFFF',
    'Google Drive': 'https://cdn.simpleicons.org/googledrive/FFFFFF',
    'Google Calendar': 'https://cdn.simpleicons.org/googlecalendar/FFFFFF',
    Canva: 'https://cdn.simpleicons.org/canva/FFFFFF',
    Dropbox: 'https://cdn.simpleicons.org/dropbox/FFFFFF',
    Microsoft: 'https://cdn.simpleicons.org/microsoft/FFFFFF',
    ElevenLabs: 'https://cdn.simpleicons.org/elevenlabs/FFFFFF'
  };
  function applyOfficialPluginIconFallbacks() {
    const records = window.NEXA_PLUGIN_CATALOGUE && window.NEXA_PLUGIN_CATALOGUE.records;
    if (!Array.isArray(records)) return;
    records.forEach(record => {
      const name = String(record.name || record.title || '').trim();
      const fallback = officialPluginIcons[name];
      if (!fallback) return;
      const current = [record.sourceIconUrl, record.iconUrl, record.logoUrl, record.imageUrl, record.icon]
        .find(value => value != null && String(value).trim() !== '');
      const iconText = String(current || '').trim();
      const generic = !iconText ||
        /placeholder|generic|default|fallback|missing|unknown|plugin[-_ ]?icon/i.test(iconText) ||
        ['🔌','🧩','✣','⚙','plug','plugin','integration','app icon'].includes(iconText.toLowerCase());
      if (generic) {
        record.sourceIconUrl = fallback;
        if (record.iconUrl != null && /placeholder|generic|default|fallback|missing|unknown/i.test(String(record.iconUrl))) {
          record.iconUrl = fallback;
        }
      }
    });
  }
  saveOriginal('plugins');
  const originalPluginListPage = originalPages.plugins;
  pages.plugins = function() {
    applyOfficialPluginIconFallbacks();
    return typeof originalPluginListPage === 'function' ? originalPluginListPage() : '';
  };
  saveOriginal('videoPluginDetail');
  const originalVideoPluginDetail = originalPages.videoPluginDetail;
  pages.videoPluginDetail = function() {
    const name = currentPluginName();
    if (name === 'Plugin Management') {
      return '<div class="expert-plugin-topline"><span>Plugin Management</span><button class="mini-action" data-page="pluginManagementSettings" aria-label="Plugin settings">⚙</button></div>' +
        '<div class="expert-plugin-hero"><div class="expert-plugin-icon">✣</div><div><h2>Plugin Management</h2><p>By OpenAI</p></div></div>' +
        '<div class="expert-card" style="background:linear-gradient(130deg,#b8e6fb,#8fd7d0);color:#111">' +
        ['Find a plugin that can help with my task','Show the permissions for one of my plugins','Check which apps a plugin needs'].map((item,index) =>
          '<button style="display:block;width:100%;text-align:left;margin:10px 0;padding:18px;border-radius:20px;border:1px solid #fff;background:#ffffffa8;color:#111" data-action="expertPluginPrompt" data-prompt="' + esc(item) + '"><b>Plugin Management</b> ' + item + '　→</button>'
        ).join('') + '</div>' +
        '<p class="expert-muted">Find integrations for external apps and services, inspect available details, and manage connections this app actually supports.</p>' +
        '<div class="section-label">App</div><div class="expert-plugin-info"><span>Plugin Management</span><span>Installed in Expert AI</span></div>' +
        '<div class="section-label">Skills</div><span class="expert-skill-chip">plugin-management</span>' +
        '<div class="section-label">Information</div>' +
        [['Capabilities','Plugin discovery, connection status and permission guidance'],['Developer','OpenAI'],['Website','openai.com'],['Version','Local skill · no provider version supplied'],['Privacy Policy','openai.com/policies/privacy-policy'],['Terms of Service','openai.com/policies/terms-of-use'],['Authentication','Expert AI account'],['Permission scopes','Plugin catalogue and connection metadata']].map(item =>
          '<div class="expert-plugin-info"><span>' + item[0] + '</span><span>' + item[1] + '</span></div>'
        ).join('') + '<button class="expert-action" data-page="pluginManagementSettings">Manage Plugin Management ⚙</button>';
    }
    applyOfficialPluginIconFallbacks();
    const originalPluginDetail = typeof originalVideoPluginDetail === 'function' ? originalVideoPluginDetail() : '';
    if (originalPluginDetail) {
      if (!/data-page="pluginManagementSettings"/.test(originalPluginDetail)) {
        return '<div class="expert-plugin-topline"><span>Plugin details</span><button class="mini-action" data-page="pluginManagementSettings" aria-label="Plugin settings">⚙</button></div>' + originalPluginDetail;
      }
      return originalPluginDetail;
    }
    return '<div class="expert-card"><p>Plugin details are unavailable for this provider.</p></div>';
  };
  title('videoPluginDetail','Plugin details');
  pages.pluginManagementSettings = function() {
    const enabled = prefs.pluginManagementSkillEnabled !== false;
    const mode = prefs.pluginPermissionMode || 'review_important_actions';
    const modeLabel = mode === 'always_ask' ? 'Always ask' : mode === 'ask_before_writes' ? 'Allow read actions' : 'Allow low-risk actions';
    return '<div class="expert-plugin-hero"><div class="expert-plugin-icon">✣</div><div><h2>Plugin Management</h2><p>Connected to Plugin Management</p></div></div>' +
      '<div class="section-label">Skills</div><button class="expert-card" data-action="expertPluginSkill">' + (enabled ? '▣' : '□') + '　plugin-management　›</button>' +
      '<div class="section-label">Read actions</div><div class="expert-plugin-actions"><button data-action="expertPluginPermissions">Get app permissions　›</button><button data-action="expertPluginDependencies">Get plugin dependencies　›</button></div>' +
      '<div class="section-label">Write actions</div><div class="expert-plugin-actions"><button data-action="expertPluginUninstall">Uninstall app　›</button><button data-action="expertPluginPermissionMode">Update app permissions　›</button></div>' +
      '<div class="expert-card"><span class="expert-muted">Current local permission preference</span><p>' + modeLabel + '</p><p class="expert-muted">These permissions control the local plugin directory UI for Expert AI. They do not change permissions inside external providers or other ChatGPT accounts.</p></div>';
  };
  title('pluginManagementSettings','Plugin Management');
  pages.pluginActionDetails = function() {
    const action = prefs.expertPluginAction || 'Get app permissions';
    const mode = prefs.pluginPermissionMode || 'review_important_actions';
    const textByAction = {
      'Get app permissions': 'Plugin Management may read the in-app plugin catalogue and current connection states. It cannot read external account content without a separate provider connection.',
      'Get plugin dependencies': 'Plugin Management currently has no declared external app dependencies. Provider-specific dependencies are shown only when a provider supplies them.',
      'Uninstall app': 'Remove the Plugin Management entry from your Expert AI shortcuts. This does not uninstall software or revoke an external account connection.',
      'Update app permissions': 'Choose how Expert AI handles low-risk plugin directory actions. Sensitive external-provider permissions remain controlled by that provider.'
    };
    return '<div class="section-label">' + esc(action) + '</div><div class="expert-card"><p>' + esc(textByAction[action] || '') + '</p>' +
      (action === 'Get app permissions' ? '<div class="expert-plugin-info"><span>Read catalogue</span><span>Allowed</span></div><div class="expert-plugin-info"><span>Write external data</span><span>Requires provider authorisation</span></div>' : '') +
      (action === 'Get plugin dependencies' ? '<div class="expert-plugin-info"><span>Required external apps</span><span>None listed for the local directory skill</span></div>' : '') +
      (action === 'Update app permissions' ? ['always_ask','ask_before_writes','review_important_actions'].map(value => '<button class="expert-action" style="margin:5px" data-action="expertSetPluginPermission" data-mode="' + value + '">' +
        (mode === value ? '✓ ' : '') + (value === 'always_ask' ? 'Always ask' : value === 'ask_before_writes' ? 'Allow read actions' : 'Allow low-risk actions') + '</button>').join('') : '') +
      (action === 'Uninstall app' ? '<button class="expert-action" data-action="expertConfirmPluginUninstall">Remove local app entry</button>' : '') +
      '</div><button class="outline" data-page="pluginManagementSettings">Back</button>';
  };
  title('pluginActionDetails','Plugin action');
  pages.v8ConnectorSkill = function() {
    const skillEnabled = prefs.pluginManagementSkillEnabled !== false;
    return '<div class="section-label">PLUGIN MANAGEMENT SKILL</div><div class="expert-card"><label style="display:flex;justify-content:space-between;align-items:center">Use skill <input id="expertSkillEnabled" type="checkbox" ' +
      (skillEnabled ? 'checked' : '') + ' data-action="expertSkillToggle"></label><p class="expert-muted">This enables the in-app plugin directory and connection guidance. External services still require their own OAuth/API access.</p></div>' +
      '<button class="expert-action" data-action="expertPluginPrompt" data-prompt="Find a plugin that can help with my task">Use Plugin Management in chat</button>';
  };

  const originalSecurityPage = pages.security;
  pages.security = function() {
    const original = typeof originalSecurityPage === 'function' ? originalSecurityPage() : '<div class="section-label">SECURITY AND LOGIN</div>';
    return original +
      '<div class="section-label">EXPERT AI ACCOUNT SECURITY</div><div class="expert-card"><h3>Protected sign-in</h3>' +
      '<p>Expert AI uses AppDeploy secure account authentication. Your sign-in credentials are handled by the authentication provider and are not stored as plain text by this app.</p>' +
      '<p class="expert-muted">Password changes, passkeys, multi-factor authentication and active-session management are controlled by the sign-in provider where available.</p>' +
      '<button class="expert-action" data-action="logout">Sign out of this device</button></div>';
  };
  title('security','Security and login');
  const originalNotificationsPage = pages.notifications;
  pages.notifications = function() {
    const permission = ('Notification' in window) ? Notification.permission : 'available only through browser settings';
    const original = typeof originalNotificationsPage === 'function' ? originalNotificationsPage() : '<div class="section-label">NOTIFICATIONS</div>';
    return original +
      '<div class="section-label">EXPERT AI DEVICE NOTIFICATIONS</div><div class="expert-card"><h3>Browser notifications</h3>' +
      '<div class="expert-plugin-info"><span>Permission</span><span>' + esc(permission) + '</span></div>' +
      '<button class="expert-action" data-action="expertEnableNotifications">Enable background push notifications</button>' +
      '<button class="expert-action" data-action="expertTestNotifications">Send test notification</button>' +
      '<button class="outline" data-action="expertDisableNotifications">Disable push on this device</button>' +
      '<p class="expert-muted">Push registration uses AppDeploy’s managed notification service and is available only on supported browsers/devices after you grant permission. Email notifications still need a separate email-delivery provider.</p></div>';
  };
  title('notifications','Notifications');
  pages.subscription = function() {
    return '<div class="section-label">PLAN AND BILLING</div><div class="expert-card"><h3>Plan status</h3><p>Expert AI does not currently have a payment provider or subscription checkout connected.</p><p class="expert-muted">No payment will be taken from this page. Plan availability is determined by the AI and storage services connected to this deployment.</p></div>';
  };
  title('subscription','Plan and billing');

  /* In-app browser and bookmark actions. */
  const browserHistory = () => Array.isArray(prefs.browserHistory) ? prefs.browserHistory : [];
  function browserGo(url) {
    let parsed;
    try { parsed = new URL(url); } catch (_) { parsed = new URL('https://' + url); }
    if (!['http:','https:'].includes(parsed.protocol)) { notify('Only HTTP and HTTPS webpages can open here.'); return; }
    const history = browserHistory().slice(0, prefs.browserHistoryIndex == null ? browserHistory().length : prefs.browserHistoryIndex + 1);
    history.push(parsed.toString());
    prefs.browserHistory = history.slice(-30);
    prefs.browserHistoryIndex = prefs.browserHistory.length - 1;
    prefs.browserUrl = parsed.toString();
    prefs.browserShowAddress = false;
    persist();
    nav('expertBrowser');
  }

  /* Recorder-style speech recognition: start, stop, review transcript, then user presses Send. */
  let recognition = null;
  let recording = false;
  let recordingTarget = '#chatInput';
  let recordingBaseText = '';
  let restartRecognition = false;
  function speechConstructor() { return window.SpeechRecognition || window.webkitSpeechRecognition || null; }
  function stopRecording() {
    if (!recording) return;
    recording = false;
    restartRecognition = false;
    prefs.expertRecordingReady = true;
    try { recognition && recognition.stop(); } catch (_) {}
    persist();
    render();
    notify('Recording stopped. Review your transcript and press Send when ready.');
  }
  function startRecording() {
    const Constructor = speechConstructor();
    if (!Constructor) { notify('Speech recognition is not supported by this browser. You can type your message instead.'); return; }
    if (recording) { stopRecording(); return; }
    recordingTarget = currentPage === 'home' ? '#homePrompt' : '#chatInput';
    const initialField = document.querySelector(recordingTarget) || document.querySelector('#chatInput, #homePrompt');
    if (!initialField) { notify('Open a chat before recording.'); return; }
    recordingTarget = '#' + initialField.id;
    recordingBaseText = String(initialField.value || '').trim();
    prefs.expertRecordingReady = false;
    recording = true;
    restartRecognition = true;
    recognition = new Constructor();
    recognition.lang = prefs.speechLanguage || 'en-US';
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.onresult = event => {
      let transcript = '';
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      const field = document.querySelector(recordingTarget);
      if (field) {
        field.value = (recordingBaseText ? recordingBaseText + ' ' : '') + transcript.trim();
        field.dispatchEvent(new Event('input', { bubbles: true }));
      }
    };
    recognition.onerror = event => {
      recording = false;
      restartRecognition = false;
      prefs.expertRecordingReady = true;
      persist();
      render();
      notify('Recording ended: ' + (event.error || 'microphone error') + '. Review any captured text before sending.');
    };
    recognition.onend = () => {
      if (recording && restartRecognition) {
        try { recognition.start(); return; } catch (_) {}
      }
      recording = false;
      restartRecognition = false;
      prefs.expertRecordingReady = true;
      persist();
      render();
      const field = document.querySelector(recordingTarget);
      if (field) field.focus();
      notify('Recording finished. Review your transcript and press Send when ready.');
    };
    try {
      render();
      recognition.start();
      notify('Recording started. Tap Stop when finished; Expert AI will not send until you press Send.');
    } catch (_) {
      recording = false;
      restartRecognition = false;
      prefs.expertRecordingReady = false;
      notify('The microphone could not start. Check browser permission.');
      render();
    }
  }

  let voiceRecognition = null;
  let voiceEnded = true;
  function voiceChatStart() {
    const Constructor = speechConstructor();
    if (!Constructor) { notify('Live voice chat needs browser speech-recognition support.'); return; }
    voiceEnded = false;
    nav('expertVoiceChat');
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    voiceRecognition = new Constructor();
    voiceRecognition.lang = prefs.speechLanguage || 'en-US';
    voiceRecognition.continuous = true;
    voiceRecognition.interimResults = false;
    voiceRecognition.onresult = async event => {
      const last = event.results[event.results.length - 1];
      if (!last || !last.isFinal || voiceEnded) return;
      const said = last[0].transcript.trim();
      if (!said) return;
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      prefs.voiceChatStatus = 'Thinking…';
      render();
      try {
        const response = await live.request('chat.send', {
          message: said, chatId: prefs.activeChatId || null,
          thinkingMode: prefs.reasoningMode === 'high' ? 'DEEP' : 'FAST',
          attachmentIds: [], temporary: false
        });
        if (response.chat) {
          prefs.activeChatId = response.chat.id;
          prefs.chatHistory = response.chat.messages.map(item => ({
            role: item.role === 'assistant' ? 'assistant' : 'user',
            text: item.content || item.text || ''
          }));
        }
        const answer = response.chat && response.chat.messages && response.chat.messages[response.chat.messages.length - 1];
        const spoken = answer && answer.content ? answer.content : 'I could not prepare a reply.';
        prefs.voiceChatStatus = 'Speaking…';
        render();
        const utterance = new SpeechSynthesisUtterance(spoken);
        utterance.lang = prefs.speechLanguage || 'en-US';
        utterance.onend = () => { if (!voiceEnded) { prefs.voiceChatStatus = 'Listening…'; render(); } };
        window.speechSynthesis.speak(utterance);
      } catch (error) {
        prefs.voiceChatStatus = 'Connection problem — try speaking again.';
        notify(error.message || 'Voice request failed.');
        render();
      }
    };
    voiceRecognition.onerror = () => { if (!voiceEnded) notify('Voice recognition stopped. Check microphone permission.'); };
    voiceRecognition.onend = () => { if (!voiceEnded) { try { voiceRecognition.start(); } catch (_) {} } };
    try { voiceRecognition.start(); prefs.voiceChatStatus = 'Listening…'; render(); }
    catch (_) { voiceEnded = true; notify('Could not start voice recognition.'); }
  }
  pages.expertVoiceChat = function() {
    return '<div class="expert-voice-shell"><div class="expert-voice-orb ' + (prefs.voiceChatStatus === 'Speaking…' ? 'is-speaking' : '') + '"></div>' +
      '<p>' + esc(prefs.voiceChatStatus || 'Listening…') + '</p><button class="expert-action" data-action="expertEndVoice">End chat</button></div>';
  };
  title('expertVoiceChat','Voice chat');

  /* QR scanner with browser BarcodeDetector and manual input fallback. */
  let scanStream = null;
  let scanFrame = 0;
  async function runScanner() {
    if (!('BarcodeDetector' in window)) { notify('QR scanning is not supported by this browser. Paste the code or link into the text box instead.'); return; }
    try {
      scanStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      const video = document.getElementById('expertScannerVideo');
      if (!video) return;
      video.srcObject = scanStream;
      const detector = new BarcodeDetector({ formats: ['qr_code'] });
      const scan = async () => {
        if (!scanStream || video.readyState < 2) { scanFrame = requestAnimationFrame(scan); return; }
        try {
          const codes = await detector.detect(video);
          if (codes.length) {
            const field = document.getElementById('expertScanResult');
            if (field) field.value = codes[0].rawValue;
            stopScanner();
            notify('QR code scanned.');
            return;
          }
        } catch (_) {}
        scanFrame = requestAnimationFrame(scan);
      };
      scanFrame = requestAnimationFrame(scan);
    } catch (_) { notify('Camera permission was not granted or the camera is unavailable.'); }
  }
  function stopScanner() {
    if (scanFrame) cancelAnimationFrame(scanFrame);
    if (scanStream) scanStream.getTracks().forEach(track => track.stop());
    scanStream = null;
  }

  /* External provider sites open outside Expert AI; OAuth is used only where configured. */
  async function installPlugin(name) {
    const row = integration(name);
    const provider = row && row.provider;
    if (provider && row.credentials_ready) {
      await live.request('integrations.connect', { provider });
      return;
    }
    const record = catalogueRecord(name);
    const link = urlForPlugin(name, record);
    prefs.pluginInstallPending = name;
    prefs.pluginInstallUrl = link;
    persist();
    const popup = window.open(link, '_blank', 'noopener,noreferrer');
    if (!popup) {
      notify('Your browser blocked the provider sign-in window. Allow pop-ups for Expert AI to continue.');
      return;
    }
    notify('Opened the provider sign-in page outside Expert AI. Connection is shown only after an authorised callback.');
  }

  const oldHandleAction = handleAction;
  handleAction = function(action, element) {
    if (action === 'composerPlus') {
      oldHandleAction(action, element);
      window.requestAnimationFrame(() => {
        if (!modalLayer) return;
        modalLayer.hidden = false;
        modalLayer.style.setProperty('position', 'fixed', 'important');
        modalLayer.style.setProperty('left', '10px', 'important');
        modalLayer.style.setProperty('right', 'auto', 'important');
        modalLayer.style.setProperty('top', 'auto', 'important');
        modalLayer.style.setProperty('bottom', 'calc(env(safe-area-inset-bottom,0px) + 80px)', 'important');
        modalLayer.style.setProperty('width', 'min(260px, calc(100vw - 116px))', 'important');
        modalLayer.style.setProperty('max-width', 'calc(100vw - 116px)', 'important');
        modalLayer.style.setProperty('max-height', '56vh', 'important');
        modalLayer.style.setProperty('overflow-y', 'auto', 'important');
        modalLayer.style.setProperty('z-index', '100000', 'important');
        modalLayer.style.setProperty('background', '#242424', 'important');
        modalLayer.style.setProperty('border', '1px solid #484848', 'important');
        modalLayer.style.setProperty('border-radius', '16px', 'important');
        modalLayer.style.setProperty('box-shadow', '0 14px 40px rgba(0,0,0,.5)', 'important');
        modalLayer.style.setProperty('pointer-events', 'auto', 'important');
        if (!modalLayer.dataset.expertOutsideDismiss) {
          modalLayer.dataset.expertOutsideDismiss = 'true';
          document.addEventListener('pointerdown', event => {
            if (modalLayer.hidden) return;
            const target = event.target;
            if (!modalLayer.contains(target) && !target.closest?.('[data-action="composerPlus"]')) {
              modalLayer.hidden = true;
            }
          }, true);
        }
        Array.from(modalLayer.querySelectorAll('button')).forEach(button => {
          if (button.textContent.trim().toLowerCase() === 'cancel') button.remove();
        });
      });
      return;
    }
    if (action === 'sendChat' || action === 'sendHome') { live.sendMessage(action); return; }
    if (action === 'expertThinkToggle') {
      const turningOff = prefs.aiResponseMode === 'ADVANCED' || prefs.reasoningMode === 'high';
      prefs.aiResponseMode = turningOff ? 'STANDARD' : 'ADVANCED';
      prefs.reasoningMode = turningOff ? 'standard' : 'high';
      prefs.preferredModel = turningOff ? 'FAST' : 'DEEP';
      persist(); render(); return;
    }
    if (action === 'voiceInput' || action === 'dictate') { startRecording(); return; }
    if (action === 'expertStopRecording') { stopRecording(); return; }
    if (action === 'expertClearRecording') {
      const field = document.querySelector(recordingTarget) || document.querySelector('#chatInput, #homePrompt');
      if (field) { field.value = ''; field.dispatchEvent(new Event('input', { bubbles: true })); }
      prefs.expertRecordingReady = false;
      recordingBaseText = '';
      persist(); render(); return;
    }
    if (action === 'expertSaveAccount') {
      const country = document.getElementById('expertPhoneCountry');
      const phone = document.getElementById('expertPhoneNumber');
      const dob = document.getElementById('expertBirthDate');
      if (country) {
        const rawCountry = country.value.trim().replace(/[^0-9+]/g, '');
        prefs.phoneCountry = rawCountry ? (rawCountry.startsWith('+') ? rawCountry : '+' + rawCountry) : '+234';
      }
      if (phone) prefs.contactPhone = phone.value.replace(/^0+/, '').replace(/\D/g, '');
      prefs.trustedContactAdded = !!(prefs.phoneCountry && prefs.contactPhone);
      if (dob && dob.value) {
        const age = calcAge(dob.value);
        if (age < 0 || age > 125) { notify('Enter a valid date of birth.'); return; }
        prefs.birthDate = dob.value;
        prefs.computedAge = age;
      }
      persist(); render(); notify('Account details saved. Contact details are not verified.'); return;
    }
    if (action === 'expertSaveAge') {
      const dob = document.getElementById('expertBirthDate');
      const age = dob && dob.value ? calcAge(dob.value) : -1;
      if (age < 0 || age > 125) { notify('Enter a valid date of birth.'); return; }
      prefs.birthDate = dob.value;
      prefs.computedAge = age;
      prefs.ageAttestedAt = new Date().toISOString();
      prefs.demoAgeVerified = true;
      prefs.demoAgeVerified = true;
      persist(); render(); notify('Age confirmation saved as a self-declaration.'); return;
    }
    if (action === 'expertSetAccent') {
      prefs.accent = element && element.dataset.accent || 'Default';
      persist(); render(); return;
    }
    if (action === 'expertSelectModelMode') {
      const mode = ['LIVE','ADVANCED','STANDARD'].includes(element?.dataset?.mode || '') ? element.dataset.mode : 'STANDARD';
      prefs.aiResponseMode = mode;
      prefs.preferredModel = mode === 'ADVANCED' ? 'DEEP' : 'FAST';
      prefs.reasoningMode = mode === 'ADVANCED' ? 'high' : 'standard';
      persist(); render(); return;
    }
    if (action === 'expertSaveLanguage') {
      prefs.speechLanguage = document.getElementById('expertSpeechLanguage')?.value || 'en-US';
      prefs.aiResponseMode = ['LIVE','ADVANCED','STANDARD'].includes(prefs.aiResponseMode) ? prefs.aiResponseMode : 'STANDARD';
      prefs.preferredModel = prefs.aiResponseMode === 'ADVANCED' ? 'DEEP' : 'FAST';
      prefs.reasoningMode = prefs.aiResponseMode === 'ADVANCED' ? 'high' : 'standard';
      persist(); render(); notify('Language and response mode saved.'); return;
    }
    if (action === 'expertSaveAdTopics') {
      prefs.adTopics = [...document.querySelectorAll('.expert-ad-topic:checked')].map(el => el.value);
      persist(); render(); notify('Ad topic preferences saved.'); return;
    }
    if (action === 'expertEnableNotifications') {
      live.request('notifications.enable', {}).then(result => {
        const permission = result.permission || 'unknown';
        prefs.browserNotificationPermission = permission;
        prefs.push = result.ok === true;
        prefs.pushPlatform = result.platform || 'unknown';
        prefs.pushMode = result.mode || 'unknown';
        persist(); render();
        if (result.ok === true) notify('Background push notifications are enabled for this device.');
        else notify('Push notifications could not be enabled. Check device support and notification permission.');
      }).catch(error => notify(error.message || 'Push notification registration could not be completed.'));
      return;
    }
    if (action === 'expertOpenAssistantSettings') {
      try {
        window.location.href = 'intent:#Intent;action=android.settings.ASSISTANT_SETTINGS;end';
      } catch (_) {
        openModal('Android assistant settings', 'Open your device Settings, then Apps → Default apps → Digital assistant app. Select the assistant your device allows.', [{label:'Got it',value:'expertCloseModal'}]);
      }
      return;
    }
    if (action === 'parental') {
      live.request('family.list', {}).then(data => {
        prefs.familyMembers = data.members || [];
        prefs.familyLinkedTo = data.linkedTo || [];
        persist(); nav('parental');
      }).catch(error => { notify(error.message || 'Family settings could not be loaded.'); nav('parental'); });
      return;
    }
    if (action === 'expertCreateFamilyInvite') {
      const role = document.getElementById('expertFamilyRole')?.value === 'child' ? 'child' : 'member';
      live.request('family.create', {role}).then(result => {
        prefs.familyInviteCode = result.code;
        persist(); render(); notify('Family invite code created. Share it only with the person you intend to link.');
      }).catch(error => notify(error.message || 'Invite could not be created.'));
      return;
    }
    if (action === 'expertJoinFamily') {
      const code = document.getElementById('expertFamilyJoinCode')?.value || '';
      live.request('family.join', {code}).then(async result => {
        prefs.familyLinkNotice = result.ownerName || 'Family account';
        const data = await live.request('family.list', {});
        prefs.familyMembers = data.members || []; prefs.familyLinkedTo = data.linkedTo || [];
        persist(); render(); notify('Family account linked.');
      }).catch(error => notify(error.message || 'Invite could not be joined.'));
      return;
    }
    if (action === 'expertCopyFamilyCode') {
      if (prefs.familyInviteCode && navigator.clipboard?.writeText) navigator.clipboard.writeText(prefs.familyInviteCode).then(() => notify('Invite code copied.')).catch(() => notify('Copy is not available in this browser.'));
      return;
    }
    if (action === 'expertSaveFamilyControls') {
      const memberId = element?.dataset?.memberId || '';
      const safe = document.querySelector('.expert-family-safe[data-member-id="' + memberId + '"]');
      const images = document.querySelector('.expert-family-images[data-member-id="' + memberId + '"]');
      live.request('family.controls', {memberId, safe_mode: !!safe?.checked, allow_images: !!images?.checked})
        .then(() => { notify('Family settings saved.'); return live.request('family.list', {}); })
        .then(data => { prefs.familyMembers = data.members || []; persist(); render(); })
        .catch(error => notify(error.message || 'Family settings could not be saved.'));
      return;
    }
    if (action === 'expertBrowserGo' || action === 'expertBrowserAddress' ||
        action === 'expertBrowserBack' || action === 'expertBrowserForward' ||
        action === 'expertBrowserReload' || action === 'expertBrowserSave' ||
        action === 'expertOpenBookmark') {
      notify('The built-in browser has been removed from Expert AI.');
      return;
    }
    if (action === 'expertStartScanner') { runScanner(); return; }
    if (action === 'expertStopScanner') { stopScanner(); return; }
    if (action === 'expertEndVoice') {
      voiceEnded = true;
      if (voiceRecognition) try { voiceRecognition.stop(); } catch (_) {}
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      prefs.voiceChatStatus = '';
      nav('chat');
      return;
    }
    if (action === 'expertPluginPrompt') {
      const prompt = element?.dataset?.prompt || 'Help me manage plugins and integrations.';
      prefs.composerDraft = prompt;
      nav('chat');
      const field = document.getElementById('chatInput');
      if (field) field.value = prompt;
      return;
    }
    if (action === 'expertPluginSkill') {
      prefs.pluginManagementSkillEnabled = prefs.pluginManagementSkillEnabled === false;
      persist(); render(); return;
    }
    if (action === 'expertPluginPermissions') {
      prefs.expertPluginAction = 'Get app permissions'; persist(); nav('pluginActionDetails'); return;
    }
    if (action === 'expertPluginDependencies') {
      prefs.expertPluginAction = 'Get plugin dependencies'; persist(); nav('pluginActionDetails'); return;
    }
    if (action === 'expertPluginUninstall') {
      prefs.expertPluginAction = 'Uninstall app'; persist(); nav('pluginActionDetails'); return;
    }
    if (action === 'expertPluginPermissionMode') {
      prefs.expertPluginAction = 'Update app permissions'; persist(); nav('pluginActionDetails'); return;
    }
    if (action === 'expertSetPluginPermission') {
      prefs.pluginPermissionMode = element?.dataset?.mode || 'always_ask';
      persist(); render(); return;
    }
    if (action === 'expertConfirmPluginUninstall') {
      openModal('Remove Plugin Management?', 'This removes the Plugin Management shortcut from this app. It does not uninstall external software or revoke external provider access.', [
        {label:'Remove local entry',value:'expertRemovePluginManagement'}, {label:'Cancel',value:'expertCloseModal'}
      ]);
      return;
    }
    if (action === 'expertInstallPlugin' || action === 'v8InstallConnector' || action === 'pluginInstall') {
      const name = element?.dataset?.plugin || currentPluginName();
      installPlugin(name).catch(error => notify(error.message || 'Provider installation could not start.'));
      return;
    }
    return oldHandleAction(action, element);
  };
  const oldChoice = clickChoice;
  clickChoice = function(value) {
    if (value === 'expertCloseModal') { modalLayer.hidden = true; return; }
    if (value === 'expertRemovePluginManagement') {
      modalLayer.hidden = true;
      prefs.pluginManagementRemoved = true;
      persist(); nav('plugins'); return;
    }
    return oldChoice(value);
  };

  function calcAge(value) {
    const dob = new Date(value + 'T00:00:00');
    if (Number.isNaN(dob.getTime())) return -1;
    const now = new Date();
    let age = now.getFullYear() - dob.getFullYear();
    const month = now.getMonth() - dob.getMonth();
    if (month < 0 || (month === 0 && now.getDate() < dob.getDate())) age--;
    return age;
  }
  document.addEventListener('change', event => {
    const target = event.target;
    if (target && target.classList && target.classList.contains('expert-ad-topic')) {
      prefs.adTopics = Array.from(document.querySelectorAll('.expert-ad-topic:checked')).map(item => item.value);
      persist();
      notify('Ad topic preference saved.');
    }
  }, true);
  document.addEventListener('input', event => {
    if (event.target?.id === 'expertBirthDate') {
      const age = calcAge(event.target.value);
      const preview = document.getElementById('expertAgePreview');
      if (preview) preview.textContent = 'Calculated age: ' + (age >= 0 ? age : 'Not calculated');
    }
  });

  document.addEventListener('change', async event => {
    const target = event.target;
    if (target?.id === 'expertAvatarInput' && target.files && target.files[0]) {
      const file = target.files[0];
      if (!file.type.startsWith('image/')) { notify('Choose an image file.'); return; }
      if (file.size > 4 * 1024 * 1024) { notify('Profile picture must be 4 MB or smaller.'); return; }
      try {
        const bytes = new Uint8Array(await file.arrayBuffer());
        let binary = '';
        for (let offset = 0; offset < bytes.length; offset += 0x8000) binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
        const result = await live.request('files.upload', {
          name: 'profile-picture-' + file.name.replace(/[^a-zA-Z0-9._-]/g,'_'),
          contentType: file.type, size: file.size, contentBase64: btoa(binary), temporary: false
        });
        prefs.profilePicturePath = result.path;
        prefs.profilePictureUrl = result.url || '';
        persist();
        await live.request('preferences.save', {preferences:{profilePicturePath:prefs.profilePicturePath}});
        notify('Profile picture saved to your account.');
        render();
      } catch (error) { notify(error.message || 'Profile picture upload failed.'); }
    }
    if (target?.id === 'expertSkillEnabled') {
      prefs.pluginManagementSkillEnabled = target.checked; persist();
    }
  }, true);

  /* Start the pending queue after the account context has been restored. */
  window.addEventListener('load', () => { if (readOutbox().length) drainOutbox(); });
  setAccent();
})();