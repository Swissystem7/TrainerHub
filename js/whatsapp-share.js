((root) => {
	function formatWorkoutWhatsAppText(workout) {
		if (!workout || typeof workout !== "object") {
			return "";
		}

		const title = typeof workout.title === "string" ? workout.title.trim() : "";
		const phases = Array.isArray(workout.phases) ? workout.phases : [];
		const directExercises = Array.isArray(workout.exercises)
			? workout.exercises
			: [];

		const totalExercises =
			phases.reduce(
				(sum, p) =>
					sum + (Array.isArray(p?.exercises) ? p.exercises.length : 0),
				0,
			) + directExercises.length;

		if (!title && totalExercises === 0) {
			return "";
		}

		const lines = [];
		lines.push(`*${title || "אימון"}*`);

		const duration =
			workout.duration_minutes ??
			workout.durationMinutes ??
			workout.duration ??
			null;
		if (duration && Number(duration) > 0) {
			lines.push(`זמן: ${duration} דקות`);
		}

		if (workout.equipment) {
			const equipStr = Array.isArray(workout.equipment)
				? workout.equipment.join(", ")
				: String(workout.equipment).trim();
			if (equipStr && equipStr !== "auto" && equipStr !== "none") {
				lines.push(`ציוד: ${equipStr}`);
			}
		}

		function formatExerciseItem(ex) {
			if (!ex) return "";
			const name =
				typeof ex === "string"
					? ex.trim()
					: (ex.name || ex.name_he || "").trim();
			if (!name) return "";

			const details = [];
			if (ex.sets && ex.reps) {
				details.push(`${ex.sets} × ${ex.reps}`);
			} else if (ex.sets && ex.duration_seconds) {
				details.push(`${ex.sets} × ${ex.duration_seconds} שנ׳`);
			} else if (ex.sets && Number(ex.sets) > 1) {
				details.push(`${ex.sets} סטים`);
			}

			if (ex.rest_seconds && Number(ex.rest_seconds) > 0) {
				details.push(`מנוחה: ${ex.rest_seconds} שנ׳`);
			}

			if (ex.notes) {
				const cleanNotes = String(ex.notes).trim();
				if (cleanNotes && cleanNotes !== "חסר סרטון") {
					details.push(cleanNotes);
				}
			}

			return `• ${name}${details.length ? ` (${details.join(", ")})` : ""}`;
		}

		if (phases.length > 0) {
			for (const phase of phases) {
				const exercises = Array.isArray(phase?.exercises)
					? phase.exercises
					: [];
				if (exercises.length === 0) continue;

				const phaseName = (phase.name || "").trim();
				if (phaseName) {
					lines.push(`\n*${phaseName}*`);
				}
				for (const ex of exercises) {
					const item = formatExerciseItem(ex);
					if (item) lines.push(item);
				}
			}
		} else if (directExercises.length > 0) {
			for (const ex of directExercises) {
				const item = formatExerciseItem(ex);
				if (item) lines.push(item);
			}
		}

		lines.push("\nשותף מ-TrainerHub");
		return lines.join("\n").trim();
	}

	function formatReservesResultText(evaluation) {
		if (!evaluation || typeof evaluation !== "object") {
			return "";
		}

		const tests = Array.isArray(evaluation.tests) ? evaluation.tests : [];
		const isSingleTest =
			!tests.length &&
			(evaluation.pass !== undefined || evaluation.id || evaluation.name_he);

		if (!tests.length && !isSingleTest) {
			return "";
		}

		const lines = [];
		lines.push("*סיכום מדדי מילואים*");

		if (tests.length > 0) {
			const overall =
				evaluation.overall || (evaluation.allPassed ? "pass" : "fail");
			let statusStr = "לא הושלם";
			if (overall === "pass" || evaluation.allPassed) {
				statusStr = "עובר ✅";
			} else if (overall === "fail") {
				statusStr = "לא עובר ❌";
			} else if (overall === "incomplete") {
				statusStr = "חסר — טרם הוזנו כל המדדים ⏳";
			}
			lines.push(`סטטוס כללי: ${statusStr}`);

			if (evaluation.deadline_display_he) {
				lines.push(`יעד: עד ${evaluation.deadline_display_he}`);
			}

			lines.push("\nפירוט מדדים:");
			for (const t of tests) {
				const mark = t.incomplete ? "⏳" : t.pass ? "✅" : "❌";
				const statusLabel = t.incomplete
					? "טרם בוצע"
					: t.pass
						? "עובר"
						: "לא עובר";
				const name = t.name_he || t.id || "מדד";
				let detail = `${mark} ${name}: ${statusLabel}`;
				if (t.display || (t.value !== null && t.value !== undefined)) {
					detail += ` (תוצאה: ${t.display || t.value}`;
					if (t.threshold_display) {
						detail += ` / יעד: ${t.threshold_display}`;
					}
					detail += ")";
				} else if (t.threshold_display) {
					detail += ` (יעד: ${t.threshold_display})`;
				}
				lines.push(detail);
			}
		} else if (isSingleTest) {
			const mark = evaluation.pass ? "✅" : "❌";
			const statusLabel = evaluation.pass ? "עובר" : "לא עובר";
			const name = evaluation.name_he || evaluation.id || "מדד";
			lines.push(`מדד: ${name}`);
			lines.push(`סטטוס: ${statusLabel} ${mark}`);
			if (
				evaluation.display ||
				(evaluation.value !== null && evaluation.value !== undefined)
			) {
				lines.push(`תוצאה: ${evaluation.display || evaluation.value}`);
			}
			if (evaluation.threshold_display) {
				lines.push(`יעד: ${evaluation.threshold_display}`);
			}
		}

		lines.push("\nשותף מ-TrainerHub");
		return lines.join("\n").trim();
	}

	function buildWhatsAppShareUrl(text) {
		if (typeof text !== "string") {
			return "";
		}
		const clean = text.trim();
		if (!clean) {
			return "";
		}
		return `https://wa.me/?text=${encodeURIComponent(clean)}`;
	}

	const api = {
		formatWorkoutWhatsAppText: formatWorkoutWhatsAppText,
		formatReservesResultText: formatReservesResultText,
		buildWhatsAppShareUrl: buildWhatsAppShareUrl,
	};

	if (root) {
		root.THWhatsAppShare = api;
		if (root.TH && typeof root.TH === "object") {
			root.TH.formatWorkoutWhatsAppText = formatWorkoutWhatsAppText;
			root.TH.formatReservesResultText = formatReservesResultText;
			root.TH.buildWhatsAppShareUrl = buildWhatsAppShareUrl;
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
);
