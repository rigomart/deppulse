"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import {
  type AsciiRuntimeEnvironment,
  shouldUseThreeAscii,
} from "@/lib/visual-runtime-guards";

const AsciiBackgroundThree = dynamic(
  () =>
    import("@/components/ascii-background-three").then(
      (mod) => mod.AsciiBackgroundThree,
    ),
  { ssr: false },
);

type AsciiRenderMode = "checking" | "three" | "hidden";

type NavigatorWithHints = Navigator & {
  connection?: {
    saveData?: boolean;
  };
  deviceMemory?: number;
};

function readEnvironment(): AsciiRuntimeEnvironment {
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

export function AsciiBackground() {
  const [mode, setMode] = useState<AsciiRenderMode>("checking");

  useEffect(() => {
    setMode(shouldUseThreeAscii(readEnvironment()) ? "three" : "hidden");
  }, []);

  if (mode !== "three") {
    return null;
  }

  return <AsciiBackgroundThree onUnavailable={() => setMode("hidden")} />;
}
