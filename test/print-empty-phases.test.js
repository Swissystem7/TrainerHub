'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const mem = {};
global.localStorage = {
  getItem: function (k) { return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null; },
  setItem: function (k, v) { mem[k] = String(v); },
  removeItem: function (k) { delete mem[k]; }
};
global.location = {
  href: 'https://swissystem7.github.io/TrainerHub/index.html',
  pathname: '/TrainerHub/index.html',
  hash: ''
};

const TH = require('../js/core.js');

test('the print sheet leaves out an empty «שחרור» phase', function () {
  const w = {
    title: 'אימון רגליים',
    phases: [
      { name: 'Warm-up', exercises: [{ name: 'ג׳אמפינג ג׳קס', sets: 1, duration_seconds: 60 }] },
      { name: 'Main', exercises: [{ name: 'סקוואט', sets: 3, reps: '12' }] },
      { name: 'Cool-down', duration_minutes: 0, exercises: [] }
    ]
  };
  const model = TH.workoutPrintModel(w, {});
  assert.deepEqual(model.phases.map(function (ph) { return ph.name; }), ['חימום', 'עיקר']);
  const html = TH.workoutPrintHtml(model);
  assert.ok(!html.includes('שחרור'));
  assert.ok(!html.includes('אין תרגילים בשלב הזה'));
});

test('a single-clip workout prints only its main phase', function () {
  const model = TH.workoutPrintModel(TH.clipToWorkout({ id: 'x', he: 'פלאנק' }), {});
  assert.deepEqual(model.phases.map(function (ph) { return ph.name; }), ['עיקר']);
});

test('a workout with no exercises at all still shows its phases', function () {
  const model = TH.workoutPrintModel({
    phases: [{ name: 'Warm-up', exercises: [] }, { name: 'Main', exercises: [] }]
  }, {});
  assert.equal(model.phases.length, 2);
  assert.ok(TH.workoutPrintHtml(model).includes('אין תרגילים בשלב הזה'));
});
