const test = require("node:test");
const assert = require("node:assert/strict");

const readinessUI = require("../js/reserves-readiness-ui.js");
const {
	computeReadinessScore,
	buildReadinessGrid,
	renderReadinessHeatmapHtml,
	renderReadinessHeatmap,
	READINESS_TIERS,
	STATUS_LABELS,
} = readinessUI;

test("1) 6 weeks x 2 sessions grid structure generation (12 total sessions)", () => {
	const grid = buildReadinessGrid();
	assert.equal(grid.totalWeeks, 6);
	assert.equal(grid.sessionsPerWeek, 2);
	assert.equal(grid.totalSessions, 12);
	assert.equal(grid.weeks.length, 6);

	let totalSessionCount = 0;
	const expectedIds = [
		"w1a",
		"w1b",
		"w2a",
		"w2b",
		"w3a",
		"w3b",
		"w4a",
		"w4b",
		"w5a",
		"w5b",
		"w6a",
		"w6b",
	];
	const actualIds = [];

	for (let w = 0; w < grid.weeks.length; w++) {
		const week = grid.weeks[w];
		assert.equal(week.weekNumber, w + 1);
		assert.equal(week.label_he, `שבוע ${w + 1}`);
		assert.equal(week.sessions.length, 2);
		for (const session of week.sessions) {
			totalSessionCount++;
			actualIds.push(session.id);
			assert.equal(session.week, w + 1);
			assert.ok(session.slot === 0 || session.slot === 1);
			assert.ok(session.label_he.includes(`שבוע ${w + 1}`));
		}
	}

	assert.equal(totalSessionCount, 12);
	assert.deepEqual(actualIds, expectedIds);
});

test("2) Readiness score calculation: 100% completion gives 100% and 'מוכנות שיא'", () => {
	const score = computeReadinessScore(12, 12);
	assert.equal(score.completedCount, 12);
	assert.equal(score.totalSessions, 12);
	assert.equal(score.percentage, 100);
	assert.equal(score.tier, "peak");
	assert.equal(score.tierLabel_he, "מוכנות שיא");
	assert.equal(score.color, "#16a34a");
});

test("3) Readiness score calculation: 75% completion gives 75% and 'במסלול'", () => {
	const score = computeReadinessScore(9, 12);
	assert.equal(score.completedCount, 9);
	assert.equal(score.totalSessions, 12);
	assert.equal(score.percentage, 75);
	assert.equal(score.tier, "on-track");
	assert.equal(score.tierLabel_he, "במסלול");
	assert.equal(score.color, "#2563eb");
});

test("4) Readiness score calculation: 33% completion gives 33% and 'דרוש חיזוק'", () => {
	const score = computeReadinessScore(4, 12);
	assert.equal(score.completedCount, 4);
	assert.equal(score.totalSessions, 12);
	assert.equal(score.percentage, 33);
	assert.equal(score.tier, "reinforce");
	assert.equal(score.tierLabel_he, "דרוש חיזוק");
	assert.equal(score.color, "#ea580c");
});

test("5) Boundary score 80% maps to 'מוכנות שיא'", () => {
	const score80 = computeReadinessScore(8, 10);
	assert.equal(score80.percentage, 80);
	assert.equal(score80.tier, "peak");
	assert.equal(score80.tierLabel_he, "מוכנות שיא");
	assert.equal(score80.color, "#16a34a");

	const score79 = computeReadinessScore(79, 100);
	assert.equal(score79.percentage, 79);
	assert.equal(score79.tier, "on-track");
	assert.equal(score79.tierLabel_he, "במסלול");
});

test("6) Boundary score 50% maps to 'במסלול', and 49% maps to 'דרוש חיזוק'", () => {
	const score50 = computeReadinessScore(6, 12);
	assert.equal(score50.percentage, 50);
	assert.equal(score50.tier, "on-track");
	assert.equal(score50.tierLabel_he, "במסלול");
	assert.equal(score50.color, "#2563eb");

	const score49 = computeReadinessScore(49, 100);
	assert.equal(score49.percentage, 49);
	assert.equal(score49.tier, "reinforce");
	assert.equal(score49.tierLabel_he, "דרוש חיזוק");
	assert.equal(score49.color, "#ea580c");
});

test("7) Zero or empty history returns 0% readiness and tier 'דרוש חיזוק'", () => {
	const score0 = computeReadinessScore(0, 12);
	assert.equal(score0.completedCount, 0);
	assert.equal(score0.totalSessions, 12);
	assert.equal(score0.percentage, 0);
	assert.equal(score0.tier, "reinforce");
	assert.equal(score0.tierLabel_he, "דרוש חיזוק");

	const emptyGrid = buildReadinessGrid({});
	assert.equal(emptyGrid.doneCount, 0);
	assert.equal(emptyGrid.skippedCount, 0);
	assert.equal(emptyGrid.score.percentage, 0);
	assert.equal(emptyGrid.score.tier, "reinforce");
	assert.equal(emptyGrid.score.tierLabel_he, "דרוש חיזוק");
});

