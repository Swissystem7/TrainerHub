'use strict';

// The consent banner (js/consent.js) sits at the bottom of the page until the visitor chooses,
// and it would cover buttons the browser tests click. Tests that drive a real page start from a
// visitor who already chose "no": the banner stays away and Sentry is never loaded.
// Usage: await declineConsent(browserContext);  (before the first goto)
async function declineConsent(context) {
  await context.addInitScript(() => {
    try {
      if (!window.localStorage.getItem('th-consent-v1')) window.localStorage.setItem('th-consent-v1', 'denied');
    } catch (_) {
      /* storage blocked: the banner may show, nothing else changes */
    }
  });
}

module.exports = { declineConsent };
