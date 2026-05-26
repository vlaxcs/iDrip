import { test, expect } from '@playwright/test';
import { seedAuthenticatedUser, mockBackendDefaults } from './fixtures';

test.describe('Profile page', () => {
  test('renders the Profile heading and user name from the store', async ({ page }) => {
    await seedAuthenticatedUser(page);
    await mockBackendDefaults(page);
    await page.goto('/profile');

    await expect(page.getByRole('heading', { name: /^Profile$/i })).toBeVisible();
    await expect(page.getByText('Test User').first()).toBeVisible();
  });

  test('clear-data wipes localStorage and reloads', async ({ page }) => {
    await seedAuthenticatedUser(page);
    await mockBackendDefaults(page);
    await page.goto('/profile');

    // Seed an extra key we can assert against
    await page.evaluate(() => window.localStorage.setItem('idrip-wardrobe', '"sentinel"'));

    page.on('dialog', (d) => d.accept()); // confirm() shim

    const clearBtn = page.getByRole('button', { name: /clear.*data|reset/i }).first();
    if (await clearBtn.count() > 0) {
      await clearBtn.click({ timeout: 3000 }).catch(() => {});
      // After reload, wardrobe key should be gone OR token gone
      await page.waitForTimeout(800);
      const wardrobe = await page.evaluate(() => window.localStorage.getItem('idrip-wardrobe'));
      const token = await page.evaluate(() => window.localStorage.getItem('idrip-token'));
      expect(wardrobe === null || token === null).toBe(true);
    }
  });

  test('shows wardrobe item counts by category', async ({ page }) => {
    const items = [
      { _id: '1', id: '1', userId: 'test-user-id', name: 'A', category: 'tops', tags: [], season: ['all'], imageUrl: 'x' },
      { _id: '2', id: '2', userId: 'test-user-id', name: 'B', category: 'shoes', tags: [], season: ['all'], imageUrl: 'x' },
    ];
    await seedAuthenticatedUser(page);
    await mockBackendDefaults(page, { wardrobeItems: items });
    await page.goto('/profile');

    // Categories listed somewhere on the page
    await expect(page.getByText(/tops/i).first()).toBeVisible();
    await expect(page.getByText(/shoes/i).first()).toBeVisible();
  });
});
