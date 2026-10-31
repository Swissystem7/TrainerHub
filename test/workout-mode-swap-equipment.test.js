'use strict';

// workout-mode «החלף תרגיל» called TH.substitutesFor with no equipment, so on
// a bodyweight day the panel offered band, cone and tennis-ball clips: 13 of
// the 33 bodyweight clips in the real catalog got such an alternative. The
// panel now limits the alternatives to the gear the workout already uses.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'frontend', 'workout-mode.html'), 'utf8');
const TH = require(path.join(root, 'js', 'core.js'));
TH.setCatalog(require(path.join(root, 'js', 'catalog.json')));

function extract(name) {
  const start = html.indexOf('function ' + name + '(');
  assert.ok(start !== -1, name + ' exists in workout-mode.html');
  const open = html.indexOf('{', start);
  let depth = 0;
  for (let i = open; i < html.length; i++) {
    if (html[i] === '{') depth++;
    else if (html[i] === '}' && --depth === 0) return html.slice(start, i + 1);
  }
  throw new Error('unbalanced ' + name);
}

function needsGear(e) {
  return !!(e.equipment && e.equipment.length && e.equipment.indexOf('none') === -1);
}

// Opens the swap panel on steps[0] and returns the catalog ids it offers.
function offered(steps) {
  const panel = {
    hidden: true, innerHTML: '',
    querySelectorAll: function () { return []; }
  };
  const btn = { setAttribute: function () {} };
  const doc = { getElementById: function (id) { return id === 'swapPanel' ? panel : btn; } };
  const run = new Function('document', 'TH', 'esc', 'applySwap', 'steps', 'stepIdx',
    extract('workoutEquipment') + '\n' + extract('toggleSwap') + '\ntoggleSwap();');
  run(doc, TH, String, function () {}, steps, 0);
  const ids = [];
  panel.innerHTML.replace(/data-swap="([^"]+)"/g, function (_, id) { ids.push(id); });
  return ids;
}

function exerciseStep(entry) {
  return { type: 'exercise', id: entry.id, name: entry.he, set: 1, totalSets: 1 };
}

const playable = TH.catalogList().filter(function (e) { return TH.isPlayable(e); });
const bodyweight = playable.filter(function (e) { return !needsGear(e); });

test('a bodyweight workout is offered only bodyweight alternatives', function () {
  assert.ok(bodyweight.length > 10);
  bodyweight.forEach(function (e) {
    const ids = offered([exerciseStep(e)]);
    const gear = ids.filter(function (id) { return needsGear(TH.catalog[id]); });
    assert.deepEqual(gear, [], e.he + ' offered ' + gear.join(', '));
  });
});

test('gear the workout already uses is still offered', function () {
  const band = playable.find(function (e) { return needsGear(e) && e.equipment.indexOf('band') !== -1; });
  assert.ok(band, 'the catalog has a band clip');
  const ids = offered([exerciseStep(band)]);
  assert.ok(ids.length > 0);
  ids.forEach(function (id) {
    const alt = TH.catalog[id];
    assert.ok(!needsGear(alt) || alt.equipment.indexOf('band') !== -1, alt.he + ' needs ' + alt.equipment);
  });
});

test('a pasted workout with no catalog clips is not filtered', function () {
  const steps = [{ type: 'exercise', id: null, name: 'תרגיל שלא בספרייה', set: 1, totalSets: 1 }];
  const fn = new Function('TH', 'steps', extract('workoutEquipment') + '\nreturn workoutEquipment();');
  assert.equal(fn(TH, steps), null);
});
