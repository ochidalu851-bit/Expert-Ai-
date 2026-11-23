/* Nexa AI catalogue UI — offline search/detail experience over imported MCPTOP rows. */
(() => {
  'use strict';
  const C = window.NEXA_PLUGIN_CATALOGUE || {records:[],families:[],snapshots:[]};
  const $cat = (s, root=document) => root.querySelector(s);
  const escCat = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const famById = Object.fromEntries((C.families||[]).map(f=>[f.id,f]));
  const cats = (C.categories||[]).map(c=>c.name);
  const all = C.records || [];
  let catLimit=40;
  const fmt = n => Number(n||0).toLocaleString();
  const recordName = r => r.name || 'Name not supplied / not verified';
  const recordPublisher = r => r.publisherName || 'Publisher not supplied / not verified';
  const chip = (t, cls='') => `<span class="nx-chip ${cls}">${escCat(t)}</span>`;
  const select = (id, label, options, value='') => `<label class="nx-filter"><span>${escCat(label)}</span><select id="${id}">${options.map(o=>`<option value="${escCat(o.value)}" ${o.value===value?'selected':''}>${escCat(o.label)}</option>`).join('')}</select></label>`;

  function currentSearchRecords() {
    const q=($cat('#nxCatalogueSearch')?.value || '').trim().toLocaleLowerCase();
    const family=$cat('#nxFamilyFilter')?.value || '';
    const category=$cat('#nxCategoryFilter')?.value || '';
    const snap=$cat('#nxSnapshotFilter')?.value || '';
    const state=$cat('#nxStateFilter')?.value || '';
    const kind=$cat('#nxKindFilter')?.value || '';
    return all.filter(r=>{
      if(q && !(r.searchFields||'').includes(q)) return false;
      if(family && !(r.capabilityFamilyIds||[]).includes(family)) return false;
      if(category && !(r.categories||[]).includes(category)) return false;
      if(snap && !(r.snapshots||[]).some(s=>s.snapshotDate===snap)) return false;
      if(kind && r.listingKind!==kind) return false;
      if(state==='catalogue-only' && r.availabilityState!=='catalogue-only') return false;
      if(state==='available-to-connect' && r.availabilityState!=='available-to-connect') return false;
      if(state==='connected' && r.connectionState!=='connected') return false;
      if(state==='disconnected' && r.connectionState!=='disconnected') return false;
      if(state==='unavailable' || state==='unsupported') return false; // no source/runtime evidence in imported rows
      if(state==='verified' && r.verificationState!=='verified') return false;
      if(state==='not-verified' && r.verificationState==='verified') return false;
      return true;
    });
  }
  function resultsHtml(rows) {
    const shown=rows.slice(0,catLimit);
    const cards=shown.map(r=>{
      const icon=r.sourceIconUrl ? `<img class="nx-app-icon" src="${escCat(r.sourceIconUrl)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : `<span class="nx-app-icon nx-icon-fallback">${escCat((recordName(r)[0]||'•').toUpperCase())}</span>`;
      const families=(r.capabilityFamilyIds||[]).slice(0,2).map(fid=>famById[fid]?.name).filter(Boolean);
      const state=r.availabilityState==='available-to-connect'?'Available-to-connect · connector listing':'Catalogue-only';
      const snapdates=[...new Set((r.snapshots||[]).map(s=>s.snapshotDate))].join(' + ');
      return `<button class="nx-result-card" data-action="openPluginRecord" data-record-id="${escCat(r.id)}">
        ${icon}<span class="nx-result-main"><strong>${escCat(recordName(r))}</strong><small>${escCat(recordPublisher(r))} · ${escCat((r.categories||[]).join(', ')||'Category not supplied')}</small><small>${escCat(r.description||'Description not supplied / not verified')}</small><span class="nx-result-tags">${chip(state)}${families.map(f=>chip(f)).join('')}${chip(snapdates,'nx-muted')}</span></span><span class="nx-result-arrow">›</span>
      </button>`;
    }).join('');
    return `${cards || `<div class="nx-empty">No catalogue entries match these filters.</div>`}${rows.length>shown.length?`<button class="outline nx-more" data-action="loadCatalogueMore">Show next 40 (${fmt(rows.length-shown.length)} remaining)</button>`:''}`;
  }
  function updateCatalogueResults(reset=false) {
    if(reset) catLimit=40;
    const rows=currentSearchRecords();
    const count=$cat('#nxCatalogueCount'); if(count) count.textContent=`${fmt(rows.length)} matches · ${fmt(all.length)} unique records`;
    const result=$cat('#nxCatalogueResults'); if(result) result.innerHTML=resultsHtml(rows);
  }
  function cataloguePage() {
    catLimit=40;
    const famOptions=[{value:'',label:'All capability families'},...(C.families||[]).map(f=>({value:f.id,label:f.name}))];
    const catOptions=[{value:'',label:'All source categories'},...cats.map(c=>({value:c,label:c}))];
    const snapOptions=[{value:'',label:'All supplied snapshots'},{value:'2026-11-09',label:'MCPTOP · Nov 9, 2026 (page 1 only)'},{value:'2026-11-10',label:'MCPTOP · Nov 10, 2026 (pages 2–7)'}];
    const stateOptions=[{value:'',label:'All states'},{value:'catalogue-only',label:'Catalogue-only'},{value:'available-to-connect',label:'Available-to-connect'},{value:'connected',label:'Connected'},{value:'disconnected',label:'Disconnected'},{value:'unavailable',label:'Unavailable (none verified)'},{value:'unsupported',label:'Unsupported (none verified)'},{value:'verified',label:'Verified (none supplied)'},{value:'not-verified',label:'Not verified'}];
    const kindCounts=all.reduce((o,r)=>(o[r.listingKind||'not supplied']=(o[r.listingKind||'not supplied']||0)+1,o),{});
    const kindOptions=[{value:'',label:'All listing types'},...Object.entries(kindCounts).sort((a,b)=>a[0].localeCompare(b[0])).map(([value,n])=>({value,label:`${value} (${fmt(n)})`}))];
    return `<div class="nx-intro"><div class="nx-eyebrow">NEXA AI · APP DIRECTORY</div><h2>Plugin catalogue</h2><p>Search imported app, plugin and connector records by name, publisher, category, capability family or description.</p><div class="nx-statline"><b>${fmt(all.length)}</b><span>unique stable IDs</span><b>${fmt(C.recordOccurrences)}</b><span>source rows</span></div></div>
      <div class="nx-warning"><b>Snapshot coverage notice</b><p>The archive contains 2,000 rows from the Nov 9 snapshot (header count 12,404) and 10,629 rows from a separate Nov 10 snapshot (header count 12,629). It does not include all seven Nov 9 pages. The two dates remain separately filterable.</p></div>
      <div class="nx-searchbox"><span>⌕</span><input id="nxCatalogueSearch" placeholder="Search name, publisher, category, family, capability or description" autocomplete="off"></div>
      <div class="nx-filter-grid">${select('nxFamilyFilter','Capability family',famOptions)}${select('nxCategoryFilter','Source category',catOptions)}${select('nxKindFilter','Listing type',kindOptions)}${select('nxSnapshotFilter','Source snapshot',snapOptions)}${select('nxStateFilter','Catalogue / connection state',stateOptions)}</div>
      <div class="nx-countline" id="nxCatalogueCount">${fmt(all.length)} matches · ${fmt(all.length)} unique records</div>
      <div id="nxCatalogueResults" class="nx-results">${resultsHtml(all)}</div>
      <div class="nx-section-links"><button class="outline" data-page="capabilityFamilies">12 capability families</button><button class="outline" data-page="catalogueProvenance">Import provenance</button></div>
      <p class="nx-smallnote">Official identity, publisher, icon and short description are shown only when supplied in the source export. Family mappings are Nexa inferences. Tool definitions, API endpoints, permissions and authentication details are not supplied by these PDFs.</p>`;
  }
  function detailPage() {
    const id=prefs.activePluginRecordId;
    const r=all.find(x=>x.id===id);
    if(!r) return `<div class="nx-empty">Catalogue record not found. <button class="outline" data-page="pluginCatalogue">Back to catalogue</button></div>`;
    const icon=r.sourceIconUrl?`<img class="nx-detail-icon" src="${escCat(r.sourceIconUrl)}" alt="Source-provided icon for ${escCat(recordName(r))}; official status not independently verified" referrerpolicy="no-referrer">`:`<div class="nx-detail-icon nx-icon-fallback">${escCat((recordName(r)[0]||'•').toUpperCase())}</div>`;
    const fam=(r.capabilityFamilyIds||[]).map(fid=>{const f=famById[fid];return f?`<div class="nx-family-detail"><b>${escCat(f.name)}</b><p>${escCat(f.description)}</p><small>Capabilities: ${escCat(f.capabilities.join(' · '))}</small></div>`:''}).join('');
    const snapshots=(r.snapshots||[]).map(s=>{
      const sf=s.sourceRecordFields||{};
      const rowFields=[['Name',sf.name],['Slug',sf.slug],['Publisher',sf.publisherName],['Short description',sf.oneLiner],['Categories',(sf.categories||[]).join(', ')],['Listing kind',sf.listingKind],['Tier',sf.tier],['Type',sf.type],['Tool count',sf.toolCount],['Component count',sf.componentCount],['Source verification flag',sf.isVerified],['Icon URL',sf.iconUrl],['Publisher URL',sf.publisherUrl],['Directory URL',sf.directoryUrl],['Added date',sf.addedAt],['Updated date',sf.updatedAt],['Rank',sf.rank],['Rank change 1 day',sf.rankDelta1d],['Rank change 7 days',sf.rankDelta7d],['Extraction status',sf.extractionStatus]];
      return `<details class="nx-snapshot-row"><summary><b>${escCat(s.snapshotDate)} · API page ${s.apiPageNumber}</b><span>Header count ${fmt(s.snapshotHeaderCount)} · Supplied rows ${fmt(s.recordsInSuppliedPdfPart)} · Rank ${s.rank??'not supplied'}</span><span>${escCat(s.sourcePdf||'')} · ${escCat(s.sourceUrlStatus||'')}</span></summary><div class="nx-kv nx-version-fields">${rowFields.map(([k,v])=>`<b>${escCat(k)}</b><span>${escCat(v===null||v===undefined||v===''?'Not supplied / not verified':Array.isArray(v)?v.join(', '):v)}</span>`).join('')}</div><small>Source URL: ${escCat(s.sourceUrl||'Not supplied / not verified')}</small></details>`;
    }).join('');
    const sourceMeta=[['Stable record ID',r.id],['Slug',r.slug],['Publisher',recordPublisher(r)],['Publisher website',r.publisherUrl||'Not supplied / not verified'],['Source category',(r.categories||[]).join(', ')||'Not supplied / not verified'],['Listing kind',r.listingKind||'Not supplied / not verified'],['Source tier',r.tier||'Not supplied / not verified'],['Source type',r.type||'Not supplied / not verified'],['Source rank',r.rank??'Not supplied / not verified'],['Source component count',r.componentCount??'Not supplied / not verified']];
    return `<div class="nx-detail-head">${icon}<div><h2>${escCat(recordName(r))}</h2><p>${escCat(recordPublisher(r))}</p><div class="nx-result-tags">${chip(r.availabilityState)}${chip(r.connectionState,'nx-muted')}${chip(r.verificationState,'nx-muted')}</div></div></div>
      <div class="nx-warning nx-warning-soft"><b>Not an installed app</b><p>Being listed in this directory does not mean it is installed or authenticated. This offline package has not connected this service.</p></div>
      <section class="nx-detail-section"><h3>Description</h3><p>${escCat(r.description||'Not supplied / not verified')}</p><small>${escCat(r.descriptionStatus||'')}</small></section>
      <section class="nx-detail-section"><h3>Availability, connection and verification</h3><div class="nx-kv"><b>Catalogue availability</b><span>${escCat(r.availabilityState)} — ${escCat(r.availabilityExplanation)}</span><b>Connection state</b><span>${escCat(r.connectionState)} — ${escCat(r.connectionExplanation)}</span><b>Verification state</b><span>${escCat(r.verificationState)}</span><b>Icon status</b><span>${escCat(r.iconStatus||'Not supplied / not verified')}</span></div><small>No connect, install or verify action is simulated as successful. A real connection requires provider-specific endpoints, authentication and permission metadata, none of which this source export supplies.</small></section>
      <section class="nx-detail-section"><h3>Capability family mapping</h3><p class="nx-smallnote">Inferred from the supplied name, slug, short description and source categories. This is not an official source field.</p>${fam}</section>
      <section class="nx-detail-section"><h3>Functions and tools / actions</h3><div class="nx-kv"><b>Functions</b><span>${escCat(r.functions)}</span><b>Tool count in source</b><span>${r.toolCount===0?'0 (source export value)':escCat(r.toolCount??'Not supplied / not verified')}</span><b>Individual tool/action definitions</b><span>${escCat(r.toolsActions?.definitions||'Not supplied / not verified')}</span></div></section>
      <section class="nx-detail-section"><h3>APIs and authentication</h3><div class="nx-kv"><b>Available APIs</b><span>${escCat(r.availableApis)}</span><b>API endpoints</b><span>${escCat(r.apiEndpoints)}</span><b>Authentication</b><span>${escCat(r.authentication)}</span><b>Permissions</b><span>${escCat(r.permissions)}</span></div></section>
      <section class="nx-detail-section"><h3>Source record details</h3><div class="nx-kv">${sourceMeta.map(([k,v])=>`<b>${escCat(k)}</b><span>${escCat(v)}</span>`).join('')}</div>${r.directoryUrl?`<p><a class="nx-link" href="${escCat(r.directoryUrl)}" target="_blank" rel="noopener noreferrer">Open source directory listing ↗</a></p>`:''}${r.publisherUrl?`<p><a class="nx-link" href="${escCat(r.publisherUrl)}" target="_blank" rel="noopener noreferrer">Publisher website (source supplied) ↗</a></p>`:''}</section>
      <section class="nx-detail-section"><h3>Snapshot history (${r.recordVersionCount})</h3>${snapshots}</section>
      <button class="outline nx-back-catalogue" data-page="pluginCatalogue">Back to plugin catalogue</button>`;
  }
  function familiesPage() {
    const cards=(C.families||[]).map(f=>{
      const count=all.filter(r=>(r.capabilityFamilyIds||[]).includes(f.id)).length;
      return `<button class="nx-family-card" data-action="filterByFamily" data-family="${escCat(f.id)}"><b>${escCat(f.name)}</b><p>${escCat(f.description)}</p><small>${fmt(count)} mapped catalogue records · inferred mapping</small><div>${f.capabilities.map(x=>chip(x)).join('')}</div></button>`;
    }).join('');
    return `<div class="nx-intro"><div class="nx-eyebrow">NEXA AI FRAMEWORK</div><h2>12 capability families</h2><p>These are the capability families requested for Nexa AI. Record counts overlap because one listing may map to several families.</p></div><div class="nx-family-grid">${cards}</div><button class="outline" data-page="pluginCatalogue">Search catalogue</button>`;
  }
  function provenancePage() {
    const rows=(C.snapshots||[]).map(s=>`<div class="nx-snapshot-row"><b>${escCat(s.snapshotDate)} · page ${s.apiPageNumber} of ${s.pagesInSnapshotAccordingToHeader}</b><span>Header count ${fmt(s.snapshotHeaderCount)} · supplied rows ${fmt(s.recordsInSuppliedPdfPart)} · ranks ${s.rankCoverage?.[0]}–${s.rankCoverage?.[1]}</span><span>${escCat(s.pdfFilename)}</span><span>Source: ${escCat(s.sourceName)} · ${escCat(s.sourceParameter)} · ${escCat(s.metric)}</span><span>URL: ${escCat(s.sourceUrl)} (${escCat(s.sourceUrlStatus)})</span><span>${fmt(s.partialExtractions)} partial extractions · ${fmt(s.missingNames)} missing names</span></div>`).join('');
    return `<div class="nx-intro"><div class="nx-eyebrow">DATA QUALITY & PROVENANCE</div><h2>Import provenance</h2><p>Every listing retains source filename, source name, inferred source URL, snapshot date, page number, header count and supplied coverage count.</p></div>
      <div class="nx-warning"><b>Do not describe this as a complete 12,404-row November 9 snapshot.</b><p>The one November 9 PDF supplied is page 1 only (2,000 rows) of a 7-page snapshot with header count 12,404. Pages 2–7 belong to November 10 with header count 12,629.</p></div>
      <section class="nx-detail-section"><h3>Snapshot parts supplied</h3>${rows}</section>
      <section class="nx-detail-section"><h3>OpenApps · November 8, 2026</h3><p>No OpenApps snapshot file or individual record rows were present in this uploaded archive, and none was located in the available Library search. The request identifies a taxonomy summary of 6 families and 13 categories, but does not provide their labels here. No OpenApps records or taxonomy names were invented or imported. Upload the OpenApps source snapshot to add its individual rows and retain its own date and provenance.</p><div class="nx-kv"><b>Snapshot date</b><span>2026-11-08</span><b>Expected taxonomy summary</b><span>6 families · 13 categories (names not supplied / not verified)</span><b>Individual records imported</b><span>0 — source missing</span></div></section>
      <section class="nx-detail-section"><h3>Record quality</h3><div class="nx-kv"><b>Unique stable IDs</b><span>${fmt(C.recordCount)}</span><b>Source row occurrences</b><span>${fmt(C.recordOccurrences)}</span><b>MCPTOP versions merged by exact ID</b><span>${fmt(C.recordOccurrences-C.recordCount)} repeated rows</span><b>API / tool definitions</b><span>Not supplied / not verified</span><b>Permissions and auth</b><span>Not supplied / not verified</span><b>Verification</b><span>Source isVerified=null for all supplied rows</span></div></section>
      <button class="outline" data-page="pluginCatalogue">Back to catalogue</button>`;
  }

  // New pages are registered after the original interface code has loaded.
  Object.assign(pageTitles,{pluginCatalogue:'Plugin catalogue',catalogueDetail:'App details',capabilityFamilies:'Capability families',catalogueProvenance:'Import provenance'});
  pages.pluginCatalogue=cataloguePage;
  pages.catalogueDetail=detailPage;
  pages.capabilityFamilies=familiesPage;
  pages.catalogueProvenance=provenancePage;
  pages.plugins=function(){
    const counts=all.reduce((o,r)=>(o[r.listingKind||'not supplied']=(o[r.listingKind||'not supplied']||0)+1,o),{});
    const connectors=counts.connector||0, apps=counts.app||0, plugins=counts.plugin||0;
    return `<div class="nx-intro nx-plugin-entry"><div class="nx-eyebrow">NEXA AI</div><h2>Apps & plugins</h2><p>Browse source-listed apps, plugins and connectors. Catalogue entries are not automatically installed or connected.</p><div class="nx-statline"><b>${fmt(all.length)}</b><span>unique records</span><b>${fmt(apps)}</b><span>apps</span><b>${fmt(plugins)}</b><span>plugins</span><b>${fmt(connectors)}</b><span>connectors</span></div></div>
      <button class="nx-feature-link" data-page="pluginCatalogue"><span>⌕</span><b>Search complete plugin catalogue</b><small>Search by name, publisher, category, capability or description</small><i>›</i></button>
      <div class="nx-section-links"><button class="outline" data-page="capabilityFamilies">12 capability families</button></div>
      ${section('Existing demo integrations')}${group(row('Popular apps and plugin previews','newNoteworthy','✦','Examples from the supplied screen recording'))}
      <p class="nx-smallnote">The previous small demo list is retained as a UI preview. It is separate from the imported 12,618-record MCPTOP catalogue.</p>`;
  };

  const baseCatalogueHandle=handleAction;
  handleAction=function(action,element){
    if(action==='openPluginRecord'){
      prefs.activePluginRecordId=element?.dataset?.recordId||''; save(); nav('catalogueDetail');
    } else if(action==='loadCatalogueMore'){
      catLimit+=40; updateCatalogueResults(false);
    } else if(action==='filterByFamily'){
      const fid=element?.dataset?.family||''; prefs.catalogueInitialFamily=fid; nav('pluginCatalogue');
    } else baseCatalogueHandle(action,element);
  };

  // Family chips on a family screen can open a pre-filtered catalogue.
  const baseNav=nav;
  nav=function(page){
    if(page==='pluginCatalogue' && prefs.catalogueInitialFamily){
      const fid=prefs.catalogueInitialFamily; prefs.catalogueInitialFamily='';
      baseNav(page);
      const filter=$cat('#nxFamilyFilter'); if(filter){filter.value=fid;updateCatalogueResults(true);}
      return;
    }
    baseNav(page);
  };

  screen.addEventListener('input',e=>{
    if(e.target?.id==='nxCatalogueSearch') updateCatalogueResults(true);
  });
  screen.addEventListener('change',e=>{
    if(['nxFamilyFilter','nxCategoryFilter','nxKindFilter','nxSnapshotFilter','nxStateFilter'].includes(e.target?.id)) updateCatalogueResults(true);
  });
  window.addEventListener('error',e=>{
    const img=e.target;
    if(img && img.tagName==='IMG' && img.classList?.contains('nx-app-icon')){
      const fallback=document.createElement('span');fallback.className='nx-app-icon nx-icon-fallback';fallback.textContent=(img.alt||'•').slice(0,1).toUpperCase();img.replaceWith(fallback);
    }
  },true);
})();
