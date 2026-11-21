const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const BalanceMobility = require('../js/balance-mobility.js');
const SessionBuilder = require('../js/session-builder.js');

test('1. buildBalanceMobilityBlock creates beginner balance block correctly', () => {
	const block = BalanceMobility.buildBalanceMobilityBlock('beginner', []);
	assert.equal(block.title, 'מקבץ יציבות, שיווי משקל ומוביליטי');
	assert.equal(block.exercises.length, 3);
	assert.equal(block.level, 'beginner');
});

test('2. buildBalanceMobilityBlock adapts to knee limitation', () => {
	const block = BalanceMobility.buildBalanceMobilityBlock('beginner', ['knee']);
	const hasKneeEx = block.exercises.some(e => e.id === 'controlled-sit-to-stand' || e.id === 'single-leg-stand');
	assert.equal(hasKneeEx, false);
	assert.ok(block.exercises.length > 0);
});

test('3. integration with buildSession includes balance block when requested', () => {
	const catalog = [{ id: 'w1', he: 'חימום', source: 'local' }, { id: 'e1', he: 'שכיבות שמיכה', muscles: ['chest'], source: 'local' }];
	const res = SessionBuilder.buildSession('אימון חזה 20 דקות', catalog, { includeBalanceBlock: true });
	assert.ok(res.balanceMobilityBlock);
	assert.equal(res.balanceMobilityBlock.exercises.length, 3);
});

test('4. handles null or invalid input gracefully', () => {
	const block = BalanceMobility.buildBalanceMobilityBlock(null, null);
	assert.equal(block.exercises.length, 3);
	assert.equal(block.level, 'beginner');
});

test('5. exercises.html contains required balance elements', () => {
	const htmlPath = path.join(__dirname, '../exercises.html');
	const htmlContent = fs.readFileSync(htmlPath, 'utf8');
	assert.ok(htmlContent.includes('id="balanceMobilityBtn"'));
	assert.ok(htmlContent.includes('id="balanceMobilityOut"'));
});
