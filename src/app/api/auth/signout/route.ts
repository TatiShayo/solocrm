import { NextResponse } from 'next/server';
import { signOutAction } from '@/lib/auth';

export async function POST() {
  try {
    await signOutAction();
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
