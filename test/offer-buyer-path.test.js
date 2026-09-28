'use strict';

// Buyer-facing pages (offer.html, pitch.html) must not send a trainer to
// MONETIZATION.md: that page is served on GitHub Pages and prints the paid
// access code in plain text. The price comparison on those pages must also
// show the free and cheap 2026 alternatives, not only CRMs priced above ₪59.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

test('the research doc that holds the access code is where the code lives', function () {
  assert.match(read('MONETIZATION.md'), /TH-MAAMEN-59/);
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
