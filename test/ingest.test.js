const test = require("node:test");
const assert = require("node:assert/strict");

const mem = {};
global.localStorage = {
	getItem: (k) => (Object.hasOwn(mem, k) ? mem[k] : null),
	setItem: (k, v) => {
		mem[k] = String(v);
	},
	removeItem: (k) => {
		delete mem[k];
	},
};

const TH = require("../js/core.js");
const Ingest = require("../js/ingest.js");

const CATALOG = [
	{
		id: "plank",
		he: "פלאנק",
		muscles: ["core"],
		equipment: ["none"],
		level: "beginner",
		file: "פלאנק.mp4",
		source: "local",
	},
	{
		id: "drive_פלאנק",
		he: "פלאנק",
		muscles: ["core"],
		equipment: ["none"],
		level: "beginner",
		driveId: "drv1",
		source: "drive",
	},
	{
		id: "אתגר_שכיבות_שמיכה",
		he: "אתגר שכיבות שמיכה",
		muscles: ["chest"],
		equipment: ["none"],
		level: "beginner",
		driveId: "drv2",
		source: "drive",
	},
	{
		id: "mountain_climber",
		he: "מטפס הרים",
		muscles: ["core"],
		equipment: ["none"],
		level: "beginner",
		file: "מטפס הרים.mp4",
		source: "local",
	},
];

TH.setCatalog(
	CATALOG.reduce((acc, e) => {
		acc[e.id] = e;
		return acc;
	}, {}),
);

test("ingest parses a compact Hebrew circuit into sets, timed work, reps, and rest", () => {
	const out = Ingest.ingestText(
		"3 סבבים: 40 שניות פלאנק, 15 שכיבות שמיכה, 20 מטפס הרים, דקה מנוחה",
		CATALOG,
	);
	assert.equal(out.defaults.sets, 3);
	const names = out.exercises.map((e) => e.name);
	assert.ok(names.some((n) => /פלאנק/.test(n)));
	assert.ok(names.some((n) => /שכיבות/.test(n)));
	assert.ok(names.some((n) => /מטפס/.test(n)));
	assert.ok(!names.some((n) => /מנוחה/.test(n)));
	const plank = out.exercises.filter((e) => /פלאנק/.test(e.name))[0];
	assert.equal(plank.duration_seconds, 40);
	assert.equal(plank.sets, 3);
	const push = out.exercises.filter((e) => /שכיבות/.test(e.name))[0];
	assert.equal(push.reps, 15);
	assert.equal(out.exercises[out.exercises.length - 1].rest_seconds, 60);
});

test("ingest matches synonyms and the common סמיכה/שמיכה misspelling onto a catalog clip", () => {
	const byMisspelling = Ingest.matchName("שכיבות סמיכה", CATALOG);
	assert.ok(byMisspelling);
	assert.equal(byMisspelling.id, "אתגר_שכיבות_שמיכה");
	const byAlias = Ingest.matchName("מאונטיין קליימר", CATALOG);
	assert.ok(byAlias);
	assert.equal(byAlias.id, "mountain_climber");
});

test("unmatched ingest exercises stay as text, are flagged, and join the film-wishlist", () => {
	Object.keys(mem).forEach((k) => {
		delete mem[k];
	});
	const out = Ingest.ingestText("3 סבבים: 10 בורפי, 40 שניות פלאנק", CATALOG);
	const burpee = out.exercises.filter((e) => /בורפי/.test(e.name))[0];
	const plank = out.exercises.filter((e) => /פלאנק/.test(e.name))[0];
	assert.ok(burpee);
	assert.equal(burpee.missing, true);
	assert.equal(burpee.id, null);
	assert.equal(plank.missing, false);
	assert.ok(plank.id);
	assert.ok(out.unmatched.indexOf(burpee.name) !== -1);
	assert.ok(out.wishlist.some((w) => /בורפי/.test(w.he)));
});

