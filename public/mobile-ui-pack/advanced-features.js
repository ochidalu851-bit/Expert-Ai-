/* Expert AI: search, deep research, connector actions and service setup status. */
(() => {
  'use strict';
  const live = window.EXPERT_AI_LIVE;
  if (!live) return;
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[ch]));
  const arr = value => Array.isArray(value) ? value : [];
  const notify = message => live.notify ? live.notify(message) : console.info('[Expert AI]', message);
  const persist = () => { if (typeof save === 'function') save(); else live.persist(); };
  const request = (action, payload = {}) => live.request(action, payload);
  const integration = provider => arr(prefs.liveIntegrations).find(item => item.provider === provider);
  const link = (title, page, sub) => '<button class="row" data-page="' + esc(page) + '"><span class="row-main"><span class="row-label">' + esc(title) + '</span><span class="row-sub">' + esc(sub || '') + '</span></span><span class="chevron">›</span></button>';

  function sourcesHtml(sources) {
    return arr(sources).map((item, index) =>
      '<a class="row" href="' + esc(item.url) + '" target="_blank" rel="noopener noreferrer">' +
      '<span class="row-main"><span class="row-label">[' + (index + 1) + '] ' + esc(item.title || item.url) +
      '</span><span class="row-sub">' + esc(item.url) + '</span>' +
      (item.snippet ? '<span class="row-sub">' + esc(item.snippet) + '</span>' : '') +
      '</span><span class="chevron">↗</span></a>'
    ).join('');
  }

  pages.webSearch = function() {
    const result = prefs.latestWebSearch;
    return '<div class="section-label">LIVE WEB SEARCH</div>' +
      '<div class="video-plugin-info"><h3>Search public webpages</h3>' +
      '<p>Expert AI searches public search pages, opens readable sources and prepares an answer with source links.</p>' +
      '<input class="field" id="expertWebSearchQuery" type="search" placeholder="What do you want to search for?" value="' + esc(result?.query || '') + '">' +
      '<button class="primary" data-action="expertRunWebSearch">Search the web</button>' +
      '<button class="outline" data-page="deepResearch">Run multi-source deep research</button></div>' +
      (result ? '<div class="section-label">ANSWER</div><div class="video-plugin-detail" style="white-space:pre-wrap">' + esc(result.answer || '') +
        '</div><div class="section-label">SOURCES</div>' + sourcesHtml(result.sources) : '');
  };
  pageTitles.webSearch = 'Web search';

  pages.deepResearch = function() {
    const result = prefs.latestDeepResearch;
    return '<div class="section-label">MULTI-SOURCE DEEP RESEARCH</div>' +
      '<div class="video-plugin-info"><h3>Research a question in depth</h3>' +
      '<p>Expert AI investigates multiple search angles, reads public source pages, then produces a structured synthesis with links. This does not access private or paywalled accounts.</p>' +
      '<textarea class="field" id="expertDeepResearchQuery" rows="4" placeholder="Enter a research question or topic">' + esc(result?.query || '') + '</textarea>' +
      '<button class="primary" data-action="expertRunDeepResearch">Start deep research</button></div>' +
      (result ? '<div class="section-label">RESEARCH REPORT</div><div class="video-plugin-detail" style="white-space:pre-wrap">' + esc(result.answer || '') +
        '</div><div class="section-label">SOURCES REVIEWED (' + arr(result.sources).length + ')</div>' + sourcesHtml(result.sources) : '');
  };
  pageTitles.deepResearch = 'Deep research';

  pages.integrationSetup = function() {
    const items = arr(prefs.liveIntegrations);
    const rows = items.map(item => {
      const status = item.connected ? 'Connected' : item.credentials_ready ? 'Credentials ready' : 'Setup required';
      const requirements = arr(item.required).join(', ');
      const action = item.provider === 'elevenlabs'
        ? ''
        : item.provider === 'openai'
          ? item.credentials_ready
            ? '<button class="mini-action" data-action="expertTestOpenAi">Test connection</button>'
            : '<span class="row-value">Add API key</span>'
          : '<button class="mini-action" data-action="expertConnectProvider" data-provider="' + esc(item.provider) + '">' +
            (item.connected ? 'Reconnect' : item.credentials_ready ? 'Connect' : 'Setup required') + '</button>';
      return '<div class="row"><span class="row-main"><span class="row-label">' + esc(item.name) +
        '</span><span class="row-sub">' + esc(item.note || '') + '</span><span class="row-sub">Required: ' +
        esc(requirements || 'Provider-specific setup') + '</span></span><span class="row-value">' + status +
        '</span>' + action + '</div>';
    }).join('');
    return '<div class="section-label">INTEGRATION SETUP</div>' +
      '<p class="help">These are the external services with connector code in this deployment. Provider access is activated only after real credentials and user authorization are present.</p>' +
      (rows || '<div class="empty-note">Integration status is not available. Refresh the app and try again.</div>') +
      '<button class="primary" data-action="expertRefreshIntegrations">Refresh connection status</button>' +
      '<button class="outline" data-page="connectorHub">Open available connector actions</button>' +
      '<div class="section-label">NOT CONFIGURED AS LIVE CONNECTORS</div>' +
      '<div class="video-plugin-info"><p>Outlook / Microsoft 365, Dropbox, iCloud, Spotify, Canva, Shopify, Booking.com and the other catalogue entries are not automatically connected by appearing in the directory. Each needs its own OAuth registration, API implementation and permission review.</p></div>' +
      '<div class="video-plugin-info"><p>SMS login, payment checkout and ad delivery also need a selected service provider and secure provider credentials. The current account login remains with the existing AppDeploy authentication host.</p></div>';
  };
  pageTitles.integrationSetup = 'Integration setup';

  pages.connectorHub = function() {
    const result = prefs.lastConnectorResult;
    const definitions = [
      ['Google Drive', 'google.drive', 'List files available to the connected Google account'],
      ['Gmail', 'google.gmail', 'Read the supported Gmail summary view'],
      ['GitHub repositories', 'github.repos', 'List repositories available to the connected GitHub account'],
      ['Slack channels', 'slack.channels', 'List channels visible to the connected Slack account'],
    ];
    const rows = definitions.map(item =>
      '<button class="row" data-action="expertRunConnector" data-connector="' + esc(item[1]) + '">' +
      '<span class="row-main"><span class="row-label">' + esc(item[0]) + '</span><span class="row-sub">' +
      esc(item[2]) + '</span></span><span class="chevron">›</span></button>'
    ).join('');
    return '<div class="section-label">AVAILABLE CONNECTOR ACTIONS</div>' +
      '<p class="help">These tools use only the services connected to your own Expert AI account.</p>' +
      rows +
      '<div class="video-plugin-info"><h3>Notion search</h3><input class="field" id="expertNotionQuery" type="search" placeholder="Search your Notion workspace">' +
      '<button class="primary" data-action="expertRunNotionSearch">Search Notion</button></div>' +
      (result ? '<div class="section-label">LATEST CONNECTOR RESULT · ' + esc(result.label) + '</div>' +
        '<pre class="video-plugin-detail" style="white-space:pre-wrap;overflow-wrap:anywhere">' + esc(JSON.stringify(result.data, null, 2)) + '</pre>' : '') +
      '<button class="outline" data-page="integrationSetup">Integration setup and provider status</button>';
  };
  pageTitles.connectorHub = 'Connector actions';

  const oldLiveConnections = pages.liveConnections;
  if (typeof oldLiveConnections === 'function') {
    pages.liveConnections = function() {
      return oldLiveConnections() + link('Integration setup', 'integrationSetup', 'See required credentials and provider state') +
        link('Connector actions', 'connectorHub', 'Use supported Google, GitHub, Slack and Notion actions');
    };
  }

  const oldDrawer = drawer;
  drawer = function() {
    let html = oldDrawer();
    return html.replace('<button class="drawer-item" data-page="library">',
      '<button class="drawer-item" data-page="webSearch">⌕　Web search</button>' +
      '<button class="drawer-item" data-page="deepResearch">◎　Deep research</button>' +
      '<button class="drawer-item" data-page="connectorHub">⌘　Connector actions</button>' +
      '<button class="drawer-item" data-page="library">'
    );
  };

  const oldAction = handleAction;
  handleAction = function(action, element) {
    if (action === 'v8Search') { nav('webSearch'); return; }
    if (action === 'v8DeepResearch') { nav('deepResearch'); return; }
    if (action === 'expertRunWebSearch') {
      const query = (document.getElementById('expertWebSearchQuery')?.value || '').trim();
      if (!query) { notify('Enter a search question first.'); return; }
      if (live.setActivity) live.setActivity('Searching public webpages…');
      request('web.search', { query })
        .then(result => {
          prefs.latestWebSearch = { query, answer: result.answer, sources: result.sources || [] };
          persist(); render();
          notify('Web search completed with ' + arr(result.sources).length + ' source(s).');
        })
        .catch(error => notify(error.message || 'Web search did not complete.'))
        .finally(() => { if (live.clearActivity) live.clearActivity(); });
      return;
    }
    if (action === 'expertRunDeepResearch') {
      const query = (document.getElementById('expertDeepResearchQuery')?.value || '').trim();
      if (!query) { notify('Enter a research question first.'); return; }
      if (live.setActivity) live.setActivity('Researching multiple public sources…');
      request('research.deep', { query })
        .then(result => {
          prefs.latestDeepResearch = { query, answer: result.answer, sources: result.sources || [], steps: result.steps || 0 };
          persist(); render();
          notify('Deep research completed. Reviewed ' + arr(result.sources).length + ' sources.');
        })
        .catch(error => notify(error.message || 'Deep research did not complete.'))
        .finally(() => { if (live.clearActivity) live.clearActivity(); });
      return;
    }
    if (action === 'expertConnectProvider') {
      const provider = element?.dataset?.provider || '';
      const entry = integration(provider);
      if (!entry) { notify('Provider status is not available.'); return; }
      if (entry.connected) { notify(entry.name + ' is already connected.'); return; }
      if (!entry.credentials_ready) { nav('integrationSetup'); notify('Add the required provider credentials in AppDeploy first.'); return; }
      request('integrations.connect', { provider }).catch(error => notify(error.message || 'Provider connection could not start.'));
      return;
    }
    if (action === 'expertTestOpenAi') {
      const entry = integration('openai');
      if (!entry || !entry.credentials_ready) {
        notify('Store OPENAI_API_KEY in the secure AppDeploy secret settings first.');
        return;
      }
      if (live.setActivity) live.setActivity('Checking OpenAI Platform…');
      request('openai.test', {})
        .then(result => notify('OpenAI Platform connection successful using ' + result.model + '.'))
        .catch(error => notify(error.message || 'OpenAI Platform connection test failed.'))
        .finally(() => { if (live.clearActivity) live.clearActivity(); });
      return;
    }
    if (action === 'expertRefreshIntegrations') {
      request('integrations.list', {}).then(result => {
        prefs.liveIntegrations = result.items || [];
        persist(); render(); notify('Integration status refreshed.');
      }).catch(error => notify(error.message || 'Could not refresh provider status.'));
      return;
    }
    if (action === 'expertRunConnector') {
      const connector = element?.dataset?.connector || '';
      const actions = {
        'google.drive': ['connectors.google.drive', 'Google Drive'],
        'google.gmail': ['connectors.google.gmail', 'Gmail'],
        'github.repos': ['connectors.github.repos', 'GitHub repositories'],
        'slack.channels': ['connectors.slack.channels', 'Slack channels'],
      };
      const selected = actions[connector];
      if (!selected) { notify('This connector action is not available.'); return; }
      request(selected[0], {}).then(data => {
        prefs.lastConnectorResult = { label: selected[1], data };
        persist(); render(); notify(selected[1] + ' data loaded.');
      }).catch(error => notify(error.message || selected[1] + ' is not connected or could not be read.'));
      return;
    }
    if (action === 'expertRunNotionSearch') {
      const query = (document.getElementById('expertNotionQuery')?.value || '').trim();
      if (!query) { notify('Enter a Notion search term.'); return; }
      request('connectors.notion.search', { query }).then(data => {
        prefs.lastConnectorResult = { label: 'Notion search', data };
        persist(); render(); notify('Notion search completed.');
      }).catch(error => notify(error.message || 'Notion is not connected or could not be searched.'));
      return;
    }
    if (action === 'expertDisableNotifications') {
      request('notifications.disable', {}).then(result => {
        prefs.push = false;
        prefs.browserNotificationPermission = result.permission || 'disabled';
        persist(); render(); notify('Push notifications disabled for this device.');
      }).catch(error => notify(error.message || 'Notifications could not be disabled.'));
      return;
    }
    if (action === 'expertTestNotifications') {
      request('notifications.test', {}).then(result => notify(
        result.sent > 0 ? 'Test push notification sent to ' + result.sent + ' device(s).' :
          'No registered push destination accepted the test. Check device support and notification permission.'
      )).catch(error => notify(error.message || 'Test notification failed.'));
      return;
    }
    return oldAction(action, element);
  };

  document.addEventListener('keydown', event => {
    if (event.key !== 'Enter' || event.shiftKey || event.isComposing) return;
    if (event.target?.id === 'expertWebSearchQuery') {
      event.preventDefault();
      const button = document.querySelector('[data-action="expertRunWebSearch"]');
      if (button) button.click();
    }
    if (event.target?.id === 'expertNotionQuery') {
      event.preventDefault();
      const button = document.querySelector('[data-action="expertRunNotionSearch"]');
      if (button) button.click();
    }
  }, true);

  window.EXPERT_AI_ADVANCED_FEATURES = { search: true, deepResearch: true, connectorHub: true };
})();