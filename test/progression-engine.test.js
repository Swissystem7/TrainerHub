const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const Progression = require("../js/progression-engine.js");
const SessionBuilder = require("../js/session-builder.js");

const mockCatalog = [
	{
		id: "pushups",
		he: "שכיבות סמיכה",
		muscles: ["chest", "triceps"],
		tags: ["chest", "strength"],
		level: "intermediate",
		equipment: ["none"],
		file: "pushups.mp4",
	},
	{
		id: "bench_press",
		he: "לחיצת חזה עם משקולות",
		muscles: ["chest"],
		tags: ["chest", "strength"],
		level: "intermediate",
		equipment: ["dumbbells"],
		file: "bench.mp4",
	},
	{
		id: "squats",
		he: "סקוואט",
		muscles: ["legs"],
		tags: ["legs", "strength"],
		level: "beginner",
		equipment: ["none"],
		file: "squats.mp4",
	},
	{
		id: "plank",
		he: "פלאנק סטטי",
		muscles: ["core"],
		tags: ["core"],
		level: "beginner",
		equipment: ["none"],
		file: "plank.mp4",
	},
];

// Test 1: ניתוח היסטוריה
test("analyzeExerciseHistory extracts sets, weights, reps, and RIR across sessions", () => {
	const sessions = [
		{
			doneAt: "2026-11-01T10:00:00Z",
			sets: [
				{ exerciseId: "bench_press", reps: 10, weightKg: 50, rir: 2 },
				{ exerciseId: "bench_press", reps: 10, weightKg: 50, rir: 2 },
			],
		},
		{
			doneAt: "2026-11-05T10:00:00Z",
			sets: [
				{ exerciseId: "bench_press", reps: 12, weightKg: 50, rir: 3 },
				{ exerciseId: "squats", reps: 15, weightKg: 40, rir: 2 },
			],
		},
	];

	const res = Progression.analyzeExerciseHistory(sessions, "bench_press");
	assert.equal(res.exerciseId, "bench_press");
	assert.equal(res.totalSessions, 2);
	assert.equal(res.totalSets, 3);
	assert.equal(res.maxWeight, 50);
	assert.equal(res.maxReps, 12);
	assert.ok(res.avgRir >= 2);
	assert.ok(res.lastSession);
	assert.equal(res.lastSession.maxReps, 12);
	assert.equal(res.lastSession.weightKg, 50);
});

// Test 2: המלצת העלאת עומס
test("recommendNextLoad recommends load increase when reaching top of rep range with RIR 2-3 in more than one session", () => {
	const history = {
		exerciseId: "bench_press",
		history: [
			{ date: "2026-11-01", reps: 12, weightKg: 60, rir: 2 },
			{ date: "2026-11-05", reps: 12, weightKg: 60, rir: 3 },
		],
		lastSession: { date: "2026-11-05", reps: 12, weightKg: 60, rir: 3 },
	};

	const rec = Progression.recommendNextLoad(history, "8-12");
	assert.equal(rec.action, "increase");
	assert.equal(rec.type, "increase");
	assert.ok(rec.suggestedWeight > 60);
	assert.equal(rec.suggestedReps, 8);
	assert.match(rec.message, /העלאת עומס/);
	assert.match(rec.reason, /קצה הטווח.*RIR 2-3/);
});

// Test 3: המלצת העלאת עומס במשקל גוף
test("recommendNextLoad handles bodyweight exercises and rep increases at top of range", () => {
	const history = [
		{ date: "2026-11-01", reps: 15, weightKg: 0, rir: 2 },
		{ date: "2026-11-05", reps: 15, weightKg: 0, rir: 2 },
	];

	const rec = Progression.recommendNextLoad(history, { min: 10, max: 15 });
	assert.equal(rec.action, "increase");
	assert.equal(rec.suggestedWeight, 0);
	assert.ok(rec.suggestedReps > 15);
	assert.match(rec.message, /העלאת עומס/);
});

// Test 4: שמירת עומס
test("recommendNextLoad recommends maintaining load when still progressing within target range or only 1 session at top", () => {
	// Sub-case A: progressing inside range (e.g. 10 reps in 8-12)
	const inProgressHistory = [
		{ date: "2026-11-01", reps: 9, weightKg: 50, rir: 2 },
		{ date: "2026-11-05", reps: 10, weightKg: 50, rir: 2 },
	];
	const recA = Progression.recommendNextLoad(inProgressHistory, "8-12");
	assert.equal(recA.action, "maintain");
	assert.equal(recA.suggestedWeight, 50);
	assert.match(recA.message, /שמירת עומס/);

	// Sub-case B: hit top of range only once (needs confirmation)
	const singleTopHistory = [
		{ date: "2026-11-01", reps: 10, weightKg: 50, rir: 2 },
		{ date: "2026-11-05", reps: 12, weightKg: 50, rir: 2 },
	];
	const recB = Progression.recommendNextLoad(singleTopHistory, "8-12");
	assert.equal(recB.action, "maintain");
	assert.match(recB.reason, /מפגש נוסף/);
});

// Test 5: הפחתה בעומס יתר / ירידת התאוששות
test("recommendNextLoad recommends load reduction or deload on recovery drop or excessive strain", () => {
	const historyWithRecoveryDrop = [
		{ date: "2026-11-01", reps: 12, weightKg: 70, rir: 2 },
		{
			date: "2026-11-05",
			reps: 6,
			weightKg: 70,
			rir: 0,
			recoveryDrop: true,
		},
	];

	const rec = Progression.recommendNextLoad(historyWithRecoveryDrop, "8-12");
	assert.equal(rec.action, "decrease");
	assert.equal(rec.type, "decrease");
	assert.ok(rec.suggestedWeight < 70);
	assert.match(rec.message, /הורדת עומס/);
	assert.match(rec.reason, /התאוששות|עומס יתר/);
});

