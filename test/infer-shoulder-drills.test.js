'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { inferFromName } = require('../js/infer.js');

// core.js HE_NAMES shoulder drills that used to infer as chest, arms or back.
test('«שכיבות פאייק» is a shoulder push, not a chest push-up', () => {
  const r = inferFromName('שכיבות פאייק');
  assert.deepEqual(r.muscles, ['shoulders']);
  assert.equal(r.pattern, 'push');
});

test('«מעגלי ידיים» works the shoulders, not biceps and triceps', () => {
  assert.deepEqual(inferFromName('מעגלי ידיים').muscles, ['shoulders']);
  assert.deepEqual(inferFromName('מעגלי ידיים לאחור').muscles, ['shoulders']);
});

test('«חתירה אנכית» is a shoulder pull, not a back row', () => {
  const r = inferFromName('חתירה אנכית');
  assert.deepEqual(r.muscles, ['shoulders']);
  assert.equal(r.pattern, 'pull');
  assert.deepEqual(r.secondary, ['biceps']);
});

test('plain rows and push-ups keep their muscles', () => {
  assert.deepEqual(inferFromName('חתירה').muscles, ['back', 'biceps']);
  assert.deepEqual(inferFromName('שכיבות שמיכה').muscles, ['chest']);
});
