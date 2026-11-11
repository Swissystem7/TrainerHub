const test = require("node:test");
const assert = require("node:assert/strict");

const THExerciseCardFallback = require("../js/exercise-card-fallback.js");
const {
	MUSCLE_SVGS,
	TEMPO_DEFAULTS,
	hasValidVideo,
	getMuscleSvg,
	getRecommendedTempo,
	formatInstructions,
	renderFallbackCardHtml,
	renderFallbackCard,
	escapeHtml,
} = THExerciseCardFallback;

test("1) hasValidVideo returns true for valid URLs/IDs and false for empty, whitespace, null, or undefined", () => {
	// Valid video cases
	assert.equal(
		hasValidVideo({ videoUrl: "https://example.com/squat.mp4" }),
		true,
	);
	assert.equal(
		hasValidVideo({ video_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" }),
		true,
	);
	assert.equal(hasValidVideo({ youtubeId: "dQw4w9WgXcQ" }), true);
	assert.equal(
		hasValidVideo({
			videoUrl: "   ",
			video_url: "",
			youtubeId: "abc12345678",
		}),
		true,
	);

	// Invalid / empty / whitespace / missing cases
	assert.equal(hasValidVideo(null), false);
	assert.equal(hasValidVideo(undefined), false);
	assert.equal(hasValidVideo({}), false);
	assert.equal(hasValidVideo({ videoUrl: "" }), false);
	assert.equal(hasValidVideo({ videoUrl: "   \t\n  " }), false);
	assert.equal(hasValidVideo({ video_url: "" }), false);
	assert.equal(hasValidVideo({ video_url: "   " }), false);
	assert.equal(hasValidVideo({ youtubeId: "" }), false);
	assert.equal(hasValidVideo({ youtubeId: "    " }), false);
	assert.equal(hasValidVideo({ videoUrl: null, youtubeId: undefined }), false);
	assert.equal(hasValidVideo({ videoUrl: 12345 }), false);
	assert.equal(hasValidVideo("not-an-object"), false);
	assert.equal(hasValidVideo(999), false);
	assert.equal(hasValidVideo(true), false);
});

test("2) renderFallbackCardHtml generates complete card with no <iframe> or <video> tags when video is missing/empty", () => {
	const exercisesToTest = [
		{ name: "שכיבות סמיכה", muscle: "chest" },
		{ name: "סקוואט חופשי", videoUrl: "" },
		{ name: "מתח רחב", video_url: "   ", youtubeId: null },
		{ name: "פלאנק סטטי", videoUrl: null, youtubeId: "" },
	];

	for (const ex of exercisesToTest) {
		const html = renderFallbackCardHtml(ex);
		assert.equal(typeof html, "string");
		assert.ok(html.length > 50);

		// Must NOT render any <iframe>, <video>, or broken media
		assert.doesNotMatch(html, /<iframe/i);
		assert.doesNotMatch(html, /<video/i);

		// Must render the fallback card container with accessible role and title
		assert.match(html, /<article[^>]*class="[^"]*th-exercise-fallback-card[^"]*"/);
		assert.match(html, /role="region"/);
		assert.match(html, /aria-label="כרטיס תרגיל חלופי:/);
		assert.match(html, /class="fallback-status-badge"/);
		assert.match(html, /class="fallback-exercise-title"/);
		assert.match(html, /class="fallback-muscle-diagram"/);
		assert.match(html, /class="fallback-tempo-badge"/);
		assert.match(html, /<ol class="fallback-instructions"/);
	}
});

test("3) SVG muscle group rendering: provides correct SVG for recognized muscles (chest, back, legs, core, shoulders, arms)", () => {
	const muscleKeys = ["chest", "back", "legs", "core", "shoulders", "arms"];

	for (const muscle of muscleKeys) {
		const svg = getMuscleSvg(muscle);
		assert.equal(typeof svg, "string");
		assert.equal(svg, MUSCLE_SVGS[muscle]);

		// Required SVG structure
		assert.match(svg, /xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
		assert.match(svg, /viewBox="0 0 100 100"/);
		assert.match(svg, /aria-hidden="true"/);
		assert.match(svg, new RegExp(`th-muscle-${muscle}`));

		// Contains clean vector shapes
		assert.match(svg, /<(path|rect|circle)/);
	}

	// Also recognizes aliases and Hebrew names
	assert.equal(getMuscleSvg("חזה"), MUSCLE_SVGS.chest);
	assert.equal(getMuscleSvg("pecs"), MUSCLE_SVGS.chest);
	assert.equal(getMuscleSvg("גב"), MUSCLE_SVGS.back);
	assert.equal(getMuscleSvg("lats"), MUSCLE_SVGS.back);
	assert.equal(getMuscleSvg("רגליים"), MUSCLE_SVGS.legs);
	assert.equal(getMuscleSvg("quads"), MUSCLE_SVGS.legs);
	assert.equal(getMuscleSvg("בטן"), MUSCLE_SVGS.core);
	assert.equal(getMuscleSvg("ליבה"), MUSCLE_SVGS.core);
	assert.equal(getMuscleSvg("abs"), MUSCLE_SVGS.core);
	assert.equal(getMuscleSvg("כתפיים"), MUSCLE_SVGS.shoulders);
	assert.equal(getMuscleSvg("delts"), MUSCLE_SVGS.shoulders);
	assert.equal(getMuscleSvg("ידיים"), MUSCLE_SVGS.arms);
	assert.equal(getMuscleSvg("זרועות"), MUSCLE_SVGS.arms);
	assert.equal(getMuscleSvg("biceps"), MUSCLE_SVGS.arms);
});

test("4) SVG fallback: unknown or missing muscle group falls back gracefully to full_body/general SVG", () => {
	const fallbackSvg = MUSCLE_SVGS.full_body;
	assert.equal(typeof fallbackSvg, "string");
	assert.ok(fallbackSvg.length > 20);

	// Missing inputs
	assert.equal(getMuscleSvg(null), fallbackSvg);
	assert.equal(getMuscleSvg(undefined), fallbackSvg);
	assert.equal(getMuscleSvg(""), fallbackSvg);
	assert.equal(getMuscleSvg("   "), fallbackSvg);
	assert.equal(getMuscleSvg(123), fallbackSvg);

	// Unknown muscle groups
	assert.equal(getMuscleSvg("unknown_muscle"), fallbackSvg);
	assert.equal(getMuscleSvg("calisthenics_magic"), fallbackSvg);
	assert.equal(getMuscleSvg("random"), fallbackSvg);

	// Verify renderFallbackCardHtml incorporates fallback SVG
	const htmlUnknown = renderFallbackCardHtml({
		name: "תרגיל מורכב",
		muscle: "unknown_mystery",
	});
	assert.ok(htmlUnknown.includes("th-muscle-full-body"));
});

test("5) Numbered instructions: renders ordered list (<ol>, <li>) with clear execution steps", () => {
	const ex = {
		name: "סקוואט עם משקל גוף",
		instructions: [
			"עמידה בפיסוק מעט רחב מרוחב הכתפיים",
			"ירידה מבוקרת לאחור עד שהירכיים מקבילות לרצפה",
			"דחיפה יציבה דרך העקבים וחזרה לעמידה",
		],
	};

	const formatted = formatInstructions(ex);
	assert.equal(formatted.length, 3);
	assert.equal(formatted[0], "1. עמידה בפיסוק מעט רחב מרוחב הכתפיים");
	assert.equal(
		formatted[1],
		"2. ירידה מבוקרת לאחור עד שהירכיים מקבילות לרצפה",
	);
	assert.equal(formatted[2], "3. דחיפה יציבה דרך העקבים וחזרה לעמידה");

	const html = renderFallbackCardHtml(ex);
	assert.match(html, /<ol class="fallback-instructions"[^>]*>/);
	assert.match(
		html,
		/<li class="fallback-instruction-step"[^>]*>1\. עמידה בפיסוק מעט רחב מרוחב הכתפיים<\/li>/,
	);
	assert.match(
		html,
		/<li class="fallback-instruction-step"[^>]*>2\. ירידה מבוקרת לאחור עד שהירכיים מקבילות לרצפה<\/li>/,
	);
	assert.match(
		html,
		/<li class="fallback-instruction-step"[^>]*>3\. דחיפה יציבה דרך העקבים וחזרה לעמידה<\/li>/,
	);

	// Handles newline-delimited cues as well
	const exWithCues = {
		name: "שכיבות סמיכה",
		cues: "הצבת כפות הידיים\nשמירה על גו ישר\nירידה עד 90 מעלות במרפק",
	};
	const cuesFormatted = formatInstructions(exWithCues);
	assert.equal(cuesFormatted.length, 3);
	assert.equal(cuesFormatted[0], "1. הצבת כפות הידיים");
	assert.equal(cuesFormatted[1], "2. שמירה על גו ישר");
	assert.equal(cuesFormatted[2], "3. ירידה עד 90 מעלות במרפק");
});

test("6) Default instructions: provides fallback execution guidance when exercise.instructions is absent", () => {
	const muscleGroups = [
		"chest",
		"back",
		"legs",
		"core",
		"shoulders",
		"arms",
		"full_body",
	];

	for (const muscle of muscleGroups) {
		const exWithoutInstructions = {
			name: `תרגיל ${muscle}`,
			muscle: muscle,
		};
		const instructions = formatInstructions(exWithoutInstructions);
		assert.ok(Array.isArray(instructions));
		assert.ok(instructions.length >= 3);

		// Numbered prefix
		for (let i = 0; i < instructions.length; i++) {
			assert.ok(
				instructions[i].startsWith(`${i + 1}. `),
				`Instruction ${i + 1} should start with index prefix`,
			);
			assert.ok(instructions[i].length > 10);
		}

		// When rendered to HTML, instructions list is properly built
		const html = renderFallbackCardHtml(exWithoutInstructions);
		assert.match(html, /<ol class="fallback-instructions"/);
		assert.ok(html.includes(instructions[0]));
	}
});

test("7) Recommended tempo badge: renders recommended cadence/tempo in Hebrew", () => {
	// 1. Explicit tempo string
	assert.equal(
		getRecommendedTempo({ tempo: "3-1-2" }),
		"3-1-2",
	);

	// 2. Preset tempo by key
	assert.equal(
		getRecommendedTempo({ tempo: "isometric" }),
		TEMPO_DEFAULTS.isometric,
	);
	assert.equal(
		getRecommendedTempo({ tempo_type: "explosive" }),
		TEMPO_DEFAULTS.explosive,
	);

	// 3. Inferred from exercise name / characteristics
	assert.equal(
		getRecommendedTempo({ name: "פלאנק סטטי על האמות" }),
		TEMPO_DEFAULTS.isometric,
	);
	assert.equal(
		getRecommendedTempo({ name: "קפיצות כוח מתפרץ" }),
		TEMPO_DEFAULTS.explosive,
	);

	// 4. Default standard fallback
	assert.equal(
		getRecommendedTempo({ name: "סקוואט קלאסי" }),
		TEMPO_DEFAULTS.standard,
	);
	assert.equal(
		getRecommendedTempo(null),
		TEMPO_DEFAULTS.standard,
	);

	// Check tempo badge rendered in Hebrew inside the card HTML
	const htmlStandard = renderFallbackCardHtml({ name: "סקוואט קלאסי" });
	assert.match(htmlStandard, /קצב מומלץ:/);
	assert.ok(htmlStandard.includes(escapeHtml(TEMPO_DEFAULTS.standard)));

	const htmlIso = renderFallbackCardHtml({ name: "פלאנק סטטי" });
	assert.ok(htmlIso.includes(escapeHtml(TEMPO_DEFAULTS.isometric)));
});

test("8) Outdoor mode active: adds th-outdoor-mode class, data-outdoor='true', and high-contrast styling", () => {
	const ex = { name: "ספרינט בשטח", muscle: "legs" };

	// Test with outdoorMode: true
	const htmlOutdoor = renderFallbackCardHtml(ex, { outdoorMode: true });
	assert.match(htmlOutdoor, /class="[^"]*th-outdoor-mode[^"]*"/);
	assert.match(htmlOutdoor, /data-outdoor="true"/);
	assert.match(htmlOutdoor, /--th-card-bg:#000000;/);
	assert.match(htmlOutdoor, /--th-card-fg:#ffffff;/);
	assert.match(htmlOutdoor, /background-color:#000000;/);
	assert.match(htmlOutdoor, /color:#ffffff;/);
	assert.match(htmlOutdoor, /border:3px solid #ffff00;/);

	// Test with highContrast: true
	const htmlHighContrast = renderFallbackCardHtml(ex, { highContrast: true });
	assert.match(htmlHighContrast, /class="[^"]*th-outdoor-mode[^"]*"/);
	assert.match(htmlHighContrast, /data-outdoor="true"/);
});

test("9) Outdoor mode disabled: default high-contrast flag is omitted when outdoorMode is false or unset", () => {
	const ex = { name: "שכיבות סמיכה", muscle: "chest" };

	// Unset options
	const htmlUnset = renderFallbackCardHtml(ex);
	assert.doesNotMatch(htmlUnset, /th-outdoor-mode/);
	assert.doesNotMatch(htmlUnset, /data-outdoor="true"/);
	assert.match(htmlUnset, /--th-card-bg:#ffffff;/);
	assert.match(htmlUnset, /border:1px solid #e2e8f0;/);

	// Explicit false
	const htmlFalse = renderFallbackCardHtml(ex, {
		outdoorMode: false,
		highContrast: false,
	});
	assert.doesNotMatch(htmlFalse, /th-outdoor-mode/);
	assert.doesNotMatch(htmlFalse, /data-outdoor="true"/);
});

test("10) Robustness on bad input: handles null, undefined, empty object, or non-object exercise safely without throwing", () => {
	const badInputs = [null, undefined, {}, "", "string", 12345, true, [], NaN];

	for (const input of badInputs) {
		assert.doesNotThrow(() => {
			const html = renderFallbackCardHtml(input);
			assert.equal(typeof html, "string");
			assert.ok(html.includes("th-exercise-fallback-card"));
			assert.ok(html.includes("fallback-instructions"));
		});

		assert.doesNotThrow(() => {
			const tempo = getRecommendedTempo(input);
			assert.equal(tempo, TEMPO_DEFAULTS.standard);
		});

		assert.doesNotThrow(() => {
			const inst = formatInstructions(input);
			assert.ok(Array.isArray(inst));
			assert.ok(inst.length > 0);
		});

		assert.doesNotThrow(() => {
			const hasVid = hasValidVideo(input);
			assert.equal(hasVid, false);
		});
	}
});

test("11) XSS prevention: escapes dangerous characters in exercise name or instructions", () => {
	const dangerousExercise = {
		name: '<script>alert("xss-name")</script>',
		muscle: 'chest"><svg onload=alert("xss-muscle")>',
		instructions: [
			'<img src="x" onerror="alert(\'xss-inst\')">',
			'Normal step & with <bold> tags "and quotes"',
		],
		equipment: '<b onmouseover="alert(\'xss-equip\')">משקולת</b>',
		tempo: '2-0-2<script>alert(1)</script>',
	};

	const html = renderFallbackCardHtml(dangerousExercise);

	// Unescaped malicious code must NOT appear as HTML elements or attributes
	assert.doesNotMatch(html, /<script\b/i);
	assert.doesNotMatch(html, /<img\b/i);
	assert.doesNotMatch(html, /<svg\b[^>]*onload/i);
	assert.doesNotMatch(html, /<b\b/i);

	// Escaped entities must be present
	assert.ok(
		html.includes("&lt;script&gt;alert(&quot;xss-name&quot;)&lt;/script&gt;"),
	);
	assert.ok(html.includes("&lt;img src=&quot;x&quot;"));
	assert.ok(html.includes("&amp; with &lt;bold&gt;"));
	assert.ok(html.includes("&quot;and quotes&quot;"));
	assert.ok(html.includes("&lt;b onmouseover="));
});

test("12) DOM helper: renderFallbackCard populates a DOM element correctly", () => {
	// 1. Mock DOM element with standard DOM methods (replaceChildren, insertAdjacentHTML)
	let domBuffer = "";
	const mockDomElement = {
		replaceChildren() {
			domBuffer = "";
		},
		insertAdjacentHTML(position, text) {
			if (position === "afterbegin") {
				domBuffer = text + domBuffer;
			} else {
				domBuffer += text;
			}
		},
		get innerHTML() {
			return domBuffer;
		},
	};

	const exercise = {
		name: "לאנג׳ים בהליכה",
		muscle: "legs",
	};

	const returnedDom = renderFallbackCard(mockDomElement, exercise, {
		outdoorMode: false,
	});
	assert.equal(returnedDom, mockDomElement);
	assert.ok(mockDomElement.innerHTML.includes("לאנג׳ים בהליכה"));
	assert.ok(mockDomElement.innerHTML.includes("fallback-instructions"));
	assert.ok(mockDomElement.innerHTML.includes("th-muscle-legs"));

	// 2. Simple container object with innerHTML property
	const mockContainer = {
		innerHTML: "",
	};

	const returned = renderFallbackCard(mockContainer, exercise, {
		outdoorMode: false,
	});
	assert.equal(returned, mockContainer);
	assert.ok(mockContainer.innerHTML.includes("לאנג׳ים בהליכה"));
	assert.ok(mockContainer.innerHTML.includes("fallback-instructions"));
	assert.ok(mockContainer.innerHTML.includes("th-muscle-legs"));

	// Fallback when container is null/undefined
	const directHtml = renderFallbackCard(null, exercise);
	assert.equal(typeof directHtml, "string");
	assert.ok(directHtml.includes("לאנג׳ים בהליכה"));

	// Container without innerHTML returns html safely
	const plainObj = {};
	const resPlain = renderFallbackCard(plainObj, exercise);
	assert.equal(typeof resPlain, "string");
});

test("13) UMD export: verifies module exports in CommonJS and exposes THExerciseCardFallback on global/window", () => {
	// CommonJS export tests
	assert.equal(typeof THExerciseCardFallback, "object");
	assert.equal(typeof THExerciseCardFallback.hasValidVideo, "function");
	assert.equal(typeof THExerciseCardFallback.getMuscleSvg, "function");
	assert.equal(typeof THExerciseCardFallback.getRecommendedTempo, "function");
	assert.equal(typeof THExerciseCardFallback.formatInstructions, "function");
	assert.equal(typeof THExerciseCardFallback.renderFallbackCardHtml, "function");
	assert.equal(typeof THExerciseCardFallback.renderFallbackCard, "function");
	assert.equal(typeof THExerciseCardFallback.escapeHtml, "function");
	assert.ok(THExerciseCardFallback.MUSCLE_SVGS);
	assert.ok(THExerciseCardFallback.TEMPO_DEFAULTS);

	// Global attachment check
	assert.ok(globalThis.THExerciseCardFallback);
	assert.equal(globalThis.THExerciseCardFallback, THExerciseCardFallback);
	assert.equal(
		globalThis.THExerciseCardFallback.hasValidVideo,
		THExerciseCardFallback.hasValidVideo,
	);
	assert.equal(
		globalThis.THExerciseCardFallback.renderFallbackCardHtml,
		THExerciseCardFallback.renderFallbackCardHtml,
	);
});
