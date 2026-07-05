import { describe, it, expect } from "vitest";
import { calculateScheduledAt } from "@/lib/sequence-scheduling";

describe("sequence-scheduling", () => {
  it("adds delay_days to current date", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    const result = calculateScheduledAt(3, now);
    expect(result.toISOString()).toBe("2026-01-04T00:00:00.000Z");
  });

  it("handles 0 delay days", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    const result = calculateScheduledAt(0, now);
    expect(result.toISOString()).toBe("2026-01-01T00:00:00.000Z");
  });

  it("uses current time when no fromDate provided", () => {
    const before = Date.now();
    const result = calculateScheduledAt(0);
    expect(result.getTime()).toBeGreaterThanOrEqual(before);
  });

  it("handles large delays", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    const result = calculateScheduledAt(365, now);
    expect(result.toISOString()).toBe("2027-01-01T00:00:00.000Z");
  });
});
