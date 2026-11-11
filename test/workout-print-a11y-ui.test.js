const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.join(__dirname, "..");

const mem = {};
global.localStorage = {
	getItem: (k) => (Object.hasOwn(mem, k) ? mem[k] : null),
	setItem: (k, v) => {
		mem[k] = String(v);
	},
	removeItem: (k) => {
		delete mem[k];
	},
};
global.location = {
	href: "https://swissystem7.github.io/TrainerHub/workout-print.html",
	pathname: "/TrainerHub/workout-print.html",
	hash: "",
	search: "",
};

const TH = require(path.join(root, "js", "core.js"));
TH.setCatalog({});

const html = fs.readFileSync(path.join(root, "workout-print.html"), "utf8");

function inlineScripts(src) {
	const open = "<script>";
	const close = "</script>";
	const out = [];
	let from = 0;
	for (;;) {
		const start = src.indexOf(open, from);
		if (start === -1) break;
		const end = src.indexOf(close, start + open.length);
		if (end === -1) break;
		out.push(src.slice(start + open.length, end));
		from = end + close.length;
	}
	return out;
}

function pageScript() {
	const scripts = inlineScripts(html);
	const src = scripts.find((s) => s.indexOf("brandForm") !== -1);
	assert.ok(src, "inline page script with brandForm found");
	return src;
}

function mountPage() {
	const els = {};
	const handlers = {};
	function el(id) {
		if (!els[id]) {
			const attrs = {};
			els[id] = {
				id: id,
				value: "",
				innerHTML: "",
				textContent: "",
				disabled: false,
				getAttribute: (k) => (attrs[k] != null ? attrs[k] : null),
				setAttribute: (k, v) => {
					attrs[k] = String(v);
				},
				removeAttribute: (k) => {
					delete attrs[k];
				},
				addEventListener: (type, fn) => {
					handlers[`${id}:${type}`] = fn;
				},
			};
		}
		return els[id];
	}
	const document = { getElementById: el };
	const context = {
		document,
		TH,
		window: { print: () => {} },
	};
	vm.createContext(context);
	vm.runInContext(pageScript(), context);
	return {
		el: el,
		submitBrand: (name) => {
			el("brand").value = name;
			handlers["brandForm:submit"]({ preventDefault: () => {} });
		},
	};
}

function reset() {
	Object.keys(mem).forEach((k) => {
		delete mem[k];
	});
}

test("workout-print.html static: nav has accessible label and active page indicator", () => {
	assert.match(html, /<nav class="th-nav no-print" aria-label="ניווט ראשי">/);
	assert.match(html, /<span class="chip on">דף להדפסה<\/span>/);
});

test("workout-print.html static: toolbar form and interactive elements have accessible roles and labels", () => {
	assert.match(
		html,
		/<form class="toolbar no-print" id="brandForm" role="toolbar" aria-label="הגדרות הדפסה ומיתוג אימון">/,
	);
	assert.match(
		html,
		/<input id="brand"[^>]+aria-label="שם המאמן או הסטודיו בדף ההדפסה"/,
	);
	assert.match(
		html,
		/<button type="submit" class="th-btn ghost" id="updateBrandBtn" aria-label="עדכן שם מאמן או סטודיו">עדכן שם<\/button>/,
	);
	assert.match(
		html,
		/<button type="button" class="th-btn" id="printBtn" aria-label="הדפס את דף האימון או שמור כ־PDF">הדפס \/ שמור כ־PDF<\/button>/,
	);
	assert.match(
		html,
		/<a class="th-btn ghost" id="backBtn" href="\.\/" aria-label="חזרה לבונה האימון">חזרה לבונה<\/a>/,
	);
	assert.match(
		html,
		/<p class="honest no-print" id="hint" role="status" aria-live="polite"/,
	);
	assert.match(
		html,
		/<div id="sheet" role="region" aria-label="תצוגת דף אימון להדפסה"><\/div>/,
	);
});

