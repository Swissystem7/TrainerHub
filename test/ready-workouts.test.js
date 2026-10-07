const test = require('node:test');
const assert = require('node:assert');
const THIngest = require('../js/ingest.js');

let ReadyWorkouts;
try {
  ReadyWorkouts = require('../js/ready-workouts.js');
} catch (e) {
  ReadyWorkouts = null;
}

let readyWorkoutsJson;
try {
  readyWorkoutsJson = require('../js/ready-workouts.json');
} catch (e) {
  readyWorkoutsJson = null;
}

function getExerciseCount(workout) {
  if (!workout) return 0;
  if (Array.isArray(workout)) return workout.length;
  if (Array.isArray(workout.exercises)) return workout.exercises.length;
  if (Array.isArray(workout.items)) return workout.items.length;
  if (Array.isArray(workout.rounds)) {
    let count = 0;
    for (const r of workout.rounds) {
      if (Array.isArray(r.exercises)) count += r.exercises.length;
      else if (Array.isArray(r.items)) count += r.items.length;
      else count += 1;
    }
    return count;
  }
  return 0;
}

test('ready-workouts module loads, searches by Hebrew substring and converts to workout', () => {
  assert.ok(ReadyWorkouts, 'ReadyWorkouts module should exist and export API');
  assert.ok(readyWorkoutsJson, 'ready-workouts.json should exist and be loadable');
  assert.ok(Array.isArray(ReadyWorkouts.all), 'ReadyWorkouts.all should be an array');
  assert.strictEqual(ReadyWorkouts.all.length >= 2, true, 'ReadyWorkouts.all should have at least 2 entries');

  assert.strictEqual(typeof ReadyWorkouts.search, 'function', 'ReadyWorkouts.search should be a function');
  assert.strictEqual(typeof ReadyWorkouts.toWorkout, 'function', 'ReadyWorkouts.toWorkout should be a function');

  const searchResults = ReadyWorkouts.search('ליבה');
  assert.strictEqual(searchResults.length, 1, 'search should find exactly one entry for "ליבה"');
  assert.ok(searchResults[0].title.includes('ליבה'), 'matching entry title should include "ליבה"');

  const entry = searchResults[0];
  assert.ok(entry.text, 'entry should have text property');

  const directIngest = THIngest.ingestText(entry.text);
  assert.ok(directIngest, 'THIngest.ingestText should return a parsed workout');
  const directCount = getExerciseCount(directIngest);
  assert.strictEqual(directCount >= 3, true, `ingestText must yield at least 3 exercises, got ${directCount}`);

  const workout = ReadyWorkouts.toWorkout(entry);
  assert.ok(workout, 'toWorkout should return a parsed workout');
  const workoutCount = getExerciseCount(workout);
  assert.strictEqual(workoutCount >= 3, true, `toWorkout must yield at least 3 exercises, got ${workoutCount}`);

  const searchResults2 = ReadyWorkouts.search('בוקר');
  assert.strictEqual(searchResults2.length, 1, 'search should find second entry for "בוקר"');
  assert.ok(searchResults2[0].title.includes('בוקר'), 'second entry title should include "בוקר"');
  const directIngest2 = THIngest.ingestText(searchResults2[0].text);
  assert.strictEqual(getExerciseCount(directIngest2) >= 3, true, 'second entry should yield at least 3 exercises');
});
