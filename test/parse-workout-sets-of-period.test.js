// Regression: in the editor parser (frontend/parse-workout.js) «3 סטים של 12»
// lost its 12 when a full stop or comma came right after it, the way the
// page's own example 2 is written («שכיבות שמיכה - 3 סטים של 12.»). The card
// read «שכיבות שמיכה 12» with the default 10 reps.

const test = require('node:test');
const assert = require('node:assert/strict');
const { parseWorkoutClient } = require('../frontend/parse-workout.js');

function main(text) {
  return parseWorkoutClient('אימון כוח\n' + text)
    .phases.find(function (p) { return p.name === 'Main'; }).exercises;
}

test('«3 סטים של 12.» at the end of a line is 3 × 12', () => {
  const ex = main('שכיבות שמיכה - 3 סטים של 12.')[0];
  assert.equal(ex.name, 'שכיבות שמיכה');
  assert.equal(ex.sets, 3);
  assert.equal(ex.reps, 12);
});

test('«4 סטים של 10, מנוחה 60 שניות» keeps the 10 reps and the rest', () => {
  const ex = main('חתירה עם מוט 4 סטים של 10, מנוחה 60 שניות')[0];
  assert.equal(ex.name, 'חתירה עם מוט');
  assert.equal(ex.sets, 4);
  assert.equal(ex.reps, 10);
  assert.equal(ex.rest_seconds, 60);
});

test('the page example 2 lines all keep their reps', () => {
  const list = main('כפיפות חזה - 4 סטים של 8 חזרות.\nשכיבות שמיכה - 3 סטים של 12.\nחתירה עם מוט - 4 סטים של 10.\nכפיפות מרפק - 3 סטים של 12.\nלחיצת כתפיים - 3 סטים של 10.');
  assert.deepEqual(list.map(function (x) { return [x.name, x.sets, x.reps]; }), [
    ['כפיפות חזה', 4, 8],
    ['שכיבות שמיכה', 3, 12],
    ['חתירה עם מוט', 4, 10],
    ['כפיפות מרפק', 3, 12],
    ['לחיצת כתפיים', 3, 10]
  ]);
});

test('«3 סטים של 1.5 דקות» is still timed work, not 1 rep', () => {
  const ex = main('פלאנק 3 סטים של 1.5 דקות')[0];
  assert.equal(ex.sets, 3);
  assert.equal(ex.reps, null);
  assert.equal(ex.duration_seconds, 90);
});
