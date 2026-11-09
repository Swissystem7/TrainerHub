const test = require('node:test');
const assert = require('node:assert/strict');
const R = require('../js/reserves-track.js');

test('parseClock handles clock boundaries and invalid inputs', () => {
  assert.ok(Number.isNaN(R.parseClock(-5)));
  assert.ok(Number.isNaN(R.parseClock(-0)));
  assert.ok(Number.isNaN(R.parseClock('1.5:20')));
  assert.ok(Number.isNaN(R.parseClock('1:2:3:4')));
  assert.ok(Number.isNaN(R.parseClock('12:60')));
  assert.ok(Number.isNaN(R.parseClock('')));
  assert.ok(Number.isNaN(R.parseClock('   ')));
  assert.equal(R.parseClock('1:20.5'), 80.5);
  assert.equal(R.parseClock('0:00'), 0);
});

test('formatClock handles invalid, fractional, and zero values', () => {
  assert.equal(R.formatClock(-1), '');
  assert.equal(R.formatClock(Infinity), '');
  assert.equal(R.formatClock(NaN), '');
  assert.equal(R.formatClock(75.4), '1:15');
  assert.equal(R.formatClock(0), '0:00');
});

test('overallLabelHe returns labels for each overall state', () => {
  assert.equal(R.overallLabelHe('pass'), 'עובר — כל המדדים');
  assert.equal(R.overallLabelHe('fail'), 'לא עובר — יש מדד שלא עמד בסף');
  assert.equal(R.overallLabelHe('unknown'), 'חסר — עדיין לא הוזנו כל המדדים');
  assert.equal(R.overallLabelHe(), 'חסר — עדיין לא הוזנו כל המדדים');
});

test('scaleLoad clamps sets and tolerates missing or invalid inputs', () => {
  assert.equal(R.scaleLoad({ sets: 1 }, 0).sets, 2);
  assert.equal(R.scaleLoad({ sets: 6 }, 1).sets, 6);
  assert.deepEqual(R.scaleLoad(null, 0), { sets: 3, effort_he: 'בינוני' });
  assert.equal(R.scaleLoad({}, 1).sets, 4);
  assert.equal(R.scaleLoad({ sets: 3 }, 'invalid').sets, 3);
  assert.equal(R.scaleLoad({ sets: -2 }, -1).sets, -2);
});
