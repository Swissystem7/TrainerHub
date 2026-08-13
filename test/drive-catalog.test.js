'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const TH = require('../js/core.js');

const drivePath = path.join(__dirname, '..', 'videos', 'drive-catalog.json');
const localPath = path.join(__dirname, '..', 'js', 'catalog.json');
const drive = JSON.parse(fs.readFileSync(drivePath, 'utf8'));
const local = JSON.parse(fs.readFileSync(localPath, 'utf8'));

const EXCLUDED = [
  '1v2Sn44fJARACuXrqHQD8urj1III1kcq8',
  '1etyFynwf45-Q1bBGcj9KFvq2xgsuo3M3',
  '1aQlzF1RF9QJQfuAnpKOrjsdgFVd69wc2',
  '1o7Bd3tVAKJxEzZ62tA3UsA54DlTiRU9f',
  '1A4DZ5UNFF4Ycusx6tGcFX_TvLIhBOK_G',
  '1ThrEgopvswrbWNM6n-Jrtu3jzP6Vx3MH'
];
const LEVELS = new Set(['beginner', 'intermediate', 'advanced']);
const MUSCLES = new Set(['chest', 'back', 'shoulders', 'biceps', 'triceps', 'legs', 'core']);
const PERSONAL = /aviran|swissa|אבירן|סוויסה|סויסה|avi[\s_-]?ran|^VID[_-]/i;
const REQUIRED = ['id', 'driveId', 'he', 'muscles', 'equipment', 'level', 'source', 'folder'];

const items = Array.isArray(drive.items) ? drive.items : [];

test('drive-catalog.json has 44 real videos as an items array', function () {
  assert.ok(drive && typeof drive === 'object');
  assert.ok(Array.isArray(drive.items));
  assert.equal(items.length, 44);
  assert.equal(drive._meta && drive._meta.count, 44);
});

test('every drive item has the published schema and valid enums', function () {
  const missing = [];
  const ids = new Set();
  const driveIds = new Set();
  for (const entry of items) {
    for (const field of REQUIRED) {
      const value = entry[field];
      if (value == null || value === '') missing.push((entry.id || '?') + '.' + field);
    }
    if (entry.source !== 'drive') missing.push((entry.id || '?') + '.source=' + entry.source);
    if (!Array.isArray(entry.muscles) || !entry.muscles.length) missing.push(entry.id + '.muscles');
    if (!Array.isArray(entry.equipment) || !entry.equipment.length) missing.push(entry.id + '.equipment');
    if (!LEVELS.has(entry.level)) missing.push(entry.id + '.level=' + entry.level);
    for (const m of entry.muscles || []) {
      if (!MUSCLES.has(m)) missing.push(entry.id + ' unknown muscle ' + m);
    }
    if (ids.has(entry.id)) missing.push('duplicate id ' + entry.id);
    ids.add(entry.id);
    if (driveIds.has(entry.driveId)) missing.push('duplicate driveId ' + entry.driveId);
    driveIds.add(entry.driveId);
  }
  assert.deepEqual(missing, []);
});

test('anonymous VID_* clips and personal names stay out of the drive catalog', function () {
  const hits = [];
  for (const entry of items) {
    if (EXCLUDED.indexOf(entry.driveId) !== -1) hits.push('excluded id ' + entry.driveId);
    const blob = [entry.id, entry.he, entry.driveId, entry.folder].join(' ');
    if (PERSONAL.test(blob)) hits.push(blob);
  }
  assert.deepEqual(hits, []);
  assert.equal(items.length, 44);
});

test('mergeCatalogs unifies local + drive behind one lookup, each with source', function () {
  const merged = TH.mergeCatalogs(local, drive, []);
  const keys = Object.keys(merged);
  assert.ok(keys.length >= Object.keys(local).length + 44);
  keys.forEach(function (id) {
    const e = merged[id];
    assert.ok(e.source, id + ' missing source');
    assert.ok(e.he, id + ' missing he');
    assert.ok(Array.isArray(e.muscles) && e.muscles.length, id + ' muscles');
  });
  const drivePlank = keys.map(function (k) { return merged[k]; }).find(function (e) {
    return e.source === 'drive' && e.he === 'פלאנק';
  });
  assert.ok(drivePlank);
  assert.ok(drivePlank.driveId);
  assert.equal(TH.drivePreviewUrl(drivePlank.driveId).indexOf('https://drive.google.com/file/d/'), 0);
  TH.setCatalog(merged);
  const found = TH.findExercise({ id: drivePlank.id });
  assert.ok(found);
  assert.equal(TH.hasClip({ id: drivePlank.id }), true);
  assert.equal(TH.playableKind(found), 'drive');
});

test('mediaMarkup degrades to exercise text when offline and never embeds an excluded id', function () {
  const entry = {
    id: 'drive_פלאנק', he: 'פלאנק', muscles: ['core'], equipment: ['none'],
    level: 'beginner', source: 'drive', driveId: '1tLFxcQifJQgGYRZD20YQticZ0S4psv2r'
  };
  const online = TH.mediaMarkup(entry, { className: 'ex-media' });
  assert.match(online, /drive\.google\.com\/file\/d\/1tLFxcQifJQgGYRZD20YQticZ0S4psv2r\/preview/);
  assert.match(online, /<iframe/);
  const offline = TH.mediaMarkup(entry, { className: 'ex-media', offline: true });
  assert.doesNotMatch(offline, /<iframe/);
  assert.match(offline, /פלאנק/);
  EXCLUDED.forEach(function (id) {
    assert.equal(online.includes(id), false);
    assert.equal(JSON.stringify(drive).includes(id), false);
  });
});
