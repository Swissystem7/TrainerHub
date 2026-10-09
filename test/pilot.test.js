'use strict';

// js/pilot.js — ?pilot=acharai: coach features free, Acharai branding, booklet
// drills preferred in the session builder, and a feedback message with no
// personal data in it.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Pilot = require('../js/pilot.js');
const Booklet = require('../js/booklet.js');
const Engine = require('../js/session-builder.js');

const root = path.join(__dirname, '..');
const read = function (rel) { return JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8')); };
const catalog = read('js/catalog.json');
Booklet.setData(read(Booklet.MAIN_PATH), read(Booklet.TEAM_PATH));

test.beforeEach(function () { Pilot.clear(); });
test.after(function () { Pilot.clear(); });

test('the pilot link turns the pilot on and it survives the next visit', function () {
  assert.equal(Pilot.active(), null);
  assert.equal(Pilot.fromQuery('?pilot=acharai'), 'acharai');
  assert.equal(Pilot.fromQuery('?a=1&pilot=ACHARAI&b=2'), 'acharai');
  assert.equal(Pilot.fromQuery('#pilot=acharai'), 'acharai');
  assert.equal(Pilot.fromQuery('?pilot=someone-else'), null);
  assert.equal(Pilot.fromQuery('?pilotx=acharai'), null);
  assert.equal(Pilot.fromQuery(''), null);

  const p = Pilot.detect({ search: '?pilot=acharai' });
  assert.equal(p.id, 'acharai');
  assert.equal(p.brand, 'עמותת אחריי');
  assert.ok(p.at > 0);
  assert.equal(Pilot.detect({ search: '' }).id, 'acharai', 'a later visit without the link stays in the pilot');
  Pilot.clear();
  assert.equal(Pilot.detect({ search: '' }), null);
});

test('an access code is the second way in', function () {
  assert.equal(Pilot.fromCode('acharai'), 'acharai');
  assert.equal(Pilot.fromCode(' Acharai '), 'acharai');
  assert.equal(Pilot.fromCode('אחריי'), 'acharai');
  assert.equal(Pilot.fromCode('nope'), null);
  assert.equal(Pilot.fromCode(''), null);
  assert.equal(Pilot.detect({ code: 'acharai' }).id, 'acharai');
  assert.equal(Pilot.activate('nope'), null);
});

test('a pilot coach gets share and branded print free, a paying coach is untouched', function () {
  const free = { tier: 'free', canShare: false, canBrandedPdf: false, brand: '', at: 0 };
  assert.deepEqual(Pilot.entitlement(free), free, 'no pilot, no change');
  assert.equal(Pilot.brand(), '');

  Pilot.activate('acharai');
  const ent = Pilot.entitlement(free);
  assert.equal(ent.tier, 'pilot');
  assert.equal(ent.canShare, true);
  assert.equal(ent.canBrandedPdf, true);
  assert.equal(ent.brand, 'עמותת אחריי');
  assert.equal(ent.pilot, 'acharai');
  assert.equal(Pilot.brand(), 'עמותת אחריי');

  const paid = { tier: 'trainer', canShare: true, canBrandedPdf: true, brand: 'הסטודיו שלי', at: 5 };
  assert.deepEqual(Pilot.entitlement(paid), paid, 'a real entitlement wins, brand included');
  assert.equal(Pilot.entitlement({ tier: 'free', brand: 'מועדון כלשהו' }).brand, 'מועדון כלשהו', 'a brand the coach set stays');
  assert.equal(Pilot.entitlement(null).tier, 'pilot');
});

test('in the pilot the builder prefers the clips the booklet teaches', function () {
  assert.deepEqual(Pilot.builderOpts(catalog), { prefer: [] }, 'no pilot, no preference');
  Pilot.activate('acharai');
  const opts = Pilot.builderOpts(catalog);
  assert.ok(opts.prefer.length > 0, 'the booklet links to catalog clips');
  opts.prefer.forEach(function (id) { assert.ok(catalog[id], 'unknown catalog id ' + id); });
  assert.equal(new Set(opts.prefer).size, opts.prefer.length, 'no duplicates');

  // The preference is a nudge between equals: same request, same pool, the
  // booklet clip scores higher than it did without the pilot.
  const entry = { id: opts.prefer[0], he: catalog[opts.prefer[0]].he, muscles: ['core'], equipment: ['none'], level: 'beginner', file: 'x.mp4' };
  const req = { muscles: ['core'], equipment: [], level: 'beginner' };
  const plain = Engine.scoreEntry(entry, req);
  assert.equal(Engine.scoreEntry(entry, req, opts.prefer) - plain, 8);
  assert.equal(Engine.scoreEntry({ id: 'not-in-booklet', he: 'תרגיל', muscles: ['core'], equipment: ['none'], file: 'x.mp4' }, req, opts.prefer),
    Engine.scoreEntry({ id: 'not-in-booklet', he: 'תרגיל', muscles: ['core'], equipment: ['none'], file: 'x.mp4' }, req));
});

test('buildSession still builds the same kind of workout with a preference list', function () {
  const prompt = 'אימון בטן 20 דקות בלי ציוד';
  const plain = Engine.buildSession(prompt, catalog);
  const pilot = Engine.buildSession(prompt, catalog, { prefer: Object.keys(catalog).slice(0, 3) });
  assert.equal(pilot.satisfied, plain.satisfied);
  assert.equal(pilot.workout.phases.length, plain.workout.phases.length);
  assert.deepEqual(Engine.buildSession(prompt, catalog, {}).workout, plain.workout, 'empty opts change nothing');
  assert.deepEqual(Engine.buildSession(prompt, catalog, { prefer: [] }).workout, plain.workout);
});

test('the feedback payload carries counts and the coach words, never a trainee', function () {
  Pilot.activate('acharai');
  const f = Pilot.feedbackPayload({
    date: '2026-10-09', group: '14', site: 'רחבה צרה ליד המדרגות', method: 'IGO-UGO',
    rating: 9, worked: 'המדרגות', note: '<b>צריך</b> עוד זמן לחימום'
  });
  assert.deepEqual(f, {
    app: 'TrainerHub', pilot: 'acharai', date: '2026-10-09', group: 14,
    site: 'רחבה צרה ליד המדרגות', method: 'IGO-UGO', rating: 5,
    worked: 'המדרגות', note: 'צריך עוד זמן לחימום'
  });
  assert.equal(Pilot.feedbackPayload({ rating: 0 }).rating, 1, 'rating is clamped to 1-5');
  assert.equal(Pilot.feedbackPayload({ rating: 'abc' }).rating, null);
  assert.equal(Pilot.feedbackPayload({ group: -3 }).group, null);
  assert.match(Pilot.feedbackPayload({}).date, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(Pilot.feedbackPayload({ note: 'א'.repeat(900) }).note.length, 500, 'the note is capped');

  const json = JSON.parse(Pilot.feedbackJson(f));
  assert.deepEqual(json, f);
  const text = Pilot.feedbackText(f);
  assert.match(text, /^משוב TrainerHub · פילוט אחריי/);
  assert.match(text, /מתאמנים: 14/);
  assert.match(text, /דירוג: 5\/5/);
  assert.ok(!/</.test(text), 'no markup in the message');
  assert.ok(!/undefined|null/.test(Pilot.feedbackText(Pilot.feedbackPayload({}))), 'empty fields are left out');
});

test('feedback goes to WhatsApp when the owner number is set, to the form otherwise', function () {
  Pilot.activate('acharai');
  const payload = Pilot.feedbackPayload({ date: '2026-10-09', rating: 4 });
  assert.equal(Pilot.feedbackUrl(payload), require('../js/feedback.js').feedbackUrl());
  globalThis.TH_PILOT_FEEDBACK_WA = '+972 50-123-4567';
  try {
    const url = Pilot.feedbackUrl(payload);
    assert.ok(url.startsWith('https://wa.me/972501234567?text='), url);
    assert.equal(decodeURIComponent(url.split('text=')[1]), Pilot.feedbackText(payload));
  } finally {
    delete globalThis.TH_PILOT_FEEDBACK_WA;
  }
});

test('nothing but the pilot id is stored, and a hostile store cannot break it', function () {
  const store = {};
  const original = globalThis.localStorage;
  globalThis.localStorage = {
    getItem: function (k) { return k in store ? store[k] : null; },
    setItem: function (k, v) { store[k] = v; },
    removeItem: function (k) { delete store[k]; }
  };
  try {
    Pilot.clear();
    Pilot.activate('acharai');
    assert.deepEqual(Object.keys(store), [Pilot.KEY]);
    assert.deepEqual(Object.keys(JSON.parse(store[Pilot.KEY])).sort(), ['at', 'id']);
    store[Pilot.KEY] = '{not json';
    assert.equal(Pilot.active(), null, 'a corrupt record is simply not a pilot');
    store[Pilot.KEY] = JSON.stringify({ id: 'evil', at: 1 });
    assert.equal(Pilot.active(), null, 'an unknown pilot id is not honoured');
    Pilot.clear();
    assert.deepEqual(Object.keys(store), []);
  } finally {
    if (original === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = original;
  }
});

test('a localStorage that throws still leaves the pilot usable for the session', function () {
  const original = globalThis.localStorage;
  globalThis.localStorage = {
    getItem: function () { throw new Error('blocked'); },
    setItem: function () { throw new Error('blocked'); },
    removeItem: function () { throw new Error('blocked'); }
  };
  try {
    Pilot.clear();
    assert.equal(Pilot.activate('acharai').id, 'acharai');
    assert.equal(Pilot.active().id, 'acharai');
    Pilot.clear();
    assert.equal(Pilot.active(), null);
  } finally {
    if (original === undefined) delete globalThis.localStorage;
    else globalThis.localStorage = original;
  }
});
