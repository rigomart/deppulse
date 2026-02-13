import { describe, expect, it } from "vitest";
import {
  applyHardCaps,
  getCategoryFromScore,
  getFreshnessMultiplier,
} from "./freshness";
import { STRICT_BALANCED_PROFILE } from "./profiles";

describe("freshness rules", () => {
  it("applies tier-specific freshness multipliers at boundaries", () => {
    expect(getFreshnessMultiplier(30, "high", STRICT_BALANCED_PROFILE)).toBe(1);
    expect(getFreshnessMultiplier(31, "high", STRICT_BALANCED_PROFILE)).toBe(
      0.75,
    );
    expect(getFreshnessMultiplier(180, "high", STRICT_BALANCED_PROFILE)).toBe(
      0.35,
    );
    expect(getFreshnessMultiplier(181, "high", STRICT_BALANCED_PROFILE)).toBe(
      0.15,
    );

    expect(getFreshnessMultiplier(120, "medium", STRICT_BALANCED_PROFILE)).toBe(
      0.8,
    );
    expect(getFreshnessMultiplier(300, "low", STRICT_BALANCED_PROFILE)).toBe(
      0.5,
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
