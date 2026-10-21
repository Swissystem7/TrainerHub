'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'site-scan.html'), 'utf8');

test('site-scan.html has skip-link and valid Hebrew RTL language headers', function () {
  assert.match(html, /lang="he"/);
  assert.match(html, /dir="rtl"/);
  assert.match(html, /<a\s+class="skip-link"\s+href="#photos">דלג לצילום השטח<\/a>/);
});

test('site-scan.html actions bar has role="toolbar" and descriptive aria-label', function () {
  assert.match(html, /<div\s+class="actions"\s+role="toolbar"\s+aria-label="פעולות בניית אימון לשטח">/);
});

test('site-scan.html action buttons have accessible aria-labels', function () {
  assert.match(html, /<button\s+type="button"\s+id="build"\s+aria-label="בנה אימון לשטח לפי המאפיינים שסומנו">בנה אימון לשטח<\/button>/);
  assert.match(html, /<button\s+type="button"\s+id="reset"\s+class="ghost"\s+aria-label="נקה נתונים והתחל סריקה מחדש">נקה והתחל מחדש<\/button>/);
  assert.match(html, /<button\s+type="button"\s+id="start"\s+aria-label="התחל אימון שטח במצב אימון חי">התחל במצב אימון<\/button>/);
});

test('site-scan.html photo upload and thumbs have accessible labels, roles, and status region', function () {
  assert.match(html, /<input\s+id="photos"[^>]*aria-label="צילום או בחירת עד 3 תמונות של השטח"[^>]*aria-describedby="scanStatus"/);
  assert.match(html, /<div\s+class="thumbs"\s+id="thumbs"\s+role="region"\s+aria-label="תמונות שטח שנבחרו"><\/div>/);
  assert.match(html, /<p\s+class="muted"\s+id="scanStatus"\s+role="status"\s+aria-live="polite">/);
});

test('site-scan.html chips have role="group", aria-label, and chip buttons have aria-label and aria-pressed', function () {
  assert.match(html, /role="group"\s+aria-label="'\s*\+\s*esc\(g\.he\)\s*\+\s*'"/);
  assert.match(html, /aria-pressed="'\s*\+\s*c\.on\s*\+\s*'"/);
  assert.match(html, /aria-label="'\s*\+\s*esc\(c\.he\)\s*\+\s*'"/);
});

test('site-scan.html summary has role="status" and aria-live="polite"', function () {
  assert.match(html, /<p\s+id="summary"\s+class="muted"\s+role="status"\s+aria-live="polite"><\/p>/);
});

test('site-scan.html plan output has an initial polite status message and empty plan guidance on reset', function () {
  assert.match(html, /<div\s+id="planOut"\s+aria-live="polite">\s*<p\s+class="muted empty-plan"\s+role="status">סמנו את מאפייני השטח ולחצו «בנה אימון לשטח» לקבלת מערך מותאם מחוברת אחריי\.<\/p>\s*<\/div>/);
  assert.match(html, /\$\('planOut'\)\.innerHTML\s*=\s*'<p class="muted empty-plan" role="status">סמנו את מאפייני השטח ולחצו «בנה אימון לשטח» לקבלת מערך מותאם מחוברת אחריי\.<\/p>';/);
  assert.match(html, /\$\('planOut'\)\.innerHTML\s*=\s*'<p class="muted empty-plan" role="status">תוכן החוברת עוד לא נטען\.<\/p>';/);
});

test('site-scan.html plan warnings expose role="alert"', function () {
  assert.match(html, /<div\s+class="warn"\s+role="alert">⚠️\s*'\s*\+\s*esc\(w\)\s*\+\s*'<\/div>/);
});

test('site-scan.html has visible focus styles for interactive elements including links, buttons, inputs, selects', function () {
  assert.match(html, /a:focus-visible,\s*button:focus-visible,\s*input:focus-visible,\s*select:focus-visible/);
  assert.match(html, /\.empty-plan\s*\{/);
});

test('site-scan.html thumbnail images have distinct numbered alt text', function () {
  assert.match(html, /img\.alt\s*=\s*'תמונת שטח '\s*\+\s*\(idx\s*\+\s*1\);/);
});
