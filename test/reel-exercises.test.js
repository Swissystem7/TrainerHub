'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.join(__dirname, '..');
const THReels = require('../js/reel-library.js');
const data = JSON.parse(fs.readFileSync(path.join(root, 'data', 'exercises.json'), 'utf8'));
const page = fs.readFileSync(path.join(root, 'exercises.html'), 'utf8');
const weekly = fs.readFileSync(path.join(root, 'weekly.html'), 'utf8');
const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8');

function memoryStore() {
  const mem = {};
  return {
    get: function (key, fallback) {
      return Object.prototype.hasOwnProperty.call(mem, key) ? mem[key] : fallback;
    },
    set: function (key, val) {
      mem[key] = val;
      return true;
    }
  };
}

test('the reel library validates and is the union of the reel list and the mapping', function () {
  const result = THReels.validateLibrary(data);
  assert.deepEqual(result.errors, []);
  assert.equal(data.exercises.length, 79);
  assert.equal(data.exercises.filter(function (ex) { return ex.verified; }).length, 0);
  assert.ok(data.exercises.some(function (ex) { return ex.id === 'ig-DeO8oVyADue'; }));
  assert.ok(data.exercises.some(function (ex) { return ex.id === 'ig-DdS9ue-knAM'; }));
});

test('reels missing from the mapping stay unclassified', function () {
  ['ig-DdHOFvtKk9z', 'ig-DdI_86lNFfY'].forEach(function (id) {
    const ex = data.exercises.find(function (row) { return row.id === id; });
    assert.ok(ex, id);
    assert.equal(ex.verified, false);
    assert.equal(ex.name_he, 'ריל לא ממוין');
    assert.equal(ex.muscle_group, 'לא ממוין');
    assert.equal(ex.sets_reps, 'לא ממוין');
    assert.equal(ex.sets, null);
    assert.equal(ex.reps, '');
    assert.equal(ex.equipment, '');
    assert.deepEqual(ex.steps_he, []);
    assert.equal(ex.source_title, '');
    assert.match(ex.source_url, /^https:\/\/www\.instagram\.com\/reel\/[^/]+\/$/);
    assert.ok(ex.creator);
  });
});

test('לא מצוין is stored as unknown reps', function () {
  const unknown = data.exercises.filter(function (ex) { return ex.source_sets_reps.indexOf('לא מצוין') !== -1; });
  assert.ok(unknown.length >= 13);
  unknown.forEach(function (ex) {
    assert.equal(ex.sets_reps, 'לא ממוין');
    assert.equal(ex.sets, null);
    assert.equal(ex.reps, '');
  });
});

test('DfDEp8PRL3f keeps the mapped bench core prescription and stays unverified', function () {
  const bench = data.exercises.find(function (ex) { return ex.id === 'ig-DfDEp8PRL3f'; });
  assert.ok(bench);
  assert.equal(bench.verified, false);
  assert.equal(bench.creator, 'coachgiress38');
  assert.equal(bench.muscle_group, 'ליבה');
  assert.equal(bench.sets, 3);
  assert.equal(bench.reps, '20');
  assert.equal(bench.sets_reps, '3x20 → 5x20 REPS');
  assert.match(bench.equipment, /ספסל/);
  assert.deepEqual(bench.steps_he, ['ברך שמאל/ימין', 'פוש-אפ מוגבה', 'נגיעת כתף']);
  assert.equal(bench.source_url, 'https://www.instagram.com/reel/DfDEp8PRL3f/');
});

test('filtering by muscle group and search uses the normalized groups', function () {
  assert.equal(THReels.filterExercises(data.exercises, {}).length, 79);
  const core = THReels.filterExercises(data.exercises, { muscle: 'ליבה' });
  assert.ok(core.some(function (ex) { return ex.id === 'ig-DfDEp8PRL3f'; }));
  assert.ok(core.length > 2);
  const hiit = THReels.filterExercises(data.exercises, { muscle: 'גוף מלא/HIIT' });
  assert.ok(hiit.some(function (ex) { return ex.id === 'ig-DfFxxAruQGT'; }));
  const mixed = data.exercises.find(function (ex) { return ex.id === 'ig-De4yvaCxfZT'; });
  assert.equal(mixed.muscle_group, 'חזה');
  assert.equal(mixed.secondary_group, 'רגליים/ישבן');
  assert.ok(THReels.filterExercises(data.exercises, { muscle: 'רגליים/ישבן' }).some(function (ex) { return ex.id === mixed.id; }));
  const unknown = THReels.filterExercises(data.exercises, { muscle: 'לא ממוין' });
  assert.deepEqual(unknown.map(function (ex) { return ex.id; }).sort(), ['ig-DdHOFvtKk9z', 'ig-DdI_86lNFfY']);
  const found = THReels.filterExercises(data.exercises, { query: 'ספסל', muscle: 'ליבה' });
  assert.ok(found.some(function (ex) { return ex.creator === 'coachgiress38'; }));
  assert.equal(THReels.filterExercises(data.exercises, { query: 'אין-כזה-תרגיל' }).length, 0);
});

