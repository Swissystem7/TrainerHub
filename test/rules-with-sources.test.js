'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const THRules = require('../js/rules-with-sources.js');
const THEngine = require('../js/session-builder.js');
const TH = require('../js/core.js');

const root = path.join(__dirname, '..');
const indexHtml = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

const FULL = 'אימון בטן למתחילים של 45 דקות בלי ציוד ל-12 חניכים למטרת כוח';

function byId(result, id) {
  return result.rules.filter(function (r) { return r.id === id; })[0];
}

test('rulesWithSources returns every workout rule with a named source', function () {
  const result = THRules.rulesWithSources(FULL);

  assert.equal(result.description, FULL);
  assert.ok(Array.isArray(result.rules));
  assert.equal(result.rules.length, THRules.RULE_IDS.length);
  assert.ok(result.rules.length >= 8, 'a plan is built from at least 8 assumptions');
  assert.deepEqual(result.rules.map(function (r) { return r.id; }), THRules.RULE_IDS);

  for (const rule of result.rules) {
    assert.equal(typeof rule.id, 'string', 'rule id');
    assert.ok(rule.he.length > 0, rule.id + ' has a Hebrew description');
    assert.ok(rule.detail.length > 0, rule.id + ' explains itself');
    assert.ok(String(rule.value).length > 0, rule.id + ' has a value');
    assert.ok(rule.source && typeof rule.source === 'object', rule.id + ' has a source');
    assert.ok(THRules.SOURCES[rule.source.id], rule.id + ' points at a known source');
    assert.ok(rule.source.he.length > 0, rule.id + ' source is named in Hebrew');
    assert.ok(rule.source.kind.length > 0, rule.id + ' source has a kind');
  }

  const ids = result.rules.map(function (r) { return r.id; });
  assert.equal(new Set(ids).size, ids.length, 'rule ids are unique');
  for (const expected of ['duration', 'exercise_count', 'focus', 'goal', 'prescription',
    'equipment', 'level', 'participants', 'no_outcome_claims']) {
    assert.ok(ids.includes(expected), 'missing rule: ' + expected);
  }

  const listed = result.sources.map(function (s) { return s.id; });
  assert.equal(new Set(listed).size, listed.length, 'the source list has no duplicates');
  for (const rule of result.rules) {
    assert.ok(listed.includes(rule.source.id), rule.id + ' source is listed in result.sources');
  }
});

test('a rule taken from the request is credited to the request, a filled-in one to the default', function () {
  const asked = THRules.rulesWithSources(FULL);
  const bare = THRules.rulesWithSources('אימון');

  assert.equal(byId(asked, 'duration').source.id, 'prompt');
  assert.match(byId(asked, 'duration').value, /45 דקות/);
  assert.equal(byId(bare, 'duration').source.id, 'default');
  assert.match(byId(bare, 'duration').value, /20 דקות/);

  assert.equal(byId(asked, 'level').source.id, 'prompt');
  assert.match(byId(asked, 'level').value, /מתחיל/);
  assert.equal(byId(bare, 'level').source.id, 'default');

  assert.equal(byId(asked, 'equipment').source.id, 'prompt');
  assert.match(byId(asked, 'equipment').value, /משקל גוף/);
  assert.equal(byId(bare, 'equipment').source.id, 'catalog');

  assert.equal(byId(asked, 'focus').source.id, 'prompt');
  assert.match(byId(asked, 'focus').value, /ליבה/);
  assert.equal(byId(bare, 'focus').source.id, 'default');
  assert.match(byId(bare, 'focus').value, /גוף מלא/);

  assert.equal(byId(asked, 'goal').source.id, 'prompt');
  assert.match(byId(asked, 'goal').value, /כוח/);
  assert.equal(byId(bare, 'goal').source.id, 'default');

  assert.equal(byId(asked, 'participants').source.id, 'prompt');
  assert.match(byId(asked, 'participants').value, /12/);
  assert.match(byId(asked, 'participants').value, /תחנות/);
  assert.equal(byId(bare, 'participants').source.id, 'default');
  assert.match(byId(bare, 'participants').value, /1/);
});

test('engine rules quote the numbers the engine actually runs', function () {
  const asked = THRules.rulesWithSources(FULL);

  const prescription = byId(asked, 'prescription');
  const rx = THEngine.prescription({ goal: 'strength', focus: 'core' });
  assert.equal(prescription.source.id, 'engine');
  assert.match(prescription.value, new RegExp(String(rx.sets) + ' סטים'));
  assert.match(prescription.value, new RegExp(rx.reps));
  assert.match(prescription.value, new RegExp(String(rx.rest)));

  const count = byId(asked, 'exercise_count');
  assert.equal(count.source.id, 'engine');
  assert.match(count.value, new RegExp('^' + THEngine.wantedCount(45) + ' תרגילים'));

  // A core-only request has no explicit goal, so the engine derives the prescription from the focus.
  const core = THRules.rulesWithSources('אימון בטן');
  assert.equal(byId(core, 'goal').source.id, 'engine');
  assert.match(byId(core, 'prescription').value, new RegExp(String(THEngine.prescription({ focus: 'core' }).rest)));
});

