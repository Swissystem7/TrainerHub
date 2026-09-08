'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

test('the only GitHub Actions workflow is the library-gap agent, and it never merges or deploys', function () {
  const dir = path.join(root, '.github', 'workflows');
  assert.deepEqual(fs.readdirSync(dir).sort(), ['library-gap-agent.yml']);
  const wf = read('.github/workflows/library-gap-agent.yml');
  assert.match(wf, /--draft/);
  assert.doesNotMatch(wf, /pr merge|merge --auto|--admin|deploy-pages|pages-build/);
});

test('unused lib/ helpers are not in the live tree', function () {
  assert.equal(fs.existsSync(path.join(root, 'lib')), false);
});

test('catalog keeps its source rows while verified videos live outside Git history', function () {
  const catalog = JSON.parse(read('js/catalog.json'));
  const drive = JSON.parse(read('videos/drive-catalog.json'));
  const mp4s = fs.readdirSync(path.join(root, 'videos')).filter(function (f) {
    return /\.mp4$/i.test(f);
  });
  assert.equal(Object.keys(catalog).length, 78);
  assert.equal(drive.items.length, 44);
  assert.equal(mp4s.length, 0);
  assert.equal(Object.values(catalog).filter(function (entry) { return entry.available !== false; }).length, 70);
  assert.equal(new Set(Object.values(catalog).filter(function (entry) { return entry.available !== false; }).map(function (entry) { return entry.file; })).size, 68);
  assert.match(read('README.md'), /70 רשומות/);
  assert.match(read('README.md'), /68 קובצי OneDrive/);
  assert.match(read('README.md'), /GitHub Releases/);
});

test('live pages do not sell a fake AI marketplace or SaaS login wall', function () {
  const studio = read('frontend/index.html');
  const home = read('index.html');
  const research = read('RESEARCH.md');
  assert.doesNotMatch(studio, /פלטפורמת AI|GitHub למאמנים|בקרוב!|צור חשבון חינם|MKT_WORKOUTS/);
  assert.doesNotMatch(home, /Marketplace|₪49|₪149/);
  assert.doesNotMatch(research, /טאבי Marketplace\/מתאמנים\/תמחור/);
  assert.match(studio, /בלי AI/);
  assert.match(home, /פתח כמתאמן/);
  assert.match(home, /journal\.html/);
});

test('offer and pitch do not deny the local journal while selling CRM', function () {
  const offer = read('offer.html');
  const pitch = read('pitch.html');
  assert.match(offer, /יומן מקומי/);
  assert.match(pitch, /יומן מקומי/);
  assert.doesNotMatch(offer, /אין יומן, כרטיסיות/);
});
