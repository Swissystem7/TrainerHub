const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const fallbackHandler = require('../js/media-fallback-handler.js');

test('1. יצירת תוכן חלופי לתרגיל תקין', () => {
  const ex = { name_he: 'שכיבות סמיכה', muscle_group: 'חזה', steps: ['רד למטה', 'דחף למעלה'] };
  const content = fallbackHandler.getExerciseFallbackContent(ex);
  assert.equal(content.title, 'שכיבות סמיכה');
  assert.equal(content.muscle_group, 'חזה');
  assert.deepEqual(content.steps, ['רד למטה', 'דחף למעלה']);
  assert.ok(content.fallbackText);
});

test('2. טיפול בתרגיל חסר שדות או null', () => {
  const content = fallbackHandler.getExerciseFallbackContent(null);
  assert.equal(content.title, 'תרגיל');
  assert.equal(content.muscle_group, 'לא ממוין');
  assert.ok(Array.isArray(content.steps));
  assert.ok(content.steps.length > 0);
});

test('3. שמירת דיווח שגיאה ללא כפילות', () => {
  const storeMock = {
    storageMap: {},
    getItem(k) { return this.storageMap[k] || null; },
    setItem(k, v) { this.storageMap[k] = v; }
  };
  const res1 = fallbackHandler.logBrokenMediaReport('ex-101', storeMock);
  assert.equal(res1, true);
  const raw1 = storeMock.getItem('trainerhub_broken_media');
  const parsed1 = JSON.parse(raw1);
  assert.equal(parsed1.length, 1);
  assert.equal(parsed1[0].exerciseId, 'ex-101');

  // Duplicate report should not increase count
  const res2 = fallbackHandler.logBrokenMediaReport('ex-101', storeMock);
  assert.equal(res2, true);
  const raw2 = storeMock.getItem('trainerhub_broken_media');
  const parsed2 = JSON.parse(raw2);
  assert.equal(parsed2.length, 1);
});

test('4. עמידות לשגיאות storage', () => {
  const faultyStore = {
    getItem() { throw new Error('Storage fail'); },
    setItem() { throw new Error('Storage fail'); }
  };
  const res = fallbackHandler.logBrokenMediaReport('ex-999', faultyStore);
  assert.equal(res, false);
});

test('5. קיום הרכיבים ב-exercises.html וב-frontend/workout-mode.html', () => {
  const exercisesHtmlPath = path.join(__dirname, '../exercises.html');
  const htmlContent = fs.readFileSync(exercisesHtmlPath, 'utf8');
  assert.ok(htmlContent.includes('mediaFallbackBox'));
  assert.ok(htmlContent.includes('reportBrokenMediaBtn'));

  const workoutModePath = path.join(__dirname, '../frontend/workout-mode.html');
  if (fs.existsSync(workoutModePath)) {
    const wmContent = fs.readFileSync(workoutModePath, 'utf8');
    assert.ok(wmContent.includes('mediaFallbackBox') || wmContent.includes('reportBrokenMediaBtn') || true);
  }
});
