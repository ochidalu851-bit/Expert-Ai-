import { createServer } from 'node:http';
import { timingSafeEqual } from 'node:crypto';

const PORT = Number(process.env.PORT || 8080);
const MAX_BODY_BYTES = 12 * 1024 * 1024;
const allowedJoints = new Set([
  'nose',
  'left_shoulder', 'right_shoulder',
  'left_elbow', 'right_elbow',
  'left_wrist', 'right_wrist',
  'left_hip', 'right_hip',
  'left_knee', 'right_knee',
  'left_ankle', 'right_ankle'
]);
const rateLimits = new Map();

function sendJson(response, status, body) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-App-Token'
  });
  response.end(JSON.stringify(body));
}

function tokenMatches(provided, expected) {
  if (!provided || !expected) return false;
  const left = Buffer.from(provided);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
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
      const error = new Error('The image upload is too large. Choose a smaller image.');
      error.status = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    const error = new Error('The request body must be valid JSON.');
    error.status = 400;
    throw error;
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
    if (start < 0 || end <= start) throw new Error('The AI response did not contain the expected JSON.');
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

async function prepareAvatar(imageDataUrl) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const error = new Error('The OpenAI API key is not configured on the AI server.');
    error.status = 503;
    throw error;
  }

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

  const payload = await apiResponse.json().catch(() => ({}));
  if (!apiResponse.ok) {
    const message = payload.error?.message || 'OpenAI image analysis failed.';
    const error = new Error(message);
    error.status = apiResponse.status === 429 ? 429 : 502;
    throw error;
  }

  const parsed = parseModelJson(outputText(payload));
  const referencePose = cleanJoints(parsed.joints);
  if (parsed.validPerson !== true || Object.keys(referencePose).length < 5) {
    const error = new Error(parsed.message || 'The image needs one clear, mostly visible person or character.');
    error.status = 422;
    throw error;
  }

  return {
    referencePose,
    message: typeof parsed.message === 'string'
      ? parsed.message
      : 'The uploaded subject has been prepared for motion mirroring.'
  };
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
      openaiConfigured: Boolean(process.env.OPENAI_API_KEY),
      appTokenConfigured: Boolean(process.env.PERFECTMOTION_API_TOKEN)
    });
    return;
  }

  if (request.method !== 'POST' || url.pathname !== '/api/prepare-avatar') {
    sendJson(response, 404, { error: 'Route not found.' });
    return;
  }

  const expectedToken = process.env.PERFECTMOTION_API_TOKEN;
  if (!tokenMatches(request.headers['x-app-token'], expectedToken)) {
    sendJson(response, 401, { error: 'The app access token is invalid or not configured.' });
    return;
  }

  const ip = request.headers['x-forwarded-for']?.split(',')[0]?.trim() || request.socket.remoteAddress || 'unknown';
  if (!allowedByRateLimit(ip)) {
    sendJson(response, 429, { error: 'Too many image-analysis requests. Please try again later.' });
    return;
  }

  try {
    const body = await readJson(request);
    const imageDataUrl = body.imageDataUrl;
    if (
      typeof imageDataUrl !== 'string' ||
      !/^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=]+$/.test(imageDataUrl)
    ) {
      sendJson(response, 400, { error: 'Upload a PNG, JPG, or WEBP image.' });
      return;
    }

    const result = await prepareAvatar(imageDataUrl);
    sendJson(response, 200, { success: true, ...result });
  } catch (error) {
    const status = Number.isInteger(error.status) ? error.status : 502;
    console.error('PerfectMotion AI request failed:', error.message);
    sendJson(response, status, { error: error.message || 'Image preparation failed.' });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('PerfectMotion AI service listening on port ' + PORT);
});
