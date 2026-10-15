'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const mem = {};
global.localStorage = {
  getItem: function (k) { return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null; },
  setItem: function (k, v) { mem[k] = String(v); },
  removeItem: function (k) { delete mem[k]; }
};
global.location = {
  href: 'https://swissystem7.github.io/TrainerHub/index.html',
  pathname: '/TrainerHub/index.html',
  hash: ''
};

const TH = require('../js/core.js');
const P = require('../js/pilot.js');

function reset() {
  Object.keys(mem).forEach(function (k) { delete mem[k]; });
  TH.clearEntitlement();
}

test('?pilot=acharai unlocks coach features free with Acharai branding', function () {
  reset();
  assert.equal(TH.shareToClient({ phases: [] }, {}).gated, true);
  const r = P.init('?pilot=acharai', TH);
  assert.equal(r.ok, true);
  assert.equal(P.isActive(), true);
  assert.equal(P.prefersBooklet(), true);
  const ent = TH.entitlement();
  assert.equal(ent.tier, 'trainer');
  assert.equal(ent.canShare, true);
  assert.equal(ent.brand, 'אחריי!');
  assert.equal(TH.shareToClient({ phases: [] }, {}).ok, true);
});

test('the pilot persists without the URL param and keeps a coach brand', function () {
  reset();
  TH.setEntitlement({ tier: 'trainer', brand: 'הסטודיו של דנה' });
  P.init('?x=1&PILOT=Acharai', TH);
  assert.equal(TH.entitlement().brand, 'הסטודיו של דנה');
  const again = P.init('', TH);
  assert.equal(again.ok, true);
  assert.equal(again.pilot.id, 'acharai');
});

test('unknown pilots and codes unlock nothing', function () {
  reset();
  assert.equal(P.init('?pilot=other', TH).ok, false);
  assert.equal(P.redeemCode('1234', TH).ok, false);
  assert.equal(P.isActive(), false);
  assert.equal(TH.entitlement().tier, 'free');
  assert.equal(P.redeemCode(' אחריי ', TH).ok, true);
  assert.equal(TH.entitlement().tier, 'trainer');
});

test('feedback strips tags, phones and emails and clamps the rating', function () {
  reset();
  P.init('?pilot=acharai', TH);
  const rec = P.buildFeedback({
    rating: 9,
    worked: '<b>המדרגות</b> עבדו מצוין, תתקשרו 050-1234567',
    improve: 'לכתוב לי ל dana@example.com',
    session: 'אימון שטח',
    site: 'צר, מדרגות'
  }, Date.UTC(2026, 9, 7));
  assert.equal(rec.rating, 5);
  assert.equal(rec.pilot, 'acharai');
  assert.equal(rec.day, '2026-10-07');
  assert.equal(rec.worked, 'המדרגות עבדו מצוין, תתקשרו [מספר הוסר]');
  assert.equal(rec.improve, 'לכתוב לי ל [מייל הוסר]');
  assert.equal(P.buildFeedback({ rating: 'x' }).rating, 0);
});

test('feedback is saved on the device only, capped, and exportable', function () {
  reset();
  assert.equal(P.saveFeedback({}).ok, false);
  for (let i = 0; i < P.MAX_FEEDBACK + 5; i++) P.saveFeedback({ rating: 4, worked: 'סבב ' + i });
  const list = P.listFeedback();
  assert.equal(list.length, P.MAX_FEEDBACK);
  assert.equal(list[list.length - 1].worked, 'סבב ' + (P.MAX_FEEDBACK + 4));
  const out = JSON.parse(P.exportJson());
  assert.equal(out.app, 'TrainerHub');
  assert.equal(out.feedback.length, P.MAX_FEEDBACK);
});

test('the wa.me message carries the feedback to the owner', function () {
  reset();
  P.init('?pilot=acharai', TH);
  const rec = P.buildFeedback({ rating: 4, worked: 'טבטה בשטח צר', session: 'אימון שטח' }, Date.UTC(2026, 9, 7));
  const url = P.waUrl(rec, '050-111-2222');
  assert.match(url, /^https:\/\/wa\.me\/972501112222\?text=/);
  const text = decodeURIComponent(url.split('?text=')[1]);
  assert.match(text, /אחריי/);
  assert.match(text, /דירוג: 4\/5/);
  assert.match(text, /מה עבד: טבטה בשטח צר/);
  assert.match(P.waUrl(rec, ''), /^https:\/\/wa\.me\/\?text=/);
});

test('index.html and booklet.html load the pilot script after core.js', function () {
  for (const page of ['index.html', 'booklet.html']) {
    const html = fs.readFileSync(path.join(__dirname, '..', page), 'utf8');
    const core = html.indexOf('./js/core.js');
    const pilot = html.indexOf('./js/pilot.js');
    assert.ok(core !== -1 && pilot > core, page);
  }
});

test('in the pilot the builder prefers the clips the booklet teaches', function () {
  const Booklet = require('../js/booklet.js');
  const Engine = require('../js/session-builder.js');
  const read = function (rel) { return JSON.parse(fs.readFileSync(path.join(__dirname, '..', rel), 'utf8')); };
  const catalog = read('js/catalog.json');
  Booklet.setData(read(Booklet.MAIN_PATH), read(Booklet.TEAM_PATH));
  reset();
  assert.deepEqual(P.builderOpts(catalog), { prefer: [] }, 'no pilot, no preference');
  P.init('?pilot=acharai', TH);
  const opts = P.builderOpts(catalog);
  assert.ok(opts.prefer.length > 0, 'the booklet links to catalog clips');
  opts.prefer.forEach(function (id) { assert.ok(catalog[id], 'unknown catalog id ' + id); });
  assert.equal(new Set(opts.prefer).size, opts.prefer.length, 'no duplicates');
  const entry = { id: opts.prefer[0], he: catalog[opts.prefer[0]].he, muscles: ['core'], equipment: ['none'], level: 'beginner', file: 'x.mp4' };
  const req = { muscles: ['core'], equipment: [], level: 'beginner' };
  assert.equal(Engine.scoreEntry(entry, req, opts.prefer) - Engine.scoreEntry(entry, req), 8);
  const other = { id: 'not-in-booklet', he: 'x', muscles: ['core'], equipment: ['none'], file: 'x.mp4' };
  assert.equal(Engine.scoreEntry(other, req, opts.prefer), Engine.scoreEntry(other, req));
  const prompt = 'אימון בטן 20 דקות בלי ציוד';
  const plain = Engine.buildSession(prompt, catalog);
  assert.deepEqual(Engine.buildSession(prompt, catalog, {}).workout, plain.workout, 'empty opts change nothing');
  assert.deepEqual(Engine.buildSession(prompt, catalog, { prefer: [] }).workout, plain.workout);
  assert.equal(Engine.buildSession(prompt, catalog, opts).workout.phases.length, plain.workout.phases.length);
  reset();
});
