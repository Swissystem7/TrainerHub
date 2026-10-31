const test = require('node:test');
const assert = require('node:assert');
const Infer = require('../js/infer.js');
const Analyzer = require('../js/analyzer.js');
const SitePlan = require('../js/site-plan.js');
const Booklet = require('../js/booklet.js');

test('a wall sit with the article or as «ישיבת קיר» is a timed leg hold, not a core drill in reps', function () {
  ['ישיבה על הקיר', 'ישיבה על קיר', 'ישיבת קיר', 'וול סיט'].forEach(function (name) {
    var r = Infer.inferFromName(name);
    assert.deepStrictEqual(r.muscles, ['legs'], name);
    assert.strictEqual(r.pattern, 'squat', name);
    assert.strictEqual(r.load, 'time', name);
    assert.deepStrictEqual(r.equipment, ['wall'], name);
  });
});

test('the site plan wall sit analyses as legs', function () {
  var drill = SitePlan.SITE_DRILLS.wall[0];
  var a = Analyzer.analyzeSession({ phases: [{ name: 'Main', exercises: [{ name: drill.he, id: null, sets: 3, duration_seconds: 30 }] }] });
  assert.strictEqual(a.exercises[0].primary, 'legs');
});
