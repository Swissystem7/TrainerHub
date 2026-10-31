'use strict';

// A prompt longer than 45 minutes gets enough exercises for its minutes.
// wantedCount stopped at 10 exercises, so «אימון שעה וחצי» put about 45
// minutes of work into an 85-minute Main phase and «אימון כוח 90 דקות» ran 48.

const test = require('node:test');
const assert = require('node:assert/strict');
const Engine = require('../js/session-builder.js');
const catalog = require('../js/catalog.json');

function mainOf(result) {
  return result.workout.phases.filter(function (p) { return p.name === 'Main'; })[0];
}

function repMid(reps) {
  var m = String(reps == null ? '' : reps).match(/(\d+)(?:\s*-\s*(\d+))?/);
  if (!m) return 0;
  return (Number(m[1]) + Number(m[2] || m[1])) / 2;
}

// The same count workout mode runs: every set and its rest, ~3 s per rep.
function mainMinutesOfWork(result) {
  return mainOf(result).exercises.reduce(function (sum, ex) {
    var work = Number(ex.duration_seconds) || repMid(ex.reps) * 3 || 30;
    return sum + (Number(ex.sets) || 1) * (work + (Number(ex.rest_seconds) || 0));
  }, 0) / 60;
}

[
  ['אימון שעה וחצי', 85],
  ['אימון כוח 90 דקות', 85],
  ['אימון שעה', 55]
].forEach(function (row) {
  test(row[0] + ' fills most of its ' + row[1] + '-minute Main phase', function () {
    const built = Engine.buildSession(row[0], catalog);
    assert.equal(mainOf(built).duration_minutes, row[1]);
    const minutes = mainMinutesOfWork(built);
    assert.ok(minutes >= row[1] * 0.85, row[0] + ': ' + minutes.toFixed(1) + ' minutes of ' + row[1]);
    assert.ok(minutes <= row[1], row[0] + ': ' + minutes.toFixed(1) + ' minutes of ' + row[1]);
  });
});

test('sessions up to 45 minutes keep their exercise count', function () {
  assert.equal(mainOf(Engine.buildSession('אימון 45 דקות', catalog)).exercises.length, 8);
  assert.equal(mainOf(Engine.buildSession('אימון 30 דקות', catalog)).exercises.length, 6);
  assert.equal(mainOf(Engine.buildSession('אימון 50 דקות', catalog)).exercises.length, 10);
});
