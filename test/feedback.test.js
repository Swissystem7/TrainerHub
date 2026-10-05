'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const Feedback = require('../js/feedback.js');

// הקישור המדויק של הבעלים. אם מישהו משנה ספרה אחת בקובץ — הטסט הזה נופל.
const EXACT_URL = 'https://docs.google.com/forms/d/e/' +
  '1FAIpQLSdT8YduNx-VWKM3bWGUJdiSj4Sw9D-EA6R6c-oYVYCQmOVXxQ' +
  '/viewform?usp=pp_url&entry.368039752=TrainerHub';

function anchorStub(text) {
  return { href: '', target: '', rel: '', textContent: text === undefined ? '' : text };
}

// הערות יכולות להסביר מה המודול *לא* עושה; הבדיקה היא על הקוד עצמו.
function codeOnly(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter(function (line) { return !line.trim().startsWith('//'); })
    .join('\n');
}

test('feedbackUrl מחזירה את הקישור המדויק עם entry.368039752=TrainerHub', function () {
  assert.equal(typeof Feedback.feedbackUrl, 'function');
  assert.equal(Feedback.feedbackUrl(), EXACT_URL);
  assert.equal(Feedback.FEEDBACK_URL, EXACT_URL);
  assert.ok(Feedback.feedbackUrl().includes('entry.368039752=TrainerHub'));
  assert.equal(Feedback.ENTRY_KEY, 'entry.368039752');
  assert.equal(Feedback.ENTRY_VALUE, 'TrainerHub');
});

test('ל-query string יש בדיוק שני פרמטרים — שום פרמטר נוסף לא מצורף', function () {
  const url = new URL(Feedback.feedbackUrl());
  assert.equal(url.origin + url.pathname,
    'https://docs.google.com/forms/d/e/' +
    '1FAIpQLSdT8YduNx-VWKM3bWGUJdiSj4Sw9D-EA6R6c-oYVYCQmOVXxQ/viewform');
  assert.equal(url.hash, '');
  assert.deepEqual([...url.searchParams.keys()].sort(), ['entry.368039752', 'usp']);
  assert.equal(url.searchParams.get('entry.368039752'), 'TrainerHub');
  assert.equal(url.searchParams.get('usp'), 'pp_url');
  assert.equal(url.searchParams.getAll('entry.368039752').length, 1);
});

test('ארגומנטים עם נתוני אפליקציה לא דולפים לקישור', function () {
  const secrets = ['trainer-42', 'aviran@example.com', 'workout-id-7', '0501234567'];
  const calls = [
    Feedback.feedbackUrl(secrets[0]),
    Feedback.feedbackUrl({ userId: secrets[0], email: secrets[1] }),
    Feedback.feedbackUrl(secrets[1], secrets[2], secrets[3]),
    Feedback.feedbackUrl(null),
    Feedback.feedbackUrl(undefined),
    Feedback.feedbackUrl()
  ];
  for (const got of calls) {
    assert.equal(got, EXACT_URL);
    for (const secret of secrets) {
      assert.ok(!got.includes(secret), 'הקישור לא יכיל ' + secret);
    }
  }
  // הפונקציה מוכרזת בלי פרמטרים, כדי שלא יהיה אפילו ערוץ לקבל נתונים.
  assert.equal(Feedback.feedbackUrl.length, 0);
});

test('הקישור קבוע בין קריאות — אין חותמת זמן, מזהה סשן או nonce', function () {
  const first = Feedback.feedbackUrl();
  const second = Feedback.feedbackUrl();
  const third = Feedback.feedbackUrl();
  assert.equal(first, second);
  assert.equal(second, third);
  assert.doesNotMatch(first, /utm_|_ga|gclid|uid=|session|token|timestamp|[?&]t=/i);
});

test('המודול לא קורא שום מצב של משתמש או דפדפן', function () {
  const src = codeOnly(fs.readFileSync(path.join(__dirname, '..', 'js', 'feedback.js'), 'utf8'));
  const banned = [
    'localStorage', 'sessionStorage', 'indexedDB', 'document.cookie',
    'navigator', 'Date.now', 'new Date', 'Math.random',
    'fetch(', 'XMLHttpRequest', 'sendBeacon', 'location.'
  ];
  for (const needle of banned) {
    assert.ok(!src.includes(needle), 'js/feedback.js לא יכיל ' + needle);
  }
});

test('attach מחבר עוגן קיים לכפתור «דווחו לנו / הציעו שיפור»', function () {
  const empty = anchorStub();
  assert.equal(Feedback.attach(empty), true);
  assert.equal(empty.href, EXACT_URL);
  assert.equal(empty.target, '_blank');
  assert.equal(empty.rel, 'noopener noreferrer');
  assert.equal(empty.textContent, 'דווחו לנו / הציעו שיפור');
  assert.equal(Feedback.LABEL, 'דווחו לנו / הציעו שיפור');

  const labelled = anchorStub('משוב');
  assert.equal(Feedback.attach(labelled), true);
  assert.equal(labelled.href, EXACT_URL);
  assert.equal(labelled.textContent, 'משוב', 'טקסט קיים נשמר');

  for (const bad of [null, undefined, '', 0, 'a']) {
    assert.equal(Feedback.attach(bad), false);
  }
});

test('ה-API חשוף ל-window כ-THFeedback ואינו ניתן לשינוי', function () {
  assert.equal(globalThis.THFeedback, Feedback);
  assert.equal(Object.isFrozen(Feedback), true);
  try {
    Feedback.FEEDBACK_URL = 'https://evil.example.com/?entry.368039752=TrainerHub';
  } catch (e) {
    // strict mode זורק — גם זה בסדר
  }
  assert.equal(Feedback.FEEDBACK_URL, EXACT_URL);
  assert.equal(Feedback.feedbackUrl(), EXACT_URL);
});
