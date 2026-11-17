'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'reserves.html'), 'utf8');
const track = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'content', 'reserves', 'miluim-track.json'), 'utf8'));

function extract(name) {
  const start = html.indexOf('function ' + name + '(');
  assert.ok(start !== -1, name);
  const open = html.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < html.length; i++) {
    if (html[i] === '{') depth++;
    else if (html[i] === '}' && --depth === 0) return html.slice(start, i + 1);
  }
  throw new Error('unbalanced ' + name);
}

test('each reserves session can be turned into a live workout', () => {
  assert.match(html, /התחל אימון/);
  assert.match(html, /startReserveSession/);
  assert.match(html, /TH\.recordFinishedWorkout/);
  assert.match(html, /host\.textContent = ''/);
  const sessionToWorkout = new Function(extract('sessionToWorkout') + '\nreturn sessionToWorkout;')();
  const session = track.plan.sessions[0];
  const workout = sessionToWorkout(session);
  assert.match(workout.title, /מילואים/);
  assert.ok(workout.phases[0].exercises.length >= 1);
  assert.ok(workout.phases[0].exercises.every((ex) => ex.name && ex.sets >= 1));
});

test('saving reserve metrics records a journal session for the entered results', () => {
  const mem = {};
  global.localStorage = {
    getItem(k) { return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null; },
    setItem(k, v) { mem[k] = String(v); },
    removeItem(k) { delete mem[k]; }
  };
  const TH = require('../js/core.js');
  const saved = TH.recordFinishedWorkout({
    title: 'מדדי מילואים',
    doneAt: '2026-11-09T18:00:00.000Z',
    exercises: 3,
    sets: 3,
    skipped: 1,
    plan: TH.compactPlan({
      title: 'מדדי מילואים',
      phases: [{ name: 'Main', exercises: [{ name: 'עליות מתח', id: 'pullups', sets: 1, reps: '4' }] }]
    }),
    log: [{ id: 'pullups', sets: [{ reps: 4, weightKg: 0 }] }]
  });
  assert.equal(saved.logs.length, 1);
  assert.equal(saved.logs[0].title, 'מדדי מילואים');
  assert.equal(saved.logs[0].exercises, 3);
  assert.equal(saved.logs[0].sets, 3);
  assert.equal(TH.expandPlan(saved.lastPlan).phases[0].exercises.length, 1);
});
