const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  toggleReserveSessionDone,
  getReserveProgressSummary,
  compareBaselineAndCurrent,
  STORAGE_KEY
} = require('../js/reserves-planner.js');

const { formatReservesResultText, buildWhatsAppShareUrl } = require('../js/whatsapp-share.js');

function createMockStorage(initialData) {
  const store = initialData ? Object.assign({}, initialData) : {};
  return {
    store,
    getItem(key) {
      return Object.hasOwn(store, key) ? store[key] : null;
    },
    setItem(key, value) {
      store[key] = String(value);
    },
    removeItem(key) {
      delete store[key];
    },
    clear() {
      for (const k of Object.keys(store)) {
        delete store[k];
      }
    }
  };
}

test('סימון וביטול אימון - סימון אימון כהושלם וביטולו בקריאה חוזרת', () => {
  const storage = createMockStorage();

  const res1 = toggleReserveSessionDone(1, 1, storage);
  assert.equal(res1.success, true, 'פעולה ראשונה צריכה להצליח');
  assert.equal(res1.done, true, 'אימון שבוע 1 יום 1 צריך להיות מסומן כהושלם');
  assert.equal(res1.completedCount, 1, 'צריך להיות אימון אחד שהושלם');

  const raw1 = storage.getItem(STORAGE_KEY);
  assert.ok(raw1, 'הנתונים צריכים להישמר ב-storage תחת המפתח הנכון');
  const parsed1 = JSON.parse(raw1);
  assert.equal(parsed1.completedSessions['1-1'], true, 'המפתח 1-1 צריך להיות מסומן');

  const res2 = toggleReserveSessionDone(1, 1, storage);
  assert.equal(res2.success, true, 'פעולה שנייה צריכה להצליח');
  assert.equal(res2.done, false, 'אימון שבוע 1 יום 1 צריך להתבטל בחזרה');
  assert.equal(res2.completedCount, 0, 'מספר האימונים שהושלמו צריך לחזור ל-0');

  const res3 = toggleReserveSessionDone(3, 2, storage);
  assert.equal(res3.done, true, 'אימון שבוע 3 יום 2 צריך להיות מסומן כהושלם');
  assert.equal(res3.completedCount, 1, 'מונה אימונים צריך להיות 1');

  const res4 = toggleReserveSessionDone(3, 2, storage);
  assert.equal(res4.done, false, 'אימון שבוע 3 יום 2 צריך להתבטל');
  assert.equal(res4.completedCount, 0, 'מונה אימונים צריך לחזור ל-0');
});

test('חישוב אחוז השלמה - חישוב מדויק של אחוז ההשלמה מתוך 18 יחידות אימון', () => {
  const storage = createMockStorage();

  const initialSummary = getReserveProgressSummary(storage);
  assert.equal(initialSummary.totalSessions, 18, 'סה"כ יחידות אימון בתוכנית 6 שבועות הוא 18');
  assert.equal(initialSummary.completedCount, 0, 'התחלה עם 0 אימונים');
  assert.equal(initialSummary.percent, 0, '0% השלמה בהתחלה');
  assert.equal(initialSummary.isComplete, false);

  for (let d = 1; d <= 3; d++) {
    toggleReserveSessionDone(1, d, storage);
  }
  const summary3 = getReserveProgressSummary(storage);
  assert.equal(summary3.completedCount, 3);
  assert.equal(summary3.percent, Math.round((3 / 18) * 100), '3 מתוך 18 שווה ל-17%');

  for (let w = 2; w <= 3; w++) {
    for (let d = 1; d <= 3; d++) {
      toggleReserveSessionDone(w, d, storage);
    }
  }
  const summary9 = getReserveProgressSummary(storage);
  assert.equal(summary9.completedCount, 9);
  assert.equal(summary9.percent, 50, '9 מתוך 18 שווה ל-50% בדיוק');

  for (let w = 4; w <= 6; w++) {
    for (let d = 1; d <= 3; d++) {
      toggleReserveSessionDone(w, d, storage);
    }
  }
  const summary18 = getReserveProgressSummary(storage);
  assert.equal(summary18.completedCount, 18);
  assert.equal(summary18.percent, 100, 'כל 18 האימונים הושלמו: 100%');
  assert.equal(summary18.isComplete, true);
});

