export type DimensionLevel = "strong" | "adequate" | "weak" | "inactive";

export type DimensionId =
  | "development-activity"
  | "issue-management"
  | "release-cadence";

export type DimensionResult = {
  dimension: DimensionId;
  level: DimensionLevel;
  inputs: Record<string, number | string | null>;
};

export type DimensionsOutput = {
  developmentActivity: DimensionResult;
  issueManagement: DimensionResult;
  releaseCadence: DimensionResult;
};
