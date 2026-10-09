# Site-scan proxy (Cloudflare Worker)

Sends the coach's 1–3 site photos to Google Gemini vision and returns its JSON reply to the
TrainerHub page. Gemini's key stays a Worker secret, so it never reaches the public repo or GitHub Pages.
Images are passed through and **never stored**.

**Not deployed.** This is an owner step. Until you do it, the app uses the manual "מה יש בשטח?" checklist,
and every part of the feature still works through it.

## Owner steps (free plans)
1. Get a Gemini API key (free tier): https://aistudio.google.com/apikey
2. `npm i -g wrangler && wrangler login` (Cloudflare account, free plan).
3. From this folder: `wrangler secret put GEMINI_API_KEY` and paste the key.
4. `wrangler deploy`. Note the URL, e.g. `https://trainerhub-site-scan.<you>.workers.dev`.
5. Optional hard cap: Cloudflare dashboard → Security → WAF → Rate limiting rule on the Worker route
   (the in-code limit of 6 requests/min per IP is best effort, per isolate).
6. Point the page at it: set `window.TH_SITE_SCAN_ENDPOINT = '<worker URL>'` before `js/site-scan.js`
   (or pass `{ endpoint }` to `THSiteScan.analyzeSitePhotos`).

## Contract
`POST { images: [{ mime: 'image/jpeg'|'image/png'|'image/webp', data: '<base64>' }] }` (1–3 images, body ≤ 4 MB)
→ `200 { text }`, where `text` is the model's JSON. The client validates and clamps it with `THSiteProfile.parseAiResponse`.
Errors: 400 bad input, 403 wrong origin, 405 method, 413 too large, 429 rate limited, 502 upstream, 503 key not set.
In every error case the client shows the manual checklist.

CORS only allows `ALLOWED_ORIGIN` (default `https://swissystem7.github.io`).
Tests: `test/site-scan.test.js` (runs the handler with a stubbed upstream; no network, no key).
