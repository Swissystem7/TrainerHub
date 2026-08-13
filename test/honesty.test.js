'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

test('there is no GitHub Actions workflow directory', function () {
  assert.equal(fs.existsSync(path.join(root, '.github', 'workflows')), false);
});

test('unused lib/ helpers are not in the live tree', function () {
  assert.equal(fs.existsSync(path.join(root, 'lib')), false);
});

test('local catalog is 78 clips; drive catalog is 44; repo ships 7 sample mp4s', function () {
  const catalog = JSON.parse(read('js/catalog.json'));
  const drive = JSON.parse(read('videos/drive-catalog.json'));
  const mp4s = fs.readdirSync(path.join(root, 'videos')).filter(function (f) {
    return /\.mp4$/i.test(f);
  });
  assert.equal(Object.keys(catalog).length, 78);
  assert.equal(drive.items.length, 44);
  assert.equal(mp4s.length, 7);
  assert.match(read('README.md'), /78 קליפ/);
  assert.match(read('README.md'), /7 קבצי mp4/);
  assert.match(read('README.md'), /44 סרטוני הדרייב/);
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
