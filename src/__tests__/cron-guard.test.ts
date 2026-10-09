import { describe, it, expect, afterEach } from "vitest";
import { cronSecretMatches, requireCron } from "../lib/cron-guard";

function req(auth: string | null): Request {
  return new Request("https://x.test/cron", {
    headers: auth === null ? {} : { authorization: auth },
  });
}

describe("cronSecretMatches", () => {
  const SECRET = "super-secret-cron-token";

  it("accepts the correct bearer token", () => {
    expect(cronSecretMatches(`Bearer ${SECRET}`, SECRET)).toBe(true);
  });

  it("rejects a wrong token", () => {
    expect(cronSecretMatches("Bearer nope", SECRET)).toBe(false);
  });

  it("rejects a token missing the Bearer prefix", () => {
    expect(cronSecretMatches(SECRET, SECRET)).toBe(false);
  });

  it("rejects when either side is missing", () => {
    expect(cronSecretMatches(null, SECRET)).toBe(false);
    expect(cronSecretMatches(`Bearer ${SECRET}`, undefined)).toBe(false);
    expect(cronSecretMatches("", SECRET)).toBe(false);
    expect(cronSecretMatches(`Bearer ${SECRET}`, "")).toBe(false);
  });

  it("rejects a length-mismatched token rather than throwing", () => {
    // timingSafeEqual requires equal buffers; the guard must not leak that.
    expect(cronSecretMatches("Bearer x", SECRET)).toBe(false);
    expect(cronSecretMatches("Bearer " + "x".repeat(500), SECRET)).toBe(false);
  });

  it("rejects an empty-string secret even with an empty bearer", () => {
    // A stray CRON_SECRET="" in the environment must not open the endpoint.
    expect(cronSecretMatches("Bearer ", "")).toBe(false);
  });
});

describe("requireCron", () => {
  const original = process.env.CRON_SECRET;
  afterEach(() => {
    if (original === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = original;
  });

  it("returns null when authorised", () => {
    process.env.CRON_SECRET = "tok";
    expect(requireCron(req("Bearer tok"))).toBeNull();
  });

  it("returns 401 when unauthorised", () => {
    process.env.CRON_SECRET = "tok";
    const res = requireCron(req("Bearer wrong"));
    expect(res).not.toBeNull();
    expect(res!.status).toBe(401);
  });

  it("fails closed with 503 when the secret is unset", () => {
    delete process.env.CRON_SECRET;
    const res = requireCron(req("Bearer anything"));
    expect(res).not.toBeNull();
    expect(res!.status).toBe(503);
  });

  it("rejects a missing Authorization header", () => {
    process.env.CRON_SECRET = "tok";
    const res = requireCron(req(null));
    expect(res).not.toBeNull();
    expect(res!.status).toBe(401);
  });
});
