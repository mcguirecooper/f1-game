import { test, expect } from '@playwright/test';

test.describe('F1 Game dashboard', () => {
  test('loads the dashboard shell and primary navigation', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle('F1 Game 2026 — Fantasy League');
    await expect(page.getByRole('heading', { name: /F1 Game 2026/ })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Leaderboard' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'My pick' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Scoring system' })).toBeVisible();
  });

  test('validates an invalid login email without sending a request', async ({ page }) => {
    await page.goto('/#my-pick');
    await page.getByRole('button', { name: /Email me a link|Log in/ }).click();
    await expect(page.locator('#login-error')).toHaveText('Enter a valid email address.');
  });
});

test.describe('Authenticated dashboard', () => {
  test.skip(!process.env.E2E_STORAGE_STATE, 'Provide E2E_STORAGE_STATE for an authenticated Supabase session.');

  test('shows the authenticated pick area', async ({ page }) => {
    await page.goto('/#my-pick');
    await expect(page.getByRole('heading', { name: 'My pick' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'My pick history' })).toBeVisible();
  });

  test('shows the admin control room for an admin profile', async ({ page }) => {
    await page.goto('/#admin-panel');
    await expect(page.getByRole('heading', { name: 'Admin control room' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'League members' })).toBeVisible();
  });
});
