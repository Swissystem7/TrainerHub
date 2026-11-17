const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

globalThis.TH = {};
const CP = require("../js/coach-profiles.js");

function createMockStorage(initialData = {}) {
	const map = { ...initialData };
	return {
		getItem: (key) => (Object.hasOwn(map, key) ? map[key] : null),
		setItem: (key, val) => {
			map[key] = String(val);
		},
		removeItem: (key) => {
			delete map[key];
		},
		dump: () => map,
	};
}

test("1) יצירת פרופיל: createTraineeProfile יוצר פרופיל תקין עם מזהה ייחודי, רמה וציוד", () => {
	const profile = CP.createTraineeProfile(
		"דניאל כהן",
		"intermediate",
		"dumbbells",
	);
	assert.ok(profile, "profile must be returned");
	assert.equal(typeof profile.id, "string");
	assert.ok(profile.id.startsWith("trainee_"));
	assert.equal(profile.name, "דניאל כהן");
	assert.equal(profile.level, "intermediate");
	assert.equal(profile.equipment, "dumbbells");
	assert.equal(profile.assignedWorkout, null);
	assert.ok(Array.isArray(profile.assignedWorkouts));
	assert.equal(profile.assignedWorkouts.length, 0);
	assert.ok(profile.createdAt);
	assert.ok(profile.updatedAt);

	// Test default fallbacks for level and equipment
	const defaultProfile = CP.createTraineeProfile("שמרית לוי");
	assert.ok(defaultProfile);
	assert.equal(defaultProfile.name, "שמרית לוי");
	assert.equal(defaultProfile.level, "beginner");
	assert.equal(defaultProfile.equipment, "none");

	// Test creation with custom storage
	const storage = createMockStorage();
	const storedProfile = CP.createTraineeProfile(
		"אורי שליו",
		"advanced",
		"gym",
		storage,
	);
	assert.ok(storedProfile);
	const list = CP.listTraineeProfiles(storage);
	assert.equal(list.length, 1);
	assert.equal(list[0].id, storedProfile.id);
});

test("2) סינון קלט שם ריק: createTraineeProfile מחזיר null עבור שמות ריקים, רווחים בלבד או טיפוס שאינו מחרוזת", () => {
	assert.equal(CP.createTraineeProfile(""), null);
	assert.equal(CP.createTraineeProfile("   "), null);
	assert.equal(CP.createTraineeProfile(null), null);
	assert.equal(CP.createTraineeProfile(undefined), null);
	assert.equal(CP.createTraineeProfile(12345), null);
	assert.equal(CP.createTraineeProfile({}), null);
});

