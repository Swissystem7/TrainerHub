'use strict';
const { test, expect } = require('./fixtures');

test('weekly builder makes one workout per training day and starts one (weekly.html)', async ({ page }) => {
  await page.goto('/weekly.html');
  const prefs = page.getByRole('region', { name: 'העדפות מתאמן' });
  await prefs.getByRole('combobox', { name: 'קבוצת שרירים מרכזית' }).selectOption({ label: 'ליבה' });
  await prefs.getByRole('combobox', { name: 'מטרה' }).selectOption({ label: 'סיבולת' });
  await prefs.getByRole('spinbutton', { name: 'ימי אימון בשבוע' }).fill('2');
  await prefs.getByRole('button', { name: 'בנה תוכנית אימונים שבועית מהמאגר' }).click();

  const plan = page.getByRole('region', { name: 'תוצאת תוכנית שבועית' });
  await expect(plan).toContainText('2 אימונים');
  await expect(plan.getByRole('heading', { name: /^אימון 1/, level: 3 })).toBeVisible();
  await expect(plan.getByRole('heading', { name: /^אימון 2/, level: 3 })).toBeVisible();
  await expect(plan.getByRole('heading', { name: /^אימון 3/ })).toHaveCount(0);
  // Endurance goal rests 45 s between sets (README).
  await expect(plan).toContainText('מנוחה 45 שנ׳');

  // Every exercise row offers substitutes from the same library.
  const swap = plan.getByRole('combobox', { name: /^החלף / }).nth(1);
  expect((await swap.locator('option').allTextContents()).length).toBeGreaterThan(1);

  await plan.getByRole('button', { name: /^התחל אימון 1.* במצב אימון חי$/ }).click();
  await expect(page).toHaveURL(/\/frontend\/workout-mode\.html/);
  await expect(page.getByRole('region', { name: 'התקדמות באימון' })).toContainText(/תרגיל 1 מתוך \d+/);
});
