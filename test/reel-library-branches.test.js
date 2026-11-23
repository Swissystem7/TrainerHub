const test = require('node:test');
const assert = require('node:assert/strict');
const THReels = require('../js/reel-library.js');

const REQUIRED_KEYS = [
  'id',
  'name_he',
  'muscle_group',
  'secondary_group',
  'muscle_detail',
  'sets',
  'reps',
  'sets_reps',
  'equipment',
  'steps_he',
  'source_url',
  'creator',
  'poster',
  'equipment_tags',
  'verified',
  'source_title',
  'source_muscle_group',
  'source_muscle_label',
  'source_sets_reps',
  'source_notes'
];

function validExercise(overrides) {
  const code = overrides?.id?.startsWith('ig-') ? overrides.id.slice(3) : 'ValidCode1';
  const base = {
    id: `ig-${code}`,
    name_he: 'תרגיל בדיקה',
    muscle_group: 'ליבה',
    secondary_group: '',
    muscle_detail: '',
    sets: 3,
    reps: '12',
    sets_reps: '3x12',
    equipment: 'מזרן',
    steps_he: ['שלב א', 'שלב ב', 'שלב ג'],
    source_url: `https://www.instagram.com/reel/${code}/`,
    creator: 'coach',
    poster: `assets/posters/${code}.jpg`,
    equipment_tags: ['mat'],
    verified: false,
    source_title: 'מקור',
    source_muscle_group: 'ליבה',
    source_muscle_label: 'ליבה',
    source_sets_reps: '3x12',
    source_notes: ''
  };
  return Object.assign(base, overrides || {});
}

function validLibrary(exercises) {
  return {
    schema_version: 1,
    muscle_groups: THReels.MUSCLE_GROUPS.slice(),
    unknown_muscle_group: 'לא ממוין',
    unknown_sets_reps: 'לא ממוין',
    unclassified_name_he: 'ריל לא ממוין',
    exercises: exercises || [validExercise()]
  };
}

function expectError(errors, fragment) {
  assert.ok(
    errors.some((line) => line.indexOf(fragment) !== -1),
    `Expected "${fragment}" in errors: ${JSON.stringify(errors)}`
  );
}

function memoryStore() {
  const mem = {};
  return {
    get: (key, fallback) => (Object.hasOwn(mem, key) ? mem[key] : fallback),
    set: (key, val) => {
      mem[key] = val;
      return true;
    }
  };
}

test('validateLibrary rejects invalid top-level schema and structure', () => {
  expectError(THReels.validateLibrary(null).errors, 'הקובץ חייב להיות אובייקט');
  expectError(THReels.validateLibrary('string').errors, 'הקובץ חייב להיות אובייקט');
  expectError(THReels.validateLibrary([]).errors, 'הקובץ חייב להיות אובייקט');

  const badVersion = validLibrary();
  badVersion.schema_version = 2;
  expectError(THReels.validateLibrary(badVersion).errors, 'schema_version');

  const badGroups = validLibrary();
  badGroups.muscle_groups = 'not an array';
  expectError(THReels.validateLibrary(badGroups).errors, 'muscle_groups: חייב להיות מערך');

  const missingGroup = validLibrary();
  missingGroup.muscle_groups = ['ליבה'];
  expectError(THReels.validateLibrary(missingGroup).errors, 'חסרה קבוצה');

  const badUnknownMuscle = validLibrary();
  badUnknownMuscle.unknown_muscle_group = 'wrong';
  expectError(THReels.validateLibrary(badUnknownMuscle).errors, 'unknown_muscle_group');

  const badUnknownSets = validLibrary();
  badUnknownSets.unknown_sets_reps = 'wrong';
  expectError(THReels.validateLibrary(badUnknownSets).errors, 'unknown_sets_reps');

  const badUnclassifiedName = validLibrary();
  badUnclassifiedName.unclassified_name_he = 'wrong';
  expectError(THReels.validateLibrary(badUnclassifiedName).errors, 'unclassified_name_he');

  const emptyEx = validLibrary([]);
  expectError(THReels.validateLibrary(emptyEx).errors, 'exercises: חייב להיות מערך לא ריק');

  const notArrayEx = validLibrary();
  notArrayEx.exercises = 'not-array';
  expectError(THReels.validateLibrary(notArrayEx).errors, 'exercises: חייב להיות מערך לא ריק');
});

