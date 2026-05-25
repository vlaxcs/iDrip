import jwt from 'jsonwebtoken';
import User, { IUser } from '../src/models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

export interface TestUserOptions {
  email?: string;
  name?: string;
  googleId?: string;
  subscriptionTier?: 'free' | 'pro' | 'lifetime';
  generationsUsedThisMonth?: number;
  generationResetDate?: Date | null;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
}

export async function createTestUser(opts: TestUserOptions = {}): Promise<IUser> {
  return User.create({
    googleId: opts.googleId || `gid-${Date.now()}-${Math.random()}`,
    email: opts.email || `user-${Date.now()}@test.local`,
    name: opts.name || 'Test User',
    subscriptionTier: opts.subscriptionTier || 'free',
    generationsUsedThisMonth: opts.generationsUsedThisMonth ?? 0,
    generationResetDate: opts.generationResetDate ?? null,
    stripeCustomerId: opts.stripeCustomerId || '',
    stripeSubscriptionId: opts.stripeSubscriptionId || '',
  });
}

export function tokenFor(user: IUser): string {
  return jwt.sign(
    { userId: user._id.toString(), email: user.email, name: user.name },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

export function authHeader(user: IUser): { Authorization: string } {
  return { Authorization: `Bearer ${tokenFor(user)}` };
}

export function expiredToken(user: IUser): string {
  return jwt.sign(
    { userId: user._id.toString(), email: user.email, name: user.name },
    JWT_SECRET,
    { expiresIn: '-1h' }
  );
}