test("8) Auto-detection of 'next' workout slot: first incomplete slot is marked 'next'", () => {
	// Empty statuses -> w1a is next
	const grid1 = buildReadinessGrid({});
	assert.equal(grid1.nextSessionId, "w1a");
	assert.equal(grid1.weeks[0].sessions[0].status, "next");
	assert.equal(grid1.weeks[0].sessions[1].status, "pending");

	// w1a done -> w1b is next
	const grid2 = buildReadinessGrid({ w1a: "done" });
	assert.equal(grid2.nextSessionId, "w1b");
	assert.equal(grid2.weeks[0].sessions[0].status, "done");
	assert.equal(grid2.weeks[0].sessions[1].status, "next");
	assert.equal(grid2.weeks[1].sessions[0].status, "pending");

	// w1a done, w1b skipped -> w2a is next
	const grid3 = buildReadinessGrid({ w1a: "done", w1b: "skipped" });
	assert.equal(grid3.nextSessionId, "w2a");
	assert.equal(grid3.weeks[0].sessions[0].status, "done");
	assert.equal(grid3.weeks[0].sessions[1].status, "skipped");
	assert.equal(grid3.weeks[1].sessions[0].status, "next");

	// All completed -> nextSessionId is null
	const allDone = {};
	for (let w = 1; w <= 6; w++) {
		allDone[`w${w}a`] = "done";
		allDone[`w${w}b`] = "done";
	}
	const gridAllDone = buildReadinessGrid(allDone);
	assert.equal(gridAllDone.nextSessionId, null);
	assert.equal(gridAllDone.doneCount, 12);
});

test("9) Explicit status mapping: 'done' and 'skipped' counts and states", () => {
	const statuses = {
		w1a: "done",
		w1b: "skipped",
		w2a: "done",
		w2b: "done",
		w3a: "skipped",
	};
	const grid = buildReadinessGrid(statuses);
	assert.equal(grid.doneCount, 3);
	assert.equal(grid.skippedCount, 2);
	assert.equal(grid.nextSessionId, "w3b");
	assert.equal(grid.weeks[0].sessions[0].status, "done");
	assert.equal(grid.weeks[0].sessions[1].status, "skipped");
	assert.equal(grid.weeks[1].sessions[0].status, "done");
	assert.equal(grid.weeks[1].sessions[1].status, "done");
	assert.equal(grid.weeks[2].sessions[0].status, "skipped");
	assert.equal(grid.weeks[2].sessions[1].status, "next");
	assert.equal(grid.weeks[3].sessions[0].status, "pending");
});

test("10) Robustness against negative, NaN, null, and non-numeric inputs", () => {
	const negativeScore = computeReadinessScore(-3, 12);
	assert.equal(negativeScore.completedCount, 0);
	assert.equal(negativeScore.percentage, 0);

	const nanScore = computeReadinessScore(Number.NaN, 12);
	assert.equal(nanScore.completedCount, 0);
	assert.equal(nanScore.percentage, 0);

	const nullScore = computeReadinessScore(null, 12);
	assert.equal(nullScore.completedCount, 0);
	assert.equal(nullScore.percentage, 0);

	const undefinedScore = computeReadinessScore(undefined, 12);
	assert.equal(undefinedScore.completedCount, 0);
	assert.equal(undefinedScore.percentage, 0);

	const stringScore = computeReadinessScore("invalid", 12);
	assert.equal(stringScore.completedCount, 0);
	assert.equal(stringScore.percentage, 0);

	const zeroTotalScore = computeReadinessScore(5, 0);
	assert.equal(zeroTotalScore.totalSessions, 12);
	assert.equal(zeroTotalScore.completedCount, 5);

	const negativeTotalScore = computeReadinessScore(5, -10);
	assert.equal(negativeTotalScore.totalSessions, 12);

	const nonNumericTotalScore = computeReadinessScore(5, "bad");
	assert.equal(nonNumericTotalScore.totalSessions, 12);

	// buildReadinessGrid handles null/undefined
	const safeGrid = buildReadinessGrid(null, null);
	assert.equal(safeGrid.totalSessions, 12);
	assert.equal(safeGrid.doneCount, 0);
	assert.ok(Array.isArray(safeGrid.weeks));
});

