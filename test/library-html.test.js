const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "library.html"), "utf8");
const TH = require(path.join(root, "js", "core.js"));
const catalog = JSON.parse(
	fs.readFileSync(path.join(root, "js", "catalog.json"), "utf8"),
);
TH.setCatalog(catalog);

const extractFunction = (source, name) => {
	const start = source.indexOf(`function ${name}(`);
	assert.ok(start !== -1, `${name} is defined in library.html`);
	const open = source.indexOf("{", start);
	let depth = 0;
	for (let i = open; i < source.length; i++) {
		if (source[i] === "{") depth++;
		else if (source[i] === "}" && --depth === 0)
			return source.slice(start, i + 1);
	}
	throw new Error(`unbalanced braces in ${name}`);
};

const createMockDom = () => {
	const els = {
		q: { value: "" },
		muscle: { value: "" },
		equipment: { value: "" },
		level: { value: "" },
		stats: { textContent: "", insertAdjacentHTML: () => {} },
		grid: { className: "", innerHTML: "" },
	};
	const doc = { querySelectorAll: () => [] };
	const code = ["currentFilters", "render"]
		.map((name) => extractFunction(html, name))
		.join("\n");
	const sandbox = {
		$: (id) => els[id],
		document: doc,
		TH,
		tag: "",
		pinned: "",
		render: null,
	};
	vm.createContext(sandbox);
	vm.runInContext(`${code}\nthis.render = render;`, sandbox);
	return { els, runner: sandbox };
};

const defaultLibraryDraft = {
	title: "אימון מהספרייה",
	duration_minutes: 30,
	intensity: "medium",
	tags: ["library"],
	phases: [
		{ name: "Warm-up", duration_minutes: 5, exercises: [] },
		{ name: "Main", duration_minutes: 20, exercises: [] },
		{ name: "Cool-down", duration_minutes: 5, exercises: [] },
	],
};

test("1. Mobile Viewport & Document Meta: <head> contains valid mobile viewport meta tag", () => {
	const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
	assert.ok(headMatch, "library.html must contain a <head> element");
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

	assert.match(
		head,
		/<meta name="viewport" content="width=device-width,initial-scale=1">/,
		"viewport meta tag matches width=device-width,initial-scale=1",
	);
});

test("1. Mobile Viewport & Document Meta: root <html> has lang='he' and dir='rtl'", () => {
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
});

test("2. Filter Controls Accessibility: form#filters has role='search' and descriptive aria-label", () => {
	assert.match(
		html,
		/<form\s+class="filters"\s+id="filters"\s+role="search"\s+aria-label="סינון תרגילים בספרייה">/,
		"<form class='filters' id='filters' role='search' aria-label='סינון תרגילים בספרייה'> must exist",
	);
});

test("2. Filter Controls Accessibility: search input #q has descriptive aria-label", () => {
	assert.match(
		html,
		/<input[^>]+id="q"[^>]+aria-label="חיפוש תרגיל לפי שם או מילת מפתח"/,
		"input #q must define aria-label='חיפוש תרגיל לפי שם או מילת מפתח'",
	);
});

test("2. Filter Controls Accessibility: select #muscle has descriptive aria-label", () => {
	assert.match(
		html,
		/<select[^>]+id="muscle"[^>]+aria-label="סינון לפי קבוצת שרירים"/,
		"select #muscle must define aria-label='סינון לפי קבוצת שרירים'",
	);
});

test("2. Filter Controls Accessibility: select #equipment has descriptive aria-label", () => {
	assert.match(
		html,
		/<select[^>]+id="equipment"[^>]+aria-label="סינון לפי ציוד"/,
		"select #equipment must define aria-label='סינון לפי ציוד'",
	);
});

test("2. Filter Controls Accessibility: select #level has descriptive aria-label", () => {
	assert.match(
		html,
		/<select[^>]+id="level"[^>]+aria-label="סינון לפי רמת קושי"/,
		"select #level must define aria-label='סינון לפי רמת קושי'",
	);
});

test("2. Filter Controls Accessibility: .chips container has role='group' and descriptive aria-label", () => {
	assert.match(
		html,
		/<div\s+class="chips"\s+role="group"\s+aria-label="סינון לפי סוג">/,
		".chips group must define role='group' and aria-label='סינון לפי סוג'",
	);
});

