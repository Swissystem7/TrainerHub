const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");

test("index.html <head> contains a mobile viewport meta tag", () => {
	const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
	assert.ok(headMatch, "document must contain a <head> element");
	const head = headMatch[1];
	const viewportMatch = head.match(
		/<meta\b[^>]*\bname=["']viewport["'][^>]*>/i,
	);
	assert.ok(viewportMatch, "head must contain a viewport meta tag");
	const contentMatch = viewportMatch[0].match(/\bcontent=["']([^"']+)["']/i);
	assert.ok(contentMatch, "viewport meta tag must have a content attribute");
	const content = contentMatch[1];
	assert.match(content, /width=device-width/i);
	assert.match(content, /initial-scale=\s*1(?:\.0)?(?:\b|$)/i);
});

test("index.html <title> exists and is not empty after trim", () => {
	const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
	assert.ok(titleMatch, "document must contain a <title> element");
	const title = titleMatch[1].trim();
	assert.ok(title.length > 0, "<title> must not be empty after trim");
});

test("index.html trainee preferences and input area exist with expected ids", () => {
	const requiredIds = [
		"tab-prompt",
		"tab-ingest",
		"tab-seg",
		"panel-prompt",
		"panel-ingest",
		"panel-seg",
		"form",
		"prompt",
		"durationInput",
		"equipmentInput",
		"participantsInput",
		"ingestForm",
		"ingestText",
	];

	for (const id of requiredIds) {
		assert.match(
			html,
			new RegExp(`\\bid=["']${id}["']`),
			`element with id="${id}" must exist in index.html`,
		);
	}

	assert.match(html, /<textarea\b[^>]*\bid=["']prompt["'][^>]*>/i);
	assert.match(html, /<input\b[^>]*\bid=["']durationInput["'][^>]*>/i);
	assert.match(html, /<select\b[^>]*\bid=["']equipmentInput["'][^>]*>/i);
	assert.match(html, /<input\b[^>]*\bid=["']participantsInput["'][^>]*>/i);
});

test("index.html scripts exist on disk and core.js is loaded before dependent scripts", () => {
	const scriptTags = [
		...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi),
	].map((m) => m[1]);

	const appScripts = scriptTags.filter((src) => src.startsWith("./js/"));
	assert.ok(appScripts.length > 0, "index.html must include ./js/ scripts");

	for (const src of appScripts) {
		const filePath = path.join(root, src);
		assert.ok(
			fs.existsSync(filePath),
			`script file ${src} must exist at ${filePath}`,
		);
	}

	const coreIndex = scriptTags.indexOf("./js/core.js");
	assert.ok(coreIndex !== -1, "./js/core.js must be present in index.html");

	const dependentScripts = [
		"./js/pilot.js",
		"./js/infer.js",
		"./js/analyzer.js",
		"./js/prompt-parser.js",
		"./js/session-builder.js",
		"./js/rules-with-sources.js",
		"./js/ingest.js",
		"./js/th-nav.js",
	];

	for (const dep of dependentScripts) {
		const depIndex = scriptTags.indexOf(dep);
		assert.ok(depIndex !== -1, `${dep} must be present in index.html`);
		assert.ok(
			depIndex > coreIndex,
			`${dep} (index ${depIndex}) must be loaded after ./js/core.js (index ${coreIndex})`,
		);
	}
});

test("every <button> in the static markup has readable text or an accessible label", () => {
	const staticHtml = html.replace(/<script\b[\s\S]*?<\/script>/gi, "");
	const buttons = [
		...staticHtml.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/gi),
	];
	assert.ok(
		buttons.length > 0,
		"index.html must contain static button elements",
	);

	for (const button of buttons) {
		const attrs = button[1];
		const innerText = button[2].replace(/<[^>]+>/g, "").trim();
		const ariaLabelMatch = attrs.match(/\baria-label=["']([^"']+)["']/i);
		const ariaLabelledbyMatch = attrs.match(
			/\baria-labelledby=["']([^"']+)["']/i,
		);

		const hasReadableText = innerText.length > 0;
		const hasAriaLabel = Boolean(ariaLabelMatch?.[1]?.trim());
		const hasAriaLabelledby = Boolean(ariaLabelledbyMatch?.[1]?.trim());

		assert.ok(
			hasReadableText || hasAriaLabel || hasAriaLabelledby,
			`button tag ${button[0]} must have readable text or aria-label / aria-labelledby`,
		);
	}
});

test('index.html <html> element has lang="he" and dir="rtl"', () => {
	assert.match(html, /<html\b[^>]*\blang=["']he["'][^>]*>/i);
	assert.match(html, /<html\b[^>]*\bdir=["']rtl["'][^>]*>/i);
});
