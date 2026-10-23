'use strict';

// Regression: the IGO-UGO method says «לאחר שהזוגות סיימו את 5 הסטים הם מקבלים
// מנוחה של מינימום 3 דקות ולאחר מכן יוצאים לסבב נוסף» (restBetweenRoundsSeconds 180),
// but its cards only noted «<block> · IGO-UGO בזוגות», so in workout mode the
// coach never saw the 3-minute break before the next round.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const B = require('../js/booklet.js');

const root = path.join(__dirname, '..');
B.setData(JSON.parse(fs.readFileSync(path.join(root, B.MAIN_PATH), 'utf8')), null);

test('IGO-UGO cards note the 3-minute rest between rounds', function () {
  const main = B.methodWorkout('igo-ugo', 0).phases[1].exercises;
  assert.equal(main.length, 8);
  main.forEach(function (x) {
    assert.match(x.notes, /IGO-UGO בזוגות, מנוחה 3 דק׳ בין סבב לסבב$/);
  });
  assert.equal(main[0].notes, 'סט ראשון – חזה · IGO-UGO בזוגות, מנוחה 3 דק׳ בין סבב לסבב');
});

test('other methods do not pick up a between-rounds note', function () {
  const t = B.methodWorkout('tabata', 0).phases[1].exercises;
  assert.ok(t.every(function (x) { return !/בין סבב לסבב/.test(x.notes || ''); }));
});
