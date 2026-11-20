(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.THBreathPacer = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var DEFAULT_CONFIG = {
    inhale: 4,
    hold: 2,
    exhale: 6
  };

  function getBreathCyclePhase(elapsedSeconds, config) {
    var cfg = config || DEFAULT_CONFIG;
    var inhale = typeof cfg.inhale === 'number' && cfg.inhale > 0 ? cfg.inhale : DEFAULT_CONFIG.inhale;
    var hold = typeof cfg.hold === 'number' && cfg.hold >= 0 ? cfg.hold : DEFAULT_CONFIG.hold;
    var exhale = typeof cfg.exhale === 'number' && cfg.exhale > 0 ? cfg.exhale : DEFAULT_CONFIG.exhale;
    var totalCycle = inhale + hold + exhale;

    var sec = Number(elapsedSeconds);
    if (!Number.isFinite(sec) || sec < 0) {
      sec = 0;
    }

    var timeInCycle = sec % totalCycle;
    var phase = '';
    var remainingInPhase = 0;

    if (timeInCycle < inhale) {
      phase = 'שאיפה 4 שניות';
      remainingInPhase = inhale - timeInCycle;
    } else if (timeInCycle < inhale + hold) {
      phase = 'החזקה 2 שניות';
      remainingInPhase = (inhale + hold) - timeInCycle;
    } else {
      phase = 'נשיפה איטית 6 שניות';
      remainingInPhase = totalCycle - timeInCycle;
    }

    var completedCycles = Math.floor(sec / totalCycle);

    return {
      phase: phase,
      remainingInPhase: remainingInPhase,
      completedCycles: completedCycles,
      totalCycle: totalCycle
    };
  }

  function calculateRecoveryBreathScore(completedCycles) {
    var c = Number(completedCycles);
    if (!Number.isFinite(c) || c < 0) {
      c = 0;
    }
    return {
      completedCycles: c,
      score: c * 10,
      label: c >= 5 ? 'התרפיה מושלמת' : (c >= 3 ? 'הרפיה טובה' : 'התחלה טובה')
    };
  }

  function initBreathPacerUI(containerSelector) {
    var container = document.querySelector(containerSelector || '#breathPacerPanel');
    if (!container) return;

    if (!container.querySelector('#breathPhaseLabel')) {
      var label = document.createElement('div');
      label.id = 'breathPhaseLabel';
      container.appendChild(label);
    }
    if (!container.querySelector('#startBreathPacerBtn')) {
      var btn = document.createElement('button');
      btn.id = 'startBreathPacerBtn';
      container.appendChild(btn);
    }
  }

  return {
    getBreathCyclePhase: getBreathCyclePhase,
    calculateRecoveryBreathScore: calculateRecoveryBreathScore,
    initBreathPacerUI: initBreathPacerUI
  };
}));
