const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { adaptWeekForShifts, createMobilitySession, isHeavyWorkout } = require('../js/shift-adapter.js');

test('התאמת שבוע עם 2 ימי משמרת - מפנה אימונים כבדים לימים פנויים ומציבה מוביליטי בימי המשמרת', () => {
  const schedule = [
    { dayIndex: 0, title: 'אימון כוח A', isHeavy: true },
    null,
    { dayIndex: 2, title: 'אימון כוח B', isHeavy: true },
    null,
    { dayIndex: 4, title: 'אימון כוח C', isHeavy: true },
    null,
    null
  ];

  // 2 busy shift days: day 0 (Sunday) and day 2 (Tuesday)
  const adapted = adaptWeekForShifts(schedule, [0, 2]);

  assert.equal(adapted.length, 7, 'שבוע מותאם חייב לכלול 7 ימים');

  // Days 0 and 2 must now have 10-minute mobility maintenance
  assert.equal(adapted[0].isMobility, true, 'יום 0 צריך להפוך למוביליטי');
  assert.equal(adapted[0].durationMinutes, 10, 'משך מוביליטי ביום 0 צריך להיות 10 דקות');
  assert.match(adapted[0].title, /מוביליטי/, 'כותרת יום 0 צריכה לציין מוביליטי');

  assert.equal(adapted[2].isMobility, true, 'יום 2 צריך להפוך למוביליטי');
  assert.equal(adapted[2].durationMinutes, 10, 'משך מוביליטי ביום 2 צריך להיות 10 דקות');
  assert.match(adapted[2].title, /מוביליטי/, 'כותרת יום 2 צריכה לציין מוביליטי');

  // Heavy workouts must not be on shift days 0 and 2
  assert.equal(isHeavyWorkout(adapted[0]), false, 'יום משמרת 0 לא מכיל אימון כבד');
  assert.equal(isHeavyWorkout(adapted[2]), false, 'יום משמרת 2 לא מכיל אימון כבד');

  // Heavy workouts moved to free days (e.g. days 1 and 3)
  const heavySlots = adapted.map((slot, idx) => ({ slot, idx })).filter((item) => item.slot?.isHeavy);

  assert.equal(heavySlots.length, 3, 'כל 3 האימונים הכבדים קיימים בשבוע המותאם');
  heavySlots.forEach(({ idx }) => {
    assert.notEqual(idx, 0, 'אימון כבד לא נשאר ביום 0');
    assert.notEqual(idx, 2, 'אימון כבד לא נשאר ביום 2');
  });
});

test('שמירה על סך אימונים כשאפשר - סך האימונים הכבדים נשמר במלואו כשיש ימים פנויים', () => {
  const schedule = [
    { dayIndex: 0, title: 'אימון רגליים', isHeavy: true },
    { dayIndex: 1, title: 'מנוחה', isRest: true },
    { dayIndex: 2, title: 'אימון חזה וגב', isHeavy: true },
    { dayIndex: 3, title: 'מנוחה', isRest: true },
    { dayIndex: 4, title: 'אימון כתפיים וליבה', isHeavy: true },
    { dayIndex: 5, title: 'מנוחה', isRest: true },
    { dayIndex: 6, title: 'מנוחה', isRest: true }
  ];

  // Shift days on days 0 and 4
  const adapted = adaptWeekForShifts(schedule, [0, 4]);

  const countOriginalHeavy = schedule.filter((d) => isHeavyWorkout(d)).length;
  const countAdaptedHeavy = adapted.filter((d) => isHeavyWorkout(d)).length;

  assert.equal(countOriginalHeavy, 3, 'מקורי הכיל 3 אימונים כבדים');
  assert.equal(countAdaptedHeavy, 3, 'הלוח המותאם שמר על כל 3 האימונים הכבדים');

  // Check object format input preservation
  const objSchedule = {
    dailyWorkouts: [
      { day: 1, title: 'אימון A', isHeavy: true },
      null,
      { day: 3, title: 'אימון B', isHeavy: true },
      null,
      null,
      null,
      null
    ]
  };
  const adaptedObj = adaptWeekForShifts(objSchedule, [0]);
  assert.equal(Array.isArray(adaptedObj.dailyWorkouts), true);
  const adaptedObjHeavy = adaptedObj.dailyWorkouts.filter((d) => isHeavyWorkout(d)).length;
  assert.equal(adaptedObjHeavy, 2, 'סך האימונים הכבדים נשמר גם בקלט אובייקט');
});

