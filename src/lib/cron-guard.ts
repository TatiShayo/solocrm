import { createHmac, timingSafeEqual } from "crypto";

function jsonError(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Constant-time bearer-token check for cron endpoints.
 *
 * `authHeader !== \`Bearer ${secret}\`` leaks the secret through timing: string
 * comparison short-circuits on the first differing byte, so an attacker can
 * recover a valid token byte-by-byte by measuring response latency.
 *
 * Both sides are HMAC'd to a fixed length first, because `timingSafeEqual`
 * requires equal-length buffers and would otherwise throw (and leak the expected
 * length) on a mismatch.
 */
export function cronSecretMatches(provided: string | null, expected: string | undefined): boolean {
  if (!expected || !provided) return false;

  const mac = (value: string) => createHmac("sha256", "cron-guard").update(value).digest();
  const a = mac(provided);
  const b = mac(`Bearer ${expected}`);

  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Returns an error Response when the request is not authorised, or null when it
 * is. Always fails closed — an unset CRON_SECRET rejects every request.
 */
export function requireCron(request: Request): Response | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    // An unset secret must not open the endpoint.
    console.error("CRON_SECRET is not set — rejecting cron request");
    return jsonError({ error: "Cron not configured" }, 503);
  }
  if (!cronSecretMatches(request.headers.get("authorization"), secret)) {
    return jsonError({ error: "Unauthorized" }, 401);
  }
  return null;
}
