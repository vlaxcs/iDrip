import { describe, expect, it, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

// Mock axios so we don't hit Google's OAuth endpoints
vi.mock('axios', () => {
  const post = vi.fn();
  const get = vi.fn();
  return { default: { post, get }, post, get };
});

import axios from 'axios';
import { createApp } from '../../src/app';
import User from '../../src/models/User';

const mockedPost = axios.post as ReturnType<typeof vi.fn>;
const mockedGet = axios.get as ReturnType<typeof vi.fn>;

describe('GET /api/auth/google/callback', () => {
  const app = createApp();
  const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

  beforeEach(() => {
    mockedPost.mockReset();
    mockedGet.mockReset();
  });

  it('redirects to /login?error when code is missing', async () => {
    const res = await request(app).get('/api/auth/google/callback');
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('/login?error=auth_failed');
  });

  it('upserts a user by googleId and redirects with a signed JWT', async () => {
    mockedPost.mockResolvedValueOnce({
      data: { access_token: 'g-access', refresh_token: 'g-refresh' },
    });
    mockedGet.mockResolvedValueOnce({
      data: { id: 'google-123', email: 'alice@example.com', name: 'Alice', picture: 'https://x/y.jpg' },
    });

    const res = await request(app).get('/api/auth/google/callback?code=valid-code');

    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('/auth/callback?token=');

    const url = new URL(res.headers.location);
    const token = url.searchParams.get('token')!;
    expect(token).toBeTruthy();

    const payload = jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
    expect(payload.email).toBe('alice@example.com');

    const user = await User.findOne({ googleId: 'google-123' });
    expect(user).not.toBeNull();
    expect(user!.email).toBe('alice@example.com');
    expect(user!.refreshToken).toBe('g-refresh');
  });

  it('reuses the existing user on second login (no duplicate)', async () => {
    mockedPost.mockResolvedValue({ data: { access_token: 'g', refresh_token: 'g' } });
    mockedGet.mockResolvedValue({
      data: { id: 'google-456', email: 'bob@example.com', name: 'Bob', picture: '' },
    });

    await request(app).get('/api/auth/google/callback?code=c1');
    await request(app).get('/api/auth/google/callback?code=c2');

    const matches = await User.find({ googleId: 'google-456' });
    expect(matches).toHaveLength(1);
  });

  it('redirects to /login?error when Google rejects the code', async () => {
    mockedPost.mockRejectedValueOnce(new Error('invalid_grant'));

    const res = await request(app).get('/api/auth/google/callback?code=bad');
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('/login?error=auth_failed');
  });
});
