const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const Engine = require("../js/adaptation-engine.js");

const templatesPath = path.join(
	__dirname,
	"..",
	"content",
	"adaptation-templates.json",
);

test("schema validation: adaptation-templates.json contains 7 muscle groups and 8 required fields without somatotypes or spot reduction", () => {
	assert.ok(
		fs.existsSync(templatesPath),
		"content/adaptation-templates.json must exist",
	);
	const raw = fs.readFileSync(templatesPath, "utf8");
	const templates = JSON.parse(raw);

	const requiredMuscles = [
		"chest",
		"legs",
		"arms",
		"back",
		"shoulders",
		"core",
		"full_body",
	];

	const requiredFields = [
		"goal",
		"basedOn",
		"todayFocus",
		"personalAdaptation",
		"howToProgress",
		"howToMeasure",
		"promiseLimits",
		"whenToStop",
	];

	for (const muscle of requiredMuscles) {
		assert.ok(
			templates[muscle],
			`muscle group "${muscle}" must exist in templates`,
		);
		for (const field of requiredFields) {
			const value = templates[muscle][field];
			assert.ok(
				typeof value === "string" && value.trim().length > 0,
				`field "${field}" in muscle "${muscle}" must be a non-empty string`,
			);
		}

		const fullText = JSON.stringify(templates[muscle]);
		assert.ok(
			!/אקטומורף|מזומורף|אנדומורף|ectomorph|mesomorph|endomorph/i.test(
				fullText,
			),
			`muscle "${muscle}" must not prescribe somatotypes`,
		);

		assert.ok(
			/ללא הבטחה|אינו מוריד שומן|אינם מורידים שומן|אינם שורפים שומן|אינו שורף שומן|לא בירידת שומן נקודתית/i.test(
				templates[muscle].promiseLimits,
			),
			`muscle "${muscle}" promiseLimits must clarify no local spot fat reduction`,
		);
	}
});

test("selectAdaptationTemplate selects template by muscle and adapts by equipment and goal", () => {
	const chestHypertrophy = Engine.selectAdaptationTemplate(
		{ goal: "בניית שריר" },
		{ muscle: "chest", equipment: "none" },
	);
	assert.ok(chestHypertrophy.goal.includes("חזה"));
	assert.ok(chestHypertrophy.personalAdaptation.includes("משקל גוף"));
	assert.ok(chestHypertrophy.promiseLimits.includes("שומן"));

	const backBandFatLoss = Engine.selectAdaptationTemplate(
		{ goal: "שימור שריר בירידה בשומן" },
		{ muscle: "back", equipment: "band" },
	);
	assert.ok(backBandFatLoss.goal.includes("גב"));
	assert.ok(backBandFatLoss.goal.includes("שימור"));
	assert.ok(backBandFatLoss.personalAdaptation.includes("גומיי"));
	assert.ok(backBandFatLoss.promiseLimits.includes("מערכתי"));

	const legsStrength = Engine.selectAdaptationTemplate(
		{ goal: "כוח ותפקוד" },
		{ muscle: "legs" },
	);
	assert.ok(
		legsStrength.goal.includes("רגליים") || legsStrength.goal.includes("רגלים"),
	);
	assert.ok(legsStrength.goal.includes("כוח"));
});

test("selectAdaptationTemplate fallback to 'לא ידוע' on missing fields or unknown templates", () => {
	const emptyResult = Engine.selectAdaptationTemplate(
		{},
		{ muscle: "nonexistent_muscle" },
		{},
	);
	const fields = [
		"goal",
		"basedOn",
		"todayFocus",
		"personalAdaptation",
		"howToProgress",
		"howToMeasure",
		"promiseLimits",
		"whenToStop",
	];

	for (const f of fields) {
		assert.equal(
			emptyResult[f],
			"לא ידוע",
			`field ${f} must fall back to 'לא ידוע'`,
		);
	}

	const partialTemplate = {
		custom_muscle: {
			goal: "יעד מוגדר",
			basedOn: null,
			todayFocus: "",
		},
	};
	const partialResult = Engine.selectAdaptationTemplate(
		{},
		{ muscle: "custom_muscle" },
		partialTemplate,
	);
	assert.equal(partialResult.goal, "יעד מוגדר");
	assert.equal(partialResult.basedOn, "לא ידוע");
	assert.equal(partialResult.todayFocus, "לא ידוע");
	assert.equal(partialResult.whenToStop, "לא ידוע");
});

