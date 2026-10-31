'use strict';

// manage.html: «אשר ושמור» with a name already saved. The proposed id is
// <source>_<name>, so a second «סקוואט» with another YouTube link got the id
// of the first one and addUserEntry replaced it - the first clip was gone
// while the page said «נשמר». A different video now gets its own id; the same
// video, or a name-only entry, saved again still updates in place.

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

const YT_A = 'https://www.youtube.com/watch?v=AAAAAAAAAAA';
const YT_B = 'https://www.youtube.com/watch?v=BBBBBBBBBBB';
const DRIVE_A = 'https://drive.google.com/file/d/1AbCdEfGhIjKlMnOpQrStUvWxYz0123456/view';
const DRIVE_B = 'https://drive.google.com/file/d/1ZyXwVuTsRqPoNmLkJiHgFeDcBa6543210/view';

function save(h, url, name) {
  h.type('url', url);
  h.type('he', name);
  h.fire('addForm', 'submit');
}

test('a second YouTube clip under the same name keeps the first one', function () {
  const h = harness();
  save(h, YT_A, 'סקוואט');
  save(h, YT_B, 'סקוואט');
  const saved = TH.userCatalogList();
  assert.equal(saved.length, 2, h.el.addStatus.textContent);
  assert.deepEqual(saved.map(function (e) { return e.youtubeId; }), ['AAAAAAAAAAA', 'BBBBBBBBBBB']);
  assert.notEqual(saved[0].id, saved[1].id);
  assert.ok(TH.catalog[saved[0].id] && TH.catalog[saved[1].id]);
});

test('a second Drive file under the same name keeps the first one', function () {
  const h = harness();
  save(h, DRIVE_A, 'פלאנק צידי');
  save(h, DRIVE_B, 'פלאנק צידי');
  assert.equal(TH.userCatalogList().length, 2);
});

test('the same video saved again under the same name still updates in place', function () {
  const h = harness();
  save(h, YT_A, 'סקוואט');
  h.type('url', YT_A);
  h.type('he', 'סקוואט');
  h.pickMuscles(['core']);
  h.fire('addForm', 'submit');
  const saved = TH.userCatalogList();
  assert.equal(saved.length, 1);
  assert.deepEqual(saved[0].muscles, ['core']);
});

test('a name-only entry saved twice is still one entry', function () {
  const h = harness();
  save(h, '', 'כפיפות בטן');
  save(h, '', 'כפיפות בטן');
  assert.equal(TH.userCatalogList().length, 1);
});
