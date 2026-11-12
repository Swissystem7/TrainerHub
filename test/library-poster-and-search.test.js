'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const TH = require('../js/core.js');
const THReels = require('../js/reel-library.js');

const root = path.join(__dirname, '..');
const drive = require('../videos/drive-catalog.json');
const exercises = require('../data/exercises.json');
const driveVideos = require('../data/drive_videos.json');
const catalog = require('../js/catalog.json');

function esc(s) {
  return String(s == null ? '' : s);
}

test('a hosted file never gets a Drive poster from driveId or legacyDriveId', function () {
  const withFile = drive.items.filter(function (item) { return item.file; });
  assert.ok(withFile.length >= 40, 'expected the mirrored Drive rows');
  withFile.forEach(function (item) {
    assert.ok(item.driveId || item.legacyDriveId, item.id + ' still keeps its Drive id');
    assert.equal(TH.posterUrl(item), '', item.id);
    assert.equal(THReels.posterUrl(item), '', item.id);
    const html = TH.mediaMarkup(item, { className: 'ex-media' });
    // The play button may show the live copy's thumbnail (drivePlayId), never a stale id's.
    (html.match(/drive\.google\.com\/thumbnail\?id=([A-Za-z0-9_-]+)/g) || []).forEach(function (u) {
      assert.equal(u, 'drive.google.com/thumbnail?id=' + item.drivePlayId, item.id);
    });
    assert.doesNotMatch(html, /\sposter=/);
    // Only the verified live copy (drivePlayId) may appear; a stale driveId never does.
    if (item.driveId && item.driveId !== item.drivePlayId) assert.equal(html.includes(item.driveId), false, item.id);
    if (item.legacyDriveId && item.legacyDriveId !== item.drivePlayId) assert.equal(html.includes(item.legacyDriveId), false, item.id);
  });
  // The ids stay in the catalog file.
  assert.match(fs.readFileSync(path.join(root, 'videos', 'drive-catalog.json'), 'utf8'), /legacyDriveId/);
});

test('poster URLs are YouTube hqdefault, a live Drive thumbnail, or nothing', function () {
  assert.equal(
    TH.posterUrl({ youtubeId: 'FLDeOadsIsM' }),
    'https://i.ytimg.com/vi/FLDeOadsIsM/hqdefault.jpg'
  );
  assert.equal(
    THReels.posterUrl({ youtubeId: 'FLDeOadsIsM' }),
    'https://i.ytimg.com/vi/FLDeOadsIsM/hqdefault.jpg'
  );
  assert.equal(
    TH.posterUrl({ driveId: 'abc12345', legacyDriveId: 'deadlegacy1' }),
    'https://drive.google.com/thumbnail?id=abc12345&sz=w480'
  );
  assert.equal(TH.posterUrl({ legacyDriveId: 'deadlegacy1' }), '');
  assert.equal(THReels.posterUrl({ legacyDriveId: 'deadlegacy1', driveId: '', file_id: '' }), '');
  const guarded = {
    file: 'https://github.com/Swissystem7/TrainerHub/releases/download/trainerhub-media-v1/thv-016.mp4',
    driveId: '1pkjqejGS1Ymc3vA8vYRZwjw4lm-_XTI-',
    legacyDriveId: '1pkjqejGS1Ymc3vA8vYRZwjw4lm-_XTI-'
  };
  assert.equal(TH.posterUrl(guarded), '');
  assert.doesNotMatch(TH.mediaMarkup(guarded, { className: 'ex-media' }), /poster=|drive\.google\.com/);
});

test('reel poster builder never points at a missing local poster', function () {
  exercises.exercises.forEach(function (ex) {
    const src = THReels.posterSources(ex);
    [src.primary, src.secondary].filter(Boolean).forEach(function (url) {
      assert.equal(url.indexOf('..'), -1, url);
      assert.doesNotMatch(url, /drive\.google\.com\/thumbnail|maxresdefault|mqdefault|assets\/posters\/[^/]+\.png$/i, url);
      assert.equal(url.indexOf('posters/') === 0, false, url);
      if (!/^https?:/i.test(url)) assert.ok(fs.existsSync(path.join(root, url)), url);
    });
    if (!ex.poster) {
      assert.equal(src.primary, '');
      assert.equal(src.secondary, '');
      const html = THReels.posterFrameHtml(ex, esc);
      assert.doesNotMatch(html, /<img/);
      assert.match(html, /poster-fallback/);
    } else {
      const html = THReels.posterFrameHtml(ex, esc);
      assert.match(html, /onerror="this\.classList\.add\('is-broken'\)"/);
    }
  });
  const bare = THReels.posterSources({ id: 'ig-DdHOFvtKk9z', poster: '' });
  assert.deepEqual(bare, { primary: '', secondary: '' });
});

test('סופרמן and superman find the catalog clip and the reel rows', function () {
  TH.setCatalog(catalog);
  ['סופרמן', 'superman', 'סוּפּרמן', 'Super-Man'].forEach(function (q) {
    const ids = TH.filterCatalog({ q: q }).map(function (e) { return e.id; });
    assert.ok(ids.indexOf('superman') !== -1, q + ' -> ' + ids.join(','));
  });
  const list = exercises.exercises.concat(THReels.driveVideosToExercises(driveVideos));
  const he = THReels.filterExercises(list, { query: 'סופרמן' });
  const en = THReels.filterExercises(list, { query: 'superman' });
  assert.ok(he.length > 0, 'hebrew superman rows');
  assert.ok(en.length > 0, 'english superman rows');
  he.concat(en).forEach(function (ex) {
    const blob = JSON.stringify(ex);
    assert.match(blob, /סופרמן|superman/i);
  });
});