test('validateLibrary validates exercise fields thoroughly', () => {
  const nonObjEx = validLibrary([null, 123]);
  expectError(THReels.validateLibrary(nonObjEx).errors, 'exercises[0]: חייב להיות אובייקט');
  expectError(THReels.validateLibrary(nonObjEx).errors, 'exercises[1]: חייב להיות אובייקט');

  REQUIRED_KEYS.forEach((key) => {
    const ex = validExercise();
    delete ex[key];
    expectError(THReels.validateLibrary(validLibrary([ex])).errors, `exercises[0].${key}: שדה חסר`);
  });

  // id & duplicate
  expectError(
    THReels.validateLibrary(validLibrary([validExercise({ id: 'bad-id', source_url: 'https://example.com' })])).errors,
    'exercises[0].id'
  );
  expectError(
    THReels.validateLibrary(validLibrary([validExercise({ id: '', source_url: 'https://example.com' })])).errors,
    'exercises[0].id'
  );
  const dupes = validLibrary([validExercise({ id: 'ig-Duplicate1' }), validExercise({ id: 'ig-Duplicate1' })]);
  expectError(THReels.validateLibrary(dupes).errors, 'מזהה כפול');

  // source_url: reel vs post vs invalid
  expectError(
    THReels.validateLibrary(validLibrary([validExercise({ source_url: 'https://example.com' })])).errors,
    'source_url'
  );
  const postEx = validExercise({ source_url: 'https://www.instagram.com/p/ValidCode1/' });
  assert.equal(THReels.validateLibrary(validLibrary([postEx])).ok, true);

  // creator
  expectError(THReels.validateLibrary(validLibrary([validExercise({ creator: 123 })])).errors, 'creator');
  expectError(THReels.validateLibrary(validLibrary([validExercise({ creator: '   ' })])).errors, 'creator');
  expectError(THReels.validateLibrary(validLibrary([validExercise({ creator: '@coach' })])).errors, 'creator');
  expectError(THReels.validateLibrary(validLibrary([validExercise({ creator: 'coach space' })])).errors, 'creator');

  // muscle_group
  expectError(
    THReels.validateLibrary(validLibrary([validExercise({ muscle_group: 'לא קיים' })])).errors,
    'muscle_group'
  );

  // secondary_group
  expectError(
    THReels.validateLibrary(validLibrary([validExercise({ secondary_group: 123 })])).errors,
    'secondary_group: מחרוזת'
  );
  expectError(
    THReels.validateLibrary(validLibrary([validExercise({ secondary_group: 'לא קיים' })])).errors,
    'secondary_group: קבוצה לא מוכרת'
  );
  expectError(
    THReels.validateLibrary(validLibrary([validExercise({ muscle_group: 'ליבה', secondary_group: 'ליבה' })])).errors,
    'secondary_group: חוזר על קבוצת השריר הראשית'
  );

  // muscle_detail & source_muscle_label
  expectError(
    THReels.validateLibrary(validLibrary([validExercise({ muscle_detail: 123 })])).errors,
    'muscle_detail: מחרוזת'
  );
  expectError(
    THReels.validateLibrary(validLibrary([validExercise({ source_muscle_label: 123 })])).errors,
    'source_muscle_label: מחרוזת'
  );

  // sets & reps & sets_reps
  expectError(
    THReels.validateLibrary(validLibrary([validExercise({ sets: 0 })])).errors,
    'sets: מספר שלם חיובי או null'
  );
  expectError(
    THReels.validateLibrary(validLibrary([validExercise({ sets: -1 })])).errors,
    'sets: מספר שלם חיובי או null'
  );
  expectError(
    THReels.validateLibrary(validLibrary([validExercise({ sets: 2.5 })])).errors,
    'sets: מספר שלם חיובי או null'
  );
  expectError(THReels.validateLibrary(validLibrary([validExercise({ reps: 10 })])).errors, 'reps: מחרוזת');
  expectError(
    THReels.validateLibrary(validLibrary([validExercise({ sets_reps: 10 })])).errors,
    'sets_reps: מחרוזת לא ריקה'
  );
  expectError(
    THReels.validateLibrary(validLibrary([validExercise({ sets_reps: '   ' })])).errors,
    'sets_reps: מחרוזת לא ריקה'
  );

  // equipment & name_he
  expectError(THReels.validateLibrary(validLibrary([validExercise({ equipment: 123 })])).errors, 'equipment: מחרוזת');
  expectError(THReels.validateLibrary(validLibrary([validExercise({ name_he: 123 })])).errors, 'name_he: שם בעברית');
  expectError(THReels.validateLibrary(validLibrary([validExercise({ name_he: '   ' })])).errors, 'name_he: שם בעברית');

  // steps_he
  expectError(
    THReels.validateLibrary(validLibrary([validExercise({ steps_he: 'not array' })])).errors,
    'steps_he: מערך מחרוזות לא ריקות'
  );
  expectError(
    THReels.validateLibrary(validLibrary([validExercise({ steps_he: [123] })])).errors,
    'steps_he: מערך מחרוזות לא ריקות'
  );
  expectError(
    THReels.validateLibrary(validLibrary([validExercise({ steps_he: ['  '] })])).errors,
    'steps_he: מערך מחרוזות לא ריקות'
  );

  // poster & poster_uncertain
  expectError(THReels.validateLibrary(validLibrary([validExercise({ poster: 123 })])).errors, 'poster: נתיב יחסי');
  expectError(
    THReels.validateLibrary(validLibrary([validExercise({ poster: '../escaped.jpg' })])).errors,
    'poster: נתיב יחסי'
  );
  expectError(
    THReels.validateLibrary(validLibrary([validExercise({ poster: '/root.jpg' })])).errors,
    'poster: נתיב יחסי'
  );
  expectError(
    THReels.validateLibrary(validLibrary([validExercise({ poster: 'http://example.com/p.jpg' })])).errors,
    'poster: נתיב יחסי'
  );
  expectError(
    THReels.validateLibrary(validLibrary([validExercise({ poster_uncertain: 'not-bool' })])).errors,
    'poster_uncertain: בוליאני'
  );
  expectError(
    THReels.validateLibrary(validLibrary([validExercise({ poster: '', poster_uncertain: true })])).errors,
    'איור לא ודאי דורש קובץ פוסטר'
  );

  // equipment_tags
  expectError(
    THReels.validateLibrary(validLibrary([validExercise({ equipment_tags: 'not-array' })])).errors,
    'equipment_tags'
  );
  expectError(
    THReels.validateLibrary(validLibrary([validExercise({ equipment_tags: ['invalid_tag'] })])).errors,
    'equipment_tags'
  );

  // verified
  expectError(THReels.validateLibrary(validLibrary([validExercise({ verified: 'yes' })])).errors, 'verified: בוליאני');

  // string source fields
  ['source_title', 'source_muscle_group', 'source_sets_reps', 'source_notes'].forEach((key) => {
    const ex = validExercise({ [key]: 123 });
    expectError(THReels.validateLibrary(validLibrary([ex])).errors, `${key}: מחרוזת`);
  });

  // safety_he & difficulty
  expectError(THReels.validateLibrary(validLibrary([validExercise({ safety_he: 123 })])).errors, 'safety_he: מחרוזת');
  expectError(THReels.validateLibrary(validLibrary([validExercise({ difficulty: 0 })])).errors, 'difficulty');
  expectError(THReels.validateLibrary(validLibrary([validExercise({ difficulty: 4 })])).errors, 'difficulty');
  expectError(THReels.validateLibrary(validLibrary([validExercise({ difficulty: '2' })])).errors, 'difficulty');

  // alternatives
  expectError(
    THReels.validateLibrary(validLibrary([validExercise({ alternatives: 'not-array' })])).errors,
    'alternatives: מערך של עד 2 מזהים'
  );
  expectError(
    THReels.validateLibrary(validLibrary([validExercise({ alternatives: ['a', 'b', 'c'] })])).errors,
    'alternatives: מערך של עד 2 מזהים'
  );
  expectError(
    THReels.validateLibrary(validLibrary([validExercise({ alternatives: ['missing-id'] })])).errors,
    'מזהה לא קיים בספרייה'
  );
  expectError(
    THReels.validateLibrary(validLibrary([validExercise({ id: 'ig-Self', alternatives: ['ig-Self'] })])).errors,
    'מזהה לא קיים בספרייה'
  );
  const diffGroupAlt = validLibrary([
    validExercise({ id: 'ig-ExA', muscle_group: 'ליבה', alternatives: ['ig-ExB'] }),
    validExercise({ id: 'ig-ExB', muscle_group: 'גב' })
  ]);
  expectError(THReels.validateLibrary(diffGroupAlt).errors, 'חלופה מקבוצת שריר אחרת');

  const goodAlt = validLibrary([
    validExercise({ id: 'ig-Ex1', muscle_group: 'ליבה', alternatives: ['ig-Ex2'] }),
    validExercise({ id: 'ig-Ex2', muscle_group: 'ליבה' })
  ]);
  assert.equal(THReels.validateLibrary(goodAlt).ok, true);
});

