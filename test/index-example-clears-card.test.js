'use strict';
// frontend/index.html: an example button («דוגמה: כוח») writes into the editor
// without firing «input», so a card converted earlier stayed on screen with its
// action bar. «התחל» / «שמור» then ran the previous workout, not the example
// now in the box. The example button now clears the card like typing does.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.join(__dirname, '..', 'frontend', 'index.html'), 'utf8');

function pageScript() {
  const open = html.lastIndexOf('<script>');
  return html.slice(open + '<script>'.length, html.indexOf('</script>', open));
}

function fakeEl() {
  const handlers = {};
  return {
    value: '', textContent: '', innerHTML: '', hidden: false,
    addEventListener(type, fn) { handlers[type] = fn; },
    fire(type, e) { handlers[type](e || { target: this }); },
    focus() {}
  };
}

function boot() {
  const els = {};
  const $ = id => (els[id] = els[id] || fakeEl());
  const exampleBtns = ['1', '2', '3'].map(n => Object.assign(fakeEl(), { getAttribute: () => n }));
  const store = {};
  const document = {
    getElementById: $,
    querySelectorAll: sel => (sel === '[data-ex]' ? exampleBtns : [])
  };
  const location = { href: '' };
  const TH = {
    esc: s => String(s == null ? '' : s),
    hasClip: () => false,
    phaseLabel: n => n,
    KEYS: { saved: 'saved', active: 'active' },
    store: { get: (k, d) => (k in store ? store[k] : d), set: (k, v) => { store[k] = v; return true; } }
  };
  const parseWorkoutClient = text => ({ title: text.split('\n')[0], phases: [] });
  new Function('document', 'location', 'TH', 'parseWorkoutClient', 'WorkoutLibrary', 'NetanyaOpeningWorkouts', pageScript())(
    document, location, TH, parseWorkoutClient, { save() {} }, []);
  return { $, exampleBtns, store };
}

test('loading an example after converting hides the old card and its actions', () => {
  const page = boot();
  page.exampleBtns[0].fire('click');
  page.$('parseBtn').fire('click');
  assert.equal(page.$('actionBar').hidden, false, 'the first example converted to a card');

  page.exampleBtns[1].fire('click');
  assert.match(page.$('workoutInput').value, /^אימון כוח עליון/);
  assert.equal(page.$('actionBar').hidden, true);
  assert.equal(page.$('cardContent').hidden, true);
  assert.equal(page.$('cardEmpty').hidden, false);
});

test('«התחל» after switching examples does not start the previous workout', () => {
  const page = boot();
  page.exampleBtns[0].fire('click');
  page.$('parseBtn').fire('click');
  page.exampleBtns[1].fire('click');
  page.$('startBtn').fire('click');
  assert.equal(page.store.active, undefined);

  page.$('parseBtn').fire('click');
  page.$('startBtn').fire('click');
  assert.match(page.store.active.title, /^אימון כוח עליון/);
});
