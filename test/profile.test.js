'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const mem = {};
const workingStorage = {
  getItem: function (k) { return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null; },
  setItem: function (k, v) { mem[k] = String(v); },
  removeItem: function (k) { delete mem[k]; }
};
global.localStorage = workingStorage;

const TH = require('../js/core.js');
const Profile = require('../js/profile.js');

function reset() {
  Object.keys(mem).forEach(function (k) { delete mem[k]; });
}

// -----------------------------------------------------------------------------
// 1. normalizeProfile edge cases
// -----------------------------------------------------------------------------

test('normalizeProfile returns { equipment: [], limitations: [] } when passed null, undefined, strings, numbers, booleans, or empty objects', function () {
  const emptyDefault = { equipment: [], limitations: [] };

  const invalidOrEmptyInputs = [
    null,
    undefined,
    '',
    'dumbbells',
    0,
    1,
    -42,
    3.14,
    true,
    false,
    {}
  ];

  for (const input of invalidOrEmptyInputs) {
    assert.deepEqual(
      Profile.normalizeProfile(input),
      emptyDefault,
      `Expected empty default for input: ${JSON.stringify(input)}`
    );
  }

  // Also verify when called with no arguments
  assert.deepEqual(Profile.normalizeProfile(), emptyDefault);
});

test('normalizeProfile handles non-array equipment or limitations by safely normalizing them to empty arrays', function () {
  const cases = [
    { input: { equipment: 'dumbbells', limitations: null }, expected: { equipment: [], limitations: [] } },
    { input: { equipment: 123, limitations: undefined }, expected: { equipment: [], limitations: [] } },
    { input: { equipment: {}, limitations: false }, expected: { equipment: [], limitations: [] } },
    { input: { equipment: null, limitations: 'knee' }, expected: { equipment: [], limitations: [] } },
    { input: { equipment: ['barbell'], limitations: 'none' }, expected: { equipment: ['barbell'], limitations: [] } },
    { input: { equipment: 'none', limitations: ['knees'] }, expected: { equipment: [], limitations: ['knees'] } },
    { input: { equipment: true, limitations: { injury: 'back' } }, expected: { equipment: [], limitations: [] } }
  ];

  for (const { input, expected } of cases) {
    assert.deepEqual(Profile.normalizeProfile(input), expected);
  }
});

test('normalizeProfile ignores extraneous/unexpected properties and only returns equipment and limitations', function () {
  const raw = {
    equipment: ['band'],
    limitations: ['back'],
    extraField: 123,
    customNotes: 'trainer note',
    metadata: { created: '2026-01-01' },
    isAdmin: true
  };

  const normalized = Profile.normalizeProfile(raw);
  assert.deepEqual(normalized, { equipment: ['band'], limitations: ['back'] });
  assert.deepEqual(Object.keys(normalized).sort(), ['equipment', 'limitations']);
  assert.equal('extraField' in normalized, false);
  assert.equal('customNotes' in normalized, false);
});

test('normalizeProfile ensures array immutability/cloning so modifying input arrays later does not affect the returned profile', function () {
  const equipment = ['dumbbells', 'mat'];
  const limitations = ['shoulders'];
  const input = { equipment, limitations };

  const normalized = Profile.normalizeProfile(input);

  equipment.push('kettlebell');
  limitations.push('knees');

  assert.deepEqual(normalized.equipment, ['dumbbells', 'mat']);
  assert.deepEqual(normalized.limitations, ['shoulders']);
});

// -----------------------------------------------------------------------------
// 2. saveProfile validation and edge cases
// -----------------------------------------------------------------------------

