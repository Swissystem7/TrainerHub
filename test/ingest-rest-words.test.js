'use strict';
// Ported from ext/feature-code-20260927-130515-9b5f and ai/devcycle-agy-20260927-001702 (bots).
const test = require('node:test');
const assert = require('node:assert/strict');
const THIngest = require('../js/ingest.js');

test('"הפסקה" is a rest word like "מנוחה"', () => {
  assert.equal(THIngest.isRestToken('הפסקה בין סטים'), true);
  const r = THIngest.ingestText('3 סבבים: 40 שניות פלאנק, הפסקה 30 שניות, 15 סקוואט', []);
  assert.equal(r.exercises.length, 2);
  assert.equal(r.exercises[0].rest_seconds, 30);
});

test('rest in minutes: "3 דקות", "דקה וחצי", "חצי דקה"', () => {
  let r = THIngest.ingestText('3 סבבים: 40 שניות פלאנק, 15 סקוואט, מנוחה 3 דקות', []);
  assert.equal(r.exercises.length, 2);
  assert.equal(r.exercises[1].rest_seconds, 180);

  r = THIngest.ingestText('3 סבבים: 40 שניות פלאנק, דקה וחצי מנוחה', []);
  assert.equal(r.exercises.length, 1);
  assert.equal(r.exercises[0].name, 'פלאנק');
  assert.equal(r.exercises[0].rest_seconds, 90);

  r = THIngest.ingestText('3 סבבים: 40 שניות פלאנק, מנוחה חצי דקה', []);
  assert.equal(r.exercises[0].rest_seconds, 30);
});

test('a plain "מנוחה דקה" stays 60 and "שתי דקות" stays 120', () => {
  let r = THIngest.ingestText('3 סבבים: 40 שניות פלאנק, מנוחה דקה', []);
  assert.equal(r.exercises[0].rest_seconds, 60);
  r = THIngest.ingestText('3 סבבים: 40 שניות פלאנק, שתי דקות מנוחה', []);
  assert.equal(r.exercises[0].rest_seconds, 120);
});
