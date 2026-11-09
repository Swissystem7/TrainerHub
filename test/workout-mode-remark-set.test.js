'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'frontend', 'workout-mode.html'), 'utf8');

function extract(name) {
  const start = html.indexOf('function ' + name + '(');
  assert.ok(start !== -1, name);
  const open = html.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < html.length; i++) {
    if (html[i] === '{') depth++;
    else if (html[i] === '}' && --depth === 0) return html.slice(start, i + 1);
  }
  throw new Error('unbalanced ' + name);
}

test('going back and marking the same set again replaces the logged set', () => {
  const inputs = {
    logReps: { value: '8' },
    logWeight: { value: '10' }
  };
  const steps = [
    { type: 'exercise', exercise: 0, id: 'push_up', name: 'שכיבות סמיכה', set: 1, reps: 8 },
    { type: 'rest', duration: 30 }
  ];
  const src = [
    'let stepIdx = 0, setLog = [];',
    'let completedSets = 0, completedExercises = 0, completedStepIds = new Set();',
    'let skippedSets = 0, skippedStepIds = new Set();',
    'function clearCountdown() {}',
    'function renderStep() {}',
    'function advance() { stepIdx++; }',
    'const document = { getElementById(id) { return inputs[id] || null; } };',
    extract('setExerciseId'),
    extract('recordSet'),
    extract('hasDoneSet'),
    extract('markSetDone'),
    extract('goBack'),
    'markSetDone();',
    'const first = setLog.slice();',
    'goBack();',
    'inputs.logReps.value = "6";',
    'inputs.logWeight.value = "12";',
    'markSetDone();',
    'return { first, log: setLog, sets: completedSets };'
  ].join('\n');
  const out = new Function('steps', 'inputs', src)(steps, inputs);
  assert.equal(out.first.length, 1);
  assert.equal(out.first[0].reps, 8);
  assert.equal(out.log.length, 1, 're-marking must not add a second set');
  assert.equal(out.log[0].reps, 6);
  assert.equal(out.log[0].weightKg, 12);
  assert.equal(out.log[0].exerciseId, 'push_up');
  assert.equal(out.sets, 1);
});
