'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const mem = {};
global.localStorage = {
  getItem: function (k) { return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null; },
  setItem: function (k, v) { mem[k] = String(v); },
  removeItem: function (k) { delete mem[k]; }
};

const TH = require('../js/core.js');
const Ingest = require('../js/ingest.js');

const CATALOG = [
  { id: 'plank', he: 'פלאנק', muscles: ['core'], equipment: ['none'], level: 'beginner', file: 'פלאנק.mp4', source: 'local' },
  { id: 'drive_פלאנק', he: 'פלאנק', muscles: ['core'], equipment: ['none'], level: 'beginner', driveId: 'drv1', source: 'drive' },
  { id: 'אתגר_שכיבות_שמיכה', he: 'אתגר שכיבות שמיכה', muscles: ['chest'], equipment: ['none'], level: 'beginner', driveId: 'drv2', source: 'drive' },
  { id: 'mountain_climber', he: 'מטפס הרים', muscles: ['core'], equipment: ['none'], level: 'beginner', file: 'מטפס הרים.mp4', source: 'local' }
];

TH.setCatalog(CATALOG.reduce(function (acc, e) { acc[e.id] = e; return acc; }, {}));

test('ingest parses a compact Hebrew circuit into sets, timed work, reps, and rest', function () {
  const out = Ingest.ingestText(
    '3 סבבים: 40 שניות פלאנק, 15 שכיבות שמיכה, 20 מטפס הרים, דקה מנוחה',
    CATALOG
  );
  assert.equal(out.defaults.sets, 3);
  const names = out.exercises.map(function (e) { return e.name; });
  assert.ok(names.some(function (n) { return /פלאנק/.test(n); }));
  assert.ok(names.some(function (n) { return /שכיבות/.test(n); }));
  assert.ok(names.some(function (n) { return /מטפס/.test(n); }));
  assert.ok(!names.some(function (n) { return /מנוחה/.test(n); }));
  const plank = out.exercises.filter(function (e) { return /פלאנק/.test(e.name); })[0];
  assert.equal(plank.duration_seconds, 40);
  assert.equal(plank.sets, 3);
  const push = out.exercises.filter(function (e) { return /שכיבות/.test(e.name); })[0];
  assert.equal(push.reps, 15);
  assert.equal(out.exercises[out.exercises.length - 1].rest_seconds, 60);
});

test('ingest matches synonyms and the common סמיכה/שמיכה misspelling onto a catalog clip', function () {
  const byMisspelling = Ingest.matchName('שכיבות סמיכה', CATALOG);
  assert.ok(byMisspelling);
  assert.equal(byMisspelling.id, 'אתגר_שכיבות_שמיכה');
  const byAlias = Ingest.matchName('מאונטיין קליימר', CATALOG);
  assert.ok(byAlias);
  assert.equal(byAlias.id, 'mountain_climber');
});

test('unmatched ingest exercises stay as text, are flagged, and join the film-wishlist', function () {
  Object.keys(mem).forEach(function (k) { delete mem[k]; });
  const out = Ingest.ingestText('3 סבבים: 10 בורפי, 40 שניות פלאנק', CATALOG);
  const burpee = out.exercises.filter(function (e) { return /בורפי/.test(e.name); })[0];
  const plank = out.exercises.filter(function (e) { return /פלאנק/.test(e.name); })[0];
  assert.ok(burpee);
  assert.equal(burpee.missing, true);
  assert.equal(burpee.id, null);
  assert.equal(plank.missing, false);
  assert.ok(plank.id);
  assert.ok(out.unmatched.indexOf(burpee.name) !== -1);
  assert.ok(out.wishlist.some(function (w) { return /בורפי/.test(w.he); }));
});

test('saveSegment refuses a reverse time range and stores a playable Drive clip slice', function () {
  const bad = Ingest.saveSegment({ driveId: 'drvLong', he: 'פלאנק צידי', startSec: 40, endSec: 10 });
  assert.equal(bad.error, 'bad-range');
  const ok = Ingest.saveSegment({ driveId: 'drvLong', he: 'פלאנק צידי', startSec: 12, endSec: 40 });
  assert.ok(ok.entry);
  assert.equal(ok.entry.driveId, 'drvLong');
  assert.equal(ok.entry.startSec, 12);
  assert.equal(ok.entry.endSec, 40);
  assert.equal(ok.entry.source, 'drive');
  assert.ok(ok.entry.id);
});

test('ingest treats שנ as seconds and strips a Hebrew title before the colon', function () {
  const out = Ingest.ingestText(
    'אימון ליבה: 3 סבבים: 40 שנ פלאנק, 15 שכיבות שמיכה, דקה מנוחה',
    CATALOG
  );
  assert.equal(out.defaults.sets, 3);
  const plank = out.exercises.filter(function (e) { return /פלאנק/.test(e.name); })[0];
  assert.ok(plank);
  assert.equal(plank.duration_seconds, 40);
  assert.equal(plank.reps, null);
  assert.equal(plank.name, 'פלאנק');
  assert.ok(!out.exercises.some(function (e) { return /אימון/.test(e.name); }));
  const push = out.exercises.filter(function (e) { return /שכיבות/.test(e.name); })[0];
  assert.equal(push.reps, 15);
  assert.equal(push.id, 'אתגר_שכיבות_שמיכה');
  assert.equal(out.exercises[out.exercises.length - 1].rest_seconds, 60);
});

test('ingest reads N סבבים without a colon and work/rest defaults before the list', function () {
  const lined = Ingest.ingestText(
    '3 סבבים\n40 שנ פלאנק\n15 שכיבות שמיכה\nמנוחה דקה',
    CATALOG
  );
  assert.equal(lined.defaults.sets, 3);
  assert.ok(!lined.exercises.some(function (e) { return /^סבבים$/.test(e.name); }));
  const plank = lined.exercises.filter(function (e) { return /פלאנק/.test(e.name); })[0];
  assert.equal(plank.duration_seconds, 40);
  assert.equal(plank.sets, 3);
  assert.equal(plank.rest_seconds, 60);

  const timed = Ingest.ingestText(
    'עבודה 40 שניות מנוחה 20 שניות: פלאנק, מטפס הרים',
    CATALOG
  );
  assert.equal(timed.defaults.workSeconds, 40);
  assert.equal(timed.defaults.rest, 20);
  assert.equal(timed.exercises.length, 2);
  assert.equal(timed.exercises[0].name, 'פלאנק');
  assert.equal(timed.exercises[0].duration_seconds, 40);
  assert.equal(timed.exercises[0].rest_seconds, 20);
  assert.equal(timed.exercises[1].name, 'מטפס הרים');
});

test('parseExerciseToken drops a leftover × after sets × duration', function () {
  const parsed = Ingest.parseExerciseToken('פלאנק - 3 סטים × 45 שניות', { sets: null });
  assert.equal(parsed.name, 'פלאנק');
  assert.equal(parsed.sets, 3);
  assert.equal(parsed.duration_seconds, 45);
});
