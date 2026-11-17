const test = require("node:test");
const assert = require("node:assert");
const THPrompt = require("../js/prompt-parser.js");

test("null, undefined, and blank inputs return null", () => {
	assert.strictEqual(THPrompt.parseDuration(null), null);
	assert.strictEqual(THPrompt.parseDuration(undefined), null);
	assert.strictEqual(THPrompt.parseDuration(""), null);
	assert.strictEqual(THPrompt.parseDuration("   "), null);
});

test("Hebrew minute phrases extract correct minute duration", () => {
	assert.strictEqual(THPrompt.parseDuration("45 דקות"), 45);
	assert.strictEqual(THPrompt.parseDuration("אימון של 45 דקות"), 45);
});

test("Hebrew hour-and-a-half phrases extract 90 minutes", () => {
	assert.strictEqual(THPrompt.parseDuration("שעה וחצי"), 90);
	assert.strictEqual(THPrompt.parseDuration("אימון של שעה וחצי"), 90);
});

test("time-of-day and clock-only strings return null when no duration is specified", () => {
	assert.strictEqual(THPrompt.parseDuration("בשעה 17:00"), null);
	assert.strictEqual(THPrompt.parseDuration("אימון בשעה 17:00"), null);
	assert.strictEqual(THPrompt.parseDuration("שעה 18:30"), null);
});

test("mixed clock-time and duration phrases return duration", () => {
	assert.strictEqual(THPrompt.parseDuration("אימון 45 דקות בשעה 17:00"), 45);
});
