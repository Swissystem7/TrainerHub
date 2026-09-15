'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const IG = require('../js/instagram-import.js');
const IGS = require('../js/instagram-saved.js');
const catalog = require('../js/catalog.json');

// ALL FIXTURES BELOW ARE SYNTHETIC. They follow the documented shape of the
// Instagram "Download your information" saved-posts export and were written by
// hand - no real account was read, nothing was scraped, no login was used.
// Every handle is synthetic_* and every shortcode is SYNTHETIC0*.
//
// THE DECIDING FACT this file encodes: a saved-post record carries exactly three
// things - the author's handle (`title`), the permalink (`href`) and the unix
// time the owner saved it (`timestamp`). There is NO caption anywhere. That is
// why an un-filled row must stay PENDING and must never become a workout.

// Instagram escapes non-ASCII text one UTF-8 byte per \u00XX. After JSON.parse
// that is the latin1 view of the UTF-8 bytes, which this helper reproduces.
function mojibake(str) {
  return Buffer.from(str, 'utf8').toString('latin1');
}

// ---- timestamps, derived by hand ----
// 1757100000 s: 1757100000 / 86400 = 20336 days remainder 69600 s.
//   20336 days after 1970-01-01: 1970-01-01 + 20089 days = 2025-01-01
//     (55 years = 55*365 = 20075 days + 14 leap days for 1972..2024, 2000 included),
//     so 20336 - 20089 = 247 days into 2025 (not a leap year).
//     Jan 1 is day 0; Sep 1 is day 243 (31+28+31+30+31+30+31+31 = 243), so day 247 = Sep 5.
//   69600 s = 19*3600 + 20*60 => 19:20:00
//   => 2025-09-05T19:20:00.000Z
const TS_AAA1_NEWEST = 1757100000;
const ISO_AAA1_NEWEST = '2025-09-05T19:20:00.000Z';

const TS_AAA1 = 1757000000;   // older save of the same reel, collapsed by dedupe
const TS_BBB2 = 1756900000;
const TS_CCC3 = 1756800000;
const TS_DDD4 = 1756700000;

const P_CURRENT = 'instagram-export/your_instagram_activity/saved/saved_posts.json';
const P_COLLECTIONS = 'instagram-export/your_instagram_activity/saved/saved_collections.json';
const P_OLDER = 'instagram-export/saved/saved_posts.json';
const P_FLAT = 'instagram-export/saved.json';

// Current layout: saved_saved_media + string_map_data. Five records:
// a reel, a /p/ post, one whose string_map_data KEY IS LOCALIZED to Hebrew
// (English exports say "Saved on" - the parser must never match on the label),
// one with a mojibaked non-ASCII handle, and a duplicate of the first reel
// carrying an ?igsh= tracking suffix.
function currentSaved() {
  return {
    _synthetic_fixture: 'not a real export key - parsers must ignore unknown top-level keys',
    saved_saved_media: [
      { title: 'synthetic_coach_one', string_map_data: { 'Saved on': { href: 'https://www.instagram.com/reel/SYNTHETIC0AAA1/', timestamp: TS_AAA1 } } },
      { title: 'synthetic_coach_two', string_map_data: { 'Saved on': { href: 'https://www.instagram.com/p/SYNTHETIC0BBB2/', timestamp: TS_BBB2 } } },
      { title: 'synthetic_coach_three', string_map_data: { [mojibake('נשמר בתאריך')]: { href: 'https://www.instagram.com/reel/SYNTHETIC0CCC3/', timestamp: TS_CCC3 } } },
      { title: mojibake('synthetic_בטן_four'), string_map_data: { 'Saved on': { href: 'https://www.instagram.com/reel/SYNTHETIC0DDD4/', timestamp: TS_DDD4 } } },
      { title: 'synthetic_coach_one', string_map_data: { 'Saved on': { href: 'https://www.instagram.com/reel/SYNTHETIC0AAA1/?igsh=SYNTHETICTRACK', timestamp: TS_AAA1_NEWEST } } }
    ]
  };
}

