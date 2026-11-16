const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const Filter = require(path.join(root, 'js', 'library-profile-filter.js'));
const TH = require(path.join(root, 'js', 'core.js'));
const THReels = require(path.join(root, 'js', 'reel-library.js'));
const html = fs.readFileSync(path.join(root, 'exercises.html'), 'utf8');

const EXERCISES = [
  {
    id: 'bw-squat',
    name_he: 'סקוואט משקל גוף',
    muscle_group: 'רגליים/ישבן',
    equipment_tags: ['bodyweight'],
    steps_he: ['עמידה זקופה']
  },
  {
    id: 'db-press',
    name_he: 'לחיצת חזה משקולות',
    muscle_group: 'חזה',
    equipment_tags: ['dumbbell', 'bench'],
    steps_he: ['שכיבה על ספסל']
  },
  {
    id: 'bb-deadlift',
    name_he: 'דדליפט מוט',
    muscle_group: 'גב',
    equipment_tags: ['barbell'],
    steps_he: ['אחיזת מוט']
  },
  {
    id: 'ohp',
    name_he: 'לחיצת כתפיים מעל הראש',
    muscle_group: 'אחר',
    equipment_tags: ['dumbbell'],
    steps_he: ['לחיצה מעל הראש']
  },
  {
    id: 'plank',
    name_he: 'פלאנק',
    muscle_group: 'ליבה',
    equipment_tags: ['bodyweight'],
    steps_he: ['מרפקים על הרצפה']
  }
];

test('סינון לפי ציוד זמין שומר רק תרגילים שהציוד שלהם קיים בפרופיל', () => {
  const out = Filter.filterExercisesForProfile(EXERCISES, {
    equipment: ['dumbbell', 'bench'],
    limitations: []
  });
  const ids = out.map((ex) => ex.id);
  assert.deepEqual(ids, ['db-press', 'ohp']);
});

test('סינון מגבלת ברכיים מסיר תרגילי סקוואט ומשאיר תרגילים בטוחים לברכיים', () => {
  const out = Filter.filterExercisesForProfile(EXERCISES, {
    equipment: ['bodyweight', 'dumbbell', 'bench', 'barbell'],
    limitations: ['knees']
  });
  const ids = out.map((ex) => ex.id);
  assert.equal(ids.includes('bw-squat'), false);
  assert.ok(ids.includes('plank'));
  assert.ok(ids.includes('db-press'));

  const hebrewLimitation = Filter.filterExercisesForProfile(EXERCISES, {
    availableEquipment: ['bodyweight'],
    injuries: ['ברכיים']
  });
  assert.equal(
    hebrewLimitation.some((ex) => ex.id === 'bw-squat'),
    false
  );
});

test('סינון מגבלת כתף מסיר לחיצה מעל הראש ומשאיר תרגילי ליבה', () => {
  const out = Filter.filterExercisesForProfile(EXERCISES, {
    equipment: ['bodyweight', 'dumbbell', 'bench', 'barbell'],
    limitations: ['shoulders']
  });
  const ids = out.map((ex) => ex.id);
  assert.equal(ids.includes('ohp'), false);
  assert.ok(ids.includes('plank'));
  assert.ok(ids.includes('bw-squat'));

  const hebrewLimitation = Filter.filterExercisesForProfile(EXERCISES, {
    equipment: ['dumbbell'],
    limitations: ['כתפיים']
  });
  assert.equal(
    hebrewLimitation.some((ex) => ex.id === 'ohp'),
    false
  );
});

test('סינון מגבלת גב מסיר תרגילי דדליפט וכפיפת גב', () => {
  const out = Filter.filterExercisesForProfile(EXERCISES, {
    equipment: ['bodyweight', 'dumbbell', 'bench', 'barbell'],
    limitations: ['back']
  });
  const ids = out.map((ex) => ex.id);
  assert.equal(ids.includes('bb-deadlift'), false);
  assert.ok(ids.includes('plank'));

  const hebrewLimitation = Filter.filterExercisesForProfile(EXERCISES, {
    equipment: ['barbell'],
    restrictions: ['גב']
  });
  assert.equal(
    hebrewLimitation.some((ex) => ex.id === 'bb-deadlift'),
    false
  );
});