test('יום תחזוקה קצר בעומס גבוה - ימי עומס מקבלים תחזוקת מוביליטי קצרה של 10 דקות', () => {
  const schedule = [
    { dayIndex: 0, title: 'אימון A', isHeavy: true },
    null,
    { dayIndex: 2, title: 'אימון B', isHeavy: true },
    null,
    { dayIndex: 4, title: 'אימון C', isHeavy: true },
    null,
    null
  ];

  // High load with 4 busy/shift days: Sunday, Monday, Tuesday, Wednesday
  const busyDays = [0, 1, 2, 3];
  const adapted = adaptWeekForShifts(schedule, busyDays);

  busyDays.forEach((dayIdx) => {
    const slot = adapted[dayIdx];
    assert.ok(slot, 'יום עומס חייב לכלול הגדרת יום');
    assert.equal(slot.isMobility, true, 'יום עומס מסומן כמוביליטי');
    assert.equal(slot.durationMinutes, 10, 'משך תחזוקת מוביליטי הוא 10 דקות');
    assert.equal(slot.duration_minutes, 10, 'משך תחזוקת מוביליטי בתאימות 10 דקות');
    assert.match(slot.title, /10 דקות/, 'כותרת התחזוקה כוללת 10 דקות');
    assert.ok(Array.isArray(slot.exercises) && slot.exercises.length > 0, 'כולל תרגילי מוביליטי');
  });

  const mobDirect = createMobilitySession(5);
  assert.equal(mobDirect.durationMinutes, 10);
  assert.equal(mobDirect.isMobility, true);
});

test('קלט null/אינדקסים חריגים - טיפול בטוח ללא שגיאות בקלט חריג או אינדקסים לא תקינים', () => {
  // Safe handling of null, undefined, empty array
  assert.doesNotThrow(() => {
    const r1 = adaptWeekForShifts(null, [0, 1]);
    assert.deepEqual(r1, []);
  });

  assert.doesNotThrow(() => {
    const r2 = adaptWeekForShifts(undefined, null);
    assert.deepEqual(r2, []);
  });

  assert.doesNotThrow(() => {
    const r3 = adaptWeekForShifts([], [1, 2]);
    assert.deepEqual(r3, []);
  });

  assert.doesNotThrow(() => {
    const r4 = adaptWeekForShifts('invalid', [0]);
    assert.deepEqual(r4, []);
  });

  // Exceptional indices: negative, out-of-range, NaN, strings, nulls
  const schedule = [
    { dayIndex: 0, title: 'אימון יום ראשון', isHeavy: true },
    null,
    { dayIndex: 2, title: 'אימון יום שלישי', isHeavy: true },
    null,
    null,
    null,
    null
  ];

  const exceptionalIndices = [-10, 999, NaN, 'shift', null, undefined];
  let adaptedSafe;
  assert.doesNotThrow(() => {
    adaptedSafe = adaptWeekForShifts(schedule, exceptionalIndices);
  });

  assert.equal(adaptedSafe.length, 7);
  // With no valid busy indices, the original heavy workouts remain in place
  assert.equal(isHeavyWorkout(adaptedSafe[0]), true);
  assert.equal(isHeavyWorkout(adaptedSafe[2]), true);
});

test('קיום הפאנל ב-reserves.html וב-weekly.html - פאנל נגיש עם shiftAdapterPanel ו-label for מפורש לכל יום', () => {
  const root = path.join(__dirname, '..');
  const reservesHtml = fs.readFileSync(path.join(root, 'reserves.html'), 'utf8');
  const weeklyHtml = fs.readFileSync(path.join(root, 'weekly.html'), 'utf8');

  // Verify shiftAdapterPanel exists in both pages
  assert.match(reservesHtml, /id=["']shiftAdapterPanel["']/i, 'reserves.html must contain id="shiftAdapterPanel"');
  assert.match(weeklyHtml, /id=["']shiftAdapterPanel["']/i, 'weekly.html must contain id="shiftAdapterPanel"');

  // Verify script tag inclusion for shift-adapter.js
  assert.match(reservesHtml, /<script[^>]*src=["']\.\/js\/shift-adapter\.js["']>/i);
  assert.match(weeklyHtml, /<script[^>]*src=["']\.\/js\/shift-adapter\.js["']>/i);

  // Check reserves.html checkboxes and explicit label for='...'
  const reservesCheckboxes = [
    ...reservesHtml.matchAll(/<input[^>]*type=["']checkbox["'][^>]*id=["']([^"']+)["'][^>]*>/gi)
  ];
  const reservesShiftBoxes = reservesCheckboxes.filter((m) => m[1].includes('shift'));
  assert.ok(reservesShiftBoxes.length >= 7, 'reserves.html must have at least 7 shift checkboxes (Sunday-Saturday)');
  reservesShiftBoxes.forEach((m) => {
    const id = m[1];
    const forRegex = new RegExp(`<label[^>]*for=["']${id}["']`, 'i');
    assert.ok(forRegex.test(reservesHtml), `reserves.html must have <label for="${id}">`);
  });

  // Check weekly.html checkboxes and explicit label for='...'
  const weeklyCheckboxes = [...weeklyHtml.matchAll(/<input[^>]*type=["']checkbox["'][^>]*id=["']([^"']+)["'][^>]*>/gi)];
  const weeklyShiftBoxes = weeklyCheckboxes.filter((m) => m[1].includes('shift'));
  assert.ok(weeklyShiftBoxes.length >= 7, 'weekly.html must have at least 7 shift checkboxes (Sunday-Saturday)');
  weeklyShiftBoxes.forEach((m) => {
    const id = m[1];
    const forRegex = new RegExp(`<label[^>]*for=["']${id}["']`, 'i');
    assert.ok(forRegex.test(weeklyHtml), `weekly.html must have <label for="${id}">`);
  });
});
