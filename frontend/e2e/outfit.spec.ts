import { test, expect } from '@playwright/test';
import { seedAuthenticatedUser, mockBackendDefaults } from './fixtures';

const FULL_WARDROBE = [
  { _id: '1', id: '1', userId: 'test-user-id', name: 'White Tee', category: 'tops', primaryColor: '#fff', tags: [], season: ['all'], imageUrl: 'https://placehold.co/300x400' },
  { _id: '2', id: '2', userId: 'test-user-id', name: 'Blue Jeans', category: 'bottoms', primaryColor: '#1e3a8a', tags: [], season: ['all'], imageUrl: 'https://placehold.co/300x400' },
  { _id: '3', id: '3', userId: 'test-user-id', name: 'Sneakers', category: 'shoes', primaryColor: '#fff', tags: [], season: ['all'], imageUrl: 'https://placehold.co/300x400' },
];

const TOPS_ONLY = [FULL_WARDROBE[0]];

test.describe('Outfit generator', () => {
  test('renders Builder and Saved tabs', async ({ page }) => {
    await seedAuthenticatedUser(page);
    await mockBackendDefaults(page, { wardrobeItems: FULL_WARDROBE });
    await page.goto('/generator');

    await expect(page.getByRole('button', { name: /^Builder$/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Saved/ })).toBeVisible();
  });

  test('Generate button is disabled when wardrobe is missing required categories', async ({ page }) => {
    await seedAuthenticatedUser(page);
    await mockBackendDefaults(page, { wardrobeItems: TOPS_ONLY });
    await page.goto('/generator');

    const generate = page.getByRole('button', { name: /generate/i }).first();
    await expect(generate).toBeDisabled();
  });

  test('Generate button is enabled with top + bottom + shoes', async ({ page }) => {
    await seedAuthenticatedUser(page);
    await mockBackendDefaults(page, { wardrobeItems: FULL_WARDROBE });
    await page.goto('/generator');

    const generate = page.getByRole('button', { name: /generate/i }).first();
    await expect(generate).toBeEnabled();
  });

  test('Saved tab shows the saved outfit count', async ({ page }) => {
    await seedAuthenticatedUser(page);
    await mockBackendDefaults(page, {
      wardrobeItems: FULL_WARDROBE,
      outfits: [
        {
          _id: 'o1', id: 'o1', userId: 'test-user-id', name: 'Classic Casual',
          items: FULL_WARDROBE, occasion: 'casual', score: 88, savedByUser: true,
          aiReasoning: 'Clean and balanced.', createdAt: new Date().toISOString(),
        },
      ],
    });
    await page.goto('/generator');

    await expect(page.getByRole('button', { name: /Saved \(1\)/ })).toBeVisible();
  });
});
