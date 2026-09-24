'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const IG = require('../js/instagram-import.js');
const catalog = require('../js/catalog.json');
const { WorkoutLibrary } = require('../frontend/saved-workouts.js');

// ALL FIXTURES BELOW ARE SYNTHETIC. They follow the documented Instagram export
// layout (an array of { media: [{ uri, creation_timestamp, title }], title?, creation_timestamp? })
// and were written by hand for these tests - they are not real posts.

// Instagram escapes non-ASCII caption text one UTF-8 byte per \u00XX. After JSON.parse
// that is exactly the latin1 view of the UTF-8 bytes, which this helper reproduces.
function mojibake(str) {
  return Buffer.from(str, 'utf8').toString('latin1');
}

// Hebrew workout caption (6 lines + hashtags). Hand-derived expectation:
//   line 0 "אימון בטן וגב היום 💪"  -> title line; "בטן" (id crunches) mentioned without a
//                                    prescription, so it is NOT an exercise
//   line 1 "חימום 5 דקות"           -> warmup, 5 minutes = 5*60 = 300 s  -> Warm-up phase
//   line 2 "plank 3x30 שניות"        -> plank, 3 sets, 30 s each, reps null (30 is the duration)
//   line 3 "בטן גומיות 3 סטים 12 חזרות" -> בטן_גומיות, sets 3, reps 12
//   line 4 "מנוחה 60 שניות"          -> no exercise; rest 60 s attaches to the line above
//   line 5 "superman 4×10"           -> superman, sets 4, reps 10
//   line 6 "#fit #strong"            -> hashtags only
// => Warm-up: 1 exercise, Main: 3 exercises, Cool-down: 0
const HEBREW_CAPTION = [
  'אימון בטן וגב היום 💪',
  'חימום 5 דקות',
  'plank 3x30 שניות',
  'בטן גומיות 3 סטים 12 חזרות',
  'מנוחה 60 שניות',
  'superman 4×10',
  '#fit #strong'
].join('\n');

// 1620000000 s = 18750 days after 1970-01-01 (51 years = 18628 days incl. 13 leap days,
// +122 days into 2021 = May 3) => 2021-05-03T00:00:00.000Z
const TS_A = 1620000000;

function legacyPosts() {
  return [
    // single-media post: caption + timestamp live on the media item (legacy layout)
    { media: [{ uri: 'media/posts/202105/synthetic_a.jpg', creation_timestamp: TS_A, title: mojibake(HEBREW_CAPTION) }] },
    // non-workout post
    { media: [{ uri: 'media/posts/202106/synthetic_b.jpg', creation_timestamp: TS_A + 86400, title: mojibake('יום כיף בים עם המשפחה ☀️') }] },
    // one exercise word, no prescription
    { media: [{ uri: 'media/posts/202106/synthetic_c.jpg', creation_timestamp: TS_A + 2 * 86400, title: 'superman challenge!' }] },
    // malformed: nothing usable
    {},
    // malformed: not an object
    'not a post'
  ];
}

function currentPosts() {
  return {
    // newer exports sometimes wrap the array; the importer unwraps the first array field
    ig_posts: [
      // multi-media post: caption + timestamp on the post itself (current layout)
      {
        media: [
          { uri: 'your_instagram_activity/media/posts/202401/synthetic_d1.jpg', creation_timestamp: 1704067200 },
          { uri: 'your_instagram_activity/media/posts/202401/synthetic_d2.jpg', creation_timestamp: 1704067200 }
        ],
        title: mojibake('Core day\n3 sets of 12 reps crunches\nplank 45s\nrest 30s'),
        creation_timestamp: 1704067200 // 2024-01-01T00:00:00.000Z
      }
    ]
  };
}

function files() {
  return {
    'content/posts_1.json': JSON.stringify(legacyPosts()),
    'your_instagram_activity/media/posts_1.json': JSON.stringify(currentPosts())
  };
}

