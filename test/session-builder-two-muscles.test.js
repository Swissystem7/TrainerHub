'use strict';

// A request that names two muscles scored a clip once per muscle it listed.
// The catalog's full-body clips list chest, back, legs and core, so on
// «אימון רגליים וגב» each of them matched twice (24) and beat every clip built
// for legs or for back (12 + the name hint): the session was «מעגל מעגל»,
// «בישיבה אחד נגד השני», «גומיות התנגדות»... with no legs or back exercise,
// and the analyzer flagged it «אין תרגילי משיכה», «אין עבודת שרשרת אחורית».

const test = require('node:test');
const assert = require('node:assert/strict');
const TH = require('../js/core.js');
const Engine = require('../js/session-builder.js');
const catalog = require('../js/catalog.json');

TH.setCatalog(catalog);

function mainOf(text) {
  const built = Engine.buildSession(text, catalog);
  assert.ok(built.workout, text + ' builds a workout');
  return built.workout.phases[1].exercises.map(function (ex) { return catalog[ex.id]; });
}

function mainMuscles(entries) {
  return entries.map(function (e) { return e.muscles[0]; });
}

test('«אימון רגליים וגב» has legs clips and back clips, not only full-body ones', function () {
  const picked = mainOf('אימון רגליים וגב');
  const main = mainMuscles(picked);
  assert.ok(main.includes('legs'), main.join());
  assert.ok(main.includes('back'), main.join());
  const fullBody = picked.filter(function (e) { return e.muscles.length >= 4; });
  assert.equal(fullBody.length, 0, fullBody.map(function (e) { return e.id; }).join());
});

test('«אימון רגליים וגב» is not flagged for missing pull or posterior-chain work', function () {
  const built = Engine.buildSession('אימון רגליים וגב', catalog);
  const keys = built.analysis.flags.map(function (f) { return f.key; });
  assert.ok(!keys.includes('no-pull'), keys.join());
  assert.ok(!keys.includes('no-posterior'), keys.join());
});

test('«אימון חזה וגב» takes chest clips and back clips', function () {
  const main = mainMuscles(mainOf('אימון חזה וגב'));
  assert.ok(main.includes('chest'), main.join());
  assert.ok(main.includes('back'), main.join());
});

test('a one-muscle request keeps its score order', function () {
  const P = require('../js/prompt-parser.js');
  const req = P.parsePrompt('אימון רגליים');
  const legs = catalog['גומיות_רגליים'];
  const fullBody = catalog['מעגל_מעגל'];
  assert.equal(Engine.scoreEntry(legs, req) - Engine.scoreEntry(fullBody, req), 6);
});
