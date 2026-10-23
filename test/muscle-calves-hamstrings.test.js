'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Prompt = require('../js/prompt-parser.js');

test('«שוקיים» / «ירך» / «המסטרינג» are leg requests, not full body', function () {
  ['אימון שוקיים', 'אימון ירך אחורית 20 דקות', 'אימון המסטרינג', 'hamstrings 15 min', 'חיזוק הירך הקדמית'].forEach(function (text) {
    const req = Prompt.parsePrompt(text);
    assert.deepEqual(req.muscles, ['legs'], text);
    assert.equal(req.focus, 'legs', text);
  });
});

test('calves next to another muscle add legs', function () {
  assert.deepEqual(Prompt.parsePrompt('אימון כתפיים ושוקיים').muscles, ['shoulders', 'legs']);
});

test('«בלי שוקיים» rules the legs out', function () {
  assert.deepEqual(Prompt.parsePrompt('אימון כתפיים בלי שוקיים').excludedMuscles, ['legs']);
});
