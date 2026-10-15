'use strict';

// manage.html: the trainer pastes a link, the page proposes muscle / equipment
// / level from the Hebrew name («מאשרים או מתקנים»), the trainer corrects the
// selects and presses «אשר ושמור». Before the fix the submit handler called
// propose() again, which wrote the proposal back into the three selects
// before selectedMuscles() read them, so every correction was silently
// replaced by the guess: «הרמת רגליים» saved as core / bodyweight / beginner
// no matter what the trainer picked.

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

function harness() {
  Object.keys(mem).forEach(function (k) { delete mem[k]; });
  TH.setCatalog({});
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
  new Function('document', 'TH', 'THInfer', inlineScript())(document, TH, THInfer);
  function fire(id, ev, arg) {
    (elements[id].handlers[ev] || []).forEach(function (fn) { fn(arg || { preventDefault: function () {}, target: elements[id] }); });
  }
  function selected() {
    return elements.muscles.options.filter(function (o) { return o.selected; }).map(function (o) { return o.value; });
  }
  function pickMuscles(list) {
    elements.muscles.options.forEach(function (o) { o.selected = list.indexOf(o.value) !== -1; });
    fire('muscles', 'change');
  }
  function type(id, text) {
    elements[id].value = text;
    fire(id, 'input');
  }
  return { el: elements, fire: fire, selected: selected, pickMuscles: pickMuscles, type: type };
}

const DRIVE = 'https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz0123456/view';

test('the proposal fills the selects from the name', function () {
  const h = harness();
  h.type('url', DRIVE);
  h.type('he', 'הרמת רגליים בשכיבה');
  assert.deepEqual(h.selected(), THInfer.inferFromName('הרמת רגליים בשכיבה').muscles);
  assert.equal(h.el.equipment.value, 'none');
  assert.equal(h.el.level.value, 'beginner');
});

test('«אשר ושמור» keeps the muscles, equipment and level the trainer corrected', function () {
  const h = harness();
  h.type('url', DRIVE);
  h.type('he', 'הרמת רגליים בשכיבה');
  h.pickMuscles(['core']);
  h.el.equipment.value = 'ball';
  h.fire('equipment', 'change');
  h.el.level.value = 'advanced';
  h.fire('level', 'change');
  h.fire('addForm', 'submit');
  const saved = TH.userCatalogList();
  assert.equal(saved.length, 1, 'one entry saved: ' + h.el.addStatus.textContent);
  assert.deepEqual(saved[0].muscles, ['core']);
  assert.deepEqual(saved[0].equipment, ['ball']);
  assert.equal(saved[0].level, 'advanced');
  assert.equal(saved[0].he, 'הרמת רגליים בשכיבה');
  assert.equal(saved[0].source, 'drive');
});

test('a corrected select survives further typing in the name', function () {
  const h = harness();
  h.type('he', 'הרמת רגליים');
  h.pickMuscles(['core']);
  h.type('he', 'הרמת רגליים בשכיבה');
  assert.deepEqual(h.selected(), ['core']);
  h.fire('addForm', 'submit');
  assert.deepEqual(TH.userCatalogList()[0].muscles, ['core']);
});

test('«הצג הצעה» puts the proposal back on purpose', function () {
  const h = harness();
  h.type('he', 'הרמת רגליים בשכיבה');
  h.pickMuscles(['core']);
  h.el.level.value = 'advanced';
  h.fire('level', 'change');
  h.fire('previewBtn', 'click');
  assert.deepEqual(h.selected(), THInfer.inferFromName('הרמת רגליים בשכיבה').muscles);
  assert.equal(h.el.level.value, 'beginner');
});

test('without a correction the proposal is what gets saved', function () {
  const h = harness();
  h.type('url', DRIVE);
  h.type('he', 'פלאנק צידי');
  h.fire('addForm', 'submit');
  const saved = TH.userCatalogList();
  assert.equal(saved.length, 1);
  assert.deepEqual(saved[0].muscles, THInfer.inferFromName('פלאנק צידי').muscles);
  assert.deepEqual(saved[0].equipment, ['none']);
});

test('the next item after a save gets a fresh proposal again', function () {
  const h = harness();
  h.type('he', 'פלאנק צידי');
  h.pickMuscles(['legs']);
  h.fire('addForm', 'submit');
  assert.deepEqual(TH.userCatalogList()[0].muscles, ['legs']);
  h.type('he', 'שכיבות שמיכה');
  assert.deepEqual(h.selected(), THInfer.inferFromName('שכיבות שמיכה').muscles);
});