test('saveProfile returns false without writing to storage when clientId is null, undefined, empty string, or whitespace only', function () {
  reset();
  const invalidIds = [null, undefined, '', '   ', '\t', '\n', '  \t  \n  '];
  const sampleProfile = { equipment: ['dumbbells'], limitations: ['back'] };

  for (const id of invalidIds) {
    assert.equal(Profile.saveProfile(id, sampleProfile), false, `Should return false for id: ${JSON.stringify(id)}`);
  }

  // Ensure nothing was written to storage
  assert.equal(mem[TH.KEYS.clientProfiles], undefined);
  assert.equal(Object.keys(mem).length, 0);
});

test('saveProfile trims clientId so saving with padding is retrievable via trimmed and padded ID', function () {
  reset();
  const profile = { equipment: ['barbell'], limitations: ['shoulders'] };

  assert.equal(Profile.saveProfile('  client_trim  ', profile), true);

  // Retrievable via exact trimmed ID and padded ID
  assert.deepEqual(Profile.getProfile('client_trim'), profile);
  assert.deepEqual(Profile.getProfile('  client_trim  '), profile);
  assert.deepEqual(Profile.getProfile('\tclient_trim\n'), profile);

  // Stored internally with the trimmed key
  const storedMap = JSON.parse(mem[TH.KEYS.clientProfiles]);
  assert.equal(Object.prototype.hasOwnProperty.call(storedMap, 'client_trim'), true);
  assert.equal(Object.prototype.hasOwnProperty.call(storedMap, '  client_trim  '), false);
});

test('saveProfile updates an existing client profile without wiping or mutating profiles of other clients', function () {
  reset();
  Profile.saveProfile('client_a', { equipment: ['band'], limitations: ['back'] });
  Profile.saveProfile('client_b', { equipment: ['machine'], limitations: ['legs'] });

  // Update client_a
  Profile.saveProfile('client_a', { equipment: ['band', 'dumbbells'], limitations: ['knees'] });

  assert.deepEqual(Profile.getProfile('client_a'), {
    equipment: ['band', 'dumbbells'],
    limitations: ['knees']
  });
  // client_b remains intact
  assert.deepEqual(Profile.getProfile('client_b'), {
    equipment: ['machine'],
    limitations: ['legs']
  });
});

test('saveProfile handles saving a null or empty profile by normalizing it to empty arrays', function () {
  reset();
  assert.equal(Profile.saveProfile('client_null', null), true);
  assert.deepEqual(Profile.getProfile('client_null'), { equipment: [], limitations: [] });

  assert.equal(Profile.saveProfile('client_empty', {}), true);
  assert.deepEqual(Profile.getProfile('client_empty'), { equipment: [], limitations: [] });

  assert.equal(Profile.saveProfile('client_invalid', { equipment: 'bad', limitations: 42 }), true);
  assert.deepEqual(Profile.getProfile('client_invalid'), { equipment: [], limitations: [] });
});

test('saveProfile returns false without unhandled exceptions when storage.setItem throws', function () {
  reset();
  const originalSetItem = global.localStorage.setItem;
  global.localStorage.setItem = function () {
    throw new Error('QuotaExceededError: storage is full');
  };

  try {
    const result = Profile.saveProfile('client_err', { equipment: ['dumbbells'] });
    assert.equal(result, false);
  } finally {
    global.localStorage.setItem = originalSetItem;
  }
});

// -----------------------------------------------------------------------------
// 3. getProfile edge cases
// -----------------------------------------------------------------------------

test('getProfile returns { equipment: [], limitations: [] } when queried with null, undefined, empty string, whitespace only, or non-existent client ID', function () {
  reset();
  Profile.saveProfile('existing_client', { equipment: ['kettlebell'], limitations: [] });

  const missingOrInvalidIds = [null, undefined, '', '   ', '\t', '\r\n', 'non_existent_client'];

  for (const id of missingOrInvalidIds) {
    assert.deepEqual(
      Profile.getProfile(id),
      { equipment: [], limitations: [] },
      `Expected empty profile for id: ${JSON.stringify(id)}`
    );
  }
});

