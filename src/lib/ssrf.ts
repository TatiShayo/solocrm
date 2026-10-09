import { isIP } from "net";
import { lookup } from "dns/promises";

/**
 * SSRF guard for user-supplied webhook URLs.
 *
 * The registered URL is fully attacker-controlled (only `z.string().url()` is
 * checked), so an unfiltered `fetch` reaches the cloud metadata service
 * (169.254.169.254), loopback, and RFC1918 space — and follows redirects into
 * them.
 *
 * Strategy:
 *  1. Scheme allowlist (https only).
 *  2. Reject obvious literal private/loopback/link-local hosts.
 *  3. Resolve DNS and reject if ANY returned address is private — this closes
 *     the `metadata.internal` and `localhost.localdomain` classes, and the
 *     hostnames that resolve into private space.
 *  4. No redirect following (`redirect: "manual"`) — a 302 to
 *     `http://169.254.169.254/` would otherwise bypass all of the above.
 *  5. A hard timeout so a slow endpoint cannot pin the request.
 */

const BLOCKED_V4_PREFIXES = [
  "0.",
  "10.",
  "127.",
  "169.254.",
  "192.168.",
  "100.64.",   // CGNAT
  "192.0.0.",  // IETF protocol assignments
  "198.18.",   // benchmarking
  "224.",      // multicast
  "240.",      // reserved
];

function isPrivateIPv4(ip: string): boolean {
  if (BLOCKED_V4_PREFIXES.some((p) => ip.startsWith(p))) return true;
  const octets = ip.split(".").map(Number);
  if (octets.length !== 4 || octets.some((o) => Number.isNaN(o))) return true;
  // 172.16.0.0/12
  if (octets[0] === 172 && octets[1] >= 16 && octets[1] <= 31) return true;
  // 255.255.255.255 and other broadcast
  if (ip === "255.255.255.255") return true;
  return false;
}

function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase().replace(/^\[|\]$/g, "");
  if (lower === "::" || lower === "::1") return true;
  if (lower.startsWith("fe80:")) return true; // link-local
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // ULA
  if (lower.startsWith("ff")) return true; // multicast
  if (lower.startsWith("::ffff:")) {
    // IPv4-mapped — re-check the embedded IPv4 address.
    const v4 = lower.slice("::ffff:".length);
    if (isIP(v4) === 4) return isPrivateIPv4(v4);
  }
  return false;
}

export type UrlCheck = { ok: true; url: string } | { ok: false; reason: string };

/**
 * Validates a URL before it is fetched. Resolves DNS and checks every address.
 */
export async function assertPublicUrl(rawUrl: string): Promise<UrlCheck> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { ok: false, reason: "malformed URL" };
  }

  if (parsed.protocol !== "https:") {
    return { ok: false, reason: "only https webhooks are allowed" };
  }
  if (!parsed.hostname) {
    return { ok: false, reason: "missing hostname" };
  }
  // Reject embedded credentials — they are a common way to smuggle a host past a
  // naive check.
  if (parsed.username || parsed.password) {
    return { ok: false, reason: "credentials in URL are not allowed" };
  }

  const hostname = parsed.hostname.replace(/^\[|\]$/g, "");

  // Literal IP?
  if (isIP(hostname) === 4 && isPrivateIPv4(hostname)) {
    return { ok: false, reason: "private or reserved address" };
  }
  if (isIP(hostname) === 6 && isPrivateIPv6(hostname)) {
    return { ok: false, reason: "private or reserved address" };
  }

  // Hostname — resolve and check every address. A single A record pointing into
  // private space is enough to reject.
  if (isIP(hostname) === 0) {
    let addresses: Array<{ address: string }>;
    try {
      addresses = await lookup(hostname, { all: true });
    } catch {
      return { ok: false, reason: "hostname did not resolve" };
    }
    if (addresses.length === 0) {
      return { ok: false, reason: "hostname did not resolve" };
    }
    for (const { address } of addresses) {
      if (isIP(address) === 4 && isPrivateIPv4(address)) {
        return { ok: false, reason: "hostname resolves to a private address" };
      }
      if (isIP(address) === 6 && isPrivateIPv6(address)) {
        return { ok: false, reason: "hostname resolves to a private address" };
      }
    }
  }

  return { ok: true, url: parsed.toString() };
}

export const SAFE_FETCH_INIT: RequestInit = {
  redirect: "manual",
  signal: AbortSignal.timeout(5000),
};
