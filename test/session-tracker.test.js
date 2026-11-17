const { test, beforeEach, afterEach } = require("node:test");
const assert = require("node:assert/strict");

const TH = require("../js/core.js");
const SessionTracker = require("../js/session-tracker.js");

var mem = {};
var originalLocalStorage;

function createMockStorage() {
	return {
		getItem: (k) => (Object.hasOwn(mem, k) ? mem[k] : null),
		setItem: (k, v) => {
			mem[k] = String(v);
		},
		removeItem: (k) => {
			delete mem[k];
		},
		clear: () => {
			mem = {};
		},
		get length() {
			return Object.keys(mem).length;
		},
		key: (i) => Object.keys(mem)[i] || null,
	};
}

beforeEach(() => {
	originalLocalStorage = global.localStorage;
	mem = {};
	global.localStorage = createMockStorage();
});

afterEach(() => {
	mem = {};
	if (originalLocalStorage !== undefined) {
		global.localStorage = originalLocalStorage;
	} else {
		delete global.localStorage;
	}
});

function statusOf(state, exerciseId) {
	var row = (state.exercises || []).find((e) => e.id === exerciseId);
	return row ? row.status : undefined;
}

function samplePlan() {
	return {
		title: "אימון בדיקה",
		duration_minutes: 25,
		phases: [
			{
				name: "Warm-up",
				exercises: [
					{ id: "warmup", name: "חימום", sets: 1, duration_seconds: 60 },
				],
			},
			{
				name: "Main",
				exercises: [
					{ id: "plank", name: "פלאנק", sets: 3, reps: "8-12" },
					{ id: "push_up", name: "שכיבות סמיכה", sets: 3, reps: "8-12" },
				],
			},
		],
	};
}

test("complete marks one exercise done and leaves others pending", () => {
	var plan = samplePlan();
	var session = SessionTracker.createSession(plan);
	var after = session.complete("plank");

	assert.equal(statusOf(after, "plank"), "done");
	assert.equal(statusOf(after, "push_up"), "pending");
	assert.equal(statusOf(after, "warmup"), "pending");
	assert.equal(statusOf(session.state(), "plank"), "done");
});

test("TH.createWorkoutSession exposes the same tracker API", () => {
	var session = TH.createWorkoutSession(samplePlan());
	assert.equal(typeof session.complete, "function");
	var state = session.complete("warmup");
	assert.equal(statusOf(state, "warmup"), "done");
	assert.equal(statusOf(state, "plank"), "pending");
});

test("TH.saveWorkoutSession and TH.loadWorkoutSession persist under TH.KEYS.activeSession and round-trip correctly", () => {
	var session = SessionTracker.createSession(samplePlan());
	session.complete("warmup");
	var originalState = session.state();

	var saved = TH.saveWorkoutSession(originalState);
	assert.equal(saved, true);

	// Verifying that it persists under TH.KEYS.activeSession in localStorage
	var rawInStorage = global.localStorage.getItem(TH.KEYS.activeSession);
	assert.ok(rawInStorage, "activeSession should be present in localStorage");
	assert.deepEqual(JSON.parse(rawInStorage), originalState);

	// Verifying that loadWorkoutSession round-trips correctly
	var loadedState = TH.loadWorkoutSession();
	assert.deepEqual(loadedState, originalState);
	assert.equal(statusOf(loadedState, "warmup"), "done");
	assert.equal(statusOf(loadedState, "plank"), "pending");
	assert.equal(statusOf(loadedState, "push_up"), "pending");
});

test("TH.saveWorkoutSession robustness when passed invalid inputs safely returns false", () => {
	var invalidInputs = [
		null,
		undefined,
		0,
		42,
		"",
		"invalid-session",
		true,
		false,
		{},
		{ workout: {} },
		{ exercises: null },
		{ exercises: undefined },
		{ exercises: "not-an-array" },
		{ exercises: 123 },
		{ exercises: {} },
	];

	invalidInputs.forEach((input) => {
		var result = TH.saveWorkoutSession(input);
		assert.equal(
			result,
			false,
			`Expected false for invalid input: ${JSON.stringify(input)}`,
		);
	});

	// Verify activeSession in localStorage was not set
	assert.equal(global.localStorage.getItem(TH.KEYS.activeSession), null);
});

