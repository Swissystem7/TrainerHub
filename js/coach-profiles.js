/**
 * TrainerHub — ניהול פרופילי מתאמנים מרובים ושיוך תוכניות (פורטל מאמן).
 * Classic script / CommonJS / UMD. Namespace: window.THCoachProfiles
 */
((root, factory) => {
	const api = factory();
	if (root) {
		root.THCoachProfiles = api;
		if (root.TH && typeof root.TH === "object") {
			root.TH.CoachProfiles = api;
			root.TH.createTraineeProfile = api.createTraineeProfile;
			root.TH.listTraineeProfiles = api.listTraineeProfiles;
			root.TH.assignWorkoutToTrainee = api.assignWorkoutToTrainee;
			root.TH.exportTraineeSummaryText = api.exportTraineeSummaryText;
		}
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
	() => {
		const STORAGE_KEY = "trainerhub_coach_trainees";

		function resolveStorage(customStorage) {
			if (customStorage && typeof customStorage.getItem === "function") {
				return customStorage;
			}
			if (customStorage && typeof customStorage === "object") {
				return {
					getItem: (key) => customStorage[key],
					setItem: (key, val) => {
						customStorage[key] = String(val);
					},
				};
			}
			try {
				if (typeof localStorage !== "undefined") {
					return localStorage;
				}
			} catch (_) {
				return null;
			}
			return null;
		}

		function saveTraineeProfile(profile, storage) {
			if (!profile?.id || !profile?.name) {
				return false;
			}
			const s = resolveStorage(storage);
			if (!s) return false;
			try {
				const list = listTraineeProfiles(s);
				const idx = list.findIndex(
					(item) => String(item.id) === String(profile.id),
				);
				if (idx >= 0) {
					list[idx] = profile;
				} else {
					list.push(profile);
				}
				s.setItem(STORAGE_KEY, JSON.stringify(list));
				return true;
			} catch (_) {
				return false;
			}
		}

		function createTraineeProfile(name, level, equipment, storage) {
			if (!name || typeof name !== "string" || !name.trim()) {
				return null;
			}
			const trimmedName = name.trim();
			const trimmedLevel =
				typeof level === "string" && level.trim()
					? level.trim()
					: level || "beginner";
			const cleanEquipment =
				equipment !== undefined && equipment !== null ? equipment : "none";

			const profile = {
				id: `trainee_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
				name: trimmedName,
				level: trimmedLevel,
				equipment: cleanEquipment,
				assignedWorkout: null,
				assignedWorkouts: [],
				workouts: [],
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			};

			if (storage) {
				saveTraineeProfile(profile, storage);
			}

			return profile;
		}

		function listTraineeProfiles(storage) {
			const s = resolveStorage(storage);
			if (!s) return [];
			try {
				const raw = s.getItem(STORAGE_KEY);
				if (!raw) return [];
				const parsed = JSON.parse(raw);
				return Array.isArray(parsed) ? parsed : [];
			} catch (_) {
				return [];
			}
		}

		function assignWorkoutToTrainee(traineeId, workout, storage) {
			if (!traineeId) return null;
			const s = resolveStorage(storage);
			if (!s) return null;
			try {
				const list = listTraineeProfiles(s);
				const trainee = list.find(
					(item) => String(item.id) === String(traineeId),
				);
				if (!trainee) {
					return null;
				}

				trainee.assignedWorkout = workout || null;
				if (!Array.isArray(trainee.assignedWorkouts)) {
					trainee.assignedWorkouts = [];
				}
				if (workout) {
					trainee.assignedWorkouts.push(workout);
				}
				trainee.workouts = trainee.assignedWorkouts;
				trainee.updatedAt = new Date().toISOString();

				s.setItem(STORAGE_KEY, JSON.stringify(list));
				return trainee;
			} catch (_) {
				return null;
			}
		}

		function exportTraineeSummaryText(trainee) {
			if (!trainee || typeof trainee !== "object") {
				return "";
			}
			const name = typeof trainee.name === "string" ? trainee.name.trim() : "";
			if (!name) return "";

			const level = trainee.level ? String(trainee.level).trim() : "לא צוין";
			const equipment = Array.isArray(trainee.equipment)
				? trainee.equipment.join(", ")
				: trainee.equipment
					? String(trainee.equipment).trim()
					: "משקל גוף";

			const lines = [
				`פרופיל מתאמן: ${name}`,
				`רמה: ${level}`,
				`ציוד: ${equipment}`,
			];

			const workout =
				trainee.assignedWorkout ||
				(Array.isArray(trainee.assignedWorkouts) &&
				trainee.assignedWorkouts.length > 0
					? trainee.assignedWorkouts[trainee.assignedWorkouts.length - 1]
					: null);

			if (workout) {
				const title = workout.title || workout.name || "אימון משויך";
				lines.push(`אימון משויך: ${title}`);
				const duration =
					workout.duration_minutes ??
					workout.durationMinutes ??
					workout.duration ??
					null;
				if (duration && Number(duration) > 0) {
					lines.push(`משך זמן: ${duration} דקות`);
				}
				const exCount = Array.isArray(workout.exercises)
					? workout.exercises.length
					: Array.isArray(workout.phases)
						? workout.phases.reduce(
								(sum, p) =>
									sum + (Array.isArray(p?.exercises) ? p.exercises.length : 0),
								0,
							)
						: 0;
				if (exCount > 0) {
					lines.push(`מספר תרגילים: ${exCount}`);
				}
			} else {
				lines.push("אימון משויך: ללא");
			}

			return lines.join("\n");
		}

		return {
			STORAGE_KEY,
			createTraineeProfile,
			listTraineeProfiles,
			saveTraineeProfile,
			assignWorkoutToTrainee,
			exportTraineeSummaryText,
		};
	},
);
