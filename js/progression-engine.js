/**
 * Progressive Overload & Progression Engine.
 * Analyzes exercise history, recommends next load adjustments,
 * and calculates weekly volume/adherence trends.
 * Client-side & Node CommonJS/UMD module.
 * Namespace: window.THProgression / window.THProgressionEngine
 */
((root) => {
	function parseTargetRange(targetRange) {
		if (!targetRange) return { min: 8, max: 12 };
		if (typeof targetRange === "object") {
			if (Array.isArray(targetRange)) {
				const min = Number(targetRange[0]) || 8;
				const max = Number(targetRange[1]) || min;
				return { min: Math.min(min, max), max: Math.max(min, max) };
			}
			const min =
				Number(targetRange.min ?? targetRange.minReps ?? targetRange.low) || 8;
			const max =
				Number(targetRange.max ?? targetRange.maxReps ?? targetRange.high) ||
				min;
			return { min: Math.min(min, max), max: Math.max(min, max) };
		}
		if (typeof targetRange === "string") {
			const m = targetRange.match(/(\d+)(?:\s*-\s*(\d+))?/);
			if (m) {
				const min = Number(m[1]);
				const max = m[2] ? Number(m[2]) : min;
				return { min: Math.min(min, max), max: Math.max(min, max) };
			}
		}
		if (typeof targetRange === "number" && Number.isFinite(targetRange)) {
			return { min: targetRange, max: targetRange };
		}
		return { min: 8, max: 12 };
	}

	function normalizeSessionDate(session) {
		if (!session || typeof session !== "object") return null;
		const raw =
			session.doneAt ||
			session.at ||
			session.date ||
			session.loggedAt ||
			session.timestamp ||
			null;
		if (!raw) return null;
		const d = new Date(raw);
		return Number.isNaN(d.getTime()) ? String(raw) : d.toISOString();
	}

	function extractSetsForExercise(session, targetId) {
		const sets = [];
		if (!session || !targetId) return sets;

		const target = targetId.toLowerCase();

		function matchEx(item) {
			if (!item || typeof item !== "object") return false;
			const id = String(
				item.exerciseId || item.id || item.name || item.he || "",
			)
				.trim()
				.toLowerCase();
			return id === target;
		}

		if (Array.isArray(session)) {
			for (const item of session) {
				if (matchEx(item)) {
					sets.push(item);
				}
			}
			return sets;
		}

		if (Array.isArray(session.sets)) {
			for (const set of session.sets) {
				if (matchEx(set)) sets.push(set);
			}
		}

		if (Array.isArray(session.logs) || Array.isArray(session.loggedSets)) {
			const logs = session.logs || session.loggedSets;
			for (const log of logs) {
				if (matchEx(log)) sets.push(log);
			}
		}

		if (Array.isArray(session.exercises)) {
			for (const ex of session.exercises) {
				if (matchEx(ex)) {
					if (Array.isArray(ex.sets)) {
						for (const set of ex.sets) {
							sets.push(
								Object.assign({}, set, {
									exerciseId: ex.id || targetId,
									reps: set.reps ?? ex.reps,
									weightKg: set.weightKg ?? ex.weightKg,
								}),
							);
						}
					} else {
						sets.push(ex);
					}
				}
			}
		}

		if (Array.isArray(session.phases)) {
			for (const phase of session.phases) {
				if (Array.isArray(phase.exercises)) {
					for (const ex of phase.exercises) {
						if (matchEx(ex)) {
							if (Array.isArray(ex.sets)) {
								for (const set of ex.sets) {
									sets.push(
										Object.assign({}, set, {
											exerciseId: ex.id || targetId,
											reps: set.reps ?? ex.reps,
											weightKg: set.weightKg ?? ex.weightKg,
										}),
									);
								}
							} else {
								sets.push(ex);
							}
						}
					}
				}
			}
		}

		return sets;
	}

	/**
	 * Analyzes history for a given exercise ID across an array of sessions.
	 *
	 * @param {Array} sessions
	 * @param {string} exerciseId
	 * @returns {object}
	 */
	function analyzeExerciseHistory(sessions, exerciseId) {
		const targetId = String(exerciseId || "").trim();
		if (!targetId || !Array.isArray(sessions) || sessions.length === 0) {
			return {
				exerciseId: targetId || null,
				history: [],
				totalSessions: 0,
				totalSets: 0,
				maxWeight: 0,
				maxReps: 0,
				avgReps: 0,
				avgRir: null,
				lastSession: null,
			};
		}

		const history = [];

		for (const session of sessions) {
			const rawSets = extractSetsForExercise(session, targetId);
			if (!rawSets || rawSets.length === 0) continue;

			const normalizedSets = rawSets.map((s) => {
				const reps = Number(s.actualReps ?? s.reps) || 0;
				const weightKg = Number(s.weightKg ?? s.weight) || 0;
				let rir = null;
				if (Number.isFinite(Number(s.rir))) {
					rir = Number(s.rir);
				} else if (Number.isFinite(Number(s.repsInReserve))) {
					rir = Number(s.repsInReserve);
				} else if (Number.isFinite(Number(s.rpe))) {
					rir = Math.max(0, 10 - Number(s.rpe));
				} else if (session && Number.isFinite(Number(session.rpe))) {
					rir = Math.max(0, 10 - Number(session.rpe));
				}

				return {
					reps: reps,
					weightKg: weightKg,
					rir: rir,
					completed: s.completed !== false && !s.skipped,
				};
			});

			const completedSets = normalizedSets.filter((s) => s.completed);
			const activeSets =
				completedSets.length > 0 ? completedSets : normalizedSets;

			const maxWeight = activeSets.reduce(
				(max, s) => Math.max(max, s.weightKg),
				0,
			);
			const maxReps = activeSets.reduce((max, s) => Math.max(max, s.reps), 0);
			const minReps = activeSets.reduce(
				(min, s) => Math.min(min, s.reps),
				activeSets[0]?.reps || 0,
			);
			const avgReps =
				activeSets.length > 0
					? Math.round(
							(activeSets.reduce((sum, s) => sum + s.reps, 0) /
								activeSets.length) *
								10,
						) / 10
					: 0;

			const rirValues = activeSets
				.map((s) => s.rir)
				.filter((r) => r !== null && Number.isFinite(r));
			const avgRir =
				rirValues.length > 0
					? Math.round(
							(rirValues.reduce((sum, r) => sum + r, 0) / rirValues.length) *
								10,
						) / 10
					: null;

			const hasRecoveryDrop = Boolean(
				session.recoveryDrop === true ||
					session.recovery === "low" ||
					session.recovery === "poor" ||
					session.pain === true ||
					(session.rpe != null &&
						Number(session.rpe) >= 9.5 &&
						maxReps < 6 &&
						avgRir === 0),
			);

			const volume = activeSets.reduce(
				(sum, s) => sum + s.reps * (s.weightKg > 0 ? s.weightKg : 1),
				0,
			);

			history.push({
				date: normalizeSessionDate(session),
				sets: activeSets,
				setsCount: activeSets.length,
				maxWeight: maxWeight,
				weightKg: maxWeight,
				maxReps: maxReps,
				minReps: minReps,
				avgReps: avgReps,
				reps: maxReps,
				rir: avgRir,
				avgRir: avgRir,
				recoveryDrop: hasRecoveryDrop,
				volume: Math.round(volume * 10) / 10,
			});
		}

		history.sort((a, b) => {
			if (a.date && b.date) return String(a.date).localeCompare(String(b.date));
			return 0;
		});

		let overallMaxWeight = 0;
		let overallMaxReps = 0;
		let totalReps = 0;
		let totalSets = 0;
		const allRirs = [];

		for (const h of history) {
			if (h.maxWeight > overallMaxWeight) overallMaxWeight = h.maxWeight;
			if (h.maxReps > overallMaxReps) overallMaxReps = h.maxReps;
			totalReps += h.avgReps * h.setsCount;
			totalSets += h.setsCount;
			if (h.avgRir !== null) allRirs.push(h.avgRir);
		}

		const overallAvgReps =
			totalSets > 0 ? Math.round((totalReps / totalSets) * 10) / 10 : 0;
		const overallAvgRir =
			allRirs.length > 0
				? Math.round(
						(allRirs.reduce((sum, r) => sum + r, 0) / allRirs.length) * 10,
					) / 10
				: null;

		return {
			exerciseId: targetId,
			history: history,
			totalSessions: history.length,
			totalSets: totalSets,
			maxWeight: overallMaxWeight,
			maxReps: overallMaxReps,
			avgReps: overallAvgReps,
			avgRir: overallAvgRir,
			lastSession: history.length > 0 ? history[history.length - 1] : null,
		};
	}

	/**
	 * Recommends next load adjustments based on progressive overload rules.
	 *
	 * - Recommends weight/rep increase upon reaching top of target range in control
	 *   with RIR 2-3 in more than one session.
	 * - Recommends load reduction / deload on recovery drop.
	 * - Recommends maintaining load when progressing within range or establishing control.
	 *
	 * @param {object|Array} history
	 * @param {string|object|Array|number} targetRange
	 * @returns {object}
	 */
	function recommendNextLoad(history, targetRange) {
		const range = parseTargetRange(targetRange);

		let historyList = [];
		if (Array.isArray(history)) {
			historyList = history;
		} else if (history && Array.isArray(history.history)) {
			historyList = history.history;
		} else if (history?.lastSession) {
			historyList = [history.lastSession];
		}

		if (!historyList || historyList.length === 0) {
			return {
				action: "maintain",
				type: "maintain",
				suggestedWeight: null,
				suggestedReps: range.min,
				loadChange: "0",
				message:
					"אין היסטוריה קודמת לתרגיל זה: מומלץ להתחיל בעומס מתון ולבסס טכניקה ושליטה.",
				reason: "אין היסטוריית ביצוע קודמת",
				details: {
					targetRange: range,
					qualifyingSessions: 0,
					recentWeight: 0,
					recentReps: 0,
					recentRir: null,
				},
			};
		}

		const last = historyList[historyList.length - 1];
		const currentWeight = Number(last.weightKg ?? last.maxWeight) || 0;
		const currentReps =
			Number(last.reps ?? last.maxReps ?? last.avgReps ?? 0) || 0;
		const currentRir = last.rir ?? last.avgRir ?? null;

		const isRecoveryDrop = Boolean(
			last.recoveryDrop === true ||
				last.recovery === "low" ||
				last.recovery === "poor" ||
				last.pain === true ||
				(currentRir === 0 && currentReps < range.min),
		);

		if (isRecoveryDrop) {
			const reducedWeight =
				currentWeight > 0
					? Math.max(0, Math.round(currentWeight * 0.9 * 2) / 2)
					: 0;
			const suggestedReps = range.min;
			const diff = Math.round((currentWeight - reducedWeight) * 10) / 10;
			const loadChange = currentWeight > 0 ? `-${diff}kg` : "-2 reps";

			return {
				action: "decrease",
				type: "decrease",
				suggestedWeight: reducedWeight,
				suggestedReps: suggestedReps,
				loadChange: loadChange,
				message:
					"הורדת עומס: זוהתה ירידה בהתאוששות או עומס יתר. מומלץ להפחית משקל/חזרות כדי לאפשר התאוששות מיטבית.",
				reason: "ירידה בהתאוששות או סימני עומס יתר",
				details: {
					targetRange: range,
					qualifyingSessions: 0,
					recentWeight: currentWeight,
					recentReps: currentReps,
					recentRir: currentRir,
					recoveryDrop: true,
				},
			};
		}

		let qualifyingCount = 0;
		for (let i = historyList.length - 1; i >= 0; i--) {
			const s = historyList[i];
			const reps = Number(s.reps ?? s.maxReps ?? s.avgReps ?? 0) || 0;
			const rir = s.rir ?? s.avgRir;
			const isAtTop = reps >= range.max;
			const isControlled = rir != null && rir >= 2 && rir <= 3.5;
			if (isAtTop && isControlled) {
				qualifyingCount++;
			} else {
				break;
			}
		}

		if (qualifyingCount <= 1) {
			const recentWindow = historyList.slice(-3);
			const matchesInWindow = recentWindow.filter((s) => {
				const reps = Number(s.reps ?? s.maxReps ?? s.avgReps ?? 0) || 0;
				const rir = s.rir ?? s.avgRir;
				return reps >= range.max && rir != null && rir >= 2 && rir <= 3.5;
			}).length;
			if (matchesInWindow > 1) {
				qualifyingCount = matchesInWindow;
			}
		}

		if (qualifyingCount > 1) {
			let suggestedWeight = 0;
			let suggestedReps = range.min;
			let loadChange = "";
			let message = "";

			if (currentWeight > 0) {
				const inc = currentWeight < 20 ? 1.25 : 2.5;
				suggestedWeight = Math.round((currentWeight + inc) * 10) / 10;
				suggestedReps = range.min;
				loadChange = `+${inc}kg`;
				message = `העלאת עומס: הגעה לקצה הטווח (${range.max} חזרות) בשליטה עם RIR 2-3 ביותר ממפגש אחד. מומלץ להעלות משקל ל-${suggestedWeight} ק״ג ולכוון ל-${range.min} חזרות.`;
			} else {
				suggestedWeight = 0;
				suggestedReps = range.max + 2;
				loadChange = "+2 reps";
				message = `העלאת עומס: הגעה לקצה הטווח (${range.max} חזרות) בשליטה עם רזרבה (RIR 2-3) ביותר ממפגש אחד. מומלץ להעלות חזרות ל-${suggestedReps} או להוסיף התנגדות.`;
			}

			return {
				action: "increase",
				type: "increase",
				suggestedWeight: suggestedWeight,
				suggestedReps: suggestedReps,
				loadChange: loadChange,
				message: message,
				reason: "הגעה לקצה הטווח בשליטה עם RIR 2-3 ביותר ממפגש אחד",
				details: {
					targetRange: range,
					qualifyingSessions: qualifyingCount,
					recentWeight: currentWeight,
					recentReps: currentReps,
					recentRir: currentRir,
				},
			};
		}

		const suggestedReps = Math.min(
			range.max,
			Math.max(range.min, currentReps + (currentReps < range.max ? 1 : 0)),
		);
		const maintainMsg =
			qualifyingCount === 1
				? "שמירת עומס: הגעה לקצה הטווח במפגש בודד. מומלץ לבסס עוד מפגש אחד בשליטה מלאה (RIR 2-3) לפני העלאת משקל."
				: currentWeight > 0
					? `שמירת עומס: המשך בעומס הנוכחי (${currentWeight} ק״ג) לביסוס שליטה בטווח ${range.min}-${range.max} חזרות.`
					: `שמירת עומס: המשך בעומס הנוכחי לביסוס שליטה בטווח ${range.min}-${range.max} חזרות.`;

		return {
			action: "maintain",
			type: "maintain",
			suggestedWeight: currentWeight > 0 ? currentWeight : null,
			suggestedReps: suggestedReps,
			loadChange: "0",
			message: maintainMsg,
			reason:
				qualifyingCount === 1
					? "נדרש ביסוס במפגש נוסף לפני העלאת עומס"
					: "המשך התקדמות ושליטה בטווח המטרה",
			details: {
				targetRange: range,
				qualifyingSessions: qualifyingCount,
				recentWeight: currentWeight,
				recentReps: currentReps,
				recentRir: currentRir,
			},
		};
	}

	function getWeekStart(d) {
		const date = new Date(d);
		if (Number.isNaN(date.getTime())) return "unknown";
		date.setHours(0, 0, 0, 0);
		date.setDate(date.getDate() - date.getDay());
		return date.toISOString().slice(0, 10);
	}

	/**
	 * Computes weekly volume and adherence trends across sessions.
	 *
	 * @param {Array} sessions
	 * @returns {object}
	 */
	function computeWeeklyTrend(sessions) {
		if (!Array.isArray(sessions) || sessions.length === 0) {
			return {
				totalVolume: 0,
				weeklyVolume: 0,
				avgWeeklyVolume: 0,
				sessionsCount: 0,
				weeklySessions: 0,
				avgWeeklySessions: 0,
				adherenceRate: 0,
				trend: "stable",
				volumeChangePct: 0,
				weeks: [],
				message: "אין עדיין נתוני אימונים לחישוב מגמה שבועית",
			};
		}

		let totalVolume = 0;
		const weeksMap = {};

		for (let i = 0; i < sessions.length; i++) {
			const s = sessions[i];
			if (!s || typeof s !== "object") continue;

			let vol = 0;
			if (
				typeof s.volume === "number" &&
				Number.isFinite(s.volume) &&
				s.volume >= 0
			) {
				vol = s.volume;
			} else if (Array.isArray(s.sets)) {
				for (const set of s.sets) {
					const r = Number(set.reps ?? set.actualReps) || 0;
					const w = Number(set.weightKg ?? set.weight) || 0;
					vol += r * (w > 0 ? w : 1);
				}
			}

			totalVolume += vol;

			const rawDate =
				s.doneAt || s.at || s.date || s.loggedAt || s.timestamp || null;
			let weekKey = "week_1";
			if (rawDate) {
				const start = getWeekStart(rawDate);
				if (start !== "unknown") weekKey = start;
			} else {
				const weekIdx = Math.floor(i / 3) + 1;
				weekKey = `שבוע ${weekIdx}`;
			}

			if (!weeksMap[weekKey]) {
				weeksMap[weekKey] = {
					week: weekKey,
					sessionsCount: 0,
					volume: 0,
				};
			}

			weeksMap[weekKey].sessionsCount += 1;
			weeksMap[weekKey].volume += vol;
		}

		const weekKeys = Object.keys(weeksMap).sort();
		const weeks = weekKeys.map((k) => {
			const item = weeksMap[k];
			const adherence = Math.min(
				100,
				Math.round((item.sessionsCount / 3) * 100),
			);
			return {
				week: item.week,
				sessions: item.sessionsCount,
				volume: Math.round(item.volume * 10) / 10,
				adherence: adherence,
			};
		});

		const weeksCount = Math.max(1, weeks.length);
		const lastWeek = weeks[weeks.length - 1];
		const avgWeeklyVolume = Math.round((totalVolume / weeksCount) * 10) / 10;
		const avgWeeklySessions =
			Math.round((sessions.length / weeksCount) * 10) / 10;
		const adherenceRate = Math.min(
			100,
			Math.round((avgWeeklySessions / 3) * 100),
		);

		let changePct = 0;
		let trend = "stable";

		if (weeks.length >= 2) {
			const prevVol = weeks[weeks.length - 2].volume;
			const currVol = lastWeek.volume;
			if (prevVol > 0) {
				changePct = Math.round(((currVol - prevVol) / prevVol) * 100);
			} else if (currVol > 0) {
				changePct = 100;
			}
			if (changePct >= 5) {
				trend = "increasing";
			} else if (changePct <= -5) {
				trend = "decreasing";
			}
		}

		let message = "";
		if (trend === "increasing") {
			message = `עלייה בנפח השבועי (${changePct > 0 ? `+${changePct}` : changePct}%) והתמדה של ${adherenceRate}%`;
		} else if (trend === "decreasing") {
			message = `ירידה בנפח השבועי (${changePct}%), מומלץ לבדוק התאוששות ועומסים`;
		} else {
			message = `נפח שבועי יציב (${lastWeek?.volume || avgWeeklyVolume} ק״ג) והתמדה של ${adherenceRate}%`;
		}

		return {
			totalVolume: Math.round(totalVolume * 10) / 10,
			weeklyVolume: lastWeek ? lastWeek.volume : avgWeeklyVolume,
			avgWeeklyVolume: avgWeeklyVolume,
			sessionsCount: sessions.length,
			weeklySessions: lastWeek ? lastWeek.sessions : avgWeeklySessions,
			avgWeeklySessions: avgWeeklySessions,
			adherenceRate: adherenceRate,
			trend: trend,
			volumeChangePct: changePct,
			weeks: weeks,
			message: message,
		};
	}

	const api = {
		analyzeExerciseHistory: analyzeExerciseHistory,
		recommendNextLoad: recommendNextLoad,
		computeWeeklyTrend: computeWeeklyTrend,
		parseTargetRange: parseTargetRange,
	};

	if (root) {
		root.THProgression = api;
		root.THProgressionEngine = api;
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
