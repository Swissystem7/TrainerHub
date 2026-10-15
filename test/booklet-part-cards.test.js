'use strict';

// Regression: booklet opening session 3 (stretcher relay + rope pull).
// Before the fix, a part whose text merely *names* exercises (the waiting group's
// static holds) was turned into N blank cards and the drill itself vanished, and a
// text-only part with work seconds x rounds became a single untimed card.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const B = require('../js/booklet.js');

const root = path.join(__dirname, '..');
B.setData(JSON.parse(fs.readFileSync(path.join(root, B.MAIN_PATH), 'utf8')), null);

function mainOf(id) { return B.sessionWorkout(id).phases[1].exercises; }

test('opening-3 keeps the stretcher drill as one card with the static holds in its notes', function () {
  const main = mainOf('opening-3');
  assert.equal(main.length, 2, 'one card per part, no blank hold cards');
  const stretcher = main[0];
  assert.match(stretcher.name, /אלונקה/);
  assert.match(stretcher.notes, /^הדגמת פתיחת אלונקה/);
  assert.match(stretcher.notes, /פלאנק \/ מצב 2 \/ סקוואט סטטי/);
  assert.equal(stretcher.sets, 1);
  assert.equal(stretcher.reps, null);
  assert.ok(!main.some(function (x) { return x.name === 'פלאנק' || x.name === 'מצב 2'; }));
});

test('opening-3 rope pull carries its 3 rounds x 30 seconds', function () {
  const rope = mainOf('opening-3')[1];
  assert.match(rope.name, /משיכה בחבל/);
  assert.equal(rope.sets, 3);
  assert.equal(rope.duration_seconds, 30);
  assert.equal(rope.rest_seconds, null);
  assert.match(rope.notes, /^נמשיך ב־2 קבוצות/);
});

test('prescribed station parts are unchanged: one card per exercise with work and rest', function () {
  const main = mainOf('opening-1');
  assert.equal(main[0].duration_seconds, 1200, 'text-only relay keeps its 20 minutes');
  const stations = main.slice(1);
  assert.equal(stations.length, 7);
  assert.ok(stations.every(function (x) { return x.sets === 2 && x.duration_seconds === 40 && x.rest_seconds === 20; }));
  const pairs = mainOf('opening-4');
  assert.ok(pairs.slice(0, 4).every(function (x) { return x.sets === 4 && x.duration_seconds === 45 && x.rest_seconds === 15; }));
  assert.equal(pairs[4].duration_seconds, null, 'crawling stays an untimed card');
});

test('a part with reps-prescribed exercises is still one card per exercise', function () {
  B.setData({
    _meta: { sources: [], organization: '' }, drills: [
      { id: 'w1', he: 'חימום א', category: 'warmup' }, { id: 'w2', he: 'חימום ב', category: 'warmup' }, { id: 'w3', he: 'חימום ג', category: 'warmup' },
      { id: 'f1', he: 'מתיחה א', category: 'flexibility' }, { id: 'f2', he: 'מתיחה ב', category: 'flexibility' }, { id: 'f3', he: 'מתיחה ג', category: 'flexibility' }
    ],
    principles: { warmup: { durations: [{ id: 'summer', minutes: 5 }, { id: 'winter', minutes: 10 }, { id: 'long', minutes: 5 }, { id: 'short', minutes: 15 }] }, flexibilityProtocol: { minutes: { closing: 10 } } },
    sessionTemplate: { parts: [{ phase: 'Main', minutes: 45 }] },
    sessions: [{ id: 's', he: 'מערך', equipment: ['none'], parts: [
      { he: 'חלק', text: 'הסבר', exercises: [{ he: 'סקוואט', reps: 15 }, { he: 'פלאנק', seconds: 45 }] }
    ] }]
  }, null);
  const main = mainOf('s');
  assert.deepEqual(main.map(function (x) { return [x.name, x.reps, x.duration_seconds]; }), [['סקוואט', 15, null], ['פלאנק', null, 45]]);
});