test("workout-print.html static: head contains mobile viewport meta tag", () => {
	assert.match(
		html,
		/<meta name="viewport" content="width=device-width,initial-scale=1">/,
	);
	const headMatch = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
	assert.ok(headMatch, "document must contain a <head> element");
	const head = headMatch[1];
	const viewportMatch = head.match(/<meta\s+[^>]*name=["']viewport["'][^>]*>/i);
	assert.ok(viewportMatch, "head must contain a viewport meta tag");
	const contentMatch = viewportMatch[0].match(/content=["']([^"']+)["']/i);
	assert.ok(contentMatch, "viewport meta tag must have a content attribute");
	assert.match(contentMatch[1], /width=device-width/i);
	assert.match(contentMatch[1], /initial-scale=\s*1(?:\.0)?(?:\b|$)/i);
});

test("workout-print.html CSS: focus-visible outline and disabled button styling are declared", () => {
	assert.match(
		html,
		/button:focus-visible,\s*input:focus-visible,\s*a:focus-visible\s*\{\s*outline:\s*2px solid var\(--lime\);/,
	);
	assert.match(
		html,
		/\.th-btn\[disabled\],\s*\.th-btn\[aria-disabled="true"\]/,
	);
});

test("workout-print.html CSS: @media print hides toolbar, control buttons, and no-print elements", () => {
	assert.match(
		html,
		/@media print\s*\{[\s\S]*?\.no-print,\s*\.th-nav,\s*\.toolbar,\s*button\s*\{\s*display:\s*none\s*!important;\s*\}[\s\S]*?\}/,
	);
});

test("workout-print.html CSS: table responsiveness and text overflow prevention are declared", () => {
	assert.match(html, /(?:\.print-sheet\s+)?table\s*\{[^}]*width:\s*100%;/);
	assert.match(
		html,
		/(?:\.print-sheet\s+)?table\s*\{[^}]*border-collapse:\s*collapse;/,
	);
	assert.match(
		html,
		/(?:\.print-sheet\s+)?th,\s*(?:\.print-sheet\s+)?td\s*\{[^}]*overflow-wrap:\s*break-word;/,
	);
	assert.match(
		html,
		/(?:\.print-sheet\s+)?th,\s*(?:\.print-sheet\s+)?td\s*\{[^}]*word-break:\s*break-word;/,
	);
});

test("workout-print.html CSS: @media print declares page break avoidance for printable phases, rows, and tables", () => {
	assert.match(
		html,
		/@media print\s*\{[\s\S]*?(?:\.print-phase,\s*\.print-sheet tr,\s*\.print-sheet table|\.print-phase,\s*tr,\s*table)[^{]*\{[^}]*break-inside:\s*avoid;/,
	);
	assert.match(
		html,
		/@media print\s*\{[\s\S]*?(?:\.print-phase,\s*\.print-sheet tr,\s*\.print-sheet table|\.print-phase,\s*tr,\s*table)[^{]*\{[^}]*page-break-inside:\s*avoid;/,
	);
});

test("workout-print.html dynamic: empty state disables print button and renders accessible message with call-to-action", () => {
	reset();
	const page = mountPage();
	assert.match(page.el("sheet").innerHTML, /<div class="empty" role="status">/);
	assert.match(page.el("sheet").innerHTML, /אין אימון בדפדפן/);
	assert.match(page.el("sheet").innerHTML, /בנה אימון עכשיו/);
	assert.equal(page.el("printBtn").disabled, true);
	assert.equal(page.el("printBtn").getAttribute("aria-disabled"), "true");
});

test("workout-print.html dynamic: active workout renders sheet and enables print button", () => {
	reset();
	TH.store.set(TH.KEYS.active, {
		title: "אימון פונקציונלי",
		phases: [
			{
				name: "Main",
				exercises: [{ id: "pushup", name: "שכיבות סמיכה", sets: 4, reps: 15 }],
			},
		],
	});
	const page = mountPage();
	assert.match(page.el("sheet").innerHTML, /אימון פונקציונלי/);
	assert.match(page.el("sheet").innerHTML, /שכיבות סמיכה/);
	assert.equal(page.el("printBtn").disabled, false);
	assert.equal(page.el("printBtn").getAttribute("aria-disabled"), null);
});
