'use strict';

// The analyzer's balance flags judge every session as full-body. When the
// trainer asks for one muscle group, js/session-builder.js keeps only the
// flags about a muscle the request named: «אימון ליבה 20 דקות» used to show
// «100% ליבה, אין עבודת גב» and «אימון רגליים» «אין תרגילי משיכה».

const test = require('node:test');
const assert = require('node:assert/strict');
const Engine = require('../js/session-builder.js');
const catalog = require('../js/catalog.json');

function keys(text) {
  const built = Engine.buildSession(text, catalog);
  assert.ok(built.workout, text + ' builds a workout');
  assert.deepEqual(built.explanation.flags, built.analysis.flags);
  return built.analysis.flags.map(function (f) { return f.key; });
}

test('«אימון ליבה 20 דקות» is not told it is all core with no back or pull', function () {
  const k = keys('אימון ליבה 20 דקות');
  assert.ok(!k.includes('core-heavy-no-back'), k.join());
  assert.ok(!k.includes('core-heavy'), k.join());
  assert.ok(!k.includes('no-pull'), k.join());
});

test('«אימון רגליים 30 דקות» is not told it has no pull exercises', function () {
  assert.ok(!keys('אימון רגליים 30 דקות').includes('no-pull'));
});

test('«אימון חזה 30 דקות» is not told it has no pull or posterior-chain work', function () {
  const k = keys('אימון חזה 30 דקות');
  assert.ok(!k.includes('no-pull'), k.join());
  assert.ok(!k.includes('no-posterior'), k.join());
});

test('a flag about a muscle the request named stays', function () {
  const fixture = {
    warmup: { id: 'warmup', he: 'חימום', muscles: ['core'], equipment: ['none'], level: 'beginner', file: 'w.mp4', source: 'local' },
    plank: { id: 'plank', he: 'פלאנק', muscles: ['core'], equipment: ['none'], level: 'beginner', file: 'a.mp4', source: 'local' },
    crunch: { id: 'crunch', he: 'כפיפות בטן', muscles: ['core'], equipment: ['none'], level: 'beginner', file: 'b.mp4', source: 'local' }
  };
  // Asked for back, the catalog has only core: the no-back / no-pull warnings are the point.
  const built = Engine.buildSession('אימון גב 20 דקות', fixture);
  const k = built.analysis.flags.map(function (f) { return f.key; });
  assert.ok(k.includes('no-pull'), k.join());
  assert.ok(k.includes('core-heavy-no-back'), k.join());
});

test('an unfocused «אימון גוף מלא» keeps the analyzer flags as they are', function () {
  const Analyzer = require('../js/analyzer.js');
  const built = Engine.buildSession('אימון גוף מלא 45 דקות', catalog);
  assert.deepEqual(built.analysis.flags, Analyzer.analyzeSession(built.workout).flags);
});
