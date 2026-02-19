import "server-only";

function parseBooleanFlag(
  value: string | undefined,
  defaultValue: boolean,
): boolean {
  if (!value) return defaultValue;
  return value === "1" || value.toLowerCase() === "true";
}

export const featureFlags = {
  analysisV2WritePath: parseBooleanFlag(
    process.env.ANALYSIS_V2_WRITE_PATH,
    true,
  ),
  analysisV2Polling: parseBooleanFlag(process.env.ANALYSIS_V2_POLLING, true),
  analysisV2ReadModel: parseBooleanFlag(
    process.env.ANALYSIS_V2_READ_MODEL,
    true,
  ),
  analysisV2DirectVisitFallback: parseBooleanFlag(
    process.env.ANALYSIS_V2_DIRECT_VISIT_FALLBACK,
    true,
  ),
} as const;
