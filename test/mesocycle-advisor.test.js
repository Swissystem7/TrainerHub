const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const advisor = require('../js/mesocycle-advisor.js');
const {
  evaluateMesocycleAge,
  getMesocycleStartDate,
  setMesocycleStartDate,
  updateMesocycleBanner,
  initMesocycleAdvisor,
  STORAGE_KEY
} = advisor;

test('1. זיהוי שלב המשך בשבוע 2 (continue_current)', () => {
  const nowDate = new Date('2026-11-15T12:00:00.000Z');
  // 14 days earlier -> week 2
  const startDate = new Date('2026-11-01T12:00:00.000Z').toISOString();
  const res = evaluateMesocycleAge(startDate, nowDate, 6);

  assert.equal(res.status, 'continue_current');
  assert.equal(res.recommendation, 'continue_current');
  assert.equal(res.weeks, 2);
  assert.equal(res.days, 14);
  assert.equal(res.completedSessions, 6);
  assert.equal(String(res), 'continue_current');
  assert.match(res.badgeText, /שבוע 2/);
  assert.match(res.message, /המשך בתוכנית הנוכחית/);
});

test('2. התראת הכנה בשבוע 6 (prepare_rotation)', () => {
  const nowDate = new Date('2026-11-15T12:00:00.000Z');
  // 42 days earlier -> week 6
  const startDate = new Date('2026-10-04T12:00:00.000Z').toISOString();
  const res = evaluateMesocycleAge(startDate, nowDate, 18);

  assert.equal(res.status, 'prepare_rotation');
  assert.equal(res.recommendation, 'prepare_rotation');
  assert.equal(res.weeks, 6);
  assert.equal(res.days, 42);
  assert.equal(res.completedSessions, 18);
  assert.equal(String(res), 'prepare_rotation');
  assert.match(res.badgeText, /הכנה לרענון/);
  assert.match(res.message, /התראת הכנה/);

  // Week 7 check (49 days)
  const startDateWk7 = new Date('2026-09-27T12:00:00.000Z').toISOString();
  const res7 = evaluateMesocycleAge(startDateWk7, nowDate, 21);
  assert.equal(res7.status, 'prepare_rotation');
  assert.equal(res7.weeks, 7);
});

test('3. המלצת רענון בשבוע 8 (rotate_now)', () => {
  const nowDate = new Date('2026-11-15T12:00:00.000Z');
  // 56 days earlier -> week 8
  const startDate = new Date('2026-09-20T12:00:00.000Z').toISOString();
  const res = evaluateMesocycleAge(startDate, nowDate, 24);

  assert.equal(res.status, 'rotate_now');
  assert.equal(res.recommendation, 'rotate_now');
  assert.equal(res.weeks, 8);
  assert.equal(res.days, 56);
  assert.equal(res.completedSessions, 24);
  assert.equal(String(res), 'rotate_now');
  assert.match(res.badgeText, /רענון מומלץ/);
  assert.match(res.message, /מומלץ לרענן תרגילים/);

  // Beyond week 8 (e.g. week 10, 70 days)
  const startDateWk10 = new Date('2026-09-06T12:00:00.000Z').toISOString();
  const res10 = evaluateMesocycleAge(startDateWk10, nowDate, 30);
  assert.equal(res10.status, 'rotate_now');
  assert.equal(res10.weeks, 10);
});

