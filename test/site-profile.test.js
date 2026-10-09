'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const S = require('../js/site-profile.js');

test('normalize keeps only the schema and clamps values', function () {
  const p = S.normalize({
    width: 'NARROW',
    approxMeters: '4.4',
    surface: ['asphalt', 'lava'],
    features: ['bench', 'stairs', 'stairs', 'trampoline'],
    hazards: 'cars',
    shade: 'true',
    confidence: { stairs: 1.7, bench: -2, width: 'x', secret: 0.5 },
    apiKey: 'leak'
  }, 'ai');
  assert.deepEqual(p, {
    width: 'narrow',
    surface: ['asphalt'],
    features: ['stairs', 'bench'],
    hazards: ['cars'],
    shade: true,
    source: 'ai',
    confidence: { stairs: 1, bench: 0 },
    approxMeters: 4
  });
});

test('width falls back to approxMeters, then to medium', function () {
  assert.equal(S.normalize({ approxMeters: 3 }).width, 'narrow');
  assert.equal(S.normalize({ approxMeters: 12 }).width, 'medium');
  assert.equal(S.normalize({ approxMeters: 9999 }).approxMeters, 500);
  assert.equal(S.normalize({ approxMeters: 9999 }).width, 'wide');
  assert.equal(S.normalize({ width: 'huge' }).width, 'medium');
  assert.equal(S.normalize({ approxMeters: -3 }).approxMeters, undefined);
  assert.equal(S.normalize(null).width, 'medium');
  assert.equal(S.normalize([1, 2]).source, 'manual');
});

test('manual fallback starts empty and is usable without any AI', function () {
  let p = S.emptyProfile();
  assert.deepEqual(p, { width: 'medium', surface: [], features: [], hazards: [], shade: false, source: 'manual', confidence: {} });
  p = S.toggle(p, 'features', 'stairs');
  p = S.toggle(p, 'width', 'narrow');
  p = S.toggle(p, 'hazards', 'cars');
  p = S.toggle(p, 'shade');
  assert.deepEqual(p.features, ['stairs']);
  assert.equal(p.width, 'narrow');
  assert.deepEqual(p.hazards, ['cars']);
  assert.equal(p.shade, true);
  assert.equal(p.source, 'manual');
});

test('coach corrections override the AI and drop its confidence', function () {
  const ai = S.parseAiResponse('{"width":"wide","approxMeters":30,"features":["wall","bench"],"confidence":{"wall":0.4,"width":0.9}}').profile;
  let p = S.toggle(ai, 'features', 'wall');
  assert.deepEqual(p.features, ['bench']);
  assert.equal(p.confidence.wall, undefined);
  assert.equal(p.source, 'manual');
  p = S.toggle(p, 'width', 'narrow');
  assert.equal(p.width, 'narrow');
  assert.equal(p.approxMeters, undefined, 'a corrected width drops the stale estimate');
  assert.equal(p.confidence.width, undefined);
  assert.deepEqual(S.toggle(p, 'features', 'jacuzzi').features, ['bench']);
  assert.deepEqual(S.toggle(p, 'nonsense', 'x').features, ['bench']);
  assert.deepEqual(ai.features, ['bench', 'wall'], 'toggle does not mutate its input');
});

test('AI parsing: plain, fenced and prose-wrapped JSON', function () {
  const fenced = 'הנה התוצאה:\n```json\n{"width":"narrow","features":["stairs"],"note":"a } inside \\"quotes\\""}\n```\nבהצלחה';
  const r = S.parseAiResponse(fenced);
  assert.equal(r.ok, true);
  assert.equal(r.profile.width, 'narrow');
  assert.deepEqual(r.profile.features, ['stairs']);
  assert.equal(r.profile.source, 'ai');
  assert.equal(S.parseAiResponse({ width: 'wide' }).profile.width, 'wide');
});

test('AI parsing: malformed input never throws and falls back', function () {
  const bad = [undefined, null, '', 'no json here', '{"width": "narrow",', '{width: narrow}', '{"a":1}}}', 42];
  for (const input of bad) {
    const r = S.parseAiResponse(input);
    assert.equal(typeof r.ok, 'boolean');
    assert.equal(r.profile.source, 'ai');
    assert.ok(['narrow', 'medium', 'wide'].includes(r.profile.width));
  }
  assert.equal(S.parseAiResponse('nothing').error, 'no-json');
  assert.equal(S.parseAiResponse('{width: narrow}').error, 'bad-json');
  assert.equal(S.parseAiResponse('{"width": "narrow",').ok, false);
  assert.equal(S.parseAiResponse('[1,2]').error, 'no-json');
});

test('chips cover every option and reflect the profile', function () {
  const p = S.normalize({ width: 'narrow', surface: ['asphalt'], features: ['bench'], hazards: ['cars'] });
  const c = S.chips(p);
  assert.equal(c.length, S.WIDTHS.length + S.SURFACES.length + S.FEATURES.length + S.HAZARDS.length + 1);
  const on = c.filter(function (x) { return x.on; }).map(function (x) { return x.he; });
  assert.deepEqual(on, ['רוחב: צר', 'משטח: אספלט', 'ספסל', 'סכנה: מכוניות']);
});

test('summary line in Hebrew', function () {
  const p = S.normalize({ width: 'narrow', approxMeters: 4, surface: ['asphalt'], features: ['stairs', 'bench'], hazards: ['cars'], shade: true });
  assert.equal(S.summaryHe(p), 'רוחב: צר ~4 מ׳ · משטח: אספלט · מדרגות, ספסל · סכנה: מכוניות · יש צל');
  assert.equal(S.summaryHe(S.emptyProfile()), 'רוחב: בינוני');
});

test('model drift in values still lands on schema ids', function () {
  const p = S.normalize({
    surface: ['Artificial Turf'],
    features: ['Steps', 'benches', 'stair', 'railings', 'ספסל'],
    hazards: ['Cars', 'glasses'],
    confidence: { Benches: 0.4, steps: 0.9, Width: 0.7 }
  }, 'ai');
  assert.deepEqual(p.surface, ['turf']);
  assert.deepEqual(p.features, ['stairs', 'bench', 'railing']);
  assert.deepEqual(p.hazards, ['cars', 'glass']);
  assert.deepEqual(p.confidence, { bench: 0.4, stairs: 0.9, width: 0.7 });
  assert.deepEqual(S.normalize({ features: ['trampolines', '', null, 'ss'] }).features, []);
});

test('prose braces before the JSON object do not hide it', function () {
  const r = S.parseAiResponse('I filled in {width} and {features}:\n```json\n{"width":"narrow","features":["stairs"]}\n```');
  assert.equal(r.ok, true);
  assert.equal(r.profile.width, 'narrow');
  assert.deepEqual(r.profile.features, ['stairs']);
  const nested = S.parseAiResponse('{width: narrow, "confidence": {"stairs": 0.9}}');
  assert.equal(nested.ok, false);
  assert.equal(nested.error, 'bad-json');
});
