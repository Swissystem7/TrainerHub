'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'frontend', 'workout-mode.html'), 'utf8');

test('workout-mode.html has skip-link and valid Hebrew RTL language headers', function () {
  assert.match(html, /<html\s+lang="he"\s+dir="rtl">/);
  assert.match(html, /<a\s+class="skip-link"\s+href="#stage">דלג לאימון<\/a>/);
});

test('workout-mode.html declares aria-live regions for status and timer announcements', function () {
  assert.match(html, /<div\s+id="liveStatus"\s+class="sr-only"\s+aria-live="polite"\s+aria-atomic="true"><\/div>/);
  assert.match(html, /<div\s+id="liveTimer"\s+class="sr-only"\s+aria-live="polite"\s+aria-atomic="true"><\/div>/);
});

test('workout-mode.html controls bar has role="toolbar" and descriptive aria-label', function () {
  assert.match(html, /<div\s+class="controls"\s+id="controlsWrap"[^>]*role="toolbar"\s+aria-label="פקדי אימון">/);
});

test('workout-mode.html control buttons have accessible labels, titles and swap controls', function () {
  assert.match(html, /id="btnBack"[^>]*aria-label="חזור לתרגיל הקודם"/);
  assert.match(html, /id="btnStartPause"[^>]*aria-label="התחל או השהה"/);
  assert.match(html, /id="btnSkip"[^>]*aria-label="דלג על הסט הנוכחי"/);
  assert.match(html, /id="btnDone"[^>]*aria-label="סיימתי סט"/);
  assert.match(html, /id="btnSwap"[^>]*aria-label="החלף תרגיל"[^>]*aria-expanded="false"[^>]*aria-controls="swapPanel"/);
});

test('workout-mode.html empty state has role="status", aria-live="polite", and accessible navigation buttons', function () {
  assert.match(html, /<div\s+class="empty-state"\s+id="emptyState"\s+role="status"\s+aria-live="polite">/);
  assert.match(html, /<button\s+type="button"\s+class="go-back"[^>]*aria-label="מעבר למסך בניית אימון">→ בנה אימון<\/button>/);
  assert.match(html, /<button\s+type="button"\s+class="go-back"[^>]*aria-label="מעבר לספריית סרטונים">ספריית סרטונים<\/button>/);
  assert.match(html, /<button\s+type="button"\s+class="go-back"[^>]*aria-label="מעבר ליומן ביצוע">יומן ביצוע<\/button>/);
});

test('workout-mode.html progress and elapsed areas have accessibility roles and labels', function () {
  assert.match(html, /<div\s+class="progress-wrap"\s+id="progressWrap"[^>]*role="region"\s+aria-label="התקדמות באימון">/);
  assert.match(html, /<div\s+class="progress-bar"\s+role="progressbar"\s+aria-labelledby="progressLabel"/);
  assert.match(html, /<div\s+class="elapsed-bar"\s+id="elapsedBar"[^>]*role="status"\s+aria-label="זמן כולל">/);
});

test('workout-mode.html swapPanel and next-preview have region semantics and descriptive labels', function () {
  assert.match(html, /<div\s+id="swapPanel"\s+hidden[^>]*role="region"\s+aria-label="חלופות לתרגיל"><\/div>/);
  assert.match(html, /class="next-preview"\s+role="region"\s+aria-label="התרגיל הבא"/);
  assert.match(html, /class="ex-notes"\s+role="note"\s+aria-label="דגשי ביצוע"/);
});

test('workout-mode.html completion screen has role="region" and accessible report/action buttons', function () {
  assert.match(html, /<div\s+id="completionScreen"\s+role="region"\s+aria-label="סיכום סיום אימון">/);
  assert.match(html, /<div\s+class="stats-grid"\s+role="group"\s+aria-label="נתוני אימון שהושלם">/);
  assert.match(html, /id="btnWaTrainer"[^>]*aria-label="שלח סיכום למאמן בוואטסאפ"/);
  assert.match(html, /id="btnCopyCode"[^>]*aria-label="העתק קוד סיכום לייבוא ביומן המאמן"/);
  assert.match(html, /<button\s+type="button"\s+class="done-btn"[^>]*aria-label="מעבר למסך בניית אימון">→ בנה אימון<\/button>/);
  assert.match(html, /<button\s+type="button"\s+class="done-btn"[^>]*aria-label="מעבר ליומן ביצוע לייבוא נתונים">לייבוא ביומן<\/button>/);
});

test('workout-mode.html defines visible focus styles for all interactive buttons, links and textareas', function () {
  assert.match(html, /\.ctrl-btn:focus-visible,\s*\.exit-btn:focus-visible,\s*\.go-back:focus-visible,\s*\.done-btn:focus-visible,\s*a:focus-visible,\s*textarea:focus-visible\s*\{\s*outline:\s*2px solid #c4b5fd;/);
});

test('workout-mode.html toggleSwap renders swap buttons with aria-label and empty state with role="status"', function () {
  assert.match(html, /aria-label="החלף לתרגיל '\s*\+\s*esc\(a\.he\)\s*\+\s*'"/);
  assert.match(html, /<p\s+role="status"[^>]*>אין חלופה עם סרטון באותה קבוצת שרירים<\/p>/);
});
