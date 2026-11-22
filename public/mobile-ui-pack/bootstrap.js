(() => {
  'use strict';

  const archiveUrl = '/resources/user-upload.zip';
  const archivePrefix = 'ai_mobile_ui_pack/';
  const decoder = new TextDecoder();
  const loader = document.getElementById('packLoader');

  function status() {
    // Keep the bold Expert AI startup mark visible; hide technical loading steps.
  }

  function readDirectory(buffer) {
    const view = new DataView(buffer);
    const minimum = Math.max(0, buffer.byteLength - 65557);
    let endOffset = -1;

    for (let offset = buffer.byteLength - 22; offset >= minimum; offset -= 1) {
      if (view.getUint32(offset, true) === 0x06054b50) {
        endOffset = offset;
        break;
      }
    }

    if (endOffset < 0) throw new Error('The ZIP directory could not be found.');

    const entryCount = view.getUint16(endOffset + 10, true);
    let cursor = view.getUint32(endOffset + 16, true);
    const entries = new Map();

    for (let index = 0; index < entryCount; index += 1) {
      if (view.getUint32(cursor, true) !== 0x02014b50) {
        throw new Error('The ZIP directory contains an invalid entry.');
      }

      const method = view.getUint16(cursor + 10, true);
      const compressedSize = view.getUint32(cursor + 20, true);
      const uncompressedSize = view.getUint32(cursor + 24, true);
      const nameLength = view.getUint16(cursor + 28, true);
      const extraLength = view.getUint16(cursor + 30, true);
      const commentLength = view.getUint16(cursor + 32, true);
      const localOffset = view.getUint32(cursor + 42, true);
      const name = decoder.decode(new Uint8Array(buffer, cursor + 46, nameLength));

      entries.set(name, { name, method, compressedSize, uncompressedSize, localOffset });
      cursor += 46 + nameLength + extraLength + commentLength;
    }

    return entries;
  }

  async function extractEntry(buffer, entry) {
    const view = new DataView(buffer);
    const localOffset = entry.localOffset;

    if (view.getUint32(localOffset, true) !== 0x04034b50) {
      throw new Error('The ZIP entry header is invalid: ' + entry.name);
    }

    const nameLength = view.getUint16(localOffset + 26, true);
    const extraLength = view.getUint16(localOffset + 28, true);
    const dataOffset = localOffset + 30 + nameLength + extraLength;
    const compressed = buffer.slice(dataOffset, dataOffset + entry.compressedSize);
    let output;

    if (entry.method === 0) {
      output = new Uint8Array(compressed);
    } else if (entry.method === 8) {
      const stream = new Blob([compressed])
        .stream()
        .pipeThrough(new DecompressionStream('deflate-raw'));
      output = new Uint8Array(await new Response(stream).arrayBuffer());
    } else {
      throw new Error('Unsupported ZIP compression method for ' + entry.name);
    }

    if (entry.uncompressedSize && output.byteLength !== entry.uncompressedSize) {
      throw new Error('The extracted file size did not match: ' + entry.name);
    }

    return output;
  }

  function mimeType(path) {
    const extension = path.split('.').pop().toLowerCase();
    return ({
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      webp: 'image/webp',
      gif: 'image/gif',
      svg: 'image/svg+xml'
    })[extension] || 'application/octet-stream';
  }

  async function boot() {
    status('Opening the uploaded ZIP archive…');
    const response = await fetch(archiveUrl, { cache: 'force-cache' });
    if (!response.ok) {
      throw new Error('The stored ZIP resource could not be opened (HTTP ' + response.status + ').');
    }

    const buffer = await response.arrayBuffer();
    const entries = readDirectory(buffer);

    async function member(path) {
      const entry = entries.get(archivePrefix + path);
      if (!entry) throw new Error('The archive is missing ' + path + '.');
      return extractEntry(buffer, entry);
    }

    status('Extracting the UI, catalogue and activity data…');
    const [htmlBytes, cssBytes, catalogueBytes, activityBytes] = await Promise.all([
      member('index.html'),
      member('styles.css'),
      member('plugin_catalogue.json'),
      member('activity_status_library.json')
    ]);

    window.NEXA_PLUGIN_CATALOGUE = JSON.parse(decoder.decode(catalogueBytes));
    window.NEXA_ACTIVITY_STATUS_LIBRARY = JSON.parse(decoder.decode(activityBytes));

    status('Preparing gallery images, icons and voice artwork…');
    const imageEntries = [...entries.values()].filter(entry =>
      entry.name.startsWith(archivePrefix + 'assets/') &&
      /\.(png|jpe?g|webp|gif|svg)$/i.test(entry.name)
    );
    const assetUrls = new Map();

    for (const entry of imageEntries) {
      const bytes = await extractEntry(buffer, entry);
      const relativePath = entry.name.slice(archivePrefix.length);
      const url = URL.createObjectURL(new Blob([bytes], { type: mimeType(relativePath) }));
      assetUrls.set(relativePath, url);
    }

    const rewriteAssets = source => {
      let output = source;
      for (const [path, url] of assetUrls) output = output.split(path).join(url);
      return output;
    };

    const parsed = new DOMParser().parseFromString(decoder.decode(htmlBytes), 'text/html');
    parsed.querySelectorAll('script, link[rel="stylesheet"]').forEach(node => node.remove());
    document.body.innerHTML = parsed.body.innerHTML;
    document.title = 'Expert AI · Live mobile workspace';

    const style = document.createElement('style');
    style.textContent = rewriteAssets(decoder.decode(cssBytes));
    document.head.appendChild(style);

    const scripts = [
      'app.js',
      'catalogue-ui.js',
      'integrations-ui.js',
      'v7-enhancements.js',
      'v8-enhancements.js'
    ];

    for (const path of scripts) {
      const source = rewriteAssets(decoder.decode(await member(path)));
      const script = document.createElement('script');
      script.textContent = source;
      document.body.appendChild(script);
    }

    function loadLiveBridge() {
      const liveBridge = document.createElement('script');
      liveBridge.src = '/mobile-ui-pack/live-bridge.js?v=expert-4';
      liveBridge.onload = () => {
        document.body.dataset.mobileUiPackReady = 'true';
      };
      liveBridge.onerror = () => {
        throw new Error('The Expert AI live connection script could not be loaded.');
      };
      document.body.appendChild(liveBridge);
    }

    const chatPolish = document.createElement('script');
    chatPolish.src = '/mobile-ui-pack/chat-polish.js?v=3';
    chatPolish.onload = () => {
      document.body.dataset.nexaChatPolishReady = 'true';
      loadLiveBridge();
    };
    chatPolish.onerror = () => {
      console.warn('Expert AI chat styling could not be loaded; continuing with the original mobile interface.');
      loadLiveBridge();
    };
    document.body.appendChild(chatPolish);
  }

  boot().catch(error => {
    const message = error instanceof Error ? error.message : 'Unknown extraction error.';
    if (loader) {
      loader.innerHTML =
        '<strong>Could not extract the imported UI pack</strong><p>' +
        message.replace(/[&<>"']/g, character => ({
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;'
        })[character]) +
        '</p><p>Return to Expert AI and confirm that the uploaded ZIP resource is still available.</p>';
    }
  });
})();
