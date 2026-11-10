const test = require("node:test");
const assert = require("node:assert/strict");
const Analyzer = require("../js/analyzer.js");
const Infer = require("../js/infer.js");

test("analyzeExercise infers plank as core / time / beginner", () => {
	const a = Analyzer.analyzeExercise({
		he: "פלאנק",
		muscles: ["core"],
		equipment: ["none"],
		level: "beginner",
	});
	assert.equal(a.primary, "core");
	assert.equal(a.pattern, "core");
	assert.equal(a.load, "time");
	assert.equal(a.difficulty, "beginner");
	assert.ok(a.secondary.indexOf("shoulders") !== -1);
});

test("analyzeExercise maps australian pull-up to pull + back/biceps", () => {
	const a = Analyzer.analyzeExercise({ he: "מתח אוסטרלי" });
	assert.equal(a.pattern, "pull");
	assert.ok(a.muscles.indexOf("back") !== -1);
	assert.ok(
		a.primary === "back" ||
			a.secondary.indexOf("biceps") !== -1 ||
			a.muscles.indexOf("biceps") !== -1,
	);
	assert.equal(
		Infer.inferFromName("מתח אוסטרלי").muscles.indexOf("biceps") !== -1,
		true,
	);
});

test("analyzeExercise maps push-ups to push and mountain climbers to plyo", () => {
	assert.equal(
		Analyzer.analyzeExercise({ he: "אתגר שכיבות שמיכה" }).pattern,
		"push",
	);
	assert.equal(Analyzer.analyzeExercise({ he: "מטפס הרים" }).pattern, "plyo");
	assert.equal(Analyzer.analyzeExercise({ he: "מדרגות" }).pattern, "squat");
	assert.equal(Analyzer.analyzeExercise({ he: "גב תחתון" }).pattern, "hinge");
});

test("analyzeSession reports volume, push/pull, stimulus, and quality flags", () => {
	const workout = {
		title: "אימון ליבה",
		duration_minutes: 20,
		goal: null,
		phases: [
			{
				name: "Main",
				exercises: [
					{
						name: "פלאנק",
						id: "plank",
						sets: 3,
						reps: null,
						duration_seconds: 40,
						rest_seconds: 30,
					},
					{
						name: "מטפס הרים",
						id: "mountain_climber",
						sets: 3,
						reps: 15,
						duration_seconds: null,
						rest_seconds: 30,
					},
					{
						name: "בטן",
						id: "crunches",
						sets: 3,
						reps: 15,
						duration_seconds: null,
						rest_seconds: 30,
					},
					{
						name: "פלאנק צידי",
						id: "side",
						sets: 3,
						reps: null,
						duration_seconds: 30,
						rest_seconds: 30,
					},
				],
			},
		],
	};
	const s = Analyzer.analyzeSession(workout);
	assert.ok(s.volume.core >= 70);
	assert.equal(s.pushPull.pull, 0);
	assert.ok(s.durationMinutes >= 15);
	assert.ok(s.stimulus?.key);
	assert.match(s.stimulus.detail, /גירוי/);
	assert.doesNotMatch(s.stimulus.detail, /תרזה|מובטח|5 ק/);
	const flags = s.flags.map((f) => f.key);
	assert.ok(flags.indexOf("no-pull") !== -1);
	assert.ok(flags.indexOf("no-warmup") !== -1);
	assert.ok(s.flags.some((f) => /ליבה/.test(f.he) && /גב/.test(f.he)));
});

test("analyzeSession never phrases stimulus as a promised outcome", () => {
	const workout = {
		duration_minutes: 30,
		phases: [
			{
				name: "Warm-up",
				exercises: [{ name: "חימום", sets: 1, duration_seconds: 180 }],
			},
			{
				name: "Main",
				exercises: [
					{ name: "מתח אוסטרלי", sets: 4, reps: "4-6", rest_seconds: 120 },
					{ name: "שכיבות שמיכה", sets: 4, reps: "4-6", rest_seconds: 120 },
				],
			},
			{
				name: "Cool-down",
				exercises: [{ name: "מתיחות", sets: 1, duration_seconds: 180 }],
			},
		],
	};
	const s = Analyzer.analyzeSession(
		Object.assign({ goal: "strength" }, workout),
	);
	assert.equal(s.stimulus.key, "strength");
	assert.match(s.stimulus.detail, /גירוי לכוח/);
	assert.equal(Analyzer.claimsOutcome(s.stimulus.detail), false);
	assert.equal(Analyzer.claimsOutcome('תרזה 5 ק"ג'), true);
});

