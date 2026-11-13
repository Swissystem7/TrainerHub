/**
 * Body composition and ability adaptation engine.
 * Handles volume budgeting, template selection, and adaptation reporting.
 * Client-side & Node CommonJS/UMD module.
 * Namespace: window.THAdaptation / window.THAdaptationEngine
 */
((root) => {
	const ADAPTATION_FIELDS = [
		"goal",
		"basedOn",
		"todayFocus",
		"personalAdaptation",
		"howToProgress",
		"howToMeasure",
		"promiseLimits",
		"whenToStop",
	];

	const WEEKLY_ANCHOR_SETS = 10;

	let DEFAULT_TEMPLATES = {
		chest: {
			goal: "בנייה וחיזוק של שרירי החזה ודחיפה פלג גוף עליון",
			basedOn:
				"עומס מכני מדורג ושליטה בטווחי תנועה מלאים ללא תלות במבנה גוף מולד",
			todayFocus:
				"שליטה בפאזה האקסצנטרית (ירידה איטית ומבוקרת) ויציבות חגורת הכתפיים",
			personalAdaptation: "התאמת זווית הלחיצה והמנח לפי נוחות מפרק הכתף והמרפק",
			howToProgress:
				"הוספת חזרות או התנגדות הדרגתית כשנשמרות 1-2 חזרות ברזרבה (RIR)",
			howToMeasure:
				"מעקב אחר מספר סטים שבועיים, משקלי עבודה או קושי המאמץ הנתפס",
			promiseLimits:
				"האימון מחזק ובונה את רקמת שריר החזה ואינו מוריד שומן מקומי מאזור החזה",
			whenToStop: "יש לעצור מיד במקרה של כאב חד או דקירה במפרק הכתף או במרפק",
		},
		legs: {
			goal: "בניית כוח ונפח שרירי ברגליים ובפלג גוף תחתון (ארבע-ראשי, ישבן, מיתרי הברך ותאומים)",
			basedOn:
				"העמסה פרוגרסיבית של תבניות כריעה ופשיטת ירך בהתאם לתנועתיות אישית",
			todayFocus:
				"חלוקת משקל אחידה בכף הרגל ושמירה על מסלול תנועה יציב של הברכיים",
			personalAdaptation:
				"בחירת עומק ירידה ורוחב עמידה המתאימים למבנה מפרק הירך ולנוחות הגב",
			howToProgress:
				"העלאת עומס הדרגתית או הוספת חזרות בטכניקה יציבה מאימון לאימון",
			howToMeasure: "תיעוד עומס עבודה, טווח תנועה ומספר סטים שבועיים מצטברים",
			promiseLimits:
				"עבודה כנגד התנגדות מחזקת את שרירי הרגליים ללא הבטחה להורדת שומן מקומית או נקודתית",
			whenToStop: "עצירה במקרה של כאב חד בברך, בירך או בעמוד השדרה המותני",
		},
		arms: {
			goal: "פיתוח כוח, מסה וסיבולת שרירית בזרועות (דו-ראשי ותלת-ראשי)",
			basedOn: "שילוב תרגילים ייעודיים לזרועות עם תרגילי משיכה ולחיצה מורכבים",
			todayFocus: "בידוד התנועה במרפק תוך מניעת תנופת גוף ושמירה על קצב מבוקר",
			personalAdaptation:
				"התאמת מנח כף היד (ניטרלי, סופינציה, פרונציה) להפחתת עומס ממפרק שורש כף היד",
			howToProgress: "הגדלת מספר החזרות בטווח הרצוי לפני העלאת משקל או התנגדות",
			howToMeasure:
				"מעקב סטים ישירים ועקיפים, רמת קושי סובייקטיבית והתקדמות בהתנגדות",
			promiseLimits:
				"התרגילים מפתחים ומחזקים את שרירי הזרוע ואינם שורפים שומן מקומי בזרועות",
			whenToStop:
				"יש לעצור בעת הופעת כאב בגידי המרפק או באי נוחות במפרק כף היד",
		},
		back: {
			goal: "חיזוק שרירי הגב (רחב גבי, טרפזים וזוקפי גו) ושיפור יציבות המשיכה",
			basedOn: "שילוב משיכות אנכיות ואופקיות לאיזון שרירי ומכניקה מדויקת",
			todayFocus: "ייזום התנועה משרירי הגב והצמדת שכמות בסוף המשיכה",
			personalAdaptation:
				"בחירת סוג אחיזה (רחבה/צרה, ניטרלית) וטווח משיכה המתאימים לחגורת הכתפיים",
			howToProgress:
				"הארכת זמן תחת מתח (TUT), הוספת חזרות מדויקות או העלאת התנגדות",
			howToMeasure: "מעקב סטים שבועיים, איכות השליטה בשכמות ועומסי עבודה",
			promiseLimits:
				"חיזוק הגב משפר יציבה וכוח אך אינו מביא להורדת שומן נקודתית בגב",
			whenToStop:
				"עצירה מיידית במקרה של עומס חריג או כאב חד בגב התחתון או בצוואר",
		},
		shoulders: {
			goal: "פיתוח יציבות, כוח ונפח בקבוצת שרירי הכתפיים (דלתואיד)",
			basedOn: "עבודה בזוויות מפרק בטוחות ובמישור השכמה (Scaption)",
			todayFocus: "שליטה בגובה ההרמה ומניעת פיצוי באמצעות הצוואר או הגב",
			personalAdaptation:
				"התאמת זווית ההרמה והעדפת משקולות או גומיות בהתאם לחופש התנועה במפרק",
			howToProgress:
				"התקדמות במספר החזרות תוך שמירה קפדנית על מהירות תנועה אחידה",
			howToMeasure: "ספירת סטים שבועיים, שמירה על טווח תנועה נקי ורמת עייפות",
			promiseLimits:
				"תרגילי כתפיים בונים רקמת שריר ואינם משפיעים על שריפת שומן מקומית באזור",
			whenToStop:
				"עצירה מיידית בתחושת צביטה, כאב חד בקדמת הכתף או מגבלה פתאומית",
		},
		core: {
			goal: "חיזוק שרירי הליבה, יציבות עמוד השדרה והעברת כוח יעילה",
			basedOn:
				"אימון תבניות ייצוב (מניעת פשיטה, מניעת כפיפה ומניעת פיתול) ושליטה נשימתית",
			todayFocus:
				"החזקת גו ניטרלי, הפעלת דופן הבטן ונשימה סדירה לאורך כל התרגיל",
			personalAdaptation:
				"שינוי מנוף הגוף (למשל פלאנק על מדרגה או על הברכיים) לפי יכולת בקרת האגן",
			howToProgress:
				"הארכת משך ההחזקה בשניות או מעבר לווריאציה עם יציבות מאתגרת יותר",
			howToMeasure: "משך זמן ביצוע נקי ללא קריסת אגן, קושי נתפס ואיכות השליטה",
			promiseLimits:
				"אימוני ליבה מחזקים את השרירים הפנימיים והחיצוניים אך אינם שורפים שומן בטני מקומי",
			whenToStop: "יש להפסיק בעת תחושת קריסה, לחץ או כאב בגב התחתון",
		},
		full_body: {
			goal: "חיזוק כללי של מערכות השרירים, שיפור סיבולת וכושר תפקודי כולל",
			basedOn:
				"שילוב מאוזן של תבניות תנועה מרכזיות: דחיפה, משיכה, כריעה, ציר ירך וליבה",
			todayFocus:
				"חלוקת מאמץ נכונה בין התחנות ושמירה על איכות תנועה גבוהה תחת עייפות",
			personalAdaptation:
				"וויסות זמני המנוחה ובחירת תרגילים חלופיים לפי רמת הכושר והציוד הזמין",
			howToProgress:
				"העלאת עומס הדרגתית או הוספת נפח מבוקר על פני ימי האימון השבועיים",
			howToMeasure:
				"מעקב אחר סך הסטים השבועי לכל קבוצת שריר ועמידה ביעדי האימון",
			promiseLimits:
				"האימון תורם להוצאה אנרגטית ולבניית שריר, אך שינוי בהרכב הגוף תלוי במאזן קלורי כולל ולא בירידת שומן נקודתית",
			whenToStop:
				"יש לעצור במצב של תשישות המובילה לפגיעה בטכניקה או בהופעת כאב מפרקי חריג",
		},
	};

	if (typeof module === "object" && module.exports) {
		try {
			DEFAULT_TEMPLATES = require("../content/adaptation-templates.json");
		} catch (_) {}
	}

	function normalizeMuscle(m) {
		if (!m || typeof m !== "string") return null;
		const s = m.trim().toLowerCase();
		if (s === "chest" || s === "חזה") return "chest";
		if (
			s === "legs" ||
			s === "leg" ||
			s === "רגליים" ||
			s === "רגלים" ||
			s === "quads" ||
			s === "hamstrings" ||
			s === "glutes" ||
			s === "calves" ||
			s === "ירכיים" ||
			s === "ישבן" ||
			s === "תאומים"
		)
			return "legs";
		if (s === "arms" || s === "arm" || s === "ידיים" || s === "זרועות")
			return "arms";
		if (
			s === "biceps" ||
			s === "דו-ראשי" ||
			s === "דו ראשי" ||
			s === "יד קדמית"
		)
			return "biceps";
		if (
			s === "triceps" ||
			s === "תלת-ראשי" ||
			s === "תלת ראשי" ||
			s === "יד אחורית"
		)
			return "triceps";
		if (
			s === "back" ||
			s === "גב" ||
			s === "lats" ||
			s === "traps" ||
			s === "רחב גבי"
		)
			return "back";
		if (
			s === "shoulders" ||
			s === "shoulder" ||
			s === "כתפיים" ||
			s === "כתפים" ||
			s === "כתף" ||
			s === "delts"
		)
			return "shoulders";
		if (s === "core" || s === "בטן" || s === "ליבה" || s === "abs")
			return "core";
		if (
			s === "full_body" ||
			s === "full" ||
			s === "גוף מלא" ||
			s === "פול בודי" ||
			s === "כל הגוף" ||
			s === "general"
		)
			return "full_body";
		return s;
	}

	function inferMuscleFromName(text) {
		if (!text || typeof text !== "string") return null;
		const t = text.toLowerCase();
		if (/חזה|שכיבות סמיכה|דחיפה|push-?up|chest|bench/.test(t)) return "chest";
		if (/רגליים|רגלים|סקוואט|מכרעים|legs|squat|lunge/.test(t)) return "legs";
		if (/גב|מתח|חתירה|back|pull-?up|row/.test(t)) return "back";
		if (/כתפיים|כתפים|לחיצת כתפיים|הרחקה|shoulders|overhead|press/.test(t))
			return "shoulders";
		if (
			/ידיים|זרועות|יד קדמית|יד אחורית|דו-ראשי|תלת-ראשי|biceps|triceps|arms|curl/.test(
				t,
			)
		)
			return "arms";
		if (/בטן|ליבה|פלאנק|כפיפות|core|plank|abs/.test(t)) return "core";
		if (/גוף מלא|פול בודי|full\s*body/.test(t)) return "full_body";
		return null;
	}

	function selectAdaptationTemplate(profile, context, templates) {
		const store = templates || DEFAULT_TEMPLATES;
		profile = profile || {};
		context = context || {};

		// Extract target muscle
		const rawMuscle =
			context.muscle ||
			context.focus ||
			profile.muscle ||
			profile.focus ||
			profile.targetMuscle ||
			(Array.isArray(profile.targetMuscles) && profile.targetMuscles[0]) ||
			(Array.isArray(profile.muscles) && profile.muscles[0]) ||
			(Array.isArray(context.muscles) && context.muscles[0]) ||
			context.tags?.[0] ||
			(typeof profile.prompt === "string"
				? inferMuscleFromName(profile.prompt)
				: null) ||
			null;

		const normMuscle = rawMuscle ? normalizeMuscle(rawMuscle) : null;
		const goal = context.goal || profile.goal || null;
		const equipment = context.equipment || profile.equipment || null;

		let matched = null;

		if (Array.isArray(store)) {
			// Find closest matching template in array
			matched =
				store.find(
					(t) =>
						(t.muscle === normMuscle || t.id === normMuscle) &&
						(!goal || t.goalType === goal || t.goal === goal) &&
						(!equipment || t.equipment === equipment),
				) ||
				store.find((t) => t.muscle === normMuscle || t.id === normMuscle) ||
				store.find((t) => t.muscle === "full_body" || t.id === "full_body");
		} else if (store && typeof store === "object") {
			// Specific composite key first e.g. chest_band
			if (normMuscle && equipment && store[`${normMuscle}_${equipment}`]) {
				matched = store[`${normMuscle}_${equipment}`];
			} else if (normMuscle && goal && store[`${normMuscle}_${goal}`]) {
				matched = store[`${normMuscle}_${goal}`];
			} else if (normMuscle && store[normMuscle]) {
				matched = store[normMuscle];
			} else if (rawMuscle && store[rawMuscle]) {
				matched = store[rawMuscle];
			} else if (!normMuscle && store.full_body) {
				matched = store.full_body;
			}
		}

		const result = {};
		for (const field of ADAPTATION_FIELDS) {
			const val = matched ? matched[field] : null;
			result[field] =
				val && typeof val === "string" && val.trim().length > 0
					? val.trim()
					: "לא ידוע";
		}

		// Adaptations for goal / equipment if matching template is found and fields are valid
		if (matched) {
			if (goal === "שימור שריר בירידה בשומן" || goal === "fat_loss") {
				if (result.goal !== "לא ידוע") {
					result.goal = `${result.goal} (בדגש על שימור רקמת שריר בגרעון קלורי)`;
				}
				if (result.promiseLimits !== "לא ידוע") {
					result.promiseLimits = `${result.promiseLimits} — ירידה בשומן הינה תהליך מערכתי ואינה מתרחשת נקודתית באיבר המאומן`;
				}
			} else if (goal === "כוח ותפקוד" || goal === "strength") {
				if (result.goal !== "לא ידוע") {
					result.goal = `${result.goal} (בדגש על פיתוח כוח מרבי, יציבות ותפקוד מפרקי)`;
				}
			}

			if (equipment && result.personalAdaptation !== "לא ידוע") {
				const eqStr = Array.isArray(equipment)
					? equipment.join(", ")
					: equipment;
				if (eqStr === "band" || eqStr === "גומיות") {
					result.personalAdaptation = `${result.personalAdaptation} — התאמת מתח הגומייה ונקודת העיגון לשמירה על מתח תנועתי רציף`;
				} else if (eqStr === "none" || eqStr === "ללא ציוד") {
					result.personalAdaptation = `${result.personalAdaptation} — שינוי מנופי הגוף וקצב התנועה לוויסות העומס במשקל גוף`;
				}
			}
		}

		return result;
	}

	function calculateWeeklyVolumeBudget(sessions) {
		const list = Array.isArray(sessions)
			? sessions
			: sessions
				? [sessions]
				: [];

		const byMuscle = {
			chest: {
				direct: 0,
				indirect: 0,
				total: 0,
				effectiveSets: 0,
				anchor: WEEKLY_ANCHOR_SETS,
				target: WEEKLY_ANCHOR_SETS,
				status: "בבנייה",
			},
			back: {
				direct: 0,
				indirect: 0,
				total: 0,
				effectiveSets: 0,
				anchor: WEEKLY_ANCHOR_SETS,
				target: WEEKLY_ANCHOR_SETS,
				status: "בבנייה",
			},
			legs: {
				direct: 0,
				indirect: 0,
				total: 0,
				effectiveSets: 0,
				anchor: WEEKLY_ANCHOR_SETS,
				target: WEEKLY_ANCHOR_SETS,
				status: "בבנייה",
			},
			shoulders: {
				direct: 0,
				indirect: 0,
				total: 0,
				effectiveSets: 0,
				anchor: WEEKLY_ANCHOR_SETS,
				target: WEEKLY_ANCHOR_SETS,
				status: "בבנייה",
			},
			arms: {
				direct: 0,
				indirect: 0,
				total: 0,
				effectiveSets: 0,
				anchor: WEEKLY_ANCHOR_SETS,
				target: WEEKLY_ANCHOR_SETS,
				status: "בבנייה",
			},
			biceps: {
				direct: 0,
				indirect: 0,
				total: 0,
				effectiveSets: 0,
				anchor: WEEKLY_ANCHOR_SETS,
				target: WEEKLY_ANCHOR_SETS,
				status: "בבנייה",
			},
			triceps: {
				direct: 0,
				indirect: 0,
				total: 0,
				effectiveSets: 0,
				anchor: WEEKLY_ANCHOR_SETS,
				target: WEEKLY_ANCHOR_SETS,
				status: "בבנייה",
			},
			core: {
				direct: 0,
				indirect: 0,
				total: 0,
				effectiveSets: 0,
				anchor: WEEKLY_ANCHOR_SETS,
				target: WEEKLY_ANCHOR_SETS,
				status: "בבנייה",
			},
		};

		for (const session of list) {
			if (!session) continue;
			let exercises = [];
			if (Array.isArray(session)) {
				exercises = session;
			} else if (Array.isArray(session.exercises) && !session.phases) {
				exercises = session.exercises;
			} else if (Array.isArray(session.phases)) {
				for (const ph of session.phases) {
					if (!ph) continue;
					if (ph.name === "Warm-up" || ph.name === "Cool-down") {
						const hasMain = session.phases.some(
							(p) =>
								p &&
								p.name === "Main" &&
								Array.isArray(p.exercises) &&
								p.exercises.length > 0,
						);
						if (hasMain) continue;
					}
					if (Array.isArray(ph.exercises)) {
						exercises = exercises.concat(ph.exercises);
					}
				}
			} else if (session.name || session.he || session.id) {
				exercises = [session];
			}

			for (const ex of exercises) {
				if (!ex) continue;
				const rawSets = Number(ex.sets);
				const setCount = Number.isFinite(rawSets) && rawSets >= 1 ? rawSets : 1;

				let primary = ex.primary;
				if (!primary && Array.isArray(ex.muscles) && ex.muscles.length > 0) {
					primary = ex.muscles[0];
				}
				if (!primary && ex.muscle) {
					primary = ex.muscle;
				}
				if (!primary && (ex.name || ex.he || ex.id)) {
					primary = inferMuscleFromName(ex.name || ex.he || ex.id);
				}

				const normPrimary = normalizeMuscle(primary || "core");

				if (byMuscle[normPrimary]) {
					byMuscle[normPrimary].direct += setCount;
				}

				// Direct and indirect contributions:
				// chest contributes 0.5 to triceps; back contributes 0.5 to biceps; shoulders contributes 0.5 to triceps
				if (normPrimary === "chest") {
					byMuscle.triceps.indirect += 0.5 * setCount;
				} else if (normPrimary === "back") {
					byMuscle.biceps.indirect += 0.5 * setCount;
				} else if (normPrimary === "shoulders") {
					byMuscle.triceps.indirect += 0.5 * setCount;
				}

				// Secondary muscles on the exercise
				const secondaryList = Array.isArray(ex.secondary)
					? ex.secondary
					: Array.isArray(ex.muscles)
						? ex.muscles.slice(1)
						: [];
				for (const sec of secondaryList) {
					const normSec = normalizeMuscle(sec);
					if (normSec && normSec !== normPrimary && byMuscle[normSec]) {
						if (normPrimary === "chest" && normSec === "triceps") continue;
						if (normPrimary === "back" && normSec === "biceps") continue;
						if (normPrimary === "shoulders" && normSec === "triceps") continue;
						byMuscle[normSec].indirect += 0.5 * setCount;
					}
				}
			}
		}

		byMuscle.arms.direct = byMuscle.biceps.direct + byMuscle.triceps.direct;
		byMuscle.arms.indirect =
			byMuscle.biceps.indirect + byMuscle.triceps.indirect;

		let totalDirect = 0;
		let totalIndirect = 0;

		for (const m of Object.keys(byMuscle)) {
			const item = byMuscle[m];
			item.total = item.direct + item.indirect;
			item.effectiveSets = item.total;
			item.status = item.total >= item.anchor ? "עמד ביעד" : "בבנייה";
			item.ratio = Math.round((item.total / item.anchor) * 100) / 100;
			item.percentage = Math.round((item.total / item.anchor) * 100);
			if (m !== "arms") {
				totalDirect += item.direct;
				totalIndirect += item.indirect;
			}
		}

		const result = {
			anchor: WEEKLY_ANCHOR_SETS,
			weeklyAnchor: WEEKLY_ANCHOR_SETS,
			totalDirectSets: totalDirect,
			totalIndirectSets: totalIndirect,
			totalEffectiveSets: totalDirect + totalIndirect,
			byMuscle: byMuscle,
			muscles: byMuscle,
		};

		for (const m of Object.keys(byMuscle)) {
			result[m] = byMuscle[m];
		}

		return result;
	}

	function buildAdaptationReport(profile, workout, weeklySessions) {
		profile = profile || {};
		workout = workout || {};
		const sessions =
			weeklySessions ||
			(workout && (workout.phases || workout.exercises) ? [workout] : []);
		const volumeBudget = calculateWeeklyVolumeBudget(sessions);

		let muscle = null;
		if (
			workout.tags &&
			workout.tags.length > 0 &&
			workout.tags[0] !== "general"
		) {
			muscle = workout.tags[0];
		} else if (workout.focus) {
			muscle = workout.focus;
		} else if (profile.focus) {
			muscle = profile.focus;
		} else if (profile.muscle) {
			muscle = profile.muscle;
		} else if (profile.targetMuscle) {
			muscle = profile.targetMuscle;
		} else if (
			Array.isArray(profile.targetMuscles) &&
			profile.targetMuscles.length > 0
		) {
			muscle = profile.targetMuscles[0];
		} else if (Array.isArray(profile.muscles) && profile.muscles.length > 0) {
			muscle = profile.muscles[0];
		} else if (typeof profile.prompt === "string") {
			muscle = inferMuscleFromName(profile.prompt);
		}

		const goal = profile.goal || workout.goal || null;
		const equipment = profile.equipment || workout.equipment || null;
		const level = profile.level || workout.level || null;

		const context = {
			muscle: muscle,
			goal: goal,
			equipment: equipment,
			level: level,
		};

		const selectedTemplate = selectAdaptationTemplate(
			profile,
			context,
			DEFAULT_TEMPLATES,
		);

		const templateOutput = {};
		for (const field of ADAPTATION_FIELDS) {
			const val = selectedTemplate ? selectedTemplate[field] : null;
			templateOutput[field] =
				val && typeof val === "string" && val.trim().length > 0
					? val.trim()
					: "לא ידוע";
		}

		const report = {
			title: "התאמה להרכב הגוף וליכולת שלך",
			goal: templateOutput.goal,
			basedOn: templateOutput.basedOn,
			todayFocus: templateOutput.todayFocus,
			personalAdaptation: templateOutput.personalAdaptation,
			howToProgress: templateOutput.howToProgress,
			howToMeasure: templateOutput.howToMeasure,
			promiseLimits: templateOutput.promiseLimits,
			whenToStop: templateOutput.whenToStop,
			template: templateOutput,
			targetMuscle: muscle ? normalizeMuscle(muscle) || muscle : "לא ידוע",
			equipment:
				equipment && (typeof equipment === "string" || equipment.length)
					? Array.isArray(equipment)
						? equipment.join(", ")
						: equipment
					: "לא ידוע",
			level: level || "לא ידוע",
			selectedGoal: goal || "לא ידוע",
			volumeBudget: volumeBudget,
			weeklyVolumeBudget: volumeBudget,
		};

		return report;
	}

	const api = {
		selectAdaptationTemplate: selectAdaptationTemplate,
		calculateWeeklyVolumeBudget: calculateWeeklyVolumeBudget,
		buildAdaptationReport: buildAdaptationReport,
		ADAPTATION_FIELDS: ADAPTATION_FIELDS,
		WEEKLY_ANCHOR_SETS: WEEKLY_ANCHOR_SETS,
		DEFAULT_TEMPLATES: DEFAULT_TEMPLATES,
		normalizeMuscle: normalizeMuscle,
	};

	if (root) {
		root.THAdaptation = api;
		root.THAdaptationEngine = api;
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
