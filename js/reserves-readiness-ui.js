((root) => {
	const READINESS_TIERS = Object.freeze({
		peak: Object.freeze({
			tier: "peak",
			label_he: "מוכנות שיא",
			color: "#16a34a",
			minPercent: 80,
		}),
		onTrack: Object.freeze({
			tier: "on-track",
			label_he: "במסלול",
			color: "#2563eb",
			minPercent: 50,
		}),
		reinforce: Object.freeze({
			tier: "reinforce",
			label_he: "דרוש חיזוק",
			color: "#ea580c",
			minPercent: 0,
		}),
	});

	const STATUS_LABELS = Object.freeze({
		done: "הושלם",
		next: "האימון הבא",
		skipped: "דולג",
		pending: "ממתין",
	});

	const STATUS_STYLES = Object.freeze({
		done: "background:#dcfce7;color:#15803d;border:1px solid #86efac;",
		next: "background:#dbeafe;color:#1d4ed8;border:2px solid #2563eb;font-weight:700;",
		skipped: "background:#fef3c7;color:#b45309;border:1px solid #fde68a;",
		pending: "background:#f8fafc;color:#64748b;border:1px dashed #cbd5e1;",
	});

	const SLOT_LETTERS = Object.freeze(["a", "b", "c", "d", "e", "f", "g", "h"]);
	const HEBREW_SLOT_LETTERS = Object.freeze([
		"א׳",
		"ב׳",
		"ג׳",
		"ד׳",
		"ה׳",
		"ו׳",
		"ז׳",
		"ח׳",
	]);

	function escapeHtml(str) {
		if (str == null) return "";
		return String(str)
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;")
			.replace(/'/g, "&#39;");
	}

	function computeReadinessScore(completedCount, totalSessions = 12) {
		const normTotal =
			typeof totalSessions === "number" &&
			Number.isFinite(totalSessions) &&
			totalSessions > 0
				? Math.floor(totalSessions)
				: 12;

		let normCompleted =
			typeof completedCount === "number" &&
			Number.isFinite(completedCount) &&
			completedCount >= 0
				? Math.floor(completedCount)
				: 0;

		if (normCompleted > normTotal) {
			normCompleted = normTotal;
		}

		const percentage = Math.round((normCompleted / normTotal) * 100);

		let tierInfo = READINESS_TIERS.reinforce;
		if (percentage >= 80) {
			tierInfo = READINESS_TIERS.peak;
		} else if (percentage >= 50) {
			tierInfo = READINESS_TIERS.onTrack;
		}

		return {
			completedCount: normCompleted,
			totalSessions: normTotal,
			percentage: percentage,
			tier: tierInfo.tier,
			tierLabel_he: tierInfo.label_he,
			color: tierInfo.color,
		};
	}

	function buildReadinessGrid(sessionStatuses = {}, options = {}) {
		const normStatuses =
			sessionStatuses && typeof sessionStatuses === "object"
				? sessionStatuses
				: {};

		const totalWeeks =
			typeof options?.totalWeeks === "number" &&
			Number.isFinite(options.totalWeeks) &&
			options.totalWeeks > 0
				? Math.floor(options.totalWeeks)
				: 6;

		const sessionsPerWeek =
			typeof options?.sessionsPerWeek === "number" &&
			Number.isFinite(options.sessionsPerWeek) &&
			options.sessionsPerWeek > 0
				? Math.floor(options.sessionsPerWeek)
				: 2;

		const totalSessions = totalWeeks * sessionsPerWeek;

		// Check if any slot has an explicit status of 'next'
		let hasExplicitNext = false;
		for (const key of Object.keys(normStatuses)) {
			const val = normStatuses[key];
			const s = (typeof val === "string" ? val : val?.status || "")
				.trim()
				.toLowerCase();
			if (s === "next") {
				hasExplicitNext = true;
				break;
			}
		}

		let assignedNext = false;
		let nextSessionId = null;
		let doneCount = 0;
		let skippedCount = 0;

		const weeks = [];

		for (let w = 1; w <= totalWeeks; w++) {
			const sessions = [];
			for (let slot = 0; slot < sessionsPerWeek; slot++) {
				const slotLetter = SLOT_LETTERS[slot] || String.fromCharCode(97 + slot);
				const slotHebrew = HEBREW_SLOT_LETTERS[slot] || String(slot + 1);
				const sessionId = `w${w}${slotLetter}`;

				const rawVal = normStatuses[sessionId];
				const rawStatus = (
					typeof rawVal === "string" ? rawVal : rawVal?.status || ""
				)
					.trim()
					.toLowerCase();

				let finalStatus;
				if (rawStatus === "done") {
					finalStatus = "done";
					doneCount++;
				} else if (rawStatus === "skipped") {
					finalStatus = "skipped";
					skippedCount++;
				} else if (hasExplicitNext) {
					if (rawStatus === "next") {
						finalStatus = "next";
						nextSessionId = sessionId;
					} else {
						finalStatus = "pending";
					}
				} else {
					// Incomplete slot without explicit 'next' set anywhere
					if (!assignedNext) {
						finalStatus = "next";
						nextSessionId = sessionId;
						assignedNext = true;
					} else {
						finalStatus = "pending";
					}
				}

				const label_he = `שבוע ${w} אימון ${slotHebrew}`;
				const statusLabel_he =
					STATUS_LABELS[finalStatus] || STATUS_LABELS.pending;

				sessions.push({
					id: sessionId,
					week: w,
					slot: slot,
					slotLetter: slotLetter,
					status: finalStatus,
					label_he: label_he,
					statusLabel_he: statusLabel_he,
				});
			}

			weeks.push({
				weekNumber: w,
				label_he: `שבוע ${w}`,
				sessions: sessions,
			});
		}

		const score = computeReadinessScore(doneCount, totalSessions);

		return {
			totalWeeks: totalWeeks,
			sessionsPerWeek: sessionsPerWeek,
			totalSessions: totalSessions,
			doneCount: doneCount,
			skippedCount: skippedCount,
			nextSessionId: nextSessionId,
			score: score,
			weeks: weeks,
		};
	}

	function renderReadinessHeatmapHtml(gridData, options = {}) {
		let grid = gridData;
		if (!grid || !Array.isArray(grid.weeks)) {
			grid = buildReadinessGrid(gridData, options);
		}

		const regionLabel = options?.ariaLabel || "מד מוכנות למסלול 6 שבועות";
		const score =
			grid.score || computeReadinessScore(grid.doneCount, grid.totalSessions);
		const badgeColor = score.color;
		const tierLabel = score.tierLabel_he;
		const percentage = score.percentage;

		let badgeBg = "#ffedd5";
		let badgeText = "#c2410c";
		if (score.tier === "peak") {
			badgeBg = "#dcfce7";
			badgeText = "#15803d";
		} else if (score.tier === "on-track") {
			badgeBg = "#dbeafe";
			badgeText = "#1d4ed8";
		}

		// Table headers
		let thCols = `<th scope="col" role="columnheader" style="padding:0.5rem;text-align:right;font-weight:600;color:#475569;border-bottom:2px solid #e2e8f0;">שבוע</th>`;
		for (let s = 0; s < grid.sessionsPerWeek; s++) {
			const slotHebrew = HEBREW_SLOT_LETTERS[s] || String(s + 1);
			thCols += `<th scope="col" role="columnheader" style="padding:0.5rem;text-align:center;font-weight:600;color:#475569;border-bottom:2px solid #e2e8f0;">אימון ${escapeHtml(slotHebrew)}</th>`;
		}

		// Table rows
		let trRows = "";
		for (const week of grid.weeks) {
			let cellsHtml = `<th scope="row" role="rowheader" style="padding:0.5rem;font-weight:600;color:#334155;border-bottom:1px solid #f1f5f9;white-space:nowrap;">${escapeHtml(week.label_he)}</th>`;

			for (const session of week.sessions) {
				const style = STATUS_STYLES[session.status] || STATUS_STYLES.pending;
				const fullLabel = `${session.label_he} - ${session.statusLabel_he}`;

				cellsHtml += `
				<td role="gridcell" tabindex="0" class="th-heatmap-cell th-status-${escapeHtml(session.status)}" data-session-id="${escapeHtml(session.id)}" data-status="${escapeHtml(session.status)}" aria-label="${escapeHtml(fullLabel)}" style="padding:0.375rem;text-align:center;border-bottom:1px solid #f1f5f9;">
					<button type="button" role="button" tabindex="0" class="th-cell-btn" data-session-id="${escapeHtml(session.id)}" data-status="${escapeHtml(session.status)}" aria-label="${escapeHtml(fullLabel)}" style="display:flex;flex-direction:column;align-items:center;justify-content:center;width:100%;min-width:70px;padding:0.5rem 0.25rem;border-radius:8px;cursor:pointer;font-family:inherit;font-size:0.8125rem;line-height:1.2;transition:transform 0.15s ease,box-shadow 0.15s ease;${style}">
						<span class="th-cell-slot" style="font-size:0.75rem;opacity:0.85;">אימון ${escapeHtml(HEBREW_SLOT_LETTERS[session.slot] || session.slotLetter.toUpperCase())}</span>
						<span class="th-cell-status" style="font-size:0.8125rem;font-weight:600;margin-top:2px;">${escapeHtml(session.statusLabel_he)}</span>
					</button>
				</td>`;
			}

			trRows += `<tr role="row">${cellsHtml}</tr>`;
		}

		return `
<div class="th-reserves-heatmap" role="region" aria-label="${escapeHtml(regionLabel)}" dir="rtl" style="font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;direction:rtl;border:1px solid #e2e8f0;border-radius:12px;padding:1.25rem;background:#ffffff;color:#1e293b;max-width:100%;box-sizing:border-box;">
	<header class="th-heatmap-header" style="display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:0.75rem;margin-bottom:1.25rem;padding-bottom:0.75rem;border-bottom:1px solid #f1f5f9;">
		<div style="display:flex;flex-direction:column;gap:0.25rem;">
			<h3 style="margin:0;font-size:1.125rem;font-weight:700;color:#0f172a;">${escapeHtml(regionLabel)}</h3>
			<span style="font-size:0.875rem;color:#64748b;">${grid.doneCount} מתוך ${grid.totalSessions} אימונים הושלמו</span>
		</div>
		<div style="display:flex;align-items:center;gap:0.75rem;">
			<span class="th-readiness-percent" style="font-size:1.75rem;font-weight:800;color:${escapeHtml(badgeColor)};">${percentage}%</span>
			<span class="th-readiness-badge" style="display:inline-block;padding:0.25rem 0.625rem;font-size:0.8125rem;font-weight:600;border-radius:9999px;background:${badgeBg};color:${badgeText};border:1px solid ${escapeHtml(badgeColor)};">${escapeHtml(tierLabel)}</span>
		</div>
	</header>
	<div class="th-heatmap-table-container" style="overflow-x:auto;">
		<table role="table" class="th-heatmap-table" aria-label="מעקב שבועי" style="width:100%;border-collapse:collapse;font-size:0.875rem;">
			<thead>
				<tr role="row">${thCols}</tr>
			</thead>
			<tbody>
				${trRows}
			</tbody>
		</table>
	</div>
	<footer class="th-heatmap-legend" style="display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:1rem;margin-top:1rem;padding-top:0.75rem;border-top:1px solid #f1f5f9;font-size:0.75rem;color:#64748b;">
		<span style="display:inline-flex;align-items:center;gap:0.375rem;"><span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:#dcfce7;border:1px solid #86efac;"></span>הושלם</span>
		<span style="display:inline-flex;align-items:center;gap:0.375rem;"><span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:#dbeafe;border:2px solid #2563eb;"></span>האימון הבא</span>
		<span style="display:inline-flex;align-items:center;gap:0.375rem;"><span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:#fef3c7;border:1px solid #fde68a;"></span>דולג</span>
		<span style="display:inline-flex;align-items:center;gap:0.375rem;"><span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:#f8fafc;border:1px dashed #cbd5e1;"></span>ממתין</span>
	</footer>
</div>`.trim();
	}

	function renderReadinessHeatmap(container, gridData, options) {
		const html = renderReadinessHeatmapHtml(gridData, options);
		if (!container) {
			return html;
		}
		let target = container;
		if (typeof container === "string" && typeof document !== "undefined") {
			target = document.querySelector(container);
		}
		if (target && typeof target === "object") {
			if (typeof target.replaceChildren === "function") {
				target.replaceChildren();
			}
			if (typeof target.insertAdjacentHTML === "function") {
				target.insertAdjacentHTML("afterbegin", html);
				return target;
			}
		}
		return html;
	}

	const api = {
		READINESS_TIERS: READINESS_TIERS,
		STATUS_LABELS: STATUS_LABELS,
		computeReadinessScore: computeReadinessScore,
		buildReadinessGrid: buildReadinessGrid,
		renderReadinessHeatmapHtml: renderReadinessHeatmapHtml,
		renderReadinessHeatmap: renderReadinessHeatmap,
	};

	if (root) {
		root.THReservesReadinessUI = api;
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
