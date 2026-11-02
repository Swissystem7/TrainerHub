---
name: trainerhub
description: Working on the TrainerHub repo (Hebrew RTL static workout builder on GitHub Pages + optional Python backend). Use before changing any page, CSS, data file (exercises.json, drive_videos.json) or test, before fixing a failing PR check, and before any UI/design work.
---

# TrainerHub

Hebrew, RTL, static site (GitHub Pages) for personal trainers: build a workout,
weekly plan, reel/video library, journal, print sheet, live workout mode.
No build step, no npm dependencies. An optional FastAPI backend lives in `backend/`.

## Structure

| Path | What |
| --- | --- |
| `*.html` (root) | One page each: `index` (prompt builder), `weekly`, `exercises` (reel library + builder), `library` (OneDrive clip library), `journal`, `booklet`, `manage`, `offer`, `pitch` (A4 light print page), `scan`, `site-scan`, `workout-print` |
| `frontend/index.html`, `frontend/workout-mode.html` | Text-to-card studio and live workout mode (link `../css/app.css`) |
| `css/app.css` | **The only shared stylesheet.** Nav, banner, `.th-btn`, a11y helpers, design tokens, touch-target rules |
| inline `<style>` per page | Page-specific styles; each page defines its own `:root` (`--bg --card --line --ink --muted --lime`) |
| `js/*.js` | UMD-ish modules usable from Node tests and the browser (`js/core.js`, `js/reel-library.js`, …) |
| `data/exercises.json` | 79 Instagram reels (schema in README «איך מוסיפים תרגיל») |
| `data/drive_videos.json` | Drive videos array `{fileId, name, folder, muscleGroup}` |
| `content/booklet/` | Booklet course content as data |
| `backend/`, `tests/` | Python FastAPI + `unittest` tests |
| `worker/site-scan` | Cloudflare-worker style endpoint (needs a key; do not configure it) |
| `test/*.js` | ~400 `node:test` files, mostly static regex checks over HTML/CSS + module logic |

## Commands

```bash
npm test                                   # node --test test/*.js  (~1600 tests, ~10s)
node --test test/drive-videos.test.js      # one file
npm run validate:exercises                 # schema check for exercises.json + drive_videos.json
python3 -m unittest discover -s tests      # backend tests (pytest is not installed)
```

Serve locally for a browser check: any static server from the repo root
(`python3 -m http.server`). Playwright + Chromium are preinstalled in cloud
sessions (`require('playwright')`); do not `playwright install`.

## CI / PR checks

- There is **no `.github/workflows` test job** in the repo; GitHub only runs CodeQL.
  The "tests FAILED" signal on PRs is a **local runner comment** posted by the owner
  ("Local check (dell-ai…)") with the `npm test` tail. Reproduce with `npm test`
  and grep `^not ok`.
- Never edit `.github/workflows`, never force-push, never merge.

## Pitfalls (learned the hard way)

1. **Data counts are hard-coded in tests and README.** `test/drive-videos.test.js`
   asserts the exact number of Drive rows, per-group counts and the combined total
   (`exercises.length + drive.length`). README states the count too
   («וכיום יש בו N סרטונים»). Adding rows to `data/*.json` ⇒ update test + README.
2. **New Drive folders must be mapped.** `DRIVE_FOLDER_GROUPS` in `js/reel-library.js`
   maps folder name → library group. An unmapped folder silently becomes
   `לא ממוין`. Add it to the map, to the README table under «סרטוני Google Drive»,
   and to the folder test. (`מתיחות וגמישות` → `מוביליטי`, like `חימום`.)
   Folders `לא קשור` / `לבדיקה` are intentionally skipped.
3. **Tests pin exact markup with regexes**, e.g.
   `<span class="chip on" aria-current="page">…</span>`,
   `<button type="button" class="th-btn" id="printBtn" aria-label="…">`, and even
   inline CSS like `button:focus-visible, input:focus-visible, … { outline: 2px solid var(--lime);`.
   Prefer CSS-only changes in `css/app.css`; if markup must change, grep `test/`
   for the string and update the test in the same commit.
4. **Cascade order:** every page links `app.css` *before* its inline `<style>`, so
   page rules win at equal specificity. Put shared rules on properties pages don't
   set (`min-height`, `min-width`) or use a slightly higher selector
   (`body :is(input, select, textarea)`).
5. **Never set `display` on generic elements** (`button`, `a`, …) in `app.css`:
   author `display` beats the UA `[hidden] { display:none }` and un-hides
   elements. Guard with `:not([hidden])` when you must (see `a.th-btn`).
6. File inputs on `scan.html` / `site-scan.html` are visually hidden (1px,
   opacity 0); the `<label>` is the tap target. Don't give them min sizes.
7. `pitch.html` is a **light**, A4 print page — dark-theme colors (amber banner,
   lime) fail contrast there. It has its own overrides and is exempt from the
   13px floor test.
8. Keep RTL: use logical properties (`inset-inline-start`, `margin-inline-end`,
   `text-align: start`). Every page must keep `lang="he" dir="rtl"` (tested).
9. Do not handle secrets: `GEMINI_API_KEY`, `TH_VISION_ENDPOINT`, access codes and
   Sentry DSN stay out of commits and out of your session.

## Design rules (enforced by `test/design-system.test.js`)

- **Mobile-first at 360px.** No horizontal page scroll. Side gutter
  `--th-gutter` (16px).
- **Touch targets ≥ 44px**: `--th-tap`. All `button, select, summary, [role=tab],
  [role=button]`, text inputs, `.th-btn`, nav chips. Checkboxes/radios 22px with a
  clickable label. Exception: inline text links inside paragraphs.
- **Nav:** at ≤720px it's one horizontally scrollable row (no wrap), brand
  (`order:-2`) and current chip (`order:-1`) first, fade mask at the end. On
  `(min-width:721px) and (pointer:fine)` chips compact to 34px.
  The current page is always `<span class="chip on" aria-current="page">`.
- **Type scale:** `--th-text-xs` 13px (floor: pills, badges, banners) ·
  `--th-text-sm` 14px (secondary, nav) · `--th-text-md` 16px (body, form fields —
  stops iOS zoom) · `--th-text-lg` 20px (card titles). Line-height ~1.5 for Hebrew.
  No screen `font-size` below `.8rem` in page styles.
- **Spacing:** 4px grid, `--th-space-1..6` = 4, 8, 12, 16, 24, 32.
- **Contrast:** WCAG AA — 4.5:1 for text, 3:1 for ≥24px or ≥18.66px bold.
  On the dark surfaces use `--ink #f6f8f6`, `--muted #a7b1ab`, `--lime #b9f24a`,
  warn `#f0b542`, focus `#c4b5fd`. Purple `#7c3aed` is a **fill** color (with
  white text), never text on dark — use `#a78bfa`/`#c4b5fd` for purple text.
  Links on dark must not be UA blue.
- **Focus:** visible `:focus-visible` outline (2px) everywhere; skip link per page.
- **Motion:** honor `prefers-reduced-motion` (already global in `app.css`).

### Verifying design changes

A 360px Playwright audit (serve the repo, open each of the 14 pages, count
controls under 44×44, text nodes under 12px, AA contrast failures against the
first opaque ancestor background, and `scrollWidth - innerWidth`) is the quickest
regression check. Take screenshots before/after and look at them — the nav and
banners are the first thing to break.
