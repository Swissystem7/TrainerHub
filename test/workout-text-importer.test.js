'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  parseWorkoutTextToPlan,
  sanitizeWorkoutText,
  findAlternativeSuggestions
} = require('../js/workout-text-importer.js');
const { renderImportedPlanPreview } = require('../frontend/parse-workout.js');

test('1) פענוח פורמט 3x12: מזהה תרגיל, מספר סטים ומספר חזרות בצורה מדויקת', () => {
  const text = 'סקוואט 3x12';
  const plan = parseWorkoutTextToPlan(text, []);

  assert.ok(plan, 'Plan must be an object');
  assert.equal(plan.exercises.length, 1, 'Should parse one exercise');
  const ex = plan.exercises[0];
  assert.equal(ex.name, 'סקוואט', 'Exercise name should be סקוואט');
  assert.equal(ex.sets, 3, 'Sets count should be 3');
  assert.equal(ex.reps, 12, 'Reps count should be 12');
  assert.equal(ex.duration_seconds, null, 'duration_seconds should be null for rep-based exercise');

  // Multi-line and uppercase variations
  const multiText = 'שכיבות סמיכה 4X10\nמתח 3×8';
  const multiPlan = parseWorkoutTextToPlan(multiText, []);
  assert.equal(multiPlan.exercises.length, 2, 'Should parse two exercises');
  assert.equal(multiPlan.exercises[0].sets, 4);
  assert.equal(multiPlan.exercises[0].reps, 10);
  assert.equal(multiPlan.exercises[1].sets, 3);
  assert.equal(multiPlan.exercises[1].reps, 8);
});

test('2) פענוח פורמט זמנים בשניות: מזהה משך זמן בשניות עבור תרגילים מתוזמנים', () => {
  const text = 'פלאנק 45 שניות';
  const plan = parseWorkoutTextToPlan(text, []);

  assert.ok(plan.exercises.length >= 1, 'Should parse timed exercise');
  const ex = plan.exercises[0];
  assert.equal(ex.name, 'פלאנק');
  assert.equal(ex.duration_seconds, 45, 'Duration should be 45 seconds');
  assert.equal(ex.reps, null, 'Reps should be null for timed exercise');

  // Quote notation for seconds: 30"
  const quoteText = 'בורפי 30"';
  const quotePlan = parseWorkoutTextToPlan(quoteText, []);
  assert.equal(quotePlan.exercises.length, 1);
  assert.equal(quotePlan.exercises[0].duration_seconds, 30, 'Double-prime should parse to 30 seconds');
});

test('3) זיהוי תרגיל בעברית מהקטלוג: התאמת שם תרגיל מהטקסט לתרגיל קיים בקטלוג', () => {
  const catalog = [
    { id: 'squat', he: 'סקוואט', muscles: ['legs'], equipment: ['none'] },
    { id: 'pushup', he: 'שכיבות סמיכה', muscles: ['chest'], equipment: ['none'] }
  ];

  const plan = parseWorkoutTextToPlan('סקוואט 3x12', catalog);

  assert.equal(plan.exercises.length, 1);
  const ex = plan.exercises[0];
  assert.equal(ex.matched, true, 'Exercise should be matched in catalog');
  assert.equal(ex.id, 'squat', 'Matched id should be squat');
  assert.equal(ex.matchedHe, 'סקוואט', 'Matched Hebrew name should match catalog');

  assert.equal(plan.recognized.length, 1, 'Recognized list should have 1 item');
  assert.equal(plan.recognized[0].id, 'squat');
  assert.equal(plan.unmatched.length, 0, 'Unmatched list should be empty');
});

test('4) דיווח תרגיל לא מזוהה: הצגת תרגילים שלא נמצאו במאגר לצד הצעות חלופה', () => {
  const catalog = [
    { id: 'squat', he: 'סקוואט', muscles: ['legs'] },
    { id: 'lunge', he: "לאנג'", muscles: ['legs'] },
    { id: 'plank', he: 'פלאנק', muscles: ['core'] }
  ];

  const plan = parseWorkoutTextToPlan('תרגיל_שאינו_במאגר 3x10', catalog);

  assert.equal(plan.exercises.length, 1);
  const ex = plan.exercises[0];
  assert.equal(ex.matched, false, 'Unrecognized exercise must have matched=false');
  assert.equal(ex.id, null, 'Unrecognized exercise must have id=null');

  assert.equal(plan.unmatched.length, 1, 'Unmatched list should contain the unrecognized exercise');
  assert.equal(plan.unmatched[0].name, 'תרגיל_שאינו_במאגר');
  assert.ok(plan.unmatched[0].suggestions.length > 0, 'Should propose alternative suggestions');
  assert.ok(plan.warnings.length > 0, 'Should include warnings for unmatched exercises');
  assert.ok(plan.unmatchedNames.includes('תרגיל_שאינו_במאגר'));

  // Test suggestion finder function directly
  const suggestions = findAlternativeSuggestions('סקוואט כוכבים', catalog);
  assert.ok(Array.isArray(suggestions));
  assert.ok(suggestions.length > 0);
  assert.ok(suggestions.some((s) => s.id === 'squat' || s.muscles.includes('legs')));
});

