import { describe, it, expect, beforeEach } from 'vitest';
import { rateLimit, clientIpFrom, _resetRateLimiter } from '../rate-limit';

describe('Sliding-Window Rate Limiter', () => {
  beforeEach(() => {
    _resetRateLimiter();
  });

  it('allows requests within limit', () => {
    const res1 = rateLimit('test-ip', 3, 60_000);
    expect(res1.allowed).toBe(true);
    expect(res1.remaining).toBe(2);
    expect(res1.retryAfterSeconds).toBe(0);

    const res2 = rateLimit('test-ip', 3, 60_000);
    expect(res2.allowed).toBe(true);
    expect(res2.remaining).toBe(1);

    const res3 = rateLimit('test-ip', 3, 60_000);
    expect(res3.allowed).toBe(true);
    expect(res3.remaining).toBe(0);
  });

  it('blocks requests exceeding limit and gives positive retryAfterSeconds', () => {
    rateLimit('test-ip', 2, 60_000);
    rateLimit('test-ip', 2, 60_000);

    const blocked = rateLimit('test-ip', 2, 60_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('isolates different keys from each other', () => {
    rateLimit('ip-1', 1, 60_000);
    const blocked1 = rateLimit('ip-1', 1, 60_000);
    expect(blocked1.allowed).toBe(false);

    const allowed2 = rateLimit('ip-2', 1, 60_000);
    expect(allowed2.allowed).toBe(true);
  });

  describe('clientIpFrom', () => {
    it('extracts first IP from x-forwarded-for', () => {
      const headers = new Headers();
      headers.set('x-forwarded-for', '203.0.113.195, 70.41.3.18, 150.172.238.178');
      expect(clientIpFrom(headers)).toBe('203.0.113.195');
    });

    it('falls back to x-real-ip if x-forwarded-for is missing', () => {
      const headers = new Headers();
      headers.set('x-real-ip', '198.51.100.1');
      expect(clientIpFrom(headers)).toBe('198.51.100.1');
    });

    it('returns unknown if no IP headers are present', () => {
      const headers = new Headers();
      expect(clientIpFrom(headers)).toBe('unknown');
    });
  });
});
