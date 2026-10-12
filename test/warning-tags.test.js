'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const TH = require('../js/core.js');
const { parseExercise } = require('../frontend/parse-workout.js');

const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'js', 'catalog.json'), 'utf8'));

test('parseExercise returns a warning tag for a catalog exercise tagged dangerous', function () {
  TH.setCatalog(catalog);
  const parsed = parseExercise('bodyweight_row');
  assert.ok(parsed);
  assert.ok(parsed.warningTag, 'expected warningTag on dangerous exercise');
  assert.equal(parsed.warningTag.id, 'dangerous');
  assert.match(parsed.warningTag.he, /מתח|כתפיים|זהירות/);
  assert.equal(parsed.warningTag.he, catalog.bodyweight_row.warningHe);
});

test('parseExercise has no warning tag when the catalog entry is not dangerous', function () {
  TH.setCatalog(catalog);
  const parsed = parseExercise('plank');
  assert.ok(parsed);
  assert.equal(parsed.warningTag, null);
});
