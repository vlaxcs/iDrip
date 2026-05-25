import { describe, expect, it, vi, beforeEach } from 'vitest';
import request from 'supertest';

const customersCreate = vi.hoisted(() => vi.fn());
const sessionsCreate = vi.hoisted(() => vi.fn());

vi.mock('../../src/lib/stripe', () => ({
  default: () => ({
    customers: { create: customersCreate },
    checkout: { sessions: { create: sessionsCreate } },
  }),
  isStripeConfigured: () => true,
  getTierFromPriceId: () => 'pro',
  PRICE_IDS: { pro_monthly: 'price_pro_monthly', pro_yearly: 'price_pro_yearly', lifetime: 'price_lifetime' },
}));

import { createApp } from '../../src/app';
import User from '../../src/models/User';
import { authHeader, createTestUser } from '../helpers';

describe('POST /api/subscriptions/create-checkout-session', () => {
  const app = createApp();

  beforeEach(() => {
    customersCreate.mockReset();
    sessionsCreate.mockReset();
    sessionsCreate.mockResolvedValue({ id: 'cs_test_123', url: 'https://stripe/checkout/cs_test_123' });
  });

  it('returns 400 when priceId is missing', async () => {
    const user = await createTestUser();
    const res = await request(app)
      .post('/api/subscriptions/create-checkout-session')
      .set(authHeader(user))
      .send({});
    expect(res.status).toBe(400);
  });

  it('creates a Stripe customer on first call and persists the id', async () => {
    customersCreate.mockResolvedValueOnce({ id: 'cus_new' });

    const user = await createTestUser({ subscriptionTier: 'free' });
    expect(user.stripeCustomerId).toBe('');

    const res = await request(app)
      .post('/api/subscriptions/create-checkout-session')
      .set(authHeader(user))
      .send({ priceId: 'price_pro_monthly' });

    expect(res.status).toBe(200);
    expect(res.body.url).toContain('stripe');
    expect(customersCreate).toHaveBeenCalledOnce();

    const refreshed = await User.findById(user._id);
    expect(refreshed!.stripeCustomerId).toBe('cus_new');
  });

  it('reuses an existing Stripe customer id (no second create call)', async () => {
    const user = await createTestUser({ stripeCustomerId: 'cus_existing' });

    await request(app)
      .post('/api/subscriptions/create-checkout-session')
      .set(authHeader(user))
      .send({ priceId: 'price_pro_monthly' });

    expect(customersCreate).not.toHaveBeenCalled();
    expect(sessionsCreate).toHaveBeenCalledOnce();
  });
});
