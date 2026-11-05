'use strict';
const { test, expect } = require('./fixtures');

// «מציג N מתוך M» - read as numbers so the tests survive library additions.
function shownCount(text) {
  const m = /מציג (\d+) מתוך (\d+)/.exec(text || '');
  return m ? { shown: Number(m[1]), total: Number(m[2]) } : { shown: NaN, total: NaN };
}

test.describe('reel exercise library (exercises.html)', () => {
  test('search, filter, build and save a workout, then open it in the weekly builder', async ({ page }) => {
    await page.goto('/exercises.html');
    const counter = page.getByText(/^מציג \d+ מתוך \d+$/);
    await expect(counter).toBeVisible();
    const all = shownCount(await counter.textContent());
    expect(all.shown).toBe(all.total);

    await page.getByRole('searchbox', { name: 'חיפוש' }).fill('פלאנק');
    await expect.poll(async () => shownCount(await counter.textContent()).shown).toBeLessThan(all.total);
    const searched = shownCount(await counter.textContent()).shown;

    const filter = page.getByRole('group', { name: 'סינון לפי קבוצת שרירים' })
      .getByRole('button', { name: 'ליבה', exact: true });
    await filter.click();
    await expect(filter).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(async () => shownCount(await counter.textContent()).shown).toBeLessThanOrEqual(searched);

    const cards = page.getByRole('region', { name: 'כרטיסי תרגילים' }).getByRole('article');
    await expect(cards.first()).toBeVisible();
    const shown = shownCount(await counter.textContent()).shown;
    expect(shown).toBeGreaterThanOrEqual(2);
    await expect(cards).toHaveCount(shown);

    await cards.nth(0).getByRole('button', { name: 'הוסף לאימון' }).click();
    await cards.nth(1).getByRole('button', { name: 'הוסף לאימון' }).click();

    const builder = page.getByRole('complementary', { name: 'בניית אימון' });
    await expect(builder.getByRole('button', { name: /בניית אימון 2/ })).toBeVisible();
    await builder.getByRole('textbox', { name: 'שם האימון' }).fill('ליבה בדיקה');
    await builder.getByRole('button', { name: 'שמור אימון' }).click();
    await expect(builder.getByRole('status').filter({ hasText: 'נשמר' })).toContainText('«ליבה בדיקה» נשמר');
    await expect(builder.getByRole('button', { name: 'מחק את ליבה בדיקה' })).toBeVisible();

    await builder.getByRole('button', { name: 'הצג בבונה השבועי' }).click();
    await expect(page).toHaveURL(/\/weekly\.html#reel-plan$/);
    await expect(page.getByRole('heading', { name: 'אימונים שנשמרו מספריית התרגילים' })).toBeVisible();
    const plan = page.getByRole('region', { name: 'תוצאת תוכנית שבועית' });
    await expect(plan).toContainText('2 תרגילים באימון');
    await expect(plan.getByRole('button', { name: /^התחל אימון 1.* במצב אימון חי$/ })).toBeVisible();
  });

  test('reel cards link out to Instagram without loading it', async ({ page, externalRequests }) => {
    await page.goto('/exercises.html');
    const link = page.getByRole('region', { name: 'כרטיסי תרגילים' })
      .getByRole('link', { name: 'צפייה בריל' }).first();
    await expect(link).toHaveAttribute('href', /^https:\/\/www\.instagram\.com\/(reel|p)\//);
    expect(externalRequests.filter((h) => h.endsWith('instagram.com'))).toEqual([]);
  });
});
