'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const swCode = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');

function load(cacheBehaviour) {
  const listeners = {};
  const added = [];
  const cache = {
    addAll: async (list) => {
      if (cacheBehaviour && cacheBehaviour.fail && cacheBehaviour.fail(list)) throw new Error('network');
      added.push(...list);
    },
    match: async () => null,
    put: async () => {}
  };
  const sandbox = {
    self: { addEventListener: (t, f) => (listeners[t] = f), skipWaiting: () => {}, clients: { claim: async () => {} } },
    caches: { open: async () => cache, keys: async () => [], delete: async () => true, match: async () => null },
    fetch: async () => ({}),
    Response: class {},
    URL
  };
  vm.createContext(sandbox);
  const lists = vm.runInContext(
    `${swCode}\n;({ CACHE_NAME, CORE_FILES, PAGE_FILES, SCRIPT_FILES, DATA_FILES, APP_SHELL_FILES })`,
    sandbox
  );
  return { lists, listeners, added };
}

const { lists } = load();
const shell = lists.APP_SHELL_FILES.filter((f) => f !== './').map((f) => path.posix.normalize(f.replace(/^\.\//, '')));
const has = (rel) => shell.includes(rel);

function localRefs(page) {
  const html = fs.readFileSync(path.join(ROOT, page), 'utf8').replace(/<!--[\s\S]*?-->/g, '');
  const out = [];
  for (const m of html.matchAll(/<(?:script|link)\b[^>]*?(?:src|href)="([^"]+)"/g)) {
    const u = m[1];
    if (/^(https?:|\/\/|data:|#)/.test(u)) continue;
    out.push(path.posix.normalize(path.posix.join(path.posix.dirname(page), u.split(/[?#]/)[0])));
  }
  return out;
}

const PAGES = fs
  .readdirSync(ROOT)
  .filter((f) => f.endsWith('.html'))
  .concat(
    fs
      .readdirSync(path.join(ROOT, 'frontend'))
      .filter((f) => f.endsWith('.html'))
      .map((f) => `frontend/${f}`)
  );

test('cache name is bumped so activate drops the old, partial v2 cache', () => {
  assert.equal(lists.CACHE_NAME, 'trainerhub-v3');
});

test('every file in the shell exists on disk and none is listed twice', () => {
  assert.equal(new Set(shell).size, shell.length, 'duplicates in the shell list');
  for (const rel of shell) {
    assert.ok(fs.existsSync(path.join(ROOT, rel)), `${rel} is in the shell but missing on disk`);
  }
});

test('every page of the app is in the shell', () => {
  for (const p of PAGES) assert.ok(has(p), `${p} is not cached for offline use`);
});

test('every local script, stylesheet, preload, icon and manifest a page references is in the shell', () => {
  for (const p of PAGES) {
    for (const ref of localRefs(p)) assert.ok(has(ref), `${p} uses ${ref}, which is not cached`);
  }
});

test('all browser scripts in js/, the app data files and the manifest are in the shell', () => {
  for (const f of fs.readdirSync(path.join(ROOT, 'js')).filter((n) => n.endsWith('.js') || n.endsWith('.json'))) {
    assert.ok(has(`js/${f}`), `js/${f} is not cached`);
  }
  for (const f of ['data/exercises.json', 'data/drive_videos.json', 'manifest.webmanifest']) {
    assert.ok(has(f), `${f} is not cached`);
  }
  for (const f of fs.readdirSync(path.join(ROOT, 'fonts')).filter((n) => n.endsWith('.woff2'))) {
    assert.ok(has(`fonts/${f}`), `fonts/${f} is not cached`);
  }
  for (const f of fs
    .readdirSync(path.join(ROOT, 'content'), { recursive: true })
    .filter((n) => String(n).endsWith('.json'))) {
    assert.ok(has(`content/${f}`), `content/${f} is not cached`);
  }
});

test('no video files or posters are pre-cached (large, range requests)', () => {
  for (const rel of shell) assert.ok(!/\.(mp4|mov|webm|jpg|jpeg)$/i.test(rel) && !rel.startsWith('assets/'), rel);
});

test('manifest icons exist, have the declared size, and one is maskable', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.webmanifest'), 'utf8'));
  assert.ok(Array.isArray(manifest.icons) && manifest.icons.length >= 3);
  assert.ok(manifest.icons.some((i) => i.purpose === 'maskable'));
  for (const icon of manifest.icons) {
    const file = path.join(ROOT, icon.src);
    assert.ok(fs.existsSync(file), `${icon.src} must exist`);
    assert.ok(has(icon.src), `${icon.src} is not cached`);
    if (icon.type === 'image/png') {
      const buf = fs.readFileSync(file);
      assert.equal(buf.subarray(1, 4).toString('latin1'), 'PNG');
      const [w, h] = icon.sizes.split('x').map(Number);
      assert.equal(buf.readUInt32BE(16), w, `${icon.src} width`);
      assert.equal(buf.readUInt32BE(20), h, `${icon.src} height`);
    }
  }
  assert.ok(manifest.icons.some((i) => i.sizes === '192x192'));
  assert.ok(manifest.icons.some((i) => i.sizes === '512x512'));
  assert.equal(manifest.theme_color, '#C22826');
});

test('icon colours are only red #C22826 and gold #E6B731', () => {
  const svg = fs.readFileSync(path.join(ROOT, 'icons', 'icon.svg'), 'utf8');
  const colours = new Set((svg.match(/#[0-9a-fA-F]{6}\b/g) || []).map((c) => c.toUpperCase()));
  assert.deepEqual([...colours].sort(), ['#C22826', '#E6B731']);
});

test('every page declares the real icon, an apple touch icon and the red theme colour', () => {
  for (const p of PAGES) {
    const html = fs.readFileSync(path.join(ROOT, p), 'utf8');
    const prefix = p.startsWith('frontend/') ? '../' : './';
    assert.ok(html.includes(`<link rel="icon" type="image/svg+xml" href="${prefix}icons/icon.svg">`), `${p}: icon`);
    assert.ok(
      html.includes(`<link rel="apple-touch-icon" href="${prefix}icons/apple-touch-icon.png">`),
      `${p}: apple icon`
    );
    assert.ok(html.includes('<meta name="theme-color" content="#C22826">'), `${p}: theme-color`);
    assert.ok(!html.includes('href="data:,"'), `${p}: empty icon`);
  }
});

test('install: the core files must arrive; the other groups are best effort', async () => {
  const ok = load();
  let waited;
  await ok.listeners.install({ waitUntil: (p) => (waited = p) });
  await waited;
  assert.equal(ok.added.length, ok.lists.APP_SHELL_FILES.length, 'everything cached when the network is fine');

  const flaky = load({ fail: (list) => list.includes('./js/catalog.json') });
  await flaky.listeners.install({ waitUntil: (p) => (waited = p) });
  await waited;
  assert.ok(flaky.added.includes('./index.html'), 'core cached');
  assert.ok(flaky.added.includes('./booklet.html'), 'pages cached');
  assert.ok(!flaky.added.includes('./js/catalog.json'), 'the failed data group is skipped');

  const broken = load({ fail: (list) => list.includes('./index.html') });
  await broken.listeners.install({ waitUntil: (p) => (waited = p) });
  await assert.rejects(waited, /network/, 'no core, no install');
});
