export const dimensionLevelColors = {
  strong: "bg-status-healthy/15 text-status-healthy border-status-healthy/30",
  adequate:
    "bg-status-moderate/15 text-status-moderate border-status-moderate/30",
  weak: "bg-status-declining/15 text-status-declining border-status-declining/30",
  inactive:
    "bg-status-inactive/15 text-status-inactive border-status-inactive/30",
} as const;

export const dimensionLevelFillColors = {
  strong: "bg-status-healthy",
  adequate: "bg-status-moderate",
  weak: "bg-status-declining",
  inactive: "bg-status-inactive",
} as const;

export const confidenceColors = {
  high: "bg-status-healthy/15 text-status-healthy border-status-healthy/30",
  medium:
    "bg-status-moderate/15 text-status-moderate border-status-moderate/30",
  low: "bg-status-declining/15 text-status-declining border-status-declining/30",
} as const;
