'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const B = require('../js/booklet.js');
const S = require('../js/site-profile.js');
const Plan = require('../js/site-plan.js');

const root = path.join(__dirname, '..');
const read = function (rel) { return JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8')); };
const catalog = read('js/catalog.json');
B.setData(read(B.MAIN_PATH), read(B.TEAM_PATH));

function names(r) {
  return r.workout.phases.reduce(function (a, ph) { return a.concat(ph.exercises.map(function (x) { return x.name; })); }, []);
}

test('narrow strip → limited-space method from the booklet', function () {
  const pairs = Plan.build({ width: 'narrow' }, { group: 10 });
  assert.equal(pairs.method, 'igo-ugo');
  assert.ok(pairs.workout.tags.includes('limited-space'));
  assert.match(pairs.reasons[0], /IGO-UGO.*כי השטח צר/);
  const solo = Plan.build({ width: 'narrow' }, { group: 1 });
  assert.equal(solo.method, 'tabata');
  assert.equal(Plan.build({ width: 'medium' }).method, 'combined');
  assert.equal(Plan.build({ width: 'wide' }).method, 'opening-1');
});

test('stairs, bench and wall turn into site drills with a reason each', function () {
  const r = Plan.build({ width: 'medium', features: ['stairs', 'bench', 'wall'] }, { group: 4 });
  const n = names(r);
  assert.ok(n.includes('עליות מדרגות בריצה קלה'));
  assert.ok(n.includes('עליות על ספסל'));
  assert.ok(n.includes('שכיבות סמיכה לאחור על ספסל (דיפס)'));
  assert.ok(n.includes('ישיבה על הקיר'));
  assert.ok(r.reasons.includes('בחרתי עליות מדרגות כי זוהו מדרגות'));
  assert.ok(r.reasons.includes('בחרתי ישיבה על הקיר כי זוהה קיר'));
  assert.ok(r.workout.tags.includes('site'));
  const plain = Plan.build({ width: 'medium' }, { group: 4 });
  assert.ok(!names(plain).includes('עליות מדרגות בריצה קלה'), 'no stair drills without stairs');
  assert.ok(!plain.workout.tags.includes('site'));
});

test('site drill catalog ids exist in the video catalog', function () {
  Object.keys(Plan.SITE_DRILLS).forEach(function (f) {
    assert.ok(S.FEATURES.some(function (x) { return x.id === f; }), 'unknown feature ' + f);
    Plan.SITE_DRILLS[f].forEach(function (d) {
      if (d.catalogId) assert.ok(catalog[d.catalogId], 'missing catalog id ' + d.catalogId);
      assert.match(d.reason, /^בחרתי .+ כי /);
    });
  });
});

test('wide site + big group → tag game; not when narrow', function () {
  const wide = Plan.build({ width: 'wide' }, { group: 12 });
  assert.equal(wide.workout.phases[0].exercises[0].name, B.games('tag')[0].he);
  assert.ok(wide.reasons.some(function (x) { return /כי השטח רחב והקבוצה גדולה/.test(x); }));
  const narrow = Plan.build({ width: 'narrow' }, { group: 12 });
  assert.ok(!names(narrow).includes(B.games('tag')[0].he));
  assert.ok(narrow.reasons.some(function (x) { return /לא שילבתי משחקי תופסת/.test(x); }));
  const cars = Plan.build({ width: 'wide', hazards: ['cars'] }, { group: 12 });
  assert.ok(!names(cars).includes(B.games('tag')[0].he), 'no chase games next to cars');
});

test('hazards → warning lines, slippery uses the Acharai winter rule', function () {
  const r = Plan.build({ width: 'medium', features: ['stairs'], hazards: ['cars', 'slippery'] }, { group: 4 });
  assert.ok(r.warnings.some(function (w) { return /^זוהו מכוניות/.test(w); }));
  assert.ok(r.warnings.some(function (w) { return /^משטח חלק: יש לשים לב לתנאי הקרקע/.test(w); }));
  const stair = r.workout.phases[1].exercises.filter(function (x) { return x.name === 'עליות מדרגות בריצה קלה'; })[0];
  assert.match(stair.notes, /בקצב הליכה/);
  assert.deepEqual(Plan.build({ width: 'medium' }).warnings, []);
  assert.equal(Plan.build({ hazards: ['heat'], shade: true }).warnings.length, 0, 'shade covers the sun warning');
  assert.equal(Plan.build({ hazards: ['heat'] }).warnings.length, 1);
});

test('winter adds the longer warm-up and its rule', function () {
  const summer = Plan.build({ width: 'wide' }, { season: 'summer' });
  const winter = Plan.build({ width: 'wide' }, { season: 'winter' });
  assert.ok(winter.workout.phases[0].duration_minutes >= summer.workout.phases[0].duration_minutes);
  assert.ok(winter.warnings.some(function (w) { return /^חורף: /.test(w); }));
});

test('group × space check → waves or stations', function () {
  const r = Plan.build({ width: 'narrow' }, { group: 20 });
  assert.equal(r.layout, 'waves');
  assert.match(r.warnings[0], /^20 מתאמנים בשטח צר: לעבוד בגלים/);
  assert.equal(Plan.build({ width: 'medium' }, { group: 30 }).layout, 'stations');
  assert.equal(Plan.build({ width: 'wide' }, { group: 30 }).layout, 'together');
});

test('works from the manual fallback profile and from a malformed AI reply', function () {
  const manual = S.toggle(S.toggle(S.emptyProfile(), 'width', 'narrow'), 'features', 'stairs');
  const r = Plan.build(manual, { group: 6 });
  assert.equal(r.profile.source, 'manual');
  assert.ok(names(r).includes('עליות מדרגות בריצה קלה'));
  const broken = Plan.build(S.parseAiResponse('```json {oops').profile, { group: 6 });
  assert.equal(broken.method, 'combined');
  assert.ok(broken.workout.phases.length === 3);
});