// Test 6: מגמה שבועית
test("computeWeeklyTrend calculates weekly volume, session frequency, and adherence", () => {
	const sessions = [
		{
			doneAt: "2026-11-01T10:00:00Z",
			volume: 1000,
			sets: [{ reps: 10, weightKg: 50 }],
		},
		{
			doneAt: "2026-11-03T10:00:00Z",
			volume: 1200,
			sets: [{ reps: 12, weightKg: 50 }],
		},
		{
			doneAt: "2026-11-08T10:00:00Z",
			volume: 1500,
			sets: [{ reps: 10, weightKg: 60 }],
		},
		{
			doneAt: "2026-11-10T10:00:00Z",
			volume: 1600,
			sets: [{ reps: 12, weightKg: 60 }],
		},
	];

	const trend = Progression.computeWeeklyTrend(sessions);
	assert.ok(trend.totalVolume > 0);
	assert.equal(trend.sessionsCount, 4);
	assert.ok(trend.adherenceRate > 0);
	assert.ok(Array.isArray(trend.weeks));
	assert.ok(trend.weeks.length >= 1);
	assert.ok(typeof trend.message === "string" && trend.message.length > 0);
});

// Test 7: קלט ריק/null
test("progression engine functions handle empty, null, and invalid inputs gracefully without throwing", () => {
	assert.doesNotThrow(() => {
		const h1 = Progression.analyzeExerciseHistory(null, null);
		assert.equal(h1.totalSessions, 0);
		assert.equal(h1.history.length, 0);

		const h2 = Progression.analyzeExerciseHistory([], "");
		assert.equal(h2.totalSessions, 0);

		const rec1 = Progression.recommendNextLoad(null, null);
		assert.equal(rec1.action, "maintain");
		assert.ok(rec1.message);

		const rec2 = Progression.recommendNextLoad([], "8-12");
		assert.equal(rec2.action, "maintain");

		const trend1 = Progression.computeWeeklyTrend(null);
		assert.equal(trend1.totalVolume, 0);
		assert.equal(trend1.trend, "stable");

		const trend2 = Progression.computeWeeklyTrend([]);
		assert.equal(trend2.totalVolume, 0);
	});
});

// Test 8: אינטגרציה עם buildSession
test("buildSession integrates progression engine and attaches progressionHints from workout history", () => {
	// Call without history
	const sessionNoHistory = SessionBuilder.buildSession(
		"אימון חזה 20 דקות",
		mockCatalog,
	);
	assert.ok(Array.isArray(sessionNoHistory.progressionHints));
	assert.equal(sessionNoHistory.progressionHints.length, 0);

	// Call with history
	const mockHistory = [
		{
			doneAt: "2026-11-01T10:00:00Z",
			sets: [
				{ exerciseId: "bench_press", reps: 12, weightKg: 40, rir: 2 },
				{ exerciseId: "pushups", reps: 15, weightKg: 0, rir: 2 },
			],
		},
		{
			doneAt: "2026-11-05T10:00:00Z",
			sets: [
				{ exerciseId: "bench_press", reps: 12, weightKg: 40, rir: 3 },
				{ exerciseId: "pushups", reps: 15, weightKg: 0, rir: 3 },
			],
		},
	];

	const sessionWithHistory = SessionBuilder.buildSession(
		"אימון חזה עם משקולות 20 דקות",
		mockCatalog,
		{ sessions: mockHistory },
	);

	assert.ok(Array.isArray(sessionWithHistory.progressionHints));
	assert.ok(sessionWithHistory.progressionHints.length > 0);
	assert.ok(sessionWithHistory.workout.progressionHints);

	const benchHint = sessionWithHistory.progressionHints.find(
		(h) => h.exerciseId === "bench_press",
	);
	if (benchHint) {
		assert.equal(benchHint.action, "increase");
		assert.ok(benchHint.suggestedWeight > 40);
	}
});

// Test 9: וידוא journal.html וכרטיס המגמות
test("journal.html contains progression-trends-card and loads progression-engine.js safely", () => {
	const htmlPath = path.join(__dirname, "..", "journal.html");
	const html = fs.readFileSync(htmlPath, "utf8");

	assert.match(
		html,
		/id=["']progression-trends-card["']/,
		"journal.html must declare #progression-trends-card element",
	);
	assert.match(
		html,
		/src=["']\.\/js\/progression-engine\.js["']/,
		"journal.html must include progression-engine.js script",
	);
	assert.match(
		html,
		/renderProgressionTrends/,
		"journal.html must define renderProgressionTrends function",
	);

	// Ensure renderProgressionTrends uses safe DOM manipulation (no innerHTML on the card)
	const fnMatch = html.match(
		/function\s+renderProgressionTrends\s*\([\s\S]*?^ {2}\}/m,
	);
	assert.ok(fnMatch, "renderProgressionTrends function must be present");
	const fnBody = fnMatch[0];
	assert.ok(
		!fnBody.includes("innerHTML"),
		"renderProgressionTrends must NOT use innerHTML",
	);
	assert.ok(
		fnBody.includes("createElement"),
		"renderProgressionTrends must use createElement",
	);
	assert.ok(
		fnBody.includes("textContent"),
		"renderProgressionTrends must use textContent",
	);
});
