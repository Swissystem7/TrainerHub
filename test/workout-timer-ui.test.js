const test = require("node:test");
const assert = require("node:assert/strict");

const timerUI = require("../js/workout-timer-ui.js");
const { computeTimerRingProps, DEFAULT_COLORS } = timerUI;

test("1) Work phase normal progress and green color", () => {
	const resWork = computeTimerRingProps(30, 60, "work");
	assert.equal(resWork.remainingSec, 30);
	assert.equal(resWork.totalSec, 60);
	assert.equal(resWork.phase, "work");
	assert.equal(resWork.progress, 0.5);
	assert.equal(resWork.percent, 50);
	assert.equal(resWork.color, DEFAULT_COLORS.work);
	assert.equal(resWork.isWarning, false);
	assert.equal(resWork.formattedTime, "0:30");

	const resEx = computeTimerRingProps(40, 50, "exercise");
	assert.equal(resEx.remainingSec, 40);
	assert.equal(resEx.totalSec, 50);
	assert.equal(resEx.phase, "exercise");
	assert.equal(resEx.progress, 0.8);
	assert.equal(resEx.percent, 80);
	assert.equal(resEx.color, DEFAULT_COLORS.work);
	assert.equal(resEx.isWarning, false);
	assert.equal(resEx.formattedTime, "40");

	// Fallback/unknown phase also gets work green
	const resFallback = computeTimerRingProps(25, 50, "custom");
	assert.equal(resFallback.color, DEFAULT_COLORS.work);
	assert.equal(resFallback.isWarning, false);
});

test("2) Rest phase normal progress and blue color", () => {
	const resRest = computeTimerRingProps(45, 90, "rest");
	assert.equal(resRest.remainingSec, 45);
	assert.equal(resRest.totalSec, 90);
	assert.equal(resRest.phase, "rest");
	assert.equal(resRest.progress, 0.5);
	assert.equal(resRest.percent, 50);
	assert.equal(resRest.color, DEFAULT_COLORS.rest);
	assert.equal(resRest.isWarning, false);
	assert.equal(resRest.formattedTime, "0:45");

	const resBreak = computeTimerRingProps(20, 40, "break");
	assert.equal(resBreak.remainingSec, 20);
	assert.equal(resBreak.totalSec, 40);
	assert.equal(resBreak.phase, "break");
	assert.equal(resBreak.progress, 0.5);
	assert.equal(resBreak.percent, 50);
	assert.equal(resBreak.color, DEFAULT_COLORS.rest);
	assert.equal(resBreak.isWarning, false);
	assert.equal(resBreak.formattedTime, "20");
});

test("3) Warning color transition at remainingSec <= 10 for work phase", () => {
	const resWork10 = computeTimerRingProps(10, 60, "work");
	assert.equal(resWork10.remainingSec, 10);
	assert.equal(resWork10.isWarning, true);
	assert.equal(resWork10.color, DEFAULT_COLORS.warning);

	const resEx5 = computeTimerRingProps(5, 60, "exercise");
	assert.equal(resEx5.remainingSec, 5);
	assert.equal(resEx5.isWarning, true);
	assert.equal(resEx5.color, DEFAULT_COLORS.warning);
});

test("4) Warning color transition at remainingSec <= 10 for rest phase", () => {
	const resRest10 = computeTimerRingProps(10, 60, "rest");
	assert.equal(resRest10.remainingSec, 10);
	assert.equal(resRest10.isWarning, true);
	assert.equal(resRest10.color, DEFAULT_COLORS.warning);

	const resBreak3 = computeTimerRingProps(3, 45, "break");
	assert.equal(resBreak3.remainingSec, 3);
	assert.equal(resBreak3.isWarning, true);
	assert.equal(resBreak3.color, DEFAULT_COLORS.warning);
});

test("5) Boundary: remainingSec = 11 is not warning; remainingSec = 10 is warning", () => {
	const res11Work = computeTimerRingProps(11, 60, "work");
	assert.equal(res11Work.isWarning, false);
	assert.equal(res11Work.color, DEFAULT_COLORS.work);

	const res10Work = computeTimerRingProps(10, 60, "work");
	assert.equal(res10Work.isWarning, true);
	assert.equal(res10Work.color, DEFAULT_COLORS.warning);

	const res11Rest = computeTimerRingProps(11, 60, "rest");
	assert.equal(res11Rest.isWarning, false);
	assert.equal(res11Rest.color, DEFAULT_COLORS.rest);

	const res10Rest = computeTimerRingProps(10, 60, "rest");
	assert.equal(res10Rest.isWarning, true);
	assert.equal(res10Rest.color, DEFAULT_COLORS.warning);
});

test("6) Completed timer: remainingSec = 0 gives progress 0, full dashoffset, and isWarning", () => {
	const res = computeTimerRingProps(0, 45, "work");
	assert.equal(res.remainingSec, 0);
	assert.equal(res.totalSec, 45);
	assert.equal(res.progress, 0);
	assert.equal(res.percent, 0);
	assert.equal(res.strokeDashoffset, res.circumference);
	assert.equal(res.isWarning, true);
	assert.equal(res.color, DEFAULT_COLORS.warning);
	assert.equal(res.formattedTime, "0");
});

test("7) Fresh timer: remainingSec == totalSec gives progress 1 and strokeDashoffset 0", () => {
	const res = computeTimerRingProps(60, 60, "work");
	assert.equal(res.remainingSec, 60);
	assert.equal(res.totalSec, 60);
	assert.equal(res.progress, 1);
	assert.equal(res.percent, 100);
	assert.equal(res.strokeDashoffset, 0);
	assert.equal(res.isWarning, false);
	assert.equal(res.color, DEFAULT_COLORS.work);
	assert.equal(res.formattedTime, "1:00");
});

