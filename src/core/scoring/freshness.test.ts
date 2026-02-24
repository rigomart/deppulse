import { describe, expect, it } from "vitest";
import {
  applyHardCaps,
  getCategoryFromScore,
  getFreshnessMultiplier,
} from "./freshness";
import { STRICT_BALANCED_PROFILE } from "./profiles";

describe("freshness rules", () => {
  it("preserves anchor values and avoids large boundary jumps", () => {
    expect(getFreshnessMultiplier(30, "high", STRICT_BALANCED_PROFILE)).toBe(1);
    expect(getFreshnessMultiplier(90, "high", STRICT_BALANCED_PROFILE)).toBe(
      0.75,
    );
    expect(
      Math.abs(
        getFreshnessMultiplier(31, "high", STRICT_BALANCED_PROFILE) -
          getFreshnessMultiplier(30, "high", STRICT_BALANCED_PROFILE),
      ),
    ).toBeLessThanOrEqual(0.01);
    expect(
      Math.abs(
        getFreshnessMultiplier(91, "high", STRICT_BALANCED_PROFILE) -
          getFreshnessMultiplier(90, "high", STRICT_BALANCED_PROFILE),
      ),
    ).toBeLessThanOrEqual(0.01);

    expect(getFreshnessMultiplier(120, "medium", STRICT_BALANCED_PROFILE)).toBe(
      0.8,
    );
    expect(getFreshnessMultiplier(730, "low", STRICT_BALANCED_PROFILE)).toBe(
      0.2,
    );
  });

  it("keeps freshness monotonic with no cliff-like daily drops", () => {
    const tiers = ["high", "medium", "low"] as const;

    for (const tier of tiers) {
      const steps = STRICT_BALANCED_PROFILE.freshnessMultipliers[tier];
      const lastFiniteMaxDays = [...steps]
        .reverse()
        .find((step) => Number.isFinite(step.maxDays))?.maxDays;

      if (!lastFiniteMaxDays) continue;

      for (let day = 1; day <= lastFiniteMaxDays; day++) {
        const previous = getFreshnessMultiplier(
          day - 1,
          tier,
          STRICT_BALANCED_PROFILE,
        );
        const current = getFreshnessMultiplier(
          day,
          tier,
          STRICT_BALANCED_PROFILE,
        );
        expect(current).toBeLessThanOrEqual(previous);
        expect(previous - current).toBeLessThanOrEqual(0.03);
      }
    }
  });

  it("returns the floor multiplier when there is no recorded activity", () => {
    expect(getFreshnessMultiplier(null, "high", STRICT_BALANCED_PROFILE)).toBe(
      0.05,
    );
    expect(
      getFreshnessMultiplier(null, "medium", STRICT_BALANCED_PROFILE),
    ).toBe(0.08);
    expect(getFreshnessMultiplier(null, "low", STRICT_BALANCED_PROFILE)).toBe(
      0.1,
    );
  });

  it("enforces hard caps for high-expected stale repositories", () => {
    const cap180 = applyHardCaps(90, "high", 200, STRICT_BALANCED_PROFILE);
    const cap365 = applyHardCaps(90, "high", 500, STRICT_BALANCED_PROFILE);

    expect(cap180.score).toBe(35);
    expect(cap180.hardCapApplied).toBe(35);

    expect(cap365.score).toBe(20);
    expect(cap365.hardCapApplied).toBe(20);
  });

  it("does not cap medium and low expected repositories", () => {
    const medium = applyHardCaps(90, "medium", 500, STRICT_BALANCED_PROFILE);
    const low = applyHardCaps(90, "low", 500, STRICT_BALANCED_PROFILE);

    expect(medium).toEqual({ score: 90, hardCapApplied: null });
    expect(low).toEqual({ score: 90, hardCapApplied: null });
  });

  it("maps category boundaries correctly", () => {
    expect(getCategoryFromScore(24, STRICT_BALANCED_PROFILE)).toBe("inactive");
    expect(getCategoryFromScore(25, STRICT_BALANCED_PROFILE)).toBe("declining");
    expect(getCategoryFromScore(44, STRICT_BALANCED_PROFILE)).toBe("declining");
    expect(getCategoryFromScore(45, STRICT_BALANCED_PROFILE)).toBe("moderate");
    expect(getCategoryFromScore(69, STRICT_BALANCED_PROFILE)).toBe("moderate");
    expect(getCategoryFromScore(70, STRICT_BALANCED_PROFILE)).toBe("healthy");
  });
});
