'use strict';

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
  href: 'https://swissystem7.github.io/TrainerHub/index.html',
  pathname: '/TrainerHub/index.html',
  hash: ''
};

const TH = require('../js/core.js');
const P = require('../js/pilot.js');
const UI = require('../js/pilot-feedback.js');

function reset() {
  Object.keys(mem).forEach(function (k) { delete mem[k]; });
  TH.clearEntitlement();
}

// Fake element: just enough of the DOM for the mount functions.
function el(attrs) {
  const node = Object.assign({ value: '', textContent: '', hidden: false, attrs: {}, handlers: {} }, attrs || {});
  node.getAttribute = function (k) { return Object.prototype.hasOwnProperty.call(node.attrs, k) ? node.attrs[k] : null; };
  node.setAttribute = function (k, v) { node.attrs[k] = String(v); };
  node.addEventListener = function (type, fn) { node.handlers[type] = fn; };
  node.fire = function (type) { node.handlers[type]({ preventDefault: function () {} }); };
  return node;
}

function fakeCard() {
  const ratings = [1, 2, 3, 4, 5].map(function (n) { return el({ attrs: { 'data-pf-rating': String(n) } }); });
  const parts = {
    '.pf-status': el(), '#pfWorked': el(), '#pfImprove': el(),
    '[data-pf-save]': el(), '[data-pf-wa]': el(), '[data-pf-export]': el()
  };
  const box = el();
  box.querySelector = function (sel) { return parts[sel] || null; };
  box.querySelectorAll = function (sel) { return sel === '[data-pf-rating]' ? ratings : []; };
  return { box: box, parts: parts, ratings: ratings };
}

function fakeCodeForm() {
  const form = el();
  const fparts = { label: el(), input: el(), button: el() };
  form.querySelector = function (sel) { return fparts[sel]; };
  const status = el();
  const box = el();
  box.querySelector = function (sel) { return sel === 'form' ? form : sel === '.pf-status' ? status : null; };
  return { box: box, form: form, input: fparts.input, status: status };
}

test('feedback card stays hidden when pilot mode is off', function () {
  reset();
  const c = fakeCard();
  assert.equal(UI.mountFeedback(c.box, { pilot: P }), null);
  assert.equal(c.box.innerHTML, undefined);
});

test('feedback card saves a cleaned record on the device', function () {
  reset();
  P.init('?pilot=acharai', TH);
  const c = fakeCard();
  const state = UI.mountFeedback(c.box, { pilot: P, session: 'אימון בפארק' });
  assert.ok(state);
  assert.match(c.box.innerHTML, /משוב פיילוט אחריי/);
  c.ratings[3].fire('click');
  assert.equal(state.rating, 4);
  assert.equal(c.ratings[3].getAttribute('aria-pressed'), 'true');
  assert.equal(c.ratings[0].getAttribute('aria-pressed'), 'false');
  c.parts['#pfWorked'].value = 'המדרגות עבדו <b>מעולה</b> 050-1234567';
  c.parts['[data-pf-save]'].fire('click');
  const list = P.listFeedback();
  assert.equal(list.length, 1);
  assert.equal(list[0].rating, 4);
  assert.equal(list[0].session, 'אימון בפארק');
  assert.doesNotMatch(list[0].worked, /<b>|1234567/);
  assert.match(c.parts['.pf-status'].textContent, /נשמר/);
});

test('empty feedback is not saved or sent', function () {
  reset();
  P.init('?pilot=acharai', TH);
  const c = fakeCard();
  const opened = [];
  UI.mountFeedback(c.box, { pilot: P, open: function (u) { opened.push(u); } });
  c.parts['[data-pf-save]'].fire('click');
  c.parts['[data-pf-wa]'].fire('click');
  assert.equal(P.listFeedback().length, 0);
  assert.equal(opened.length, 0);
  assert.match(c.parts['.pf-status'].textContent, /ריק/);
});

test('WhatsApp and JSON export go through THPilot', function () {
  reset();
  P.init('?pilot=acharai', TH);
  const c = fakeCard();
  const opened = [];
  let exported = '';
  UI.mountFeedback(c.box, {
    pilot: P, phone: '0501234567',
    open: function (u) { opened.push(u); },
    download: function (j) { exported = j; }
  });
  c.ratings[4].fire('click');
  c.parts['#pfImprove'].value = 'יותר משחקים';
  c.parts['[data-pf-wa]'].fire('click');
  assert.equal(opened.length, 1);
  assert.match(opened[0], /^https:\/\/wa\.me\/972501234567\?text=/);
  assert.match(decodeURIComponent(opened[0]), /יותר משחקים/);
  c.parts['[data-pf-save]'].fire('click');
  c.parts['[data-pf-export]'].fire('click');
  assert.equal(JSON.parse(exported).feedback.length, 1);
});

test('pilot code form unlocks with the Acharai code and rejects others', function () {
  reset();
  const f = fakeCodeForm();
  assert.equal(UI.mountCode(f.box, { pilot: P, TH: TH }), true);
  f.input.value = 'סתם';
  f.form.fire('submit');
  assert.equal(P.isActive(), false);
  assert.match(f.status.textContent, /לא מוכר/);
  f.input.value = 'אחריי';
  f.form.fire('submit');
  assert.equal(P.isActive(), true);
  assert.equal(TH.entitlement().brand, 'אחריי!');
  assert.match(f.status.textContent, /פיילוט פעיל/);
  assert.equal(f.input.hidden, true);
});

test('pages load the pilot scripts after core.js and mount the UI', function () {
  const root = path.join(__dirname, '..');
  const wm = fs.readFileSync(path.join(root, 'frontend', 'workout-mode.html'), 'utf8');
  assert.ok(wm.indexOf('js/core.js') < wm.indexOf('js/pilot.js'));
  assert.ok(wm.indexOf('js/pilot.js') < wm.indexOf('js/pilot-feedback.js'));
  assert.match(wm, /id="pilotFeedback"/);
  assert.match(wm, /THPilotFeedback\.mountFeedback/);
  const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.ok(index.indexOf('js/pilot.js') < index.indexOf('js/pilot-feedback.js'));
  assert.match(index, /id="pilotCode"/);
  assert.match(index, /THPilotFeedback\.mountCode/);
});

test('static HTML has no user-data placeholders and 44px touch targets', function () {
  assert.doesNotMatch(UI.CARD_HTML + UI.CODE_HTML, /\$\{|undefined/);
  assert.match(UI.CARD_HTML, /min-height:44px/);
  assert.match(UI.CODE_HTML, /min-height:44px/);
});
