import { NextResponse } from 'next/server';
import { getCurrentUser, sanitizeProfile } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getCurrentUser();
    return NextResponse.json({ user: user ? sanitizeProfile(user) : null });
  } catch (err) {
    console.error('auth/me error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
