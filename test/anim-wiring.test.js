'use strict';

// Code-drawn animations (tools/anim) stand in for the original clips of the
// same movement. tools/anim/wire.js copies one MP4 + poster per animation to
// media/anim/, points the poster of every mapped row at it, and writes
// videos/anim-map.json. Playback of the mapped Drive ids is unchanged here.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const TH = require('../js/core.js');
const THReels = require('../js/reel-library.js');

const root = path.join(__dirname, '..');
const read = function (p) {
  return JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
};
const animMap = read('videos/anim-map.json');
const clipMap = read('tools/anim/clip-map.json').animations;
const local = read('js/catalog.json');
const drive = read('videos/drive-catalog.json');
const youtube = read('videos/youtube-catalog.json');
const driveVideos = read('data/drive_videos.json');
const manifest = read('videos/media-manifest.json');

const anims = Object.keys(animMap.animations);
const animOf = new Map();
anims.forEach(function (a) {
  animMap.animations[a].driveIds.forEach(function (id) {
    animOf.set(id, a);
  });
});
const catalogRows = Object.keys(local)
  .map(function (k) {
    return local[k];
  })
  .concat(drive.items);

test('anim-map lists 61 animations for 221 Drive ids, the same as the clip map', function () {
  assert.equal(anims.length, 61);
  assert.equal(animOf.size, 221);
  assert.deepEqual(animMap.count, { animations: 61, driveIds: 221 });
  assert.deepEqual(anims.slice().sort(), Object.keys(clipMap).sort());
  anims.forEach(function (a) {
    const entry = animMap.animations[a];
    assert.deepEqual(
      entry.driveIds,
      clipMap[a].replaces.map(function (r) {
        return r.driveId;
      }),
      a
    );
    assert.deepEqual(
      entry.clips.map(function (c) {
        return c.driveId;
      }),
      entry.driveIds,
      a
    );
    assert.equal(entry.media, 'media/anim/' + a + '.mp4');
    assert.equal(entry.poster, 'media/anim/' + a + '.jpg');
  });
  // No Drive id is mapped to two animations.
  assert.equal(
    anims.reduce(function (n, a) {
      return n + animMap.animations[a].driveIds.length;
    }, 0),
    221
  );
});

test('each animation has one small MP4 and one JPEG poster in media/anim', function () {
  const files = fs.readdirSync(path.join(root, 'media', 'anim')).sort();
  const expected = [];
  anims.forEach(function (a) {
    expected.push(a + '.jpg', a + '.mp4');
  });
  assert.deepEqual(files, expected.sort());
  let total = 0;
  anims.forEach(function (a) {
    const mp4 = fs.readFileSync(path.join(root, animMap.animations[a].media));
    const jpg = fs.readFileSync(path.join(root, animMap.animations[a].poster));
    assert.equal(mp4.toString('latin1', 4, 8), 'ftyp', a + ' is an MP4');
    assert.equal(jpg.readUInt16BE(0), 0xffd8, a + ' poster is a JPEG');
    assert.ok(mp4.length < 400 * 1024, a + '.mp4 is ' + mp4.length + ' bytes');
    assert.ok(jpg.length < 60 * 1024, a + '.jpg is ' + jpg.length + ' bytes');
    total += mp4.length + jpg.length;
  });
  assert.ok(total < 5 * 1024 * 1024, 'media/anim is ' + total + ' bytes');
});

