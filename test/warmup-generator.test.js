const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const WarmupGenerator = require('../js/warmup-generator.js');
const SessionBuilder = require('../js/session-builder.js');

const mockCatalog = [
  {
    id: 'pushups',
    he: 'שכיבות סמיכה',
    muscles: ['chest', 'triceps'],
    tags: ['chest', 'strength'],
    level: 'intermediate',
    equipment: ['none'],
    file: 'pushups.mp4'
  },
  {
    id: 'bench_press',
    he: 'לחיצת חזה עם משקולות',
    muscles: ['chest'],
    tags: ['chest', 'strength'],
    level: 'intermediate',
    equipment: ['dumbbells'],
    file: 'bench.mp4'
  },
  {
    id: 'squats',
    he: 'סקוואט',
    muscles: ['legs'],
    tags: ['legs', 'strength'],
    level: 'beginner',
    equipment: ['none'],
    file: 'squats.mp4'
  },
  {
    id: 'lunges',
    he: 'מכרעים (לאנג׳ים)',
    muscles: ['legs', 'glutes'],
    tags: ['legs', 'strength'],
    level: 'beginner',
    equipment: ['none'],
    file: 'lunges.mp4'
  },
  {
    id: 'plank',
    he: 'פלאנק סטטי',
    muscles: ['core'],
    tags: ['core', 'strength'],
    level: 'beginner',
    equipment: ['none'],
    file: 'plank.mp4'
  }
];

// Test 1: יצירת חימום לפלג גוף עליון
test('יצירת חימום לפלג גוף עליון - מחולל 3 תרגילי חימום ומוביליטי ממוקדים לפלג גוף עליון במשך 5-7 דקות', () => {
  const upperWorkout = {
    title: 'אימון חזה וכתפיים',
    targetMuscles: ['chest', 'shoulders'],
    phases: [
      {
        name: 'Main',
        exercises: [
          { id: 'bench_press', name: 'לחיצת חזה', muscles: ['chest'] },
          { id: 'pushups', name: 'שכיבות סמיכה', muscles: ['chest', 'triceps'] }
        ]
      }
    ]
  };

  const warmup = WarmupGenerator.generateTargetedWarmup(upperWorkout, {}, mockCatalog);

  assert.ok(warmup, 'חייב להחזיר אובייקט חימום');
  assert.equal(warmup.focus, 'upper_body', 'הפוקוס חייב להיות פלג גוף עליון');
  assert.ok(Array.isArray(warmup.exercises), 'תרגילי החימום חייבים להיות מערך');
  assert.equal(warmup.exercises.length, 3, 'חייבים לחזור בדיוק 3 תרגילי חימום');
  assert.ok(
    warmup.duration_minutes >= 5 && warmup.duration_minutes <= 7,
    `משך החימום חייב להיות בין 5 ל-7 דקות (התקבל: ${warmup.duration_minutes})`
  );
  assert.ok(warmup.pacingGuidelines && warmup.pacingGuidelines.length > 0, 'חייבות להופיע הנחיות קצב');

  // Verify that all exercises are upper-body relevant
  for (const ex of warmup.exercises) {
    assert.ok(ex.id && ex.name, 'לכל תרגיל חייב להיות מזהה ושם');
    assert.ok(ex.duration_seconds > 0, 'לכל תרגיל חייב להיות משך בשניות');
    assert.ok(
      ex.bodyRegion === 'upper' || ex.targetMuscles.some((m) => ['chest', 'back', 'shoulders', 'upper'].includes(m)),
      'כל תרגיל חימום חייב להתמקד בפלג גוף עליון'
    );
  }
});

// Test 2: יצירת חימום לפלג גוף תחתון
test('יצירת חימום לפלג גוף תחתון - מחולל 3 תרגילי חימום ומוביליטי ממוקדים לרגליים ולירכיים במשך 5-7 דקות', () => {
  const lowerWorkout = {
    title: 'אימון רגליים וישבן',
    targetMuscles: ['legs', 'glutes', 'quads'],
    phases: [
      {
        name: 'Main',
        exercises: [
          { id: 'squats', name: 'סקוואט', muscles: ['legs'] },
          { id: 'lunges', name: 'לאנג׳ים', muscles: ['legs', 'glutes'] }
        ]
      }
    ]
  };

  const warmup = WarmupGenerator.generateTargetedWarmup(lowerWorkout, {}, mockCatalog);

  assert.ok(warmup, 'חייב להחזיר אובייקט חימום');
  assert.equal(warmup.focus, 'lower_body', 'הפוקוס חייב להיות פלג גוף תחתון');
  assert.ok(Array.isArray(warmup.exercises), 'תרגילי החימום חייבים להיות מערך');
  assert.equal(warmup.exercises.length, 3, 'חייבים לחזור בדיוק 3 תרגילי חימום');
  assert.ok(
    warmup.duration_minutes >= 5 && warmup.duration_minutes <= 7,
    `משך החימום חייב להיות בין 5 ל-7 דקות (התקבל: ${warmup.duration_minutes})`
  );
  assert.ok(warmup.pacingGuidelines && warmup.pacingGuidelines.length > 0, 'חייבות להופיע הנחיות קצב');

  // Verify that all exercises are lower-body relevant
  for (const ex of warmup.exercises) {
    assert.ok(
      ex.bodyRegion === 'lower' ||
        ex.targetMuscles.some((m) => ['legs', 'glutes', 'hips', 'calves', 'lower'].includes(m)),
      'כל תרגיל חימום חייב להתמקד בפלג גוף תחתון'
    );
  }
});