test('getProfile trims the requested clientId', function () {
  reset();
  Profile.saveProfile('client_spaced', { equipment: ['cable'], limitations: ['wrist'] });

  assert.deepEqual(Profile.getProfile('  client_spaced  '), { equipment: ['cable'], limitations: ['wrist'] });
  assert.deepEqual(Profile.getProfile('\n\t client_spaced \t'), { equipment: ['cable'], limitations: ['wrist'] });
});

test('getProfile returned object immutability: modifying returned arrays does not mutate stored profile or subsequent getProfile calls', function () {
  reset();
  Profile.saveProfile('client_immut', { equipment: ['band'], limitations: ['back'] });

  const firstCall = Profile.getProfile('client_immut');
  firstCall.equipment.push('mat');
  firstCall.limitations.push('neck');

  const secondCall = Profile.getProfile('client_immut');
  assert.deepEqual(secondCall, { equipment: ['band'], limitations: ['back'] });

  secondCall.equipment.length = 0;
  const thirdCall = Profile.getProfile('client_immut');
  assert.deepEqual(thirdCall, { equipment: ['band'], limitations: ['back'] });
});

// -----------------------------------------------------------------------------
// 4. Corrupted storage recovery
// -----------------------------------------------------------------------------

test('corrupted storage recovery: falls back to {} and functions when clientProfiles contains invalid JSON', function () {
  reset();
  mem[TH.KEYS.clientProfiles] = '{ not valid JSON :::';

  // getProfile falls back gracefully
  assert.deepEqual(Profile.getProfile('client_1'), { equipment: [], limitations: [] });

  // saveProfile succeeds and recovers storage
  assert.equal(Profile.saveProfile('client_1', { equipment: ['dumbbells'], limitations: [] }), true);
  assert.deepEqual(Profile.getProfile('client_1'), { equipment: ['dumbbells'], limitations: [] });
});

test('corrupted storage recovery: falls back to {} and functions when clientProfiles contains non-object JSON array', function () {
  reset();
  mem[TH.KEYS.clientProfiles] = JSON.stringify([1, 2, 3]);

  assert.deepEqual(Profile.getProfile('client_1'), { equipment: [], limitations: [] });

  assert.equal(Profile.saveProfile('client_1', { equipment: ['barbell'], limitations: ['knees'] }), true);
  assert.deepEqual(Profile.getProfile('client_1'), { equipment: ['barbell'], limitations: ['knees'] });
});

test('corrupted storage recovery: falls back to {} and functions when clientProfiles contains non-object JSON string, number, or boolean', function () {
  const corruptValues = [
    JSON.stringify('foo'),
    JSON.stringify(12345),
    JSON.stringify(true),
    JSON.stringify(false),
    JSON.stringify(null)
  ];

  for (const corruptVal of corruptValues) {
    reset();
    mem[TH.KEYS.clientProfiles] = corruptVal;

    assert.deepEqual(
      Profile.getProfile('client_test'),
      { equipment: [], limitations: [] },
      `Expected empty profile on corrupt value: ${corruptVal}`
    );

    assert.equal(
      Profile.saveProfile('client_test', { equipment: ['pull_up_bar'], limitations: [] }),
      true
    );
    assert.deepEqual(
      Profile.getProfile('client_test'),
      { equipment: ['pull_up_bar'], limitations: [] }
    );
  }
});

// -----------------------------------------------------------------------------
// 5. Global / namespace exports
// -----------------------------------------------------------------------------

test('THClientProfile is exposed on the global object with normalizeProfile, saveProfile, and getProfile', function () {
  assert.ok(global.THClientProfile, 'global.THClientProfile should be defined');
  assert.equal(typeof global.THClientProfile, 'object');
  assert.equal(typeof global.THClientProfile.normalizeProfile, 'function');
  assert.equal(typeof global.THClientProfile.saveProfile, 'function');
  assert.equal(typeof global.THClientProfile.getProfile, 'function');

  // Verify that the module export points to the same object as the global namespace
  assert.equal(Profile, global.THClientProfile);
});
