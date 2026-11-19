const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { classifyMovementPattern, checkFullBodyPatternCoverage } = require('../js/movement-patterns');

test('1. classify push and pull movement patterns correctly', () => {
  assert.equal(classifyMovementPattern({ name_he: 'לחיצת חזה' }), 'push');
  assert.equal(classifyMovementPattern({ name_he: 'מתח משיכה' }), 'pull');
});

test('2. classify squat and hinge movement patterns correctly', () => {
  assert.equal(classifyMovementPattern({ name_he: 'סקוואט עמוק' }), 'squat');
  assert.equal(classifyMovementPattern({ name_he: 'דדליפט רומני' }), 'hinge');
});

test('3. checkFullBodyPatternCoverage validates full body workout coverage', () => {
  const workout = {
    exercises: [
      { name_he: 'לחיצת חזה' },
      { name_he: 'מתח משיכה' },
      { name_he: 'סקוואט' },
      { name_he: 'דדליפט' },
      { name_he: 'בטן ליבה' }
    ]
  };
  const res = checkFullBodyPatternCoverage(workout);
  assert.equal(res.ok, true);
  assert.deepEqual(res.missing, []);
});

test('4. handle null or undefined input safely', () => {
  assert.equal(classifyMovementPattern(null), 'core');
  assert.equal(classifyMovementPattern(undefined), 'core');
  const res = checkFullBodyPatternCoverage(null);
  assert.equal(res.ok, false);
  assert.ok(res.missing.length > 0);
});

test('5. verify movementPatternSelect and label exist in exercises.html', () => {
  const htmlPath = path.join(__dirname, '../exercises.html');
  const content = fs.readFileSync(htmlPath, 'utf8');
  assert.ok(content.includes('id="movementPatternSelect"'), 'movementPatternSelect exists');
  assert.ok(content.includes('for="movementPatternSelect"'), 'label with for="movementPatternSelect" exists');
});
