'use strict';

// suggestNextVolume(history): history is an array of weekly volumes, oldest first.
// If the last two entries are both positive, bump the last by 5% rounded to the
// nearest 0.5; otherwise return the last entry unchanged.
// Empty -> null. Single entry -> that entry unchanged.
function suggestNextVolume(history) {
  if (!Array.isArray(history) || history.length === 0) return null;
  const last = history[history.length - 1];
  if (history.length === 1) return last;
  const prev = history[history.length - 2];
  if (prev > 0 && last > 0) return Math.round(last * 1.05 * 2) / 2;
  return last;
}

module.exports = { suggestNextVolume };
