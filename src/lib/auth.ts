import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createHmac, scryptSync, timingSafeEqual, randomBytes } from 'crypto';
import { db, Profile } from './db';

const COOKIE_NAME = 'solocrm-session';
const SESSION_SECRET = process.env.APP_SECRET || 'change-me-in-production-use-32-bytes-random';
// Demo fallback only outside production (dev + unit tests), never in prod.
const DEMO_ENABLED =
  (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') &&
  !process.env.DISABLE_DEMO;

function signSession(userId: string): string {
  const hmac = createHmac('sha256', SESSION_SECRET);
  const ts = Date.now().toString();
  hmac.update(`${userId}:${ts}`);
  return `${userId}:${ts}:${hmac.digest('hex')}`;
}

function verifySession(token: string): string | null {
  const parts = token.split(':');
  if (parts.length !== 3) return null;
  const [userId, ts, sig] = parts;
  const hmac = createHmac('sha256', SESSION_SECRET);
  hmac.update(`${userId}:${ts}`);
  const expected = hmac.digest('hex');
  if (sig.length !== expected.length) return null;
  try {
    if (timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
      return userId;
    }
  } catch {
    return null;
  }
  return null;
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const [, salt, hash] = parts;
  const computed = scryptSync(password, salt, 64).toString('hex');
  try {
    return timingSafeEqual(Buffer.from(hash), Buffer.from(computed));
  } catch {
    return false;
  }
}

async function setSessionCookie(userId: string) {
  const cookieStore = await cookies();
  return cookieStore.set(COOKIE_NAME, signSession(userId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 24 * 7,
    path: '/'
  });
}

/**
 * Returns the authenticated user profile, or null if not logged in.
 * Only falls back to demo user in dev mode with DEMO_ENABLED=true.
 */
export async function getCurrentUser(): Promise<Profile | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (token) {
      const userId = verifySession(token);
      if (userId) {
        const user = await db.profiles.findById(userId);
        if (user) return user;
      }
    }
  } catch (error) {
    console.error('Error getting current user:', error);
  }

  if (DEMO_ENABLED) {
    const demoUser = await db.profiles.findById('default-user');
    if (!demoUser) {
      return db.profiles.insert({
        id: 'default-user',
        email: 'solo@founder.com',
        full_name: 'Solo Founder',
        created_at: new Date().toISOString()
      });
    }
    return demoUser;
  }

  return null;
}

/**
 * Returns the authenticated user or redirects to /login.
 * Use in server components / server actions that require auth.
 */
export async function requireUser(): Promise<Profile> {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }
  return user;
}

/** Removes sensitive fields before sending a profile to the client. */
export function sanitizeProfile(profile: Profile): Omit<Profile, 'password_hash'> {
  const { password_hash: _password_hash, ...safe } = profile;
  return safe;
}

/**
 * Returns the authenticated user, never falls back to demo.
 */
export async function getSessionUser(): Promise<Profile | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (token) {
      const userId = verifySession(token);
      if (userId) {
        return await db.profiles.findById(userId);
      }
    }
  } catch (error) {
    console.error('Error checking session user:', error);
  }
  return null;
}

/**
 * Sign in with email and password.
 */
export async function signInAction(email: string, password: string): Promise<{ success: boolean; error?: string }> {
  if (!email || !email.includes('@')) {
    return { success: false, error: 'Please enter a valid email address.' };
  }
  if (!password || password.length < 8) {
    return { success: false, error: 'Password must be at least 8 characters.' };
  }

  const profile = await db.profiles.find(p => p.email.toLowerCase() === email.toLowerCase());
  if (!profile) {
    return { success: false, error: 'No profile found with this email.' };
  }
  if (!profile.password_hash) {
    return { success: false, error: 'Account not fully set up. Please reset your password.' };
  }
  if (!verifyPassword(password, profile.password_hash)) {
    return { success: false, error: 'Invalid password.' };
  }

  await setSessionCookie(profile.id);
  return { success: true };
}

/**
 * Sign up with email, name, and password. Creates profile, subscription, pipeline.
 */
export async function signUpAction(email: string, fullName: string, password: string): Promise<{ success: boolean; error?: string }> {
  if (!email || !email.includes('@')) {
    return { success: false, error: 'Please enter a valid email address.' };
  }
  if (!fullName || fullName.trim().length < 2) {
    return { success: false, error: 'Please enter a valid full name.' };
  }
  if (!password || password.length < 8) {
    return { success: false, error: 'Password must be at least 8 characters.' };
  }

  const existing = await db.profiles.find(p => p.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    return { success: false, error: 'A profile with this email already exists. Please sign in.' };
  }

  const newProfile = await db.profiles.insert({
    email: email.toLowerCase(),
    full_name: fullName,
    password_hash: hashPassword(password),
  });

  await db.subscriptions.insert({
    user_id: newProfile.id,
    plan: 'free',
    status: 'active'
  });

  const newPipeline = await db.pipelines.insert({
    user_id: newProfile.id,
    name: 'Sales Pipeline',
    is_default: true
  });

  const stages = [
    { name: 'Lead', order_index: 0, probability: 10, color: '#3b82f6' },
    { name: 'Contacted', order_index: 1, probability: 30, color: '#a855f7' },
    { name: 'Proposal', order_index: 2, probability: 60, color: '#eab308' },
    { name: 'Negotiation', order_index: 3, probability: 80, color: '#f97316' },
    { name: 'Won', order_index: 4, probability: 100, color: '#22c55e' },
    { name: 'Lost', order_index: 5, probability: 0, color: '#ef4444' }
  ];

  for (const s of stages) {
    await db.pipelineStages.insert({
      pipeline_id: newPipeline.id,
      name: s.name,
      order_index: s.order_index,
      probability: s.probability,
      color: s.color
    });
  }

  await setSessionCookie(newProfile.id);
  return { success: true };
}

/**
 * Sign out. Clears session cookie.
 */
export async function signOutAction(): Promise<{ success: boolean }> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
  return { success: true };
}
