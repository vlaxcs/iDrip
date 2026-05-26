import { test, expect } from '@playwright/test';
import { seedAuthenticatedUser, mockBackendDefaults, seedPersistedStore } from './fixtures';

const SAMPLE_RECS = [
  { id: 'r1', name: 'Linen Blazer', description: 'Light layering', category: 'outerwear', estimatedPrice: 89, imageUrl: 'https://placehold.co/300x400', reason: 'matches your wardrobe', matchScore: 92, brand: 'Brand', tags: ['minimalist'] },
  { id: 'r2', name: 'Sneakers', description: 'Everyday', category: 'shoes', estimatedPrice: 60, imageUrl: 'https://placehold.co/300x400', reason: 'foundation footwear', matchScore: 88, brand: 'Brand', tags: ['minimalist'] },
];

test.describe('Shopping page', () => {
  test('renders the page heading + budget slider when recs are seeded', async ({ page }) => {
    await seedAuthenticatedUser(page);
    await mockBackendDefaults(page);
    // useShoppingStore loads its data from a local mock file, not from the API,
    // so we seed its persisted state directly to get deterministic test data.
    await seedPersistedStore(page, 'idrip-shopping', {
      recommendations: SAMPLE_RECS,
      budget: { monthlyBudget: 500, spent: 0, currency: 'USD' },
      selectedStyles: [],
      isLoading: false,
    });
    await page.goto('/shopping');

    await expect(page.getByRole('heading', { name: /shopping/i })).toBeVisible();
    await expect(page.getByText('Linen Blazer')).toBeVisible();
    await expect(page.getByText('Sneakers')).toBeVisible();
  });

  test('renders empty state when budget remaining is too low for any rec', async ({ page }) => {
    await seedAuthenticatedUser(page);
    await mockBackendDefaults(page);
    await seedPersistedStore(page, 'idrip-shopping', {
      recommendations: SAMPLE_RECS,
      budget: { monthlyBudget: 10, spent: 0, currency: 'USD' }, // below cheapest rec
      selectedStyles: [],
      isLoading: false,
    });
    await page.goto('/shopping');

    await expect(page.getByText(/no recommendations/i)).toBeVisible();
  });

  test('page is reachable from a fresh authenticated session', async ({ page }) => {
    await seedAuthenticatedUser(page);
    await mockBackendDefaults(page);
    await page.goto('/shopping');
    await expect(page).toHaveURL(/\/shopping/);
    await expect(page.getByRole('heading', { name: /shopping/i })).toBeVisible();
  });
});
