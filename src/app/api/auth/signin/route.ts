import { NextResponse } from 'next/server';
import { signInAction } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = body;
    const result = await signInAction(email);
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
