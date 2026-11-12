'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const reels = JSON.parse(fs.readFileSync(path.join(root, 'data', 'exercises.json'), 'utf8')).exercises;
// Reels that are not an exercise demo (food, motivation, unsorted), plus one
// Instagram no longer serves without a login, keep the muscle icon.
const NO_POSTER = new Set(['השראה', 'לא ממוין']);
const UNREACHABLE = new Set(['Dart5bjomQ5']);

test('every exercise reel has a poster file in assets/posters', function () {
  const missing = [];
  reels.forEach(function (r) {
    const code = (r.source_url.match(/reel\/([^/]+)/) || [])[1];
    if (r.poster) {
      assert.equal(r.poster, 'assets/posters/' + code + '.jpg', r.id);
      assert.ok(fs.existsSync(path.join(root, r.poster)), r.poster);
      return;
    }
    if (NO_POSTER.has(r.muscle_group) || UNREACHABLE.has(code)) return;
    missing.push(r.id);
  });
  assert.deepEqual(missing, []);
  assert.ok(reels.filter(function (r) { return r.poster; }).length >= 82);
});