test('סימון תג התאמה: כל תרגיל מתאים נושא את התג מתאים לפרופיל שלך בלי לשנות את המקור', () => {
  const originalCopy = JSON.parse(JSON.stringify(EXERCISES[0]));
  const out = Filter.filterExercisesForProfile(EXERCISES, {
    equipment: ['bodyweight'],
    limitations: []
  });
  assert.ok(out.length > 0);
  out.forEach((ex) => {
    assert.equal(ex.matchedProfile, true);
    assert.equal(ex.profileTag, 'מתאים לפרופיל שלך');
  });
  assert.equal(EXERCISES[0].matchedProfile, undefined);
  assert.deepEqual(EXERCISES[0], originalCopy);
});

test('פרופיל null מחזיר את כל התרגילים בבטחה עם סימון התאמה', () => {
  assert.doesNotThrow(() => Filter.filterExercisesForProfile(EXERCISES, null));
  const out = Filter.filterExercisesForProfile(EXERCISES, null);
  assert.equal(out.length, EXERCISES.length);
  assert.ok(out.every((ex) => ex.profileTag === 'מתאים לפרופיל שלך'));

  const outUndefined = Filter.filterExercisesForProfile(EXERCISES, undefined);
  assert.equal(outUndefined.length, EXERCISES.length);
});

test('פרופיל ריק מחזיר את כל התרגילים ופרופיל עם רשימת ציוד ריקה מחזיר משקל גוף בלבד', () => {
  assert.equal(Filter.filterExercisesForProfile(EXERCISES, {}).length, EXERCISES.length);
  const bodyweightOnly = Filter.filterExercisesForProfile(EXERCISES, {
    equipment: [],
    limitations: []
  });
  assert.deepEqual(
    bodyweightOnly.map((ex) => ex.id),
    ['bw-squat', 'plank']
  );
});

test('טיפול ברשימת תרגילים ריקה או חסרה מחזיר מערך ריק בלי לזרוק', () => {
  assert.deepEqual(
    Filter.filterExercisesForProfile([], {
      equipment: ['dumbbell'],
      limitations: ['knees']
    }),
    []
  );
  assert.deepEqual(Filter.filterExercisesForProfile(null, null), []);
  assert.deepEqual(Filter.filterExercisesForProfile(undefined, { equipment: ['dumbbell'] }), []);
  assert.equal(Filter.exerciseMatchesProfile(null, {}), false);
  assert.equal(Filter.exerciseMatchesProfile(undefined, {}), false);
  assert.equal(Filter.exerciseMatchesProfile('string', {}), false);
  assert.equal(Filter.exerciseMatchesProfile(EXERCISES[0], { equipment: ['bodyweight'] }), true);
  assert.equal(Filter.exerciseMatchesProfile(EXERCISES[0], { equipment: ['dumbbell'] }), false);
});

test('קיום כפתור ההתאמה ב-exercises.html וחיבור מודול הסינון וקריאת הפרופיל הבטוחה', () => {
  assert.match(html, /id="filterByMyProfileBtn"/);
  assert.match(html, /library-profile-filter\.js/);
  assert.match(html, /getLibraryProfile/);
  assert.match(html, /createElement/);
  assert.match(html, /textContent/);
  assert.match(html, /createProfileMatchBadge/);
});