test('validateLibrary checks verified rules and unclassified rules', () => {
  // Verified exercises require: 3-5 steps, non-empty safety_he, difficulty 1-3, title, and name != UNCLASSIFIED_NAME
  const verifiedBadSteps = validExercise({
    verified: true,
    steps_he: ['א', 'ב'],
    safety_he: 'דגש',
    difficulty: 2
  });
  expectError(THReels.validateLibrary(validLibrary([verifiedBadSteps])).errors, 'תרגיל מאומת דורש 3–5 שלבי ביצוע');

  const verifiedBadSafety = validExercise({
    verified: true,
    steps_he: ['א', 'ב', 'ג'],
    safety_he: '   ',
    difficulty: 2
  });
  expectError(THReels.validateLibrary(validLibrary([verifiedBadSafety])).errors, 'תרגיל מאומת דורש דגש בטיחות');

  const verifiedBadDiff = validExercise({
    verified: true,
    steps_he: ['א', 'ב', 'ג'],
    safety_he: 'דגש',
    difficulty: null
  });
  expectError(THReels.validateLibrary(validLibrary([verifiedBadDiff])).errors, 'תרגיל מאומת דורש רמת קושי 1–3');

  const verifiedUnclassified = validExercise({
    verified: true,
    name_he: 'ריל לא ממוין',
    steps_he: ['א', 'ב', 'ג'],
    safety_he: 'דגש',
    difficulty: 2
  });
  expectError(THReels.validateLibrary(validLibrary([verifiedUnclassified])).errors, 'אימות דורש שם ומקור');

  const verifiedNoTitle = validExercise({
    verified: true,
    source_title: '',
    steps_he: ['א', 'ב', 'ג'],
    safety_he: 'דגש',
    difficulty: 2
  });
  expectError(THReels.validateLibrary(validLibrary([verifiedNoTitle])).errors, 'אימות דורש שם ומקור');

  // Unverified with source_sets_reps containing לא מצוין
  const unverifiedWithSets = validExercise({
    verified: false,
    source_sets_reps: 'חזרות לא מצוין',
    sets: 3,
    reps: '10',
    sets_reps: '3x10'
  });
  const unvErrors = THReels.validateLibrary(validLibrary([unverifiedWithSets])).errors;
  expectError(unvErrors, '«לא מצוין» נשאר בלי סטים');
  expectError(unvErrors, '«לא מצוין» נשאר בלי חזרות');
  expectError(unvErrors, '«לא מצוין» מוצג כ«לא ממוין»');

  // Without source_title: must have name_he = UNCLASSIFIED_NAME, muscle_group = UNKNOWN_MUSCLE, sets null, reps '', etc.
  const noTitleWithDetails = validExercise({
    source_title: '',
    name_he: 'שם מותאם',
    muscle_group: 'חזה',
    sets: 2,
    reps: '5',
    sets_reps: '2x5',
    equipment: 'משקולת',
    steps_he: ['שלב']
  });
  const noTitleErrors = THReels.validateLibrary(validLibrary([noTitleWithDetails])).errors;
  expectError(noTitleErrors, 'בלי מקור השם נשאר');
  expectError(noTitleErrors, 'בלי מקור הקבוצה נשארת');
  expectError(noTitleErrors, 'בלי מקור לא ממלאים סטים, ציוד או שלבים');

  // Valid unclassified exercise
  const validUnclassified = validExercise({
    source_title: '',
    name_he: 'ריל לא ממוין',
    muscle_group: 'לא ממוין',
    sets: null,
    reps: '',
    sets_reps: 'לא ממוין',
    equipment: '',
    steps_he: []
  });
  assert.equal(THReels.validateLibrary(validLibrary([validUnclassified])).ok, true);
});

