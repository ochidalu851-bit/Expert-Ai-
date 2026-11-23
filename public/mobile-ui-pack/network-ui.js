/* Expert AI live network diagnostics and download route selection. */
(() => {
  'use strict';
  let networkState = { device: null, cloud: null, loading: false, error: '', lastDownload: null };
  const currentRoute = () => prefs.downloadNetworkMode === 'cloud' ? 'cloud' : 'device';
  const infoRow = (label, value) => '<div class="row" style="min-height:42px"><span class="row-main"><span class="row-label">' + esc(label) + '</span></span><span class="row-value" style="max-width:62%;text-align:right">' + esc(value || 'Not reported') + '</span></div>';
  const routeChoice = (id, title, description, selected) =>
    '<button type="button" class="row" data-action="networkRoute" data-route="' + id + '" style="text-align:left;min-height:64px">' +
    '<span class="row-icon">' + (selected ? '◉' : '○') + '</span><span class="row-main"><span class="row-label">' + title + '</span><span class="row-sub">' + description + '</span></span>' +
    '<span class="row-value">' + (selected ? 'Selected' : 'Choose') + '</span></button>';
  function networkDetails(title, snapshot, missingText) {
    if (!snapshot?.network?.ip) {
      return '<div class="group"><div class="row"><span class="row-main"><span class="row-label">' + esc(title) + '</span><span class="row-sub">' + esc(snapshot?.error || missingText || 'Not checked yet') + '</span></span></div></div>';
    }
    const n = snapshot.network, c = n.connection || {};
    return '<div class="group">' +
      infoRow('Public IP address', n.ip) +
      infoRow('IP version', n.ipType || 'IPv4') +
      infoRow('ISP / network operator', c.isp) +
      infoRow('Network organisation', c.org) +
      infoRow('ASN', c.asn ? 'AS' + c.asn : '') +
      infoRow('Network domain', c.domain) +
      infoRow('Country', n.country) +
      infoRow('Region / state', n.region) +
      infoRow('City', n.city) +
      infoRow('Timezone', n.timezone) +
      '</div>';
  }
  function networkPage() {
    const mode = currentRoute();
    const cloud = networkState.cloud;
    const cloudHost = cloud?.hosting || {};
    const cloudRouteText = cloud?.upstreamZone
      ? String(cloud.upstreamZone)
      : (cloud?.route?.upstreamZone || 'Serving zone not returned by edge diagnostics');
    return '<div class="info-hero compact"><div class="large-icon">⇄</div><h2>Network & Downloads</h2><p>Inspect the real internet connection used by this device and by Expert AI cloud downloads. Choose which connection retrieves a file.</p></div>' +
      section('Download network selection') +
      '<div class="group">' +
      routeChoice('device', 'Device internet', 'Download directly using this phone’s Wi-Fi or mobile carrier (MTN, Airtel, Glo, etc.).', mode === 'device') +
      routeChoice('cloud', 'Expert AI cloud · Railway', 'Expert AI retrieves the file from its Railway server and saves it to your account storage.', mode === 'cloud') +
      '</div>' +
      '<div class="field-wrap" style="margin:14px 0 8px"><label class="small-muted" for="networkDownloadUrl">Public file URL (HTTPS)</label><input class="field" id="networkDownloadUrl" type="url" inputmode="url" placeholder="https://example.com/file.zip" value="' + esc(networkState.lastUrl || '') + '"></div>' +
      '<button type="button" class="primary" data-action="networkDownload">Download using ' + (mode === 'cloud' ? 'Railway cloud' : 'device internet') + '</button>' +
      '<p class="setting-note">Cloud downloads accept public HTTPS websites on port 443 and files up to 25 MB. Device downloads open the original website directly.</p>' +
      '<button type="button" class="outline" data-action="networkRefresh" ' + (networkState.loading ? 'disabled' : '') + '>' + (networkState.loading ? 'Checking live connections…' : 'Refresh live network details') + '</button>' +
      '<p class="setting-note">The refresh sends the public IP address of each connection to IPWho (ipwho.is) to identify its ISP, network organisation and ASN. No account password or file is sent.</p>' +
      section('This device · direct internet') +
      networkDetails('Device network', networkState.device, 'Tap Refresh live network details to identify the active device ISP or carrier.') +
      section('Expert AI · cloud outbound connection') +
      '<div class="group">' +
      infoRow('Cloud provider', cloudHost.provider || 'Railway') +
      infoRow('Deployment region', cloudHost.regionName || 'US East · Virginia, USA') +
      infoRow('Railway region ID', cloudHost.regionId || 'iad') +
      infoRow('Railway edge POP', cloud?.railwayEdge || cloud?.route?.edgePop || '') +
      infoRow('Serving zone', cloudRouteText) +
      '</div>' +
      networkDetails('Cloud outbound network', cloud, 'Tap Refresh to identify the live Railway server egress IP and ISP.') +
      '<div class="group" style="padding:13px"><b class="row-label">Upstream transit route</b><p class="small-muted" style="line-height:1.55;margin:7px 0 0">Railway does not expose the complete upstream BGP transit-provider path for this service. The ISP, organisation and ASN above identify the network recorded for the public egress IP; they are not a complete list of every transit carrier.</p></div>' +
      (networkState.error ? '<p class="setting-note">' + esc(networkState.error) + '</p>' : '') +
      (networkState.lastDownload ? '<p class="setting-note">Last cloud download: ' + esc(networkState.lastDownload.name || 'File') + ' · ' + esc(String(networkState.lastDownload.size || '')) + ' bytes</p>' : '');
  }

  const previousSettingsPage = pages.settings;
  pages.settings = function() {
    const html = previousSettingsPage();
    const item = '<button type="button" class="row" data-page="network"><span class="row-icon">⇄</span><span class="row-main"><span class="row-label">Network & Downloads</span><span class="row-sub">Live ISP, cloud route and download network selection</span></span><span class="chevron">›</span></button>';
    return html.includes('<div class="search-dock">') ? html.replace('<div class="search-dock">', item + '<div class="search-dock">') : html + item;
  };
  pages.network = networkPage;
  pageTitles.network = 'Network & Downloads';

  async function refreshNetwork() {
    networkState.loading = true;
    networkState.error = '';
    render();
    const tasks = await Promise.allSettled([
      fetch('https://ipwho.is/', { cache: 'no-store', headers: { accept: 'application/json' } }).then(async response => {
        if (!response.ok) throw new Error('Device network lookup returned HTTP ' + response.status);
        const result = await response.json();
        if (result?.success !== true || !result?.ip) throw new Error('Device public IP lookup was not successful.');
        return {
          network: {
            ip: String(result.ip), ipType: String(result.type || 'IPv4'),
            country: String(result.country || ''), region: String(result.region || ''),
            city: String(result.city || ''), timezone: String(result.timezone?.id || ''),
            connection: {
              asn: result.connection?.asn ? String(result.connection.asn) : '',
              isp: String(result.connection?.isp || ''),
              org: String(result.connection?.org || ''),
              domain: String(result.connection?.domain || '')
            }
          }
        };
      }),
      window.EXPERT_AI_LIVE.request('network.status')
    ]);
    networkState.device = tasks[0].status === 'fulfilled' ? tasks[0].value : { error: String(tasks[0].reason?.message || 'Device network lookup failed.') };
    networkState.cloud = tasks[1].status === 'fulfilled' ? tasks[1].value : { error: String(tasks[1].reason?.message || 'Cloud network lookup failed.') };
    networkState.loading = false;
    const unavailable = [networkState.device, networkState.cloud].filter(item => !item?.network?.ip).length;
    networkState.error = unavailable === 2 ? 'Both live network lookups failed. Check connectivity and try again.' : '';
    render();
    if (!networkState.error) toast('Live network details refreshed.');
  }

  async function downloadFile() {
    const input = document.getElementById('networkDownloadUrl');
    const raw = String(input?.value || '').trim();
    let target;
    try { target = new URL(raw); } catch { toast('Enter a valid file URL.'); return; }
    if (!['https:', 'http:'].includes(target.protocol) || target.username || target.password) {
      toast('Enter a valid public HTTP or HTTPS file URL.');
      return;
    }
    networkState.lastUrl = target.href;
    prefs.downloadNetworkMode = currentRoute();
    save();
    if (currentRoute() === 'device') {
      const link = document.createElement('a');
      link.href = target.href;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast('Opened the source using this device’s internet connection.');
      return;
    }
    if (target.protocol !== 'https:') {
      toast('Railway cloud downloads require HTTPS for security.');
      return;
    }
    try {
      toast('Downloading through Expert AI cloud…');
      const result = await window.EXPERT_AI_LIVE.request('network.download', { url: target.href });
      networkState.lastDownload = result;
      render();
      toast('File downloaded through Railway cloud and saved to your Expert AI files.');
    } catch (error) {
      toast(error?.message || 'Cloud download failed.');
    }
  }

  const previousAction = handleAction;
  handleAction = function(action, element) {
    if (action === 'networkRoute') {
      const route = element?.dataset?.route === 'cloud' ? 'cloud' : 'device';
      prefs.downloadNetworkMode = route;
      save();
      render();
      toast(route === 'cloud' ? 'Railway cloud route selected.' : 'Device internet route selected.');
    } else if (action === 'networkRefresh') {
      refreshNetwork();
    } else if (action === 'networkDownload') {
      downloadFile();
    } else {
      previousAction(action, element);
    }
  };
})();
