'use strict';

// A full-body or unfocused prompt spreads its picks over the catalog's muscle
// groups. Before this, when the request named no muscle every clip scored the
// same and the picks followed catalog order, so «אימון גוף מלא» came out almost
// all core (the real catalog has 25 core clips of 78): 7 of 8 crunches
// variants, and the analyzer flagged its own result «88% ליבה, אין עבודת גב».
// A request that names a muscle still gets that muscle only.

const test = require('node:test');
const assert = require('node:assert/strict');
const Engine = require('../js/session-builder.js');
const TH = require('../js/core.js');

function entry(id, he, muscles) {
  return {
    id: id, he: he, muscles: muscles, equipment: ['none'], level: 'beginner',
    file: he + '.mp4', source: 'local'
  };
}

// Core clips come first, as they do in the real catalog.
const CORE_HEAVY = {
  warmup: entry('warmup', 'חימום', ['core']),
  crunches: entry('crunches', 'בטן', ['core']),
  crunches_pairs: entry('crunches_pairs', 'בטן זוגות', ['core']),
  crunches_set: entry('crunches_set', 'בטן סט', ['core']),
  plank: entry('plank', 'פלאנק', ['core']),
  plank_side: entry('plank_side', 'פלאנק צידי', ['core']),
  mountain_climber: entry('mountain_climber', 'מטפס הרים', ['core']),
  superman: entry('superman', 'גב תחתון', ['back']),
  squat: entry('squat', 'סקוואט', ['legs']),
  lunges: entry('lunges', 'לאנגים', ['legs']),
  pushup: entry('pushup', 'שכיבות שמיכה', ['chest', 'triceps']),
  arm_walk: entry('arm_walk', 'הליכת חיות לחיזוק ידיים', ['biceps', 'triceps']),
  shoulders: entry('shoulders', 'כתפיים וגב', ['shoulders'])
};

function mainGroups(built, catalog) {
  assert.ok(built.workout, built.notice);
  return built.workout.phases[1].exercises.map(function (ex) {
    return catalog[ex.id].muscles[0];
  });
}

function countOf(groups, g) {
  return groups.filter(function (x) { return x === g; }).length;
}

test('a full-body prompt takes one clip of every muscle group before a second core clip', function () {
  TH.setCatalog(CORE_HEAVY);
  const groups = mainGroups(Engine.buildSession('אימון גוף מלא 30 דקות', CORE_HEAVY), CORE_HEAVY);
  assert.equal(groups.length, 6);
  assert.deepEqual(new Set(groups), new Set(['core', 'back', 'legs', 'chest', 'biceps', 'shoulders']));
  assert.equal(countOf(groups, 'core'), 1);
});

test('a longer full-body prompt adds a second round, never a third core clip while others are unused', function () {
  TH.setCatalog(CORE_HEAVY);
  const groups = mainGroups(Engine.buildSession('אימון גוף מלא 45 דקות', CORE_HEAVY), CORE_HEAVY);
  assert.equal(groups.length, 8);
  assert.equal(new Set(groups).size, 6);
  ['core', 'back', 'legs', 'chest', 'biceps', 'shoulders'].forEach(function (g) {
    assert.ok(countOf(groups, g) <= 2, g + ' x' + countOf(groups, g));
  });
});

test('an unfocused prompt («אימון 20 דקות») spreads the same way', function () {
  TH.setCatalog(CORE_HEAVY);
  const groups = mainGroups(Engine.buildSession('אימון 20 דקות', CORE_HEAVY), CORE_HEAVY);
  assert.equal(groups.length, 5);
  assert.equal(new Set(groups).size, 5);
});

test('a prompt that names a muscle still gets that muscle only', function () {
  TH.setCatalog(CORE_HEAVY);
  const groups = mainGroups(Engine.buildSession('אימון בטן 30 דקות', CORE_HEAVY), CORE_HEAVY);
  assert.equal(groups.length, 6);
  assert.deepEqual(new Set(groups), new Set(['core']));
});

test('real catalog: «אימון סבולת גוף מלא 45 דקות» is no longer flagged core-heavy', function () {
  const catalog = require('../js/catalog.json');
  TH.setCatalog(catalog);
  const built = Engine.buildSession('אימון סבולת גוף מלא 45 דקות', catalog);
  assert.ok(built.workout, built.notice);
  const groups = built.workout.phases[1].exercises.map(function (ex) {
    return (catalog[ex.id].muscles || [])[0];
  });
  assert.ok(new Set(groups).size >= 4, groups.join(','));
  const keys = built.analysis.flags.map(function (f) { return f.key; });
  assert.ok(keys.indexOf('core-heavy') === -1 && keys.indexOf('core-heavy-no-back') === -1, keys.join(','));
});
