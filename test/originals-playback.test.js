// Meta AI originals replace third-party players. Existing exercise ids stay.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const TH = require('../js/core.js');

const root = path.join(__dirname, '..');
const read = (p) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
const originals = read('videos/originals-catalog.json');
const manifest = read('videos/media-manifest.json');
const THIRD =
  /youtube\.com|youtu\.be|instagram\.com|facebook\.com|tiktok\.com|drive\.google\.com|i\.ytimg\.com|<iframe/;

function load() {
  TH.setMediaManifest(manifest);
  let merged = TH.mergeCatalogs(
    TH.mergeCatalogs(read('js/catalog.json'), read('videos/drive-catalog.json'), []),
    read('videos/youtube-catalog.json'),
    []
  );
  merged = TH.mergeCatalogs(merged, originals, []);
  TH.setCatalog(merged);
}

test('published originals are catalog exercises with a hosted mp4', () => {
  load();
  const withheld = originals.items.filter((clip) => clip.available === false);
  assert.deepEqual(withheld, []);
  const restored = {
    'E01-06': 'פתיחת חזה וכתפיים בעמידה',
    '05-08': 'אימון בטן 3 דקות',
    'E04-09': 'ליבה של מתאבק',
    'E04-10': 'אלכסונים עם משקולת',
    '07-06': 'תחנות עם קונוסים',
    '07-HIIT-10': 'ריצת שאטל'
  };
  Object.keys(restored).forEach((code) => {
    const clip = originals.items.find((item) => item.code === code);
    assert.equal(clip.he, restored[code], code);
    assert.deepEqual(clip.covers, [], code);
    assert.ok(TH.catalog[clip.id], code);
    assert.equal(manifest.files[clip.id] != null, true, code);
  });
  const published = originals.items.filter((clip) => clip.available !== false);
  assert.equal(published.length, 107);
  published.forEach((clip) => {
    assert.equal(manifest.files[clip.id], clip.folder && manifest.files[clip.id]);
    assert.match(manifest.files[clip.mediaId], new RegExp('/' + clip.mediaId + '\\.mp4$'));
    const row = TH.catalog[clip.id];
    assert.equal(row.he, clip.he, clip.id);
    assert.equal(row.original, true, clip.id);
    assert.deepEqual(row.muscles, clip.muscles);
    const html = TH.mediaMarkup(row, { className: 'ex-media', eager: true });
    assert.ok(
      html.includes('src="https://swissystem7.github.io/TrainerHub-media/' + manifest.files[clip.mediaId] + '"')
    );
    assert.doesNotMatch(html, THIRD);
  });
});

test('every match id plays an original and keeps its id', () => {
  load();
  const ids = new Set();
  originals.items.forEach((clip) => {
    clip.covers.forEach((id) => {
      ids.add(id);
    });
  });
  assert.equal(ids.size, 50);
  ids.forEach((id) => {
    const found = TH.findExercise({ id: id, name: id });
    assert.equal(found.id, id, id);
    const html = TH.mediaMarkup(found, { className: 'ex-media', eager: true });
    assert.match(html, /metaai-[a-z0-9-]+\.mp4/, id);
    assert.match(html, /<video/, id);
    assert.doesNotMatch(html, THIRD, id);
  });
});

test('unmapped ids return to the coming-soon placeholder', () => {
  load();
  ['yt_military_press', 'glute_bridge', 'yt_cable_face_pull', 'superman', 'dumbbell_bench'].forEach((id) => {
    const found = TH.findExercise({ id: id });
    const html = TH.mediaMarkup(
      found || { id: id, he: id, source: 'youtube', youtubeId: 'xxxxxxxxxxx', thirdParty: true },
      { className: 'ex-media', eager: true }
    );
    assert.match(html, /הסרטון יעלה בקרוב/, id);
    assert.doesNotMatch(html, /metaai-/, id);
    assert.doesNotMatch(html, THIRD, id);
  });
  const db = TH.mediaMarkup(TH.findExercise({ id: 'yt_db_shoulder_press' }), { className: 'ex-media', eager: true });
  assert.match(db, /metaai-e01-01\.mp4/);
});

test('an exercise with no original shows a placeholder and no third-party URL', () => {
  load();
  const row = TH.catalog.yt_hamstring_lunge || TH.catalogList().find((e) => e.source === 'youtube' && e.thirdParty);
  assert.ok(row);
  const html = TH.mediaMarkup(row, { className: 'ex-media', eager: true });
  assert.match(html, /הסרטון יעלה בקרוב/);
  assert.doesNotMatch(html, THIRD);
  assert.equal(TH.isPlayable(row), true);
});
