'use strict';
const { test, expect } = require('./fixtures');

// [path, the nav item for the current page, which is text rather than a link]
const PAGES = [
  ['/index.html', 'בנה אימון'],
  ['/weekly.html', 'בונה שבועי'],
  ['/library.html', 'ספריית סרטונים'],
  ['/exercises.html', 'ספריית תרגילים'],
  ['/journal.html', 'יומן ביצוע'],
  ['/booklet.html', 'חוברת הקורס'],
  ['/offer.html', 'הצעה למאמנים'],
  ['/frontend/', 'טקסט לכרטיסייה'],
];

test.describe('main pages', () => {
  for (const [path, current] of PAGES) {
    test(`${path} loads as Hebrew RTL with the main nav`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
      await expect(page.locator('html')).toHaveAttribute('lang', 'he');
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
      const nav = page.getByRole('navigation', { name: 'ניווט ראשי' });
      await expect(nav).toBeVisible();
      await expect(nav.getByRole('link', { name: current, exact: true })).toHaveCount(0);
    });
  }
});

test('video library search narrows the clip list (library.html)', async ({ page }) => {
  await page.goto('/library.html');
  const search = page.getByRole('search', { name: 'סינון תרגילים בספרייה' });
  await expect(search).toBeVisible();
  await search.getByRole('searchbox', { name: 'חיפוש תרגיל לפי שם או מילת מפתח' }).fill('פלאנק');
  await search.getByRole('combobox', { name: 'סינון לפי קבוצת שרירים' }).selectOption({ label: 'ליבה' });
  await expect(page.locator('main')).toContainText('פלאנק');
});