test('search and filtering edge cases', () => {
  const ex1 = validExercise({
    id: 'ig-Ex1',
    name_he: 'סופרמן',
    secondary_group: 'גב · מוביליטי',
    muscle_detail: 'גב תחתון'
  });
  const ex2 = validExercise({
    id: 'ig-Ex2',
    name_he: 'פלאנק מלא',
    muscle_group: 'ליבה'
  });
  const ex3 = validExercise({
    id: 'ig-Ex3',
    name_he: 'תרגיל plank',
    muscle_group: 'ליבה'
  });

  // filterExercises null / empty inputs
  assert.deepEqual(THReels.filterExercises(null), []);
  assert.deepEqual(THReels.filterExercises([null, ex1]), [ex1]);

  // filter by muscle & secondary_group
  assert.equal(THReels.filterExercises([ex1, ex2], { muscle: 'גב' }).length, 1);
  assert.equal(THReels.filterExercises([ex1, ex2], { muscle: 'מוביליטי' }).length, 1);
  assert.equal(THReels.filterExercises([ex1, ex2], { muscle: 'חזה' }).length, 0);

  // aliases: סופרמן <-> superman
  assert.equal(THReels.filterExercises([ex1], { query: 'superman' }).length, 1);
  assert.equal(THReels.filterExercises([ex1], { query: 'סופרמן' }).length, 1);
  // plank <-> פלאנק / פלנק
  assert.equal(THReels.filterExercises([ex2], { query: 'plank' }).length, 1);
  assert.equal(THReels.filterExercises([ex3], { query: 'פלנק' }).length, 1);
  assert.equal(THReels.filterExercises([ex3], { query: 'פלאנק' }).length, 1);

  // query with whitespace or punctuation
  assert.equal(THReels.filterExercises([ex2], { query: '  פלאנק   ' }).length, 1);
  assert.equal(THReels.filterExercises([ex2], { query: 'פלאנק!' }).length, 1);

  // displayName
  assert.equal(THReels.displayName(null), '');
  assert.equal(THReels.displayName({}), 'ריל לא ממוין');
  assert.equal(THReels.displayName({ name_he: 'ריל לא ממוין' }), 'ריל לא ממוין');
  assert.equal(THReels.displayName({ name_he: 'שכיבות סמיכה' }), 'שכיבות סמיכה');
});

