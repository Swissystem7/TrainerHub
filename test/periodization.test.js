const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const TH = require('../js/core.js');

test('periodizePlan: 4–12 weeks, progressive load, deload every 4th week, Hebrew why', () => {
  const p8 = TH.periodizePlan({ weeks: 8 });
  assert.strictEqual(p8.weeks.length, 8);
  assert.deepStrictEqual(p8.weeks.map((w) => w.kind), ['load', 'load', 'load', 'deload', 'load', 'load', 'load', 'deload']);
  assert.deepStrictEqual(p8.weeks.map((w) => w.loadPct), [100, 105, 110, 60, 115, 120, 125, 60]);
  assert.strictEqual(p8.weeks[2].setsDelta, 1);
  p8.weeks.forEach((w) => assert.match(w.why, /[א-ת]/));
  assert.strictEqual(TH.periodizePlan({ weeks: 2 }).weeks.length, 4);
  assert.strictEqual(TH.periodizePlan({ weeks: 40 }).weeks.length, 12);
  assert.strictEqual(TH.periodizePlan({ weeks: 6, goal: 'endurance' }).weeks[1].loadPct, 102.5);
});

test('adjustNextWeek: pain → early deload, skips/hard RPE → hold, easy → extra, each explained', () => {
  const base = TH.periodizePlan({ weeks: 8 });
  const pain = TH.adjustNextWeek(base, 1, { pain: true });
  assert.strictEqual(pain.weeks[1].kind, 'deload');
  assert.strictEqual(pain.weeks[1].loadPct, 60);
  assert.match(pain.weeks[1].why, /כאב/);
  const skip = TH.adjustNextWeek(base, 1, { skipped: 2 });
  assert.strictEqual(skip.weeks[1].loadPct, 100);
  assert.strictEqual(skip.weeks[2].loadPct, 105, 'later weeks shift down too');
  assert.strictEqual(skip.weeks[4].loadPct, 115, 'deload resets the shift for the next block');
  assert.match(skip.weeks[1].why, /דולגו/);
  const hard = TH.adjustNextWeek(base, 2, { rpe: 5 });
  assert.strictEqual(hard.weeks[2].loadPct, 105);
  assert.match(hard.weeks[2].why, /קושי 5\/5/);
  const easy = TH.adjustNextWeek(base, 1, { rpe: 1, skipped: 0 });
  assert.strictEqual(easy.weeks[1].loadPct, 107.5);
  assert.ok(easy.weeks[1].adjusted);
  assert.deepStrictEqual(base.weeks[1].loadPct, 105, 'input plan is not mutated');
  assert.strictEqual(TH.adjustNextWeek(base, 8, { pain: true }).weeks.length, 8, 'past the end is a no-op');
});

test('applyPlanWeek keeps the phases schema and only changes main sets/notes', () => {
  const w = { title: 'אימון 1', phases: [{ name: 'warm-up', exercises: [{ id: 'arm_circles', sets: 1 }] }, { name: 'main', exercises: [{ id: 'squat', sets: 3, reps: 10 }] }] };
  const plan = TH.periodizePlan({ weeks: 4 });
  const deload = TH.applyPlanWeek(w, plan.weeks[3]);
  assert.strictEqual(deload.phases[1].exercises[0].sets, 2);
  assert.strictEqual(deload.phases[0].exercises[0].sets, 1);
  assert.match(deload.phases[1].exercises[0].notes, /שבוע 4: 60% עומס/);
  assert.strictEqual(TH.applyPlanWeek(deload, plan.weeks[2]).title, 'אימון 1 · שבוע 3');
  assert.strictEqual(TH.applyPlanWeek(w, plan.weeks[2]).phases[1].exercises[0].sets, 4);
  assert.deepStrictEqual(Object.keys(deload).sort(), Object.keys(w).sort());
});

test('pplBalance counts push/pull/legs sets and explains imbalance in Hebrew', () => {
  const prog = { dailyWorkouts: [{ phases: [{ name: 'main', exercises: [{ id: 'push_up', sets: 3 }, { id: 'dumbbell_bench', sets: 3 }, { id: 'squat', sets: 3 }] }] }] };
  const b = TH.pplBalance(prog);
  assert.deepStrictEqual([b.push, b.pull, b.legs], [6, 0, 3]);
  assert.strictEqual(b.balanced, false);
  assert.match(b.why, /משיכה/);
  const gen = TH.generateWorkoutProgram({ fitnessLevel: 'beginner', goals: ['strength'], availableEquipment: ['dumbbells'], targetMuscles: [], injuries: [], preferCatalog: true }, 1, 3);
  const g = TH.pplBalance(gen);
  assert.ok(g.push > 0 && g.pull > 0 && g.legs > 0, 'a 3-day PPL program trains all three');
});

test('suggestNextFromLog: pain, per-exercise RPE decisions and plan adjustment; old calls unchanged', () => {
  const compact = { t: 'כוח', p: [{ n: 'Main', e: [{ n: 'סקוואט', id: 'squat', s: 3 }, { n: 'חתירה', id: 'row', s: 3 }] }] };
  const legacy = TH.suggestNextFromLog(compact, { rpe: 3, skipped: 0 });
  assert.strictEqual(legacy.adjusted, 'same');
  assert.deepStrictEqual(legacy.decisions, []);
  const pain = TH.suggestNextFromLog(compact, { rpe: 2, skipped: 0, pain: true });
  assert.strictEqual(pain.adjusted, 'down');
  assert.match(pain.why, /כאב/);
  assert.strictEqual(pain.compact.p[0].e[0].s, 2);
  const per = TH.suggestNextFromLog(compact, { skipped: 0, ex: [{ id: 'squat', rpe: 9 }, { id: 'row', rpe: 4 }] });
  assert.deepStrictEqual(per.compact.p[0].e.map((e) => e.s), [2, 4]);
  assert.match(per.decisions[0].why, /9\/10/);
  const withPlan = TH.suggestNextFromLog(compact, { rpe: 5 }, { plan: TH.periodizePlan({ weeks: 4 }), week: 1 });
  assert.strictEqual(withPlan.plan.weeks[1].loadPct, 100);
});

test('weekly.html wires periodization inside the existing builder', () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'weekly.html'), 'utf8');
  assert.match(html, /id="periodWeeks"/);
  assert.match(html, /TH\.periodizePlan/);
  assert.match(html, /TH\.adjustNextWeek/);
  assert.match(html, /TH\.pplBalance/);
  assert.match(html, /TH\.applyPlanWeek/);
});