test("2. Filter Controls Accessibility: reset button #resetFiltersBtn has descriptive aria-label", () => {
	assert.match(
		html,
		/<button[^>]+id="resetFiltersBtn"[^>]+aria-label="איפוס כל המסננים והצגת כל התרגילים"/,
		"reset button #resetFiltersBtn must define aria-label='איפוס כל המסננים והצגת כל התרגילים'",
	);
});

test("2. Filter Controls Accessibility: #grid container has role='region' and descriptive aria-label", () => {
	assert.match(
		html,
		/<div\s+class="grid"\s+id="grid"\s+role="region"\s+aria-label="ספריית תרגילים"><\/div>/,
		"#grid container must define role='region' and aria-label='ספריית תרגילים'",
	);
});

test("3. Dynamic Display Buttons Accessibility: #emptyResetBtn has accessible aria-label", () => {
	const { els, runner } = createMockDom();
	els.q.value = "תרגיל_שאינו_קיים_כלל_xyz";
	runner.render();

	assert.match(
		els.grid.innerHTML,
		/<button[^>]+id="emptyResetBtn"[^>]+aria-label="נקה את כל המסננים והצג את כל התרגילים"/,
		"#emptyResetBtn must define aria-label='נקה את כל המסננים והצג את כל התרגילים'",
	);
});

test("3. Dynamic Display Buttons Accessibility: muscle rail-all buttons have aria-label matching /הצג את כל תרגילי/", () => {
	const { els, runner } = createMockDom();
	els.q.value = "";
	runner.render();

	const railButtons = els.grid.innerHTML.match(
		/<button[^>]*class="[^"]*rail-all[^"]*"[^>]*>/g,
	);
	assert.ok(
		railButtons && railButtons.length > 0,
		"must render at least one muscle rail-all button",
	);

	for (const btn of railButtons) {
		assert.match(
			btn,
			/aria-label="הצג את כל תרגילי[^"]*"/,
			`rail-all button (${btn}) must have aria-label matching /הצג את כל תרגילי/`,
		);
	}
});

test("4. Safe localStorage & Draft Loading Robustness: handles null/undefined/empty localStorage gracefully", () => {
	const original = global.localStorage;
	try {
		global.localStorage = null;
		assert.deepEqual(TH.draftGet(), defaultLibraryDraft);

		delete global.localStorage;
		assert.deepEqual(TH.draftGet(), defaultLibraryDraft);

		global.localStorage = { getItem: () => null };
		assert.deepEqual(TH.draftGet(), defaultLibraryDraft);

		global.localStorage = { getItem: () => "" };
		assert.deepEqual(TH.draftGet(), defaultLibraryDraft);
	} finally {
		global.localStorage = original;
	}
});

test("4. Safe localStorage & Draft Loading Robustness: safely returns default library draft on malformed/corrupted JSON", () => {
	const original = global.localStorage;
	try {
		const corruptedPayloads = [
			"{bad-json",
			"{",
			"undefined",
			"NaN",
			"{'single_quotes': true}",
			JSON.stringify({ title: "ריק", phases: [] }),
		];

		for (const payload of corruptedPayloads) {
			global.localStorage = { getItem: () => payload };
			assert.doesNotThrow(() => {
				const draft = TH.draftGet();
				assert.deepEqual(
					draft,
					defaultLibraryDraft,
					`expected default draft for payload: ${payload}`,
				);
			});
		}
	} finally {
		global.localStorage = original;
	}
});

test("4. Safe localStorage & Draft Loading Robustness: safely returns default library draft when localStorage.getItem throws an exception", () => {
	const original = global.localStorage;
	try {
		const thrownErrors = [
			new Error("SecurityError: Access is denied for this document"),
			new Error("QuotaExceededError: The quota has been exceeded"),
			new Error("Permission denied"),
		];

		for (const err of thrownErrors) {
			global.localStorage = {
				getItem: () => {
					throw err;
				},
			};
			assert.doesNotThrow(() => {
				const draft = TH.draftGet();
				assert.deepEqual(
					draft,
					defaultLibraryDraft,
					`expected default draft when throwing: ${err.message}`,
				);
			});
		}
	} finally {
		global.localStorage = original;
	}
});
