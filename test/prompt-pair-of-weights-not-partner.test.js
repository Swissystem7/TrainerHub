'use strict';
// «אימון 30 דקות עם זוג משקולות» is one trainee with a pair of dumbbells.
// parseAudience used to read the bare «זוג» as a partner workout, and
// session-builder then gave +4 to every «זוגות» drill, so the solo trainee got
// a session made only of partner drills. parseParticipants already excluded
// «זוג משקולות» (and nothing else), so «זוג דמבלים» still counted two people.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const TH = require('../js/core.js');
const Prompt = require('../js/prompt-parser.js');
const Infer = require('../js/infer.js');
const SB = require('../js/session-builder.js');

const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'js', 'catalog.json'), 'utf8'));
TH.setCatalog(catalog);

function audience(text) {
  return Prompt.parsePrompt(text).audience;
}

function names(session) {
  const out = [];
  (session.phases || []).forEach((ph) => (ph.exercises || []).forEach((e) => out.push(e.name || e.he || e.id)));
  return out;
}

test('a pair of weights is not a partner workout and not two trainees', () => {
  for (const text of ['אימון עם זוג משקולות', 'אימון רגליים 20 דקות עם זוג דמבלים',
    'אימון ידיים עם זוג דאמבלים', 'אימון עם זוג גומיות', 'אימון כוח עם זוג קטלבלים']) {
    assert.equal(audience(text), '', text);
    assert.equal(Prompt.parseParticipants(text), null, text);
  }
  assert.equal(Prompt.parseParticipants('2 זוגות משקולות לכל מתאמן'), null);
});

test('a couple or working in pairs still means a partner workout of two', () => {
  for (const text of ['אימון לזוג 30 דקות', 'אימון בזוגות 30 דקות', 'אימון זוגי של חצי שעה']) {
    assert.equal(audience(text), 'partner', text);
    assert.equal(Prompt.parseParticipants(text), 2, text);
  }
  assert.equal(Prompt.parseParticipants('12 מתאמנים, עבודה בזוגות'), 12);
  assert.equal(audience('אימון לזוג עם זוג משקולות'), 'partner');
});

test('«זוג דמבלים» / «דמבל» is dumbbells equipment', () => {
  assert.deepEqual(Infer.inferEquipment('כפיפות מרפק עם דמבל'), ['dumbbells']);
  assert.deepEqual(Prompt.parsePrompt('אימון רגליים 20 דקות עם זוג דמבלים').equipment, ['dumbbells']);
});

test('a solo trainee with a pair of dumbbells gets the same session as «עם משקולות», not six partner drills', () => {
  const withPair = Prompt.parsePrompt('אימון 30 דקות עם זוג משקולות');
  const plain = Prompt.parsePrompt('אימון 30 דקות עם משקולות');
  assert.equal(withPair.audience, '');
  assert.equal(withPair.participants, plain.participants);
  const a = names(SB.buildSession(withPair));
  const b = names(SB.buildSession(plain));
  assert.deepEqual(a, b);
  const pairDrills = a.filter((n) => /זוג/.test(n)).length;
  assert.ok(pairDrills <= 1, 'partner drills in a solo session: ' + a.join(' | '));
});
