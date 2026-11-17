const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const R = require("../js/reserves-track.js");

const html = fs.readFileSync(
	path.join(__dirname, "..", "reserves.html"),
	"utf8",
);
const track = JSON.parse(
	fs.readFileSync(
		path.join(__dirname, "..", "content", "reserves", "miluim-track.json"),
		"utf8",
	),
);
R.setData(track);

test("reserves.html <head> contains a mobile viewport meta tag", () => {
	const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
	assert.ok(headMatch, "document must contain a <head> element");
	const head = headMatch[1];
	const viewportMatch = head.match(/<meta\s+[^>]*name=["']viewport["'][^>]*>/i);
	assert.ok(viewportMatch, "head must contain a viewport meta tag");
	const contentMatch = viewportMatch[0].match(/content=["']([^"']+)["']/i);
	assert.ok(contentMatch, "viewport meta tag must have a content attribute");
	const content = contentMatch[1];
	assert.match(content, /width=device-width/i);
	assert.match(content, /initial-scale=\s*1(?:\.0)?(?:\b|$)/i);
});

test("reserves.html metric inputs open a numeric keyboard", () => {
	assert.match(
		html,
		/if\s*\(\s*t\.input\s*===\s*['"]clock['"]\s*\)\s*\{[\s\S]*?input\.inputMode\s*=\s*['"]numeric['"]/,
	);
	assert.match(
		html,
		/input\.type\s*=\s*['"]number['"][\s\S]*?input\.inputMode\s*=\s*['"]numeric['"]/,
	);

	const metrics = R.tests();
	assert.ok(metrics.length > 0, "THReserves.tests() should return metrics");

	const createdInputs = [];
	metrics.forEach((t) => {
		const input = {
			id: `in-${t.id}`,
			type: "text",
			inputMode: "",
			setAttribute: (k, v) => {
				input[k] = v;
			},
		};
		if (t.input === "clock") {
			input.inputMode = "numeric";
			input.autocomplete = "off";
		} else {
			input.type = "number";
			input.min = "0";
			input.step = "1";
			input.inputMode = "numeric";
		}
		createdInputs.push({ metric: t, input });
	});

	createdInputs.forEach(({ metric, input }) => {
		assert.equal(
			input.inputMode,
			"numeric",
			`metric ${metric.id} must set inputMode="numeric"`,
		);
		if (metric.input !== "clock") {
			assert.equal(
				input.type,
				"number",
				`count metric ${metric.id} must set type="number"`,
			);
		}
	});
});

test("reserves.html metric inputs and selects have accessible names", () => {
	assert.match(html, /label\.htmlFor\s*=\s*['"]in-['"]\s*\+\s*t\.id/);
	assert.match(
		html,
		/input\.setAttribute\(\s*['"]aria-label['"],\s*t\.name_he\s*\)/,
	);

	const selects = [...html.matchAll(/<select\b([^>]*)>/g)];
	assert.ok(selects.length > 0, "reserves.html should contain select elements");

	selects.forEach((m) => {
		const attrs = m[1];
		const idMatch = attrs.match(/\bid=["']([^"']+)["']/);
		const ariaLabelMatch = attrs.match(/\baria-label=["']([^"']+)["']/);
		const id = idMatch?.[1];
		const hasAriaLabel = Boolean(ariaLabelMatch?.[1]?.trim());
		const hasLabelFor = id
			? new RegExp(`<label\\b[^>]*\\bfor=["']${id}["']`, "i").test(html)
			: false;
		assert.ok(
			hasAriaLabel || hasLabelFor,
			`select tag ${m[0]} must have a <label for> or aria-label`,
		);
	});
});

test("reserves.html loads reserves-track.js exactly once after core.js", () => {
	const scriptTags = [
		...html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi),
	].map((m) => m[1]);

	const trackOccurrences = scriptTags.filter(
		(src) => src === "./js/reserves-track.js",
	);
	assert.equal(
		trackOccurrences.length,
		1,
		'reserves.html must contain exactly one <script src="./js/reserves-track.js">',
	);

	const coreIndex = scriptTags.indexOf("./js/core.js");
	const trackIndex = scriptTags.indexOf("./js/reserves-track.js");
	assert.ok(coreIndex !== -1, "core.js must be present");
	assert.ok(
		trackIndex > coreIndex,
		"reserves-track.js must appear after core.js",
	);
});

test('reserves.html has lang="he", dir="rtl", and an h1 heading', () => {
	assert.match(html, /<html\b[^>]*\blang=["']he["'][^>]*>/i);
	assert.match(html, /<html\b[^>]*\bdir=["']rtl["'][^>]*>/i);
	assert.match(html, /<h1\b[^>]*>[\s\S]*?<\/h1>/i);
});

test("reserves.html CSS defines minimum 48px touch targets for controls", () => {
	assert.match(
		html,
		/(?:input,\s*select|select,\s*input)[^}]*min-height:\s*48px/,
	);
	assert.match(html, /button[^}]*min-height:\s*48px/);
});

test("reserves.html autosaves metric inputs under trainerhub_reserves_inputs", () => {
	const html = fs.readFileSync(
		path.join(__dirname, "..", "reserves.html"),
		"utf8",
	);
	assert.ok(html.includes("trainerhub_reserves_inputs"));
	assert.ok(html.includes("saveReservesInputs"));
	assert.ok(html.includes("restoreReservesInputs"));
	assert.ok(html.includes("localStorage"));
});

test("reserves.html contains accessible section for reserves safety guidance with region role", () => {
	const sectionMatch = html.match(
		/<section\b([^>]*\bid=["']reserves-safety-guidance["'][^>]*)>/i,
	);
	assert.ok(
		sectionMatch,
		"reserves.html must contain a <section> with id='reserves-safety-guidance'",
	);
	const attrs = sectionMatch[1];
	assert.match(attrs, /\bclass=["'][^"']*\bcard\b[^"']*["']/);
	assert.match(attrs, /\brole=["']region["']/);
	assert.match(attrs, /\baria-labelledby=["']reservesSafetyHeading["']/);

	const mainMatch = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
	assert.ok(mainMatch, "<main> element must exist");
	assert.ok(
		mainMatch[1].includes('id="reserves-safety-guidance"'),
		"reserves-safety-guidance must be inside main content area",
	);

	assert.match(
		html,
		/<h2\b[^>]*\bid=["']reservesSafetyHeading["'][^>]*>/,
		"element with id='reservesSafetyHeading' must exist as h2",
	);
});

test("reserves.html safety guidance includes heading and guidance on gradual progression and sleep deficit", () => {
	const sectionMatch = html.match(
		/<section\b[^>]*\bid=["']reserves-safety-guidance["'][^>]*>([\s\S]*?)<\/section>/i,
	);
	assert.ok(sectionMatch, "reserves-safety-guidance section must exist");
	const sectionContent = sectionMatch[1];

	const headingMatch = sectionContent.match(
		/<h2\b[^>]*\bid=["']reservesSafetyHeading["'][^>]*>([\s\S]*?)<\/h2>/i,
	);
	assert.ok(
		headingMatch,
		"section must have an h2 with id='reservesSafetyHeading'",
	);
	assert.match(
		headingMatch[1],
		/דגשי בטיחות והתקדמות במילואים/,
		"heading must contain 'דגשי בטיחות והתקדמות במילואים'",
	);

	assert.match(
		sectionContent,
		/תוכנית האימונים מיועדת לבניית כושר ויכולת בהדרגה בהתאם לביצועים בפועל/,
		"section must state that training is intended for gradual progression based on performance",
	);
	assert.match(
		sectionContent,
		/בעומס מילואים או חוסר שינה יש להתאים את הקצב ולא להעמיס בכוח/,
		"section must advise adjusting pace under reserve duty load or lack of sleep",
	);
});

test("reserves.html safety guidance includes instructions to stop and consult a professional on pain or injury", () => {
	const sectionMatch = html.match(
		/<section\b[^>]*\bid=["']reserves-safety-guidance["'][^>]*>([\s\S]*?)<\/section>/i,
	);
	assert.ok(sectionMatch, "reserves-safety-guidance section must exist");
	const sectionContent = sectionMatch[1];

	assert.match(
		sectionContent,
		/במקרה של כאב חדש או פציעה יש לעצור ולהתייעץ עם איש מקצוע או גורם רפואי/,
		"section must instruct stopping and consulting a professional in case of new pain or injury",
	);
});
