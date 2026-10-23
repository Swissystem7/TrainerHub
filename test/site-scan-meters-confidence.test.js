'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const TH = require('../js/core.js');
const B = require('../js/booklet.js');
const SP = require('../js/site-profile.js');
const Plan = require('../js/site-plan.js');

const html = fs.readFileSync(path.join(__dirname, '..', 'site-scan.html'), 'utf8');

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
    fire: function (type) { const el = this; (handlers[type] || []).forEach(function (fn) { fn.call(el, { target: el }); }); }
  };
}

function mount() {
  const elements = {};
  const document = {
    getElementById: function (id) { return elements[id] || (elements[id] = makeElement(id)); },
    createElement: function () { return {}; },
    activeElement: null
  };
  const pending = [];
  const win = {
    TH_SITE_SCAN_ENDPOINT: 'https://example.invalid/scan',
    THSiteScan: {
      resizeImage: function (f) { return Promise.resolve(f); },
      analyzeSitePhotos: function () { return new Promise(function (resolve) { pending.push(resolve); }); }
    }
  };
  const url = { createObjectURL: function () { return 'blob:x'; }, revokeObjectURL: function () {} };
  const booklet = Object.assign({}, B, { load: function () {} });
  const run = new Function('document', 'window', 'URL', 'TH', 'THBooklet', 'THSiteProfile', 'THSitePlan', 'location', inlineScript());
  run(document, win, url, TH, booklet, SP, Plan, {});
  const $ = document.getElementById;
  return {
    $: $,
    scan: async function (profile) {
      $('photos').files = [{ name: 'a.jpg' }];
      $('photos').fire('change');
      await new Promise(function (r) { setImmediate(r); });
      pending[pending.length - 1]({ ok: true, profile: profile });
      await new Promise(function (r) { setImmediate(r); });
    },
    typeMeters: function (v) { $('meters').value = v; $('meters').fire('input'); },
    unsure: function () {
      return ($('chipsOut').innerHTML.match(/class="unsure"[^>]*>[^<]*/g) || []).map(function (s) { return s.replace(/^.*>/, ''); });
    }
  };
}

function aiProfile() {
  return SP.normalize({
    width: 'narrow', surface: 'sand', features: ['bench'], hazards: ['cars'],
    confidence: { width: 0.4, surface: 0.5, bench: 0.3, cars: 0.55 }
  }, 'ai');
}

test('typing meters keeps the «זיהוי לא בטוח» marks on surface, features and hazards', async function () {
  const page = mount();
  await page.scan(aiProfile());
  const before = page.unsure();
  assert.ok(before.length >= 4, 'AI marks shown: ' + before.join(', '));

  page.typeMeters('12');
  const after = page.unsure();
  assert.equal(after.length, before.length - 1, 'only the width mark goes: ' + after.join(', '));
  assert.ok(!/class="unsure"[^>]*data-kind="width"|data-kind="width"[^>]*class="unsure"/.test(page.$('chipsOut').innerHTML), 'width no longer unsure');
});

test('typed meters still drop the width mark and pick the width chip', async function () {
  const page = mount();
  await page.scan(aiProfile());
  page.typeMeters('12');
  assert.match(page.$('chipsOut').innerHTML, /data-kind="width" data-id="medium" aria-pressed="true"/);
  assert.match(page.$('summary').textContent, /^סימנתם: /);
});
