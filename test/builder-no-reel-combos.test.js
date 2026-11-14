'use strict';

// Combos with no reel at all in the library are not offered by the builder:
// it returns no workout and a notice. Combos with real clips still build.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const TH = require('../js/core.js');
global.TH = TH;
require('../js/infer.js');
require('../js/analyzer.js');
const Prompt = require('../js/prompt-parser.js');
const E = require('../js/session-builder.js');

const root = path.join(__dirname, '..');
const read = function (p) { return JSON.parse(fs.readFileSync(path.join(root, p), 'utf8')); };
const merged = TH.mergeCatalogs(TH.mergeCatalogs(read('js/catalog.json'), read('videos/drive-catalog.json'), []), read('videos/youtube-catalog.json'), []);
TH.setCatalog(merged);

function req(text, equipment) {
  const r = Prompt.parsePrompt(text);
  r.duration = 30; r.durationSpecified = true; r.participants = 1; r.participantsSpecified = true;
  r.equipment = [equipment];
  return r;
}

test('a no-reel combo returns no workout and a notice', function () {
  [['אימון גב', 'basketball'], ['אימון גב מתקדמים', 'football'], ['אימון גב ביניים', 'stairs'],
    ['אימון דו ראשי למתחילים', 'stairs'], ['אימון רגליים מתקדמים', 'bar'], ['אימון בטן למתחילים', 'stairs'],
    ['אימון תלת ראשי מתקדמים', 'cones']].forEach(function (p) {
    const s = E.buildSession(req(p[0], p[1]));
    assert.equal(s.workout, null, p.join(' '));
    assert.equal(s.unavailable, true, p.join(' '));
    assert.equal(s.satisfied, false);
    assert.match(s.notice, /אין במאגר/);
  });
});

test('every listed combo has no matching clip in the catalog', function () {
  const list = TH.catalogList().filter(function (x) { return x.available !== false && TH.isPlayable(x); });
  E.NO_REEL_COMBOS.forEach(function (k) {
    const [m, e, l] = k.split('|');
    const hits = list.filter(function (x) {
      return (x.muscles || []).indexOf(m) !== -1 && (x.equipment || []).indexOf(e) !== -1 && (l === '*' || x.level === l);
    });
    assert.equal(hits.length, 0, k);
  });
});

test('combos with clips still build, including other levels of a listed cell', function () {
  [['אימון רגליים ביניים', 'bar'], ['אימון בטן מתקדמים', 'stairs'], ['אימון גב מתקדמים', 'tennis-ball'],
    ['אימון חזה', 'basketball'], ['אימון ידיים', 'stairs'], ['אימון בטן', 'none'], ['אימון גב', 'bar']].forEach(function (p) {
    const s = E.buildSession(req(p[0], p[1]));
    assert.ok(s.workout, p.join(' '));
    assert.notEqual(s.unavailable, true, p.join(' '));
  });
});

test('no equipment or several pieces never trigger the exclusion', function () {
  const a = Prompt.parsePrompt('אימון גב'); a.equipment = [];
  assert.equal(E.isNoReelCombo(a), false);
  const b = Prompt.parsePrompt('אימון גב'); b.equipment = ['basketball', 'bar'];
  assert.equal(E.isNoReelCombo(b), false);
});
