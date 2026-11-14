/**
 * Live workout tracking with rest timer and real-time set logging.
 * CommonJS / UMD compatible.
 */
((root) => {
	function getExerciseList(workout) {
		if (!workout || typeof workout !== "object") return [];
		if (Array.isArray(workout)) {
			return workout.slice();
		}
		if (Array.isArray(workout.exercises)) {
			return workout.exercises.slice();
		}
		const list = [];
		if (Array.isArray(workout.phases)) {
			workout.phases.forEach((ph) => {
				if (ph && Array.isArray(ph.exercises)) {
					ph.exercises.forEach((ex) => {
						if (ex) list.push(ex);
					});
				}
			});
		}
		return list;
	}

	function createLiveSession(workout) {
		if (!workout || typeof workout !== "object") {
			return {
				workout: null,
				exercises: [],
				currentExerciseIndex: 0,
				currentSetIndex: 1,
				status: "completed",
				restRemaining: 0,
				restTimer: 0,
				loggedSets: [],
				logs: [],
				startedAt: new Date().toISOString(),
				completedAt: new Date().toISOString(),
			};
		}

		const rawList = getExerciseList(workout);
		const exercises = rawList.map((ex, idx) => {
			const parsedSets = Number(ex.sets);
			const safeSets =
				Number.isFinite(parsedSets) && parsedSets > 0
					? Math.floor(parsedSets)
					: 1;
			const parsedWeight = Number(
				ex.weightKg != null ? ex.weightKg : ex.weight,
			);
			const safeWeight =
				Number.isFinite(parsedWeight) && parsedWeight >= 0 ? parsedWeight : 0;
			const parsedRest = Number(
				ex.rest_seconds != null ? ex.rest_seconds : ex.restSeconds,
			);
			const safeRest =
				Number.isFinite(parsedRest) && parsedRest >= 0
					? Math.floor(parsedRest)
					: 60;

			return {
				id: ex.id || `ex_${idx}`,
				name: ex.name || `תרגיל ${idx + 1}`,
				sets: safeSets,
				reps: ex.reps != null ? ex.reps : 10,
				weightKg: safeWeight,
				restSeconds: safeRest,
				notes: ex.notes || "",
			};
		});

		if (exercises.length === 0) {
			return {
				workout: workout,
				exercises: [],
				currentExerciseIndex: 0,
				currentSetIndex: 1,
				status: "completed",
				restRemaining: 0,
				restTimer: 0,
				loggedSets: [],
				logs: [],
				startedAt: new Date().toISOString(),
				completedAt: new Date().toISOString(),
			};
		}

		const session = {
			workout: workout,
			exercises: exercises,
			currentExerciseIndex: 0,
			currentSetIndex: 1,
			status: "active",
			restRemaining: 0,
			restTimer: 0,
			loggedSets: [],
			startedAt: new Date().toISOString(),
			completedAt: null,
		};
		session.logs = session.loggedSets;
		return session;
	}

	function advanceToNextSet(state) {
		const currentEx = state.exercises[state.currentExerciseIndex];
		if (!currentEx) {
			state.status = "completed";
			state.completedAt = new Date().toISOString();
			state.restRemaining = 0;
			state.restTimer = 0;
			return;
		}

		if (state.currentSetIndex < currentEx.sets) {
			state.currentSetIndex += 1;
			state.status = "active";
			state.restRemaining = 0;
			state.restTimer = 0;
		} else {
			state.currentExerciseIndex += 1;
			state.currentSetIndex = 1;
			state.restRemaining = 0;
			state.restTimer = 0;
			if (state.currentExerciseIndex >= state.exercises.length) {
				state.status = "completed";
				state.completedAt = new Date().toISOString();
			} else {
				state.status = "active";
			}
		}
	}

	function logSetAndAdvance(state, entry) {
		if (
			!state ||
			typeof state !== "object" ||
			!Array.isArray(state.exercises)
		) {
			return state;
		}

		if (state.status === "completed") {
			return state;
		}

		if (state.status === "rest") {
			advanceToNextSet(state);
			if (state.status === "completed") {
				return state;
			}
		}

		const currentEx = state.exercises[state.currentExerciseIndex];
		if (!currentEx) {
			state.status = "completed";
			state.completedAt = new Date().toISOString();
			return state;
		}

		const safeEntry = entry || {};
		const parsedReps = Number(safeEntry.actualReps);
		const actualReps =
			Number.isFinite(parsedReps) && parsedReps >= 0
				? Math.floor(parsedReps)
				: Number(currentEx.reps) || 0;

		const parsedWeight = Number(safeEntry.weightKg);
		const weightKg =
			Number.isFinite(parsedWeight) && parsedWeight >= 0
				? parsedWeight
				: currentEx.weightKg || 0;

		const parsedRir = Number(safeEntry.rir);
		const rir =
			Number.isFinite(parsedRir) && parsedRir >= 0 ? Math.floor(parsedRir) : 0;

		const record = {
			exerciseIndex: state.currentExerciseIndex,
			exerciseId: currentEx.id,
			exerciseName: currentEx.name,
			setIndex: state.currentSetIndex,
			totalSets: currentEx.sets,
			actualReps: actualReps,
			weightKg: weightKg,
			rir: rir,
			loggedAt: new Date().toISOString(),
		};

		if (!Array.isArray(state.loggedSets)) {
			state.loggedSets = [];
		}
		state.loggedSets.push(record);
		state.logs = state.loggedSets;

		const isLastSetOfEx = state.currentSetIndex >= currentEx.sets;
		const isLastExOfWorkout =
			state.currentExerciseIndex >= state.exercises.length - 1;
		const isWorkoutFinished = isLastSetOfEx && isLastExOfWorkout;

		if (isWorkoutFinished) {
			state.status = "completed";
			state.completedAt = new Date().toISOString();
			state.restRemaining = 0;
			state.restTimer = 0;
			return state;
		}

		const restSec =
			typeof currentEx.restSeconds === "number" ? currentEx.restSeconds : 60;
		if (restSec > 0) {
			state.status = "rest";
			state.restRemaining = restSec;
			state.restTimer = restSec;
		} else {
			advanceToNextSet(state);
		}

		return state;
	}

	function tickTimer(state, seconds) {
		if (!state || typeof state !== "object") {
			return state;
		}

		if (state.status !== "rest" && state.restRemaining <= 0) {
			return state;
		}

		const dec =
			typeof seconds === "number" && Number.isFinite(seconds) && seconds > 0
				? seconds
				: 1;

		state.restRemaining = Math.max(0, (state.restRemaining || 0) - dec);
		state.restTimer = state.restRemaining;

		if (state.restRemaining === 0) {
			advanceToNextSet(state);
		}

		return state;
	}

	function saveLiveWorkoutToJournal(state, storage) {
		try {
			const store =
				storage || (typeof localStorage !== "undefined" ? localStorage : null);
			if (!store || typeof store.setItem !== "function") {
				return false;
			}
			if (!state || typeof state !== "object") {
				return false;
			}

			let existingRaw = null;
			if (typeof store.getItem === "function") {
				existingRaw = store.getItem("trainerhub_live_journal");
			}

			let journal = [];
			if (existingRaw) {
				try {
					const parsed = JSON.parse(existingRaw);
					if (Array.isArray(parsed)) {
						journal = parsed;
					} else if (parsed && typeof parsed === "object") {
						journal = [parsed];
					}
				} catch {
					journal = [];
				}
			}

			const entry = {
				id: `live_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
				savedAt: new Date().toISOString(),
				workoutTitle: state.workout?.title || "אימון חי",
				status: state.status || "completed",
				startedAt: state.startedAt || null,
				completedAt: state.completedAt || new Date().toISOString(),
				loggedSets: Array.isArray(state.loggedSets)
					? state.loggedSets.slice()
					: [],
				exercisesCount: Array.isArray(state.exercises)
					? state.exercises.length
					: 0,
				totalSetsLogged: Array.isArray(state.loggedSets)
					? state.loggedSets.length
					: 0,
			};

			journal.push(entry);
			store.setItem("trainerhub_live_journal", JSON.stringify(journal));
			return true;
		} catch {
			return false;
		}
	}

	const api = {
		createLiveSession: createLiveSession,
		logSetAndAdvance: logSetAndAdvance,
		tickTimer: tickTimer,
		saveLiveWorkoutToJournal: saveLiveWorkoutToJournal,
	};

	if (root) {
		root.THLiveWorkout = api;
		root.createLiveSession = createLiveSession;
		root.logSetAndAdvance = logSetAndAdvance;
		root.tickTimer = tickTimer;
		root.saveLiveWorkoutToJournal = saveLiveWorkoutToJournal;
	}

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
