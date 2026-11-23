const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const MuscleBalance = require('../js/muscle-balance.js');
const { readIndex } = require('./helpers/page-source');

// Test 1: חישוב מאוזן
test('1. חישוב מאוזן - computeMuscleGroupBalance calculates balanced volume across push, pull, legs, and core', () => {
  const now = new Date();
  const oldDate = new Date(now.getTime() - 15 * 86400 * 1000).toISOString();
  const futureDate = new Date(now.getTime() + 5 * 86400 * 1000).toISOString();

  const sessions = [
    // Session 1: phases with exercises
    {
      doneAt: now.toISOString(),
      phases: [
        {
          exercises: [
            { name: 'לחיצת חזה', pattern: 'push', sets: 4 },
            { name: 'מתח', target: 'pull', sets: 4 }
          ]
        }
      ]
    },
    // Session 2: sets array and setCount
    {
      at: now.toISOString(),
      exercises: [
        { name: 'סקוואט', group: 'legs', sets: [{ reps: 10 }, { reps: 10 }] },
        { name: 'סקוואט גובלט', group: 'legs', setCount: 2 },
        { name: 'פלאנק', group: 'core', sets: 4 }
      ]
    },
    // Session 3: session.sets and session.logs
    {
      date: now.toISOString(),
      sets: [{ name: 'מקבילים', group: 'push', sets: 1 }]
    },
    {
      loggedAt: now.toISOString(),
      logs: [{ name: 'חתירה', group: 'pull', sets: 1 }]
    },
    // Session 4: single exercise object passed directly as session
    {
      timestamp: now.toISOString(),
      name: 'סקוואט',
      group: 'legs',
      sets: 1
    },
    // Old session (should be excluded)
    {
      doneAt: oldDate,
      exercises: [{ name: 'סקוואט ישן', group: 'legs', sets: 10 }]
    },
    // Future session (should be excluded)
    {
      doneAt: futureDate,
      exercises: [{ name: 'סקוואט עתידי', group: 'legs', sets: 10 }]
    }
  ];

  const balance = MuscleBalance.computeMuscleGroupBalance(sessions);
  assert.equal(balance.isBalanced, true, 'Overall balance should be true when all groups have >= 4 sets');
  assert.equal(balance.deficientGroups.length, 0, 'There should be no deficient groups');
  assert.ok(balance.groups.push.total >= 4, 'Push total should be >= 4');
  assert.ok(balance.groups.pull.total >= 4, 'Pull total should be >= 4');
  assert.ok(balance.groups.legs.total >= 4, 'Legs total should be >= 4');
  assert.ok(balance.groups.core.total >= 4, 'Core total should be >= 4');
  assert.equal(balance.groups.push.isDeficient, false);
  assert.equal(balance.groups.push.status, 'balanced');
  assert.equal(balance.groups.push.statusHe, 'מאוזן');
  assert.match(balance.message, /מאוזן ותקין/);

  // Test single session object (not in array)
  const singleSession = {
    doneAt: now.toISOString(),
    exercises: [
      { name: 'לחיצת חזה', group: 'push', sets: 4 },
      { name: 'חתירה', group: 'pull', sets: 4 },
      { name: 'סקוואט', group: 'legs', sets: 4 },
      { name: 'פלאנק', group: 'core', sets: 4 }
    ]
  };
  const singleResult = MuscleBalance.computeMuscleGroupBalance(singleSession);
  assert.equal(singleResult.isBalanced, true);
  assert.equal(singleResult.sessionsCount, 1);

  // Test overloaded condition with custom options
  const overloadSessions = [
    {
      doneAt: now.toISOString(),
      exercises: [
        { name: 'לחיצה כבדה', group: 'push', sets: 15 },
        { name: 'מתח', group: 'pull', sets: 5 },
        { name: 'סקוואט', group: 'legs', sets: 5 },
        { name: 'בטן', group: 'core', sets: 5 }
      ]
    }
  ];
  const overloadBalance = MuscleBalance.computeMuscleGroupBalance(overloadSessions, {
    minWeeklySets: 4,
    overloadSets: 14,
    now: now.toISOString()
  });
  assert.ok(overloadBalance.groups.push.isOverloaded, 'Push should be marked overloaded at 15 sets');
  assert.equal(overloadBalance.groups.push.status, 'overloaded');
  assert.equal(overloadBalance.groups.push.statusHe, 'עמוס');
  assert.ok(overloadBalance.overloadedGroups.includes('push'));
  assert.match(overloadBalance.message, /עומס גבוה/);
});

