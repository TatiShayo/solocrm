import { describe, it, expect } from "vitest";
import { buildStageIndex, isWonDeal, isLostDeal } from "../lib/stage-identity";
import type { Deal } from "../lib/db";

const stages = [
  { id: "s1", name: "Lead" },
  { id: "s2", name: "Contacted" },
  { id: "s3", name: "Won" },
  { id: "s4", name: "Lost" },
];

const index = buildStageIndex(stages);

const deal = (over: Partial<Deal>): Deal =>
  ({ id: "d", title: "t", value: 1, stage_id: "s1", won_at: null, lost_at: null, ...over }) as Deal;

describe("stage-identity", () => {
  it("resolves won/lost by name, not by hardcoded id", () => {
    expect(index.wonIds.has("s3")).toBe(true);
    expect(index.lostIds.has("s4")).toBe(true);
    expect(index.wonIds.size).toBe(1);
    expect(index.lostIds.size).toBe(1);
  });

  it("is case- and whitespace-insensitive", () => {
    const i = buildStageIndex([
      { id: "a", name: "  WON  " },
      { id: "b", name: "Closed Lost" },
      { id: "c", name: "closed_won" },
    ]);
    expect(i.wonIds.has("a")).toBe(true);
    expect(i.wonIds.has("c")).toBe(true);
    expect(i.lostIds.has("b")).toBe(true);
  });

  it("marks a deal won when it sits in a UUID-identified won stage", () => {
    // The regression: real signups get randomUUID() stage ids, so
    // `stage_id === 'stage-won'` never matched and every win-rate figure was 0.
    const d = deal({ stage_id: "9f1c2e44-aaaa-bbbb-cccc-000000000001" });
    const uuidIndex = buildStageIndex([
      { id: "lead", name: "Lead" },
      { id: "9f1c2e44-aaaa-bbbb-cccc-000000000001", name: "Won" },
      { id: "lost", name: "Lost" },
    ]);
    expect(isWonDeal(d, uuidIndex)).toBe(true);
    expect(isWonDeal(d)).toBe(false); // legacy literal
    expect(isLostDeal(d, uuidIndex)).toBe(false);
  });

  it("prefers explicit timestamps over stage position", () => {
    const d = deal({ stage_id: "lead", won_at: "2026-01-01T00:00:00Z" });
    expect(isWonDeal(d, index)).toBe(true);
    expect(isLostDeal(d, index)).toBe(false);
  });

  it("returns false for open deals", () => {
    const d = deal({ stage_id: "s2" });
    expect(isWonDeal(d, index)).toBe(false);
    expect(isLostDeal(d, index)).toBe(false);
  });

  it("handles an empty or missing stage list without throwing", () => {
    expect(buildStageIndex(undefined).wonIds.size).toBe(0);
    expect(buildStageIndex(null).lostIds.size).toBe(0);
    expect(isWonDeal(deal({ stage_id: "s3" }), buildStageIndex([]))).toBe(false);
  });
});
