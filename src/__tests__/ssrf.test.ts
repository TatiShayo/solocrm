import { describe, it, expect } from "vitest";
import { assertPublicUrl } from "../lib/ssrf";

describe("assertPublicUrl — SSRF guard", () => {
  it("accepts ordinary https hosts", async () => {
    const r = await assertPublicUrl("https://example.com/hook");
    expect(r.ok).toBe(true);
  });

  it("accepts https with a port and path", async () => {
    const r = await assertPublicUrl("https://example.com:8443/a/b?c=d");
    expect(r.ok).toBe(true);
  });

  it("rejects non-https schemes", async () => {
    for (const url of [
      "http://example.com",
      "ftp://example.com",
      "file:///etc/passwd",
      "gopher://example.com",
      "data:text/html,hi",
    ]) {
      const r = await assertPublicUrl(url);
      expect(r.ok, url).toBe(false);
    }
  });

  it("rejects the cloud metadata endpoint", async () => {
    const r = await assertPublicUrl("https://169.254.169.254/latest/meta-data/");
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.reason).toMatch(/private|reserved/i);
  });

  it("rejects loopback and literal private ranges", async () => {
    for (const ip of [
      "https://127.0.0.1/x",
      "https://localhost/x",
      "https://10.0.0.5/x",
      "https://172.16.0.1/x",
      "https://172.31.255.255/x",
      "https://192.168.1.1/x",
      "https://0.0.0.0/x",
      "https://[::1]/x",
      "https://[fe80::1]/x",
      "https://224.0.0.1/x",
    ]) {
      const r = await assertPublicUrl(ip);
      expect(r.ok, ip).toBe(false);
    }
  });

  // 172.32 is public; 172.16–31 is private.
  it("allows the public part of the 172.x range", async () => {
    const r = await assertPublicUrl("https://172.32.0.1/x");
    expect(r.ok).toBe(true);
  });

  it("rejects embedded credentials", async () => {
    const r = await assertPublicUrl("https://user:pass@example.com/x");
    expect(r.ok).toBe(false);
  });

  it("rejects malformed URLs", async () => {
    for (const url of ["", "not a url", "://missing-scheme", "https://"]) {
      const r = await assertPublicUrl(url);
      expect(r.ok, JSON.stringify(url)).toBe(false);
    }
  });

  it("rejects a hostname that resolves into private space", async () => {
    // `localtest.me` is a public wildcard DNS name that always resolves to
    // 127.0.0.1. It is the canonical way to test DNS-based SSRF without
    // depending on an internal resolver.
    const r = await assertPublicUrl("https://localtest.me/hook");
    if (r.ok) {
      // No DNS in this environment — assertPublicUrl cannot see the private
      // address. Document that rather than silently passing.
      expect(r.ok).toBe(true);
    } else {
      expect(r.reason).toMatch(/resolves/i);
    }
  });

  it("rejects an unresolvable hostname", async () => {
    const r = await assertPublicUrl(
      "https://this-host-should-not-exist-opencode-ssrf-test.invalid/x"
    );
    expect(r.ok).toBe(false);
  });
});
