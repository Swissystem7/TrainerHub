'use strict';

// weekly.html and workout-mode offer «החלף…» for built program steps such as
// push_up or pike_push_up. Those ids live in PROGRAM_POOL, not the catalog, so
// substitutesFor had no muscles for them and offered the same three core clips
// («מעגל מעגל», «בטן», ...) for every exercise. It now reads the pool entry.

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const TH = require('../js/core.js');

const REAL_CATALOG = require(path.join('..', 'js', 'catalog.json'));

function shares(alts, muscle) {
  return alts.every(function (a) { return a.muscles.indexOf(muscle) !== -1; });
}

test('a built program step gets alternatives for its own muscle group', function () {
  TH.setCatalog(REAL_CATALOG);
  const push = TH.substitutesFor({ id: 'push_up' }, { equipment: ['none'], limit: 3 });
  assert.ok(push.length > 0);
  assert.ok(shares(push, 'chest'), push.map(a => a.he).join(', '));

  const pike = TH.substitutesFor({ id: 'pike_push_up' }, { equipment: ['none'], limit: 3 });
  assert.ok(pike.length > 0);
  assert.ok(shares(pike, 'shoulders'), pike.map(a => a.he).join(', '));

  const squat = TH.substitutesFor({ id: 'bodyweight_squat' }, { equipment: ['none'], limit: 3 });
  assert.ok(shares(squat, 'legs'), squat.map(a => a.he).join(', '));
});

test('a pasted step named like a pool exercise resolves the same way', function () {
  TH.setCatalog(REAL_CATALOG);
  const byName = TH.substitutesFor({ name: 'שכיבות סמיכה' }, { equipment: ['none'], limit: 3 });
  assert.deepEqual(byName.map(a => a.id),
    TH.substitutesFor({ id: 'push_up' }, { equipment: ['none'], limit: 3 }).map(a => a.id));
});
