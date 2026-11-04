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

for (const vp of [{ name: 'desktop', width: 1280, height: 900 }, { name: '360', width: 360, height: 780 }]) {
  test('journal: client details, measurement, encrypted backup + restore @' + vp.name, { skip: !chromium && 'playwright not installed' }, async () => {
    const srv = await serve();
    const base = 'http://127.0.0.1:' + srv.address().port;
    const browser = await chromium.launch();
    try {
      const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, acceptDownloads: true });
      const page = await ctx.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(String(e)));
      page.on('dialog', (d) => d.accept());
      await page.goto(base + '/journal.html');
      await page.fill('#newName', 'נועה');
      await page.selectOption('#newGoal', 'strength');
      await page.selectOption('#newLevel', 'beginner');
      await page.click('#addForm button[type=submit]');
      const card = page.locator('article.card').first();
      await card.locator('summary').click();
      await card.locator('input[data-day="0"]').check();
      await card.locator('input[data-day="3"]').check();
      await card.locator('[data-act="details"]').click();
      await page.locator('article.card').first().locator('[data-f="weightKg"]').fill('62.5');
      await page.locator('article.card').first().locator('[data-f="waistCm"]').fill('70');
      await page.locator('article.card').first().locator('[data-act="measure"]').click();
      const summary = await page.locator('[data-role="details-summary"]').first().textContent();
      assert.match(summary, /כוח/);
      assert.match(summary, /מתחיל/);
      assert.match(summary, /62\.5/);
      const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('trainerhub_clients')));
      assert.deepStrictEqual(stored[0].days, [0, 3]);
      assert.strictEqual(stored[0].measurements[0].waistCm, 70);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      assert.ok(overflow <= 1, 'no horizontal scroll, got ' + overflow);
      if (SHOTS) await page.locator('article.card').first().screenshot({ path: path.join(SHOTS, 'client-details-' + vp.name + '.png') });

      await page.fill('#backupPass', 'secret123');
      const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#backupExport')]);
      const file = await dl.path();
      const text = fs.readFileSync(file, 'utf8');
      assert.ok(!text.includes('נועה'), 'backup must be encrypted');
      if (SHOTS) await page.locator('#backupForm').screenshot({ path: path.join(SHOTS, 'backup-' + vp.name + '.png') });

      // New device: empty storage, restore with wrong then right password.
      const page2 = await (await browser.newContext({ viewport: { width: vp.width, height: vp.height } })).newPage();
      page2.on('dialog', (d) => d.accept());
      await page2.goto(base + '/journal.html');
      await page2.setInputFiles('#backupFile', file);
      await page2.fill('#backupPass', 'wrongpass');
      await page2.click('#backupImport');
      await page2.waitForFunction(() => /סיסמה שגויה/.test(document.getElementById('backupStatus').textContent));
      await page2.fill('#backupPass', 'secret123');
      await page2.click('#backupImport');
      await page2.waitForFunction(() => /שוחזרו/.test(document.getElementById('backupStatus').textContent));
      assert.match(await page2.locator('article.card h2').first().textContent(), /נועה/);
      assert.deepStrictEqual(errors, []);
    } finally {
      await browser.close();
      srv.close();
    }
  });
}
