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

test('parseClock validates input: rejects negative values, empty input, and invalid characters', function () {
  assert.ok(Number.isNaN(R.parseClock('-01:30')));
  assert.ok(Number.isNaN(R.parseClock(-5)));
  assert.ok(Number.isNaN(R.parseClock(-1080)));
  assert.ok(Number.isNaN(R.parseClock('')));
  assert.ok(Number.isNaN(R.parseClock('   ')));
  assert.ok(Number.isNaN(R.parseClock('abc')));
  assert.ok(Number.isNaN(R.parseClock('18:00abc')));
  assert.ok(Number.isNaN(R.parseClock('18:xx')));
  assert.equal(R.parseClock(1080), 1080);
  assert.equal(R.parseClock('1080'), 1080);
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

test('scaleLoad validates volumeDelta and preserves load on invalid input or negative result', function () {
  const baseLoad = { sets: 3, effort_he: 'בינוני' };

  // Extreme negative volumeDelta turning load negative returns original structure unchanged
  const extremeNeg = R.scaleLoad(baseLoad, -10);
  assert.equal(extremeNeg, baseLoad);
  assert.equal(extremeNeg.sets, 3);
  assert.equal(extremeNeg.effort_he, 'בינוני');

  // Infinity returns original structure unchanged
  const infResult = R.scaleLoad(baseLoad, Infinity);
  assert.equal(infResult, baseLoad);

  // -Infinity returns original structure unchanged
  const negInfResult = R.scaleLoad(baseLoad, -Infinity);
  assert.equal(negInfResult, baseLoad);

  // NaN preserves original load values and returns original structure unchanged
  const nanResult = R.scaleLoad(baseLoad, NaN);
  assert.equal(nanResult, baseLoad);
  assert.equal(nanResult.sets, 3);
  assert.equal(nanResult.effort_he, 'בינוני');

  // null, undefined, or non-numeric volumeDelta preserves original load
  assert.equal(R.scaleLoad(baseLoad, null), baseLoad);
  assert.equal(R.scaleLoad(baseLoad, undefined), baseLoad);
  assert.equal(R.scaleLoad(baseLoad, 'invalid'), baseLoad);

  // Valid volumeDelta values scale properly
  const scaledUp = R.scaleLoad(baseLoad, 1);
  assert.equal(scaledUp.sets, 4);
  assert.equal(scaledUp.effort_he, 'מועלה אחרי משוב «קל»');

  const scaledDown = R.scaleLoad(baseLoad, -1);
  assert.equal(scaledDown.sets, 2);
  assert.equal(scaledDown.effort_he, 'מוקל אחרי משוב «לא סיימתי»');
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
