/**
 * TrainerHub — site scan proxy ("סריקת שטח").
 *
 * A Cloudflare Worker (free plan) that stands between the public page on
 * GitHub Pages and Google Gemini, so the Gemini key never reaches the browser
 * and never lives in this repo: it is a Worker secret (see README.md).
 *
 * Contract — identical to backend/site_scan.py, which local dev uses instead:
 *   POST { images: [ { mime, data(base64) } x1..3 ] } -> 200 { text }
 *   400 bad-json / images · 403 origin · 405 method · 413 too-large
 *   429 rate · 502 upstream / empty · 503 not-configured
 * The model's text is returned as-is; the browser validates and clamps it with
 * THSiteProfile.parseAiResponse (js/site-profile.js) and falls back to the
 * manual checklist on any non-200. Photos are forwarded and never stored,
 * never logged, and never written to KV.
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

export const MAX_IMAGES = 3;
export const MAX_BYTES = 4 * 1024 * 1024;
export const ALLOWED_ORIGINS = ['https://swissystem7.github.io'];
export const RATE = { requests: 6, windowMs: 60000 };

const MIME = ['image/jpeg', 'image/png', 'image/webp'];
const BASE64 = /^[A-Za-z0-9+/=]+$/;
const LOCAL_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
const DEFAULT_MODEL = 'gemini-2.5-flash';
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/MODEL:generateContent';

/** True when images is a list of 1-3 { mime, data(base64) } entries. */
export function validateImages(images) {
  if (!Array.isArray(images) || images.length < 1 || images.length > MAX_IMAGES) return false;
  return images.every(function (im) {
    if (!im || typeof im !== 'object') return false;
    if (MIME.indexOf(im.mime) === -1) return false;
    return typeof im.data === 'string' && im.data.length > 0 && BASE64.test(im.data);
  });
}

/** { url, body } for Gemini generateContent: the prompt first, then the photos inline. */
export function geminiRequest(images, model) {
  const parts = [{ text: PROMPT }];
  images.forEach(function (im) {
    parts.push({ inline_data: { mime_type: im.mime, data: im.data } });
  });
  return {
    url: GEMINI_URL.replace('MODEL', model || DEFAULT_MODEL),
    body: {
      contents: [{ parts: parts }],
      generationConfig: { responseMimeType: 'application/json', temperature: 0.2 }
    }
  };
}

/** Joined text of the first candidate, or '' when the reply carries none. */
export function replyText(data) {
  const parts = data && data.candidates && data.candidates[0] &&
    data.candidates[0].content && data.candidates[0].content.parts;
  if (!Array.isArray(parts)) return '';
  return parts.map(function (p) { return (p && p.text) || ''; }).join('');
}

/** The echoed origin when it may call us, '' otherwise. env.ALLOWED_ORIGINS adds more (comma separated). */
export function allowedOrigin(origin, env) {
  const o = String(origin || '');
  if (!o) return '';
  const extra = String((env && env.ALLOWED_ORIGINS) || '').split(',').map(function (s) { return s.trim(); });
  if (ALLOWED_ORIGINS.indexOf(o) !== -1 || extra.indexOf(o) !== -1) return o;
  return LOCAL_ORIGIN.test(o) ? o : '';
}

function corsHeaders(origin) {
  const h = { 'Vary': 'Origin', 'Cache-Control': 'no-store' };
  if (origin) {
    h['Access-Control-Allow-Origin'] = origin;
    h['Access-Control-Allow-Methods'] = 'POST, OPTIONS';
    h['Access-Control-Allow-Headers'] = 'Content-Type';
    h['Access-Control-Max-Age'] = '86400';
  }
  return h;
}

/**
 * Best-effort per-IP throttle. An isolate is short-lived and per-location, so
 * this caps bursts from one coach rather than global traffic — enough to keep
 * the free Gemini tier from being drained by a loop in the page.
 */
export function createLimiter(requests, windowMs) {
  const hits = new Map();
  return function check(key, now) {
    const t = now || Date.now();
    if (hits.size > 5000) hits.clear();
    const fresh = (hits.get(key) || []).filter(function (x) { return t - x < windowMs; });
    hits.set(key, fresh);
    if (fresh.length >= requests) return false;
    fresh.push(t);
    return true;
  };
}

const defaultLimiter = createLimiter(RATE.requests, RATE.windowMs);

function json(status, body, cors) {
  return new Response(JSON.stringify(body), {
    status: status,
    headers: Object.assign({ 'Content-Type': 'application/json; charset=utf-8' }, cors)
  });
}

/**
 * The whole request flow. deps lets the tests inject { fetch, limiter, now }.
 * Nothing here logs or keeps the request body.
 */
export async function handle(request, env, deps) {
  deps = deps || {};
  const send = deps.fetch || fetch;
  const limiter = deps.limiter || defaultLimiter;
  const now = deps.now ? deps.now() : Date.now();
  const origin = allowedOrigin(request.headers.get('Origin'), env);
  const cors = corsHeaders(origin);

  if (request.method === 'OPTIONS') {
    return origin ? new Response(null, { status: 204, headers: cors }) : json(403, { error: 'origin' }, cors);
  }
  if (request.method !== 'POST') return json(405, { error: 'method' }, cors);
  if (!origin) return json(403, { error: 'origin' }, cors);

  const key = (env && env.GEMINI_API_KEY) || '';
  if (!key) return json(503, { error: 'not-configured' }, cors);

  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  if (!limiter(ip, now)) return json(429, { error: 'rate' }, cors);

  const declared = Number(request.headers.get('Content-Length') || 0);
  if (declared > MAX_BYTES) return json(413, { error: 'too-large' }, cors);
  const raw = await request.text();
  if (raw.length > MAX_BYTES) return json(413, { error: 'too-large' }, cors);

  let payload;
  try { payload = JSON.parse(raw); } catch (e) {
    return json(400, { error: 'bad-json' }, cors);
  }
  const images = payload && typeof payload === 'object' ? payload.images : null;
  if (!validateImages(images)) return json(400, { error: 'images' }, cors);

  const req = geminiRequest(images, (env && env.GEMINI_MODEL) || DEFAULT_MODEL);
  let upstream;
  try {
    upstream = await send(req.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify(req.body)
    });
  } catch (e) {
    return json(502, { error: 'upstream' }, cors);
  }
  if (!upstream || !upstream.ok) {
    return json(502, { error: 'upstream', status: (upstream && upstream.status) || 0 }, cors);
  }
  let data;
  try { data = await upstream.json(); } catch (e) {
    return json(502, { error: 'empty' }, cors);
  }
  const text = replyText(data);
  if (!text) return json(502, { error: 'empty' }, cors);
  return json(200, { text: text }, cors);
}

export default {
  fetch: function (request, env) { return handle(request, env); }
};