test("11) Clamping when completedCount > totalSessions (capped at 100%)", () => {
	const clamped = computeReadinessScore(15, 12);
	assert.equal(clamped.completedCount, 12);
	assert.equal(clamped.totalSessions, 12);
	assert.equal(clamped.percentage, 100);
	assert.equal(clamped.tier, "peak");

	const overflow = computeReadinessScore(999, 10);
	assert.equal(overflow.completedCount, 10);
	assert.equal(overflow.totalSessions, 10);
	assert.equal(overflow.percentage, 100);
});

test("12) Custom options support (e.g. custom sessionsPerWeek or totalWeeks)", () => {
	const customGrid = buildReadinessGrid(
		{},
		{
			totalWeeks: 4,
			sessionsPerWeek: 3,
		},
	);
	assert.equal(customGrid.totalWeeks, 4);
	assert.equal(customGrid.sessionsPerWeek, 3);
	assert.equal(customGrid.totalSessions, 12);
	assert.equal(customGrid.weeks.length, 4);
	for (const week of customGrid.weeks) {
		assert.equal(week.sessions.length, 3);
	}
	assert.equal(customGrid.weeks[0].sessions[0].id, "w1a");
	assert.equal(customGrid.weeks[0].sessions[1].id, "w1b");
	assert.equal(customGrid.weeks[0].sessions[2].id, "w1c");
	assert.equal(customGrid.nextSessionId, "w1a");
});

test('13) HTML rendering contains accessible role attributes (role="region", table/grid, gridcell/button)', () => {
	const grid = buildReadinessGrid({ w1a: "done" });
	const html = renderReadinessHeatmapHtml(grid);

	assert.match(html, /role=["']region["']/);
	assert.match(html, /aria-label=["']מד מוכנות למסלול 6 שבועות["']/);
	assert.match(html, /role=["'](table|grid)["']/);
	assert.match(html, /role=["']gridcell["']/);
	assert.match(html, /role=["']button["']/);
	assert.match(html, /tabindex=["']0["']/);
});

test("14) HTML rendering contains Hebrew status labels and accessible cell aria-labels", () => {
	const grid = buildReadinessGrid({
		w1a: "done",
		w1b: "skipped",
	});
	const html = renderReadinessHeatmapHtml(grid);

	// Hebrew status labels must be present
	assert.match(html, /הושלם/);
	assert.match(html, /דולג/);
	assert.match(html, /האימון הבא/);
	assert.match(html, /ממתין/);

	// Hebrew tier badge must be present
	assert.match(html, /דרוש חיזוק|במסלול|מוכנות שיא/);

	// Cell aria-label with week, workout name, and status
	assert.match(html, /aria-label=["']שבוע 1 אימון א׳ - הושלם["']/);
	assert.match(html, /aria-label=["']שבוע 1 אימון ב׳ - דולג["']/);
	assert.match(html, /aria-label=["']שבוע 2 אימון א׳ - האימון הבא["']/);
	assert.match(html, /aria-label=["']שבוע 2 אימון ב׳ - ממתין["']/);
});

test("15) Module export works in CommonJS and attaches to global/window", () => {
	assert.equal(typeof readinessUI.computeReadinessScore, "function");
	assert.equal(typeof readinessUI.buildReadinessGrid, "function");
	assert.equal(typeof readinessUI.renderReadinessHeatmapHtml, "function");
	assert.equal(typeof readinessUI.renderReadinessHeatmap, "function");
	assert.ok(readinessUI.READINESS_TIERS);
	assert.ok(readinessUI.STATUS_LABELS);

	// Global attachment check
	assert.ok(globalThis.THReservesReadinessUI);
	assert.equal(
		globalThis.THReservesReadinessUI.computeReadinessScore,
		readinessUI.computeReadinessScore,
	);
	assert.equal(
		globalThis.THReservesReadinessUI.buildReadinessGrid,
		readinessUI.buildReadinessGrid,
	);
	assert.equal(READINESS_TIERS.peak.color, "#16a34a");
	assert.equal(STATUS_LABELS.done, "הושלם");

	// Also test renderReadinessHeatmap DOM helper
	const mockTarget = {
		content: "",
		replaceChildren() {
			this.content = "";
		},
		insertAdjacentHTML(_pos, html) {
			this.content = html;
		},
	};
	const renderedTarget = renderReadinessHeatmap(
		mockTarget,
		buildReadinessGrid(),
	);
	assert.equal(renderedTarget, mockTarget);
	assert.ok(mockTarget.content.includes('role="region"'));

	const strResult = renderReadinessHeatmap(null, buildReadinessGrid());
	assert.equal(typeof strResult, "string");
	assert.ok(strResult.includes('role="region"'));
});
