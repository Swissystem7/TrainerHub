'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Digest = require('../js/weekly-digest.js');

const root = path.join(__dirname, '..');
const weeklyHtml = fs.readFileSync(path.join(root, 'weekly.html'), 'utf8');
const printHtml = fs.readFileSync(path.join(root, 'workout-print.html'), 'utf8');

test('buildWeeklyDigest calculates full plan compliance correctly', function () {
  const sessions = [{ exercises: [{ sets: 3, reps: 10 }] }, { exercises: [{ sets: 3, reps: 10 }] }];
  const res = Digest.buildWeeklyDigest(sessions, 2);
  assert.equal(res.completed, 2);
  assert.equal(res.planned, 2);
  assert.equal(res.totalVolume, 60);
});

test('buildWeeklyDigest calculates half-week and volume correctly', function () {
  const sessions = [{ exercises: [{ sets: 4, reps: 8 }] }];
  const res = Digest.buildWeeklyDigest(sessions, 4);
  assert.equal(res.completed, 1);
  assert.equal(res.planned, 4);
  assert.equal(res.totalVolume, 32);
});

test('buildWeeklyDigest handles empty or null history gracefully', function () {
  const resNull = Digest.buildWeeklyDigest(null, 3);
  assert.equal(resNull.completed, 0);
  assert.equal(resNull.planned, 3);
  assert.equal(resNull.totalVolume, 0);

  const resEmpty = Digest.buildWeeklyDigest([], 3);
  assert.equal(resEmpty.completed, 0);
});

test('buildWeeklyDigest computes accurate muscle distribution', function () {
  const sessions = [{ muscle: 'chest' }, { muscle: 'chest' }, { muscle: 'back' }];
  const res = Digest.buildWeeklyDigest(sessions, 3);
  assert.deepEqual(res.muscles, { chest: 2, back: 1 });
});

test('weekly-digest module provides expected functions, HTML rendering and print view button', function () {
  assert.ok(typeof Digest.digestHtml === 'function');
  assert.ok(typeof Digest.buildWeeklyDigest === 'function');
  assert.ok(typeof Digest.initWeeklyDigestUI === 'function');
  assert.ok(typeof Digest.digestPrintHtml === 'function');
  const sample = Digest.buildWeeklyDigest([{ exercises: [{ sets: 1, reps: 1 }] }], 1);
  const html = Digest.digestHtml(sample);
  assert.match(html, /weeklyDigestCard/);
  assert.match(html, /printWeeklyDigestBtn/);
  const printHtml = Digest.digestPrintHtml(sample);
  assert.match(printHtml, /weeklyDigestPrintView/);
});

test('weekly.html and workout-print.html integration requirements are met', function () {
  assert.match(weeklyHtml, /weeklyDigestCard/);
  assert.match(printHtml, /weeklyDigestPrintView/);
});
