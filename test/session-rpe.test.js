const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  calculateSessionRpeLoad,
  saveSessionRpeEntry,
  getSessionRpeLog,
  getWeeklySrpeLoad,
  STORAGE_KEY
} = require('../js/session-rpe.js');

test('חישוב 45 דקות × RPE 7 = 315 ומסווג עצימות', () => {
  const result = calculateSessionRpeLoad(45, 7);
  assert.strictEqual(result.load, 315);
  assert.strictEqual(result.durationMinutes, 45);
  assert.strictEqual(result.rpe, 7);
  assert.strictEqual(result.intensity, 'very_hard');
  assert.strictEqual(result.intensityLabel, 'קשה מאוד');
  assert.strictEqual(Number(result), 315);
});

test('קיטוע RPE לטווח 1-10', () => {
  const highRpe = calculateSessionRpeLoad(30, 15);
  assert.strictEqual(highRpe.rpe, 10);
  assert.strictEqual(highRpe.load, 300);
  assert.strictEqual(highRpe.intensity, 'maximal');

  const lowRpe = calculateSessionRpeLoad(30, 0.4);
  assert.strictEqual(lowRpe.rpe, 1);
  assert.strictEqual(lowRpe.load, 30);
  assert.strictEqual(lowRpe.intensity, 'light');

  const exactTen = calculateSessionRpeLoad(20, 10);
  assert.strictEqual(exactTen.rpe, 10);
  assert.strictEqual(exactTen.load, 200);

  const exactOne = calculateSessionRpeLoad(20, 1);
  assert.strictEqual(exactOne.rpe, 1);
  assert.strictEqual(exactOne.load, 20);
});

test('קלט שלילי/null בחישוב עומס sRPE', () => {
  const negDuration = calculateSessionRpeLoad(-45, 7);
  assert.strictEqual(negDuration.load, 0);

  const nullDuration = calculateSessionRpeLoad(null, 7);
  assert.strictEqual(nullDuration.load, 0);

  const negRpe = calculateSessionRpeLoad(45, -3);
  assert.strictEqual(negRpe.load, 0);

  const nullRpe = calculateSessionRpeLoad(45, null);
  assert.strictEqual(nullRpe.load, 0);

  const bothNull = calculateSessionRpeLoad(null, null);
  assert.strictEqual(bothNull.load, 0);

  const nanInput = calculateSessionRpeLoad('bad', 'val');
  assert.strictEqual(nanInput.load, 0);
});

test('שמירה תחת שגיאת storage ושמירה תקינה ב-trainerhub_srpe_log', () => {
  const failingStorage = {
    getItem: () => null,
    setItem: () => {
      throw new Error('QuotaExceededError');
    }
  };

  assert.doesNotThrow(() => {
    const outcome = saveSessionRpeEntry({ durationMinutes: 45, rpe: 7 }, failingStorage);
    assert.strictEqual(outcome, false);
  });

  const mem = {};
  const workingStorage = {
    getItem: (key) => (Object.hasOwn(mem, key) ? mem[key] : null),
    setItem: (key, val) => {
      mem[key] = String(val);
    }
  };

  const saveSuccess = saveSessionRpeEntry(
    { durationMinutes: 45, rpe: 7, clientId: 'client_1', title: 'אימון כוח' },
    workingStorage
  );
  assert.strictEqual(saveSuccess, true);
  assert.ok(mem[STORAGE_KEY]);

  const log = getSessionRpeLog(workingStorage);
  assert.strictEqual(log.length, 1);
  assert.strictEqual(log[0].load, 315);
  assert.strictEqual(log[0].clientId, 'client_1');
  assert.strictEqual(log[0].title, 'אימון כוח');

  const weekly = getWeeklySrpeLoad('client_1', workingStorage);
  assert.strictEqual(weekly.totalLoad, 315);
  assert.strictEqual(weekly.sessionCount, 1);
});

test('קיום הבורר והתווית ב-frontend/workout-mode.html וב-journal.html', () => {
  const workoutHtmlPath = path.join(__dirname, '..', 'frontend', 'workout-mode.html');
  const workoutHtml = fs.readFileSync(workoutHtmlPath, 'utf8');

  assert.ok(
    /<select[^>]*id="sessionRpeSelect"/.test(workoutHtml),
    'frontend/workout-mode.html must contain select id="sessionRpeSelect"'
  );
  assert.ok(
    /<label[^>]*for="sessionRpeSelect"/.test(workoutHtml),
    'frontend/workout-mode.html must contain label for="sessionRpeSelect"'
  );
  assert.ok(workoutHtml.includes('session-rpe.js'), 'frontend/workout-mode.html must include session-rpe.js');

  const journalHtmlPath = path.join(__dirname, '..', 'journal.html');
  const journalHtml = fs.readFileSync(journalHtmlPath, 'utf8');

  assert.ok(
    journalHtml.includes('id="weeklySrpeLoadSummary"'),
    'journal.html must contain element with id="weeklySrpeLoadSummary"'
  );
  assert.ok(journalHtml.includes('session-rpe.js'), 'journal.html must include session-rpe.js');
});