// Older root-level layout with the string_list_data payload shape.
function olderSaved() {
  return {
    saved_saved_media: [
      { title: 'synthetic_coach_five', string_list_data: [{ href: 'https://www.instagram.com/p/SYNTHETIC0EEE5/', value: 'synthetic_coach_five', timestamp: 1690000000 }] },
      { title: 'synthetic_coach_six', string_list_data: [{ href: 'https://www.instagram.com/reel/SYNTHETIC0FFF6/', value: '', timestamp: 1689900000 }] }
    ]
  };
}

// Oldest flat layout. LOW CONFIDENCE: reconstructed from a third-party parser's
// legacy fallback branch, not from Meta documentation. Tolerated, not trusted.
// Its timestamp is an ISO string rather than unix seconds.
function flatSaved() {
  return {
    saved_media: [
      { href: 'https://www.instagram.com/p/SYNTHETIC0GGG7/', title: 'synthetic_coach_seven', timestamp: '2019-07-13T20:36:48+00:00' }
    ]
  };
}

function collectionsFile() {
  return {
    saved_saved_collections: [
      { title: mojibake('אימונים בית'), string_map_data: { Name: { value: mojibake('אימונים בית'), timestamp: 0 }, 'Added time': { timestamp: 1756000000 }, 'Update time': { timestamp: 1757000000 } } },
      { title: 'Media', string_list_data: [
        { href: 'https://www.instagram.com/reel/SYNTHETIC0AAA1/', value: '', timestamp: TS_AAA1 },
        { href: 'https://www.instagram.com/reel/SYNTHETIC0CCC3/', value: '', timestamp: TS_CCC3 }
      ] }
    ]
  };
}

// The same workout caption the own-posts importer is tested with. Hand-derived:
//   line 0 "אימון בטן וגב היום 💪"     -> title line; "בטן" mentioned without a
//                                        prescription, so NOT an exercise
//   line 1 "חימום 5 דקות"              -> warmup, 5 min = 300 s -> Warm-up phase
//   line 2 "plank 3x30 שניות"           -> plank, 3 sets, 30 s
//   line 3 "בטן גומיות 3 סטים 12 חזרות" -> sets 3, reps 12
//   line 4 "מנוחה 60 שניות"             -> rest 60 s attaches to the line above
//   line 5 "superman 4×10"              -> sets 4, reps 10
// => Warm-up 1 exercise, Main 3 exercises, Cool-down 0
const HEBREW_CAPTION = [
  'אימון בטן וגב היום 💪',
  'חימום 5 דקות',
  'plank 3x30 שניות',
  'בטן גומיות 3 סטים 12 חזרות',
  'מנוחה 60 שניות',
  'superman 4×10'
].join('\n');

function files(extra) {
  return Object.assign({ [P_CURRENT]: currentSaved() }, extra || {});
}

// ---------------------------------------------------------------- layouts ----

test('current layout: localized label, mojibaked handle, ?igsh duplicate collapsed', () => {
  const r = IGS.parseSavedFiles(files());
  assert.equal(r.ok, true);
  assert.equal(r.error, null);
  assert.equal(r.files[0].layout, 'current');
  // 5 records in, 1 is the same reel again => 4 rows, 1 collapse.
  assert.equal(r.items.length, 4);
  assert.equal(r.duplicates_collapsed, 1);
  // newest-saved first: AAA1 (1757100000) > BBB2 > CCC3 > DDD4
  assert.deepEqual(r.items.map(i => i.shortcode), ['SYNTHETIC0AAA1', 'SYNTHETIC0BBB2', 'SYNTHETIC0CCC3', 'SYNTHETIC0DDD4']);
  // the duplicate kept the NEWER save time, and the tracking suffix is gone
  assert.equal(r.items[0].saved_ts, TS_AAA1_NEWEST);
  assert.equal(r.items[0].saved_at, ISO_AAA1_NEWEST);
  assert.equal(r.items[0].permalink, 'https://www.instagram.com/reel/SYNTHETIC0AAA1/');
  assert.equal(r.items[0].saved_id, 'igs:SYNTHETIC0AAA1');
  // the row whose string_map_data key is Hebrew parsed like any other
  assert.equal(r.items[2].permalink, 'https://www.instagram.com/reel/SYNTHETIC0CCC3/');
  assert.equal(r.items[2].saved_ts, TS_CCC3);
  // `title` is the AUTHOR HANDLE, mojibaked, and fixText decodes it
  assert.equal(r.items[3].author, 'synthetic_בטן_four');
  assert.equal(r.items[1].media_kind, 'post');
  assert.equal(r.items[0].media_kind, 'reel');
});