function fakeStore() {
  const mem = {};
  return {
    get: (k, fb) => (k in mem ? JSON.parse(mem[k]) : fb),
    set: (k, v) => { mem[k] = JSON.stringify(v); return true; }
  };
}

test('mojibake captions are decoded, clean text is left alone', () => {
  assert.equal(IG.fixText(mojibake('שלום 💪')), 'שלום 💪');
  assert.equal(IG.fixText('שלום'), 'שלום');
  // lone 0xE9 is not valid UTF-8, so a genuine latin1 string stays as it is
  assert.equal(IG.fixText('café'), 'café');
  assert.equal(IG.fixText(42), '');
});

test('sets x reps grammar in Hebrew and English', () => {
  const p = (s) => IG.parsePrescription(s);
  const rx = (sets, reps, duration_seconds, rest_seconds, reps_range = null) =>
  ({ sets, reps, duration_seconds, rest_seconds, reps_range });
  assert.deepEqual(p('3x12'), rx(3, 12, null, null));
  assert.deepEqual(p('4×10'), rx(4, 10, null, null));
  assert.deepEqual(p('3 * 12'), rx(3, 12, null, null));
  assert.deepEqual(p('3 סטים 12 חזרות'), rx(3, 12, null, null));
  assert.deepEqual(p('3 סטים של 12 חזרות'), rx(3, 12, null, null));
  assert.deepEqual(p('12 חזרות'), rx(null, 12, null, null));
  assert.deepEqual(p('3 sets of 12 reps'), rx(3, 12, null, null));
  assert.deepEqual(p('30 שניות'), rx(null, null, 30, null));
  assert.deepEqual(p('2 דקות'), rx(null, null, 120, null)); // 2*60
  assert.deepEqual(p('3x30 שניות'), rx(3, null, 30, null)); // 30 is the duration, not reps
  assert.deepEqual(p('3 סטים של 45 שניות'), rx(3, null, 45, null));
  assert.deepEqual(p('rest 60s'), rx(null, null, null, 60));
  assert.deepEqual(p('מנוחה 90 שניות'), rx(null, null, null, 90));
  assert.deepEqual(p('מנוחה בין סטים 90 שניות'), rx(null, null, null, 90));
  assert.deepEqual(p('מנוחה 2 דקות'), rx(null, null, null, 120)); // 2*60
  assert.deepEqual(p('3x12, מנוחה 60 שניות'), rx(3, 12, null, 60));
  // limits: reps 500 > 200 -> null; sets stay
  assert.deepEqual(p('3x500'), rx(3, null, null, null));
  // unrelated numbers are not prescriptions
  assert.deepEqual(p('יום 5 של האתגר'), rx(null, null, null, null));
});

test('Hebrew caption becomes a TrainerHub workout in the exact phases shape', () => {
  const c = IG.classifyCaption(HEBREW_CAPTION, catalog);
  assert.equal(c.workout, true);
  assert.equal(c.title, 'אימון בטן וגב היום 💪');
  // 4 exercise lines matched (warmup, plank, בטן_גומיות, superman); the title-line "בטן" is not one
  assert.deepEqual(c.exercises.map((e) => e.id), ['warmup', 'plank', 'בטן_גומיות', 'superman']);

  const post = IG.normalizePost(legacyPosts()[0], { file: 'content/posts_1.json', layout: 'legacy', index: 0 });
  assert.equal(post.post_id, 'ig:1620000000:synthetic_a.jpg');
  assert.equal(post.created_at, '2021-05-03T00:00:00.000Z');
  const w = IG.toWorkout(post, c);
  assert.equal(w.title, 'אימון בטן וגב היום 💪');
  assert.equal(w.saved_id, 'ig:1620000000:synthetic_a.jpg');
  assert.deepEqual(w.phases.map((p) => p.name), ['Warm-up', 'Main', 'Cool-down']);
  // same per-phase minutes core.js toPhasesWorkout emits: 5 + 35 + 5 = 45 = duration_minutes
  assert.deepEqual(w.phases.map((p) => p.duration_minutes), [5, 35, 5]);
  assert.equal(w.duration_minutes, 45);
  assert.deepEqual(w.phases.map((p) => p.exercises.length), [1, 3, 0]);
  assert.deepEqual(w.phases[0].exercises[0], {
    name: 'חימום', id: 'warmup', sets: 1, reps: null, duration_seconds: 300, rest_seconds: null, notes: null
  });
  const main = w.phases[1].exercises;
  assert.deepEqual(Object.keys(main[0]).sort(), ['duration_seconds', 'id', 'name', 'notes', 'reps', 'rest_seconds', 'sets']);
  assert.deepEqual(main[0], { name: main[0].name, id: 'plank', sets: 3, reps: null, duration_seconds: 30, rest_seconds: null, notes: null });
  assert.deepEqual(main[1], { name: 'בטן גומיות', id: 'בטן_גומיות', sets: 3, reps: 12, duration_seconds: null, rest_seconds: 60, notes: null });
  assert.deepEqual(main[2], { name: main[2].name, id: 'superman', sets: 4, reps: 10, duration_seconds: null, rest_seconds: null, notes: null });
  assert.deepEqual(w.tags, ['instagram']);
  assert.equal(w.source.kind, 'instagram-export');
  assert.equal(w.source.layout, 'legacy');
  assert.ok(Array.isArray(w.equipment));
});

