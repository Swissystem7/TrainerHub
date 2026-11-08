const test = require('node:test');
const assert = require('node:assert');
const mem = {};
global.localStorage = {
  getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: (k) => { delete mem[k]; },
  get length() { return Object.keys(mem).length; }, key: (i) => Object.keys(mem)[i] ?? null
};
const TH = require('../js/core.js');
const J = require('../js/journal-storage.js');
const fs = require('node:fs');
const path = require('node:path');

const NOW = new Date(2026, 10, 5, 12); // Thu 5 Nov 2026
const at = (d) => new Date(2026, 10, d, 9).toISOString();

test('heatmapWeeks: 12 Sunday-start weeks, counts per local day, future flagged', () => {
  const w = J.heatmapWeeks([{ at: at(5) }, { at: at(5) }, { at: at(2) }, { at: 'bad' }], 12, NOW);
  assert.strictEqual(w.length, 12);
  const last = w[11];
  assert.strictEqual(last.start, '2026-11-01');
  assert.strictEqual(last.days[4].count, 2);
  assert.strictEqual(last.days[1].count, 1);
  assert.ok(last.days[5].future && !last.days[4].future);
});

test('weeklyAdherence uses target days and caps at 100%', () => {
  const a = J.weeklyAdherence([{ at: at(1) }, { at: at(2) }, { at: at(3) }, { at: at(4) }], 2, 2, NOW);
  assert.deepStrictEqual(a.map((x) => x.pct), [0, 100]);
  assert.strictEqual(J.weeklyAdherence([{ at: at(2) }], 1, 0, NOW)[0].target, 3);
});

test('SVG builders are dependency-free, accessible and escape labels', () => {
  const bar = J.barChartSvg([{ label: '<x>', value: 5 }, { label: 'b', value: 10 }], { label: 'נפח "א"' });
  assert.match(bar, /^<svg role="img"/);
  assert.ok(!bar.includes('<x>') && bar.includes('&lt;x&gt;') && bar.includes('&quot;'));
  assert.strictEqual((bar.match(/<rect/g) || []).length, 2);
  assert.match(J.barChartSvg([], { label: 'x' }), /אין עדיין נתונים/);
  assert.match(J.lineChartSvg([{ label: 'a', value: 80 }], { label: 'x' }), /2 מדידות/);
  assert.match(J.lineChartSvg([{ label: 'a', value: 80 }, { label: 'b', value: 79 }], { label: 'x' }), /<path d="M/);
  const heat = J.heatmapSvg(J.heatmapWeeks([{ at: at(4) }], 2, NOW));
  assert.match(heat, /data-date="2026-11-04"/);
  assert.ok(!heat.includes('2026-11-06'), 'future days are not drawn');
});

test('per-client PRs and volume, other clients and old entries untouched', () => {
  J.clearJournal();
  J.saveEntry({ title: 'legacy', sets: [{ exerciseId: 'squat', reps: 5, weightKg: 200 }] });
  J.saveEntry({ clientId: 't_a', doneAt: at(3), sets: [{ exerciseId: 'squat', reps: 5, weightKg: 60 }] });
  J.saveEntry({ clientId: 't_a', doneAt: at(4), sets: [{ exerciseId: 'squat', reps: 3, weightKg: 70 }, { exerciseId: 'row', reps: 10, weightKg: 30 }] });
  J.saveEntry({ clientId: 't_b', doneAt: at(4), sets: [{ exerciseId: 'squat', reps: 1, weightKg: 100 }] });
  const a = J.getClientSnapshot('t_a');
  assert.strictEqual(a.entries.length, 2);
  assert.strictEqual(a.personalRecords.squat.weightKg, 70);
  assert.deepStrictEqual(a.progressGraph.map((p) => p.volume), [300, 510]);
  assert.strictEqual(J.getPersonalRecords().squat.weightKg, 200, 'global PRs keep legacy behaviour');
  assert.deepStrictEqual(J.getClientSnapshot('').entries, []);
});

test('journal.html wires the existing modules after core.js and has search/filter/insights', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'journal.html'), 'utf8');
  const i = (s) => html.indexOf(s);
  assert.ok(i('./js/core.js') < i('./js/session-tracker.js') && i('./js/session-tracker.js') < i('./js/journal-storage.js'));
  for (const id of ['clientSearch', 'clientFilter', 'insights', 'insClient', 'setForm']) assert.ok(html.includes('id="' + id + '"'), id);
  assert.ok(!/<script[^>]+(chart|d3|cdn)/i.test(html), 'no chart libraries');
  const sw = path.join(__dirname, '..', 'sw.js');
  if (fs.existsSync(sw)) {
    const src = fs.readFileSync(sw, 'utf8');
    assert.ok(src.includes('./js/journal-storage.js') && src.includes('./js/session-tracker.js'));
  }
});
