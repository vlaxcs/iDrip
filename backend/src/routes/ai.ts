import { Router, Request, Response } from 'express';
import { analyzeClothing } from '../services/aiAnalysisService';
import { generateChatResponse } from '../services/aiChatService';

const router = Router();

// Simple in-memory rate limit: 10 req/min per user
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(req: Request, res: Response, next: any) {
  const userId = req.userId || 'anonymous';
  const now = Date.now();
  const entry = rateLimitMap.get(userId);

  if (entry && now < entry.resetAt) {
    if (entry.count >= 10) {
      res.status(429).json({ error: 'Too many requests. Try again in a minute.' });
      return;
    }
    entry.count++;
  } else {
    rateLimitMap.set(userId, { count: 1, resetAt: now + 60000 });
  }
  next();
}

router.post('/chat', checkRateLimit, async (req: Request, res: Response) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    res.status(400).json({ error: 'Invalid messages array' });
    return;
  }

  try {
    const reply = await generateChatResponse(messages);
    res.json({ reply });
  } catch (err: any) {
    if (err.message.includes('API key not configured') || err.message.includes('No AI API key configured')) {
      res.status(503).json({ error: 'AI service is not configured' });
      return;
    }
    console.error('[aiChat] error:', err.message);
    res.status(500).json({ error: 'Failed to generate chat response' });
  }
});

router.post('/analyze-clothing', checkRateLimit, async (req: Request, res: Response) => {
  const { imageUrl } = req.body;

  console.log('[analyze-clothing] Received request');

  if (!imageUrl || typeof imageUrl !== 'string') {
    console.log('[analyze-clothing] ERROR: No imageUrl provided');
    res.status(400).json({ error: 'imageUrl is required (must be a valid image URL)' });
    return;
  }

  console.log(`[analyze-clothing] Analyzing image: ${imageUrl.substring(0, 80)}...`);

  try {
    console.log('[analyze-clothing] Calling AI model...');
    const analysis = await analyzeClothing(imageUrl);
    console.log(`[analyze-clothing] SUCCESS: category=${analysis.category}, confidence=${analysis.confidence}`);
    res.json(analysis);
  } catch (err: any) {
    if (err.message === 'No AI API key configured — set OPENAI_API_KEY') {
      console.log('[analyze-clothing] ERROR: API key not configured');
      res.status(503).json({ error: 'AI service is not configured' });
      return;
    }
    console.error('[analyze-clothing] AI error:', err.message);
    console.error('[analyze-clothing] Full error:', err);
    res.status(503).json({ error: `AI analysis failed: ${err.message}` });
  }
});

export default router;