test('שבוע פעיל נוכחי - קביעת השבוע הפעיל הנוכחי לפי התקדמות האימונים', () => {
  const storage = createMockStorage();

  let summary = getReserveProgressSummary(storage);
  assert.equal(summary.activeWeek, 1, 'שבוע פעיל התחלתי הוא 1');

  toggleReserveSessionDone(1, 1, storage);
  summary = getReserveProgressSummary(storage);
  assert.equal(summary.activeWeek, 1, 'שבוע 1 עדיין פעיל כשחלק מאימוניו בוצעו');

  toggleReserveSessionDone(1, 2, storage);
  toggleReserveSessionDone(1, 3, storage);
  summary = getReserveProgressSummary(storage);
  assert.equal(summary.activeWeek, 2, 'לאחר השלמת שבוע 1, השבוע הפעיל הבא הוא 2');

  toggleReserveSessionDone(2, 1, storage);
  toggleReserveSessionDone(2, 2, storage);
  toggleReserveSessionDone(2, 3, storage);
  summary = getReserveProgressSummary(storage);
  assert.equal(summary.activeWeek, 3, 'לאחר השלמת שבוע 2, השבוע הפעיל הבא הוא 3');

  for (let w = 3; w <= 6; w++) {
    for (let d = 1; d <= 3; d++) {
      toggleReserveSessionDone(w, d, storage);
    }
  }
  summary = getReserveProgressSummary(storage);
  assert.equal(summary.activeWeek, 6, 'בסיום כל 6 השבועות, השבוע הפעיל נשאר 6');
});

test('השוואת שיפור בריצה ובכוח - חישוב קיזוז זמן בריצה ותוספת חזרות בכוח בין מבדק פתיחה לעדכני', () => {
  const storage = createMockStorage();

  const baseline = {
    run3000: '15:00',
    hr_pushups: 20,
    pullups: 4,
    dips: 6
  };

  const current = {
    run3000: '13:45',
    hr_pushups: 28,
    pullups: 7,
    dips: 10
  };

  const result = compareBaselineAndCurrent(baseline, current, storage);

  assert.equal(result.hasComparison, true, 'צריכה להתקיים השוואה תקינה');
  assert.equal(result.improved, true, 'נרשם שיפור כללי במדדים');
  assert.ok(result.run, 'צריך להחזיר אובייקט השוואת ריצה');
  assert.equal(result.run.baseline, 900);
  assert.equal(result.run.current, 825);
  assert.equal(result.run.diffSeconds, 75, 'קיזוז של 75 שניות בריצה');
  assert.equal(result.run.improved, true, 'ריצה מהירה יותר נחשבת שיפור');

  assert.ok(result.pushups, 'צריך להחזיר אובייקט השוואת שכיבות סמיכה / כוח');
  assert.equal(result.pushups.baseline, 20);
  assert.equal(result.pushups.current, 28);
  assert.equal(result.pushups.diffReps, 8, 'תוספת של 8 חזרות בכוח');
  assert.equal(result.pushups.improved, true, 'תוספת חזרות נחשבת שיפור');

  assert.ok(result.pullups);
  assert.equal(result.pullups.diffReps, 3);
  assert.equal(result.pullups.improved, true);

  assert.ok(result.dips);
  assert.equal(result.dips.diffReps, 4);
  assert.equal(result.dips.improved, true);

  const slowerCurrent = {
    run3000: '16:00',
    hr_pushups: 18,
    pullups: 3,
    dips: 5
  };
  const regressed = compareBaselineAndCurrent(baseline, slowerCurrent, storage);
  assert.equal(regressed.run.improved, false, 'ריצה איטית יותר אינה שיפור');
  assert.equal(regressed.run.diffSeconds, -60, 'עיכוב של 60 שניות בריצה');
  assert.equal(regressed.pushups.improved, false, 'פחות חזרות אינן שיפור');
  assert.equal(regressed.pushups.diffReps, -2);
  assert.equal(regressed.pullups.improved, false);
  assert.equal(regressed.dips.improved, false);
  assert.equal(regressed.improved, false);

  const testArrFormat = compareBaselineAndCurrent(
    {
      tests: [
        { id: 'run3000', value: '14:00' },
        { id: 'hr_pushups', value: '15' }
      ]
    },
    {
      tests: [
        { id: 'run3000', display: '13:30' },
        { id: 'hr_pushups', display: '22' }
      ]
    },
    storage
  );
  assert.equal(testArrFormat.hasComparison, true);
  assert.equal(testArrFormat.run.diffSeconds, 30);
  assert.equal(testArrFormat.pushups.diffReps, 7);

  const equalCurrent = { run3000: 840, hr_pushups: 22 };
  const equalRes = compareBaselineAndCurrent(equalCurrent, equalCurrent, storage);
  assert.equal(equalRes.hasComparison, true);
  assert.equal(equalRes.run.improved, false);
  assert.equal(equalRes.pushups.improved, false);
  assert.equal(equalRes.improved, false);

  const savedComp = compareBaselineAndCurrent(null, null, storage);
  assert.equal(savedComp.hasComparison, true);
});

