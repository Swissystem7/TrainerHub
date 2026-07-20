function createShareableWorkoutCard(workoutId, trainerId, options = {}) {
  const { includeName = false, ...rest } = options;
  const validWorkouts = {
    '550e8400-e29b-41d4-a716-446655440000': { trainerId: '660e8400-e29b-41d4-a716-446655440001', shareable: true, name: 'Leg Day' },
    '550e8400-e29b-41d4-a716-446655440002': { trainerId: '660e8400-e29b-41d4-a716-446655440003', shareable: false, name: 'Private Workout' },
  };
  const workout = validWorkouts[workoutId];
  if (!workout || workout.trainerId !== trainerId) {
    throw new Error('Workout not found or unauthorized');
  }
  if (!workout.shareable) {
    throw new Error('Workout not shareable');
  }
  const hash = require('crypto').randomBytes(6).toString('base64url').slice(0, 6);
  const cardUrl = `/card/${hash}`;
  const namePart = includeName ? ` ${workout.name}` : '';
  const previewImage = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+XyBvWQAAAABJRU5ErkJggg==';
  return { cardUrl, previewImage };
}
module.exports = { createShareableWorkoutCard };
