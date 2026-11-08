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
  test('weekly periodization: 8-week plan, deload, auto-adjust, PPL balance @' + vp.name, { skip: !chromium && 'playwright not installed' }, async () => {
    const srv = await serve();
    const base = 'http://127.0.0.1:' + srv.address().port;
    const browser = await chromium.launch();
    try {
      const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      const page = await ctx.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(String(e)));
      await page.goto(base + '/weekly.html');
      await page.selectOption('#equipment', 'dumbbells');
      await page.selectOption('#periodWeeks', '8');
      await page.click('#buildBtn');
      await page.waitForSelector('#periodCard');
      assert.strictEqual(await page.locator('.period-week').count(), 8);
      assert.deepStrictEqual(await page.$$eval('.period-week', (els) => els.map((e) => e.dataset.kind)),
        ['load', 'load', 'load', 'deload', 'load', 'load', 'load', 'deload']);
      assert.match(await page.textContent('#pplBalance'), /דחיפה|איזון/);
      if (SHOTS) await page.locator('#periodCard').screenshot({ path: path.join(SHOTS, 'period-plan-' + vp.name + '.png') });

      // week 1 had pain → week 2 becomes an early deload with a Hebrew reason
      await page.check('#pPain1');
      await page.waitForFunction(() => document.querySelector('.period-week[data-week="2"]').dataset.kind === 'deload');
      assert.match(await page.textContent('.period-week[data-week="2"] .period-why'), /כאב/);
      // corrected: no pain, but 2 skips → hold load at 100%
      await page.uncheck('#pPain1');
      await page.fill('#pSkip1', '2');
      await page.dispatchEvent('#pSkip1', 'change');
      await page.waitForFunction(() => /דולגו/.test(document.querySelector('.period-week[data-week="2"] .period-why').textContent));
      assert.match(await page.textContent('.period-week[data-week="2"]'), /100%/);
      if (SHOTS) await page.locator('.period-week[data-week="2"]').screenshot({ path: path.join(SHOTS, 'period-adjust-' + vp.name + '.png') });

      // show the deload week: day sets drop and the note names the load
      const setsBefore = await page.evaluate(() => TH.toPhasesWorkout(window.__lastProgram.dailyWorkouts[0], window.__lastMeta).phases.find((p) => /main/i.test(p.name)).exercises[0].sets);
      await page.click('.period-show[data-week="4"]');
      await page.waitForFunction(() => window.__periodWeek === 4);
      const shown = await page.evaluate(() => planned(TH.toPhasesWorkout(window.__lastProgram.dailyWorkouts[0], window.__lastMeta)).phases.find((p) => /main/i.test(p.name)).exercises[0]);
      assert.ok(shown.sets < setsBefore || setsBefore === 1);
      assert.match(shown.notes, /שבוע 4: 60% עומס/);
      assert.match(await page.textContent('#result'), /סטים/);
      assert.deepStrictEqual(errors, []);
    } finally { await browser.close(); srv.close(); }
  });
}
