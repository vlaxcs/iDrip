import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';

// Embedding service hits an external LLM — stub before importing the app
vi.mock('../../src/services/embeddingService', () => ({
  buildItemText: () => 'stub text',
  generateEmbedding: vi.fn().mockResolvedValue([]),
}));

import { createApp } from '../../src/app';
import WardrobeItem from '../../src/models/WardrobeItem';
import { authHeader, createTestUser } from '../helpers';

describe('wardrobe routes', () => {
  const app = createApp();

  describe('GET /api/wardrobe', () => {
    it('returns only items belonging to the authenticated user', async () => {
      const userA = await createTestUser({ email: 'a@test.local' });
      const userB = await createTestUser({ email: 'b@test.local' });

      await WardrobeItem.create({ userId: userA._id, name: 'A-shirt', category: 'tops' });
      await WardrobeItem.create({ userId: userB._id, name: 'B-pants', category: 'bottoms' });

      const res = await request(app).get('/api/wardrobe').set(authHeader(userA));

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(1);
      expect(res.body.items[0].name).toBe('A-shirt');
    });

    it('filters by category query param', async () => {
      const user = await createTestUser();
      await WardrobeItem.create({ userId: user._id, name: 'tee', category: 'tops' });
      await WardrobeItem.create({ userId: user._id, name: 'jeans', category: 'bottoms' });

      const res = await request(app)
        .get('/api/wardrobe?category=tops')
        .set(authHeader(user));

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(1);
      expect(res.body.items[0].category).toBe('tops');
    });
  });

  describe('POST /api/wardrobe', () => {
    it('creates an item scoped to the requesting user', async () => {
      const user = await createTestUser();

      const res = await request(app)
        .post('/api/wardrobe')
        .set(authHeader(user))
        .send({ name: 'new-tee', category: 'tops', color: 'black' });

      expect(res.status).toBe(201);
      expect(res.body.userId).toBe(user._id.toString());

      const stored = await WardrobeItem.findById(res.body._id);
      expect(stored).not.toBeNull();
      expect(stored?.name).toBe('new-tee');
    });

    it('returns 400 when validation fails (no category)', async () => {
      const user = await createTestUser();
      const res = await request(app)
        .post('/api/wardrobe')
        .set(authHeader(user))
        .send({ color: 'black' });
      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/wardrobe/:id', () => {
    it('removes the item', async () => {
      const user = await createTestUser();
      const item = await WardrobeItem.create({ userId: user._id, name: 'x', category: 'tops' });

      const res = await request(app)
        .delete(`/api/wardrobe/${item._id}`)
        .set(authHeader(user));

      expect(res.status).toBe(204);
      expect(await WardrobeItem.findById(item._id)).toBeNull();
    });
  });
});
