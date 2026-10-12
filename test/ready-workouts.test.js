const test = require('node:test');
const assert = require('node:assert');
const THIngest = require('../js/ingest.js');
const TH = require('../js/core.js');

const ReadyWorkouts = require('../js/ready-workouts.js');
const readyWorkoutsJson = require('../js/ready-workouts.json');

const FIXTURE = [
  {
    title: 'אימון כוח וליבה',
    text: '3 סבבים: 40 שניות פלאנק, 15 שכיבות סמיכה, 20 סקוואטים, מנוחה 2 דקות'
  },
  {
    title: 'אימון בוקר מהיר',
    text: '3 סבבים: 30 שניות פלאנק, 12 שכיבות סמיכה, 20 סקוואטים, מנוחה 2 דקות'
  }
];

function exerciseCount(ingestResult) {
  if (!ingestResult) return 0;
  if (Array.isArray(ingestResult.exercises)) return ingestResult.exercises.length;
  const workout = ingestResult.workout || ingestResult;
  if (Array.isArray(workout.exercises)) return workout.exercises.length;
  if (Array.isArray(workout.phases)) {
    let count = 0;
    for (const ph of workout.phases) {
      if (ph && Array.isArray(ph.exercises)) count += ph.exercises.length;
    }
    return count;
  }
  return 0;
}

test('ready-workouts module loads fixture, searches by Hebrew substring and converts to workout', () => {
  assert.strictEqual(typeof ReadyWorkouts.createReadyWorkouts, 'function');
  const lib = ReadyWorkouts.createReadyWorkouts(FIXTURE);

  assert.ok(Array.isArray(lib.all));
  assert.strictEqual(lib.all.length, FIXTURE.length);

  assert.strictEqual(typeof lib.search, 'function');
  assert.strictEqual(typeof lib.toWorkout, 'function');

  const searchResults = lib.search('ליבה');
  assert.strictEqual(searchResults.length, 1);
  assert.ok(searchResults[0].title.includes('ליבה'));

  const entry = searchResults[0];
  assert.ok(entry.text);

  const directIngest = THIngest.ingestText(entry.text);
  assert.ok(directIngest);
  assert.strictEqual(exerciseCount(directIngest) >= 3, true);

  const workout = lib.toWorkout(entry);
  assert.ok(workout);
  assert.strictEqual(exerciseCount(workout) >= 3, true);

  const searchResults2 = lib.search('בוקר');
  assert.strictEqual(searchResults2.length, 1);
  assert.ok(searchResults2[0].title.includes('בוקר'));
  assert.strictEqual(exerciseCount(THIngest.ingestText(searchResults2[0].text)) >= 3, true);
});

test('production ready-workouts.json has 46 programs and each ingests to at least three exercises', () => {
  assert.ok(Array.isArray(readyWorkoutsJson));
  assert.strictEqual(readyWorkoutsJson.length, 46);
  assert.strictEqual(ReadyWorkouts.all.length, 46);

  for (const entry of readyWorkoutsJson) {
    assert.ok(entry && typeof entry.title === 'string' && entry.title.length > 0, 'title required');
    assert.ok(typeof entry.text === 'string' && entry.text.length > 0, 'text required');
    const parsed = THIngest.ingestText(entry.text);
    const count = exerciseCount(parsed);
    assert.strictEqual(
      count >= 3,
      true,
      `"${entry.title}" should yield at least 3 exercises, got ${count}`
    );
  }
});

test('core exposes the ready workouts module for the workout engine', () => {
  assert.ok(TH.readyWorkouts);
  assert.strictEqual(TH.readyWorkouts.all.length, 46);
  assert.strictEqual(typeof TH.readyWorkouts.search, 'function');
  assert.strictEqual(typeof TH.readyWorkouts.toWorkout, 'function');
});
