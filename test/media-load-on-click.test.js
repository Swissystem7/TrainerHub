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

test('Drive and YouTube rows render a coming-soon placeholder, not a player', function () {
  const drive = TH.mediaMarkup({ he: 'פלאנק', driveId: '1tLFxcQifJQgGYRZD20YQticZ0S4psv2r', source: 'drive' }, { className: 'ex-media' });
  assert.match(drive, /הסרטון יעלה בקרוב/);
  assert.doesNotMatch(drive, /<iframe|<video|drive\.google\.com|data-th-frame/);
  const yt = TH.mediaMarkup({ he: 'סקוואט', youtubeId: 'PlDqgNcJJ2U' }, { className: 'ex-media' });
  assert.match(yt, /הסרטון יעלה בקרוב/);
  assert.doesNotMatch(yt, /<iframe|youtube\.com|i\.ytimg\.com/);
});

test('eager workout mode still does not embed YouTube', function () {
  const html = TH.mediaMarkup({ he: 'סקוואט', youtubeId: 'PlDqgNcJJ2U' }, { className: 'ex-media', eager: true });
  assert.match(html, /הסרטון יעלה בקרוב/);
  assert.doesNotMatch(html, /<iframe|youtube\.com/);
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

test('clicking a YouTube or Drive facade does not create a player', function () {
  TH.registerFrameSrc('https://www.youtube.com/embed/PlDqgNcJJ2U?start=5');
  TH.registerFrameSrc('https://drive.google.com/file/d/1tLFxcQifJQgGYRZD20YQticZ0S4psv2r/preview');
  const yt = fakeButton({ 'data-th-frame': 'https://www.youtube.com/embed/PlDqgNcJJ2U?start=5', 'data-th-frame-title': 'סקוואט',
    'data-th-frame-allow': 'autoplay; encrypted-media', class: 'ex-media ex-media-facade' });
  assert.equal(TH.activateMediaFrame(yt.btn), null);
  assert.equal(yt.parent.replaced, null);
  const dr = fakeButton({ 'data-th-frame': 'https://drive.google.com/file/d/1tLFxcQifJQgGYRZD20YQticZ0S4psv2r/preview',
    'data-th-frame-allow': 'autoplay; fullscreen', class: 'drive-frame drive-frame-facade' });
  assert.equal(TH.activateMediaFrame(dr.btn), null);
  assert.equal(TH.activateMediaFrame({ getAttribute: function () { return null; } }), null);
});

function bad_register_check() {
  ['javascript:alert(1)', 'https://evil.example/preview', 'data:text/html,hi'].forEach(function (bad) {
    assert.equal(TH.registerFrameSrc(bad), false, bad);
  });
  // A well-formed URL that this page never rendered is not opened either.
  const unknown = fakeButton({ 'data-th-frame': 'https://www.youtube.com/embed/AAAAAAAAAAA', class: 'ex-media ex-media-facade' });
  assert.equal(TH.activateMediaFrame(unknown.btn), null);
}

test('a facade only ever loads a Drive preview or a YouTube embed rebuilt from its id', function () {
  ['javascript:alert(1)', 'https://evil.example/preview', 'https://drive.google.com/file/d/abc"><script>/preview',
    'https://www.youtube.com/embed/PlDqgNcJJ2U?start=1&x=javascript:', 'data:text/html,hi', 'https://drive.google.com.evil.io/file/d/1tLFxcQifJQgGYRZD20YQticZ0S4psv2r/preview']
    .forEach(function (bad) {
      const fb = fakeButton({ 'data-th-frame': bad, class: 'ex-media ex-media-facade' });
      assert.equal(TH.activateMediaFrame(fb.btn), null, bad);
      assert.equal(fb.parent.replaced, null, bad);
    });
  bad_register_check();
  assert.equal(TH.registerFrameSrc('https://www.youtube.com/embed/PlDqgNcJJ2U?start=5&end=30'), true);
  const ok = fakeButton({ 'data-th-frame': 'https://www.youtube.com/embed/PlDqgNcJJ2U?start=5&end=30', class: 'ex-media ex-media-facade x"y' });
  assert.equal(TH.activateMediaFrame(ok.btn), null);
  assert.equal(ok.parent.replaced, null);
});

test('rendered third-party cards contain no player URL', function () {
  [
    TH.mediaMarkup({ he: 'א', driveId: '1tLFxcQifJQgGYRZD20YQticZ0S4psv2r', source: 'drive' }),
    TH.mediaMarkup({ he: 'ב', youtubeId: 'PlDqgNcJJ2U', startSec: 12, endSec: 40 }),
    TH.mediaMarkup({ he: 'ג', youtubeId: 'PlDqgNcJJ2U' })
  ].forEach(function (html) {
    assert.match(html, /הסרטון יעלה בקרוב/);
    assert.doesNotMatch(html, /data-th-frame|youtube\.com|drive\.google\.com|<iframe/);
  });
});

test('reels page Drive cards do not register a third-party player', function () {
  const ex = THReels.driveVideosToExercises([{ fileId: '1ZvTfInYpDspk7eqZ2NRNPi-L8hDGeypQ', name: 'א - X.mp4', folder: 'כושר/חזה', muscleGroup: 'חזה' }])[0];
  globalThis.TH = TH;
  let html;
  try { html = THReels.exerciseCardHtml(ex, TH.esc); } finally { delete globalThis.TH; }
  assert.doesNotMatch(html, /data-th-frame|drive\.google\.com/);
  const fb = fakeButton({ 'data-th-frame': 'https://drive.google.com/file/d/1ZvTfInYpDspk7eqZ2NRNPi-L8hDGeypQ/preview', class: 'drive-frame drive-frame-facade' });
  assert.equal(TH.activateMediaFrame(fb.btn), null);
});

test('reels page Drive cards show a coming-soon placeholder', function () {
  const ex = THReels.driveVideosToExercises([{ fileId: '1tLFxcQifJQgGYRZD20YQticZ0S4psv2r', name: 'פלאנק - X.mp4', folder: 'כושר/בטן', muscleGroup: 'בטן' }])[0];
  const html = THReels.exerciseCardHtml(ex, TH.esc);
  assert.doesNotMatch(html, /<iframe|drive\.google\.com|data-th-frame/);
  assert.match(html, /הסרטון יעלה בקרוב/);
  assert.match(html, /data-add=/);
});

test('the play button style ships in css/app.css', function () {
  const css = read('css/app.css');
  assert.match(css, /button\.ex-media-facade,\s*button\.drive-frame-facade \{/);
  assert.match(css, /\.ex-media-play \{/);
  assert.match(css, /\.ex-media-play::after \{/);
});

test('library search box does not re-render the grid again on blur (it would drop an opened player)', function () {
  const html = read('library.html');
  assert.match(html, /if \(e && e\.type === 'change' && e\.target && e\.target\.id === 'q'\) return;/);
});
