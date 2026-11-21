/**
 * Balance, stability and mobility flow module (THBalanceMobility).
 * Client/Node compatible UMD/CommonJS namespace.
 */
((root) => {
	var BALANCE_EXERCISES = [
		{
			id: "single-leg-stand",
			he: "עמידה על רגל אחת מבוקרת",
			muscles: ["legs", "core"],
			level: "beginner",
			equipment: ["none"],
			sets: 3,
			duration_seconds: 30,
			rest_seconds: 30,
		},
		{
			id: "controlled-sit-to-stand",
			he: "קימה מבוקרת מישיבה לעמידה",
			muscles: ["legs"],
			level: "beginner",
			equipment: ["none"],
			sets: 3,
			reps: "8-10",
			rest_seconds: 45,
		},
		{
			id: "ankle-mobility",
			he: "מוביליטי קרסול וכף רגל",
			muscles: ["legs"],
			level: "beginner",
			equipment: ["none"],
			sets: 2,
			duration_seconds: 40,
			rest_seconds: 20,
		},
		{
			id: "shoulder-mobility-circles",
			he: "סיבובי כתפיים ומוביליטי עליון",
			muscles: ["shoulders", "upper"],
			level: "beginner",
			equipment: ["none"],
			sets: 2,
			duration_seconds: 45,
			rest_seconds: 30,
		},
	];

	function buildBalanceMobilityBlock(level, limitations) {
		var lvl = typeof level === "string" ? level : "beginner";
		var lims = Array.isArray(limitations)
			? limitations
			: limitations && typeof limitations === "object"
				? Object.keys(limitations)
				: [];

		var filtered = BALANCE_EXERCISES.filter((ex) => {
			if (
				lims.indexOf("knee") !== -1 &&
				(ex.id === "controlled-sit-to-stand" || ex.id === "single-leg-stand")
			) {
				return false;
			}
			return true;
		});

		if (filtered.length === 0) {
			filtered = BALANCE_EXERCISES;
		}

		var selected = filtered.slice(0, 3);
		return {
			title: "מקבץ יציבות, שיווי משקל ומוביליטי",
			level: lvl,
			limitations: lims,
			exercises: selected.map((e) => Object.assign({}, e)),
		};
	}

	var api = {
		buildBalanceMobilityBlock: buildBalanceMobilityBlock,
		BALANCE_EXERCISES: BALANCE_EXERCISES,
	};

	root.THBalanceMobility = api;
	if (typeof module === "object" && module.exports) {
		module.exports = api;
	}
})(
	typeof window !== "undefined"
		? window
		: typeof globalThis !== "undefined"
			? globalThis
			: this,
);