test('draft management and manipulation functions', () => {
  const d0 = THReels.emptyDraft('אימון כוח');
  assert.equal(d0.title, 'אימון כוח');
  assert.deepEqual(d0.items, []);

  const dEmpty = THReels.emptyDraft();
  assert.equal(dEmpty.title, '');

  // addToDraft guards
  assert.deepEqual(THReels.addToDraft(null, null).items, []);
  assert.deepEqual(THReels.addToDraft(null, { name_he: 'ללא מזהה' }).items, []);
  assert.deepEqual(THReels.addToDraft(null, { id: 'ig-Insp', muscle_group: 'השראה' }).items, []);

  // addToDraft normal
  const exA = validExercise({ id: 'ig-A', muscle_group: 'ליבה', sets: 4, reps: '12' });
  const exB = validExercise({ id: 'ig-B', muscle_group: 'ליבה', sets: null, reps: '' });
  const exC = validExercise({ id: 'ig-C', muscle_group: 'חזה' });

  let draft = THReels.addToDraft(null, exA);
  assert.equal(draft.items.length, 1);
  assert.equal(draft.items[0].exerciseId, 'ig-A');
  assert.equal(draft.items[0].sets, 4);

  // duplicate addition is ignored
  draft = THReels.addToDraft(draft, exA);
  assert.equal(draft.items.length, 1);

  draft = THReels.addToDraft(draft, exB);
  draft = THReels.addToDraft(draft, exC);
  assert.equal(draft.items.length, 3);

  // updateDraftItem
  // non-matching id leaves draft unchanged
  assert.equal(THReels.updateDraftItem(draft, 'non-existent', { sets: 5 }).items[0].sets, 4);

  // sets patch
  let updated = THReels.updateDraftItem(draft, 'ig-A', { sets: null });
  assert.equal(updated.items[0].sets, null);
  updated = THReels.updateDraftItem(draft, 'ig-A', { sets: '' });
  assert.equal(updated.items[0].sets, null);
  updated = THReels.updateDraftItem(draft, 'ig-A', { sets: 5 });
  assert.equal(updated.items[0].sets, 5);
  updated = THReels.updateDraftItem(draft, 'ig-A', { sets: '6' });
  assert.equal(updated.items[0].sets, 6);
  // invalid sets keep old value
  updated = THReels.updateDraftItem(draft, 'ig-A', { sets: -2 });
  assert.equal(updated.items[0].sets, 4);
  updated = THReels.updateDraftItem(draft, 'ig-A', { sets: 2.7 });
  assert.equal(updated.items[0].sets, 4);

  // reps patch
  updated = THReels.updateDraftItem(draft, 'ig-A', { reps: null });
  assert.equal(updated.items[0].reps, '');
  updated = THReels.updateDraftItem(draft, 'ig-A', { reps: '15' });
  assert.equal(updated.items[0].reps, '15');

  // removeFromDraft
  assert.deepEqual(THReels.removeFromDraft(null, 'ig-A').items, []);
  const removed = THReels.removeFromDraft(draft, 'ig-A');
  assert.equal(removed.items.length, 2);
  assert.equal(removed.items[0].exerciseId, 'ig-B');

  // moveDraftItem
  assert.equal(THReels.moveDraftItem(null, 'ig-B', 1).items.length, 0);
  assert.equal(THReels.moveDraftItem(draft, 'missing', 1).items[0].exerciseId, 'ig-A');
  assert.equal(THReels.moveDraftItem(draft, 'ig-A', -1).items[0].exerciseId, 'ig-A'); // boundary
  assert.equal(THReels.moveDraftItem(draft, 'ig-C', 1).items[2].exerciseId, 'ig-C'); // boundary
  const movedItem = THReels.moveDraftItem(draft, 'ig-A', 1);
  assert.equal(movedItem.items[0].exerciseId, 'ig-B');
  assert.equal(movedItem.items[1].exerciseId, 'ig-A');

  // moveDraftInSection
  assert.equal(THReels.moveDraftInSection(null, 'ig-A', 1).items.length, 0);
  assert.equal(THReels.moveDraftInSection(draft, 'missing', 1).items[0].exerciseId, 'ig-A');
  assert.equal(THReels.moveDraftInSection(draft, 'ig-A', -1).items[0].exerciseId, 'ig-A'); // boundary
  assert.equal(THReels.moveDraftInSection(draft, 'ig-B', 1).items[1].exerciseId, 'ig-B'); // boundary
  const movedSection = THReels.moveDraftInSection(draft, 'ig-A', 1);
  assert.equal(movedSection.items[0].exerciseId, 'ig-B');
  assert.equal(movedSection.items[1].exerciseId, 'ig-A');

  // insertDraftItem
  assert.equal(THReels.insertDraftItem(null, 'ig-A', 'ig-B').items.length, 0);
  assert.equal(THReels.insertDraftItem(draft, 'missing', 'ig-B').items[0].exerciseId, 'ig-A');
  assert.equal(THReels.insertDraftItem(draft, 'ig-A', 'missing').items[0].exerciseId, 'ig-A');
  assert.equal(THReels.insertDraftItem(draft, 'ig-A', 'ig-A').items[0].exerciseId, 'ig-A');
  assert.equal(THReels.insertDraftItem(draft, 'ig-A', 'ig-C').items[0].exerciseId, 'ig-A'); // different muscle group
  const inserted = THReels.insertDraftItem(draft, 'ig-B', 'ig-A');
  assert.equal(inserted.items[0].exerciseId, 'ig-B');
  assert.equal(inserted.items[1].exerciseId, 'ig-A');

  // draftSections & groupByMuscle
  assert.deepEqual(THReels.draftSections(null), []);
  const sections = THReels.draftSections(draft);
  assert.equal(sections.length, 2);
  assert.equal(sections[0].muscle, 'ליבה');
  assert.equal(sections[0].items.length, 2);

  assert.deepEqual(THReels.groupByMuscle(null), []);
  assert.deepEqual(THReels.groupByMuscle([null, { muscle_group: 'לא קיים' }]), []);
});

