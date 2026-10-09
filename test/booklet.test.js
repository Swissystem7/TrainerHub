'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const TH = require('../js/core.js');
const B = require('../js/booklet.js');

const root = path.join(__dirname, '..');
const mainRaw = fs.readFileSync(path.join(root, B.MAIN_PATH), 'utf8');
const teamRaw = fs.readFileSync(path.join(root, B.TEAM_PATH), 'utf8');
const main = JSON.parse(mainRaw);
const team = JSON.parse(teamRaw);
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'js', 'catalog.json'), 'utf8'));
const page = fs.readFileSync(path.join(root, 'booklet.html'), 'utf8');

B.setData(main, team);

test('credits the Drive booklets it was built from', function () {
  const ids = main._meta.sources.map(function (s) { return s.driveFileId; });
  assert.ok(ids.includes('1kCgpPMMXbD1A7mmcB_w-oIb2SxqBmjEw'), 'prep booklet');
  assert.equal(team._meta.source.driveFileId, '12VmSY1kFhyBts1VDU1-GqsvhBq13dHQ3');
  assert.equal(main._meta.organization, 'עמותת אחריי');
  assert.match(B.credit('prep'), /^מקור: חלק מכין לאימון - חוברת כשג אחרי/);
  for (const d of main.drills) assert.ok(B.sourceById(d.source), 'unknown source for ' + d.id);
  for (const g of main.games) assert.ok(B.sourceById(g.source), 'unknown source for ' + g.id);
});

test('keeps the Hebrew wording of the booklet', function () {
  assert.match(mainRaw, /משך ההכנה בחורף ללא מתיחות/);
  assert.match(mainRaw, /ריצה צידית תוך שיכול \(הצלבת הרגליים\)/);
  assert.match(mainRaw, /תופסת עכברים/);
  assert.match(mainRaw, /עקרון הגברת העומס/);
  assert.match(teamRaw, /מכת חום במאמץ - מצב רפואי מסכן חיים/);
  assert.doesNotMatch(mainRaw + teamRaw, /[\u202a-\u202e]/, 'no bidi control characters from PDF extraction');
});

test('content inventory matches the booklets', function () {
  const cats = B.categories();
  assert.equal(cats.warmup, 19);
  assert.equal(cats.static_stretch, 6);
  assert.equal(cats.flexibility, 41);
  assert.equal(cats.partner_stretch, 24);
  assert.equal(B.games('tag').length, 6);
  assert.equal(B.games('ball').length, 6);
  assert.equal(main.sessions.length, 5);
  assert.equal(main.methods.length, 5);
  assert.equal(main.rules.zoharBall.rules.length, 25);
  assert.deepEqual(main.rules.zoharBall.rules.map(function (r) { return r.n; }), Array.from({ length: 25 }, function (_, i) { return i + 1; }));
  const ids = main.drills.map(function (d) { return d.id; });
  assert.equal(new Set(ids).size, ids.length, 'drill ids are unique');
});

test('no personal data: no phones, emails, id numbers, and an empty roster', function () {
  const all = mainRaw + teamRaw;
  assert.doesNotMatch(all, /[\w.+-]+@[\w-]+\.[\w.]+/, 'email');
  assert.doesNotMatch(all, /(?:\+972|\b0)5\d[- ]?\d{3}[- ]?\d{4}\b/, 'mobile phone');
  assert.doesNotMatch(all, /\b\d{9}\b/, 'id number');
  assert.equal(team.traineeRoster.rows, undefined);
  assert.equal(team.traineeRoster.templateRows, 20);
  assert.ok(team.headerFields.includes('טלפון'), 'only the field label, never a value');
});

test('warm-up minutes follow the prep booklet', function () {
  assert.equal(B.warmupMinutes({ season: 'summer', activity: 'long' }), 5);
  assert.equal(B.warmupMinutes({ season: 'winter', activity: 'long' }), 10);
  assert.equal(B.warmupMinutes({ season: 'summer', activity: 'short' }), 10);
  assert.equal(B.warmupMinutes({}), 5);
});

test('opening session becomes a phases workout that survives the share-link round trip', function () {
  const w = B.sessionWorkout('opening-1', { season: 'winter' });
  assert.deepEqual(w.phases.map(function (p) { return p.name; }), ['Warm-up', 'Main', 'Cool-down']);
  assert.equal(w.phases[0].duration_minutes, 10);
  assert.equal(w.phases[1].duration_minutes, 45);
  assert.equal(w.phases[2].duration_minutes, 15);
  const station = w.phases[1].exercises.find(function (x) { return x.name === 'סקווט קפיצה'; });
  assert.equal(station.duration_seconds, 40);
  assert.equal(station.rest_seconds, 20);
  assert.equal(station.sets, 2);
  const back = TH.expandPlan(TH.compactPlan(w));
  assert.equal(back.phases.length, 3);
  assert.equal(back.phases[1].exercises.length, w.phases[1].exercises.length);
  assert.equal(B.sessionWorkout('nope'), null);
});

