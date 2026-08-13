'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const TH = require('../js/core.js');

const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'js', 'catalog.json'), 'utf8'));

const FIXTURE = {
  plank: { id: 'plank', he: 'פלאנק', muscles: ['core'], equipment: ['none'], level: 'beginner', file: 'פלאנק.mp4' },
  פלאנק_ברכיים: { id: 'פלאנק_ברכיים', he: 'פלאנק ברכיים', muscles: ['core'], equipment: ['none'], level: 'beginner', file: 'פלאנק ברכיים.mp4' },
  פלאנק_צידי: { id: 'פלאנק_צידי', he: 'פלאנק צידי', muscles: ['core'], equipment: ['none'], level: 'beginner', file: 'פלאנק צידי.mp4' },
  גומיות_בטן: { id: 'גומיות_בטן', he: 'גומיות בטן', muscles: ['core'], equipment: ['band'], level: 'beginner', file: 'גומיות בטן.mp4' },
  ילדים_קונוסים: { id: 'ילדים_קונוסים', he: 'ילדים קונוסים', muscles: ['chest', 'back', 'legs', 'core'], equipment: ['cones'], level: 'beginner', file: 'ילדים קונוסים.mp4' },
  כדורגל_אחד_על_אחד: { id: 'כדורגל_אחד_על_אחד', he: 'כדורגל אחד על אחד', muscles: ['legs'], equipment: ['football'], level: 'beginner', file: 'כדורגל אחד על אחד.mp4' },
  step_up: { id: 'step_up', he: 'מדרגות', muscles: ['legs'], equipment: ['stairs'], level: 'beginner', file: 'מדרגות.mp4' },
  warmup: { id: 'warmup', he: 'חימום', muscles: ['core'], equipment: ['none'], level: 'beginner', file: 'חימום.mp4' }
};

function useFixture() {
  TH.setCatalog(FIXTURE);
}

test('filterCatalog searches Hebrew names and respects muscle / equipment / tag', function () {
  useFixture();
  assert.equal(TH.filterCatalog({ q: 'פלאנק' }).length, 3);
  assert.equal(TH.filterCatalog({ muscle: 'core', equipment: 'band' })[0].id, 'גומיות_בטן');
  assert.equal(TH.filterCatalog({ tag: 'kids' })[0].id, 'ילדים_קונוסים');
  assert.equal(TH.filterCatalog({ tag: 'sport' })[0].id, 'כדורגל_אחד_על_אחד');
  assert.equal(TH.filterCatalog({ q: 'אין_תרגיל_כזה' }).length, 0);
});

test('catalogTags derive kids / partner / sport without storing filenames', function () {
  useFixture();
  assert.deepEqual(TH.catalogTags(FIXTURE.ילדים_קונוסים).sort(), ['cones', 'kids']);
  assert.deepEqual(TH.catalogTags(FIXTURE.כדורגל_אחד_על_אחד), ['sport']);
  assert.ok(TH.catalogTags(FIXTURE.plank).indexOf('kids') === -1);
});

test('catalogStats counts the real library and every muscle bucket', function () {
  TH.setCatalog(catalog);
  const stats = TH.catalogStats();
  assert.ok(stats.total >= 70, 'expected the real clip library, got ' + stats.total);
  assert.equal(stats.withFile, stats.total);
  assert.ok(stats.byMuscle.core > 0);
  assert.ok(stats.byMuscle.legs > 0);
  assert.ok(stats.byTag.kids > 0);
  assert.ok(stats.byEquipment.band > 0);
  assert.ok(stats.byEquipment.cones > 0);
});

