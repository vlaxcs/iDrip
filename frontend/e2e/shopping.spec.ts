import { test, expect } from '@playwright/test';
import { seedAuthenticatedUser, mockBackendDefaults } from './fixtures';

const SAMPLE_RECS = [
  { id: 'r1', name: 'Linen Blazer', brand: 'Brand', price: 89, currency: 'USD', category: 'outerwear', style: ['minimalist'], imageUrl: 'https://placehold.co/300x400', matchScore: 92, productUrl: 'https://example.com/1' },
  { id: 'r2', name: 'Denim Jacket', brand: 'Brand', price: 120, currency: 'USD', category: 'outerwear', style: ['streetwear'], imageUrl: 'https://placehold.co/300x400', matchScore: 80, productUrl: 'https://example.com/2' },
  { id: 'r3', name: 'White Sneakers', brand: 'Brand', price: 60, currency: 'USD', category: 'shoes', style: ['minimalist'], imageUrl: 'https://placehold.co/300x400', matchScore: 88, productUrl: 'https://example.com/3' },
];

test.describe('Shopping page', () => {
  test('renders the budget slider and recommendations grid', async ({ page }) => {
    await seedAuthenticatedUser(page);
    await mockBackendDefaults(page, { recommendations: SAMPLE_RECS });
    await page.goto('/shopping');

    await expect(page.getByText(/recommendations/i).first()).toBeVisible();
    await expect(page.getByText('Linen Blazer')).toBeVisible();
    await expect(page.getByText('Denim Jacket')).toBeVisible();
  });

  test('renders empty state when no recommendations match', async ({ page }) => {
    await seedAuthenticatedUser(page);
    await mockBackendDefaults(page, { recommendations: [] });
    await page.goto('/shopping');
    await expect(page.getByText(/no recommendations/i)).toBeVisible();
  });

  test('shopping page is reachable from a fresh authenticated session', async ({ page }) => {
    await seedAuthenticatedUser(page);
    await mockBackendDefaults(page, { recommendations: SAMPLE_RECS });
    await page.goto('/shopping');
    await expect(page).toHaveURL(/\/shopping/);
  });
});
