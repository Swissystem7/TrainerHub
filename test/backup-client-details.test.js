const test = require('node:test');
const assert = require('node:assert');

function fakeStorage() {
  const m = new Map();
  return {
    get length() { return m.size; },
    key: (i) => Array.from(m.keys())[i] ?? null,
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    _m: m
  };
}
global.localStorage = fakeStorage();
const TH = require('../js/core.js');

test('client details normalize goal/level/days and keep other fields', () => {
  const c = { id: 't_1', name: 'דנה', phone: '050', plan: 'x', logs: [{ at: 1 }] };
  TH.setClientDetails(c, { goal: 'strength', level: 'nope', days: [3, 1, 1, 9, '5'], nickname: '  דני ' });
  assert.strictEqual(c.goal, 'strength');
  assert.strictEqual(c.level, '');
  assert.deepStrictEqual(c.days, [1, 3, 5]);
  assert.strictEqual(c.nickname, 'דני');
  assert.strictEqual(c.phone, '050');
  assert.strictEqual(c.logs.length, 1);
  assert.match(TH.clientDetailsText(c), /כוח/);
});

test('addMeasurement validates, sorts and replaces same day', () => {
  const c = { name: 'a' };
  assert.strictEqual(TH.addMeasurement(c, { weightKg: '', waistCm: '' }), null);
  TH.addMeasurement(c, { at: '2026-11-03', weightKg: '80,5' });
  TH.addMeasurement(c, { at: '2026-11-01', waistCm: 90 });
  TH.addMeasurement(c, { at: '2026-11-03', weightKg: 80 });
  assert.deepStrictEqual(c.measurements.map((m) => m.at), ['2026-11-01', '2026-11-03']);
  assert.strictEqual(c.measurements[1].weightKg, 80);
  TH.setClientDetails(c, { goal: 'health' });
  assert.strictEqual(c.measurements.length, 2, 'details save must not drop measurements');
});

test('encrypted backup round-trips every trainerhub key and is not plaintext', async () => {
  localStorage._m.clear();
  localStorage.setItem(TH.KEYS.clients, JSON.stringify([{ id: 't_1', name: 'סודי' }]));
  localStorage.setItem(TH.KEYS.saved, '[]');
  localStorage.setItem('trainerhub_pilot', '{"a":1}');
  localStorage.setItem('other_app', 'x');
  const text = await TH.encryptBackup('secret123');
  const file = JSON.parse(text);
  assert.strictEqual(file.format, 'trainerhub-backup');
  assert.strictEqual(file.keys, 3);
  assert.ok(!text.includes('סודי') && !text.includes('t_1'));
  const data = await TH.decryptBackup(text, 'secret123');
  assert.deepStrictEqual(Object.keys(data).sort(), [TH.KEYS.saved, TH.KEYS.clients, 'trainerhub_pilot'].sort());
  localStorage._m.clear();
  localStorage.setItem(TH.KEYS.journal, '["keep"]');
  assert.strictEqual(TH.restoreBackup(Object.assign({ evil: 'x' }, data)), 3);
  assert.strictEqual(localStorage.getItem('evil'), null);
  assert.strictEqual(localStorage.getItem(TH.KEYS.journal), '["keep"]', 'restore must not delete other keys');
  assert.match(localStorage.getItem(TH.KEYS.clients), /סודי/);
});

test('wrong password, short password and foreign files are rejected', async () => {
  const text = await TH.encryptBackup('secret123', { trainerhub_x: '1' });
  await assert.rejects(TH.decryptBackup(text, 'wrong-pass'), /סיסמה שגויה/);
  await assert.rejects(TH.encryptBackup('123'), /6 תווים/);
  await assert.rejects(TH.decryptBackup('{"a":1}', 'secret123'), /אינו גיבוי/);
  await assert.rejects(TH.decryptBackup('not json', 'secret123'), /אינו גיבוי/);
});
