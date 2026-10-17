'use strict';

// Regression: booklet opening sessions 2 and 5 dropped the drill's step list.
// Session 5's cone course (crawl + 15 סמוכקום, lunge walk + 20 בטן אולר, bear walk +
// untie the rope) never reached the card, so the preview, workout mode, share link
// and print page showed only "spread 4 cones" with no tasks. Session 1's relay lost
// its sample questions and variations the same way.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const B = require('../js/booklet.js');

const root = path.join(__dirname, '..');
B.setData(JSON.parse(fs.readFileSync(path.join(root, B.MAIN_PATH), 'utf8')), null);

function mainOf(id) { return B.sessionWorkout(id).phases[1].exercises; }

test('opening-5 task course card lists the three cone-to-cone tasks in order', function () {
  const course = mainOf('opening-5')[0];
  assert.match(course.name, /מסלול משימות/);
  assert.match(course.notes, /^מחלקים את הקבוצה/);
  assert.match(course.notes, /\n1\. מהקונוס 1 ל־2 .*15 סמוכקום/);
  assert.match(course.notes, /\n2\. מהקונוס 2 ל־3 .*20 בטן אולר/);
  assert.match(course.notes, /\n3\. מקונוס 3 ל־4 .*הליכת דב/);
});

test('opening-2 chain run card lists its five formations', function () {
  const chain = mainOf('opening-2')[0];
  assert.match(chain.name, /ריצה בשרשרת/);
  assert.match(chain.notes, /\n1\. הראשון רץ לקונוס/);
  assert.match(chain.notes, /\n5\. תחרות בזוגות/);
});

test('opening-1 relay card carries its sample questions and variations', function () {
  const relay = mainOf('opening-1')[0];
  assert.match(relay.notes, /\nדוגמאות: מה השם של כל אחד מחברי הקבוצה\? \/ /);
  assert.match(relay.notes, /\nוריאציות: קפיצה על רגל אחת \/ הליכת לאנצים/);
});

test('steps survive the share link round trip', function () {
  global.window = global.window || {};
  const course = mainOf('opening-5')[0];
  const TH = require('../js/core.js');
  const w = TH.expandPlan(TH.compactPlan({ phases: [{ name: 'Main', exercises: [course] }] }));
  assert.equal(w.phases[0].exercises[0].notes, course.notes);
});