test("TH.saveWorkoutSession storage error handling when localStorage throws returns false without unhandled exceptions", () => {
	var session = SessionTracker.createSession(samplePlan());
	var state = session.state();

	// Test QuotaExceededError
	global.localStorage = {
		getItem: () => null,
		setItem: () => {
			var err = new Error("QuotaExceededError");
			err.name = "QuotaExceededError";
			throw err;
		},
		removeItem: () => {},
	};

	assert.doesNotThrow(() => {
		var result = TH.saveWorkoutSession(state);
		assert.equal(result, false);
	});

	// Test blocked storage / SecurityError
	global.localStorage = {
		getItem: () => {
			throw new Error("SecurityError: blocked storage");
		},
		setItem: () => {
			throw new Error("SecurityError: blocked storage");
		},
		removeItem: () => {},
	};

	assert.doesNotThrow(() => {
		var result = TH.saveWorkoutSession(state);
		assert.equal(result, false);
	});
});

test("TH.loadWorkoutSession returns null when no session is saved", () => {
	global.localStorage.removeItem(TH.KEYS.activeSession);
	assert.equal(TH.loadWorkoutSession(), null);
});

test("SessionTracker.createSession robustness when invoked with null, empty object, or plan without phases", () => {
	var nullSession = SessionTracker.createSession(null);
	assert.deepEqual(nullSession.state().exercises, []);
	assert.deepEqual(nullSession.complete("any").exercises, []);

	var undefinedSession = SessionTracker.createSession(undefined);
	assert.deepEqual(undefinedSession.state().exercises, []);

	var emptyObjSession = SessionTracker.createSession({});
	assert.deepEqual(emptyObjSession.state().exercises, []);

	var noPhasesSession = SessionTracker.createSession({ title: "ללא שלבים" });
	assert.deepEqual(noPhasesSession.state().exercises, []);

	var nullPhasesSession = SessionTracker.createSession({
		title: "שלבים ריקים",
		phases: null,
	});
	assert.deepEqual(nullPhasesSession.state().exercises, []);

	var emptyPhasesSession = SessionTracker.createSession({
		title: "מערך ריק",
		phases: [],
	});
	assert.deepEqual(emptyPhasesSession.state().exercises, []);
});

test("session.complete with an invalid or unknown exercise ID keeps all items in their original status", () => {
	var plan = samplePlan();
	var session = SessionTracker.createSession(plan);

	// Complete warmup to establish non-trivial initial statuses
	session.complete("warmup");
	var beforeState = session.state();
	assert.equal(statusOf(beforeState, "warmup"), "done");
	assert.equal(statusOf(beforeState, "plank"), "pending");
	assert.equal(statusOf(beforeState, "push_up"), "pending");

	var invalidIds = [
		"unknown_exercise",
		"does_not_exist",
		"",
		null,
		undefined,
		12345,
		{},
		["arr"],
	];

	invalidIds.forEach((invalidId) => {
		var state = session.complete(invalidId);
		assert.deepEqual(state.exercises, beforeState.exercises);
		assert.equal(statusOf(state, "warmup"), "done");
		assert.equal(statusOf(state, "plank"), "pending");
		assert.equal(statusOf(state, "push_up"), "pending");
	});

	// Verify internal state matches beforeState
	assert.deepEqual(session.state().exercises, beforeState.exercises);
});

