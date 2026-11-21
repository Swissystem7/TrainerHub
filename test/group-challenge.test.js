'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createWeeklyChallenge, logChallengeProgress } = require('../js/group-challenge.js');

test('createWeeklyChallenge creates valid challenge object', function () {
  const challenge = createWeeklyChallenge('pushups', 500);
  assert.equal(challenge.challengeType, 'pushups');
  assert.equal(challenge.targetTotal, 500);
  assert.equal(challenge.currentProgress, 0);
  assert.ok(challenge.createdAt);
});

test('logChallengeProgress computes progress and percentage correctly', function () {
  const result = logChallengeProgress(100, 50, 200);
  assert.equal(result.currentProgress, 150);
  assert.equal(result.percent, 75);
  assert.equal(result.completed, false);
  assert.match(result.message, /75%/);
});

test('logChallengeProgress handles 100% completion correctly', function () {
  const result = logChallengeProgress(180, 50, 200);
  assert.equal(result.currentProgress, 230);
  assert.equal(result.percent, 100);
  assert.equal(result.completed, true);
});

test('logChallengeProgress handles negative or null inputs gracefully', function () {
  const result = logChallengeProgress(-10, null, -50);
  assert.equal(result.currentProgress, 0);
  assert.equal(result.targetTotal, 100);
  assert.equal(result.percent, 0);
  assert.equal(result.completed, false);
});

test('reserves.html contains weeklyChallengePanel with accessible labels', function () {
  const root = path.join(__dirname, '..');
  const reservesHtml = fs.readFileSync(path.join(root, 'reserves.html'), 'utf8');
  assert.match(reservesHtml, /id="weeklyChallengePanel"/);
  assert.match(reservesHtml, /id="logChallengeStepBtn"/);
  assert.match(reservesHtml, /for="challengeStepInput"/);
});