test('older layout (string_list_data) and flat legacy layout both parse', () => {
  const r = IGS.parseSavedFiles({ [P_OLDER]: olderSaved(), [P_FLAT]: flatSaved() });
  assert.equal(r.ok, true);
  const layouts = r.files.reduce((m, f) => Object.assign(m, { [f.path]: f.layout }), {});
  assert.equal(layouts[P_OLDER], 'older');
  assert.equal(layouts[P_FLAT], 'flat_legacy');
  assert.equal(r.items.length, 3);
  const by = r.items.reduce((m, i) => Object.assign(m, { [i.shortcode]: i }), {});
  assert.equal(by.SYNTHETIC0EEE5.author, 'synthetic_coach_five');
  assert.equal(by.SYNTHETIC0FFF6.media_kind, 'reel');
  // flat legacy ships an ISO string; 2019-07-13T20:36:48+00:00 is already UTC
  assert.equal(by.SYNTHETIC0GGG7.saved_at, '2019-07-13T20:36:48.000Z');
  assert.equal(by.SYNTHETIC0GGG7.author, 'synthetic_coach_seven');
});

test('collections attach by permalink and never carry a caption', () => {
  const r = IGS.parseSavedFiles(files({ [P_COLLECTIONS]: collectionsFile() }));
  assert.equal(r.collections.length, 1);
  assert.equal(r.collections[0].name, 'אימונים בית');
  assert.equal(r.collections[0].members.length, 2);
  const by = r.items.reduce((m, i) => Object.assign(m, { [i.shortcode]: i }), {});
  assert.deepEqual(by.SYNTHETIC0AAA1.collections, ['אימונים בית']);
  assert.deepEqual(by.SYNTHETIC0CCC3.collections, ['אימונים בית']);
  assert.deepEqual(by.SYNTHETIC0BBB2.collections, []);
  // no field on any row holds post text - the export simply has none
  r.items.forEach(i => {
    assert.equal(i.caption, undefined);
    assert.equal(i.text, undefined);
  });
});

test('triage signals are metadata only: collection, author frequency, reel-vs-post', () => {
  const r = IGS.parseSavedFiles(files({ [P_COLLECTIONS]: collectionsFile(), [P_OLDER]: olderSaved() }));
  const sig = IGS.triageSignals(r.items).reduce((m, s) => Object.assign(m, { [s.saved_id]: s }), {});
  // synthetic_coach_one saved twice -> collapsed to one row -> one save of that author
  assert.equal(sig['igs:SYNTHETIC0AAA1'].author_saves, 1);
  assert.equal(sig['igs:SYNTHETIC0AAA1'].in_collection, true);
  assert.equal(sig['igs:SYNTHETIC0BBB2'].in_collection, false);
  assert.equal(sig['igs:SYNTHETIC0BBB2'].is_reel, false);
  // a signal is never a claim that the row is a workout
  assert.equal(sig['igs:SYNTHETIC0AAA1'].workout, undefined);
});

// ---------------------------------------------------------------- pending ----