test('קלט null/חריג - עמידות והחזרת ערכי ברירת מחדל בטוחים בקלטים ריקים או שגויים', () => {
  const storage = createMockStorage();

  const t1 = toggleReserveSessionDone(null, null, storage);
  assert.equal(t1.success, false, 'קלט שבוע/יום null לא זורק שגיאה ומחזיר success: false');

  const t2 = toggleReserveSessionDone(undefined, undefined, storage);
  assert.equal(t2.success, false);

  const t3 = toggleReserveSessionDone(99, 99, storage);
  assert.equal(t3.success, false, 'שבוע 99 מחוץ לטווח 1-6');

  const t4 = toggleReserveSessionDone(2, -1, storage);
  assert.equal(t4.success, false, 'יום שלילי לא חוקי');

  const sumNull = getReserveProgressSummary(null);
  assert.equal(sumNull.completedCount, 0);
  assert.equal(sumNull.percent, 0);
  assert.equal(sumNull.activeWeek, 1);

  const compNull = compareBaselineAndCurrent(null, null);
  assert.equal(compNull.hasComparison, false);
  assert.equal(compNull.improved, false);

  const compInvalid = compareBaselineAndCurrent('invalid_str', 12345);
  assert.equal(compInvalid.hasComparison, false);
  assert.equal(compInvalid.improved, false);

  const compPartial = compareBaselineAndCurrent({ run: 'not_a_time' }, { run: '' });
  assert.equal(compPartial.hasComparison, false);

  const compBlank = compareBaselineAndCurrent({ hr_pushups: '' }, { hr_pushups: null });
  assert.equal(compBlank.hasComparison, false);

  storage.setItem(STORAGE_KEY, 'not-valid-json');
  const sumCorrupt = getReserveProgressSummary(storage);
  assert.equal(sumCorrupt.completedCount, 0);

  storage.setItem(STORAGE_KEY, JSON.stringify(12345));
  const sumNonObj = getReserveProgressSummary(storage);
  assert.equal(sumNonObj.completedCount, 0);
});

test('שגיאת storage - טיפול אלגנטי בחריגות אחסון תחת try/catch במפתח trainerhub_reserves_progress', () => {
  const throwingStorage = {
    getItem() {
      throw new Error('SecurityError: localStorage is disabled in private browsing');
    },
    setItem() {
      throw new Error('QuotaExceededError: storage quota exceeded');
    },
    removeItem() {
      throw new Error('Storage error');
    }
  };

  assert.doesNotThrow(() => {
    const summary = getReserveProgressSummary(throwingStorage);
    assert.equal(summary.completedCount, 0);
    assert.equal(summary.percent, 0);
    assert.equal(summary.activeWeek, 1);
  }, 'שגיאת storage ב-getReserveProgressSummary מטופלת ללא קריסה');

  assert.doesNotThrow(() => {
    const toggleRes = toggleReserveSessionDone(1, 1, throwingStorage);
    assert.equal(toggleRes.success, false);
    assert.equal(toggleRes.done, false);
  }, 'שגיאת storage ב-toggleReserveSessionDone מטופלת ללא קריסה');

  assert.doesNotThrow(() => {
    const compRes = compareBaselineAndCurrent(
      { run3000: '15:00', hr_pushups: 20 },
      { run3000: '14:00', hr_pushups: 25 },
      throwingStorage
    );
    assert.equal(compRes.hasComparison, true);
    assert.equal(compRes.run.improved, true);
    assert.equal(compRes.pushups.improved, true);
  }, 'שגיאת storage ב-compareBaselineAndCurrent מטופלת ללא קריסה והחישוב מתבצע');

  const throwingInput = {
    get run3000() {
      throw new Error('Explosion');
    }
  };
  const compThrow = compareBaselineAndCurrent(throwingInput, throwingInput);
  assert.equal(compThrow.hasComparison, false);
  assert.equal(compThrow.summaryText, 'שגיאה בחישוב השוואה');

  const origLocal = global.localStorage;
  global.localStorage = createMockStorage();
  const defSum = getReserveProgressSummary();
  assert.equal(defSum.completedCount, 0);
  if (origLocal !== undefined) {
    global.localStorage = origLocal;
  } else {
    delete global.localStorage;
  }
});

