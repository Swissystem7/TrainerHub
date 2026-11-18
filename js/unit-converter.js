/**
 * Weight unit converter & persistence module.
 * Namespace: window.THUnitConverter or CommonJS/UMD.
 */
((root) => {
	var STORAGE_KEY = "trainerhub_weight_unit";

	function convertWeight(value, fromUnit, toUnit) {
		var n = Number(value);
		if (!Number.isFinite(n) || n < 0) return 0;
		if (fromUnit === toUnit) return n;
		var kg = fromUnit === "lbs" ? n / 2.20462262185 : n;
		var res = toUnit === "lbs" ? kg * 2.20462262185 : kg;
		if (toUnit === "lbs") {
			return Math.round(res / 2.5) * 2.5;
		}
		return Math.round(res * 2) / 2;
	}

	function formatWeightLabel(kgValue, unit) {
		var u = unit || "kg";
		var val = convertWeight(kgValue, "kg", u);
		return u === "lbs" ? `${val} ליברות` : `${val} ק"ג`;
	}

	function saveWeightUnitPreference(unit, storage) {
		var store = storage || (typeof localStorage !== "undefined" ? localStorage : null);
		if (!store) return false;
		try {
			store.setItem(STORAGE_KEY, unit);
			return true;
		} catch (_e) {
			return false;
		}
	}

	function loadWeightUnitPreference(storage) {
		var store = storage || (typeof localStorage !== "undefined" ? localStorage : null);
		if (!store) return "kg";
		try {
			return store.getItem(STORAGE_KEY) || "kg";
		} catch (_e) {
			return "kg";
		}
	}

	var api = {
		convertWeight: convertWeight,
		formatWeightLabel: formatWeightLabel,
		saveWeightUnitPreference: saveWeightUnitPreference,
		loadWeightUnitPreference: loadWeightUnitPreference,
	};

	root.THUnitConverter = api;
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
