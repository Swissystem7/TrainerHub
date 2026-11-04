'use strict';
// Playwright E2E for the PWA (desktop + 360px). Skips when Playwright is not installed.
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { chromium = null; }
const root = path.join(__dirname, '..');
const shots = path.join(root, 'docs', 'screenshots');
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg' };

function serve(state) {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      if (p.endsWith('/')) p += 'index.html';
      const file = path.join(root, p);
      if (!file.startsWith(root) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
      let body = fs.readFileSync(file);
      if (p === '/sw.js' && state.version) body = Buffer.from(String(body).replace(/const VERSION = '[^']+'/, "const VERSION = '" + state.version + "'"));
      res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-cache' });
      res.end(body);
    }).listen(0, '127.0.0.1', () => resolve(srv));
  });
}

const sizes = [{ name: 'desktop', viewport: { width: 1280, height: 800 } }, { name: '360', viewport: { width: 360, height: 740 } }];

for (const size of sizes) {
  test('PWA works offline incl. workout mode and announces a new version (' + size.name + ')', { skip: !chromium && 'playwright not installed', timeout: 90000 }, async () => {
    const state = {};
    const srv = await serve(state);
    const base = 'http://127.0.0.1:' + srv.address().port;
    const browser = await chromium.launch();
    try {
      const ctx = await browser.newContext({ viewport: size.viewport, locale: 'he-IL' });
      await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, (r) => r.abort());
      const page = await ctx.newPage();
      await page.goto(base + '/index.html');
      await page.evaluate(() => navigator.serviceWorker.ready);
      await page.reload();
      await page.waitForFunction(() => !!navigator.serviceWorker.controller);
      const manifest = await page.evaluate(() => document.querySelector('link[rel=manifest]').href);
      assert.match(manifest, /manifest\.json$/);

      await page.goto(base + '/frontend/workout-mode.html');
      const link = await page.evaluate(() => ThLink.encodeLink({ title: 'אימון אופליין', phases: [{ name: 'עיקרי', exercises: [
        { name: 'סקוואט', sets: 3, reps: 12, rest_seconds: 45 }, { name: 'שכיבות סמיכה', sets: 3, reps: 10, rest_seconds: 45 }] }] }, { name: 'דנה' }));
      await ctx.setOffline(true);
      for (const p of ['/index.html', '/frontend/workout-mode.html', '/exercises.html', '/weekly.html', '/booklet.html']) {
        const res = await page.goto(base + p);
        assert.ok(res && res.ok(), p + ' offline');
        assert.equal(await page.evaluate(() => document.documentElement.lang), 'he');
      }
      await page.goto(link);
      await page.waitForLoadState('load');
      await page.getByText('סקוואט').first().waitFor({ timeout: 10000 });
      await page.screenshot({ path: path.join(shots, 'pwa-offline-workout-' + size.name + '.png') });
      const json = await page.evaluate(() => fetch('../data/exercises.json').then((r) => r.json()).then((d) => d.exercises.length));
      assert.ok(json > 0, 'catalog offline');
      await ctx.setOffline(false);

      state.version = 'th-test-next';
      await page.goto(base + '/index.html');
      await page.evaluate(() => navigator.serviceWorker.getRegistration().then((r) => r.update()));
      const bar = page.locator('#th-pwa-bar');
      await bar.getByText('יש גרסה חדשה').waitFor({ timeout: 20000 });
      await page.screenshot({ path: path.join(shots, 'pwa-update-' + size.name + '.png') });
      await Promise.all([page.waitForEvent('load'), page.click('#th-pwa-update')]);
      const v = await page.evaluate(() => new Promise((res) => {
        navigator.serviceWorker.addEventListener('message', (e) => res(e.data.version));
        navigator.serviceWorker.controller.postMessage('VERSION');
      }));
      assert.equal(v, 'th-test-next');
      await ctx.close();
    } finally {
      await browser.close();
      srv.close();
    }
  });
}