test('every mapped Drive id, and no other row, shows its animation poster', function () {
  const wired = new Set();
  catalogRows.forEach(function (e) {
    // A release-file row plays its live Drive copy (drivePlayId); a Drive reel row plays driveId.
    const id = animOf.has(e.drivePlayId) ? e.drivePlayId : animOf.has(e.driveId) ? e.driveId : '';
    if (!id) {
      assert.equal(e.anim, undefined, e.id);
      assert.equal(e.originalPoster, undefined, e.id);
      return;
    }
    wired.add(id);
    assert.equal(e.anim, animOf.get(id), e.id);
    assert.equal(e.poster, 'media/anim/' + e.anim + '.jpg', e.id);
    assert.equal(typeof e.originalPoster, 'string', e.id + ' keeps its previous poster');
    assert.notEqual(e.originalPoster, e.poster, e.id);
    if (e.originalPoster) assert.ok(fs.existsSync(path.join(root, e.originalPoster)), e.originalPoster);
  });
  driveVideos.forEach(function (v) {
    if (!animOf.has(v.fileId)) {
      assert.equal(v.anim, undefined, v.fileId);
      assert.equal(v.originalPoster, undefined, v.fileId);
      return;
    }
    wired.add(v.fileId);
    assert.equal(v.anim, animOf.get(v.fileId), v.name);
    assert.equal(v.poster, 'media/anim/' + v.anim + '.jpg', v.name);
    assert.equal(typeof v.originalPoster, 'string', v.name);
  });
  youtube.items.forEach(function (e) {
    assert.equal(e.anim, undefined, e.id);
  });
  assert.equal(wired.size, 221);
  // anim-map names the rows it wired.
  anims.forEach(function (a) {
    animMap.animations[a].clips.forEach(function (c) {
      assert.ok(Object.keys(c.rows).length >= 1, c.driveId);
    });
  });
});

test('library and exercises-page cards render the animation poster', function () {
  const merged = TH.mergeCatalogs(TH.mergeCatalogs(local, drive, []), youtube, []);
  TH.setCatalog(merged);
  const listed = TH.catalogList().filter(function (e) {
    return /^media\/anim\//.test(e.poster);
  });
  assert.equal(listed.length, 192, 'catalog cards on an animation poster');
  listed.forEach(function (e) {
    assert.equal(TH.posterUrl(e), e.poster, e.id);
    const html = TH.mediaMarkup(e, { className: 'ex-media' });
    assert.ok(html.indexOf('th-facade-thumb') !== -1, e.id);
    assert.ok(html.indexOf(e.poster) !== -1, e.id);
    assert.doesNotMatch(html, /drive\.google\.com\/thumbnail/, e.id);
  });
  const esc = function (s) {
    return String(s);
  };
  const cards = THReels.driveVideosToExercises(driveVideos).filter(function (c) {
    return animOf.has(c.file_id);
  });
  assert.equal(cards.length, 214);
  cards.forEach(function (c) {
    const html = THReels.exerciseCardHtml(c, esc);
    assert.ok(html.indexOf('media/anim/' + animOf.get(c.file_id) + '.jpg') !== -1, c.name_he);
    assert.doesNotMatch(html, /drive\.google\.com\/thumbnail/, c.name_he);
  });
});

test('the original clips stay reachable: Drive ids and hosted copies are untouched', function () {
  animOf.forEach(function (a, id) {
    assert.match(manifest.files[id] || '', new RegExp('/' + id + '\\.mp4$'), id);
  });
  anims.forEach(function (a) {
    animMap.animations[a].clips.forEach(function (c) {
      assert.equal(c.originalMedia, manifest.files[c.driveId], c.driveId);
    });
  });
  // Wiring adds `anim` / `originalPoster` and changes `poster`; nothing that picks the player.
  catalogRows
    .filter(function (e) {
      return e.anim;
    })
    .forEach(function (e) {
      assert.ok(animOf.has(e.driveId) || animOf.has(e.drivePlayId), e.id);
      if (e.source === 'drive') assert.equal(e.file, undefined, e.id);
      else assert.match(e.file, /releases\/download\/trainerhub-media-v1\/thv-\d{3}\.mp4$/, e.id);
    });
});

test('tools/anim/wire.js --check finds the data files in sync', function () {
  const r = spawnSync(process.execPath, [path.join(root, 'tools', 'anim', 'wire.js'), '--check'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /0 file\(s\) differ/);
});
