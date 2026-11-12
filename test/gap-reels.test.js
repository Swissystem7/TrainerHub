'use strict';

// Reels added for the gaps: site-scan drills and builder muscle + equipment
// combos that had no clip. Each one was downloaded and checked frame by frame.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const TH = require('../js/core.js');

const root = path.join(__dirname, '..');
const read = function (p) { return JSON.parse(fs.readFileSync(path.join(root, p), 'utf8')); };
const drive = read('videos/drive-catalog.json');
const merged = TH.mergeCatalogs(TH.mergeCatalogs(read('js/catalog.json'), drive, []), read('videos/youtube-catalog.json'), []);

const CODES = ['Dcvx6G3gBl3', 'DYcrXu7uqtz', 'Dc35kyVOgs-', 'DY51NRARnRU', 'DeIx0eEB1S2', 'DYR_eAcuJqa',
  'Da80H-5BIL5', 'DWcOcaqEtOw', 'DeeC8qEoYyZ', 'DVuBFwQkvZn', 'DVrw6Hnk4Dx', 'DbTkKIEobxw',
  'DeCJKWUMaR3', 'DQRgIA8DC_V', 'DfSwgZbyXZU', 'DX5AVmXvjeQ', 'Ddn1lCtP4Wn', 'DeP5OSUoSTb', 'DJkOTWcsz0b'];

function row(code) {
  return drive.items.find(function (e) { return e.sourceUrl === 'https://www.instagram.com/reel/' + code + '/'; });
}

test('every gap reel is a Drive row with its own poster', function () {
  CODES.forEach(function (c) {
    const e = row(c);
    assert.ok(e, c);
    assert.equal(e.poster, 'assets/posters/' + c + '.jpg');
    assert.ok(fs.existsSync(path.join(root, e.poster)), e.poster);
    const m = merged[e.id];
    assert.equal(TH.playableKind(m), 'drive', e.id);
    assert.equal(TH.posterUrl(m), e.poster);
  });
});

test('builder combos that fell back to the closest clip now have a real one', function () {
  const rows = Object.keys(merged).map(function (k) { return merged[k]; }).filter(TH.isPlayable);
  [['chest', 'tennis-ball'], ['chest', 'football'], ['back', 'ball'], ['shoulders', 'cones'], ['triceps', 'stairs']]
    .forEach(function (pair) {
      assert.ok(rows.some(function (e) {
        return e.muscles.indexOf(pair[0]) !== -1 && e.equipment.indexOf(pair[1]) !== -1;
      }), pair.join('+'));
    });
});

test('stretches stay out of the Main phase', function () {
  global.TH = TH;
  require('../js/infer.js');
  require('../js/prompt-parser.js');
  const E = require('../js/session-builder.js');
  TH.setCatalog(merged);
  const kept = new Set(drive.items.filter(function (e) {
    return e.folder === 'מתיחות וגמישות';
  }).map(function (e) { return e.he; }));
  assert.ok(kept.size >= 4);
  ['אימון גב', 'אימון רגליים', 'אימון חזה', 'אימון ידיים', 'אימון גוף מלא'].forEach(function (t) {
    ['none', 'stairs', 'cones', 'ball'].forEach(function (eq) {
      const req = THPrompt.parsePrompt(t);
      req.duration = 30; req.durationSpecified = true; req.equipment = [eq];
      const s = E.buildSession(req);
      (s.phases || []).forEach(function (ph) {
        if (!/main|עיקרי/i.test((ph.id || '') + (ph.name || ph.title || ''))) return;
        ph.exercises.forEach(function (x) { assert.equal(kept.has(x.name), false, t + '+' + eq + ': ' + x.name); });
      });
    });
  });
});
