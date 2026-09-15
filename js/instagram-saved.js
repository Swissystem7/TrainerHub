(function (root) {
  'use strict';
  // TrainerHub - Instagram SAVED-posts importer (the reels/posts OTHER people
  // published and the owner bookmarked).
  //
  // Pure functions only: no DOM, no network, no randomness, no wall clock.
  // The ONLY data path is the official "Download your information" export the
  // owner downloads himself and picks in the browser, plus text HE pastes.
  // Nothing here logs in, scrapes, posts, or fetches instagram.com.
  //
  // WHAT THE EXPORT ACTUALLY CONTAINS for a saved post - the deciding fact this
  // whole module is shaped around:
  //     the author's handle, the permalink, and the unix time he saved it.
  // There is NO caption, no text, no description, no media file. (Verified
  // against four independent public export parsers; Meta ships a list of links,
  // not the posts.) No official Instagram API exposes saved media either.
  // So this module CANNOT tell which saved post is a workout and CANNOT read a
  // single exercise out of one. It builds the spine - one reviewable row per
  // saved post - and the moment the owner supplies text for a row, the EXISTING
  // caption parser (js/instagram-import.js) turns it into a workout with the
  // same classification guard, the same prescription grammar and the same
  // preview. One parser, one set of lessons.
  //
  // Accepted layouts (glob on the tail, never on the parent folder):
  //   current : your_instagram_activity/saved/saved_posts.json
  //   older   : saved/saved_posts.json
  //   flat    : saved.json                 <- LOW CONFIDENCE, tolerated not trusted
  //   plus    : saved_collections.json     <- collection membership, no captions

  var II = root.InstagramImport ||
    ((typeof module === 'object' && module.exports && typeof require === 'function') ? require('./instagram-import.js') : null);
  if (!II) throw new Error('instagram-saved.js requires instagram-import.js to be loaded first');

  // Reasons unique to the saved path. Classification reasons (no_caption,
  // no_known_exercise, single_mention_no_prescription) come from II.REASONS.
  var SAVED_REASONS = {
    pending_no_text: 'pending_no_text',
    malformed_saved_item: 'malformed_saved_item',
    duplicate: 'duplicate',
    skipped_by_owner: 'skipped_by_owner'
  };

  var SAVED_LAYOUTS = [
    { re: /(^|\/)your_instagram_activity\/saved\/saved_collections\.json$/i, layout: 'collections' },
    { re: /(^|\/)saved\/saved_collections\.json$/i, layout: 'collections' },
    { re: /(^|\/)saved_collections\.json$/i, layout: 'collections' },
    { re: /(^|\/)your_instagram_activity\/saved\/saved_posts\.json$/i, layout: 'current' },
    { re: /(^|\/)saved\/saved_posts\.json$/i, layout: 'older' },
    { re: /(^|\/)saved_posts\.json$/i, layout: 'older' },
    { re: /(^|\/)saved\.json$/i, layout: 'flat_legacy' }
  ];

  // reel/reels/tv/p are the four permalink shapes Instagram emits.
  var PERMALINK_RE = /instagram\.com\/(reels?|tv|p)\/([A-Za-z0-9_-]+)/i;
  var KIND_OF = { reel: 'reel', reels: 'reel', tv: 'reel', p: 'post' };

  function detectSavedLayout(path) {
    var p = String(path || '').replace(/\\/g, '/');
    for (var i = 0; i < SAVED_LAYOUTS.length; i++) if (SAVED_LAYOUTS[i].re.test(p)) return SAVED_LAYOUTS[i].layout;
    return 'unknown';
  }

  // Unknown top-level keys must be ignored (a real export has none of ours, and
  // fixtures carry a _synthetic_fixture marker string).
  function extractSavedRecords(json) {
    if (Array.isArray(json)) return json;
    if (json && typeof json === 'object') {
      var keys = ['saved_saved_media', 'saved_media', 'saved_posts', 'saved_saved_collections'];
      for (var i = 0; i < keys.length; i++) if (Array.isArray(json[keys[i]])) return json[keys[i]];
      var all = Object.keys(json);
      for (var j = 0; j < all.length; j++) if (Array.isArray(json[all[j]])) return json[all[j]];
    }
    return null;
  }

  // The single string_map_data key is LOCALIZED ("Saved on" in English exports,
  // Hebrew in a Hebrew one). Never match on the label - take the first entry
  // that carries an href, else the first entry at all.
  function payloadOf(raw) {
    if (!raw || typeof raw !== 'object') return null;
    var map = raw.string_map_data;
    if (map && typeof map === 'object' && !Array.isArray(map)) {
      var ks = Object.keys(map), first = null;
      for (var i = 0; i < ks.length; i++) {
        var v = map[ks[i]];
        if (!v || typeof v !== 'object') continue;
        if (first === null) first = v;
        if (typeof v.href === 'string' && v.href) return v;
      }
      if (first) return first;
    }
    var list = raw.string_list_data;
    if (Array.isArray(list)) {
      for (var j = 0; j < list.length; j++) {
        var e = list[j];
        if (e && typeof e === 'object' && typeof e.href === 'string' && e.href) return e;
      }
      if (list.length && list[0] && typeof list[0] === 'object') return list[0];
    }
    // flat legacy: href/timestamp sit on the record itself
    if (typeof raw.href === 'string' || typeof raw.uri === 'string') {
      return { href: raw.href || raw.uri, timestamp: raw.timestamp };
    }
    return null;
  }

  // Unix seconds, or the ISO string the flat legacy layout uses. Anything else -> null.
  function toEpoch(ts) {
    if (typeof ts === 'number' && isFinite(ts) && ts > 0) return Math.floor(ts);
    if (typeof ts === 'string' && ts) {
      var ms = Date.parse(ts);
      if (!isNaN(ms)) return Math.floor(ms / 1000);
    }
    return null;
  }

  function isoOf(epoch) {
    return epoch === null ? null : new Date(epoch * 1000).toISOString();
  }

  // Strip ?igsh=/?utm_= tracking suffixes and the fragment, then rebuild the
  // canonical permalink from the shortcode so the same post saved twice
  // collapses to one row.
  function normalizePermalink(href) {
    var s = String(href || '').trim();
    if (!s) return { permalink: null, shortcode: null, media_kind: null };
    var bare = s.split('#')[0].split('?')[0];
    var m = PERMALINK_RE.exec(bare);
    if (!m) return { permalink: bare, shortcode: null, media_kind: null };
    var kind = KIND_OF[m[1].toLowerCase()] || 'post';
    var path = kind === 'reel' ? 'reel' : 'p';
    return {
      permalink: 'https://www.instagram.com/' + path + '/' + m[2] + '/',
      shortcode: m[2],
      media_kind: kind
    };
  }

  // raw: one element of saved_saved_media ; meta: { file, layout, index }
  function normalizeSavedItem(raw, meta) {
    meta = meta || {};
    var bad = {
      malformed: true,
      reason: SAVED_REASONS.malformed_saved_item,
      saved_id: 'igs:malformed:' + (meta.file || '') + ':' + (meta.index || 0),
      author: '', permalink: null, shortcode: null, media_kind: null,
      saved_at: null, saved_ts: null,
      layout: meta.layout || 'unknown', file: meta.file || null, collections: []
    };
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return bad;
    var p = payloadOf(raw);
    if (!p) return bad;
    var link = normalizePermalink(p.href);
    if (!link.permalink) return bad;
    // `title` is the AUTHOR'S HANDLE, not a caption. It arrives mojibaked
    // (UTF-8 bytes emitted as latin-1), so it goes through the same fixText the
    // own-posts importer uses.
    var author = II.fixText(typeof raw.title === 'string' && raw.title ? raw.title
      : (typeof p.value === 'string' ? p.value : ''));
    var ts = toEpoch(p.timestamp !== undefined ? p.timestamp : raw.timestamp);
    return {
      malformed: false,
      reason: null,
      saved_id: link.shortcode ? 'igs:' + link.shortcode : 'igs:url:' + link.permalink.toLowerCase(),
      author: author,
      permalink: link.permalink,
      shortcode: link.shortcode,
      media_kind: link.media_kind,
      saved_at: isoOf(ts),
      saved_ts: ts,
      layout: meta.layout || 'unknown',
      file: meta.file || null,
      collections: []
    };
  }

  // saved_collections.json: a record carrying a name (string_map_data, label
  // localized -> take the first entry that has a `value`) opens a collection;
  // the membership record that follows lists its hrefs in string_list_data.
  function parseCollections(json, meta) {
    var out = [];
    var arr = Array.isArray(json && json.saved_saved_collections) ? json.saved_saved_collections : extractSavedRecords(json);
    if (!Array.isArray(arr)) return out;
    var current = null;
    arr.forEach(function (rec) {
      if (!rec || typeof rec !== 'object') return;
      var map = rec.string_map_data;
      var named = null;
      if (map && typeof map === 'object' && !Array.isArray(map)) {
        var ks = Object.keys(map);
        for (var i = 0; i < ks.length; i++) {
          var v = map[ks[i]];
          if (v && typeof v === 'object' && typeof v.value === 'string' && v.value) { named = v.value; break; }
        }
      }
      if (named !== null && !Array.isArray(rec.string_list_data)) {
        current = { name: II.fixText(named) || II.fixText(rec.title || ''), members: [], file: (meta && meta.file) || null };
        out.push(current);
        return;
      }
      if (Array.isArray(rec.string_list_data)) {
        var target = current;
        if (!target) {
          target = { name: II.fixText(rec.title || ''), members: [], file: (meta && meta.file) || null };
          out.push(target);
          current = target;
        }
        rec.string_list_data.forEach(function (e) {
          if (!e || typeof e !== 'object') return;
          var link = normalizePermalink(e.href);
          if (link.permalink) target.members.push(link.permalink);
        });
      }
    });
    return out;
  }

  // files: { "path/saved_posts.json": jsonText | parsedObject, ... }
  // Deduped by canonical permalink: re-importing the same export changes nothing.
  // When the same post appears twice (e.g. once with an ?igsh= suffix) the row
  // keeps the NEWEST save time.
  function parseSavedFiles(files) {
    var result = { ok: false, error: null, items: [], collections: [], files: [], duplicates_collapsed: 0 };
    if (!files || typeof files !== 'object') { result.error = 'no_files'; return result; }
    var paths = Object.keys(files).sort();
    if (!paths.length) { result.error = 'no_files'; return result; }

    var byId = {}, order = [], malformed = [];
    paths.forEach(function (path) {
      var entry = { path: path, layout: detectSavedLayout(path), items: 0, error: null };
      var raw = files[path];
      var json = raw;
      if (typeof raw === 'string') {
        try { json = JSON.parse(raw); } catch (e) { entry.error = 'invalid_json'; result.files.push(entry); return; }
      }
      if (entry.layout === 'collections') {
        var cols = parseCollections(json, { file: path });
        if (!cols.length) { entry.error = 'no_saved_posts_found'; result.files.push(entry); return; }
        result.collections = result.collections.concat(cols);
        entry.items = cols.length;
        result.files.push(entry);
        return;
      }
      var arr = extractSavedRecords(json);
      if (!arr) { entry.error = 'no_saved_posts_found'; result.files.push(entry); return; }
      arr.forEach(function (rec, i) {
        var item = normalizeSavedItem(rec, { file: path, layout: entry.layout, index: i });
        if (item.malformed) { malformed.push(item); return; }
        var prev = byId[item.saved_id];
        if (prev) {
          result.duplicates_collapsed++;
          if ((item.saved_ts || 0) > (prev.saved_ts || 0)) { item.collections = prev.collections; byId[item.saved_id] = item; }
          return;
        }
        byId[item.saved_id] = item;
        order.push(item.saved_id);
      });
      entry.items = arr.length;
      result.files.push(entry);
    });

    var good = result.files.filter(function (f) { return !f.error; }).length;
    if (!good) {
      result.error = result.files.every(function (f) { return f.error === 'invalid_json'; }) ? 'invalid_json' : 'no_saved_posts_found';
      return result;
    }

    var items = order.map(function (id) { return byId[id]; });
    // collection membership, matched on the canonical permalink
    if (result.collections.length) {
      var member = {};
      result.collections.forEach(function (c) {
        c.members.forEach(function (href) { (member[href] = member[href] || []).push(c.name); });
      });
      items.forEach(function (it) {
        var names = member[it.permalink];
        if (names) it.collections = names.slice();
      });
    }
    // newest-saved first; ties and unknown timestamps keep file order
    items = items.map(function (it, i) { return { it: it, i: i }; })
      .sort(function (a, b) { return (b.it.saved_ts || 0) - (a.it.saved_ts || 0) || a.i - b.i; })
      .map(function (x) { return x.it; });

    result.items = items.concat(malformed);
    result.ok = true;
    return result;
  }

  // ---------- triage signals (metadata only - NEVER content classification) ----------
  // The three signals the export actually carries. They order the queue; they
  // never decide that something is a workout. The UI must label them as hints.
  function triageSignals(items) {
    var counts = {};
    (items || []).forEach(function (it) {
      if (it && !it.malformed && it.author) counts[it.author] = (counts[it.author] || 0) + 1;
    });
    return (items || []).map(function (it) {
      if (!it || it.malformed) return { saved_id: it ? it.saved_id : null, author_saves: 0, in_collection: false, is_reel: false };
      return {
        saved_id: it.saved_id,
        author_saves: counts[it.author] || 0,
        in_collection: it.collections.length > 0,
        is_reel: it.media_kind === 'reel'
      };
    });
  }

  // A saved item that is HIS OWN post: the own-posts export DOES carry the
  // caption, so such a row can be filled from it - but only by him choosing the
  // post. The own-posts export carries no permalink and no shortcode (only
  // creation_timestamp + media file names), and the saved timestamp is when he
  // SAVED it, not when it was published, so there is NO shared key to join on.
  // Guessing one would invent data; this only flags the rows and offers the list.
  function markOwnItems(items, ownHandle) {
    var h = String(ownHandle || '').trim().toLowerCase().replace(/^@/, '');
    return (items || []).map(function (it) {
      if (it && !it.malformed) it.is_own = !!h && String(it.author || '').trim().toLowerCase().replace(/^@/, '') === h;
      return it;
    });
  }

  // posts: II.parseExportFiles(ownExport).posts - offered to the owner as a
  // pick-list for a row he has flagged as his own. No automatic match.
  function ownPostChoices(posts) {
    return (posts || []).filter(function (p) { return p && !p.malformed && p.caption; })
      .map(function (p) {
        return {
          post_id: p.post_id,
          created_at: p.created_at,
          first_line: p.caption.split(/\r?\n/)[0].slice(0, II.LIMITS.title_max_chars),
          caption: p.caption
        };
      })
      .sort(function (a, b) { return String(b.created_at || '') < String(a.created_at || '') ? -1 : 1; });
  }

  // ---------- mapping ----------
  // Reuses II.toWorkout for the whole phase/exercise mapping, then replaces
  // `source` with saved-post provenance. Never stores media: the export never
  // contains another author's media file and TrainerHub must never hold one.
  function savedToWorkout(item, classified, text, opts) {
    opts = opts || {};
    var pseudoPost = {
      post_id: item.saved_id,
      caption: text,
      created_at: item.saved_at,
      media: [],
      layout: item.layout,
      file: item.file
    };
    var w = II.toWorkout(pseudoPost, classified);
    w.tags = ['instagram', 'instagram-saved'];
    w.saved_id = item.saved_id;
    w.source = {
      kind: 'instagram-saved',
      saved_id: item.saved_id,
      permalink: item.permalink,
      shortcode: item.shortcode,
      media_kind: item.media_kind,
      author: item.author,
      saved_at: item.saved_at,
      layout: item.layout,
      file: item.file,
      collections: (item.collections || []).slice(),
      // the text is someone else's writing: kept local, attributed, never republished
      text_source: opts.text_source || 'owner_supplied',
      caption_excerpt: String(text).slice(0, 200)
    };
    return w;
  }

  // items  : parseSavedFiles().items
  // opts   : { catalog, existing: savedWorkouts[], texts: { saved_id: "..." },
  //            skips: { saved_id: true }, text_sources: { saved_id: 'own_export' } }
  function buildSavedPreview(items, opts) {
    opts = opts || {};
    var index = II.buildCatalogIndex(opts.catalog);
    var texts = opts.texts || {};
    var skips = opts.skips || {};
    var sources = opts.text_sources || {};
    var known = {};
    (Array.isArray(opts.existing) ? opts.existing : []).forEach(function (w) {
      if (w && typeof w.saved_id === 'string') known[w.saved_id] = true;
    });
    var added = [], pending = [], skipped = [];
    (items || []).forEach(function (item) {
      if (!item || item.malformed) {
        skipped.push({ saved_id: item ? item.saved_id : 'igs:malformed', reason: SAVED_REASONS.malformed_saved_item, author: '', permalink: null, saved_at: null });
        return;
      }
      var row = { saved_id: item.saved_id, author: item.author, permalink: item.permalink, saved_at: item.saved_at };
      if (known[item.saved_id]) {
        skipped.push(Object.assign({ reason: SAVED_REASONS.duplicate }, row));
        return;
      }
      if (skips[item.saved_id]) {
        skipped.push(Object.assign({ reason: SAVED_REASONS.skipped_by_owner }, row));
        return;
      }
      var text = texts[item.saved_id];
      // THE GUARD: a row the owner has not filled stays pending. It is never
      // turned into a workout, and no exercise is ever invented for it. The
      // export carries no caption, so there is nothing else to read.
      if (typeof text !== 'string' || !text.trim()) {
        pending.push(Object.assign({ reason: SAVED_REASONS.pending_no_text }, row, {
          media_kind: item.media_kind, collections: (item.collections || []).slice(), is_own: !!item.is_own
        }));
        return;
      }
      var c = II.classifyCaption(text, index);
      if (!c.workout) {
        skipped.push(Object.assign({ reason: c.reason, title: c.title }, row));
        return;
      }
      known[item.saved_id] = true;
      added.push(savedToWorkout(item, c, text, { text_source: sources[item.saved_id] }));
    });
    return {
      added: added,
      pending: pending,
      skipped: skipped,
      counts: {
        items: (items || []).length,
        added: added.length,
        pending: pending.length,
        skipped: skipped.length,
        duplicates: skipped.filter(function (s) { return s.reason === SAVED_REASONS.duplicate; }).length
      }
    };
  }

  function importSavedFromFiles(files, opts) {
    var parsed = parseSavedFiles(files);
    if (!parsed.ok) return { ok: false, error: parsed.error, files: parsed.files, items: [], collections: [], preview: null };
    var items = parsed.items;
    if (opts && opts.own_handle) items = markOwnItems(items, opts.own_handle);
    return {
      ok: true,
      error: null,
      files: parsed.files,
      items: items,
      collections: parsed.collections,
      duplicates_collapsed: parsed.duplicates_collapsed,
      preview: buildSavedPreview(items, opts)
    };
  }

  var api = {
    SAVED_REASONS: SAVED_REASONS,
    detectSavedLayout: detectSavedLayout,
    extractSavedRecords: extractSavedRecords,
    normalizePermalink: normalizePermalink,
    normalizeSavedItem: normalizeSavedItem,
    parseCollections: parseCollections,
    parseSavedFiles: parseSavedFiles,
    triageSignals: triageSignals,
    markOwnItems: markOwnItems,
    ownPostChoices: ownPostChoices,
    savedToWorkout: savedToWorkout,
    buildSavedPreview: buildSavedPreview,
    importSavedFromFiles: importSavedFromFiles
  };

  root.InstagramSaved = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : this);
