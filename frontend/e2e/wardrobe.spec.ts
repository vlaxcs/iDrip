import { test, expect } from '@playwright/test';
import { seedAuthenticatedUser, mockBackendDefaults } from './fixtures';

const SAMPLE_ITEMS = [
  { _id: '1', id: '1', userId: 'test-user-id', name: 'White Tee', category: 'tops', primaryColor: '#fff', tags: [], season: ['all'], imageUrl: 'https://placehold.co/300x400' },
  { _id: '2', id: '2', userId: 'test-user-id', name: 'Blue Jeans', category: 'bottoms', primaryColor: '#1e3a8a', tags: [], season: ['all'], imageUrl: 'https://placehold.co/300x400' },
  { _id: '3', id: '3', userId: 'test-user-id', name: 'Sneakers', category: 'shoes', primaryColor: '#fff', tags: [], season: ['all'], imageUrl: 'https://placehold.co/300x400' },
];

test.describe('Wardrobe page', () => {
  test('shows empty state when wardrobe has no items', async ({ page }) => {
    await seedAuthenticatedUser(page);
    await mockBackendDefaults(page, { wardrobeItems: [] });
    await page.goto('/wardrobe');
    await expect(page.getByText(/wardrobe is empty/i)).toBeVisible();
  });

  test('renders items when API returns wardrobe data', async ({ page }) => {
    await seedAuthenticatedUser(page);
    await mockBackendDefaults(page, { wardrobeItems: SAMPLE_ITEMS });
    await page.goto('/wardrobe');
    await expect(page.getByText('White Tee')).toBeVisible();
    await expect(page.getByText('Blue Jeans')).toBeVisible();
    await expect(page.getByText('Sneakers')).toBeVisible();
  });

  test('search input narrows the visible items', async ({ page }) => {
    await seedAuthenticatedUser(page);
    await mockBackendDefaults(page, { wardrobeItems: SAMPLE_ITEMS });
    await page.goto('/wardrobe');

    await page.getByPlaceholder(/search clothes/i).fill('jeans');
    await expect(page.getByText('Blue Jeans')).toBeVisible();
    await expect(page.getByText('White Tee')).not.toBeVisible();
  });

  test('category filter narrows by category', async ({ page }) => {
    await seedAuthenticatedUser(page);
    await mockBackendDefaults(page, { wardrobeItems: SAMPLE_ITEMS });
    await page.goto('/wardrobe');

    // Click the "Tops" category pill
    await page.getByRole('button', { name: /^tops$/i }).first().click();
    await expect(page.getByText('White Tee')).toBeVisible();
    await expect(page.getByText('Blue Jeans')).not.toBeVisible();
  });

  test('Add Item button opens the upload dialog', async ({ page }) => {
    await seedAuthenticatedUser(page);
    await mockBackendDefaults(page, { wardrobeItems: SAMPLE_ITEMS });
    await page.goto('/wardrobe');

    await page.getByRole('button', { name: /add item/i }).click();
    // ClothingUploadDialog uses a plain fixed overlay (no role=dialog) — assert on the heading instead
    await expect(page.getByRole('heading', { name: /add clothing items/i })).toBeVisible({ timeout: 3000 });
  });
});
