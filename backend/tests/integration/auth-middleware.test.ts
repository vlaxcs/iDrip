import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app';
import { authHeader, createTestUser, expiredToken } from '../helpers';

describe('authMiddleware', () => {
  const app = createApp();

  it('returns 401 when Authorization header is missing', async () => {
    const res = await request(app).get('/api/wardrobe');
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/authorization/i);
  });

  it('returns 401 when Authorization header is not Bearer-formatted', async () => {
    const res = await request(app).get('/api/wardrobe').set('Authorization', 'Basic abc');
    expect(res.status).toBe(401);
  });

  it('returns 401 for an invalid token', async () => {
    const res = await request(app).get('/api/wardrobe').set('Authorization', 'Bearer not-a-jwt');
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid|expired/i);
  });

  it('returns 401 for an expired token', async () => {
    const user = await createTestUser();
    const res = await request(app)
      .get('/api/wardrobe')
      .set('Authorization', `Bearer ${expiredToken(user)}`);
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalid|expired/i);
  });

  it('passes through with a valid token', async () => {
    const user = await createTestUser();
    const res = await request(app).get('/api/wardrobe').set(authHeader(user));
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('items');
  });
});
