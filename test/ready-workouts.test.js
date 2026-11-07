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

test('search with null, undefined, empty string or whitespace returns shallow clone of all entries without mutating library.all', () => {
  const lib = ReadyWorkouts.createReadyWorkouts(FIXTURE);
  const originalLength = lib.all.length;

  for (const emptyQuery of [null, undefined, '', '   ', '\t\n ']) {
    const results = lib.search(emptyQuery);
    assert.strictEqual(Array.isArray(results), true);
    assert.strictEqual(results.length, originalLength);
    assert.deepStrictEqual(results, FIXTURE);
    assert.notStrictEqual(results, lib.all);

    results.push({ title: 'dummy', text: 'dummy' });
    assert.strictEqual(lib.all.length, originalLength);
  }
});

test('search with non-string queries returns empty array', () => {
  const lib = ReadyWorkouts.createReadyWorkouts(FIXTURE);
  const nonStringQueries = [123, true, false, {}, [], () => {}, Symbol('test')];

  for (const q of nonStringQueries) {
    const results = lib.search(q);
    assert.deepStrictEqual(results, []);
  }
});

test('search performs case-insensitive matching for non-Hebrew / mixed-case queries and returns [] when nothing matches', () => {
  const mixedFixture = [
    { title: 'HIIT Cardio Blast', text: '3 סבבים: 20 סקוואטים' },
    { title: 'Full Body Tabata', text: '4 סבבים: 10 שכיבות סמיכה' },
    { title: 'אימון כוח', text: '3 סבבים: 15 סקוואטים' }
  ];
  const lib = ReadyWorkouts.createReadyWorkouts(mixedFixture);

  for (const query of ['hiit', 'HIIT', 'HiIt', '  hIiT  ', 'cArDiO', 'tabata', 'TABATA']) {
    const res = lib.search(query);
    assert.strictEqual(res.length, 1);
    assert.ok(res[0].title.toLowerCase().includes(query.trim().toLowerCase()));
  }

  const noMatch = lib.search('Pilates NonExistent');
  assert.deepStrictEqual(noMatch, []);
});

test('search gracefully handles entries that are null, undefined, or lack a string title', () => {
  const malformedEntries = [
    null,
    undefined,
    {},
    { text: 'רק טקסט ללא כותרת' },
    { title: null, text: 'כותרת null' },
    { title: 12345, text: 'כותרת מספר' },
    { title: { name: 'אובייקט' }, text: 'כותרת אובייקט' },
    { title: 'אימון תקין לחלוטין', text: '3 סבבים: 20 סקוואטים' }
  ];
  const lib = ReadyWorkouts.createReadyWorkouts(malformedEntries);

  assert.doesNotThrow(() => {
    const results = lib.search('תקין');
    assert.strictEqual(results.length, 1);
    assert.strictEqual(results[0].title, 'אימון תקין לחלוטין');
  });

  assert.doesNotThrow(() => {
    const resultsNoMatch = lib.search('שום דבר');
    assert.deepStrictEqual(resultsNoMatch, []);
  });
});

test('createReadyWorkouts initializes safely when passed null, undefined, or non-array values', () => {
  const invalidInputs = [null, undefined, 123, 'not an array', {}, true, () => {}];

  for (const input of invalidInputs) {
    const lib = ReadyWorkouts.createReadyWorkouts(input);
    assert.ok(lib);
    assert.ok(Array.isArray(lib.all));
    assert.strictEqual(lib.all.length, 0);
    assert.deepStrictEqual(lib.search(), []);
    assert.deepStrictEqual(lib.search('אימון'), []);
    assert.strictEqual(typeof lib.toWorkout, 'function');
  }
});

test('toWorkout safely returns emptyWorkout schema for null, undefined, empty object, or entry without text', () => {
  const lib = ReadyWorkouts.createReadyWorkouts(FIXTURE);
  const expectedEmptySchema = {
    title: '',
    duration_minutes: 0,
    participants: 0,
    equipment: [],
    phases: [],
    intensity: '',
    tags: []
  };

  const emptyInputs = [
    null,
    undefined,
    {},
    { title: 'ריק' },
    { title: 'ללא טקסט', text: '' },
    { title: 'טקסט null', text: null }
  ];

  for (const input of emptyInputs) {
    const result = lib.toWorkout(input);
    assert.deepStrictEqual(result, expectedEmptySchema);
  }
});

test('toWorkout delegates to THIngest.ingestText when passed a plain text string instead of entry object', () => {
  const lib = ReadyWorkouts.createReadyWorkouts(FIXTURE);
  const plainText = '3 סבבים: 20 סקוואטים';

  const workout = lib.toWorkout(plainText);
  const expectedWorkout = THIngest.ingestText(plainText);

  assert.ok(workout);
  assert.deepStrictEqual(workout, expectedWorkout);
  assert.strictEqual(exerciseCount(workout) >= 1, true);
});
