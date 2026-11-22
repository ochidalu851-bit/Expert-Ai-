/* Expert AI account-backed controls for the imported v8 mobile UI pack. */
(() => {
  'use strict';

  const bridge = window.NEXA_LIVE_BRIDGE;
  const catalogue = window.NEXA_PLUGIN_CATALOGUE || { records: [] };
  const records = Array.isArray(catalogue.records) ? catalogue.records : [];
  const arr = value => Array.isArray(value) ? value : [];
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
  const note = message => typeof toast === 'function' ? toast(message) : console.info('[Expert AI]', message);
  const request = (action, payload = {}) => bridge && typeof bridge.request === 'function'
    ? bridge.request(action, payload)
    : Promise.reject(new Error('The Expert AI live service bridge is unavailable.'));
  const unique = values => Array.from(new Set(values.filter(Boolean)));
  const findRecord = id => records.find(item => String(item.id) === String(id));
  const recordName = item => String(item && item.name || 'App listing');
  const installedIds = () => arr(prefs.installedCatalogueRecordIds);
  const installedNames = () => unique(arr(prefs.videoPluginAdded).concat(arr(prefs.installedPlugins)));
  const activeId = () => String(prefs.activeChatId || '');
  const activeKey = () => activeId() || String(prefs.activeConversationToken || 'new-chat');
  const saveAccountState = () => {
    if (typeof save === 'function') save();
    else if (window.EXPERT_AI_LIVE && typeof window.EXPERT_AI_LIVE.persist === 'function') window.EXPERT_AI_LIVE.persist();
  };

  function providerFor(name) {
    const value = String(name || '').toLowerCase();
    if (value === 'gmail' || value.includes('google') || value.includes('drive')) return 'google';
    if (value.includes('github')) return 'github';
    if (value.includes('slack')) return 'slack';
    if (value.includes('notion')) return 'notion';
    return '';
  }

  function connectProvider(name) {
    const provider = providerFor(name);
    if (!provider) {
      note('A live provider connector is not configured for ' + name + '.');
      return;
    }
    const state = arr(prefs.liveIntegrations).find(item => item.provider === provider);
    if (!state || !state.credentials_ready) {
      note('The ' + provider + ' connector needs OAuth credentials in AppDeploy before it can connect.');
      return;
    }
    request('integrations.connect', { provider }).catch(error => note(error.message || 'Connection could not start.'));
  }

  function install(name, id) {
    if (!name) return;
    prefs.videoPluginAdded = unique(arr(prefs.videoPluginAdded).concat(name));
    prefs.installedPlugins = unique(arr(prefs.installedPlugins).concat(name));
    prefs.connectorInstallState = Object.assign({}, prefs.connectorInstallState || {}, {
      [name]: 'installed_not_connected'
    });
    if (id) prefs.installedCatalogueRecordIds = unique(installedIds().concat(id));
    saveAccountState();
    note(name + ' is saved in your Expert AI installed-app list. It is not connected to the provider.');
  }

  function remove(name, id) {
    prefs.videoPluginAdded = arr(prefs.videoPluginAdded).filter(value => value !== name);
    prefs.installedPlugins = arr(prefs.installedPlugins).filter(value => value !== name);
    prefs.connectorInstallState = Object.assign({}, prefs.connectorInstallState || {}, { [name]: 'removed' });
    if (id) prefs.installedCatalogueRecordIds = installedIds().filter(value => value !== id);
    saveAccountState();
    note(name + ' was removed from your Expert AI installed-app list.');
  }

  function confirmInstall(name, id) {
    prefs.pendingPackInstall = { name, recordId: id || '' };
    saveAccountState();
    openModal(
      'Add ' + name + ' to Expert AI?',
      'This saves the listing to your account. It does not sign in to the provider or grant external permissions.',
      [
        { label: 'Add to installed apps', value: 'packInstallConfirmed' },
        { label: 'Cancel', value: 'packInstallCancelled' }
      ]
    );
  }

  function openPermissions(name) {
    prefs.activePermissionApp = name || 'App';
    saveAccountState();
    nav('pluginPermissionSettings');
  }

  pages.pluginPermissionSettings = function() {
    const name = prefs.activePermissionApp || prefs.activeVideoPlugin || 'App';
    const options = [
      ['Always ask', 'Ask before every action.'],
      ['Allow read actions', 'Allow read-only actions after provider authorization.'],
      ['Allow low-risk actions', 'Allow read actions and low-risk actions after provider authorization.']
    ];
    const selected = (prefs.pluginPermissionSettings || {})[name] || 'Always ask';
    let html = '<div class="section-label">APP PERMISSIONS</div>' +
      '<div class="video-plugin-info"><h3>' + esc(name) + '</h3>' +
      '<p>Choose how Expert AI should ask before using supported actions for this app.</p>';
    options.forEach(([mode, description]) => {
      html += '<button class="row" data-action="packSetPermission" data-permission="' + esc(mode) + '">' +
        '<span class="row-main"><span class="row-label">' + esc(mode) + '</span>' +
        '<span class="row-sub">' + esc(description) + '</span></span>' +
        '<span class="row-value">' + (selected === mode ? '✓ Selected' : '') + '</span></button>';
    });
    return html + '</div><div class="nx-warning"><b>Provider authorization is separate</b>' +
      '<p>These are account preferences only. They do not grant provider scopes or activate external tools.</p></div>' +
      '<button class="outline" data-page="plugins">Back to Plugins</button>';
  };
  pageTitles.pluginPermissionSettings = 'App permissions';

  const oldCatalogueDetail = pages.catalogueDetail;
  if (typeof oldCatalogueDetail === 'function') {
    pages.catalogueDetail = function() {
      const html = oldCatalogueDetail();
      const item = findRecord(prefs.activePluginRecordId);
      if (!item) return html;
      const name = recordName(item);
      const id = String(item.id);
      const added = installedIds().includes(id) || installedNames().includes(name);
      const provider = providerFor(name);
      const state = provider ? arr(prefs.liveIntegrations).find(row => row.provider === provider) : null;
      const installButton = added
        ? '<button class="outline" data-action="packRemoveCatalogueRecord" data-record-id="' + esc(id) + '">Remove from installed apps</button>'
        : '<button class="primary" data-action="packInstallCatalogueRecord" data-record-id="' + esc(id) + '">Add to installed apps</button>';
      const connectButton = provider
        ? '<button class="outline" data-action="packConnectCatalogueRecord" data-record-id="' + esc(id) + '">' +
          (state && state.connected ? 'Reconnect provider' : state && state.credentials_ready ? 'Connect provider account' : 'Provider setup required') + '</button>'
        : '<p class="nx-smallnote">No live connector is configured for this catalogue record.</p>';
      const actions = '<section class="nx-detail-section"><h3>Expert AI account actions</h3>' +
        '<p>' + (added ? 'This listing is saved to your account.' : 'Save this catalogue listing to your account.') +
        ' Provider connection is separate.</p>' + installButton +
        '<button class="outline" data-action="packCataloguePermission" data-record-id="' + esc(id) + '">Manage app permissions</button>' +
        connectButton + '</section>';
      return html.replace('<button class="outline nx-back-catalogue"', actions + '<button class="outline nx-back-catalogue"');
    };
  }

  const oldVideoDetail = pages.videoPluginDetail;
  if (typeof oldVideoDetail === 'function') {
    pages.videoPluginDetail = function() {
      let html = oldVideoDetail();
      const name = prefs.activeVideoPlugin || 'Plugin Management';
      if (name === 'Plugin Management') return html;
      const added = installedNames().includes(name);
      html = html.replace(
        'Installing adds this app to the local prototype only. It does not authenticate or connect an external account.',
        'Adding this app saves it to your Expert AI account. Provider access remains disconnected until authorization succeeds.'
      );
      html = html.replace('Install plugin', added ? 'Installed on this account' : 'Add to Expert AI');
      const provider = providerFor(name);
      const state = provider ? arr(prefs.liveIntegrations).find(row => row.provider === provider) : null;
      const connectButton = provider
        ? '<button class="outline" data-action="packConnectNamedPlugin" data-plugin="' + esc(name) + '">' +
          (state && state.connected ? 'Reconnect provider' : state && state.credentials_ready ? 'Connect provider account' : 'Provider setup required') + '</button>'
        : '<p class="nx-smallnote">This app has no verified live connector in this deployment.</p>';
      return html.replace(
        '<button class="outline" data-action="pluginPermissionDetail"',
        connectButton + '<button class="outline" data-action="pluginPermissionDetail"'
      );
    };
  }

  pages.archivedChats = function() {
    const items = arr(prefs.archivedChats);
    const rows = items.map((item, index) =>
      '<div class="video-plugin-info"><b>' + esc(item.title || 'Archived conversation') + '</b>' +
      '<small>' + esc(item.date || '') + '</small>' +
      '<button class="outline" data-action="packRestoreArchivedChat" data-index="' + index + '">Restore chat</button></div>'
    ).join('');
    return '<div class="section-label">ARCHIVED CONVERSATIONS</div>' +
      (rows || '<div class="nx-empty">No archived conversations.</div>') +
      '<button class="outline" data-page="allChats">Back to chat history</button>';
  };
  pageTitles.archivedChats = 'Archived chats';

  pages.installedApps = function() {
    const names = installedNames();
    const rows = names.map(name => {
      const item = records.find(entry => recordName(entry) === name);
      const id = item ? String(item.id) : '';
      return '<div class="row"><span class="row-main"><span class="row-label">' + esc(name) + '</span>' +
        '<span class="row-sub">Saved in this Expert AI account · provider not connected</span></span>' +
        (id
          ? '<button class="mini-action" data-action="packOpenInstalledRecord" data-record-id="' + esc(id) + '">Details</button>'
          : '<button class="mini-action" data-action="packOpenInstalledPlugin" data-plugin="' + esc(name) + '">Details</button>') +
        '<button class="mini-action" data-action="packRemoveNamedPlugin" data-plugin="' + esc(name) + '">Remove</button></div>';
    }).join('');
    return '<div class="section-label">INSTALLED APPS IN EXPERT AI</div>' +
      (rows || '<div class="nx-empty">No apps have been added to your account yet.</div>') +
      '<button class="outline" data-page="pluginCatalogue">Browse complete catalogue</button>';
  };
  pageTitles.installedApps = 'Installed apps';

  const oldPluginsPage = pages.plugins;
  if (typeof oldPluginsPage === 'function') {
    pages.plugins = function() {
      return oldPluginsPage() +
        '<button class="nx-feature-link" data-page="installedApps"><span>▣</span>' +
        '<b>Installed apps</b><small>' + installedNames().length + ' saved in your account</small><i>›</i></button>';
    };
  }

  pages.allChats = function() {
    const archivedIds = arr(prefs.archivedChatIds);
    const all = arr(prefs.liveChats).filter(item => !archivedIds.includes(item.id));
    const org = prefs.chatOrganization || {};
    const pinned = all.filter(item => org[item.id] && org[item.id].pinned);
    const regular = all.filter(item => !org[item.id] || !org[item.id].pinned);
    const row = item => '<button class="row" data-action="nexaOpenChat" data-chat-id="' + esc(item.id) + '">' +
      '<span class="row-main"><span class="row-label">' + esc(item.title || 'Conversation') + '</span>' +
      '<span class="row-sub">' + new Date(item.updated_at || Date.now()).toLocaleString() +
      (org[item.id] && org[item.id].locked ? ' · Marked locked' : '') + '</span></span>' +
      '<span class="chevron">' + (org[item.id] && org[item.id].pinned ? '📌' : '›') + '</span></button>';
    return '<div class="section-label">YOUR SAVED CHATS</div>' +
      '<button class="primary" data-action="nexaNewChat">＋ New chat</button>' +
      (pinned.length ? '<div class="section-label">PINNED CHATS</div>' + pinned.map(row).join('') : '') +
      regular.map(row).join('') +
      ((pinned.length || regular.length) ? '' : '<div class="empty-note">No saved conversations yet.</div>') +
      '<button class="outline" data-page="archivedChats">Archived chats (' + arr(prefs.archivedChats).length + ')</button>';
  };
  pageTitles.allChats = 'Chat history';

  const oldHome = pages.home;
  if (typeof oldHome === 'function') {
    pages.home = function() {
      const base = oldHome();
      const names = arr(prefs.savedHomeChats);
      const rows = names.map(name =>
        '<button class="row" data-action="packOpenHomeChat" data-title="' + esc(name) + '">' +
        '<span class="row-main"><span class="row-label">' + esc(name) + '</span>' +
        '<span class="row-sub">Saved conversation</span></span><span class="chevron">›</span></button>'
      ).join('');
      return base + (rows ? '<div class="video-plugin-info"><div class="section-label">SAVED TO HOME</div>' + rows + '</div>' : '');
    };
  }

  const oldDrawer = drawer;
  drawer = function() {
    let html = oldDrawer();
    const target = '<button class="drawer-item" data-page="library">';
    return html.replace(target,
      '<button class="drawer-item" data-page="archivedChats">▤　Archived chats</button>' +
      '<button class="drawer-item" data-page="installedApps">▣　Installed apps</button>' + target
    );
  };

  const oldHandleAction = handleAction;
  handleAction = function(action, element) {
    if (['toggleVideoPlugin', 'pluginInstall', 'v8InstallConnector', 'expertInstallPlugin'].includes(action)) {
      const name = element?.dataset?.plugin || prefs.activeVideoPlugin || 'App';
      if (installedNames().includes(name)) {
        remove(name, '');
        render();
      } else {
        confirmInstall(name, '');
      }
      return;
    }
    if (action === 'packInstallCatalogueRecord') {
      const item = findRecord(element?.dataset?.recordId);
      if (item) confirmInstall(recordName(item), String(item.id));
      return;
    }
    if (action === 'packRemoveCatalogueRecord') {
      const item = findRecord(element?.dataset?.recordId);
      if (item) remove(recordName(item), String(item.id));
      render();
      return;
    }
    if (action === 'packRemoveNamedPlugin') {
      remove(element?.dataset?.plugin || '', '');
      render();
      return;
    }
    if (action === 'packCataloguePermission') {
      const item = findRecord(element?.dataset?.recordId);
      if (item) openPermissions(recordName(item));
      return;
    }
    if (action === 'pluginPermissionDetail') {
      openPermissions(element?.dataset?.plugin || prefs.activeVideoPlugin || 'App');
      return;
    }
    if (action === 'packSetPermission') {
      const name = prefs.activePermissionApp || prefs.activeVideoPlugin || 'App';
      const mode = element?.dataset?.permission || '';
      if (!['Always ask', 'Allow read actions', 'Allow low-risk actions'].includes(mode)) return;
      prefs.pluginPermissionSettings = Object.assign({}, prefs.pluginPermissionSettings || {}, { [name]: mode });
      prefs.pluginPermissionModes = Object.assign({}, prefs.pluginPermissionModes || {}, { [name]: mode });
      saveAccountState();
      render();
      note('Permission preference saved for ' + name + '. Provider scopes are unchanged.');
      return;
    }
    if (action === 'packConnectNamedPlugin') {
      connectProvider(element?.dataset?.plugin || prefs.activeVideoPlugin || '');
      return;
    }
    if (action === 'packConnectCatalogueRecord') {
      const item = findRecord(element?.dataset?.recordId);
      if (item) connectProvider(recordName(item));
      return;
    }
    if (action === 'nexaConnect') {
      connectProvider(element?.dataset?.providerName || element?.dataset?.plugin || '');
      return;
    }
    if (action === 'packOpenInstalledRecord') {
      prefs.activePluginRecordId = element?.dataset?.recordId || '';
      saveAccountState();
      nav('catalogueDetail');
      return;
    }
    if (action === 'packOpenInstalledPlugin') {
      prefs.activeVideoPlugin = element?.dataset?.plugin || '';
      saveAccountState();
      nav('videoPluginDetail');
      return;
    }
    if (action === 'packOpenHomeChat') {
      const title = element?.dataset?.title || '';
      const id = (prefs.savedHomeChatIds || {})[title];
      if (!id) { note('This Home shortcut has no saved conversation ID.'); return; }
      request('chats.open', { id }).then(result => {
        const chat = result.chat || {};
        prefs.chatHistory = arr(chat.messages).map(message => ({
          role: message.role === 'assistant' ? 'assistant' : 'user',
          text: message.content || '',
          created_at: message.created_at
        }));
        prefs.activeChatId = chat.id || id;
        prefs.activeConversationToken = 'chat:' + prefs.activeChatId;
        prefs.recentChatTitle = chat.title || title;
        const org = (prefs.chatOrganization || {})[prefs.activeChatId] || {};
        prefs.chatPinned = !!org.pinned;
        prefs.chatLocked = !!org.locked;
        saveAccountState();
        nav('chat');
      }).catch(error => note(error.message || 'Saved conversation could not be opened.'));
      return;
    }
    if (action === 'packRunWebSearch') {
      const query = (document.getElementById('packWebSearchQuery')?.value || '').trim();
      if (!query) { note('Enter a search query first.'); return; }
      const url = 'https://www.google.com/search?q=' + encodeURIComponent(query);
      if (!window.open(url, '_blank', 'noopener,noreferrer')) note('Your browser blocked the search tab. Open: ' + url);
      return;
    }
    if (action === 'packRestoreArchivedChat') {
      const index = Number(element?.dataset?.index);
      const archived = arr(prefs.archivedChats)[index];
      if (!archived) return;
      const finish = chat => {
        prefs.archivedChatIds = arr(prefs.archivedChatIds).filter(id => id !== archived.id);
        prefs.archivedChats = arr(prefs.archivedChats).filter((_, i) => i !== index);
        prefs.chatHistory = arr(chat.messages).map(message => ({
          role: message.role === 'assistant' ? 'assistant' : 'user',
          text: message.content || message.text || '',
          created_at: message.created_at
        }));
        prefs.activeChatId = chat.id || archived.id || null;
        prefs.activeConversationToken = prefs.activeChatId ? 'chat:' + prefs.activeChatId : 'new-' + Date.now();
        prefs.recentChatTitle = chat.title || archived.title || 'Restored conversation';
        const org = (prefs.chatOrganization || {})[prefs.activeChatId] || {};
        prefs.chatPinned = !!org.pinned;
        prefs.chatLocked = !!org.locked;
        saveAccountState();
        nav('chat');
        note('Archived conversation restored.');
      };
      if (archived.id) {
        request('chats.open', { id: archived.id }).then(result => finish(result.chat || {}))
          .catch(error => note(error.message || 'The archived conversation could not be restored.'));
      } else {
        finish({ id: null, title: archived.title, messages: archived.messages || [] });
      }
      return;
    }
    if (action === 'videoChatMenuChoice') {
      const choice = element?.dataset?.menuAction || '';
      const key = activeKey();
      const organization = Object.assign({}, prefs.chatOrganization || {});
      const current = Object.assign({}, organization[key] || {});
      if (choice === 'pin' || choice === 'lock') {
        const property = choice === 'pin' ? 'pinned' : 'locked';
        current[property] = !current[property];
        organization[key] = current;
        prefs.chatOrganization = organization;
        prefs.chatPinned = !!current.pinned;
        prefs.chatLocked = !!current.locked;
        saveAccountState();
        if (modalLayer) { modalLayer.hidden = true; modalLayer.classList.remove('video-chat-menu-layer'); }
        render();
        note(choice === 'pin'
          ? (prefs.chatPinned ? 'Chat pinned to your account.' : 'Chat unpinned.')
          : (prefs.chatLocked ? 'Chat marked locked. This is a visual setting, not a separate device lock.' : 'Chat unlocked.'));
        return;
      }
      if (choice === 'home') {
        const title = prefs.recentChatTitle || 'Saved conversation';
        prefs.savedHomeChats = unique(arr(prefs.savedHomeChats).concat(title));
        prefs.savedHomeChatIds = Object.assign({}, prefs.savedHomeChatIds || {}, { [title]: activeId() });
        saveAccountState();
        if (modalLayer) { modalLayer.hidden = true; modalLayer.classList.remove('video-chat-menu-layer'); }
        render();
        note('Conversation saved to Home.');
        return;
      }
      if (choice === 'archive') {
        const title = prefs.recentChatTitle || 'Archived conversation';
        const id = activeId();
        const messages = id ? [] : arr(prefs.chatHistory).slice(-30).map(item => ({
          role: item.role,
          text: String(item.text || '').slice(0, 12000),
          created_at: item.created_at || Date.now()
        }));
        prefs.archivedChats = [{ id, title, messages, date: new Date().toISOString() }]
          .concat(arr(prefs.archivedChats)).slice(0, 100);
        if (id) prefs.archivedChatIds = unique(arr(prefs.archivedChatIds).concat(id));
        prefs.activeChatId = null;
        prefs.activeConversationToken = 'new-' + Date.now();
        prefs.chatHistory = [];
        prefs.chatPinned = false;
        prefs.chatLocked = false;
        prefs.recentChatTitle = 'New conversation';
        saveAccountState();
        if (modalLayer) { modalLayer.hidden = true; modalLayer.classList.remove('video-chat-menu-layer'); }
        render();
        nav('home');
        note('Conversation archived.');
        return;
      }
    }
    if (action === 'videoPluginModalChoice' && element?.dataset?.modalValue === 'deleteCurrent') {
      const id = activeId();
      const finish = () => {
        prefs.liveChats = arr(prefs.liveChats).filter(item => item.id !== id);
        prefs.archivedChatIds = arr(prefs.archivedChatIds).filter(item => item !== id);
        prefs.archivedChats = arr(prefs.archivedChats).filter(item => item.id !== id);
        prefs.chatOrganization = Object.assign({}, prefs.chatOrganization || {});
        delete prefs.chatOrganization[id];
        prefs.chatHistory = [];
        prefs.activeChatId = null;
        prefs.activeConversationToken = 'new-' + Date.now();
        prefs.chatPinned = false;
        prefs.chatLocked = false;
        prefs.recentChatTitle = 'New conversation';
        saveAccountState();
        if (modalLayer) { modalLayer.hidden = true; modalLayer.classList.remove('video-chat-menu-layer'); }
        render();
        nav('home');
        note('Conversation deleted from your account.');
      };
      if (!id) { finish(); return; }
      request('chats.delete', { id }).then(finish)
        .catch(error => note(error.message || 'Conversation could not be deleted.'));
      return;
    }
    if (action === 'v8Study') {
      prefs.studyMode = !prefs.studyMode;
      prefs.composerToolMode = prefs.studyMode ? 'Study' : '';
      saveAccountState();
      if (modalLayer) modalLayer.hidden = true;
      render();
      note(prefs.studyMode ? 'Study mode enabled for new questions.' : 'Study mode disabled.');
      return;
    }
    if (action === 'v8Search') {
      prefs.studyMode = false;
      prefs.composerToolMode = 'Search';
      saveAccountState();
      nav('webSearch');
      return;
    }
    if (action === 'v8DeepResearch') {
      prefs.studyMode = false;
      prefs.composerToolMode = 'Deep research';
      saveAccountState();
      nav('liveResearch');
      return;
    }
    if (action === 'v8Thinking' || action === 'v8ThinkHarder') {
      prefs.reasoningMode = prefs.reasoningMode === 'high' ? 'standard' : 'high';
      prefs.composerToolMode = prefs.reasoningMode === 'high' ? 'Thinking' : '';
      saveAccountState();
      if (modalLayer) modalLayer.hidden = true;
      render();
      note(prefs.reasoningMode === 'high' ? 'Advanced thinking mode enabled.' : 'Advanced thinking mode disabled.');
      return;
    }
    return oldHandleAction(action, element);
  };

  const oldClickChoice = clickChoice;
  clickChoice = function(value) {
    if (value === 'packInstallConfirmed') {
      const pending = prefs.pendingPackInstall || {};
      install(pending.name || 'App', pending.recordId || '');
      prefs.pendingPackInstall = null;
      if (modalLayer) modalLayer.hidden = true;
      render();
      return;
    }
    if (value === 'packInstallCancelled') {
      prefs.pendingPackInstall = null;
      saveAccountState();
      if (modalLayer) modalLayer.hidden = true;
      return;
    }
    return oldClickChoice(value);
  };

  const style = document.createElement('style');
  style.textContent = [
    '.nx-detail-section>.primary,.nx-detail-section>.outline{margin:5px 6px 5px 0}',
    '.nx-smallnote{font-size:12px;opacity:.78;padding:7px 3px}',
    '.nx-feature-link{margin-top:10px}'
  ].join('');
  document.head.appendChild(style);

  window.EXPERT_AI_PACK_FEATURES = {
    status: 'Account-backed catalogue installs, permission preferences, chat organization, archive and study mode enabled',
    installedNames,
    installedIds
  };
})();