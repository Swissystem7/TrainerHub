const test = require("node:test");
const assert = require("node:assert/strict");
const Engine = require("../js/session-builder.js");

function entry(id, he, muscles) {
	return {
		id: id,
		he: he,
		muscles: muscles,
		equipment: ["none"],
		level: "beginner",
		file: `${he}.mp4`,
		source: "local",
	};
}

const CATALOG = {
	warmup: entry("warmup", "חימום", ["core"]),
	squat: entry("squat", "סקוואט", ["legs"]),
	pushup: entry("pushup", "שכיבות סמיכה", ["chest"]),
	plank: entry("plank", "פלאנק", ["core"]),
};

test("normalizeDurationMinutes maps negative/zero/NaN to 20 and keeps 30", () => {
	assert.equal(Engine.normalizeDurationMinutes(-15), 20);
	assert.equal(Engine.normalizeDurationMinutes(0), 20);
	assert.equal(Engine.normalizeDurationMinutes(Number.NaN), 20);
	assert.equal(Engine.normalizeDurationMinutes(30), 30);
});

test("negative requested duration becomes a 20-minute plan with no negative label", () => {
	const built = Engine.buildSession(
		{
			duration: -15,
			durationSpecified: true,
			muscles: [],
			equipment: [],
			level: null,
			goal: null,
		},
		CATALOG,
	);
	assert.equal(built.workout.duration_minutes, 20);
	assert.equal(built.request.duration, 20);
	assert.match(built.workout.title || "", /20\s*דקות/);
	assert.ok(!/[^0-9-](?:-15)\b/.test(built.workout.title || ""));
	assert.ok(!/(?:^|[^0-9])0\s*דקות/.test(built.workout.title || ""));
});

test("zero/NaN duration defaults to 20 minutes", () => {
	const zero = Engine.buildSession(
		{
			duration: 0,
			durationSpecified: true,
			muscles: [],
			equipment: [],
			level: null,
			goal: null,
		},
		CATALOG,
	);
	const nan = Engine.buildSession(
		{
			duration: Number.NaN,
			durationSpecified: true,
			muscles: [],
			equipment: [],
			level: null,
			goal: null,
		},
		CATALOG,
	);
	assert.equal(zero.workout.duration_minutes, 20);
	assert.equal(nan.workout.duration_minutes, 20);
});

test("valid duration 30 stays 30", () => {
	const built = Engine.buildSession(
		{
			duration: 30,
			durationSpecified: true,
			muscles: [],
			equipment: [],
			level: null,
			goal: null,
		},
		CATALOG,
	);
	assert.equal(built.workout.duration_minutes, 30);
	assert.equal(built.request.duration, 30);
	assert.match(built.workout.title || "", /30/);
});

test("buildSession never assigns duplicate exercises in single-focus session with duplicated catalog entries", () => {
	const duplicateCatalog = [
		entry("warmup", "חימום", ["legs"]),
		entry("squat", "סקוואט", ["legs"]),
		entry("squat", "סקוואט", ["legs"]),
		entry("squat", "סקוואט קלאסי", ["legs"]),
		entry("squat_alt", "סקוואט", ["legs"]),
		entry("lunges", "לאנג׳ים", ["legs"]),
		entry("lunges_clone", "לאנג׳ים", ["legs"]),
		entry("glute_bridge", "גשר ישבן", ["legs"]),
		entry("calf_raises", "עליות תאומים", ["legs"]),
		entry("step_ups", "עליות מדרגה", ["legs"]),
	];

	const built = Engine.buildSession(
		{
			focus: "legs",
			muscles: ["legs"],
			duration: 20,
			equipment: ["none"],
			level: "beginner",
			goal: null,
		},
		duplicateCatalog,
	);

	assert.ok(built.workout, "workout should be built");
	const mainExercises = built.workout.phases.find(
		(p) => p.name === "Main",
	).exercises;
	assert.ok(mainExercises.length >= 2, "should have picked multiple exercises");

	const seenIds = new Set();
	const seenNames = new Set();
	for (const ex of mainExercises) {
		assert.ok(!seenIds.has(ex.id), `duplicate exercise id found: ${ex.id}`);
		assert.ok(
			!seenNames.has(ex.name),
			`duplicate exercise name found: ${ex.name}`,
		);
		seenIds.add(ex.id);
		seenNames.add(ex.name);
	}
});

