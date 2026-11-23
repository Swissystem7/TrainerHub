'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const PAGES = fs
  .readdirSync(ROOT)
  .filter((f) => f.endsWith('.html'))
  .concat(
    fs
      .readdirSync(path.join(ROOT, 'frontend'))
      .filter((f) => f.endsWith('.html'))
      .map((f) => `frontend/${f}`)
  );
const css = fs.readFileSync(path.join(ROOT, 'css', 'fonts.css'), 'utf8');

test('no page, stylesheet or script asks Google Fonts for anything', () => {
  const files = [...PAGES, 'css/app.css', 'css/fonts.css'];
  for (const f of files) {
    const text = fs.readFileSync(path.join(ROOT, f), 'utf8');
    assert.ok(!/fonts\.googleapis\.com|fonts\.gstatic\.com/.test(text), `${f} still points at Google Fonts`);
  }
});

test('every page that used Heebo now loads css/fonts.css once, with the right relative path', () => {
  const withFonts = PAGES.filter((f) => /fonts\.css/.test(fs.readFileSync(path.join(ROOT, f), 'utf8')));
  assert.equal(withFonts.length, 16, 'the 15 pages that loaded Heebo from Google Fonts, plus the privacy page');
  for (const f of withFonts) {
    const html = fs.readFileSync(path.join(ROOT, f), 'utf8');
    const prefix = f.startsWith('frontend/') ? '../' : './';
    const links = html.match(/<link rel="stylesheet" href="[^"]*css\/fonts\.css">/g) || [];
    assert.equal(links.length, 1, f);
    assert.ok(links[0].includes(`href="${prefix}css/fonts.css"`), `${f}: ${links[0]}`);
    assert.ok(
      html.includes(`href="${prefix}fonts/heebo-hebrew.woff2" as="font" type="font/woff2" crossorigin`),
      `${f}: preload`
    );
    assert.ok(html.indexOf('css/fonts.css') < html.indexOf('</head>'), `${f}: in head`);
  }
});

test('fonts.css declares Heebo (300-900, swap) from files that exist, and the licence ships with them', () => {
  const urls = [...css.matchAll(/url\((\.\.\/fonts\/[^)]+)\)/g)].map((m) => m[1]);
  assert.equal(urls.length, 3, 'hebrew, latin and latin-ext subsets');
  for (const u of urls) {
    assert.ok(fs.existsSync(path.join(ROOT, 'css', u)), `${u} must exist`);
    const bytes = fs
      .readFileSync(path.join(ROOT, 'css', u))
      .subarray(0, 4)
      .toString('latin1');
    assert.equal(bytes, 'wOF2', `${u} is a woff2 file`);
  }
  assert.ok(urls.some((u) => u.includes('heebo-hebrew')));
  assert.equal((css.match(/font-display: swap/g) || []).length, urls.length);
  assert.equal((css.match(/font-weight: 300 900/g) || []).length, urls.length);
  assert.ok(!/font-family: '(?!Heebo)/.test(css), 'only Heebo is declared');
  assert.match(fs.readFileSync(path.join(ROOT, 'fonts', 'OFL-Heebo.txt'), 'utf8'), /SIL OPEN FONT LICENSE/i);
});

test('the app font stack still names Heebo first', () => {
  assert.match(fs.readFileSync(path.join(ROOT, 'css', 'app.css'), 'utf8'), /--th-font:\s*'Heebo'/);
});
