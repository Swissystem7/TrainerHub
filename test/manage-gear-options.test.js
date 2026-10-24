'use strict';

// manage.html: the page proposes equipment from the clip's Hebrew name and
// writes it into select#equipment. The select offered only eight values, while
// THInfer.inferEquipment also returns dumbbells, kettlebell, barbell, machine,
// sports balls and hoop. A browser select set to a value it has no option for
// reads back '', and the submit handler saved that as ['none']: «סקוואט עם
// משקולות» or «לחיצת חזה במכונה» went into the catalog as «משקל גוף» and was
// served in no-equipment workouts.

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
const inferSrc = fs.readFileSync(path.join(root, 'js', 'infer.js'), 'utf8');
const TH = require('../js/core.js');
const THInfer = require('../js/infer.js');

function inlineScript() {
  const start = html.lastIndexOf('<script>');
  const end = html.indexOf('</script>', start);
  return html.slice(start + '<script>'.length, end);
}

function selectOptions(id) {
  const m = html.match(new RegExp('<select id="' + id + '"[^>]*>([\\s\\S]*?)</select>'));
  assert.ok(m, 'select#' + id + ' exists');
  const values = [];
  m[1].replace(/<option value="([^"]+)"/g, function (_, v) { values.push(v); return _; });
  return values;
}

// Like a browser: an unknown value deselects everything and reads back ''.
function makeSelect(id, multiple) {
  const options = selectOptions(id).map(function (v, i) { return { value: v, selected: !multiple && i === 0 }; });
  const el = { id: id, options: options, handlers: {}, addEventListener: function (ev, fn) { (this.handlers[ev] = this.handlers[ev] || []).push(fn); } };
  if (!multiple) {
    Object.defineProperty(el, 'value', {
      get: function () { const hit = options.filter(function (o) { return o.selected; })[0]; return hit ? hit.value : ''; },
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
  function fire(id, ev) {
    (elements[id].handlers[ev] || []).forEach(function (fn) { fn({ preventDefault: function () {}, target: elements[id] }); });
  }
  function type(id, text) {
    elements[id].value = text;
    fire(id, 'input');
  }
  return { el: elements, fire: fire, type: type };
}

const DRIVE = 'https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz0123456/view';

test('select#equipment has an option for every id the proposal can return', function () {
  const body = inferSrc.slice(inferSrc.indexOf('function inferEquipment'));
  const ids = {};
  body.slice(0, body.indexOf('\n  }\n')).replace(/eq\.push\('([^']+)'\)/g, function (_, id) { ids[id] = true; return _; });
  ids.none = true;
  const options = selectOptions('equipment');
  Object.keys(ids).forEach(function (id) {
    assert.ok(options.indexOf(id) !== -1, 'option for ' + id);
    assert.notEqual(TH.eqLabel(id), id, 'Hebrew label for ' + id);
  });
});

[
  ['סקוואט עם משקולות', 'dumbbells'],
  ['סווינג קטלבל', 'kettlebell'],
  ['לחיצת חזה במכונה', 'machine'],
  ['מסירות כדורסל', 'basketball']
].forEach(function (pair) {
  test('«' + pair[0] + '» is saved with ' + pair[1] + ', not as bodyweight', function () {
    const h = harness();
    h.type('url', DRIVE);
    h.type('he', pair[0]);
    assert.equal(h.el.equipment.value, pair[1]);
    h.fire('addForm', 'submit');
    const saved = TH.userCatalogList();
    assert.equal(saved.length, 1, h.el.addStatus.textContent);
    assert.deepEqual(saved[0].equipment, [pair[1]]);
  });
});
