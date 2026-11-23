((root) => {
	const MUSCLE_SVGS = Object.freeze({
		chest: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" aria-hidden="true" focusable="false" class="th-muscle-svg th-muscle-chest"><circle cx="50" cy="18" r="10" fill="#cbd5e1"/><path d="M30 32 L70 32 L66 75 L34 75 Z" fill="#e2e8f0" stroke="#94a3b8" stroke-width="2"/><path d="M30 32 L18 55 L24 57 L33 42" fill="#cbd5e1"/><path d="M70 32 L82 55 L76 57 L67 42" fill="#cbd5e1"/><path d="M35 36 C42 36 48 39 49 48 C43 49 36 47 34 43 Z" fill="#2563eb" stroke="#1d4ed8" stroke-width="1.5"/><path d="M65 36 C58 36 52 39 51 48 C57 49 64 47 66 43 Z" fill="#2563eb" stroke="#1d4ed8" stroke-width="1.5"/></svg>`,
		back: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" aria-hidden="true" focusable="false" class="th-muscle-svg th-muscle-back"><circle cx="50" cy="18" r="10" fill="#cbd5e1"/><path d="M30 32 L70 32 L65 75 L35 75 Z" fill="#e2e8f0" stroke="#94a3b8" stroke-width="2"/><path d="M30 32 L20 55 L26 57 L34 42" fill="#cbd5e1"/><path d="M70 32 L80 55 L74 57 L66 42" fill="#cbd5e1"/><path d="M50 28 L40 38 L42 56 L50 62 L58 56 L60 38 Z" fill="#2563eb" stroke="#1d4ed8" stroke-width="1.5"/><path d="M35 42 L42 42 L40 58 L36 52 Z" fill="#3b82f6"/><path d="M65 42 L58 42 L60 58 L64 52 Z" fill="#3b82f6"/></svg>`,
		legs: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" aria-hidden="true" focusable="false" class="th-muscle-svg th-muscle-legs"><path d="M36 20 L64 20 L60 32 L40 32 Z" fill="#cbd5e1"/><path d="M38 34 L48 34 L46 62 L35 62 Z" fill="#2563eb" stroke="#1d4ed8" stroke-width="1.5"/><path d="M62 34 L52 34 L54 62 L65 62 Z" fill="#2563eb" stroke="#1d4ed8" stroke-width="1.5"/><path d="M36 66 L45 66 L43 92 L35 92 Z" fill="#3b82f6" stroke="#1d4ed8" stroke-width="1.5"/><path d="M64 66 L55 66 L57 92 L65 92 Z" fill="#3b82f6" stroke="#1d4ed8" stroke-width="1.5"/></svg>`,
		core: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" aria-hidden="true" focusable="false" class="th-muscle-svg th-muscle-core"><circle cx="50" cy="18" r="10" fill="#cbd5e1"/><path d="M30 32 L70 32 L66 78 L34 78 Z" fill="#e2e8f0" stroke="#94a3b8" stroke-width="2"/><path d="M34 35 L66 35 L64 46 L36 46 Z" fill="#cbd5e1"/><rect x="42" y="50" width="7" height="6" rx="1" fill="#2563eb"/><rect x="51" y="50" width="7" height="6" rx="1" fill="#2563eb"/><rect x="42" y="58" width="7" height="6" rx="1" fill="#2563eb"/><rect x="51" y="58" width="7" height="6" rx="1" fill="#2563eb"/><rect x="42" y="66" width="7" height="6" rx="1" fill="#2563eb"/><rect x="51" y="66" width="7" height="6" rx="1" fill="#2563eb"/><path d="M36 50 L40 50 L39 70 L36 68 Z" fill="#3b82f6"/><path d="M64 50 L60 50 L61 70 L64 68 Z" fill="#3b82f6"/></svg>`,
		shoulders: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" aria-hidden="true" focusable="false" class="th-muscle-svg th-muscle-shoulders"><circle cx="50" cy="18" r="10" fill="#cbd5e1"/><path d="M36 34 L64 34 L62 70 L38 70 Z" fill="#e2e8f0" stroke="#94a3b8" stroke-width="2"/><path d="M32 44 L20 62 L26 64 L34 50" fill="#cbd5e1"/><path d="M68 44 L80 62 L74 64 L66 50" fill="#cbd5e1"/><path d="M26 33 C32 32 36 34 36 44 C34 46 26 46 24 40 Z" fill="#2563eb" stroke="#1d4ed8" stroke-width="1.5"/><path d="M74 33 C68 32 64 34 64 44 C66 46 74 46 76 40 Z" fill="#2563eb" stroke="#1d4ed8" stroke-width="1.5"/></svg>`,
		arms: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" aria-hidden="true" focusable="false" class="th-muscle-svg th-muscle-arms"><circle cx="50" cy="18" r="10" fill="#cbd5e1"/><path d="M38 32 L62 32 L59 72 L41 72 Z" fill="#e2e8f0" stroke="#94a3b8" stroke-width="2"/><path d="M36 32 L22 48 L27 52 L38 40 Z" fill="#2563eb" stroke="#1d4ed8" stroke-width="1.5"/><path d="M22 48 L15 70 L22 72 L28 53 Z" fill="#3b82f6" stroke="#1d4ed8" stroke-width="1.5"/><path d="M64 32 L78 48 L73 52 L62 40 Z" fill="#2563eb" stroke="#1d4ed8" stroke-width="1.5"/><path d="M78 48 L85 70 L78 72 L72 53 Z" fill="#3b82f6" stroke="#1d4ed8" stroke-width="1.5"/></svg>`,
		full_body: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" aria-hidden="true" focusable="false" class="th-muscle-svg th-muscle-full-body"><circle cx="50" cy="14" r="8" fill="#2563eb"/><path d="M38 25 L62 25 L58 55 L42 55 Z" fill="#2563eb" stroke="#1d4ed8" stroke-width="1.5"/><path d="M36 26 L22 46 L27 48 L38 34 Z" fill="#3b82f6"/><path d="M64 26 L78 46 L73 48 L62 34 Z" fill="#3b82f6"/><path d="M42 56 L40 90 L46 90 L49 56 Z" fill="#2563eb"/><path d="M58 56 L60 90 L54 90 L51 56 Z" fill="#2563eb"/></svg>`,
		general: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" aria-hidden="true" focusable="false" class="th-muscle-svg th-muscle-full-body"><circle cx="50" cy="14" r="8" fill="#2563eb"/><path d="M38 25 L62 25 L58 55 L42 55 Z" fill="#2563eb" stroke="#1d4ed8" stroke-width="1.5"/><path d="M36 26 L22 46 L27 48 L38 34 Z" fill="#3b82f6"/><path d="M64 26 L78 46 L73 48 L62 34 Z" fill="#3b82f6"/><path d="M42 56 L40 90 L46 90 L49 56 Z" fill="#2563eb"/><path d="M58 56 L60 90 L54 90 L51 56 Z" fill="#2563eb"/></svg>`,
	});

	const TEMPO_DEFAULTS = Object.freeze({
		standard: "2-0-2: 2 שניות כיווץ, 2 שניות חזרה",
		isometric: "החזקה סטטית יציבה",
		explosive: "כוח מתפרץ, ירידה מבוקרת",
	});

	const MUSCLE_LABELS_HE = Object.freeze({
		chest: "חזה",
		back: "גב",
		legs: "רגליים",
		core: "בטן וליבה",
		shoulders: "כתפיים",
		arms: "זרועות",
		full_body: "כל הגוף",
		general: "כללי / כל הגוף",
	});

	const MUSCLE_MAP = Object.freeze({
		chest: "chest",
		חזה: "chest",
		pecs: "chest",
		pectoral: "chest",
		pectorals: "chest",
		back: "back",
		גב: "back",
		lats: "back",
		traps: "back",
		legs: "legs",
		רגליים: "legs",
		quads: "legs",
		hamstrings: "legs",
		calves: "legs",
		glutes: "legs",
		core: "core",
		בטן: "core",
		ליבה: "core",
		abs: "core",
		abdominals: "core",
		shoulders: "shoulders",
		כתפיים: "shoulders",
		delts: "shoulders",
		deltoids: "shoulders",
		arms: "arms",
		ידיים: "arms",
		זרועות: "arms",
		biceps: "arms",
		triceps: "arms",
		full_body: "full_body",
		"full-body": "full_body",
		fullbody: "full_body",
		general: "general",
		כללי: "general",
		"גוף מלא": "full_body",
		"כל הגוף": "full_body",
	});

	const DEFAULT_INSTRUCTIONS_BY_MUSCLE = Object.freeze({
		chest: Object.freeze([
			"התמקמות יציבה עם שכמות מכווצות לאחור ולמטה להגנת הכתפיים",
			"שמירה על מרפקים בזווית מבוקרת (כ-45 מעלות ביחס לגו)",
			"ביצוע תנועה מבוקרת ומלאה עם שאיפה בירידה ונשיפה בדחיפה",
		]),
		back: Object.freeze([
			"שמירה על גב ישר, בית חזה פתוח ומבט ניטרלי קדימה",
			"משיכה ממוקדת באמצעות השכמות ושרירי הגב ללא תנופת גוף",
			"שליטה מלאה בשלב החזרה והארכה מבוקרת של שרירי הגב",
		]),
		legs: Object.freeze([
			"עמידה יציבה בפיסוק מתאים עם חלוקת משקל שווה על כפות הרגליים",
			"שמירה על ברכיים נעות בקו הבוהן השנייה ללא קריסה פנימה",
			"ירידה מבוקרת תוך שמירה על עמוד שדרה ניטרלי ודחיפה דרך העקבים",
		]),
		core: Object.freeze([
			"איסוף וכיווץ שרירי הבטן העמוקים ונעילת רצפת האגן",
			"שמירה על מנח ניטרלי של האגן ללא שקיעת הגב התחתון",
			"נשימה רציפה ומבוקרת לכל אורך משך התרגיל",
		]),
		shoulders: Object.freeze([
			"עמידה או ישיבה זקופה ללא הקשתת יתר של הגב התחתון",
			"תנועה מבוקרת במישור הטבעי של מפרק הכתף",
			"הורדה מתונה ובלימה בשליטה שרירית מלאה ללא שמיטת המשקל",
		]),
		arms: Object.freeze([
			"קיבוע המרפקים לצדי הגוף למניעת תנועות פיצוי והנפה",
			"כיווץ מירבי וממוקד בקצה טווח התנועה",
			"חזרה איטית ומבוקרת למנח המוצא תוך מתח שרירי רציף",
		]),
		full_body: Object.freeze([
			"הקפדה על יציבה נכונה, בסיס תמיכה יציב ואיסוף שרירי הליבה",
			"ביצוע התנועה בטווח מבוקר ודיוק טכני מירבי",
			"שמירה על נשימה סדירה וקצב עבודה אחיד",
		]),
	});

	function escapeHtml(str) {
		if (str == null) return "";
		return String(str)
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;")
			.replace(/'/g, "&#39;");
	}

	function hasValidVideo(exercise) {
		if (!exercise || typeof exercise !== "object") {
			return false;
		}
		const candidates = [
			exercise.videoUrl,
			exercise.video_url,
			exercise.youtubeId,
		];
		for (let i = 0; i < candidates.length; i++) {
			const candidate = candidates[i];
			if (typeof candidate === "string" && candidate.trim().length > 0) {
				return true;
			}
		}
		return false;
	}

	function normalizeMuscle(muscleGroup) {
		if (typeof muscleGroup !== "string") {
			return "full_body";
		}
		const norm = muscleGroup.trim().toLowerCase();
		return MUSCLE_MAP[norm] || (MUSCLE_SVGS[norm] ? norm : "full_body");
	}

	function getMuscleSvg(muscleGroup) {
		const key = normalizeMuscle(muscleGroup);
		return MUSCLE_SVGS[key] || MUSCLE_SVGS.full_body;
	}

	function getRecommendedTempo(exercise) {
		if (!exercise || typeof exercise !== "object") {
			return TEMPO_DEFAULTS.standard;
		}

		if (typeof exercise.tempo === "string" && exercise.tempo.trim().length > 0) {
			const tempoTrim = exercise.tempo.trim();
			const tempoLower = tempoTrim.toLowerCase();
			if (TEMPO_DEFAULTS[tempoLower]) {
				return TEMPO_DEFAULTS[tempoLower];
			}
			return tempoTrim;
		}

		if (
			typeof exercise.tempo_type === "string" &&
			exercise.tempo_type.trim().length > 0
		) {
			const key = exercise.tempo_type.trim().toLowerCase();
			if (TEMPO_DEFAULTS[key]) {
				return TEMPO_DEFAULTS[key];
			}
		}

		const combinedText = [
			exercise.name,
			exercise.title,
			exercise.category,
			exercise.type,
			exercise.notes,
		]
			.filter((t) => typeof t === "string")
			.join(" ")
			.toLowerCase();

		if (
			/פלאנק|סטטי|החזקה|איזומטרי|plank|isometric|static\s*hold|hold/i.test(
				combinedText,
			)
		) {
			return TEMPO_DEFAULTS.isometric;
		}

		if (
			/מתפרץ|קפיצה|ספרינט|כוח\s*מתפרץ|explosive|plyo|jump|sprint|burst/i.test(
				combinedText,
			)
		) {
			return TEMPO_DEFAULTS.explosive;
		}

		return TEMPO_DEFAULTS.standard;
	}

	function formatInstructions(exercise) {
		let rawList = [];

		if (exercise && typeof exercise === "object") {
			const source =
				exercise.instructions ||
				exercise.cues ||
				exercise.formGuidance ||
				exercise.form_guidance ||
				exercise.steps;

			if (Array.isArray(source)) {
				rawList = source
					.filter((item) => typeof item === "string" && item.trim().length > 0)
					.map((item) => item.trim());
			} else if (typeof source === "string" && source.trim().length > 0) {
				rawList = source
					.split(/\r?\n|;/)
					.map((line) => line.trim())
					.filter((line) => line.length > 0);
			}
		}

		if (rawList.length === 0) {
			const muscleKey = normalizeMuscle(
				exercise?.muscle ||
					exercise?.target_muscle ||
					exercise?.muscleGroup ||
					exercise?.muscle_group,
			);
			const defaults =
				DEFAULT_INSTRUCTIONS_BY_MUSCLE[muscleKey] ||
				DEFAULT_INSTRUCTIONS_BY_MUSCLE.full_body;
			rawList = Array.from(defaults);
		}

		return rawList.map((item, idx) => {
			const clean = item.replace(/^(\d+[\.\)]|\*|-|•)\s*/, "").trim();
			return `${idx + 1}. ${clean}`;
		});
	}

	function renderFallbackCardHtml(exercise, options) {
		const ex = exercise && typeof exercise === "object" ? exercise : {};
		const opts = options && typeof options === "object" ? options : {};

		const isOutdoor = Boolean(opts.outdoorMode || opts.highContrast);

		const name = typeof ex.name === "string" && ex.name.trim().length > 0
			? ex.name.trim()
			: typeof ex.title === "string" && ex.title.trim().length > 0
				? ex.title.trim()
				: "תרגיל ללא סרטון";

		const muscleRaw =
			ex.muscle || ex.target_muscle || ex.muscleGroup || ex.muscle_group || "";
		const muscleKey = normalizeMuscle(muscleRaw);
		const muscleLabelHe =
			MUSCLE_LABELS_HE[muscleKey] || MUSCLE_LABELS_HE.full_body;
		const muscleSvg = getMuscleSvg(muscleKey);

		const tempo = getRecommendedTempo(ex);
		const instructions = formatInstructions(ex);

		const containerClasses = [
			"th-exercise-fallback-card",
			isOutdoor ? "th-outdoor-mode" : "",
		]
			.filter(Boolean)
			.join(" ");

		const outdoorAttr = isOutdoor ? ' data-outdoor="true"' : "";

		const outdoorInlineStyles = isOutdoor
			? "style=\"--th-card-bg:#000000;--th-card-fg:#ffffff;--th-card-border:#ffff00;--th-badge-bg:#ffff00;--th-badge-fg:#000000;background-color:#000000;color:#ffffff;border:3px solid #ffff00;border-radius:12px;padding:20px;font-weight:600;box-shadow:0 0 0 2px #000000;\""
			: "style=\"--th-card-bg:#ffffff;--th-card-fg:#1e293b;--th-card-border:#e2e8f0;--th-badge-bg:#eff6ff;--th-badge-fg:#1d4ed8;background-color:#ffffff;color:#1e293b;border:1px solid #e2e8f0;border-radius:12px;padding:16px;box-shadow:0 1px 3px rgba(0,0,0,0.05);\"";

		const badgeStyles = isOutdoor
			? "style=\"background-color:#ffff00;color:#000000;border:2px solid #000000;padding:6px 12px;font-weight:700;display:inline-block;border-radius:6px;\""
			: "style=\"background-color:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;padding:4px 10px;font-weight:600;display:inline-block;border-radius:6px;\"";

		const listItemsHtml = instructions
			.map(
				(step) =>
					`<li class="fallback-instruction-step" style="margin-bottom:8px;line-height:1.5;">${escapeHtml(step)}</li>`,
			)
			.join("\n");

		const equipmentHtml =
			typeof ex.equipment === "string" && ex.equipment.trim().length > 0
				? `<div class="fallback-equipment" style="margin-top:10px;font-size:0.9em;opacity:0.9;"><strong>ציוד נדרש:</strong> ${escapeHtml(ex.equipment.trim())}</div>`
				: "";

		return `<article class="${containerClasses}"${outdoorAttr} ${outdoorInlineStyles} role="region" aria-label="כרטיס תרגיל חלופי: ${escapeHtml(name)}">
  <header class="fallback-card-header" style="margin-bottom:14px;border-bottom:1px solid ${isOutdoor ? "#ffff00" : "#e2e8f0"};padding-bottom:10px;">
    <div class="fallback-status-badge" role="status" style="font-size:0.85em;margin-bottom:6px;opacity:0.95;">
      תרגיל ללא סרטון הדגמה - תצוגה נגישה
    </div>
    <h3 class="fallback-exercise-title" style="margin:0 0 6px 0;font-size:1.3em;line-height:1.3;">
      ${escapeHtml(name)}
    </h3>
    <div class="fallback-muscle-tag" style="font-size:0.95em;opacity:0.9;">
      <strong>קבוצת שרירים:</strong> ${escapeHtml(muscleLabelHe)}
    </div>
  </header>

  <div class="fallback-card-body" style="display:flex;flex-wrap:wrap;gap:16px;align-items:flex-start;">
    <div class="fallback-muscle-diagram" role="img" aria-label="איור קבוצת שרירים: ${escapeHtml(muscleLabelHe)}" style="width:110px;height:110px;flex-shrink:0;display:flex;align-items:center;justify-content:center;background:${isOutdoor ? "#111111" : "#f8fafc"};border:1px solid ${isOutdoor ? "#ffff00" : "#cbd5e1"};border-radius:8px;padding:6px;">
      ${muscleSvg}
    </div>

    <div class="fallback-details" style="flex:1;min-width:220px;">
      <div class="fallback-tempo-badge" ${badgeStyles} data-tempo="${escapeHtml(tempo)}">
        <span class="tempo-label">קצב מומלץ:</span>
        <span class="tempo-value">${escapeHtml(tempo)}</span>
      </div>
      ${equipmentHtml}
    </div>
  </div>

  <section class="fallback-instructions-section" style="margin-top:16px;" aria-labelledby="heading-instructions-${escapeHtml(name)}">
    <h4 id="heading-instructions-${escapeHtml(name)}" class="fallback-instructions-title" style="margin:0 0 10px 0;font-size:1.05em;">
      דגשי ביצוע טכניים
    </h4>
    <ol class="fallback-instructions" style="margin:0;padding-inline-start:22px;">
${listItemsHtml}
    </ol>
  </section>
</article>`;
	}

	function renderFallbackCard(container, exercise, options) {
		const html = renderFallbackCardHtml(exercise, options);
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
			if ("innerHTML" in target) {
				const prop = "innerHTML";
				target[prop] = html;
				return target;
			}
		}
		return html;
	}

	const api = {
		MUSCLE_SVGS: MUSCLE_SVGS,
		TEMPO_DEFAULTS: TEMPO_DEFAULTS,
		hasValidVideo: hasValidVideo,
		getMuscleSvg: getMuscleSvg,
		getRecommendedTempo: getRecommendedTempo,
		formatInstructions: formatInstructions,
		renderFallbackCardHtml: renderFallbackCardHtml,
		renderFallbackCard: renderFallbackCard,
		escapeHtml: escapeHtml,
	};

	if (root) {
		root.THExerciseCardFallback = api;
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