test('limited-space methods produce runnable workouts', function () {
  const t = B.methodWorkout('tabata');
  assert.equal(t.phases[1].exercises.length, 8);
  assert.ok(t.phases[1].exercises.every(function (x) { return x.duration_seconds === 20 && x.rest_seconds === 10 && x.sets === 4; }));
  const c = B.methodWorkout('combined', 2);
  assert.equal(c.phases[1].exercises.length, 8);
  assert.ok(c.phases[1].exercises.every(function (x) { return x.duration_seconds === 40 && x.rest_seconds === 20; }));
  const p = B.methodWorkout('pyramid', 2);
  assert.equal(p.phases[1].exercises[0].reps, '2-4-6-8-10-8-6-4-2');
  const i = B.methodWorkout('igo-ugo', 0);
  assert.equal(i.phases[1].exercises.length, 8);
});

test('fitness-test scoring matches the booklet tables', function () {
  assert.equal(B.scoreComponent('pushups', 30), 85);
  assert.equal(B.scoreComponent('pushups', 5), 40);
  assert.equal(B.scoreComponent('pullups', 16), 80);
  assert.equal(B.scoreComponent('pullups', 0), 0);
  assert.equal(B.scoreComponent('plank', '2:00'), 80);
  assert.equal(B.scoreComponent('plank', '0:44'), 50);
  assert.equal(B.scoreComponent('run3k', '10:30', 'male'), 100);
  assert.equal(B.scoreComponent('run3k', '13:31', 'male'), 70);
  assert.equal(B.scoreComponent('run3k', '13:32', 'male'), 69);
  assert.equal(B.scoreComponent('run3k', '18:00', 'male'), 40);
  assert.equal(B.scoreComponent('run3k', '12:38', 'female'), 100);
  assert.equal(B.scoreComponent('run3k', '21:36', 'female'), 40);
  assert.equal(B.scoreComponent('run300', '0:55', 'male'), 70);
  assert.equal(B.scoreComponent('run300', '0:55', 'female'), 85);
  const weights = main.fitnessTest.components.reduce(function (a, c) { return a + c.weight; }, 0);
  assert.equal(weights, 100);
  const r = B.scoreFitnessTest({ pullups: 12, pushups: 30, plank: '2:00', run300: '0:55', run3k: '13:31' }, 'male');
  assert.equal(r.total, 75);
  assert.equal(r.complete, true);
  assert.equal(B.scoreFitnessTest({ pushups: 40 }).complete, false);
});

test('run tables are monotonic (faster time never scores lower)', function () {
  for (const c of main.fitnessTest.components.filter(function (x) { return x.tables; })) {
    for (const sex of ['male', 'female']) {
      const t = c.tables[sex];
      for (let i = 1; i < t.length; i++) {
        assert.ok(t[i].maxSeconds > t[i - 1].maxSeconds, c.id + ' ' + sex + ' row ' + i);
        assert.ok(t[i].score < t[i - 1].score);
      }
    }
  }
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

test('catalog hints point at clips that exist in the video library', function () {
  const links = B.catalogLinks(catalog);
  assert.deepEqual(links.missing, []);
  assert.ok(links.linked.length >= 10);
});

test('booklet page is Hebrew RTL, labelled, linked from home, and never stores test scores', function () {
  assert.match(page, /lang="he"/);
  assert.match(page, /dir="rtl"/);
  assert.match(page, /js\/booklet\.js/);
  for (const m of page.matchAll(/<(input|select)\b[^>]*\bid="([^"]+)"/g)) {
    assert.match(page, new RegExp('for="' + m[2] + '"'), 'label for ' + m[2]);
  }
  assert.doesNotMatch(page, /store\.set\([^)]*(score|fitness)/i);
  assert.match(fs.readFileSync(path.join(root, 'index.html'), 'utf8'), /booklet\.html/);
});

test('wide booklet tables scroll inside themselves on a 390px phone', function () {
  assert.match(page, /@media screen and \(max-width: 600px\) \{ table \{ display: block; overflow-x: auto; \} \}/);
});
