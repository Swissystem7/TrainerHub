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

	const RESEARCH_RULES = {
		R1: {
			id: "R1",
			name: "hypertrophy_anchor",
			source: "ACSM 2026, Pelland 2026, ACSM 2024",
			type: "evidence",
			description:
				"התקדמות לכ-10 סטים לשריר בשבוע עם תשואה פוחתת, RIR 2-3, טווח עומסים רחב (6-15 במורכבים, 10-20 בבידוד)",
		},
		R2: {
			id: "R2",
			name: "strength_stimulus",
			source: "ACSM 2026",
			type: "evidence",
			description:
				"דגש על עומסים גבוהים (80% 1RM ומעלה), 2-3 סטים לתרגיל",
		},
		R3: {
			id: "R3",
			name: "fat_loss_systemic",
			source: "ISSN 2017, ACSM 2024, Wewege 2022",
			type: "evidence",
			description:
				"שילוב כוח, אירובי (150 דק/שבוע) ותנועה יומיומית ללא החלפת כוח במעגלי שריפה",
		},
		R4: {
			id: "R4",
			name: "recomp_preservation",
			source: "Murphy & Koehler 2022, ISSN 2017",
			type: "evidence",
			description: "שימור שריר בגירעון מתון",
		},
		R5: {
			id: "R5",
			name: "general_consistency",
			source: "ACSM 2026, ACSM 2024",
			type: "evidence",
			description:
				"התמדה ואימון כל קבוצה לפחות פעמיים בשבוע, גם פחות מ-10 סטים מועיל",
		},
		R6: {
			id: "R6",
			name: "hiit_alternative",
			source: "ACSM 2024, Cheng 2026",
			type: "evidence",
			description:
				"HIIT חוסך זמן אך ללא עליונות עקבית בשריפת שומן על פני אירובי רציף",
		},
		R7: {
			id: "R7",
			name: "beginner_volume",
			source: "ACSM 2026",
			type: "evidence",
			description: "נפח התחלתי שניתן להתאושש ממנו, ~3 RIR",
		},
		R8: {
			id: "R8",
			name: "progressive_overload",
			source: "ACSM 2026, ACSM 2009",
			type: "evidence",
			description:
				"העלאת עומס הדרגתית כשמגיעים לקצה העליון של החזרות ברזרבה ביותר ממפגש אחד",
		},
		R9: {
			id: "R9",
			name: "frequency_distribution",
			source: "ACSM 2026",
			type: "evidence",
			description: "חלוקת תקציב שבועי על לפחות 2 מפגשים לכל קבוצה מרכזית",
		},
		R10: {
			id: "R10",
			name: "single_session_gap",
			source: "TODO/config",
			type: "default",
			description:
				"מפגש שבועי יחיד - אזהרה על קושי בעמידה ביעד התדירות",
		},
		R11: {
			id: "R11",
			name: "indirect_volume",
			source: "Pelland 2026",
			type: "evidence",
			description: "ספירת סט עקיף כאומדן של כ-0.5 סט",
		},
		R12: {
			id: "R12",
			name: "equipment_flexibility",
			source: "ACSM 2026",
			type: "evidence",
			description: "בחירת תרגילים לפי ציוד זמין ללא פגיעה בתוצאות",
		},
		R13: {
			id: "R13",
			name: "waist_thresholds",
			source: "WHO 2011",
			type: "evidence",
			description:
				"ספי מותן (94/80 ו-102/88 סמ) כסמני סיכון ולא כאבחנה או בחירת תרגיל",
		},
		R14: {
			id: "R14",
			name: "whr_thresholds",
			source: "WHO 2011",
			type: "evidence",
			description:
				"ספי WHR (0.90 לגבר, 0.85 לאישה) כסמן פיזור שומן",
		},
		R15: {
			id: "R15",
			name: "sex_unspecified_trend",
			source: "TODO/config",
			type: "default",
			description: "מין לא מוגדר - הצגת מגמה לאורך זמן בלבד",
		},
		R16: {
			id: "R16",
			name: "body_fat_context",
			source: "ISSN 2017",
			type: "evidence",
			description:
				"הרכב גוף כהקשר, שמירה על שיטת מדידה ותנאים עקביים",
		},
		R17: {
			id: "R17",
			name: "high_fat_keep_strength",
			source: "ISSN 2017, ACSM 2024",
			type: "evidence",
			description:
				"באחוז שומן גבוה שמירה על כוח לצד אירובי ולא החלפה במעגלים",
		},
		R18: {
			id: "R18",
			name: "lean_deficit_moderate",
			source: "ISSN 2017",
			type: "evidence",
			description: "מתאמן רזה בגירעון - קצב ירידה מתון לשימור שריר",
		},
		R19: {
			id: "R19",
			name: "target_region_no_spot_reduction",
			source:
				"Ramirez-Campillo 2022, Kostek 2007, Ramírez-Campillo 2013, Brobakken 2023",
			type: "evidence",
			description:
				"נפח ישיר לשריר האזור בתקציב שבועי, ללא הבטחה להורדת שומן מקומית",
		},
		R20: {
			id: "R20",
			name: "somatotype_descriptive_only",
			source: "Martínez-Mireles 2025, ACSM 2026",
			type: "evidence",
			description:
				"סומטוטיפ כתיאור מצב ולא גורל ביולוגי, אין לקבוע מינון מתווית בלבד",
		},
		R21: {
			id: "R21",
			name: "recovery_sleep_gate",
			source: "Murphy & Koehler 2022, Saner 2020, AASM/SRS 2015",
			type: "evidence",
			description:
				"שינה מתחת ל-7 שעות או ירידה בביצועים - לא להוסיף סטים לפני בדיקת התאוששות",
		},
		R22: {
			id: "R22",
			name: "limitations_variation",
			source: "ACSM 2026",
			type: "default",
			description: "ביצוע גרסה בשליטה ונוחות מפרקית בעת מגבלות",
		},
		R23: {
			id: "R23",
			name: "safety_stop",
			source: "TODO/config",
			type: "default",
			description:
				"כאב חדש, קושי חריג או התאוששות לא מספקת מחייבים עצירה והערכה מקצועית",
		},
		R24: {
			id: "R24",
			name: "medical_flag_block",
			source: "ISSN 2017",
			type: "evidence",
			description:
				"מצב רפואי או מתחת לגיל 18 - חסימת חישוב אוטומטי והפניה למקצוען",
		},
		R25: {
			id: "R25",
			name: "protein_target",
			source: "ISSN 2017, Morton 2018",
			type: "evidence",
			description:
				"1.4-2.0 גרם חלבון לקג ליום, 20-40 גרם למנה, התמתנות סביב 1.62 גרם לקג",
		},
		R26: {
			id: "R26",
			name: "lean_deficit_protein",
			source: "ISSN 2017",
			type: "evidence",
			description:
				"מתאמן כוח רזה בגירעון - 2.3-3.1 גרם לקג מסה נטולת שומן (FFM)",
		},
	};

	const DEFAULT_TEMPLATES = {
		chest: {
			goal: "בנייה וחיזוק של שרירי החזה ודחיפה פלג גוף עליון",
			basedOn:
				"עומס מכני מדורג ושליטה בטווחי תנועה מלאים לפי מטרה ויכולת נוכחית ולא לפי תווית גוף (סומטוטיפ הוא תיאור מצב קיים ולא גורל ביולוגי)",
			todayFocus:
				"שליטה בפאזה האקסצנטרית (ירידה איטית ומבוקרת), יציבות חגורת הכתפיים ושליטה בטכניקה",
			personalAdaptation:
				"בחירת גרסת תרגיל (כגון מכונה או משקולות) ומנח מפרקי לפי שליטה ונוחות בפועל, ולא בגלל תווית גוף",
			howToProgress:
				"התקדמות בטווח נפח שבועי של 8–12 סטים קשים לחזה (עוגן של כ-10 סטים); העלאת עומס הדרגתית כשכל הסטים מושלמים בקצה טווח החזרות עם 2–3 חזרות ברזרבה (RIR) ביותר ממפגש אחד",
			howToMeasure:
				"מעקב אחר מגמת כוח וביצועים, היקף מותן ותמונות מעקב עקביות לאורך זמן, ולא על בסיס שקילה יומית או תנודות נוזלים",
			promiseLimits:
				"האימון מחזק ובונה את רקמת שריר החזה ללא הבטחה להורדת שומן מקומית מאזור החזה; איבוד שומן מקומי אינו מובטח, והאימון מכוון לפיתוח השרירים באזור ולא להורדת שומן דווקא ממנו",
			whenToStop:
				"עצירה מיידית במקרה של כאב חד או דקירה במפרק הכתף או המרפק; כאב חדש, קושי חריג או התאוששות לא מספקת מצריכים עצירה, התאמה ובמידת הצורך הערכה מקצועית",
		},
		legs: {
			goal: "בניית כוח ונפח שרירי ברגליים ובפלג גוף תחתון (ארבע-ראשי, ישבן, מיתרי הברך ותאומים)",
			basedOn:
				"העמסה פרוגרסיבית של תבניות כריעה ופשיטת ירך בהתאם לתנועתיות אישית, תוך התייחסות למבנה כתיאור מצב ולא גורל ביולוגי",
			todayFocus:
				"חלוקת משקל אחידה בכף הרגל ושמירה על מסלול תנועה יציב של הברכיים והאגן",
			personalAdaptation:
				"בחירת עומק ירידה, רוחב עמידה ותרגילים עם תמיכה לפי יציבות ונוחות מפרק הירך, ולא בגלל תווית גוף",
			howToProgress:
				"התקדמות בטווח נפח שבועי של 8–14 סטים קשים לרגליים; העלאת התנגדות מתונה כשיש שליטה מלאה בטווח התנועה וברזרבה הרצויה (RIR 2-3)",
			howToMeasure:
				"מעקב אחר מגמת ביצועים, שליטה בעומסים, היקף מותן ותמונות מעקב תקופתיות במקום שקילה יומית",
			promiseLimits:
				"עבודה כנגד התנגדות מחזקת את שרירי הרגליים והעכוז, ללא הבטחה להורדת שומן מקומית או נקודתית מהירכיים; איבוד שומן מקומי אינו מובטח, והפחתת שומן היא תהליך כלל-גופי",
			whenToStop:
				"עצירה במקרה של כאב חד בברך, בירך או בעמוד השדרה; כאב חדש, קושי חריג או התאוששות לא מספקת מצריכים עצירה והערכה מקצועית",
		},
		arms: {
			goal: "פיתוח כוח, מסה וסיבולת שרירית בזרועות (דו-ראשי ותלת-ראשי)",
			basedOn:
				"שילוב תרגילים ייעודיים לזרועות עם תרגילי משיכה ולחיצה מורכבים לפי יכולת והתאוששות (סומטוטיפ הינו תיאור מצב ולא גורל ביולוגי)",
			todayFocus:
				"בידוד התנועה במרפק תוך מניעת תנופת גוף ושמירה על קצב מבוקר",
			personalAdaptation:
				"התאמת אחיזה ומנח מפרקי להפחתת עומס משורש כף היד, וויסות נפח בהתחשב בעבודה עקיפה ולא בגלל תווית גוף",
			howToProgress:
				"התקדמות בטווח נפח שבועי של 6–10 סטים קשים ישירים לזרועות (תוך שקלול נפח עקיף מאימוני חזה וגב); הגדלת חזרות בטווח לפני העלאת משקל",
			howToMeasure:
				"מעקב אחר מגמת כוח, היקף זרוע בתנאי מדידה עקביים, היקף מותן ותמונות מעקב, ולא על סמך שקילה יומית",
			promiseLimits:
				"התרגילים מפתחים ומחזקים את שרירי הזרוע ללא הבטחה להורדת שומן מקומית בזרועות; איבוד שומן מקומי אינו מובטח, וירידה בהיקף דורשת גירעון אנרגטי כללי",
			whenToStop:
				"עצירה בעת הופעת כאב בגידי המרפק או במפרק כף היד; כאב חדש, קושי חריג או התאוששות ירודה מחייבים עצירה והתאמה מקצועית",
		},
		back: {
			goal: "חיזוק שרירי הגב (רחב גבי, טרפזים וזוקפי גו) ושיפור יציבות המשיכה",
			basedOn:
				"שילוב משיכות אנכיות ואופקיות לאיזון שרירי ומכניקה מדויקת לפי יכולת ומטרה (סומטוטיפ הוא תיאור מצב ולא גורל ביולוגי)",
			todayFocus:
				"ייזום התנועה משרירי הגב והצמדת שכמות בסוף המשיכה",
			personalAdaptation:
				"בחירת סוג אחיזה וטווח משיכה לפי נוחות חגורת הכתפיים ושליטה בשכמות, ולא בגלל תווית גוף",
			howToProgress:
				"התקדמות בטווח נפח שבועי של 8–12 סטים קשים לגב; העלאת עומס או חזרות כשנשמרות 2–3 חזרות ברזרבה (RIR) בשליטה מלאה",
			howToMeasure:
				"מעקב אחר מגמת כוח וביצועים, היקף מותן ותמונות התקדמות במקום שקילה יומית",
			promiseLimits:
				"חיזוק הגב משפר יציבה וכוח ללא הבטחה להורדת שומן מקומית או נקודתית בגב; איבוד שומן מקומי אינו מובטח, והשינוי בהרכב הגוף הוא מערכתי",
			whenToStop:
				"עצירה מיידית במקרה של עומס חריג או כאב חד בגב או בצוואר; קושי חריג או כאב חדש מצריכים עצירה והערכה מקצועית",
		},
		shoulders: {
			goal: "פיתוח יציבות, כוח ונפח בקבוצת שרירי הכתפיים (דלתואיד)",
			basedOn:
				"עבודה בזוויות מפרק בטוחות ובמישור השכמה בהתאם למבנה תפקודי (סומטוטיפ הוא תיאור מצב ולא גורל ביולוגי)",
			todayFocus:
				"שליטה בגובה ההרמה ומניעת פיצוי באמצעות הצוואר או הגב",
			personalAdaptation:
				"התאמת זווית ההרמה במישור השכמה ובחירת ציוד לפי נוחות מפרקית ושליטה, ולא בגלל תווית גוף",
			howToProgress:
				"התקדמות בטווח נפח שבועי של 8–12 סטים קשים לכתפיים; התקדמות בחזרות או במשקל הקטן ביותר הזמין בשמירה על מהירות תנועה ורזרבה",
			howToMeasure:
				"מעקב אחר מגמת כוח ושליטה בעומסים, היקף מותן ותמונות מעקב תקופתיות, ללא תלות בשקילה יומית",
			promiseLimits:
				"תרגילי כתפיים בונים ומחזקים רקמת שריר ללא הבטחה להורדת שומן מקומית באזור הכתף; איבוד שומן מקומי אינו מובטח",
			whenToStop:
				"עצירה מיידית בתחושת צביטה, כאב חד בקדמת הכתף או מגבלה פתאומית; כאב חדש מצריך עצירה והערכה מקצועית",
		},
		core: {
			goal: "חיזוק שרירי הליבה, יציבות עמוד השדרה והעברת כוח יעילה",
			basedOn:
				"אימון תבניות ייצוב ושליטה נשימתית בהתאם ליכולת הגו ולא לפי תווית גוף (סומטוטיפ הוא תיאור מצב ולא גורל ביולוגי)",
			todayFocus:
				"החזקת גו ניטרלי, הפעלת דופן הבטן ונשימה סדירה לאורך כל התרגיל",
			personalAdaptation:
				"שינוי מנוף הגוף ומשך ההחזקה לפי יכולת בקרת האגן והגו, ולא בגלל תווית גוף",
			howToProgress:
				"התקדמות בטווח נפח שבועי של 8–12 סטים קשים לליבה; הארכת משך ההחזקה בשניות או מעבר לווריאציה מאתגרת ביציבות נקייה",
			howToMeasure:
				"מעקב אחר משך ביצוע נקי, היקף מותן, תמונות מעקב ומגמת כוח במקום שקילה יומית",
			promiseLimits:
				"אימוני ליבה מחזקים את השרירים הפנימיים והחיצוניים ללא הבטחה להורדת שומן מקומית בבטן; איבוד שומן מקומי אינו מובטח, וירידה בשומן דורשת גירעון אנרגטי כולל",
			whenToStop:
				"יש להפסיק בעת תחושת קריסה, לחץ או כאב בגב התחתון; כאב חדש או עייפות יתר מחייבים עצירה והתאמה",
		},
		full_body: {
			goal: "חיזוק כללי של מערכות השרירים, שיפור סיבולת וכושר תפקודי כולל",
			basedOn:
				"שילוב מאוזן של תבניות תנועה מרכזיות לפי יכולת, ניסיון ומטרות אישיות (סומטוטיפ הוא תיאור מצב ולא גורל ביולוגי)",
			todayFocus:
				"חלוקת מאמץ נכונה בין התחנות ושמירה על איכות תנועה גבוהה תחת עייפות",
			personalAdaptation:
				"וויסות זמני מנוחה, בחירת תרגילים ועומסי עבודה לפי רמת כושר והתאוששות, ולא בגלל תווית גוף",
			howToProgress:
				"התקדמות בטווח נפח שבועי של 8–12 סטים קשים לכל קבוצת שרירים מרכזית, מפוזרים על פני 2 מפגשים שבועיים לפחות",
			howToMeasure:
				"מעקב אחר מגמת כוח והתמדה, היקף מותן ותמונות מעקב לאורך זמן, ולא לפי שקילה יומית בודדת",
			promiseLimits:
				"האימון תורם להוצאה אנרגטית ולבניית שריר, אך שינוי בהרכב הגוף תלוי במאזן כולל וללא הבטחה להורדת שומן מקומית; איבוד שומן מקומי אינו מובטח",
			whenToStop:
				"יש לעצור במצב של תשישות המובילה לפגיעה בטכניקה או בהופעת כאב מפרקי חריג; כאב חדש מחייב עצירה והערכה מקצועית",
		},
	};

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

	function hasRuleHelper(id) {
		return Array.isArray(this.ruleIds) && this.ruleIds.indexOf(id) !== -1;
	}

	function researchRulesFor(focus) {
		const norm = normalizeMuscle(focus) || "full_body";
		const focusConfigs = {
			chest: {
				focus: "chest",
				hebrewName: "חזה",
				weeklyVolumeRange: { min: 8, max: 12, target: 10, range: "8-12" },
				ruleIds: ["R1", "R8", "R9", "R11", "R19", "R20", "R22", "R23"],
				indirectContributors: ["triceps", "shoulders"],
				indirectContributions: { triceps: 0.5 },
				noSpotReduction: true,
				somatotypeIsDestiny: false,
				howToMeasure:
					"מעקב אחר מגמת כוח וביצועים, היקף מותן ותמונות מעקב עקביות לאורך זמן, ולא על בסיס שקילה יומית",
				promiseLimits:
					"האימון מחזק ובונה את רקמת שריר החזה ללא הבטחה להורדת שומן מקומית מאזור החזה; איבוד שומן מקומי אינו מובטח",
			},
			legs: {
				focus: "legs",
				hebrewName: "רגליים",
				weeklyVolumeRange: { min: 8, max: 14, target: 10, range: "8-14" },
				ruleIds: ["R1", "R7", "R8", "R9", "R19", "R20", "R22", "R23"],
				indirectContributors: [],
				indirectContributions: {},
				noSpotReduction: true,
				somatotypeIsDestiny: false,
				howToMeasure:
					"מעקב אחר מגמת ביצועים, שליטה במשקלי עבודה, היקף מותן ותמונות תקופתיות במקום הסתמכות על שקילה יומית",
				promiseLimits:
					"עבודה כנגד התנגדות מחזקת את שרירי הרגליים והעכוז, ללא הבטחה להורדת שומן מקומית או נקודתית מהירכיים; איבוד שומן מקומי אינו מובטח",
			},
			arms: {
				focus: "arms",
				hebrewName: "ידיים",
				weeklyVolumeRange: { min: 6, max: 10, target: 8, range: "6-10" },
				ruleIds: ["R1", "R8", "R9", "R11", "R19", "R20", "R22", "R23"],
				indirectContributors: ["chest", "back"],
				indirectContributions: {},
				noSpotReduction: true,
				somatotypeIsDestiny: false,
				howToMeasure:
					"מעקב אחר מגמת כוח, היקף זרוע בתנאי מדידה זהים, היקף מותן ותמונות מעקב, ולא על סמך שקילה יומית",
				promiseLimits:
					"התרגילים מפתחים ומחזקים את שרירי הזרוע ללא הבטחה להורדת שומן מקומית בזרועות; איבוד שומן מקומי אינו מובטח",
			},
			back: {
				focus: "back",
				hebrewName: "גב",
				weeklyVolumeRange: { min: 8, max: 12, target: 10, range: "8-12" },
				ruleIds: ["R1", "R8", "R9", "R11", "R19", "R20", "R22", "R23"],
				indirectContributors: [],
				indirectContributions: { biceps: 0.5 },
				noSpotReduction: true,
				somatotypeIsDestiny: false,
				howToMeasure:
					"מעקב אחר מגמת כוח ומספר חזרות איכותיות, היקף מותן ותמונות התקדמות במקום שקילה יומית",
				promiseLimits:
					"חיזוק הגב משפר יציבה וכוח ללא הבטחה להורדת שומן מקומית או נקודתית בגב; איבוד שומן מקומי אינו מובטח",
			},
			shoulders: {
				focus: "shoulders",
				hebrewName: "כתפיים",
				weeklyVolumeRange: { min: 8, max: 12, target: 10, range: "8-12" },
				ruleIds: ["R1", "R8", "R9", "R11", "R19", "R20", "R22", "R23"],
				indirectContributors: [],
				indirectContributions: { triceps: 0.5 },
				noSpotReduction: true,
				somatotypeIsDestiny: false,
				howToMeasure:
					"מעקב אחר איכות התנועה, יציבות, היקף מותן ותמונות תקופתיות, ללא תלות בתנודות שקילה יומית",
				promiseLimits:
					"תרגילי כתפיים בונים ומחזקים רקמת שריר ללא הבטחה להורדת שומן מקומית באזור הכתף; איבוד שומן מקומי אינו מובטח",
			},
			core: {
				focus: "core",
				hebrewName: "ליבה",
				weeklyVolumeRange: { min: 8, max: 12, target: 10, range: "8-12" },
				ruleIds: ["R1", "R8", "R9", "R19", "R20", "R22", "R23"],
				indirectContributors: [],
				indirectContributions: {},
				noSpotReduction: true,
				somatotypeIsDestiny: false,
				howToMeasure:
					"מעקב אחר משך ביצוע נקי, היקף מותן, תמונות מעקב ומגמת כוח במקום שקילה יומית",
				promiseLimits:
					"אימוני ליבה מחזקים את השרירים הפנימיים והחיצוניים ללא הבטחה להורדת שומן מקומית בבטן; איבוד שומן מקומי אינו מובטח",
			},
			full_body: {
				focus: "full_body",
				hebrewName: "גוף מלא",
				weeklyVolumeRange: { min: 8, max: 12, target: 10, range: "8-12" },
				ruleIds: ["R1", "R5", "R8", "R9", "R11", "R19", "R20", "R22", "R23"],
				indirectContributors: [],
				indirectContributions: {},
				noSpotReduction: true,
				somatotypeIsDestiny: false,
				howToMeasure:
					"מעקב משולב אחר מגמת כוח וביצועים, היקף מותן, תמונות מעקב והתמדה לאורך זמן, ולא לפי שקילה יומית בודדת",
				promiseLimits:
					"האימון תורם להוצאה אנרגטית ולבניית שריר, אך שינוי בהרכב הגוף תלוי במאזן כולל וללא הבטחה להורדת שומן מקומית",
			},
		};

		const cfg = focusConfigs[norm] || focusConfigs.full_body;
		return {
			focus: cfg.focus,
			hebrewName: cfg.hebrewName,
			weeklyVolumeRange: cfg.weeklyVolumeRange,
			weeklyVolume: cfg.weeklyVolumeRange,
			ruleIds: cfg.ruleIds.slice(),
			rules: cfg.ruleIds.map((id) => RESEARCH_RULES[id]).filter(Boolean),
			hasRule: hasRuleHelper,
			noSpotReduction: cfg.noSpotReduction,
			somatotypeIsDestiny: cfg.somatotypeIsDestiny,
			howToMeasure: cfg.howToMeasure,
			promiseLimits: cfg.promiseLimits,
			indirectContributions: Object.assign({}, cfg.indirectContributions),
		};
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
			(Array.isArray(profile.targetRegion) && profile.targetRegion[0]) ||
			(typeof profile.targetRegion === "string" ? profile.targetRegion : null) ||
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

		if (matched) {
			if (
				goal === "שימור שריר בירידה בשומן" ||
				goal === "fat_loss" ||
				goal === "recomp"
			) {
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
			Array.isArray(profile.targetRegion) &&
			profile.targetRegion.length > 0
		) {
			muscle = profile.targetRegion[0];
		} else if (
			typeof profile.targetRegion === "string" &&
			profile.targetRegion.trim()
		) {
			muscle = profile.targetRegion.trim();
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

		const rulesForFocus = researchRulesFor(muscle);

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
			researchRules: rulesForFocus,
			rules: rulesForFocus.rules,
			ruleIds: rulesForFocus.ruleIds,
		};

		return report;
	}

	const api = {
		selectAdaptationTemplate: selectAdaptationTemplate,
		calculateWeeklyVolumeBudget: calculateWeeklyVolumeBudget,
		buildAdaptationReport: buildAdaptationReport,
		normalizeMuscle: normalizeMuscle,
		researchRulesFor: researchRulesFor,
		RESEARCH_RULES: RESEARCH_RULES,
		DEFAULT_TEMPLATES: DEFAULT_TEMPLATES,
		ADAPTATION_FIELDS: ADAPTATION_FIELDS,
		WEEKLY_ANCHOR_SETS: WEEKLY_ANCHOR_SETS,
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
