'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { inferFromName } = require('../js/infer.js');

// core.js HE_NAMES arm drills that used to infer as «ליבה» (or, for the
// kickback, as a leg kick).
test('«מקבילים» are parallel-bar dips: triceps and chest, push', () => {
  const r = inferFromName('מקבילים');
  assert.deepEqual(r.muscles, ['triceps', 'chest']);
  assert.equal(r.pattern, 'push');
});

test('«פשיטה מעל הראש» is a triceps push', () => {
  const r = inferFromName('פשיטה מעל הראש');
  assert.deepEqual(r.muscles, ['triceps']);
  assert.equal(r.pattern, 'push');
});

test('«בעיטת טרייספס» is a triceps kickback, not a leg kick', () => {
  const r = inferFromName('בעיטת טרייספס');
  assert.deepEqual(r.muscles, ['triceps']);
  assert.equal(r.pattern, 'push');
});

for (const name of ['כפיפה מרוכזת', 'כפיפה במשקוף', 'כפיפת משקל גוף']) {
  test(`«${name}» is a biceps curl`, () => {
    const r = inferFromName(name);
    assert.deepEqual(r.muscles, ['biceps']);
    assert.equal(r.pattern, 'pull');
  });
}

test('plain kicks are still leg plyometrics, crunches still core', () => {
  const kick = inferFromName('בעיטות');
  assert.deepEqual(kick.muscles, ['legs']);
  assert.equal(kick.pattern, 'plyo');
  assert.deepEqual(inferFromName('כפיפות בטן').muscles, ['core']);
});