test('THE GUARD: a row with no text stays pending and is never made into a workout', () => {
  const p = IGS.buildSavedPreview(IGS.parseSavedFiles(files()).items, { catalog });
  assert.equal(p.counts.items, 4);
  assert.equal(p.counts.pending, 4);
  assert.equal(p.added.length, 0);
  assert.equal(p.skipped.length, 0);
  p.pending.forEach(row => {
    assert.equal(row.reason, IGS.SAVED_REASONS.pending_no_text);
    assert.ok(row.permalink.startsWith('https://www.instagram.com/'));
  });
  // whitespace-only text is still no text
  const p2 = IGS.buildSavedPreview(IGS.parseSavedFiles(files()).items, { catalog, texts: { 'igs:SYNTHETIC0AAA1': '   \n  ' } });
  assert.equal(p2.added.length, 0);
  assert.equal(p2.counts.pending, 4);
});

// -------------------------------------------------------------- paste path ----

test('pasted caption becomes a TrainerHub workout through the existing parser', () => {
  const items = IGS.parseSavedFiles(files()).items;
  const p = IGS.buildSavedPreview(items, { catalog, texts: { 'igs:SYNTHETIC0AAA1': HEBREW_CAPTION } });
  assert.equal(p.counts.added, 1);
  assert.equal(p.counts.pending, 3);
  const w = p.added[0];
  assert.equal(w.title, 'אימון בטן וגב היום 💪');
  const [warm, main, cool] = w.phases;
  assert.equal(warm.exercises.length, 1);
  assert.equal(main.exercises.length, 3);
  assert.equal(cool.exercises.length, 0);
  assert.equal(warm.exercises[0].duration_seconds, 300);
  assert.equal(main.exercises[0].id, 'plank');
  assert.equal(main.exercises[0].sets, 3);
  assert.equal(main.exercises[0].duration_seconds, 30);
  assert.equal(main.exercises[1].sets, 3);
  assert.equal(main.exercises[1].reps, 12);
  assert.equal(main.exercises[1].rest_seconds, 60);
  assert.equal(main.exercises[2].id, 'superman');
  assert.equal(main.exercises[2].sets, 4);
  assert.equal(main.exercises[2].reps, 10);
  // same mapping the own-posts importer produces
  assert.equal(w.duration_minutes, IG.LIMITS.default_duration_minutes);
});

test('pasted text that is not a workout is skipped with a reason, not guessed at', () => {
  const items = IGS.parseSavedFiles(files()).items;
  const p = IGS.buildSavedPreview(items, {
    catalog,
    texts: {
      'igs:SYNTHETIC0BBB2': 'יום כיף בים עם המשפחה ☀️',   // no catalogue exercise at all
      'igs:SYNTHETIC0CCC3': 'superman challenge!'          // one mention, no sets/reps
    }
  });
  assert.equal(p.added.length, 0);
  assert.equal(p.counts.skipped, 2);
  const by = p.skipped.reduce((m, s) => Object.assign(m, { [s.saved_id]: s }), {});
  assert.equal(by['igs:SYNTHETIC0BBB2'].reason, IG.REASONS.no_known_exercise);
  assert.equal(by['igs:SYNTHETIC0CCC3'].reason, IG.REASONS.single_mention_no_prescription);
  // the two untouched rows are still pending, not skipped
  assert.equal(p.counts.pending, 2);
});

// -------------------------------------------------------------- provenance ----

