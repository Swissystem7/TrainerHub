'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const TH = require('../js/core.js');

function sampleResult(overrides) {
  return Object.assign({
    name: 'דני כהן',
    title: 'אימון 2 · משיכה',
    doneAt: '2026-08-13T10:15:00.000Z',
    minutes: 37,
    exercises: 6,
    sets: 14,
    skipped: 1,
    tid: 't_k7p2',
    rpe: 4,
    plan: { t: 'אימון 2', p: [{ n: 'Main', e: [{ n: 'חתירה', s: 3, r: '8-12' }] }] }
  }, overrides);
}

test('encodeResult / decodeResult round-trip the completion payload', function () {
  const result = sampleResult();
  const code = TH.encodeResult(result);
  assert.match(code, /^TH1\.[A-Za-z0-9_-]+$/);
  const parsed = TH.decodeResult(code);
  assert.equal(parsed.v, 1);
  assert.equal(parsed.name, result.name);
  assert.equal(parsed.title, result.title);
  assert.equal(parsed.doneAt, result.doneAt);
  assert.equal(parsed.minutes, result.minutes);
  assert.equal(parsed.exercises, result.exercises);
  assert.equal(parsed.sets, result.sets);
  assert.equal(parsed.skipped, result.skipped);
  assert.equal(parsed.tid, result.tid);
  assert.equal(parsed.rpe, result.rpe);
  assert.deepEqual(parsed.plan, result.plan);
});

test('decodeResult pulls a TH1 token out of a WhatsApp paste', function () {
  const code = TH.encodeResult(sampleResult({ name: 'נועה' }));
  const pasted = [
    'סיימתי אימון ב-TrainerHub',
    'מתאמן: נועה',
    'קוד לייבוא ביומן המאמן:',
    code,
    'תודה!'
  ].join('\n');
  const parsed = TH.decodeResult(pasted);
  assert.equal(parsed.name, 'נועה');
  assert.equal(parsed.title, 'אימון 2 · משיכה');
});

test('waShareUrl builds an international wa.me link with the encoded message', function () {
  const message = 'סיימתי אימון\nקוד: TH1.abc';
  const withZero = TH.waShareUrl('0501234567', message);
  assert.equal(withZero, 'https://wa.me/972501234567?text=' + encodeURIComponent(message));
  const withNine = TH.waShareUrl('501234567', message);
  assert.equal(withNine, 'https://wa.me/972501234567?text=' + encodeURIComponent(message));
  const alreadyIntl = TH.waShareUrl('972501234567', message);
  assert.equal(alreadyIntl, 'https://wa.me/972501234567?text=' + encodeURIComponent(message));
  const empty = TH.waShareUrl('', message);
  assert.equal(empty, 'https://wa.me/?text=' + encodeURIComponent(message));
});

test('encodeLink / decodeHash keep the plan that the wa.me report later re-encodes', function () {
  const prev = global.location;
  global.location = {
    href: 'https://swissystem7.github.io/TrainerHub/frontend/workout-mode.html',
    pathname: '/TrainerHub/frontend/workout-mode.html',
    hash: ''
  };
  try {
    const workout = {
      title: 'אימון 1',
      duration_minutes: 45,
      intensity: 'medium',
      phases: [
        { name: 'Warm-up', exercises: [{ name: 'חימום', id: 'warmup', duration_seconds: 180 }] },
        { name: 'Main', exercises: [{ name: 'פלאנק', id: 'plank', sets: 3, reps: '8-12', rest_seconds: 60 }] },
        { name: 'Cool-down', exercises: [{ name: 'שחרור', id: 'child_pose', duration_seconds: 180 }] }
      ]
    };
    const url = TH.encodeLink(workout, { wa: '0501112222', name: 'יוסי', tid: 't_link' });
    assert.match(url, /workout-mode\.html#TH\./);
    const decoded = TH.decodeHash(url.slice(url.indexOf('#')));
    assert.equal(decoded.name, 'יוסי');
    assert.equal(decoded.wa, '0501112222');
    assert.equal(decoded.tid, 't_link');
    assert.equal(decoded.workout.phases.length, 3);
    assert.equal(decoded.workout.phases[1].exercises[0].id, 'plank');
    assert.equal(decoded.workout.phases[1].exercises[0].rest_seconds, 60);
    const report = TH.encodeResult({
      name: decoded.name,
      title: decoded.workout.title,
      tid: decoded.tid,
      plan: TH.compactPlan(decoded.workout)
    });
    const back = TH.decodeResult(report);
    assert.equal(back.name, 'יוסי');
    assert.equal(back.plan.p[1].e[0].id, 'plank');
  } finally {
    if (prev === undefined) delete global.location;
    else global.location = prev;
  }
});
