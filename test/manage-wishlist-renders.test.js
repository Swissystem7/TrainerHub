'use strict';

// manage.html has a section «סרטונים שכדאי לצלם» for exercises that a pasted
// workout on the home page could not match to a clip. The home page writes
// that list (THIngest.wishlistAdd, KEYS.wishlist) and even links to
// manage.html to add the clip, but manage.html never read the list, so the
// section was always blank. Now it renders the wishes, a saved clip with the
// same name removes its wish, and «מחק» drops one by hand.

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
  href: 'https://swissystem7.github.io/TrainerHub/manage.html',
  pathname: '/TrainerHub/manage.html',
  hash: ''
};

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'manage.html'), 'utf8');
const TH = require('../js/core.js');
const THInfer = require('../js/infer.js');
const THIngest = require('../js/ingest.js');

const CATALOG = {
  squat: { he: 'סקוואט', muscles: ['legs'], equipment: ['none'], level: 'beginner', file: 'squat.mp4' },
  plank: { he: 'פלאנק', muscles: ['core'], equipment: ['none'], level: 'beginner', file: 'plank.mp4' }
};

function inlineScript() {
  const start = html.lastIndexOf('<script>');
  const end = html.indexOf('</script>', start);
  assert.ok(start !== -1 && end !== -1, 'manage.html has an inline script');
  return html.slice(start + '<script>'.length, end);
}

function selectOptions(id) {
  const m = html.match(new RegExp('<select id="' + id + '"[^>]*>([\\s\\S]*?)</select>'));
  assert.ok(m, 'select#' + id + ' exists');
  const values = [];
  m[1].replace(/<option value="([^"]+)"/g, function (_, v) { values.push(v); return _; });
  return values;
}

function makeSelect(id, multiple) {
  const options = selectOptions(id).map(function (v) { return { value: v, selected: false }; });
  const el = { id: id, options: options, handlers: {}, addEventListener: function (ev, fn) { (this.handlers[ev] = this.handlers[ev] || []).push(fn); } };
  if (!multiple) {
    Object.defineProperty(el, 'value', {
      get: function () { const hit = options.filter(function (o) { return o.selected; })[0]; return hit ? hit.value : options[0].value; },
      set: function (v) { options.forEach(function (o) { o.selected = o.value === v; }); }
    });
  }
  return el;
}

// Runs the page's inline script against a stub document. `wishes` are written
// to storage before the script runs, the way the home page leaves them.
function harness(wishes) {
  Object.keys(mem).forEach(function (k) { delete mem[k]; });
  TH.setCatalog(CATALOG);
  (wishes || []).forEach(function (name) {
    THIngest.wishlistAdd(name, 'נקלט מאימון מודבק בלי סרטון במאגר');
  });
  const elements = {
    muscles: makeSelect('muscles', true),
    equipment: makeSelect('equipment', false),
    level: makeSelect('level', false)
  };
  const document = {
    getElementById: function (id) {
      if (!elements[id]) {
        elements[id] = { id: id, value: '', textContent: '', innerHTML: '', className: '', handlers: {},
          addEventListener: function (ev, fn) { (this.handlers[ev] = this.handlers[ev] || []).push(fn); } };
      }
      return elements[id];
    }
  };
  new Function('document', 'TH', 'THInfer', 'THIngest', inlineScript())(document, TH, THInfer, THIngest);
  function fire(id, ev, arg) {
    (elements[id].handlers[ev] || []).forEach(function (fn) { fn(arg || { preventDefault: function () {}, target: elements[id] }); });
  }
  // Clicks the button carrying `attr="value"` inside #wishList.
  function clickWish(attr, value) {
    const target = { getAttribute: function (name) { return name === attr ? value : null; } };
    fire('wishList', 'click', { target: target, preventDefault: function () {} });
  }
  function type(id, text) {
    elements[id].value = text;
    fire(id, 'input');
  }
  return { el: elements, fire: fire, clickWish: clickWish, type: type };
}

function wishNames() {
  return THIngest.wishlistList().map(function (w) { return w.he; });
}

