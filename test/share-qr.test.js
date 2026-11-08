const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const TH = require('../js/core.js');
let jsQR = null;
try { jsQR = require('jsqr'); } catch (e) { jsQR = null; }

const BASE = { title: 'כוח A', doneAt: '2026-11-05T09:00:00.000Z', minutes: 40, rpe: 7, name: 'נועה' };

test('TH1 code carries optional per-exercise sets/weight/RPE and round-trips', () => {
  const log = [{ id: 'squat', sets: [{ reps: 8, weightKg: 40 }, { reps: 10, weightKg: 42.5 }], rpe: 8 }, { id: 'row', sets: [{ reps: 12, weightKg: 30 }], rpe: null }];
  const code = TH.encodeResult(Object.assign({}, BASE, { log }));
  assert.match(code, /^TH1\./);
  const back = TH.decodeResult(code);
  assert.strictEqual(back.title, 'כוח A');
  assert.deepStrictEqual(back.log.map((e) => [e.id, e.sets.map((s) => [s.reps, s.weightKg]), e.rpe]),
    [['squat', [[8, 40], [10, 42.5]], 8], ['row', [[12, 30]], null]]);
});

test('old TH1 codes without exercise detail still decode (log is empty)', () => {
  const old = TH.encodeResult(BASE);
  const payload = JSON.parse(Buffer.from(old.slice(4).replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
  assert.strictEqual(payload.x, undefined, 'no x field when there is no log');
  const back = TH.decodeResult(old);
  assert.ok(back);
  assert.strictEqual(back.minutes, 40);
  assert.deepStrictEqual(back.log, []);
});

test('bad exercise detail is clamped or dropped, never throws', () => {
  const code = TH.encodeResult(Object.assign({}, BASE, { log: [{ id: 'x', sets: [{ reps: -3, weightKg: 'abc' }], rpe: 99 }, { id: '', sets: [] }, null] }));
  const back = TH.decodeResult(code);
  assert.ok(back);
  back.log.forEach((e) => { assert.ok(e.rpe == null || (e.rpe >= 1 && e.rpe <= 10)); e.sets.forEach((s) => { assert.ok(!(s.reps < 0)); }); });
});

test('qrMatrix: sizes, finder patterns, too-long text → null', () => {
  const m = TH.qrMatrix('https://example.github.io/TrainerHub/#w=abc');
  assert.ok(m);
  assert.strictEqual(m.size, m.version * 4 + 17);
  assert.strictEqual(m.modules.length, m.size);
  for (let i = 0; i < 7; i++) { assert.strictEqual(m.modules[0][i], true); assert.strictEqual(m.modules[6][i], true); }
  assert.strictEqual(TH.qrMatrix('x'.repeat(4000)), null);
  assert.strictEqual(TH.shareQrMarkup('x'.repeat(4000)), '');
});

test('qrMatrix decodes back to the share URL (jsQR)', { skip: !jsQR && 'jsqr not installed' }, () => {
  const url = 'https://aviran.github.io/TrainerHub/client.html#w=' + 'Ab9_-'.repeat(60);
  const m = TH.qrMatrix(url);
  const px = 4, q = 4, n = (m.size + q * 2) * px;
  const data = new Uint8ClampedArray(n * n * 4).fill(255);
  for (let y = 0; y < m.size; y++) for (let x = 0; x < m.size; x++) if (m.modules[y][x]) {
    for (let dy = 0; dy < px; dy++) for (let dx = 0; dx < px; dx++) {
      const o = (((y + q) * px + dy) * n + (x + q) * px + dx) * 4; data[o] = data[o + 1] = data[o + 2] = 0;
    }
  }
  const r = jsQR(data, n, n);
  assert.ok(r, 'decodable');
  assert.strictEqual(r.data, url);
});

test('qrSvg / shareQrMarkup are accessible inline SVG with no external service', () => {
  const svg = TH.qrSvg('https://a.b/#w=1', { label: 'קוד QR' });
  assert.match(svg, /^<svg[^>]*role="img"/);
  assert.match(svg, /aria-label="קוד QR"/);
  const fig = TH.shareQrMarkup('https://a.b/#w=1');
  assert.match(fig, /data-role="share-qr"/);
  const core = fs.readFileSync(path.join(ROOT, 'js/core.js'), 'utf8');
  assert.doesNotMatch(core, /qrserver|chart\.googleapis|quickchart|goqr/i);
});

test('share pages wire the QR and workout mode sends the per-exercise log', () => {
  const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
  assert.match(read('index.html'), /TH\.shareQrMarkup\(shared\.url\)/);
  assert.match(read('journal.html'), /showShareQr\(/);
  const wm = read('frontend/workout-mode.html');
  assert.match(wm, /id="exRpeBox"/);
  assert.match(wm, /exerciseLogForReport/);
});

test('sw.js (when present) precaches js/core.js, which holds the QR encoder', { skip: !fs.existsSync(path.join(ROOT, 'sw.js')) && 'sw.js lives on feat/pwa (#551)' }, () => {
  assert.match(fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8'), /['"]\.\/js\/core\.js['"]/);
});
