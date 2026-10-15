'use strict';

// «אימון גוף עליון» / «פלג גוף תחתון» used to fall through to the full-body
// default: the session came back titled «אימון גוף מלא» and its Main phase
// was crunch variants. The parser now maps a body half to its muscle keys and
// the builder titles and labels it as such.

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const Prompt = require('../js/prompt-parser.js');
const Engine = require('../js/session-builder.js');
const TH = require('../js/core.js');

const CATALOG = require(path.join(__dirname, '..', 'js', 'catalog.json'));
const UPPER = ['chest', 'back', 'shoulders', 'biceps', 'triceps'];

function mainMuscles(result) {
  const main = (result.workout.phases || []).find(ph => ph.name === 'Main') || { exercises: [] };
  return main.exercises.map(ex => (CATALOG[ex.id] && CATALOG[ex.id].muscles) || []);
}

test('parsePrompt: «גוף עליון» is the five upper-body muscles, focus upper', function () {
  const req = Prompt.parsePrompt('אימון גוף עליון 30 דקות בלי ציוד');
  assert.equal(req.focus, 'upper');
  assert.deepEqual(req.muscles, UPPER);
  assert.equal(req.duration, 30);
  assert.deepEqual(req.equipment, ['none']);
});

test('parsePrompt: «פלג גוף תחתון» / «חלק תחתון» / «פלג תחתון» are legs, focus lower', function () {
  ['אימון פלג גוף תחתון 30 דקות', 'אימון לחלק התחתון', 'פלג תחתון 20 דקות'].forEach(function (text) {
    const req = Prompt.parsePrompt(text);
    assert.equal(req.focus, 'lower', text);
    assert.deepEqual(req.muscles, ['legs'], text);
  });
});

test('parsePrompt: a named muscle on top of a body half is added, the half keeps the focus', function () {
  const req = Prompt.parsePrompt('אימון פלג גוף עליון וליבה');
  assert.equal(req.focus, 'upper');
  assert.deepEqual(req.muscles, UPPER.concat(['core']));
});

test('parsePrompt: «פולי עליון» and «גב תחתון» are exercises, not body halves', function () {
  const lat = Prompt.parsePrompt('אימון גב עם פולי עליון');
  assert.equal(lat.focus, 'back');
  assert.deepEqual(lat.muscles, ['back']);
  const lowBack = Prompt.parsePrompt('תרגילים לגב תחתון');
  assert.equal(lowBack.focus, 'back');
  assert.deepEqual(lowBack.muscles, ['back']);
});

test('parsePrompt: «גוף מלא» still wins over everything', function () {
  const req = Prompt.parsePrompt('אימון גוף מלא 45 דקות');
  assert.equal(req.focus, 'full');
  assert.deepEqual(req.muscles, []);
});

test('buildSession: an upper-body prompt is titled as such and every Main exercise works an upper muscle', function () {
  TH.setCatalog(CATALOG);
  const result = Engine.buildSession('אימון גוף עליון 30 דקות בלי ציוד', CATALOG);
  assert.match(result.workout.title, /^אימון פלג גוף עליון/);
  assert.doesNotMatch(result.workout.title, /גוף מלא/);
  const muscles = mainMuscles(result);
  assert.ok(muscles.length >= 3, 'expected a real Main phase, got ' + muscles.length);
  muscles.forEach(function (m, i) {
    assert.ok(m.some(x => UPPER.indexOf(x) !== -1), 'Main #' + (i + 1) + ' works ' + m.join('/') + ' only');
  });
  assert.match(result.explanation.type || '', /פלג גוף עליון/);
});

test('buildSession: a lower-body prompt is titled as such and every Main exercise works legs', function () {
  TH.setCatalog(CATALOG);
  const result = Engine.buildSession('אימון פלג גוף תחתון 30 דקות', CATALOG);
  assert.match(result.workout.title, /^אימון פלג גוף תחתון/);
  const muscles = mainMuscles(result);
  assert.ok(muscles.length >= 3, 'expected a real Main phase, got ' + muscles.length);
  muscles.forEach(function (m, i) {
    assert.ok(m.indexOf('legs') !== -1, 'Main #' + (i + 1) + ' works ' + m.join('/') + ', not legs');
  });
});
