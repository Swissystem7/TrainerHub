const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const WarmupGenerator = require('../js/warmup-generator.js');
const SessionBuilder = require('../js/session-builder.js');
const { readIndex } = require('./helpers/page-source');

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

  // Test workout passed as string
  const strWarmup = WarmupGenerator.generateTargetedWarmup('אימון מתח וגב', null);
  assert.ok(strWarmup && strWarmup.focus === 'upper_body');
  assert.equal(strWarmup.exercises.length, 3);

  // Test with custom catalog object and custom items with short/long duration to test clamping
  const objCatalog = {
    w1: { id: 'w1', name: 'חימום חזה דינמי', category: 'warmup', muscles: ['chest'], duration_seconds: 60 },
    w2: { id: 'w2', he: 'מוביליטי שכמות', category: 'mobility', muscles: ['shoulders'], duration_seconds: 60 }
  };
  const warmupCustom = WarmupGenerator.generateTargetedWarmup(
    upperWorkout,
    { limitations: ['shoulder_pain', 'wrist_pain'] },
    objCatalog
  );
  assert.equal(warmupCustom.exercises.length, 3);
  assert.equal(warmupCustom.duration_minutes, 5, 'מינימום 5 דקות');

  const objCatalogLong = {
    w1: { id: 'w1', name: 'חימום ארוך 1', category: 'warmup', muscles: ['chest'], duration_seconds: 300 },
    w2: { id: 'w2', he: 'חימום ארוך 2', category: 'mobility', muscles: ['shoulders'], duration_seconds: 300 }
  };
  const warmupLong = WarmupGenerator.generateTargetedWarmup(
    upperWorkout,
    { limitations: ['shoulder_pain', 'wrist_pain'] },
    objCatalogLong
  );
  assert.equal(warmupLong.duration_minutes, 7, 'מקסימום 7 דקות');

  // Test arms workout with singular muscle and id-only exercises
  const armsWorkout = {
    title: 'אימון ידיים וזרועות biceps triceps',
    phases: [
      {
        name: 'Main',
        exercises: [{ name: 'מתח', muscle: 'back' }, { id: 'pullup' }, { name: 'לחיצת כתפיים overhead' }]
      }
    ]
  };
  const armsWarmup = WarmupGenerator.generateTargetedWarmup(armsWorkout, {});
  assert.equal(armsWarmup.focus, 'upper_body');
  assert.equal(armsWarmup.exercises.length, 3);
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

  // Test lower body title string
  const lowerTitleWorkout = {
    title: 'אימון פלג גוף תחתון lower'
  };
  const lowerTitleWarmup = WarmupGenerator.generateTargetedWarmup(lowerTitleWorkout, {});
  assert.equal(lowerTitleWarmup.focus, 'lower_body');

  // Test ratio: 2 lower muscles vs 1 upper muscle
  const ratioWorkout = {
    muscles: ['chest', 'legs', 'glutes']
  };
  const ratioWarmup = WarmupGenerator.generateTargetedWarmup(ratioWorkout, {});
  assert.equal(ratioWarmup.focus, 'lower_body');

  // Test core workout
  const coreWorkout = {
    title: 'אימון בטן ופלאנק',
    focus: 'core',
    targetMuscles: ['core', 'abs'],
    phases: [{ name: 'Main', exercises: [{ name: 'פלאנק', id: 'plank', muscles: ['core'] }] }]
  };
  const coreWarmup = WarmupGenerator.generateTargetedWarmup(coreWorkout, {});
  assert.equal(coreWarmup.focus, 'core');
  assert.equal(coreWarmup.exercises.length, 3);
  assert.ok(coreWarmup.exercises.some((e) => e.bodyRegion === 'core'));

  // Test full body workout and null workout
  const fullWorkout = {
    title: 'אימון גוף מלא',
    focus: 'full',
    muscles: ['chest', 'legs', 'core']
  };
  const fullWarmup = WarmupGenerator.generateTargetedWarmup(fullWorkout, {});
  assert.equal(fullWarmup.focus, 'full_body');
  assert.equal(fullWarmup.exercises.length, 3);

  const defaultWarmup = WarmupGenerator.generateTargetedWarmup(null, null);
  assert.equal(defaultWarmup.focus, 'full_body');
  assert.equal(defaultWarmup.exercises.length, 3);

  // Test catalog with lower body mobility and empty muscles
  const lowerCat = [
    { id: 'cat_leg', he: 'חימום רגליים', category: 'warmup', muscles: ['legs'], contraindications: [] },
    { id: 'cat_gen', name: 'חימום כללי', category: 'warmup', muscles: [], contraindications: [] }
  ];
  const lowerWithCat = WarmupGenerator.generateTargetedWarmup(lowerWorkout, {}, lowerCat);
  assert.equal(lowerWithCat.exercises.length, 3);
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

  // Scenario C: Profile as array with wrist and hip pain
  const profileArray = ['שורש כף יד', 'מפרק ירך', null, ''];
  const warmupArray = WarmupGenerator.generateTargetedWarmup('אימון שכיבות שמיכה', profileArray);
  assert.equal(warmupArray.exercises.length, 3);
  const wristHipForbidden = [
    'thoracic_spine_rotations',
    'wrist_forearm_mobility',
    'hip_openers_90_90',
    'leg_swings_dynamic'
  ];
  for (const ex of warmupArray.exercises) {
    assert.ok(!wristHipForbidden.includes(ex.id));
  }

  // Scenario D: Profile as string directly
  const warmupStrProfile = WarmupGenerator.generateTargetedWarmup('אימון עליון', 'כתפיים');
  assert.equal(warmupStrProfile.exercises.length, 3);
  assert.ok(
    !warmupStrProfile.exercises.some((e) => ['arm_circles_chest_opener', 'scapular_wall_slides'].includes(e.id))
  );

  // Scenario E: Profile as object with restrictions, single string limitation and injuries
  const profileInjuries = { injuries: ['גב תחתון', 'lower_back'], limitations: 'ברכיים' };
  const warmupInjuries = WarmupGenerator.generateTargetedWarmup('אימון רגליים וגב', profileInjuries);
  assert.equal(warmupInjuries.exercises.length, 3);
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

  // Integration test with lower body and userProfile option
  const legResult = SessionBuilder.buildSession('אימון רגליים 30 דקות', mockCatalog, {
    userProfile: { limitations: ['knee_pain'] }
  });
  assert.ok(legResult.warmupBlock);
  assert.equal(legResult.warmupBlock.focus, 'lower_body');
  assert.equal(legResult.warmupBlock.exercises.length, 3);
  assert.ok(
    !legResult.warmupBlock.exercises.some((e) => ['bodyweight_tempo_squat', 'world_greatest_stretch'].includes(e.id))
  );

  // Integration test with no opts (fallback to req)
  const defaultOptsResult = SessionBuilder.buildSession('אימון פלג גוף עליון 20 דקות', mockCatalog);
  assert.ok(defaultOptsResult.warmupBlock);
  assert.equal(defaultOptsResult.warmupBlock.focus, 'upper_body');

  // Integration test with empty catalog
  const emptyCatResult = SessionBuilder.buildSession('אימון שחייה 20 דקות', []);
  assert.equal(emptyCatResult.warmupBlock, null);

  // Integration test with no-reel combo
  const unavailableResult = SessionBuilder.buildSession(
    {
      equipment: ['stairs'],
      muscles: ['back']
    },
    mockCatalog
  );
  assert.equal(unavailableResult.warmupBlock, null);
});