test('קריאה בטוחה של פרופיל אישי ופרופיל לקוח מ-js/core.js דרך getLibraryProfile', () => {
  assert.equal(typeof TH.getLibraryProfile, 'function');

  const origStorage = global.localStorage;
  const mem = {};
  global.localStorage = {
    getItem: (k) => (k in mem ? mem[k] : null),
    setItem: (k, v) => {
      mem[k] = String(v);
    },
    removeItem: (k) => {
      delete mem[k];
    }
  };

  try {
    const empty = TH.getLibraryProfile();
    assert.deepEqual(empty, { equipment: [], limitations: [] });

    global.localStorage.setItem(
      'trainerhub_client_profiles',
      JSON.stringify({
        client_1: {
          availableEquipment: ['dumbbell', 'bench'],
          injuries: ['knees']
        }
      })
    );
    const prof1 = TH.getLibraryProfile('client_1');
    assert.deepEqual(prof1.equipment, ['dumbbell', 'bench']);
    assert.deepEqual(prof1.limitations, ['knees']);

    const firstProf = TH.getLibraryProfile();
    assert.deepEqual(firstProf.equipment, ['dumbbell', 'bench']);
    assert.deepEqual(firstProf.limitations, ['knees']);

    global.localStorage.setItem('trainerhub_client_profiles', JSON.stringify({}));
    global.localStorage.setItem(
      'trainerhub_user',
      JSON.stringify({
        equipment: ['barbell'],
        limitations: ['back']
      })
    );
    const userProf = TH.getLibraryProfile();
    assert.deepEqual(userProf.equipment, ['barbell']);
    assert.deepEqual(userProf.limitations, ['back']);

    // Error handling branch
    global.localStorage.getItem = () => {
      throw new Error('Storage disabled');
    };
    const errorFallback = TH.getLibraryProfile();
    assert.deepEqual(errorFallback, { equipment: [], limitations: [] });
  } finally {
    if (origStorage) {
      global.localStorage = origStorage;
    } else {
      delete global.localStorage;
    }
  }
});

test('חיבור המודול ב-js/reel-library.js ויצירת תג התאמה ב-createElement ו-textContent', () => {
  assert.equal(typeof THReels.filterExercisesForProfile, 'function');
  const filtered = THReels.filterExercisesForProfile(EXERCISES, {
    equipment: ['dumbbell'],
    limitations: []
  });
  assert.deepEqual(
    filtered.map((e) => e.id),
    ['ohp']
  );
  assert.equal(filtered[0].matchedProfile, true);

  assert.equal(typeof THReels.createProfileMatchBadge, 'function');
  assert.equal(THReels.createProfileMatchBadge(null), null);

  const mockDoc = {
    createElement(tag) {
      return { tagName: tag.toUpperCase(), className: '', textContent: '' };
    }
  };
  const badge = THReels.createProfileMatchBadge(mockDoc);
  assert.equal(badge.tagName, 'SPAN');
  assert.equal(badge.className, 'pill ok profile-match');
  assert.equal(badge.textContent, 'מתאים לפרופיל שלך');
});

test('עטיפת תרגילים עם ציוד בצורות שונות ומגבלות מפורשות (avoidWith/contraindications)', () => {
  const variedExercises = [
    {
      id: 'ex-string-eq',
      name_he: 'תרגיל עם מחרוזת ציוד',
      muscle_group: 'חזה',
      equipment: 'משקולות, ספסל',
      steps_he: ['תרגיל']
    },
    {
      id: 'ex-array-eq',
      name_he: 'תרגיל עם מערך ציוד',
      muscle_group: 'רגליים',
      equipment: ['מוט'],
      avoidWith: ['knees'],
      steps_he: ['תרגיל']
    },
    {
      id: 'ex-single-avoid',
      name_he: 'תרגיל עם מניעה יחידה',
      muscle_group: 'גב',
      contraindications: 'כתפיים',
      equipment_tags: ['bodyweight'],
      steps_he: ['תרגיל']
    }
  ];

  assert.deepEqual(Filter.requiredEquipment(variedExercises[0]), ['dumbbell', 'bench']);
  assert.deepEqual(Filter.requiredEquipment(variedExercises[1]), ['barbell']);
  assert.deepEqual(Filter.requiredEquipment(null), []);

  const res1 = Filter.filterExercisesForProfile(variedExercises, {
    equipment: ['dumbbell', 'bench', 'barbell'],
    limitations: ['knees']
  });
  const resIds = res1.map((ex) => ex.id);
  assert.ok(resIds.includes('ex-string-eq'));
  assert.equal(resIds.includes('ex-array-eq'), false);

  const res2 = Filter.filterExercisesForProfile(variedExercises, {
    equipment: ['bodyweight', 'dumbbell', 'bench', 'barbell'],
    limitations: ['shoulders']
  });
  assert.equal(
    res2.some((ex) => ex.id === 'ex-single-avoid'),
    false
  );
});