test('matchCatalog maps free-text Hebrew (and aliases) onto catalog ids', function () {
  useFixture();
  assert.equal(TH.matchCatalog('פלאנק').id, 'plank');
  assert.equal(TH.matchCatalog('מאונטיין קליימר'), null);
  TH.setCatalog(Object.assign({}, FIXTURE, {
    mountain_climber: { id: 'mountain_climber', he: 'מטפס הרים', muscles: ['core'], equipment: ['none'], level: 'beginner', file: 'מטפס הרים.mp4' }
  }));
  assert.equal(TH.matchCatalog('מאונטיין קליימר').id, 'mountain_climber');
  assert.equal(TH.matchCatalog('חימום כללי').id, 'warmup');
  assert.equal(TH.matchCatalog('פלאנק ברכיים').id, 'פלאנק_ברכיים');
  assert.equal(TH.matchCatalog('תרגיל שלא קיים'), null);
});

test('attachCatalogIds writes ids onto parsed phases without inventing files', function () {
  useFixture();
  const workout = {
    phases: [
      { name: 'Warm-up', exercises: [{ name: 'חימום כללי', sets: 1 }] },
      { name: 'Main', exercises: [{ name: 'פלאנק', sets: 3, reps: 10 }, { name: 'משהו שלא בקטלוג', sets: 2 }] }
    ]
  };
  TH.attachCatalogIds(workout);
  assert.equal(workout.phases[0].exercises[0].id, 'warmup');
  assert.equal(workout.phases[1].exercises[0].id, 'plank');
  assert.equal(workout.phases[1].exercises[1].id, undefined);
});

test('substitutesFor returns same-muscle clips and never the original id', function () {
  useFixture();
  const alts = TH.substitutesFor({ id: 'plank' }, { limit: 5 });
  assert.ok(alts.length >= 2);
  assert.ok(alts.every(function (e) { return e.id !== 'plank'; }));
  assert.ok(alts.every(function (e) { return e.muscles.indexOf('core') !== -1; }));
  const bandOnly = TH.substitutesFor({ id: 'plank' }, { equipment: ['band'], limit: 5 });
  assert.ok(bandOnly.every(function (e) {
    return e.equipment.indexOf('none') !== -1 || e.equipment.indexOf('band') !== -1;
  }));
});

test('swapExercise keeps sets/reps and rewrites name+id from the catalog', function () {
  useFixture();
  const workout = {
    phases: [
      { name: 'Warm-up', exercises: [] },
      { name: 'Main', exercises: [{ name: 'פלאנק', id: 'plank', sets: 4, reps: '4-6', rest_seconds: 120, notes: 'form' }] }
    ]
  };
  TH.swapExercise(workout, 1, 0, 'פלאנק_ברכיים');
  const ex = workout.phases[1].exercises[0];
  assert.equal(ex.id, 'פלאנק_ברכיים');
  assert.equal(ex.name, 'פלאנק ברכיים');
  assert.equal(ex.sets, 4);
  assert.equal(ex.reps, '4-6');
  assert.equal(ex.rest_seconds, 120);
  assert.equal(ex.notes, 'form');
});

