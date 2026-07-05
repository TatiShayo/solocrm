import { NextResponse } from 'next/server';
import { signUpAction } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, fullName } = body;
    const result = await signUpAction(email, fullName);
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
