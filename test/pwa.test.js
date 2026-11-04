'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const sw = read('sw.js');
const precache = JSON.parse('[' + sw.match(/const PRECACHE = \[([\s\S]*?)\];/)[1].replace(/'/g, '"') + ']');
const pages = fs.readdirSync(root).filter((f) => f.endsWith('.html'))
  .concat(fs.readdirSync(path.join(root, 'frontend')).filter((f) => f.endsWith('.html')).map((f) => 'frontend/' + f));

test('manifest is installable: standalone, Hebrew RTL, 192+512 and maskable icons that exist', () => {
  const m = JSON.parse(read('manifest.json'));
  assert.equal(m.display, 'standalone');
  assert.equal(m.lang, 'he');
  assert.equal(m.dir, 'rtl');
  assert.equal(m.start_url, './index.html');
  const sizes = m.icons.map((i) => i.sizes);
  assert.ok(sizes.includes('192x192') && sizes.includes('512x512'));
  assert.ok(m.icons.some((i) => i.purpose === 'maskable'));
  m.icons.forEach((i) => assert.ok(fs.existsSync(path.join(root, i.src)), i.src));
});

test('every precached file exists, so install never fails', () => {
  precache.filter((u) => u !== './').forEach((u) => assert.ok(fs.existsSync(path.join(root, u)), u));
});

test('precache covers every page, every JS file, the stylesheet and the catalogs', () => {
  const want = pages.concat(
    fs.readdirSync(path.join(root, 'js')).map((f) => 'js/' + f),
    fs.readdirSync(path.join(root, 'frontend')).filter((f) => f.endsWith('.js')).map((f) => 'frontend/' + f),
    fs.readdirSync(path.join(root, 'data')).map((f) => 'data/' + f),
    ['css/app.css', 'videos/drive-catalog.json']);
  want.forEach((f) => assert.ok(precache.includes('./' + f), 'missing from PRECACHE: ' + f));
});

test('every page links the manifest and loads pwa.js with the right relative path', () => {
  pages.forEach((p) => {
    const html = read(p);
    const pre = p.startsWith('frontend/') ? '\\.\\./' : '\\./';
    assert.match(html, new RegExp('<link rel="manifest" href="' + pre + 'manifest\\.json">'), p);
    assert.match(html, new RegExp('<script src="' + pre + 'js/pwa\\.js" defer></script>'), p);
    assert.match(html, /<meta name="theme-color"/, p);
  });
});

test('service worker caches watched videos, versions the shell and supports the update prompt', () => {
  assert.match(sw, /const VERSION = '[^']+'/);
  assert.match(sw, /th-media-v1/);
  assert.match(sw, /SKIP_WAITING/);
  assert.match(sw, /status !== 206/);
  const pwa = read('js/pwa.js');
  assert.match(pwa, /יש גרסה חדשה/);
  assert.match(pwa, /התקנה למסך הבית/);
  assert.match(pwa, /beforeinstallprompt/);
});

test('no keys or secrets in the PWA files', () => {
  [sw, read('js/pwa.js'), read('manifest.json')].forEach((s) => assert.doesNotMatch(s, /api[_-]?key|secret|token/i));
});
