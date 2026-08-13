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

const workout = {
  title: 'אימון ליבה',
  phases: [
    { name: 'Warm-up', exercises: [{ name: 'חימום', sets: 1, duration_seconds: 60 }] },
    { name: 'Main', exercises: [{ id: 'plank', name: 'פלאנק', sets: 3, reps: 10, rest_seconds: 45 }] }
  ]
};

function reset() {
  Object.keys(mem).forEach(function (k) { delete mem[k]; });
  TH.clearEntitlement();
}

test('free tier cannot share a client workout link', function () {
  reset();
  const shared = TH.shareToClient(workout, {});
  assert.equal(shared.ok, false);
  assert.equal(shared.gated, true);
  assert.equal(shared.code, 'share_requires_trainer');
  assert.match(shared.offerUrl, /offer\.html$/);
});

test('trainer tier can share and the url has no filename', function () {
  reset();
  TH.setEntitlement({ tier: 'trainer', brand: 'סטודיו בדיקה' });
  const shared = TH.shareToClient(workout, { name: 'מתאמן' });
  assert.equal(shared.ok, true);
  assert.match(shared.url, /#TH\./);
  assert.equal(/\.mp4/i.test(shared.url), false);
});

test('redeemAccessCode accepts only the real hash and is not a payment', function () {
  reset();
  const bad = TH.redeemAccessCode('wrong-code', 'מותג');
  assert.equal(bad.ok, false);
  assert.match(bad.error, /אין סליקה/);
  assert.equal(TH.entitlement().canShare, false);

  const good = TH.redeemAccessCode('TH-MAAMEN-59', 'סטודיו בדיקה');
  assert.equal(good.ok, true);
  assert.equal(TH.entitlement().tier, 'trainer');
  assert.equal(TH.entitlement().brand, 'סטודיו בדיקה');
  assert.equal(TH.entitlement().canBrandedPdf, true);
});

test('sanitizeBrand strips markup and filenames', function () {
  assert.equal(TH.sanitizeBrand('  <b>עמית</b>.mp4  '), 'עמית');
  assert.ok(TH.sanitizeBrand('א'.repeat(80)).length <= 60);
});

test('free print model is watermarked; trainer brand appears only when entitled', function () {
  reset();
  const free = TH.workoutPrintModel(workout, { brand: 'סטודיו גנוב' });
  assert.equal(free.branded, false);
  assert.equal(free.brand, '');
  assert.match(free.footer, /לא מיועדת למסירה/);
  const htmlFree = TH.workoutPrintHtml(free);
  assert.match(htmlFree, /תרגול — לא למסירה ללקוח/);
  assert.doesNotMatch(htmlFree, /סטודיו גנוב/);
  assert.doesNotMatch(htmlFree, /\.mp4/i);
  assert.match(htmlFree, /פלאנק/);

  TH.setEntitlement({ tier: 'trainer', brand: 'סטודיו בדיקה' });
  const paid = TH.workoutPrintModel(workout, { brand: 'סטודיו בדיקה' });
  assert.equal(paid.branded, true);
  assert.equal(paid.brand, 'סטודיו בדיקה');
  const htmlPaid = TH.workoutPrintHtml(paid);
  assert.match(htmlPaid, /סטודיו בדיקה/);
  assert.doesNotMatch(htmlPaid, /תרגול — לא למסירה ללקוח/);
  assert.doesNotMatch(htmlPaid, /aviran|swissa|אבירן/i);
});

test('gate markup is Hebrew and points at the offer page', function () {
  const html = TH.gateMarkup('share');
  assert.match(html, /שיתוף אימון ללקוח/);
  assert.match(html, /₪59/);
  assert.match(html, /אין סליקה/);
  assert.match(html, /offer\.html#share/);
  assert.doesNotMatch(html, /1,?800|כבר \d+ מאמנים|הכי פופולרי/);
});
