'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { evaluateHomeBaseline, saveBaselineResult } = require('../js/home-baseline.js');

const root = path.join(__dirname, '..');
const reservesHtml = fs.readFileSync(path.join(root, 'reserves.html'), 'utf8');
const exercisesHtml = fs.readFileSync(path.join(root, 'exercises.html'), 'utf8');

test('home baseline evaluates beginner level correctly', function () {
  const res = evaluateHomeBaseline(5, 20, 15);
  assert.equal(res.level, 'beginner');
  assert.equal(res.levelHe, 'מתחילים');
});

test('home baseline evaluates intermediate level correctly', function () {
  const res = evaluateHomeBaseline(20, 60, 35);
  assert.equal(res.level, 'intermediate');
  assert.equal(res.levelHe, 'בינוני');
});

test('home baseline evaluates advanced level correctly', function () {
  const res = evaluateHomeBaseline(35, 120, 50);
  assert.equal(res.level, 'advanced');
  assert.equal(res.levelHe, 'מתקדמים');
});

test('home baseline handles invalid inputs, negative numbers, NaN, and storage failure gracefully', function () {
  const resNeg = evaluateHomeBaseline(-5, NaN, null);
  assert.equal(resNeg.level, 'beginner');

  const throwingStorage = {
    setItem: () => { throw new Error('Quota exceeded'); }
  };
  const saved = saveBaselineResult({ level: 'beginner' }, throwingStorage);
  assert.equal(saved, false);
});

test('reserves and exercises html contain home baseline panel, buttons, and explicit labels', function () {
  assert.match(reservesHtml, /id="homeBaselinePanel"/);
  assert.match(reservesHtml, /id="calcHomeBaselineBtn"/);
  assert.match(reservesHtml, /for="hbPushups"/);
  assert.match(reservesHtml, /for="hbPlank"/);
  assert.match(reservesHtml, /for="hbSquats"/);

  assert.match(exercisesHtml, /id="homeBaselinePanel"/);
  assert.match(exercisesHtml, /id="calcHomeBaselineBtn"/);
  assert.match(exercisesHtml, /for="hbPushups"/);
  assert.match(exercisesHtml, /for="hbPlank"/);
  assert.match(exercisesHtml, /for="hbSquats"/);
});