test('wishes written by a paste on the home page show up in «סרטונים שכדאי לצלם»', function () {
  const h = harness(['מתח אוסטרלי', 'הליכת דוב']);
  const out = h.el.wishList.innerHTML;
  assert.ok(out.indexOf('מתח אוסטרלי') !== -1, 'first wish rendered: ' + out);
  assert.ok(out.indexOf('הליכת דוב') !== -1, 'second wish rendered');
  assert.ok(out.indexOf('נקלט מאימון מודבק') !== -1, 'the reason is shown');
  assert.ok(out.indexOf('data-wish-del="מתח אוסטרלי"') !== -1, 'each wish has a «מחק» button');
  assert.ok(out.indexOf('data-wish-fill="מתח אוסטרלי"') !== -1, 'each wish has an «הוסף סרטון» button');
});

test('an empty list says so instead of leaving the section blank', function () {
  const h = harness([]);
  assert.ok(h.el.wishList.innerHTML.indexOf('אין כרגע תרגילים') !== -1, h.el.wishList.innerHTML);
});

test('a wish whose exercise already has a clip is pruned when the page renders', function () {
  // A clip may have been added (catalog or user) after the paste wrote the
  // wish. The list is pruned with the same matcher the paste uses.
  const h = harness(['סקוואט', 'הליכת דוב']);
  assert.deepEqual(wishNames(), ['הליכת דוב'], 'סקוואט has a clip, so its wish is gone');
  assert.ok(h.el.wishList.innerHTML.indexOf('סקוואט') === -1);
  assert.ok(h.el.wishList.innerHTML.indexOf('הליכת דוב') !== -1);
});

test('saving a clip with the wished name removes the wish and re-renders the list', function () {
  const h = harness(['מתח אוסטרלי', 'הליכת דוב']);
  h.type('url', 'https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz0123456/view');
  h.type('he', 'מתח אוסטרלי');
  h.fire('addForm', 'submit');
  assert.equal(TH.userCatalogList().length, 1, 'entry saved: ' + h.el.addStatus.textContent);
  assert.deepEqual(wishNames(), ['הליכת דוב']);
  assert.ok(h.el.wishList.innerHTML.indexOf('מתח אוסטרלי') === -1, 'saved wish left the list');
  assert.ok(h.el.wishList.innerHTML.indexOf('הליכת דוב') !== -1, 'the other wish stays');
});

test('«מחק» drops one wish by hand', function () {
  const h = harness(['מתח אוסטרלי', 'הליכת דוב']);
  h.clickWish('data-wish-del', 'הליכת דוב');
  assert.deepEqual(wishNames(), ['מתח אוסטרלי']);
  assert.ok(h.el.wishList.innerHTML.indexOf('הליכת דוב') === -1);
  h.clickWish('data-wish-del', 'מתח אוסטרלי');
  assert.deepEqual(wishNames(), []);
  assert.ok(h.el.wishList.innerHTML.indexOf('אין כרגע תרגילים') !== -1);
});

test('«הוסף סרטון» fills the name field so the trainer only pastes the link', function () {
  const h = harness(['הליכת דוב']);
  h.clickWish('data-wish-fill', 'הליכת דוב');
  assert.equal(h.el.he.value, 'הליכת דוב');
  assert.ok(h.el.addStatus.textContent.indexOf('הליכת דוב') !== -1);
  assert.deepEqual(wishNames(), ['הליכת דוב'], 'filling the form does not remove the wish yet');
});

test('ingest: wishlistRemove and wishlistPrune', function () {
  Object.keys(mem).forEach(function (k) { delete mem[k]; });
  TH.setCatalog(CATALOG);
  THIngest.wishlistAdd('פלאנק צידי', 'x');
  THIngest.wishlistAdd('הליכת דוב', 'x');
  THIngest.wishlistAdd('פלאנק', 'x');
  assert.deepEqual(THIngest.wishlistRemove('הליכת  דוב').map(function (w) { return w.he; }), ['פלאנק צידי', 'פלאנק'],
    'remove matches the normalized name');
  const kept = THIngest.wishlistPrune();
  assert.deepEqual(kept.map(function (w) { return w.he; }), [], 'both match the פלאנק clip the way a paste would');
  assert.deepEqual(wishNames(), []);
});
