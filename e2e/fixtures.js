// Shared Playwright fixture for the TrainerHub E2E tests (CT-014).
// Every request that leaves the local static server is stubbed, so the tests are
// deterministic and offline: Sentry CDN, Google Fonts, GitHub release videos,
// YouTube / Google Drive / Instagram embeds and posters all get a canned reply.
'use strict';
const base = require('@playwright/test');

const TRANSPARENT_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64'
);

function isLocal(url) {
  const { hostname } = new URL(url);
  return hostname === '127.0.0.1' || hostname === 'localhost';
}

const test = base.test.extend({
  // Hostnames the page tried to reach (all stubbed), for assertions and debugging.
  externalRequests: async ({}, use) => { await use([]); },

  page: async ({ page, externalRequests }, use) => {
    const pageErrors = [];
    page.on('pageerror', (err) => pageErrors.push(err.message));
    await page.route((url) => !isLocal(url.href), (route) => {
      const req = route.request();
      externalRequests.push(new URL(req.url()).hostname);
      switch (req.resourceType()) {
        case 'image':
          return route.fulfill({ status: 200, contentType: 'image/png', body: TRANSPARENT_PNG });
        case 'script':
          return route.fulfill({ status: 200, contentType: 'text/javascript', body: '/* stubbed in e2e */' });
        case 'stylesheet':
          return route.fulfill({ status: 200, contentType: 'text/css', body: '' });
        case 'document':
          return route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>stub</title>' });
        default:
          // Media (release videos), fonts, fetch/XHR: behave like being offline.
          return route.abort('internetdisconnected');
      }
    });
    await use(page);
    base.expect(pageErrors, 'uncaught page errors').toEqual([]);
  },
});

module.exports = { test, expect: base.expect };
