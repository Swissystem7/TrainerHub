'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Prompt = require('../js/prompt-parser.js');
const Infer = require('../js/infer.js');
const Engine = require('../js/session-builder.js');
const TH = require('../js/core.js');

const FIXTURE = {
  plank: { id: 'plank', he: 'פלאנק', muscles: ['core'], equipment: ['none'], level: 'beginner', file: 'פלאנק.mp4', source: 'local' },
  drive_פלאנק: { id: 'drive_פלאנק', he: 'פלאנק', muscles: ['core'], equipment: ['none'], level: 'beginner', driveId: '1tLFxcQifJQgGYRZD20YQticZ0S4psv2r', source: 'drive', folder: 'בטן' },
  mountain_climber: { id: 'mountain_climber', he: 'מטפס הרים', muscles: ['core'], equipment: ['none'], level: 'beginner', file: 'מטפס הרים.mp4', source: 'local' },
  גומיות_בטן: { id: 'גומיות_בטן', he: 'גומיות בטן', muscles: ['core'], equipment: ['band'], level: 'beginner', driveId: '1CqAWIIDQb3wOdTgj1o4UmaD6T0_au_us', source: 'drive', folder: 'גומיות' },
  bodyweight_row: { id: 'bodyweight_row', he: 'מתח אוסטרלי', muscles: ['back', 'biceps'], equipment: ['bar'], level: 'intermediate', driveId: '1p1IXL9cwQBDcOcgbKpJmMNxmIXHXpo_d', source: 'drive', folder: 'גב' },
  step_up: { id: 'step_up', he: 'מדרגות', muscles: ['legs'], equipment: ['stairs'], level: 'beginner', file: 'מדרגות.mp4', source: 'local' },
  warmup: { id: 'warmup', he: 'חימום', muscles: ['core'], equipment: ['none'], level: 'beginner', file: 'חימום.mp4', source: 'local' }
};

test('parsePrompt extracts muscle, duration, equipment from a Hebrew core request', function () {
  const req = Prompt.parsePrompt('אימון בטן 20 דקות בלי ציוד');
  assert.deepEqual(req.muscles, ['core']);
  assert.equal(req.focus, 'core');
  assert.equal(req.duration, 20);
  assert.equal(req.durationSpecified, true);
  assert.deepEqual(req.equipment, ['none']);
});

test('parsePrompt extracts full-body, bands, and beginner from a mixed prompt', function () {
  const req = Prompt.parsePrompt('פול בודי עם גומיות, מתחיל');
  assert.equal(req.focus, 'full');
  assert.deepEqual(req.muscles, []);
  assert.deepEqual(req.equipment, ['band']);
  assert.equal(req.level, 'beginner');
  assert.equal(req.duration, 20);
});

test('parsePrompt extracts strength goal, back focus, and duration', function () {
  const req = Prompt.parsePrompt('כוח גב 30 דקות');
  assert.ok(req.muscles.indexOf('back') !== -1);
  assert.equal(req.duration, 30);
  assert.equal(req.goal, 'strength');
});

test('parsePrompt understands quarter-hour and kids audience', function () {
  const req = Prompt.parsePrompt('אימון רגליים רבע שעה לילדים');
  assert.equal(req.duration, 15);
  assert.ok(req.muscles.indexOf('legs') !== -1);
  assert.equal(req.audience, 'kids');
});

test('buildSession returns a real core workout from the catalog, not a fabricated outcome', function () {
  TH.setCatalog(FIXTURE);
  const built = Engine.buildSession('אימון בטן 20 דקות בלי ציוד', FIXTURE);
  assert.ok(built.workout);
  assert.ok(built.workout.phases.length === 3);
  const main = built.workout.phases[1].exercises;
  assert.ok(main.length >= 2);
  assert.ok(main.every(function (ex) {
    const entry = FIXTURE[ex.id];
    return entry && entry.muscles.indexOf('core') !== -1;
  }));
  assert.ok(built.explanation);
  assert.match(built.explanation.stimulus.he, /ליבה|סבולת|היפרטרופ|כוח/);
  const blob = JSON.stringify(built);
  assert.equal(blob.includes('תרזה'), false);
  assert.equal(blob.includes('5 ק'), false);
  assert.ok(built.explanation.reasons.every(function (r) { return r.why; }));
});

test('buildSession says so when the library cannot satisfy the request and offers the closest thing', function () {
  TH.setCatalog(FIXTURE);
  const built = Engine.buildSession('אימון חזה עם מוט, מתקדם', FIXTURE);
  assert.equal(built.satisfied, false);
  assert.ok(built.notice);
  assert.match(built.notice, /אין במאגר/);
  assert.ok(built.workout || built.notice.indexOf('אין במאגר') !== -1);
});

test('infer and proposeEntry parse Drive / YouTube / external links without calling an API', function () {
  assert.equal(Infer.parseDriveId('https://drive.google.com/file/d/1tLFxcQifJQgGYRZD20YQticZ0S4psv2r/view'), '1tLFxcQifJQgGYRZD20YQticZ0S4psv2r');
  assert.equal(Infer.parseYouTubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
  assert.ok(Infer.parseInstagramUrl('https://www.instagram.com/reel/AbC123xyz/'));
  const drive = Infer.proposeEntry({ url: 'https://drive.google.com/file/d/1tLFxcQifJQgGYRZD20YQticZ0S4psv2r/view', name: 'פלאנק' });
  assert.equal(drive.source, 'drive');
  assert.deepEqual(drive.muscles, ['core']);
  const yt = Infer.proposeEntry({ url: 'https://youtu.be/dQw4w9WgXcQ', name: 'חימום' });
  assert.equal(yt.source, 'youtube');
  assert.equal(yt.youtubeId, 'dQw4w9WgXcQ');
  const link = Infer.proposeEntry({ url: 'https://www.instagram.com/reel/AbC123xyz/', name: 'ריל תרגיל' });
  assert.equal(link.source, 'link');
  assert.ok(link.externalUrl);
  const blocked = Infer.proposeEntry({ url: '1xxxx', name: 'VID_20240101' });
  assert.equal(blocked.error, 'blocked');
});
