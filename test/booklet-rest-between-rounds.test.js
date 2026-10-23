'use strict';

// Regression: the booklet's station circuits rest between rounds («מנוחה של 3 דק'
// בין הסטים» in opening-1, «3-5 סטים עם מנוחה של 2 ד'» in opening-2). The cards
// only carry sets / work / rest, and their note was just the part name, so the
// coach in workout mode never saw the 3-minute break or the 3–5 range.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const B = require('../js/booklet.js');

const root = path.join(__dirname, '..');
B.setData(JSON.parse(fs.readFileSync(path.join(root, B.MAIN_PATH), 'utf8')), null);

function mainOf(id) { return B.sessionWorkout(id).phases[1].exercises; }

test('opening-1 strength stations note the 3-minute rest between rounds', function () {
  const stations = mainOf('opening-1').filter(function (x) { return x.duration_seconds === 40; });
  assert.ok(stations.length > 0);
  stations.forEach(function (x) {
    assert.equal(x.sets, 2);
    assert.equal(x.rest_seconds, 20);
    assert.equal(x.notes, "חלק ב' – תחנות כוח · מנוחה 3 דק׳ בין סבב לסבב");
  });
});

test('opening-2 circuit notes the 3–5 rounds range and the 2-minute rest between rounds', function () {
  const circuit = mainOf('opening-2').filter(function (x) { return x.duration_seconds === 30; });
  assert.ok(circuit.length > 0);
  circuit.forEach(function (x) {
    assert.equal(x.sets, 3);
    assert.equal(x.notes, "חלק ב' – כוח · 3–5 סבבים, מנוחה 2 דק׳ בין סבב לסבב");
  });
});

test('a part with a rounds range but no rest between rounds notes only the range', function () {
  const pairs = mainOf('opening-4').filter(function (x) { return x.duration_seconds === 45; });
  assert.ok(pairs.length > 0);
  pairs.forEach(function (x) { assert.match(x.notes, / · 4–6 סבבים$/); });
});
