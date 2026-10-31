'use strict';

// The print sheet showed every timed row in seconds with the set count:
// «ריצה 20 דקות» printed as «1 × 1200 שנ׳» and «מנוחה 2 דקות» as «מנוחה 120 שנ׳».
// Whole minutes now print as «20 דק׳» (like the booklet); 90 s stays «90 שנ׳».

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

function rows(text) {
  const ctx = { window: {} };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'frontend', 'parse-workout.js'), 'utf8'), ctx);
  const out = {};
  TH.workoutPrintModel(ctx.window.parseWorkoutClient(text), {}).phases.forEach(function (ph) {
    ph.exercises.forEach(function (ex) { out[ex.name] = ex.detail; });
  });
  return out;
}

test('a 20-minute run prints «20 דק׳», not «1 × 1200 שנ׳»', function () {
  assert.equal(rows('אימון ריצה\nריצה 20 דקות')['ריצה'], '20 דק׳');
});

test('timed sets in whole minutes print minutes; other seconds stay seconds', function () {
  const r = rows('אימון\nחתירה 3x2 דקות מנוחה 60 שניות\nפלאנק 3x90 שניות מנוחה 90 שניות\nקפיצות 45 שניות');
  assert.equal(r['חתירה'], '3 × 2 דק׳ · מנוחה 1 דק׳');
  assert.equal(r['פלאנק'], '3 × 90 שנ׳ · מנוחה 90 שנ׳');
  assert.equal(r['קפיצות'], '45 שנ׳');
});
