'use strict';

// A workout started from the reel library (exercises.html «התחל אימון», the
// weekly «#reel-plan») keeps each reel's own id. Every step must open that
// reel's Drive copy in workout mode, not an empty slot or a look-alike clip.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const TH = require('../js/core.js');
const THReels = require('../js/reel-library.js');

const root = path.join(__dirname, '..');
const read = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const local = read('js/catalog.json');
const drive = read('videos/drive-catalog.json');
const youtube = read('videos/youtube-catalog.json');
const driveVideos = read('data/drive_videos.json');
const reels = read('data/exercises.json').exercises;

function load() {
  TH.setCatalog(TH.mergeCatalogs(TH.mergeCatalogs(local, drive, []), youtube, []));
  TH.setReelDriveVideos(driveVideos);
}

function codeToFile() {
  const map = {};
  driveVideos.forEach((row) => {
    const m = String(row.name).match(/ - ([A-Za-z0-9_-]{6,})\.mp4$/i);
    if (m && !map[m[1]]) map[m[1]] = row.fileId;
  });
  return map;
}

function stepFor(ex) {
  const draft = THReels.addToDraft(THReels.emptyDraft('t'), ex);
  const w = THReels.toPhasesWorkout(THReels.draftToWorkout(draft, { title: 't' }));
  return w.phases[1].exercises[0];
}

function sameClip(entry, fileId) {
  return entry.driveId === fileId || entry.drivePlayId === fileId || entry.legacyDriveId === fileId;
}

test('every Drive reel step opens its own Drive clip', () => {
  load();
  const list = THReels.driveVideosToExercises(driveVideos);
  assert.ok(list.length > 100);
  list.forEach((ex) => {
    const hit = TH.findExercise(stepFor(ex));
    assert.ok(hit && TH.isPlayable(hit), ex.id);
    assert.ok(sameClip(hit, ex.file_id), ex.id + ' → ' + (hit && hit.id));
  });
});

test('Instagram reel steps open the Drive copy named with their shortcode', () => {
  load();
  const map = codeToFile();
  let withCopy = 0;
  reels.filter((ex) => ex.muscle_group !== 'השראה').forEach((ex) => {
    const code = ex.id.slice(3);
    if (!map[code]) return;
    withCopy++;
    const hit = TH.findExercise(stepFor(ex));
    assert.ok(hit && TH.isPlayable(hit), ex.id);
    assert.ok(sameClip(hit, map[code]), ex.id + ' → ' + (hit && hit.id));
  });
  assert.ok(withCopy >= 80, 'reels with a Drive copy: ' + withCopy);
});

test('weekly #reel-plan days resolve the same clips', () => {
  load();
  const ex = THReels.driveVideosToExercises(driveVideos)[0];
  const draft = THReels.addToDraft(THReels.emptyDraft('t'), ex);
  const program = THReels.toDailyProgram([THReels.draftToWorkout(draft, { title: 't' })]);
  const step = program.dailyWorkouts[0].exercises[0];
  const hit = TH.findExercise(step);
  assert.ok(hit && sameClip(hit, ex.file_id));
});

test('an unknown drive-/ig- id does not invent a clip', () => {
  load();
  assert.equal(TH.findExercise({ id: 'drive-NOTAREALFILEIDNOTAREALFILE', name: 'zzz' }), null);
  assert.equal(TH.findExercise({ id: 'ig-NOPE123', name: 'zzz' }), null);
});

test('core loads data/drive_videos.json with the catalog', () => {
  const src = fs.readFileSync(path.join(root, 'js', 'core.js'), 'utf8');
  assert.match(src, /loadJson\("data\/drive_videos\.json"\)/);
});
