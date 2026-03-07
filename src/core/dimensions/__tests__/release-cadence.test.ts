import { describe, expect, it } from "vitest";
import { rateReleaseCadence } from "../release-cadence";
import { daysAgo, makeSnapshot, NOW } from "./fixtures";

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

    it("mature repo boundary: inactive at exactly 365 days old with no releases", () => {
      const result = rateReleaseCadence(
        makeSnapshot({
          releases: [],
          repositoryCreatedAt: daysAgo(365),
        }),
        NOW,
      );
      expect(result.level).toBe("inactive");
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

    it("weak when no releases and unknown repo age", () => {
      const result = rateReleaseCadence(
        makeSnapshot({
          releases: [],
          repositoryCreatedAt: null,
        }),
        NOW,
      );
      expect(result.level).toBe("weak");
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
