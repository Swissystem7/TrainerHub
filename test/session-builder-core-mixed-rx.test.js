'use strict';

// The timed-hold prescription (3 × 40 s) belongs to a core-only session. It
// used to key off req.focus, which is just the first muscle named, so
// «אימון בטן ורגליים» gave squats and lunges 40 s holds while
// «אימון רגליים ובטן» gave the same exercises 8-12 reps.

const test = require('node:test');
const assert = require('node:assert/strict');
const Engine = require('../js/session-builder.js');
const Prompt = require('../js/prompt-parser.js');
const Rules = require('../js/rules-with-sources.js');

function entry(id, he, muscles) {
  return { id: id, he: he, muscles: muscles, equipment: ['none'], level: 'beginner', file: he + '.mp4', source: 'local' };
}

const CATALOG = [
  entry('plank', 'פלאנק', ['core']),
  entry('crunch', 'כפיפות בטן', ['core']),
  entry('climber', 'מטפס הרים', ['core']),
  entry('squat', 'סקוואט', ['legs']),
  entry('lunges', 'לאנג׳ים', ['legs']),
  entry('bridge', 'גשר ישבן', ['legs'])
];

function mainOf(text) {
  const built = Engine.buildSession(text, CATALOG);
  return built.workout.phases.filter(function (ph) { return ph.name === 'Main'; })[0].exercises;
}

test('core and legs get the same prescription in either order', function () {
  function squat(text) {
    return mainOf(text).filter(function (ex) { return ex.name === 'סקוואט'; })[0];
  }
  const coreFirst = squat('אימון בטן ורגליים');
  const legsFirst = squat('אימון רגליים ובטן');
  assert.equal(coreFirst.reps, '8-12');
  assert.equal(coreFirst.duration_seconds, null);
  assert.deepEqual(
    [coreFirst.reps, coreFirst.duration_seconds, coreFirst.rest_seconds],
    [legsFirst.reps, legsFirst.duration_seconds, legsFirst.rest_seconds]
  );
  assert.deepEqual(
    mainOf('אימון בטן ורגליים').map(function (ex) { return ex.sets; }),
    mainOf('אימון רגליים ובטן').map(function (ex) { return ex.sets; })
  );
});

test('a core-only session keeps the timed holds', function () {
  const core = mainOf('אימון בטן');
  assert.equal(core[0].reps, null);
  assert.equal(core[0].duration_seconds, 40);
  assert.equal(Engine.prescription(Prompt.parsePrompt('אימון בטן')).duration, 40);
});

test('the rules panel does not call a core-and-legs session «ליבה וייצוב»', function () {
  const goal = Rules.findRule('אימון בטן ורגליים', 'goal');
  assert.doesNotMatch(goal.value, /ליבה/);
  const coreOnly = Rules.findRule('אימון בטן', 'goal');
  assert.match(coreOnly.value, /ליבה/);
});