test("3) שמירה ושליפה מ-storage: listTraineeProfiles שולף פרופילים שנשמרו תחת trainerhub_coach_trainees", () => {
	const storage = createMockStorage();
	const p1 = CP.createTraineeProfile("מיכל לוי", "beginner", "band", storage);
	assert.ok(p1);

	const list1 = CP.listTraineeProfiles(storage);
	assert.equal(list1.length, 1);
	assert.equal(list1[0].id, p1.id);
	assert.equal(list1[0].name, "מיכל לוי");
	assert.equal(list1[0].level, "beginner");

	const p2 = CP.createTraineeProfile("רועי שרון", "advanced", "gym");
	const saved = CP.saveTraineeProfile(p2, storage);
	assert.equal(saved, true);

	const list2 = CP.listTraineeProfiles(storage);
	assert.equal(list2.length, 2);
	assert.equal(list2[1].name, "רועי שרון");

	// Update existing profile (idx >= 0)
	p2.level = "expert";
	const updated = CP.saveTraineeProfile(p2, storage);
	assert.equal(updated, true);
	const listUpdated = CP.listTraineeProfiles(storage);
	assert.equal(listUpdated.length, 2);
	assert.equal(listUpdated[1].level, "expert");

	// Verify storage key is trainerhub_coach_trainees
	assert.ok(storage.dump()[CP.STORAGE_KEY]);
	const rawData = JSON.parse(storage.dump()[CP.STORAGE_KEY]);
	assert.equal(rawData.length, 2);

	// Verify removeItem method
	storage.removeItem(CP.STORAGE_KEY);
	assert.equal(storage.getItem(CP.STORAGE_KEY), null);
	assert.deepEqual(CP.listTraineeProfiles(storage), []);

	// Validate rejection of invalid profile payload
	assert.equal(CP.saveTraineeProfile(null, storage), false);
	assert.equal(CP.saveTraineeProfile({}, storage), false);
	assert.equal(CP.saveTraineeProfile({ id: "only_id" }, storage), false);
	assert.equal(CP.saveTraineeProfile({ name: "only_name" }, storage), false);

	// Support plain dictionary object storage without getItem/setItem methods
	const plainDictStorage = {};
	const pDict = CP.createTraineeProfile(
		"נועה אלון",
		"beginner",
		"dumbbells",
		plainDictStorage,
	);
	assert.ok(pDict);
	const dictList = CP.listTraineeProfiles(plainDictStorage);
	assert.equal(dictList.length, 1);
	assert.equal(dictList[0].name, "נועה אלון");

	// Fallback to globalThis.localStorage when storage parameter is omitted
	globalThis.localStorage = createMockStorage();
	const pLocal = CP.createTraineeProfile(
		"עומר גולן",
		"intermediate",
		"kettlebell",
	);
	assert.equal(CP.saveTraineeProfile(pLocal), true);
	const localList = CP.listTraineeProfiles();
	assert.equal(localList.length, 1);
	assert.equal(localList[0].name, "עומר גולן");
	delete globalThis.localStorage;
});

test("4) עמידות לשגיאת storage: פונקציות האחסון אינן קורסות כשה-storage זורק שגיאה ומחזירות ערכי מחדל בטוחים", () => {
	const throwingGetStorage = {
		getItem: () => {
			throw new Error("QuotaExceededError: LocalStorage limit reached");
		},
		setItem: () => {},
	};

	const throwingSetStorage = {
		getItem: () => "[]",
		setItem: () => {
			throw new Error("SecurityError: Storage is disabled");
		},
	};

	assert.doesNotThrow(() => {
		const list = CP.listTraineeProfiles(throwingGetStorage);
		assert.deepEqual(list, []);
	});

	assert.doesNotThrow(() => {
		const saveRes = CP.saveTraineeProfile(
			{ id: "t1", name: "בדיקה" },
			throwingSetStorage,
		);
		assert.equal(saveRes, false);
	});

	// Storage error during setItem in assignWorkoutToTrainee when trainee exists
	const throwingSetStorageWithTrainee = {
		getItem: () => JSON.stringify([{ id: "t_error", name: "מתאמן תקול" }]),
		setItem: () => {
			throw new Error("SecurityError: Storage is disabled");
		},
	};

	assert.doesNotThrow(() => {
		const assignRes = CP.assignWorkoutToTrainee(
			"t_error",
			{ title: "אימון 1" },
			throwingSetStorageWithTrainee,
		);
		assert.equal(assignRes, null);
	});

	// LocalStorage throws upon access
	Object.defineProperty(globalThis, "localStorage", {
		get() {
			throw new Error("SecurityError: localStorage blocked");
		},
		configurable: true,
	});

	assert.doesNotThrow(() => {
		assert.deepEqual(CP.listTraineeProfiles(), []);
		assert.equal(CP.saveTraineeProfile({ id: "t1", name: "שם" }), false);
		assert.equal(CP.assignWorkoutToTrainee("t1", { title: "אימון" }), null);
	});

	delete globalThis.localStorage;

	// Corrupted JSON recovery
	const corruptStorage = {
		getItem: () => "{not valid json",
		setItem: () => {},
	};
	assert.deepEqual(CP.listTraineeProfiles(corruptStorage), []);

	// Non-array JSON in storage
	const nonArrayStorage = {
		getItem: () => '{"key":"value"}',
		setItem: () => {},
	};
	assert.deepEqual(CP.listTraineeProfiles(nonArrayStorage), []);

	// Storage unavailable / null returns safe defaults
	assert.deepEqual(CP.listTraineeProfiles(null), []);
	assert.equal(CP.saveTraineeProfile({ id: "t1", name: "שם" }, null), false);
	assert.equal(CP.assignWorkoutToTrainee("t1", {}, null), null);
});

