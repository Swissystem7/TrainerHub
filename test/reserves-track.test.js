'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const R = require('../js/reserves-track.js');
const track = require('../content/reserves/miluim-track.json');

test('miluim track JSON has four pass/fail tests with expected thresholds', function () {
  assert.equal(track.tests.length, 4);
  assert.equal(track._meta.title_he, 'מדדי מילואים');
  assert.equal(track._meta.deadline_display_he, '1.12');
  assert.equal(track._meta.all_must_pass, true);
  assert.equal(track._meta.verified, false);
  assert.deepEqual(track._meta.equipment_he, ['מתח', 'מקבילים', 'מסלול ריצה או הליכון']);

  const byId = Object.fromEntries(track.tests.map((t) => [t.id, t]));
  assert.equal(byId.run3000.threshold, 1080);
  assert.equal(byId.run3000.pass_when, 'lte');
  assert.equal(byId.pullups.threshold, 3);
  assert.equal(byId.pullups.pass_when, 'gte');
  assert.equal(byId.dips.threshold, 5);
  assert.equal(byId.hr_pushups.threshold, 15);
  assert.equal(byId.hr_pushups.name_he.includes('ניתוק'), true);
  track.tests.forEach((t) => assert.equal(t.verified, false));
});

test('plan is 6 weeks with 2 workouts/week and placement/mid/final checkpoints', function () {
  assert.equal(track.plan.sessions.length, 12);
  assert.equal(track._meta.weeks, 6);
  assert.equal(track._meta.workouts_per_week, 2);
  const cps = track.plan.checkpoints.map((c) => c.id);
  assert.deepEqual(cps, ['placement', 'midpoint', 'final']);
  assert.equal(track.plan.checkpoints.find((c) => c.id === 'placement').name_he, 'מבחן מיון');
  assert.equal(track.plan.checkpoints.find((c) => c.id === 'midpoint').name_he, 'מבחן אמצע');
  assert.equal(track.plan.checkpoints.find((c) => c.id === 'final').name_he, 'מבחן סיום');
});

test('demo cards start with hand-release push-up and are unverified', function () {
  R.setData(track);
  const demos = R.demos();
  assert.ok(demos.length >= 1);
  assert.equal(demos[0].exercise_id, 'miluim-hr-pushups');
  assert.match(demos[0].name_he, /ניתוק ידיים/);
  assert.ok(demos[0].steps_he.length >= 4);
  demos.forEach((d) => assert.equal(d.verified, false));
});

test('evaluateTest: run pass at 18:00 and fail above', function () {
  R.setData(track);
  const pass = R.evaluateTest('run3000', '18:00');
  assert.equal(pass.pass, true);
  assert.equal(pass.value, 1080);
  const better = R.evaluateTest('run3000', '17:59');
  assert.equal(better.pass, true);
  const fail = R.evaluateTest('run3000', '18:01');
  assert.equal(fail.pass, false);
  const incomplete = R.evaluateTest('run3000', '');
  assert.equal(incomplete.incomplete, true);
});

test('evaluateTest: pullups/dips/hr_pushups thresholds', function () {
  R.setData(track);
  assert.equal(R.evaluateTest('pullups', 3).pass, true);
  assert.equal(R.evaluateTest('pullups', 2).pass, false);
  assert.equal(R.evaluateTest('dips', 5).pass, true);
  assert.equal(R.evaluateTest('dips', 4).pass, false);
  assert.equal(R.evaluateTest('hr_pushups', 15).pass, true);
  assert.equal(R.evaluateTest('hr_pushups', 14).pass, false);
});

test('evaluateAll requires all four to pass', function () {
  R.setData(track);
  const all = R.evaluateAll({
    run3000: '17:30',
    pullups: 4,
    dips: 6,
    hr_pushups: 20
  });
  assert.equal(all.overall, 'pass');
  assert.equal(all.allPassed, true);

  const miss = R.evaluateAll({
    run3000: '17:30',
    pullups: 4,
    dips: 6
  });
  assert.equal(miss.overall, 'incomplete');

  const fail = R.evaluateAll({
    run3000: '19:00',
    pullups: 4,
    dips: 6,
    hr_pushups: 20
  });
  assert.equal(fail.overall, 'fail');
  assert.equal(fail.allPassed, false);
});

