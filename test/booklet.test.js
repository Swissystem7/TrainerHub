'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const B = require('../js/booklet.js');

const root = path.join(__dirname, '..');
const teamRaw = fs.readFileSync(path.join(root, B.TEAM_PATH), 'utf8');
const team = JSON.parse(teamRaw);
const page = fs.readFileSync(path.join(root, 'booklet.html'), 'utf8');

B.setData(null, team);

test('team safety file is the only booklet content on disk', function () {
  assert.equal(B.TEAM_PATH, 'content/booklet/team-safety-file.json');
  assert.ok(fs.existsSync(path.join(root, B.TEAM_PATH)));
  assert.equal(fs.existsSync(path.join(root, 'content/booklet/acharai-coach-course.json')), false);
  assert.equal(team._meta.source.driveFileId, '12VmSY1kFhyBts1VDU1-GqsvhBq13dHQ3');
  assert.match(teamRaw, /מכת חום במאמץ - מצב רפואי מסכן חיים/);
  assert.doesNotMatch(teamRaw, /[\u202a-\u202e]/, 'no bidi control characters from PDF extraction');
});

test('no personal data: no phones, emails, id numbers, and an empty roster', function () {
  assert.doesNotMatch(teamRaw, /[\w.+-]+@[\w-]+\.[\w.]+/, 'email');
  assert.doesNotMatch(teamRaw, /(?:\+972|\b0)5\d[- ]?\d{3}[- ]?\d{4}\b/, 'mobile phone');
  assert.doesNotMatch(teamRaw, /\b\d{9}\b/, 'id number');
  assert.equal(team.traineeRoster.rows, undefined);
  assert.equal(team.traineeRoster.templateRows, 20);
  assert.ok(team.headerFields.includes('טלפון'), 'only the field label, never a value');
});

test('team safety file keeps every checklist, risk and incident row', function () {
  const sections = B.siteChecklist();
  assert.deepEqual(sections.map(function (s) { return s.items.length; }), [6, 17, 5, 3]);
  assert.equal(team.riskMatrix.rows.length, 27);
  assert.equal(B.topRisks(1)[0].hazard, 'דריסה - חציית כבישים או תנועה בצידי כבישים/עפר');
  const heat = team.riskMatrix.rows.find(function (r) { return /מכת חום/.test(r.hazard); });
  assert.equal(heat.mitigations.length, 5);
  assert.equal(team.incidentResponses.rows.length, 9);
  assert.match(B.incidentFor('פציעת ראש')[0].response, /פינוי מיידי/);
  assert.ok(team.incidentResponses.rows.every(function (r) { return r.n >= 1 && r.response.length > 10; }));
});

test('course-booklet APIs are inert stubs after the removal', function () {
  assert.equal(B.data, null);
  assert.deepEqual(B.drills(), []);
  assert.deepEqual(B.games('tag'), []);
  assert.equal(B.methodWorkout('tabata'), null);
  assert.equal(B.sessionWorkout('opening-1'), null);
  assert.deepEqual(B.catalogLinks({}).linked, []);
});

test('booklet page is Hebrew RTL team-safety only, linked from home', function () {
  assert.match(page, /lang="he"/);
  assert.match(page, /dir="rtl"/);
  assert.match(page, /js\/booklet\.js/);
  assert.match(page, /תיק בטיחות/);
  assert.doesNotMatch(page, /חוברת קורס המאמנים/);
  assert.doesNotMatch(page, /acharai|אחריי|achrai/i);
  assert.doesNotMatch(page, /id="build"|id="drills"|id="games"|id="fitness"|id="zohar"/);
  assert.doesNotMatch(page, /store\.set\([^)]*(score|fitness)/i);
  assert.match(fs.readFileSync(path.join(root, 'index.html'), 'utf8'), /booklet\.html/);
});

test('wide booklet tables scroll inside themselves on a 390px phone', function () {
  assert.match(page, /@media screen and \(max-width: 600px\) \{ table \{ display: block; overflow-x: auto; \} \}/);
});
