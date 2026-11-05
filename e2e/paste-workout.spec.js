'use strict';
const { test, expect } = require('./fixtures');

test.describe('paste an existing workout (index.html)', () => {
  test('pasted text is split into exercises with sets and rest', async ({ page }) => {
    await page.goto('/index.html');
    const tab = page.getByRole('tab', { name: 'הדבקת אימון קיים' });
    await tab.click();
    await expect(tab).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tabpanel', { name: 'הדבקת אימון קיים' })).toBeVisible();

    await page.getByRole('textbox', { name: 'הדביקו אימון בעברית' })
      .fill('3 סבבים: 40 שניות פלאנק, 15 שכיבות שמיכה, 20 מטפס הרים, דקה מנוחה');
    await page.getByRole('button', { name: 'פרק את הטקסט המודבק לתרגילים' }).click();

    const result = page.getByRole('region', { name: 'תוצאת אימון' });
    await expect(result.getByRole('heading', { name: 'אימון שנקלט', level: 2 })).toBeVisible();
    await expect(result).toContainText('פלאנק 3 × 40 שנ׳');
    await expect(result).toContainText('שכיבות שמיכה 3 × 15');
    await expect(result).toContainText('מטפס הרים 3 × 20');
    await expect(result.getByRole('toolbar', { name: 'פעולות אימון' })
      .getByRole('button', { name: 'התחל אימון במצב חי' })).toBeEnabled();
  });

  test('an empty paste shows a hint instead of a workout', async ({ page }) => {
    await page.goto('/index.html');
    await page.getByRole('tab', { name: 'הדבקת אימון קיים' }).click();
    await page.getByRole('button', { name: 'פרק את הטקסט המודבק לתרגילים' }).click();
    await expect(page.getByRole('region', { name: 'תוצאת אימון' }).getByRole('status')).toContainText('הדביקו אימון');
  });
});
