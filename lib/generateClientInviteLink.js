const { randomUUID } = require('crypto');

const trainers = {
  'trainer-1': { name: 'Alice' },
  'trainer-2': { name: 'Bob' }
};
const programs = {
  'prog-1': { trainerId: 'trainer-1', name: 'Strength Program', active: true },
  'prog-2': { trainerId: 'trainer-1', name: 'Cardio Program', active: false },
  'prog-3': { trainerId: 'trainer-2', name: 'Yoga Program', active: true }
};
const invites = new Map();

function generateClientInviteLink(trainerId, programId = null) {
  if (typeof trainerId !== 'string' || trainerId.trim() === '' || !trainers[trainerId]) {
    return { error: 'Trainer not found' };
  }
  if (programId !== null) {
    if (typeof programId !== 'string' || programId.trim() === '' || !programs[programId]) {
      return { error: 'Invalid programId' };
    }
    if (programs[programId].trainerId !== trainerId) {
      return { error: 'Program not accessible to trainer' };
    }
    if (!programs[programId].active) {
      return { error: 'Program unavailable' };
    }
  }

  let token;
  do {
    token = randomUUID();
  } while (invites.has(token));
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  invites.set(token, { trainerId, programId, expiresAt, used: false });
  return {
    inviteUrl: `https://app.trainerhub.com/join?token=${encodeURIComponent(token)}`,
    token,
    expiresAt
  };
}

function validateClientInviteLink(token) {
  if (typeof token !== 'string' || token.length === 0 || !invites.has(token)) {
    return { valid: false, error: 'Invalid token' };
  }
  const invite = invites.get(token);
  if (Date.parse(invite.expiresAt) <= Date.now()) {
    return { valid: false, error: 'Token expired' };
  }
  if (invite.used) {
    return { valid: false, error: 'Token already redeemed' };
  }
  const program = invite.programId === null ? null : programs[invite.programId];
  return {
    valid: true,
    trainerId: invite.trainerId,
    trainerName: trainers[invite.trainerId].name,
    programId: invite.programId,
    programName: program ? program.name : null,
    expiresAt: invite.expiresAt
  };
}

module.exports = { generateClientInviteLink, validateClientInviteLink };
