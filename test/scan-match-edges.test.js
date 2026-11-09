const test = require("node:test");
const assert = require("node:assert/strict");

const THScan = require("../js/scan-match.js");

test("uniqueTags via THScan.withBodyweight: safely returns ['bodyweight'] for null, undefined, and empty inputs", () => {
	assert.deepStrictEqual(THScan.withBodyweight(null), ["bodyweight"]);
	assert.deepStrictEqual(THScan.withBodyweight(undefined), ["bodyweight"]);
	assert.deepStrictEqual(THScan.withBodyweight([]), ["bodyweight"]);
	assert.deepStrictEqual(THScan.withBodyweight(), ["bodyweight"]);
});

test("uniqueTags via THScan.withBodyweight: deduplicates repeated tags", () => {
	const result = THScan.withBodyweight(["mat", "bench", "mat", "bench"]);
	assert.deepStrictEqual(result, ["bodyweight", "mat", "bench"]);

	const multiDuplicates = THScan.withBodyweight([
		"dumbbell",
		"dumbbell",
		"kettlebell",
		"dumbbell",
		"kettlebell",
	]);
	assert.deepStrictEqual(multiDuplicates, [
		"bodyweight",
		"dumbbell",
		"kettlebell",
	]);
});

test("uniqueTags via THScan.withBodyweight: ignores tags not present in THScan.EQUIPMENT_TAGS", () => {
	assert.strictEqual(THScan.tagAllowed("bench"), true);
	assert.strictEqual(THScan.tagAllowed("bodyweight"), true);
	assert.strictEqual(THScan.tagAllowed("unknown_string"), false);
	assert.strictEqual(THScan.tagAllowed(123), false);
	assert.strictEqual(THScan.tagAllowed(null), false);
	assert.strictEqual(THScan.tagAllowed(undefined), false);

	const mixed = [
		"unknown_string",
		123,
		null,
		undefined,
		{},
		false,
		"mat",
		"chair",
		"invalid_equipment",
	];
	const result = THScan.withBodyweight(mixed);
	assert.deepStrictEqual(result, ["bodyweight", "mat", "chair"]);
});

test("uniqueTags via THScan.withBodyweight: ensures 'bodyweight' is not duplicated when included in the input", () => {
	const onlyBodyweight = THScan.withBodyweight(["bodyweight"]);
	assert.deepStrictEqual(onlyBodyweight, ["bodyweight"]);

	const repeatedBodyweight = THScan.withBodyweight([
		"bodyweight",
		"bench",
		"bodyweight",
		"mat",
		"bodyweight",
	]);
	assert.deepStrictEqual(repeatedBodyweight, ["bodyweight", "mat", "bench"]);
	assert.strictEqual(
		repeatedBodyweight.filter((tag) => tag === "bodyweight").length,
		1,
	);
});

test("uniqueTags via THScan.withBodyweight: preserves canonical ordering defined by THScan.EQUIPMENT_TAGS", () => {
	const reversedSubset = ["kitchen_floor", "dumbbell", "mat"];
	const resultSubset = THScan.withBodyweight(reversedSubset);
	assert.deepStrictEqual(resultSubset, [
		"bodyweight",
		"mat",
		"dumbbell",
		"kitchen_floor",
	]);

	const allReversed = [...THScan.EQUIPMENT_TAGS].reverse();
	const resultAll = THScan.withBodyweight(allReversed);
	assert.deepStrictEqual(resultAll, THScan.EQUIPMENT_TAGS);

	// Validate that all returned elements strictly follow the canonical index order
	for (let i = 0; i < resultAll.length - 1; i++) {
		const currentIndex = THScan.EQUIPMENT_TAGS.indexOf(resultAll[i]);
		const nextIndex = THScan.EQUIPMENT_TAGS.indexOf(resultAll[i + 1]);
		assert.ok(
			currentIndex < nextIndex,
			`Expected canonical order between ${resultAll[i]} and ${resultAll[i + 1]}`,
		);
	}
});

test("round2 behavior via THScan.buildScanResult: rounds confidence and defaults non-numeric or missing to 0", () => {
	const res1 = THScan.buildScanResult([], {
		detected_equipment: [{ tag: "bench", confidence: 0.8564 }],
	});
	assert.strictEqual(res1.detected_equipment[0].confidence, 0.86);

	const res2 = THScan.buildScanResult([], {
		detected_equipment: [{ tag: "bench", confidence: 0.123 }],
	});
	assert.strictEqual(res2.detected_equipment[0].confidence, 0.12);

	const resDefaults = THScan.buildScanResult([], {
		detected_equipment: [
			{ tag: "bench", confidence: "non-numeric" },
			{ tag: "mat" },
			{ tag: "chair", confidence: null },
			{ tag: "wall", confidence: Number.NaN },
		],
	});
	assert.strictEqual(resDefaults.detected_equipment[0].confidence, 0);
	assert.strictEqual(resDefaults.detected_equipment[1].confidence, 0);
	assert.strictEqual(resDefaults.detected_equipment[2].confidence, 0);
	assert.strictEqual(resDefaults.detected_equipment[3].confidence, 0);
});

