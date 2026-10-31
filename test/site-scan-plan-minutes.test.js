'use strict';

// The site-scan plan printed every duration in seconds, so a wide site read
// «חלק א' – מרוץ שליחים — 1200 שנ׳» and «תופסת עכברים — 300 שנ׳», and it never
// showed the rest between sets. Whole minutes now read «20 דק׳» / «5 דק׳» like
// the booklet preview, «40 שנ׳» stays, and the rest is listed.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const TH = require('../js/core.js');
const B = require('../js/booklet.js');
const SP = require('../js/site-profile.js');
const Plan = require('../js/site-plan.js');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'site-scan.html'), 'utf8');
B.setData(JSON.parse(fs.readFileSync(path.join(root, B.MAIN_PATH), 'utf8')), null);

function inlineScript() {
  const start = html.lastIndexOf('<script>');
  return html.slice(start + '<script>'.length, html.indexOf('</script>', start));
}

function makeElement(id) {
  const handlers = {};
  return {
    id: id,
    value: id === 'group' ? '12' : (id === 'season' ? 'summer' : ''),
    textContent: '',
    innerHTML: '',
    hidden: false,
    files: [],
    dataset: {},
    appendChild: function () {},
    scrollIntoView: function () {},
    addEventListener: function (type, fn) { (handlers[type] = handlers[type] || []).push(fn); },
    fire: function (type, event) { const el = this; (handlers[type] || []).forEach(function (fn) { fn.call(el, event || { target: el }); }); }
  };
}

/** Mounts the page, taps the given chips and presses «בנה אימון לשטח». */
function planFor(chips) {
  const elements = {};
  const document = {
    getElementById: function (id) { return elements[id] || (elements[id] = makeElement(id)); },
    createElement: function () { return {}; },
    activeElement: null
  };
  const booklet = Object.assign({}, B, { load: function () {} });
  const run = new Function('document', 'window', 'URL', 'TH', 'THBooklet', 'THSiteProfile', 'THSitePlan', 'location', inlineScript());
  run(document, {}, {}, TH, booklet, SP, Plan, {});
  const $ = document.getElementById;
  chips.forEach(function (c) {
    const button = { dataset: { kind: c[0], id: c[1] } };
    $('chipsOut').fire('click', { target: { closest: function () { return button; } } });
  });
  $('build').fire('click');
  return $('planOut').innerHTML;
}

function rowOf(out, name) {
  const at = out.indexOf(name);
  assert.ok(at !== -1, 'plan lists ' + name);
  return out.slice(at, out.indexOf('</li>', at));
}

test('a wide site: the 20-minute relay reads «20 דק׳» and the tag game «5 דק׳»', function () {
  const out = planFor([['width', 'wide']]);
  assert.doesNotMatch(out, /1200 שנ׳|300 שנ׳/);
  assert.match(rowOf(out, 'מרוץ שליחים'), /— 20 דק׳/);
  assert.match(rowOf(out, '<strong>תופסת'), /— 5 דק׳/);
});

test('a one-minute warm-up drill reads «1 דק׳»', function () {
  assert.match(rowOf(planFor([['width', 'wide']]), 'ריצה לפנים תוך סיבובי ידיים לפנים'), /— 1 דק׳/);
});

test('stations under a minute stay in seconds and list their rest', function () {
  const out = planFor([['width', 'wide'], ['features', 'stairs']]);
  assert.match(rowOf(out, 'סקווט קפיצה'), /— 2 סבבים · 40 שנ׳ · מנוחה 20 שנ׳/);
  assert.match(rowOf(out, 'עליות מדרגות בריצה קלה'), /— 3 סבבים · 40 שנ׳ · מנוחה 45 שנ׳/);
});

test('a reps drill without rest shows only its reps', function () {
  assert.match(rowOf(planFor([['width', 'narrow']]), 'סקוואטים'), /<\/strong> — 15 חזרות<div/);
});
