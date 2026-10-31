'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const mem = {};
global.localStorage = {
  getItem: function (k) { return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null; },
  setItem: function (k, v) { mem[k] = String(v); },
  removeItem: function (k) { delete mem[k]; }
};

const TH = require('../js/core.js');
TH.setCatalog(require('../js/catalog.json'));
const Ingest = require('../js/ingest.js');

function phases(text) {
  const out = {};
  Ingest.ingestText(text, TH.catalog).workout.phases.forEach(function (ph) {
    out[ph.name] = ph.exercises.map(function (ex) { return ex.name; });
  });
  return out;
}

test('«חימום:» / «עיקרי:» / «שחרור:» headers put their exercises in those phases', () => {
  // Was all in Main: the warm-up ran as the workout's first exercises and the analysis said «חסר חימום».
  assert.deepStrictEqual(phases('חימום:\nריצה קלה 5 דקות\nעיקרי:\nסקוואט 3x10\nחתירה 3x10\nשחרור:\nמתיחת ירך אחורית 30 שניות'), {
    'Warm-up': ['ריצה קלה'],
    Main: ['סקוואט', 'חתירה'],
    'Cool-down': ['מתיחת ירך אחורית']
  });
  const w = Ingest.ingestText('חימום: ריצה קלה 5 דקות\nעיקרי:\nסקוואט 3x10\nחתירה 3x10', TH.catalog).workout;
  assert.deepStrictEqual(w.phases[0].exercises.map((e) => e.name), ['ריצה קלה']);
  assert.ok(!w.analysis.flags.some((f) => f.key === 'no-warmup'));
});

test('a warm-up with no header after it ends at a blank line or at the first multi-set exercise', () => {
  assert.deepStrictEqual(phases('חימום:\nריצה קלה 5 דקות\nסיבובי ידיים 1 דקה\n\nסקוואט 10\nחתירה 10'), {
    'Warm-up': ['ריצה קלה', 'סיבובי ידיים'],
    Main: ['סקוואט', 'חתירה'],
    'Cool-down': []
  });
  assert.deepStrictEqual(phases('חימום:\nריצה קלה 5 דקות\nסקוואט 3x10'), {
    'Warm-up': ['ריצה קלה'],
    Main: ['סקוואט'],
    'Cool-down': []
  });
});

test('a paste that is only a warm-up or has no headers stays in Main', () => {
  assert.deepStrictEqual(phases('חימום:\nריצה קלה 5 דקות\nסיבובי ידיים 1 דקה').Main, ['ריצה קלה', 'סיבובי ידיים']);
  assert.deepStrictEqual(phases('סקוואט 3x10\n\nחתירה 3x10'), { 'Warm-up': [], Main: ['סקוואט', 'חתירה'], 'Cool-down': [] });
});
