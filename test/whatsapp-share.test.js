const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const {
	formatWorkoutWhatsAppText,
	formatReservesResultText,
	buildWhatsAppShareUrl,
} = require("../js/whatsapp-share.js");

const root = path.join(__dirname, "..");

test("עיצוב אימון תקין - עיצוב מבנה מלא של אימון להודעת וואטסאפ קריאה ומפורטת", () => {
	const workout = {
		title: "אימון כוח ובטן למילואים",
		duration_minutes: 40,
		equipment: ["מתח", "גומיות"],
		phases: [
			{
				name: "חימום",
				exercises: [
					{
						name: "סיבובי ידיים ומפרקים",
						sets: 2,
						duration_seconds: 30,
						notes: "קצב קל",
					},
				],
			},
			{
				name: "חלק עיקרי",
				exercises: [
					{
						name: "שכיבות סמיכה עם ניתוק ידיים",
						sets: 3,
						reps: "15",
						rest_seconds: 60,
						notes: "חזה וירכיים לרצפה",
					},
					{
						name: "פלאנק סטטי",
						sets: 3,
						duration_seconds: 45,
						rest_seconds: 45,
					},
				],
			},
		],
	};

	const text = formatWorkoutWhatsAppText(workout);
	assert.ok(text.length > 0, "הפלט לא יכול להיות ריק");
	assert.ok(
		text.includes("*אימון כוח ובטן למילואים*"),
		"צריך לכלול כותרת מודגשת",
	);
	assert.ok(text.includes("40 דקות"), "צריך לכלול את משך האימון");
	assert.ok(text.includes("מתח, גומיות"), "צריך לכלול את רשימת הציוד");
	assert.ok(text.includes("*חימום*"), "צריך לכלול כותרת פאזה");
	assert.ok(text.includes("*חלק עיקרי*"), "צריך לכלול כותרת פאזה");
	assert.ok(
		text.includes("שכיבות סמיכה עם ניתוק ידיים"),
		"צריך לכלול שם תרגיל",
	);
	assert.ok(text.includes("3 × 15"), "צריך לכלול סטים וחזרות");
	assert.ok(text.includes("מנוחה: 60 שנ׳"), "צריך לכלול זמני מנוחה");
	assert.ok(text.includes("חזה וירכיים לרצפה"), "צריך לכלול דגשים");
	assert.ok(text.includes("TrainerHub"), "צריך לכלול קרדיט או חתימה");

	const simpleWorkout = {
		title: "אימון קצר",
		exercises: [{ name: "סקווט משקל גוף", sets: 3, reps: "20" }],
	};
	const simpleText = formatWorkoutWhatsAppText(simpleWorkout);
	assert.ok(simpleText.includes("*אימון קצר*"));
	assert.ok(simpleText.includes("סקווט משקל גוף (3 × 20)"));
});

test("אימון ריק/null - טיפול בטוח בקלטים ריקים או לא תקינים ללא שגיאות", () => {
	assert.equal(formatWorkoutWhatsAppText(null), "");
	assert.equal(formatWorkoutWhatsAppText(undefined), "");
	assert.equal(formatWorkoutWhatsAppText({}), "");
	assert.equal(formatWorkoutWhatsAppText({ title: "" }), "");
	assert.equal(formatWorkoutWhatsAppText({ title: "   " }), "");
	assert.equal(formatWorkoutWhatsAppText({ phases: [] }), "");
	assert.equal(formatWorkoutWhatsAppText({ phases: [{ exercises: [] }] }), "");
	assert.equal(formatWorkoutWhatsAppText("workout-string"), "");
	assert.equal(formatWorkoutWhatsAppText(12345), "");
});

test("בוחן מילואים עובר - עיצוב תוצאת בוחן מילואים עם מעמד עובר ופירוט המדדים", () => {
	const passedEvaluation = {
		overall: "pass",
		allPassed: true,
		deadline_display_he: "1.12",
		tests: [
			{
				id: "pushups",
				name_he: "שכיבות סמיכה עם ניתוק ידיים",
				pass: true,
				incomplete: false,
				value: 32,
				display: "32",
				threshold_display: "25",
			},
			{
				id: "plank",
				name_he: "פלאנק אמות",
				pass: true,
				incomplete: false,
				value: 95,
				display: "1:35",
				threshold_display: "1:30",
			},
			{
				id: "run",
				name_he: "ריצת 3000 מטר",
				pass: true,
				incomplete: false,
				value: 840,
				display: "14:00",
				threshold_display: "14:30",
			},
		],
	};

	const text = formatReservesResultText(passedEvaluation);
	assert.ok(text.includes("*סיכום מדדי מילואים*"), "צריך לכלול כותרת בוחן");
	assert.ok(text.includes("עובר"), "צריך לציין סטטוס עובר");
	assert.ok(text.includes("1.12"), "צריך לכלול תאריך יעד");
	assert.ok(text.includes("שכיבות סמיכה עם ניתוק ידיים"), "צריך לכלול שם המדד");
	assert.ok(text.includes("32"), "צריך לכלול תוצאה שהושגה");
	assert.ok(text.includes("25"), "צריך לכלול סף יעד");
	assert.ok(text.includes("ריצת 3000 מטר"), "צריך לכלול שם המדד");
	assert.ok(text.includes("TrainerHub"), "צריך לכלול חתימה");

	const singlePass = {
		id: "pushups",
		name_he: "שכיבות סמיכה",
		pass: true,
		display: "30",
		threshold_display: "25",
	};
	const singleText = formatReservesResultText(singlePass);
	assert.ok(singleText.includes("שכיבות סמיכה"));
	assert.ok(singleText.includes("עובר"));
});

