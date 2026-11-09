/**
 * Live workout session — tracks which plan exercises are done vs pending.
 * Classic script. Namespace: window.THSessionTracker
 */
((root) => {
	var STORAGE_KEY = "trainerhub_active_session";

	function isInvalidDuration(val) {
		if (val === undefined || val === null) return false;
		return typeof val !== "number" || !Number.isFinite(val) || val < 0;
	}

	function normalizeDurations(obj) {
		if (!obj || typeof obj !== "object") return obj;
		if (isInvalidDuration(obj.duration)) {
			try {
				obj.duration = 0;
			} catch {}
		}
		if (isInvalidDuration(obj.duration_minutes)) {
			try {
				obj.duration_minutes = 0;
			} catch {}
		}
		return obj;
	}

	function exerciseRows(workout) {
		var rows = [];
		var seen = {};
		if (!workout || typeof workout !== "object") return rows;
		(Array.isArray(workout.phases) ? workout.phases : []).forEach((ph) => {
			if (!ph || typeof ph !== "object") return;
			(Array.isArray(ph.exercises) ? ph.exercises : []).forEach((ex) => {
				if (!ex) return;
				var id = ex.id || ex.name;
				if (!id) return;
				id = String(id);
				if (seen[id]) return;
				seen[id] = true;
				rows.push({ id: id, status: "pending" });
			});
		});
		return rows;
	}

	function snapshot(workout, exercises) {
		var w = workout;
		var copy;
		if (w && typeof w === "object") {
			normalizeDurations(w);
			if (
				isInvalidDuration(w.duration) ||
				isInvalidDuration(w.duration_minutes)
			) {
				copy = {};
				for (var k in w) {
					if (Object.hasOwn(w, k)) {
						copy[k] = w[k];
					}
				}
				if (isInvalidDuration(copy.duration)) copy.duration = 0;
				if (isInvalidDuration(copy.duration_minutes)) copy.duration_minutes = 0;
				w = copy;
			}
		}
		return {
			workout: w,
			exercises: (exercises || []).map((e) => ({
				id: e.id,
				status: e.status === "done" ? "done" : "pending",
			})),
		};
	}

	/**
	 * @param {object} workoutPlan phased workout from the builder or library
	 * @returns {{ state: function, complete: function }}
	 */
	function createSession(workoutPlan) {
		var workout =
			workoutPlan && typeof workoutPlan === "object" ? workoutPlan : {};
		normalizeDurations(workout);
		var exercises = exerciseRows(workout);
		var current = snapshot(workout, exercises);

		return {
			state: () => snapshot(current.workout, current.exercises),
			complete: (exerciseId) => {
				var id = String(exerciseId || "");
				current.exercises = current.exercises.map((item) => {
					if (item.id !== id) return item;
					return { id: item.id, status: "done" };
				});
				return snapshot(current.workout, current.exercises);
			},
		};
	}

	function resolveStorage(storage) {
		if (storage) return storage;
		if (typeof localStorage !== "undefined") return localStorage;
		if (root?.localStorage) return root.localStorage;
		if (typeof globalThis !== "undefined" && globalThis.localStorage)
			return globalThis.localStorage;
		if (typeof global !== "undefined" && global.localStorage)
			return global.localStorage;
		return null;
	}

	/**
	 * Saves active session state to storage.
	 * @param {object} sessionState
	 * @param {object} [storage] Storage implementation (defaults to global localStorage)
	 * @returns {boolean} True on success, false on failure
	 */
	function saveSession(sessionState, storage) {
		var targetStorage;
		var toSave;
		var stateCopy;
		var workoutCopy;
		var serialized;
		if (!sessionState || typeof sessionState !== "object") {
			return false;
		}
		if (!Array.isArray(sessionState.exercises)) {
			return false;
		}
		try {
			normalizeDurations(sessionState);
			if (sessionState.workout && typeof sessionState.workout === "object") {
				normalizeDurations(sessionState.workout);
			}

			targetStorage = resolveStorage(storage);
			if (!targetStorage || typeof targetStorage.setItem !== "function") {
				return false;
			}

			toSave = sessionState;
			if (
				isInvalidDuration(toSave.duration) ||
				isInvalidDuration(toSave.duration_minutes) ||
				(toSave.workout &&
					(isInvalidDuration(toSave.workout.duration) ||
						isInvalidDuration(toSave.workout.duration_minutes)))
			) {
				stateCopy = Object.assign({}, toSave);
				if (isInvalidDuration(stateCopy.duration)) stateCopy.duration = 0;
				if (isInvalidDuration(stateCopy.duration_minutes))
					stateCopy.duration_minutes = 0;
				if (stateCopy.workout && typeof stateCopy.workout === "object") {
					workoutCopy = Object.assign({}, stateCopy.workout);
					if (isInvalidDuration(workoutCopy.duration)) workoutCopy.duration = 0;
					if (isInvalidDuration(workoutCopy.duration_minutes))
						workoutCopy.duration_minutes = 0;
					stateCopy.workout = workoutCopy;
				}
				toSave = stateCopy;
			}

			serialized = JSON.stringify(toSave);
			targetStorage.setItem(STORAGE_KEY, serialized);
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Loads active session state from storage.
	 * @param {object} [storage] Storage implementation (defaults to global localStorage)
	 * @returns {object|null} Parsed session state or null on failure/missing
	 */
	function loadSession(storage) {
		var targetStorage;
		var raw;
		var parsed;
		try {
			targetStorage = resolveStorage(storage);
			if (!targetStorage || typeof targetStorage.getItem !== "function") {
				return null;
			}
			raw = targetStorage.getItem(STORAGE_KEY);
			if (raw == null || raw === "") return null;
			parsed = JSON.parse(raw);
			if (!parsed || typeof parsed !== "object") return null;
			normalizeDurations(parsed);
			if (parsed.workout && typeof parsed.workout === "object") {
				normalizeDurations(parsed.workout);
			}
			return parsed;
		} catch {
			return null;
		}
	}

	var api = {
		createSession: createSession,
		saveSession: saveSession,
		loadSession: loadSession,
		STORAGE_KEY: STORAGE_KEY,
	};

	root.THSessionTracker = api;
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