test('draft conversion: draftToWorkout, toPhasesWorkout, toDailyProgram', () => {
  // draftToWorkout
  const defaultW = THReels.draftToWorkout(null);
  assert.equal(defaultW.title, 'אימון מהספרייה');
  assert.ok(defaultW.id.startsWith('rw_'));
  assert.ok(defaultW.savedAt);
  assert.deepEqual(defaultW.exercises, []);

  const d = THReels.addToDraft(null, validExercise({ id: 'ig-1', name_he: 'תרגיל' }));
  const customW = THReels.draftToWorkout(d, { title: 'אימון אישי', id: 'my-id', savedAt: '2026-01-01T00:00:00Z' });
  assert.equal(customW.title, 'אימון אישי');
  assert.equal(customW.id, 'my-id');
  assert.equal(customW.savedAt, '2026-01-01T00:00:00Z');
  assert.equal(customW.exercises.length, 1);

  // toPhasesWorkout
  const phasesDefault = THReels.toPhasesWorkout(null);
  assert.equal(phasesDefault.title, 'אימון מהספרייה');
  assert.equal(phasesDefault.duration_minutes, 20);
  assert.equal(phasesDefault.phases.length, 3);
  assert.equal(phasesDefault.phases[1].exercises.length, 0);

  const customWorkout = {
    title: 'אימון',
    exercises: [
      {
        exerciseId: 'ig-1',
        name_he: '',
        sets: null,
        reps: '',
        creator: 'coach',
        source_url: 'http://reel',
        steps_he: ['א', 'ב']
      },
      { exerciseId: 'ig-2', name_he: 'תרגיל 2', sets: 3, reps: '10', creator: '', source_url: '', steps_he: [] }
    ]
  };
  const phases = THReels.toPhasesWorkout(customWorkout);
  assert.equal(phases.phases[1].exercises[0].name, 'ריל לא ממוין');
  assert.equal(phases.phases[1].exercises[0].notes, '@coach · http://reel · א · ב');
  assert.equal(phases.phases[1].exercises[1].name, 'תרגיל 2');
  assert.equal(phases.phases[1].exercises[1].notes, null);

  // toDailyProgram
  assert.deepEqual(THReels.toDailyProgram(null).dailyWorkouts, []);
  assert.deepEqual(THReels.toDailyProgram([null, { exercises: [] }]).dailyWorkouts, []);

  const daily = THReels.toDailyProgram([
    { title: 'יום א', exercises: [{ exerciseId: 'ig-1', name_he: 'תרגיל', sets: 3, reps: '10', source_url: 'url' }] },
    { title: '', exercises: [{ exerciseId: 'ig-2' }] }
  ]);
  assert.equal(daily.dailyWorkouts.length, 2);
  assert.equal(daily.dailyWorkouts[0].title, 'יום א');
  assert.equal(daily.dailyWorkouts[1].title, 'אימון 2');
  assert.equal(daily.dailyWorkouts[1].exercises[0].name, 'ריל לא ממוין');
});