test('provenance is preserved and no media is ever stored', () => {
  const items = IGS.parseSavedFiles(files({ [P_COLLECTIONS]: collectionsFile() })).items;
  const p = IGS.buildSavedPreview(items, { catalog, texts: { 'igs:SYNTHETIC0AAA1': HEBREW_CAPTION } });
  const src = p.added[0].source;
  assert.equal(src.kind, 'instagram-saved');
  assert.equal(src.permalink, 'https://www.instagram.com/reel/SYNTHETIC0AAA1/');
  assert.equal(src.shortcode, 'SYNTHETIC0AAA1');
  assert.equal(src.author, 'synthetic_coach_one');
  assert.equal(src.saved_at, ISO_AAA1_NEWEST);
  assert.equal(src.media_kind, 'reel');
  assert.deepEqual(src.collections, ['אימונים בית']);
  assert.equal(src.text_source, 'owner_supplied');
  assert.equal(src.caption_excerpt.slice(0, 5), HEBREW_CAPTION.slice(0, 5));
  // a saved post belongs to its author: we keep a LINK, never a copy of the media
  assert.equal(src.media, undefined);
  assert.deepEqual(p.added[0].tags, ['instagram', 'instagram-saved']);
  assert.equal(p.added[0].saved_id, 'igs:SYNTHETIC0AAA1');
  assert.equal(JSON.stringify(p.added[0]).includes('.mp4'), false);
});

// --------------------------------------------------------------- idempotent ----

test('re-importing the same export changes nothing', () => {
  const first = IGS.importSavedFromFiles(files(), { catalog, texts: { 'igs:SYNTHETIC0AAA1': HEBREW_CAPTION } });
  assert.equal(first.preview.counts.added, 1);
  // second run with the first run's workouts already in the library
  const second = IGS.importSavedFromFiles(files(), {
    catalog,
    existing: first.preview.added,
    texts: { 'igs:SYNTHETIC0AAA1': HEBREW_CAPTION }
  });
  assert.equal(second.preview.counts.added, 0);
  assert.equal(second.preview.counts.duplicates, 1);
  assert.equal(second.preview.skipped[0].reason, IGS.SAVED_REASONS.duplicate);
  // the same export offered under both the current and the older path is still one row per post
  const both = IGS.parseSavedFiles({ [P_CURRENT]: currentSaved(), [P_OLDER]: currentSaved() });
  assert.equal(both.items.length, 4);
  assert.equal(both.duplicates_collapsed, 6); // 5 + 5 records => 4 rows, 6 collapses
});

test('an owner skip is remembered, so triage is resumable', () => {
  const items = IGS.parseSavedFiles(files()).items;
  const p = IGS.buildSavedPreview(items, { catalog, skips: { 'igs:SYNTHETIC0BBB2': true } });
  assert.equal(p.counts.pending, 3);
  assert.equal(p.skipped[0].reason, IGS.SAVED_REASONS.skipped_by_owner);
  assert.equal(p.added.length, 0);
});

// ---------------------------------------------------------------- malformed ----

test('malformed input: invalid JSON, unknown shape, and a bad record inside a good file', () => {
  const bad = IGS.parseSavedFiles({ [P_CURRENT]: '{ not json' });
  assert.equal(bad.ok, false);
  assert.equal(bad.error, 'invalid_json');

  const empty = IGS.parseSavedFiles({ [P_CURRENT]: { _synthetic_fixture: 'no array here' } });
  assert.equal(empty.ok, false);
  assert.equal(empty.error, 'no_saved_posts_found');

  assert.equal(IGS.parseSavedFiles(null).error, 'no_files');
  assert.equal(IGS.parseSavedFiles({}).error, 'no_files');

  // one unusable record among good ones: kept as an explicit malformed row,
  // never silently dropped and never turned into a workout
  const mixed = IGS.parseSavedFiles({
    [P_CURRENT]: {
      saved_saved_media: [
        { title: 'synthetic_coach_one', string_map_data: { 'Saved on': { href: 'https://www.instagram.com/reel/SYNTHETIC0AAA1/', timestamp: TS_AAA1 } } },
        { title: 'synthetic_no_link' },                 // no payload at all
        'not a record',                                 // not an object
        { title: 'synthetic_empty', string_map_data: {} }
      ]
    }
  });
  assert.equal(mixed.ok, true);
  assert.equal(mixed.items.filter(i => !i.malformed).length, 1);
  assert.equal(mixed.items.filter(i => i.malformed).length, 3);
  const p = IGS.buildSavedPreview(mixed.items, { catalog });
  assert.equal(p.counts.pending, 1);
  assert.equal(p.counts.skipped, 3);
  p.skipped.forEach(s => assert.equal(s.reason, IGS.SAVED_REASONS.malformed_saved_item));
});

