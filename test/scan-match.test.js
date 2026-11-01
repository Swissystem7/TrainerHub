'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const THScan = require('../js/scan-match.js');
const data = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'exercises.json'), 'utf8'));
const page = fs.readFileSync(path.join(__dirname, '..', 'scan.html'), 'utf8');

function byCode(code) {
  return data.exercises.find(function (ex) { return ex.id === 'ig-' + code; });
}

test('equipment tags stay inside the standard list and kitchen floor is not required', function () {
  assert.equal(THScan.EQUIPMENT_TAGS.length, 33);
  data.exercises.forEach(function (ex) {
    ex.equipment_tags.forEach(function (tag) {
      assert.ok(THScan.tagAllowed(tag), ex.id + ' ' + tag);
    });
  });
  assert.deepEqual(byCode('DfCxqpMDrS6').equipment_tags, ['towel', 'bodyweight']);
  assert.ok(byCode('DfDEp8PRL3f').equipment_tags.indexOf('bench') !== -1);
});

test('tips are excluded from matching even when they need no gear', function () {
  ['DeO8oVyADue', 'DdS9ue-knAM', 'DZnFFSvscK_', 'Dd3jpQ3t-7Y', 'DdthU1EtHnN'].forEach(function (code) {
    assert.equal(byCode(code).muscle_group, 'השראה', code);
    assert.equal(THScan.exerciseFits(byCode(code), ['bodyweight', 'mat', 'bench']), false);
  });
});

test('a bench exercise is offered only when a bench is available', function () {
  const bench = byCode('DfDEp8PRL3f');
  assert.equal(THScan.exerciseFits(bench, ['mat']), false);
  assert.equal(THScan.exerciseFits(bench, ['mat', 'bench']), true);
  assert.equal(THScan.exerciseFits(byCode('DfBp7o0sv18'), ['bodyweight']), false);
  assert.equal(THScan.exerciseFits(byCode('DfBp7o0sv18'), ['mat']), true);
});

test('the weekly plan is deterministic and stays inside the library', function () {
  const tags = ['mat', 'wall', 'bench'];
  const a = THScan.buildScanResult(data.exercises, { available_tags: tags });
  const b = THScan.buildScanResult(data.exercises, { available_tags: tags });
  assert.deepEqual(a.suggested_weekly_plan, b.suggested_weekly_plan);
  assert.ok(a.available_tags.indexOf('bodyweight') === 0);
  assert.ok(a.matching_exercises.every(function (row) { return row.muscle_group !== 'השראה'; }));
  assert.ok(a.matching_exercises.some(function (row) { return row.reel_url.indexOf('DfDEp8PRL3f') !== -1; }));
  assert.ok(a.matching_exercises.every(function (row) {
    return row.required_tags.every(function (tag) {
      return tag === 'bodyweight' || a.available_tags.indexOf(tag) !== -1;
    });
  }));
  const plan = a.suggested_weekly_plan;
  assert.ok(plan.days >= 1 && plan.days <= 4);
  assert.ok(Array.isArray(plan.day_1.exercises) && plan.day_1.exercises.length <= 3);
  const workouts = THScan.workoutsFromPlan(plan, data.exercises);
  assert.equal(workouts.length, plan.days);
  assert.equal(THScan.mergeScanWorkouts([{ id: 'keep' }, { id: 'scan_day_1' }], workouts)[0].id, 'keep');
});

test('coco labels map only onto the standard tags', function () {
  const tags = THScan.tagsFromCoco([
    { class: 'couch', score: 0.91, bbox: [10, 20, 30, 40] },
    { class: 'sports ball', score: 0.5, bbox: [0, 0, 10, 10] },
    { class: 'person', score: 0.99, bbox: [0, 0, 10, 10] }
  ], 100, 100);
  assert.deepEqual(tags.map(function (row) { return row.tag; }), ['small_ball', 'sofa']);
  assert.equal(tags[1].confidence, 0.91);
  const park = THScan.environmentFromCoco([
    { class: 'potted plant', score: 0.8 },
    { class: 'sports ball', score: 0.6 }
  ]);
  assert.equal(park.type, 'park');
  assert.equal(park.floor, 'grass');
  const room = THScan.environmentFromCoco([{ class: 'bed', score: 0.7 }]);
  assert.equal(room.type, 'room');
  assert.equal(room.space, 'small');
});

test('the scan page captures a photo and can load the builder', function () {
  assert.match(page, /lang="he"/);
  assert.match(page, /dir="rtl"/);
  assert.match(page, /id="photo"/);
  assert.match(page, /capture="environment"/);
  assert.match(page, /getUserMedia/);
  assert.match(page, /THScan\.buildScanResult/);
  assert.match(page, /TH_SCAN_ENDPOINT/);
  assert.match(page, /id="loadPlan"/);
});
