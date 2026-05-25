import { describe, expect, it, vi, beforeEach } from 'vitest';
import request from 'supertest';

vi.mock('../../src/services/aiAnalysisService', () => ({
  analyzeClothing: vi.fn(),
}));

import { createApp } from '../../src/app';
import { authHeader, createTestUser } from '../helpers';
import { analyzeClothing } from '../../src/services/aiAnalysisService';

const mockedAnalyze = analyzeClothing as ReturnType<typeof vi.fn>;

describe('POST /api/ai/analyze-clothing', () => {
  const app = createApp();

  beforeEach(() => {
    mockedAnalyze.mockReset();
  });

  it('returns 400 when imageUrl is missing', async () => {
    const user = await createTestUser();
    const res = await request(app)
      .post('/api/ai/analyze-clothing')
      .set(authHeader(user))
      .send({});
    expect(res.status).toBe(400);
  });

  it('returns the analysis on a happy path', async () => {
    mockedAnalyze.mockResolvedValueOnce({
      category: 'tops',
      subcategory: 't-shirt',
      primaryColor: 'black',
      confidence: 0.92,
    });

    const user = await createTestUser();
    const res = await request(app)
      .post('/api/ai/analyze-clothing')
      .set(authHeader(user))
      .send({ imageUrl: 'https://example.com/shirt.jpg' });

    expect(res.status).toBe(200);
    expect(res.body.category).toBe('tops');
    expect(res.body.confidence).toBe(0.92);
  });

  it('returns 503 when no API key is configured', async () => {
    mockedAnalyze.mockRejectedValueOnce(new Error('No AI API key configured — set OPENAI_API_KEY'));

    const user = await createTestUser();
    const res = await request(app)
      .post('/api/ai/analyze-clothing')
      .set(authHeader(user))
      .send({ imageUrl: 'https://example.com/shirt.jpg' });

    expect(res.status).toBe(503);
    expect(res.body.error).toMatch(/not configured/i);
  });

  it('returns 503 on generic AI service failures (Featherless fallback exhausted)', async () => {
    mockedAnalyze.mockRejectedValueOnce(new Error('All providers failed'));

    const user = await createTestUser();
    const res = await request(app)
      .post('/api/ai/analyze-clothing')
      .set(authHeader(user))
      .send({ imageUrl: 'https://example.com/shirt.jpg' });

    expect(res.status).toBe(503);
    expect(res.body.error).toMatch(/analysis failed/i);
  });

  it('returns 429 after 10 requests per minute', async () => {
    mockedAnalyze.mockResolvedValue({ category: 'tops', confidence: 1 });

    const user = await createTestUser();
    const auth = authHeader(user);

    // Burn through the rate limit (10 allowed)
    for (let i = 0; i < 10; i++) {
      await request(app)
        .post('/api/ai/analyze-clothing')
        .set(auth)
        .send({ imageUrl: `https://example.com/${i}.jpg` });
    }

    const res = await request(app)
      .post('/api/ai/analyze-clothing')
      .set(auth)
      .send({ imageUrl: 'https://example.com/11.jpg' });

    expect(res.status).toBe(429);
  });
});