test('parseClock and formatClock round-trip common values', function () {
  assert.equal(R.parseClock('18:00'), 1080);
  assert.equal(R.parseClock('1:00:00'), 3600);
  assert.equal(R.formatClock(1080), '18:00');
  assert.equal(R.formatClock(65), '1:05');
});

test('logResult persists via in-memory localStorage shim and clearResults wipes it', function () {
  R.setData(track);
  const mem = {};
  global.localStorage = {
    getItem(k) { return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null; },
    setItem(k, v) { mem[k] = String(v); },
    removeItem(k) { delete mem[k]; }
  };
  // Ensure TH.store path is not used with a foreign key unexpectedly
  R.clearResults();
  const logged = R.logResult('hr_pushups', 16, 'placement');
  assert.equal(logged.evaluation.pass, true);
  assert.equal(R.loadResults().results.hr_pushups.pass, true);
  assert.equal(R.loadResults().results.hr_pushups.checkpoint, 'placement');
  assert.equal(R.currentSummary().tests.find((t) => t.id === 'hr_pushups').pass, true);
  R.clearResults();
  assert.deepEqual(R.loadResults().results, {});
  delete global.localStorage;
});

test('reserves.html is Hebrew RTL mobile page with nav and sections', function () {
  const html = fs.readFileSync(path.join(root, 'reserves.html'), 'utf8');
  assert.match(html, /lang="he"/);
  assert.match(html, /dir="rtl"/);
  assert.match(html, /viewport/);
  assert.match(html, /class="skip-link"/);
  assert.match(html, /class="th-nav"/);
  assert.match(html, /מדדי מילואים/);
  assert.match(html, /id="tests"/);
  assert.match(html, /id="demos"/);
  assert.match(html, /id="plan"/);
  assert.match(html, /reserves-track\.js/);
  assert.match(html, /aria-label="שמור תוצאות מדדים"/);
});

test('index and key pages link to reserves.html', function () {
  for (const page of ['index.html', 'weekly.html', 'exercises.html', 'booklet.html', 'journal.html', 'library.html']) {
    const html = fs.readFileSync(path.join(root, page), 'utf8');
    assert.match(html, /reserves\.html/, page + ' should link to reserves.html');
    assert.match(html, /מדדי מילואים/, page + ' should show Hebrew nav label');
  }
});

test('miluim demos carry exercise ids without polluting ig catalog', function () {
  R.setData(track);
  const demos = R.demos();
  assert.ok(demos.every((d) => d.exercise_id && d.verified === false));
  const data = require('../data/exercises.json');
  assert.equal(data.exercises.some((e) => String(e.id).startsWith('miluim-')), false);
  assert.equal(data.exercises.length, 90);
});


test('feedback options are קל / בדיוק / לא סיימתי with volume adjustments', function () {
  R.setData(track);
  const opts = R.feedbackOptions();
  assert.deepEqual(opts.map((o) => o.id), ['easy', 'exact', 'incomplete']);
  assert.deepEqual(opts.map((o) => o.he), ['קל', 'בדיוק', 'לא סיימתי']);
  assert.equal(R.adjustmentFor('easy').volume_delta, 1);
  assert.equal(R.adjustmentFor('exact').volume_delta, 0);
  assert.equal(R.adjustmentFor('incomplete').volume_delta, -1);
});

test('recordWorkoutFeedback + nextWorkout scales sets up after קל and down after לא סיימתי', function () {
  R.setData(track);
  const mem = {};
  global.localStorage = {
    getItem(k) { return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null; },
    setItem(k, v) { mem[k] = String(v); },
    removeItem(k) { delete mem[k]; }
  };
  R.clearResults();
  const first = track.plan.sessions[0];
  const baseSets = first.load.sets;
  R.recordWorkoutFeedback(first.id, 'easy');
  const harder = R.nextWorkout(first.id, 'easy');
  assert.equal(harder.done, false);
  assert.equal(harder.session.load.sets, baseSets + 1);
  assert.match(harder.session.adjustment_note_he, /קל/);

  R.recordWorkoutFeedback(first.id, 'incomplete');
  const easier = R.nextWorkout(first.id, 'incomplete');
  assert.equal(easier.session.load.sets, Math.max(2, baseSets - 1));
  assert.match(easier.session.adjustment_note_he, /לא סיימתי/);

  const same = R.nextWorkout(first.id, 'exact');
  assert.equal(same.session.load.sets, baseSets);
  delete global.localStorage;
});

