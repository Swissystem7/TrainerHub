'use strict';

// Regression: the Tabata method says «ניתן לבצע 4 סטים טאבטה עם מנוחה של 2-3 דקות»
// (restBetweenSetsSeconds [120, 180]), but its cards only noted the 20/10 interval,
// so in workout mode the coach never saw the 2-3 minute break between sets.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const B = require('../js/booklet.js');

const root = path.join(__dirname, '..');
B.setData(JSON.parse(fs.readFileSync(path.join(root, B.MAIN_PATH), 'utf8')), null);

test('Tabata cards note the 2-3 minute rest between sets', function () {
  const main = B.methodWorkout('tabata', 0).phases[1].exercises;
  assert.equal(main.length, 8);
  main.forEach(function (x) {
    assert.equal(x.notes, 'טבטה: 20 שנ׳ עבודה / 10 שנ׳ מנוחה · 2–3 דק׳ מנוחה בין סט לסט');
    assert.equal(x.rest_seconds, 10);
  });
});
