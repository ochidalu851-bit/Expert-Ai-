/* Nexa AI v7 functional completion pass.
   Keeps provider authentication, external API access and device security explicitly offline. */
(() => {
  'use strict';
  const esc7 = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fileInputMarkup = '<input id="nexaAttachmentInput" type="file" multiple hidden aria-label="Choose files to attach">';
  const byteLabel = n => {
    const size = Number(n || 0);
    if (!size) return '0 B';
    const units = ['B','KB','MB','GB'];
    const i = Math.min(units.length - 1, Math.floor(Math.log(size) / Math.log(1024)));
    return `${(size / Math.pow(1024, i)).toFixed(i ? 1 : 0)} ${units[i]}`;
  };
  const permissionModes = [
    ['Always ask', 'Ask before each app action.'],
    ['Allow read actions', 'Allow read-only actions. Ask before an app changes data or performs a write action.'],
    ['Allow low-risk actions', 'Allow low-risk actions in this local preference preview. Higher-risk actions still require review.']
  ];
  function permissionMap() {
    if (!prefs.pluginPermissionModes || typeof prefs.pluginPermissionModes !== 'object') prefs.pluginPermissionModes = {};
    return prefs.pluginPermissionModes;
  }
  function activePermissionApp() { return prefs.activePermissionApp || prefs.activeVideoPlugin || 'Plugin Management'; }
  function getMode(name) { return permissionMap()[name] || prefs.permissionMode || 'Always ask'; }
  function showPermissionChooser(name) {
    prefs.activePermissionApp = name;
    save();
    openModal(`Update permissions · ${name}`, 'Choose a local demo permission mode. This does not change a real provider permission.', permissionModes.map(([label, description]) => ({label: `${getMode(name) === label ? '✓  ' : ''}${label} — ${description}`, value: `nexa-permission:${label}`})));
  }

  // The account/settings block shown in the newer recording.
  pageTitles.verifyAge = 'Verify age';
  pageTitles.videoPluginPermissions = 'App permissions';
  pageTitles.videoPluginDependencies = 'Plugin dependencies';
  pages.settings = function v7SettingsPage() {
    return `${group(
      row('Account','account','◉',prefs.userName || 'Demo User',prefs.userName || 'Demo User') +
      row('Workspace','workspace','▢','Personal','Personal') +
      row('Verify age','verifyAge','✓','Confirm your age',prefs.demoAgeVerified ? 'Verified' : 'Verify') +
      row('Upgrade plan','subscription','✧','More access and features') +
      row('Usage and limits','usage','▧','') +
      row('Trusted contact','trustedContact','♙',prefs.trustedContactAdded ? 'Added in this demo' : 'Not set up') +
      row('Parental controls','parental','♡','Family settings') +
      row('Email','emailLogin','✉',prefs.userEmail || 'demo@example.com'), true
    )}
    ${group(actionRow('Accent color','accent','◉','',prefs.accent || 'Blue'),true)}
    ${group(row('Customize ChatGPT','customize','♧','Personality, memory, plugins and more'),true)}
    ${group(
      row('General','general','⚙') + row('Notifications','notifications','♧') + row('Voice','voice','〽') +
      row('Safety','safety','⬡') + row('Security and login','security','♙') + row('Codex','codex','⌘') +
      row('Storage','storage','▤') + row('Privacy center','privacy','▣') + row('History and data','historyData','▤') +
      row('Ads controls','adsControls','◉') + row('Plugins','plugins','✣')
    )}
    <div class="search-dock"><span>⌕</span><input id="settingsSearch" placeholder="Search settings" aria-label="Search settings"></div>`;
  };
  pages.verifyAge = function v7VerifyAgePage() {
    return `<div class="info-hero"><div class="large-icon">✓</div><h2>Verify your age</h2><p>Confirm that you meet the age requirement. This is a local interface demonstration and does not verify your identity.</p></div>
      <label class="v7-age-confirm"><input id="v7AgeConfirm" type="checkbox" ${prefs.demoAgeVerified ? 'checked' : ''}> I confirm that I am 18 years of age or older.</label>
      <button class="primary" data-action="v7VerifyAge">Confirm age</button>
      <button class="outline" data-page="settings">Back to Settings</button>
      ${help('No identity document, date of birth or personal verification data is collected by this demo.')}`;
  };
  pages.trustedContact = function v7TrustedContactPage() {
    const status = prefs.trustedContactAdded ? 'Added in this demo' : 'Not set up';
    return `<div class="info-hero"><div class="large-icon">♙</div><h2>Trusted contact</h2><p>A trusted contact can be a person you choose to help you with account recovery or support workflows.</p></div>
      ${group(row('Status','trustedContact','♙',status))}
      <button class="primary" data-action="v7TrustedContact">${prefs.trustedContactAdded ? 'Remove demo contact' : 'Add demo contact'}</button>
      ${help('This only changes a local demonstration status. No contact details are collected and no real account contact is linked.')}`;
  };

  // Per-plugin permission and dependency inspection: no inferred scopes/dependencies.
  pages.videoPluginPermissions = function v7PluginPermissionsPage() {
    const name = activePermissionApp();
    const mode = getMode(name);
    return `<div class="video-plugin-detail">
      <div class="video-plugin-info"><h3>${esc7(name)}</h3><p>Current local permission preference</p><b class="v7-mode-value">${esc7(mode)}</b></div>
      <div class="video-plugin-info"><h3>Permission information</h3><dl>
        <dt>Provider permission list</dt><dd>Not supplied / not verified</dd>
        <dt>Granted scopes</dt><dd>Not inspected; no external account is connected</dd>
        <dt>Connection state</dt><dd>${(prefs.videoPluginAdded || []).includes(name) ? 'Added to local demo · not connected' : 'Catalogue listing · not installed'}</dd>
      </dl></div>
      <div class="video-plugin-info"><div class="video-plugin-section-head static-head">Local permission modes</div>
        ${permissionModes.map(([label,desc])=>`<button class="v7-permission-choice ${mode===label?'selected':''}" data-action="v7SetPluginPermission" data-mode="${esc7(label)}"><span class="v7-radio">${mode===label?'●':'○'}</span><span><b>${esc7(label)}</b><small>${esc7(desc)}</small></span></button>`).join('')}
      </div>
      <p class="video-plugin-disclaimer">Changes are stored per app in this browser only. They do not grant, revoke or inspect real provider permissions.</p>
      <button class="outline" data-page="videoPluginDetail">Back to app details</button>
    </div>`;
  };
  pages.videoPluginDependencies = function v7PluginDependenciesPage() {
    const name = prefs.activeDependencyApp || activePermissionApp();
    return `<div class="video-plugin-detail"><div class="video-plugin-info"><h3>${esc7(name)}</h3><p>Dependency inspection</p>
      <dl><dt>Required apps</dt><dd>Not supplied / not verified</dd><dt>Required services</dt><dd>Not supplied / not verified</dd><dt>Version constraints</dt><dd>Not supplied / not verified</dd><dt>Inspection status</dt><dd>Not checked against a provider or live registry</dd></dl>
      </div><div class="video-plugin-note">The source recording shows a “get plugin dependencies” action but does not disclose dependency results. No dependency names have been invented.</div>
      <button class="outline" data-page="videoPluginDetail">Back to Plugin Management</button></div>`;
  };

  // Provide real file-picker behaviour for the local attachment preview.
  const prevHome7 = pages.home;
  pages.home = function(){
    const pending = prefs.pendingChatFiles || [];
    const chips = pending.length ? `<div class="v7-attachment-chips">${pending.slice(-4).map(f=>`<span>📎 ${esc7(f.name)} <small>${byteLabel(f.size)}</small></span>`).join('')}</div>` : '';
    return chips + prevHome7() + fileInputMarkup;
  };
  const prevChat7 = pages.chat;
  pages.chat = function(){
    let html = prevChat7();
    const files = prefs.pendingChatFiles || [];
    const chips = files.length ? `<div class="v7-attachment-chips">${files.slice(-4).map(f=>`<span>📎 ${esc7(f.name)} <small>${byteLabel(f.size)}</small></span>`).join('')}</div>` : '';
    if (prefs.temporaryChat) {
      html = html.replace('<div class="temporary-pill">◌　Temporary chat</div>', '<div class="v7-temp-bar"><span>◌　Temporary chat</span><button data-action="v7SaveTemporaryChat">Save to history</button><button data-action="v7EndTemporaryChat">End</button></div>');
    }
    html = html.replace('<div class="chat-composer">', `${chips}<div class="chat-composer">`);
    return html + fileInputMarkup;
  };
  pages.chatUploads = function(){
    const files = prefs.chatFileMeta || (prefs.chatUploadedFiles || []).map(name=>({name,size:0,type:'',status:'Filename only'}));
    return `<div class="video-plugin-detail"><p class="video-plugin-disclaimer">Selected file metadata is held locally in this browser. File contents are not uploaded to a conversation or server.</p>
      <label class="primary file-button" for="nexaAttachmentInput">＋ Add files</label><input id="nexaAttachmentInput" type="file" multiple hidden>
      ${files.length ? `<div class="video-plugin-info">${files.map((f,i)=>`<div class="video-plugin-action-row"><span><b>📎 ${esc7(f.name)}</b><small>${esc7(f.type || 'File type not supplied')} · ${byteLabel(f.size)}</small></span><button class="mini-action" data-action="v7RemoveFile" data-index="${i}">Remove</button></div>`).join('')}</div>` : '<div class="nx-empty">No files selected in this demo conversation.</div>'}
      <button class="outline" data-page="chat">Back to chat</button></div>`;
  };

  // Make attachment and temporary-chat options perform their advertised local actions.
  const prevClickChoice7 = clickChoice;
  clickChoice = function(value) {
    if (String(value).startsWith('nexa-permission:')) {
      const mode = String(value).slice('nexa-permission:'.length);
      const name = activePermissionApp(); permissionMap()[name] = mode; save(); modalLayer.hidden = true; render(); toast(`${name}: local permission preference saved.`); return;
    }
    if (value === 'attach') {
      modalLayer.hidden = true;
      const picker = document.getElementById('nexaAttachmentInput');
      if (picker) picker.click(); else toast('Open a chat first to attach files.');
      return;
    }
    if (value === 'createImage') { modalLayer.hidden = true; nav('images'); return; }
    if (value === 'temporary') {
      prefs.temporaryChat = true; prefs.temporaryMessages = []; prefs.pendingChatFiles = []; save(); modalLayer.hidden = true; nav('chat'); return;
    }
    if (value === 'webSearch') { modalLayer.hidden = true; openModal('Web search','Live web search requires a connected search service. This offline package does not perform a web search.',[{label:'OK',value:'v7Close'}]); return; }
    if (value === 'v7Close') { modalLayer.hidden = true; return; }
    if (value === 'v7EndTempDiscard') { prefs.temporaryMessages=[]; prefs.temporaryChat=false; save(); modalLayer.hidden=true; nav('home'); toast('Temporary chat ended without saving.'); return; }
    if (value === 'v7EndTempSave') { prefs.chatHistory=[...(prefs.chatHistory||[]),...(prefs.temporaryMessages||[])]; prefs.temporaryMessages=[]; prefs.temporaryChat=false; save(); modalLayer.hidden=true; nav('chat'); toast('Temporary chat saved to history.'); return; }
    prevClickChoice7(value);
  };

  const prevHandle7 = handleAction;
  handleAction = function(action, element) {
    if (action === 'composerPlus') {
      openModal('Add to your message','Choose what to include.',[
        {label:'Add photos and files',value:'attach'}, {label:'Create an image',value:'createImage'},
        {label:'Start a temporary chat',value:'temporary'}, {label:'Search the web',value:'webSearch'}
      ]); return;
    }
    if (action === 'pluginManagementAction') {
      const which = element?.dataset?.pluginAction || '';
      const name = element?.dataset?.plugin || prefs.activeVideoPlugin || 'Plugin Management';
      if (which === 'get.app.permissions') { prefs.activePermissionApp = name; save(); nav('videoPluginPermissions'); return; }
      if (which === 'get plugin dependencies') { prefs.activeDependencyApp = name; save(); nav('videoPluginDependencies'); return; }
      if (which === 'update app permissions') { showPermissionChooser(name); return; }
      // Keep the original explicit uninstall confirmation.
    }
    if (action === 'pluginPermissionDetail') { prefs.activePermissionApp = element?.dataset?.plugin || prefs.activeVideoPlugin || 'Plugin'; save(); nav('videoPluginPermissions'); return; }
    if (action === 'v7SetPluginPermission') {
      const name = activePermissionApp(), mode = element?.dataset?.mode;
      if (permissionModes.some(x=>x[0]===mode)) { permissionMap()[name] = mode; save(); render(); toast(`${name}: local permission preference updated.`); }
      return;
    }
    if (action === 'v7SaveTemporaryChat') {
      prefs.chatHistory = [...(prefs.chatHistory || []), ...(prefs.temporaryMessages || [])];
      prefs.temporaryMessages = []; prefs.temporaryChat = false; save(); render(); toast('Temporary chat saved to history.'); return;
    }
    if (action === 'v7EndTemporaryChat') {
      openModal('End temporary chat?','Choose whether to save this demo conversation to regular history.',[{label:'End without saving',value:'v7EndTempDiscard'},{label:'Save to history',value:'v7EndTempSave'}]); return;
    }
    if (action === 'v7VerifyAge') {
      if (!document.getElementById('v7AgeConfirm')?.checked) { toast('Confirm that you are 18 or older first.'); return; }
      prefs.demoAgeVerified = true; save(); render(); toast('Age confirmation saved in this demo.'); return;
    }
    if (action === 'v7TrustedContact') {
      prefs.trustedContactAdded = !prefs.trustedContactAdded; save(); render(); toast(prefs.trustedContactAdded ? 'Demo trusted-contact status enabled.' : 'Demo trusted-contact status removed.'); return;
    }
    if (action === 'v7RemoveFile') {
      const i = Number(element?.dataset?.index ?? -1);
      const removedName = (prefs.chatFileMeta || [])[i]?.name;
      prefs.chatFileMeta = (prefs.chatFileMeta || []).filter((_,j)=>j!==i);
      prefs.pendingChatFiles = (prefs.pendingChatFiles || []).filter(f=>f.name !== removedName);
      prefs.chatUploadedFiles = (prefs.chatFileMeta || []).map(f=>f.name); save(); render(); return;
    }
    if (action === 'toggleVideoPlugin') {
      // Existing handler preserves the separate plus button and not-connected state.
      return prevHandle7(action, element);
    }
    if (action === 'sendChat' || action === 'sendHome') {
      const field = action === 'sendHome' ? '#homePrompt' : '#chatInput';
      const message = (document.querySelector(field)?.value || '').trim();
      if (!message && !(prefs.pendingChatFiles || []).length) { toast('Type a message or attach a file first.'); return; }
      const attachments = (prefs.pendingChatFiles || []).map(f=>f.name);
      const text = message + (attachments.length ? `\n\nAttachments selected locally: ${attachments.join(', ')}` : '');
      const user = {role:'user', text, attachments};
      const assistant = {role:'assistant', text:'This is a local Nexa AI interface preview. No AI provider is connected, so a live AI response was not generated.'};
      if (prefs.temporaryChat) prefs.temporaryMessages = [...(prefs.temporaryMessages || []), user, assistant];
      else prefs.chatHistory = [...(prefs.chatHistory || []), user, assistant];
      prefs.pendingChatFiles = []; prefs.selectedImagePrompt = ''; prefs.recentChatTitle = message.slice(0,52) || 'File attachment'; save();
      if (currentPage === 'chat') render(); else nav('chat');
      toast('Local preview message added. No external AI request was sent.'); return;
    }
    if (action === 'chatMessageAction') {
      const index = Number(element?.dataset?.messageIndex ?? -1);
      const which = element?.dataset?.messageAction || '';
      const messages = prefs.temporaryChat ? (prefs.temporaryMessages || []) : (prefs.chatHistory || []);
      const msg = messages[index];
      if (which === 'share' && msg?.text) {
        if (navigator.share) navigator.share({title:'Nexa AI response',text:msg.text}).catch(()=>toast('Sharing was cancelled or is unavailable.'));
        else if (navigator.clipboard?.writeText) navigator.clipboard.writeText(msg.text).then(()=>toast('Response copied for sharing.')).catch(()=>openModal('Share response',msg.text));
        else openModal('Share response',msg.text);
        return;
      }
    }
    return prevHandle7(action, element);
  };

  // File selection stores safe metadata only, not the binary file itself.
  screen.addEventListener('change', e => {
    if (e.target?.id !== 'nexaAttachmentInput') return;
    const selected = [...(e.target.files || [])].slice(0,20);
    if (!selected.length) return;
    prefs.chatFileMeta = [...(prefs.chatFileMeta || []), ...selected.map(f=>({name:f.name,size:f.size,type:f.type,lastModified:f.lastModified}))].slice(-100);
    prefs.chatUploadedFiles = prefs.chatFileMeta.map(f=>f.name);
    prefs.pendingChatFiles = [...(prefs.pendingChatFiles || []), ...selected.map(f=>({name:f.name,size:f.size,type:f.type}))];
    save(); render(); toast(`${selected.length} file(s) selected locally. File contents were not uploaded.`);
  });

  // Enter sends from the composer, matching the send-arrow button.
  screen.addEventListener('keydown', e => {
    if (e.key !== 'Enter' || e.shiftKey || e.isComposing) return;
    if (e.target?.id === 'chatInput') { e.preventDefault(); handleAction('sendChat'); }
    else if (e.target?.id === 'homePrompt') { e.preventDefault(); handleAction('sendHome'); }
  });

  Object.assign(pageTitles, {
    verifyAge:'Verify age', videoPluginPermissions:'App permissions', videoPluginDependencies:'Plugin dependencies'
  });
  window.NEXA_V7_FUNCTIONS = {
    perPluginPermissions: true,
    dependencyInspectionWithUnknownsPreserved: true,
    localFilePicker: true,
    temporaryChatIsolation: true,
    keyboardSend: true,
    verifyAgeDemo: true,
    trustedContactDemo: true
  };
})();
