import { describe, expect, it, vi, beforeEach } from 'vitest';
import request from 'supertest';

// Hoisted mock holder so the factory and tests share the same vi.fn()
const constructEvent = vi.hoisted(() => vi.fn());

vi.mock('../../src/lib/stripe', () => ({
  default: () => ({ webhooks: { constructEvent } }),
  getTierFromPriceId: (priceId: string) => (priceId === 'price_lifetime' ? 'lifetime' : 'pro'),
  isStripeConfigured: () => true,
  PRICE_IDS: {
    pro_monthly: 'price_pro_monthly',
    pro_yearly: 'price_pro_yearly',
    lifetime: 'price_lifetime',
  },
}));

import { createApp } from '../../src/app';
import User from '../../src/models/User';
import { createTestUser } from '../helpers';

describe('POST /api/subscriptions/webhook', () => {
  const app = createApp();

  beforeEach(() => {
    constructEvent.mockReset();
  });

  it('returns 400 on invalid signature', async () => {
    constructEvent.mockImplementation(() => {
      throw new Error('No signature');
    });

    const res = await request(app)
      .post('/api/subscriptions/webhook')
      .set('stripe-signature', 'bogus')
      .send(Buffer.from('{}'));

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/signature/i);
  });

  it('upgrades user to lifetime on checkout.session.completed (mode=payment)', async () => {
    const user = await createTestUser({ subscriptionTier: 'free' });

    constructEvent.mockReturnValue({
      type: 'checkout.session.completed',
      data: {
        object: {
          metadata: { userId: user._id.toString() },
          customer: 'cus_123',
          subscription: null,
          mode: 'payment',
        },
      },
    });

    const res = await request(app)
      .post('/api/subscriptions/webhook')
      .set('stripe-signature', 'sig')
      .send(Buffer.from('{}'));

    expect(res.status).toBe(200);
    // Handler responds early then processes; wait a tick for the DB write
    await new Promise((r) => setTimeout(r, 50));

    const refreshed = await User.findById(user._id);
    expect(refreshed!.subscriptionTier).toBe('lifetime');
    expect(refreshed!.stripeCustomerId).toBe('cus_123');
  });

  it('downgrades user to free on customer.subscription.deleted', async () => {
    const user = await createTestUser({
      subscriptionTier: 'pro',
      stripeCustomerId: 'cus_999',
      stripeSubscriptionId: 'sub_999',
    });

    constructEvent.mockReturnValue({
      type: 'customer.subscription.deleted',
      data: { object: { customer: 'cus_999', id: 'sub_999' } },
    });

    const res = await request(app)
      .post('/api/subscriptions/webhook')
      .set('stripe-signature', 'sig')
      .send(Buffer.from('{}'));

    expect(res.status).toBe(200);
    await new Promise((r) => setTimeout(r, 50));

    const refreshed = await User.findById(user._id);
    expect(refreshed!.subscriptionTier).toBe('free');
    expect(refreshed!.stripeSubscriptionId).toBe('');
    expect(refreshed!.subscriptionStatus).toBe('canceled');
  });
});
