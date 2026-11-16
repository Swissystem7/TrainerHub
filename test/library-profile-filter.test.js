const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const Filter = require(path.join(root, 'js', 'library-profile-filter.js'));
const html = fs.readFileSync(path.join(root, 'exercises.html'), 'utf8');

const EXERCISES = [
  { id: 'bw-squat', name_he: 'סקוואט משקל גוף', muscle_group: 'רגליים/ישבן', equipment_tags: ['bodyweight'], steps_he: ['עמידה זקופה'] },
  { id: 'db-press', name_he: 'לחיצת חזה משקולות', muscle_group: 'חזה', equipment_tags: ['dumbbell', 'bench'], steps_he: ['שכיבה על ספסל'] },
  { id: 'bb-deadlift', name_he: 'דדליפט מוט', muscle_group: 'גב', equipment_tags: ['barbell'], steps_he: ['אחיזת מוט'] },
  { id: 'ohp', name_he: 'לחיצת כתפיים מעל הראש', muscle_group: 'אחר', equipment_tags: ['dumbbell'], steps_he: ['לחיצה מעל הראש'] },
  { id: 'plank', name_he: 'פלאנק', muscle_group: 'ליבה', equipment_tags: ['bodyweight'], steps_he: ['מרפקים על הרצפה'] }
];

test('סינון לפי ציוד זמין שומר רק תרגילים שהציוד שלהם קיים בפרופיל', () => {
  const out = Filter.filterExercisesForProfile(EXERCISES, { equipment: ['dumbbell', 'bench'], limitations: [] });
  const ids = out.map((ex) => ex.id);
  assert.deepEqual(ids, ['db-press', 'ohp']);
});

test('סינון מגבלת ברכיים מסיר תרגילי סקוואט ומשאיר תרגילים בטוחים לברכיים', () => {
  const out = Filter.filterExercisesForProfile(EXERCISES, { equipment: ['bodyweight', 'dumbbell', 'bench', 'barbell'], limitations: ['knees'] });
  const ids = out.map((ex) => ex.id);
  assert.equal(ids.includes('bw-squat'), false);
  assert.ok(ids.includes('plank'));
});

test('סינון מגבלת כתף מסיר לחיצה מעל הראש ומשאיר תרגילי ליבה', () => {
  const out = Filter.filterExercisesForProfile(EXERCISES, { equipment: ['bodyweight', 'dumbbell', 'bench', 'barbell'], limitations: ['shoulders'] });
  const ids = out.map((ex) => ex.id);
  assert.equal(ids.includes('ohp'), false);
  assert.ok(ids.includes('plank'));
});

test('סימון תג התאמה: כל תרגיל מתאים נושא את התג מתאים לפרופיל שלך בלי לשנות את המקור', () => {
  const out = Filter.filterExercisesForProfile(EXERCISES, { equipment: ['bodyweight'], limitations: [] });
  assert.ok(out.length > 0);
  out.forEach((ex) => {
    assert.equal(ex.matchedProfile, true);
    assert.equal(ex.profileTag, 'מתאים לפרופיל שלך');
  });
  assert.equal(EXERCISES[0].matchedProfile, undefined);
});

test('פרופיל null מחזיר את כל התרגילים בבטחה עם סימון התאמה', () => {
  assert.doesNotThrow(() => Filter.filterExercisesForProfile(EXERCISES, null));
  const out = Filter.filterExercisesForProfile(EXERCISES, null);
  assert.equal(out.length, EXERCISES.length);
  assert.ok(out.every((ex) => ex.profileTag === 'מתאים לפרופיל שלך'));
});

test('פרופיל ריק מחזיר את כל התרגילים ופרופיל עם רשימת ציוד ריקה מחזיר משקל גוף בלבד', () => {
  assert.equal(Filter.filterExercisesForProfile(EXERCISES, {}).length, EXERCISES.length);
  const bodyweightOnly = Filter.filterExercisesForProfile(EXERCISES, { equipment: [], limitations: [] });
  assert.deepEqual(bodyweightOnly.map((ex) => ex.id), ['bw-squat', 'plank']);
});

test('טיפול ברשימת תרגילים ריקה או חסרה מחזיר מערך ריק בלי לזרוק', () => {
  assert.deepEqual(Filter.filterExercisesForProfile([], { equipment: ['dumbbell'], limitations: ['knees'] }), []);
  assert.deepEqual(Filter.filterExercisesForProfile(null, null), []);
  assert.deepEqual(Filter.filterExercisesForProfile(undefined, { equipment: ['dumbbell'] }), []);
});

test('קיום כפתור ההתאמה ב-exercises.html וחיבור מודול הסינון וקריאת הפרופיל הבטוחה', () => {
  assert.match(html, /id="filterByMyProfileBtn"/);
  assert.match(html, /library-profile-filter\.js/);
  assert.match(html, /getLibraryProfile/);
  assert.match(html, /createElement/);
});