test("8) Negative remainingSec clamped to 0 without errors or negative offset", () => {
	const res = computeTimerRingProps(-10, 60, "work");
	assert.equal(res.remainingSec, 0);
	assert.equal(res.totalSec, 60);
	assert.equal(res.progress, 0);
	assert.equal(res.percent, 0);
	assert.ok(res.strokeDashoffset >= 0);
	assert.equal(res.strokeDashoffset, res.circumference);
	assert.equal(res.isWarning, true);
});

test("9) Non-positive totalSec (0 or negative) handled safely without division by zero or NaN", () => {
	const resZero = computeTimerRingProps(0, 0, "work");
	assert.equal(resZero.totalSec, 0);
	assert.equal(resZero.remainingSec, 0);
	assert.equal(resZero.progress, 0);
	assert.equal(resZero.percent, 0);
	assert.equal(Number.isNaN(resZero.progress), false);
	assert.equal(Number.isNaN(resZero.strokeDashoffset), false);
	assert.equal(resZero.isWarning, false);

	const resNeg = computeTimerRingProps(15, -30, "rest");
	assert.equal(resNeg.totalSec, 0);
	assert.equal(resNeg.progress, 0);
	assert.equal(resNeg.percent, 0);
	assert.equal(Number.isNaN(resNeg.progress), false);
	assert.equal(Number.isNaN(resNeg.strokeDashoffset), false);
	assert.equal(resNeg.isWarning, false);
});

test("10) Non-numeric inputs (null, undefined, NaN, strings) return safe default properties", () => {
	const cases = [
		computeTimerRingProps(null, null),
		computeTimerRingProps(undefined, undefined),
		computeTimerRingProps(NaN, NaN),
		computeTimerRingProps("30", "60"),
		computeTimerRingProps(Number.POSITIVE_INFINITY, 60),
		computeTimerRingProps(30, Number.POSITIVE_INFINITY),
	];

	for (const res of cases) {
		assert.equal(typeof res.remainingSec, "number");
		assert.equal(typeof res.totalSec, "number");
		assert.ok(Number.isFinite(res.remainingSec));
		assert.ok(Number.isFinite(res.totalSec));
		assert.ok(Number.isFinite(res.progress));
		assert.ok(Number.isFinite(res.strokeDashoffset));
		assert.ok(!Number.isNaN(res.percent));
	}
});

test("11) remainingSec exceeding totalSec clamped to totalSec (progress capped at 1.0)", () => {
	const res = computeTimerRingProps(90, 60, "work");
	assert.equal(res.remainingSec, 60);
	assert.equal(res.totalSec, 60);
	assert.equal(res.progress, 1);
	assert.equal(res.percent, 100);
	assert.equal(res.strokeDashoffset, 0);
	assert.equal(res.isWarning, false);
});

test("12) SVG circumference and dashoffset calculation accuracy based on radius", () => {
	const expectedRadius = 80;
	const expectedCircumference = 2 * Math.PI * expectedRadius;
	const res = computeTimerRingProps(15, 60, "work");

	assert.equal(res.radius, expectedRadius);
	assert.equal(res.circumference, expectedCircumference);
	assert.equal(res.strokeDasharray, expectedCircumference);

	// 15 / 60 = 0.25 progress, so dashoffset is circumference * (1 - 0.25) = circumference * 0.75
	const expectedOffset = expectedCircumference * 0.75;
	assert.ok(Math.abs(res.strokeDashoffset - expectedOffset) < 1e-9);
});

test("13) Custom radius option correctly scales circumference and dashoffset", () => {
	const customRadius = 120;
	const expectedCircumference = 2 * Math.PI * customRadius;
	const res = computeTimerRingProps(30, 60, "work", { radius: customRadius });

	assert.equal(res.radius, customRadius);
	assert.equal(res.circumference, expectedCircumference);
	assert.equal(res.strokeDasharray, expectedCircumference);

	// 30 / 60 = 0.5 progress, so dashoffset is circumference * 0.5
	const expectedOffset = expectedCircumference * 0.5;
	assert.ok(Math.abs(res.strokeDashoffset - expectedOffset) < 1e-9);
});

test("14) Time formatting: format m:ss for >= 60s and bare seconds for < 60s", () => {
	// >= 60s uses m:ss
	assert.equal(computeTimerRingProps(60, 60, "work").formattedTime, "1:00");
	assert.equal(computeTimerRingProps(65, 75, "work").formattedTime, "1:05");
	assert.equal(computeTimerRingProps(9, 60, "work").formattedTime, "0:09");
	assert.equal(computeTimerRingProps(0, 60, "work").formattedTime, "0:00");
	assert.equal(computeTimerRingProps(125, 150, "work").formattedTime, "2:05");

	// < 60s uses bare seconds string
	assert.equal(computeTimerRingProps(45, 45, "work").formattedTime, "45");
	assert.equal(computeTimerRingProps(7, 45, "work").formattedTime, "7");
	assert.equal(computeTimerRingProps(0, 30, "work").formattedTime, "0");
	assert.equal(computeTimerRingProps(0, 0, "work").formattedTime, "0");
});

test("15) Module export works in CommonJS and attaches to global/window", () => {
	assert.equal(typeof timerUI.computeTimerRingProps, "function");
	assert.ok(timerUI.DEFAULT_COLORS);

	// In Node environment, globalThis was passed to the IIFE
	assert.ok(globalThis.THWorkoutTimerUI);
	assert.equal(
		typeof globalThis.THWorkoutTimerUI.computeTimerRingProps,
		"function",
	);
	assert.equal(
		globalThis.THWorkoutTimerUI.computeTimerRingProps,
		timerUI.computeTimerRingProps,
	);
});
