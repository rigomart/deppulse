import {
  type AsciiRuntimeEnvironment,
  shouldFallbackFromWarmup,
  shouldUseThreeAscii,
} from "./visual-runtime-guards";

function makeEnvironment(
  overrides: Partial<AsciiRuntimeEnvironment> = {},
): AsciiRuntimeEnvironment {
  return {
    isDesktop: true,
    prefersReducedMotion: false,
    isDocumentHidden: false,
    saveData: false,
    hardwareConcurrency: 8,
    deviceMemory: 8,
    ...overrides,
  };
}

describe("shouldUseThreeAscii", () => {
  it("returns false on mobile-sized environments", () => {
    const env = makeEnvironment({ isDesktop: false });
    expect(shouldUseThreeAscii(env)).toBe(false);
  });

  it("returns false when reduced motion is preferred", () => {
    const env = makeEnvironment({ prefersReducedMotion: true });
    expect(shouldUseThreeAscii(env)).toBe(false);
  });

  it("returns false when save-data is enabled", () => {
    const env = makeEnvironment({ saveData: true });
    expect(shouldUseThreeAscii(env)).toBe(false);
  });

  it("returns false on low-core devices", () => {
    const env = makeEnvironment({ hardwareConcurrency: 2 });
    expect(shouldUseThreeAscii(env)).toBe(false);
  });

  it("returns false on low-memory devices", () => {
    const env = makeEnvironment({ deviceMemory: 2 });
    expect(shouldUseThreeAscii(env)).toBe(false);
  });

  it("returns true for eligible desktop environments", () => {
    expect(shouldUseThreeAscii(makeEnvironment())).toBe(true);
  });

  it("treats unknown hardware values as eligible", () => {
    const env = makeEnvironment({
      hardwareConcurrency: null,
      deviceMemory: null,
    });
    expect(shouldUseThreeAscii(env)).toBe(true);
  });
});

describe("shouldFallbackFromWarmup", () => {
  it("does not fallback when warmup has healthy fps and no long frames", () => {
    expect(
      shouldFallbackFromWarmup({
        frameCount: 45,
        durationMs: 1500,
        longFrameCount: 0,
      }),
    ).toBe(false);
  });

  it("falls back when average fps is below threshold", () => {
    expect(
      shouldFallbackFromWarmup({
        frameCount: 30,
        durationMs: 1500,
        longFrameCount: 0,
      }),
    ).toBe(true);
  });

  it("falls back when long frame bursts are detected", () => {
    expect(
      shouldFallbackFromWarmup({
        frameCount: 45,
        durationMs: 1500,
        longFrameCount: 3,
      }),
    ).toBe(true);
  });
});
