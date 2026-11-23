/* Nexa AI · new video integration pass (2026-11-10)
   Recreates the supplied plugin directory, per-row + actions, Plugin Management skill flow,
   and conversation overflow actions. Every connection/action is local-demo state only. */
(() => {
  'use strict';
  const escV = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const groupsV = [
    {name:'Popular',items:[
      ['Gmail','Read and manage Gmail','G','', 'assets/plugins/gmail.jpg'],
      ['Google Drive','Drive, Docs, Sheets or Slides','D','locked','assets/plugins/google_drive.jpg'],
      ['GitHub','Triage PRs, issues, CI and publish flows','GH','','assets/plugins/github.jpg'],
      ['Remote Desktop Commander','Use your computer from chat','DC','','']
    ]},
    {name:'Productivity',items:[
      ['Notion','Create docs, tasks, databases','N'],['Google Calendar','Manage Google Calendar events','31'],
      ['Dropbox','Find, create and take action','◇'],['Metricool','Analyze and schedule posts','∞']
    ]},
    {name:'Communication',items:[
      ['Slack','Read and manage Slack','✣'],['Hostinger Mail','Use Hostinger mail','H'],['Outlook Email','Triage Outlook inboxes','O'],['Teams','Summarize Teams and follow up','T']
    ]},
    {name:'Creativity',items:[
      ['Canva','Create, review, edit designs','C','', 'assets/plugins/canva.jpg'],['Higgsfield','Every image and video model','H','', 'assets/plugins/higgsfield.jpg'],
      ['Figma','Create designs, ship to code','F'],['Product Design','Explore and prototype ideas','PD']
    ]},
    {name:'Developer Tools',items:[
      ['Vercel','Build and deploy apps','▲'],['TinyFish','Find and complete web tasks','🐠'],['Lovable','Build full-stack apps by chat','L']
    ]},
    {name:'Fitness',items:[
      ['Gym','Workout plans and insights','GYM'],['Tredict','Analyze workouts, create plans','T']
    ]},
    {name:'Finance',items:[
      ['Interactive Brokers (IBKR)','Analyze global markets','IB'],['Public Equity Investing','Public equity research','P'],
      ['Binance','Explore Binance market data','B'],['Longbridge','Stock quotes, financial data','LB']
    ]},
    {name:'Travel',items:[
      ['Booking.com','Find all best stays and more.','B.'],['Skyscanner','Find cheap flights','S'],['Trip.com','All-in-one Travel Companion','Trip.'],['Flight Network','Search and book flights','✓']
    ]},
    {name:'Entertainment',items:[
      ['Daily Tarot','Draw cards and reflect','✧'],['Flaim Fantasy','Your fantasy sports leagues','FF'],['Spotify','Music and podcasts for you','●']
    ]},
    {name:'Education',items:[
      ['Consensus','Search peer-reviewed research','C'],['SciSpace','For science and research','Sci'],['Zotero','Find papers and add citations from Zotero','Z'],['Acumen by Talarion','Keep your AI up to date','T']
    ]},
    {name:'Business & Operations',items:[
      ['Shopify','Create and manage your store','S'],['Sales','Practical workflows for sales','↗'],['vidIQ','Grow on YouTube, IG, TikTok','IQ'],['Windsor.ai','Connect 350 data sources','W']
    ]},
    {name:'Data & Analytics',items:[
      ['Data','Answer questions with data','D'],['GSC Wizard - SEO analysis','Search Console, Bing and GA4','GSC'],['PostHog','Analyze your product data','P'],['Blockscout Blockchain Data','Find and analyze blockchain data','B']
    ]},
    {name:'Scientific Research',items:[
      ['Undermind','Find and read research papers','U'],['Life Sciences Literature','Find biomedical papers, preprints, and open research','LS'],
      ['NGS Analysis Workbench','Analyze sequencing data','DNA'],['Life Sciences Databases','Query structured public life-science data','DB']
    ]},
    {name:'Security',items:[
      ['Codex Security','Security scanning for your codebase','CS'],['Malwarebytes','Verify links, domains, phones.','M'],
      ['PrivacyHawk','Protect your personal data','PH'],['AJAXX Data Scrubber','Remove exposed personal data','AX']
    ]},
    {name:'Other',items:[
      ['LinkedIn','Find the right professional','in'],['Kleinanzeigen','Echte Deals. Echte Menschen.','K'],['Etsy','Shop Home, Style & more','E'],['Ask Tarot Cards','Tarot card readings','☼']
    ]}
  ];
  const newNoteworthy = [
    ['iCloud Mail','Read and manage iCloud email','✉'],['iCloud Calendar','Read and manage iCloud events','1']
  ];
  const catalogueCategorySourcesV = {
    'Productivity':['productivity'],
    'Communication':['communication'],
    'Creativity':['creativity'],
    'Developer Tools':['developer tools'],
    'Fitness':['healthcare'],
    'Finance':['finance'],
    'Travel':['travel'],
    'Entertainment':['entertainment'],
    'Education':['education & research'],
    'Business & Operations':['business & operations'],
    'Data & Analytics':['data & analytics','analytics'],
    'Scientific Research':['scientific research'],
    'Security':['security'],
    'Other':['other']
  };
  const catalogueRecordsV = window.NEXA_PLUGIN_CATALOGUE?.records || [];
  const catalogueCategoryCountsV = Object.fromEntries(Object.entries(catalogueCategorySourcesV).map(([label,source])=>[
    label,catalogueRecordsV.filter(record=>(record.categories||[]).some(value=>source.includes(String(value).toLowerCase()))).length
  ]));
  const byName = new Map();
  groupsV.forEach(g=>g.items.forEach(a=>byName.set(a[0],{name:a[0],description:a[1],icon:a[2],locked:a[3]==='locked',image:a[4]||'',category:g.name,source:'Supplied screen recording · 2026-11-10'})));
  newNoteworthy.forEach(a=>byName.set(a[0],{name:a[0],description:a[1],icon:a[2],locked:false,image:'',category:'New & noteworthy',source:'Supplied screen recording · 2026-11-10'}));
  const knownImages = {
    'Gmail':'assets/plugins/gmail.jpg','Google Drive':'assets/plugins/google_drive.jpg','GitHub':'assets/plugins/github.jpg',
    'Canva':'assets/plugins/canva.jpg','Higgsfield':'assets/plugins/higgsfield.jpg','Outlook Email':'assets/plugins/outlook_email.jpg',
    'Slack':'assets/plugins/slack.jpg','Hostinger Mail':'assets/plugins/hostinger_mail.jpg','Teams':'assets/plugins/teams.jpg','Plugin Management':'assets/plugins/plugin_management.jpg'
  };
  const getAdded=()=>{
    if(!Array.isArray(prefs.videoPluginAdded)){prefs.videoPluginAdded=['Plugin Management'];save();}
    return prefs.videoPluginAdded;
  };
  const addItem=(name)=>{
    const a=getAdded(); if(!a.includes(name)) a.push(name); save();
  };
  const removeItem=(name)=>{prefs.videoPluginAdded=getAdded().filter(x=>x!==name);save();};
  const pluginIcon=(item)=>{
    const src=item.image||knownImages[item.name];
    return src?`<img class="video-plugin-icon" src="${escV(src)}" alt="">`:`<span class="video-plugin-icon video-plugin-monogram" data-monogram="${escV(item.icon||item.name.slice(0,1))}">${escV(item.icon||item.name.slice(0,1))}</span>`;
  };
  const statusFor=(name)=> name==='Plugin Management'?'Installed in this demo':getAdded().includes(name)?'Added to this demo · not connected':'Catalogue listing · not installed';
  function itemRow(item){
    const added=getAdded().includes(item.name);
    const lock=item.locked;
    const right=lock?`<button class="video-plugin-lock" data-action="videoPluginLocked" data-plugin="${escV(item.name)}" aria-label="Connection requires approval">♙</button>`:
      `<button class="video-plugin-add ${added?'is-added':''}" data-action="toggleVideoPlugin" data-plugin="${escV(item.name)}" aria-label="${added?'Remove':'Add'} ${escV(item.name)}">${added?'✓':'＋'}</button>`;
    return `<div class="video-plugin-row"><button class="video-plugin-main" data-action="openVideoPluginDetail" data-plugin="${escV(item.name)}">${pluginIcon(item)}<span class="video-plugin-copy"><b>${escV(item.name)}</b><small>${escV(item.description)}</small></span></button>${right}</div>`;
  }
  function installedCard(){
    const names=getAdded();
    if(!names.length)return '<div class="nx-empty">No apps added yet. Use + beside a plugin to add one.</div>';
    return `<div class="video-installed-grid">${names.map(n=>{
      if(n==='Plugin Management')return `<button class="video-installed-card" data-action="openVideoPluginDetail" data-plugin="Plugin Management"><span class="video-plugin-monogram video-plugin-icon plugin-mgmt-mark">✣</span><span>Plugin Management</span><small>Local demo app</small></button>`;
      const it=byName.get(n)||{name:n,icon:n.slice(0,1),description:'Added in this demo'};
      return `<button class="video-installed-card" data-action="openVideoPluginDetail" data-plugin="${escV(n)}">${pluginIcon(it)}<span>${escV(n)}</span><small>Added · not connected</small></button>`;
    }).join('')}</div>`;
  }
  function videoPluginsPage(){
    const hidden=prefs.videoPluginCollapsed||{};
    return `<div class="video-plugin-page">
      <div class="video-plugin-section-head"><button data-action="openVideoPluginInstalled">Installed <span>›</span></button></div>
      ${installedCard()}
      ${groupsV.slice(0,1).map(g=>`<section class="video-plugin-category video-popular"><button class="video-plugin-section-head" data-page="videoPopular"><span>${escV(g.name)}</span><span>4</span><span>›</span></button></section>`).join('')}
      <section class="video-plugin-category"><button class="video-plugin-section-head" data-page="newNoteworthy"><span>New & noteworthy</span><span>2</span><span>›</span></button></section>
      ${groupsV.slice(1).map(g=>{
        const title=g.name;
        const count=catalogueCategoryCountsV[title]||0;
        return `<section class="video-plugin-category"><button class="video-plugin-section-head" data-action="browseCatalogueCategory" data-category="${escV(title)}"><span>${escV(title)}</span><span>${count.toLocaleString()}</span><span>›</span></button></section>`;
      }).join('')}
      <div class="video-plugin-footer-links"><button class="outline" data-page="capabilityFamilies">12 capability families</button></div>
      <div class="search-dock video-plugin-search"><span>⌕</span><input id="pluginSearch" placeholder="Search plugins" autocomplete="off"></div>
    </div>`;
  }
  function popularPluginsPage(){
    const items=groupsV[0].items;
    return `<div class="video-plugin-section-head static-head">Popular</div><div class="video-plugin-items">${items.map(a=>itemRow(byName.get(a[0]))).join('')}</div>
      <div class="video-plugin-footer-links"><button class="outline" data-page="plugins">Back to Plugins</button></div>`;
  }
  function newNoteworthyPage(){
    return `<div class="video-plugin-section-head static-head">New & noteworthy</div><div class="video-plugin-items">${newNoteworthy.map(a=>itemRow(byName.get(a[0]))).join('')}</div>
      <div class="video-plugin-footer-links"><button class="outline" data-page="plugins">Back to Plugins</button></div>`;
  }
  function installedAppsPage(){
    const names=getAdded();
    return `<div class="video-plugin-detail"><div class="video-plugin-section-head static-head">Installed</div>${names.map(n=>{const it=n==='Plugin Management'?{name:n,description:'App and plugin management skill',icon:'✣'}:(byName.get(n)||{name:n,description:'Added in this demo',icon:n.slice(0,1)});return `<div class="video-plugin-row">${pluginIcon(it)}<button class="video-plugin-installed-open" data-action="openVideoPluginDetail" data-plugin="${escV(n)}"><b>${escV(n)}</b><small>${n==='Plugin Management'?'Installed in this demo':'Added to this demo · not connected'}</small></button>${n==='Plugin Management'?'':`<button class="mini-action" data-action="toggleVideoPlugin" data-plugin="${escV(n)}">Remove</button>`}</div>`;}).join('')}<button class="outline" data-page="plugins">Browse plugins</button></div>`;
  }
  function detailPage(){
    const n=prefs.activeVideoPlugin||'Plugin Management';
    if(n==='Plugin Management')return pluginManagementPage();
    const it=byName.get(n)||{name:n,description:'Details were not supplied in the video.',icon:n.slice(0,1),category:'Not supplied / not verified',source:'Supplied screen recording · 2026-11-10'};
    const added=getAdded().includes(n);
    return `<div class="video-plugin-detail">
      <div class="video-plugin-detail-hero">${pluginIcon(it)}<div><h2>${escV(it.name)}</h2><p>${escV(it.description)}</p></div></div>
      <div class="video-plugin-state"><b>${escV(statusFor(n))}</b><small>Demo state only. This does not establish an external provider connection.</small></div>
      <section class="video-plugin-info"><h3>App information</h3><dl><dt>Category</dt><dd>${escV(it.category)}</dd><dt>Publisher</dt><dd>Not supplied / not verified</dd><dt>Official icon</dt><dd>${it.image?'Existing video/reference asset':'Not supplied; text fallback shown'}</dd><dt>Functions</dt><dd>${escV(it.description)}. Other functions not supplied / not verified.</dd><dt>Tools / actions</dt><dd>Not supplied / not verified</dd><dt>Available APIs</dt><dd>Not supplied / not verified</dd><dt>Permissions</dt><dd>Not supplied / not verified</dd><dt>Authentication</dt><dd>Not supplied / not verified</dd><dt>Source</dt><dd>${escV(it.source)}</dd></dl></section>
      <button class="primary" data-action="toggleVideoPlugin" data-plugin="${escV(n)}">${added?'Remove from demo apps':'＋ Add to demo apps'}</button>
      <button class="outline" data-action="pluginPermissionDetail" data-plugin="${escV(n)}">App permissions</button>
      <button class="outline" data-page="plugins">Back to Plugins</button>
      <p class="video-plugin-disclaimer">Adding an item here changes the local prototype only. No service is authenticated or connected.</p>
    </div>`;
  }
  function pluginManagementPage(){
    return `<div class="video-plugin-detail">
      <div class="video-plugin-manager-hero"><img class="video-plugin-manager-icon video-plugin-manager-image" src="assets/plugins/plugin_management.jpg" alt="Plugin Management"><div><h2>Plugin Management</h2><p>Installed in this local demo · external connection not verified</p></div></div>
      <div class="video-plugin-info"><div class="video-plugin-section-head static-head">Skills</div><button class="video-plugin-skill-row" data-page="pluginManagementSkill"><span>⬡</span><b>plugin-management</b><span>›</span></button></div>
      <div class="video-plugin-info"><div class="video-plugin-section-head static-head">Read actions</div>
        <button class="video-plugin-action-row" data-action="pluginManagementAction" data-plugin-action="get.app.permissions">get app permissions <span>›</span></button>
        <button class="video-plugin-action-row" data-action="pluginManagementAction" data-plugin-action="get plugin dependencies">get plugin dependencies <span>›</span></button>
      </div>
      <div class="video-plugin-info"><div class="video-plugin-section-head static-head">Write actions</div>
        <button class="video-plugin-action-row" data-action="pluginManagementAction" data-plugin-action="uninstall app">Uninstall app <span>›</span></button>
        <button class="video-plugin-action-row" data-action="pluginManagementAction" data-plugin-action="update app permissions">Update app permissions <span>›</span></button>
      </div>
      <button class="outline" data-page="plugins">Back to Plugins</button>
    </div>`;
  }
  function skillPage(){
    return `<div class="video-plugin-skill-page">
      <div class="video-plugin-skill-title">plugin-management</div>
      <div class="video-plugin-skill-toggle">Use skill <button class="switch" role="switch" data-toggle="pluginManagementSkillEnabled" aria-checked="${prefs.pluginManagementSkillEnabled!==false}"></button></div>
      <article class="video-plugin-skill-copy" ${prefs.pluginManagementSkillEnabled===false?'data-disabled="true"':''}>
        <p>Use the Plugin Management app to discover useful integrations and manage existing plugins. Choose the most direct capability for the user's task before searching for anything new.</p>
        <h3>Choose the right capability</h3>
        <ol><li>Use an available built-in tool when it already provides the needed capability. General web search, image generation, memory and site tools do not require a plugin unless the user requests a specific external provider or a capability unavailable natively.</li>
        <li>Use an already connected plugin when it can complete the task.</li>
        <li>Search for a plugin when an external app, account, service or data source would materially improve the result and no available tool can access it.</li></ol>
        <p>Infer plugin intent from the user's actual task. Requests involving email, calendars, messaging, documents, project management, customer systems, finance or analytics may need an external integration even when the user never says “plugin”, “install” or “connect”.</p>
        <h3>Find and suggest plugins</h3>
        <p>Search using concise provider names, product names or capability keywords. The current tool list and any recommended plugin list are not a complete directory. Suggest the smallest useful set, preferably three or fewer. Do not suggest plugins already installed or already pending.</p>
        <p>Suggestions do not block the task. Continue any work that does not require the connection and briefly explain what still needs the user's action. Never claim a plugin is installed or connected without verification.</p>
        <h3>Manage existing plugins</h3>
        <ul><li>Use <code>get.app.permissions</code> to inspect a plugin's permissions.</li><li>Use <code>update.app.permissions</code> only for a permission change the user requested. Ask before ambiguous, broad or risky changes.</li><li>Use <code>get.plugin.dependencies</code> to inspect required apps or dependencies.</li><li>Use <code>uninstall.app</code> only when the user explicitly requests removal.</li></ul>
        <p>Correct an obvious spelling mistake when the intended plugin is unambiguous; otherwise use its actual name without inventing an identifier. Keep explanations focused on the task, connection state and requested change. Do not expose internal tool names or claim actions happened without checking results.</p>
        <div class="video-plugin-note">This is a local reference preview of the skill description shown in the supplied recording. The listed actions do not execute against external services.</div>
      </article>
      <button class="outline" data-page="videoPluginDetail">Back to Plugin Management</button>
    </div>`;
  }
  function uploadedFilesPage(){
    const files=prefs.chatUploadedFiles||[];
    return `<div class="video-plugin-detail"><p class="video-plugin-disclaimer">Files shown here are names selected in this browser demo. This does not upload files to a real conversation.</p><label class="primary file-button" for="chatUploadInput">＋ Add files</label><input id="chatUploadInput" type="file" multiple hidden>
      ${files.length?`<div class="video-plugin-info">${files.map((f,i)=>`<div class="video-plugin-action-row"><span>📎 ${escV(f)}</span><button class="mini-action" data-action="removeChatFile" data-index="${i}">Remove</button></div>`).join('')}</div>`:'<div class="nx-empty">No uploaded files in this demo conversation.</div>'}
      <button class="outline" data-page="chat">Back to chat</button></div>`;
  }
  function findInChatPage(){
    const q=prefs.chatFindQuery||''; const msgs=prefs.temporaryChat?(prefs.temporaryMessages||[]):(prefs.chatHistory||[]);
    const filtered=msgs.map((m,i)=>({...m,_i:i})).filter(m=>!q||String(m.text||'').toLowerCase().includes(q.toLowerCase()));
    return `<div class="video-plugin-detail"><div class="search-dock find-chat-search"><span>⌕</span><input id="findChatInput" value="${escV(q)}" placeholder="Find in chat"></div><div class="video-plugin-info">${filtered.map(m=>`<div class="find-chat-result"><small>${m.role==='user'?'You':'Assistant'}</small><p>${escV(m.text)}</p></div>`).join('')||'<div class="nx-empty">No matching messages.</div>'}</div><button class="outline" data-page="chat">Back to chat</button></div>`;
  }
  function currentChatMessages(){return prefs.temporaryChat?(prefs.temporaryMessages||[]):(prefs.chatHistory||[]);}
  function chatPageWithActions(){
    const msgs=currentChatMessages();
    const thread=msgs.length?`<div class="chat-thread">${msgs.map((m,i)=>`<div class="chat-message-wrap ${m.role==='user'?'user-message-wrap':'assistant-message-wrap'}"><div class="chat-bubble ${m.role==='user'?'user-bubble':'assistant-bubble'}">${escV(m.text)}</div>${m.role==='assistant'?`<div class="video-message-toolbar"><button data-action="chatMessageAction" data-message-index="${i}" data-message-action="copy" aria-label="Copy">▢</button><button data-action="chatMessageAction" data-message-index="${i}" data-message-action="like" aria-label="Good response">♧</button><button data-action="chatMessageAction" data-message-index="${i}" data-message-action="dislike" aria-label="Bad response">♧</button><button data-action="chatMessageAction" data-message-index="${i}" data-message-action="read" aria-label="Read aloud">◖</button><button data-action="chatMessageAction" data-message-index="${i}" data-message-action="share" aria-label="Share">↗</button><button data-action="chatOptions" aria-label="More response actions">⋮</button></div>`:''}</div>`).join('')}</div>`:`<div class="chat-welcome"><h2>What would you like help with?</h2><p>I can help you learn, create, research or organize your work.</p></div>`;
    return `${prefs.temporaryChat?'<div class="temporary-pill">◌　Temporary chat</div>':''}${prefs.chatPinned?'<div class="video-chat-state">📌 Pinned conversation</div>':''}${prefs.chatLocked?'<div class="video-chat-state">🔒 Locked in this demo</div>':''}${thread}<div class="chat-composer"><button data-action="composerPlus" aria-label="Add">＋</button><input id="chatInput" placeholder="Reply to ChatGPT"><button data-action="voiceInput" aria-label="Microphone">♩</button><button class="voice-send" data-page="voiceMode" aria-label="Voice conversation">◖</button><button class="send-button" data-action="sendChat" aria-label="Send">↑</button></div>`;
  }
  function openVideoChatMenu(){
    modalLayer.hidden=false; modalLayer.classList.add('video-chat-menu-layer');
    const rows=[['share','Share','↗'],['pin',prefs.chatPinned?'Unpin':'Pin','⚑'],['lock',prefs.chatLocked?'Unlock chat':'Lock chat','♙'],['project','Add to project','⊞'],['uploads','Uploaded files','📎'],['find','Find in chat','⌕'],['home','Add to home','⌂'],['archive','Archive','▣'],['delete','Delete','▤']];
    modalLayer.innerHTML=`<div class="video-chat-menu"><div class="video-chat-menu-title">${escV(prefs.recentChatTitle||'Chat')}</div>${rows.map(([id,label,ic])=>`<button data-action="videoChatMenuChoice" data-menu-action="${id}" class="${id==='delete'?'is-danger':''}"><span>${ic}</span>${label}</button>`).join('')}</div>`;
  }
  function infoModal(title,copy,options=[]){
    modalLayer.classList.remove('video-chat-menu-layer');modalLayer.hidden=false;
    modalLayer.innerHTML=`<div class="modal"><div class="modal-handle"></div><div class="modal-title">${escV(title)}</div><p class="modal-copy">${escV(copy)}</p>${options.map(o=>`<button class="option" data-action="videoPluginModalChoice" data-modal-value="${escV(o.value)}"><strong>${escV(o.label)}</strong>${o.description?`<small>${escV(o.description)}</small>`:''}</button>`).join('')}<button class="secondary" data-action="closeModal">Close</button></div>`;
  }
  function archiveCurrent(){
    const messages=currentChatMessages();
    prefs.archivedChats=prefs.archivedChats||[];
    prefs.archivedChats.unshift({title:prefs.recentChatTitle||'Archived conversation',messages:messages.slice(),date:new Date().toISOString()});
    if(prefs.temporaryChat){prefs.temporaryMessages=[];prefs.temporaryChat=false;} else prefs.chatHistory=[];
    save();modalLayer.hidden=true;modalLayer.classList.remove('video-chat-menu-layer');nav('home');
    if(typeof toast==='function')toast('Conversation archived in this demo.');
  }
  function doMenuAction(action){
    modalLayer.hidden=true;modalLayer.classList.remove('video-chat-menu-layer');
    if(action==='share'){const text=(currentChatMessages()||[]).map(m=>(m.role==='user'?'You: ':'Assistant: ')+m.text).join('\n');if(navigator.share){navigator.share({title:prefs.recentChatTitle||'Nexa AI chat',text:text||'Nexa AI conversation'}).catch(()=>infoModal('Share chat','A public sharing link is not generated by this offline prototype.'));}else infoModal('Share chat','A public sharing link is not generated by this offline prototype. Use the response Copy action to copy text instead.');}
    else if(action==='pin'){prefs.chatPinned=!prefs.chatPinned;save();render();toast(prefs.chatPinned?'Chat pinned in this demo.':'Chat unpinned.');}
    else if(action==='lock'){prefs.chatLocked=!prefs.chatLocked;save();render();toast(prefs.chatLocked?'Chat locked in this demo. No real device lock was enabled.':'Chat unlocked in this demo.');}
    else if(action==='project'){
      const projects=prefs.projects||[]; const opts=projects.map(n=>({label:n,value:'project:'+n}));
      opts.push({label:'Create a new project',value:'project:new'});
      infoModal('Add to project','Choose a project for this conversation.',opts);
    }
    else if(action==='uploads')nav('chatUploads');
    else if(action==='find'){prefs.chatFindQuery='';save();nav('findInChat');}
    else if(action==='home'){prefs.savedHomeChats=prefs.savedHomeChats||[];const name=prefs.recentChatTitle||'Saved conversation';if(!prefs.savedHomeChats.includes(name))prefs.savedHomeChats.unshift(name);save();toast('Chat added to Home in this demo.');}
    else if(action==='archive')archiveCurrent();
    else if(action==='delete')infoModal('Delete chat?','This removes the local demo conversation from this browser. It does not delete any external account data.',[{label:'Delete this conversation',value:'deleteCurrent'}]);
  }
  function doModalChoice(value){
    if(value==='deleteCurrent'){
      if(prefs.temporaryChat){prefs.temporaryMessages=[];prefs.temporaryChat=false;}else prefs.chatHistory=[];
      prefs.chatPinned=false;prefs.chatLocked=false;save();modalLayer.hidden=true;render();toast('Demo conversation deleted.');return true;
    }
    if(value==='project:new'){
      const name='Saved conversations';prefs.projects=prefs.projects||[];if(!prefs.projects.includes(name))prefs.projects.push(name);
      prefs.projectAssignments=prefs.projectAssignments||{};prefs.projectAssignments[prefs.recentChatTitle||'Current chat']=name;save();modalLayer.hidden=true;toast('Added to Saved conversations.');return true;
    }
    if(value.startsWith('project:')){
      const name=value.slice(8);prefs.projectAssignments=prefs.projectAssignments||{};prefs.projectAssignments[prefs.recentChatTitle||'Current chat']=name;save();modalLayer.hidden=true;toast('Added to '+name+'.');return true;
    }
    return false;
  }
  function pluginAction(action,name){
    if(action==='get app permissions'){
      infoModal('App permissions',`${name}: current app permission information is not supplied by the video or connected provider. Current demo-wide setting: ${prefs.permissionMode||'Always ask'}. No external permissions were inspected.`);
    } else if(action==='get plugin dependencies'){
      infoModal('Plugin dependencies',`Dependencies for ${name} are not supplied / not verified in the source recording. No external dependency lookup was made.`);
    } else if(action==='uninstall app'){
      infoModal('Uninstall Plugin Management?','This removes only the local demo entry. No external application or account will be uninstalled.',[{label:'Uninstall from this demo',value:'uninstallManager'}]);
    } else if(action==='update app permissions'){
      infoModal('Update app permissions','Select the local demo permission mode. This does not change a real provider permission.',[
        {label:'Always ask',value:'perm:Always ask'},{label:'Allow read actions',value:'perm:Allow read actions'},{label:'Allow low-risk actions',value:'perm:Allow low-risk actions'}
      ]);
    }
  }
  const pluginIconByName = n => byName.get(n)||{name:n,description:'Plugin Management skills and actions',icon:'✣',category:'Installed'};

  pageTitles.plugins='Plugins'; pageTitles.videoPopular='Popular'; pageTitles.newNoteworthy='New & noteworthy'; pageTitles.videoInstalledApps='Installed apps'; pageTitles.videoPluginDetail='Plugin details';
  pageTitles.pluginManagementSkill='plugin-management';pageTitles.chatUploads='Uploaded files';pageTitles.findInChat='Find in chat';pageTitles.archivedChats='Archived chats';
  pages.plugins=videoPluginsPage;
  const previousCustomizePage=pages.customize;
  pages.customize=function(){const html=previousCustomizePage();return html.replace(/\d+ added/g,`${getAdded().length} added`);};
  pages.permissions=function(){
    const names=getAdded();
    return `<div class="video-plugin-detail">${section('Preferences')}<div class="video-plugin-info"><button class="video-plugin-action-row" data-action="permissionMode"><span>Permissions</span><small>${escV(prefs.permissionMode||'Allow low-risk actions')}</small><span>›</span></button></div>${section('Added')}<div class="video-plugin-info">${names.map(n=>`<button class="video-plugin-action-row" data-action="openVideoPluginDetail" data-plugin="${escV(n)}"><span>${escV(n)}</span><span>›</span></button>`).join('')||'<p class="nx-empty">No apps added.</p>'}</div><button class="outline" data-page="plugins">Browse plugins</button></div>`;
  };
  pages.videoPopular=popularPluginsPage;
  pages.newNoteworthy=newNoteworthyPage;
  pages.videoInstalledApps=installedAppsPage;
  pages.videoPluginDetail=detailPage;
  pages.pluginManagementSkill=skillPage;
  pages.chat=chatPageWithActions;
  pages.chatUploads=uploadedFilesPage;
  pages.findInChat=findInChatPage;
  pages.archivedChats=function(){const xs=prefs.archivedChats||[];return `<div class="video-plugin-detail">${xs.map((x,i)=>`<div class="video-plugin-info"><b>${escV(x.title)}</b><small>${escV(x.date||'')}</small><p>${(x.messages||[]).length} messages</p><button class="outline" data-action="restoreArchivedChat" data-index="${i}">Restore chat</button></div>`).join('')||'<div class="nx-empty">No archived chats.</div>'}<button class="outline" data-page="home">Back home</button></div>`;};

  const previousHomePage=pages.home;
  pages.home=function(){
    const base=previousHomePage(); const saved=prefs.savedHomeChats||[];
    return base+(saved.length?`<div class="video-saved-home"><div class="video-plugin-section-head static-head">Saved to Home</div>${saved.map(n=>`<button class="row" data-page="chat"><span class="row-main"><span class="row-label">${escV(n)}</span><span class="row-sub">Saved conversation</span></span><span class="chevron">›</span></button>`).join('')}</div>`:'');
  };
  const previousProjectsPage=pages.projects;
  pages.projects=function(){
    const base=previousProjectsPage(); const a=prefs.projectAssignments||{}; const rows=Object.entries(a);
    return base+(rows.length?`<div class="video-plugin-info"><div class="video-plugin-section-head static-head">Chats in projects</div>${rows.map(([chat,project])=>`<div class="video-plugin-action-row"><span>${escV(chat)}</span><small>${escV(project)}</small></div>`).join('')}</div>`:'');
  };
  const oldVideoIntegrationAction=handleAction;
  handleAction=function(action,element){
    if(action==='openVideoPluginDetail'){prefs.activeVideoPlugin=element?.dataset?.plugin||'Plugin Management';save();nav('videoPluginDetail');}
    else if(action==='toggleVideoPlugin'){
      const name=element?.dataset?.plugin||''; if(!name)return;
      if(getAdded().includes(name)){removeItem(name);toast(name+' removed from demo apps.');}
      else {addItem(name);toast(name+' added to demo apps. External connection not made.');}
      render();
    }
    else if(action==='videoPluginLocked'){
      const name=element?.dataset?.plugin||'App';infoModal(name,'This entry shows a lock in the supplied video. The video does not disclose its authentication or lock requirements. Connection is not verified.');
    }
    else if(action==='toggleVideoPluginCategory'){
      const n=element?.dataset?.category||'';prefs.videoPluginCollapsed=prefs.videoPluginCollapsed||{};prefs.videoPluginCollapsed[n]=!prefs.videoPluginCollapsed[n];save();render();
    }
    else if(action==='openVideoPluginInstalled'){nav('videoInstalledApps');}
    else if(action==='pluginManagementAction')pluginAction(element?.dataset?.pluginAction||'', 'Plugin Management');
    else if(action==='pluginPermissionDetail')infoModal('App permissions',`${element?.dataset?.plugin||'This app'} has no verified external permission listing in the supplied video. Choose global permissions in Settings → Plugins.`);
    else if(action==='videoChatMenuChoice')doMenuAction(element?.dataset?.menuAction||'');
    else if(action==='chatOptions')openVideoChatMenu();
    else if(action==='videoPluginModalChoice'){
      const v=element?.dataset?.modalValue||'';
      if(doModalChoice(v))return;
      if(v.startsWith('perm:')){prefs.permissionMode=v.slice(5);save();modalLayer.hidden=true;render();toast('Demo permission preference updated.');}
      else if(v==='uninstallManager'){removeItem('Plugin Management');modalLayer.hidden=true;nav('plugins');toast('Plugin Management removed from this demo.');}
    }
    else if(action==='chatMessageAction'){
      const i=Number(element?.dataset?.messageIndex),what=element?.dataset?.messageAction;const msg=currentChatMessages()[i];
      if(what==='copy'){const text=msg?.text||'';if(navigator.clipboard?.writeText){navigator.clipboard.writeText(text).then(()=>toast('Response copied.')).catch(()=>infoModal('Copy response',text));}else infoModal('Copy response',text);}
      else if(what==='like'||what==='dislike'){prefs.messageFeedback=prefs.messageFeedback||{};prefs.messageFeedback[i]=what;save();toast(what==='like'?'Feedback saved.':'Feedback saved.');}
      else if(what==='read'){if('speechSynthesis' in window && typeof SpeechSynthesisUtterance!=='undefined' && msg?.text){window.speechSynthesis.cancel();window.speechSynthesis.speak(new SpeechSynthesisUtterance(msg.text));toast('Reading response aloud.');}else toast('Read aloud is not supported by this browser.');}
      else if(what==='share')infoModal('Share response','A share link is not available in this offline demo.');
    }
    else if(action==='removeChatFile'){const i=Number(element?.dataset?.index);prefs.chatUploadedFiles=(prefs.chatUploadedFiles||[]).filter((_,j)=>j!==i);save();render();}
    else if(action==='restoreArchivedChat'){const i=Number(element?.dataset?.index);const x=(prefs.archivedChats||[])[i];if(x){prefs.chatHistory=x.messages||[];prefs.recentChatTitle=x.title;prefs.archivedChats.splice(i,1);save();nav('chat');}}
    else if(action==='closeModal'){modalLayer.hidden=true;modalLayer.classList.remove('video-chat-menu-layer');}
    else oldVideoIntegrationAction(action,element);
  };
  const oldVideoIntegrationChoice=clickChoice;
  clickChoice=function(value){if(doModalChoice(String(value)))return;oldVideoIntegrationChoice(value);};

  // The supplied app shows a separate + control beside each app. Row taps open details.
  screen.addEventListener('input',e=>{
    if(e.target?.id==='pluginSearch'){
      const q=e.target.value.trim().toLowerCase();
      screen.querySelectorAll('.video-plugin-row').forEach(r=>r.style.display=!q||r.innerText.toLowerCase().includes(q)?'flex':'none');
      screen.querySelectorAll('.video-plugin-category').forEach(s=>{const visible=[...s.querySelectorAll('.video-plugin-row')].some(r=>r.style.display!=='none');s.style.display=(!q||visible)?'block':'none';});
    }
    if(e.target?.id==='findChatInput'){prefs.chatFindQuery=e.target.value;save();const q=e.target.value.toLowerCase();screen.querySelectorAll('.find-chat-result').forEach(r=>r.style.display=r.innerText.toLowerCase().includes(q)?'block':'none');}
  });
  screen.addEventListener('change',e=>{
    if(e.target?.id==='chatUploadInput'){
      const names=[...(e.target.files||[])].map(f=>f.name);prefs.chatUploadedFiles=[...(prefs.chatUploadedFiles||[]),...names].slice(0,100);save();render();toast('File names added to the local demo. Files were not uploaded.');
    }
  });
  // Ensure the custom modal is restored to the normal bottom sheet after use.
  modalLayer.addEventListener('click',e=>{if(e.target===modalLayer){modalLayer.hidden=true;modalLayer.classList.remove('video-chat-menu-layer');}});
  // Expose a compact inventory for local QA without creating external connections.
  window.NEXA_VIDEO_PLUGIN_DIRECTORY={groups:groupsV.map(g=>({name:g.name,count:g.items.length})),recordCount:[...byName.keys()].length,source:'user-supplied video recordings 2026-11-10'};
})();
