'use strict';

// Regression: an online/offline event in workout-mode used to call renderStep(),
// which restarted the running countdown from the full duration and, once the
// workout had finished, ran finishWorkout() a second time (new doneAt, fresh
// TH1 code, the RPE choice wiped). Network flips must only swap the media slot.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const page = fs.readFileSync(path.join(__dirname, '..', 'frontend', 'workout-mode.html'), 'utf8');

function extractFunction(name) {
  const start = page.indexOf('function ' + name + '(');
  assert.ok(start >= 0, 'page defines ' + name);
  let depth = 0;
  for (let i = page.indexOf('{', start); i < page.length; i++) {
    if (page[i] === '{') depth++;
    if (page[i] === '}') depth--;
    if (depth === 0) return page.slice(start, i + 1);
  }
  throw new Error('unbalanced ' + name);
}

function fakeDocument(slot) {
  return { getElementById: function (id) { return id === 'exMediaSlot' ? slot : null; } };
}

function harness(ctx) {
  const src = extractFunction('refreshStepMedia');
  const factory = new Function('workout', 'steps', 'stepIdx', 'TH', 'document',
    src + '\nreturn refreshStepMedia;');
  return factory(ctx.workout, ctx.steps, ctx.stepIdx, ctx.TH, ctx.document);
}

test('network listeners no longer re-render the step', function () {
  const listeners = page.match(/window\.addEventListener\('(?:online|offline)',[^\n]*/g) || [];
  assert.equal(listeners.length, 2);
  for (const line of listeners) {
    assert.doesNotMatch(line, /renderStep|finishWorkout/);
    assert.match(line, /refreshStepMedia/);
  }
  const body = extractFunction('refreshStepMedia');
  assert.doesNotMatch(body, /renderStep|finishWorkout|startCountdown|clearCountdown/);
});

test('renderExercise puts the player in a stable slot the listener can refresh', function () {
  assert.match(extractFunction('renderExercise'), /id="exMediaSlot">\$\{videoHtml\}<\/div>/);
});

test('after the last step a network flip is a no-op (no second finishWorkout, no DOM access)', function () {
  let touched = 0;
  const refresh = harness({
    workout: { title: 'x' },
    steps: [{ type: 'exercise', name: 'סקוואט' }],
    stepIdx: 1,
    TH: { findExercise: function () { touched++; return null; }, mediaMarkup: function () { touched++; return ''; } },
    document: { getElementById: function () { touched++; return null; } }
  });
  refresh();
  assert.equal(touched, 0);
});

test('during a rest step the countdown is left alone and nothing is re-rendered', function () {
  let touched = 0;
  const refresh = harness({
    workout: { title: 'x' },
    steps: [{ type: 'exercise', name: 'סקוואט' }, { type: 'rest', duration: 60 }],
    stepIdx: 1,
    TH: { findExercise: function () { touched++; return null; }, mediaMarkup: function () { touched++; return ''; } },
    document: { getElementById: function () { touched++; return null; } }
  });
  refresh();
  assert.equal(touched, 0);
});

test('during an exercise only the media slot is swapped for the current clip', function () {
  const slot = { innerHTML: '<video></video>' };
  const seen = [];
  const refresh = harness({
    workout: { title: 'x' },
    steps: [{ type: 'exercise', id: 'squat', name: 'סקוואט' }],
    stepIdx: 0,
    TH: {
      findExercise: function (step) { seen.push(step.id); return { id: 'squat', he: 'סקוואט' }; },
      mediaMarkup: function (clip, opts) { return '<p class="' + opts.className + '-fallback">' + clip.he + '</p>'; }
    },
    document: fakeDocument(slot)
  });
  refresh();
  assert.deepEqual(seen, ['squat']);
  assert.equal(slot.innerHTML, '<p class="ex-media-fallback">סקוואט</p>');

  const noClip = { innerHTML: '<video></video>' };
  harness({
    workout: { title: 'x' },
    steps: [{ type: 'exercise', id: 'unknown', name: '?' }],
    stepIdx: 0,
    TH: { findExercise: function () { return null; }, mediaMarkup: function () { throw new Error('must not be called'); } },
    document: fakeDocument(noClip)
  })();
  assert.equal(noClip.innerHTML, '');
});
