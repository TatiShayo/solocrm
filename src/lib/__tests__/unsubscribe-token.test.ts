import { describe, it, expect } from 'vitest';
import { createHash } from 'crypto';
import { makeUnsubscribeToken, verifyUnsubscribeToken } from '../unsubscribe-token';

/**
 * Regression tests for the cross-tenant unsubscribe IDOR.
 *
 * Before the fix, /unsubscribe accepted a raw contactId (and /api/unsubscribe
 * matched an unsalted default-secret hash against EVERY tenant's contacts),
 * so anyone could enumerate contact IDs, read the contact's email address,
 * opt them out, and cancel their sequences — across tenants, unauthenticated.
 *
 * The fix requires an HMAC-signed token minted by the server.
 */
describe('unsubscribe token (cross-tenant IDOR regression)', () => {
  it('round-trips a valid token', () => {
    const token = makeUnsubscribeToken('contact-123');
    expect(verifyUnsubscribeToken(token)).toBe('contact-123');
  });

  it('rejects a raw contact id (the original IDOR payload)', () => {
    // An attacker who knows or guesses a victim contact id must not be able
    // to use it directly as a token.
    expect(verifyUnsubscribeToken('contact-1')).toBeNull();
    expect(verifyUnsubscribeToken('9a1f4c1e-0000-4000-8000-000000000001')).toBeNull();
  });

  it('rejects the legacy unsalted sha256 hash format', () => {
    // Old /api/unsubscribe tokens: sha256(`${contactId}:solocrm-unsubscribe`)
    const legacy = createHash('sha256').update('contact-1:solocrm-unsubscribe').digest('hex');
    expect(verifyUnsubscribeToken(legacy)).toBeNull();
  });

  it('rejects a tampered token (signature does not transfer between contacts)', () => {
    const tokenA = makeUnsubscribeToken('contact-A');
    const sigA = tokenA.slice(tokenA.lastIndexOf('.') + 1);
    // Try to reuse contact A's signature to unsubscribe contact B.
    expect(verifyUnsubscribeToken(`contact-B.${sigA}`)).toBeNull();
  });

  it('rejects truncated, empty, and malformed tokens', () => {
    const token = makeUnsubscribeToken('contact-123');
    expect(verifyUnsubscribeToken(token.slice(0, -2))).toBeNull();
    expect(verifyUnsubscribeToken('')).toBeNull();
    expect(verifyUnsubscribeToken(null)).toBeNull();
    expect(verifyUnsubscribeToken(undefined)).toBeNull();
    expect(verifyUnsubscribeToken('.abcdef')).toBeNull();
    expect(verifyUnsubscribeToken('contact-123.')).toBeNull();
  });

  it('rejects a token signed with a different secret', () => {
    // Simulates a token forged by an attacker guessing the (old) default secret.
    const forged = 'contact-123.' + createHash('sha256').update('contact-123').digest('hex');
    expect(verifyUnsubscribeToken(forged)).toBeNull();
  });
});
