'use server';

import { headers } from 'next/headers';
import { signInAction, signUpAction, signOutAction } from '@/lib/auth';
import { rateLimit, clientIpFrom } from '@/lib/rate-limit';

const GENERIC_ERROR = 'An unexpected error occurred. Please try again.';

async function checkAuthRateLimit(action: string): Promise<string | null> {
  const ip = clientIpFrom(await headers());
  const result = rateLimit(`auth:${action}:${ip}`, 10, 60_000);
  if (!result.allowed) {
    return `Too many attempts. Please try again in ${result.retryAfterSeconds}s.`;
  }
  return null;
}

export async function loginAction(email: string, password: string) {
  try {
    const limited = await checkAuthRateLimit('login');
    if (limited) return { success: false, error: limited };
    return await signInAction(email, password);
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: GENERIC_ERROR };
  }
}

export async function registerAction(email: string, fullName: string, password: string) {
  try {
    const limited = await checkAuthRateLimit('register');
    if (limited) return { success: false, error: limited };
    return await signUpAction(email, fullName, password);
  } catch (error) {
    console.error('Register error:', error);
    return { success: false, error: GENERIC_ERROR };
  }
}

export async function logoutAction() {
  try {
    return await signOutAction();
  } catch (error) {
    console.error('Logout error:', error);
    return { success: false };
  }
}
