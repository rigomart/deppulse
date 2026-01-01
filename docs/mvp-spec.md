# Deppulse — MVP Spec

## Problem

Developers adopt libraries that look healthy (stars, downloads, docs) but turn out to be abandoned. By the time they realize, they're locked into an unmaintained dependency with no path for bug fixes or updates.

**Example**: ts-rest looked great—good docs, active Discord, thousands of downloads. Seven months later, no merged PRs, no issue responses. Effectively dead, but nothing in the initial evaluation surfaced this.

## Objective

Let developers quickly assess whether a GitHub project is actively maintained before adopting it. Provide a clear risk category backed by transparent metrics.

**Success looks like**: Developer pastes a repo URL, gets an actionable assessment in under 10 seconds.

---

## Features

### 1. Repository Assessment

**Input**: GitHub URL or `owner/repo` shorthand

**Output**:
- Risk category (Active / Stable / At-Risk / Abandoned)
- Brief guidance text for the category
- Supporting metrics
- Timestamp of when assessment was generated

### 2. Metrics

| Metric | Description |
|--------|-------------|
| Days since last commit | How recently the codebase changed |
| Commits (90 days) | Development velocity |
| Days since last release | How recently a version shipped |
| Open issues % | Backlog health |
| Median issue resolution time | Responsiveness to problems |
| Open PRs count | Community contribution backlog |

### 3. Landing Page

- Search input
- Recently analyzed projects (last 10, showing repo name + category)

### 4. Results Page

- Repo name + link to GitHub
- Risk category with guidance text
- All metrics
- Assessment freshness indicator

---

## Risk Categories

| Category | Signals | Guidance |
|----------|---------|----------|
| **Active** | Recent commits, responsive to issues | Healthy maintenance. Monitor normally. |
| **Stable** | Moderate activity, no red flags | Maintained but quieter. May be mature. |
| **At-Risk** | Declining activity, growing backlog | Reduced maintenance. Evaluate alternatives. |
| **Abandoned** | No recent activity, unresponsive | Unmaintained. High risk for long-term use. |

---

## Out of Scope

- Package name input (npm/PyPI)
- Badges
- Dependency tree analysis
- User accounts
- Bot filtering on commits
- PR merge latency
- Public API

---

## Constraints

- No auth required for users
- Cached results return in <2s
- Fresh analysis completes in <15s
- Graceful handling when GitHub API is unavailable

---

## Decisions

| Question | Decision |
|----------|----------|
| Time window for "recent" activity | 90 days |
| Exclude enhancement/feature issues from resolution metrics | Yes—matches isitmaintained behavior |
| Recently analyzed count on landing page | 10 projects |
| Link to GitHub tabs from results | Yes—link to Issues, PRs, Commits tabs for transparency |

---

Anything you'd tweak before we move forward?