test("round2 behavior via THScan.tagsFromCoco: rounds confidence to 2 decimal places and defaults non-finite or missing scores to 0.5", () => {
	const predictions = [
		{ class: "bench", score: 0.8564 },
		{ class: "chair", score: 0.123 },
		{ class: "couch", score: Number.NaN },
		{ class: "sports ball", score: Number.POSITIVE_INFINITY },
		{ class: "bottle" },
	];

	const results = THScan.tagsFromCoco(predictions, 100, 100);
	const byTag = Object.fromEntries(results.map((row) => [row.tag, row]));

	assert.strictEqual(byTag.bench.confidence, 0.86);
	assert.strictEqual(byTag.chair.confidence, 0.12);
	assert.strictEqual(byTag.sofa.confidence, 0.5);
	assert.strictEqual(byTag.small_ball.confidence, 0.5);
	assert.strictEqual(byTag.water_bottle.confidence, 0.5);

	const nonFiniteNegative = THScan.tagsFromCoco(
		[{ class: "bench", score: Number.NEGATIVE_INFINITY }],
		100,
		100,
	);
	assert.strictEqual(nonFiniteNegative[0].confidence, 0.5);

	const nonNumericScore = THScan.tagsFromCoco(
		[{ class: "bench", score: "not-a-number" }],
		100,
		100,
	);
	assert.strictEqual(nonNumericScore[0].confidence, 0.5);
});

test("clip01 behavior via THScan.buildScanResult: clamps negative numbers to 0, numbers > 1 to 1, and rounds intermediate values", () => {
	const result = THScan.buildScanResult([], {
		detected_equipment: [{ tag: "bench", bbox: [-0.25, 0.456, 1.35, 0] }],
	});
	assert.deepStrictEqual(result.detected_equipment[0].bbox, [0, 0.46, 1, 0]);

	const moreClamping = THScan.buildScanResult([], {
		detected_equipment: [{ tag: "bench", bbox: [-1.5, 0.1234, 0.9876, 2.5] }],
	});
	assert.deepStrictEqual(
		moreClamping.detected_equipment[0].bbox,
		[0, 0.12, 0.99, 1],
	);
});

test("clip01 behavior via THScan.buildScanResult: safely ignores malformed, non-array, or non-4-length bbox values", () => {
	const malformedInputs = [
		null,
		undefined,
		"invalid",
		123,
		{},
		[],
		[0.1, 0.2],
		[0.1, 0.2, 0.3],
		[0.1, 0.2, 0.3, 0.4, 0.5],
	];

	for (const malformed of malformedInputs) {
		const res = THScan.buildScanResult([], {
			detected_equipment: [{ tag: "bench", bbox: malformed }],
		});
		assert.strictEqual(
			res.detected_equipment[0].bbox,
			undefined,
			`Expected undefined bbox for input: ${JSON.stringify(malformed)}`,
		);
	}
});

test("clip01 behavior via THScan.tagsFromCoco: clamps negative origins, clamps out-of-bounds dimensions, and rounds intermediate coordinates", () => {
	// Negative origins clamp to 0
	const negativeOrigin = THScan.tagsFromCoco(
		[{ class: "bench", score: 0.9, bbox: [-20, -10, 50, 60] }],
		100,
		100,
	);
	// x = -0.2 -> 0, y = -0.1 -> 0, x + w = 0.3 -> 0.3, y + h = 0.5 -> 0.5
	assert.deepStrictEqual(negativeOrigin[0].bbox, [0, 0, 0.3, 0.5]);

	// Exceeding image dimensions clamp to 1
	const outOfBounds = THScan.tagsFromCoco(
		[{ class: "chair", score: 0.9, box: [150, 70, 80, 50] }],
		200,
		100,
	);
	// x = 150/200 = 0.75, y = 70/100 = 0.7, x + w = 230/200 = 1.15 -> 1, y + h = 120/100 = 1.2 -> 1
	assert.deepStrictEqual(outOfBounds[0].bbox, [0.75, 0.7, 1, 1]);

	// Intermediate fractional coordinates round to 2 decimal places
	const fractional = THScan.tagsFromCoco(
		[{ class: "couch", score: 0.9, bbox: [123, 456, 234, 345] }],
		1000,
		1000,
	);
	// x = 0.123 -> 0.12, y = 0.456 -> 0.46, x + w = 0.357 -> 0.36, y + h = 0.801 -> 0.8
	assert.deepStrictEqual(fractional[0].bbox, [0.12, 0.46, 0.36, 0.8]);

	// Graceful handling of missing box or missing/zero dimensions
	const noBox = THScan.tagsFromCoco([{ class: "bench", score: 0.9 }], 100, 100);
	assert.strictEqual(noBox[0].bbox, undefined);

	const zeroDimensions = THScan.tagsFromCoco(
		[{ class: "bench", score: 0.9, bbox: [10, 10, 20, 20] }],
		0,
		0,
	);
	assert.strictEqual(zeroDimensions[0].bbox, undefined);
});
