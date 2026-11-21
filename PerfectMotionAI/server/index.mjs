import { createServer } from 'node:http';
import sharp from 'sharp';

const PORT = Number(process.env.PORT || 8080);
const MAX_BODY_BYTES = 32 * 1024 * 1024;
const MAX_VOICE_BYTES = 10 * 1024 * 1024;
const allowedJoints = new Set([
  'nose',
  'left_shoulder', 'right_shoulder',
  'left_elbow', 'right_elbow',
  'left_wrist', 'right_wrist',
  'left_hip', 'right_hip',
  'left_knee', 'right_knee',
  'left_ankle', 'right_ankle'
]);
const supportedAudioTypes = new Set([
  'audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/ogg',
  'audio/aac', 'audio/flac', 'audio/webm', 'audio/mp4'
]);
const rateLimits = new Map();

function sendJson(response, status, body) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  response.end(JSON.stringify(body));
}

function sendBinary(response, status, body, contentType, headers = {}) {
  response.writeHead(status, {
    'Content-Type': contentType,
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    ...headers
  });
  response.end(body);
}

function fail(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  throw error;
}

function parseImageDataUrl(imageDataUrl) {
  if (
    typeof imageDataUrl !== 'string' ||
    !/^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]+$/.test(imageDataUrl)
  ) {
    fail('Upload a PNG, JPG, or WEBP image.');
  }
  return Buffer.from(imageDataUrl.slice(imageDataUrl.indexOf(',') + 1), 'base64');
}

function parseAudioDataUrl(dataUrl) {
  const match = typeof dataUrl === 'string'
    ? dataUrl.match(/^data:(audio\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/=]+)$/i)
    : null;
  if (!match) fail('Upload a supported audio file.');
  const mimeType = match[1].toLowerCase();
  if (!supportedAudioTypes.has(mimeType)) {
    fail('Supported audio formats are MP3, WAV, OGG, AAC, FLAC, WEBM and MP4.');
  }
  const bytes = Buffer.from(match[2], 'base64');
  if (!bytes.length || bytes.length > MAX_VOICE_BYTES) {
    fail('Each voice recording must be greater than 0 bytes and no larger than 10 MB.');
  }
  return { mimeType, bytes };
}

function safeName(value, fallback) {
  const name = typeof value === 'string' ? value.trim().slice(0, 80) : '';
  return name || fallback;
}

function fileName(value, fallback) {
  const name = typeof value === 'string' ? value.replace(/[\\/\0]/g, '_').slice(0, 100) : '';
  return name || fallback;
}

function allowedByRateLimit(key) {
  const now = Date.now();
  const windowMs = 60 * 60 * 1000;
  const entry = rateLimits.get(key);
  if (!entry || now - entry.startedAt >= windowMs) {
    rateLimits.set(key, { startedAt: now, count: 1 });
    return true;
  }
  if (entry.count >= 20) return false;
  entry.count += 1;
  return true;
}

async function readJson(request) {
  const chunks = [];
  let total = 0;
  for await (const chunk of request) {
    total += chunk.length;
    if (total > MAX_BODY_BYTES) {
      fail('The upload is too large. Choose a smaller file.', 413);
    }
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    fail('The request body must be valid JSON.');
  }
}

function outputText(response) {
  if (typeof response.output_text === 'string') return response.output_text;
  const parts = [];
  for (const item of response.output || []) {
    for (const content of item.content || []) {
      if (content.type === 'output_text' && typeof content.text === 'string') {
        parts.push(content.text);
      }
    }
  }
  return parts.join('\n');
}

function parseModelJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start < 0 || end <= start) fail('The AI response did not contain the expected JSON.', 502);
    return JSON.parse(text.slice(start, end + 1));
  }
}

function cleanJoints(value) {
  const result = {};
  for (const [name, point] of Object.entries(value || {})) {
    if (!allowedJoints.has(name) || !point || typeof point !== 'object') continue;
    const x = Number(point.x);
    const y = Number(point.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    if (x < 0 || x > 1 || y < 0 || y > 1) continue;
    result[name] = { x, y };
  }
  return result;
}

function requireOpenAiKey() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) fail('The OpenAI API key is not configured on the server.', 503);
  return key;
}

