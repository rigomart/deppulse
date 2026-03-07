import { describe, expect, it } from "vitest";
import { rateIssueManagement } from "../issue-management";
import { daysAgo, makeSnapshot, NOW } from "./fixtures";

describe("rateIssueManagement", () => {
  it("rates strong with low open ratio and fast resolution", () => {
    const result = rateIssueManagement(
      makeSnapshot({ openIssuesPercent: 15, medianIssueResolutionDays: 7 }),
      NOW,
    );
    expect(result.level).toBe("strong");
  });

  it("requires BOTH low open ratio AND fast resolution for strong", () => {
    const result = rateIssueManagement(
      makeSnapshot({ openIssuesPercent: 15, medianIssueResolutionDays: 20 }),
      NOW,
    );
    expect(result.level).toBe("adequate");
  });

  it("rates adequate with moderate open ratio", () => {
    const result = rateIssueManagement(
      makeSnapshot({ openIssuesPercent: 40, medianIssueResolutionDays: 60 }),
      NOW,
    );
    expect(result.level).toBe("adequate");
  });

  it("rates adequate with moderate resolution time", () => {
    const result = rateIssueManagement(
      makeSnapshot({ openIssuesPercent: 70, medianIssueResolutionDays: 20 }),
      NOW,
    );
    expect(result.level).toBe("adequate");
  });

  it("rates weak with high open ratio and slow resolution", () => {
    const result = rateIssueManagement(
      makeSnapshot({ openIssuesPercent: 80, medianIssueResolutionDays: 60 }),
      NOW,
    );
    expect(result.level).toBe("weak");
  });

  it("rates adequate when no issues exist at all", () => {
    const result = rateIssueManagement(
      makeSnapshot({
        openIssuesCount: 0,
        closedIssuesCount: 0,
        openIssuesPercent: null,
        medianIssueResolutionDays: null,
      }),
      NOW,
    );
    expect(result.level).toBe("adequate");
  });

  it("rates inactive when issues exist but none ever closed", () => {
    const result = rateIssueManagement(
      makeSnapshot({
        openIssuesCount: 10,
        closedIssuesCount: 0,
        openIssuesPercent: null,
        medianIssueResolutionDays: null,
        lastClosedIssueAt: null,
      }),
      NOW,
    );
    expect(result.level).toBe("inactive");
  });

  it("includes relevant inputs in the result", () => {
    const result = rateIssueManagement(
      makeSnapshot({
        openIssuesPercent: 20,
        medianIssueResolutionDays: 9,
        openIssuesCount: 20,
        closedIssuesCount: 80,
        lastClosedIssueAt: daysAgo(10),
      }),
      NOW,
    );
    expect(result.inputs.openIssuesPercent).toBe(20);
    expect(result.inputs.medianResolutionDays).toBe(9);
    expect(result.inputs.daysSinceLastClosed).toBe(10);
  });

  describe("boundary conditions", () => {
    it("strong at exactly 25% open and 14 day resolution", () => {
      const result = rateIssueManagement(
        makeSnapshot({
          openIssuesPercent: 25,
          medianIssueResolutionDays: 14,
        }),
        NOW,
      );
      expect(result.level).toBe("strong");
    });

    it("adequate at exactly 50% open", () => {
      const result = rateIssueManagement(
        makeSnapshot({
          openIssuesPercent: 50,
          medianIssueResolutionDays: 60,
        }),
        NOW,
      );
      expect(result.level).toBe("adequate");
    });

    it("adequate at exactly 30 day resolution", () => {
      const result = rateIssueManagement(
        makeSnapshot({
          openIssuesPercent: 80,
          medianIssueResolutionDays: 30,
        }),
        NOW,
      );
      expect(result.level).toBe("adequate");
    });

    it("weak at 51% open and 31 day resolution", () => {
      const result = rateIssueManagement(
        makeSnapshot({
          openIssuesPercent: 51,
          medianIssueResolutionDays: 31,
        }),
        NOW,
      );
      expect(result.level).toBe("weak");
    });
  });
});