test('שיתוף וואטסאפ עם התקדמות - formatReservesResultText כולל שורת אחוז התקדמות בתוכנית ה-6 שבועות', () => {
  const evalWithProgress = {
    overall: 'pass',
    allPassed: true,
    deadline_display_he: '1.12',
    progress: {
      percent: 50,
      activeWeek: 3,
      completedCount: 9,
      totalSessions: 18
    },
    tests: [
      {
        id: 'hr_pushups',
        name_he: 'שכיבות סמיכה',
        pass: true,
        display: '25'
      }
    ]
  };

  const text1 = formatReservesResultText(evalWithProgress);
  assert.ok(text1.includes('התקדמות בתוכנית 6 שבועות: 50%'), 'חייב לכלול שורת התקדמות עם 50%');
  assert.ok(text1.includes('שבוע פעיל: 3'), 'חייב לכלול שבוע פעיל');

  const evalBase = {
    overall: 'pass',
    allPassed: true,
    tests: [{ id: 'hr_pushups', name_he: 'שכיבות סמיכה', pass: true }]
  };
  const text2 = formatReservesResultText(evalBase, 75);
  assert.ok(text2.includes('התקדמות בתוכנית 6 שבועות: 75%'), 'חייב לתמוך בהעברת התקדמות כפרמטר נוסף');

  const textStrProgress = formatReservesResultText(evalBase, '60%');
  assert.ok(textStrProgress.includes('התקדמות בתוכנית 6 שבועות: 60%'));

  const singleTestEval = {
    pass: true,
    id: 'run3000',
    name_he: 'ריצת 3000',
    display: '14:20'
  };
  const singleText = formatReservesResultText(singleTestEval, { percent: 40, activeWeek: 2 });
  assert.ok(singleText.includes('התקדמות בתוכנית 6 שבועות: 40%'));
  assert.ok(singleText.includes('שבוע פעיל: 2'));

  const shareUrl = buildWhatsAppShareUrl(text1);
  assert.ok(shareUrl.startsWith('https://wa.me/?text='), 'הקישור חייב להתחיל ב-wa.me');
  assert.ok(shareUrl.includes(encodeURIComponent('התקדמות בתוכנית 6 שבועות: 50%')));
});

test('וקיום הלוח ב-reserves.html - בדיקת קיום האלמנטים reserves6WeekTracker ו-reservesComparisonOut וטעינת המודולים', () => {
  const htmlPath = path.join(__dirname, '..', 'reserves.html');
  const html = fs.readFileSync(htmlPath, 'utf8');

  assert.ok(html.includes('id="reserves6WeekTracker"'), 'reserves.html חייב להכיל אלמנט עם id="reserves6WeekTracker"');
  assert.ok(
    html.includes('id="reservesComparisonOut"'),
    'reserves.html חייב להכיל אלמנט עם id="reservesComparisonOut"'
  );
  assert.ok(html.includes('src="./js/reserves-planner.js"'), 'reserves.html חייב לטעון את הסקריפט reserves-planner.js');
  assert.ok(html.includes('src="./js/whatsapp-share.js"'), 'reserves.html חייב לטעון את הסקריפט whatsapp-share.js');

  assert.ok(html.includes('render6WeekTracker'), 'reserves.html חייב להגדיר ולקרוא לפונקציית render6WeekTracker');
  assert.ok(html.includes('renderComparison'), 'reserves.html חייב להגדיר ולקרוא לפונקציית renderComparison');

  assert.ok(
    html.includes('createElement') && html.includes('textContent'),
    'רינדור הלוח והשוואת המבדקים חייב להתבצע באמצעות createElement ו-textContent בטוחים'
  );
});