test("inferFromName follows the spec examples for plank, bands, and australian pull-up", () => {
	const plank = Infer.inferFromName("פלאנק", { folder: "בטן" });
	assert.deepEqual(plank.muscles, ["core"]);
	assert.deepEqual(plank.equipment, ["none"]);
	assert.equal(plank.level, "beginner");
	const bands = Infer.inferFromName("גומיות רגליים", { folder: "גומיות" });
	assert.ok(bands.equipment.indexOf("band") !== -1);
	const row = Infer.inferFromName("מתח אוסטרלי", { folder: "גב" });
	assert.ok(row.muscles.indexOf("back") !== -1);
	assert.ok(row.muscles.indexOf("biceps") !== -1);
});

test("empty session reports zero duration and does not invent volume", () => {
	const s = Analyzer.analyzeSession({ title: "ריק", phases: [] });
	assert.equal(s.durationMinutes, 0);
	assert.deepEqual(s.exercises, []);
	assert.deepEqual(s.volume, {});
});

test("analyzeSession ignores negative duration_minutes and does not return negative duration", () => {
	const emptySession = Analyzer.analyzeSession({
		title: "ריק",
		duration_minutes: -25,
		phases: [],
	});
	assert.equal(emptySession.durationMinutes, 0);

	const activeSession = Analyzer.analyzeSession({
		title: "אימון",
		duration_minutes: -40,
		phases: [
			{
				name: "Main",
				exercises: [{ name: "סקוואט", sets: 3, reps: 10, rest_seconds: 60 }],
			},
		],
	});
	assert.ok(activeSession.durationMinutes > 0);
	assert.equal(activeSession.durationMinutes >= 0, true);
});

test("exercises with negative sets, duration_seconds, or reps do not produce negative duration or volume", () => {
	const session = Analyzer.analyzeSession({
		title: "אימון בדיקה",
		phases: [
			{
				name: "Main",
				exercises: [
					{ name: "שכיבות שמיכה", sets: -2, reps: -10, duration_seconds: -30 },
					{ name: "מתח", sets: 3, reps: 8, rest_seconds: 60 },
				],
			},
		],
	});
	assert.ok(session.durationMinutes > 0);
	assert.ok(session.volume.chest > 0);
	assert.ok(session.volume.back > 0);
	Object.keys(session.volume).forEach((m) => {
		assert.ok(session.volume[m] >= 0, `Volume for ${m} should be non-negative`);
	});
	assert.equal(session.volume.chest, 25);
	assert.equal(session.volume.back, 75);
});

test("enrichJournalEntry normalizes negative volume to non-negative volume", () => {
	const entryWithoutTonnage = Analyzer.enrichJournalEntry({
		id: "entry-1",
		volume: -250,
	});
	assert.equal(entryWithoutTonnage.volume, 0);

	const entryWithInvalidVolume = Analyzer.enrichJournalEntry({
		id: "entry-2",
		volume: -Infinity,
	});
	assert.equal(entryWithInvalidVolume.volume, 0);

	const entryWithSets = Analyzer.enrichJournalEntry({
		id: "entry-3",
		volume: -500,
		sets: [{ exerciseId: "pushup", reps: 10, weightKg: 20 }],
	});
	assert.ok(entryWithSets.volume >= 0);
});

test("parseRepMid ignores negative numbers and returns null", () => {
	assert.equal(Analyzer.parseRepMid(-5), null);
	assert.equal(Analyzer.parseRepMid(-1), null);
	assert.equal(Analyzer.parseRepMid("-5"), null);
	assert.equal(Analyzer.parseRepMid("-8 - 12"), null);
	assert.equal(Analyzer.parseRepMid("8 - -12"), null);
	assert.equal(Analyzer.parseRepMid(-Infinity), null);
	assert.equal(Analyzer.parseRepMid(Infinity), null);
	assert.equal(Analyzer.parseRepMid(NaN), null);

	assert.equal(Analyzer.parseRepMid(10), 10);
	assert.equal(Analyzer.parseRepMid("10"), 10);
	assert.equal(Analyzer.parseRepMid("8-12"), 10);
	assert.equal(Analyzer.parseRepMid(0), 0);
});
