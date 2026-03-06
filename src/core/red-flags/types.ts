export type RedFlagSeverity = "warning" | "critical";

export type RedFlagId =
  | "archived_repository"
  | "extended_inactivity"
  | "no_release_despite_commits"
  | "stale_pull_requests"
  | "no_issues_activity"
  | "no_releases_ever";

export interface RedFlag {
  id: RedFlagId;
  severity: RedFlagSeverity;
  title: string;
  description: string;
}
