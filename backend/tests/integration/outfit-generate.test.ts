import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';

// Stub the AI + embedding services — we test the route's orchestration, not the LLM
vi.mock('../../src/services/aiGenerationService', () => ({
  generateOutfitAI: vi.fn(async ({ wardrobe_items }: { wardrobe_items: { id: string }[] }) => ({
    outfit_name: 'Stub Outfit',
    selected_item_ids: wardrobe_items.slice(0, 3).map((i) => i.id),
    occasion: 'casual',
    score: 88,
    reasoning: 'stub reasoning',
    color_scheme: 'neutral',
    weather_score: 80,
    style_score: 90,
  })),
}));

vi.mock('../../src/services/embeddingService', () => ({
  buildItemText: () => 'stub',
  buildQueryText: () => 'stub query',
  generateEmbedding: vi.fn().mockResolvedValue([0.1, 0.2, 0.3]),
  getVectorDB: () => ({
    search: vi.fn().mockResolvedValue([]),
  }),
}));

import { createApp } from '../../src/app';
import User from '../../src/models/User';
import WardrobeItem from '../../src/models/WardrobeItem';
import { authHeader, createTestUser } from '../helpers';

describe('POST /api/outfits/generate', () => {
  const app = createApp();

  async function seedMinimalWardrobe(userId: string) {
    await WardrobeItem.create({ userId, name: 't1', category: 'tops' });
    await WardrobeItem.create({ userId, name: 'b1', category: 'bottoms' });
    await WardrobeItem.create({ userId, name: 's1', category: 'shoes' });
  }

  it('creates an outfit and increments generationsUsedThisMonth for free users', async () => {
    const user = await createTestUser({ subscriptionTier: 'free', generationsUsedThisMonth: 0 });
    await seedMinimalWardrobe(user._id.toString());

    const res = await request(app)
      .post('/api/outfits/generate')
      .set(authHeader(user))
      .send({ preferences: { occasion: 'casual' } });

    expect(res.status).toBe(201);
    expect(res.body.outfit).toBeTruthy();
    expect(res.body.outfit.name).toBe('Stub Outfit');

    const refreshed = await User.findById(user._id);
    expect(refreshed?.generationsUsedThisMonth).toBe(1);
  });

  it('does not increment counter for pro users', async () => {
    const user = await createTestUser({ subscriptionTier: 'pro', generationsUsedThisMonth: 0 });
    await seedMinimalWardrobe(user._id.toString());

    const res = await request(app)
      .post('/api/outfits/generate')
      .set(authHeader(user))
      .send({ preferences: { occasion: 'casual' } });

    expect(res.status).toBe(201);
    const refreshed = await User.findById(user._id);
    expect(refreshed?.generationsUsedThisMonth).toBe(0);
  });
});
