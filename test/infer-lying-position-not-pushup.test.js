const test = require('node:test');
const assert = require('node:assert');
const Infer = require('../js/infer.js');
const Analyzer = require('../js/analyzer.js');
const Ready = require('../js/ready-workouts.js');

// «בשכיבה» is a position on the floor, not a push-up. Before this fix the chest
// regex matched the singular «שכיבה» anywhere, so a lying leg raise analysed as
// chest + push, and the prone body raise (superman) in six ready sessions
// counted as chest work.

test('push-ups stay chest/push in every spelling', function () {
  ['שכיבות סמיכה', 'שכיבות שמיכה רגילות', 'שכיבת שמיכה אחת', '20 שכיבות', 'שכיבות'].forEach(function (name) {
    var r = Infer.inferFromName(name);
    assert.deepStrictEqual(r.muscles, ['chest'], name);
    assert.strictEqual(r.pattern, 'push', name);
  });
});

test('lying («בשכיבה») drills are not chest and not a push', function () {
  ['הרמת רגליים בשכיבה', 'מספריים בשכיבה', 'אופניים בשכיבה', 'גלגול בשכיבה'].forEach(function (name) {
    var r = Infer.inferFromName(name);
    assert.deepStrictEqual(r.muscles, ['core'], name);
    assert.strictEqual(r.pattern, 'core', name);
    assert.strictEqual(r.secondary.indexOf('triceps'), -1, name);
  });
  // a real chest press lying down is still chest
  assert.deepStrictEqual(Infer.inferMuscles('לחיצת חזה בשכיבה'), ['chest']);
});

test('leg raises are core, not legs; a single-leg raise is still legs', function () {
  ['הרמת רגליים', 'הרמות רגליים', 'הרמת רגליים בתלייה'].forEach(function (name) {
    assert.deepStrictEqual(Infer.inferMuscles(name), ['core'], name);
    assert.strictEqual(Infer.inferPattern(name), 'core', name);
  });
  assert.deepStrictEqual(Infer.inferMuscles('הרמת רגל אחורה'), ['legs']);
});

test('prone body raises (superman) are back-first with a hinge pattern', function () {
  var r = Infer.inferFromName('הרמות גוף בשכיבה על הבטן');
  assert.strictEqual(r.muscles[0], 'back');
  assert.strictEqual(r.muscles.indexOf('chest'), -1);
  assert.strictEqual(r.pattern, 'hinge');
  assert.strictEqual(Infer.inferPattern('הרמת גוף'), 'hinge');
});

test('biceps curls in the plural, bare «כפיפת» is not a pull', function () {
  ['כפיפות מרפק', 'כפיפת מרפק', 'כפיפות מרפקים עם משקולות', 'כפיפות ידיים', 'כפיפת זרוע'].forEach(function (name) {
    var r = Infer.inferFromName(name);
    assert.deepStrictEqual(r.muscles, ['biceps'], name);
    assert.strictEqual(r.pattern, 'pull', name);
  });
  assert.strictEqual(Infer.inferPattern('כפיפת בטן'), 'core');
  assert.strictEqual(Infer.inferPattern('כפיפת ברך'), 'core');
  assert.deepStrictEqual(Infer.inferMuscles('כפיפות ברכיים'), ['legs']);
});

function analysisOf(title) {
  var entry = Ready.all.filter(function (e) { return e.title === title; })[0];
  assert.ok(entry, 'ready workout exists: ' + title);
  return Analyzer.analyzeSession(Ready.toWorkout(entry));
}

function flagKeys(analysis) {
  return analysis.flags.map(function (f) { return f.key; });
}

test('ready upper-body sessions with superman no longer get «אין עבודת שרשרת אחורית»', function () {
  ['21 חזרות פלג גוף עליון מתקדמים', 'טבטה פלג גוף עליון מתחילים', 'מעגל תחנות · פלג גוף עליון · מתחילים'].forEach(function (title) {
    var a = analysisOf(title);
    var superman = a.exercises.filter(function (x) { return /הרמות גוף/.test(x.he); })[0];
    assert.ok(superman, title + ': has the body raise');
    assert.strictEqual(superman.primary, 'back', title);
    assert.ok((a.volume.back || 0) > 0, title + ': back volume ' + JSON.stringify(a.volume));
    assert.strictEqual(flagKeys(a).indexOf('no-posterior'), -1, title + ': ' + flagKeys(a).join(','));
  });
});

test('ready core sessions with superman are not «80% ליבה, אין עבודת גב»', function () {
  ['אימון משולב · בטן וליבה · מתחילים', '21 חזרות · בטן וליבה · בינוני'].forEach(function (title) {
    var keys = flagKeys(analysisOf(title));
    assert.strictEqual(keys.indexOf('core-heavy-no-back'), -1, title + ': ' + keys.join(','));
  });
});
