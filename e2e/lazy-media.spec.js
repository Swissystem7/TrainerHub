'use strict';
const { test, expect } = require('./fixtures');

// CT-015: library clips are only fetched once their card nears the viewport.
test('video library defers offscreen clips until they are scrolled to (library.html)', async ({ page }) => {
  await page.goto('/library.html');
  const videos = page.locator('main video');
  await expect.poll(() => videos.count()).toBeGreaterThan(10);

  const counts = () => page.evaluate(() => ({
    loaded: document.querySelectorAll('main video[src]').length,
    parked: document.querySelectorAll('main video[data-th-src]').length,
  }));
  await expect.poll(async () => (await counts()).loaded).toBeGreaterThan(0);
  const before = await counts();
  expect(before.parked).toBeGreaterThan(0);

  const last = videos.last();
  await expect(last).toHaveAttribute('data-th-src', /\.mp4$/);
  await last.locator('xpath=..').scrollIntoViewIfNeeded();
  await expect(last).toHaveAttribute('src', /\.mp4$/);
  await expect(last).not.toHaveAttribute('data-th-src', /./);
  expect((await counts()).loaded).toBeGreaterThan(before.loaded);
});
