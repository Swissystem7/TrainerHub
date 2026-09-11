'use strict';

/* Round-2 follow-up 2: the minutes badge on a phase in the Studio card.
   Item 1 of this branch gave a built session a Cool-down of 10 minutes where the
   old builder wrote 0, and the Studio renders that number as a badge. The phase
   the builder produces holds no exercises, so the card showed a phase that is
   nothing but a number — a visual change nobody asked for.

   This test drives the Studio page itself: its inline script runs in a node:vm
   context over a hand-written DOM, a built session is put in the browser store,
   and the card is opened through the same saved-workout path a trainer uses.
   What is asserted is the HTML the page produces, not a substring of the file.
   No new dependency, no clock, no randomness, no network. */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');

const mem = {};
global.localStorage = {
  getItem: function (k) { return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null; },
  setItem: function (k, v) { mem[k] = String(v); },
  removeItem: function (k) { delete mem[k]; }
};

const TH = require('../js/core.js');
const Engine = require('../js/session-builder.js');
const { WorkoutLibrary } = require('../frontend/saved-workouts.js');
const { NetanyaOpeningWorkouts } = require('../frontend/netanya-opening.js');
const { parseWorkoutClient } = require('../frontend/parse-workout.js');

const FIXTURE = {
  warmup: { id: 'warmup', he: 'חימום', muscles: ['core'], equipment: ['none'], level: 'beginner', file: 'חימום.mp4', source: 'local' },
  plank: { id: 'plank', he: 'פלאנק', muscles: ['core'], equipment: ['none'], level: 'beginner', file: 'פלאנק.mp4', source: 'local' },
  mountain_climber: { id: 'mountain_climber', he: 'מטפס הרים', muscles: ['core'], equipment: ['none'], level: 'beginner', file: 'מטפס.mp4', source: 'local' },
  crunches: { id: 'crunches', he: 'בטן', muscles: ['core'], equipment: ['none'], level: 'beginner', file: 'בטן.mp4', source: 'local' }
};
TH.setCatalog(FIXTURE);

const html = fs.readFileSync(path.join(root, 'frontend', 'index.html'), 'utf8');

function pageScript() {
  const blocks = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)];
  assert.equal(blocks.length, 1, 'frontend/index.html should carry exactly one inline script');
  return blocks[0][1];
}

const IDS = ['actionBar', 'cardContent', 'cardEmpty', 'copyBtn', 'gateHost', 'historyList',
  'jsonBtn', 'libraryStatus', 'netanyaBtn', 'parseBtn', 'pdfBtn', 'previewBtn', 'saveBtn',
  'shareBtn', 'startBtn', 'workoutInput'];

function makeElement(id) {
  return {
    id: id,
    value: '',
    textContent: '',
    innerHTML: '',
    hidden: false,
    events: {},
    addEventListener: function (type, fn) { (this.events[type] = this.events[type] || []).push(fn); },
    fire: function (type, event) { (this.events[type] || []).forEach(function (fn) { fn(event); }); },
    removeAttribute: function () {},
    setAttribute: function () {},
    querySelectorAll: function () { return []; },
    querySelector: function () { return null; },
    insertAdjacentHTML: function (where, markup) { this.innerHTML += markup; },
    click: function () {},
    remove: function () {}
  };
}

function openStudio() {
  const els = {};
  IDS.forEach(function (id) { els[id] = makeElement(id); });
  const context = {
    document: {
      getElementById: function (id) { return els[id] || null; },
      querySelectorAll: function () { return []; },
      createElement: function () { return makeElement('anonymous'); },
      addEventListener: function () {}
    },
    TH: TH,
    WorkoutLibrary: WorkoutLibrary,
    NetanyaOpeningWorkouts: NetanyaOpeningWorkouts,
    parseWorkoutClient: parseWorkoutClient,
    URL: { createObjectURL: function () { return 'blob:studio/1'; }, revokeObjectURL: function () {} },
    Blob: function () {},
    navigator: { clipboard: { writeText: function () { return Promise.resolve(); } } },
    location: { href: '' },
    setTimeout: function () { return 0; },
    console: console
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(pageScript(), context, { filename: 'frontend/index.html' });
  return { ctx: context, els: els };
}

// open a stored workout through the Studio's own saved-workout click path
function openSaved(studio, index) {
  const target = {
    closest: function (selector) {
      if (selector !== '[data-load]') return null;
      return { getAttribute: function () { return String(index); } };
    }
  };
  studio.els.historyList.fire('click', { target: target });
  return studio.els.cardContent.innerHTML;
}

function phaseBlocks(cardHtml) {
  return cardHtml.split('<div class="phase">').slice(1).map(function (block) {
    const label = /<span>([^<]*)<\/span>/.exec(block);
    return {
      label: label ? label[1] : '',
      minutes: /<span>(\d+) דקות<\/span>/.exec(block),
      exercises: (block.match(/<div class="exercise">/g) || []).length,
      html: block
    };
  });
}

function builtSession(minutes) {
  const built = Engine.buildSession({
    focus: 'core', muscles: ['core'], equipment: [], level: null, goal: null,
    duration: minutes, durationSpecified: true, participants: 1
  }, FIXTURE);
  assert.ok(built.workout, minutes + ' minutes produced no workout');
  return built.workout;
}

test('a built 60-minute session really does hand the Studio an empty but timed cool-down', function () {
  const w = builtSession(60);
  const cool = w.phases[2];
  assert.equal(cool.name, 'Cool-down');
  assert.equal(cool.duration_minutes, 10);
  assert.deepEqual(cool.exercises, [], 'the builder still puts nothing in the cool-down');
});

test('the Studio card shows minutes only on a phase that has exercises', function () {
  const studio = openStudio();
  TH.store.set(TH.KEYS.saved, [builtSession(60)]);
  const card = openSaved(studio, 0);
  const phases = phaseBlocks(card);

  assert.deepEqual(phases.map(function (p) { return p.label; }), ['חימום', 'עיקר', 'שחרור']);
  assert.ok(phases[0].exercises >= 1 && phases[1].exercises >= 1);
  assert.equal(phases[2].exercises, 0, 'the cool-down of a built session is empty');

  assert.ok(phases[0].minutes, 'the warm-up has exercises and keeps its minutes badge');
  assert.equal(phases[0].minutes[1], '10');
  assert.ok(phases[1].minutes, 'the main phase keeps its minutes badge');
  assert.equal(phases[1].minutes[1], '40');
  assert.equal(phases[2].minutes, null, 'an empty phase must not be rendered as a bare minutes badge');
  assert.equal(phases[2].html.indexOf('דקות'), -1);
});

test('a phase that has both minutes and exercises still shows its badge', function () {
  const studio = openStudio();
  TH.store.set(TH.KEYS.saved, [NetanyaOpeningWorkouts[0]]);
  const card = openSaved(studio, 0);
  const phases = phaseBlocks(card);
  assert.equal(phases.length, 3);
  for (const phase of phases) {
    assert.ok(phase.exercises >= 1, phase.label + ' should have exercises in this fixture');
    assert.ok(phase.minutes, phase.label + ' should keep its minutes badge');
  }
  assert.equal(phases.map(function (p) { return Number(p.minutes[1]); }).reduce(function (a, b) { return a + b; }, 0), 85);
});
