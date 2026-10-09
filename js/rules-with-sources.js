/**
 * Every assumption the engine makes about a workout, with the source it came from.
 * Nothing here plans a workout — it reads the same request the engine reads and
 * reports, rule by rule, what was decided and who decided it: the coach's own
 * request, a fixed table in the engine, the catalog, or the honesty policy.
 * Classic script. Namespace: window.THRules
 */
(function (root) {
  'use strict';

  var Infer = root.THInfer;
  var Prompt = root.THPrompt;
  var Analyzer = root.THAnalyzer;
  var Engine = root.THEngine;
  var Core = root.TH;
  if (typeof module === 'object' && module.exports) {
    Infer = require('./infer.js');
    Prompt = require('./prompt-parser.js');
    Analyzer = require('./analyzer.js');
    Engine = require('./session-builder.js');
    Core = require('./core.js');
  }

  // kind: who stands behind the rule. ref: the file a curious coach can open.
  var SOURCES = {
    prompt: {
      id: 'prompt',
      kind: 'user',
      he: 'מה שביקשת',
      detail: 'נקרא מתוך התיאור והשדות שמילאת.',
      ref: null
    },
    engine: {
      id: 'engine',
      kind: 'engine',
      he: 'טבלה קבועה במנוע',
      detail: 'מספרים שכתובים בקוד ורצים אותו דבר בכל אימון.',
      ref: 'js/session-builder.js'
    },
    default: {
      id: 'default',
      kind: 'default',
      he: 'ברירת מחדל של TrainerHub',
      detail: 'לא ביקשת — השלמנו, ואפשר לשנות בשדות שמעל.',
      ref: 'js/rules-with-sources.js'
    },
    catalog: {
      id: 'catalog',
      kind: 'catalog',
      he: 'המאגר שלך',
      detail: 'נקבע לפי הסרטונים שקיימים אצלך במאגר.',
      ref: 'js/catalog.json'
    },
    policy: {
      id: 'policy',
      kind: 'policy',
      he: 'כלל היושרה של TrainerHub',
      detail: 'חוסם הבטחת תוצאה גופנית בכל תוכנית.',
      ref: 'js/analyzer.js'
    }
  };

  var GOAL_LABELS = {
    strength: 'כוח',
    hypertrophy: 'מסת שריר',
    endurance: 'סיבולת',
    core: 'ליבה וייצוב'
  };

  // Mirrors the full-body branch in THPrompt.parseMuscles — an empty muscle list
  // can mean "you asked for full body" or "we could not tell", and the source differs.
  var FULL_BODY_RX = /פול.?בודי|פול בודי|גוף מלא|full.?body|כל הגוף/;

  function esc(s) {
    if (Core && typeof Core.esc === 'function') return Core.esc(s);
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function muscleLabels(ids) {
    return (ids || []).map(function (m) {
      return Infer.MUSCLE_LABELS[m] || m;
    }).join(', ');
  }

  function eqLabels(ids) {
    return (ids || []).map(function (e) {
      return Infer.EQ_LABELS[e] || e;
    }).join(', ');
  }

  function toRequest(input) {
    if (input && typeof input === 'object') {
      var req = input.request && typeof input.request === 'object' ? input.request : input;
      return {
        raw: String(req.raw == null ? '' : req.raw),
        muscles: Array.isArray(req.muscles) ? req.muscles : [],
        focus: req.focus || 'full',
        duration: Number(req.duration) || 20,
        durationSpecified: !!req.durationSpecified,
        participants: Math.max(1, Math.floor(Number(req.participants) || 1)),
        participantsSpecified: !!req.participantsSpecified,
        equipment: Array.isArray(req.equipment) ? req.equipment : [],
        level: req.level || null,
        goal: req.goal || null
      };
    }
    return toRequest(Prompt.parsePrompt(String(input == null ? '' : input)));
  }

  function effectiveGoal(req) {
    if (req.goal) return req.goal;
    return req.focus === 'core' ? 'core' : 'hypertrophy';
  }

  function prescription(req) {
    return Engine.prescription({ goal: req.goal, focus: req.focus });
  }

  function rxText(rx) {
    var work = rx.reps ? rx.reps + ' חזרות' : (rx.duration || 40) + ' שנ׳ עבודה';
    return rx.sets + ' סטים × ' + work + ' · ' + rx.rest + ' שנ׳ מנוחה בין סטים';
  }

  function stationsText(req) {
    if (req.participants <= 1) return '1 חניך — בלי חלוקה לתחנות';
    var plan = Engine.groupPlan(req.participants, Engine.wantedCount(req.duration));
    return plan && plan.he ? plan.he : req.participants + ' חניכים';
  }

  // One entry per assumption. evaluate() returns the value a coach reads plus the
  // id of the source it came from; F-rules downstream read the same shape.
  var RULE_DEFS = [
    {
      id: 'duration',
      he: 'משך האימון',
      detail: 'קובע כמה תרגילים נכנסים לתוכנית.',
      evaluate: function (req) {
        return {
          value: req.duration + ' דקות',
          source: req.durationSpecified ? 'prompt' : 'default'
        };
      }
    },
    {
      id: 'exercise_count',
      he: 'מספר התרגילים',
      detail: 'נגזר ממשך האימון לפי מדרגות קבועות, לא לפי כמה סרטונים יש.',
      evaluate: function (req) {
        return {
          value: Engine.wantedCount(req.duration) + ' תרגילים לאימון של ' + req.duration + ' דקות',
          source: 'engine'
        };
      }
    },
    {
      id: 'focus',
      he: 'מיקוד שרירים',
      detail: 'מסנן את המאגר לתרגילים שעובדים על מה שביקשת.',
      evaluate: function (req) {
        if (req.muscles.length) {
          return { value: muscleLabels(req.muscles), source: 'prompt' };
        }
        if (FULL_BODY_RX.test(req.raw)) {
          return { value: 'גוף מלא', source: 'prompt' };
        }
        return { value: 'גוף מלא — לא זוהתה קבוצת שריר בתיאור', source: 'default' };
      }
    },
    {
      id: 'goal',
      he: 'מטרת האימון',
      detail: 'בוחרת את טבלת הסטים, החזרות והמנוחה.',
      evaluate: function (req) {
        var goal = effectiveGoal(req);
        var label = GOAL_LABELS[goal] || goal;
        if (req.goal) return { value: label, source: 'prompt' };
        if (goal === 'core') {
          return { value: label + ' — נגזר מהמיקוד שביקשת', source: 'engine' };
        }
        return { value: label, source: 'default' };
      }
    },
    {
      id: 'prescription',
      he: 'סטים, חזרות ומנוחה',
      detail: 'אותה טבלה שהמנוע מריץ בפועל על כל תרגיל בעיקר האימון.',
      evaluate: function (req) {
        return { value: rxText(prescription(req)), source: 'engine' };
      }
    },
    {
      id: 'equipment',
      he: 'ציוד',
      detail: 'תרגיל שדורש ציוד אחר נפסל, ואם אין מספיק — המנוע מרפה את הסינון ואומר זאת.',
      evaluate: function (req) {
        if (req.equipment.length) {
          return { value: eqLabels(req.equipment), source: 'prompt' };
        }
        return { value: 'לפי מה שיש במאגר', source: 'catalog' };
      }
    },
    {
      id: 'level',
      he: 'רמת המתאמן',
      detail: 'מעדיף תרגילים שמסומנים ברמה הזו במאגר.',
      evaluate: function (req) {
        if (req.level) {
          return { value: Infer.LEVEL_LABELS[req.level] || req.level, source: 'prompt' };
        }
        return { value: 'לא צוינה — בלי סינון לפי רמה', source: 'default' };
      }
    },
    {
      id: 'participants',
      he: 'כמות חניכים וסידור תחנות',
      detail: 'מחשב תחנות של עד 4 חניכים ומחליף בסיום סט.',
      evaluate: function (req) {
        return {
          value: stationsText(req),
          source: req.participantsSpecified ? 'prompt' : 'default'
        };
      }
    },
    {
      id: 'no_outcome_claims',
      he: 'בלי הבטחת תוצאה',
      detail: 'התוכנית מתארת עומס. ירידה במשקל או שריפת שומן תלויות בדברים שהאפליקציה לא מודדת.',
      evaluate: function (req) {
        if (Analyzer.claimsOutcome(req.raw)) {
          return {
            value: 'התיאור כלל הבטחת תוצאה — היא לא נכנסת לתוכנית, מוצג עומס בלבד',
            source: 'policy'
          };
        }
        return { value: 'התוכנית מתארת עומס ולא מבטיחה תוצאה גופנית', source: 'policy' };
      }
    }
  ];

  var RULE_IDS = RULE_DEFS.map(function (def) { return def.id; });

  function evaluateRule(def, req) {
    var out = def.evaluate(req);
    return {
      id: def.id,
      he: def.he,
      detail: def.detail,
      value: out.value,
      source: SOURCES[out.source] || SOURCES.engine
    };
  }

  /**
   * All the rules behind one workout, each with its source.
   * input: the Hebrew description, a parsed request, or a built session.
   */
  function rulesWithSources(input) {
    var req = toRequest(input);
    var rules = RULE_DEFS.map(function (def) { return evaluateRule(def, req); });
    var seen = {};
    var sources = [];
    rules.forEach(function (rule) {
      if (seen[rule.source.id]) return;
      seen[rule.source.id] = true;
      sources.push(rule.source);
    });
    return { description: req.raw, request: req, rules: rules, sources: sources };
  }

  /** One rule out of the same list, found by its id or by words from its description. */
  function findRule(input, query) {
    if (query == null || String(query).trim() === '') return null;
    var rules = rulesWithSources(input).rules;
    var q = Infer.fold(query);
    var i;
    for (i = 0; i < rules.length; i++) {
      if (rules[i].id === String(query).trim()) return rules[i];
    }
    for (i = 0; i < rules.length; i++) {
      if (Infer.fold(rules[i].he).indexOf(q) !== -1) return rules[i];
    }
    for (i = 0; i < rules.length; i++) {
      if (Infer.fold(rules[i].detail + ' ' + rules[i].value).indexOf(q) !== -1) return rules[i];
    }
    return null;
  }

  function ruleMarkup(rule) {
    var ref = rule.source.ref ? ' · ' + rule.source.ref : '';
    return '<li class="rule" data-rule-id="' + esc(rule.id) + '">' +
      '<b>' + esc(rule.he) + '</b>' +
      '<span class="rule-value">' + esc(rule.value) + '</span>' +
      '<span class="pill rule-source">מקור: ' + esc(rule.source.he) + '</span>' +
      '<small class="rule-detail">' + esc(rule.detail) + ' ' +
        esc(rule.source.detail) + esc(ref) + '</small>' +
      '</li>';
  }

  /** The panel a coach reads before approving the plan. */
  function rulesMarkup(input, opts) {
    opts = opts || {};
    var result = input && input.rules && Array.isArray(input.rules) ? input : rulesWithSources(input);
    var title = opts.title || 'הנחות האימון ומקורותיהן';
    var className = opts.className || 'card rules';
    var asked = result.description
      ? '<p class="rules-for">נבנה לפי הבקשה: «' + esc(result.description) + '»</p>'
      : '';
    return '<section class="' + esc(className) + '" aria-labelledby="rulesTitle">' +
      '<h2 id="rulesTitle">' + esc(title) + '</h2>' +
      '<p class="honest">כל כלל שהמנוע הפעיל על הבקשה הזו, ומאיפה הוא בא. עברו על הרשימה לפני שמתחילים.</p>' +
      asked +
      '<ul class="rules-list">' +
        result.rules.map(ruleMarkup).join('') +
      '</ul></section>';
  }

  var api = {
    SOURCES: SOURCES,
    RULE_IDS: RULE_IDS,
    rulesWithSources: rulesWithSources,
    findRule: findRule,
    rulesMarkup: rulesMarkup
  };

  root.THRules = api;
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : this);
