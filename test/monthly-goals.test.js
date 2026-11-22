const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const mem = {};
global.localStorage = {
  getItem: (k) => (k in mem ? mem[k] : null),
  setItem: (k, v) => {
    if (k === 'fail') throw new Error('storage error');
    mem[k] = String(v);
  },
  removeItem: (k) => {
    delete mem[k];
  },
  get length() {
    return Object.keys(mem).length;
  },
  key: (i) => Object.keys(mem)[i] ?? null
};

const MG = require('../js/monthly-goals.js');

test('computeMonthlyGoalProgress calculates 50% correctly', () => {
  const res = MG.computeMonthlyGoalProgress({ target: 10 }, 5);
  assert.strictEqual(res.percent, 50);
  assert.strictEqual(res.current, 5);
  assert.strictEqual(res.target, 10);
  assert.strictEqual(res.remaining, 5);
  assert.strictEqual(res.completed, false);
});

test('computeMonthlyGoalProgress caps completion at 100% and handles zero/negative', () => {
  const res1 = MG.computeMonthlyGoalProgress({ target: 5 }, 12);
  assert.strictEqual(res1.percent, 100);
  assert.strictEqual(res1.completed, true);
  assert.strictEqual(res1.remaining, 0);

  const res2 = MG.computeMonthlyGoalProgress({ target: 0 }, -2);
  assert.strictEqual(res2.percent, 0);
  assert.strictEqual(res2.completed, true);
});

test('saveMonthlyGoal handles storage exceptions gracefully', () => {
  const ok = MG.saveMonthlyGoal(
    { target: 20 },
    {
      setItem: () => {
        throw new Error('fail');
      }
    }
  );
  assert.strictEqual(ok, false);

  const ok2 = MG.saveMonthlyGoal({ target: 20 }, global.localStorage);
  assert.strictEqual(ok2, true);
  const loaded = MG.loadMonthlyGoal(global.localStorage);
  assert.strictEqual(loaded.target, 20);
});

test('journal.html contains monthlyGoalPanel and proper labels', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'journal.html'), 'utf8');
  assert.ok(html.includes('id="monthlyGoalPanel"'), 'monthlyGoalPanel in journal.html');
  assert.ok(html.includes('for="monthlyGoalInput"'), 'label for monthlyGoalInput');
});

test('weekly.html contains weeklyMonthlyGoalStatus element', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'weekly.html'), 'utf8');
  assert.ok(html.includes('id="weeklyMonthlyGoalStatus"'), 'weeklyMonthlyGoalStatus in weekly.html');
});