test('the honesty rule is always shown and names the outcome promise it blocks', function () {
  const clean = byId(THRules.rulesWithSources('אימון גב'), 'no_outcome_claims');
  assert.equal(clean.source.id, 'policy');
  assert.match(clean.value, /לא מבטיח/);

  const claim = byId(THRules.rulesWithSources('אימון שורף שומן מהר'), 'no_outcome_claims');
  assert.equal(claim.source.id, 'policy');
  assert.match(claim.value, /הבטחת תוצאה/);
  assert.notEqual(claim.value, clean.value, 'a request that promises an outcome is called out');
});

test('every source that cites a file cites a file that exists', function () {
  const refs = Object.keys(THRules.SOURCES).map(function (id) { return THRules.SOURCES[id].ref; });
  assert.ok(refs.filter(Boolean).length >= 3, 'at least three sources cite a file');
  for (const ref of refs) {
    if (!ref) continue;
    assert.equal(fs.existsSync(path.join(root, ref)), true, ref + ' should exist');
  }
});

test('findRule looks a single rule up by id or by words from its description', function () {
  const byKey = THRules.findRule(FULL, 'prescription');
  assert.ok(byKey);
  assert.equal(byKey.id, 'prescription');
  assert.ok(byKey.source.he.length > 0, 'a single rule still carries its source');

  assert.equal(THRules.findRule(FULL, 'מנוחה').id, 'prescription');
  assert.equal(THRules.findRule(FULL, 'משך האימון').id, 'duration');
  assert.equal(THRules.findRule(FULL, 'ציוד').id, 'equipment');
  assert.equal(THRules.findRule(FULL, 'כלל שלא קיים בכלל'), null);
  assert.equal(THRules.findRule(FULL, ''), null);
  assert.equal(THRules.findRule(FULL), null);
});

test('rulesWithSources accepts a parsed request or a built session, not only text', function () {
  const built = THEngine.buildSession('אימון בטן של 45 דקות');
  const fromSession = THRules.rulesWithSources(built);
  const fromRequest = THRules.rulesWithSources(built.request);

  assert.equal(byId(fromSession, 'duration').value, byId(fromRequest, 'duration').value);
  assert.equal(byId(fromSession, 'duration').source.id, 'prompt');
  assert.equal(fromSession.rules.length, THRules.RULE_IDS.length);

  const empty = THRules.rulesWithSources();
  assert.equal(empty.rules.length, THRules.RULE_IDS.length);
  assert.equal(byId(empty, 'duration').source.id, 'default');
});

test('rulesMarkup renders every rule with its source and escapes the description', function () {
  const result = THRules.rulesWithSources(FULL);
  const html = THRules.rulesMarkup(FULL);

  assert.match(html, /הנחות האימון/);
  for (const rule of result.rules) {
    assert.ok(html.includes('data-rule-id="' + rule.id + '"'), 'markup is missing rule ' + rule.id);
    assert.ok(html.includes(TH.esc(rule.he)), 'markup is missing the name of ' + rule.id);
    assert.ok(html.includes(TH.esc(rule.value)), 'markup is missing the value of ' + rule.id);
    assert.ok(html.includes(TH.esc(rule.source.he)), 'markup is missing the source of ' + rule.id);
  }

  const attack = THRules.rulesMarkup('<img src=x onerror=alert(1)> אימון גב');
  assert.doesNotMatch(attack, /<img/);
  assert.match(attack, /&lt;img/);
});

test('core exposes the rules API so every page can show them', function () {
  assert.equal(typeof TH.rulesWithSources, 'function');
  assert.equal(typeof TH.findRule, 'function');
  assert.equal(typeof TH.rulesMarkup, 'function');
  assert.equal(TH.rulesWithSources(FULL).rules.length, THRules.RULE_IDS.length);
  assert.equal(TH.findRule(FULL, 'duration').id, 'duration');
  assert.match(TH.rulesMarkup(FULL), /data-rule-id="duration"/);
});

test('the main page loads the rules module and renders the panel', function () {
  assert.match(indexHtml, /js\/rules-with-sources\.js/);
  assert.match(indexHtml, /TH\.rulesMarkup/);
  assert.match(indexHtml, /הנחות האימון/);
  assert.match(indexHtml, /\.rule-source/, 'the panel is styled on the page');
  // The panel must sit above the actions, so the rules can be read before the plan is started.
  assert.ok(indexHtml.indexOf('rulesMarkup') < indexHtml.indexOf('id="startBtn"'));
});
