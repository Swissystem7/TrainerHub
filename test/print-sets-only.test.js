'use strict';

// A studio row with sets but no reps or seconds («ספרינט 6x50 מטר» → 6 sets,
// note «50 מטר»; «מתח 3xמקס» → 3 sets, note «עד כשל») printed with an empty
// detail cell: the card on screen says «6 סטים», the printed sheet lost it.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

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

function parse(text) {
  const ctx = { window: {} };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'frontend', 'parse-workout.js'), 'utf8'), ctx);
  return ctx.window.parseWorkoutClient(text);
}

function printRows(text) {
  const model = TH.workoutPrintModel(parse(text), {});
  const rows = {};
  model.phases.forEach(function (ph) {
    ph.exercises.forEach(function (ex) { rows[ex.name] = ex; });
  });
  return { model: model, rows: rows };
}

test('a distance row prints its sets next to the distance note', function () {
  const r = printRows('אימון ריצה\nספרינט 6x50 מטר');
  assert.equal(r.rows['ספרינט'].detail, '6 סטים');
  assert.equal(r.rows['ספרינט'].notes, '50 מטר');
  assert.match(TH.workoutPrintHtml(r.model), /6 סטים/);
});

test('a to-failure row prints its sets next to «עד כשל»', function () {
  const r = printRows('אימון כוח\nמתח 3xמקס');
  assert.equal(r.rows['מתח'].detail, '3 סטים');
  assert.equal(r.rows['מתח'].notes, 'עד כשל');
});

test('reps without sets print as «N חזרות»', function () {
  const row = TH.workoutPrintModel({ phases: [{ name: 'Main', exercises: [{ name: 'סקוואט', reps: 15 }] }] }, {}).phases[0].exercises[0];
  assert.equal(row.detail, '15 חזרות');
});

test('sets × reps, timed sets and a one-set timed warm-up are unchanged', function () {
  const r = printRows('אימון כוח\nשכיבות סמיכה 3x12\nפלאנק 3x30 שניות');
  assert.equal(r.rows['שכיבות סמיכה'].detail, '3 × 12');
  assert.equal(r.rows['פלאנק'].detail, '3 × 30 שנ׳');
  assert.equal(r.rows['חימום כללי'].detail, '1 × 180 שנ׳');
});
