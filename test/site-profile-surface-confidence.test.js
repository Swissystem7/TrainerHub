'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const S = require('../js/site-profile.js');

test('a low confidence on grass the surface marks the surface chip, not the grass feature', function () {
  const p = S.parseAiResponse('{"width":"wide","surface":["grass"],"features":["bench"],"confidence":{"grass":0.4}}').profile;
  assert.deepEqual(p.confidence, { surface: 0.4 });
});

test('grass that is listed as a feature keeps its own confidence', function () {
  const p = S.parseAiResponse('{"surface":["asphalt"],"features":["grass"],"confidence":{"grass":0.4}}').profile;
  assert.deepEqual(p.confidence, { grass: 0.4 });
});

test('a surface value such as sand is the surface confidence, and the lowest one wins', function () {
  const p = S.parseAiResponse('{"surface":["sand","dirt"],"confidence":{"sand":0.3,"dirt":0.9}}').profile;
  assert.deepEqual(p.confidence, { surface: 0.3 });
});

test('a surface value the AI did not pick is dropped', function () {
  const p = S.parseAiResponse('{"surface":["asphalt"],"confidence":{"sand":0.3}}').profile;
  assert.deepEqual(p.confidence, {});
});

test('tapping the grass surface chip clears its «לא בטוח» mark', function () {
  const ai = S.parseAiResponse('{"surface":["grass"],"confidence":{"grass":0.4}}').profile;
  const p = S.toggle(S.toggle(ai, 'surface', 'grass'), 'surface', 'grass');
  assert.deepEqual(p.surface, ['grass']);
  assert.equal(p.confidence.surface, undefined);
});
