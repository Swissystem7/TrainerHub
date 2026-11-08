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

function seedClients() {
  const day = (n) => { const d = new Date(); d.setDate(d.getDate() - n); d.setHours(9, 0, 0, 0); return d.toISOString(); };
  return [
    { id: 't_noa', name: 'נועה', phone: '0501111111', plan: 'כוח A', goal: 'strength', level: 'beginner', days: [0, 3],
      lastPlan: { title: 'כוח A', phases: [{ name: 'main', exercises: [{ id: 'squat', name: 'סקוואט' }, { id: 'row', name: 'חתירה' }] }] },
      measurements: [{ at: '2026-10-01', weightKg: 64 }, { at: '2026-10-20', weightKg: 63 }, { at: '2026-11-01', weightKg: 62.5 }],
      logs: [0, 2, 5, 9, 12, 16, 23, 30, 40].map((n) => ({ at: day(n), title: 'כוח A', minutes: 40 })) },
    { id: 't_avi', name: 'אבי', phone: '0502222222', plan: 'ריצה', goal: 'endurance', level: 'advanced', logs: [] }
  ];
}

for (const vp of [{ name: 'desktop', width: 1280, height: 900 }, { name: '360', width: 360, height: 780 }]) {
  test('journal insights: search, filter, charts, heatmap, PRs @' + vp.name, { skip: !chromium && 'playwright not installed' }, async () => {
    const srv = await serve();
    const base = 'http://127.0.0.1:' + srv.address().port;
    const browser = await chromium.launch();
    try {
      const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      const clients = seedClients();
      await ctx.addInitScript((c) => { if (!localStorage.getItem('trainerhub_clients')) localStorage.setItem('trainerhub_clients', JSON.stringify(c)); }, clients);
      const page = await ctx.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(String(e)));
      await page.goto(base + '/journal.html');
      assert.strictEqual(await page.locator('#list article.card').count(), 2);

      await page.fill('#clientSearch', 'נוע');
      assert.strictEqual(await page.locator('#list article.card').count(), 1);
      assert.match(await page.textContent('#filterStatus'), /1 מתוך 2/);
      await page.fill('#clientSearch', '');
      await page.selectOption('#clientFilter', 'goal:endurance');
      assert.match(await page.locator('#list article.card h2').first().textContent(), /אבי/);
      await page.selectOption('#clientFilter', 'risk');
      assert.strictEqual(await page.locator('#list article.card').count(), 1);
      if (SHOTS) await page.locator('#filterForm').screenshot({ path: path.join(SHOTS, 'journal-filter-' + vp.name + '.png') });
      await page.selectOption('#clientFilter', '');

      await page.selectOption('#insClient', 't_noa');
      const svgs = page.locator('#insBody svg[role="img"]');
      assert.ok(await svgs.count() >= 3, 'heatmap + adherence + progress svg');
      assert.ok(await page.locator('#insBody rect[data-date]').count() >= 70);
      assert.match(await page.textContent('#insBody'), /תעדו סטים/);

      await page.fill('#setExercise', 'squat');
      await page.fill('#setReps', '5');
      await page.fill('#setWeight', '60');
      await page.click('#setForm button[type=submit]');
      assert.match(await page.textContent('#setStatus'), /שיא אישי/);
      await page.fill('#setReps', '3');
      await page.fill('#setWeight', '50');
      await page.click('#setForm button[type=submit]');
      assert.match(await page.textContent('#setStatus'), /נשמר סט/);
      assert.match(await page.textContent('[data-role="prs"]'), /60 ק״ג × 5/);
      assert.match(await page.textContent('[data-role="plan-progress"]'), /1\/2/);
      assert.strictEqual(await svgs.count(), 4, 'volume chart appears');
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      assert.ok(overflow <= 1, 'no horizontal scroll, got ' + overflow);
      if (SHOTS) await page.locator('#insights').screenshot({ path: path.join(SHOTS, 'journal-insights-' + vp.name + '.png') });
      assert.deepStrictEqual(errors, []);
    } finally {
      await browser.close();
      srv.close();
    }
  });
}