test('5) קלט ריק/null: טיפול בטוח בקלט ריק, null או בלתי תקין ללא שגיאות', () => {
  const empty1 = parseWorkoutTextToPlan('', []);
  assert.deepEqual(empty1.exercises, []);
  assert.deepEqual(empty1.recognized, []);
  assert.deepEqual(empty1.unmatched, []);

  const empty2 = parseWorkoutTextToPlan('   ', []);
  assert.deepEqual(empty2.exercises, []);

  const nullPlan = parseWorkoutTextToPlan(null, []);
  assert.deepEqual(nullPlan.exercises, []);

  const undefPlan = parseWorkoutTextToPlan(undefined, []);
  assert.deepEqual(undefPlan.exercises, []);

  const invalidTypePlan = parseWorkoutTextToPlan(12345, []);
  assert.deepEqual(invalidTypePlan.exercises, []);
});

test('6) סינון תווי HTML מסוכנים: מניעת הזרקות קוד וטיהור תגיות HTML מסוכנות', () => {
  const dangerousInput = '<script>alert("xss")</script>סקוואט 3x12 <img src=x onerror=alert(1)>';
  const clean = sanitizeWorkoutText(dangerousInput);

  assert.ok(!clean.includes('<script>'), 'Script tags must be removed');
  assert.ok(!clean.includes('</script>'), 'Closing script tags must be removed');
  assert.ok(!clean.includes('onerror='), 'onerror attributes must be removed');
  assert.ok(!clean.includes('<img'), 'Image tags must be removed');

  const plan = parseWorkoutTextToPlan(dangerousInput, []);
  assert.ok(plan.exercises.length >= 1, 'Should safely parse exercise despite dangerous markup');
  assert.ok(!plan.exercises[0].name.includes('<script>'), 'Exercise name must not contain HTML tags');
  assert.ok(!plan.exercises[0].name.includes('<img'), 'Exercise name must not contain img tag');
  assert.equal(plan.exercises[0].sets, 3);
  assert.equal(plan.exercises[0].reps, 12);
});

test('7) חיבור מ-parse-workout: שילוב מודול הקליטה ורינדור מאובטח ב-DOM ללא innerHTML', () => {
  const mockChildren = [];
  let innerHtmlAccessed = false;

  function createMockElement(tag) {
    const children = [];
    return {
      tagName: tag ? tag.toUpperCase() : 'DIV',
      className: '',
      textContent: '',
      get children() {
        return children;
      },
      appendChild: (c) => {
        children.push(c);
        return c;
      },
      removeChild: (c) => {
        const idx = children.indexOf(c);
        if (idx !== -1) children.splice(idx, 1);
        return c;
      },
      set innerHTML(_val) {
        innerHtmlAccessed = true;
        throw new Error('innerHTML is forbidden! Must use createElement and textContent.');
      }
    };
  }

  const mockDocument = {
    createElement: (tag) => createMockElement(tag)
  };

  const mockContainer = {
    ownerDocument: mockDocument,
    get firstChild() {
      return mockChildren.length > 0 ? mockChildren[0] : null;
    },
    removeChild: (child) => {
      const idx = mockChildren.indexOf(child);
      if (idx !== -1) mockChildren.splice(idx, 1);
      return child;
    },
    appendChild: (child) => {
      mockChildren.push(child);
      return child;
    },
    get innerHTML() {
      return '';
    },
    set innerHTML(_val) {
      innerHtmlAccessed = true;
      throw new Error('innerHTML is forbidden! Must use createElement and textContent.');
    }
  };

  const samplePlan = {
    exercises: [
      { name: 'סקוואט', sets: 3, reps: 12, matched: true, matchedHe: 'סקוואט' },
      { name: 'תרגיל מסתורי', sets: 3, reps: 10, matched: false }
    ],
    recognized: [{ name: 'סקוואט', sets: 3, reps: 12, matched: true, matchedHe: 'סקוואט' }],
    unmatched: [{ name: 'תרגיל מסתורי', sets: 3, reps: 10, matched: false, suggestions: [{ he: "לאנג'" }] }]
  };

  // Render plan into mock container
  renderImportedPlanPreview(mockContainer, samplePlan);

  assert.equal(innerHtmlAccessed, false, 'innerHTML must never be accessed or set');
  assert.ok(mockChildren.length > 0, 'Container must contain safely rendered child elements');
  const card = mockChildren[0];
  assert.equal(card.className, 'imported-plan-preview-card');
});

test('8) קיום האלמנטים ב-frontend/index.html: אזור הדבקה, כפתור פעולה ותצוגה מקדימה קיימים במבנה הדף', () => {
  const htmlPath = path.join(__dirname, '..', 'frontend', 'index.html');
  const html = fs.readFileSync(htmlPath, 'utf8');

  // Verify textarea for free-text bulk WhatsApp input
  assert.match(
    html,
    /id=["']bulkWorkoutInput["']/,
    'frontend/index.html must contain textarea with id="bulkWorkoutInput"'
  );

  // Verify import button
  assert.match(
    html,
    /id=["']importWorkoutTextBtn["']/,
    'frontend/index.html must contain button with id="importWorkoutTextBtn"'
  );

  // Verify preview region
  assert.match(
    html,
    /id=["']importedPlanPreview["']/,
    'frontend/index.html must contain preview region with id="importedPlanPreview"'
  );

  // Verify script inclusion of workout-text-importer.js
  assert.match(
    html,
    /<script\b[^>]*src=["'][^"']*workout-text-importer\.js[^"']*["']><\/script>/,
    'frontend/index.html must load js/workout-text-importer.js'
  );
});
