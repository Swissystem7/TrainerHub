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

test('workoutPrintModel and workoutPrintHtml include notes when present', function () {
  const w = {
    title: 'אימון',
    phases: [{
      name: 'Main',
      exercises: [{
        name: 'פלאנק',
        id: 'plank',
        sets: 3,
        duration_seconds: 40,
        rest_seconds: 30,
        notes: 'גב ישר'
      }]
    }]
  };
  const model = TH.workoutPrintModel(w, {});
  assert.equal(model.phases[0].exercises[0].notes, 'גב ישר');
  const html = TH.workoutPrintHtml(model);
  assert.match(html, /גב ישר/);
});

test('workoutPrintHtml escapes notes through esc', function () {
  const w = {
    title: 'אימון',
    phases: [{
      name: 'Main',
      exercises: [{
        name: 'פלאנק',
        id: 'plank',
        sets: 3,
        duration_seconds: 40,
        rest_seconds: 30,
        notes: '<b>x</b>'
      }]
    }]
  };
  const model = TH.workoutPrintModel(w, {});
  assert.equal(model.phases[0].exercises[0].notes, '<b>x</b>');
  const html = TH.workoutPrintHtml(model);
  assert.ok(html.includes('&lt;b&gt;x&lt;/b&gt;'));
  assert.ok(!html.includes('<b>x</b>'));
});

test('exercise without notes renders exactly as today with no empty note cell', function () {
  const w = {
    title: 'אימון',
    phases: [{
      name: 'Main',
      exercises: [{
        name: 'פלאנק',
        id: 'plank',
        sets: 3,
        duration_seconds: 40,
        rest_seconds: 30
      }]
    }]
  };
  const model = TH.workoutPrintModel(w, {});
  assert.equal(model.phases[0].exercises[0].notes, undefined);
  const html = TH.workoutPrintHtml(model);
  assert.ok(!html.includes('<td></td>'));
  assert.ok(html.includes('<tr><th scope="row">פלאנק</th><td>3 × 40 שנ׳ · מנוחה 30 שנ׳</td></tr>'));
});