test("saveSegment refuses a reverse time range and stores a playable Drive clip slice", () => {
	const bad = Ingest.saveSegment({
		driveId: "drvLong",
		he: "פלאנק צידי",
		startSec: 40,
		endSec: 10,
	});
	assert.equal(bad.error, "bad-range");
	const ok = Ingest.saveSegment({
		driveId: "drvLong",
		he: "פלאנק צידי",
		startSec: 12,
		endSec: 40,
	});
	assert.ok(ok.entry);
	assert.equal(ok.entry.driveId, "drvLong");
	assert.equal(ok.entry.startSec, 12);
	assert.equal(ok.entry.endSec, 40);
	assert.equal(ok.entry.source, "drive");
	assert.ok(ok.entry.id);
});

test("ingest treats שנ as seconds and strips a Hebrew title before the colon", () => {
	const out = Ingest.ingestText(
		"אימון ליבה: 3 סבבים: 40 שנ פלאנק, 15 שכיבות שמיכה, דקה מנוחה",
		CATALOG,
	);
	assert.equal(out.defaults.sets, 3);
	const plank = out.exercises.filter((e) => /פלאנק/.test(e.name))[0];
	assert.ok(plank);
	assert.equal(plank.duration_seconds, 40);
	assert.equal(plank.reps, null);
	assert.equal(plank.name, "פלאנק");
	assert.ok(!out.exercises.some((e) => /אימון/.test(e.name)));
	const push = out.exercises.filter((e) => /שכיבות/.test(e.name))[0];
	assert.equal(push.reps, 15);
	assert.equal(push.id, "אתגר_שכיבות_שמיכה");
	assert.equal(out.exercises[out.exercises.length - 1].rest_seconds, 60);
});

test("ingest reads N סבבים without a colon and work/rest defaults before the list", () => {
	const lined = Ingest.ingestText(
		"3 סבבים\n40 שנ פלאנק\n15 שכיבות שמיכה\nמנוחה דקה",
		CATALOG,
	);
	assert.equal(lined.defaults.sets, 3);
	assert.ok(!lined.exercises.some((e) => /^סבבים$/.test(e.name)));
	const plank = lined.exercises.filter((e) => /פלאנק/.test(e.name))[0];
	assert.equal(plank.duration_seconds, 40);
	assert.equal(plank.sets, 3);
	assert.equal(plank.rest_seconds, 60);

	const timed = Ingest.ingestText(
		"עבודה 40 שניות מנוחה 20 שניות: פלאנק, מטפס הרים",
		CATALOG,
	);
	assert.equal(timed.defaults.workSeconds, 40);
	assert.equal(timed.defaults.rest, 20);
	assert.equal(timed.exercises.length, 2);
	assert.equal(timed.exercises[0].name, "פלאנק");
	assert.equal(timed.exercises[0].duration_seconds, 40);
	assert.equal(timed.exercises[0].rest_seconds, 20);
	assert.equal(timed.exercises[1].name, "מטפס הרים");
});

test("parseExerciseToken drops a leftover × after sets × duration", () => {
	const parsed = Ingest.parseExerciseToken("פלאנק - 3 סטים × 45 שניות", {
		sets: null,
	});
	assert.equal(parsed.name, "פלאנק");
	assert.equal(parsed.sets, 3);
	assert.equal(parsed.duration_seconds, 45);
});

test('"12 שני הצדדים" is 12 reps per side, not a 12-second exercise', () => {
	const alone = Ingest.parseExerciseToken("12 שני הצדדים", { sets: null });
	assert.equal(alone.duration_seconds, null);
	assert.equal(alone.reps, 12);
	assert.equal(alone.name, "שני הצדדים");
	const named = Ingest.parseExerciseToken("מכרעים 12 שני הצדדים", {
		sets: null,
	});
	assert.equal(named.duration_seconds, null);
	assert.equal(named.name, "מכרעים");
	assert.equal(named.reps, 12);
	assert.ok(/לכל צד/.test(named.notes));
	// The short seconds spellings still read as seconds.
	assert.equal(
		Ingest.parseExerciseToken("30 שנ פלאנק", { sets: null }).duration_seconds,
		30,
	);
	assert.equal(
		Ingest.parseExerciseToken("פלאנק 30 שנ׳", { sets: null }).duration_seconds,
		30,
	);
	assert.equal(
		Ingest.parseExerciseToken("פלאנק 30 שנ'", { sets: null }).duration_seconds,
		30,
	);
	assert.equal(Ingest.scanDefaults("עבודה 40 שני סטים").workSeconds, null);
});