test("buildSession never assigns duplicate exercises in multi-exercise session across diverse groups", () => {
	const catalog = [
		entry("warmup", "חימום", ["core"]),
		entry("pushup", "שכיבות סמיכה", ["chest"]),
		entry("pushup", "שכיבות סמיכה רגילות", ["chest"]),
		entry("pushup_dup", "שכיבות סמיכה", ["chest"]),
		entry("squat", "סקוואט", ["legs"]),
		entry("squat", "סקוואט", ["legs"]),
		entry("squat_2", "סקוואט", ["legs"]),
		entry("pullup", "מתח", ["back"]),
		entry("pullup", "מתח", ["back"]),
		entry("plank", "פלאנק", ["core"]),
		entry("plank_dup", "פלאנק", ["core"]),
		entry("dips", "מקבילים", ["chest", "triceps"]),
		entry("lunges", "לאנג׳ים", ["legs"]),
	];

	const built = Engine.buildSession(
		{
			focus: "full",
			muscles: ["chest", "legs", "back", "core"],
			duration: 30,
			equipment: ["none"],
			level: "beginner",
			goal: null,
		},
		catalog,
	);

	assert.ok(built.workout, "workout should be built");
	const mainExercises = built.workout.phases.find(
		(p) => p.name === "Main",
	).exercises;
	assert.ok(
		mainExercises.length >= 3,
		"should have picked at least 3 exercises",
	);

	const ids = mainExercises.map((e) => e.id);
	const names = mainExercises.map((e) => e.name);
	assert.equal(
		new Set(ids).size,
		ids.length,
		"all exercise IDs must be unique",
	);
	assert.equal(
		new Set(names).size,
		names.length,
		"all exercise names must be unique",
	);
});

test("buildSession excludes warmup from Main phase by id even when name varies", () => {
	const catalog = [
		entry("warmup", "חימום כללי", ["core"]),
		entry("warmup", "חימום דינמי", ["core"]),
		entry("squat", "סקוואט", ["legs"]),
		entry("lunges", "לאנג׳ים", ["legs"]),
		entry("pushup", "שכיבות סמיכה", ["chest"]),
	];

	const built = Engine.buildSession(
		{
			focus: "full",
			muscles: [],
			duration: 20,
			equipment: ["none"],
			level: "beginner",
			goal: null,
		},
		catalog,
	);

	const warmPhase = built.workout.phases.find((p) => p.name === "Warm-up");
	const mainPhase = built.workout.phases.find((p) => p.name === "Main");

	assert.ok(
		warmPhase.exercises.length > 0,
		"Warm-up phase has warmup exercise",
	);
	for (const ex of mainPhase.exercises) {
		assert.notEqual(
			ex.id,
			"warmup",
			"Main phase must never contain warmup by id",
		);
		assert.ok(
			!/חימום/.test(ex.name),
			"Main phase must not contain warmup by name",
		);
	}
});

test("buildSession treats synonymous folded names as duplicates", () => {
	const catalog = [
		entry("warmup", "חימום", ["core"]),
		entry("sq1", "סקוואט", ["legs"]),
		entry("sq2", "  סקוואט  ", ["legs"]),
		entry("sq3", "״סקוואט״", ["legs"]),
		entry("lunges", "לאנג׳ים", ["legs"]),
		entry("bridge", "גשר ישבן", ["legs"]),
	];

	const built = Engine.buildSession(
		{
			focus: "legs",
			muscles: ["legs"],
			duration: 20,
			equipment: ["none"],
			level: "beginner",
			goal: null,
		},
		catalog,
	);

	const mainExercises = built.workout.phases.find(
		(p) => p.name === "Main",
	).exercises;
	const squatPicks = mainExercises.filter((e) => e.name.includes("סקוואט"));
	assert.equal(
		squatPicks.length,
		1,
		"only one squat variant should be selected",
	);
});
