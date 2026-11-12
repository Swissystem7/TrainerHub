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

  var MUSCLE_GROUPS = ['ליבה', 'חזה', 'גב', 'רגליים/ישבן', 'גוף מלא/HIIT', 'מוביליטי', 'אחר', 'השראה', 'לא ממוין'];
  var UNKNOWN_MUSCLE = 'לא ממוין';
  var UNKNOWN_SETS = 'לא ממוין';
  var UNCLASSIFIED_NAME = 'ריל לא ממוין';

  // Drive folder name → existing library group. Folders with no first-class
  // group stay in «אחר» and remain searchable by the folder name.
  var DRIVE_FOLDER_GROUPS = {
    'בטן': 'ליבה',
    'גב': 'גב',
    'רגליים': 'רגליים/ישבן',
    'חזה': 'חזה',
    'כתפיים': 'אחר',
    'ידיים': 'אחר',
    'גוף מלא HIIT': 'גוף מלא/HIIT',
    'גוף מלא/HIIT': 'גוף מלא/HIIT',
    'קרדיו': 'גוף מלא/HIIT',
    'חימום': 'מוביליטי',
    'מתיחות וגמישות': 'מוביליטי',
    'זמן תגובה וקואורדינציה': 'אחר',
    'זמן תגובה וקאורדינצייה': 'אחר'
  };
  var DRIVE_SKIP_FOLDERS = { 'לא קשור': true, 'לבדיקה': true };
  var DRIVE_KEYS = ['fileId', 'name', 'folder', 'muscleGroup'];

  var REQUIRED_KEYS = [
    'id', 'name_he', 'muscle_group', 'secondary_group', 'muscle_detail',
    'sets', 'reps', 'sets_reps', 'equipment', 'steps_he', 'source_url', 'creator',
    'poster', 'equipment_tags', 'verified', 'source_title', 'source_muscle_group', 'source_muscle_label',
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
      if (!Array.isArray(ex.equipment_tags) || ex.equipment_tags.some(function (tag) {
        return ['bodyweight','mat','bench','wall','medicine_ball','resistance_band','mini_band','loop_band','dumbbell','kettlebell','pillow','chair','foam_roller','yoga_blocks','plyo_box','wooden_box','bosu','weight_plate','wooden_dowel','power_rack','water_bottle','soccer_ball','tennis_ball','small_ball','cones','discs','hoops','jump_rope','pullup_bar','towel','sofa','basket','kitchen_floor'].indexOf(tag) === -1;
      })) {
        err(path + '.equipment_tags', 'רשימת תגיות ציוד מהרשימה הסטנדרטית');
      }
      if (typeof ex.verified !== 'boolean') err(path + '.verified', 'בוליאני');
      ['source_title', 'source_muscle_group', 'source_sets_reps', 'source_notes'].forEach(function (key) {
        if (typeof ex[key] !== 'string') err(path + '.' + key, 'מחרוזת');
      });
      if (ex.safety_he != null && typeof ex.safety_he !== 'string') err(path + '.safety_he', 'מחרוזת');
      if (ex.difficulty != null && (!Number.isInteger(ex.difficulty) || ex.difficulty < 1 || ex.difficulty > 3)) {
        err(path + '.difficulty', 'מספר שלם 1–3 או null');
      }
      if (ex.alternatives != null) {
        if (!Array.isArray(ex.alternatives) || ex.alternatives.length > 2) err(path + '.alternatives', 'מערך של עד 2 מזהים');
        else ex.alternatives.forEach(function (altId) {
          var alt = data.exercises.find(function (row) { return row && row.id === altId; });
          if (!alt || altId === ex.id) err(path + '.alternatives', 'מזהה לא קיים בספרייה «' + altId + '»');
          else if (alt.muscle_group !== ex.muscle_group) err(path + '.alternatives', 'חלופה מקבוצת שריר אחרת «' + altId + '»');
        });
      }
      if (ex.verified === true) {
        if (!Array.isArray(ex.steps_he) || ex.steps_he.length < 3 || ex.steps_he.length > 5) err(path + '.steps_he', 'תרגיל מאומת דורש 3–5 שלבי ביצוע');
        if (typeof ex.safety_he !== 'string' || !ex.safety_he.trim()) err(path + '.safety_he', 'תרגיל מאומת דורש דגש בטיחות');
        if (!Number.isInteger(ex.difficulty)) err(path + '.difficulty', 'תרגיל מאומת דורש רמת קושי 1–3');
      }
      if (ex.verified !== true && typeof ex.source_sets_reps === 'string' && ex.source_sets_reps.indexOf('לא מצוין') !== -1) {
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

  // Hebrew vowel marks and cantillation, plus the maqaf/paseq punctuation in that block.
  var NIQQUD = /[\u0591-\u05C7]/g;
  var SEARCH_PUNCT = /["״'`׳.,!?;:()[\]{}<>/\\|@#$%^&*+=~_\-־–—]/g;
  // Names that exist in both languages. Either form should find the row.
  var SEARCH_PAIRS = [
    ['סופרמן', 'superman'],
    ['פלאנק', 'plank'],
    ['פלנק', 'plank']
  ];

  function searchFold(s) {
    return String(s || '')
      .replace(NIQQUD, '')
      .toLowerCase()
      .replace(SEARCH_PUNCT, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function searchHit(blob, q) {
    if (!q) return true;
    if (blob.indexOf(q) !== -1) return true;
    var tightQ = q.replace(/\s+/g, '');
    if (!tightQ) return true;
    return blob.replace(/\s+/g, '').indexOf(tightQ) !== -1;
  }

  function withLanguageAliases(folded) {
    var extra = [];
    var tight = folded.replace(/\s+/g, '');
    SEARCH_PAIRS.forEach(function (pair) {
      var a = searchFold(pair[0]);
      var b = searchFold(pair[1]);
      if (!a || !b) return;
      if (folded.indexOf(a) !== -1 || tight.indexOf(a.replace(/\s+/g, '')) !== -1) extra.push(b);
      if (folded.indexOf(b) !== -1 || tight.indexOf(b.replace(/\s+/g, '')) !== -1) extra.push(a);
    });
    return extra.length ? folded + ' ' + extra.join(' ') : folded;
  }

  function normalizeQuery(q) {
    return searchFold(q);
  }

  function haystack(ex) {
    var folded = searchFold([
      ex.name_he, ex.name, ex.creator, ex.id, ex.folder, ex.file_id, ex.file, ex.muscle_group, ex.secondary_group, ex.muscle_detail,
      ex.equipment, ex.sets_reps, ex.source_title, ex.source_notes, (ex.steps_he || []).join(' ')
    ].join(' '));
    return withLanguageAliases(folded);
  }

  function filterExercises(exercises, opts) {
    opts = opts || {};
    var muscle = opts.muscle || '';
    var q = normalizeQuery(opts.query);
    return (exercises || []).filter(function (ex) {
      if (!ex) return false;
      if (muscle && ex.muscle_group !== muscle && String(ex.secondary_group || '').split(' · ').indexOf(muscle) === -1) return false;
      if (q && !searchHit(haystack(ex), q)) return false;
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
    if (exercise.muscle_group === 'השראה') return next;
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
    'השראה': 'inspire',
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
    'לא ממוין': '<circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.7" stroke-dasharray="2.4 2.6"/>',
    'השראה': '<path d="M12 3.5l1.8 4.2 4.6.4-3.5 3 1.1 4.4L12 13.2 8 15.5l1.1-4.4-3.5-3 4.6-.4L12 3.5z" fill="currentColor"/>'
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

  function youtubeVideoId(ex) {
    ex = ex || {};
    var id = ex.youtubeId || ex.youtube_id || '';
    if (/^[A-Za-z0-9_-]{11}$/.test(id)) return id;
    var src = String(ex.source_url || ex.externalUrl || ex.file || '');
    var match = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/.exec(src);
    return match ? match[1] : '';
  }

  function drivePosterId(ex) {
    ex = ex || {};
    // legacyDriveId is a dead Drive id kept on the row for history. It is not
    // a poster source. driveId is also skipped when the row has a real file.
    if (ex.file_id && driveFileIdOk(ex.file_id)) return ex.file_id;
    if (ex.driveId && driveFileIdOk(ex.driveId)) return ex.driveId;
    var id = String(ex.id || ex.exerciseId || '');
    var match = /^drive-(.+)$/.exec(id);
    if (match && driveFileIdOk(match[1])) return match[1];
    return '';
  }

  // A relative poster is trusted only when the catalog recorded it. Guessing
  // assets/posters/<reel>.png then .jpg asked for files that are not in the
  // repo (two 404s per card). A row with `file` plays that file and must not
  // pick up a Drive thumbnail from driveId or legacyDriveId (those ids 404).
  function posterUrl(ex) {
    ex = ex || {};
    var local = typeof ex.poster === 'string' ? ex.poster.trim() : '';
    if (local && local.indexOf('..') === -1 && !/^([a-z]+:|\/)/i.test(local)) return local;
    var file = typeof ex.file === 'string' ? ex.file.trim() : '';
    if (file) return '';
    var yt = youtubeVideoId(ex);
    if (yt) return 'https://i.ytimg.com/vi/' + yt + '/hqdefault.jpg';
    var drive = drivePosterId(ex);
    if (drive) return 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(drive) + '&sz=w480';
    return '';
  }

  function posterSources(ex) {
    var url = posterUrl(ex);
    return { primary: url, secondary: '' };
  }

  function posterFrameHtml(ex, esc, thumb) {
    esc = esc || function (s) { return String(s == null ? '' : s); };
    var muscle = (ex && ex.muscle_group) || UNKNOWN_MUSCLE;
    var src = posterSources(ex || {});
    // onerror hides a thumbnail the host no longer serves; the fallback stays.
    var img = src.primary
      ? '<img class="poster" alt="" src="' + esc(src.primary) + '" onerror="this.classList.add(\'is-broken\')">'
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

  function driveFileIdOk(fileId) {
    return /^[A-Za-z0-9_-]{8,}$/.test(String(fileId || ''));
  }

  function drivePreviewUrl(fileId) {
    return 'https://drive.google.com/file/d/' + fileId + '/preview';
  }

  function driveThumbUrl(fileId) {
    return 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(fileId || '') + '&sz=w480';
  }

  function driveViewUrl(fileId) {
    return 'https://drive.google.com/file/d/' + fileId + '/view';
  }

  function driveLabel(value) {
    return String(value == null ? '' : value).trim();
  }

  // folder may be a path such as «כושר/חזה». The folder name is the last segment.
  function driveFolderName(value) {
    var label = driveLabel(value);
    if (!label) return '';
    var parts = label.split('/');
    return driveLabel(parts[parts.length - 1]);
  }

  function driveSkipped(row) {
    if (!row) return false;
    var names = [
      driveLabel(row.folder), driveLabel(row.muscleGroup),
      driveFolderName(row.folder), driveFolderName(row.muscleGroup)
    ];
    return names.some(function (name) { return !!DRIVE_SKIP_FOLDERS[name]; });
  }

  function driveMuscleGroup(row) {
    if (!row || driveSkipped(row)) return '';
    var names = [driveFolderName(row.folder), driveFolderName(row.muscleGroup)];
    for (var i = 0; i < names.length; i++) {
      if (DRIVE_FOLDER_GROUPS[names[i]]) return DRIVE_FOLDER_GROUPS[names[i]];
    }
    var given = driveLabel(row.muscleGroup);
    var folder = driveFolderName(row.folder);
    if (MUSCLE_GROUPS.indexOf(given) !== -1) return given;
    if (MUSCLE_GROUPS.indexOf(folder) !== -1) return folder;
    return UNKNOWN_MUSCLE;
  }

  function validateDriveVideos(data) {
    var errors = [];
    function err(path, message) {
      errors.push(path + ': ' + message);
    }
    if (!Array.isArray(data)) {
      err('$', 'הקובץ חייב להיות מערך');
      return { ok: false, errors: errors };
    }
    var seen = {};
    data.forEach(function (row, i) {
      var path = '[' + i + ']';
      if (!isObject(row)) {
        err(path, 'חייב להיות אובייקט');
        return;
      }
      DRIVE_KEYS.forEach(function (key) {
        if (typeof row[key] !== 'string') err(path + '.' + key, 'מחרוזת');
      });
      var fileId = driveLabel(row.fileId);
      if (!driveFileIdOk(fileId)) err(path + '.fileId', 'מזהה Drive לא תקין');
      else if (seen[fileId]) err(path + '.fileId', 'מזהה כפול ' + fileId);
      else seen[fileId] = true;
      if (!driveLabel(row.name)) err(path + '.name', 'שם חסר');
    });
    return { ok: errors.length === 0, errors: errors };
  }

  // Sparse library rows. Name and muscle only — sets, steps, and gear stay
  // empty until a person enriches the entry. Skip folders produce nothing.
  function driveVideosToExercises(data) {
    if (!Array.isArray(data)) return [];
    var seen = {};
    var out = [];
    data.forEach(function (row) {
      if (!isObject(row) || driveSkipped(row)) return;
      var fileId = driveLabel(row.fileId);
      var name = driveLabel(row.name);
      if (!driveFileIdOk(fileId) || !name || seen[fileId]) return;
      var muscle = driveMuscleGroup(row);
      if (!muscle) return;
      seen[fileId] = true;
      out.push({
        id: 'drive-' + fileId,
        source: 'drive',
        file_id: fileId,
        folder: driveLabel(row.folder),
        name_he: name,
        muscle_group: muscle,
        secondary_group: '',
        muscle_detail: '',
        sets: null,
        reps: '',
        sets_reps: '',
        equipment: '',
        equipment_tags: [],
        steps_he: [],
        source_url: driveViewUrl(fileId),
        preview_url: drivePreviewUrl(fileId),
        creator: '',
        poster: '',
        verified: false
      });
    });
    return out;
  }

  function driveCardHtml(ex, esc) {
    var muscle = ex.muscle_group || UNKNOWN_MUSCLE;
    var preview = ex.preview_url || drivePreviewUrl(ex.file_id);
    var view = ex.source_url || driveViewUrl(ex.file_id);
    var added = ex._added ? ' aria-pressed="true"' : ' aria-pressed="false"';
    var addLabel = ex._added ? 'נוסף לאימון' : 'הוסף לאימון';
    // js/core.js opens only players it was told about (load-on-click).
    var core = typeof globalThis !== 'undefined' ? globalThis.TH : null;
    if (core && typeof core.registerFrameSrc === 'function') core.registerFrameSrc(preview);
    var indexNo = ex._index ? '<span class="card-index">' + esc(twoDigit(ex._index)) + '</span>' : '';
    return '<article class="card drive-card tone-' + toneName(muscle) + '" data-id="' + esc(ex.id) + '" draggable="true">' +
      '<div class="poster-frame tone-' + toneName(muscle) + '">' +
        // Load-on-click: the Drive thumbnail with a play button; js/core.js swaps
        // in the preview iframe on click, so 179 Drive players do not load at once.
        '<button type="button" class="drive-frame drive-frame-facade" data-th-frame="' + esc(preview) + '"' +
          ' data-th-frame-allow="autoplay; fullscreen" data-th-frame-title="' + esc(displayName(ex)) + '"' +
          ' aria-label="' + esc('הפעלת סרטון: ' + displayName(ex)) + '">' +
          '<img class="th-facade-thumb is-cover" src="' + esc(driveThumbUrl(ex.file_id)) + '" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.hidden=true">' +
          '<span class="ex-media-play" aria-hidden="true"></span></button>' +
        '<span class="muscle-badge">' + muscleIcon(muscle) + esc(muscle) + '</span>' +
        indexNo +
      '</div>' +
      '<div class="card-body">' +
        '<div class="card-kicker"><span class="pill tone">' + muscleIcon(muscle) + esc(muscle) + '</span></div>' +
        '<h2>' + esc(displayName(ex)) + '</h2>' +
        '<div class="actions">' +
          '<a class="reel" href="' + esc(view) + '" target="_blank" rel="noopener noreferrer">פתיחה ב-Drive</a>' +
          '<button type="button" class="add" data-add="' + esc(ex.id) + '"' + added + '>' + addLabel + '</button>' +
        '</div>' +
      '</div>' +
    '</article>';
  }

  function exerciseCardHtml(ex, esc) {
    esc = esc || function (s) { return String(s == null ? '' : s); };
    if (ex && ex.source === 'drive') return driveCardHtml(ex, esc);
    var steps = (ex.steps_he || []).map(function (step) {
      return '<li>' + esc(step) + '</li>';
    }).join('');
    var stepsHtml = steps ? '<ol class="steps">' + steps + '</ol>' : '';
    var safetyHtml = ex.safety_he ? '<p class="safety"><strong>בטיחות:</strong> ' + esc(ex.safety_he) + '</p>' : '';
    var difficultyLabel = { 1: 'קל', 2: 'בינוני', 3: 'מתקדם' }[ex.difficulty];
    var difficulty = difficultyLabel ? '<span class="pill difficulty">רמת קושי: ' + esc(difficultyLabel) + '</span>' : '';
    var equipment = ex.equipment ? '<span class="pill">' + esc(ex.equipment) + '</span>' : '';
    var secondary = ex.secondary_group ? '<span class="pill">' + esc(ex.secondary_group) + '</span>' : '';
    var detail = ex.muscle_detail ? '<span class="pill">' + esc(ex.muscle_detail) + '</span>' : '';
    var flag = ex.verified ? '<span class="pill ok">מאומת</span>' : '<span class="pill unverified">לא מאומת</span>';
    var watchLabel = /\/p\//.test(ex.source_url || '') ? 'צפייה בפוסט' : 'צפייה בריל';
    var trainable = ex.muscle_group !== 'השראה';
    var added = ex._added ? ' aria-pressed="true"' : ' aria-pressed="false"';
    var addLabel = ex._added ? 'נוסף לאימון' : 'הוסף לאימון';
    var addBtn = trainable
      ? '<button type="button" class="add" data-add="' + esc(ex.id) + '"' + added + '>' + addLabel + '</button>'
      : '<span class="pill">טיפ / השראה</span>';
    return '<article class="card tone-' + toneName(ex.muscle_group) + '" data-id="' + esc(ex.id) + '"' + (trainable ? ' draggable="true"' : '') + '>' +
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
          difficulty +
        '</div>' +
        stepsHtml +
        safetyHtml +
        '<div class="actions">' +
          '<a class="reel" href="' + esc(ex.source_url) + '" target="_blank" rel="noopener noreferrer">' + watchLabel + '</a>' +
          addBtn +
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
    posterUrl: posterUrl,
    posterSources: posterSources,
    posterFrameHtml: posterFrameHtml,
    DRIVE_FOLDER_GROUPS: DRIVE_FOLDER_GROUPS,
    DRIVE_SKIP_FOLDERS: DRIVE_SKIP_FOLDERS,
    DRIVE_KEYS: DRIVE_KEYS,
    drivePreviewUrl: drivePreviewUrl,
    driveViewUrl: driveViewUrl,
    driveMuscleGroup: driveMuscleGroup,
    validateDriveVideos: validateDriveVideos,
    driveVideosToExercises: driveVideosToExercises,
    groupByMuscle: groupByMuscle,
    draftSections: draftSections,
    moveDraftInSection: moveDraftInSection,
    insertDraftItem: insertDraftItem
  };
});