// Test 2: זיהוי חוסר ברגליים
test('2. זיהוי חוסר ברגליים - identifies legs deficiency when legs volume is under 4 sets', () => {
  const sessions = [
    {
      doneAt: new Date().toISOString(),
      exercises: [
        { name: 'שכיבות סמיכה', group: 'push', sets: 6 },
        { name: 'חתירה', group: 'pull', sets: 6 },
        { name: 'פלאנק', group: 'core', sets: 4 },
        { name: 'סקוואט', group: 'legs', sets: 1 }
      ]
    }
  ];

  const balance = MuscleBalance.computeMuscleGroupBalance(sessions);
  assert.equal(balance.isBalanced, false, 'Balance should be false when legs volume is deficient');
  assert.ok(balance.deficientGroups.includes('legs'), 'deficientGroups must include legs');
  assert.equal(balance.groups.legs.isDeficient, true);
  assert.equal(balance.groups.legs.status, 'deficient');
  assert.equal(balance.groups.legs.statusHe, 'חסר');
  assert.equal(balance.groups.legs.total, 1);
  assert.match(balance.message, /רגליים/);
  assert.match(balance.message, /פחות מ-4/);
});

// Test 3: זיהוי חוסר במשיכה למרות לחיצות
test('3. זיהוי חוסר במשיכה למרות לחיצות - detects pull deficiency when push volume is high but pull is under 4 sets', () => {
  const sessions = [
    {
      doneAt: new Date().toISOString(),
      exercises: [
        { name: 'לחיצת חזה עם משקולות', group: 'push', sets: 5 },
        { name: 'שכיבות סמיכה', group: 'push', sets: 4 },
        { name: 'לחיצת כתפיים', group: 'push', sets: 3 },
        { name: 'סקוואט', group: 'legs', sets: 6 },
        { name: 'פלאנק', group: 'core', sets: 4 }
        // 0 pull exercises
      ]
    }
  ];

  const balance = MuscleBalance.computeMuscleGroupBalance(sessions);
  assert.ok(balance.groups.push.total >= 10, 'Push volume should be substantial');
  assert.equal(balance.groups.pull.total, 0, 'Pull volume should be 0');
  assert.equal(balance.groups.pull.isDeficient, true, 'Pull must be identified as deficient');
  assert.equal(balance.groups.pull.status, 'deficient');
  assert.ok(balance.deficientGroups.includes('pull'), 'deficientGroups must list pull');
  assert.match(balance.message, /משיכה/);
});

// Test 4: חישוב סטים עקיפים
test('4. חישוב סטים עקיפים - computes 0.5 indirect sets for secondary muscle recruitment', () => {
  const sessions = [
    {
      doneAt: new Date().toISOString(),
      exercises: [
        {
          name: 'שכיבות סמיכה',
          group: 'push',
          secondaryGroup: 'core',
          sets: 4
        },
        {
          name: 'סקוואט',
          group: 'legs',
          secondary: ['core'],
          sets: 4
        },
        {
          name: 'מתח',
          group: 'pull',
          indirectGroup: 'core',
          sets: 2
        },
        {
          name: 'חתירה',
          group: 'pull',
          secondary: 'core',
          secondaryMuscles: ['biceps'],
          sets: 2
        }
      ]
    }
  ];

  const balance = MuscleBalance.computeMuscleGroupBalance(sessions);
  assert.equal(balance.groups.push.direct, 4, 'Push direct sets should be 4');
  assert.equal(balance.groups.push.indirect, 0, 'Push indirect sets should be 0');
  assert.equal(balance.groups.legs.direct, 4, 'Legs direct sets should be 4');
  assert.equal(balance.groups.legs.indirect, 0, 'Legs indirect sets should be 0');
  assert.equal(balance.groups.pull.direct, 4, 'Pull direct sets should be 4');

  // Core received 0 direct sets, but indirect from:
  // 4 * 0.5 (push) + 4 * 0.5 (squat) + 2 * 0.5 (pullup) + 2 * 0.5 (row) = 6 indirect sets
  assert.equal(balance.groups.core.direct, 0, 'Core direct sets should be 0');
  assert.equal(balance.groups.core.indirect, 6, 'Core indirect sets should be 6');
  assert.equal(balance.groups.core.total, 6, 'Core total should be 6');
  assert.equal(balance.groups.core.isDeficient, false, 'Core reached effective sets via indirect volume');

  // Test inferred secondary recruitment without explicit secondaryGroup
  const inferredSession = [
    {
      doneAt: new Date().toISOString(),
      exercises: [
        { name: 'push-up', primary: 'push', sets: 4 },
        { name: 'deadlift', primary: 'legs', sets: 4 },
        { name: 'pull-up', primary: 'pull', sets: 4 }
      ]
    }
  ];
  const inferredBalance = MuscleBalance.computeMuscleGroupBalance(inferredSession);
  assert.ok(inferredBalance.groups.core.indirect > 0, 'Core should receive indirect sets from compound movements');
});