test("a rest or work line does not borrow the seconds of the line next to it", () => {
	const d = Ingest.scanDefaults(
		"3 סבבים\nסקוואט 15\nשכיבות שמיכה 10\nפלאנק 30 שניות\nמנוחה דקה",
	);
	assert.equal(d.sets, 3);
	assert.equal(d.rest, 60);
	assert.equal(d.workSeconds, null);
	assert.equal(
		Ingest.scanDefaults("פלאנק 40 שניות\nעבודה בזוגות").workSeconds,
		null,
	);
	assert.equal(Ingest.scanDefaults("מנוחה\n30 שניות פלאנק").rest, null);
	assert.equal(Ingest.scanDefaults("עבודה\n30 שניות פלאנק").workSeconds, null);
	// Same-line phrasing keeps working.
	assert.equal(Ingest.scanDefaults("30 שניות מנוחה").rest, 30);
	assert.equal(Ingest.scanDefaults("מנוחה 20 שנ׳").rest, 20);
	assert.equal(Ingest.scanDefaults("40 שניות עבודה").workSeconds, 40);
	assert.equal(Ingest.scanDefaults("עבודה 40 שנ").workSeconds, 40);
});

test("toWorkout returns default empty workout object for null input", () => {
	const readyWorkouts = require("../js/ready-workouts.js");
	const result = readyWorkouts.toWorkout(null);
	assert.deepEqual(result, {
		title: "",
		duration_minutes: 0,
		participants: 0,
		equipment: [],
		phases: [],
		intensity: "",
		tags: [],
	});
});

test("safe handling of null, empty strings, and malformed inputs across Ingest API methods (TH-S30)", () => {
	// 1. Ingest.ingestText(null) and Ingest.ingestText('') return an empty workout object with empty exercises/unmatched/wishlist arrays and null defaults without throwing.
	for (const emptyInput of [null, ""]) {
		const res = Ingest.ingestText(emptyInput);
		assert.ok(res);
		assert.ok(res.workout && typeof res.workout === "object");
		assert.deepEqual(res.exercises, []);
		assert.deepEqual(res.unmatched, []);
		assert.ok(Array.isArray(res.wishlist));
		assert.deepEqual(res.defaults, {
			sets: null,
			rest: null,
			workSeconds: null,
		});
	}

	// 2. Ingest.parseExerciseToken(null) and Ingest.parseExerciseToken('') return null safely.
	assert.equal(Ingest.parseExerciseToken(null), null);
	assert.equal(Ingest.parseExerciseToken(""), null);

	// 3. Ingest.scanDefaults(null) and Ingest.scanDefaults('') return { sets: null, rest: null, workSeconds: null } without throwing.
	assert.deepEqual(Ingest.scanDefaults(null), {
		sets: null,
		rest: null,
		workSeconds: null,
	});
	assert.deepEqual(Ingest.scanDefaults(""), {
		sets: null,
		rest: null,
		workSeconds: null,
	});

	// 4. Ingest.isRestToken(null) and Ingest.isRestToken('') return false without throwing.
	assert.equal(Ingest.isRestToken(null), false);
	assert.equal(Ingest.isRestToken(""), false);

	// 5. Ingest.saveSegment(null) and Ingest.saveSegment({}) safely return { error: 'need-drive', ... } without throwing.
	const nullSegment = Ingest.saveSegment(null);
	assert.ok(nullSegment);
	assert.equal(nullSegment.error, "need-drive");
	const emptySegment = Ingest.saveSegment({});
	assert.ok(emptySegment);
	assert.equal(emptySegment.error, "need-drive");

	// 6. Ingest.patternScore(null) returns 0; Ingest.wishlistAdd(null) and Ingest.wishlistRemove(null) return arrays safely.
	assert.equal(Ingest.patternScore(null), 0);
	assert.ok(Array.isArray(Ingest.wishlistAdd(null)));
	assert.ok(Array.isArray(Ingest.wishlistRemove(null)));
});