test('non-workout posts are skipped with a stated reason', () => {
  const idx = IG.buildCatalogIndex(catalog);
  assert.deepEqual(IG.classifyCaption('', idx).reason, IG.REASONS.no_caption);
  assert.equal(IG.classifyCaption('יום כיף בים עם המשפחה ☀️', idx).reason, IG.REASONS.no_known_exercise);
  assert.equal(IG.classifyCaption('superman challenge!', idx).reason, IG.REASONS.single_mention_no_prescription);
  // two exercise words without numbers still count as a workout (a list of what was done)
  assert.equal(IG.classifyCaption('היום:\nplank\nsuperman', idx).workout, true);
});

test('both export layouts parse; a preview lists added and skipped', () => {
  const r = IG.importFromFiles(files(), { catalog, existing: [] });
  assert.equal(r.ok, true);
  assert.deepEqual(r.files.map((f) => f.layout), ['legacy', 'current']);
  assert.deepEqual(r.files.map((f) => f.posts), [5, 1]);
  // 6 posts: 2 workouts (a, d) added; 4 skipped = b (no exercise), c (single mention), {} and 'not a post' (malformed)
  assert.deepEqual(r.preview.counts, { posts: 6, added: 2, skipped: 4, duplicates: 0 });
  assert.deepEqual(r.preview.added.map((w) => w.saved_id), ['ig:1620000000:synthetic_a.jpg', 'ig:1704067200:synthetic_d1.jpg']);
  assert.deepEqual(r.preview.skipped.map((s) => s.reason), [
    IG.REASONS.no_known_exercise, IG.REASONS.single_mention_no_prescription, IG.REASONS.malformed_post, IG.REASONS.malformed_post
  ]);
  // current-layout post: "3 sets of 12 reps crunches" + "plank 45s" + "rest 30s" attaches to plank
  const d = r.preview.added[1];
  assert.equal(d.source.layout, 'current');
  assert.equal(d.source.created_at, '2024-01-01T00:00:00.000Z');
  assert.equal(d.title, 'Core day');
  assert.deepEqual(d.phases[1].exercises.map((e) => [e.id, e.sets, e.reps, e.duration_seconds, e.rest_seconds]), [
    ['crunches', 3, 12, null, null],
    ['plank', null, null, 45, 30]
  ]);
  assert.equal(d.source.media.length, 2);
});

