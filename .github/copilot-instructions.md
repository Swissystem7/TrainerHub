# Copilot instructions for TrainerHub

## Stack
Primary language: JavaScript. Top-level files: .gitignore, LICENSE, MONETIZATION.md, README.md, RESEARCH.md, backend, booklet.html, content, css, docs, frontend, index.html, journal.html, js, library.html, manage.html, offer.html, package.json, pitch.html, scripts, site-scan.html, test, tests, videos, weekly.html. Dependencies: .

## Build / test / lint
- Install: `npm ci` (or `npm install`)
- `npm run test` -> node --test test/*.js
Always run the relevant checks above before opening a PR and report results in the PR body.

## Conventions
- Keep changes small and focused: one issue = one Draft PR.
- Branch prefix: `copilot/`. Never push to `master` and never merge.
- Follow existing code style and folder structure; don't add new dependencies without explaining why.
- Never commit secrets, tokens, or .env files.
- Write or update tests when changing logic; update README when behavior changes.