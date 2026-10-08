'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Infer = require('../js/infer.js');
const Prompt = require('../js/prompt-parser.js');

test('"חימום וקירור" (cool-down) is not wall equipment', function () {
  assert.deepEqual(Infer.inferEquipment('אימון רגליים 30 דקות עם חימום וקירור'), ['none']);
  const req = Prompt.parsePrompt('אימון רגליים 30 דקות עם חימום וקירור');
  assert.deepEqual(req.equipment, []);
  assert.deepEqual(req.muscles, ['legs']);
});

test('"מוטיבציה" (motivation) is not a barbell', function () {
  assert.deepEqual(Infer.inferEquipment('אימון מוטיבציה לקבוצה'), ['none']);
  assert.deepEqual(Prompt.parsePrompt('אימון בטן עם הרבה מוטיבציה').equipment, []);
});

test('whole-word wall requests still match, with and without prefixes', function () {
  assert.deepEqual(Infer.inferEquipment('ישיבה על קיר'), ['wall']);
  assert.deepEqual(Infer.inferEquipment('שכיבות שמיכה על הקיר'), ['wall']);
  assert.deepEqual(Infer.inferEquipment('ריצה מקיר לקיר'), ['wall']);
  assert.deepEqual(Infer.inferEquipment('תרגילים בין קירות'), ['wall']);
  assert.deepEqual(Prompt.parsePrompt('אימון בטן ליד הקיר').equipment, ['wall']);
});

test('whole-word barbell requests still match; "מוט מתח" stays a pull-up bar', function () {
  assert.deepEqual(Infer.inferEquipment('סקוואט עם מוט'), ['barbell']);
  assert.deepEqual(Infer.inferEquipment('תרגילי מוטות'), ['barbell']);
  assert.deepEqual(Infer.inferEquipment('לחיצת חזה ברבל'), ['barbell']);
  assert.deepEqual(Infer.inferEquipment('מוט מתח'), ['bar']);
});

test('the Drive catalog entry "בטן עם קיר" still infers wall equipment', function () {
  const entry = Infer.inferFromName('בטן עם קיר', { folder: 'בטן' });
  assert.deepEqual(entry.equipment, ['wall']);
  assert.deepEqual(entry.muscles, ['core']);
});