test('encodeClip / decodeClipHash never put a filename in the share payload', function () {
  useFixture();
  const prev = global.location;
  global.location = {
    href: 'https://swissystem7.github.io/TrainerHub/frontend/workout-mode.html',
    pathname: '/TrainerHub/frontend/workout-mode.html',
    hash: ''
  };
  try {
    const url = TH.encodeClip('plank', { name: 'יוסי', wa: '0501112222' });
    assert.match(url, /workout-mode\.html#CLIP\./);
    assert.equal(url.includes('פלאנק.mp4'), false);
    assert.equal(url.toLowerCase().includes('file'), false);
    const decoded = TH.decodeClipHash(url.slice(url.indexOf('#')));
    assert.equal(decoded.id, 'plank');
    assert.equal(decoded.he, 'פלאנק');
    assert.equal(decoded.n, 'יוסי');
    assert.equal('file' in decoded, false);
    const msg = TH.clipShareMessage('plank', 'יוסי');
    assert.match(msg, /פלאנק/);
    assert.equal(msg.includes('פלאנק.mp4'), false);
    const asWorkout = TH.clipToWorkout(decoded);
    assert.equal(asWorkout.phases[1].exercises[0].id, 'plank');
    assert.equal(asWorkout.phases[1].exercises[0].name, 'פלאנק');
    assert.equal(asWorkout.phases.length, 3);
  } finally {
    if (prev === undefined) delete global.location;
    else global.location = prev;
  }
});

test('plan engine prefers real catalog clips when the catalog is loaded', function () {
  useFixture();
  const program = TH.generateWorkoutProgram({
    age: 31,
    fitnessLevel: 'intermediate',
    goals: ['hypertrophy'],
    availableEquipment: ['none'],
    targetMuscles: ['core'],
    injuries: [],
    previousWorkouts: 8,
    preferCatalog: true
  }, 1, 1);
  const names = program.dailyWorkouts[0].exercises.map(function (ex) { return ex.name; });
  assert.ok(names.length > 0);
  assert.ok(names.some(function (id) { return FIXTURE[id] && FIXTURE[id].file; }),
    'expected at least one catalog clip, got ' + names.join(','));
  names.forEach(function (id) {
    if (FIXTURE[id]) assert.ok(TH.hasClip({ id: id }));
  });
});

test('kids audience + cones picks tagged kids drills from the catalog', function () {
  useFixture();
  const program = TH.generateWorkoutProgram({
    age: 12,
    fitnessLevel: 'beginner',
    goals: ['general_fitness'],
    availableEquipment: ['cones'],
    targetMuscles: [],
    injuries: [],
    previousWorkouts: 8,
    audience: 'kids',
    preferCatalog: true
  }, 1, 1);
  const names = program.dailyWorkouts[0].exercises.map(function (ex) { return ex.name; });
  assert.ok(names.indexOf('ילדים_קונוסים') !== -1, 'got ' + names.join(','));
});

test('empty catalog keeps the generic pool (no invented clip files)', function () {
  TH.setCatalog({});
  const program = TH.generateWorkoutProgram({
    age: 31,
    fitnessLevel: 'intermediate',
    goals: ['hypertrophy'],
    availableEquipment: ['none'],
    targetMuscles: ['legs'],
    injuries: [],
    previousWorkouts: 8
  }, 1, 1);
  const names = program.dailyWorkouts[0].exercises.map(function (ex) { return ex.name; });
  assert.ok(names.length > 0);
  names.forEach(function (id) {
    assert.equal(TH.findExercise({ id: id }), null);
  });
});

test('nudgeMessage stays honest and does not invent a last session', function () {
  const fresh = TH.nudgeMessage({ name: 'נועה', logs: [] });
  assert.match(fresh, /נועה/);
  assert.match(fresh, /עדיין לא ראיתי ביצוע/);
  assert.doesNotMatch(fresh, /95 סרטונים|Pro|Marketplace/);
  const dated = TH.nudgeMessage({
    name: 'יוסי',
    logs: [{ at: '2026-08-01T10:00:00.000Z', title: 'אימון 2' }]
  });
  assert.match(dated, /יוסי/);
  assert.match(dated, /אימון 2/);
  assert.equal(TH.daysSinceLast({ logs: [] }), null);
});

test('filterCatalog and clip payloads never leak a personal name from a filename', function () {
  TH.setCatalog(catalog);
  const PERSONAL = /aviran|swissa|אבירן|סוויסה|סויסה|avi[\s_-]?ran/i;
  TH.filterCatalog({}).forEach(function (e) {
    assert.equal(PERSONAL.test(e.he), false, e.he);
    assert.equal(PERSONAL.test(e.id), false, e.id);
  });
  const prev = global.location;
  global.location = {
    href: 'https://swissystem7.github.io/TrainerHub/library.html',
    pathname: '/TrainerHub/library.html',
    hash: ''
  };
  try {
    Object.keys(catalog).forEach(function (id) {
      const url = TH.encodeClip(id, {});
      if (!url) return;
      assert.equal(PERSONAL.test(url), false, id);
      assert.equal(/\.mp4/i.test(url), false, 'clip url leaked a filename for ' + id);
    });
  } finally {
    if (prev === undefined) delete global.location;
    else global.location = prev;
  }
});
