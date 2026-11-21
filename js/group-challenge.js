(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.THGroupChallenge = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function createWeeklyChallenge(challengeType, targetTotal) {
    var type = challengeType && typeof challengeType === 'string' ? challengeType : 'generic';
    var target = typeof targetTotal === 'number' && !isNaN(targetTotal) && targetTotal > 0 ? targetTotal : 100;
    return {
      challengeType: type,
      targetTotal: target,
      currentProgress: 0,
      createdAt: new Date().toISOString()
    };
  }

  function logChallengeProgress(currentProgress, addedAmount, targetTotal) {
    var current = typeof currentProgress === 'number' && !isNaN(currentProgress) && currentProgress >= 0 ? currentProgress : 0;
    var added = typeof addedAmount === 'number' && !isNaN(addedAmount) && addedAmount >= 0 ? addedAmount : 0;
    var target = typeof targetTotal === 'number' && !isNaN(targetTotal) && targetTotal > 0 ? targetTotal : 100;

    var newTotal = current + added;
    var percent = Math.min(100, Math.round((newTotal / target) * 100));
    var message = 'עדכון אתגר קבוצתי: ' + newTotal + ' מתוך ' + target + ' (' + percent + '%)';

    return {
      currentProgress: newTotal,
      targetTotal: target,
      percent: percent,
      completed: newTotal >= target,
      message: message
    };
  }

  return {
    createWeeklyChallenge: createWeeklyChallenge,
    logChallengeProgress: logChallengeProgress
  };
}));