test("SessionTracker duration normalization: negative and NaN durations on workout and session are converted to 0", () => {
	// 1. createSession normalizes negative and NaN duration/duration_minutes on workoutPlan to 0
	var negPlan = {
		title: "Negative Duration Plan",
		duration: -15,
		duration_minutes: -30,
		phases: [{ exercises: [{ id: "pushup", name: "Push Up" }] }],
	};
	var session = SessionTracker.createSession(negPlan);
	var state = session.state();
	assert.equal(state.workout.duration, 0);
	assert.equal(state.workout.duration_minutes, 0);
	assert.equal(negPlan.duration, 0);
	assert.equal(negPlan.duration_minutes, 0);

	var nanPlan = {
		title: "NaN Duration Plan",
		duration: NaN,
		duration_minutes: NaN,
		phases: [{ exercises: [{ id: "pushup", name: "Push Up" }] }],
	};
	var nanSession = SessionTracker.createSession(nanPlan);
	var nanState = nanSession.state();
	assert.equal(nanState.workout.duration, 0);
	assert.equal(nanState.workout.duration_minutes, 0);

	// 2. saveSession normalizes negative and NaN durations on both session and workout
	var sessionToSave = {
		duration: -15,
		duration_minutes: NaN,
		workout: {
			title: "Workout with bad durations",
			duration: NaN,
			duration_minutes: -45,
		},
		exercises: [{ id: "pushup", status: "pending" }],
	};

	var saved = SessionTracker.saveSession(sessionToSave);
	assert.equal(saved, true);
	assert.equal(sessionToSave.duration, 0);
	assert.equal(sessionToSave.duration_minutes, 0);
	assert.equal(sessionToSave.workout.duration, 0);
	assert.equal(sessionToSave.workout.duration_minutes, 0);

	// Check saved state in storage and loadSession roundtrip
	var loaded = SessionTracker.loadSession();
	assert.ok(loaded);
	assert.equal(loaded.duration, 0);
	assert.equal(loaded.duration_minutes, 0);
	assert.equal(loaded.workout.duration, 0);
	assert.equal(loaded.workout.duration_minutes, 0);
});

test("SessionTracker converts negative durations to 0 during create, save, and load", () => {
	var session = SessionTracker.createSession({
		duration: -15,
		duration_minutes: -15,
		phases: [],
	});
	var createdState = session.state();
	assert.equal(createdState.workout.duration, 0);
	assert.equal(createdState.workout.duration_minutes, 0);

	var stateToSave = {
		duration: -15,
		duration_minutes: -15,
		exercises: [],
	};
	assert.equal(SessionTracker.saveSession(stateToSave), true);
	assert.equal(stateToSave.duration, 0);
	assert.equal(stateToSave.duration_minutes, 0);

	var loaded = SessionTracker.loadSession();
	assert.equal(loaded.duration, 0);
	assert.equal(loaded.duration_minutes, 0);
});

test("SessionTracker converts non-finite and non-numeric durations to 0", () => {
	[NaN, "abc", "15", Infinity].forEach((duration) => {
		var state = { duration: duration, exercises: [] };
		assert.equal(SessionTracker.saveSession(state), true);
		assert.equal(state.duration, 0);
		assert.equal(SessionTracker.loadSession().duration, 0);
	});
});

test("SessionTracker handles missing session exercises and null create input safely", () => {
	assert.doesNotThrow(() => {
		assert.equal(SessionTracker.saveSession(null), false);
		assert.equal(SessionTracker.saveSession(undefined), false);
		assert.equal(SessionTracker.saveSession({}), false);
		assert.equal(SessionTracker.saveSession({ duration: 10 }), false);
		assert.equal(SessionTracker.saveSession({ exercises: null }), false);
		assert.equal(SessionTracker.saveSession({ exercises: undefined }), false);
		assert.equal(SessionTracker.saveSession({ exercises: "missing" }), false);
		assert.equal(SessionTracker.saveSession({ exercises: [] }), true);
	});

	var nullSession = SessionTracker.createSession(null);
	assert.deepEqual(nullSession.state().exercises, []);
});

