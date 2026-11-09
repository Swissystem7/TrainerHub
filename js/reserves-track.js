/**
 * TrainerHub — מדדי מילואים (reserve fitness pass/fail track).
 * Classic script, no bundler. Namespace: window.THReserves.
 * Data: content/reserves/miluim-track.json
 * Results are stored locally (trainerhub_miluim_results) — never uploaded.
 */
((root) => {
	var DATA_PATH = "content/reserves/miluim-track.json";
	var STORE_KEY = "trainerhub_miluim_results";
	var data = null;

	function setData(main) {
		data = main || null;
		return api;
	}

	function need() {
		if (!data) throw new Error("reserves track data not loaded");
		return data;
	}

	function loadJson(rel) {
		if (typeof fetch !== "function") return Promise.resolve(null);
		var url =
			root.TH && typeof root.TH.assetUrl === "function"
				? root.TH.assetUrl(rel)
				: rel;
		return fetch(url)
			.then((r) => (r.ok ? r.json() : null))
			.catch(() => null);
	}

	function load() {
		if (data) return Promise.resolve(api);
		return loadJson(DATA_PATH).then((main) => {
			setData(main);
			return api;
		});
	}

	function meta() {
		return need()._meta;
	}

	function tests() {
		return need().tests.slice();
	}

	function testById(id) {
		var list = need().tests;
		var i;
		for (i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
		return null;
	}

	function demos() {
		return need()
			.demos.slice()
			.sort((a, b) => (a.priority || 99) - (b.priority || 99));
	}

	function plan() {
		return need().plan;
	}

	/** Parse m:ss / h:mm:ss / bare seconds → total seconds. */
	function parseClock(v) {
		var s;
		var p;
		var total;
		var i;
		var n;
		var num;
		if (typeof v === "number") {
			return !Number.isFinite(v) || v < 0 || Object.is(v, -0) ? NaN : v;
		}
		if (v == null) return NaN;
		s = String(v).trim();
		if (!s || s.charAt(0) === "-" || /[^\d:.]/.test(s)) return NaN;
		if (s.indexOf(":") !== -1) {
			p = s.split(":");
			if (p.length < 2 || p.length > 3) return NaN;
			total = 0;
			for (i = 0; i < p.length; i++) {
				if (!p[i] || (i < p.length - 1 && p[i].indexOf(".") !== -1)) return NaN;
				n = Number(p[i]);
				if (!Number.isFinite(n) || n < 0 || (i > 0 && n >= 60)) return NaN;
				total = total * 60 + n;
			}
			return total;
		}
		num = Number(s);
		if (!Number.isFinite(num) || num < 0 || Object.is(num, -0)) return NaN;
		return num;
	}

	function formatClock(seconds) {
		if (
			seconds == null ||
			(typeof seconds === "string" && seconds.trim() === "")
		)
			return "";
		const num = Number(seconds);
		if (!Number.isFinite(num) || num < 0) return "";
		var s = Math.round(num);
		var m = Math.floor(s / 60);
		var r = s % 60;
		return `${m}:${r < 10 ? "0" : ""}${r}`;
	}

	function normalizeValue(test, raw) {
		var sec;
		var n;
		if (raw === "" || raw == null)
			return { ok: false, numeric: NaN, display: "" };
		if (test.input === "clock") {
			sec = parseClock(raw);
			if (!Number.isFinite(sec) || sec < 0)
				return { ok: false, numeric: NaN, display: String(raw) };
			return { ok: true, numeric: sec, display: formatClock(sec) };
		}
		n =
			typeof raw === "number"
				? raw
				: Number(String(raw).trim().replace(",", "."));
		if (!Number.isFinite(n) || n < 0)
			return { ok: false, numeric: NaN, display: String(raw) };
		return { ok: true, numeric: n, display: String(n) };
	}

	function passesThreshold(test, numeric) {
		if (!test || !Number.isFinite(numeric)) return false;
		if (test.pass_when === "lte") return numeric <= test.threshold;
		if (test.pass_when === "gte") return numeric >= test.threshold;
		return false;
	}

	/**
	 * Evaluate one test. raw may be clock string or number.
	 * Returns { id, name_he, pass, incomplete, value, display, threshold_display, ... }
	 */
	function evaluateTest(testId, raw) {
		var test = testById(testId);
		if (!test) return null;
		if (raw === "" || raw == null) {
			return {
				id: test.id,
				name_he: test.name_he,
				pass: false,
				incomplete: true,
				value: null,
				display: "",
				threshold_display: test.threshold_display,
				pass_when: test.pass_when,
				verified: !!test.verified,
			};
		}
		var norm = normalizeValue(test, raw);
		if (!norm.ok) {
			return {
				id: test.id,
				name_he: test.name_he,
				pass: false,
				incomplete: true,
				invalid: true,
				value: null,
				display: norm.display,
				threshold_display: test.threshold_display,
				pass_when: test.pass_when,
				verified: !!test.verified,
			};
		}
		var ok = passesThreshold(test, norm.numeric);
		return {
			id: test.id,
			name_he: test.name_he,
			pass: ok,
			incomplete: false,
			value: norm.numeric,
			display: norm.display,
			threshold_display: test.threshold_display,
			pass_when: test.pass_when,
			verified: !!test.verified,
		};
	}

	/**
	 * results: { [testId]: rawValue }
	 * overall: 'pass' | 'fail' | 'incomplete'
	 */
	function evaluateAll(results) {
		results = results || {};
		var rows = tests().map((t) => evaluateTest(t.id, results[t.id]));
		var anyIncomplete = rows.some((r) => r.incomplete);
		var allPass = rows.every((r) => r.pass);
		var overall = anyIncomplete ? "incomplete" : allPass ? "pass" : "fail";
		return {
			tests: rows,
			allPassed: allPass && !anyIncomplete,
			overall: overall,
			deadline_display_he: meta().deadline_display_he,
			all_must_pass: !!meta().all_must_pass,
		};
	}

	function emptyStore() {
		return {
			results: {},
			history: [],
			feedbacks: {},
			lastFeedback: null,
			lastSessionId: null,
			updatedAt: null,
		};
	}

	function readStoreRaw() {
		var viaTh;
		var raw;
		try {
			if (root.TH?.store && typeof root.TH.store.get === "function") {
				viaTh = root.TH.store.get(STORE_KEY, null);
				if (viaTh && typeof viaTh === "object") return viaTh;
			}
		} catch (_e) {
			/* ignore */
		}
		try {
			if (typeof localStorage === "undefined") return null;
			raw = localStorage.getItem(STORE_KEY);
			if (!raw) return null;
			return JSON.parse(raw);
		} catch (_e2) {
			return null;
		}
	}

	function writeStoreRaw(obj) {
		try {
			if (root.TH?.store && typeof root.TH.store.set === "function") {
				if (root.TH.store.set(STORE_KEY, obj)) return true;
			}
		} catch (_e) {
			/* ignore */
		}
		try {
			if (typeof localStorage === "undefined") return false;
			localStorage.setItem(STORE_KEY, JSON.stringify(obj));
			return true;
		} catch (_e2) {
			return false;
		}
	}

	function loadResults() {
		var raw = readStoreRaw();
		if (!raw || typeof raw !== "object") return emptyStore();
		return {
			results:
				raw.results && typeof raw.results === "object"
					? Object.assign({}, raw.results)
					: {},
			history: Array.isArray(raw.history) ? raw.history.slice() : [],
			feedbacks:
				raw.feedbacks && typeof raw.feedbacks === "object"
					? Object.assign({}, raw.feedbacks)
					: {},
			lastFeedback: raw.lastFeedback || null,
			lastSessionId: raw.lastSessionId || null,
			updatedAt: raw.updatedAt || null,
		};
	}

	function saveResults(store) {
		var next = {
			results: Object.assign({}, store?.results || {}),
			history: (store?.history || []).slice(),
			feedbacks: Object.assign({}, store?.feedbacks || {}),
			lastFeedback: store?.lastFeedback || null,
			lastSessionId: store?.lastSessionId || null,
			updatedAt: new Date().toISOString(),
		};
		writeStoreRaw(next);
		return next;
	}

	function clearResults() {
		writeStoreRaw(emptyStore());
		return emptyStore();
	}

	/**
	 * Log a single test result. checkpoint optional: placement|midpoint|final|practice
	 */
	function logResult(testId, raw, checkpoint) {
		var test = testById(testId);
		if (!test) return null;
		var ev = evaluateTest(testId, raw);
		var store = loadResults();
		store.results[testId] = {
			raw: raw,
			value: ev.value,
			display: ev.display,
			pass: ev.pass,
			incomplete: ev.incomplete,
			checkpoint: checkpoint || "practice",
			at: new Date().toISOString(),
		};
		store.history.push({
			testId: testId,
			raw: raw,
			pass: ev.pass,
			checkpoint: checkpoint || "practice",
			at: store.results[testId].at,
		});
		saveResults(store);
		return {
			evaluation: ev,
			store: store,
			summary: evaluateAll(currentRawMap(store)),
		};
	}

	function currentRawMap(store) {
		store = store || loadResults();
		var map = {};
		Object.keys(store.results || {}).forEach((id) => {
			var row = store.results[id];
			if (row && row.raw != null) map[id] = row.raw;
		});
		return map;
	}

	function currentSummary() {
		return evaluateAll(currentRawMap());
	}

	function overallLabelHe(overall) {
		if (overall === "pass") return "עובר — כל המדדים";
		if (overall === "fail") return "לא עובר — יש מדד שלא עמד בסף";
		return "חסר — עדיין לא הוזנו כל המדדים";
	}

	function feedbackOptions() {
		return need().feedback?.options ? need().feedback.options.slice() : [];
	}

	function adjustmentFor(feedbackId) {
		var adj = need().feedback?.adjustments;
		if (!adj) return null;
		return adj[feedbackId] || null;
	}

	function strengthPlans(filter) {
		filter = filter || {};
		var list = need().strength_plans || [];
		return list
			.filter((p) => {
				if (filter.level != null && Number(p.level) !== Number(filter.level))
					return false;
				if (filter.equipment && p.equipment !== filter.equipment) return false;
				return true;
			})
			.map((p) =>
				Object.assign({}, p, { sessions: (p.sessions || []).slice() }),
			);
	}

	function strengthPlanById(id) {
		var list = need().strength_plans || [];
		var i;
		for (i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
		return null;
	}

	function scaleLoad(load, volumeDelta) {
		if (typeof volumeDelta !== "number" || !Number.isFinite(volumeDelta)) {
			return load;
		}
		var currentSets =
			(load && typeof load === "object" && Number(load.sets)) || 3;
		if (currentSets + volumeDelta < 0) {
			return load;
		}
		var target =
			load && typeof load === "object"
				? Object.assign({}, load)
				: { sets: 3, effort_he: "בינוני" };
		var sets = Math.max(2, Math.min(6, currentSets + volumeDelta));
		target.sets = sets;
		if (volumeDelta > 0) target.effort_he = "מועלה אחרי משוב «קל»";
		if (volumeDelta < 0) target.effort_he = "מוקל אחרי משוב «לא סיימתי»";
		return target;
	}

	function findPlanSession(sessionId) {
		var sessions = need().plan?.sessions || [];
		var i;
		var p;
		var ss;
		var j;
		for (i = 0; i < sessions.length; i++) {
			if (sessions[i].id === sessionId)
				return {
					list: sessions,
					index: i,
					session: sessions[i],
					source: "plan",
				};
		}
		var plans = need().strength_plans || [];
		for (p = 0; p < plans.length; p++) {
			ss = plans[p].sessions || [];
			for (j = 0; j < ss.length; j++) {
				if (ss[j].id === sessionId)
					return {
						list: ss,
						index: j,
						session: ss[j],
						source: "strength",
						planId: plans[p].id,
					};
			}
		}
		return null;
	}

	function recordWorkoutFeedback(sessionId, feedbackId) {
		var ok = false;
		feedbackOptions().forEach((o) => {
			if (o.id === feedbackId) ok = true;
		});
		if (!ok) return null;
		var store = loadResults();
		store.feedbacks = store.feedbacks || {};
		store.feedbacks[sessionId] = {
			feedbackId: feedbackId,
			at: new Date().toISOString(),
		};
		store.lastFeedback = feedbackId;
		store.lastSessionId = sessionId;
		saveResults(store);
		return {
			feedbackId: feedbackId,
			adjustment: adjustmentFor(feedbackId),
			store: store,
		};
	}

	/**
	 * Build the next session after sessionId or (week, day), scaled by last (or provided) feedback.
	 */
	function nextWorkout(arg1, arg2, arg3) {
		if (arg1 == null) return null;

		var weekNum = null;
		var afterSessionId = null;
		var feedbackId = null;
		var fb;
		var adj;
		var dayLetter;
		var trimmed;
		var parsedNum;
		var fbNum;
		var adjNum;
		var dayLetterNum;
		var foundDirect;
		var wMatch;
		var wVal;
		var fbW;
		var adjW;

		if (typeof arg1 === "number") {
			if (!Number.isFinite(arg1) || arg1 <= 0 || Object.is(arg1, -0))
				return null;
			weekNum = arg1;
			if (weekNum > 6) {
				fb =
					typeof arg2 === "string" &&
					arg2 !== "1" &&
					arg2 !== "2" &&
					arg2 !== "a" &&
					arg2 !== "b"
						? arg2
						: typeof arg3 === "string"
							? arg3
							: loadResults().lastFeedback || "exact";
				adj = adjustmentFor(fb) || { volume_delta: 0, note_he: "" };
				return {
					done: true,
					isCompleted: true,
					session: null,
					feedbackId: fb,
					adjustment: adj,
					message_he: "סיימת את רצף האימונים במסלול הזה",
				};
			}
			dayLetter = null;
			if (arg2 === 1 || arg2 === "1" || arg2 === "a" || arg2 === "A") {
				dayLetter = "a";
			} else if (arg2 === 2 || arg2 === "2" || arg2 === "b" || arg2 === "B") {
				dayLetter = "b";
			} else {
				return null;
			}
			afterSessionId = `w${Math.floor(weekNum)}${dayLetter}`;
			feedbackId = typeof arg3 === "string" ? arg3 : null;
		} else if (typeof arg1 === "string") {
			trimmed = arg1.trim();
			if (!trimmed) return null;

			if (/^-?\d+(\.\d+)?$/.test(trimmed)) {
				parsedNum = Number(trimmed);
				if (!Number.isFinite(parsedNum) || parsedNum <= 0) return null;
				if (parsedNum > 6) {
					fbNum =
						typeof arg2 === "string" &&
						arg2 !== "1" &&
						arg2 !== "2" &&
						arg2 !== "a" &&
						arg2 !== "b"
							? arg2
							: typeof arg3 === "string"
								? arg3
								: loadResults().lastFeedback || "exact";
					adjNum = adjustmentFor(fbNum) || { volume_delta: 0, note_he: "" };
					return {
						done: true,
						isCompleted: true,
						session: null,
						feedbackId: fbNum,
						adjustment: adjNum,
						message_he: "סיימת את רצף האימונים במסלול הזה",
					};
				}
				dayLetterNum = null;
				if (arg2 === 1 || arg2 === "1" || arg2 === "a" || arg2 === "A") {
					dayLetterNum = "a";
				} else if (arg2 === 2 || arg2 === "2" || arg2 === "b" || arg2 === "B") {
					dayLetterNum = "b";
				} else {
					return null;
				}
				afterSessionId = `w${Math.floor(parsedNum)}${dayLetterNum}`;
				feedbackId = typeof arg3 === "string" ? arg3 : null;
			} else {
				foundDirect = findPlanSession(trimmed);
				if (foundDirect) {
					afterSessionId = trimmed;
					feedbackId = typeof arg2 === "string" ? arg2 : null;
				} else {
					wMatch = trimmed.match(/^w(-?\d+)([a-z])?$/i);
					if (wMatch) {
						wVal = Number(wMatch[1]);
						if (!Number.isFinite(wVal) || wVal <= 0) return null;
						if (wVal > 6) {
							fbW =
								typeof arg2 === "string"
									? arg2
									: loadResults().lastFeedback || "exact";
							adjW = adjustmentFor(fbW) || { volume_delta: 0, note_he: "" };
							return {
								done: true,
								isCompleted: true,
								session: null,
								feedbackId: fbW,
								adjustment: adjW,
								message_he: "סיימת את רצף האימונים במסלול הזה",
							};
						}
					}
					return null;
				}
			}
		} else {
			return null;
		}

		var found = findPlanSession(afterSessionId);
		if (!found) return null;
		var finalFb = feedbackId || loadResults().lastFeedback || "exact";
		var finalAdj = adjustmentFor(finalFb) || { volume_delta: 0, note_he: "" };
		var nextIndex = found.index + 1;
		if (nextIndex >= found.list.length) {
			return {
				done: true,
				isCompleted: true,
				session: null,
				feedbackId: finalFb,
				adjustment: finalAdj,
				message_he: "סיימת את רצף האימונים במסלול הזה",
			};
		}
		var base = found.list[nextIndex];
		var scaled = Object.assign({}, base, {
			load: scaleLoad(base.load, finalAdj.volume_delta),
			adjustment_note_he: finalAdj.note_he || "",
			from_feedback: finalFb,
		});
		return {
			done: false,
			feedbackId: finalFb,
			adjustment: finalAdj,
			session: scaled,
			source: found.source,
			planId: found.planId || null,
		};
	}

	var api = {
		DATA_PATH: DATA_PATH,
		STORE_KEY: STORE_KEY,
		setData: setData,
		load: load,
		get data() {
			return data;
		},
		meta: meta,
		tests: tests,
		testById: testById,
		demos: demos,
		plan: plan,
		parseClock: parseClock,
		formatClock: formatClock,
		evaluateTest: evaluateTest,
		evaluateAll: evaluateAll,
		loadResults: loadResults,
		saveResults: saveResults,
		clearResults: clearResults,
		logResult: logResult,
		currentRawMap: currentRawMap,
		currentSummary: currentSummary,
		overallLabelHe: overallLabelHe,
		feedbackOptions: feedbackOptions,
		adjustmentFor: adjustmentFor,
		recordWorkoutFeedback: recordWorkoutFeedback,
		nextWorkout: nextWorkout,
		scaleLoad: scaleLoad,
		strengthPlans: strengthPlans,
		strengthPlanById: strengthPlanById,
		findPlanSession: findPlanSession,
	};

	root.THReserves = api;
	if (typeof module === "object" && module.exports) module.exports = api;
})(
	typeof window !== "undefined"
		? window
		: typeof globalThis !== "undefined"
			? globalThis
			: this,
);