test('a workout can be built, prescribed, saved, and placed on the weekly plan', function () {
  const bench = data.exercises.find(function (ex) { return ex.id === 'ig-DfDEp8PRL3f'; });
  const bear = data.exercises.find(function (ex) { return ex.id === 'ig-DfFxxAruQGT'; });
  let draft = THReels.addToDraft(THReels.emptyDraft('ליבה'), bench);
  draft = THReels.addToDraft(draft, bench);
  assert.equal(draft.items.length, 1);
  draft = THReels.addToDraft(draft, bear);
  draft = THReels.updateDraftItem(draft, bench.id, { sets: 5, reps: '20' });
  draft = THReels.moveDraftItem(draft, bear.id, -1);
  assert.equal(draft.items[0].exerciseId, bear.id);
  assert.equal(draft.items[1].sets, 5);
  assert.equal(draft.items[1].reps, '20');

  const store = memoryStore();
  const workout = THReels.draftToWorkout(draft, { title: 'אימון ספסל', id: 'rw_test' });
  THReels.upsertWorkout(workout, store);
  THReels.upsertWorkout(Object.assign({}, workout, { title: 'אימון ספסל מעודכן' }), store);
  const saved = THReels.loadWorkouts(store);
  assert.equal(saved.length, 1);
  assert.equal(saved[0].title, 'אימון ספסל מעודכן');

  const program = THReels.toDailyProgram(saved);
  assert.equal(program.dailyWorkouts.length, 1);
  assert.equal(program.dailyWorkouts[0].day, 1);
  assert.equal(program.dailyWorkouts[0].exercises[1].name, '4 תרגילים על ספסל: ברך שמאל/ימין, פוש-אפ מוגבה, נגיעת כתף');
  assert.equal(program.dailyWorkouts[0].exercises[1].sets, 5);
  assert.equal(program.dailyWorkouts[0].exercises[1].reps, '20');

  const phases = THReels.toPhasesWorkout(saved[0]);
  assert.equal(phases.phases[1].name, 'Main');
  assert.equal(phases.phases[1].exercises.length, 2);
  assert.match(phases.phases[1].exercises[1].notes, /coachgiress38/);
  assert.match(phases.phases[1].exercises[1].notes, /DfDEp8PRL3f/);

  THReels.saveDraft(draft, store);
  assert.equal(THReels.loadDraft(store).items.length, 2);
  assert.equal(THReels.clearDraft(store).items.length, 0);
  assert.equal(THReels.removeWorkout('rw_test', store).length, 0);
});

test('posters use assets/posters/<reel_id> and exercises group by muscle', function () {
  const bench = data.exercises.find(function (ex) { return ex.id === 'ig-DfDEp8PRL3f'; });
  const src = THReels.posterSources(bench);
  assert.equal(src.primary, 'assets/posters/DfDEp8PRL3f.jpg');
  assert.equal(THReels.posterSources({ id: 'ig-DdHOFvtKk9z', poster: '' }).primary, 'assets/posters/DdHOFvtKk9z.png');
  assert.equal(THReels.posterSources({ id: 'ig-DdHOFvtKk9z', poster: '' }).secondary, 'assets/posters/DdHOFvtKk9z.jpg');
  assert.equal(THReels.posterSources({ id: 'ig-X', poster: 'assets/posters/custom.jpg' }).primary, 'assets/posters/custom.jpg');
  const html = THReels.posterFrameHtml(Object.assign({}, bench, { _index: 2 }), function (s) { return String(s); });
  assert.match(html, /assets\/posters\/DfDEp8PRL3f\.jpg/);
  assert.match(html, /poster-fallback/);
  assert.match(html, /muscle-badge/);
  assert.match(html, />02</);
  const uncertain = data.exercises.filter(function (ex) { return ex.poster_uncertain; }).map(function (ex) { return ex.id; }).sort();
  assert.deepEqual(uncertain, ['ig-De_zG55tsgJ', 'ig-DfCCPegA5tj', 'ig-DfCmQ2uOLpM', 'ig-DfCxqpMDrS6']);
  uncertain.forEach(function (id) {
    const ex = data.exercises.find(function (row) { return row.id === id; });
    assert.match(ex.poster, /\.jpg$/);
    assert.match(THReels.exerciseCardHtml(ex, function (s) { return String(s); }), /איור לא ודאי/);
  });
  const groups = THReels.groupByMuscle([
    { id: 'a', muscle_group: 'חזה' },
    { id: 'b', muscle_group: 'ליבה' },
    { id: 'c', muscle_group: 'ליבה' }
  ]);
  assert.deepEqual(groups.map(function (section) { return section.muscle; }), ['ליבה', 'חזה']);
  assert.equal(groups[0].exercises.length, 2);
  const draft = THReels.addToDraft(THReels.addToDraft(THReels.emptyDraft(), bench), data.exercises.find(function (ex) { return ex.id === 'ig-DfFxxAruQGT'; }));
  const moved = THReels.moveDraftInSection(draft, bench.id, 1);
  assert.equal(moved.items[0].exerciseId, bench.id);
});

