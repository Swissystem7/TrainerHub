'use strict';

// When the picked exercises did not fit the Main phase at the full
// prescription, fitSets took a set off every one of them. «אימון 30 דקות»
// picked 6 exercises for a 25-minute Main phase; 3 sets of each needed 27
// minutes, so all 6 fell to 2 sets and the trainer got 18 minutes of work
// («אימון 40 דקות»: 24 of 35). Now the sets that fit are handed out in order:
// the first exercises keep 3 sets, only the last ones get 2.
// Runs against the real catalog, as the browser does.

const test = require('node:test');
const assert = require('node:assert/strict');
const TH = require('../js/core.js');
const Engine = require('../js/session-builder.js');
const catalog = require('../js/catalog.json');
const RULES = require('../js/rules-with-sources.js');

function mainOf(result) {
  return result.workout.phases.filter(function (p) { return p.name === 'Main'; })[0];
}

// Same count as exerciseSeconds in the engine: every set plus its rest, ~3 s a rep.
function mainSeconds(main) {
  return main.exercises.reduce(function (sum, ex) {
    var m = String(ex.reps || '').match(/(\d+)(?:-(\d+))?/);
    var work = ex.duration_seconds || (m ? (Number(m[1]) + Number(m[2] || m[1])) / 2 * 3 : 30);
    return sum + ex.sets * (work + (ex.rest_seconds || 0));
  }, 0);
}

function setsOf(main) {
  return main.exercises.map(function (ex) { return ex.sets; });
}

[
  ['אימון 30 דקות', 6, 23.5],
  ['אימון 40 דקות', 8, 34],
  ['אימון רגליים 30 דקות', 6, 23.5],
  ['אימון סיבולת 30 דקות', 6, 23.5]
].forEach(function (row) {
  test('«' + row[0] + '» keeps its ' + row[1] + ' exercises and fills at least ' + row[2] + ' minutes of its Main phase', function () {
    TH.setCatalog(catalog);
    const main = mainOf(Engine.buildSession(row[0], catalog));
    assert.equal(main.exercises.length, row[1]);
    const sets = setsOf(main);
    assert.equal(sets[0], 3, sets.join(','));
    sets.forEach(function (s, i) { assert.ok(s === 3 || s === 2, sets.join(',')); if (i) assert.ok(s <= sets[i - 1], sets.join(',')); });
    const secs = mainSeconds(main);
    assert.ok(secs <= main.duration_minutes * 60, (secs / 60) + ' min in a ' + main.duration_minutes + '-minute Main');
    assert.ok(secs >= row[2] * 60, (secs / 60) + ' min of work in a ' + main.duration_minutes + '-minute Main');
  });
});

test('the rules panel says how many exercises got a set less', function () {
  TH.setCatalog(catalog);
  const built = Engine.buildSession('אימון 30 דקות', catalog);
  const fewer = setsOf(mainOf(built)).filter(function (s) { return s === 2; }).length;
  assert.equal(RULES.findRule(built, 'prescription').value,
    '3 סטים × 8-12 חזרות · 60 שנ׳ מנוחה בין סטים — ב-' + fewer + ' מתוך 6 התרגילים 2 סטים, כדי שייכנס בזמן');
});

test('a phase that fits the prescription is unchanged («אימון 45 דקות»)', function () {
  TH.setCatalog(catalog);
  const main = mainOf(Engine.buildSession('אימון 45 דקות', catalog));
  setsOf(main).forEach(function (s) { assert.equal(s, 3); });
});
