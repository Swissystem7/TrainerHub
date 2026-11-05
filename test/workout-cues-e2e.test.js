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

function stubs() {
  window.__cues = { vibrate: [], beeps: 0, spoken: [] };
  navigator.vibrate = (p) => { window.__cues.vibrate.push(p); return true; };
  function AC() { this.state = 'running'; this.currentTime = 0; this.destination = {}; }
  AC.prototype.resume = function () { return Promise.resolve(); };
  AC.prototype.createOscillator = function () { return { frequency: {}, connect() {}, start() { window.__cues.beeps++; }, stop() {} }; };
  AC.prototype.createGain = function () { return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }; };
  window.AudioContext = AC; window.webkitAudioContext = AC;
  window.SpeechSynthesisUtterance = function (t) { this.text = t; };
  Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: { getVoices: () => [{ lang: 'he-IL', name: 'he' }], cancel() {}, speak: (u) => window.__cues.spoken.push(u.text) } });
}

for (const vp of [{ name: 'desktop', width: 1280, height: 900 }, { name: '360', width: 360, height: 780 }]) {
  test('workout mode: per-set log, rest-end cue, Hebrew TTS toggle, offline @' + vp.name, { skip: !chromium && 'playwright not installed' }, async () => {
    const srv = await serve();
    const base = 'http://127.0.0.1:' + srv.address().port;
    const browser = await chromium.launch();
    try {
      const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      await ctx.addInitScript(stubs);
      await ctx.addInitScript((w) => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('trainerhub_active_workout', JSON.stringify(w)); } }, WORKOUT);
      const page = await ctx.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(String(e)));
      await page.goto(base + '/frontend/workout-mode.html');
      await ctx.setOffline(true); // everything below must work with no network
      assert.strictEqual(await page.getAttribute('#btnTts', 'aria-pressed'), 'true');
      await page.click('#btnStartPause');
      await page.waitForSelector('#logReps');
      await page.fill('#logReps', '8');
      await page.fill('#logWeight', '40');
      if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'workout-sets-log-' + vp.name + '.png') });
      await page.click('#btnDone');
      await page.waitForFunction(() => window.__cues.spoken.length > 0);
      const said = await page.evaluate(() => window.__cues.spoken[0]);
      assert.match(said, /מנוחה 2 שניות\. הבא: סקוואט/);
      if (SHOTS) await page.screenshot({ path: path.join(SHOTS, 'workout-sets-rest-' + vp.name + '.png') });
      await page.waitForSelector('#logWeight', { timeout: 6000 });
      const cues = await page.evaluate(() => window.__cues);
      assert.deepStrictEqual(cues.vibrate[0], [200, 100, 200]);
      assert.ok(cues.beeps >= 2, 'double beep');
      assert.strictEqual(await page.inputValue('#logWeight'), '40', 'last weight is prefilled');

      await page.click('#btnTts');
      assert.strictEqual(await page.getAttribute('#btnTts', 'aria-pressed'), 'false');
      assert.strictEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('trainerhub_workout_prefs')).tts), false);
      await page.fill('#logReps', '10');
      await page.fill('#logWeight', '42.5');
      await page.click('#btnDone');
      await page.waitForSelector('#logReps', { timeout: 6000 });
      assert.strictEqual(await page.evaluate(() => window.__cues.spoken.length), 1, 'TTS off stays silent');
      await page.fill('#logWeight', '30');
      await page.click('#btnDone');
      await page.waitForFunction(() => document.getElementById('setsSaved').textContent.trim().length > 0, null, { timeout: 6000 });
      assert.match(await page.textContent('#setsSaved'), /3/);
      const journal = await page.evaluate(() => JSON.parse(localStorage.getItem('trainerhub_journal_entries')));
      assert.strictEqual(journal.entries.length, 1);
      const sets = journal.entries[0].sets.map((e) => [e.exerciseId, e.reps, e.weightKg]);
      assert.deepStrictEqual(sets, [['squat', 8, 40], ['squat', 10, 42.5], ['row', 12, 30]]);
      if (SHOTS) await page.locator('#completionScreen').screenshot({ path: path.join(SHOTS, 'workout-sets-done-' + vp.name + '.png') });
      assert.deepStrictEqual(errors, []);
    } finally { await browser.close(); srv.close(); }
  });
}
