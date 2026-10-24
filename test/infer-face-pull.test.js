'use strict';

// A face pull («משיכת פנים», «פייס פול») names no muscle. «משיכת פנים בגומייה»
// fell to the band fallback (chest, back, legs, core as a push drill) and a bare
// «משיכת פנים» to «ליבה». It is rear-delt and upper-back pulling.

const test = require('node:test');
const assert = require('node:assert/strict');
const Infer = require('../js/infer.js');

test('face pulls infer as shoulders + back in the pull pattern', function () {
  ['משיכת פנים בגומייה', 'משיכת פנים', 'משיכות לפנים בכבל', 'פייס פול', 'face pull'].forEach(function (name) {
    const r = Infer.inferFromName(name);
    assert.deepEqual(r.muscles, ['shoulders', 'back'], name);
    assert.equal(r.pattern, 'pull', name);
    assert.ok(r.secondary.indexOf('biceps') !== -1, name);
  });
});

test('the band in «משיכת פנים בגומייה» is still the equipment', function () {
  assert.deepEqual(Infer.inferFromName('משיכת פנים בגומייה').equipment, ['band']);
});

test('other band drills keep their reading', function () {
  assert.deepEqual(Infer.inferFromName('חתירה בגומייה').muscles, ['back', 'biceps']);
  assert.equal(Infer.inferFromName('לחיצת חזה בגומייה').pattern, 'push');
});
