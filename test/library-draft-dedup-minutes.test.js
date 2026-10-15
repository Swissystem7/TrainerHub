'use strict';

// library.html «הוסף לאימון»: a double tap pushed the same clip twice into
// the draft, and the draft's Main phase stayed «20 דקות» (total «30 דקות»)
// however many clips were picked - 12 clips at 3×8-12 with 45 s rest are
// about 36 minutes of Main alone, and the trainee page / print sheet showed
// the stale total.

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
  href: 'https://swissystem7.github.io/TrainerHub/library.html',
  pathname: '/TrainerHub/library.html',
  hash: ''
};

const root = path.join(__dirname, '..');
const page = fs.readFileSync(path.join(root, 'library.html'), 'utf8');
const TH = require('../js/core.js');
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'js', 'catalog.json'), 'utf8'));
TH.setCatalog(catalog);

const ids = TH.catalogList().map(function (e) { return e.id; });
assert.ok(ids.length >= 12, 'the real catalog has at least 12 clips');

function mainOf(w) {
  return w.phases[1].exercises;
}

// The grid click handler as library.html binds it, with a card stub for one clip.
function gridHandler() {
  const marker = "$('grid').addEventListener('click', function (e) {";
  const start = page.indexOf(marker);
  assert.ok(start !== -1, 'library.html binds the grid click handler');
  const open = page.indexOf('{', start + marker.length - 1);
  let depth = 0;
  let end = -1;
  for (let i = open; i < page.length; i++) {
    if (page[i] === '{') depth++;
    else if (page[i] === '}' && --depth === 0) { end = i; break; }
  }
  assert.ok(end !== -1, 'balanced handler');
  const body = page.slice(open + 1, end);
  const run = new Function('$', 'TH', 'renderDraft', 'jumpToAlternative', 'setTimeout', 'window', 'e', body);
  return function (id) {
    const btn = {
      textContent: 'הוסף לאימון',
      getAttribute: function (k) { return k === 'data-act' ? 'add' : null; },
      closest: function (sel) {
        if (sel === '.card') return { getAttribute: function (k) { return k === 'data-id' ? id : null; } };
        return null;
      }
    };
    run(function () { return {}; }, TH, function () {}, function () {}, function () {}, {}, { target: btn });
    return btn.textContent;
  };
}

test('a clip is added once however many times its button is tapped', function () {
  TH.draftClear();
  TH.draftAdd(ids[0]);
  TH.draftAdd(ids[0]);
  TH.draftAdd(ids[0]);
  const main = mainOf(TH.draftGet());
  assert.equal(main.length, 1);
  assert.equal(main[0].id, ids[0]);
  assert.equal(TH.draftHas(ids[0]), true);
  assert.equal(TH.draftHas(ids[1]), false);
});

test('the Main phase and the total grow with the picked clips, never below the 20-minute default', function () {
  TH.draftClear();
  TH.draftAdd(ids[0]);
  let w = TH.draftGet();
  assert.equal(w.phases[1].duration_minutes, 20, 'one clip keeps the 20-minute default');
  assert.equal(w.duration_minutes, 30);

  for (let i = 1; i < 12; i++) TH.draftAdd(ids[i]);
  w = TH.draftGet();
  assert.equal(mainOf(w).length, 12);
  // 3 sets × (10 reps × 3 s) + 2 rests × 45 s = 180 s per clip → 36 min.
  assert.equal(w.phases[1].duration_minutes, 36);
  assert.equal(w.duration_minutes, 5 + 36 + 5);
});

test('the shared link carries the grown total', function () {
  TH.draftClear();
  for (let i = 0; i < 10; i++) TH.draftAdd(ids[i]);
  const url = TH.encodeLink(TH.draftGet(), {});
  const decoded = TH.decodeHash(url.split('#')[1]);
  const w = decoded.workout || decoded;
  assert.equal(w.duration_minutes, 40);
});

test('the «הוסף לאימון» button says «כבר באימון» on a second tap', function () {
  TH.draftClear();
  const tap = gridHandler();
  assert.equal(tap(ids[2]), 'נוסף');
  assert.equal(tap(ids[2]), 'כבר באימון');
  assert.equal(mainOf(TH.draftGet()).length, 1);
});
