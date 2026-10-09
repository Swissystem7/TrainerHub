/**
 * TrainerHub site-scan proxy — Cloudflare Worker (free plan).
 * Holds the Gemini key as a Worker secret so no key ever lives in the public
 * repo or on GitHub Pages. Images are forwarded to Gemini and never stored.
 * NOT deployed from this repo: deployment + key are an owner step (README.md).
 *
 * POST { images: [{ mime: 'image/jpeg', data: '<base64>' }] }  (1–3 images, ≤1024px each)
 * → 200 { text: '<model reply, JSON per PROMPT>' } | 4xx/5xx { error }
 */

export const PROMPT = [
  'You look at 1-3 photos of an outdoor training location for a group fitness coach.',
  'Reply with ONE JSON object and nothing else, using only these keys and values:',
  '{"width":"narrow|medium|wide","approxMeters":number,"surface":["asphalt","grass","turf","sand","dirt","tiles","rubber"],',
  '"features":["stairs","bench","wall","railing","pole","slope","grass","court","playground"],',
  '"hazards":["cars","uneven","slippery","glass","dark","crowd","water","heat"],"shade":true|false,',
  '"confidence":{"<any key above>":0..1}}',
  'width = usable free space for running drills: narrow < 6 m, medium 6-20 m, wide > 20 m. approxMeters = that width.',
  'List only what is clearly visible. When unsure, leave it out and give a low confidence. Never identify people.'
].join('\n');

export const LIMITS = { maxImages: 3, maxBytes: 4 * 1024 * 1024, perMinute: 6 };
const MIME = ['image/jpeg', 'image/png', 'image/webp'];
const hits = new Map(); // best-effort per-isolate rate limit; add a Cloudflare rate-limiting rule for a hard cap

function cors(origin, allowed) {
  const h = { 'Content-Type': 'application/json; charset=utf-8', Vary: 'Origin' };
  if (origin && origin === allowed) {
    h['Access-Control-Allow-Origin'] = origin;
    h['Access-Control-Allow-Methods'] = 'POST, OPTIONS';
    h['Access-Control-Allow-Headers'] = 'Content-Type';
  }
  return h;
}

function reply(status, body, headers) {
  return new Response(JSON.stringify(body), { status, headers });
}

function limited(ip, now) {
  const recent = (hits.get(ip) || []).filter((t) => now - t < 60000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > LIMITS.perMinute;
}

export async function handle(request, env, fetchImpl, now) {
  const allowed = env.ALLOWED_ORIGIN || 'https://swissystem7.github.io';
  const origin = request.headers.get('Origin');
  const headers = cors(origin, allowed);
  if (origin !== allowed) return reply(403, { error: 'origin' }, headers);
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (request.method !== 'POST') return reply(405, { error: 'method' }, headers);
  if (!env.GEMINI_API_KEY) return reply(503, { error: 'not-configured' }, headers);
  if (limited(request.headers.get('CF-Connecting-IP') || 'unknown', now || Date.now())) {
    return reply(429, { error: 'rate-limited' }, headers);
  }
  const raw = await request.text();
  if (raw.length > LIMITS.maxBytes) return reply(413, { error: 'too-large' }, headers);
  let images;
  try {
    images = JSON.parse(raw).images;
  } catch (e) {
    return reply(400, { error: 'bad-json' }, headers);
  }
  const ok = Array.isArray(images) && images.length >= 1 && images.length <= LIMITS.maxImages &&
    images.every((im) => im && MIME.includes(im.mime) && typeof im.data === 'string' && /^[A-Za-z0-9+/=]+$/.test(im.data));
  if (!ok) return reply(400, { error: 'images' }, headers);

  const model = env.GEMINI_MODEL || 'gemini-2.5-flash';
  const parts = [{ text: PROMPT }].concat(images.map((im) => ({ inline_data: { mime_type: im.mime, data: im.data } })));
  let res;
  try {
    res = await fetchImpl('https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
      body: JSON.stringify({ contents: [{ parts }], generationConfig: { responseMimeType: 'application/json', temperature: 0.2 } })
    });
  } catch (e) {
    return reply(502, { error: 'upstream' }, headers);
  }
  if (!res.ok) return reply(502, { error: 'upstream', status: res.status }, headers);
  const data = await res.json().catch(() => null);
  const text = data && data.candidates && data.candidates[0] && data.candidates[0].content &&
    data.candidates[0].content.parts && data.candidates[0].content.parts.map((p) => p.text || '').join('');
  if (!text) return reply(502, { error: 'empty' }, headers);
  return reply(200, { text }, headers);
}

export default {
  fetch(request, env) {
    return handle(request, env, fetch);
  }
};
