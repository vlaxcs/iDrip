import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { authMiddleware } from './middleware/auth';
import { apiRateLimit } from './middleware/rateLimit';
import authRoutes from './routes/auth';
import wardrobeRoutes from './routes/wardrobe';
import outfitRoutes from './routes/outfits';
import recommendationRoutes from './routes/recommendations';
import userRoutes from './routes/users';
import aiRoutes from './routes/ai';
import subscriptionWebhookRoutes from './routes/subscriptionWebhook';
import subscriptionRoutes from './routes/subscriptions';

export function createApp() {
  const app = express();

  const allowedOrigin = process.env.FRONTEND_URL || 'https://idrip.tech';
  app.use(cors({ origin: allowedOrigin, credentials: true }));

  // Stripe webhook must receive raw body before JSON parser
  app.use('/api/subscriptions/webhook', express.raw({ type: 'application/json' }), subscriptionWebhookRoutes);

  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', message: 'iDrip Backend is running' });
  });

  app.use('/api/auth', apiRateLimit, authRoutes);
  app.use('/api/wardrobe', authMiddleware, apiRateLimit, wardrobeRoutes);
  app.use('/api/outfits', authMiddleware, apiRateLimit, outfitRoutes);
  app.use('/api/recommendations', authMiddleware, apiRateLimit, recommendationRoutes);
  app.use('/api/users', authMiddleware, apiRateLimit, userRoutes);
  app.use('/api/ai', authMiddleware, apiRateLimit, aiRoutes);

  app.get('/api/subscriptions/plans', apiRateLimit, (_req, res) => {
    const { PRICE_IDS } = require('./lib/stripe');
    res.json({
      plans: [
        {
          id: 'free', name: 'Free', price: 0, currency: 'usd', interval: null, stripePriceId: null,
          features: ['Up to 20 wardrobe items', '5 AI outfit generations per month', 'Basic shopping recommendations'],
          highlighted: false,
        },
        {
          id: 'pro_monthly', name: 'Pro', price: 9.99, currency: 'usd', interval: 'month',
          stripePriceId: PRICE_IDS.pro_monthly,
          features: ['Unlimited wardrobe items', 'Unlimited AI outfit generations', 'Advanced shopping recommendations', 'Priority AI processing'],
          highlighted: true,
        },
        {
          id: 'pro_yearly', name: 'Pro', price: 89.99, currency: 'usd', interval: 'year',
          stripePriceId: PRICE_IDS.pro_yearly,
          features: ['Everything in Pro Monthly', '2 months free compared to monthly'],
          highlighted: false,
        },
        {
          id: 'lifetime', name: 'Lifetime', price: 199, currency: 'usd', interval: null,
          stripePriceId: PRICE_IDS.lifetime,
          features: ['Unlimited wardrobe forever', 'Unlimited AI generations forever', 'All future premium features', 'Priority support'],
          highlighted: false,
        },
      ],
    });
  });

  app.use('/api/subscriptions', authMiddleware, apiRateLimit, subscriptionRoutes);

  app.post('/api/subscriptions/mock-upgrade', authMiddleware, apiRateLimit, async (req: Request, res: Response) => {
    const { tier } = req.body;
    if (!tier || !['pro', 'lifetime'].includes(tier)) {
      res.status(400).json({ error: 'tier must be "pro" or "lifetime"' });
      return;
    }
    const User = require('./models/User').default;
    const user = await User.findById(req.userId);
    if (!user) { res.status(404).json({ error: 'User not found' }); return; }
    user.subscriptionTier = tier;
    user.subscriptionStatus = 'active';
    if (tier === 'lifetime') {
      user.subscriptionExpiry = null;
    } else {
      user.subscriptionExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }
    user.generationsUsedThisMonth = 0;
    await user.save();
    res.json({ tier, status: 'active', message: `Mock upgrade to ${tier} successful` });
  });

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[error-handler]', err.message || err);
    res.status(err.status || 500).json({
      error: err.message || 'Internal server error',
    });
  });

  return app;
}