test("5) שיוך אימון למתאמן קיים: assignWorkoutToTrainee משייך אימון למתאמן ומעדכן את האחסון", () => {
	const storage = createMockStorage();
	const trainee = CP.createTraineeProfile(
		"יונתן ישראלי",
		"intermediate",
		"dumbbells",
		storage,
	);
	assert.ok(trainee);

	const workout = {
		title: "אימון כוח פלג גוף עליון A",
		duration_minutes: 45,
		phases: [{ exercises: [{ name: "שכיבות סמיכה" }, { name: "מתח" }] }],
	};

	const updated = CP.assignWorkoutToTrainee(trainee.id, workout, storage);
	assert.ok(updated, "updated trainee must be returned");
	assert.equal(updated.assignedWorkout.title, "אימון כוח פלג גוף עליון A");
	assert.equal(updated.assignedWorkouts.length, 1);
	assert.equal(updated.assignedWorkouts[0].title, "אימון כוח פלג גוף עליון A");

	const list = CP.listTraineeProfiles(storage);
	assert.equal(list.length, 1);
	assert.equal(list[0].assignedWorkout.title, "אימון כוח פלג גוף עליון A");

	// Trainee with missing or non-array assignedWorkouts (e.g. legacy data)
	const legacyTrainee = {
		id: "legacy_999",
		name: "מתאמן ישן",
		assignedWorkouts: null,
	};
	const legacyStorage = createMockStorage({
		[CP.STORAGE_KEY]: JSON.stringify([legacyTrainee]),
	});
	const assignedLegacy = CP.assignWorkoutToTrainee(
		"legacy_999",
		{ title: "אימון משודרג" },
		legacyStorage,
	);
	assert.ok(assignedLegacy);
	assert.ok(Array.isArray(assignedLegacy.assignedWorkouts));
	assert.equal(assignedLegacy.assignedWorkouts.length, 1);
	assert.equal(assignedLegacy.assignedWorkout.title, "אימון משודרג");

	// Assigning null workout clears current assignedWorkout
	const cleared = CP.assignWorkoutToTrainee("legacy_999", null, legacyStorage);
	assert.ok(cleared);
	assert.equal(cleared.assignedWorkout, null);
});

test("6) שיוך למתאמן לא קיים: assignWorkoutToTrainee מחזיר null עבור מזהה שאינו קיים באחסון", () => {
	const storage = createMockStorage();
	CP.createTraineeProfile("מתאמן קיים", "beginner", "none", storage);

	const workout = { title: "אימון בדיקה" };
	const res = CP.assignWorkoutToTrainee(
		"non_existent_trainee_id_999",
		workout,
		storage,
	);
	assert.equal(res, null);

	// Missing traineeId or falsy id
	assert.equal(CP.assignWorkoutToTrainee("", workout, storage), null);
	assert.equal(CP.assignWorkoutToTrainee(null, workout, storage), null);

	const list = CP.listTraineeProfiles(storage);
	assert.equal(list.length, 1);
	assert.equal(list[0].name, "מתאמן קיים");
	assert.equal(list[0].assignedWorkout, null);
});

