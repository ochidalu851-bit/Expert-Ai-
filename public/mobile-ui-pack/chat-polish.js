(() => {
  'use strict';

  const microphoneIcon = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="3" width="8" height="12" rx="4"></rect><path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6"></path></svg>';
  const voiceChatIcon = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10v4M7 6v12M11 3v18M15 7v10M19 10v4M22 11v2"></path></svg>';
  const sendIcon = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M6 11l6-6 6 6"></path></svg>';

  function makeComposer(inputId, action, placeholder) {
    return '<div class="chat-composer nexa-composer">' +
      '<button type="button" class="nexa-composer-plus" data-action="composerPlus" aria-label="More actions" title="Attach files">＋</button>' +
      '<input id="' + inputId + '" type="text" autocomplete="off" enterkeyhint="send" placeholder="' + placeholder + '" aria-label="' + placeholder + '">' +
      '<button type="button" class="nexa-composer-icon nexa-mic-button" data-action="voiceInput" aria-label="Use microphone" title="Speak a message">' + microphoneIcon + '</button>' +
      '<button type="button" class="nexa-composer-icon nexa-voice-chat-button" data-page="voiceMode" aria-label="Start voice chat" title="Voice chat">' + voiceChatIcon + '</button>' +
      '<button type="button" class="send-button nexa-send-button" data-action="' + action + '" aria-label="Send message" title="Send">' + sendIcon + '</button>' +
      '</div>';
  }

  function replaceComposer(pageName, inputId, action, placeholder) {
    const previous = pages[pageName];
    if (typeof previous !== 'function') return;
    pages[pageName] = function() {
      const html = previous();
      return html.replace(/<div class="chat-composer">[\s\S]*?<\/div>/, makeComposer(inputId, action, placeholder));
    };
  }

  replaceComposer('chat', 'chatInput', 'sendChat', 'Message Expert AI');
  replaceComposer('home', 'homePrompt', 'sendHome', 'Ask Expert AI anything');

  const style = document.createElement('style');
  style.textContent = `
    .chat-composer.nexa-composer {
      display: flex;
      align-items: center;
      gap: 8px;
      min-height: 58px;
      padding: 8px 10px;
      border: 1px solid #454545;
      border-radius: 22px;
      background: #242424;
      box-shadow: 0 7px 24px rgba(0, 0, 0, .22);
    }
    .nexa-composer input {
      flex: 1 1 auto;
      min-width: 0;
      min-height: 38px;
      padding: 0 3px;
      border: 0;
      outline: 0;
      background: transparent;
      color: #fff;
      font-size: 14px;
      font-weight: 800;
      letter-spacing: -.015em;
    }
    .nexa-composer input::placeholder {
      color: #aaa;
      font-size: 13px;
      font-weight: 700;
      opacity: 1;
    }
    .nexa-composer button {
      display: inline-flex;
      flex: 0 0 auto;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      padding: 0;
      border: 0;
      border-radius: 50%;
      background: transparent;
      color: #fff;
      font-size: 23px;
      font-weight: 900;
      line-height: 1;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
    }
    .nexa-composer .nexa-composer-plus { color: #f4f4f4; font-size: 27px; }
    .nexa-composer .nexa-composer-icon { width: 36px; height: 36px; }
    .nexa-composer .nexa-send-button {
      width: 39px;
      height: 39px;
      background: #5b83ff;
      color: #fff;
    }
    .nexa-composer svg { display: block; width: 21px; height: 21px; }
    .chat-thread { display: flex; flex-direction: column; align-items: stretch; gap: 13px; }
    .chat-thread .chat-bubble {
      max-width: 88%;
      padding: 13px 15px;
      border-radius: 19px;
      font-size: 15px;
      font-weight: 400;
      line-height: 1.55;
      overflow-wrap: anywhere;
    }
    .chat-thread .user-bubble {
      display: block !important;
      width: fit-content !important;
      max-width: 76% !important;
      min-width: 0 !important;
      box-sizing: border-box !important;
      align-self: flex-end !important;
      margin-left: auto;
      margin-right: 0;
      text-align: left;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      background: #283c91;
    }
    .chat-thread .assistant-bubble {
      align-self: flex-start !important;
      margin-left: 0;
      margin-right: auto;
      text-align: left;
      background: #252525;
    }
    @media (max-width: 360px) {
      .chat-composer.nexa-composer { gap: 5px; padding: 7px; }
      .nexa-composer button { width: 33px; height: 33px; }
      .nexa-composer .nexa-send-button { width: 36px; height: 36px; }
    }
  `;
  document.head.appendChild(style);
})();