async function readOpenAiError(response) {
  const payload = await response.json().catch(() => ({}));
  return payload.error?.message || `OpenAI request failed with HTTP ${response.status}.`;
}

async function prepareAvatar(imageDataUrl) {
  const apiKey = requireOpenAiKey();
  const prompt = [
    'You are the image-rig preparation component for PerfectMotion AI.',
    'Inspect the uploaded image for one clearly visible human or humanoid character.',
    'Return only JSON with this exact shape:',
    '{"validPerson":true,"message":"short guidance","joints":{"nose":{"x":0.5,"y":0.1},"left_shoulder":{"x":0.35,"y":0.25}}}',
    'Coordinates must be normalized from 0 to 1 relative to the complete uploaded image, with (0,0) at the top-left.',
    'Estimate these available joints: nose, left_shoulder, right_shoulder, left_elbow, right_elbow, left_wrist, right_wrist, left_hip, right_hip, left_knee, right_knee, left_ankle, right_ankle.',
    'Use anatomical left and right of the pictured subject, not the viewer.',
    'Omit joints that cannot be located with reasonable confidence. Do not invent hidden limbs.',
    'Set validPerson to false when there is no single reasonably visible person or character.',
    'Coordinates are approximate image-analysis estimates, not calibrated motion-capture measurements.'
  ].join('\n');

  const apiResponse = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: process.env.OPENAI_VISION_MODEL || 'gpt-6.2-astra',
      store: false,
      input: [{
        role: 'user',
        content: [
          { type: 'input_text', text: prompt },
          { type: 'input_image', image_url: imageDataUrl, detail: 'high' }
        ]
      }]
    })
  });

  if (!apiResponse.ok) {
    const error = new Error(await readOpenAiError(apiResponse));
    error.status = apiResponse.status === 429 ? 429 : 502;
    throw error;
  }

  const payload = await apiResponse.json().catch(() => ({}));
  const parsed = parseModelJson(outputText(payload));
  const referencePose = cleanJoints(parsed.joints);
  if (parsed.validPerson !== true || Object.keys(referencePose).length < 5) {
    fail(
      parsed.message || 'The image needs one clear, mostly visible person or character.',
      422
    );
  }

  return {
    referencePose,
    message: typeof parsed.message === 'string'
      ? parsed.message
      : 'The uploaded subject has been prepared for motion mirroring.'
  };
}

async function createVoiceConsent(body) {
  const apiKey = requireOpenAiKey();
  const recording = parseAudioDataUrl(body.recordingDataUrl);
  const form = new FormData();
  form.set('name', safeName(body.name, 'PerfectMotion voice consent'));
  form.set('language', typeof body.language === 'string' ? body.language : 'en');
  form.set(
    'recording',
    new Blob([recording.bytes], { type: recording.mimeType }),
    fileName(body.fileName, 'voice-consent-audio')
  );

  const result = await fetch('https://api.openai.com/v1/audio/voice_consents', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + apiKey },
    body: form
  });
  if (!result.ok) {
    const error = new Error(await readOpenAiError(result));
    error.status = result.status;
    throw error;
  }
  const payload = await result.json();
  if (!payload.id) fail('OpenAI did not return a voice-consent ID.', 502);
  return { id: payload.id, name: payload.name, language: payload.language };
}

async function createCustomVoice(body) {
  const apiKey = requireOpenAiKey();
  const sample = parseAudioDataUrl(body.audioSampleDataUrl);
  if (typeof body.consentId !== 'string' || !body.consentId.startsWith('cons_')) {
    fail('Upload the speaker consent recording first.');
  }
  const form = new FormData();
  form.set('name', safeName(body.name, 'PerfectMotion custom voice'));
  form.set('type', 'audio_sample');
  form.set('consent', body.consentId);
  form.set(
    'audio_sample',
    new Blob([sample.bytes], { type: sample.mimeType }),
    fileName(body.fileName, 'voice-sample')
  );

  const result = await fetch('https://api.openai.com/v1/audio/voices', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + apiKey },
    body: form
  });
  if (!result.ok) {
    const error = new Error(await readOpenAiError(result));
    error.status = result.status;
    throw error;
  }
  const payload = await result.json();
  if (!payload.id) fail('OpenAI did not return a custom voice ID.', 502);
  return { id: payload.id, name: payload.name, type: payload.type };
}

