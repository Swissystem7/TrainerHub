const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(
	path.join(__dirname, "..", "journal.html"),
	"utf8",
);

let activeStorage = null;
global.localStorage = {
	getItem: (k) => (activeStorage ? activeStorage.getItem(k) : null),
	setItem: (k, v) => {
		if (activeStorage) {
			activeStorage.setItem(k, v);
		}
	},
	removeItem: (k) => {
		if (activeStorage) {
			activeStorage.removeItem(k);
		}
	},
};

const TH = require(path.join(root, "js", "core.js"));

test("journal.html <head> contains a mobile viewport meta tag", () => {
	const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
	assert.ok(headMatch, "journal.html must contain a <head> element");
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

test("journal.html root <html> has lang='he' and dir='rtl', and has valid non-empty <title> and <h1>", () => {
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

test("journal.html CSS specifies focus-visible outline and contains skip-link for keyboard navigation", () => {
	assert.match(
		html,
		/button:focus-visible,\s*input:focus-visible,\s*textarea:focus-visible,\s*select:focus-visible,\s*a:focus-visible\s*\{\s*outline:\s*2px solid var\(--lime\);\s*outline-offset:\s*2px;\s*\}/,
		"CSS must specify focus-visible with outline 2px solid var(--lime) and outline-offset 2px",
	);

	assert.match(
		html,
		/<a\s+class="skip-link"\s+href="#importCode">/,
		"document must contain skip-link referencing #importCode",
	);
});

test("journal.html accessible landmarks and form controls: forms define role='region' and matching aria-labelledby", () => {
	const formIds = ["importForm", "addForm", "coachBuildForm"];
	for (const formId of formIds) {
		const formRegex = new RegExp(
			`<form\\b[^>]*id=["']${formId}["'][^>]*>`,
			"i",
		);
		const formMatch = html.match(formRegex);
		assert.ok(formMatch, `form #${formId} must exist`);
		const formAttrs = formMatch[0];

		assert.match(
			formAttrs,
			/\brole=["']region["']/i,
			`form #${formId} must declare role="region"`,
		);

		const labelledMatch = formAttrs.match(
			/\baria-labelledby=["']([^"']+)["']/i,
		);
		assert.ok(
			labelledMatch,
			`form #${formId} must declare aria-labelledby attribute`,
		);
		const headingId = labelledMatch[1];

		const headingRegex = new RegExp(
			`<h[1-6]\\b[^>]*id=["']${headingId}["'][^>]*>([\\s\\S]*?)<\\/h[1-6]>`,
			"i",
		);
		const headingMatch = html.match(headingRegex);
		assert.ok(
			headingMatch,
			`heading with id="${headingId}" referenced by #${formId} must exist`,
		);
		assert.ok(
			/[^<>\s]/.test(headingMatch[1]),
			`heading #${headingId} must contain visible text`,
		);
	}
});

test("journal.html action containers declare role='toolbar' and buttons declare descriptive aria-labels", () => {
	assert.match(
		html,
		/<div class="actions" role="toolbar" aria-label="פעולות ייבוא קוד">/,
		"importForm action container must declare role='toolbar'",
	);
	assert.match(
		html,
		/<button[^>]*class="th-btn"[^>]*aria-label="ייבא קוד ליומן"[^>]*>ייבא ליומן<\/button>/,
		"importForm submit button must declare descriptive aria-label",
	);

	assert.match(
		html,
		/<div class="actions" role="toolbar" aria-label="פעולות הוספת מתאמן">/,
		"addForm action container must declare role='toolbar'",
	);
	assert.match(
		html,
		/<button[^>]*class="th-btn ghost"[^>]*aria-label="הוסף מתאמן חדש"[^>]*>הוסף מתאמן<\/button>/,
		"addForm submit button must declare descriptive aria-label",
	);

	assert.match(
		html,
		/<div class="actions" role="toolbar" aria-label="פעולות בניית אימון ושיוך למתאמן">/,
		"coachBuildForm action container must declare role='toolbar'",
	);
	assert.match(
		html,
		/<button[^>]*class="th-btn"[^>]*aria-label="בנה ושייך אימון למתאמן"[^>]*>בנה ושייך אימון<\/button>/,
		"coachBuildForm submit button must declare descriptive aria-label",
	);

	// Client card actions container template
	assert.match(
		html,
		/<div class="actions" role="toolbar" aria-label="פעולות עבור ' \+ TH\.esc\(c\.name \|\| 'מתאמן'\) \+ '">/,
		"client card template action container must declare role='toolbar'",
	);

	// Client card action buttons declare descriptive aria-labels
	const cardActions = [
		{ act: "preview", labelPrefix: "פתח כמתאמן עבור " },
		{ act: "share", labelPrefix: "שתף אימון עבור " },
		{ act: "pdf", labelPrefix: "דף להדפסה / PDF עבור " },
		{ act: "report", labelPrefix: "דוח חודשי להדפסה עבור " },
		{ act: "nudge", labelPrefix: "תזכורת בוואטסאפ עבור " },
		{ act: "next", labelPrefix: "הצע שבוע הבא עבור " },
		{ act: "assign", labelPrefix: "שייך אימון פעיל ל" },
	];
	for (const action of cardActions) {
		const expectedAttr = `aria-label="${action.labelPrefix}' + TH.esc(c.name || 'מתאמן') + '"`;
		assert.ok(
			html.includes(expectedAttr),
			`client card action ${action.act} must declare descriptive aria-label`,
		);
	}
});

test("journal.html status elements declare role='status' and aria-live='polite'", () => {
	const statusIds = [
		"importStatus",
		"backupStatus",
		"coachStatus",
		"remindStatus",
		"filterStatus",
		"setStatus",
	];
	for (const id of statusIds) {
		const regex = new RegExp(
			`<[^>]+id=["']${id}["'][^>]*role=["']status["'][^>]*aria-live=["']polite["']`,
			"i",
		);
		const regexSwapped = new RegExp(
			`<[^>]+id=["']${id}["'][^>]*aria-live=["']polite["'][^>]*role=["']status["']`,
			"i",
		);
		assert.ok(
			regex.test(html) || regexSwapped.test(html),
			`#${id} must declare role="status" and aria-live="polite"`,
		);
	}

	assert.match(
		html,
		/<p class="empty" role="status" aria-live="polite">/,
		"empty state in render must declare role='status' and aria-live='polite'",
	);
});

function extractInlineScript(src) {
	const open = src.lastIndexOf("<script>");
	const close = src.indexOf("</script>", open);
	assert.ok(
		open >= 0 && close > open,
		"journal.html must contain an inline script",
	);
	return src.slice(open + "<script>".length, close);
}

function createMockElement(id, eventMap) {
	const attrs = {};
	return {
		id: id,
		value: "",
		textContent: "",
		innerHTML: "",
		className: "",
		disabled: false,
		hidden: false,
		type: id === "reportMonth" ? "month" : "",
		files: [],
		getAttribute: (k) => (Object.hasOwn(attrs, k) ? attrs[k] : null),
		setAttribute: (k, v) => {
			attrs[k] = String(v);
		},
		removeAttribute: (k) => {
			delete attrs[k];
		},
		addEventListener: (type, fn) => {
			if (!eventMap[id]) {
				eventMap[id] = {};
			}
			if (!eventMap[id][type]) {
				eventMap[id][type] = [];
			}
			eventMap[id][type].push(fn);
		},
		querySelector: () => null,
		querySelectorAll: () => [],
		closest: () => null,
		insertAdjacentHTML: () => {},
	};
}

function simulateJournalExecution(storageMock) {
	const elements = {};
	const eventMap = {};
	const getEl = (id) => {
		if (!elements[id]) {
			elements[id] = createMockElement(id, eventMap);
		}
		return elements[id];
	};

	activeStorage = storageMock;

	let thrownError = null;
	try {
		const context = {
			document: {
				getElementById: getEl,
				createElement: (tag) => createMockElement(tag, eventMap),
				body: { appendChild: () => {} },
				visibilityState: "visible",
			},
			TH: TH,
			location: {
				href: "https://swissystem7.github.io/TrainerHub/journal.html",
			},
			window: {
				open: () => {},
				confirm: () => true,
				THJournalStorage: null,
				THSessionTracker: null,
			},
			localStorage: global.localStorage,
			Date: Date,
			Array: Array,
			Object: Object,
			String: String,
			Number: Number,
			Boolean: Boolean,
			JSON: JSON,
			Math: Math,
			setInterval: () => ({ unref: () => {} }),
		};

		vm.createContext(context);
		vm.runInContext(extractInlineScript(html), context);
	} catch (err) {
		thrownError = err;
	}

	return {
		error: thrownError,
		$: getEl,
		elements: elements,
		fireEvent: (id, type, evt) => {
			const handlers = eventMap[id]?.[type] || [];
			const eventObj = Object.assign({ preventDefault: () => {} }, evt || {});
			for (const fn of handlers) {
				fn(eventObj);
			}
		},
	};
}

test("storage robustness: empty localStorage initializes clients safely as an empty array without unhandled exceptions", () => {
	let savedData = null;
	const emptyStorage = {
		getItem: () => null,
		setItem: (_k, v) => {
			savedData = v;
		},
		removeItem: () => {},
	};

	const app = simulateJournalExecution(emptyStorage);
	assert.equal(
		app.error,
		null,
		"inline script must run without unhandled exceptions on empty storage",
	);

	// Renders empty state correctly
	assert.match(
		app.$("list").innerHTML,
		/עדיין אין מתאמנים אמיתיים/,
		"renders empty clients message",
	);
	assert.equal(app.$("clActive").textContent, "0");
	assert.equal(app.$("clAdherence").textContent, "0%");
	assert.equal(app.$("clRisk").textContent, "0");
	assert.equal(
		app.$("coachClient").disabled,
		true,
		"coachClient selector is disabled when empty",
	);

	// Verify clients is safely an array by adding a client through addForm
	app.$("newName").value = "דני לוי";
	app.fireEvent("addForm", "submit");

	assert.ok(savedData, "addForm must save to storage");
	const parsed = JSON.parse(savedData);
	assert.ok(
		Array.isArray(parsed),
		"saved clients must be an array after addition",
	);
	assert.equal(parsed.length, 1, "exactly one client added");
	assert.equal(parsed[0].name, "דני לוי");
});

test("storage robustness: corrupted JSON in localStorage initializes clients safely as an empty array without unhandled exceptions", () => {
	let savedData = null;
	const corruptedStorage = {
		getItem: (k) => (k === TH.KEYS.clients ? "corrupted JSON {[{::" : null),
		setItem: (_k, v) => {
			savedData = v;
		},
		removeItem: () => {},
	};

	const app = simulateJournalExecution(corruptedStorage);
	assert.equal(
		app.error,
		null,
		"inline script must run without unhandled exceptions on corrupted JSON storage",
	);

	assert.match(
		app.$("list").innerHTML,
		/עדיין אין מתאמנים אמיתיים/,
		"renders empty clients message",
	);
	assert.equal(app.$("clActive").textContent, "0");
	assert.equal(app.$("clAdherence").textContent, "0%");
	assert.equal(app.$("clRisk").textContent, "0");
	assert.equal(app.$("coachClient").disabled, true);

	// Verify adding a client succeeds without exceptions
	app.$("newName").value = "רוני כהן";
	app.fireEvent("addForm", "submit");

	assert.ok(savedData, "addForm must save to storage");
	const parsed = JSON.parse(savedData);
	assert.ok(Array.isArray(parsed));
	assert.equal(parsed.length, 1);
	assert.equal(parsed[0].name, "רוני כהן");
});

test("storage robustness: non-array JSON in localStorage initializes clients safely as an empty array without unhandled exceptions", () => {
	let savedData = null;
	const nonArrayStorage = {
		getItem: (k) =>
			k === TH.KEYS.clients ? JSON.stringify({ not: "an array" }) : null,
		setItem: (_k, v) => {
			savedData = v;
		},
		removeItem: () => {},
	};

	const app = simulateJournalExecution(nonArrayStorage);
	assert.equal(
		app.error,
		null,
		"inline script must run without unhandled exceptions on non-array stored value",
	);

	assert.match(
		app.$("list").innerHTML,
		/עדיין אין מתאמנים אמיתיים/,
		"renders empty clients message",
	);
	assert.equal(app.$("clActive").textContent, "0");
	assert.equal(app.$("clAdherence").textContent, "0%");
	assert.equal(app.$("clRisk").textContent, "0");
	assert.equal(app.$("coachClient").disabled, true);

	// Verify adding a client succeeds without exceptions
	app.$("newName").value = "מיכל אברהם";
	app.fireEvent("addForm", "submit");

	assert.ok(savedData, "addForm must save to storage");
	const parsed = JSON.parse(savedData);
	assert.ok(Array.isArray(parsed));
	assert.equal(parsed.length, 1);
	assert.equal(parsed[0].name, "מיכל אברהם");
});

test("storage robustness: throwing storage access initializes clients safely without unhandled exceptions", () => {
	const throwingStorage = {
		getItem: () => {
			throw new Error("QuotaExceededError or SecurityError: storage blocked");
		},
		setItem: () => {
			throw new Error("QuotaExceededError: storage write blocked");
		},
		removeItem: () => {},
	};

	const app = simulateJournalExecution(throwingStorage);
	assert.equal(
		app.error,
		null,
		"inline script must run without unhandled exceptions when storage throws",
	);

	assert.match(
		app.$("list").innerHTML,
		/עדיין אין מתאמנים אמיתיים/,
		"renders empty clients message",
	);
	assert.equal(app.$("clActive").textContent, "0");
	assert.equal(app.$("clAdherence").textContent, "0%");
	assert.equal(app.$("clRisk").textContent, "0");
	assert.equal(app.$("coachClient").disabled, true);
});
test("journal.html contains accessibility and section id='journal-progress-guidance'", () => {
	const sectionMatch = html.match(/<section\b[^>]*id=["']journal-progress-guidance["'][^>]*>/i);
	assert.ok(sectionMatch, "journal.html must contain a section with id='journal-progress-guidance'");
	assert.match(html, /id=["']journal-progress-guidance["'][^>]*role=["']region["']/i, "journal-progress-guidance section must have role='region'");
	assert.match(html, /id=["']journal-progress-guidance["'][^>]*aria-labelledby=["']journalProgressGuidanceHeading["']/i, "journal-progress-guidance section must have aria-labelledby");
	assert.match(html, /<h2\b[^>]*id=["']journalProgressGuidanceHeading["'][^>]*>איך מודדים התקדמות ביומן<\/h2>/i, "journal-progress-guidance must have heading with id='journalProgressGuidanceHeading'");
});

test("journal.html guidance explains progress over time based on control, reps, load, adherence, and feel rather than a single measurement", () => {
	assert.match(
		html,
		/מעקב ההתקדמות ביומן מתבסס על שליטה,\s*חזרות,\s*עומס,\s*התמדה והרגשה לאורך זמן,\s*ולא על שקילה או מדידה בודדת/i,
		"guidance must explain progress tracking over time based on control, reps, load, adherence, and feel rather than single measurement"
	);
});

test("journal.html guidance contains safety, recovery check, and injury warning instructions", () => {
	assert.match(html, /ירידה חוזרת בביצועים,\s*כדאי לבדוק שינה,\s*תזונה ועומס כולל לפני הוספת סטים/i, "guidance must advise checking sleep, nutrition, and load before adding sets when performance drops");
	assert.match(html, /במקרה של כאב חדש או פציעה יש לעצור ולהתייעץ עם איש מקצוע/i, "guidance must advise stopping and consulting a professional in case of new pain or injury");
});

