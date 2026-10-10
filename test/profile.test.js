'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const mem = {};
global.localStorage = {
  getItem: function (k) { return Object.prototype.hasOwnProperty.call(mem, k) ? mem[k] : null; },
  setItem: function (k, v) { mem[k] = String(v); },
  removeItem: function (k) { delete mem[k]; }
};

const TH = require('../js/core.js');
const Profile = require('../js/profile.js');

function reset() {
  Object.keys(mem).forEach(function (k) { delete mem[k]; });
}

test('saveProfile stores equipment and limitations under client id', function () {
  reset();
  const id = 'client_alpha';
  const input = {
    equipment: ['dumbbells', 'barbell'],
    limitations: ['shoulders', 'knees']
  };
  assert.equal(Profile.saveProfile(id, input), true);
  const got = Profile.getProfile(id);
  assert.deepEqual(got.equipment, input.equipment);
  assert.deepEqual(got.limitations, input.limitations);
});

test('profiles for different clients stay isolated', function () {
  reset();
  Profile.saveProfile('a', { equipment: ['band'], limitations: ['back'] });
  Profile.saveProfile('b', { equipment: ['machine'], limitations: ['legs'] });
  assert.deepEqual(Profile.getProfile('a').equipment, ['band']);
  assert.deepEqual(Profile.getProfile('b').limitations, ['legs']);
});

test('getProfile returns empty arrays when nothing was saved', function () {
  reset();
  assert.deepEqual(Profile.getProfile('missing'), { equipment: [], limitations: [] });
});

test('stored profile is not mutated when the saved object changes later', function () {
  reset();
  const input = { equipment: ['none'], limitations: ['core'] };
  Profile.saveProfile('c1', input);
  input.equipment.push('dumbbells');
  input.limitations.push('chest');
  assert.deepEqual(Profile.getProfile('c1'), { equipment: ['none'], limitations: ['core'] });
});