test('a permalink with no recognisable shortcode still gets a stable id', () => {
  const a = IGS.normalizePermalink('https://www.instagram.com/reel/ABC123/?igsh=XYZ#frag');
  assert.equal(a.permalink, 'https://www.instagram.com/reel/ABC123/');
  assert.equal(a.shortcode, 'ABC123');
  assert.equal(IGS.normalizePermalink('https://www.instagram.com/reels/ABC123/').permalink, 'https://www.instagram.com/reel/ABC123/');
  assert.equal(IGS.normalizePermalink('https://www.instagram.com/tv/ABC123/').media_kind, 'reel');
  const odd = IGS.normalizeSavedItem({ title: 'synthetic_odd', string_map_data: { x: { href: 'https://www.instagram.com/synthetic_odd/', timestamp: 1700000000 } } }, { file: P_CURRENT, layout: 'current' });
  assert.equal(odd.malformed, false);
  assert.equal(odd.shortcode, null);
  assert.equal(odd.saved_id, 'igs:url:https://www.instagram.com/synthetic_odd');
  // the ?igsh= strip has to happen for links with no shortcode too, otherwise the
  // same bookmark saved twice would become two rows keyed by two different urls
  const tracked = IGS.normalizePermalink('https://www.instagram.com/synthetic_odd/?igsh=TRACK#frag');
  assert.equal(tracked.permalink, 'https://www.instagram.com/synthetic_odd/');
  const dupes = IGS.parseSavedFiles({
    [P_CURRENT]: {
      saved_saved_media: [
        { title: 'synthetic_odd', string_map_data: { x: { href: 'https://www.instagram.com/synthetic_odd/', timestamp: 1700000000 } } },
        { title: 'synthetic_odd', string_map_data: { x: { href: 'https://www.instagram.com/synthetic_odd/?igsh=TRACK', timestamp: 1700000100 } } }
      ]
    }
  });
  assert.equal(dupes.items.length, 1);
  assert.equal(dupes.duplicates_collapsed, 1);
});

// ------------------------------------------------------------ his own posts ----

test('a saved post of his own is flagged, but never auto-matched (no shared key)', () => {
  const items = IGS.markOwnItems(IGS.parseSavedFiles(files()).items, '@synthetic_coach_two');
  const by = items.reduce((m, i) => Object.assign(m, { [i.shortcode]: i }), {});
  assert.equal(by.SYNTHETIC0BBB2.is_own, true);
  assert.equal(by.SYNTHETIC0AAA1.is_own, false);
  // the own-posts export carries the caption but NO permalink and NO shortcode,
  // so the join key does not exist: choices are offered, never applied.
  const own = IG.parseExportFiles({
    'instagram-export/content/posts_1.json': [
      { media: [{ uri: 'media/posts/202105/synthetic_a.jpg', creation_timestamp: 1620000000, title: mojibake(HEBREW_CAPTION) }] }
    ]
  });
  const choices = IGS.ownPostChoices(own.posts);
  assert.equal(choices.length, 1);
  assert.equal(choices[0].first_line, 'אימון בטן וגב היום 💪');
  assert.equal(choices[0].permalink, undefined);
  assert.equal(choices[0].shortcode, undefined);
  // nothing was filled in automatically
  const p = IGS.buildSavedPreview(items, { catalog });
  assert.equal(p.added.length, 0);
  assert.equal(p.counts.pending, 4);
  // he picks one; then it is stored with an honest text_source
  const p2 = IGS.buildSavedPreview(items, {
    catalog,
    texts: { 'igs:SYNTHETIC0BBB2': choices[0].caption },
    text_sources: { 'igs:SYNTHETIC0BBB2': 'own_export' }
  });
  assert.equal(p2.added.length, 1);
  assert.equal(p2.added[0].source.text_source, 'own_export');
  assert.equal(p2.added[0].source.author, 'synthetic_coach_two');
});

