/* Nexa AI v8 · second uploaded video integration pass
   Adds connector overview/skills/install consent, and the full composer picker flow.
   All provider and AI interactions remain local demo previews unless a real provider is integrated. */
(() => {
  'use strict';
  const esc8 = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const addedApps = () => { if(!Array.isArray(prefs.videoPluginAdded)) prefs.videoPluginAdded=['Plugin Management']; return prefs.videoPluginAdded; };
  const asset = n => ({Gmail:'assets/plugins/gmail.jpg','Google Drive':'assets/plugins/google_drive.jpg',GitHub:'assets/plugins/github.jpg',Canva:'assets/plugins/canva.jpg',Higgsfield:'assets/plugins/higgsfield.jpg',Dropbox:'assets/plugins/plugin_management.jpg',ElevenLabs:'assets/plugins/plugin_management.jpg',Tripsy:'assets/plugins/plugin_management.jpg','Remote Desktop Commander':'assets/plugins/plugin_management.jpg','iCloud Mail':'assets/plugins/plugin_management.jpg','iCloud Calendar':'assets/plugins/plugin_management.jpg'}[n] || '');
  const appInfo = {
    Gmail:{publisher:'OpenAI (as displayed in the recording)',description:'Read and manage Gmail. The recording shows suggested email tasks and an app connection consent screen.',capability:'Read and write',developer:'OpenAI (video label)',website:'Not supplied / not verified',apps:['Gmail'],skills:[
      ['Summarize recent messages','Summarize the five most recent messages and extract decisions, open questions and next steps.'],
      ['Draft an email reply','Draft a concise reply to the latest message in a selected conversation.'],
      ['Find a message','Find an email by sender, subject or topic and summarize the relevant details.']
    ],source:'Gmail app detail, suggested task cards and consent sheet visible in supplied video.'},
    'Google Drive':{publisher:'OpenAI (as displayed in the recording)',description:'Work with connected Google Drive files and supported Google productivity apps.',capability:'Read and write (specific scopes not supplied)',developer:'OpenAI (video label)',website:'Not supplied / not verified',apps:['Google Docs','Google Drive Comments','Google Sheets','Google Slides'],skills:[
      ['Google Docs','Create, read and edit documents. Exact skill instructions are not fully legible in the supplied video.'],
      ['Google Drive Comments','Review and work with comments in Drive documents. Exact actions not verified.'],
      ['Google Sheets','Create, analyze and edit spreadsheets; follow a source-first workflow and verify the finished sheet.'],
      ['Google Slides','Work with presentations. Exact skill instructions are not supplied / not verified.']
    ],source:'Google Drive app details and skill chips visible in supplied video. The row lock icon is preserved as an unverified source state.'},
    GitHub:{publisher:'OpenAI (as displayed in the recording)',description:'Inspect repositories, review pull requests, triage issues and prepare code changes through a connected app.',capability:'Interactive and Write',developer:'OpenAI (video label)',website:'github.com',version:'Not supplied / not verified',privacy:'docs.github.com (shown in video; exact policy URL not verified)',terms:'docs.github.com (shown in video; exact terms URL not verified)',apps:['GitHub','GitHub Enterprise'],skills:[
      ['Repository review','Review repository context and summarize relevant changes. This is a task example, not a verified official skill title.'],
      ['Pull request triage','Summarize pull requests, checks and review feedback. This is a task example, not a verified official skill title.']
    ],source:'GitHub app detail and Apps list visible in supplied video.'},
    ElevenLabs:{publisher:'Eleven Labs Inc.',description:'Create and manage voice agents, review conversations, manage knowledge and tools, and generate speech, images, video and custom voices.',capability:'Voice agents and media',developer:'Eleven Labs Inc.',website:'Not supplied / not verified',apps:['ElevenLabs'],skills:[
      ['agent-simplification','Visible skill name in the video. Full skill instructions are not supplied.'],['agents','Visible skill name in the video. Full skill instructions are not supplied.'],['agents.platform','Visible skill name in the video. Full skill instructions are not supplied.'],['architect-agent-memory','Visible skill name in the video. Full skill instructions are not supplied.']
    ],source:'ElevenLabs app detail and four visible skill names in supplied video.'},
    Tripsy:{publisher:'Tripsy LLC',description:'Plan and organize trips. The recording shows trip-planning task cards and a Tripsy app entry.',capability:'Trip planning',developer:'Tripsy LLC',website:'Not supplied / not verified',apps:['Tripsy'],skills:[
      ['Plan a trip','Organize trip information and reservations into a usable itinerary. Illustrative task based on the visible app description.'],
      ['Review travel plans','Review trip details and identify missing or conflicting information. Illustrative task based on the visible app description.']
    ],source:'Tripsy app detail and task cards visible in supplied video.'},
    Dropbox:{publisher:'Not supplied / not verified',description:'Find, create and take action on files in Dropbox.',capability:'File search and actions',developer:'Not supplied / not verified',website:'Not supplied / not verified',apps:['Dropbox'],skills:[],source:'Dropbox app entry visible in supplied video; further details not supplied.'},
    'Remote Desktop Commander':{publisher:'Not supplied / not verified',description:'Use your computer from chat.',capability:'Remote computer operation',developer:'Not supplied / not verified',website:'Not supplied / not verified',apps:['Remote Desktop Commander'],skills:[],source:'App listing visible in supplied video; provider metadata not supplied.'},
    'iCloud Mail':{publisher:'Not supplied / not verified',description:'Read and manage iCloud email.',capability:'Email',developer:'Not supplied / not verified',website:'Not supplied / not verified',apps:['iCloud Mail'],skills:[],source:'New & noteworthy entry visible in supplied video.'},
    'iCloud Calendar':{publisher:'Not supplied / not verified',description:'Read and manage iCloud events.',capability:'Calendar',developer:'Not supplied / not verified',website:'Not supplied / not verified',apps:['iCloud Calendar'],skills:[],source:'New & noteworthy entry visible in supplied video.'},
    Canva:{publisher:'Not supplied / not verified',description:'Create, review and edit designs.',capability:'Creative design',developer:'Not supplied / not verified',website:'Not supplied / not verified',apps:['Canva'],skills:[],source:'App listing visible in the prior supplied video.'},
    Higgsfield:{publisher:'Not supplied / not verified',description:'Image and video creation models.',capability:'Image and video generation',developer:'Not supplied / not verified',website:'Not supplied / not verified',apps:['Higgsfield'],skills:[],source:'App listing and skill detail visible in supplied video.'}
  };
  const appName=()=>prefs.activeVideoPlugin||'Gmail';
  const skillMeta=()=>{
    const name=appName(), meta=appInfo[name]||{};
    const id=prefs.activeConnectorSkill||'';
    return (meta.skills||[]).find(x=>x[0]===id)||null;
  };
  const pickerInputs = `<div class="v8-hidden-pickers" aria-hidden="true"><input id="nexaCameraInput" type="file" accept="image/*" capture="environment"><input id="nexaPhotosInput" type="file" accept="image/*" multiple><input id="nexaDeviceFilesInput" type="file" multiple></div>`;

  // Additional app navigation items present in the second recording.
  try {
    const previousDrawer = drawer;
    drawer = function(){
      let html=previousDrawer();
      const insert='<button class="drawer-item" data-page="library">';
      const additions='<button class="drawer-item" data-page="images">▧　Images</button><button class="drawer-item" data-page="search">⌕　Search</button><button class="drawer-item" data-page="codex">⌘　Codex</button><button class="drawer-item" data-page="explore">✧　Explore</button><button class="drawer-item" data-page="subscription">✦　Upgrade to Pro</button>';
      return html.includes(insert)?html.replace(insert,additions+insert):html;
    };
  } catch(e) { /* retain the existing drawer if its binding is not writable */ }

  // Video-matched connector detail with app actions, skills and visible metadata.
  const oldPluginDetail8=pages.videoPluginDetail;
  pages.videoPluginDetail=function(){
    const name=appName();
    if(name==='Plugin Management') return oldPluginDetail();
    const m=appInfo[name]||{publisher:'Not supplied / not verified',description:'Details were not supplied / not verified.',capability:'Not supplied / not verified',developer:'Not supplied / not verified',website:'Not supplied / not verified',apps:[name],skills:[],source:'Supplied video · details not fully visible.'};
    const isAdded=addedApps().includes(name), img=asset(name);
    const appRows=(m.apps||[name]).map(x=>`<div class="v8-app-target"><span class="v8-app-target-icon">▣</span><span>${esc8(x)}</span><span class="v8-unverified">App</span></div>`).join('');
    const skills=(m.skills||[]).length?m.skills.map(([id,desc])=>`<button class="v8-skill-card" data-action="v8OpenSkill" data-skill="${esc8(id)}" data-plugin="${esc8(name)}"><span class="v8-skill-glyph">▤</span><span><b>${esc8(id)}</b><small>${esc8(desc)}</small></span><span>›</span></button>`).join(''):'<div class="v8-not-supplied">No individual skill names were readable or supplied for this app in the recording.</div>';
    return `<div class="video-plugin-detail v8-app-detail">
      <div class="v8-detail-hero">${img?`<img src="${esc8(img)}" alt="${esc8(name)} icon">`:`<span class="v8-detail-monogram">${esc8(name.slice(0,2))}</span>`}<div><h2>${esc8(name)}</h2><p>By ${esc8(m.publisher)}</p></div><button class="icon-btn" data-action="v8ShareConnector" aria-label="Share app">↗</button></div>
      <p class="v8-app-description">${esc8(m.description)}</p>
      <section class="video-plugin-info"><h3>App</h3>${appRows}</section>
      <section class="video-plugin-info"><h3>Skills</h3>${skills}<p class="v8-source-note">Skill labels and descriptions follow what is visible in the supplied recording. Where the full text is unreadable, the missing detail is identified rather than invented.</p></section>
      <section class="video-plugin-info"><h3>Information</h3><dl><dt>Capabilities</dt><dd>${esc8(m.capability||'Not supplied / not verified')}</dd><dt>Developer</dt><dd>${esc8(m.developer||'Not supplied / not verified')}</dd><dt>Website</dt><dd>${esc8(m.website||'Not supplied / not verified')}</dd><dt>Version</dt><dd>${esc8(m.version||'Not supplied / not verified')}</dd><dt>Privacy Policy</dt><dd>${esc8(m.privacy||'Not supplied / not verified')}</dd><dt>Terms of Service</dt><dd>${esc8(m.terms||'Not supplied / not verified')}</dd><dt>Source</dt><dd>${esc8(m.source)}</dd><dt>Authentication</dt><dd>Provider sign-in not run · not connected</dd><dt>Permission scopes</dt><dd>Not supplied / not verified</dd></dl></section>
      <button class="primary v8-install-btn" data-action="v8InstallConnector" data-plugin="${esc8(name)}">${isAdded?'Added to this demo':'Install plugin'}</button>
      <button class="outline" data-action="pluginPermissionDetail" data-plugin="${esc8(name)}">App permissions</button>
      <button class="outline" data-page="plugins">Back to Plugins</button>
      <p class="video-plugin-disclaimer">Installing adds this app to the local prototype only. It does not authenticate or connect an external account.</p>
    </div>`;
  };
  pages.v8ConnectorSkill=function(){
    const name=appName(), meta=skillMeta();
    const id=prefs.activeConnectorSkill||'Skill';
    const enabled=prefs.connectorSkillEnabled?.[name+':'+id]!==false;
    return `<div class="video-plugin-skill-page v8-skill-detail"><div class="v8-skill-head"><span class="v8-skill-glyph">▤</span><div><h2>${esc8(id)}</h2><small>${esc8(name)}</small></div></div>
      <div class="video-plugin-skill-toggle"><span>Use skill</span><button class="switch" role="switch" aria-checked="${enabled}" data-action="v8ToggleSkill"></button></div>
      <section class="video-plugin-info"><h3>What this skill does</h3><p>${esc8(meta?.[1]||'The recording shows this skill name, but its full instructions are not supplied / not verified.')}</p></section>
      <section class="video-plugin-info"><h3>Source and status</h3><dl><dt>App</dt><dd>${esc8(name)}</dd><dt>Skill name</dt><dd>${esc8(id)}</dd><dt>Instructions</dt><dd>${meta?'Partially visible in supplied recording':'Not supplied / not verified'}</dd><dt>Execution</dt><dd>Local preview only · no external tool action executed</dd></dl></section>
      <button class="primary" data-action="v8UseSkill" data-skill="${esc8(id)}">Use in chat</button>
      <button class="outline" data-action="v8InstallConnector" data-plugin="${esc8(name)}">Install plugin</button>
      <button class="outline" data-page="videoPluginDetail">Back to ${esc8(name)}</button></div>`;
  };
  pageTitles.v8ConnectorSkill='Skill details'; pageTitles.filesPicker='Add files'; pageTitles.v8OpenAIPlatform='OpenAI Platform';

  // Skills page gives the four video-visible Google Drive and ElevenLabs labels individual routes.
  pages.v8OpenAIPlatform=function(){return `<div class="video-plugin-detail"><div class="info-hero"><div class="large-icon">⌘</div><h2>OpenAI Platform</h2><p>Platform tools and developer resources. A provider login or API key is not configured in this offline prototype.</p></div><button class="outline" data-page="codex">Open Codex</button><button class="outline" data-page="plugins">Back to Plugins</button></div>`;};

  // App-style file chooser matching the video, while preserving safe local-only file metadata.
  const demoRecent = [
    {name:'V7_VALIDATION_REPORT.md',type:'text/markdown',size:3075,origin:'Nexa AI package'},
    {name:'CATALOGUE_SUMMARY.json',type:'application/json',size:3505,origin:'Nexa AI package'},
    {name:'IMPORT_VALIDATION_REPORT.md',type:'text/markdown',size:2814,origin:'Nexa AI package'},
    {name:'NEXA_AI_DATA_IMPORT_GUIDE.md',type:'text/markdown',size:4392,origin:'Nexa AI package'}
  ];
  pages.filesPicker=function(){
    const all=[...(prefs.recentLocalFiles||[]),...demoRecent].filter((f,i,a)=>a.findIndex(x=>x.name===f.name)===i);
    const tab=prefs.v8FilesTab||'Recent', q=(prefs.v8FilesQuery||'').toLowerCase();
    const filtered=all.filter(f=>{
      const kind=String(f.type||'').startsWith('image/')?'Images':String(f.type||'').startsWith('video/')?'Videos':'Documents';
      return (tab==='Recent'||tab==='All'||kind===tab)&&(!q||f.name.toLowerCase().includes(q));
    });
    return `<div class="v8-files-page"><div class="v8-files-toolbar"><div><b>Add files</b><small>Choose files to attach to this chat</small></div><button class="icon-btn" data-action="v8BrowseDeviceFiles">＋</button></div>
      <div class="v8-upload-card" data-action="v8BrowseDeviceFiles"><span>↑</span><b>Upload files</b><small>Browse your device</small></div>
      <div class="search-dock"><span>⌕</span><input id="v8FilesSearch" placeholder="Search recent files" value="${esc8(prefs.v8FilesQuery||'')}"></div>
      <div class="v8-file-tabs">${['Recent','Images','Documents','Videos'].map(t=>`<button class="${tab===t?'active':''}" data-action="v8FilesTab" data-tab="${t}">${t}</button>`).join('')}</div>
      <div class="v8-files-list">${filtered.map(f=>`<button class="v8-file-row" data-action="v8AttachRecentFile" data-name="${esc8(f.name)}" data-size="${Number(f.size)||0}" data-type="${esc8(f.type||'')}"><span class="v8-file-icon">${String(f.type||'').includes('image')?'▧':String(f.type||'').includes('video')?'▷':'▤'}</span><span><b>${esc8(f.name)}</b><small>${esc8(f.origin||'Recent file')} · ${esc8(f.type||'File type not supplied')}</small></span><span>＋</span></button>`).join('')||'<div class="nx-empty">No recent files in this category. Use Upload files to browse your device.</div>'}</div>
      <button class="outline" data-page="chat">Back to chat</button></div>${pickerInputs}`;
  };

  // Add native Android/browser capture and file inputs to chat/home pages.
  const oldChat8=pages.chat;
  pages.chat=function(){
    let html=oldChat8();
    const active=[];
    if(prefs.reasoningMode==='high') active.push('Think harder');
    if(prefs.composerToolMode) active.push(prefs.composerToolMode);
    if(prefs.studyMode) active.push('Study');
    const chip=active.length?`<div class="v8-composer-tools">${active.map(x=>`<span>${esc8(x)}</span>`).join('')}<button data-action="v8ClearModes">Clear</button></div>`:'';
    html=html.replace('<div class="chat-composer">',chip+'<div class="chat-composer">');
    return html+pickerInputs;
  };
  const oldHome8=pages.home;
  pages.home=function(){return oldHome8()+pickerInputs;};

  // Nested quick-action menus exactly matching the Add and Plugins sheets in the recording.
  const oldHandle8=handleAction;
  const showAddMenu=()=>{
    const icons={
      camera:`<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M7 16.5h7l3.4-5h13.2l3.4 5H41a3.5 3.5 0 0 1 3.5 3.5v18A3.5 3.5 0 0 1 41 41.5H7A3.5 3.5 0 0 1 3.5 38V20A3.5 3.5 0 0 1 7 16.5Z"/><circle cx="24" cy="28.5" r="8.3"/></svg>`,
      photos:`<svg viewBox="0 0 48 48" aria-hidden="true"><rect x="4.5" y="5" width="39" height="38" rx="5.5"/><circle cx="31.5" cy="16.5" r="4.2"/><path d="m6.5 34 9-8.5a4 4 0 0 1 5.6 0L40 43"/></svg>`,
      files:`<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M17 20v13a7 7 0 0 0 14 0V14a9 9 0 0 0-18 0v20a13 13 0 0 0 26 0V17"/></svg>`,
      plugins:`<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M35.7 13.2A19 19 0 1 0 40.3 30"/><path d="M17 19.5v-5m0 5a5.5 5.5 0 0 0-5.5 5.5v2.5a5.5 5.5 0 0 0 5.5 5.5h8.5a5.5 5.5 0 0 0 5.5-5.5v-2.5a5.5 5.5 0 0 0-5.5-5.5H17Zm5 0v-5m0 5v-3"/></svg>`,
      think:`<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M8.5 33.5a19 19 0 1 1 31 0"/><path d="m24 25 11-11"/><circle cx="24" cy="26" r="4"/></svg>`
    };
    const items=[
      ['Camera','v8Camera','camera'],
      ['Photos','v8Photos','photos'],
      ['Files','v8Files','files'],
      ['Plugins','v8Plugins','plugins'],
      ['Think harder','v8ThinkHarder','think']
    ];
    modalLayer.innerHTML=`<section class="expert-add-sheet" role="dialog" aria-label="Add to message">${items.map(([label,action,icon])=>`<button type="button" class="expert-add-option" data-action="${action}"><span class="expert-add-icon">${icons[icon]}</span><span class="expert-add-label">${label}</span></button>`).join('')}</section>`;
    modalLayer.hidden=false;
  };
  const showToolsMenu=()=>openModal('Plugins','Choose a tool for this message.',[
    {label:'Create image',value:'v8CreateImage'},{label:'Search',value:'v8Search'},{label:'Thinking',value:'v8Thinking'},
    {label:'Deep research',value:'v8DeepResearch'},{label:'Study',value:'v8Study'},{label:'OpenAI Platform',value:'v8Platform'}
  ]);
  const launchPicker=id=>{const el=document.getElementById(id);if(el){el.click();return true;}toast('Open a chat before choosing a file.');return false;};
  const beginConnectorInstall=name=>{
    prefs.pendingConnectorInstall=name;save();
    openModal('Connect '+name,
      `ChatGPT may share relevant memories, if enabled, and chats with ${name} to support interactions with this app. ${name}'s use of this data is subject to its own terms and privacy policy.\n\nIf Suggested prompts are enabled, data from this app may be used to proactively provide helpful information or suggestions.\n\nInformation from this app may be used to improve models depending on your data controls.\n\nThis prototype cannot open the provider's real sign-in or OAuth screen. Continue will add the app to this local demo only.`,
      [{label:'Continue (local demo)',value:'v8ConfirmConnectorInstall'},{label:'Cancel',value:'v8CancelConnectorInstall'}]);
  };
  handleAction=function(action,element){
    if(action==='composerPlus'){showAddMenu();return;}
    if(action==='v8BrowseDeviceFiles'){launchPicker('nexaDeviceFilesInput');return;}
    if(action==='v8OpenPluginsMenu'){showToolsMenu();return;}
    if(action==='v8Camera'){modalLayer.hidden=true;launchPicker('nexaCameraInput');return;}
    if(action==='v8Photos'){modalLayer.hidden=true;launchPicker('nexaPhotosInput');return;}
    if(action==='v8Files'){modalLayer.hidden=true;launchPicker('nexaDeviceFilesInput');return;}
    if(action==='v8Plugins'){modalLayer.hidden=true;nav('plugins');return;}
    if(action==='v8ThinkHarder'){prefs.reasoningMode=prefs.reasoningMode==='high'?'standard':'high';save();modalLayer.hidden=true;render();toast(prefs.reasoningMode==='high'?'Think harder enabled.':'Think harder disabled.');return;}
    if(action==='v8CreateImage'){prefs.composerToolMode='Create image';modalLayer.hidden=true;nav('images');return;}
    if(action==='v8Search'){prefs.composerToolMode='Search';prefs.studyMode=false;save();modalLayer.hidden=true;render();toast('Search mode selected. A live search provider is not connected.');return;}
    if(action==='v8Thinking'){prefs.reasoningMode=prefs.reasoningMode==='high'?'standard':'high';prefs.composerToolMode='Thinking';save();modalLayer.hidden=true;render();toast('Thinking mode selected. Hidden reasoning is not displayed.');return;}
    if(action==='v8DeepResearch'){prefs.composerToolMode='Deep research';prefs.studyMode=false;save();modalLayer.hidden=true;render();toast('Deep research mode selected. A live research service is not connected.');return;}
    if(action==='v8Study'){prefs.studyMode=!prefs.studyMode;prefs.composerToolMode=prefs.studyMode?'Study':'';save();modalLayer.hidden=true;render();toast(prefs.studyMode?'Study mode enabled in this demo.':'Study mode disabled.');return;}
    if(action==='v8Platform'){modalLayer.hidden=true;nav('v8OpenAIPlatform');return;}
    if(action==='v8ClearModes'){prefs.reasoningMode='standard';prefs.composerToolMode='';prefs.studyMode=false;save();render();return;}
    if(action==='v8InstallConnector'){beginConnectorInstall(element?.dataset?.plugin||appName());return;}
    if(action==='toggleVideoPlugin'){
      const name=element?.dataset?.plugin||'';
      if(!name)return;
      if(addedApps().includes(name)){prefs.videoPluginAdded=addedApps().filter(x=>x!==name);prefs.connectorInstallState=prefs.connectorInstallState||{};prefs.connectorInstallState[name]='removed_in_demo';save();render();toast(name+' removed from this demo.');return;}
      beginConnectorInstall(name);return;
    }
    if(action==='v8OpenSkill'){
      prefs.activeVideoPlugin=element?.dataset?.plugin||appName();prefs.activeConnectorSkill=element?.dataset?.skill||'';save();nav('v8ConnectorSkill');return;
    }
    if(action==='v8ToggleSkill'){
      const name=appName(),id=prefs.activeConnectorSkill||'Skill';prefs.connectorSkillEnabled=prefs.connectorSkillEnabled||{};const key=name+':'+id;prefs.connectorSkillEnabled[key]=prefs.connectorSkillEnabled[key]===false;save();render();toast(prefs.connectorSkillEnabled[key]?'Skill enabled in this demo.':'Skill disabled in this demo.');return;
    }
    if(action==='v8UseSkill'){
      const name=appName(),id=prefs.activeConnectorSkill||'Skill',meta=skillMeta();
      prefs.composerDraft=`Use the ${id} skill for ${name}. ${meta?.[1]||''}`.trim();save();nav('chat');
      const setDraft=()=>{const input=document.getElementById('chatInput');if(input)input.value=prefs.composerDraft||'';};
      setDraft();return;
    }
    if(action==='v8ShareConnector'){
      const name=appName(),txt=`${name} — ${appInfo[name]?.description||'Nexa AI app detail'}`;
      if(navigator.share)navigator.share({title:name,text:txt}).catch(()=>toast('Share cancelled or unavailable.'));
      else if(navigator.clipboard?.writeText)navigator.clipboard.writeText(txt).then(()=>toast('App details copied.')).catch(()=>openModal('Share app',txt));
      else openModal('Share app',txt);return;
    }
    if(action==='v8FilesTab'){prefs.v8FilesTab=element?.dataset?.tab||'Recent';save();render();return;}
    if(action==='v8AttachRecentFile'){
      const f={name:element?.dataset?.name||'Recent file',size:Number(element?.dataset?.size)||0,type:element?.dataset?.type||''};
      prefs.pendingChatFiles=[...(prefs.pendingChatFiles||[]),f];prefs.chatFileMeta=[...(prefs.chatFileMeta||[]),f].filter((x,i,a)=>a.findIndex(y=>y.name===x.name)===i);save();nav('chat');toast(f.name+' added to this message (demo metadata only).');return;
    }
    return oldHandle8(action,element);
  };
  const oldChoice8=clickChoice;
  clickChoice=function(value){
    if(value==='v8Plugins'){modalLayer.hidden=true;nav('plugins');return;}
    if(value==='v8Camera'){modalLayer.hidden=true;launchPicker('nexaCameraInput');return;}
    if(value==='v8Photos'){modalLayer.hidden=true;launchPicker('nexaPhotosInput');return;}
    if(value==='v8Files'){modalLayer.hidden=true;const input=document.getElementById('nexaDeviceFilesInput');if(input)input.click();return;}
    if(value==='v8ThinkHarder'){handleAction('v8ThinkHarder');return;}
    if(value==='v8ConfirmConnectorInstall'){
      const name=prefs.pendingConnectorInstall||appName();prefs.videoPluginAdded=addedApps();if(!prefs.videoPluginAdded.includes(name))prefs.videoPluginAdded.push(name);
      prefs.connectorInstallState=prefs.connectorInstallState||{};prefs.connectorInstallState[name]='added_to_demo_not_connected';prefs.pendingConnectorInstall='';save();modalLayer.hidden=true;render();toast(name+' added to this demo. External account not connected.');return;
    }
    if(value==='v8CancelConnectorInstall'){prefs.pendingConnectorInstall='';save();modalLayer.hidden=true;return;}
    if(value==='v8CreateImage'){handleAction('v8CreateImage');return;}
    if(value==='v8Search'){handleAction('v8Search');return;}
    if(value==='v8Thinking'){handleAction('v8Thinking');return;}
    if(value==='v8DeepResearch'){handleAction('v8DeepResearch');return;}
    if(value==='v8Study'){handleAction('v8Study');return;}
    if(value==='v8Platform'){handleAction('v8Platform');return;}
    return oldChoice8(value);
  };

  // File capture/photo/device selection adds metadata to the local library and current draft.
  screen.addEventListener('change',e=>{
    const id=e.target?.id;
    if(!['nexaCameraInput','nexaPhotosInput','nexaDeviceFilesInput'].includes(id))return;
    const files=[...(e.target.files||[])].slice(0,20);if(!files.length)return;
    const records=files.map(f=>({name:f.name,size:f.size,type:f.type,lastModified:f.lastModified,origin:id==='nexaCameraInput'?'Camera':id==='nexaPhotosInput'?'Photos':'Device files'}));
    prefs.recentLocalFiles=[...records,...(prefs.recentLocalFiles||[])].filter((f,i,a)=>a.findIndex(x=>x.name===f.name)===i).slice(0,100);
    prefs.chatFileMeta=[...(prefs.chatFileMeta||[]),...records].filter((f,i,a)=>a.findIndex(x=>x.name===f.name)===i).slice(-100);
    prefs.chatUploadedFiles=(prefs.chatFileMeta||[]).map(f=>f.name);
    prefs.pendingChatFiles=[...(prefs.pendingChatFiles||[]),...records.map(({name,size,type})=>({name,size,type}))];
    save();e.target.value='';if(currentPage==='chat')render();else nav('chat');toast(`${records.length} item(s) attached locally. File contents were not uploaded.`);
  });
  screen.addEventListener('input',e=>{
    if(e.target?.id==='v8FilesSearch'){
      prefs.v8FilesQuery=e.target.value;const q=prefs.v8FilesQuery.toLowerCase();
      screen.querySelectorAll('.v8-file-row').forEach(r=>r.style.display=r.innerText.toLowerCase().includes(q)?'flex':'none');
    }
  });

  // Give the drawer access to the pages exactly as in the supplied app navigation.
  Object.assign(pageTitles,{filesPicker:'Add files',v8ConnectorSkill:'Skill details',v8OpenAIPlatform:'OpenAI Platform'});
  window.NEXA_V8_VIDEO_FUNCTIONS={
    appConnectorDetails:true,appSkillCards:true,skillDetailAndEnable:true,installConsentSheet:true,
    cameraCaptureInput:true,photoPicker:true,filesBrowser:true,pluginsToolMenu:true,
    createImageSearchThinkingDeepResearchStudy:true,thinkHarderToggle:true,
    connectionStateExplicit:'added_to_demo_not_connected'
  };
})();
