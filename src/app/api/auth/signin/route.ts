import { NextRequest, NextResponse } from 'next/server';
import { signInAction } from '@/lib/auth';
import { validateBody, signInSchema } from '@/lib/validation';
import { rateLimit, clientIpFrom } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    const ip = clientIpFrom(request.headers);
    const limited = rateLimit(`api:signin:${ip}`, 10, 60_000);
    if (!limited.allowed) {
      return NextResponse.json(
        { error: 'Too many attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(limited.retryAfterSeconds) } }
      );
    }

    const rawBody = await request.json().catch(() => null);
    const parsed = validateBody(rawBody, signInSchema);
    if (parsed instanceof NextResponse) return parsed;

    const result = await signInAction(parsed.email, parsed.password);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Signin error:', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
