'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const THReels = require('../js/reel-library.js');

const root = path.join(__dirname, '..');
const drivePath = path.join(root, 'data', 'drive_videos.json');
const page = fs.readFileSync(path.join(root, 'exercises.html'), 'utf8');
const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');
const shipped = JSON.parse(fs.readFileSync(drivePath, 'utf8'));

const FILE = '1a2b3c4d5e6f7g8h';

function row(folder, extra) {
  return Object.assign({
    fileId: FILE + folder.length + String(folder).slice(0, 2),
    name: 'סרטון ' + folder,
    folder: folder,
    muscleGroup: ''
  }, extra || {});
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

test('drive_videos.json ships as an empty valid array', function () {
  assert.deepEqual(shipped, []);
  assert.equal(THReels.validateDriveVideos(shipped).ok, true);
  assert.deepEqual(THReels.driveVideosToExercises(shipped), []);
});

test('Drive folders map onto the library muscle groups and two folders are skipped', function () {
  const expect = {
    'בטן': 'ליבה',
    'גב': 'גב',
    'רגליים': 'רגליים/ישבן',
    'חזה': 'חזה',
    'כתפיים': 'אחר',
    'ידיים': 'אחר',
    'גוף מלא HIIT': 'גוף מלא/HIIT',
    'קרדיו': 'גוף מלא/HIIT',
    'חימום': 'מוביליטי',
    'זמן תגובה וקואורדינציה': 'אחר'
  };
  Object.keys(expect).forEach(function (folder) {
    assert.equal(THReels.driveMuscleGroup(row(folder)), expect[folder], folder);
  });
  assert.equal(THReels.driveMuscleGroup(row('לא קשור')), '');
  assert.equal(THReels.driveMuscleGroup(row('לבדיקה')), '');
  assert.equal(THReels.driveMuscleGroup({ folder: 'בטן', muscleGroup: 'חזה' }), 'ליבה');
  assert.equal(THReels.driveMuscleGroup({ folder: '', muscleGroup: 'חזה' }), 'חזה');
  assert.equal(THReels.driveMuscleGroup({ folder: 'תיקייה חדשה', muscleGroup: '' }), 'לא ממוין');
});

test('a Drive video becomes a sparse exercise and a lazy embed card', function () {
  const source = [
    { fileId: FILE, name: 'פלאנק על מזרן', folder: 'בטן', muscleGroup: '' },
    { fileId: 'skipfolder01', name: 'לא לכאן', folder: 'לא קשור', muscleGroup: 'חזה' },
    { fileId: 'skipcheck01', name: 'עדיין לא', folder: 'לבדיקה', muscleGroup: '' },
    { fileId: 'bad id', name: 'שבור', folder: 'גב', muscleGroup: '' },
    { fileId: FILE, name: 'כפול', folder: 'גב', muscleGroup: '' }
  ];
  const list = THReels.driveVideosToExercises(source);
  assert.equal(list.length, 1);
  const ex = list[0];
  assert.equal(ex.id, 'drive-' + FILE);
  assert.equal(ex.source, 'drive');
  assert.equal(ex.name_he, 'פלאנק על מזרן');
  assert.equal(ex.muscle_group, 'ליבה');
  assert.equal(ex.sets, null);
  assert.equal(ex.reps, '');
  assert.equal(ex.sets_reps, '');
  assert.equal(ex.equipment, '');
  assert.deepEqual(ex.steps_he, []);
  assert.deepEqual(ex.equipment_tags, []);
  assert.equal(ex.creator, '');
  assert.equal(ex.verified, false);
  assert.equal(ex.preview_url, 'https://drive.google.com/file/d/' + FILE + '/preview');
  assert.equal(ex.source_url, 'https://drive.google.com/file/d/' + FILE + '/view');

  const html = THReels.exerciseCardHtml(Object.assign({}, ex, { _index: 3 }), esc);
  assert.match(html, /<iframe/);
  assert.match(html, /loading="lazy"/);
  assert.match(html, new RegExp('src="https://drive\\.google\\.com/file/d/' + FILE + '/preview"'));
  assert.match(html, new RegExp('href="https://drive\\.google\\.com/file/d/' + FILE + '/view"'));
  assert.match(html, /פתיחה ב-Drive/);
  assert.match(html, /פלאנק על מזרן/);
  assert.match(html, /ליבה/);
  assert.match(html, /data-add="drive-/);
  assert.doesNotMatch(html, /לא מאומת/);
  assert.doesNotMatch(html, /<ol class="steps">/);
  assert.doesNotMatch(html, /סטים|חזרות|לא ממוין/);

  const draft = THReels.addToDraft(THReels.emptyDraft('אימון'), ex);
  assert.equal(draft.items.length, 1);
  assert.equal(draft.items[0].exerciseId, ex.id);
  assert.equal(draft.items[0].sets, null);
  assert.equal(draft.items[0].reps, '');
  assert.equal(draft.items[0].source_url, ex.source_url);
  const saved = THReels.draftToWorkout(draft, { title: 'אימון', id: 'rw_drive' });
  assert.equal(saved.exercises[0].exerciseId, ex.id);
  const core = THReels.filterExercises(list, { muscle: 'ליבה' });
  assert.equal(core.length, 1);
  assert.equal(THReels.filterExercises(list, { query: 'מזרן' }).length, 1);
  assert.equal(THReels.filterExercises(list, { query: 'בטן' }).length, 1);
});

test('a Drive file that is not an array or is missing fields fails validation', function () {
  assert.equal(THReels.validateDriveVideos({}).ok, false);
  const broken = THReels.validateDriveVideos([
    { fileId: 'short', name: '', folder: 1, muscleGroup: null }
  ]);
  assert.equal(broken.ok, false);
  assert.ok(broken.errors.some(function (line) { return /fileId/.test(line); }));
  assert.ok(broken.errors.some(function (line) { return /name/.test(line); }));
});

test('the library page loads drive_videos.json beside the reel catalog', function () {
  assert.match(page, /fetch\('\.\/data\/exercises\.json'/);
  assert.match(page, /data\/drive_videos\.json/);
  assert.match(page, /driveVideosToExercises/);
  assert.match(page, /loading="lazy"|drive-frame/);
  assert.match(readme, /## סרטוני Google Drive/);
  assert.match(readme, /data\/drive_videos\.json/);
  ['fileId', 'name', 'folder', 'muscleGroup'].forEach(function (field) {
    assert.match(readme, new RegExp('`' + field + '`'));
  });
  assert.match(readme, /לא קשור/);
  assert.match(readme, /לבדיקה/);
  assert.match(readme, /loading="lazy"/);
});