test('leveled strength plans exist with and without equipment', function () {
  R.setData(track);
  const all = R.strengthPlans();
  assert.equal(all.length, 6);
  const bw1 = R.strengthPlans({ level: 1, equipment: 'none' });
  assert.equal(bw1.length, 1);
  assert.match(bw1[0].title_he, /בלי ציוד/);
  assert.equal(bw1[0].verified, false);
  assert.ok(bw1[0].sessions.length >= 2);
  const eq2 = R.strengthPlans({ level: 2, equipment: 'bars' });
  assert.equal(eq2.length, 1);
  assert.match(eq2[0].equipment_he, /מתח/);
  const byId = R.strengthPlanById('str-eq-3');
  assert.ok(byId);
  assert.equal(byId.level, 3);
});

test('reserves.html includes adaptive feedback and strength plan UI', function () {
  const html = fs.readFileSync(path.join(root, 'reserves.html'), 'utf8');
  assert.match(html, /id="adapt"/);
  assert.match(html, /id="strength"/);
  assert.match(html, /data-fb="easy"/);
  assert.match(html, /לא סיימתי/);
  assert.match(html, /id="strLevel"/);
  assert.match(html, /id="strEquip"/);
  assert.match(html, /עם מתח ומקבילים/);
});


test('targets are marked pending unit confirmation', function () {
  R.setData(track);
  assert.equal(track._meta.targets_pending_confirmation, true);
  assert.equal(track._meta.verified, false);
  assert.match(track._meta.pace_target_he, /6:00/);
  track.tests.forEach((t) => {
    assert.equal(t.target_pending_confirmation, true);
    assert.equal(t.verified, false);
  });
});

test('HRP demo follows GoArmy/ACFT cues and T hand release', function () {
  R.setData(track);
  const hr = R.demos().find((d) => d.id === 'demo-hr-pushups');
  assert.ok(hr);
  assert.ok((hr.technique_he || []).some((s) => /T/.test(s)));
  assert.ok((hr.technique_he || []).some((s) => /ירכיים|חזה/.test(s)));
  assert.ok(hr.steps_he.some((s) => /50–70%|50-70%/.test(s)));
  assert.equal(hr.verified, false);
});

test('plan includes deload every 3–4 weeks and before final test', function () {
  assert.ok(track.plan.deload);
  assert.equal(track.plan.deload.every_weeks, 3);
  assert.equal(track.plan.deload.before_test, true);
  assert.match(track.plan.sessions.find((s) => s.id === 'w6a').focus_he, /דילוד/);
});

test('boundary: every benchmark passes exactly at threshold and fails one unit beyond', function () {
  R.setData(track);
  // run3000 is lte 1080s: at/inside passes, one second over fails.
  assert.equal(R.evaluateTest('run3000', 1080).pass, true);
  assert.equal(R.evaluateTest('run3000', 1079).pass, true);
  assert.equal(R.evaluateTest('run3000', 1081).pass, false);
  assert.equal(R.evaluateTest('run3000', '17:59').pass, true);
  assert.equal(R.evaluateTest('run3000', '18:01').pass, false);
  // gte rep tests: at threshold passes, one rep below fails, fractional below fails.
  for (const [id, thr] of [['pullups', 3], ['dips', 5], ['hr_pushups', 15]]) {
    assert.equal(R.evaluateTest(id, thr).pass, true, id + ' at threshold');
    assert.equal(R.evaluateTest(id, thr - 1).pass, false, id + ' one below');
    assert.equal(R.evaluateTest(id, thr - 0.1).pass, false, id + ' fraction below');
    assert.equal(R.evaluateTest(id, thr + 1).pass, true, id + ' one above');
    assert.equal(R.evaluateTest(id, 0).pass, false, id + ' zero');
    const ev = R.evaluateTest(id, thr);
    assert.equal(ev.incomplete, false);
    assert.equal(ev.value, thr);
    assert.equal(ev.verified, false);
  }
});

