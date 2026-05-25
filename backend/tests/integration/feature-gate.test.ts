import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';

vi.mock('../../src/services/embeddingService', () => ({
  buildItemText: () => 'stub',
  generateEmbedding: vi.fn().mockResolvedValue([]),
}));

import { createApp } from '../../src/app';
import WardrobeItem from '../../src/models/WardrobeItem';
import { authHeader, createTestUser } from '../helpers';

describe('checkWardrobeLimit', () => {
  const app = createApp();

  it('allows free users under the 20-item limit', async () => {
    const user = await createTestUser({ subscriptionTier: 'free' });
    for (let i = 0; i < 19; i++) {
      await WardrobeItem.create({ userId: user._id, name: `item-${i}`, category: 'tops' });
    }

    const res = await request(app)
      .post('/api/wardrobe')
      .set(authHeader(user))
      .send({ name: 'item-20', category: 'tops' });

    expect(res.status).toBe(201);
  });

  it('blocks free users at the 20-item limit with WARDROBE_LIMIT_REACHED', async () => {
    const user = await createTestUser({ subscriptionTier: 'free' });
    for (let i = 0; i < 20; i++) {
      await WardrobeItem.create({ userId: user._id, name: `item-${i}`, category: 'tops' });
    }

    const res = await request(app)
      .post('/api/wardrobe')
      .set(authHeader(user))
      .send({ name: 'overflow', category: 'tops' });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('WARDROBE_LIMIT_REACHED');
    expect(res.body.limit).toBe(20);
  });

  it('does not block pro users above the 20-item limit', async () => {
    const user = await createTestUser({ subscriptionTier: 'pro' });
    for (let i = 0; i < 25; i++) {
      await WardrobeItem.create({ userId: user._id, name: `item-${i}`, category: 'tops' });
    }

    const res = await request(app)
      .post('/api/wardrobe')
      .set(authHeader(user))
      .send({ name: 'pro-extra', category: 'tops' });

    expect(res.status).toBe(201);
  });
});

describe('checkGenerationLimit', () => {
  const app = createApp();

  it('blocks free users at 5 generations/month with GENERATION_LIMIT_REACHED', async () => {
    const user = await createTestUser({
      subscriptionTier: 'free',
      generationsUsedThisMonth: 5,
      generationResetDate: new Date(),
    });

    const res = await request(app)
      .post('/api/outfits/generate')
      .set(authHeader(user))
      .send({});

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('GENERATION_LIMIT_REACHED');
    expect(res.body.limit).toBe(5);
  });

  it('resets the counter at month rollover', async () => {
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    const user = await createTestUser({
      subscriptionTier: 'free',
      generationsUsedThisMonth: 5,
      generationResetDate: lastMonth,
    });

    // After middleware sees a stale reset date, the counter should drop to 0;
    // we don't care if the generation itself succeeds (it depends on wardrobe).
    // What matters: the gate does not 403 with GENERATION_LIMIT_REACHED.
    const res = await request(app)
      .post('/api/outfits/generate')
      .set(authHeader(user))
      .send({});

    expect(res.body.code).not.toBe('GENERATION_LIMIT_REACHED');
  });
});