test('4. קלט תאריך שגוי/null ושגיאת storage', () => {
  const nowDate = new Date('2026-11-15T12:00:00.000Z');

  // Null input
  const resNull = evaluateMesocycleAge(null, nowDate);
  assert.equal(resNull.status, 'continue_current');
  assert.equal(resNull.weeks, 0);
  assert.equal(resNull.days, 0);

  // Undefined input
  const resUndef = evaluateMesocycleAge(undefined, nowDate);
  assert.equal(resUndef.status, 'continue_current');
  assert.equal(resUndef.weeks, 0);

  // Invalid date string
  const resInvalid = evaluateMesocycleAge('not-a-valid-date', nowDate);
  assert.equal(resInvalid.status, 'continue_current');
  assert.equal(resInvalid.weeks, 0);

  // Future start date clamps safely
  const resFuture = evaluateMesocycleAge('2026-12-01T00:00:00.000Z', nowDate);
  assert.equal(resFuture.status, 'continue_current');
  assert.equal(resFuture.weeks, 0);
  assert.equal(resFuture.days, 0);

  // Storage error handling:
  const originalLocalStorage = global.localStorage;
  try {
    global.localStorage = {
      getItem: () => {
        throw new Error('StorageBlocked');
      },
      setItem: () => {
        throw new Error('QuotaExceededError');
      }
    };

    assert.equal(getMesocycleStartDate(), null);
    const saveRes = setMesocycleStartDate('2026-11-01');
    assert.equal(saveRes.ok, false);
    assert.ok(saveRes.error);

    // Simulated element for updateMesocycleBanner
    const mockBadge = { textContent: '', setAttribute: () => {} };
    const mockMsg = { textContent: '' };
    const mockBanner = {
      querySelector: (selector) => {
        if (selector.includes('badge')) return mockBadge;
        if (selector.includes('message')) return mockMsg;
        return null;
      }
    };
    const updateRes = updateMesocycleBanner(mockBanner, nowDate, 0);
    assert.equal(updateRes.status, 'continue_current');
    assert.equal(mockBadge.textContent, 'שבוע 0 מתוך 6-8');
  } finally {
    global.localStorage = originalLocalStorage;
  }
});

test('5. קיום הבאנר ב-journal.html וב-weekly.html', () => {
  const root = path.join(__dirname, '..');
  const journalHtml = fs.readFileSync(path.join(root, 'journal.html'), 'utf8');
  const weeklyHtml = fs.readFileSync(path.join(root, 'weekly.html'), 'utf8');

  // Check STORAGE_KEY
  assert.equal(STORAGE_KEY, 'trainerhub_mesocycle_start');

  // journal.html assertions
  assert.match(journalHtml, /id=["']mesocycleAdvisorBanner["']/);
  assert.match(journalHtml, /src=["']\.\/js\/mesocycle-advisor\.js["']/);
  assert.match(journalHtml, /התחל מחזור 6 שבועות חדש/);
  assert.match(journalHtml, /trainerhub_mesocycle_start/);
  assert.match(journalHtml, /try\s*\{[\s\S]*?trainerhub_mesocycle_start[\s\S]*?\}\s*catch/);
  assert.match(journalHtml, /THMesocycleAdvisor\.initMesocycleAdvisor/);

  // weekly.html assertions
  assert.match(weeklyHtml, /id=["']mesocycleAdvisorBanner["']/);
  assert.match(weeklyHtml, /src=["']\.\/js\/mesocycle-advisor\.js["']/);
  assert.match(weeklyHtml, /התחל מחזור 6 שבועות חדש/);
  assert.match(weeklyHtml, /trainerhub_mesocycle_start/);
  assert.match(weeklyHtml, /try\s*\{[\s\S]*?trainerhub_mesocycle_start[\s\S]*?\}\s*catch/);
  assert.match(weeklyHtml, /THMesocycleAdvisor\.initMesocycleAdvisor/);

  // Dynamic banner binding test via initMesocycleAdvisor
  const mem = {};
  const mockStorage = {
    getItem: (k) => (k in mem ? mem[k] : null),
    setItem: (k, v) => {
      mem[k] = String(v);
    }
  };
  const prevStorage = global.localStorage;
  global.localStorage = mockStorage;

  try {
    let clicked = false;
    const button = {
      addEventListener: (evt, fn) => {
        if (evt === 'click') {
          button._fn = fn;
        }
      },
      click: () => {
        clicked = true;
        if (button._fn) button._fn();
      }
    };
    const badgeEl = { textContent: '', setAttribute: () => {} };
    const msgEl = { textContent: '' };
    const container = {
      querySelector: (sel) => {
        if (sel === 'button' || sel.includes('Btn')) return button;
        if (sel.includes('badge')) return badgeEl;
        if (sel.includes('message')) return msgEl;
        return null;
      }
    };

    const handle = initMesocycleAdvisor(container, { getSessions: () => 5 });
    assert.ok(handle);
    assert.equal(badgeEl.textContent, 'שבוע 0 מתוך 6-8');

    // Simulate clicking the button
    button.click();
    assert.ok(clicked);
    assert.ok(mockStorage.getItem('trainerhub_mesocycle_start'));
    assert.match(badgeEl.textContent, /שבוע 0/);
  } finally {
    global.localStorage = prevStorage;
  }
});
