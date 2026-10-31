'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Prompt = require('../js/prompt-parser.js');
const { buildSession } = require('../js/session-builder.js');
const catalog = require('../js/catalog.json');

// «אימון אמות» named no muscle the parser knew, so it fell through to the
// full-body default: the trainer who asked for forearms got «אימון גוף מלא».

test('«אמות» / «אמה» are an arms session', function () {
  ['אימון אמות', 'אימון אמות 20 דקות', 'חיזוק האמות', 'אימון לאמות', 'אימון שרירי האמה'].forEach(function (text) {
    const req = Prompt.parsePrompt(text);
    assert.deepEqual(req.muscles, ['biceps', 'triceps'], text);
    assert.equal(req.focus, 'arms', text);
  });
  assert.deepEqual(Prompt.parsePrompt('אימון חזה ואמות').muscles, ['chest', 'biceps', 'triceps']);
  assert.equal(buildSession('אימון אמות 20 דקות', catalog).workout.title.indexOf('אימון גוף מלא'), -1);
});

test('«אמות» inside another word is not the forearms', function () {
  assert.equal(Prompt.parsePrompt('אימון רגליים עם התאמות').focus, 'legs');
  assert.deepEqual(Prompt.parsePrompt('אימון רגליים עם התאמות').muscles, ['legs']);
  assert.equal(Prompt.parsePrompt('אימון עם דוגמאות').focus, 'full');
  assert.equal(Prompt.parsePrompt('אימון בטן בלי אמות').excludedMuscles.indexOf('biceps') !== -1, true);
});