test('exercise cards link to the source reel', function () {
  const bench = data.exercises.find(function (ex) { return ex.id === 'ig-DfDEp8PRL3f'; });
  const html = THReels.exerciseCardHtml(bench, function (s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  });
  assert.match(html, /href="https:\/\/www\.instagram\.com\/reel\/DfDEp8PRL3f\/"/);
  assert.match(html, /פוש-אפ מוגבה/);
  assert.match(html, /לא מאומת/);
  assert.match(html, /data-add="ig-DfDEp8PRL3f"/);
});

test('a reel with no source title cannot grow invented details', function () {
  const copy = JSON.parse(JSON.stringify(data));
  const bare = copy.exercises.find(function (ex) { return ex.id === 'ig-DdHOFvtKk9z'; });
  bare.muscle_group = 'חזה';
  bare.name_he = 'לחיצת חזה';
  const result = THReels.validateLibrary(copy);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some(function (line) { return /muscle_group|name_he/.test(line); }));
});

test('the library page is a Hebrew RTL browser over the JSON file', function () {
  assert.match(page, /lang="he"/);
  assert.match(page, /dir="rtl"/);
  assert.match(page, /fetch\('\.\/data\/exercises\.json'\)/);
  assert.match(page, /id="q"/);
  assert.match(page, /for="q"/);
  assert.match(page, /id="muscle"/);
  assert.match(page, /for="muscle"/);
  assert.match(page, /id="workoutTitle"/);
  assert.match(page, /for="workoutTitle"/);
  assert.match(page, /id="saveWorkout"/);
  assert.match(page, /id="useInWeekly"/);
  assert.match(page, /weekly\.html#reel-plan/);
  assert.match(page, /THReels\.filterExercises/);
  assert.match(page, /data-add/);
  THReels.MUSCLE_GROUPS.forEach(function (group) {
    assert.ok(page.includes('value="' + group + '"'), group);
  });
});

test('the weekly builder can show a saved reel workout', function () {
  assert.match(weekly, /id="savedReelCard"/);
  assert.match(weekly, /id="useSavedReelBtn"/);
  assert.match(weekly, /js\/reel-library\.js/);
  assert.match(weekly, /reel-plan/);
  assert.match(weekly, /toDailyProgram/);
  assert.match(weekly, /exercises\.html/);
});

test('the README documents how to append an exercise', function () {
  assert.match(readme, /## איך מוסיפים תרגיל/);
  assert.match(readme, /data\/exercises\.json/);
  ['id', 'name_he', 'muscle_group', 'sets_reps', 'equipment', 'steps_he', 'source_url', 'creator', 'poster'].forEach(function (field) {
    assert.match(readme, new RegExp('`' + field + '`'));
  });
  assert.match(readme, /node scripts\/validate-exercises\.js/);
  assert.match(readme, /python scripts\/validate_exercises\.py/);
  assert.match(readme, /לא ממוין/);
});

test('the node and python validators both accept the seed file', function () {
  const node = spawnSync(process.execPath, ['scripts/validate-exercises.js'], { cwd: root, encoding: 'utf8' });
  assert.equal(node.status, 0, node.stderr);
  assert.match(node.stdout, /79 exercises/);
  const py = spawnSync('python3', ['scripts/validate_exercises.py'], { cwd: root, encoding: 'utf8' });
  assert.equal(py.status, 0, py.stderr || py.stdout);
  assert.match(py.stdout, /79 exercises/);
});