// ---------------------------------------------------------------- honesty ----

test('nothing generated claims professional or medical endorsement', () => {
  const items = IGS.parseSavedFiles(files()).items;
  const p = IGS.buildSavedPreview(items, { catalog, texts: { 'igs:SYNTHETIC0AAA1': HEBREW_CAPTION } });
  const blob = JSON.stringify(p) + require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'js', 'instagram-saved.js'), 'utf8');
  [/מאושר על ידי/, /בהמלצת רופא/, /certified by/i, /doctor.approved/i, /medically/i].forEach(re => {
    assert.equal(re.test(blob), false, 'endorsement claim found: ' + re);
  });
});

// --- added 2026-09-15 after a verifier fed hostile hrefs into an export file and they came back as
// clickable links. The page renders `permalink` into an <a href>, so the rule has to hold HERE.
test('hostile hrefs never become links (only instagram.com survives)', () => {
  const np = IGS.normalizePermalink;
  for (const bad of ['javascript:alert(1)',
                     'data:text/html,<script>alert(1)</script>',
                     'https://evil.example.com/reel/ABC123/',
                     'file:///etc/passwd',
                     '//evil.example.com/p/ABC/']) {
    const r = np(bad);
    assert.equal(r.permalink, null, 'must not hand back ' + bad + ' as a link');
    assert.equal(r.link_reason, 'not_an_instagram_link');
  }
  // the real thing still works, and still normalises
  const ok = np('https://www.instagram.com/reel/ABC123def/?igsh=tracking');
  assert.equal(ok.permalink, 'https://www.instagram.com/reel/ABC123def/');
  assert.equal(ok.shortcode, 'ABC123def');
  assert.equal(ok.media_kind, 'reel');
  // an instagram.com URL we do not parse as a post is kept as a link but carries no shortcode
  const other = np('https://instagram.com/somecoach/');
  assert.equal(other.permalink, 'https://instagram.com/somecoach/');
  assert.equal(other.shortcode, null);
});

// --- added 2026-09-15: the .toLowerCase() on the url-keyed id was the one guard of seven whose
// deletion left the suite green, and it dropped no trailing slash - so one saved link written two
// ways became two rows in the queue. Either mutation now fails here.
test('same link, two spellings, one row (case and trailing slash)', () => {
  const mk = (href) => ({ title: 'coach', string_list_data: [{ href, timestamp: 1700000000 }] });
  const spellings = [
    'https://www.instagram.com/SomeCoach/',
    'https://www.instagram.com/somecoach',
    'https://www.instagram.com/somecoach/',
    'https://WWW.instagram.com/SomeCoach//'
  ];
  const ids = spellings.map((h, i) => IGS.normalizeSavedItem(mk(h), { file: 'f', index: i }).saved_id);
  assert.equal(new Set(ids).size, 1, 'all four spellings must share one saved_id, got ' + JSON.stringify(ids));
  assert.ok(ids[0].startsWith('igs:url:'), 'a non-post instagram link is keyed by url');
  assert.ok(!/\/$/.test(ids[0]), 'no trailing slash survives into the id: ' + ids[0]);
  assert.equal(ids[0], ids[0].toLowerCase(), 'the id is lower-cased: ' + ids[0]);

  // a genuine post link is still keyed by its case-SENSITIVE shortcode, which is not the same thing
  const a = IGS.normalizeSavedItem(mk('https://www.instagram.com/reel/AbC123/'), { file: 'f', index: 9 });
  const b = IGS.normalizeSavedItem(mk('https://www.instagram.com/reel/abc123/'), { file: 'f', index: 10 });
  assert.notEqual(a.saved_id, b.saved_id, 'two different shortcodes must stay two rows');
});
