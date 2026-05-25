import { test, expect } from '@playwright/test';
import { seedAuthenticatedUser, mockBackendDefaults } from './fixtures';

test.describe('Authentication', () => {
  test('login page renders with the Google sign-in button', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('button', { name: /google/i })).toBeVisible();
  });

  test('unauthenticated visit to a protected route redirects to /login', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('OAuth error param surfaces a toast on the login page', async ({ page }) => {
    await page.goto('/login?error=auth_failed');
    // Toast text comes from the LoginPage's mapped messages; "sign in" or similar
    await expect(page.getByText(/sign.*in|auth.*fail|try again/i).first()).toBeVisible({ timeout: 3000 });
  });

  test('/auth/callback with a token persists auth and lands the user on the dashboard', async ({ page }) => {
    await mockBackendDefaults(page);
    await page.goto('/auth/callback?token=fake-jwt-token');
    await expect(page).toHaveURL(/\/$|\/wardrobe/, { timeout: 5000 });

    // Token persisted to localStorage
    const stored = await page.evaluate(() => window.localStorage.getItem('idrip-token'));
    expect(stored).toBe('fake-jwt-token');
  });

  test('authenticated user reaches the dashboard without redirect', async ({ page }) => {
    await seedAuthenticatedUser(page);
    await mockBackendDefaults(page);
    await page.goto('/');
    await expect(page).not.toHaveURL(/\/login/);
  });
});
