'use strict';

// The prompt engine kept only the designated «חימום» clip out of the Main
// phase. The other warm-up drills scored in with a -2 penalty, so «אימון חזה»
// prescribed «חימום שכיבות שמיכה קונוסים על הגב» as 3 x 8-12 next to the
// push-ups, and an unfocused prompt could pick «כדורגל חימום».

const test = require('node:test');
const assert = require('node:assert/strict');
const TH = require('../js/core.js');
const catalog = require('../js/catalog.json');
const Engine = require('../js/session-builder.js');

TH.setCatalog(catalog);

function mainNames(text) {
  const r = Engine.buildSession(text, catalog);
  assert.ok(r.workout, text + ' builds a workout');
  return r.workout.phases.filter(function (p) { return p.name === 'Main'; })[0]
    .exercises.map(function (x) { return x.name; });
}

['אימון חזה', 'אימון חזה 45 דקות', 'אימון גוף מלא 60 דקות', 'אימון 45 דקות'].forEach(function (text) {
  test('«' + text + '» has no warm-up drill in Main', function () {
    const main = mainNames(text);
    assert.ok(main.length > 0);
    main.forEach(function (name) {
      assert.ok(!/חימום/.test(name), '«' + name + '» is a warm-up drill');
    });
  });
});

test('«אימון חזה» still opens with the warm-up clip', function () {
  const r = Engine.buildSession('אימון חזה', catalog);
  const warm = r.workout.phases.filter(function (p) { return p.name === 'Warm-up'; })[0];
  assert.deepEqual(warm.exercises.map(function (x) { return x.id; }), ['warmup']);
});

test('a catalog of warm-up drills only still builds a session', function () {
  const only = {
    a: { id: 'a', he: 'כדורגל חימום', muscles: ['core'], equipment: ['none'], level: 'beginner', file: 'a.mp4' },
    b: { id: 'b', he: 'חימום ריצה', muscles: ['legs'], equipment: ['none'], level: 'beginner', file: 'b.mp4' }
  };
  const r = Engine.buildSession('אימון 20 דקות', only);
  assert.ok(r.workout);
});