test('parseClock rejects out-of-range and malformed clocks; formatClock guards bad input', function () {
  assert.equal(R.parseClock('0:00'), 0);
  assert.equal(R.parseClock('1080'), 1080);
  assert.equal(R.parseClock(' 18:00 '), 1080);
  assert.ok(Number.isNaN(R.parseClock('18:60')));
  assert.ok(Number.isNaN(R.parseClock('1:60:00')));
  assert.ok(Number.isNaN(R.parseClock('1:2:3:4')));
  assert.ok(Number.isNaN(R.parseClock('')));
  assert.ok(Number.isNaN(R.parseClock('abc')));
  assert.ok(Number.isNaN(R.parseClock(':')));
  assert.ok(Number.isNaN(R.parseClock(null)));
  assert.equal(R.formatClock(0), '0:00');
  assert.equal(R.formatClock(59), '0:59');
  assert.equal(R.formatClock(60), '1:00');
  assert.equal(R.formatClock(3599), '59:59');
  assert.equal(R.formatClock(-1), '');
  assert.equal(R.formatClock(NaN), '');
  assert.equal(R.formatClock(Infinity), '');
});

test('evaluateTest invalid inputs are incomplete+invalid, never a pass', function () {
  R.setData(track);
  assert.equal(R.evaluateTest('unknown-id', 5), null);
  assert.equal(R.testById('unknown-id'), null);
  for (const raw of ['abc', '18:60', -5, NaN, Infinity, -Infinity]) {
    const ev = R.evaluateTest('run3000', raw);
    assert.equal(ev.pass, false, 'run3000 ' + String(raw));
    assert.equal(ev.incomplete, true, 'run3000 ' + String(raw));
    assert.equal(ev.invalid, true, 'run3000 ' + String(raw));
    assert.equal(ev.value, null);
  }
  for (const raw of ['abc', '-3', -1, NaN, Infinity]) {
    const ev = R.evaluateTest('pullups', raw);
    assert.equal(ev.pass, false, 'pullups ' + String(raw));
    assert.equal(ev.invalid, true, 'pullups ' + String(raw));
  }
  for (const raw of ['', null, undefined]) {
    const ev = R.evaluateTest('dips', raw);
    assert.equal(ev.incomplete, true);
    assert.equal(ev.pass, false);
    assert.equal(ev.invalid, undefined);
  }
  // String numbers and decimal-comma input already accepted by normalizeValue.
  assert.equal(R.evaluateTest('pullups', '3').pass, true);
  assert.equal(R.evaluateTest('pullups', '3,0').pass, true);
});

test('negative clock strings are invalid, not stripped into a passing time', function () {
  R.setData(track);
  for (const raw of ['-1', '-18:00', '-0:01']) {
    assert.ok(Number.isNaN(R.parseClock(raw)), raw);
    const ev = R.evaluateTest('run3000', raw);
    assert.equal(ev.pass, false, raw);
    assert.equal(ev.incomplete, true, raw);
    assert.equal(ev.invalid, true, raw);
  }
});

test('evaluateAll: invalid or missing input is incomplete, a valid miss is fail', function () {
  R.setData(track);
  assert.equal(R.evaluateAll().overall, 'incomplete');
  assert.equal(R.evaluateAll({}).overall, 'incomplete');
  assert.equal(R.evaluateAll({ run3000: 'abc', pullups: 9, dips: 9, hr_pushups: 99 }).overall, 'incomplete');
  const oneFail = R.evaluateAll({ run3000: '18:01', pullups: 3, dips: 5, hr_pushups: 15 });
  assert.equal(oneFail.overall, 'fail');
  assert.equal(oneFail.allPassed, false);
  assert.equal(oneFail.tests.filter((t) => !t.pass).map((t) => t.id).join(','), 'run3000');
  const exact = R.evaluateAll({ run3000: '18:00', pullups: 3, dips: 5, hr_pushups: 15 });
  assert.equal(exact.overall, 'pass');
  assert.equal(exact.allPassed, true);
  // Unknown extra keys do not substitute for a required test.
  assert.equal(R.evaluateAll({ pullups: 3, dips: 5, hr_pushups: 15, bogus: 1 }).overall, 'incomplete');
});

test('6-week plan distribution: exactly 2 ordered sessions in each week 1-6', function () {
  const sessions = track.plan.sessions;
  assert.equal(sessions.length, 12);
  for (let week = 1; week <= 6; week++) {
    const inWeek = sessions.filter((s) => s.week === week);
    assert.deepEqual(inWeek.map((s) => s.id), ['w' + week + 'a', 'w' + week + 'b'], 'week ' + week);
    inWeek.forEach((s) => {
      assert.ok(Array.isArray(s.items_he) && s.items_he.length >= 2);
      assert.ok(s.load && Number.isFinite(s.load.sets) && s.load.sets >= 1);
      assert.equal(s.verified, false);
    });
  }
  // Sessions are stored in chronological week order.
  assert.deepEqual(sessions.map((s) => s.week), [1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6]);
  assert.deepEqual(track.plan.checkpoints.map((c) => c.week), [0, 3, 6]);
  // Deload sessions named in the documented deload rule (week 3 and pre-final week 6).
  assert.match(sessions.find((s) => s.id === 'w3b').focus_he, /דילוד/);
  assert.match(sessions.find((s) => s.id === 'w6a').focus_he, /דילוד/);
});

