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
// Two playable rows repeat another row's name and video file, so the number of
// distinct clips a trainer gets is smaller than the number of playable rows.
const distinctClips = new Set(rows.filter(function (e) { return e.available !== false; })
  .map(function (e) { return e.file; })).size;

test('catalog numbers the sales pages rely on', function () {
  assert.equal(playable, 70);
  assert.equal(unavailable, 8);
  assert.equal(distinctClips, 68);
});

test('offer and pitch count distinct clips, not rows that repeat the same video', function () {
  for (const name of ['offer.html', 'pitch.html']) {
    const html = read(name);
    assert.doesNotMatch(html, new RegExp(playable + ' קליפ'), name + ' counts a repeated clip twice');
    assert.match(html, new RegExp(distinctClips + ' קליפ'), name + ' must state the distinct clip count');
  }
});

test('offer and pitch do not sell unavailable rows as clips connected to the builder', function () {
  const offer = read('offer.html');
  const pitch = read('pitch.html');
  for (const [name, html] of [['offer', offer], ['pitch', pitch]]) {
    assert.doesNotMatch(html, new RegExp(rows.length + ' קליפ'), name + ' claims every catalog row is a clip');
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
