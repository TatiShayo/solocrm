'use server';

import { signInAction, signUpAction, signOutAction } from '@/lib/auth';

export async function loginAction(email: string) {
  try {
    return await signInAction(email);
  } catch (error: any) {
    return { success: false, error: error.message || 'An unexpected error occurred.' };
  }
}

export async function registerAction(email: string, fullName: string) {
  try {
    return await signUpAction(email, fullName);
  } catch (error: any) {
    return { success: false, error: error.message || 'An unexpected error occurred.' };
  }
}

export async function logoutAction() {
  try {
    return await signOutAction();
  } catch (error: any) {
    console.error('Logout error:', error);
    return { success: false };
  }
}
