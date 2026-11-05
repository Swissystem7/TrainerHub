const test = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

let chromium;
try { ({ chromium } = require('playwright')); } catch (e) { chromium = null; }
const ROOT = path.join(__dirname, '..');
const SHOTS = process.env.TH_SCREENSHOTS ? path.join(ROOT, 'docs/screenshots') : null;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml' };

function serve() {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
      if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream' });
      fs.createReadStream(p).pipe(res);
    });
    srv.listen(0, '127.0.0.1', () => resolve(srv));
  });
}

const WORKOUT = { title: 'כוח קצר', phases: [{ name: 'main', exercises: [
  { id: 'squat', name: 'סקוואט', sets: 2, reps: 10, rest_seconds: 2 },
  { id: 'row', name: 'חתירה', sets: 1, reps: 12, rest_seconds: 2 }] }] };

for (const vp of [{ name: 'desktop', width: 1280, height: 900 }, { name: '360', width: 360, height: 780 }]) {
  test('share: per-exercise detail in TH1 code, journal import, QR on share @' + vp.name, { skip: !chromium && 'playwright not installed' }, async () => {
    const srv = await serve();
    const base = 'http://127.0.0.1:' + srv.address().port;
    const browser = await chromium.launch();
    try {
      const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      await ctx.addInitScript(() => { window.speechSynthesis && (window.speechSynthesis.speak = () => {}); navigator.vibrate = () => true; });
      await ctx.addInitScript((w) => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('trainerhub_active_workout', JSON.stringify(w)); } }, WORKOUT);
      const page = await ctx.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(String(e)));
      await page.goto(base + '/frontend/workout-mode.html');
      await page.click('#btnStartPause');
      for (const [r, w] of [['8', '40'], ['10', '42.5'], ['12', '30']]) {
        await page.waitForSelector('#logReps', { timeout: 6000 });
        await page.fill('#logReps', r); await page.fill('#logWeight', w);
        await page.click('#btnDone');
      }
      await page.waitForSelector('#exRpe0', { timeout: 6000 });
      await page.selectOption('#exRpe0', '8');
      await page.waitForFunction(() => /^TH1\./.test(document.getElementById('resultCode').value));
      const code = await page.inputValue('#resultCode');
      const decoded = await page.evaluate((c) => TH.decodeResult(c), code);
      assert.deepStrictEqual(decoded.log.map((e) => [e.id, e.sets.length, e.rpe]), [['squat', 2, 8], ['row', 1, null]]);
      if (SHOTS) await page.locator('#completionScreen').screenshot({ path: path.join(SHOTS, 'report-exrpe-' + vp.name + '.png') });

      await page.goto(base + '/journal.html');
      await page.fill('#importCode', code);
      await page.click('#importForm button[type="submit"]');
      await page.waitForFunction(() => /תרגילים/.test(document.getElementById('importStatus').textContent));
      const entries = await page.evaluate(() => JSON.parse(localStorage.getItem('trainerhub_journal_entries')).entries);
      assert.ok(entries.some((e) => e.sets && e.sets.some((s) => s.exerciseId === 'squat' && s.weightKg === 42.5)));

      await page.evaluate(() => { TH.setEntitlement({ tier: 'trainer', at: Date.now() }); });
      await page.reload();
      await page.click('[data-act="share"][data-i="0"]');
      await page.waitForSelector('[data-role="share-qr"] svg.th-qr', { timeout: 6000 });
      assert.match(await page.getAttribute('[data-role="share-qr"] svg', 'aria-label'), /QR/);
      await page.locator('[data-role="share-qr"]').scrollIntoViewIfNeeded();
      if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'share-qr-' + vp.name + '.png') });
      assert.deepStrictEqual(errors, []);
    } finally { await browser.close(); srv.close(); }
  });
}
