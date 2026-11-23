const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createPartnerPacer, switchPartnerTurn } = require('../js/you-go-i-go.js');

test('1) אתחול תור א׳', () => {
  const pacer = createPartnerPacer(3);
  assert.equal(pacer.activePartner, 'partner_a');
  assert.equal(pacer.currentRound, 1);
  assert.equal(pacer.totalRounds, 3);
  assert.equal(pacer.isFinished, false);
  assert.deepEqual(pacer.partnerTimes.partner_a, []);
  assert.deepEqual(pacer.partnerTimes.partner_b, []);
  assert.equal(pacer.history.length, 0);

  const defaultPacer = createPartnerPacer();
  assert.equal(defaultPacer.activePartner, 'partner_a');
  assert.equal(defaultPacer.currentRound, 1);
  assert.ok(defaultPacer.totalRounds > 0);
});

test('2) מעבר לתור ב׳ עם תיעוד זמן', () => {
  const pacer = createPartnerPacer(3);
  const updated = switchPartnerTurn(pacer, 42);

  assert.equal(updated.activePartner, 'partner_b');
  assert.equal(updated.currentRound, 1);
  assert.equal(updated.lastElapsedSeconds, 42);
  assert.deepEqual(updated.partnerTimes.partner_a, [42]);
  assert.deepEqual(updated.partnerTimes.partner_b, []);
  assert.equal(updated.history.length, 1);
  assert.deepEqual(updated.history[0], {
    round: 1,
    partner: 'partner_a',
    elapsedSeconds: 42
  });
  assert.equal(updated.isFinished, false);
});

test('3) השלמת סבב וקידום מונה', () => {
  const pacer = createPartnerPacer(3);
  switchPartnerTurn(pacer, 30);
  assert.equal(pacer.activePartner, 'partner_b');
  assert.equal(pacer.currentRound, 1);

  switchPartnerTurn(pacer, 45);
  assert.equal(pacer.activePartner, 'partner_a');
  assert.equal(pacer.currentRound, 2);
  assert.equal(pacer.isFinished, false);
  assert.deepEqual(pacer.partnerTimes.partner_a, [30]);
  assert.deepEqual(pacer.partnerTimes.partner_b, [45]);
  assert.equal(pacer.history.length, 2);
  assert.deepEqual(pacer.history[1], {
    round: 1,
    partner: 'partner_b',
    elapsedSeconds: 45
  });
});

test('4) סיום בסבב האחרון', () => {
  const pacer = createPartnerPacer(2);
  switchPartnerTurn(pacer, 20);
  switchPartnerTurn(pacer, 25);
  assert.equal(pacer.currentRound, 2);
  assert.equal(pacer.isFinished, false);

  switchPartnerTurn(pacer, 30);
  assert.equal(pacer.activePartner, 'partner_b');
  assert.equal(pacer.isFinished, false);

  switchPartnerTurn(pacer, 35);
  assert.equal(pacer.isFinished, true);
  assert.equal(pacer.currentRound, 2);
  assert.equal(pacer.history.length, 4);

  switchPartnerTurn(pacer, 50);
  assert.equal(pacer.isFinished, true);
  assert.equal(pacer.history.length, 4);
});

test('5) קיום הפאנל ב-frontend/workout-mode.html וב-reserves.html', () => {
  const root = path.join(__dirname, '..');
  const workoutHtml = fs.readFileSync(path.join(root, 'frontend', 'workout-mode.html'), 'utf8');
  const reservesHtml = fs.readFileSync(path.join(root, 'reserves.html'), 'utf8');

  assert.ok(workoutHtml.includes('youGoIGoPanel'), 'workout-mode.html includes youGoIGoPanel');
  assert.ok(workoutHtml.includes('switchPartnerTurnBtn'), 'workout-mode.html includes switchPartnerTurnBtn');
  assert.ok(workoutHtml.includes('activePartnerTurnLabel'), 'workout-mode.html includes activePartnerTurnLabel');
  assert.ok(workoutHtml.includes('you-go-i-go.js'), 'workout-mode.html loads you-go-i-go.js');
  assert.ok(workoutHtml.includes('createElement'), 'workout-mode.html uses createElement');
  assert.ok(workoutHtml.includes('textContent'), 'workout-mode.html uses textContent');
  assert.ok(
    !workoutHtml.includes('innerHTML = `<div id="youGoIGoPanel"'),
    'no innerHTML for youGoIGoPanel in workout-mode.html'
  );

  assert.ok(reservesHtml.includes('youGoIGoPanel'), 'reserves.html includes youGoIGoPanel');
  assert.ok(reservesHtml.includes('switchPartnerTurnBtn'), 'reserves.html includes switchPartnerTurnBtn');
  assert.ok(reservesHtml.includes('activePartnerTurnLabel'), 'reserves.html includes activePartnerTurnLabel');
  assert.ok(reservesHtml.includes('you-go-i-go.js'), 'reserves.html loads you-go-i-go.js');
  assert.ok(reservesHtml.includes('createElement'), 'reserves.html uses createElement');
  assert.ok(reservesHtml.includes('textContent'), 'reserves.html uses textContent');
  assert.ok(
    !reservesHtml.includes('innerHTML = `<div id="youGoIGoPanel"'),
    'no innerHTML for youGoIGoPanel in reserves.html'
  );
});
