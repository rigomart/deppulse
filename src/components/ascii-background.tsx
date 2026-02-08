"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import {
  readEnvironment,
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
