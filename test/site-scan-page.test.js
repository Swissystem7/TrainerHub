'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const page = read('site-scan.html');

test('site scan page is Hebrew RTL and labels every field', function () {
  assert.match(page, /lang="he"/);
  assert.match(page, /dir="rtl"/);
  const ids = [...page.matchAll(/<(?:input|select)\b[^>]*\bid="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(ids, ['photos', 'group', 'season']);
  ids.forEach((id) => assert.match(page, new RegExp('for="' + id + '"'), id));
});

test('camera input opens the back camera and takes several photos', function () {
  const input = page.match(/<input id="photos"[^>]*>/)[0];
  assert.match(input, /accept="image\/\*"/);
  assert.match(input, /capture="environment"/);
  assert.match(input, /\bmultiple\b/);
  assert.match(page, /slice\.call\(this\.files \|\| \[\], 0, 3\)/, 'at most 3 photos are sent');
});

test('scripts load the profile, plan and scan modules after core and booklet', function () {
  const srcs = [...page.matchAll(/<script src="\.\/(js\/[^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(srcs, ['js/core.js', 'js/booklet.js', 'js/site-profile.js', 'js/site-plan.js', 'js/site-scan.js']);
  ['js/core.js', 'js/booklet.js', 'js/site-profile.js', 'js/site-plan.js'].forEach((rel) => {
    assert.ok(fs.existsSync(path.join(root, rel)), rel);
  });
});

test('works without AI: no endpoint or no scan module falls back to the checklist', function () {
  assert.match(page, /if \(!Scan \|\| !\(window\.TH_SITE_SCAN_ENDPOINT\)\)/);
  assert.match(page, /var profile = SP\.emptyProfile\(\)/);
  assert.match(page, /renderChips\(\);\s*THBooklet\.load\(\);/, 'the checklist renders before any scan');
});

test('the coach corrects every chip before building', function () {
  assert.match(page, /SP\.chips\(profile\)/);
  assert.match(page, /profile = SP\.toggle\(profile, b\.dataset\.kind, b\.dataset\.id\)/);
  assert.match(page, /aria-pressed=/);
  assert.match(page, /class="unsure"/, 'low-confidence AI chips are marked');
});

test('build shows warnings, one reason line per choice, and opens workout mode', function () {
  assert.match(page, /THSitePlan\.build\(profile, \{ group: \$\('group'\)\.value, season: \$\('season'\)\.value \}\)/);
  assert.match(page, /res\.warnings\.map/);
  assert.match(page, /res\.reasons\.map/);
  assert.match(page, /TH\.store\.set\(TH\.KEYS\.active, current\)/);
});

test('page output is escaped', function () {
  const inner = page.split('\n').filter((l) => /\+ (c\.he|g\.he|w|r|x\.name|x\.notes|current\.title)\b/.test(l));
  inner.forEach((l) => assert.doesNotMatch(l, /\+ (c\.he|g\.he|w|r|x\.name|x\.notes|current\.title) \+/, l.trim()));
});

test('the builder and the booklet link to the site scan', function () {
  assert.match(read('index.html'), /href="\.\/site-scan\.html">📷 סרוק את השטח</);
  assert.match(read('booklet.html'), /href="\.\/site-scan\.html"/);
});

test('site scan page declares an inline icon, so it loads without a favicon 404', function () {
  assert.match(page, /<link rel="icon" href="data:,">/);
});
