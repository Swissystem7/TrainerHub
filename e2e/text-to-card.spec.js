'use strict';
const { test, expect } = require('./fixtures');

test('free text becomes a workout card that can be saved and run (frontend/)', async ({ page }) => {
  await page.goto('/frontend/');
  const input = page.getByRole('textbox', { name: 'תיאור אימון' });
  await page.getByRole('button', { name: 'טען דוגמה: אימון כוח' }).click();
  await expect(input).toHaveValue(/אימון כוח/);

  await page.getByRole('button', { name: 'המר תיאור אימון לכרטיסייה' }).click();
  const card = page.getByRole('region', { name: 'כרטיסיית אימון' });
  await expect(card).toContainText('פענוח מקומי (בלי AI)');
  await expect(card).toContainText('חתירה עם מוט');
  const actions = card.getByRole('toolbar', { name: 'פעולות כרטיסיית אימון' });
  await expect(actions.getByRole('button', { name: 'התחל אימון במצב חי' })).toBeVisible();

  await actions.getByRole('button', { name: 'שמור אימון במאגר המקומי בדפדפן' }).click();
  const saved = page.getByRole('region', { name: 'אימונים שמורים בדפדפן' });
  await expect(saved).not.toContainText('עדיין אין אימונים שמורים');

  await actions.getByRole('button', { name: 'התחל אימון במצב חי' }).click();
  await expect(page).toHaveURL(/\/frontend\/workout-mode\.html/);
  await expect(page.getByRole('region', { name: 'התקדמות באימון' })).toContainText(/תרגיל 1 מתוך \d+/);
});