// Test 3: סינון תרגילים מוגבלים בפרופיל
test('סינון תרגילים מוגבלים בפרופיל - משמיט תרגילים המנוגדים למגבלות (ברכיים, כתפיים, ללא קפיצות)', () => {
  // Scenario A: Lower body with knee pain & no jumps
  const lowerWorkout = {
    title: 'אימון רגליים',
    targetMuscles: ['legs', 'quads']
  };
  const profileWithKneePain = {
    limitations: ['knee_pain', 'no_jumps']
  };

  const warmupKnee = WarmupGenerator.generateTargetedWarmup(lowerWorkout, profileWithKneePain, mockCatalog);
  assert.equal(warmupKnee.exercises.length, 3, 'חייבים להיבחר 3 תרגילים בטוחים');

  const kneeForbidden = ['world_greatest_stretch', 'bodyweight_tempo_squat', 'jumping_jacks_dynamic'];
  for (const ex of warmupKnee.exercises) {
    assert.ok(!kneeForbidden.includes(ex.id), `תרגיל בעייתי לברכיים או קפיצה לא יכול להופיע בחימום: ${ex.id}`);
  }

  // Scenario B: Upper body with shoulder pain
  const upperWorkout = {
    title: 'אימון פלג גוף עליון',
    targetMuscles: ['chest', 'shoulders']
  };
  const profileWithShoulderPain = {
    limitations: ['shoulder_pain']
  };

  const warmupShoulder = WarmupGenerator.generateTargetedWarmup(upperWorkout, profileWithShoulderPain, mockCatalog);
  assert.equal(warmupShoulder.exercises.length, 3, 'חייבים להיבחר 3 תרגילים בטוחים');

  const shoulderForbidden = ['arm_circles_chest_opener', 'scapular_wall_slides'];
  for (const ex of warmupShoulder.exercises) {
    assert.ok(!shoulderForbidden.includes(ex.id), `תרגיל בעייתי לכתף לא יכול להופיע בחימום: ${ex.id}`);
  }
});

// Test 4: אינטגרציה עם buildSession
test('אינטגרציה עם buildSession - פלט buildSession מכיל שדה warmupBlock עם תרגילים והנחיות קצב', () => {
  const result = SessionBuilder.buildSession('אימון חזה 20 דקות', mockCatalog, {
    profile: { limitations: [] }
  });

  assert.ok(result, 'buildSession מחזיר תוצאה');
  assert.ok(result.warmupBlock, 'פלט buildSession חייב להכיל שדה warmupBlock');
  assert.ok(Array.isArray(result.warmupBlock.exercises), 'warmupBlock.exercises חייב להיות מערך');
  assert.equal(result.warmupBlock.exercises.length, 3, 'חייבים להיכלל 3 תרגילי חימום');
  assert.ok(
    result.warmupBlock.duration_minutes >= 5 && result.warmupBlock.duration_minutes <= 7,
    'משך החימום חייב להיות 5-7 דקות'
  );
  assert.ok(result.warmupBlock.pacingGuidelines, 'חייבות להיות הנחיות קצב');
  assert.ok(result.workout.warmupBlock, 'גם workout.warmupBlock מקושר');
});

// Test 5: קיום אזור id='warmupSection' ב-index.html
test("קיום אזור id='warmupSection' ב-index.html - אלמנט קיים, סקריפט נטען, ורינדור תיבות סימון ללא innerHTML", () => {
  const htmlPath = path.join(__dirname, '..', 'index.html');
  assert.ok(fs.existsSync(htmlPath), 'index.html חייב להתקיים');
  const html = fs.readFileSync(htmlPath, 'utf8');

  // Verify static id='warmupSection' in index.html
  assert.match(html, /id=["']warmupSection["']/, "index.html חייב להגדיר אלמנט עם id='warmupSection'");

  // Verify warmup-generator.js script is included
  assert.match(html, /src=["']\.\/js\/warmup-generator\.js["']/, 'index.html חייב לטעון את warmup-generator.js');

  // Verify renderWarmupSection exists and renders using createElement/textContent without innerHTML
  assert.match(html, /function renderWarmupSection/, 'index.html חייב להגדיר פונקציה renderWarmupSection');

  // Ensure renderWarmupSection does NOT assign to innerHTML
  const fnMatch = html.match(/function renderWarmupSection\([\s\S]*?\n\s{2}\}/);
  assert.ok(fnMatch, 'הפונקציה renderWarmupSection נמצאה ב-index.html');
  const fnBody = fnMatch[0];
  assert.ok(!fnBody.includes('.innerHTML'), 'renderWarmupSection אינו משתמש ב-innerHTML כלל');
  assert.ok(fnBody.includes('createElement'), 'renderWarmupSection משתמש ב-createElement');
  assert.ok(fnBody.includes('textContent'), 'renderWarmupSection משתמש ב-textContent');
  assert.ok(fnBody.includes('checkbox'), 'renderWarmupSection מרנדר תיבות סימון checkbox');
});
