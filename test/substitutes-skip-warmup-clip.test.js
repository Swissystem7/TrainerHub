'use strict';

// TH.substitutesFor feeds «חלופות» on library.html cards, the «החלף» panel in
// workout-mode and the «החלף…» select in weekly.html. The designated warm-up
// clip («חימום», catalog muscle: core, bodyweight, beginner) scored like any
// core alternative - and higher than most, since it is playable - so it was the
// first «חלופה» for 22 of the 78 library cards and a Main exercise could be
// swapped for "warm-up". catalogAsPool / session-builder findWarmup already
// keep that clip out of the Main block; substitutesFor now follows the same rule.

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const TH = require('../js/core.js');

const REAL_CATALOG = require(path.join('..', 'js', 'catalog.json'));

function entry(id, he, muscles, extra) {
  var e = { id: id, he: he, muscles: muscles, equipment: ['none'], level: 'beginner', file: he + '.mp4', source: 'local' };
  Object.keys(extra || {}).forEach(function (k) { e[k] = extra[k]; });
  return e;
}

function fixture() {
  return {
    warmup: entry('warmup', 'חימום', ['core']),
    crunches: entry('crunches', 'בטן', ['core']),
    plank: entry('plank', 'פלאנק', ['core'], { level: 'intermediate' }),
    squat: entry('squat', 'סקוואט', ['legs'])
  };
}

function ids(list) { return list.map(function (e) { return e.id; }); }

test('the warm-up clip is not offered as an alternative to a core exercise', function () {
  TH.setCatalog(fixture());
  // Without the rule «חימום» outscored «פלאנק» (same level as crunches, +1).
  assert.deepEqual(ids(TH.substitutesFor({ id: 'crunches' }, { limit: 3 })), ['plank']);
  // A pasted step with no catalog id resolves by name the same way.
  assert.deepEqual(ids(TH.substitutesFor({ name: 'בטן' }, { limit: 3 })), ['plank']);
  // The equipment-filtered call weekly.html makes.
  assert.deepEqual(ids(TH.substitutesFor({ id: 'crunches' }, { equipment: ['none'], limit: 3 })), ['plank']);
});

test('the warm-up clip itself still gets alternatives, and a warm-up named «חימום» can be swapped for the clip', function () {
  TH.setCatalog(fixture());
  assert.deepEqual(ids(TH.substitutesFor({ id: 'warmup' }, { limit: 5 })), ['crunches', 'plank']);
  // A different entry whose name is «חימום» counts as the warm-up clip too (isWarmupClip rule).
  var cat = fixture();
  delete cat.warmup;
  cat.warm2 = entry('warm2', 'חימום', ['core']);
  TH.setCatalog(cat);
  assert.deepEqual(ids(TH.substitutesFor({ id: 'crunches' }, { limit: 3 })), ['plank']);
  assert.deepEqual(ids(TH.substitutesFor({ id: 'warm2' }, { limit: 3 })), ['crunches', 'plank']);
});

test('real catalog: no library card, workout-mode panel or weekly select lists «חימום» as an alternative', function () {
  TH.setCatalog(REAL_CATALOG);
  var list = TH.filterCatalog({});
  assert.ok(list.length > 50, 'the real catalog loaded');
  var offenders = [];
  list.forEach(function (e) {
    if (e.id === 'warmup') return;
    var lib = TH.substitutesFor({ id: e.id }, { limit: 3 });
    var mode = TH.substitutesFor({ id: e.id, name: e.he }, { limit: 5 });
    var weekly = TH.substitutesFor({ id: e.id }, { equipment: ['none'], limit: 3 });
    if (lib.concat(mode, weekly).some(function (a) { return a.id === 'warmup' || a.he === 'חימום'; })) offenders.push(e.id);
  });
  assert.deepEqual(offenders, []);
  // A core card still has three real core alternatives.
  var alts = TH.substitutesFor({ id: 'crunches' }, { limit: 3 });
  assert.equal(alts.length, 3);
  alts.forEach(function (a) { assert.ok(a.muscles.indexOf('core') !== -1, a.id + ' is core'); });
  // The clip itself keeps its alternatives for the Warm-up phase.
  assert.ok(TH.substitutesFor({ id: 'warmup' }, { limit: 3 }).length === 3);
});
