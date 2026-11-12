'use strict';

// Load-on-click players: list pages show a thumbnail + play button and create
// the Drive/YouTube iframe only when it is clicked, so ~300 cards no longer
// start ~300 players at once.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const TH = require('../js/core.js');
const THReels = require('../js/reel-library.js');

const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

function fakeButton(attrs) {
  const doc = {
    createElement: function (tag) {
      const el = { tagName: tag.toUpperCase(), attrs: {}, focused: false };
      el.setAttribute = function (k, v) { el.attrs[k] = String(v); };
      el.focus = function () { el.focused = true; };
      return el;
    }
  };
  const parent = { replaced: null, replaceChild: function (n, o) { this.replaced = [n, o]; } };
  const btn = { attrs: attrs, ownerDocument: doc, parentNode: parent,
    getAttribute: function (k) { return k in attrs ? attrs[k] : null; } };
  return { btn, parent };
}

test('Drive and YouTube rows render a play button with a thumbnail, not an iframe', function () {
  const drive = TH.mediaMarkup({ he: 'פלאנק', driveId: '1tLFxcQifJQgGYRZD20YQticZ0S4psv2r', source: 'drive' }, { className: 'ex-media' });
  assert.doesNotMatch(drive, /<iframe/);
  assert.match(drive, /<button type="button" class="ex-media ex-media-facade"/);
  assert.match(drive, /data-th-frame="https:\/\/drive\.google\.com\/file\/d\/1tLFxcQifJQgGYRZD20YQticZ0S4psv2r\/preview"/);
  assert.match(drive, /<img class="th-facade-thumb" src="https:\/\/drive\.google\.com\/thumbnail\?id=1tLFxcQifJQgGYRZD20YQticZ0S4psv2r&amp;sz=w480" alt="" loading="lazy"/);
  assert.match(drive, /aria-label="הפעלת סרטון: פלאנק"/);
  const yt = TH.mediaMarkup({ he: 'סקוואט', youtubeId: 'PlDqgNcJJ2U' }, { className: 'ex-media' });
  assert.doesNotMatch(yt, /<iframe/);
  assert.match(yt, /data-th-frame="https:\/\/www\.youtube\.com\/embed\/PlDqgNcJJ2U"/);
  assert.match(yt, /i\.ytimg\.com\/vi\/PlDqgNcJJ2U\/hqdefault\.jpg/);
});

test('eager keeps the immediate iframe for single-player views', function () {
  const html = TH.mediaMarkup({ he: 'סקוואט', youtubeId: 'PlDqgNcJJ2U' }, { className: 'ex-media', eager: true });
  assert.match(html, /<iframe class="ex-media"[^>]*src="https:\/\/www\.youtube\.com\/embed\/PlDqgNcJJ2U"/);
  assert.match(read('frontend/workout-mode.html'), /mediaMarkup\(clip, \{ className: 'ex-media', eager: true \}\)/);
  assert.doesNotMatch(read('frontend/workout-mode.html'), /mediaMarkup\(clip, \{ className: 'ex-media' \}\)/);
});

test('list pages do not ask for eager players', function () {
  ['library.html', 'reserves.html'].forEach(function (p) {
    assert.doesNotMatch(read(p), /eager:\s*true/, p);
  });
  // index.html: only the one-off segment player is eager, never the workout result list.
  const index = read('index.html');
  assert.equal((index.match(/eager:\s*true/g) || []).length, 1);
  assert.match(index, /var media = clip \? TH\.mediaMarkup\(clip, \{ className: 'ex-media' \}\)/);
});

