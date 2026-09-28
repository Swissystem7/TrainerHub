'use strict';

// Buyer-facing pages (offer.html, pitch.html) must not send a trainer to
// MONETIZATION.md: that page is served on GitHub Pages and is a research doc,
// not a buyer page (it no longer prints the paid access code either). The price
// comparison on those pages must also show the free and cheap 2026
// alternatives, not only CRMs priced above ₪59.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const TH = require('../js/core.js');
const Code = require('./helpers/access-code.js');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

test('MONETIZATION.md explains the access code without printing it', function () {
  const doc = read('MONETIZATION.md');
  assert.doesNotMatch(doc, /TH-MAAMEN-59/);
  for (const token of doc.match(/TH-[A-Z0-9]+-\d+/gi) || []) {
    assert.notEqual(TH.hashAccessCode(token), Code.realAccessHash());
  }
  assert.match(doc, /קוד הגישה/);
});

test('offer and pitch do not link or point buyers to MONETIZATION.md', function () {
  assert.doesNotMatch(read('offer.html'), /MONETIZATION/);
  assert.doesNotMatch(read('pitch.html'), /MONETIZATION/);
});

test('offer compares against the free and cheap alternatives, dated', function () {
  const offer = read('offer.html');
  assert.match(offer, /BaseCRM/);
  assert.match(offer, /NutriCal/);
  assert.match(offer, /Everfit/);
  assert.match(offer, /נבדק 28\.9\.2026/);
});

test('pitch no longer claims to be under the market price floor', function () {
  const pitch = read('pitch.html');
  assert.doesNotMatch(pitch, /מתחת לרצפה/);
  assert.match(pitch, /BaseCRM/);
});