async function synthesizeSpeechPreview(body) {
  const apiKey = requireOpenAiKey();
  const text = typeof body.text === 'string' ? body.text.trim() : '';
  const voiceId = typeof body.voiceId === 'string' ? body.voiceId.trim() : '';
  if (!text || text.length > 2000) fail('Enter preview text of 1–2,000 characters.');
  if (!voiceId) fail('Choose a saved custom voice first.');

  const result = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + apiKey,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini-tts',
      voice: { id: voiceId },
      input: text,
      response_format: 'mp3',
      instructions: 'Speak clearly and naturally. This is an AI-generated voice preview.'
    })
  });

  if (!result.ok) {
    const error = new Error(await readOpenAiError(result));
    error.status = result.status;
    throw error;
  }
  return Buffer.from(await result.arrayBuffer());
}

const server = createServer(async (request, response) => {
  if (request.method === 'OPTIONS') {
    sendJson(response, 204, {});
    return;
  }

  const url = new URL(request.url || '/', 'http://localhost');
  if (request.method === 'GET' && url.pathname === '/health') {
    sendJson(response, 200, {
      service: 'perfectmotion-ai',
      status: 'ok',
      openaiConfigured: Boolean(process.env.OPENAI_API_KEY)
    });
    return;
  }

  const routes = new Set([
    '/api/prepare-avatar',
    '/api/export-8k',
    '/api/voice-consents',
    '/api/voices',
    '/api/speech-preview'
  ]);
  if (request.method !== 'POST' || !routes.has(url.pathname)) {
    sendJson(response, 404, { error: 'Route not found.' });
    return;
  }

  const ip = request.headers['x-forwarded-for']?.split(',')[0]?.trim()
    || request.socket.remoteAddress
    || 'unknown';
  if (!allowedByRateLimit(ip)) {
    sendJson(response, 429, { error: 'Too many requests from this connection. Try again later.' });
    return;
  }

  try {
    const body = await readJson(request);

    if (url.pathname === '/api/voice-consents') {
      sendJson(response, 200, await createVoiceConsent(body));
      return;
    }

    if (url.pathname === '/api/voices') {
      sendJson(response, 200, await createCustomVoice(body));
      return;
    }

    if (url.pathname === '/api/speech-preview') {
      const audio = await synthesizeSpeechPreview(body);
      sendBinary(response, 200, audio, 'audio/mpeg');
      return;
    }

    const imageBuffer = parseImageDataUrl(body.imageDataUrl);
    if (url.pathname === '/api/export-8k') {
      const metadata = await sharp(imageBuffer, { limitInputPixels: 40_000_000 }).metadata();
      if (!metadata.width || !metadata.height) {
        fail('The selected image dimensions could not be read.');
      }

      const portrait = metadata.height > metadata.width;
      const targetWidth = portrait ? 4320 : 7680;
      const targetHeight = portrait ? 7680 : 4320;
      const output = await sharp(imageBuffer, { limitInputPixels: 40_000_000 })
        .rotate()
        .resize(targetWidth, targetHeight, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 },
          kernel: 'lanczos3',
          withoutEnlargement: false,
          fastShrinkOnLoad: false
        })
        .webp({
          quality: 94,
          alphaQuality: 100,
          effort: 5,
          smartSubsample: true
        })
        .toBuffer({ resolveWithObject: true });

      sendBinary(response, 200, output.data, 'image/webp', {
        'X-Output-Width': String(output.info.width),
        'X-Output-Height': String(output.info.height),
        'X-Output-Resolution': '8K-upscaled'
      });
      return;
    }

    const imageDataUrl = body.imageDataUrl;
    if (typeof imageDataUrl !== 'string') fail('The uploaded image is missing.');
    const result = await prepareAvatar(imageDataUrl);
    sendJson(response, 200, { success: true, ...result });
  } catch (error) {
    const status = Number.isInteger(error.status) ? error.status : 502;
    console.error('PerfectMotion AI request failed:', error.message);
    sendJson(response, status, { error: error.message || 'Image processing failed.' });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('PerfectMotion AI service listening on port ' + PORT);
});
