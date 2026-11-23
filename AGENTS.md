# Notes for coding agents

## Commands

Install, lint, build, and test commands below are taken from `package.json`, `package-lock.json`, and `biome.json`. If a step is listed as **none defined**, skip it and do not invent a command.

| Step | Command | Notes |
|---|---|---|
| Install | `npm ci` | `package-lock.json` is present (lockfileVersion 3). No production `dependencies`. devDependencies include `@biomejs/biome` **2.6.7**, knip, size-limit, Playwright, `@playwright/test`, and `@axe-core/playwright`. |
| Lint | `npm run check:style` | Runs `biome check`. `@biomejs/biome` is pinned to **2.6.7** in `package.json` and the lockfile. `$schema` in `biome.json` is `https://biomejs.dev/schemas/2.6.7/schema.json`. |
| Build | none defined | There is no `build` script. The public app is static HTML/JS (`index.html` and the other root HTML pages). Optional Python backend under `backend/` is not built by npm. |
| Test | `npm test` | Runs `node --test test/*.js`. Other existing scripts: `npm run test:e2e` (`playwright test`), `npm run validate:exercises`, `npm run check:deadcode`, `npm run check:size`, `npm run check:html`, `npm run check:a11y-static`, `npm run check:i18n`, `npm run doctor`. `backend/README.md` also documents `python -m unittest discover -s tests` for the Python tests in `tests/`. |

Before opening a PR, run every lint, build, and test command that exists in the table above.

## Folder structure

- Root HTML pages: `index.html`, `exercises.html`, `journal.html`, `library.html`, `manage.html`, `weekly.html`, `reserves.html`, `scan.html`, `site-scan.html`, `booklet.html`, `workout-print.html`, `offer.html`, `pitch.html`, plus `sw.js` and `manifest.webmanifest`.
- `js/` — browser application logic (core, catalog, journal, scan, session builder, and related modules).
- `css/`, `data/`, `content/`, `assets/`, `videos/`.
- `frontend/` — additional HTML/JS pages.
- `backend/` — optional FastAPI-related Python helpers (`backend/README.md`). GitHub Pages does not run this server.
- `worker/site-scan/` — Cloudflare Worker (`wrangler.toml`, `worker.mjs`).
- `test/` — Node test suite; `tests/` — Python unittests; `e2e/` — Playwright specs (`playwright.config.js`).
- `scripts/`, `docs/`.

## Style

Biome is configured in `biome.json` and pinned at **@biomejs/biome 2.6.7**.

- Formatter: spaces, indent width 2, line width 120; JavaScript quote style `single`, semicolons `always`, trailing commas `none`.
- Linter: enabled, `recommended` preset. Some rules are set to `warn`: `correctness.noEmptyPattern`, `correctness.noInnerDeclarations`, `suspicious.noRedeclare`, `suspicious.noAssignInExpressions`, `suspicious.noDuplicateObjectKeys`, `suspicious.useIterableCallbackReturn`.
- Files included: `**/*.js` (`ignoreUnknown` true). VCS integration uses git and the ignore file. Assist is disabled.
- One override disables the formatter for a large, explicit file list (see `biome.json`; do not expand or invent that list here).

Do not change `biome.json` or the Biome version unless the task is specifically about that config.

## Rules

- **UI design** comes only from Claude Design and is implemented as-is, without changes.
- **Before opening a PR**, run lint, build, and test locally (skip any step listed as none defined; do not invent commands).
- **Never** touch `.github/workflows` or any merge mechanism, auto-merge, or merge scripts. **Never** push to `master` or `main`. Do not merge pull requests and do not enable auto-merge.