test("calculateWeeklyVolumeBudget computes direct sets and 0.5 indirect sets against 10 weekly anchor", () => {
	const session = {
		phases: [
			{
				name: "Warm-up",
				exercises: [{ name: "חימום", sets: 1, muscles: ["core"] }],
			},
			{
				name: "Main",
				exercises: [
					{ name: "שכיבות סמיכה", sets: 4, primary: "chest" },
					{ name: "מתח", sets: 4, primary: "back" },
				],
			},
		],
	};

	const budget = Engine.calculateWeeklyVolumeBudget(session);

	assert.equal(budget.anchor, 10);
	assert.equal(budget.weeklyAnchor, 10);
	assert.equal(budget.chest.direct, 4);
	assert.equal(budget.chest.indirect, 0);
	assert.equal(budget.chest.total, 4);

	assert.equal(budget.back.direct, 4);
	assert.equal(budget.back.indirect, 0);
	assert.equal(budget.back.total, 4);

	// Chest contributes 0.5 per set to triceps -> 4 * 0.5 = 2
	assert.equal(budget.triceps.direct, 0);
	assert.equal(budget.triceps.indirect, 2);
	assert.equal(budget.triceps.total, 2);

	// Back contributes 0.5 per set to biceps -> 4 * 0.5 = 2
	assert.equal(budget.biceps.direct, 0);
	assert.equal(budget.biceps.indirect, 2);
	assert.equal(budget.biceps.total, 2);

	assert.equal(budget.arms.direct, 0);
	assert.equal(budget.arms.indirect, 4);
	assert.equal(budget.arms.total, 4);
});

test("calculateWeeklyVolumeBudget aggregates multiple weekly sessions and reports target status", () => {
	const session1 = {
		phases: [
			{
				name: "Main",
				exercises: [
					{ name: "שכיבות סמיכה", sets: 5, primary: "chest" },
					{ name: "סקוואט", sets: 6, primary: "legs" },
				],
			},
		],
	};
	const session2 = {
		phases: [
			{
				name: "Main",
				exercises: [
					{ name: "לחיצת חזה", sets: 5, primary: "chest" },
					{ name: "פשיטת ברכיים", sets: 4, primary: "legs" },
				],
			},
		],
	};

	const budget = Engine.calculateWeeklyVolumeBudget([session1, session2]);

	assert.equal(budget.chest.direct, 10);
	assert.equal(budget.chest.total, 10);
	assert.equal(budget.chest.status, "עמד ביעד");

	assert.equal(budget.legs.direct, 10);
	assert.equal(budget.legs.total, 10);
	assert.equal(budget.legs.status, "עמד ביעד");

	assert.equal(budget.triceps.indirect, 5);
	assert.equal(budget.triceps.status, "בבנייה");
});

test("buildAdaptationReport creates complete report with fallback 'לא ידוע' on missing fields", () => {
	const workout = {
		title: "אימון חזה ורגליים",
		tags: ["chest"],
		phases: [
			{
				name: "Main",
				exercises: [{ name: "שכיבות סמיכה", sets: 3, primary: "chest" }],
			},
		],
	};

	const report = Engine.buildAdaptationReport(
		{ goal: "בניית שריר", level: null },
		workout,
	);

	assert.equal(report.title, "התאמה להרכב הגוף וליכולת שלך");
	assert.ok(report.goal.includes("חזה"));
	assert.notEqual(report.basedOn, "לא ידוע");
	assert.notEqual(report.todayFocus, "לא ידוע");
	assert.notEqual(report.personalAdaptation, "לא ידוע");
	assert.notEqual(report.howToProgress, "לא ידוע");
	assert.notEqual(report.howToMeasure, "לא ידוע");
	assert.notEqual(report.promiseLimits, "לא ידוע");
	assert.notEqual(report.whenToStop, "לא ידוע");
	assert.equal(report.level, "לא ידוע");

	assert.ok(report.volumeBudget, "volumeBudget must exist");
	assert.equal(report.volumeBudget.chest.direct, 3);
	assert.equal(report.volumeBudget.triceps.indirect, 1.5);
});

test("buildAdaptationReport handles null/empty workout and profile safely", () => {
	const emptyReport = Engine.buildAdaptationReport(null, null);

	assert.equal(emptyReport.title, "התאמה להרכב הגוף וליכולת שלך");
	assert.equal(emptyReport.level, "לא ידוע");
	assert.equal(emptyReport.equipment, "לא ידוע");
	assert.equal(emptyReport.selectedGoal, "לא ידוע");
	assert.ok(emptyReport.volumeBudget, "volumeBudget must be safely generated");
	assert.equal(emptyReport.volumeBudget.totalDirectSets, 0);
	assert.equal(emptyReport.volumeBudget.anchor, 10);
});
