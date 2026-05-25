import { Page, test as base } from '@playwright/test';

/**
 * Seed the Zustand `idrip-user` store as if the OAuth flow had completed.
 * Use this before navigating to any protected route.
 */
export async function seedAuthenticatedUser(page: Page) {
  const userState = {
    state: {
      user: {
        id: 'test-user-id',
        name: 'Test User',
        email: 'test@idrip.local',
        stylePreferences: [],
        budget: { monthlyBudget: 150, spent: 0, currency: 'USD' },
        createdAt: new Date().toISOString(),
      },
      token: 'fake-jwt-token',
      isAuthenticated: true,
    },
    version: 0,
  };

  await page.addInitScript((s) => {
    window.localStorage.setItem('idrip-user', s);
    window.localStorage.setItem('idrip-token', 'fake-jwt-token');
  }, JSON.stringify(userState));
}

/**
 * Install API route mocks that satisfy the most common reads from a freshly-loaded
 * authenticated page. Tests can override individual routes with page.route().
 */
export async function mockBackendDefaults(page: Page, opts: {
  wardrobeItems?: unknown[];
  outfits?: unknown[];
  recommendations?: unknown[];
  subscriptionTier?: 'free' | 'pro' | 'lifetime';
  generationsUsedThisMonth?: number;
} = {}) {
  const items = opts.wardrobeItems ?? [];
  const outfits = opts.outfits ?? [];
  const recs = opts.recommendations ?? [];
  const tier = opts.subscriptionTier ?? 'free';
  const generationsUsed = opts.generationsUsedThisMonth ?? 0;

  await page.route(/\/api\/wardrobe(\?.*)?$/, (route) =>
    route.fulfill({ status: 200, body: JSON.stringify({ items, count: items.length }) })
  );
  await page.route(/\/api\/outfits(\?.*)?$/, (route) =>
    route.fulfill({ status: 200, body: JSON.stringify({ outfits, count: outfits.length }) })
  );
  await page.route(/\/api\/recommendations/, (route) =>
    route.fulfill({ status: 200, body: JSON.stringify({ recommendations: recs, count: recs.length }) })
  );
  await page.route(/\/api\/users\/me/, (route) =>
    route.fulfill({
      status: 200,
      body: JSON.stringify({
        id: 'test-user-id',
        name: 'Test User',
        email: 'test@idrip.local',
        preferences: { styles: [], favoriteColors: [], budgetMin: 0, budgetMax: 200, sizes: { top: 'M', bottom: 'M', shoes: '42' } },
      }),
    })
  );
  await page.route(/\/api\/subscriptions\/current/, (route) =>
    route.fulfill({
      status: 200,
      body: JSON.stringify({
        tier,
        status: 'active',
        expiry: null,
        generationsUsedThisMonth: generationsUsed,
        generationsRemaining: tier === 'free' ? Math.max(0, 5 - generationsUsed) : -1,
      }),
    })
  );
  await page.route(/\/api\/subscriptions\/plans/, (route) =>
    route.fulfill({
      status: 200,
      body: JSON.stringify({
        plans: [
          { id: 'free', name: 'Free', price: 0, stripePriceId: null, features: ['20 items'], highlighted: false },
          { id: 'pro_monthly', name: 'Pro', price: 9.99, stripePriceId: 'price_pro_monthly', features: ['Unlimited'], highlighted: true },
          { id: 'lifetime', name: 'Lifetime', price: 199, stripePriceId: 'price_lifetime', features: ['Forever'], highlighted: false },
        ],
      }),
    })
  );
}

export const test = base;
