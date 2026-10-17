import { test, expect } from '@playwright/test';

test.describe('F1 Game dashboard', () => {
  test('loads the dashboard shell and primary navigation', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle('F1 Game 2026 — Fantasy League');
    await expect(page.getByText('F1 GAME 2026', { exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Leaderboard' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'My pick' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Your next race decision' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Scoring system' })).toBeVisible();
  });

  test('keeps the admin control room hidden until an authenticated admin session exists', async ({ page }) => {
    await page.goto('/#admin-panel');
    await expect(page.locator('#admin-panel')).toBeHidden();
  });

  test('validates an invalid login email without sending a request', async ({ page }) => {
    await page.goto('/#my-pick');
    await page.getByRole('button', { name: 'Log in' }).click();
    await page.locator('#login-email').fill('not-an-email');
    await page.locator('#login-dialog #login-btn').click();
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
    await expect(page.getByRole('heading', { name: 'Automated result candidates' })).toBeVisible();
    await expect(page.getByText(/hourly importer queues official results/i)).toBeVisible();
  });
});