test('clicking a facade swaps in the iframe, with autoplay for YouTube', function () {
  const yt = fakeButton({ 'data-th-frame': 'https://www.youtube.com/embed/PlDqgNcJJ2U?start=5', 'data-th-frame-title': 'סקוואט',
    'data-th-frame-allow': 'autoplay; encrypted-media', class: 'ex-media ex-media-facade' });
  const f = TH.activateMediaFrame(yt.btn);
  assert.equal(f.tagName, 'IFRAME');
  assert.equal(f.attrs.src, 'https://www.youtube.com/embed/PlDqgNcJJ2U?start=5&autoplay=1');
  assert.equal(f.attrs.class, 'ex-media');
  assert.equal(f.attrs.title, 'סקוואט');
  assert.equal(f.attrs.allow, 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
  assert.equal(f.attrs.allowfullscreen, '');
  assert.equal(yt.parent.replaced[0], f);
  assert.equal(yt.parent.replaced[1], yt.btn);
  assert.equal(f.focused, true);
  const dr = fakeButton({ 'data-th-frame': 'https://drive.google.com/file/d/1tLFxcQifJQgGYRZD20YQticZ0S4psv2r/preview',
    'data-th-frame-allow': 'autoplay; fullscreen', class: 'drive-frame drive-frame-facade' });
  const g = TH.activateMediaFrame(dr.btn);
  assert.equal(g.attrs.src, 'https://drive.google.com/file/d/1tLFxcQifJQgGYRZD20YQticZ0S4psv2r/preview');
  assert.equal(g.attrs.class, 'drive-frame');
  assert.equal(g.attrs.referrerpolicy, 'no-referrer-when-downgrade');
  assert.equal(g.attrs.allow, 'autoplay; fullscreen');
  assert.equal(TH.activateMediaFrame({ getAttribute: function () { return null; } }), null);
});

test('a facade only ever loads a Drive preview or a YouTube embed rebuilt from its id', function () {
  ['javascript:alert(1)', 'https://evil.example/preview', 'https://drive.google.com/file/d/abc"><script>/preview',
    'https://www.youtube.com/embed/PlDqgNcJJ2U?start=1&x=javascript:', 'data:text/html,hi', 'https://drive.google.com.evil.io/file/d/1tLFxcQifJQgGYRZD20YQticZ0S4psv2r/preview']
    .forEach(function (bad) {
      const fb = fakeButton({ 'data-th-frame': bad, class: 'ex-media ex-media-facade' });
      assert.equal(TH.activateMediaFrame(fb.btn), null, bad);
      assert.equal(fb.parent.replaced, null, bad);
    });
  const ok = fakeButton({ 'data-th-frame': 'https://www.youtube.com/embed/PlDqgNcJJ2U?start=5&end=30', class: 'ex-media ex-media-facade x"y' });
  const f = TH.activateMediaFrame(ok.btn);
  assert.equal(f.attrs.src, 'https://www.youtube.com/embed/PlDqgNcJJ2U?start=5&end=30&autoplay=1');
  assert.equal(f.attrs.class, 'ex-media');
});

test('every facade the app renders passes the allowlist', function () {
  const urls = [
    TH.mediaMarkup({ he: 'א', driveId: '1tLFxcQifJQgGYRZD20YQticZ0S4psv2r', source: 'drive' }),
    TH.mediaMarkup({ he: 'ב', youtubeId: 'PlDqgNcJJ2U', startSec: 12, endSec: 40 }),
    TH.mediaMarkup({ he: 'ג', youtubeId: 'PlDqgNcJJ2U' })
  ].map(function (h) { return h.match(/data-th-frame="([^"]+)"/)[1].replace(/&amp;/g, '&'); });
  urls.forEach(function (u) {
    const fb = fakeButton({ 'data-th-frame': u, class: 'ex-media ex-media-facade' });
    assert.ok(TH.activateMediaFrame(fb.btn), u);
  });
});

test('reels page Drive cards use the same play button', function () {
  const ex = THReels.driveVideosToExercises([{ fileId: '1tLFxcQifJQgGYRZD20YQticZ0S4psv2r', name: 'פלאנק - X.mp4', folder: 'כושר/בטן', muscleGroup: 'בטן' }])[0];
  const html = THReels.exerciseCardHtml(ex, TH.esc);
  assert.doesNotMatch(html, /<iframe/);
  assert.match(html, /class="drive-frame drive-frame-facade"/);
  assert.match(html, /<span class="ex-media-play" aria-hidden="true"><\/span>/);
  assert.match(html, /<img class="th-facade-thumb is-cover" src="https:\/\/drive\.google\.com\/thumbnail\?id=1tLFxcQifJQgGYRZD20YQticZ0S4psv2r&amp;sz=w480" alt="" loading="lazy"/);
});

test('the play button style ships in css/app.css', function () {
  const css = read('css/app.css');
  assert.match(css, /button\.ex-media-facade,\s*button\.drive-frame-facade \{/);
  assert.match(css, /\.ex-media-play \{/);
  assert.match(css, /\.ex-media-play::after \{/);
});
