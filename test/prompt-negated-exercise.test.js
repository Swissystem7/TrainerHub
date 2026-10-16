'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Prompt = require('../js/prompt-parser.js');
const { buildSession } = require('../js/session-builder.js');
const catalog = require('../js/catalog.json');

// «אימון רגליים בלי סקוואט» rules a squat out, not the legs. «סקוואט» counts
// as a leg word, so the whole leg group was excluded and the leg session came
// back with five chest clips, reported as satisfied.

function mainMuscles(text) {
  const main = buildSession(text, catalog).workout.phases.find(p => p.name === 'Main');
  return main.exercises.map(x => (catalog[x.id].muscles || [])[0]);
}

test('a muscle the prompt still names is not excluded', function () {
  assert.deepEqual(Prompt.parsePrompt('אימון רגליים בלי סקוואט').excludedMuscles, []);
  assert.deepEqual(Prompt.parsePrompt('אימון בטן בלי פלאנק').excludedMuscles, []);
  assert.deepEqual(Prompt.parsePrompt('אימון גב בלי חתירה').excludedMuscles, []);
  assert.deepEqual(Prompt.parsePrompt('פלג גוף תחתון בלי ישבן').excludedMuscles, []);
});

test('«אימון רגליים בלי סקוואט» is a leg session', function () {
  const req = Prompt.parsePrompt('אימון רגליים בלי סקוואט');
  assert.equal(req.focus, 'legs');
  assert.deepEqual(req.muscles, ['legs']);
  assert.equal(mainMuscles('אימון רגליים בלי סקוואט').every(m => m === 'legs'), true);
  assert.equal(mainMuscles('פלג גוף תחתון בלי ישבן').every(m => m === 'legs'), true);
  assert.equal(mainMuscles('אימון בטן בלי פלאנק').every(m => m === 'core'), true);
  assert.notEqual(mainMuscles('אימון גב בלי חתירה').indexOf('back'), -1);
});

test('unchanged: «בלי רגליים», «פלג גוף עליון בלי ידיים», «אימון ידיים בלי רגליים»', function () {
  assert.deepEqual(Prompt.parsePrompt('אימון בלי רגליים').excludedMuscles, ['legs']);
  assert.deepEqual(Prompt.parsePrompt('פלג גוף עליון בלי ידיים').excludedMuscles, ['biceps', 'triceps']);
  assert.deepEqual(Prompt.parsePrompt('אימון ידיים בלי רגליים').excludedMuscles, ['legs']);
  assert.equal(mainMuscles('אימון בלי רגליים 30 דקות').indexOf('legs'), -1);
});
