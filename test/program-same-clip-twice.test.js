'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const TH = require('../js/core.js');

const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'js', 'catalog.json'), 'utf8'));

test('a legs + cones kids day never plays the same clip twice under two ids', function () {
  TH.setCatalog(catalog);
  const program = TH.generateWorkoutProgram({
    age: 10,
    fitnessLevel: 'advanced',
    goals: ['endurance'],
    availableEquipment: ['cones'],
    targetMuscles: ['legs'],
    injuries: [],
    audience: 'kids',
    preferCatalog: true
  }, 3, 1);
  program.dailyWorkouts.forEach(function (day) {
    const files = day.exercises.map(function (ex) { return catalog[ex.name] && catalog[ex.name].file; })
      .filter(Boolean);
    assert.equal(new Set(files).size, files.length,
      'day ' + day.day + ' repeats a clip: ' + day.exercises.map(function (ex) { return ex.name; }).join(', '));
    assert.equal(day.exercises.length, 6);
  });
});
