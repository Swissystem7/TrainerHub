'use strict';

// The two sales pages (offer.html, pitch.html) must state the clip count a
// paying trainer actually gets: rows that are available and play, not every
// catalog row. Unavailable rows are excluded from the builder, and no video
// file lives in the repo (they are GitHub Releases assets).

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

const catalog = JSON.parse(read('js/catalog.json'));
const rows = Object.values(catalog);
const playable = rows.filter(function (e) { return e.available !== false; }).length;
const unavailable = rows.length - playable;

test('catalog numbers the sales pages rely on', function () {
  assert.equal(playable, 70);
  assert.equal(unavailable, 8);
});

test('offer and pitch do not sell unavailable rows as clips connected to the builder', function () {
  const offer = read('offer.html');
  const pitch = read('pitch.html');
  for (const [name, html] of [['offer', offer], ['pitch', pitch]]) {
    assert.doesNotMatch(html, new RegExp(rows.length + ' קליפ'), name + ' claims every catalog row is a clip');
    assert.match(html, new RegExp(playable + ' קליפ'), name + ' must state the playable clip count');
  }
  assert.match(offer, new RegExp(unavailable + ' רשומות'), 'offer must say how many rows have no video');
});

test('offer does not claim videos are local repo files', function () {
  const offer = read('offer.html');
  assert.doesNotMatch(offer, /מקבצי הריפו|עם קובץ מקומי/);
  assert.match(offer, /GitHub Releases/);
  assert.match(offer, /stats\.playable/);
  assert.doesNotMatch(offer, /stats\.withFile/);
});
