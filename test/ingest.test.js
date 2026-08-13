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
