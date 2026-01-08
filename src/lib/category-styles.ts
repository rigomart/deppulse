/**
 * Shared category color styles for maintenance status badges.
 * Uses semantic status color tokens defined in globals.css.
 */
export const categoryColors = {
  healthy: "bg-status-healthy/15 text-status-healthy border-status-healthy/30",
  moderate:
    "bg-status-moderate/15 text-status-moderate border-status-moderate/30",
  declining:
    "bg-status-declining/15 text-status-declining border-status-declining/30",
  inactive:
    "bg-status-inactive/15 text-status-inactive border-status-inactive/30",
} as const;

export type CategoryKey = keyof typeof categoryColors;
