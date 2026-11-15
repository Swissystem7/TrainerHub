(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    var Prompt = require('./prompt-parser.js');
    var Infer = require('./infer.js');
    var SessionBuilder = require('./session-builder.js');
    var catalogData = null;
    try {
      catalogData = require('./catalog.json');
    } catch (_e) {
      catalogData = null;
    }
    module.exports = factory(Prompt, Infer, SessionBuilder, catalogData);
  } else {
    root.THNaturalFlow = factory(root.THPrompt, root.THInfer, root.THEngine, root.THCatalog);
  }
})(
  typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : this,
  function (Prompt, Infer, SessionBuilder, defaultCatalog) {
    if (Infer) {
      if (typeof Infer.inferLevel !== 'function') {
        Infer.inferLevel = function (text) {
          var t = Infer.fold ? Infer.fold(text) : String(text || '').toLowerCase();
          if (/מתקד[מם]|advanced/.test(t)) return 'advanced';
          if (/ביניים|intermediate/.test(t)) return 'intermediate';
          if (/מתחיל|beginner/.test(t)) return 'beginner';
          if (/ברכיים|חימום/.test(t)) return 'beginner';
          return 'beginner';
        };
      }
      if (!Infer.RESTRICTION_LABELS) {
        Infer.RESTRICTION_LABELS = {
          no_jumps: 'ללא קפיצות',
          knee_pain: 'רגישות בברכיים',
          back_pain: 'רגישות בגב',
          shoulder_pain: 'רגישות בכתפיים',
          wrist_pain: 'רגישות בשורש כף יד'
        };
      }
      if (typeof Infer.inferRestrictions !== 'function') {
        Infer.inferRestrictions = function (text) {
          var t = Infer.fold ? Infer.fold(String(text || '')) : String(text || '').toLowerCase();
          var restrictions = [];
          if (/ללא קפיצ|בלי קפיצ|ללא ניתור|בלי ניתור|no jumps?|low impact|איסור קפיצ|בלי לקפוץ|ללא לקפוץ/.test(t)) {
            restrictions.push('no_jumps');
          }
          if (/כאב(?:י)? ברכ|בעי(?:ות)? ברכ|פציע(?:ת)? ברכ|רגיש(?:ות)? ב?ברכ|knee pain/.test(t)) {
            restrictions.push('knee_pain');
          }
          if (/כאב(?:י)? גב|בעי(?:ות)? גב|גב תחתון|back pain/.test(t)) {
            restrictions.push('back_pain');
          }
          if (/כאב(?:י)? כתפ|בעי(?:ות)? כתפ|shoulder pain/.test(t)) {
            restrictions.push('shoulder_pain');
          }
          if (/כאב(?:י)? (?:שורש כף יד|פרק כף יד)|wrist pain/.test(t)) {
            restrictions.push('wrist_pain');
          }
          return restrictions;
        };
      }
      if (typeof Infer.inferLimitations !== 'function') {
        Infer.inferLimitations = Infer.inferRestrictions;
      }
    }

    if (Prompt && typeof Prompt.parsePrompt === 'function') {
      var origParse = Prompt.parsePrompt;
      Prompt.parsePrompt = function (raw) {
        var res = origParse(raw);
        if (res && !res.restrictions) {
          res.restrictions = Infer && typeof Infer.inferRestrictions === 'function' ? Infer.inferRestrictions(raw) : [];
        }
        return res;
      };
    }

    function clampDuration(duration) {
      var d = Number(duration);
      if (!Number.isFinite(d) || d <= 0) return 20;
      if (d < 5) return 5;
      if (d > 120) return 120;
      return Math.round(d);
    }

    function isJumpingExercise(entry) {
      var str;
      if (!entry) return false;
      if (entry.pattern === 'plyo') return true;
      str = `${entry.he || ''} ${entry.name || ''} ${entry.id || ''} ${entry.folder || ''}`.toLowerCase();
      return /קפיצ|ניתור|בורפי|גאמפינג|ג׳אמפ|סמוך קום|jump|burpee|plyo/.test(str);
    }

    function formatParsedSummary(parsed) {
      var badges = [];
      var badgeObjects = [];
      var emptySummary;
      var muscleLabels;
      var mNames;
      var d;
      var eqLabels;
      var eqNames;
      var levelLabels;
      var restLabels;
      var limits;

      if (!parsed || typeof parsed !== 'object') {
        emptySummary = ['אימון כללי', '20 דקות', 'משקל גוף'];
        emptySummary.badges = [
          { key: 'focus', label: 'אימון כללי', text: 'אימון כללי', value: 'full' },
          { key: 'duration', label: '20 דקות', text: '20 דקות', value: 20 },
          { key: 'equipment', label: 'משקל גוף', text: 'משקל גוף', value: [] }
        ];
        return emptySummary;
      }

      function addBadge(key, label, value) {
        badges.push(label);
        badgeObjects.push({ key: key, label: label, text: label, value: value });
      }

      // Muscles / focus
      muscleLabels = (Infer && Infer.MUSCLE_LABELS) || {};
      if (Array.isArray(parsed.muscles) && parsed.muscles.length) {
        mNames = parsed.muscles.map(function (m) {
          return muscleLabels[m] || m;
        });
        addBadge('muscles', `שרירים: ${mNames.join(', ')}`, parsed.muscles);
      } else if (parsed.focus && parsed.focus !== 'full') {
        addBadge('focus', `מיקוד: ${muscleLabels[parsed.focus] || parsed.focus}`, parsed.focus);
      } else {
        addBadge('focus', 'אימון כל הגוף', 'full');
      }

      // Duration
      d = clampDuration(parsed.duration || 20);
      addBadge('duration', `משך: ${d} דק׳`, d);

      // Equipment
      eqLabels = (Infer && Infer.EQ_LABELS) || {};
      if (Array.isArray(parsed.equipment) && parsed.equipment.length) {
        eqNames = parsed.equipment.map(function (eq) {
          return eqLabels[eq] || eq;
        });
        addBadge('equipment', `ציוד: ${eqNames.join(', ')}`, parsed.equipment);
      } else {
        addBadge('equipment', 'ללא ציוד (משקל גוף)', []);
      }

      // Level
      levelLabels = (Infer && Infer.LEVEL_LABELS) || {};
      if (parsed.level) {
        addBadge('level', `רמה: ${levelLabels[parsed.level] || parsed.level}`, parsed.level);
      }

      // Limitations / restrictions
      restLabels = (Infer && Infer.RESTRICTION_LABELS) || {
        no_jumps: 'ללא קפיצות',
        knee_pain: 'רגישות בברכיים',
        back_pain: 'רגישות בגב',
        shoulder_pain: 'רגישות בכתפיים',
        wrist_pain: 'רגישות בשורש כף יד'
      };
      limits = parsed.limitations || parsed.restrictions || [];
      if (Array.isArray(limits) && limits.length) {
        limits.forEach(function (lim) {
          addBadge('limitation', `מגבלה: ${restLabels[lim] || lim}`, lim);
        });
      }

      // Goal
      if (parsed.goal) {
        addBadge('goal', `מטרה: ${parsed.goal}`, parsed.goal);
      }

      badges.badges = badgeObjects;
      return badges;
    }

    function createFallbackWorkout(parsed) {
      var dur = clampDuration(parsed ? parsed.duration : 20);
      return {
        title: 'אימון פונקציונלי בסיסי (ברירת מחדל)',
        duration_minutes: dur,
        participants: 1,
        intensity: 'medium',
        equipment: ['משקל גוף'],
        tags: ['full', 'fallback'],
        phases: [
          {
            name: 'Warm-up',
            duration_minutes: 5,
            exercises: [
              {
                name: 'חימום מפרקים דינמי',
                sets: 1,
                reps: null,
                duration_seconds: 300,
                notes: 'תנועתיות מפרקים'
              }
            ]
          },
          {
            name: 'Main',
            duration_minutes: Math.max(1, dur - 5),
            exercises: [
              {
                name: 'סקוואט משקל גוף',
                sets: 3,
                reps: '10-12',
                duration_seconds: null,
                notes: 'שמירה על גב ישר'
              },
              {
                name: 'שכיבות שמיכה',
                sets: 3,
                reps: '8-10',
                duration_seconds: null,
                notes: 'מרפקים ב-45 מעלות'
              },
              {
                name: 'פלאנק סטטי',
                sets: 3,
                reps: null,
                duration_seconds: 30,
                rest_seconds: 45,
                notes: 'גיוס שרירי ליבה'
              }
            ]
          },
          {
            name: 'Cool-down',
            duration_minutes: 0,
            exercises: []
          }
        ],
        source: 'natural-flow-fallback'
      };
    }

    function generateFromNaturalPrompt(promptText, profile, catalog) {
      var text = String(promptText || '').trim();
      var parsed;
      var inferredLevel;
      var textRestrictions;
      var profileLimitations;
      var limitations = [];
      var seenLim = {};
      var rawParsedDuration;
      var activeCatalog;
      var hasNoJumps;
      var filteredObj;
      var builder;
      var sessionResult = null;
      var fallbackUsed = false;
      var workout;
      var appliedAdaptations = [];
      var eqLabels;
      var levelLabels;
      var personalization;
      var explanation;
      var summary;

      profile = profile && typeof profile === 'object' ? profile : {};

      // 1. Parse prompt
      parsed =
        Prompt && typeof Prompt.parsePrompt === 'function'
          ? Prompt.parsePrompt(text)
          : {
              raw: text,
              muscles: [],
              focus: 'full',
              duration: 20,
              equipment: []
            };

      // 2. Infer level from text or profile if not explicitly set
      if (!parsed.level) {
        if (profile.level) {
          parsed.level = profile.level;
        } else if (Infer && typeof Infer.inferLevel === 'function' && text) {
          inferredLevel = Infer.inferLevel(text);
          if (inferredLevel) {
            parsed.level = inferredLevel;
          }
        }
      }

      // 3. Infer restrictions & limitations
      textRestrictions = Infer && typeof Infer.inferRestrictions === 'function' ? Infer.inferRestrictions(text) : [];
      profileLimitations = Array.isArray(profile.limitations)
        ? profile.limitations
        : Array.isArray(profile.restrictions)
          ? profile.restrictions
          : [];

      textRestrictions.concat(profileLimitations).forEach(function (lim) {
        if (lim && !seenLim[lim]) {
          seenLim[lim] = true;
          limitations.push(lim);
        }
      });

      // Also check for explicit jumping restriction phrasing if not caught
      if (/ללא קפיצ|בלי קפיצ|ללא ניתור|בלי ניתור|no jumps?|low impact/.test(text.toLowerCase())) {
        if (limitations.indexOf('no_jumps') === -1) {
          limitations.push('no_jumps');
        }
      }

      parsed.limitations = limitations;
      parsed.restrictions = limitations;

      // 4. Equipment integration with profile
      if (
        (!parsed.equipment || !parsed.equipment.length) &&
        Array.isArray(profile.equipment) &&
        profile.equipment.length
      ) {
        parsed.equipment = profile.equipment.slice();
      }

      // 5. Clamp extreme or abnormal duration
      rawParsedDuration = parsed.duration;
      parsed.duration = clampDuration(rawParsedDuration);
      parsed.originalDuration = rawParsedDuration;

      // 6. Resolve catalog & filter according to limitations (e.g. no_jumps)
      activeCatalog = catalog || defaultCatalog;
      if (!activeCatalog && typeof TH !== 'undefined') {
        activeCatalog = typeof TH.catalogList === 'function' ? TH.catalogList() : TH.catalog;
      }

      hasNoJumps = limitations.indexOf('no_jumps') !== -1 || limitations.indexOf('ללא קפיצות') !== -1;
      if (hasNoJumps && activeCatalog) {
        if (Array.isArray(activeCatalog)) {
          activeCatalog = activeCatalog.filter(function (entry) {
            return !isJumpingExercise(entry);
          });
        } else if (typeof activeCatalog === 'object') {
          filteredObj = {};
          Object.keys(activeCatalog).forEach(function (k) {
            if (!isJumpingExercise(activeCatalog[k])) {
              filteredObj[k] = activeCatalog[k];
            }
          });
          activeCatalog = filteredObj;
        }
      }

      // 7. Build session with SessionBuilder
      builder = SessionBuilder;
      if (!builder && typeof root !== 'undefined' && root.THEngine) {
        builder = root.THEngine;
      }

      if (builder && typeof builder.buildSession === 'function') {
        try {
          sessionResult = builder.buildSession(parsed, activeCatalog, {
            profile: profile,
            limitations: limitations
          });
        } catch (_e) {
          sessionResult = null;
        }
      }

      workout = sessionResult && sessionResult.workout ? sessionResult.workout : null;
      if (!workout) {
        workout = createFallbackWorkout(parsed);
        fallbackUsed = true;
      }

      // 8. Personalization details and rationale
      if (hasNoJumps) {
        appliedAdaptations.push('הוסרו תרגילי קפיצות וניתורים (Low Impact)');
      }
      if (Array.isArray(profile.equipment) && profile.equipment.length) {
        eqLabels = (Infer && Infer.EQ_LABELS) || {};
        appliedAdaptations.push(
          `הותאם לציוד הזמין בפרופיל: ${profile.equipment
            .map(function (e) {
              return eqLabels[e] || e;
            })
            .join(', ')}`
        );
      }
      if (parsed.level) {
        levelLabels = (Infer && Infer.LEVEL_LABELS) || {};
        appliedAdaptations.push(`הותאם לרמת המתאמן: ${levelLabels[parsed.level] || parsed.level}`);
      }
      if (rawParsedDuration && (rawParsedDuration > 120 || rawParsedDuration < 5)) {
        appliedAdaptations.push(`המשך הוגבל לטווח בטוח (${parsed.duration} דק׳)`);
      }

      personalization = {
        profile: profile,
        inferredLevel: parsed.level || 'beginner',
        limitations: limitations,
        appliedAdaptations: appliedAdaptations
      };

      explanation = (sessionResult && sessionResult.explanation) || {
        type: workout.title,
        primary: parsed.muscles || ['full'],
        reasons: [],
        flags: []
      };

      workout.personalization = personalization;
      workout.rationale = explanation;

      summary = formatParsedSummary(parsed);

      return {
        success: true,
        fallbackUsed: fallbackUsed,
        parsed: parsed,
        summary: summary,
        workout: workout,
        explanation: explanation,
        personalization: personalization,
        satisfied: sessionResult ? sessionResult.satisfied : false,
        notice: sessionResult ? sessionResult.notice : null
      };
    }

    return {
      generateFromNaturalPrompt: generateFromNaturalPrompt,
      formatParsedSummary: formatParsedSummary,
      clampDuration: clampDuration
    };
  }
);
