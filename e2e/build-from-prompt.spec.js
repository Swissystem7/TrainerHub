'use strict';
const { test, expect } = require('./fixtures');

test.describe('build a workout from a prompt (index.html)', () => {
  test('example prompt builds a workout and runs it in workout mode', async ({ page }) => {
    await page.goto('/index.html');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    await page.getByRole('button', { name: 'מלא דוגמה: אימון בטן 20 דקות בלי ציוד' }).click();
    await expect(page.getByRole('textbox', { name: 'מה האימון?' })).toHaveValue('אימון בטן 20 דקות בלי ציוד');
    await expect(page.getByRole('spinbutton', { name: 'זמן (דקות)' })).toHaveValue('20');

    await page.getByRole('button', { name: 'בנה אימון מהמאגר לפי ההגדרות' }).click();

    const result = page.getByRole('region', { name: 'תוצאת אימון' });
    await expect(result.getByRole('heading', { level: 2 }).first()).toContainText('20 דקות');
    await expect(result.getByRole('heading', { name: 'עיקר', level: 3 })).toBeVisible();
    await expect(result.getByRole('region', { name: 'הנחות האימון ומקורותיהן' })).toBeVisible();
    const actions = result.getByRole('toolbar', { name: 'פעולות אימון' });
    await expect(actions.getByRole('button', { name: 'פתח קישור אימון לתצוגת מתאמן' })).toBeVisible();

    await actions.getByRole('button', { name: 'התחל אימון במצב חי' }).click();
    await expect(page).toHaveURL(/\/frontend\/workout-mode\.html$/);

    const progress = page.getByRole('region', { name: 'התקדמות באימון' });
    await expect(progress).toContainText(/תרגיל 1 מתוך \d+/);
    await expect(page.getByRole('timer', { name: 'שעון תרגיל' })).toBeVisible();

    const controls = page.getByRole('toolbar', { name: 'פקדי אימון' });
    await controls.getByRole('button', { name: 'סיימתי' }).click();
    await expect(progress).toContainText(/תרגיל 2 מתוך \d+/);
    await controls.getByRole('button', { name: 'חזור לתרגיל הקודם' }).click();
    await expect(progress).toContainText(/תרגיל 1 מתוך \d+/);
  });

  test('explicit fields build a group workout', async ({ page }) => {
    await page.goto('/index.html');
    await page.getByRole('textbox', { name: 'מה האימון?' }).fill('אימון רגליים');
    await page.getByRole('spinbutton', { name: 'זמן (דקות)' }).fill('30');
    await page.getByRole('spinbutton', { name: 'כמות חניכים' }).fill('12');
    await page.getByRole('button', { name: 'בנה אימון מהמאגר לפי ההגדרות' }).click();

    const result = page.getByRole('region', { name: 'תוצאת אימון' });
    await expect(result.getByRole('heading', { level: 2 }).first()).toContainText('30 דקות');
    await expect(result).toContainText('חניכים: 12');
    await expect(result.getByRole('toolbar', { name: 'פעולות אימון' })).toBeVisible();
  });
});
test.describe.skip(() => {
});
