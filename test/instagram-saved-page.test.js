'use strict';

/* frontend/instagram-saved.html: the save button, driven as the page drives it.
   The page's own inline script runs in a node:vm context over a small fake DOM,
   so what is asserted is what happens on a click, not which strings the file holds. */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'frontend', 'instagram-saved.html'), 'utf8');

function pageScript() {
  const blocks = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)];
  assert.equal(blocks.length, 1, 'instagram-saved.html should carry exactly one inline script');
  return blocks[0][1];
}

function loadPage(save) {
  const els = {};
  function el(id) {
    if (!els[id]) {
      els[id] = {
        id: id, value: '', textContent: '', innerHTML: '', className: 'status', hidden: false, events: {},
        addEventListener: function (type, fn) { (this.events[type] = this.events[type] || []).push(fn); }
      };
    }
    return els[id];
  }
  const context = {
    document: { getElementById: el, querySelector: function () { return null; } },
    localStorage: { getItem: function () { return null; }, setItem: function () {} },
    TH: { store: { get: function (k, d) { return d; } }, KEYS: { saved: 'trainerhub_saved' } },
    WorkoutLibrary: { save: save },
    InstagramSaved: {},
    fetch: function () { return Promise.reject(new Error('no network in tests')); },
    console: console
  };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(pageScript(), context, { filename: 'instagram-saved.html' });
  return {
    ctx: context,
    els: els,
    click: function (id) { (els[id].events.click || []).forEach(function (fn) { fn({ target: els[id] }); }); }
  };
}

test('a failed save shows a Hebrew error instead of throwing out of the click', () => {
  const page = loadPage(function () {
    throw new Error('השמירה נכשלה. בדקו מקום פנוי והרשאות אחסון בדפדפן. אפשר לייצא JSON לגיבוי.');
  });
  page.ctx.__preview = { added: [{ title: 'אימון', phases: [{ name: 'Main', exercises: [] }] }] };
  assert.doesNotThrow(function () { page.click('saveBtn'); });
  const status = page.els.saveStatus.textContent;
  assert.match(status, /השמירה נכשלה/, status);
  assert.doesNotMatch(status, /נשמרו/, 'a failed save must not report success');
});

test('an English or empty browser error is replaced by Hebrew text', () => {
  const page = loadPage(function () { throw new TypeError("Cannot read properties of undefined (reading 'set')"); });
  page.ctx.__preview = { added: [{ title: 'אימון', phases: [{ name: 'Main', exercises: [] }] }] };
  assert.doesNotThrow(function () { page.click('saveBtn'); });
  assert.match(page.els.saveStatus.textContent, /^השמירה נכשלה/);
  assert.doesNotMatch(page.els.saveStatus.textContent, /[A-Za-z]/, 'no English in the Hebrew page');

  const empty = loadPage(function () { throw new Error(''); });
  empty.ctx.__preview = { added: [{ title: 'אימון', phases: [{ name: 'Main', exercises: [] }] }] };
  assert.doesNotThrow(function () { empty.click('saveBtn'); });
  assert.match(empty.els.saveStatus.textContent, /^השמירה נכשלה/);
});

test('a successful save still reports how many workouts were saved', () => {
  const calls = [];
  const page = loadPage(function (store, key, list) { calls.push(list.length); return list; });
  page.ctx.__preview = { added: [{ title: 'א', phases: [{}] }, { title: 'ב', phases: [{}] }] };
  page.click('saveBtn');
  assert.deepEqual(calls, [2]);
  assert.equal(page.els.saveStatus.textContent, 'נשמרו 2 אימונים לספרייה.');
});
