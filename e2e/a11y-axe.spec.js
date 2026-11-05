// axe-core accessibility pass over every page (both projects: desktop and mobile-360).
// Fails only on serious/critical WCAG 2 A/AA violations, so moderate findings stay visible in the report
// without blocking. Builds on the shared offline fixture from CT-014.
'use strict';
const AxeBuilder = require('@axe-core/playwright').default;
const { test, expect } = require('./fixtures');

const PAGES = ['/index.html', '/library.html', '/exercises.html', '/weekly.html', '/journal.html',
  '/booklet.html', '/site-scan.html', '/scan.html', '/manage.html', '/workout-print.html'];

test.describe.configure({ timeout: 90_000 });

for (const path of PAGES) {
  test(`axe: ${path} has no serious or critical violations`, async ({ page }, info) => {
    await page.goto(path);
    await page.waitForLoadState('networkidle');
    let axe = new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']);
    // The exercise grid renders every catalog card (~4.5k nodes, ~2 min of axe). The cards share one
    // template, so the first 20 stand for the rest.
    if (path === '/exercises.html') axe = axe.exclude('#grid > :nth-child(n+21)');
    const res = await axe.analyze();
    await info.attach('axe.json', { body: JSON.stringify(res.violations, null, 2), contentType: 'application/json' });
    const blocking = res.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
      .map((v) => `${v.id} (${v.impact}) ×${v.nodes.length}: ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`);
    expect(blocking, blocking.join('\n')).toEqual([]);
  });
}
