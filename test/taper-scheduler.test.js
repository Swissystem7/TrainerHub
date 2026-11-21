const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { calculateTaperWindow } = require('../js/taper-scheduler.js');

test('חישוב שלב build מעל שבוע', () => {
  const res10Days = calculateTaperWindow('2026-12-01', '2026-11-21');
  assert.equal(res10Days.isValid, true);
  assert.equal(res10Days.phase, 'build');
  assert.equal(res10Days.daysRemaining, 10);
  assert.match(res10Days.recommendation, /בנייה/);

  const res14Days = calculateTaperWindow('2026-12-05', '2026-11-21');
  assert.equal(res14Days.isValid, true);
  assert.equal(res14Days.phase, 'build');
  assert.equal(res14Days.daysRemaining, 14);
});

test('שלב taper_light ב-2-3 ימים לפני', () => {
  const res3Days = calculateTaperWindow('2026-11-24', '2026-11-21');
  assert.equal(res3Days.isValid, true);
  assert.equal(res3Days.phase, 'taper_light');
  assert.equal(res3Days.daysRemaining, 3);
  assert.match(res3Days.recommendation, /40-50%/);
  assert.match(res3Days.recommendation, /שלושת הימים האחרונים/);
  assert.match(res3Days.recommendation, /רעננות/);
  assert.equal(res3Days.volumeReductionPercent, '40-50%');

  const res2Days = calculateTaperWindow('2026-11-23', '2026-11-21');
  assert.equal(res2Days.isValid, true);
  assert.equal(res2Days.phase, 'taper_light');
  assert.equal(res2Days.daysRemaining, 2);
  assert.match(res2Days.recommendation, /40-50%/);
});

test('שלב rest_ready ביום היעד', () => {
  const resTargetDay = calculateTaperWindow('2026-11-21', '2026-11-21');
  assert.equal(resTargetDay.isValid, true);
  assert.equal(resTargetDay.phase, 'rest_ready');
  assert.equal(resTargetDay.daysRemaining, 0);
  assert.match(resTargetDay.recommendation, /מוכנות ומנוחה/);
});

test('קלט תאריך פגום/null', () => {
  const resNull = calculateTaperWindow(null, null);
  assert.equal(resNull.isValid, false);
  assert.equal(resNull.phase, null);
  assert.equal(resNull.daysRemaining, null);

  const resUndefined = calculateTaperWindow(undefined, '2026-11-21');
  assert.equal(resUndefined.isValid, false);
  assert.equal(resUndefined.phase, null);
  assert.equal(resUndefined.daysRemaining, null);

  const resEmpty = calculateTaperWindow('', '2026-11-21');
  assert.equal(resEmpty.isValid, false);
  assert.equal(resEmpty.phase, null);

  const resInvalidTarget = calculateTaperWindow('invalid-date', '2026-11-21');
  assert.equal(resInvalidTarget.isValid, false);
  assert.equal(resInvalidTarget.phase, null);

  const resInvalidToday = calculateTaperWindow('2026-11-25', 'corrupt-today');
  assert.equal(resInvalidToday.isValid, false);
  assert.equal(resInvalidToday.phase, null);
});

test('קיום הבקרים והתווית ב-reserves.html וב-weekly.html', () => {
  const root = path.join(__dirname, '..');
  const reservesHtml = fs.readFileSync(path.join(root, 'reserves.html'), 'utf8');
  const weeklyHtml = fs.readFileSync(path.join(root, 'weekly.html'), 'utf8');

  // reserves.html controls and label
  assert.match(
    reservesHtml,
    /<input[^>]+type=['"]date['"][^>]+id=['"]taperTargetDateInput['"]/,
    'input taperTargetDateInput קיים'
  );
  assert.match(reservesHtml, /<label[^>]+for=['"]taperTargetDateInput['"]/, 'label for taperTargetDateInput קיים');
  assert.match(reservesHtml, /id=['"]taperStatusOut['"]/, 'id taperStatusOut קיים');
  assert.match(reservesHtml, /js\/taper-scheduler\.js/, 'reserves.html טוען את taper-scheduler.js');

  // weekly.html banner and script
  assert.match(weeklyHtml, /id=['"]weeklyTaperBanner['"]/, 'id weeklyTaperBanner קיים');
  assert.match(weeklyHtml, /js\/taper-scheduler\.js/, 'weekly.html טוען את taper-scheduler.js');
});