test("SessionTracker robustness with workouts without exercises or empty exercises array", () => {
	// 1. createSession with empty workout, empty phases, phases without exercises, or null/undefined
	var noPhasesPlan = { title: "No phases" };
	var s1 = SessionTracker.createSession(noPhasesPlan);
	assert.deepEqual(s1.state().exercises, []);
	assert.deepEqual(s1.complete("non_existent").exercises, []);

	var emptyPhasesPlan = { title: "Empty phases", phases: [] };
	var s2 = SessionTracker.createSession(emptyPhasesPlan);
	assert.deepEqual(s2.state().exercises, []);

	var emptyExercisePhasesPlan = {
		title: "Phases with empty exercises",
		phases: [
			{ name: "Warm-up", exercises: [] },
			{ name: "Main", exercises: null },
			{ name: "Cool", exercises: undefined },
		],
	};
	var s3 = SessionTracker.createSession(emptyExercisePhasesPlan);
	assert.deepEqual(s3.state().exercises, []);

	var nullPlanSession = SessionTracker.createSession(null);
	assert.deepEqual(nullPlanSession.state().exercises, []);

	var undefinedPlanSession = SessionTracker.createSession(undefined);
	assert.deepEqual(undefinedPlanSession.state().exercises, []);

	// 2. saveSession with empty exercises array succeeds safely without crashing
	var emptySession = {
		workout: { title: "Empty Workout" },
		exercises: [],
	};
	assert.doesNotThrow(() => {
		var saved = SessionTracker.saveSession(emptySession);
		assert.equal(saved, true);
	});

	var loaded = SessionTracker.loadSession();
	assert.ok(loaded);
	assert.deepEqual(loaded.exercises, []);

	// 3. Saving a session created from a workout with empty phases
	var savedEmptyFromCreate = SessionTracker.saveSession(s1.state());
	assert.equal(savedEmptyFromCreate, true);
});

test("SessionTracker.saveSession input and storage error handling", () => {
	// 1. Invalid sessionState inputs return false without throwing
	var invalidInputs = [
		null,
		undefined,
		0,
		1,
		-15,
		NaN,
		"",
		"not a session",
		true,
		false,
		{},
		{ workout: {} },
		{ duration: 10 },
		{ exercises: null },
		{ exercises: undefined },
		{ exercises: "not-an-array" },
		{ exercises: 123 },
		{ exercises: {} },
	];

	invalidInputs.forEach((input) => {
		assert.doesNotThrow(() => {
			var result = SessionTracker.saveSession(input);
			assert.equal(
				result,
				false,
				`Expected false for invalid input: ${String(input)}`,
			);
		});
	});

	// Verify storage was not modified by invalid inputs
	assert.equal(global.localStorage.getItem("trainerhub_active_session"), null);

	// 2. Storage throwing errors (QuotaExceededError, SecurityError, generic error) safely return false without throwing
	var validSession = {
		workout: { title: "Good workout" },
		exercises: [{ id: "ex1", status: "pending" }],
	};

	var quotaExceededStorage = {
		getItem: () => null,
		setItem: () => {
			var err = new Error("QuotaExceededError: quota exceeded");
			err.name = "QuotaExceededError";
			throw err;
		},
	};

	assert.doesNotThrow(() => {
		var res = SessionTracker.saveSession(validSession, quotaExceededStorage);
		assert.equal(res, false);
	});

	var securityErrorStorage = {
		getItem: () => {
			throw new Error("SecurityError: blocked");
		},
		setItem: () => {
			var err = new Error("SecurityError: access denied");
			err.name = "SecurityError";
			throw err;
		},
	};

	assert.doesNotThrow(() => {
		var res = SessionTracker.saveSession(validSession, securityErrorStorage);
		assert.equal(res, false);
	});

	// Storage error handling when global.localStorage throws
	global.localStorage = {
		getItem: () => {
			throw new Error("Global storage error");
		},
		setItem: () => {
			throw new Error("Global storage error");
		},
	};

	assert.doesNotThrow(() => {
		var res = SessionTracker.saveSession(validSession);
		assert.equal(res, false);
	});

	assert.doesNotThrow(() => {
		var loaded = SessionTracker.loadSession();
		assert.equal(loaded, null);
	});
});

test("loadSession returns null (no throw) for corrupted JSON", () => {
	mem[SessionTracker.STORAGE_KEY] = "{corrupted_workout";
	assert.doesNotThrow(() => {
		assert.equal(SessionTracker.loadSession(), null);
	});
});

test("loadSession returns null for empty string storage value", () => {
	mem[SessionTracker.STORAGE_KEY] = "";
	assert.doesNotThrow(() => {
		assert.equal(SessionTracker.loadSession(), null);
	});
});
