import { createHmac, timingSafeEqual } from 'crypto';

function getSecret(): string {
  const secret = process.env.APP_SECRET || process.env.CRON_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === 'production') {
    // Fail closed: with a known default secret anyone could forge tokens.
    throw new Error('APP_SECRET (or CRON_SECRET) must be set in production');
  }
  return 'dev-only-unsubscribe-secret';
}

function sign(contactId: string): string {
  return createHmac('sha256', getSecret()).update(contactId).digest('hex');
}

/**
 * Produces a tamper-proof unsubscribe token of the form `<contactId>.<hmac>`.
 * Only the server (holding APP_SECRET) can mint a valid token, so recipients
 * cannot unsubscribe arbitrary contacts by guessing/enumerating IDs.
 */
export function makeUnsubscribeToken(contactId: string): string {
  return `${contactId}.${sign(contactId)}`;
}

/**
 * Verifies an unsubscribe token in constant time.
 * Returns the contactId if the signature is valid, otherwise null.
 */
export function verifyUnsubscribeToken(token: string | null | undefined): string | null {
  if (!token) return null;
  const idx = token.lastIndexOf('.');
  if (idx <= 0) return null;
  const contactId = token.slice(0, idx);
  const sig = token.slice(idx + 1);
  const expected = sign(contactId);
  if (sig.length !== expected.length) return null;
  try {
    if (timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
      return contactId;
    }
  } catch {
    return null;
  }
  return null;
}