// Test 5: הצעת מיקוד לאימון הבא
test('5. הצעת מיקוד לאימון הבא - suggestNextFocus recommends appropriate focus based on muscle balance', () => {
  // Case A: Legs deficient -> focus on legs
  const legDeficientBalance = {
    groups: {
      push: { direct: 6, indirect: 0, total: 6 },
      pull: { direct: 6, indirect: 0, total: 6 },
      legs: { direct: 1, indirect: 0, total: 1 },
      core: { direct: 4, indirect: 0, total: 4 }
    },
    deficientGroups: ['legs']
  };
  const focusLegs = MuscleBalance.suggestNextFocus(legDeficientBalance);
  assert.equal(focusLegs.focus, 'legs');
  assert.equal(focusLegs.group, 'legs');
  assert.match(focusLegs.label, /רגליים/);
  assert.match(focusLegs.message, /רגליים/);
  assert.match(focusLegs.suggestedPrompt, /רגליים/);

  // Case B: Pull deficient -> focus on pull
  const pullDeficientBalance = {
    groups: {
      push: { direct: 8, indirect: 0, total: 8 },
      pull: { direct: 0, indirect: 0, total: 0 },
      legs: { direct: 6, indirect: 0, total: 6 },
      core: { direct: 4, indirect: 0, total: 4 }
    },
    deficientGroups: ['pull']
  };
  const focusPull = MuscleBalance.suggestNextFocus(pullDeficientBalance);
  assert.equal(focusPull.focus, 'pull');
  assert.match(focusPull.label, /משיכה/);
  assert.match(focusPull.message, /משיכה/);
  assert.match(focusPull.suggestedPrompt, /משיכה/);

  // Case C: Push deficient -> focus on push
  const pushDeficientBalance = {
    groups: {
      push: { direct: 0, indirect: 0, total: 0 },
      pull: { direct: 6, indirect: 0, total: 6 },
      legs: { direct: 6, indirect: 0, total: 6 },
      core: { direct: 4, indirect: 0, total: 4 }
    },
    deficientGroups: ['push']
  };
  const focusPush = MuscleBalance.suggestNextFocus(pushDeficientBalance);
  assert.equal(focusPush.focus, 'push');
  assert.match(focusPush.label, /דחיפה/);

  // Case D: Core deficient -> focus on core
  const coreDeficientBalance = {
    groups: {
      push: { direct: 6, indirect: 0, total: 6 },
      pull: { direct: 6, indirect: 0, total: 6 },
      legs: { direct: 6, indirect: 0, total: 6 },
      core: { direct: 1, indirect: 0, total: 1 }
    },
    deficientGroups: ['core']
  };
  const focusCore = MuscleBalance.suggestNextFocus(coreDeficientBalance);
  assert.equal(focusCore.focus, 'core');
  assert.match(focusCore.label, /ליבה/);

  // Case E: Balanced week -> full body / maintenance
  const balancedWeek = {
    groups: {
      push: { direct: 5, indirect: 0, total: 5 },
      pull: { direct: 5, indirect: 0, total: 5 },
      legs: { direct: 5, indirect: 0, total: 5 },
      core: { direct: 5, indirect: 0, total: 5 }
    },
    deficientGroups: []
  };
  const focusBalanced = MuscleBalance.suggestNextFocus(balancedWeek);
  assert.equal(focusBalanced.focus, 'full');
  assert.match(focusBalanced.label, /גוף מלא/);

  // Case F: Call suggestNextFocus directly with sessions array
  const sessions = [
    {
      doneAt: new Date().toISOString(),
      exercises: [{ name: 'סקוואט', group: 'legs', sets: 6 }]
    }
  ];
  const directFocus = MuscleBalance.suggestNextFocus(sessions);
  assert.ok(directFocus.focus);
  assert.ok(directFocus.suggestedPrompt);
});