test('store functions with injected store and fallback', () => {
  const store = memoryStore();

  // Workouts CRUD
  assert.deepEqual(THReels.loadWorkouts(store), []);
  assert.equal(THReels.saveWorkouts([null, {}, { id: 'w1', exercises: [] }], store), true);
  assert.equal(THReels.loadWorkouts(store).length, 1);

  assert.equal(THReels.upsertWorkout(null, store).length, 1);
  assert.equal(THReels.upsertWorkout({ id: 'w2', exercises: [] }, store).length, 2);
  assert.equal(THReels.upsertWorkout({ id: 'w1', exercises: [{ exerciseId: 'ig-1' }] }, store).length, 2);
  assert.equal(THReels.loadWorkouts(store)[0].exercises.length, 1);

  assert.equal(THReels.removeWorkout('w1', store).length, 1);
  assert.equal(THReels.loadWorkouts(store)[0].id, 'w2');

  // Draft CRUD
  assert.deepEqual(THReels.loadDraft(store), THReels.emptyDraft());
  const draft = THReels.addToDraft(null, validExercise());
  THReels.saveDraft(draft, store);
  assert.equal(THReels.loadDraft(store).items.length, 1);
  THReels.clearDraft(store);
  assert.equal(THReels.loadDraft(store).items.length, 0);

  // Global TH.store integration
  const savedTH = globalThis.TH;
  try {
    globalThis.TH = { store: memoryStore() };
    assert.deepEqual(THReels.loadWorkouts(), []);
    THReels.saveWorkouts([{ id: 'g1', exercises: [] }]);
    assert.equal(THReels.loadWorkouts().length, 1);
  } finally {
    if (savedTH === undefined) delete globalThis.TH;
    else globalThis.TH = savedTH;
  }
});

test('posterUrl, posterSources and posterFrameHtml edge cases', () => {
  // posterUrl
  assert.equal(THReels.posterUrl(null), '');
  assert.equal(THReels.posterUrl({ poster: 'assets/posters/test.jpg' }), 'assets/posters/test.jpg');
  assert.equal(THReels.posterUrl({ poster: '../bad.jpg' }), '');
  assert.equal(THReels.posterUrl({ poster: 'http://example.com/p.jpg' }), '');
  assert.equal(THReels.posterUrl({ file: 'local.mp4' }), '');
  assert.equal(THReels.posterUrl({ youtubeId: 'AbCdEf12345' }), 'https://i.ytimg.com/vi/AbCdEf12345/hqdefault.jpg');
  assert.equal(
    THReels.posterUrl({ source_url: 'https://youtu.be/AbCdEf12345' }),
    'https://i.ytimg.com/vi/AbCdEf12345/hqdefault.jpg'
  );
  assert.equal(
    THReels.posterUrl({ file_id: 'ValidDriveId123' }),
    'https://drive.google.com/thumbnail?id=ValidDriveId123&sz=w480'
  );
  assert.equal(
    THReels.posterUrl({ driveId: 'ValidDriveId123' }),
    'https://drive.google.com/thumbnail?id=ValidDriveId123&sz=w480'
  );
  assert.equal(
    THReels.posterUrl({ id: 'drive-ValidDriveId123' }),
    'https://drive.google.com/thumbnail?id=ValidDriveId123&sz=w480'
  );

  // posterSources
  assert.deepEqual(THReels.posterSources({ youtubeId: 'AbCdEf12345' }), {
    primary: 'https://i.ytimg.com/vi/AbCdEf12345/hqdefault.jpg',
    secondary: ''
  });

  // posterFrameHtml
  const defaultFrame = THReels.posterFrameHtml(null);
  assert.match(defaultFrame, /poster-frame tone-unknown/);
  assert.match(defaultFrame, /poster-fallback/);

  const thumbFrame = THReels.posterFrameHtml({ muscle_group: 'חזה', poster_uncertain: true }, null, true);
  assert.match(thumbFrame, /is-thumb/);
  assert.match(thumbFrame, /uncertain-dot/);

  const indexFrame = THReels.posterFrameHtml({ muscle_group: 'ליבה', _index: 3, poster_uncertain: true });
  assert.match(indexFrame, /card-index/);
  assert.match(indexFrame, /03/);
  assert.match(indexFrame, /uncertain-flag/);
});

