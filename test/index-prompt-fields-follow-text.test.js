'use strict';

// Regression: run() on index.html reads the duration and the head count from
// the «זמן (דקות)» / «כמות חניכים» fields only, and nothing copied them from
// the typed text. «אימון רגליים 45 דקות ל-12 חניכים» therefore built a
// 20-minute session for one trainee, titled «· 20 דקות». The fields now follow
// the text as it is typed when it names a length or a head count; a field the
// text does not name keeps the coach's value.

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


function type(p, text) {
  p.$('prompt').value = text;
  p.$('prompt').fire('input');
}

test('a typed length and head count reach the built session', function () {
  const p = loadPage();
  type(p, 'אימון רגליים 45 דקות ל-12 חניכים');
  assert.equal(String(p.$('durationInput').value), '45');
  assert.equal(String(p.$('participantsInput').value), '12');
  p.$('form').fire('submit');
  const html = p.$('result').innerHTML;
  assert.match(html, /45 דקות/);
  assert.doesNotMatch(html, /20 דקות/);
  assert.match(html, /חניכים: 12/);
});

test('hours in the text set the minutes field', function () {
  const p = loadPage();
  type(p, 'אימון כוח של שעה וחצי');
  assert.equal(String(p.$('durationInput').value), '90');
  assert.equal(String(p.$('participantsInput').value), '1');
});

test('a length past the field limit is capped like a typed field value', function () {
  const p = loadPage();
  type(p, 'אימון של 4 שעות ל-900 חניכים');
  assert.equal(String(p.$('durationInput').value), '180');
  assert.equal(String(p.$('participantsInput').value), '500');
});

test('a field the text does not name keeps the coach\'s value', function () {
  const p = loadPage();
  p.$('durationInput').value = '35';
  p.$('participantsInput').value = '8';
  type(p, 'אימון בטן למתחילים');
  assert.equal(String(p.$('durationInput').value), '35');
  assert.equal(String(p.$('participantsInput').value), '8');
  type(p, 'אימון בטן ל-10 חניכים');
  assert.equal(String(p.$('durationInput').value), '35');
  assert.equal(String(p.$('participantsInput').value), '10');
  // A hand edit after typing still wins on submit.
  p.$('durationInput').value = '25';
  p.$('form').fire('submit');
  assert.match(p.$('result').innerHTML, /25 דקות/);
});

test('the example buttons are unchanged', function () {
  const p = loadPage();
  type(p, 'אימון תחנות 45 דקות ל-18 חניכים');
  p.click('כוח גב 30 דקות');
  assert.equal(String(p.$('durationInput').value), '30');
  assert.equal(String(p.$('participantsInput').value), '1');
});
