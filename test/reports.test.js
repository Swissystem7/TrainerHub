const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const TH = require('../js/core.js');

const client = {
  id: 'c1', name: 'דנה', plan: 'כוח A', days: [0, 2, 4],
  logs: [
    { at: '2026-10-04T08:00:00', title: 'כוח A', minutes: 40, rpe: 3 },
    { at: '2026-10-06T08:00:00', title: 'כוח A', minutes: 50, rpe: 4 },
    { at: '2026-09-30T08:00:00', title: 'ישן', minutes: 30, rpe: 2 }
  ],
  measurements: [{ at: '2026-10-02', weightKg: 70 }, { at: '2026-10-28', weightKg: 68.5 }]
};
const entries = [{ clientId: 'c1', doneAt: '2026-10-06T08:00:00', sets: [{ exerciseId: 'squat', weightKg: 60, reps: 5 }, { exerciseId: 'squat', weightKg: 60, reps: 8 }] }];

test('monthlyReportModel: month sessions, adherence, minutes, RPE, weight, bests', () => {
  const m = TH.monthlyReportModel(client, { month: '2026-10', entries, now: '2026-11-05' });
  assert.strictEqual(m.sessions, 2);
  assert.strictEqual(m.minutes, 90);
  assert.strictEqual(m.avgRpe, 3.5);
  assert.strictEqual(m.planned, 13);
  assert.strictEqual(m.adherence, 15);
  assert.strictEqual(m.weightStart, 70);
  assert.strictEqual(m.weightEnd, 68.5);
  assert.deepStrictEqual(m.bests.map((b) => [b.weightKg, b.reps]), [[60, 8]]);
  assert.match(m.title, /אוקטובר 2026/);
});

test('monthlyReportHtml escapes and reuses print classes', () => {
  const m = TH.monthlyReportModel(Object.assign({}, client, { name: '<b>x</b>' }), { month: '2026-10', entries });
  const html = TH.monthlyReportHtml(m);
  assert.match(html, /class="print-sheet"/);
  assert.match(html, /data-role="report-summary"/);
  assert.doesNotMatch(html, /<b>x<\/b>/);
  const empty = TH.monthlyReportHtml(TH.monthlyReportModel({ name: 'א' }, { month: '2026-01' }));
  assert.match(empty, /לא יובאו ביצועים/);
});

test('dueReminders: training day today without a log today', () => {
  const now = new Date(2026, 10, 3, 9); // Tuesday
  const cs = [
    { id: 'a', name: 'א', days: [2], logs: [] },
    { id: 'b', name: 'ב', days: [2], logs: [{ at: new Date(2026, 10, 3, 7).toISOString() }] },
    { id: 'c', name: 'ג', days: [1], logs: [] }
  ];
  assert.deepStrictEqual(TH.dueReminders(cs, now).map((r) => r.id), ['a']);
});

test('runReminders: off / permission / once per day dedupe', () => {
  const mem = {};
  const had = global.localStorage;
  global.localStorage = { getItem: (k) => (k in mem ? mem[k] : null), setItem: (k, v) => { mem[k] = String(v); }, removeItem: (k) => { delete mem[k]; } };
  try {
  const shown = [];
  function N(title) { shown.push(title); }
  N.permission = 'granted';
  const now = new Date(2026, 10, 3, 9);
  const cs = [{ id: 'a', name: 'א', days: [2], logs: [] }];
  TH.setReminderPrefs({ on: false, last: '' });
  assert.strictEqual(TH.runReminders(cs, { Notification: N, now }).reason, 'off');
  TH.setReminderPrefs({ on: true });
  assert.strictEqual(TH.runReminders(cs, { Notification: { permission: 'default' }, now }).reason, 'permission');
  assert.strictEqual(TH.runReminders(cs, { Notification: N, now }).shown, 1);
  assert.strictEqual(TH.runReminders(cs, { Notification: N, now }).reason, 'already');
  assert.strictEqual(shown.length, 1);
  assert.strictEqual(JSON.parse(mem.trainerhub_workout_prefs).remind, true);
  } finally { global.localStorage = had; }
});

test('wiring: existing print key/page and journal, no new storage key', () => {
  const root = path.join(__dirname, '..');
  const j = fs.readFileSync(path.join(root, 'journal.html'), 'utf8');
  assert.match(j, /data-act="report"/);
  assert.match(j, /id="reportMonth"/);
  assert.match(j, /id="remindToggle"/);
  assert.match(fs.readFileSync(path.join(root, 'workout-print.html'), 'utf8'), /monthlyReportHtml/);
  const core = fs.readFileSync(path.join(root, 'js/core.js'), 'utf8');
  assert.doesNotMatch(core, /trainerhub_report|trainerhub_remind/);
});
