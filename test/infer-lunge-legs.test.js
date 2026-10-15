const test = require('node:test');
const assert = require('node:assert');
const Infer = require('../js/infer.js');
const Analyzer = require('../js/analyzer.js');
const Ready = require('../js/ready-workouts.js');

test('lunges in every spelling are leg work with a squat pattern, not core', function () {
  ['לאנצ\'ים', 'לאנץ׳ לאחור', 'לאנג׳ הליכה', 'לנג׳ הצידה', 'לנצ\'ים בהתקדמות', 'מכרעים'].forEach(function (name) {
    var r = Infer.inferFromName(name);
    assert.deepStrictEqual(r.muscles, ['legs'], name);
    assert.strictEqual(r.pattern, 'squat', name);
  });
});

test('short «לנג» only as a word start: slang is not a lunge', function () {
  assert.deepStrictEqual(Infer.inferMuscles('סלנג'), ['core']);
});

test('glute bridge is legs with a hinge pattern; wall sit and jumps are legs', function () {
  var bridge = Infer.inferFromName('גשר ישבן');
  assert.deepStrictEqual(bridge.muscles, ['legs']);
  assert.strictEqual(bridge.pattern, 'hinge');
  assert.deepStrictEqual(Infer.inferMuscles('ישיבה על קיר'), ['legs']);
  assert.deepStrictEqual(Infer.inferMuscles('ניתורים בכריעת ברך'), ['legs']);
  assert.strictEqual(Infer.inferPattern('ניתורים בכריעת ברך'), 'plyo');
  assert.deepStrictEqual(Infer.inferMuscles('קפיצות חבל'), ['legs']);
});

test('knee push-ups and knee planks are not leg drills', function () {
  assert.deepStrictEqual(Infer.inferMuscles('שכיבות שמיכה על הברכיים'), ['chest']);
  assert.deepStrictEqual(Infer.inferMuscles('פלאנק ברכיים'), ['core']);
  // high knees still count as legs
  assert.deepStrictEqual(Infer.inferMuscles('ברכיים גבוהות'), ['legs']);
});

test('a ready «רגליים» session of lunges and jumps analyses as legs, not «80% ליבה»', function () {
  var entry = Ready.all.filter(function (e) { return e.title === 'IGO-UGO · רגליים · מתקדמים'; })[0];
  assert.ok(entry, 'ready workout exists');
  var analysis = Analyzer.analyzeSession(Ready.toWorkout(entry));
  var legs = analysis.exercises.filter(function (a) { return a.primary === 'legs'; }).length;
  assert.ok(legs >= 3, 'lunges, jump squats and jumps are legs: ' + JSON.stringify(analysis.exercises.map(function (a) { return [a.he, a.primary]; })));
  assert.ok((analysis.volume.legs || 0) >= 50, 'legs volume ' + JSON.stringify(analysis.volume));
  var keys = analysis.flags.map(function (f) { return f.key; });
  assert.ok(keys.indexOf('core-heavy') === -1 && keys.indexOf('core-heavy-no-back') === -1, 'flags ' + keys.join(','));
});
