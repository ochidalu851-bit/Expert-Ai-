/* Expert AI message actions. */
(() => {
  'use strict';
  const live = window.EXPERT_AI_LIVE;
  if (!live || document.documentElement.dataset.expertMessageActions === 'ready') return;
  document.documentElement.dataset.expertMessageActions = 'ready';

  const icons = {
    copy: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="12" height="12" rx="2"></rect><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"></path></svg>',
    like: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 10v11H3V10h4Zm0 0 5-7c1.5 0 2.5 1.2 2 2.7L13 10h5.7a2 2 0 0 1 2 2.3l-1.4 7a2 2 0 0 1-2 1.7H7"></path></svg>',
    dislike: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 14V3H3v11h4Zm0 0 5 7c1.5 0 2.5-1.2 2-2.7L13 14h5.7a2 2 0 0 0 2-2.3l-1.4-7a2 2 0 0 0-2-1.7H7"></path></svg>',
    speak: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4V5Z"></path><path d="M15 9a5 5 0 0 1 0 6m3-9a9 9 0 0 1 0 12"></path></svg>',
    share: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><path d="m8.7 10.7 6.6-4.4m-6.6 9 6.6 4.1"></path></svg>',
    more: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="5" r="1.7"></circle><circle cx="12" cy="12" r="1.7"></circle><circle cx="12" cy="19" r="1.7"></circle></svg>',
  };

  const style = document.createElement('style');
  style.textContent = [
    '.expert-message-actions{display:flex;width:100%;align-items:center;gap:5px;max-width:100%;margin:4px 0 10px 2px;color:#a7a7a7}',
    '.expert-message-action[data-expert-message-action="more"]{margin-left:auto}',
    '.expert-message-action{display:inline-flex;align-items:center;justify-content:center;width:33px;height:32px;padding:0;border:0;border-radius:9px;background:transparent;color:inherit;cursor:pointer}',
    '.expert-message-action:hover,.expert-message-action.is-active{background:#343434;color:#fff}',
    '.expert-message-action svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}',
    '.expert-context-menu{position:fixed;z-index:200000;min-width:190px;max-width:calc(100vw - 20px);padding:6px;border:1px solid #4a4a4a;border-radius:14px;background:#252525;box-shadow:0 14px 38px rgba(0,0,0,.52);display:grid;gap:3px}',
    '.expert-context-menu button{width:100%;min-height:42px;padding:9px 12px;border:0;border-radius:9px;background:transparent;color:#f4f4f4;text-align:left;font:500 13px system-ui;cursor:pointer}',
    '.expert-context-menu button:hover{background:#3a3a3a}',
    '.expert-context-menu-beside{transform-origin:top right}',
    '.expert-jump-latest{position:fixed;z-index:10000;right:18px;bottom:calc(env(safe-area-inset-bottom,0px) + 92px);min-height:40px;padding:9px 14px;border:1px solid #555;border-radius:22px;background:#303030;color:#fff;font:600 12px system-ui;box-shadow:0 5px 20px #0008}',
    '.expert-message-dialog-backdrop{position:fixed;inset:0;z-index:210000;display:grid;place-items:center;padding:18px;background:#000a}',
    '.expert-message-dialog{width:min(100%,520px);padding:16px;border:1px solid #4a4a4a;border-radius:18px;background:#242424;color:#fff;box-shadow:0 18px 50px #0009}',
    '.expert-message-dialog h3{margin:0 0 12px;font:650 16px system-ui}',
    '.expert-message-dialog textarea{display:block;width:100%;min-height:132px;resize:vertical;padding:12px;border:1px solid #505050;border-radius:12px;background:#151515;color:#fff;font:14px/1.5 system-ui}',
    '.expert-message-dialog-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:12px}',
    '.expert-message-dialog-actions button{min-height:40px;padding:8px 14px;border:1px solid #555;border-radius:10px;background:#333;color:#fff;font:600 13px system-ui}',
    '.expert-message-dialog-actions button.primary{border-color:transparent;background:var(--expert-accent,#5b83ff)}'
  ].join('');
  document.head.appendChild(style);

  let activeMenu = null;
  let longPressTimer = 0;
  let longPressBubble = null;
  let longPressStart = null;
  let suppressNextClick = false;
  let lastRenderedPage = '';
  let lastRenderedSession = '';

  const temporary = () => !!prefs.temporaryChat || prefs.saveHistory === false;
  const historyList = () => temporary() ? (prefs.temporaryMessages || []) : (prefs.chatHistory || []);
  const textOf = item => String(item && (item.text || item.content) || '');
  const apiMessages = items => (items || []).map(item => ({
    role: item.role === 'assistant' ? 'assistant' : 'user',
    content: textOf(item)
  })).slice(-30);
  const notify = message => live.notify ? live.notify(message) : toast(message);
  const closeMenu = () => {
    if (activeMenu) activeMenu.remove();
    activeMenu = null;
    document.removeEventListener('click', closeMenuOnOutside, true);
  };
  function closeMenuOnOutside(event) {
    if (activeMenu && !activeMenu.contains(event.target)) closeMenu();
  }
  function showMenu(anchor, options, alignRight, placeBeside) {
    closeMenu();
    const menu = document.createElement('div');
    menu.className = 'expert-context-menu' + (placeBeside ? ' expert-context-menu-beside' : '');
    menu.setAttribute('role', 'menu');
    options.forEach(option => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = option.label;
      button.setAttribute('role', 'menuitem');
      button.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        closeMenu();
        option.run();
      });
      menu.appendChild(button);
    });

    const rect = anchor.getBoundingClientRect();
    const composer = document.querySelector('.chat-composer.nexa-composer');
    const composerTop = composer
      ? composer.getBoundingClientRect().top
      : window.innerHeight - 84;
    const usableBottom = Math.max(16, Math.min(window.innerHeight - 8, composerTop - 10));

    menu.style.visibility = 'hidden';
    document.body.appendChild(menu);
    const bounds = menu.getBoundingClientRect();
    menu.style.maxHeight = Math.max(96, usableBottom - 16) + 'px';
    menu.style.overflowY = 'auto';

    let left;
    if (placeBeside) {
      const rightCandidate = rect.right + 8;
      const leftCandidate = rect.left - bounds.width - 8;
      if (rightCandidate + bounds.width <= window.innerWidth - 8) {
        left = rightCandidate;
      } else if (leftCandidate >= 8) {
        left = leftCandidate;
      } else {
        left = Math.max(8, Math.min(window.innerWidth - bounds.width - 8, rect.right - bounds.width));
      }
    } else {
      left = alignRight
        ? Math.max(8, Math.min(window.innerWidth - bounds.width - 8, rect.right - bounds.width))
        : Math.max(8, Math.min(window.innerWidth - bounds.width - 8, rect.left));
    }

    const maxTop = Math.max(8, usableBottom - bounds.height);
    let top = Math.max(8, Math.min(maxTop, rect.top));
    if (placeBeside && rect.top > maxTop) {
      top = Math.max(8, Math.min(maxTop, rect.top - bounds.height - 8));
    }

    menu.style.left = left + 'px';
    menu.style.top = top + 'px';
    menu.style.visibility = 'visible';
    activeMenu = menu;
    window.setTimeout(() => document.addEventListener('click', closeMenuOnOutside, true), 0);
  }
  async function copyText(value) {
    const text = String(value || '');
    if (!text) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const field = document.createElement('textarea');
        field.value = text;
        field.style.position = 'fixed';
        field.style.opacity = '0';
        document.body.appendChild(field);
        field.select();
        const copied = document.execCommand('copy');
        field.remove();
        if (!copied) throw new Error('Copy unavailable');
      }
      notify('Copied to clipboard.');
    } catch (_) { notify('Copy is not available in this browser.'); }
  }
  async function shareText(value) {
    const text = String(value || '');
    if (!text) return;
    if (navigator.share) {
      try { await navigator.share({ title: 'Expert AI message', text }); return; }
      catch (error) { if (error && error.name === 'AbortError') return; }
    }
    await copyText(text);
  }
  function speakText(text) {
    if (!text) return;
    live.request('voice.synthesize', { text }).then(result => {
      return new Audio('data:' + result.contentType + ';base64,' + result.audioBase64).play();
    }).catch(() => {
      if ('speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined') {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = prefs.speechLanguage || 'en-US';
        window.speechSynthesis.speak(utterance);
        notify('Reading aloud with your device voice.');
      } else notify('Speech playback is not available on this device.');
    });
  }
  function messageKey(index) {
    return String(prefs.activeChatId || prefs.activeConversationToken || 'new') + ':' + index;
  }
  function queuedForCurrentConversation() {
    try {
      const user = live.getUser();
      const key = 'expertAIOutbox:' + (user && user.userId ? user.userId : 'guest');
      return JSON.parse(localStorage.getItem(key) || '[]').some(item =>
        !item.sessionKey || item.sessionKey === prefs.activeConversationToken
      );
    } catch (_) { return false; }
  }
  function applyChatResult(result, isTemporary) {
    const chat = result && result.chat;
    if (!chat) return;
    const mapped = (chat.messages || []).map(item => ({
      role: item.role === 'assistant' ? 'assistant' : 'user',
      text: item.content || item.text || '',
      created_at: item.created_at
    }));
    if (isTemporary) prefs.temporaryMessages = mapped;
    else {
      prefs.chatHistory = mapped;
      prefs.activeChatId = chat.id || null;
      if (chat.id) prefs.liveChats = [chat, ...(prefs.liveChats || []).filter(item => item.id !== chat.id)];
    }
    live.persist();
    render();
  }
  async function retryAssistant(index) {
    const list = historyList();
    if (queuedForCurrentConversation()) {
      notify('Wait for pending messages to finish before retrying this response.');
      return;
    }
    if (index !== list.length - 1 || !list[index] || list[index].role !== 'assistant') {
      notify('Retry is available for the latest assistant response only.');
      return;
    }
    try {
      const isTemporary = temporary();
      const result = await live.request('chat.send', {
        message: '',
        chatId: isTemporary ? null : (prefs.activeChatId || null),
        retryLastAssistant: true,
        messages: isTemporary ? apiMessages(list) : undefined,
        thinkingMode: prefs.aiResponseMode === 'ADVANCED' ? 'DEEP' : 'FAST',
        responseMode: prefs.aiResponseMode || 'STANDARD',
        temporary: isTemporary
      });
      applyChatResult(result, isTemporary);
      notify('Response regenerated.');
    } catch (error) {
      notify(error && error.message ? error.message : 'The response could not be regenerated.');
    }
  }
  function branchConversation(index) {
    const list = historyList();
    const branch = list.slice(0, index + 1).map(item => ({
      role: item.role === 'assistant' ? 'assistant' : 'user',
      text: textOf(item),
      created_at: item.created_at
    }));
    if (!branch.length) return;
    const isTemporary = temporary();
    prefs.activeChatId = null;
    prefs.activeConversationToken = 'branch-' + Date.now() + '-' + Math.random().toString(36).slice(2);
    prefs.chatHistory = branch;
    prefs.temporaryMessages = [];
    prefs.temporaryChat = false;
    prefs.branchContextMessages = apiMessages(branch);
    prefs.pendingLiveAttachmentIds = [];
    prefs.pendingChatFiles = [];
    prefs.expertShowJumpToLatest = false;
    live.persist();
    nav('chat');
    notify('Branch started in a separate chat.');
  }
  async function editUserMessage(index) {
    const list = historyList();
    const current = list[index];
    if (!current || current.role !== 'user') return;
    if (queuedForCurrentConversation()) {
      notify('Wait for pending messages to finish before editing a message.');
      return;
    }
    const backdrop = document.createElement('div');
    backdrop.className = 'expert-message-dialog-backdrop';
    const panel = document.createElement('div');
    panel.className = 'expert-message-dialog';
    const heading = document.createElement('h3');
    heading.textContent = 'Edit message';
    const field = document.createElement('textarea');
    field.value = textOf(current);
    field.setAttribute('aria-label', 'Edit your message');
    const controls = document.createElement('div');
    controls.className = 'expert-message-dialog-actions';
    const cancel = document.createElement('button');
    cancel.type = 'button';
    cancel.textContent = 'Cancel';
    const save = document.createElement('button');
    save.type = 'button';
    save.className = 'primary';
    save.textContent = 'Save and resend';
    controls.append(cancel, save);
    panel.append(heading, field, controls);
    backdrop.appendChild(panel);
    document.body.appendChild(backdrop);
    cancel.addEventListener('click', () => backdrop.remove());
    backdrop.addEventListener('click', event => { if (event.target === backdrop) backdrop.remove(); });
    field.focus();
    field.setSelectionRange(field.value.length, field.value.length);
    save.addEventListener('click', async () => {
      const text = field.value.trim();
      if (!text) { notify('Write a message before resending.'); return; }
      if (text.length > 12000) { notify('Message is too long. Limit: 12,000 characters.'); return; }
      save.disabled = true;
      save.textContent = 'Regenerating…';
      try {
        const isTemporary = temporary();
        const result = await live.request('chat.send', {
          message: text,
          chatId: isTemporary ? null : (prefs.activeChatId || null),
          editUserMessageIndex: index,
          messages: isTemporary ? apiMessages(list) : undefined,
          thinkingMode: prefs.aiResponseMode === 'ADVANCED' ? 'DEEP' : 'FAST',
          responseMode: prefs.aiResponseMode || 'STANDARD',
          temporary: isTemporary
        });
        backdrop.remove();
        applyChatResult(result, isTemporary);
        notify('Edited message sent and the reply updated.');
      } catch (error) {
        save.disabled = false;
        save.textContent = 'Save and resend';
        notify(error && error.message ? error.message : 'The edited message could not be sent.');
      }
    });
  }
  function userMenuOptions(bubble, index) {
    const text = bubble.innerText || bubble.textContent || '';
    return [
      { label: 'Copy', run: () => copyText(text) },
      { label: 'Select', run: () => {
        const selection = window.getSelection();
        if (selection) {
          selection.removeAllRanges();
          const range = document.createRange();
          range.selectNodeContents(bubble);
          selection.addRange(range);
        }
      }},
      { label: 'Edit message', run: () => editUserMessage(index) },
      { label: 'Share', run: () => shareText(text) }
    ];
  }
  const assistantMenuOptions = index => [
    { label: 'Branch in new chat', run: () => branchConversation(index) },
    { label: 'Retry', run: () => retryAssistant(index) }
  ];
  function actionButton(action, label, icon, index, active) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'expert-message-action' + (active ? ' is-active' : '');
    button.dataset.expertMessageAction = action;
    button.dataset.messageIndex = String(index);
    button.setAttribute('aria-label', label);
    button.title = label;
    button.innerHTML = icon;
    return button;
  }
  function removeLegacyAssistantSymbols(bubble) {
    const symbols = new Set(['♧', '◖', '↗']);
    bubble.querySelectorAll('button,[role="button"]').forEach(button => {
      if (symbols.has((button.textContent || '').trim()) ||
          symbols.has((button.getAttribute('aria-label') || '').trim())) button.remove();
    });
    const sibling = bubble.nextElementSibling;
    if (sibling && /action|toolbar/i.test(String(sibling.className || '')) &&
        !sibling.classList.contains('expert-message-actions')) {
      sibling.remove();
    }
  }
  function decorateMessages() {
    if (typeof currentPage === 'undefined' || currentPage !== 'chat' || typeof screen === 'undefined') return;
    const thread = screen.querySelector('.chat-thread');
    if (!thread) return;
    thread.querySelectorAll('.expert-message-actions').forEach(row => row.remove());
    Array.from(thread.querySelectorAll('.user-bubble,.assistant-bubble')).forEach((bubble, index) => {
      const role = bubble.classList.contains('assistant-bubble') ? 'assistant' : 'user';
      bubble.dataset.expertMessageIndex = String(index);
      bubble.dataset.expertMessageRole = role;
      if (role !== 'assistant') return;
      removeLegacyAssistantSymbols(bubble);
      const row = document.createElement('div');
      row.className = 'expert-message-actions';
      const selected = (prefs.messageFeedback || {})[messageKey(index)] || '';
      row.append(
        actionButton('copy', 'Copy response', icons.copy, index, false),
        actionButton('like', 'Like response', icons.like, index, selected === 'like'),
        actionButton('dislike', 'Dislike response', icons.dislike, index, selected === 'dislike'),
        actionButton('read', 'Read aloud', icons.speak, index, false),
        actionButton('share', 'Share response', icons.share, index, false),
        actionButton('more', 'More actions', icons.more, index, false)
      );
      bubble.insertAdjacentElement('afterend', row);
    });
  }
  function ensureJumpButton() {
    const existing = document.querySelector('.expert-jump-latest');
    if (!prefs.expertShowJumpToLatest || typeof currentPage === 'undefined' || currentPage !== 'chat') {
      if (existing) existing.remove();
      return;
    }
    if (existing) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'expert-jump-latest';
    button.textContent = '↓  Jump to latest';
    button.addEventListener('click', () => {
      if (typeof screen !== 'undefined') screen.scrollTo({ top: screen.scrollHeight, behavior: 'smooth' });
      prefs.expertShowJumpToLatest = false;
      live.persist();
      window.setTimeout(ensureJumpButton, 250);
    });
    (typeof screen !== 'undefined' ? screen : document.body).appendChild(button);
  }
  function nearBottom() {
    return typeof screen === 'undefined' ||
      screen.scrollHeight - screen.clientHeight - screen.scrollTop < 90;
  }

  const previousRender = render;
  render = function() {
    const current = typeof currentPage === 'undefined' ? '' : currentPage;
    const session = prefs.activeConversationToken || '';
    const wasChat = current === 'chat' && lastRenderedPage === 'chat';
    const switchedSession = wasChat && session !== lastRenderedSession;
    const previousTop = typeof screen !== 'undefined' ? screen.scrollTop : 0;
    const forceLatest = !!prefs.expertForceScrollToLatest;
    const pinned = !wasChat || switchedSession || forceLatest || nearBottom();
    previousRender();
    lastRenderedPage = currentPage;
    lastRenderedSession = prefs.activeConversationToken || '';
    if (currentPage !== 'chat') { ensureJumpButton(); return; }
    if (!wasChat || switchedSession) prefs.expertShowJumpToLatest = false;
    window.requestAnimationFrame(() => {
      if (currentPage !== 'chat' || typeof screen === 'undefined') return;
      screen.scrollTop = pinned ? screen.scrollHeight : previousTop;
      if (forceLatest) prefs.expertForceScrollToLatest = false;
      decorateMessages();
      ensureJumpButton();
    });
  };

  if (typeof screen !== 'undefined') screen.addEventListener('scroll', () => {
    if (currentPage === 'chat' && nearBottom() && prefs.expertShowJumpToLatest) {
      prefs.expertShowJumpToLatest = false;
      live.persist();
      ensureJumpButton();
    }
  }, { passive: true });

  document.addEventListener('pointerdown', event => {
    const bubble = event.target && event.target.closest && event.target.closest('.chat-thread .user-bubble, .chat-thread .assistant-bubble');
    if (!bubble || event.button !== 0) return;
    closeMenu();
    clearTimeout(longPressTimer);
    longPressBubble = bubble;
    longPressStart = { x: event.clientX, y: event.clientY };
    longPressTimer = window.setTimeout(() => {
      if (!longPressBubble || !longPressBubble.isConnected) return;
      const index = Number(longPressBubble.dataset.expertMessageIndex);
      suppressNextClick = true;
      window.setTimeout(() => { suppressNextClick = false; }, 700);
      const assistantMessage = longPressBubble.classList.contains('assistant-bubble');
      showMenu(longPressBubble, assistantMessage ? assistantMenuOptions(index) : userMenuOptions(longPressBubble, index), true);
      longPressBubble = null;
      longPressStart = null;
    }, 2000);
  }, true);
  document.addEventListener('pointermove', event => {
    if (!longPressBubble || !longPressStart) return;
    if (Math.abs(event.clientX - longPressStart.x) > 10 || Math.abs(event.clientY - longPressStart.y) > 10) {
      clearTimeout(longPressTimer);
      longPressBubble = null;
      longPressStart = null;
    }
  }, true);
  ['pointerup', 'pointercancel'].forEach(name => document.addEventListener(name, () => {
    clearTimeout(longPressTimer);
    longPressBubble = null;
    longPressStart = null;
  }, true));
  document.addEventListener('contextmenu', event => {
    const bubble = event.target && event.target.closest && event.target.closest('.chat-thread .user-bubble, .chat-thread .assistant-bubble');
    if (bubble) event.preventDefault();
  }, true);
  document.addEventListener('click', event => {
    if (suppressNextClick && event.target && event.target.closest && event.target.closest('.user-bubble')) {
      suppressNextClick = false;
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    const button = event.target && event.target.closest && event.target.closest('[data-expert-message-action]');
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    const action = button.dataset.expertMessageAction;
    const index = Number(button.dataset.messageIndex);
    const list = historyList();
    const text = textOf(list[index]);
    if (action === 'copy') copyText(text);
    else if (action === 'like' || action === 'dislike') {
      prefs.messageFeedback = prefs.messageFeedback || {};
      const key = messageKey(index);
      prefs.messageFeedback[key] = prefs.messageFeedback[key] === action ? '' : action;
      live.persist();
      decorateMessages();
    } else if (action === 'read') speakText(text);
    else if (action === 'share') shareText(text);
    else if (action === 'more') showMenu(button, assistantMenuOptions(index), false, true);
  }, true);

  decorateMessages();
})();