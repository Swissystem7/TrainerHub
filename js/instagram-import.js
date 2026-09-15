(function (root) {
  'use strict';
  // TrainerHub - Instagram export importer.
  // Pure functions only: no DOM, no network, no randomness, no wall clock.
  // The ONLY data path is the official Instagram data export the owner downloads
  // himself (Settings -> Your activity -> Download your information, format JSON)
  // and picks in the browser. Nothing here logs in, scrapes or posts.
  //
  // Both export layouts are accepted:
  //   legacy : content/posts_1.json
  //   current: your_instagram_activity/media/posts_1.json
  // Each is a JSON array of posts shaped { media: [{ uri, creation_timestamp, title }], title?, creation_timestamp? }.
  // The export carries NO post id, so a deterministic id is derived from
  // creation_timestamp + first media file name (both are stable across re-exports).

  var PHASES = { warm: 'Warm-up', main: 'Main', cool: 'Cool-down' };
  var HEB = 'א-ת';
  var NOT_HEB = '(?![' + HEB + '])';

  var REASONS = {
    no_caption: 'no_caption',
    no_known_exercise: 'no_known_exercise',
    single_mention_no_prescription: 'single_mention_no_prescription',
    duplicate: 'duplicate',
    malformed_post: 'malformed_post'
  };

  var LIMITS = {
    sets: [1, 20],
    reps: [1, 200],
    duration_seconds: [5, 3600],
    rest_seconds: [5, 600],
    default_duration_minutes: 45,
    max_exercises_per_line: 6,
    title_max_chars: 60
  };

  var LAYOUTS = [
    { re: /(^|\/)your_instagram_activity\/media\/posts_\d+\.json$/i, layout: 'current' },
    { re: /(^|\/)content\/posts_\d+\.json$/i, layout: 'legacy' },
    { re: /(^|\/)posts_\d+\.json$/i, layout: 'unknown' }
  ];

  // English aliases for the catalogue ids that are English. Every other entry is
  // matched by its Hebrew .he name only (the catalogue has no .en field).
  var ENGLISH_ALIASES = {
    warmup: ['warm up', 'warm-up', 'warmup'],
    crunches: ['crunches', 'crunch', 'sit ups', 'sit-ups', 'situps'],
    plank: ['plank'],
    superman: ['superman', 'supermans'],
    mountain_climber: ['mountain climbers', 'mountain climber'],
    bodyweight_row: ['bodyweight rows', 'bodyweight row', 'inverted rows', 'inverted row']
  };

  // ---------- text ----------

  // Instagram exports non-ASCII text as UTF-8 bytes escaped one byte per \u00XX
  // (mojibake). Decode when every char is <= 0xFF and the bytes form valid UTF-8.
  function decodeUtf8Bytes(bytes) {
    var out = '', i = 0, n = bytes.length;
    while (i < n) {
      var b = bytes[i];
      if (b < 0x80) { out += String.fromCharCode(b); i += 1; continue; }
      var need, cp;
      if (b >= 0xc2 && b <= 0xdf) { need = 1; cp = b & 0x1f; }
      else if (b >= 0xe0 && b <= 0xef) { need = 2; cp = b & 0x0f; }
      else if (b >= 0xf0 && b <= 0xf4) { need = 3; cp = b & 0x07; }
      else return null;
      if (i + need >= n) return null;
      for (var k = 1; k <= need; k++) {
        var c = bytes[i + k];
        if ((c & 0xc0) !== 0x80) return null;
        cp = (cp << 6) | (c & 0x3f);
      }
      if (cp > 0xffff) {
        cp -= 0x10000;
        out += String.fromCharCode(0xd800 + (cp >> 10), 0xdc00 + (cp & 0x3ff));
      } else {
        out += String.fromCharCode(cp);
      }
      i += need + 1;
    }
    return out;
  }

  function fixText(s) {
    if (typeof s !== 'string') return '';
    var hasHigh = false;
    for (var i = 0; i < s.length; i++) {
      var c = s.charCodeAt(i);
      if (c > 0xff) return s;
      if (c >= 0x80) hasHigh = true;
    }
    if (!hasHigh) return s;
    var bytes = [];
    for (var j = 0; j < s.length; j++) bytes.push(s.charCodeAt(j));
    var decoded = decodeUtf8Bytes(bytes);
    return decoded === null ? s : decoded;
  }

  function hashStr(s) {
    var h = 5381;
    for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return (h >>> 0).toString(16);
  }

  function basename(uri) {
    var parts = String(uri).split(/[\\/]/);
    return parts[parts.length - 1] || String(uri);
  }

  function cleanLine(line) {
    return String(line)
      .replace(/^\s*(?:[-•*·>]+|\d+[.)])\s*/, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function inRange(v, range) {
    return typeof v === 'number' && isFinite(v) && v >= range[0] && v <= range[1] ? v : null;
  }

  // ---------- catalogue index ----------

  function catalogEntries(catalog) {
    if (!catalog) return [];
    if (Array.isArray(catalog)) return catalog.filter(Boolean);
    if (typeof catalog === 'object') {
      return Object.keys(catalog).map(function (k) {
        var e = catalog[k];
        if (!e || typeof e !== 'object') return null;
        if (!e.id) e = Object.assign({ id: k }, e);
        return e;
      }).filter(Boolean);
    }
    return [];
  }

  function normName(s) {
    return String(s).toLowerCase().replace(/[_\-]+/g, ' ').replace(/[^\w\s֐-׿]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  // Returns [{ name, id, he, english }] sorted longest name first; first id wins a shared name.
  function buildCatalogIndex(catalog) {
    var seen = {};
    var out = [];
    catalogEntries(catalog).forEach(function (e) {
      var id = String(e.id || '');
      var he = typeof e.he === 'string' && e.he.trim() ? e.he.trim() : id;
      var names = [];
      if (typeof e.he === 'string' && e.he.trim()) names.push({ n: normName(e.he), english: false });
      if (/^[a-z0-9_ -]+$/i.test(id)) names.push({ n: normName(id), english: true });
      (ENGLISH_ALIASES[id] || []).forEach(function (a) { names.push({ n: normName(a), english: true }); });
      names.forEach(function (x) {
        if (!x.n || x.n.length < 2 || seen[x.n]) return;
        seen[x.n] = true;
        out.push({ name: x.n, id: id, he: he, english: x.english, equipment: Array.isArray(e.equipment) ? e.equipment.slice() : [] });
      });
    });
    out.sort(function (a, b) { return b.name.length - a.name.length || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0); });
    return out;
  }

  function findExercises(line, index) {
    var text = ' ' + normName(line) + ' ';
    var found = [];
    for (var pass = 0; pass < LIMITS.max_exercises_per_line; pass++) {
      var hit = null;
      for (var i = 0; i < index.length; i++) {
        var cand = index[i];
        var needle = cand.english ? ' ' + cand.name + ' ' : cand.name;
        var at = text.indexOf(needle);
        if (at !== -1) { hit = { cand: cand, at: at, len: needle.length }; break; }
      }
      if (!hit) break;
      found.push({ id: hit.cand.id, he: hit.cand.he, matched: hit.cand.name, equipment: hit.cand.equipment });
      text = text.slice(0, hit.at) + ' ' + text.slice(hit.at + hit.len);
    }
    return found;
  }

  // ---------- prescription grammar ----------

  var RX = {
    restA: new RegExp('(?:מנוחה|rest)[^\\d\\n]{0,14}?(\\d+)\\s*(דקות|דק|min(?:ute)?s?|שניות|שנ|sec(?:ond)?s?|s)?', 'i'),
    restB: new RegExp('(\\d+)\\s*(דקות|דק|min(?:ute)?s?|שניות|שנ|sec(?:ond)?s?|s)?\\s*(?:מנוחה|rest)', 'i'),
    sets: new RegExp('(\\d+)\\s*(?:סטים|סט' + NOT_HEB + '|sets?\\b)', 'i'),
    reps: new RegExp('(\\d+)\\s*(?:חזרות|חז[\'׳]?' + NOT_HEB + '|reps?\\b)', 'i'),
    minutes: new RegExp('(\\d+)\\s*(?:דקות|דקה|דק[\'׳]?' + NOT_HEB + '|min(?:ute)?s?\\b)', 'i'),
    seconds: new RegExp('(\\d+)\\s*(?:שניות|שנייה|שניה|שנ[\'׳]?' + NOT_HEB + '|sec(?:ond)?s?\\b|s\\b)', 'i'),
    nxm: /(\d+)\s*x\s*(\d+)/i,
    // "8-12 חזרות" / "8 to 12 reps": a RANGE, not a number. Checked before RX.reps, which
    // would otherwise match the second number and silently record the high end as the target.
    reps_range: new RegExp('(\\d+)\\s*(?:-|–|—|עד|to)\\s*(\\d+)\\s*(?:חזרות|חז[\'׳]?' + NOT_HEB + '|reps?\\b)', 'i')
  };

  function isMinuteUnit(u) {
    return !!u && /^(דק|min)/i.test(u);
  }

  // Parses "3x12", "4×10", "3 סטים 12 חזרות", "3 sets of 12 reps", "30 שניות",
  // "2 דקות", "מנוחה 60 שניות", "rest 60s", "3x30 שניות".
  function parsePrescription(line) {
    var t = String(line).replace(/[×✕✖*]/g, 'x').toLowerCase();
    var sets = null, reps = null, duration = null, rest = null, m;
    var repsRange = null;

    m = t.match(RX.restA) || t.match(RX.restB);
    if (m) {
      rest = inRange(isMinuteUnit(m[2]) ? +m[1] * 60 : +m[1], LIMITS.rest_seconds);
      t = t.replace(m[0], ' ');
    }
    if ((m = t.match(RX.sets))) sets = inRange(+m[1], LIMITS.sets);
    if ((m = t.match(RX.reps_range))) {
      // the LOW end is the number a trainee is certain to do; the range itself is kept as a note
      reps = inRange(+m[1], LIMITS.reps);
      repsRange = m[1] + '-' + m[2];
      t = t.replace(m[0], ' ');
    } else if ((m = t.match(RX.reps))) reps = inRange(+m[1], LIMITS.reps);
    var durRaw = null;
    if ((m = t.match(RX.minutes))) { durRaw = +m[1]; duration = inRange(durRaw * 60, LIMITS.duration_seconds); }
    else if ((m = t.match(RX.seconds))) { durRaw = +m[1]; duration = inRange(durRaw, LIMITS.duration_seconds); }
    if (sets === null && reps === null && (m = t.match(RX.nxm))) {
      sets = inRange(+m[1], LIMITS.sets);
      if (durRaw === null || +m[2] !== durRaw) reps = inRange(+m[2], LIMITS.reps);
    }
    return { sets: sets, reps: reps, duration_seconds: duration, rest_seconds: rest,
             reps_range: repsRange };
  }

  function hasPrescription(rx) {
    return rx.sets !== null || rx.reps !== null || rx.duration_seconds !== null;
  }

  // ---------- classification ----------

  function classifyCaption(caption, catalog) {
    var index = Array.isArray(catalog) && catalog.length && catalog[0] && catalog[0].name && catalog[0].hasOwnProperty('english')
      ? catalog : buildCatalogIndex(catalog);
    var text = fixText(caption);
    if (!text.trim()) return { workout: false, reason: REASONS.no_caption, exercises: [], title: '' };
    var lines = text.split(/\r?\n/).map(cleanLine).filter(Boolean);
    var exercises = [];
    var equipment = {};
    var titleMentions = 0;
    lines.forEach(function (line, li) {
      var found = findExercises(line, index);
      var rx = parsePrescription(line);
      // The first line is the title: a body-part word there (e.g. "בטן") is not an exercise
      // unless the line also carries a prescription.
      if (li === 0 && found.length && !hasPrescription(rx)) { titleMentions = found.length; return; }
      if (!found.length) {
        // A standalone rest line applies to the exercise above it.
        if (rx.rest_seconds !== null && exercises.length && exercises[exercises.length - 1].rest_seconds === null) {
          exercises[exercises.length - 1].rest_seconds = rx.rest_seconds;
        }
        return;
      }
      found.forEach(function (f) {
        f.equipment.forEach(function (q) { equipment[q] = true; });
        exercises.push({
          name: f.he,
          id: f.id,
          sets: rx.sets,
          reps: rx.reps,
          duration_seconds: rx.duration_seconds,
          rest_seconds: rx.rest_seconds,
          notes: rx.reps_range ? ('בפוסט נכתב ' + rx.reps_range + ' חזרות') : null
        });
      });
    });
    var withRx = exercises.filter(function (e) { return hasPrescription(e); }).length;
    var title = lines.length ? lines[0].replace(/#\S+/g, '').replace(/\s+/g, ' ').trim().slice(0, LIMITS.title_max_chars) : '';
    if (!exercises.length) {
      return { workout: false, reason: titleMentions ? REASONS.single_mention_no_prescription : REASONS.no_known_exercise, exercises: [], title: title };
    }
    if (exercises.length < 2 && withRx < 1) {
      return { workout: false, reason: REASONS.single_mention_no_prescription, exercises: exercises, title: title };
    }
    return {
      workout: true,
      reason: null,
      exercises: exercises,
      title: title,
      equipment: Object.keys(equipment).sort()
    };
  }

  // ---------- export parsing ----------

  function detectLayout(path) {
    var p = String(path || '').replace(/\\/g, '/');
    for (var i = 0; i < LAYOUTS.length; i++) if (LAYOUTS[i].re.test(p)) return LAYOUTS[i].layout;
    return 'unknown';
  }

  function extractPosts(json) {
    if (Array.isArray(json)) return json;
    if (json && typeof json === 'object') {
      var keys = ['ig_posts', 'posts', 'media'];
      for (var i = 0; i < keys.length; i++) if (Array.isArray(json[keys[i]])) return json[keys[i]];
      var all = Object.keys(json);
      for (var j = 0; j < all.length; j++) if (Array.isArray(json[all[j]])) return json[all[j]];
    }
    return null;
  }

  function normalizePost(raw, meta) {
    meta = meta || {};
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
      return { malformed: true, reason: REASONS.malformed_post, post_id: 'ig:malformed:' + (meta.file || '') + ':' + (meta.index || 0) };
    }
    var media = Array.isArray(raw.media) ? raw.media.filter(function (m) { return m && typeof m === 'object'; }) : [];
    var caption = fixText(typeof raw.title === 'string' && raw.title ? raw.title : (media[0] && typeof media[0].title === 'string' ? media[0].title : ''));
    var ts = typeof raw.creation_timestamp === 'number' ? raw.creation_timestamp
      : (media[0] && typeof media[0].creation_timestamp === 'number' ? media[0].creation_timestamp : null);
    var uris = media.map(function (m) { return typeof m.uri === 'string' ? m.uri : null; }).filter(Boolean);
    if (ts === null && !uris.length && !caption) {
      return { malformed: true, reason: REASONS.malformed_post, post_id: 'ig:malformed:' + (meta.file || '') + ':' + (meta.index || 0) };
    }
    var tail = uris.length ? basename(uris[0]) : hashStr(caption);
    return {
      malformed: false,
      post_id: 'ig:' + (ts === null ? 0 : ts) + ':' + tail,
      caption: caption,
      created_at: ts === null ? null : new Date(ts * 1000).toISOString(),
      media: uris,
      layout: meta.layout || 'unknown',
      file: meta.file || null
    };
  }

  // files: { "path/posts_1.json": jsonText | parsedObject, ... }
  function parseExportFiles(files) {
    var result = { ok: false, error: null, posts: [], files: [] };
    if (!files || typeof files !== 'object') { result.error = 'no_files'; return result; }
    var paths = Object.keys(files).sort();
    if (!paths.length) { result.error = 'no_files'; return result; }
    paths.forEach(function (path) {
      var entry = { path: path, layout: detectLayout(path), posts: 0, error: null };
      var raw = files[path];
      var json = raw;
      if (typeof raw === 'string') {
        try { json = JSON.parse(raw); } catch (e) { entry.error = 'invalid_json'; result.files.push(entry); return; }
      }
      var arr = extractPosts(json);
      if (!arr) { entry.error = 'no_posts_found'; result.files.push(entry); return; }
      arr.forEach(function (post, i) {
        result.posts.push(normalizePost(post, { file: path, layout: entry.layout, index: i }));
      });
      entry.posts = arr.length;
      result.files.push(entry);
    });
    var good = result.files.filter(function (f) { return !f.error; }).length;
    if (!good) {
      result.error = result.files.every(function (f) { return f.error === 'invalid_json'; }) ? 'invalid_json' : 'no_posts_found';
      return result;
    }
    result.ok = true;
    return result;
  }

  // ---------- mapping ----------

  function toWorkout(post, classified) {
    var warm = [], main = [];
    classified.exercises.forEach(function (e) {
      if (e.id === 'warmup') {
        warm.push(Object.assign({}, e, {
          sets: e.sets === null ? 1 : e.sets,
          duration_seconds: e.duration_seconds === null && e.reps === null ? 180 : e.duration_seconds
        }));
      } else {
        main.push(Object.assign({}, e));
      }
    });
    var dateTag = post.created_at ? ' ' + post.created_at.slice(0, 10) : '';
    return {
      title: classified.title || ('אימון מאינסטגרם' + dateTag),
      duration_minutes: LIMITS.default_duration_minutes,
      participants: 1,
      equipment: classified.equipment || [],
      intensity: 'medium',
      tags: ['instagram'],
      phases: [
        { name: PHASES.warm, duration_minutes: 5, exercises: warm },
        { name: PHASES.main, duration_minutes: 35, exercises: main },
        { name: PHASES.cool, duration_minutes: 5, exercises: [] }
      ],
      saved_id: post.post_id,
      source: {
        kind: 'instagram-export',
        post_id: post.post_id,
        created_at: post.created_at,
        layout: post.layout,
        file: post.file,
        media: post.media.slice(0, 10),
        caption_excerpt: post.caption.slice(0, 200)
      }
    };
  }

  // posts: output of parseExportFiles().posts ; opts: { catalog, existing: savedWorkouts[] }
  function buildPreview(posts, opts) {
    opts = opts || {};
    var index = buildCatalogIndex(opts.catalog);
    var known = {};
    (Array.isArray(opts.existing) ? opts.existing : []).forEach(function (w) {
      if (w && typeof w.saved_id === 'string') known[w.saved_id] = true;
    });
    var added = [], skipped = [];
    (posts || []).forEach(function (post) {
      if (!post || post.malformed) {
        skipped.push({ post_id: post ? post.post_id : 'ig:malformed', reason: REASONS.malformed_post, title: '', created_at: null });
        return;
      }
      if (known[post.post_id]) {
        skipped.push({ post_id: post.post_id, reason: REASONS.duplicate, title: post.caption.split(/\r?\n/)[0].slice(0, LIMITS.title_max_chars), created_at: post.created_at });
        return;
      }
      var c = classifyCaption(post.caption, index);
      if (!c.workout) {
        skipped.push({ post_id: post.post_id, reason: c.reason, title: c.title, created_at: post.created_at });
        return;
      }
      known[post.post_id] = true;
      added.push(toWorkout(post, c));
    });
    var dup = skipped.filter(function (s) { return s.reason === REASONS.duplicate; }).length;
    return {
      added: added,
      skipped: skipped,
      counts: { posts: (posts || []).length, added: added.length, skipped: skipped.length, duplicates: dup }
    };
  }

  function importFromFiles(files, opts) {
    var parsed = parseExportFiles(files);
    if (!parsed.ok) return { ok: false, error: parsed.error, files: parsed.files, preview: null };
    return { ok: true, error: null, files: parsed.files, preview: buildPreview(parsed.posts, opts) };
  }

  var api = {
    REASONS: REASONS,
    LIMITS: LIMITS,
    PHASES: PHASES,
    fixText: fixText,
    detectLayout: detectLayout,
    extractPosts: extractPosts,
    normalizePost: normalizePost,
    parseExportFiles: parseExportFiles,
    buildCatalogIndex: buildCatalogIndex,
    findExercises: findExercises,
    parsePrescription: parsePrescription,
    classifyCaption: classifyCaption,
    toWorkout: toWorkout,
    buildPreview: buildPreview,
    importFromFiles: importFromFiles
  };

  root.InstagramImport = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : this);