test("בוחן מילואים נכשל - עיצוב תוצאת בוחן מילואים עם מעמד לא עובר ופירוט המדדים שנכשלו", () => {
	const failedEvaluation = {
		overall: "fail",
		allPassed: false,
		tests: [
			{
				id: "pushups",
				name_he: "שכיבות סמיכה עם ניתוק ידיים",
				pass: true,
				incomplete: false,
				value: 30,
				display: "30",
				threshold_display: "25",
			},
			{
				id: "run",
				name_he: "ריצת 3000 מטר",
				pass: false,
				incomplete: false,
				value: 990,
				display: "16:30",
				threshold_display: "14:30",
			},
		],
	};

	const text = formatReservesResultText(failedEvaluation);
	assert.ok(text.includes("לא עובר"), "צריך לציין סטטוס לא עובר");
	assert.ok(text.includes("ריצת 3000 מטר"), "צריך לכלול את המדד שנכשל");
	assert.ok(text.includes("16:30"), "צריך לכלול את התוצאה שנכשלה");
	assert.ok(text.includes("14:30"), "צריך לכלול את היעד");

	assert.equal(formatReservesResultText(null), "");
	assert.equal(formatReservesResultText(undefined), "");
	assert.equal(formatReservesResultText({}), "");
	assert.equal(formatReservesResultText("invalid"), "");
});

test("קידוד URL תקני ל-wa.me - הפקת קישור תקין, מאובטח ומקודד ל-wa.me", () => {
	const message =
		"שלום! 💪 סיכום אימון TrainerHub:\n• שכיבות סמיכה 3x15\nhttps://example.com?test=1&b=2";
	const url = buildWhatsAppShareUrl(message);

	assert.ok(
		url.startsWith("https://wa.me/?text="),
		"הקישור חייב להתחיל ב-https://wa.me/?text=",
	);
	assert.ok(!url.includes(" "), "ה-URL אינו רשאי להכיל רווחים לא מקודדים");
	assert.ok(
		!url.includes("\n"),
		"ה-URL אינו רשאי להכיל ירידות שורה לא מקודדות",
	);

	const encodedPart = url.slice("https://wa.me/?text=".length);
	const decoded = decodeURIComponent(encodedPart);
	assert.equal(decoded, message.trim(), "הודעת הפענוח חייבת להיות זהה למקור");
});

test("קישור ריק לקלט פסול - buildWhatsAppShareUrl מחזיר מחרוזת ריקה לערכים ריקים או שגויים", () => {
	assert.equal(buildWhatsAppShareUrl(null), "");
	assert.equal(buildWhatsAppShareUrl(undefined), "");
	assert.equal(buildWhatsAppShareUrl(""), "");
	assert.equal(buildWhatsAppShareUrl("   "), "");
	assert.equal(buildWhatsAppShareUrl("\t\n  "), "");
	assert.equal(buildWhatsAppShareUrl(12345), "");
	assert.equal(buildWhatsAppShareUrl({}), "");
	assert.equal(buildWhatsAppShareUrl([]), "");
	assert.equal(buildWhatsAppShareUrl(true), "");
});

test("קיום הכפתורים ב-reserves.html - בדיקת קיום כפתור שיתוף בוואטסאפ בעמוד מדדי מילואים", () => {
	const html = fs.readFileSync(path.join(root, "reserves.html"), "utf8");

	assert.ok(
		html.includes('id="shareReservesWhatsappBtn"'),
		"reserves.html חייב להכיל כפתור עם id='shareReservesWhatsappBtn'",
	);
	assert.ok(
		html.includes('src="./js/whatsapp-share.js"'),
		"reserves.html חייב לטעון את הסקריפט whatsapp-share.js",
	);

	const btnMatch = html.match(
		/<button\b[^>]*id=["']shareReservesWhatsappBtn["'][^>]*>([\s\S]*?)<\/button>/i,
	);
	assert.ok(
		btnMatch,
		"כפתור shareReservesWhatsappBtn חייב להיות תגית button תקנית",
	);
	const btnTag = btnMatch[0];
	assert.ok(
		btnTag.includes('type="button"'),
		"הכפתור חייב להגדיר type='button'",
	);
	assert.ok(
		btnTag.includes("aria-label=") || btnMatch[1].trim().length > 0,
		"הכפתור חייב להכיל טקסט קריא או תווית נגישות aria-label",
	);
});

test("קיום הכפתורים ב-index.html - בדיקת קיום כפתור שיתוף בוואטסאפ בעמוד בונה האימונים", () => {
	const html = fs.readFileSync(path.join(root, "index.html"), "utf8");

	assert.ok(
		html.includes('id="shareWorkoutWhatsappBtn"'),
		"index.html חייב להכיל כפתור עם id='shareWorkoutWhatsappBtn'",
	);
	assert.ok(
		html.includes('src="./js/whatsapp-share.js"'),
		"index.html חייב לטעון את הסקריפט whatsapp-share.js",
	);

	const btnMatch = html.match(
		/<button\b[^>]*id=["']shareWorkoutWhatsappBtn["'][^>]*>([\s\S]*?)<\/button>/i,
	);
	assert.ok(
		btnMatch,
		"כפתור shareWorkoutWhatsappBtn חייב להיות מוגדר כ-button",
	);
	const btnTag = btnMatch[0];
	assert.ok(
		btnTag.includes('type="button"'),
		"הכפתור חייב להגדיר type='button'",
	);
	assert.ok(
		btnTag.includes("aria-label=") || btnMatch[1].trim().length > 0,
		"הכפתור חייב להכיל טקסט קריא או תווית נגישות aria-label",
	);
});