// Test 6: קלט ריק/null
test('6. קלט ריק/null - handles empty, null, and malformed inputs gracefully without throwing', () => {
  assert.doesNotThrow(() => {
    const b1 = MuscleBalance.computeMuscleGroupBalance(null);
    assert.equal(b1.sessionsCount, 0);
    assert.equal(b1.isBalanced, false);
    assert.ok(b1.groups.push);

    const b2 = MuscleBalance.computeMuscleGroupBalance([]);
    assert.equal(b2.sessionsCount, 0);

    const b3 = MuscleBalance.computeMuscleGroupBalance(undefined);
    assert.equal(b3.sessionsCount, 0);

    const b4 = MuscleBalance.computeMuscleGroupBalance({ invalid: 123 });
    assert.ok(b4.groups);

    const b5 = MuscleBalance.computeMuscleGroupBalance([{ doneAt: 'invalid-date', exercises: [] }]);
    assert.ok(b5.groups);

    const b6 = MuscleBalance.computeMuscleGroupBalance([
      { exercises: [{ primary: 'unknown_muscle', name: 'סקוואט', sets: 1 }] }
    ]);
    assert.equal(b6.groups.legs.direct, 1);

    const f1 = MuscleBalance.suggestNextFocus(null);
    assert.equal(f1.focus, 'full');
    assert.ok(f1.message);

    const f2 = MuscleBalance.suggestNextFocus({});
    assert.equal(f2.focus, 'full');

    // Test mapMuscleToGroup mapping branches
    const pushTerms = ['push', 'דחיפה', 'chest', 'חזה', 'shoulders', 'כתפיים', 'triceps', 'תלת-ראשי', 'יד אחורית'];
    for (const t of pushTerms) assert.equal(MuscleBalance.mapMuscleToGroup(t), 'push');

    const pullTerms = ['pull', 'משיכה', 'back', 'גב', 'biceps', 'דו-ראשי', 'יד קדמית', 'lats'];
    for (const t of pullTerms) assert.equal(MuscleBalance.mapMuscleToGroup(t), 'pull');

    const legTerms = [
      'legs',
      'leg',
      'רגליים',
      'squat',
      'hinge',
      'quads',
      'ארבע ראשי',
      'hamstrings',
      'המסטרינג',
      'glutes',
      'ישבן',
      'calves',
      'תאומים',
      'שוקיים'
    ];
    for (const t of legTerms) assert.equal(MuscleBalance.mapMuscleToGroup(t), 'legs');

    const coreTerms = ['core', 'ליבה', 'abs', 'בטן'];
    for (const t of coreTerms) assert.equal(MuscleBalance.mapMuscleToGroup(t), 'core');

    assert.equal(MuscleBalance.mapMuscleToGroup('unknown'), null);
    assert.equal(MuscleBalance.mapMuscleToGroup(null), null);
    assert.equal(MuscleBalance.mapMuscleToGroup(123), null);

    // Test inferGroupFromName branches
    assert.equal(MuscleBalance.inferGroupFromName('הרמת רגליים'), 'core');
    assert.equal(MuscleBalance.inferGroupFromName('לחיצת רגליים'), 'legs');
    assert.equal(MuscleBalance.inferGroupFromName('סקוואט'), 'legs');
    assert.equal(MuscleBalance.inferGroupFromName('מתח'), 'pull');
    assert.equal(MuscleBalance.inferGroupFromName('פלאנק'), 'core');
    assert.equal(MuscleBalance.inferGroupFromName('שכיבות סמיכה'), 'push');
    assert.equal(MuscleBalance.inferGroupFromName('ריקוד חופשי'), null);
    assert.equal(MuscleBalance.inferGroupFromName(null), null);
  });
});

// Test 7: קיום האלמנטים ב-journal.html
test('7. קיום האלמנטים ב-journal.html - contains weeklyMuscleBalanceCard and renders balance UI safely', () => {
  const htmlPath = path.join(__dirname, '..', 'journal.html');
  const html = fs.readFileSync(htmlPath, 'utf8');

  assert.match(
    html,
    /id=["']weeklyMuscleBalanceCard["']/,
    'journal.html must declare #weeklyMuscleBalanceCard element'
  );
  assert.match(html, /src=["']\.\/js\/muscle-balance\.js["']/, 'journal.html must include muscle-balance.js script');
  assert.match(html, /renderWeeklyMuscleBalance/, 'journal.html must define renderWeeklyMuscleBalance function');

  // Verify renderWeeklyMuscleBalance uses safe DOM methods
  const fnMatch = html.match(/function\s+renderWeeklyMuscleBalance\s*\([\s\S]*?^ {2}\}/m);
  assert.ok(fnMatch, 'renderWeeklyMuscleBalance function body must be present');
  const fnBody = fnMatch[0];
  assert.ok(!fnBody.includes('innerHTML'), 'renderWeeklyMuscleBalance must NOT use innerHTML');
  assert.ok(fnBody.includes('createElement'), 'renderWeeklyMuscleBalance must use createElement');
  assert.ok(fnBody.includes('textContent'), 'renderWeeklyMuscleBalance must use textContent');
});

// Test 8: קיום האלמנטים ב-index.html
test('8. קיום האלמנטים ב-index.html - contains applyBalancedFocusBtn and updates muscle selector in workout builder', () => {
  const htmlPath = path.join(__dirname, '..', 'index.html');
  const html = readIndex();

  assert.match(html, /id=["']applyBalancedFocusBtn["']/, 'index.html must declare #applyBalancedFocusBtn element');
  assert.match(html, /id=["']muscleSelect["']/, 'index.html must declare #muscleSelect element');
  assert.match(html, /src=["']\.\/js\/muscle-balance\.js["']/, 'index.html must include muscle-balance.js script');
  assert.match(html, /applyBalancedFocus/, 'index.html must define applyBalancedFocus function');
});
