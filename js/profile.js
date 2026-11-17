/**
 * TrainerHub — פרופיל מתאמן (ציוד ומגבלות) לפי מזהה לקוח.
 * הרחבה לפי מפרט מחקרי להרכב גוף (17 שדות R1-R26).
 * Classic script / CommonJS. Namespace: window.THClientProfile
 */
((root) => {
	

	var TH = root.TH;
	if (typeof module === "object" && module.exports) {
		TH = require("./core.js");
	}

	var PERSONALIZATION_DEFAULTS = {
		sex: "unspecified",
		age: null,
		heightCm: null,
		weightKg: null,
		waistCm: null,
		hipCm: null,
		whr: null,
		bodyFatPct: null,
		bodyFatMethod: "unknown",
		experience: "beginner",
		goal: "general",
		targetRegion: [],
		limitations: [],
		daysPerWeek: 3,
		equipment: [],
		sleepHours: null,
		perfTrend: "flat",
		medicalFlag: false,
		medicalConditions: [],
		cardioPref: "none",
		somatotype: null,
	};

	var UNSOURCED_GAPS = {
		highBodyFatThreshold: "TODO/config",
		leanThreshold: "TODO/config",
		strengthRestRule: "TODO/config",
		singleSessionPerWeekRule: "TODO/config",
		ageDosingRule: "TODO/config",
	};

	function normalizeProfile(raw) {
		raw = raw && typeof raw === "object" ? raw : {};
		return {
			equipment: Array.isArray(raw.equipment) ? raw.equipment.slice() : [],
			limitations: Array.isArray(raw.limitations)
				? raw.limitations.slice()
				: [],
		};
	}

	function normalizePersonalizationProfile(raw) {
		raw = raw && typeof raw === "object" ? raw : {};
		var base = normalizeProfile(raw);
		var res = Object.assign({}, PERSONALIZATION_DEFAULTS, {
			equipment: base.equipment,
			limitations: base.limitations,
		});

		if (
			raw.sex === "male" ||
			raw.sex === "female" ||
			raw.sex === "unspecified"
		) {
			res.sex = raw.sex;
		}
		if (
			typeof raw.age === "number" &&
			!Number.isNaN(raw.age) &&
			raw.age >= 18 &&
			raw.age <= 90
		) {
			res.age = Math.floor(raw.age);
		}
		if (
			typeof raw.heightCm === "number" &&
			!Number.isNaN(raw.heightCm) &&
			raw.heightCm >= 120 &&
			raw.heightCm <= 230
		) {
			res.heightCm = raw.heightCm;
		}
		if (
			typeof raw.weightKg === "number" &&
			!Number.isNaN(raw.weightKg) &&
			raw.weightKg >= 30 &&
			raw.weightKg <= 250
		) {
			res.weightKg = raw.weightKg;
		}
		if (
			typeof raw.waistCm === "number" &&
			!Number.isNaN(raw.waistCm) &&
			raw.waistCm >= 40 &&
			raw.waistCm <= 200
		) {
			res.waistCm = raw.waistCm;
		}
		if (
			typeof raw.hipCm === "number" &&
			!Number.isNaN(raw.hipCm) &&
			raw.hipCm >= 50 &&
			raw.hipCm <= 200
		) {
			res.hipCm = raw.hipCm;
		}
		if (res.waistCm && res.hipCm) {
			res.whr = Math.round((res.waistCm / res.hipCm) * 100) / 100;
		} else if (typeof raw.whr === "number" && !Number.isNaN(raw.whr)) {
			res.whr = raw.whr;
		}
		if (
			typeof raw.bodyFatPct === "number" &&
			!Number.isNaN(raw.bodyFatPct) &&
			raw.bodyFatPct >= 3 &&
			raw.bodyFatPct <= 60
		) {
			res.bodyFatPct = raw.bodyFatPct;
		}
		if (raw.bodyFatMethod && typeof raw.bodyFatMethod === "string") {
			res.bodyFatMethod = raw.bodyFatMethod;
		}
		if (
			raw.experience === "beginner" ||
			raw.experience === "intermediate" ||
			raw.experience === "advanced"
		) {
			res.experience = raw.experience;
		}
		if (raw.goal && typeof raw.goal === "string") {
			res.goal = raw.goal;
		}
		if (Array.isArray(raw.targetRegion)) {
			res.targetRegion = raw.targetRegion.slice();
		} else if (typeof raw.targetRegion === "string" && raw.targetRegion.trim()) {
			res.targetRegion = [raw.targetRegion.trim()];
		}
		if (
			typeof raw.daysPerWeek === "number" &&
			!Number.isNaN(raw.daysPerWeek) &&
			raw.daysPerWeek >= 1 &&
			raw.daysPerWeek <= 7
		) {
			res.daysPerWeek = Math.floor(raw.daysPerWeek);
		}
		if (
			typeof raw.sleepHours === "number" &&
			!Number.isNaN(raw.sleepHours) &&
			raw.sleepHours >= 0 &&
			raw.sleepHours <= 14
		) {
			res.sleepHours = raw.sleepHours;
		}
		if (
			raw.perfTrend === "up" ||
			raw.perfTrend === "flat" ||
			raw.perfTrend === "down"
		) {
			res.perfTrend = raw.perfTrend;
		}
		if (typeof raw.medicalFlag === "boolean") {
			res.medicalFlag = raw.medicalFlag;
		} else if (raw.medicalFlag) {
			res.medicalFlag = true;
		}
		if (Array.isArray(raw.medicalConditions)) {
			res.medicalConditions = raw.medicalConditions.slice();
		}
		if (
			raw.cardioPref === "steady" ||
			raw.cardioPref === "hiit" ||
			raw.cardioPref === "none"
		) {
			res.cardioPref = raw.cardioPref;
		}
		if (raw.somatotype && typeof raw.somatotype === "string") {
			res.somatotype = raw.somatotype;
		}
		return res;
	}

	function allProfiles() {
		var map = TH.store.get(TH.KEYS.clientProfiles, {});
		return map && typeof map === "object" && !Array.isArray(map) ? map : {};
	}

	function saveProfile(clientId, profile) {
		var id = String(clientId || "").trim();
		if (!id) return false;
		var map = allProfiles();
		map[id] = normalizeProfile(profile);
		return TH.store.set(TH.KEYS.clientProfiles, map);
	}

	function getProfile(clientId) {
		var id = String(clientId || "").trim();
		if (!id) return normalizeProfile(null);
		var map = allProfiles();
		return normalizeProfile(map[id]);
	}

	var api = {
		normalizeProfile: normalizeProfile,
		normalizePersonalizationProfile: normalizePersonalizationProfile,
		PERSONALIZATION_DEFAULTS: PERSONALIZATION_DEFAULTS,
		UNSOURCED_GAPS: UNSOURCED_GAPS,
		saveProfile: saveProfile,
		getProfile: getProfile,
	};

	root.THClientProfile = api;
	if (typeof module === "object" && module.exports) {
		module.exports = api;
	}
})(
	typeof window !== "undefined"
		? window
		: typeof globalThis !== "undefined"
			? globalThis
			: this,
);
