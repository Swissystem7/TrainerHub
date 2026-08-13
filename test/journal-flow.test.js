'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const mem = {};
global.localStorage = {
  getItem: function (k) { return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null; },
  setItem: function (k, v) { mem[k] = String(v); },
  removeItem: function (k) { delete mem[k]; }
};
global.location = {
  href: 'https://swissystem7.github.io/TrainerHub/index.html',
  pathname: '/TrainerHub/index.html',
  hash: ''
};

const TH = require('../js/core.js');
const { parseWorkoutClient } = require('../frontend/parse-workout.js');
const { parsePrompt } = require('../js/prompt-parser.js');
const { buildSession } = require('../js/session-builder.js');

const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'js', 'catalog.json'), 'utf8'));
TH.setCatalog(catalog);

function sampleWorkout() {
  return {
    title: 'אימון ליבה',
    duration_minutes: 20,
    intensity: 'medium',
    phases: [
      { name: 'Warm-up', exercises: [{ name: 'חימום', id: 'warmup', sets: 1, reps: null, duration_seconds: 60, rest_seconds: null }] },
      { name: 'Main', exercises: [{ name: 'פלאנק', id: 'plank', sets: 3, reps: '8-12', duration_seconds: null, rest_seconds: 45 }] },
      { name: 'Cool-down', exercises: [{ name: 'שחרור', id: 'child_pose', sets: 1, reps: null, duration_seconds: 60, rest_seconds: null }] }
    ]
  };
}

test('builder -> hash link -> clip -> TH1 journal is a closed offline loop', function () {
  const built = buildSession('אימון בטן 20 דקות בלי ציוד', catalog);
  assert.ok(built.workout);
  assert.ok((built.workout.phases || []).length >= 1);

  const url = TH.encodeLink(built.workout, { name: 'מתאמן', tid: 't_loop' });
  assert.match(url, /#TH\./);
  assert.equal(/\.mp4/i.test(url), false);
  const decoded = TH.decodeHash(url.slice(url.indexOf('#')));
  assert.equal(decoded.tid, 't_loop');
  assert.ok(decoded.workout.phases.length);

  const clipUrl = TH.encodeClip('plank', {});
  assert.match(clipUrl, /#CLIP\./);
  assert.equal(/\.mp4/i.test(clipUrl), false);
  const clip = TH.decodeClipHash(clipUrl.slice(clipUrl.indexOf('#')));
  assert.equal(clip.id, 'plank');
  const clipWorkout = TH.clipToWorkout(clip);
  assert.equal(clipWorkout.phases[1].exercises[0].id, 'plank');

  const code = TH.encodeResult({
    name: decoded.name,
    title: decoded.workout.title,
    tid: decoded.tid,
    minutes: 18,
    exercises: 4,
    sets: 8,
    skipped: 0,
    rpe: 3,
    plan: TH.compactPlan(decoded.workout)
  });
  const imported = TH.decodeResult('היי\n' + code);
  assert.equal(imported.tid, 't_loop');
  assert.equal(imported.name, 'מתאמן');
  assert.ok(imported.plan);
});

test('encodeLink works without trainer entitlement; shareToClient does not', function () {
  TH.clearEntitlement();
  const w = sampleWorkout();
  const preview = TH.encodeLink(w, {});
  assert.match(preview, /#TH\./);
  const gated = TH.shareToClient(w, {});
  assert.equal(gated.ok, false);
  assert.equal(gated.gated, true);
});

test('suggestNextFromLog drops a set after hard RPE and adds one after an easy clean log', function () {
  const compact = TH.compactPlan(sampleWorkout());
  const down = TH.suggestNextFromLog(compact, { rpe: 5, skipped: 0 });
  assert.equal(down.adjusted, 'down');
  assert.equal(down.workout.phases[1].exercises[0].sets, 2);
  const up = TH.suggestNextFromLog(compact, { rpe: 1, skipped: 0 });
  assert.equal(up.adjusted, 'up');
  assert.equal(up.workout.phases[1].exercises[0].sets, 4);
  const same = TH.suggestNextFromLog(compact, { rpe: 3, skipped: 0 });
  assert.equal(same.adjusted, 'same');
  assert.equal(same.workout.phases[1].exercises[0].sets, 3);
});

test('studio client parser and prompt builder both attach real catalog ids', function () {
  const parsed = parseWorkoutClient('עיקר:\nפלאנק 3 סטים של 10\nשחרור.');
  const plank = parsed.phases[1].exercises.filter(function (e) { return e.id === 'plank'; })[0];
  assert.ok(plank);
  const intent = parsePrompt('אימון בטן 20 דקות בלי ציוד');
  assert.ok(intent.muscles.indexOf('core') !== -1);
});

test('journal page is a first-class surface, not a buried studio tab', function () {
  const html = fs.readFileSync(path.join(__dirname, '..', 'journal.html'), 'utf8');
  assert.match(html, /lang="he"/);
  assert.match(html, /dir="rtl"/);
  assert.match(html, /decodeResult/);
  assert.match(html, /suggestNextFromLog/);
  assert.match(html, /encodeLink/);
  assert.match(html, /shareToClient/);
  assert.doesNotMatch(html, /prompt\(/);
  assert.match(fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8'), /journal\.html/);
});
