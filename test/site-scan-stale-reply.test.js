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
    fire: function (type) { const el = this; (handlers[type] || []).forEach(function (fn) { fn.call(el, { target: el }); }); },
    click: function () { this.fire('click'); }
  };
}

function aiProfile() {
  const p = SP.normalize({ surface: 'sand', features: ['bench'] }, 'ai');
  p.confidence = { surface: 0.9 };
  return p;
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
    pending: pending,
    pick: function () { $('photos').files = [{ name: 'a.jpg' }]; $('photos').fire('change'); },
    flush: function () { return new Promise(function (r) { setImmediate(r); }); }
  };
}

test('a scan reply that lands after «נקה והתחל מחדש» does not refill the cleared profile', async function () {
  const page = mount();
  page.pick();
  await page.flush();
  assert.equal(page.pending.length, 1, 'scan request sent');

  page.$('reset').click();
  const cleared = page.$('chipsOut').innerHTML;
  page.pending[0]({ ok: true, profile: aiProfile() });
  await page.flush();

  assert.equal(page.$('chipsOut').innerHTML, cleared, 'chips stay cleared');
  assert.doesNotMatch(page.$('summary').textContent, /זיהוי אוטומטי/);
  assert.equal(page.$('scanStatus').textContent, 'אפשר גם לדלג על הצילום ולסמן בעצמכם מה יש בשטח.');
});

test('an older scan reply does not overwrite the reply for newer photos', async function () {
  const page = mount();
  page.pick();
  await page.flush();
  page.pick();
  await page.flush();
  assert.equal(page.pending.length, 2);

  page.pending[1]({ ok: false });
  await page.flush();
  const status = page.$('scanStatus').textContent;
  page.pending[0]({ ok: true, profile: aiProfile() });
  await page.flush();

  assert.equal(page.$('scanStatus').textContent, status);
  assert.doesNotMatch(page.$('summary').textContent, /זיהוי אוטומטי/);
});

test('the current scan reply still fills the chips', async function () {
  const page = mount();
  page.pick();
  await page.flush();
  page.pending[0]({ ok: true, profile: aiProfile() });
  await page.flush();
  assert.match(page.$('summary').textContent, /^זיהוי אוטומטי: /);
  assert.equal(page.$('scanStatus').textContent, 'זה מה שזיהיתי. בדקו ותקנו לפני הבנייה.');
});
