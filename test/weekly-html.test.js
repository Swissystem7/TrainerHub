const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "weekly.html"), "utf8");

test("weekly.html <head> contains a mobile viewport meta tag", () => {
	const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
	assert.ok(headMatch, "weekly.html must contain a <head> element");
	const head = headMatch[1];

	const viewportMatch = head.match(/<meta\s+[^>]*name=["']viewport["'][^>]*>/i);
	assert.ok(viewportMatch, "<head> must contain a viewport meta tag");

	const contentMatch = viewportMatch[0].match(/content=["']([^"']+)["']/i);
	assert.ok(contentMatch, "viewport meta tag must have a content attribute");
	assert.match(
		contentMatch[1],
		/width=device-width/i,
		"viewport content must match width=device-width",
	);
	assert.match(
		contentMatch[1],
		/initial-scale=\s*1(?:\.0)?(?:\b|$)/i,
		"viewport content must match initial-scale=1",
	);

	// Also verify exact match in head
	assert.match(
		head,
		/<meta name="viewport" content="width=device-width,initial-scale=1">/,
		"viewport meta tag matches width=device-width,initial-scale=1",
	);
});

test("weekly.html root <html> has lang='he' and dir='rtl', and has valid non-empty <title> and <h1>", () => {
	const htmlTagMatch = html.match(/<html\b([^>]*)>/i);
	assert.ok(htmlTagMatch, "document must contain an <html> tag");
	const attrs = htmlTagMatch[1];
	assert.match(
		attrs,
		/\blang=["']he["']/i,
		"root <html> must define lang='he'",
	);
	assert.match(
		attrs,
		/\bdir=["']rtl["']/i,
		"root <html> must define dir='rtl'",
	);

	const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
	assert.ok(titleMatch, "document must contain a <title> element");
	assert.ok(
		titleMatch[1].trim().length > 0,
		"<title> content must not be empty",
	);

	const h1Match = html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i);
	assert.ok(h1Match, "document must contain an <h1> heading");
	// Do not strip tags with a single multi-character replace (CodeQL js/incomplete-multi-character-sanitization).
	// Visible text is any non-tag, non-whitespace character inside the heading.
	assert.ok(/[^<>\s]/.test(h1Match[1]), "<h1> heading must not be empty");
});

test("weekly.html daily workout template contains accessible action buttons with descriptive aria-label referencing esc(dayName)", () => {
	// Action buttons container defines role="toolbar" and an aria-label with the day name
	assert.match(
		html,
		/<div class="actions" role="toolbar" aria-label="פעולות עבור ' \+ esc\(dayName\) \+ '">/,
		"daily workout template action container must define role='toolbar' and aria-label referencing esc(dayName)",
	);

	// 'התחל אימון' has aria-label matching 'התחל ' + esc(dayName) + ' במצב אימון חי'
	assert.match(
		html,
		/<button[^>]*aria-label="התחל ' \+ esc\(dayName\) \+ ' במצב אימון חי"[^>]*>התחל אימון<\/button>/,
		"'התחל אימון' button must have aria-label matching 'התחל ' + esc(dayName) + ' במצב אימון חי'",
	);

	// 'פתח כמתאמן' has aria-label matching 'פתח כמתאמן עבור ' + esc(dayName)
	assert.match(
		html,
		/<button[^>]*aria-label="פתח כמתאמן עבור ' \+ esc\(dayName\) \+ '"[^>]*>פתח כמתאמן<\/button>/,
		"'פתח כמתאמן' button must have aria-label matching 'פתח כמתאמן עבור ' + esc(dayName)",
	);

	// 'שתף אימון ללקוח' has aria-label matching 'שתף אימון ללקוח עבור ' + esc(dayName)
	assert.match(
		html,
		/<button[^>]*aria-label="שתף אימון ללקוח עבור ' \+ esc\(dayName\) \+ '"[^>]*>שתף אימון ללקוח<\/button>/,
		"'שתף אימון ללקוח' button must have aria-label matching 'שתף אימון ללקוח עבור ' + esc(dayName)",
	);

	// 'דף להדפסה / PDF' has aria-label matching 'דף להדפסה / PDF עבור ' + esc(dayName)
	assert.match(
		html,
		/<button[^>]*aria-label="דף להדפסה \/ PDF עבור ' \+ esc\(dayName\) \+ '"[^>]*>דף להדפסה \/ PDF<\/button>/,
		"'דף להדפסה / PDF' button must have aria-label matching 'דף להדפסה / PDF עבור ' + esc(dayName)",
	);
});

test("weekly.html form controls and toolbar buttons define accessible labels", () => {
	// Specific checks for #buildBtn, #resetBtn, #periodWeeks
	assert.match(
		html,
		/<button[^>]+id="buildBtn"[^>]+aria-label="בנה תוכנית אימונים שבועית מהמאגר"/,
		"#buildBtn must define an accessible aria-label",
	);

	assert.match(
		html,
		/<button[^>]+id="resetBtn"[^>]+aria-label="נקה נתוני טופס והחזר לברירת מחדל"/,
		"#resetBtn must define an accessible aria-label",
	);

	assert.match(
		html,
		/<label for="periodWeeks">[^<]+<\/label>\s*<select[^>]+id="periodWeeks"[^>]+aria-label="אורך תוכנית תקופתית בשבועות"/,
		"#periodWeeks must define an associated <label for> and aria-label",
	);

	// Form actions toolbar
	assert.match(
		html,
		/<div class="actions" role="toolbar" aria-label="פעולות טופס תוכנית שבועית">/,
		"form actions must define role='toolbar' and aria-label",
	);

	// Saved reels button
	assert.match(
		html,
		/<button[^>]+id="useSavedReelBtn"[^>]+aria-label="הצג את האימונים השמורים בתוכנית השבועית"/,
		"#useSavedReelBtn must define an accessible aria-label",
	);

	// Check all form controls in #form have associated <label for> or aria-label
	const formMatch = html.match(
		/<form\b[^>]*id="form"[^>]*>([\s\S]*?)<\/form>/i,
	);
	assert.ok(formMatch, "form#form must exist");
	const formContent = formMatch[1];

	const controls = [
		...formContent.matchAll(/<(input|select|textarea)\b([^>]*)>/gi),
	];
	assert.ok(controls.length > 0, "form must have form controls");

	for (const match of controls) {
		const tag = match[1];
		const attrs = match[2];
		const idMatch = attrs.match(/\bid="([^"]+)"/);
		assert.ok(idMatch, `control <${tag}> must have an id: ${match[0]}`);
		const id = idMatch[1];

		const hasLabelFor = new RegExp(`<label[^>]+for=["']${id}["']`, "i").test(
			formContent,
		);
		const hasAriaLabel = /\b(aria-label|aria-labelledby)=["'][^"']+["']/i.test(
			attrs,
		);

		assert.ok(
			hasLabelFor || hasAriaLabel,
			`control #${id} (<${tag}>) must have an associated <label for> or aria-label`,
		);
	}
});