// Test 5: קיום אזור id='warmupSection' ב-index.html
test("קיום אזור id='warmupSection' ב-index.html - אלמנט קיים, סקריפט נטען, ורינדור תיבות סימון ללא innerHTML", () => {
  const htmlPath = path.join(__dirname, '..', 'index.html');
  assert.ok(fs.existsSync(htmlPath), 'index.html חייב להתקיים');
  const html = readIndex();

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

  // Simulate renderWarmupSection execution with mock DOM elements
  class MockElement {
    constructor(tag) {
      this.tagName = tag;
      this.children = [];
      this.classList = new Set();
      this.classList.add = (c) => (this.classList.add ? Set.prototype.add.call(this.classList, c) : null);
      this.classList.remove = (c) => this.classList.delete(c);
      this.textContent = '';
      this.attributes = {};
      this.listeners = {};
    }
    get firstChild() {
      return this.children[0] || null;
    }
    appendChild(child) {
      this.children.push(child);
      return child;
    }
    removeChild(child) {
      const idx = this.children.indexOf(child);
      if (idx !== -1) this.children.splice(idx, 1);
      return child;
    }
    setAttribute(k, v) {
      this.attributes[k] = v;
    }
    removeAttribute(k) {
      delete this.attributes[k];
    }
    addEventListener(evt, fn) {
      this.listeners[evt] = fn;
    }
  }

  const origDocument = globalThis.document;
  try {
    globalThis.document = {
      createElement: (tag) => new MockElement(tag)
    };

    const fn = new Function('warmupBlock', 'container', `${fnBody}; renderWarmupSection(warmupBlock, container);`);
    const mockContainer = new MockElement('section');
    mockContainer.setAttribute('hidden', '');

    // Edge cases: null block and null container
    fn(null, mockContainer);
    fn({}, null);

    const testBlock = {
      duration_minutes: 6,
      pacingGuidelines: 'קצב הדרגתי ואיטי',
      exercises: [
        { id: 'ex1', name: 'סיבובי ידיים', duration_seconds: 120, instructions: '10 חזרות' },
        { id: 'ex2', name: 'מתיחות', duration_seconds: 120 }
      ]
    };

    fn(testBlock, mockContainer);
    assert.equal(mockContainer.attributes.hidden, undefined, 'hidden attribute is removed');
    assert.equal(mockContainer.children.length, 3, 'heading, pacing, and list created');
    assert.equal(mockContainer.children[0].textContent, 'חימום ממוקד ומוביליטי (6 דקות)');
    assert.ok(mockContainer.children[1].textContent.includes('הנחיות קצב'));

    const list = mockContainer.children[2];
    assert.equal(list.children.length, 2, 'two list items');
    const firstItem = list.children[0];
    const label = firstItem.children[0];
    const checkbox = label.children[0];
    assert.equal(checkbox.tagName, 'input');
    assert.equal(checkbox.type, 'checkbox');

    // Test toggle checkbox
    checkbox.checked = true;
    checkbox.listeners.change();
    assert.ok(firstItem.classList.has('completed'));
    checkbox.checked = false;
    checkbox.listeners.change();
    assert.ok(!firstItem.classList.has('completed'));
  } finally {
    globalThis.document = origDocument;
  }

  // Verify namespace exports in UMD / global context
  assert.ok(globalThis.THWarmupGenerator || WarmupGenerator);
});
