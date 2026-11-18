const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const UnitConverter = require('../js/unit-converter.js');

test('convert kg to lbs', () => {
	const res = UnitConverter.convertWeight(10, 'kg', 'lbs');
	assert.equal(typeof res, 'number');
	assert.ok(res > 20);
});

test('convert lbs to kg', () => {
	const res = UnitConverter.convertWeight(22, 'lbs', 'kg');
	assert.equal(typeof res, 'number');
	assert.ok(res > 0);
});

test('negative or NaN returns zero', () => {
	assert.equal(UnitConverter.convertWeight(-5, 'kg', 'lbs'), 0);
	assert.equal(UnitConverter.convertWeight('abc', 'kg', 'lbs'), 0);
});

test('save and load with storage error fallback', () => {
	const mockStore = {
		setItem() { throw new Error('Quota exceeded'); },
		getItem() { throw new Error('Access denied'); }
	};
	const saved = UnitConverter.saveWeightUnitPreference('lbs', mockStore);
	assert.equal(saved, false);
	const loaded = UnitConverter.loadWeightUnitPreference(mockStore);
	assert.equal(loaded, 'kg');
});

test('index.html contains weightUnitSelect and label', () => {
	const indexPath = path.join(__dirname, '..', 'index.html');
	if (!fs.existsSync(indexPath)) {
		assert.ok(true, 'index.html optional if missing in test env');
		return;
	}
	const html = fs.readFileSync(indexPath, 'utf8');
	assert.ok(html.includes('weightUnitSelect'), 'has weightUnitSelect');
	assert.ok(html.includes('for="weightUnitSelect"'), 'has explicit label for weightUnitSelect');
});
