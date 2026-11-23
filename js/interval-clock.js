// Multi-mode interval clock used by the live workout page and the reserves page.
// Works as a CommonJS module in Node and as THIntervalClock in the browser.
// advanceIntervalClock is pure: it returns a new state and leaves the old one alone.

const MODES = Object.freeze(['emom', 'tabata', 'amrap']);

function normalizeMode(mode) {
  if (typeof mode !== 'string') return 'unknown';
  const key = mode.trim().toLowerCase();
  if (key === 'emom' || key === 'e2mom') return 'emom';
  if (key === 'tabata' || key === 'טבטה') return 'tabata';
  if (key === 'amrap') return 'amrap';
  return 'unknown';
}

function positiveSeconds(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

function elapsedValue(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

function normalizeConfig(mode, config) {
  const cfg = config && typeof config === 'object' ? config : {};
  if (mode === 'emom') {
    return {
      intervalSeconds: positiveSeconds(
        cfg.intervalSeconds ?? cfg.interval ?? cfg.seconds ?? cfg.workSeconds ?? positiveSeconds(cfg.minutes, 0) * 60,
        60
      ),
      rounds: positiveSeconds(cfg.rounds ?? cfg.totalRounds ?? cfg.count, 10)
    };
  }
  if (mode === 'tabata') {
    const rest = Number(cfg.restSeconds ?? cfg.rest ?? cfg.offSeconds);
    return {
      workSeconds: positiveSeconds(cfg.workSeconds ?? cfg.work ?? cfg.onSeconds ?? cfg.seconds, 20),
      restSeconds: Number.isFinite(rest) && rest >= 0 ? Math.floor(rest) : 10,
      rounds: positiveSeconds(cfg.rounds ?? cfg.totalRounds ?? cfg.count, 8)
    };
  }
  if (mode === 'amrap') {
    const durationSeconds = positiveSeconds(
      cfg.durationSeconds ?? cfg.duration ?? cfg.seconds ?? cfg.totalSeconds ?? positiveSeconds(cfg.minutes, 0) * 60,
      300
    );
    const rounds = positiveSeconds(cfg.rounds ?? cfg.totalRounds, 0);
    const roundSeconds =
      rounds > 0
        ? Math.max(1, Math.ceil(durationSeconds / rounds))
        : Math.min(durationSeconds, positiveSeconds(cfg.roundSeconds ?? cfg.roundLength ?? cfg.intervalSeconds, 60));
    return { durationSeconds, roundSeconds };
  }
  return {};
}

function phaseAt(mode, config, elapsed) {
  if (mode === 'emom') {
    const total = config.intervalSeconds * config.rounds;
    if (elapsed >= total) {
      return { phase: 'finished', round: config.rounds, roundsCompleted: config.rounds, remainingSeconds: 0 };
    }
    return {
      phase: 'work',
      round: Math.floor(elapsed / config.intervalSeconds) + 1,
      roundsCompleted: Math.floor(elapsed / config.intervalSeconds),
      remainingSeconds: config.intervalSeconds - (elapsed % config.intervalSeconds)
    };
  }
  if (mode === 'tabata') {
    const cycle = config.workSeconds + config.restSeconds;
    const total = cycle * config.rounds;
    if (elapsed >= total) {
      return { phase: 'finished', round: config.rounds, roundsCompleted: config.rounds, remainingSeconds: 0 };
    }
    const round = Math.floor(elapsed / cycle) + 1;
    const into = elapsed % cycle;
    if (into < config.workSeconds) {
      return {
        phase: 'work',
        round,
        roundsCompleted: round - 1,
        remainingSeconds: config.workSeconds - into
      };
    }
    return {
      phase: 'rest',
      round,
      roundsCompleted: round - 1,
      remainingSeconds: config.restSeconds - (into - config.workSeconds)
    };
  }
  if (mode === 'amrap') {
    if (elapsed >= config.durationSeconds) {
      const lastRound = Math.max(1, Math.ceil(config.durationSeconds / config.roundSeconds));
      return { phase: 'finished', round: lastRound, roundsCompleted: lastRound, remainingSeconds: 0 };
    }
    const round = Math.floor(elapsed / config.roundSeconds) + 1;
    return {
      phase: 'work',
      round,
      roundsCompleted: round - 1,
      remainingSeconds: Math.min(
        config.roundSeconds - (elapsed % config.roundSeconds),
        config.durationSeconds - elapsed
      )
    };
  }
  return { phase: 'finished', round: 0, roundsCompleted: 0, remainingSeconds: 0 };
}

function totalFor(mode, config) {
  if (mode === 'emom') return config.intervalSeconds * config.rounds;
  if (mode === 'tabata') return (config.workSeconds + config.restSeconds) * config.rounds;
  if (mode === 'amrap') return config.durationSeconds;
  return 0;
}

function buildState(mode, config, elapsed) {
  const phase = phaseAt(mode, config, elapsed);
  return {
    mode,
    valid: mode !== 'unknown',
    phase: phase.phase,
    finished: phase.phase === 'finished',
    round: phase.round,
    currentRound: phase.round,
    roundsCompleted: phase.roundsCompleted,
    remainingSeconds: phase.remainingSeconds,
    secondsRemaining: phase.remainingSeconds,
    elapsedSeconds: elapsed,
    totalSeconds: totalFor(mode, config),
    config
  };
}

function createIntervalClock(mode, config) {
  const normalized = normalizeMode(mode);
  return buildState(normalized, normalizeConfig(normalized, config), 0);
}

function advanceIntervalClock(clockState, elapsedSeconds) {
  const state = clockState && typeof clockState === 'object' ? clockState : createIntervalClock(null);
  const mode = normalizeMode(state.mode);
  if (mode === 'unknown' || state.phase === 'finished') return { ...state };
  return buildState(
    mode,
    normalizeConfig(mode, state.config),
    elapsedValue(state.elapsedSeconds) + elapsedValue(elapsedSeconds)
  );
}

function formatDuration(seconds) {
  const total = elapsedValue(seconds);
  if (total < 60) return String(total);
  const minutes = Math.floor(total / 60);
  return `${minutes}:${String(total % 60).padStart(2, '0')}`;
}

function formatIntervalClock(clockState) {
  if (!clockState || normalizeMode(clockState.mode) === 'unknown') return 'בחרו סוג שעון מרווחים';
  const state = clockState.phase === 'finished' ? clockState : advanceIntervalClock(clockState, 0);
  if (state.phase === 'finished') return 'השעון הסתיים';
  const modeName = state.mode === 'emom' ? 'EMOM' : state.mode === 'tabata' ? 'טבטה' : 'AMRAP';
  const phaseName = state.phase === 'rest' ? 'מנוחה' : 'עבודה';
  const total = state.config.rounds || '';
  const roundText = total ? `סבב ${state.round} מתוך ${total}` : `סבב ${state.round}`;
  return `${modeName} · ${roundText} · ${phaseName} · ${formatDuration(state.remainingSeconds)} שניות`;
}

const api = { createIntervalClock, advanceIntervalClock, formatIntervalClock, MODES };

if (typeof module === 'object' && module.exports) {
  module.exports = api;
}
const root = typeof globalThis !== 'undefined' ? globalThis : null;
if (root) root.THIntervalClock = api;
