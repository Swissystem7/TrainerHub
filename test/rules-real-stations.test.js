'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const THRules = require('../js/rules-with-sources.js');
const THEngine = require('../js/session-builder.js');
const catalog = require('../js/catalog.json');

function rule(built, id) {
  return THRules.rulesWithSources(built).rules.filter(function (r) { return r.id === id; })[0];
}

test('the rules panel quotes the stations the session really has', function () {
  const built = THEngine.buildSession('אימון כתפיים ל-20 חניכים', catalog);
  const main = built.workout.phases.filter(function (ph) { return ph.name === 'Main'; })[0].exercises;
  assert.ok(main.length < 5, 'the catalog holds fewer shoulder clips than a 20-minute session wants');
  assert.equal(rule(built, 'participants').value, built.workout.group_plan.he);
  assert.match(rule(built, 'exercise_count').value, new RegExp('במאגר נמצאו רק ' + main.length));
});

test('a full session and a bare prompt keep their wording', function () {
  const built = THEngine.buildSession('אימון ל-12 חניכים', catalog);
  assert.equal(rule(built, 'participants').value, built.workout.group_plan.he);
  assert.equal(rule(built, 'exercise_count').value, '5 תרגילים לאימון של 20 דקות');
  assert.equal(rule('אימון כתפיים ל-20 חניכים', 'participants').value,
    '20 חניכים: 5 תחנות, עד 4 חניכים בתחנה. החליפו תחנה בסיום כל סט.');
});
