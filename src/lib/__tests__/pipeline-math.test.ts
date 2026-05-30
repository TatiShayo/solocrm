import { describe, it, expect } from "vitest";
import { totalPipeline, weightedPipeline, weightedPct, clampProbability } from "@/lib/pipeline-math";

describe("pipeline-math", () => {
  describe("totalPipeline", () => {
    it("sums deal values", () => {
      expect(totalPipeline([{ value: 100 }, { value: 200 }, { value: 50 }])).toBe(350);
    });

    it("returns 0 for empty array", () => {
      expect(totalPipeline([])).toBe(0);
    });
  });

  describe("weightedPipeline", () => {
    it("weights each deal by probability/100", () => {
      const deals = [
        { value: 100, probability: 50, status: "open" as const },
        { value: 200, probability: 25, status: "open" as const },
      ];
      expect(weightedPipeline(deals)).toBe(100 * 0.5 + 200 * 0.25);
    });

    it("returns 0 for empty array", () => {
      expect(weightedPipeline([])).toBe(0);
    });

    it("handles 100% probability", () => {
      const deals = [{ value: 500, probability: 100, status: "open" as const }];
      expect(weightedPipeline(deals)).toBe(500);
    });

    it("handles 0% probability", () => {
      const deals = [{ value: 500, probability: 0, status: "open" as const }];
      expect(weightedPipeline(deals)).toBe(0);
    });
  });

  describe("weightedPct", () => {
    it("calculates percentage of weighted vs total", () => {
      expect(weightedPct(50, 100)).toBe(50);
    });

    it("returns 0 when total is 0", () => {
      expect(weightedPct(100, 0)).toBe(0);
    });

    it("rounds to nearest integer", () => {
      expect(weightedPct(100, 300)).toBe(33);
    });
  });

  describe("clampProbability", () => {
    it("clamps above 100", () => {
      expect(clampProbability(150)).toBe(100);
    });

    it("clamps below 0", () => {
      expect(clampProbability(-10)).toBe(0);
    });

    it("passes through valid values", () => {
      expect(clampProbability(75)).toBe(75);
    });

    it("treats NaN/undefined as 0", () => {
      expect(clampProbability(NaN)).toBe(0);
      expect(clampProbability(undefined as unknown as number)).toBe(0);
    });
  });
});
