const test = require("node:test");
const assert = require("node:assert/strict");
const {
	createLiveSession,
	logSetAndAdvance,
	tickTimer,
	saveLiveWorkoutToJournal,
} = require("../js/live-workout.js");

function createSampleWorkout() {
	return {
		title: "אימון כוח ובטן",
		phases: [
			{
				name: "Main",
				exercises: [
					{
						id: "squat",
						name: "סקוואט",
						sets: 2,
						reps: 8,
						weightKg: 60,
						rest_seconds: 60,
					},
					{
						id: "pushups",
						name: "שכיבות סמיכה",
						sets: 1,
						reps: 15,
						weightKg: 0,
						rest_seconds: 45,
					},
				],
			},
		],
	};
}

test("אתחול תקין של מפגש אימון חי", () => {
	const workout = createSampleWorkout();
	const state = createLiveSession(workout);

	assert.ok(state, "מפגש נוצר בהצלחה");
	assert.equal(state.status, "active");
	assert.equal(state.currentExerciseIndex, 0);
	assert.equal(state.currentSetIndex, 1);
	assert.equal(state.exercises.length, 2);
	assert.equal(state.exercises[0].id, "squat");
	assert.equal(state.exercises[0].name, "סקוואט");
	assert.equal(state.exercises[0].sets, 2);
	assert.equal(state.exercises[0].reps, 8);
	assert.equal(state.exercises[0].weightKg, 60);
	assert.equal(state.exercises[0].restSeconds, 60);
	assert.deepEqual(state.loggedSets, []);
	assert.equal(state.restRemaining, 0);
	assert.equal(state.workout, workout);
});

test("טיפול בטוח בקלט null או לא תקין", () => {
	const nullState = createLiveSession(null);
	assert.ok(nullState, "מפגש עבור null אינו זורק שגיאה");
	assert.equal(nullState.status, "completed");
	assert.equal(nullState.exercises.length, 0);
	assert.deepEqual(nullState.loggedSets, []);

	const undefinedState = createLiveSession(undefined);
	assert.equal(undefinedState.status, "completed");

	const emptyState = createLiveSession({});
	assert.equal(emptyState.status, "completed");
	assert.equal(emptyState.exercises.length, 0);
});

test("תיעוד סט ומעבר למנוחה", () => {
	const workout = createSampleWorkout();
	const state = createLiveSession(workout);

	logSetAndAdvance(state, {
		actualReps: 10,
		weightKg: 65,
		rir: 2,
	});

	assert.equal(state.loggedSets.length, 1);
	const logged = state.loggedSets[0];
	assert.equal(logged.exerciseIndex, 0);
	assert.equal(logged.exerciseName, "סקוואט");
	assert.equal(logged.setIndex, 1);
	assert.equal(logged.actualReps, 10);
	assert.equal(logged.weightKg, 65);
	assert.equal(logged.rir, 2);
	assert.equal(state.status, "rest");
	assert.equal(state.restRemaining, 60);
	assert.equal(state.restTimer, 60);
});

test("tickTimer סופר לאחור עד 0 ומעביר לסט הבא", () => {
	const workout = createSampleWorkout();
	const state = createLiveSession(workout);

	logSetAndAdvance(state, { actualReps: 8, weightKg: 60, rir: 1 });
	assert.equal(state.status, "rest");
	assert.equal(state.restRemaining, 60);

	tickTimer(state, 20);
	assert.equal(state.restRemaining, 40);
	assert.equal(state.status, "rest");

	tickTimer(state, 40);
	assert.equal(state.restRemaining, 0);
	assert.equal(state.status, "active");
	assert.equal(state.currentSetIndex, 2);
	assert.equal(state.currentExerciseIndex, 0);

	tickTimer(state, 10);
	assert.equal(state.restRemaining, 0);
	assert.equal(state.status, "active");
});

test("מעבר בין תרגילים לאחר סיום כל הסטים בתרגיל", () => {
	const workout = {
		title: "אימון 2 תרגילים",
		exercises: [
			{ name: "מתח", sets: 1, reps: 5, restSeconds: 30 },
			{ name: "מקבילים", sets: 1, reps: 10, restSeconds: 30 },
		],
	};
	const state = createLiveSession(workout);
	assert.equal(state.currentExerciseIndex, 0);
	assert.equal(state.exercises[0].name, "מתח");

	logSetAndAdvance(state, { actualReps: 6, weightKg: 0, rir: 1 });
	assert.equal(state.status, "rest");
	assert.equal(state.restRemaining, 30);

	tickTimer(state, 30);
	assert.equal(state.currentExerciseIndex, 1);
	assert.equal(state.currentSetIndex, 1);
	assert.equal(state.status, "active");
	assert.equal(state.exercises[state.currentExerciseIndex].name, "מקבילים");
});

test("השלמת אימון מלא ומעבר לסטטוס completed", () => {
	const workout = {
		title: "אימון קצר",
		exercises: [{ name: "פלאנק", sets: 1, reps: 1, restSeconds: 30 }],
	};
	const state = createLiveSession(workout);
	assert.equal(state.status, "active");

	logSetAndAdvance(state, { actualReps: 1, weightKg: 0, rir: 0 });
	assert.equal(state.status, "completed");
	assert.ok(state.completedAt, "תאריך סיום מעודכן");
	assert.equal(state.restRemaining, 0);

	const beforeCount = state.loggedSets.length;
	logSetAndAdvance(state, { actualReps: 1, weightKg: 0, rir: 0 });
	assert.equal(state.loggedSets.length, beforeCount);
	assert.equal(state.status, "completed");
});

test("שמירה תקינה של אימון חי ליומן trainerhub_live_journal", () => {
	const workout = createSampleWorkout();
	const state = createLiveSession(workout);
	logSetAndAdvance(state, { actualReps: 8, weightKg: 60, rir: 2 });

	const mockStorage = {
		store: {},
		getItem(key) {
			return this.store[key] || null;
		},
		setItem(key, val) {
			this.store[key] = String(val);
		},
	};

	const saved = saveLiveWorkoutToJournal(state, mockStorage);
	assert.equal(saved, true);

	const raw = mockStorage.getItem("trainerhub_live_journal");
	assert.ok(raw, "קיים ערך במפתח trainerhub_live_journal");

	const journal = JSON.parse(raw);
	assert.ok(Array.isArray(journal));
	assert.equal(journal.length, 1);
	assert.equal(journal[0].workoutTitle, "אימון כוח ובטן");
	assert.equal(journal[0].loggedSets.length, 1);
	assert.equal(journal[0].loggedSets[0].exerciseName, "סקוואט");
});

test("טיפול בשגיאת storage ללא קריסה", () => {
	const workout = createSampleWorkout();
	const state = createLiveSession(workout);
	logSetAndAdvance(state, { actualReps: 8, weightKg: 60, rir: 2 });

	const brokenStorage = {
		getItem() {
			throw new Error("Disk read failure");
		},
		setItem() {
			throw new Error("QuotaExceededError: LocalStorage quota exceeded");
		},
	};

	assert.doesNotThrow(() => {
		const res = saveLiveWorkoutToJournal(state, brokenStorage);
		assert.equal(res, false);
	}, "שגיאת אחסון נתפסת ולא מפילה את היישום");

	const nullStorageRes = saveLiveWorkoutToJournal(state, null);
	assert.equal(nullStorageRes, false);

	const nullStateRes = saveLiveWorkoutToJournal(null, brokenStorage);
	assert.equal(nullStateRes, false);
});
