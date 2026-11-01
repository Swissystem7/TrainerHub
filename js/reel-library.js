/**
 * Instagram reel exercise library + workout draft.
 * Classic script, no bundler. Browser: window.THReels. Node: module.exports.
 *
 * The catalog lives in data/exercises.json. Mapping details stay
 * verified:false until someone checks them against the video.
 * «לא מצוין» is stored as «לא ממוין». Reels with no mapping stay unclassified.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.THReels = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var STORAGE_WORKOUTS = 'trainerhub_reel_workouts';
  var STORAGE_DRAFT = 'trainerhub_reel_draft';

  var MUSCLE_GROUPS = ['ליבה', 'חזה', 'גב', 'רגליים/ישבן', 'גוף מלא/HIIT', 'מוביליטי', 'אחר', 'לא ממוין'];
  var UNKNOWN_MUSCLE = 'לא ממוין';
  var UNKNOWN_SETS = 'לא ממוין';
  var UNCLASSIFIED_NAME = 'ריל לא ממוין';

  var REQUIRED_KEYS = [
    'id', 'name_he', 'muscle_group', 'secondary_group', 'muscle_detail',
    'sets', 'reps', 'sets_reps', 'equipment', 'steps_he', 'source_url', 'creator',
    'poster', 'verified', 'source_title', 'source_muscle_group', 'source_muscle_label',
    'source_sets_reps', 'source_notes'
  ];

  function isObject(v) {
    return !!v && typeof v === 'object' && !Array.isArray(v);
  }

  function shortcodeFromId(id) {
    var m = /^ig-([A-Za-z0-9_-]+)$/.exec(String(id || ''));
    return m ? m[1] : '';
  }

  function validateLibrary(data) {
    var errors = [];
    function err(path, message) {
      errors.push(path + ': ' + message);
    }
    if (!isObject(data)) {
      err('$', 'הקובץ חייב להיות אובייקט');
      return { ok: false, errors: errors };
    }
    if (data.schema_version !== 1) err('schema_version', 'חייב להיות 1');
    if (!Array.isArray(data.muscle_groups)) err('muscle_groups', 'חייב להיות מערך');
    else {
      MUSCLE_GROUPS.forEach(function (group) {
        if (data.muscle_groups.indexOf(group) === -1) err('muscle_groups', 'חסרה קבוצה «' + group + '»');
      });
    }
    if (data.unknown_muscle_group !== UNKNOWN_MUSCLE) err('unknown_muscle_group', 'חייב להיות «' + UNKNOWN_MUSCLE + '»');
    if (data.unknown_sets_reps !== UNKNOWN_SETS) err('unknown_sets_reps', 'חייב להיות «' + UNKNOWN_SETS + '»');
    if (data.unclassified_name_he !== UNCLASSIFIED_NAME) err('unclassified_name_he', 'חייב להיות «' + UNCLASSIFIED_NAME + '»');
    if (!Array.isArray(data.exercises) || !data.exercises.length) {
      err('exercises', 'חייב להיות מערך לא ריק');
      return { ok: false, errors: errors };
    }
    var seen = {};
    data.exercises.forEach(function (ex, i) {
      var path = 'exercises[' + i + ']';
      if (!isObject(ex)) {
        err(path, 'חייב להיות אובייקט');
        return;
      }
      REQUIRED_KEYS.forEach(function (key) {
        if (!Object.prototype.hasOwnProperty.call(ex, key)) err(path + '.' + key, 'שדה חסר');
      });
      var code = shortcodeFromId(ex.id);
      if (!code) err(path + '.id', 'מזהה חייב להיות ig-<shortcode>');
      else if (seen[ex.id]) err(path + '.id', 'מזהה כפול ' + ex.id);
      else seen[ex.id] = true;
      var reelUrl = 'https://www.instagram.com/reel/' + code + '/';
      var postUrl = 'https://www.instagram.com/p/' + code + '/';
      if (code && ex.source_url !== reelUrl && ex.source_url !== postUrl) {
        err(path + '.source_url', 'חייב להיות ' + reelUrl + ' או ' + postUrl);
      }
      if (typeof ex.creator !== 'string' || !ex.creator.trim() || /^@/.test(ex.creator) || /\s/.test(ex.creator)) {
        err(path + '.creator', 'שם משתמש בלי @ ובלי רווחים');
      }
      if (MUSCLE_GROUPS.indexOf(ex.muscle_group) === -1) {
        err(path + '.muscle_group', 'קבוצה לא מוכרת');
      }
      if (typeof ex.secondary_group !== 'string') err(path + '.secondary_group', 'מחרוזת');
      else if (ex.secondary_group) {
        ex.secondary_group.split(' · ').forEach(function (part) {
          if (MUSCLE_GROUPS.indexOf(part) === -1) err(path + '.secondary_group', 'קבוצה לא מוכרת «' + part + '»');
          if (part === ex.muscle_group) err(path + '.secondary_group', 'חוזר על קבוצת השריר הראשית');
        });
      }
      if (typeof ex.muscle_detail !== 'string') err(path + '.muscle_detail', 'מחרוזת');
      if (typeof ex.source_muscle_label !== 'string') err(path + '.source_muscle_label', 'מחרוזת');
      if (ex.sets !== null && (!Number.isInteger(ex.sets) || ex.sets < 1)) {
        err(path + '.sets', 'מספר שלם חיובי או null');
      }
      if (typeof ex.reps !== 'string') err(path + '.reps', 'מחרוזת');
      if (typeof ex.sets_reps !== 'string' || !ex.sets_reps.trim()) err(path + '.sets_reps', 'מחרוזת לא ריקה');
      if (typeof ex.equipment !== 'string') err(path + '.equipment', 'מחרוזת');
      if (typeof ex.name_he !== 'string' || !ex.name_he.trim()) err(path + '.name_he', 'שם בעברית');
      if (!Array.isArray(ex.steps_he) || ex.steps_he.some(function (step) { return typeof step !== 'string' || !step.trim(); })) {
        err(path + '.steps_he', 'מערך מחרוזות לא ריקות');
      }
      if (typeof ex.poster !== 'string' || ex.poster.indexOf('..') !== -1 || /^([a-z]+:|\/)/i.test(ex.poster)) {
        err(path + '.poster', 'נתיב יחסי בתוך המאגר, או ריק');
      }
      if (ex.poster_uncertain != null && typeof ex.poster_uncertain !== 'boolean') {
        err(path + '.poster_uncertain', 'בוליאני');
      }
      if (ex.poster_uncertain === true && !ex.poster) {
        err(path + '.poster_uncertain', 'איור לא ודאי דורש קובץ פוסטר');
      }
      if (typeof ex.verified !== 'boolean') err(path + '.verified', 'בוליאני');
      ['source_title', 'source_muscle_group', 'source_sets_reps', 'source_notes'].forEach(function (key) {
        if (typeof ex[key] !== 'string') err(path + '.' + key, 'מחרוזת');
      });
      if (typeof ex.source_sets_reps === 'string' && ex.source_sets_reps.indexOf('לא מצוין') !== -1) {
        if (ex.sets !== null) err(path + '.sets', '«לא מצוין» נשאר בלי סטים');
        if (ex.reps !== '') err(path + '.reps', '«לא מצוין» נשאר בלי חזרות');
        if (ex.sets_reps !== UNKNOWN_SETS) err(path + '.sets_reps', '«לא מצוין» מוצג כ«' + UNKNOWN_SETS + '»');
      }
      if (!ex.source_title) {
        if (ex.name_he !== UNCLASSIFIED_NAME) err(path + '.name_he', 'בלי מקור השם נשאר «' + UNCLASSIFIED_NAME + '»');
        if (ex.muscle_group !== UNKNOWN_MUSCLE) err(path + '.muscle_group', 'בלי מקור הקבוצה נשארת «' + UNKNOWN_MUSCLE + '»');
        if (ex.sets !== null || ex.reps !== '' || ex.sets_reps !== UNKNOWN_SETS || ex.equipment !== '' || (ex.steps_he && ex.steps_he.length)) {
          err(path, 'בלי מקור לא ממלאים סטים, ציוד או שלבים');
        }
      }
      if (ex.verified === true && (ex.name_he === UNCLASSIFIED_NAME || !ex.source_title)) {
        err(path + '.verified', 'אימות דורש שם ומקור');
      }
    });
    return { ok: errors.length === 0, errors: errors };
  }

  function normalizeQuery(q) {
    return String(q || '').trim().toLowerCase();
  }

  function haystack(ex) {
    return [
      ex.name_he, ex.creator, ex.id, ex.muscle_group, ex.secondary_group, ex.muscle_detail,
      ex.equipment, ex.sets_reps, ex.source_title, ex.source_notes, (ex.steps_he || []).join(' ')
    ].join(' ').toLowerCase();
  }

  function filterExercises(exercises, opts) {
    opts = opts || {};
    var muscle = opts.muscle || '';
    var q = normalizeQuery(opts.query);
    return (exercises || []).filter(function (ex) {
      if (!ex) return false;
      if (muscle && ex.muscle_group !== muscle && String(ex.secondary_group || '').split(' · ').indexOf(muscle) === -1) return false;
      if (q && haystack(ex).indexOf(q) === -1) return false;
      return true;
    });
  }

  function displayName(ex) {
    if (!ex) return '';
    if (ex.name_he && ex.name_he !== UNCLASSIFIED_NAME) return ex.name_he;
    return UNCLASSIFIED_NAME;
  }

  function emptyDraft(title) {
    return { title: title || '', savedId: '', items: [] };
  }

  function cloneDraft(draft) {
    return {
      title: draft && draft.title ? String(draft.title) : '',
      savedId: draft && draft.savedId ? String(draft.savedId) : '',
      items: (draft && draft.items || []).map(function (item) {
        return {
          exerciseId: item.exerciseId,
          name_he: item.name_he,
          muscle_group: item.muscle_group,
          sets: item.sets == null || item.sets === '' ? null : Number(item.sets),
          reps: item.reps == null ? '' : String(item.reps),
          equipment: item.equipment || '',
          source_url: item.source_url || '',
          creator: item.creator || '',
          poster: item.poster || '',
          poster_uncertain: !!item.poster_uncertain,
          steps_he: Array.isArray(item.steps_he) ? item.steps_he.slice() : []
        };
      })
    };
  }

  function addToDraft(draft, exercise) {
    var next = cloneDraft(draft || emptyDraft());
    if (!exercise || !exercise.id) return next;
    if (next.items.some(function (item) { return item.exerciseId === exercise.id; })) return next;
    next.items.push({
      exerciseId: exercise.id,
      name_he: exercise.name_he,
      muscle_group: exercise.muscle_group,
      sets: exercise.sets == null ? null : exercise.sets,
      reps: exercise.reps || '',
      equipment: exercise.equipment || '',
      source_url: exercise.source_url,
      creator: exercise.creator,
      poster: exercise.poster || '',
      poster_uncertain: !!exercise.poster_uncertain,
      steps_he: Array.isArray(exercise.steps_he) ? exercise.steps_he.slice() : []
    });
    return next;
  }

  function updateDraftItem(draft, exerciseId, patch) {
    var next = cloneDraft(draft || emptyDraft());
    patch = patch || {};
    next.items.forEach(function (item) {
      if (item.exerciseId !== exerciseId) return;
      if (Object.prototype.hasOwnProperty.call(patch, 'sets')) {
        if (patch.sets === '' || patch.sets == null) item.sets = null;
        else {
          var n = Number(patch.sets);
          item.sets = Number.isInteger(n) && n >= 1 ? n : item.sets;
        }
      }
      if (Object.prototype.hasOwnProperty.call(patch, 'reps')) item.reps = String(patch.reps == null ? '' : patch.reps);
    });
    return next;
  }

  function removeFromDraft(draft, exerciseId) {
    var next = cloneDraft(draft || emptyDraft());
    next.items = next.items.filter(function (item) { return item.exerciseId !== exerciseId; });
    return next;
  }

  var TONE = {
    'ליבה': 'core',
    'חזה': 'chest',
    'גב': 'back',
    'רגליים/ישבן': 'legs',
    'גוף מלא/HIIT': 'hiit',
    'מוביליטי': 'mobility',
    'אחר': 'other',
    'לא ממוין': 'unknown'
  };

  var ICON = {
    'הכל': '<rect x="3" y="3" width="7" height="7" rx="1.6" fill="none" stroke="currentColor" stroke-width="1.7"/><rect x="14" y="3" width="7" height="7" rx="1.6" fill="none" stroke="currentColor" stroke-width="1.7"/><rect x="3" y="14" width="7" height="7" rx="1.6" fill="none" stroke="currentColor" stroke-width="1.7"/><rect x="14" y="14" width="7" height="7" rx="1.6" fill="none" stroke="currentColor" stroke-width="1.7"/>',
    'ליבה': '<circle cx="12" cy="12" r="3" fill="currentColor"/><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.7"/>',
    'חזה': '<path d="M4 10c2-4 6-4 8 0 2-4 6-4 8 0 0 6-4 10-8 10S4 16 4 10z" fill="currentColor"/>',
    'גב': '<path d="M7 4.5v15M12 4.5v15M17 4.5v15" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    'רגליים/ישבן': '<path d="M8 3.5c2.2 4 2.2 8.5 0 17M16 3.5c-2.2 4-2.2 8.5 0 17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    'גוף מלא/HIIT': '<path d="M13 2 6 13h5l-1 9 8-12h-5l0-8z" fill="currentColor"/>',
    'מוביליטי': '<path d="M3 15c2.5-6 4.5 5 8 0s5 6 7 0" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>',
    'אחר': '<circle cx="6" cy="12" r="1.7" fill="currentColor"/><circle cx="12" cy="12" r="1.7" fill="currentColor"/><circle cx="18" cy="12" r="1.7" fill="currentColor"/>',
    'לא ממוין': '<circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.7" stroke-dasharray="2.4 2.6"/>'
  };

  function toneName(muscle) {
    return TONE[muscle] || 'unknown';
  }

  function muscleIcon(muscle) {
    var key = muscle && ICON[muscle] ? muscle : 'הכל';
    return '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">' + ICON[key] + '</svg>';
  }

  function reelCode(ex) {
    var id = ex && (ex.id || ex.exerciseId) || '';
    var match = /^ig-([A-Za-z0-9_-]+)$/.exec(String(id));
    return match ? match[1] : '';
  }

  // Drop a file at assets/posters/<reel_id>.png or .jpg and the card picks it up.
  // An explicit poster field wins when it is set.
  function posterSources(ex) {
    ex = ex || {};
    if (ex.poster) return { primary: ex.poster, secondary: '' };
    var code = reelCode(ex);
    if (!code) return { primary: '', secondary: '' };
    return {
      primary: 'assets/posters/' + code + '.png',
      secondary: 'assets/posters/' + code + '.jpg'
    };
  }

  function posterFrameHtml(ex, esc, thumb) {
    esc = esc || function (s) { return String(s == null ? '' : s); };
    var muscle = (ex && ex.muscle_group) || UNKNOWN_MUSCLE;
    var src = posterSources(ex || {});
    var img = src.primary
      ? '<img class="poster" alt="" src="' + esc(src.primary) + '"' +
        (src.secondary ? ' data-jpg="' + esc(src.secondary) + '"' : '') + '>'
      : '';
    var badge = thumb ? '' : '<span class="muscle-badge">' + muscleIcon(muscle) + esc(muscle) + '</span>';
    var indexNo = (!thumb && ex && ex._index) ? '<span class="card-index">' + esc(twoDigit(ex._index)) + '</span>' : '';
    var uncertain = (!thumb && ex && ex.poster_uncertain)
      ? '<span class="uncertain-flag">איור לא ודאי</span>'
      : (thumb && ex && ex.poster_uncertain ? '<span class="uncertain-dot" title="איור לא ודאי"></span>' : '');
    return '<div class="poster-frame tone-' + toneName(muscle) + (thumb ? ' is-thumb' : '') + '">' +
      img +
      '<div class="poster-fallback">' + muscleIcon(muscle) + '<span>' + esc(muscle) + '</span></div>' +
      badge + indexNo + uncertain +
      '</div>';
  }

  function twoDigit(n) {
    var s = String(n);
    return s.length < 2 ? '0' + s : s;
  }

  function groupByMuscle(list) {
    var buckets = {};
    (list || []).forEach(function (ex) {
      if (!ex) return;
      var key = ex.muscle_group || UNKNOWN_MUSCLE;
      if (!buckets[key]) buckets[key] = [];
      buckets[key].push(ex);
    });
    return MUSCLE_GROUPS.filter(function (group) {
      return buckets[group] && buckets[group].length;
    }).map(function (group) {
      return { muscle: group, tone: toneName(group), exercises: buckets[group] };
    });
  }

  function draftSections(draft) {
    return groupByMuscle((draft && draft.items) || []).map(function (section) {
      return { muscle: section.muscle, tone: section.tone, items: section.exercises };
    });
  }

  function moveDraftInSection(draft, exerciseId, delta) {
    var next = cloneDraft(draft || emptyDraft());
    var index = -1;
    next.items.forEach(function (item, i) { if (item.exerciseId === exerciseId) index = i; });
    if (index < 0) return next;
    var muscle = next.items[index].muscle_group;
    var indexes = [];
    next.items.forEach(function (item, i) {
      if (item.muscle_group === muscle) indexes.push(i);
    });
    var pos = indexes.indexOf(index);
    var dest = pos + delta;
    if (dest < 0 || dest >= indexes.length) return next;
    var swapAt = indexes[dest];
    var held = next.items[index];
    next.items[index] = next.items[swapAt];
    next.items[swapAt] = held;
    return next;
  }

  function insertDraftItem(draft, exerciseId, beforeId) {
    var next = cloneDraft(draft || emptyDraft());
    var from = -1;
    var to = -1;
    next.items.forEach(function (item, i) {
      if (item.exerciseId === exerciseId) from = i;
      if (item.exerciseId === beforeId) to = i;
    });
    if (from < 0 || to < 0 || from === to) return next;
    if (next.items[from].muscle_group !== next.items[to].muscle_group) return next;
    var moving = next.items.splice(from, 1)[0];
    to = -1;
    next.items.forEach(function (item, i) { if (item.exerciseId === beforeId) to = i; });
    if (to < 0) next.items.push(moving);
    else next.items.splice(to, 0, moving);
    return next;
  }

  function moveDraftItem(draft, exerciseId, delta) {
    var next = cloneDraft(draft || emptyDraft());
    var index = -1;
    next.items.forEach(function (item, i) { if (item.exerciseId === exerciseId) index = i; });
    if (index < 0) return next;
    var target = index + delta;
    if (target < 0 || target >= next.items.length) return next;
    var swap = next.items[index];
    next.items[index] = next.items[target];
    next.items[target] = swap;
    return next;
  }

  function newId() {
    return 'rw_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
  }

  function draftToWorkout(draft, opts) {
    opts = opts || {};
    var source = cloneDraft(draft || emptyDraft());
    var title = String(opts.title != null ? opts.title : source.title || '').trim() || 'אימון מהספרייה';
    return {
      id: opts.id || source.savedId || newId(),
      title: title,
      savedAt: opts.savedAt || new Date().toISOString(),
      exercises: source.items.map(function (item) {
        return {
          exerciseId: item.exerciseId,
          name_he: item.name_he,
          muscle_group: item.muscle_group,
          sets: item.sets,
          reps: item.reps,
          equipment: item.equipment,
          source_url: item.source_url,
          creator: item.creator,
          steps_he: item.steps_he
        };
      })
    };
  }

  function toPhasesWorkout(workout) {
    workout = workout || { title: 'אימון מהספרייה', exercises: [] };
    var main = (workout.exercises || []).map(function (item) {
      var notes = [];
      if (item.creator) notes.push('@' + item.creator);
      if (item.source_url) notes.push(item.source_url);
      if (item.steps_he && item.steps_he.length) notes.push(item.steps_he.join(' · '));
      return {
        name: item.name_he || UNCLASSIFIED_NAME,
        id: item.exerciseId,
        sets: item.sets == null ? null : item.sets,
        reps: item.reps ? item.reps : null,
        duration_seconds: null,
        rest_seconds: null,
        notes: notes.join(' · ') || null
      };
    });
    return {
      title: workout.title || 'אימון מהספרייה',
      duration_minutes: Math.max(20, main.length * 4),
      participants: 1,
      equipment: [],
      intensity: 'medium',
      tags: ['reel-library'],
      phases: [
        { name: 'Warm-up', duration_minutes: 5, exercises: [] },
        { name: 'Main', duration_minutes: Math.max(10, main.length * 4), exercises: main },
        { name: 'Cool-down', duration_minutes: 5, exercises: [] }
      ]
    };
  }

  function toDailyProgram(workouts) {
    var days = (workouts || []).filter(function (w) { return w && Array.isArray(w.exercises) && w.exercises.length; });
    return {
      programId: 'reel_week',
      durationWeeks: 1,
      source: 'reel-library',
      dailyWorkouts: days.map(function (w, i) {
        return {
          day: i + 1,
          split: '',
          title: w.title || ('אימון ' + (i + 1)),
          exercises: w.exercises.map(function (item) {
            return {
              id: item.exerciseId,
              name: item.name_he || UNCLASSIFIED_NAME,
              sets: item.sets == null ? null : item.sets,
              reps: item.reps || null,
              rest_seconds: null,
              notes: item.source_url || null
            };
          })
        };
      })
    };
  }

  function memoryFallback() {
    var mem = {};
    return {
      get: function (key, fallback) {
        return Object.prototype.hasOwnProperty.call(mem, key) ? mem[key] : fallback;
      },
      set: function (key, val) { mem[key] = val; return true; }
    };
  }

  function browserStore() {
    var ls = null;
    try { ls = globalThis.localStorage; } catch (e) { ls = null; }
    if (!ls) return memoryFallback();
    return {
      get: function (key, fallback) {
        try {
          var raw = ls.getItem(key);
          if (raw == null || raw === '') return fallback;
          return JSON.parse(raw);
        } catch (e) { return fallback; }
      },
      set: function (key, val) {
        try {
          ls.setItem(key, JSON.stringify(val));
          return true;
        } catch (e) { return false; }
      }
    };
  }

  function storeOf(store) {
    if (store && typeof store.get === 'function' && typeof store.set === 'function') return store;
    if (globalThis.TH && globalThis.TH.store) return globalThis.TH.store;
    return browserStore();
  }

  function loadWorkouts(store) {
    var list = storeOf(store).get(STORAGE_WORKOUTS, []);
    return Array.isArray(list) ? list : [];
  }

  function saveWorkouts(list, store) {
    var clean = (list || []).filter(function (w) { return w && w.id && Array.isArray(w.exercises); });
    return storeOf(store).set(STORAGE_WORKOUTS, clean);
  }

  function upsertWorkout(workout, store) {
    if (!workout || !workout.id) return loadWorkouts(store);
    var list = loadWorkouts(store);
    var idx = -1;
    list.forEach(function (w, i) { if (w && w.id === workout.id) idx = i; });
    if (idx >= 0) list[idx] = workout;
    else list.push(workout);
    saveWorkouts(list, store);
    return list;
  }

  function removeWorkout(id, store) {
    var list = loadWorkouts(store).filter(function (w) { return w.id !== id; });
    saveWorkouts(list, store);
    return list;
  }

  function loadDraft(store) {
    var draft = storeOf(store).get(STORAGE_DRAFT, null);
    if (!draft || !Array.isArray(draft.items)) return emptyDraft();
    return cloneDraft(draft);
  }

  function saveDraft(draft, store) {
    var clean = cloneDraft(draft || emptyDraft());
    storeOf(store).set(STORAGE_DRAFT, clean);
    return clean;
  }

  function clearDraft(store) {
    var empty = emptyDraft();
    storeOf(store).set(STORAGE_DRAFT, empty);
    return empty;
  }

  function exerciseCardHtml(ex, esc) {
    esc = esc || function (s) { return String(s == null ? '' : s); };
    var steps = (ex.steps_he || []).map(function (step) {
      return '<li>' + esc(step) + '</li>';
    }).join('');
    var stepsHtml = steps ? '<ol class="steps">' + steps + '</ol>' : '';
    var equipment = ex.equipment ? '<span class="pill">' + esc(ex.equipment) + '</span>' : '';
    var secondary = ex.secondary_group ? '<span class="pill">' + esc(ex.secondary_group) + '</span>' : '';
    var detail = ex.muscle_detail ? '<span class="pill">' + esc(ex.muscle_detail) + '</span>' : '';
    var flag = ex.verified ? '<span class="pill ok">מאומת</span>' : '<span class="pill unverified">לא מאומת</span>';
    var watchLabel = /\/p\//.test(ex.source_url || '') ? 'צפייה בפוסט' : 'צפייה בריל';
    var added = ex._added ? ' aria-pressed="true"' : ' aria-pressed="false"';
    var addLabel = ex._added ? 'נוסף לאימון' : 'הוסף לאימון';
    return '<article class="card tone-' + toneName(ex.muscle_group) + '" data-id="' + esc(ex.id) + '" draggable="true">' +
      posterFrameHtml(ex, esc, false) +
      '<div class="card-body">' +
        '<div class="card-kicker">' + flag + '<span class="pill tone">' + muscleIcon(ex.muscle_group) + esc(ex.muscle_group) + '</span></div>' +
        '<h2>' + esc(displayName(ex)) + '</h2>' +
        '<p class="creator"><a href="' + esc(ex.source_url) + '" target="_blank" rel="noopener noreferrer">@' + esc(ex.creator) + '</a></p>' +
        '<div class="meta">' +
          '<span class="pill">' + esc(ex.sets_reps) + '</span>' +
          secondary +
          detail +
          equipment +
        '</div>' +
        stepsHtml +
        '<div class="actions">' +
          '<a class="reel" href="' + esc(ex.source_url) + '" target="_blank" rel="noopener noreferrer">' + watchLabel + '</a>' +
          '<button type="button" class="add" data-add="' + esc(ex.id) + '"' + added + '>' + addLabel + '</button>' +
        '</div>' +
      '</div>' +
    '</article>';
  }

  return {
    STORAGE_WORKOUTS: STORAGE_WORKOUTS,
    STORAGE_DRAFT: STORAGE_DRAFT,
    MUSCLE_GROUPS: MUSCLE_GROUPS,
    UNKNOWN_MUSCLE: UNKNOWN_MUSCLE,
    UNKNOWN_SETS: UNKNOWN_SETS,
    UNCLASSIFIED_NAME: UNCLASSIFIED_NAME,
    REQUIRED_KEYS: REQUIRED_KEYS,
    validateLibrary: validateLibrary,
    filterExercises: filterExercises,
    displayName: displayName,
    emptyDraft: emptyDraft,
    addToDraft: addToDraft,
    updateDraftItem: updateDraftItem,
    removeFromDraft: removeFromDraft,
    moveDraftItem: moveDraftItem,
    draftToWorkout: draftToWorkout,
    toPhasesWorkout: toPhasesWorkout,
    toDailyProgram: toDailyProgram,
    loadWorkouts: loadWorkouts,
    saveWorkouts: saveWorkouts,
    upsertWorkout: upsertWorkout,
    removeWorkout: removeWorkout,
    loadDraft: loadDraft,
    saveDraft: saveDraft,
    clearDraft: clearDraft,
    exerciseCardHtml: exerciseCardHtml,
    toneName: toneName,
    muscleIcon: muscleIcon,
    posterSources: posterSources,
    posterFrameHtml: posterFrameHtml,
    groupByMuscle: groupByMuscle,
    draftSections: draftSections,
    moveDraftInSection: moveDraftInSection,
    insertDraftItem: insertDraftItem
  };
});
