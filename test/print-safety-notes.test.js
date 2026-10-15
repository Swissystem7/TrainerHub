'use strict';

// A workout built for a site ("סריקת שטח") carries its warnings as
// `safety_notes`. The printed sheet must show them — the coach in the field
// prints the page and leaves the phone in the bag.

const test = require('node:test');
const assert = require('node:assert/strict');

const mem = {};
global.localStorage = {
  getItem: function (k) { return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null; },
  setItem: function (k, v) { mem[k] = String(v); },
  removeItem: function (k) { delete mem[k]; }
};
global.location = {
  href: 'https://swissystem7.github.io/TrainerHub/site-scan.html',
  pathname: '/TrainerHub/site-scan.html',
  hash: ''
};

const TH = require('../js/core.js');

function workout(notes) {
  return {
    title: 'אימון לשטח',
    safety_notes: notes,
    phases: [{
      name: 'Main',
      exercises: [{ name: 'פלאנק', id: 'plank', sets: 3, duration_seconds: 40, rest_seconds: 30 }]
    }]
  };
}

test('safety notes reach the print model and the sheet', function () {
  const lines = ['זוהו מכוניות: לסמן גבול אימון הרחק מהכביש.', '20 מתאמנים בשטח צר: לעבוד בגלים של עד 8.'];
  const model = TH.workoutPrintModel(workout(lines), {});
  assert.deepEqual(model.safety, lines);
  const html = TH.workoutPrintHtml(model);
  assert.match(html, /<section class="print-safety">/);
  assert.match(html, /דגשי בטיחות ושטח/);
  lines.forEach((line) => assert.ok(html.includes(line), line));
});

test('the safety block sits above the phases, so it is read before the drills', function () {
  const html = TH.workoutPrintHtml(TH.workoutPrintModel(workout(['משטח חלק: בלי ריצות.']), {}));
  assert.ok(html.indexOf('print-safety') < html.indexOf('print-phase'));
});

test('blank, repeated and non-string notes are dropped', function () {
  const model = TH.workoutPrintModel(workout(['  זהירות  ', 'זהירות', '', '   ', null, 7]), {});
  assert.deepEqual(model.safety, ['זהירות', '7']);
});

test('safety notes are escaped', function () {
  const html = TH.workoutPrintHtml(TH.workoutPrintModel(workout(['<b>x</b>']), {}));
  assert.ok(html.includes('&lt;b&gt;x&lt;/b&gt;'));
  assert.ok(!html.includes('<b>x</b>'));
});

test('a workout without notes prints exactly as before', function () {
  const plain = TH.workoutPrintModel(workout(undefined), {});
  assert.deepEqual(plain.safety, []);
  const html = TH.workoutPrintHtml(plain);
  assert.ok(!html.includes('print-safety'));
  assert.deepEqual(TH.workoutPrintModel(workout('לא מערך'), {}).safety, []);
  assert.deepEqual(TH.workoutPrintModel({}, {}).safety, []);
});

test('preparePrint keeps the notes with the stored workout', function () {
  const w = workout(['זוהו זכוכיות: לנקות לפני שמתחילים.']);
  const out = TH.preparePrint(w, {});
  assert.deepEqual(out.model.safety, w.safety_notes);
  const stored = TH.store.get(TH.KEYS.print, null);
  assert.deepEqual(stored.workout.safety_notes, w.safety_notes);
});
