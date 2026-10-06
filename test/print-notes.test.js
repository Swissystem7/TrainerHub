const test = require('node:test');
const assert = require('node:assert');

const store = {};
global.localStorage = {
  getItem: (k) => (Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; },
  clear: () => { for (const k in store) delete store[k]; }
};

const TH = require('../js/core.js');

test('workoutPrintModel and workoutPrintHtml include notes when present', () => {
  const w = {
    title: 'אימון',
    phases: [{
      name: 'Main',
      exercises: [{
        name: 'פלאנק',
        id: 'plank',
        sets: 3,
        duration_seconds: 40,
        rest_seconds: 30,
        notes: 'גב ישר'
      }]
    }]
  };
  const model = TH.workoutPrintModel(w, {});
  assert.strictEqual(model.phases[0].exercises[0].notes, 'גב ישר');
  const html = TH.workoutPrintHtml(model);
  assert.match(html, /גב ישר/);
});

test('workoutPrintHtml escapes notes through esc', () => {
  const w = {
    title: 'אימון',
    phases: [{
      name: 'Main',
      exercises: [{
        name: 'פלאנק',
        id: 'plank',
        sets: 3,
        duration_seconds: 40,
        rest_seconds: 30,
        notes: '<b>x</b>'
      }]
    }]
  };
  const model = TH.workoutPrintModel(w, {});
  assert.strictEqual(model.phases[0].exercises[0].notes, '<b>x</b>');
  const html = TH.workoutPrintHtml(model);
  assert.ok(html.includes('&lt;b&gt;x&lt;/b&gt;'));
  assert.ok(!html.includes('<b>x</b>'));
});

test('exercise without notes renders exactly as today with no empty note cell', () => {
  const w = {
    title: 'אימון',
    phases: [{
      name: 'Main',
      exercises: [{
        name: 'פלאנק',
        id: 'plank',
        sets: 3,
        duration_seconds: 40,
        rest_seconds: 30
      }]
    }]
  };
  const model = TH.workoutPrintModel(w, {});
  assert.strictEqual(model.phases[0].exercises[0].notes, undefined);
  const html = TH.workoutPrintHtml(model);
  assert.ok(!html.includes('<td></td>'));
  assert.ok(html.includes('<tr><th scope="row">פלאנק</th><td>3 × 40 שנ׳ · מנוחה 30 שנ׳</td></tr>'));
});
