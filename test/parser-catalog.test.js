'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const TH = require('../js/core.js');
const { parseWorkoutClient } = require('../frontend/parse-workout.js');

TH.setCatalog({
  plank: { id: 'plank', he: 'פלאנק', muscles: ['core'], equipment: ['none'], level: 'beginner', file: 'פלאנק.mp4' },
  mountain_climber: { id: 'mountain_climber', he: 'מטפס הרים', muscles: ['core'], equipment: ['none'], level: 'beginner', file: 'מטפס הרים.mp4' },
  warmup: { id: 'warmup', he: 'חימום', muscles: ['core'], equipment: ['none'], level: 'beginner', file: 'חימום.mp4' }
});

test('client parser attaches catalog ids so workout-mode can show the clip', function () {
  const workout = parseWorkoutClient(
    'אימון ליבה\nחימום 5 דקות.\nעיקר:\nפלאנק 3 סטים של 10\nמאונטיין קליימר 3 סטים של 12\nשחרור.'
  );
  const main = workout.phases.find(function (p) { return p.name === 'Main'; });
  assert.ok(main);
  const plank = main.exercises.find(function (e) { return /פלאנק/.test(e.name); });
  const climber = main.exercises.find(function (e) { return /קליימר|מטפס/.test(e.name); });
  assert.ok(plank, 'expected plank in parsed main');
  assert.equal(plank.id, 'plank');
  assert.ok(climber, 'expected mountain climber in parsed main');
  assert.equal(climber.id, 'mountain_climber');
});
