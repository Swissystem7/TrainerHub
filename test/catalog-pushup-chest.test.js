'use strict';

// The catalog's push-up clips are chest work. They were tagged biceps/triceps
// only, so the real catalog had no clip whose muscles named chest except
// circle games and band drills tagged as full body. «אימון חזה 30 דקות» then
// built «מעגל מעגל», «גומיות התנגדות», «זוגות התנגדות»... with no push-up at
// all, and the analyzer called it mostly core.

const test = require('node:test');
const assert = require('node:assert/strict');
const TH = require('../js/core.js');
const Engine = require('../js/session-builder.js');
const catalog = require('../js/catalog.json');

const PUSHUPS = [
  'אתגר_שכיבות_שמיכה',
  'חימום_שכיבות_שמיכה_קונוסים_על_הגב',
  'שכיבות_שמיכה_ובעיטות',
  'שכיבות_סמיכה_ורגליים'
];

test('push-up clips list chest first and keep triceps', function () {
  PUSHUPS.forEach(function (id) {
    const m = catalog[id].muscles;
    assert.equal(m[0], 'chest', id);
    assert.ok(m.indexOf('triceps') !== -1, id);
    assert.ok(m.indexOf('biceps') === -1, id);
  });
});

test('«אימון חזה 30 דקות» builds push-ups', function () {
  TH.setCatalog(catalog);
  const r = Engine.buildSession('אימון חזה 30 דקות', TH.catalogList());
  const main = r.workout.phases.find(function (ph) { return ph.name === 'Main'; });
  const ids = main.exercises.map(function (ex) { return ex.id; });
  assert.ok(ids.indexOf('אתגר_שכיבות_שמיכה') !== -1, ids.join(', '));
});

test('an arms request still gets its arm clips', function () {
  TH.setCatalog(catalog);
  const r = Engine.buildSession('אימון ידיים 20 דקות', TH.catalogList());
  const main = r.workout.phases.find(function (ph) { return ph.name === 'Main'; });
  assert.ok(main.exercises.length >= 3);
  main.exercises.forEach(function (ex) {
    const m = catalog[ex.id].muscles;
    assert.ok(m.indexOf('biceps') !== -1 || m.indexOf('triceps') !== -1, ex.name);
  });
});