test('Drive integration and validation', () => {
  // driveFileIdOk, urls and labels
  assert.equal(THReels.drivePreviewUrl('FILE123'), 'https://drive.google.com/file/d/FILE123/preview');
  assert.equal(THReels.driveMuscleGroup(null), '');
  assert.equal(THReels.driveMuscleGroup({ folder: 'לא קשור' }), '');
  assert.equal(THReels.driveMuscleGroup({ folder: 'לבדיקה' }), '');
  assert.equal(THReels.driveMuscleGroup({ folder: 'בטן' }), 'ליבה');
  assert.equal(THReels.driveMuscleGroup({ folder: 'כושר/חזה' }), 'חזה');
  assert.equal(THReels.driveMuscleGroup({ folder: 'אחר', muscleGroup: 'גב' }), 'גב');
  assert.equal(THReels.driveMuscleGroup({ folder: 'תיקייה_לא_מוכרת', muscleGroup: '' }), 'לא ממוין');

  // validateDriveVideos
  expectError(THReels.validateDriveVideos(null).errors, 'הקובץ חייב להיות מערך');
  expectError(THReels.validateDriveVideos([null]).errors, '[0]: חייב להיות אובייקט');
  expectError(THReels.validateDriveVideos([{ fileId: 123 }]).errors, '.fileId: מחרוזת');
  expectError(
    THReels.validateDriveVideos([{ fileId: 'short', name: '', folder: '', muscleGroup: '' }]).errors,
    'מזהה Drive לא תקין'
  );
  expectError(
    THReels.validateDriveVideos([{ fileId: 'LongValidId1', name: '', folder: '', muscleGroup: '' }]).errors,
    'שם חסר'
  );

  const dupDrive = [
    { fileId: 'LongValidId1', name: 'וידאו 1', folder: '', muscleGroup: '' },
    { fileId: 'LongValidId1', name: 'וידאו 2', folder: '', muscleGroup: '' }
  ];
  expectError(THReels.validateDriveVideos(dupDrive).errors, 'מזהה כפול');

  // driveVideosToExercises
  assert.deepEqual(THReels.driveVideosToExercises(null), []);
  const validDriveData = [
    null,
    { fileId: 'skip12345', name: 'דילוג', folder: 'לא קשור', muscleGroup: '' },
    { fileId: 'short', name: 'קצר', folder: 'בטן', muscleGroup: '' },
    { fileId: 'DriveFile12345', name: 'וידאו תקין', folder: 'בטן', muscleGroup: '', poster: 'assets/posters/d.jpg' },
    { fileId: 'DriveFile12345', name: 'כפול', folder: 'בטן', muscleGroup: '' }
  ];
  const driveExercises = THReels.driveVideosToExercises(validDriveData);
  assert.equal(driveExercises.length, 1);
  assert.equal(driveExercises[0].id, 'drive-DriveFile12345');
  assert.equal(driveExercises[0].muscle_group, 'ליבה');
  assert.equal(driveExercises[0].poster, 'assets/posters/d.jpg');
});

test('exerciseCardHtml for drive and reel exercises', () => {
  // Drive card
  const driveEx = {
    source: 'drive',
    id: 'drive-File12345',
    file_id: 'File12345',
    muscle_group: 'חזה',
    name_he: 'תרגיל דרייב',
    poster: 'assets/posters/test.jpg',
    _added: true,
    _index: 5
  };
  const driveHtml = THReels.exerciseCardHtml(driveEx);
  assert.match(driveHtml, /drive-card/);
  assert.match(driveHtml, /aria-pressed="true"/);
  assert.match(driveHtml, /נוסף לאימון/);
  assert.match(driveHtml, /card-index/);

  // Inspiration reel
  const inspEx = validExercise({
    id: 'ig-Insp',
    muscle_group: 'השראה',
    source_url: 'https://www.instagram.com/p/InspCode/'
  });
  const inspHtml = THReels.exerciseCardHtml(inspEx);
  assert.match(inspHtml, /טיפ \/ השראה/);
  assert.match(inspHtml, /צפייה בפוסט/);
  assert.doesNotMatch(inspHtml, /data-add/);

  // Regular reel exercise with details
  const fullEx = validExercise({
    id: 'ig-Full',
    muscle_group: 'ליבה',
    secondary_group: 'גב',
    muscle_detail: 'בטן עליונה',
    equipment: 'מזרן',
    difficulty: 2,
    safety_he: 'לשמור על גב ישר',
    verified: true,
    _added: false
  });
  const fullHtml = THReels.exerciseCardHtml(fullEx);
  assert.match(fullHtml, /מאומת/);
  assert.match(fullHtml, /רמת קושי: בינוני/);
  assert.match(fullHtml, /לשמור על גב ישר/);
  assert.match(fullHtml, /בטן עליונה/);
  assert.match(fullHtml, /הוסף לאימון/);
});
