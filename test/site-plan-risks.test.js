'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const B = require('../js/booklet.js');
const Plan = require('../js/site-plan.js');
const root = path.join(__dirname, '..');
const read = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
B.setData(null, read(B.TEAM_PATH));

test('score is likelihood × severity from the team-file table, sorted high to low', function () {
  const rows = Plan.risks({ hazards: ['cars'] }, { season: 'winter' });
  const cars = rows.find((r) => /דריסה/.test(r.hazard));
  assert.equal(cars.likelihood, 6, 'booklet 4 + 2 because it was seen on site');
  assert.equal(cars.severity, 10);
  assert.equal(cars.score, 60);
  assert.equal(cars.level.id, 'high');
  assert.ok(cars.causes.includes('מכוניות'));
  assert.ok(cars.siteLines[0].includes('מכוניות'));
  for (let i = 1; i < rows.length; i++) assert.ok(rows[i - 1].score >= rows[i].score);
});

test('every field session carries sports injuries; summer adds heat, winter does not', function () {
  const winter = Plan.risks({}, { season: 'winter' }).map((r) => r.hazard);
  assert.equal(winter.length, 1);
  assert.match(winter[0], /פציעות במהלך ספורט/);
  const summer = Plan.risks({}, { season: 'summer' }).map((r) => r.hazard);
  assert.ok(summer.some((h) => /מכת חום/.test(h)));
});

test('hazards that share a booklet row merge into one line with all causes', function () {
  const rows = Plan.risks({ hazards: ['uneven', 'slippery'] }, { season: 'winter' });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].causes.length, 3);
  assert.equal(rows[0].likelihood, 10, 'capped at 10');
});

test('levels: 50+ high, 25+ medium, else low', function () {
  assert.equal(Plan.riskLevel(50).id, 'high');
  assert.equal(Plan.riskLevel(25).id, 'medium');
  assert.equal(Plan.riskLevel(24).id, 'low');
});

test('site-scan page renders the calculator after building, as one card per risk', function () {
  const page = fs.readFileSync(path.join(root, 'site-scan.html'), 'utf8');
  assert.match(page, /renderRisks\(\);\s*\$\('start'\)\.hidden = false/);
  assert.match(page, /THSitePlan\.risks\(profile, \{ season: \$\('season'\)\.value \}\)/);
  assert.match(page, /<section aria-labelledby="riskTitle">/);
  assert.match(page, /סבירות ' \+ r\.likelihood \+ ' × חומרה ' \+ r\.severity/);
  assert.match(page, /<details><summary>אמצעים להקטנת הסיכון<\/summary>/);
});
