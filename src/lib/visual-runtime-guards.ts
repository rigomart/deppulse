export interface AsciiRuntimeEnvironment {
  isDesktop: boolean;
  prefersReducedMotion: boolean;
  isDocumentHidden: boolean;
  saveData: boolean | null;
  hardwareConcurrency: number | null;
  deviceMemory: number | null;
}

export interface WarmupMetrics {
  frameCount: number;
  durationMs: number;
  longFrameCount: number;
}

export function shouldUseThreeAscii(env: AsciiRuntimeEnvironment): boolean {
  if (!env.isDesktop) return false;
  if (env.prefersReducedMotion) return false;
  if (env.isDocumentHidden) return false;
  if (env.saveData === true) return false;
  if (env.hardwareConcurrency !== null && env.hardwareConcurrency < 4) {
    return false;
  }
  if (env.deviceMemory !== null && env.deviceMemory < 4) {
    return false;
  }
  return true;
}

type NavigatorWithHints = Navigator & {
  connection?: { saveData?: boolean };
  deviceMemory?: number;
};

export function readEnvironment(): AsciiRuntimeEnvironment {
  const nav = navigator as NavigatorWithHints;
  return {
    isDesktop: window.matchMedia("(min-width: 768px)").matches,
    prefersReducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)")
      .matches,
    isDocumentHidden: document.hidden,
    saveData: nav.connection?.saveData ?? null,
    hardwareConcurrency: navigator.hardwareConcurrency ?? null,
    deviceMemory: nav.deviceMemory ?? null,
  };
}

export function shouldFallbackFromWarmup(metrics: WarmupMetrics): boolean {
  if (metrics.longFrameCount >= 3) {
    return true;
  }

  if (metrics.durationMs <= 0 || metrics.frameCount <= 0) {
    return false;
  }

  const averageFps = metrics.frameCount / (metrics.durationMs / 1000);
  return averageFps < 24;
}
