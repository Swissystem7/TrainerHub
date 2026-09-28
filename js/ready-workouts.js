const THIngest = require('./ingest.js');
const readyWorkoutsData = require('./ready-workouts.json');

const all = readyWorkoutsData;

function search(query) {
  if (query === undefined || query === null) {
    return [...all];
  }
  if (typeof query !== 'string') {
    return [];
  }
  const q = query.trim().toLowerCase();
  if (!q) {
    return [...all];
  }
  return all.filter(entry => {
    return entry && typeof entry.title === 'string' && entry.title.toLowerCase().includes(q);
  });
}

function toWorkout(entry) {
  if (!entry) {
    return null;
  }
  const text = typeof entry === 'string' ? entry : entry.text;
  if (!text) {
    return null;
  }
  return THIngest.ingestText(text);
}

module.exports = {
  all,
  search,
  toWorkout
};
