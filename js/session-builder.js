/**
 * Build a workout from a Hebrew prompt + the unified catalog.
 * Client-side only. If the library cannot satisfy the request, say so
 * and offer the closest thing. Never fabricates outcomes.
 * Classic script. Namespace: window.THEngine
 */
(function (root) {
  'use strict';

  var Infer = root.THInfer;
  var Prompt = root.THPrompt;
  var Analyzer = root.THAnalyzer;
  if (typeof module === 'object' && module.exports) {
    Infer = require('./infer.js');
    Prompt = require('./prompt-parser.js');
    Analyzer = require('./analyzer.js');
  }

  var RX = {
    strength: { sets: 4, reps: '4-6', rest: 120 },
    hypertrophy: { sets: 3, reps: '8-12', rest: 60 },
    endurance: { sets: 3, reps: '12-15', rest: 45 },
    core: { sets: 3, reps: null, rest: 30, duration: 40 }
  };

  function catalogList(explicit) {
    if (Array.isArray(explicit)) return explicit;
    if (explicit && typeof explicit === 'object' && !explicit.id) {
      return Object.keys(explicit).filter(function (k) {
        return k.charAt(0) !== '_';
      }).map(function (id) {
        var e = explicit[id] || {};
        return Object.assign({ id: e.id || id }, e);
      });
    }
    if (root.TH && typeof root.TH.catalogList === 'function') return root.TH.catalogList();
    return [];
  }

  function isPlayable(e) {
    if (!e) return false;
    if (root.TH && typeof root.TH.isPlayable === 'function') return root.TH.isPlayable(e);
    return !!(e.file || e.driveId || e.youtubeId);
  }

  function foldName(e) {
    return Infer.fold((e && (e.he || e.id)) || '');
  }

  function prescription(req) {
    if (req.goal && RX[req.goal]) return RX[req.goal];
    if (req.focus === 'core') return RX.core;
    return RX.hypertrophy;
  }

  function wantedCount(duration) {
    var d = Number(duration) || 20;
    if (d <= 10) return 3;
    if (d <= 20) return 5;
    if (d <= 30) return 6;
    if (d <= 45) return 8;
    return 10;
  }

  function matchesEquipment(entry, wanted) {
    var have = entry.equipment && entry.equipment.length ? entry.equipment : ['none'];
    if (!wanted || !wanted.length) return true;
    if (wanted.indexOf('none') !== -1 && wanted.length === 1) {
      return have.indexOf('none') !== -1 || have.indexOf('wall') !== -1;
    }
    return wanted.some(function (eq) {
      return have.indexOf(eq) !== -1;
    });
  }

  function muscleOverlap(entry, muscles) {
    if (!muscles || !muscles.length) return 1;
    var have = entry.muscles || [];
    var n = 0;
    for (var i = 0; i < have.length; i++) {
      if (muscles.indexOf(have[i]) !== -1) n++;
    }
    return n;
  }

  function nameHints(entry, req) {
    var blob = foldName(entry) + ' ' + Infer.fold(entry.folder || '');
    var score = 0;
    if (req.focus === 'core' && /בטן|פלאנק|ליבה|מטפס/.test(blob)) score += 6;
    if (req.focus === 'legs' && /רגל|ירכ|סולם|מדרג|ארבע/.test(blob)) score += 6;
    if (req.focus === 'back' && /גב|מתח|אוסטרל/.test(blob)) score += 6;
    if (req.focus === 'arms' && /יד|שכיב|כוח ידיים/.test(blob)) score += 6;
    if (req.focus === 'chest' && /חזה|שכיב/.test(blob)) score += 6;
    if (req.focus === 'shoulders' && /כתף|כתפי/.test(blob)) score += 6;
    if (req.audience === 'kids' && /ילד/.test(blob)) score += 4;
    if (req.audience === 'partner' && /זוג/.test(blob)) score += 4;
    return score;
  }

  function sourceBonus(entry) {
    if (entry.source === 'drive') return 5;
    if (entry.source === 'youtube') return 2;
    if (entry.file) return 1;
    return 0;
  }

  function scoreEntry(entry, req) {
    var score = 0;
    var overlap = muscleOverlap(entry, req.muscles);
    if (req.muscles && req.muscles.length) {
      score += overlap * 12;
      if (overlap === 0) score -= 8;
    }
    score += nameHints(entry, req);
    if (req.equipment && req.equipment.length) {
      if (matchesEquipment(entry, req.equipment)) score += 10;
      else score -= 15;
    }
    if (req.level && entry.level === req.level) score += 3;
    if (req.level === 'beginner' && entry.level === 'advanced') score -= 4;
    score += sourceBonus(entry);
    if (/חימום/.test(foldName(entry)) && req.focus !== 'full') score -= 2;
    return score;
  }

  function filterPool(list, req, relax) {
    relax = relax || {};
    return list.filter(function (e) {
      if (!e || !e.he) return false;
      if (Infer.isBlockedName(e.he) || Infer.isBlockedName(e.id)) return false;
      if (!relax.playable && !isPlayable(e) && e.source !== 'link') return false;
      if (e.source === 'link') return false;
      if (!relax.equipment && req.equipment && req.equipment.length && !matchesEquipment(e, req.equipment)) {
        return false;
      }
      if (!relax.muscle && req.muscles && req.muscles.length) {
        var overlap = muscleOverlap(e, req.muscles);
        var hinted = nameHints(e, req) >= 6;
        if (overlap === 0 && !hinted) return false;
      }
      if (!relax.level && req.level && e.level && e.level !== req.level) {
        if (!(req.level === 'intermediate' && e.level === 'beginner')) return false;
      }
      return true;
    });
  }

  function pickDiverse(scored, count) {
    var picked = [];
    var usedName = {};
    var usedPattern = {};
    scored.sort(function (a, b) { return b.score - a.score; });
    function take(pred) {
      for (var i = 0; i < scored.length && picked.length < count; i++) {
        var e = scored[i].entry;
        var name = foldName(e);
        if (usedName[name]) continue;
        if (pred && !pred(e, scored[i])) continue;
        usedName[name] = true;
        var inf = Infer.inferFromName(e.he, { folder: e.folder || '' });
        usedPattern[inf.pattern] = (usedPattern[inf.pattern] || 0) + 1;
        picked.push(e);
        if (root.THIngest && typeof root.THIngest.patternScore === 'function') {
          scored.forEach(function (row) {
            row.score += root.THIngest.patternScore(e.id, row.entry.id);
          });
        }
      }
    }
    take(function (e, row) { return row.score >= 10; });
    take(null);
    return picked;
  }

  function findWarmup(list) {
    for (var i = 0; i < list.length; i++) {
      if (list[i].id === 'warmup' || Infer.fold(list[i].he) === 'חימום') return list[i];
    }
    for (var j = 0; j < list.length; j++) {
      if (/חימום/.test(foldName(list[j]))) return list[j];
    }
    return null;
  }

  function toExercise(entry, rx) {
    var inf = Infer.inferFromName(entry.he, { folder: entry.folder || '' });
    var timeBased = inf.load === 'time' || rx.duration;
    return {
      name: entry.he,
      id: entry.id,
      sets: rx.sets,
      reps: timeBased ? null : rx.reps,
      duration_seconds: timeBased ? (rx.duration || 40) : null,
      rest_seconds: rx.rest,
      notes: null
    };
  }

  function whyChosen(entry, req) {
    var bits = [];
    var overlap = muscleOverlap(entry, req.muscles);
    if (overlap) {
      bits.push('עובד על ' + (entry.muscles || []).map(function (m) {
        return Infer.MUSCLE_LABELS[m] || m;
      }).join(', '));
    } else if (nameHints(entry, req) >= 6) {
      bits.push('השם והתיקייה מתאימים לבקשה');
    }
    if (req.equipment && req.equipment.length && matchesEquipment(entry, req.equipment)) {
      bits.push('מתאים לציוד שביקשת');
    }
    if (entry.source === 'drive') bits.push('מהמאגר האמיתי בדרייב');
    else if (entry.source === 'youtube') bits.push('סרטון יוטיוב שנשמר במאגר');
    else if (entry.file) bits.push('קליפ מקומי במאגר');
    var inf = Infer.inferFromName(entry.he, { folder: entry.folder || '' });
    if (inf.pattern && Infer.PATTERN_LABELS[inf.pattern]) {
      bits.push('דפוס ' + Infer.PATTERN_LABELS[inf.pattern]);
    }
    return bits.join(' · ') || 'זמין במאגר ומתאים לבקשה';
  }

  function typeLabel(req, analysis) {
    var parts = [];
    if (req.focus === 'full') parts.push('גוף מלא');
    else if (req.focus === 'arms') parts.push('ידיים');
    else if (req.focus && Infer.MUSCLE_LABELS[req.focus]) parts.push(Infer.MUSCLE_LABELS[req.focus]);
    else parts.push('אימון מהמאגר');
    if (req.equipment && req.equipment[0] === 'none') parts.push('משקל גוף');
    else if (req.equipment && req.equipment[0] && Infer.EQ_LABELS[req.equipment[0]]) {
      parts.push(Infer.EQ_LABELS[req.equipment[0]]);
    }
    parts.push((req.duration || analysis.durationMinutes || 20) + ' דקות');
    if (req.level && Infer.LEVEL_LABELS[req.level]) parts.push(Infer.LEVEL_LABELS[req.level]);
    return parts.join(' · ');
  }

  function closestNotice(req, relax, picked) {
    if (!relax.muscle && !relax.equipment && !relax.level) return null;
    var want = [];
    if (req.focus === 'full') want.push('גוף מלא');
    else if (req.focus === 'arms') want.push('ידיים');
    else if (req.focus && Infer.MUSCLE_LABELS[req.focus]) want.push(Infer.MUSCLE_LABELS[req.focus]);
    if (req.equipment && req.equipment[0] && Infer.EQ_LABELS[req.equipment[0]]) {
      want.push(Infer.EQ_LABELS[req.equipment[0]]);
    }
    if (req.level && Infer.LEVEL_LABELS[req.level]) want.push('רמת ' + Infer.LEVEL_LABELS[req.level]);
    var got = picked.length
      ? 'הנה הקרוב ביותר מתוך הסרטונים שיש במאגר (' + picked.length + ' תרגילים).'
      : 'אין במאגר תרגיל שמתאים.';
    return 'אין במאגר מספיק סרטונים לבקשה' +
      (want.length ? ' («' + want.join(' · ') + '»)' : '') +
      '. ' + got;
  }

  function buildSession(text, catalogOrList) {
    var req = typeof text === 'string' ? Prompt.parsePrompt(text) : (text || Prompt.parsePrompt(''));
    var list = catalogList(catalogOrList);
    var rx = prescription(req);
    var need = wantedCount(req.duration);
    var relax = { muscle: false, equipment: false, level: false };
    var pool = filterPool(list, req, relax);
    if (pool.length < 2 && req.level) {
      relax.level = true;
      pool = filterPool(list, req, relax);
    }
    if (pool.length < 2 && req.equipment && req.equipment.length) {
      relax.equipment = true;
      pool = filterPool(list, req, relax);
    }
    if (pool.length < 2 && req.muscles && req.muscles.length) {
      relax.muscle = true;
      pool = filterPool(list, req, relax);
    }
    var scored = pool.map(function (e) {
      return { entry: e, score: scoreEntry(e, req) };
    });
    var picked = pickDiverse(scored, need);
    var satisfied = !relax.muscle && !relax.equipment && picked.length >= Math.min(3, need);
    if (picked.length === 0) {
      return {
        request: req,
        satisfied: false,
        closest: false,
        notice: 'אין במאגר סרטון שמתאים לבקשה הזו. אפשר לנסות קבוצת שריר אחרת, או להוסיף סרטון במסך ניהול מאגר.',
        workout: null,
        explanation: null,
        analysis: null
      };
    }

    var warmup = findWarmup(list);
    var mainEx = picked.map(function (e) { return toExercise(e, rx); });
    var warmEx = [];
    if (warmup && foldName(warmup) !== foldName(picked[0]) && isPlayable(warmup)) {
      warmEx.push({
        name: warmup.he,
        id: warmup.id,
        sets: 1,
        reps: null,
        duration_seconds: 180,
        rest_seconds: null,
        notes: null
      });
    }

    var title = req.focus === 'full' ? 'אימון גוף מלא'
      : req.focus === 'arms' ? 'אימון ידיים'
      : req.focus && Infer.MUSCLE_LABELS[req.focus] ? ('אימון ' + Infer.MUSCLE_LABELS[req.focus])
      : 'אימון מהמאגר';
    if (req.durationSpecified) title += ' · ' + req.duration + ' דקות';

    var workout = {
      title: title,
      duration_minutes: req.duration,
      participants: 1,
      equipment: (req.equipment || []).map(function (e) { return Infer.EQ_LABELS[e] || e; }),
      intensity: req.goal === 'strength' ? 'high' : (req.level === 'beginner' ? 'low' : 'medium'),
      tags: [req.focus || 'general', req.goal || 'catalog'].filter(Boolean),
      goal: req.goal || null,
      phases: [
        { name: 'Warm-up', duration_minutes: 5, exercises: warmEx },
        { name: 'Main', duration_minutes: Math.max(5, (req.duration || 20) - 10), exercises: mainEx },
        { name: 'Cool-down', duration_minutes: 0, exercises: [] }
      ],
      source: 'prompt-engine'
    };

    var analysis = Analyzer.analyzeSession(workout);
    var reasons = picked.map(function (e) {
      return { id: e.id, he: e.he, why: whyChosen(e, req), source: e.source || 'local' };
    });
    var explanation = {
      type: typeLabel(req, analysis),
      primary: analysis.primary,
      secondary: analysis.secondary,
      stimulus: analysis.stimulus,
      reasons: reasons,
      flags: analysis.flags,
      volume: analysis.volume,
      pushPull: analysis.pushPull
    };

    return {
      request: req,
      satisfied: satisfied,
      closest: !satisfied,
      notice: closestNotice(req, relax, picked),
      workout: workout,
      explanation: explanation,
      analysis: analysis
    };
  }

  var api = { buildSession: buildSession, scoreEntry: scoreEntry };
  root.THEngine = api;
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : this);
