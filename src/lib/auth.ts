import { cookies } from 'next/headers';
import { db, Profile } from './db';

const COOKIE_NAME = 'solocrm-session-user-id';

/**
 * Helper to get the currently logged-in user profile.
 * Defaults to the demo user profile ('default-user') to make testing and running seamless.
 */
export async function getCurrentUser(): Promise<Profile> {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get(COOKIE_NAME)?.value;
    
    if (userId) {
      const user = await db.profiles.findById(userId);
      if (user) {
        return user;
      }
    }
  } catch (error) {
    console.error('Error getting current user:', error);
  }

  // Fallback / default to the demo user profile
  const demoUser = await db.profiles.findById('default-user');
  if (!demoUser) {
    // If db was reset or not initialized properly, dynamically create the demo profile
    return db.profiles.insert({
      id: 'default-user',
      email: 'solo@founder.com',
      full_name: 'Solo Founder',
      created_at: new Date().toISOString()
    });
  }
  return demoUser;
}

/**
 * Checks if the user is explicitly authenticated (not falling back to demo user).
 * Returns the profile if logged in, or null otherwise.
 */
export async function getSessionUser(): Promise<Profile | null> {
  try {
    const cookieStore = await cookies();
    const userId = cookieStore.get(COOKIE_NAME)?.value;
    if (userId) {
      return await db.profiles.findById(userId);
    }
  } catch (error) {
    console.error('Error checking session user:', error);
  }
  return null;
}

/**
 * Sign in action. Matches email to an existing profile.
 */
export async function signInAction(email: string): Promise<{ success: boolean; error?: string }> {
  if (!email || !email.includes('@')) {
    return { success: false, error: 'Please enter a valid email address.' };
  }

  const profile = await db.profiles.find(p => p.email.toLowerCase() === email.toLowerCase());
  if (!profile) {
    return { success: false, error: 'No profile found with this email. Please register first.' };
  }

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, profile.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 1 week
    path: '/'
  });

  return { success: true };
}

/**
 * Sign up action. Creates a new profile, assigns a subscription, and pre-seeds a sales pipeline.
 */
export async function signUpAction(email: string, fullName: string): Promise<{ success: boolean; error?: string }> {
  if (!email || !email.includes('@')) {
    return { success: false, error: 'Please enter a valid email address.' };
  }
  if (!fullName || fullName.trim().length < 2) {
    return { success: false, error: 'Please enter a valid full name.' };
  }

  const existing = await db.profiles.find(p => p.email.toLowerCase() === email.toLowerCase());
  if (existing) {
    return { success: false, error: 'A profile with this email already exists. Please sign in.' };
  }

  // Insert profile
  const newProfile = await db.profiles.insert({
    email: email.toLowerCase(),
    full_name: fullName,
  });

  // Create free tier subscription
  await db.subscriptions.insert({
    user_id: newProfile.id,
    plan: 'free',
    status: 'active'
  });

  // Create default pipeline for the new user
  const newPipeline = await db.pipelines.insert({
    user_id: newProfile.id,
    name: 'Sales Pipeline',
    is_default: true
  });

  // Create stages for the pipeline
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

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, newProfile.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 1 week
    path: '/'
  });

  return { success: true };
}

/**
 * Sign out action. Clears the session cookie.
 */
export async function signOutAction(): Promise<{ success: boolean }> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
  return { success: true };
}
