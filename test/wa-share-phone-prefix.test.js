'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const TH = require('../js/core.js');

const msg = 'סיימתי אימון';
const want = 'https://wa.me/972501234567?text=' + encodeURIComponent(msg);

test('waShareUrl drops the trunk 0 kept after +972', function () {
  assert.equal(TH.waShareUrl('+972-050-1234567', msg), want);
  assert.equal(TH.waShareUrl('9720501234567', msg), want);
});

test('waShareUrl reads the 00 international prefix', function () {
  assert.equal(TH.waShareUrl('00972501234567', msg), want);
  assert.equal(TH.waShareUrl('00972 050 123 4567', msg), want);
});

test('waShareUrl still takes local and international forms', function () {
  assert.equal(TH.waShareUrl('050-1234567', msg), want);
  assert.equal(TH.waShareUrl('+972 50 123 4567', msg), want);
  assert.equal(TH.waShareUrl('', msg), 'https://wa.me/?text=' + encodeURIComponent(msg));
});