test('re-import is idempotent: duplicates by post id change nothing', () => {
  const store = fakeStore();
  const first = IG.importFromFiles(files(), { catalog, existing: store.get('k', []) });
  WorkoutLibrary.save(store, 'k', first.preview.added);
  const stored = JSON.stringify(store.get('k', []));
  assert.equal(store.get('k', []).length, 2);

  const second = IG.importFromFiles(files(), { catalog, existing: store.get('k', []) });
  assert.deepEqual(second.preview.counts, { posts: 6, added: 0, skipped: 6, duplicates: 2 });
  assert.equal(JSON.stringify(store.get('k', [])), stored);

  // the same post twice inside one file is also a duplicate
  const twice = IG.buildPreview(IG.parseExportFiles({ 'content/posts_1.json': JSON.stringify([legacyPosts()[0], legacyPosts()[0]]) }).posts, { catalog, existing: [] });
  assert.deepEqual(twice.counts, { posts: 2, added: 1, skipped: 1, duplicates: 1 });
});

test('malformed files are rejected without throwing', () => {
  assert.deepEqual(IG.parseExportFiles({ 'content/posts_1.json': '{ not json' }).error, 'invalid_json');
  assert.deepEqual(IG.parseExportFiles({ 'content/posts_1.json': '{"a":1}' }).error, 'no_posts_found');
  assert.deepEqual(IG.parseExportFiles({}).error, 'no_files');
  assert.deepEqual(IG.parseExportFiles(null).error, 'no_files');
  assert.equal(IG.importFromFiles({ 'x.json': 'null' }, { catalog }).ok, false);
});