test("7) הפקת סיכום טקסט: exportTraineeSummaryText מפיק סיכום מפורט וברור של הפרופיל והאימון", () => {
	assert.equal(CP.exportTraineeSummaryText(null), "");
	assert.equal(CP.exportTraineeSummaryText({}), "");
	assert.equal(CP.exportTraineeSummaryText({ name: "   " }), "");

	const traineeWithoutWorkout = {
		name: "תמר אברהם",
		level: "ביניים",
		equipment: "גומיות",
	};
	const summary1 = CP.exportTraineeSummaryText(traineeWithoutWorkout);
	assert.ok(summary1.includes("פרופיל מתאמן: תמר אברהם"));
	assert.ok(summary1.includes("רמה: ביניים"));
	assert.ok(summary1.includes("ציוד: גומיות"));
	assert.ok(summary1.includes("אימון משויך: ללא"));

	const traineeWithWorkout = {
		name: "תמר אברהם",
		level: "מתקדם",
		equipment: ["משקולות", "מתח"],
		assignedWorkout: {
			title: "אימון מפוצל B",
			duration_minutes: 50,
			exercises: ["לחיצת חזה", "חתירה", "פרפר"],
		},
	};
	const summary2 = CP.exportTraineeSummaryText(traineeWithWorkout);
	assert.ok(summary2.includes("פרופיל מתאמן: תמר אברהם"));
	assert.ok(summary2.includes("אימון משויך: אימון מפוצל B"));
	assert.ok(summary2.includes("משך זמן: 50 דקות"));
	assert.ok(summary2.includes("מספר תרגילים: 3"));

	// Fallback to assignedWorkouts when assignedWorkout is null
	const traineeFromHistory = {
		name: "אילן דהן",
		level: "",
		equipment: "",
		assignedWorkout: null,
		assignedWorkouts: [
			{
				name: "אימון מחזורי מותאם",
				duration: 35,
				phases: [
					{ exercises: [{ name: "סקוואט" }, { name: "לאנג'" }] },
					{ exercises: [{ name: "שכיבות סמיכה" }] },
				],
			},
		],
	};
	const summary3 = CP.exportTraineeSummaryText(traineeFromHistory);
	assert.ok(summary3.includes("פרופיל מתאמן: אילן דהן"));
	assert.ok(summary3.includes("רמה: לא צוין"));
	assert.ok(summary3.includes("ציוד: משקל גוף"));
	assert.ok(summary3.includes("אימון משויך: אימון מחזורי מותאם"));
	assert.ok(summary3.includes("משך זמן: 35 דקות"));
	assert.ok(summary3.includes("מספר תרגילים: 3"));
});

test("8) קיום הממשק ב-journal.html וב-exercises.html: חיבור coach-profiles.js, קיום id=coach-trainees-panel וקישור ניווט למצב מאמן", () => {
	const journalHtml = fs.readFileSync(
		path.join(__dirname, "..", "journal.html"),
		"utf8",
	);
	const exercisesHtml = fs.readFileSync(
		path.join(__dirname, "..", "exercises.html"),
		"utf8",
	);

	// Verify coach-profiles.js is connected in journal.html
	assert.match(
		journalHtml,
		/<script\s+src=["']\.\/js\/coach-profiles\.js["']><\/script>/,
	);

	// Verify panel id='coach-trainees-panel' exists
	assert.match(journalHtml, /id=["']coach-trainees-panel["']/);

	// Verify safe rendering with createElement and textContent in renderCoachTraineesPanel
	assert.match(journalHtml, /function\s+renderCoachTraineesPanel\s*\(/);
	assert.match(journalHtml, /coachTraineesHeading/);

	// Verify navigation link from exercises.html to coach mode
	assert.match(
		exercisesHtml,
		/<a\s+href=["']\.\/journal\.html#coach-trainees-panel["']>מצב מאמן<\/a>/,
	);

	// Verify global attachment to window/globalThis and TH namespace
	assert.ok(globalThis.THCoachProfiles);
	assert.ok(globalThis.TH.CoachProfiles);
	assert.equal(typeof globalThis.TH.createTraineeProfile, "function");
	assert.equal(typeof globalThis.TH.listTraineeProfiles, "function");
	assert.equal(typeof globalThis.TH.assignWorkoutToTrainee, "function");
	assert.equal(typeof globalThis.TH.exportTraineeSummaryText, "function");
});
