import { NextResponse } from 'next/server';
import { signOutAction } from '@/lib/auth';

export async function POST() {
  try {
    await signOutAction();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Signout error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
