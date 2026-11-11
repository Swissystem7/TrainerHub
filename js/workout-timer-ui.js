((root) => {
	const DEFAULT_COLORS = Object.freeze({
		warning: "#f97316",
		work: "#22c55e",
		rest: "#3b82f6",
	});

	function formatTime(seconds) {
		const m = Math.floor(seconds / 60);
		const sec = Math.floor(seconds % 60);
		return `${m}:${sec < 10 ? `0${sec}` : sec}`;
	}

	function computeTimerRingProps(remainingSec, totalSec, phase, options) {
		const r =
			typeof options?.radius === "number" && options.radius > 0
				? options.radius
				: 80;

		let normRemaining =
			typeof remainingSec === "number" && Number.isFinite(remainingSec)
				? remainingSec
				: 0;
		if (normRemaining < 0) {
			normRemaining = 0;
		}

		let normTotal =
			typeof totalSec === "number" && Number.isFinite(totalSec) ? totalSec : 0;
		if (normTotal <= 0) {
			normTotal = 0;
		}

		if (normTotal > 0 && normRemaining > normTotal) {
			normRemaining = normTotal;
		}

		const normPhase =
			typeof phase === "string" && phase.trim().length > 0
				? phase.trim().toLowerCase()
				: "work";

		const circ = 2 * Math.PI * r;
		const fraction =
			normTotal > 0 ? Math.min(1, Math.max(0, normRemaining / normTotal)) : 0;
		const percent = Math.round(fraction * 100);
		const strokeDasharray = circ;
		const strokeDashoffset = circ * (1 - fraction);

		const customColors = options?.colors || {};
		const warningColor = customColors.warning || DEFAULT_COLORS.warning;
		const workColor = customColors.work || DEFAULT_COLORS.work;
		const restColor = customColors.rest || DEFAULT_COLORS.rest;

		const isWarning = normTotal > 0 && normRemaining <= 10;
		const isRestPhase = normPhase === "rest" || normPhase === "break";

		let color;
		if (isWarning) {
			color = warningColor;
		} else if (isRestPhase) {
			color = restColor;
		} else {
			color = workColor;
		}

		const formattedTime =
			normTotal >= 60 ? formatTime(normRemaining) : String(normRemaining);

		return {
			remainingSec: normRemaining,
			totalSec: normTotal,
			phase: normPhase,
			progress: fraction,
			percent: percent,
			radius: r,
			circumference: circ,
			strokeDasharray: strokeDasharray,
			strokeDashoffset: strokeDashoffset,
			color: color,
			isWarning: isWarning,
			formattedTime: formattedTime,
		};
	}

	const api = {
		computeTimerRingProps: computeTimerRingProps,
		DEFAULT_COLORS: DEFAULT_COLORS,
	};

	if (root) {
		root.THWorkoutTimerUI = api;
	}
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