test('graded load: strength plan sets rise with level for both equipment kinds', function () {
  R.setData(track);
  const minSets = (level, equipment) => Math.min(...R.strengthPlans({ level, equipment })[0].sessions.map((s) => s.load.sets));
  for (const equipment of ['none', 'bars']) {
    assert.ok(minSets(1, equipment) < minSets(2, equipment), equipment + ' L1<L2');
    assert.ok(minSets(2, equipment) <= minSets(3, equipment), equipment + ' L2<=L3');
  }
  assert.equal(minSets(1, 'none'), 3);
  assert.equal(minSets(2, 'none'), 4);
  assert.equal(minSets(3, 'none'), 5);
  // Unknown filters match nothing instead of falling back to all plans.
  assert.deepEqual(R.strengthPlans({ level: 99 }), []);
  assert.deepEqual(R.strengthPlans({ equipment: 'bogus' }), []);
  assert.equal(R.strengthPlanById('no-such-plan'), null);
  // tests() hands out a copy: mutating it must not shrink the catalogue.
  const copy = R.tests();
  copy.pop();
  assert.equal(R.tests().length, 4);
});

test('scaleLoad clamps sets to 2..6 and does not mutate the input load', function () {
  const base = { sets: 6, effort_he: 'בינוני' };
  assert.equal(R.scaleLoad(base, 10).sets, 6);
  assert.equal(base.sets, 6);
  assert.equal(R.scaleLoad({ sets: 2, effort_he: 'בינוני' }, -10).sets, 2);
  assert.equal(R.scaleLoad({ sets: 3, effort_he: 'בינוני' }, 1).sets, 4);
  assert.equal(R.scaleLoad(null, 0).sets, 3);
  assert.equal(R.scaleLoad(undefined, -1).sets, 2);
  assert.match(R.scaleLoad({ sets: 3 }, 1).effort_he, /קל/);
  assert.match(R.scaleLoad({ sets: 3 }, -1).effort_he, /לא סיימתי/);
});

test('nextWorkout ends at the last session, rejects unknown ids and feedback', function () {
  R.setData(track);
  const mem = {};
  global.localStorage = {
    getItem(k) { return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null; },
    setItem(k, v) { mem[k] = String(v); },
    removeItem(k) { delete mem[k]; }
  };
  R.clearResults();
  const done = R.nextWorkout('w6b', 'exact');
  assert.equal(done.done, true);
  assert.equal(done.session, null);
  assert.equal(R.nextWorkout('no-such-session', 'exact'), null);
  assert.equal(R.findPlanSession('no-such-session'), null);
  assert.equal(R.recordWorkoutFeedback('w1a', 'bogus-feedback'), null);
  assert.equal(R.adjustmentFor('bogus-feedback'), null);
  // Unknown feedback id in nextWorkout falls back to zero volume delta.
  const next = R.nextWorkout('w1a', 'bogus-feedback');
  assert.equal(next.done, false);
  assert.equal(next.session.id, 'w1b');
  assert.equal(next.session.load.sets, track.plan.sessions[1].load.sets);
  // Strength-plan sessions chain within their own plan only.
  const strNext = R.nextWorkout('bw1-a', 'exact');
  assert.equal(strNext.source, 'strength');
  assert.equal(strNext.planId, 'str-bw-1');
  assert.equal(strNext.session.id, 'bw1-b');
  assert.equal(R.nextWorkout('bw1-b', 'exact').done, true);
  delete global.localStorage;
});

test('strength plans expose duration and deload guidance by level', function () {
  R.setData(track);
  const plans = R.strengthPlans();
  assert.equal(plans.length, 6);
  plans.forEach((p) => {
    assert.ok(p.duration_weeks_he);
    assert.match(p.deload_he, /דילוד/);
    assert.equal(p.verified, false);
  });
});
