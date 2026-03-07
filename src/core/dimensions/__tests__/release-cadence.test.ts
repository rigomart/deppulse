import { describe, expect, it } from "vitest";
import type { MetricsSnapshot } from "@/lib/domain/assessment";
import { rateReleaseCadence } from "../release-cadence";

const NOW = new Date("2026-02-13T00:00:00.000Z");
const DAY_MS = 24 * 60 * 60 * 1000;

function daysAgo(days: number): string {
  return new Date(NOW.getTime() - days * DAY_MS).toISOString();
}

function makeSnapshot(
  overrides: Partial<MetricsSnapshot> = {},
): MetricsSnapshot {
  return {
    description: "A test repo",
    stars: 700,
    forks: 100,
    avatarUrl: "",
    htmlUrl: "",
    license: "MIT",
    language: "TypeScript",
    repositoryCreatedAt: "2020-01-01T00:00:00.000Z",
    isArchived: false,
    lastCommitAt: daysAgo(3),
    lastReleaseAt: daysAgo(30),
    lastClosedIssueAt: daysAgo(10),
    lastMergedPrAt: daysAgo(5),
    openIssuesPercent: 20,
    openIssuesCount: 20,
    closedIssuesCount: 80,
    medianIssueResolutionDays: 9,
    openPrsCount: 3,
    issuesCreatedLastYear: 14,
    commitsLast90Days: 10,
    mergedPrsLast90Days: 6,
    releases: [{ tagName: "v1.0.0", name: "v1.0.0", publishedAt: daysAgo(30) }],
    ...overrides,
  };
}

describe("rateReleaseCadence", () => {
  it("rates strong with frequent recent releases", () => {
    const result = rateReleaseCadence(
      makeSnapshot({
        releases: [
          { tagName: "v1.0", name: null, publishedAt: daysAgo(10) },
          { tagName: "v0.9", name: null, publishedAt: daysAgo(80) },
          { tagName: "v0.8", name: null, publishedAt: daysAgo(150) },
          { tagName: "v0.7", name: null, publishedAt: daysAgo(250) },
          { tagName: "v0.6", name: null, publishedAt: daysAgo(340) },
        ],
      }),
      NOW,
    );
    expect(result.level).toBe("strong");
  });

  it("requires BOTH frequency AND recency for strong", () => {
    // 4 releases in last year but most recent is 100 days ago
    const result = rateReleaseCadence(
      makeSnapshot({
        releases: [
          { tagName: "v1.0", name: null, publishedAt: daysAgo(100) },
          { tagName: "v0.9", name: null, publishedAt: daysAgo(150) },
          { tagName: "v0.8", name: null, publishedAt: daysAgo(250) },
          { tagName: "v0.7", name: null, publishedAt: daysAgo(340) },
        ],
      }),
      NOW,
    );
    expect(result.level).toBe("adequate");
  });

  it("rates adequate with at least 1 release in the last year", () => {
    const result = rateReleaseCadence(
      makeSnapshot({
        releases: [{ tagName: "v1.0", name: null, publishedAt: daysAgo(200) }],
      }),
      NOW,
    );
    expect(result.level).toBe("adequate");
  });

  it("rates adequate with recent release even if only one", () => {
    const result = rateReleaseCadence(
      makeSnapshot({
        releases: [{ tagName: "v1.0", name: null, publishedAt: daysAgo(100) }],
      }),
      NOW,
    );
    expect(result.level).toBe("adequate");
  });

  it("rates inactive with no releases and mature repo", () => {
    const result = rateReleaseCadence(
      makeSnapshot({
        releases: [],
        repositoryCreatedAt: "2020-01-01T00:00:00.000Z",
      }),
      NOW,
    );
    expect(result.level).toBe("inactive");
  });

  it("rates weak with only old releases (under 2 years)", () => {
    const result = rateReleaseCadence(
      makeSnapshot({
        releases: [{ tagName: "v0.1", name: null, publishedAt: daysAgo(500) }],
      }),
      NOW,
    );
    expect(result.level).toBe("weak");
  });

  it("rates inactive with last release over 2 years ago", () => {
    const result = rateReleaseCadence(
      makeSnapshot({
        releases: [{ tagName: "v0.1", name: null, publishedAt: daysAgo(800) }],
      }),
      NOW,
    );
    expect(result.level).toBe("inactive");
  });

  it("rates adequate for young repo with no releases", () => {
    const result = rateReleaseCadence(
      makeSnapshot({
        releases: [],
        repositoryCreatedAt: daysAgo(200), // ~0.5 years old
      }),
      NOW,
    );
    expect(result.level).toBe("adequate");
  });

  it("includes relevant inputs in the result", () => {
    const result = rateReleaseCadence(
      makeSnapshot({
        releases: [
          { tagName: "v1.0", name: null, publishedAt: daysAgo(30) },
          { tagName: "v0.9", name: null, publishedAt: daysAgo(200) },
        ],
      }),
      NOW,
    );
    expect(result.inputs.totalReleases).toBe(2);
    expect(result.inputs.releasesLastYear).toBe(2);
    expect(result.inputs.daysSinceLastRelease).toBe(30);
  });

  describe("boundary conditions", () => {
    it("strong at exactly 4 releases and 90 days since last", () => {
      const result = rateReleaseCadence(
        makeSnapshot({
          releases: [
            { tagName: "v1.3", name: null, publishedAt: daysAgo(90) },
            { tagName: "v1.2", name: null, publishedAt: daysAgo(180) },
            { tagName: "v1.1", name: null, publishedAt: daysAgo(270) },
            { tagName: "v1.0", name: null, publishedAt: daysAgo(350) },
          ],
        }),
        NOW,
      );
      expect(result.level).toBe("strong");
    });

    it("adequate at exactly 180 days since last release", () => {
      const result = rateReleaseCadence(
        makeSnapshot({
          releases: [
            { tagName: "v1.0", name: null, publishedAt: daysAgo(180) },
            { tagName: "v0.9", name: null, publishedAt: daysAgo(500) },
          ],
        }),
        NOW,
      );
      expect(result.level).toBe("adequate");
    });

    it("weak at 181 days with no releases in last year", () => {
      const result = rateReleaseCadence(
        makeSnapshot({
          releases: [
            { tagName: "v1.0", name: null, publishedAt: daysAgo(400) },
          ],
        }),
        NOW,
      );
      expect(result.level).toBe("weak");
    });

    it("young repo boundary: adequate at 364 days old with no releases", () => {
      const result = rateReleaseCadence(
        makeSnapshot({
          releases: [],
          repositoryCreatedAt: daysAgo(364),
        }),
        NOW,
      );
      expect(result.level).toBe("adequate");
    });

    it("mature repo boundary: inactive at 366 days old with no releases", () => {
      const result = rateReleaseCadence(
        makeSnapshot({
          releases: [],
          repositoryCreatedAt: daysAgo(366),
        }),
        NOW,
      );
      expect(result.level).toBe("inactive");
    });

    it("weak at exactly 730 days since last release", () => {
      const result = rateReleaseCadence(
        makeSnapshot({
          releases: [
            { tagName: "v0.1", name: null, publishedAt: daysAgo(730) },
          ],
        }),
        NOW,
      );
      expect(result.level).toBe("weak");
    });

    it("inactive at 731 days since last release", () => {
      const result = rateReleaseCadence(
        makeSnapshot({
          releases: [
            { tagName: "v0.1", name: null, publishedAt: daysAgo(731) },
          ],
        }),
        NOW,
      );
      expect(result.level).toBe("inactive");
    });
  });
});
