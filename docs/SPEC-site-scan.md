# "סריקת שטח" (Site Scan) + Acharai pilot — spec

Owner request, 2026-10-07 (issue #89). Kept here so the logic and the UI branches build against one
contract. Status per item is at the bottom.

## Goal

Pilot TrainerHub with Acharai (עמותת אחריי) coaches. The coach photographs (or uploads 1–3 photos of) the
training location; an AI vision step detects usable features and constraints, and the session builder adapts the
workout to that site (narrow vs wide space, stairs, benches, wall, slope, grass/asphalt, poles/railings, shade,
hazards).

## User flow (mobile first, Hebrew RTL)

1. `index.html` → button "📷 סרוק את השטח" (also inside the `booklet.html` plan builder).
2. Camera/upload (`<input type=file accept=image/* capture=environment multiple>`), photos resized
   client-side to ≤1024px.
3. Result card "מה זיהיתי": chips the coach can toggle/fix (מדרגות ✓, ספסל ✓, קיר ✓, רוחב: צר ~4 מ׳,
   משטח: אספלט, סכנה: מכוניות). The coach must be able to correct everything before building — the AI is a
   suggestion, never final.
4. Build session → the builder uses the site profile: drills whose equipment/space fit, Acharai limited-space
   methods (I-go-you-go, Tabata, 21, pyramid, combined) when narrow, stair drills when stairs, bench dips /
   step-ups when bench, wall sits / push-ups when wall, relay and tag games only when wide. One Hebrew line
   per choice ("בחרתי עליות מדרגות כי זוהו מדרגות").
5. Safety: hazards → warning line + the Acharai winter/safety rules where relevant. Group size × space check
   (20 trainees in a narrow strip → stations/waves).

## Site profile schema — `js/site-profile.js`

```js
{ width: "narrow|medium|wide", approxMeters?: number, surface: [...],
  features: ["stairs","bench","wall","railing","pole","slope","grass","court","playground"],
  hazards: [...], shade: bool, source: "ai|manual", confidence: {...} }
```

Anything from the model or the page goes through `normalize()`, so the builder only ever sees the strict schema.

## AI provider — pluggable, free only

* Interface: `analyzeSitePhotos(images) -> SiteProfile`, strict JSON, validated and clamped to the schema.
* Default: Google Gemini vision (free tier) behind a tiny proxy, so no key lives in the public repo or on Pages:
  `worker/site-scan/` Cloudflare Worker (free plan), key as a Worker secret, CORS restricted to
  `swissystem7.github.io`, rate-limited, images not stored. **Deploying the Worker and setting the key is an
  owner step** — documented in `worker/site-scan/README.md`, not deployed and no key committed.
* Fallback with NO AI (must work offline and on Pages today): the manual checklist "מה יש בשטח?" with the same
  chips. The whole feature must be usable through the fallback alone.
* Local dev: `backend/main.py` exposes `/api/site-scan` with the same prompt when a key is set in env.

## Pilot mode for Acharai

`?pilot=acharai` (or a pilot access code) unlocks coach features free, Acharai branding on share/print, booklet
drills preferred in session building. Feedback after each session → JSON export / `wa.me` message to the owner,
no server. No personal data beyond localStorage.

## Done =

* Tests: site-profile validation, builder adaptation (narrow→limited-space method, stairs→stair drills,
  wide+group→games, hazards→warning), the fallback path, AI JSON parsing with malformed input. `npm test` and
  the python tests green.
* Headless check of `index.html` / `booklet.html`: no console errors, works on a 390px viewport.
* Draft PRs on `factory/laptop-claude-site-scan-*` (logic) and `factory/laptop-agy-site-scan-ui` (UI/design),
  ≤400 changed lines where reasonable. Never push master, no force-push, no deletes.
* The PR body reports what works without AI and what needs the owner (worker deploy + Gemini key).

## Status

| Item | Where | State |
| --- | --- | --- |
| Site profile schema, validate/clamp, AI JSON parsing, chips | `js/site-profile.js` | merged (#79) |
| Builder adaptation: width→method, site drills, games, layout, hazards | `js/site-plan.js` | merged (#80) |
| Local dev endpoint with the same prompt | `backend/site_scan.py` | merged (#83) |
| Provider interface + manual fallback + proxy provider | `js/site-scan.js` | this branch |
| Gemini proxy Worker (not deployed, no key) | `worker/site-scan/` | this branch |
| Pilot mode: entitlement, branding, booklet preference, feedback | `js/pilot.js` | this branch |
| Builder hint for preferred catalog clips | `js/session-builder.js` (`opts.prefer`) | this branch |
| Buttons, camera input, client-side resize, chip card, 390px check | pages + `css/` | UI branch |
| Worker deploy + `GEMINI_API_KEY` + pointing the page at it | Cloudflare | owner step |