test('pure and deterministic: same input, byte-identical output', () => {
  const a = JSON.stringify(IG.importFromFiles(files(), { catalog, existing: [] }));
  const b = JSON.stringify(IG.importFromFiles(files(), { catalog, existing: [] }));
  assert.equal(a, b);
  const src = require('node:fs').readFileSync(path.join(__dirname, '..', 'js', 'instagram-import.js'), 'utf8');
  assert.doesNotMatch(src, /Math\.random|Date\.now|new Date\(\)|fetch\(|XMLHttpRequest|document\.|localStorage/);
});

// --- added 2026-09-15 after an adversarial verifier deleted the classification guard and NOTHING went red.
// These three assertions sit exactly on the `exercises.length < 2 && withRx < 1` boundary: remove that
// rule from js/instagram-import.js and the first one fails. A guard whose deletion keeps the suite green
// has not been tested (LESSONS.md class 10).
test('single_mention_no_prescription boundary: the classification guard is real', () => {
  // ONE known exercise, no parsable prescription ("3 על 12" is not grammar this parser claims to read)
  const one = IG.classifyCaption('אימון קצר\nחימום 3 על 12', catalog);
  assert.equal(one.workout, false, 'one exercise with no prescription must not become a workout');
  assert.equal(one.reason, 'single_mention_no_prescription');
  assert.equal(one.exercises.length, 1, 'the exercise is still reported, only the post is not a workout');

  // the same single exercise WITH a prescription crosses the line
  // (a main exercise: a warm-up on its own is not a workout, see the warm-up-only test below)
  const oneRx = IG.classifyCaption('אימון קצר\nפלאנק 3x12', catalog);
  assert.equal(oneRx.workout, true, 'one exercise with a prescription is a workout');

  // TWO known exercises with no prescription also cross it (withRx < 1 alone is not enough to reject)
  const two = IG.classifyCaption('אימון\nפלאנק\nחימום', catalog);
  assert.equal(two.workout, true, 'two exercises are a workout even without a prescription');
});

test('a reps RANGE is recorded at its low end and disclosed in notes', () => {
  const p = IG.parsePrescription('3 סטים 8-12 חזרות');
  assert.equal(p.sets, 3);
  assert.equal(p.reps, 8, 'the low end, not the high end');
  assert.equal(p.reps_range, '8-12');
  assert.equal(IG.parsePrescription('8 עד 12 חזרות').reps, 8);
  assert.equal(IG.parsePrescription('8 to 12 reps').reps, 8);
  assert.equal(IG.parsePrescription('12 חזרות').reps_range, null, 'a plain number is not a range');

  const c = IG.classifyCaption('אימון\nפלאנק 3 סטים 8-12 חזרות\nחימום 3x10', catalog);
  assert.equal(c.workout, true);
  assert.equal(c.exercises[0].reps, 8);
  assert.equal(c.exercises[0].notes, 'בפוסט נכתב 8-12 חזרות');
  assert.equal(c.exercises[1].notes, null);
});

// --- added 2026-09-24: a warm-up alone is not a workout, and the app's own name tables are used.
test('a caption whose only match is a warm-up is not imported as a workout', () => {
  const recipe = IG.classifyCaption(
    'מתכון לארוחת בוקר: 2 ביצים, חצי כוס שיבולת שועל\nחימום התנור ל-180 מעלות 20 דקות', catalog);
  assert.equal(recipe.workout, false, 'a recipe that warms up an oven is not a workout');
  assert.equal(recipe.reason, IG.REASONS.warmup_only);

  const warmOnly = IG.classifyCaption('אימון קצר\nחימום 3x12', catalog);
  assert.equal(warmOnly.workout, false);
  assert.equal(warmOnly.reason, IG.REASONS.warmup_only);

  const posts = [{ malformed: false, post_id: 'ig:1:a.jpg', caption: 'מתכון\nחימום התנור 20 דקות', created_at: null, media: [], layout: 'current', file: 'x' }];
  const preview = IG.buildPreview(posts, { catalog });
  assert.equal(preview.added.length, 0);
  assert.equal(preview.skipped[0].reason, IG.REASONS.warmup_only);
});

test('exercises are matched through the app name tables, so none of them is dropped', () => {
  const legs = IG.classifyCaption('Leg day\nsquats 4x10\nlunges 3x12\nplank 3x45s', catalog);
  assert.equal(legs.workout, true);
  assert.equal(legs.exercises.length, 3, JSON.stringify(legs.exercises));
  assert.deepEqual(legs.exercises.map((e) => [e.name, e.sets, e.reps, e.duration_seconds]), [
    ['סקוואט', 4, 10, null],
    ['מכרעים', 3, 12, null],
    ['פלאנק', 3, null, 45]
  ]);

  const heb = IG.classifyCaption('חימום 10 דקות\nשכיבות שמיכה 3x15\nסופרמן 3x12', catalog);
  assert.equal(heb.workout, true);
  assert.equal(heb.exercises.length, 3, JSON.stringify(heb.exercises));
  assert.deepEqual(heb.exercises.map((e) => [e.id, e.name, e.sets, e.reps, e.duration_seconds]), [
    ['warmup', 'חימום', null, null, 600],
    ['אתגר_שכיבות_שמיכה', 'שכיבות שמיכה', 3, 15, null],
    ['superman', 'סופרמן', 3, 12, null]
  ]);
  const w = IG.toWorkout({ post_id: 'ig:1:a.jpg', caption: '', created_at: null, media: [], layout: 'current', file: 'x' }, heb);
  assert.equal(w.phases[0].exercises.length, 1, 'warm-up phase');
  assert.equal(w.phases[1].exercises.length, 2, 'main phase keeps both exercises');

  // a table name is matched as a whole word, not inside another word
  const beginners = IG.classifyCaption('אימון\nמתאים למתחילים 3 סטים', catalog);
  assert.equal(beginners.exercises.some((e) => e.id === 'pull_up'), false, '"מתח" is not inside "למתחילים"');
});

test('both import pages have Hebrew text for every skip reason', () => {
  const fs = require('node:fs');
  // The saved page never parses own-posts files, so malformed_post cannot reach it.
  const pages = { 'instagram-import.html': [], 'instagram-saved.html': ['malformed_post'] };
  for (const page of Object.keys(pages)) {
    const html = fs.readFileSync(path.join(__dirname, '..', 'frontend', page), 'utf8');
    for (const reason of Object.keys(IG.REASONS).filter((r) => pages[page].indexOf(r) === -1)) {
      assert.match(html, new RegExp('\\b' + reason + ":\\s*'[^']*[\\u0590-\\u05FF]"), page + ' has no Hebrew text for ' + reason);
    }
  }
});
