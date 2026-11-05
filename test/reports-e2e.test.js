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


const now = new Date();
const ym = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
const day = (d) => ym + '-' + String(d).padStart(2, '0') + 'T08:00:00';
const CLIENTS = [{ id: 'c1', name: 'דנה', plan: 'כוח A', days: [now.getDay()], logs: [
  { at: day(1), title: 'כוח A', minutes: 40, rpe: 3 }, { at: day(2), title: 'כוח B', minutes: 45, rpe: 4 }],
  measurements: [{ at: ym + '-01', weightKg: 70 }, { at: ym + '-02', weightKg: 69 }] }];

for (const vp of [{ name: 'desktop', width: 1280, height: 900 }, { name: '360', width: 360, height: 780 }]) {
  test('journal monthly report + local reminders @' + vp.name, { skip: !chromium && 'playwright not installed' }, async () => {
    const srv = await serve();
    const base = 'http://127.0.0.1:' + srv.address().port;
    const browser = await chromium.launch();
    try {
      const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      await ctx.addInitScript((clients) => {
        if (!sessionStorage.getItem('seeded')) { localStorage.setItem('trainerhub_clients', JSON.stringify(clients)); sessionStorage.setItem('seeded', '1'); }
        window.__notes = [];
        function N(t, o) { window.__notes.push([t, o && o.body]); }
        N.permission = 'default';
        N.requestPermission = () => { N.permission = 'granted'; return Promise.resolve('granted'); };
        window.Notification = N;
      }, CLIENTS);
      const page = await ctx.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(String(e)));
      await page.goto(base + '/journal.html');
      assert.strictEqual(await page.inputValue('#reportMonth'), ym);
      await page.click('#remindToggle');
      await page.waitForFunction(() => window.__notes.length === 1);
      assert.match(await page.textContent('#remindStatus'), /נשלחו 1/);
      assert.strictEqual(await page.getAttribute('#remindToggle', 'aria-pressed'), 'true');
      if (SHOTS) await page.locator('#filterForm').screenshot({ path: path.join(SHOTS, 'reminders-' + vp.name + '.png') });
      await page.click('[data-act="report"][data-i="0"]');
      await page.waitForSelector('[data-kind="monthly"]');
      const txt = await page.textContent('#sheet');
      assert.match(txt, /דוח חודשי/);
      assert.match(txt, /דנה/);
      assert.match(txt, /70 → 69/);
      assert.match(txt, /כוח B/);
      const w = await page.evaluate(() => document.documentElement.scrollWidth);
      assert.ok(w <= vp.width + 1, 'no horizontal scroll: ' + w);
      if (SHOTS) await page.locator('#sheet').screenshot({ path: path.join(SHOTS, 'report-month-' + vp.name + '.png') });
      assert.deepStrictEqual(errors, []);
    } finally { await browser.close(); srv.close(); }
  });
}
