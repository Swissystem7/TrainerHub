'use strict';

// Regression: the example buttons on index.html («אימון בטן 20 דקות בלי ציוד»,
// «כוח גב 30 דקות», …) only touched the duration / equipment / participants
// fields when the example text named them, and run() always reads those fields.
// After a group request (18 חניכים, קונוסים) a click on «אימון בטן 20 דקות בלי
// ציוד» therefore built a 5-station group workout for 18, and «כוח גב 30 דקות»
// clicked after «פול בודי עם גומיות» kept the bands. Each example now stands on
// its own: unnamed fields go back to the defaults, and an equipment id the
// select does not offer falls back to «לפי הבקשה» instead of an empty value.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const page = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

const TH = require('../js/core.js');
require('../js/infer.js');
const THAnalyzer = require('../js/analyzer.js');
const THInfer = require('../js/infer.js');
const THPrompt = require('../js/prompt-parser.js');
const THEngine = require('../js/session-builder.js');
const THIngest = require('../js/ingest.js');
TH.setCatalog(JSON.parse(fs.readFileSync(path.join(root, 'js', 'catalog.json'), 'utf8')));

/** The page's own inline script (the last <script> without src). */
function inlineScript() {
  const open = page.lastIndexOf('<script>');
  const close = page.indexOf('</script>', open);
  assert.ok(open >= 0 && close > open, 'index.html has an inline script');
  return page.slice(open + '<script>'.length, close);
}

function selectOptions(id) {
  const m = page.match(new RegExp('<select id="' + id + '"[^>]*>([\\s\\S]*?)</select>'));
  assert.ok(m, 'select ' + id);
  return Array.from(m[1].matchAll(/value="([^"]*)"/g)).map(function (x) { return { value: x[1] }; });
}

function el(id, attrs) {
  const node = {
    id: id,
    attrs: attrs || {},
    value: '',
    textContent: '',
    innerHTML: '',
    hidden: false,
    tabIndex: 0,
    listeners: {},
    addEventListener: function (type, fn) { (this.listeners[type] = this.listeners[type] || []).push(fn); },
    getAttribute: function (n) { return this.attrs[n] == null ? null : this.attrs[n]; },
    setAttribute: function (n, v) { this.attrs[n] = String(v); },
    removeAttribute: function (n) { delete this.attrs[n]; },
    focus: function () {},
    insertAdjacentHTML: function (where, html) { this.innerHTML += html; },
    querySelector: function () { return null; },
    querySelectorAll: function () { return []; }
  };
  node.parentNode = { parentNode: { querySelector: function () { return null; } }, insertAdjacentHTML: function () {} };
  node.fire = function (type) { (this.listeners[type] || []).forEach(function (fn) { fn({ preventDefault: function () {} }); }); };
  node.click = function () { this.fire('click'); };
  return node;
}

function loadPage(extraExamples) {
  const byId = {};
  const $ = function (id) {
    if (!byId[id]) byId[id] = el(id);
    return byId[id];
  };
  $('durationInput').value = '20';
  $('participantsInput').value = '1';
  $('equipmentInput').value = 'auto';
  $('equipmentInput').options = selectOptions('equipmentInput');
  const examples = Array.from(page.matchAll(/data-fill="([^"]+)"/g)).map(function (m) {
    return el('ex', { 'data-fill': m[1] });
  }).concat((extraExamples || []).map(function (text) { return el('ex', { 'data-fill': text }); }));
  const tabs = ['prompt', 'ingest', 'seg'].map(function (k) { return $('tab-' + k); });
  const document = {
    getElementById: $,
    querySelectorAll: function (sel) {
      if (sel === '[data-fill]') return examples;
      if (sel === '[role="tab"]') return tabs;
      return [];
    }
  };
  const run = new Function('document', 'TH', 'THPrompt', 'THEngine', 'THIngest', 'THInfer', 'THAnalyzer', 'location', inlineScript());
  run(document, TH, THPrompt, THEngine, THIngest, THInfer, THAnalyzer, { href: '' });
  return {
    $: $,
    click: function (text) {
      const btn = examples.filter(function (b) { return b.getAttribute('data-fill') === text; })[0];
      assert.ok(btn, 'example button ' + text);
      btn.click();
    }
  };
}

test('after a group request, «אימון בטן 20 דקות בלי ציוד» builds for one trainee without equipment', function () {
  const p = loadPage();
  // The coach typed a group request first.
  p.$('prompt').value = 'אימון תחנות 45 דקות ל-18 חניכים עם קונוסים';
  p.$('durationInput').value = '45';
  p.$('participantsInput').value = '18';
  p.$('equipmentInput').value = 'cones';
  p.$('form').fire('submit');
  assert.match(p.$('result').innerHTML, /חניכים: 18/);

  p.click('אימון בטן 20 דקות בלי ציוד');
  assert.equal(String(p.$('durationInput').value), '20');
  assert.equal(String(p.$('participantsInput').value), '1');
  assert.equal(p.$('equipmentInput').value, 'none');
  const html = p.$('result').innerHTML;
  assert.match(html, /חניכים: 1<\/span>/);
  assert.doesNotMatch(html, /סידור קבוצה/);
  assert.doesNotMatch(html, /קונוסים/);
});

test('«כוח גב 30 דקות» clicked after the bands example does not keep the bands', function () {
  const p = loadPage();
  p.click('פול בודי עם גומיות, מתחיל');
  assert.equal(p.$('equipmentInput').value, 'band');
  assert.equal(String(p.$('durationInput').value), '20');

  p.click('כוח גב 30 דקות');
  assert.equal(p.$('equipmentInput').value, 'auto');
  assert.equal(String(p.$('durationInput').value), '30');
  assert.equal(String(p.$('participantsInput').value), '1');
  assert.doesNotMatch(p.$('result').innerHTML, /ציוד: גומיות/);
});

test('an example whose equipment the select does not offer leaves the select on «לפי הבקשה»', function () {
  const text = 'אימון ידיים עם משקולות 20 דקות';
  assert.deepEqual(THPrompt.parsePrompt(text).equipment, ['dumbbells']);
  const p = loadPage([text]);
  p.$('equipmentInput').value = 'band';
  p.click(text);
  assert.equal(p.$('equipmentInput').value, 'auto');
  assert.match(p.$('result').innerHTML, /<h2>/, 'the example still builds a workout');
});
