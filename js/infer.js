/**
 * Hebrew exercise-name inference — muscles, equipment, level, pattern, load.
 * Used by the Drive catalog, library manager, analyzer, and prompt parser.
 * Classic script, no bundler. Namespace: window.THInfer
 */
(function (root) {
  'use strict';

  var MUSCLES = ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'legs', 'core'];
  var LEVELS = ['beginner', 'intermediate', 'advanced'];
  var PATTERNS = ['push', 'pull', 'core', 'hinge', 'squat', 'plyo'];
  var LOADS = ['time', 'reps'];

  var PERSONAL_RX = /aviran|swissa|אבירן|סוויסה|סויסה|avi[\s_-]?ran/i;
  var ANON_RX = /^VID[_-]/i;

  var MUSCLE_LABELS = {
    chest: 'חזה',
    back: 'גב',
    shoulders: 'כתפיים',
    biceps: 'דו־ראשי',
    triceps: 'תלת־ראשי',
    legs: 'רגליים',
    core: 'ליבה'
  };
  var EQ_LABELS = {
    none: 'משקל גוף',
    band: 'גומיות',
    cones: 'קונוסים',
    ball: 'כדור',
    basketball: 'כדורסל',
    football: 'כדורגל',
    'tennis-ball': 'כדור טניס',
    wall: 'קיר',
    bar: 'מתח',
    stairs: 'מדרגות',
    ladder: 'סולם',
    hoop: 'חישוק',
    dumbbells: 'משקולות',
    barbell: 'מוט',
    machine: 'מכונה'
  };
  var PATTERN_LABELS = {
    push: 'דחיפה',
    pull: 'משיכה',
    core: 'ליבה',
    hinge: 'מפרקי-רגליים',
    squat: 'סקוואט',
    plyo: 'פליומטרי'
  };
  var LEVEL_LABELS = {
    beginner: 'מתחיל',
    intermediate: 'ביניים',
    advanced: 'מתקדם'
  };
  var FOLDER_MUSCLE = {
    'בטן': ['core'],
    'ידיים': ['chest', 'triceps'],
    'גומיות': [],
    'גב': ['back'],
    'רגליים': ['legs']
  };

  function fold(s) {
    return String(s || '')
      .replace(/["״''׳]/g, '')
      .replace(/[־–—]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  function normalizeSynonym(s) {
    var t = fold(s);
    t = t.replace(/סמיכה/g, 'שמיכה');
    t = t.replace(/פלנק/g, 'פלאנק');
    t = t.replace(/מאונטיין קליימר/g, 'מטפס הרים');
    t = t.replace(/mountain climbers?/g, 'מטפס הרים');
    t = t.replace(/פוש[\s\-]?אפס?/g, 'שכיבות שמיכה');
    t = t.replace(/push[\s\-]?ups?/g, 'שכיבות שמיכה');
    t = t.replace(/סייד פלאנק/g, 'פלאנק צידי');
    t = t.replace(/פלאנק צד(?:י)?/g, 'פלאנק צידי');
    t = t.replace(/כפיפות בטן/g, 'בטן');
    t = t.replace(/חתירת משקל גוף/g, 'מתח אוסטרלי');
    return t.replace(/\s+/g, ' ').trim();
  }

  function uniq(list) {
    var out = [];
    var seen = {};
    (list || []).forEach(function (x) {
      if (!x || seen[x]) return;
      seen[x] = true;
      out.push(x);
    });
    return out;
  }

  function isBlockedName(s) {
    var t = String(s || '');
    if (!t.trim()) return false;
    if (ANON_RX.test(t.trim())) return true;
    if (PERSONAL_RX.test(t)) return true;
    return false;
  }

  function inferEquipment(text) {
    var t = fold(text);
    var eq = [];
    if (/גומי/.test(t)) eq.push('band');
    if (/קונוס/.test(t)) eq.push('cones');
    if (/כדורסל/.test(t)) eq.push('basketball');
    if (/כדורגל|פוטבול/.test(t)) eq.push('football');
    if (/טניס/.test(t)) eq.push('tennis-ball');
    if (/חישוק/.test(t)) eq.push('hoop');
    if (/קיר/.test(t)) eq.push('wall');
    if (/סולם/.test(t)) eq.push('ladder');
    if (/מדרג/.test(t)) eq.push('stairs');
    if (/אוסטרל/.test(t) || (/מתח/.test(t) && !/מתחיל/.test(t))) eq.push('bar');
    if (/(?:^| )כדור(?: |$)/.test(t) && eq.indexOf('basketball') === -1 &&
        eq.indexOf('football') === -1 && eq.indexOf('tennis-ball') === -1) {
      eq.push('ball');
    }
    if (/משקולת|משקולות|דאמבל/.test(t)) eq.push('dumbbells');
    if (/מוט|ברבל/.test(t) && eq.indexOf('bar') === -1) eq.push('barbell');
    if (/מכונה|מכון/.test(t) && /במקום/.test(t) === false) eq.push('machine');
    return eq.length ? uniq(eq) : ['none'];
  }

  function inferMuscles(text, folder) {
    var t = fold(text);
    var found = [];

    if (/פלאנק|בטן|ליבה|קראנץ|כפיפ(ות|ת) בטן/.test(t)) found.push('core');
    if (/מטפס/.test(t)) found.push('core');
    if (/גב תחתון|סופרמן|ארקטור/.test(t)) found.push('back');
    if (/חתיר|אוסטרל/.test(t) || (/מתח/.test(t) && !/מתחיל/.test(t))) {
      found.push('back');
      found.push('biceps');
    }
    if (/(?:^| )גב(?: |$)/.test(t) || /וגב|גב ו/.test(t)) found.push('back');
    if (/כתף|כתפי/.test(t)) found.push('shoulders');
    if (/ארבע ראשי|ירכי|סקוואט|מכרע|שוק/.test(t)) found.push('legs');
    if (/ברכי/.test(t) && !/פלאנק/.test(t)) found.push('legs');
    if (/רגל|רגלי|סולם|מדרג/.test(t)) found.push('legs');
    if (/שכיב(ות|ה)|חזה|לחיצ(ת|ה) חזה/.test(t)) found.push('chest');
    if (/דו.?ראש|בייספס|כפיפת מרפק|פטיש/.test(t)) found.push('biceps');
    if (/תלת|טרייספס|דיפס|פשיטת/.test(t)) found.push('triceps');
    if (/ידיים|לחיזוק יד/.test(t) && !/שכיב/.test(t)) {
      found.push('biceps');
      found.push('triceps');
    }
    if (/הליכת חיות/.test(t)) {
      found.push('shoulders');
      found.push('core');
    }
    if (/סוחבות גוף/.test(t)) {
      found.push('chest');
      found.push('shoulders');
      found.push('triceps');
    }
    if (/בעיט/.test(t)) found.push('legs');

    if (!found.length && folder && FOLDER_MUSCLE[folder]) {
      found = FOLDER_MUSCLE[folder].slice();
    }
    if (!found.length && /גומי/.test(t)) {
      found = ['chest', 'back', 'legs', 'core'];
    }
    if (!found.length) found = ['core'];
    return uniq(found);
  }

  function inferSecondary(text, primary, pattern) {
    var t = fold(text);
    var sec = [];
    if (pattern === 'push' || /שכיב/.test(t)) {
      if (primary.indexOf('shoulders') === -1) sec.push('shoulders');
      if (primary.indexOf('triceps') === -1) sec.push('triceps');
      if (primary.indexOf('core') === -1 && /פלאנק|בטן/.test(t) === false) sec.push('core');
    }
    if (pattern === 'pull' || /אוסטרל|חתיר/.test(t) || (/מתח/.test(t) && !/מתחיל/.test(t))) {
      if (primary.indexOf('biceps') === -1) sec.push('biceps');
    }
    if (/פלאנק/.test(t) && primary.indexOf('shoulders') === -1) sec.push('shoulders');
    if (/מטפס/.test(t) && primary.indexOf('legs') === -1) sec.push('legs');
    if (/הליכת חיות/.test(t) && primary.indexOf('chest') === -1) sec.push('chest');
    return uniq(sec.filter(function (m) { return primary.indexOf(m) === -1; }));
  }

  function inferLevel(text) {
    var t = fold(text);
    if (/מתקדמ|advanced/.test(t)) return 'advanced';
    if (/ביניים|intermediate/.test(t)) return 'intermediate';
    if (/מתחיל|beginner/.test(t)) return 'beginner';
    if (/ברכיים|חימום/.test(t)) return 'beginner';
    if (/שעון|כוח|אתגר|אוסטרל/.test(t)) return 'intermediate';
    return 'beginner';
  }

  function inferPattern(text, muscles) {
    var t = fold(text);
    if (/מטפס|בעיט|סולם|קפיצ|בורפי|גאמפינג|ג׳אמפ/.test(t)) return 'plyo';
    if (/שכיב|לחיצ|דיפס|סוחבות|הליכת חיות/.test(t)) return 'push';
    if (/חתיר|אוסטרל|כפיפת|פטיש/.test(t) || (/מתח/.test(t) && !/מתחיל/.test(t))) return 'pull';
    if (/סקוואט|מדרג|מכרע|ארבע ראשי|ישיבה על קיר/.test(t)) return 'squat';
    if (/דדליפט|גב תחתון|סופרמן|הינג/.test(t)) return 'hinge';
    if (/פלאנק|בטן|ליבה|קראנץ/.test(t)) return 'core';
    if (muscles && muscles.length === 1 && muscles[0] === 'core') return 'core';
    if (muscles && muscles.indexOf('legs') !== -1 && muscles.length === 1) return 'squat';
    if (muscles && (muscles.indexOf('chest') !== -1 || muscles.indexOf('triceps') !== -1)) return 'push';
    if (muscles && (muscles.indexOf('back') !== -1 || muscles.indexOf('biceps') !== -1)) return 'pull';
    return 'core';
  }

  function inferLoad(text, pattern) {
    var t = fold(text);
    if (/פלאנק|החזק|ישיבה על קיר|וול סיט|שניות|זמן/.test(t)) return 'time';
    if (pattern === 'core' && /סט|חזרות/.test(t) === false && /פלאנק/.test(t)) return 'time';
    if (/פלאנק/.test(t)) return 'time';
    return 'reps';
  }

  function inferFromName(he, extras) {
    extras = extras || {};
    var blob = String(he || '') + ' ' + String(extras.folder || '') + ' ' + String(extras.hint || '');
    var muscles = inferMuscles(blob, extras.folder);
    var equipment = inferEquipment(blob);
    if (extras.folder === 'גומיות' && equipment.indexOf('band') === -1) {
      equipment = ['band'];
    }
    var level = inferLevel(blob);
    var pattern = inferPattern(blob, muscles);
    var load = inferLoad(blob, pattern);
    var secondary = inferSecondary(blob, muscles, pattern);
    return {
      he: String(he || '').trim(),
      muscles: muscles,
      secondary: secondary,
      equipment: equipment,
      level: level,
      pattern: pattern,
      load: load
    };
  }

  function parseDriveId(input) {
    var s = String(input || '').trim();
    if (!s) return null;
    var m = s.match(/\/file\/d\/([a-zA-Z0-9_-]{20,})/) ||
      s.match(/[?&]id=([a-zA-Z0-9_-]{20,})/) ||
      s.match(/\/d\/([a-zA-Z0-9_-]{20,})/);
    if (m) return m[1];
    if (/^[a-zA-Z0-9_-]{25,}$/.test(s)) return s;
    return null;
  }

  function parseYouTubeId(input) {
    var s = String(input || '').trim();
    if (!s) return null;
    var m = s.match(/[?&]v=([a-zA-Z0-9_-]{11})/) ||
      s.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/) ||
      s.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/) ||
      s.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/);
    return m ? m[1] : null;
  }

  function parseInstagramUrl(input) {
    var s = String(input || '').trim();
    if (!s) return null;
    var m = s.match(/https?:\/\/(?:www\.)?instagram\.com\/(?:p|reel|reels|tv)\/[A-Za-z0-9_-]+\/?/i);
    if (m) return m[0];
    if (/instagram\.com/i.test(s) && /^https?:\/\//i.test(s)) return s;
    return null;
  }

  function detectSource(input) {
    if (parseDriveId(input)) return 'drive';
    if (parseYouTubeId(input)) return 'youtube';
    if (parseInstagramUrl(input)) return 'link';
    return 'unknown';
  }

  function slugHe(he) {
    return String(he || '')
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^\u0590-\u05FFa-zA-Z0-9_]/g, '')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '') || 'item';
  }

  function makeId(prefix, he, used) {
    used = used || {};
    var base = (prefix ? prefix + '_' : '') + slugHe(he);
    var id = base;
    var n = 2;
    while (used[id]) {
      id = base + '_' + n;
      n++;
    }
    used[id] = true;
    return id;
  }

  function extractHebrewName(input) {
    var s = String(input || '');
    var he = s.match(/[\u0590-\u05FF][\u0590-\u05FF\s0-9_-]{1,}/g);
    if (!he) return '';
    return he.join(' ').replace(/\s+/g, ' ').trim();
  }

  function proposeEntry(opts) {
    opts = opts || {};
    var raw = String(opts.url || opts.input || '').trim();
    var name = String(opts.name || extractHebrewName(raw) || '').trim();
    if (isBlockedName(name) || isBlockedName(raw)) {
      return { error: 'blocked', message: 'השם חסום — קליפים אנונימיים או שמות אישיים לא נכנסים למאגר.' };
    }
    var source = detectSource(raw);
    var inferred = inferFromName(name, { folder: opts.folder || '', hint: opts.hint || '' });
    if (!name) {
      return {
        error: 'need-name',
        source: source,
        driveId: parseDriveId(raw),
        youtubeId: parseYouTubeId(raw),
        externalUrl: parseInstagramUrl(raw),
        message: 'צריך שם תרגיל בעברית כדי להציע שריר, ציוד ורמה.'
      };
    }
    var entry = {
      id: opts.id || makeId(source === 'unknown' ? 'user' : source, name, opts.used),
      he: name,
      muscles: inferred.muscles,
      equipment: inferred.equipment,
      level: inferred.level,
      source: source === 'unknown' ? 'user' : source,
      folder: opts.folder || ''
    };
    var driveId = parseDriveId(raw);
    var youtubeId = parseYouTubeId(raw);
    var insta = parseInstagramUrl(raw);
    if (driveId) {
      entry.source = 'drive';
      entry.driveId = driveId;
    } else if (youtubeId) {
      entry.source = 'youtube';
      entry.youtubeId = youtubeId;
    } else if (insta) {
      entry.source = 'link';
      entry.externalUrl = insta;
    }
    entry.pattern = inferred.pattern;
    entry.secondary = inferred.secondary;
    entry.load = inferred.load;
    return entry;
  }

  function drivePreviewUrl(id) {
    if (!id) return '';
    return 'https://drive.google.com/file/d/' + id + '/preview';
  }

  function youtubeEmbedUrl(id) {
    if (!id) return '';
    return 'https://www.youtube.com/embed/' + id;
  }

  var api = {
    MUSCLES: MUSCLES,
    LEVELS: LEVELS,
    PATTERNS: PATTERNS,
    LOADS: LOADS,
    MUSCLE_LABELS: MUSCLE_LABELS,
    EQ_LABELS: EQ_LABELS,
    PATTERN_LABELS: PATTERN_LABELS,
    LEVEL_LABELS: LEVEL_LABELS,
    fold: fold,
    normalizeSynonym: normalizeSynonym,
    uniq: uniq,
    isBlockedName: isBlockedName,
    inferFromName: inferFromName,
    inferEquipment: inferEquipment,
    inferMuscles: inferMuscles,
    inferLevel: inferLevel,
    inferPattern: inferPattern,
    inferLoad: inferLoad,
    parseDriveId: parseDriveId,
    parseYouTubeId: parseYouTubeId,
    parseInstagramUrl: parseInstagramUrl,
    detectSource: detectSource,
    extractHebrewName: extractHebrewName,
    slugHe: slugHe,
    makeId: makeId,
    proposeEntry: proposeEntry,
    drivePreviewUrl: drivePreviewUrl,
    youtubeEmbedUrl: youtubeEmbedUrl
  };

  root.THInfer = api;
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
})(typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : this);
