const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { calculateWeeklyStreak } = require('../js/streak-tracker.js');

const rootDir = path.join(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');
const journalHtml = fs.readFileSync(path.join(rootDir, 'journal.html'), 'utf8');

test('calculateWeeklyStreak: רצף 0 בהיסטוריה ריקה', () => {
  const result = calculateWeeklyStreak([], '2026-11-22', 3);
  assert.equal(result.streak, 0);
  assert.equal(result.currentStreak, 0);
  assert.equal(result.complianceRate, 0);
  assert.equal(result.sessionsThisWeek, 0);
  assert.match(result.message, /התמדה/);
  assert.match(result.message, /תפקוד/);
  assert.match(result.message, /משקל בודד/);
});

test('calculateWeeklyStreak: רצף של שבוע אחד', () => {
  const sessions = [
    { doneAt: '2026-11-22T08:00:00Z' },
    { doneAt: '2026-11-24T09:00:00Z' },
    { doneAt: '2026-11-26T10:00:00Z' }
  ];
  const result = calculateWeeklyStreak(sessions, '2026-11-22', 3);
  assert.equal(result.streak, 1);
  assert.equal(result.currentStreak, 1);
  assert.equal(result.complianceRate, 100);
  assert.equal(result.sessionsThisWeek, 3);
  assert.match(result.message, /התמדה/);
  assert.match(result.message, /תפקוד/);
  assert.match(result.message, /משקל בודד/);
});

test('calculateWeeklyStreak: רצף של 3 שבועות רצופים', () => {
  const sessions = [
    // Week 0: 2026-11-22
    { doneAt: '2026-11-22T08:00:00Z' },
    { doneAt: '2026-11-23T08:00:00Z' },
    { doneAt: '2026-11-25T08:00:00Z' },
    // Week -1: 2026-11-15
    { doneAt: '2026-11-15T08:00:00Z' },
    { doneAt: '2026-11-17T08:00:00Z' },
    { doneAt: '2026-11-19T08:00:00Z' },
    // Week -2: 2026-11-08
    { doneAt: '2026-11-08T08:00:00Z' },
    { doneAt: '2026-11-10T08:00:00Z' },
    { doneAt: '2026-11-12T08:00:00Z' }
  ];
  const result = calculateWeeklyStreak(sessions, '2026-11-22', 3);
  assert.equal(result.streak, 3);
  assert.equal(result.currentStreak, 3);
  assert.equal(result.complianceRate, 100);
  assert.match(result.message, /התמדה/);
  assert.match(result.message, /תפקוד/);
  assert.match(result.message, /משקל בודד/);
});

test('calculateWeeklyStreak: שבירת רצף בשבוע חסר', () => {
  const sessions = [
    // Week 0: met
    { doneAt: '2026-11-22T08:00:00Z' },
    { doneAt: '2026-11-24T08:00:00Z' },
    { doneAt: '2026-11-26T08:00:00Z' },
    // Week -1 (2026-11-15): 0 sessions (broken streak!)
    // Week -2 (2026-11-08): met
    { doneAt: '2026-11-08T08:00:00Z' },
    { doneAt: '2026-11-10T08:00:00Z' },
    { doneAt: '2026-11-12T08:00:00Z' },
    // Week -3 (2026-11-01): met
    { doneAt: '2026-11-01T08:00:00Z' },
    { doneAt: '2026-11-03T08:00:00Z' },
    { doneAt: '2026-11-05T08:00:00Z' }
  ];
  const result = calculateWeeklyStreak(sessions, '2026-11-22', 3);
  assert.equal(result.streak, 1);
});

test('calculateWeeklyStreak: חישוב אחוז עמידה', () => {
  const sessions = [{ doneAt: '2026-11-22T08:00:00Z' }, { doneAt: '2026-11-24T08:00:00Z' }];
  const result50 = calculateWeeklyStreak(sessions, '2026-11-22', 4);
  assert.equal(result50.complianceRate, 50);
  assert.equal(result50.adherenceRate, 50);
  assert.equal(result50.sessionsThisWeek, 2);

  const result100 = calculateWeeklyStreak(sessions, '2026-11-22', 2);
  assert.equal(result100.complianceRate, 100);
  assert.equal(result100.adherenceRate, 100);
});

test('calculateWeeklyStreak: קלט תאריכים שגוי/null', () => {
  const resultNull = calculateWeeklyStreak(null, null, null);
  assert.equal(resultNull.streak, 0);
  assert.equal(resultNull.complianceRate, 0);
  assert.equal(typeof resultNull.message, 'string');
  assert.match(resultNull.message, /התמדה/);
  assert.match(resultNull.message, /תפקוד/);
  assert.match(resultNull.message, /משקל בודד/);

  const messySessions = [null, undefined, {}, { doneAt: 'not-a-valid-date' }, { date: 1234567890 }];
  const resultMessy = calculateWeeklyStreak(messySessions, 'invalid-reference-date', -10);
  assert.equal(typeof resultMessy.streak, 'number');
  assert.equal(typeof resultMessy.complianceRate, 'number');
  assert.match(resultMessy.message, /משקל בודד/);
});

test('index.html: קיום האלמנטים ובאנר רצף שבועי נגיש (weeklyStreakBanner)', () => {
  assert.match(
    indexHtml,
    /\bid=["']weeklyStreakBanner["']/i,
    'element with id="weeklyStreakBanner" must exist in index.html'
  );
  assert.match(
    indexHtml,
    /<[^>]*\bid=["']weeklyStreakBanner["'][^>]*role=["']status["']/i,
    'weeklyStreakBanner must have role="status"'
  );
  assert.match(
    indexHtml,
    /<script\b[^>]*src=["']\.\/js\/streak-tracker\.js["']/i,
    'index.html must include script ./js/streak-tracker.js'
  );
  assert.match(indexHtml, /textContent/i, 'index.html must update DOM via textContent');
});

test('journal.html: קיום האלמנטים וסיכום רצף שבועי (journalStreakSummary)', () => {
  assert.match(
    journalHtml,
    /\bid=["']journalStreakSummary["']/i,
    'element with id="journalStreakSummary" must exist in journal.html'
  );
  assert.match(
    journalHtml,
    /<script\b[^>]*src=["']\.\/js\/streak-tracker\.js["']/i,
    'journal.html must include script ./js/streak-tracker.js'
  );
  assert.match(
    journalHtml,
    /renderWeeklyStreakSummary/i,
    'journal.html must declare or call renderWeeklyStreakSummary'
  );
});
