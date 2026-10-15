'use strict';

// Regression for the prompt engine's "closest thing" contract in js/session-builder.js.
// index.html shows only built.notice, so whenever closest is true there must be a notice,
// and whenever a notice is shown satisfied must be false.

const test = require('node:test');
const assert = require('node:assert/strict');
const Engine = require('../js/session-builder.js');
const TH = require('../js/core.js');

const FIXTURE = {
  warmup: { id: 'warmup', he: 'חימום', muscles: ['core'], equipment: ['none'], level: 'beginner', file: 'חימום.mp4', source: 'local' },
  ball_control: { id: 'ball_control', he: 'שליטה בכדור', muscles: ['legs'], equipment: ['ball'], level: 'beginner', file: 'a.mp4', source: 'local' },
  ball_pairs: { id: 'ball_pairs', he: 'שליטה בכדור זוגות', muscles: ['legs'], equipment: ['ball'], level: 'beginner', file: 'b.mp4', source: 'local' },
  plank: { id: 'plank', he: 'פלאנק', muscles: ['core'], equipment: ['none'], level: 'beginner', file: 'c.mp4', source: 'local' },
  pushup: { id: 'pushup', he: 'שכיבות שמיכה', muscles: ['chest'], equipment: ['none'], level: 'beginner', file: 'd.mp4', source: 'local' },
  pushup2: { id: 'pushup2', he: 'שכיבות שמיכה רחב', muscles: ['chest'], equipment: ['none'], level: 'beginner', file: 'e.mp4', source: 'local' },
  pushup3: { id: 'pushup3', he: 'שכיבות שמיכה צר', muscles: ['chest'], equipment: ['none'], level: 'beginner', file: 'f.mp4', source: 'local' }
};

test('two matching clips for a 45-minute request: closest comes with a notice naming the count', function () {
  TH.setCatalog(FIXTURE);
  const built = Engine.buildSession('אימון רגליים 45 דקות ל-12 ילדים עם כדורים', FIXTURE);
  assert.ok(built.workout);
  assert.equal(built.workout.phases[1].exercises.length, 2);
  assert.equal(built.satisfied, false);
  assert.equal(built.closest, true);
  assert.ok(built.notice, 'closest:true must carry a notice for index.html');
  assert.match(built.notice, /אין במאגר מספיק סרטונים/);
  assert.match(built.notice, /2 תרגילים/);
  assert.match(built.notice, /רגליים/);
});

test('only the level was relaxed: notice and satisfied agree', function () {
  TH.setCatalog(FIXTURE);
  const built = Engine.buildSession('אימון חזה 20 דקות מתקדמים', FIXTURE);
  assert.ok(built.workout);
  assert.ok(built.notice);
  assert.match(built.notice, /רמת מתקדם/);
  assert.equal(built.satisfied, false, 'a notice saying the library lacks clips cannot sit next to satisfied:true');
  assert.equal(built.closest, true);
});

test('enough matching clips, nothing relaxed: satisfied and no notice', function () {
  TH.setCatalog(FIXTURE);
  const built = Engine.buildSession('אימון חזה 20 דקות', FIXTURE);
  assert.ok(built.workout);
  assert.equal(built.workout.phases[1].exercises.length, 3);
  assert.equal(built.satisfied, true);
  assert.equal(built.closest, false);
  assert.equal(built.notice, null);
});
