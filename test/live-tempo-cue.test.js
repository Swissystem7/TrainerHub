const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { getTempoCueForPhase, getRestCountdownAlert } = require('../js/live-tempo-cue.js');
const { createLiveSession, logSetAndAdvance } = require('../js/live-workout.js');
const { readIndex } = require('./helpers/page-source');

test('1) שלב אקסצנטרי מחזיר הנחיית ירידה איטית מדויקת לפי קצב', () => {
  const exercise = { name: 'סקוואט', tempo: '3-1-1' };
  const cue0 = getTempoCueForPhase(exercise, 0);
  assert.equal(cue0, 'ירידה איטית 3 שניות');

  const cue1500 = getTempoCueForPhase(exercise, 1500);
  assert.equal(cue1500, 'ירידה איטית 3 שניות');

  // Verify next rep cycle (at 5000ms)
  const cueNextRep = getTempoCueForPhase(exercise, 5000);
  assert.equal(cueNextRep, 'ירידה איטית 3 שניות');

  // Verify custom eccentric tempo duration
  const exercise4 = { name: 'לחיצת חזה', tempo: '4-2-1' };
  const cue4 = getTempoCueForPhase(exercise4, 2000);
  assert.equal(cue4, 'ירידה איטית 4 שניות');

  // Verify live workout session carries tempo
  const session = createLiveSession({ exercises: [exercise] });
  assert.equal(session.exercises[0].tempo, '3-1-1');
});

test('2) שלב עצירה מחזיר הנחיית עצירה בתחתית', () => {
  const exercise = { name: 'סקוואט', tempo: '3-1-1' };
  const cue3000 = getTempoCueForPhase(exercise, 3000);
  assert.equal(cue3000, 'עצירה בתחתית');

  const cue3800 = getTempoCueForPhase(exercise, 3800);
  assert.equal(cue3800, 'עצירה בתחתית');

  // Verify next rep cycle pause (at 8500ms)
  const cueNextRepPause = getTempoCueForPhase(exercise, 8500);
  assert.equal(cueNextRepPause, 'עצירה בתחתית');
});

test('3) שלב קונצנטרי מחזיר הנחיית עלייה מבוקרת', () => {
  const exercise = { name: 'סקוואט', tempo: '3-1-1' };
  const cue4000 = getTempoCueForPhase(exercise, 4000);
  assert.equal(cue4000, 'עלייה מבוקרת');

  const cue4800 = getTempoCueForPhase(exercise, 4800);
  assert.equal(cue4800, 'עלייה מבוקרת');

  // Verify next rep cycle concentric (at 9200ms)
  const cueNextRepCon = getTempoCueForPhase(exercise, 9200);
  assert.equal(cueNextRepCon, 'עלייה מבוקרת');

  // Verify logging set with tempo
  const session = createLiveSession({ exercises: [exercise] });
  logSetAndAdvance(session, { actualReps: 8, weightKg: 60, rir: 2, tempo: '3-1-1' });
  assert.equal(session.loggedSets[0].tempo, '3-1-1');
});

test('4) התראת 3 שניות אחרונות במנוחה מופעלת בדיוק בזמן', () => {
  const alert3 = getRestCountdownAlert(3, true);
  assert.equal(alert3.alert, true);
  assert.equal(alert3.beep, true);
  assert.equal(alert3.sound, true);
  assert.ok(alert3.text.includes('3'));

  const alert2 = getRestCountdownAlert(2, true);
  assert.equal(alert2.alert, true);
  assert.equal(alert2.beep, true);

  const alert1 = getRestCountdownAlert(1, true);
  assert.equal(alert1.alert, true);
  assert.equal(alert1.beep, true);
  assert.ok(alert1.text.includes('שנייה אחת'));

  // More than 3 seconds remaining should not alert
  const alert10 = getRestCountdownAlert(10, true);
  assert.equal(alert10.alert, false);
  assert.equal(alert10.beep, false);
  assert.equal(alert10.text, '');
});

test('5) השתקת קול מבטלת צפצוף ושומרת העדפה ב-localStorage', () => {
  const mockStore = {};
  const mockStorage = {
    getItem(k) {
      return mockStore[k] || null;
    },
    setItem(k, v) {
      mockStore[k] = String(v);
    }
  };

  const alertMuted = getRestCountdownAlert(2, false, mockStorage);
  assert.equal(alertMuted.alert, true);
  assert.equal(alertMuted.sound, false);
  assert.equal(alertMuted.beep, false);
  assert.equal(mockStorage.getItem('trainerhub_rest_sound_preference'), 'false');

  const alertUnmuted = getRestCountdownAlert(2, true, mockStorage);
  assert.equal(alertUnmuted.alert, true);
  assert.equal(alertUnmuted.sound, true);
  assert.equal(alertUnmuted.beep, true);
  assert.equal(mockStorage.getItem('trainerhub_rest_sound_preference'), 'true');
});

test('6) טיפול בטוח בקלט null/שלילי ללא קריסות', () => {
  assert.equal(getTempoCueForPhase(null, 1000), '');
  assert.equal(getTempoCueForPhase({ tempo: '3-1-1' }, -100), '');
  assert.equal(getTempoCueForPhase(undefined, null), '');
  assert.equal(getTempoCueForPhase({ tempo: '3-1-1' }, Number.NaN), '');

  const alertNull = getRestCountdownAlert(null, null);
  assert.equal(alertNull.alert, false);
  assert.equal(alertNull.beep, false);

  const alertNegative = getRestCountdownAlert(-5, true);
  assert.equal(alertNegative.alert, false);
  assert.equal(alertNegative.beep, false);
});

test('7) שמירת העדפה תחת שגיאת storage נתפסת בבטחה תחת try/catch', () => {
  const faultyStorage = {
    getItem() {
      throw new Error('QuotaExceededError read');
    },
    setItem() {
      throw new Error('QuotaExceededError write');
    }
  };

  assert.doesNotThrow(() => {
    const res = getRestCountdownAlert(3, false, faultyStorage);
    assert.equal(res.alert, true);
    assert.equal(res.sound, false);
    assert.equal(res.beep, false);
  });
});

test('8) קיום האלמנטים ב-frontend/workout-mode.html וחיבורי הקצב וההתראה', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'frontend', 'workout-mode.html'), 'utf8');

  assert.ok(html.includes('tempoCueBanner'), 'id="tempoCueBanner" קיים במסמך');
  assert.ok(html.includes('restAlertToggleBtn'), 'id="restAlertToggleBtn" קיים במסמך');
  assert.ok(html.includes('live-tempo-cue.js'), 'טעינת live-tempo-cue.js קיימת');
  assert.ok(html.includes('createElement'), 'שימוש ב-createElement קיים');
  assert.ok(html.includes('textContent'), 'שימוש ב-textContent קיים');
  assert.ok(!html.includes('innerHTML = `<div id="tempoCueBanner"'), 'לא נעשה שימוש ב-innerHTML ליצירת האלמנטים');

  const indexHtml = readIndex();
  assert.ok(indexHtml.includes('liveWorkoutTempoSelect'), 'בחירת קצב מבוקר קיימת ב-index.html');
});
