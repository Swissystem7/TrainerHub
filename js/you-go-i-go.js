/**
 * You-Go-I-Go Partner Pacer for live workout mode and field sessions.
 * Alternates turns between partner_a and partner_b, recording set/rest elapsed times.
 * CommonJS / UMD compatible.
 */
((root, factory) => {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  if (root) {
    root.THYouGoIGo = api;
    root.createPartnerPacer = api.createPartnerPacer;
    root.switchPartnerTurn = api.switchPartnerTurn;
    root.renderYouGoIGoPanel = api.renderYouGoIGoPanel;
    if (root.TH && typeof root.TH === 'object') {
      root.TH.createPartnerPacer = api.createPartnerPacer;
      root.TH.switchPartnerTurn = api.switchPartnerTurn;
      root.TH.renderYouGoIGoPanel = api.renderYouGoIGoPanel;
    }
  }
})(typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : this, () => {
  function createPartnerPacer(totalRounds) {
    const parsed = Number.parseInt(totalRounds, 10);
    const rounds = Number.isInteger(parsed) && parsed > 0 ? parsed : 3;

    return {
      totalRounds: rounds,
      currentRound: 1,
      activePartner: 'partner_a',
      isFinished: false,
      finished: false,
      status: 'active',
      lastElapsedSeconds: 0,
      partnerTimes: {
        partner_a: [],
        partner_b: []
      },
      history: []
    };
  }

  function switchPartnerTurn(pacerState, elapsedSeconds) {
    if (!pacerState) {
      return null;
    }
    if (pacerState.isFinished) {
      return pacerState;
    }

    const elapsed = Math.max(0, Number(elapsedSeconds) || 0);
    const currentPartner = pacerState.activePartner;
    const currentRound = pacerState.currentRound;

    if (!pacerState.partnerTimes) {
      pacerState.partnerTimes = { partner_a: [], partner_b: [] };
    }
    if (!pacerState.partnerTimes[currentPartner]) {
      pacerState.partnerTimes[currentPartner] = [];
    }
    pacerState.partnerTimes[currentPartner].push(elapsed);

    if (!Array.isArray(pacerState.history)) {
      pacerState.history = [];
    }
    const turnRecord = {
      round: currentRound,
      partner: currentPartner,
      elapsedSeconds: elapsed
    };
    pacerState.history.push(turnRecord);
    pacerState.lastTurn = turnRecord;
    pacerState.lastElapsedSeconds = elapsed;
    pacerState.restSeconds = elapsed;

    if (currentPartner === 'partner_a') {
      pacerState.activePartner = 'partner_b';
    } else {
      pacerState.activePartner = 'partner_a';
      if (pacerState.currentRound >= pacerState.totalRounds) {
        pacerState.isFinished = true;
        pacerState.finished = true;
        pacerState.status = 'finished';
      } else {
        pacerState.currentRound += 1;
      }
    }

    return pacerState;
  }

  function renderYouGoIGoPanel(container, options) {
    if (!container || typeof document === 'undefined') {
      return null;
    }
    const opts = options || {};
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }

    const initialRounds = opts.totalRounds || 3;
    let pacer = opts.state || createPartnerPacer(initialRounds);

    const panel = document.createElement('div');
    panel.id = 'youGoIGoPanel';
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-label', 'תור-בתור זוגי');

    const activePartnerTurnLabel = document.createElement('div');
    activePartnerTurnLabel.id = 'activePartnerTurnLabel';
    activePartnerTurnLabel.setAttribute('role', 'status');
    activePartnerTurnLabel.setAttribute('aria-live', 'polite');

    function updateLabel() {
      if (pacer.isFinished) {
        activePartnerTurnLabel.textContent = 'אימון זוגי הושלם!';
      } else {
        const partnerName = pacer.activePartner === 'partner_a' ? 'שותף א׳' : 'שותף ב׳';
        activePartnerTurnLabel.textContent = `תור: ${partnerName} (סבב ${pacer.currentRound}/${pacer.totalRounds})`;
      }
    }
    updateLabel();
    panel.appendChild(activePartnerTurnLabel);

    const switchPartnerTurnBtn = document.createElement('button');
    switchPartnerTurnBtn.type = 'button';
    switchPartnerTurnBtn.id = 'switchPartnerTurnBtn';
    switchPartnerTurnBtn.setAttribute('aria-label', 'החלף תור שותף');
    switchPartnerTurnBtn.textContent = 'החלף תור שותף';

    switchPartnerTurnBtn.addEventListener('click', () => {
      const elapsed = typeof opts.getElapsedSeconds === 'function' ? opts.getElapsedSeconds() : 30;
      pacer = switchPartnerTurn(pacer, elapsed);
      updateLabel();
      if (pacer.isFinished) {
        switchPartnerTurnBtn.disabled = true;
        switchPartnerTurnBtn.textContent = 'אימון זוגי הסתיים';
      }
      if (typeof opts.onSwitch === 'function') {
        opts.onSwitch(pacer);
      }
    });
    panel.appendChild(switchPartnerTurnBtn);

    container.appendChild(panel);
    return {
      panel,
      activePartnerTurnLabel,
      switchPartnerTurnBtn,
      getPacer: () => pacer
    };
  }

  return {
    createPartnerPacer,
    switchPartnerTurn,
    renderYouGoIGoPanel
  };
});
