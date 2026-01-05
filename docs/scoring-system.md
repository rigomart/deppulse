# Maintenance Scoring System

Detailed documentation of how the maintenance score is calculated.

## Overview

The maintenance score is a 0-100 scale that evaluates how well-maintained a GitHub repository is. The score is calculated by summing points from four categories:

| Category | Weight | Description |
|----------|--------|-------------|
| Activity | 70 pts | Recent commits and commit volume |
| Responsiveness | 10 pts | Issue resolution time |
| Stability | 12 pts | Release cadence and project age |
| Community | 8 pts | Popularity (stars + forks) |

## Score Categories

Based on the final score, repositories are classified into categories:

| Category | Score Range | Meaning |
|----------|-------------|---------|
| Healthy | 70-100 | Actively maintained with strong engagement |
| Moderate | 45-69 | Adequately maintained, some areas need attention |
| Declining | 20-44 | Signs of declining maintenance |
| Inactive | 0-19 | No recent activity. Could be stable/feature-complete or unmaintained |

## Maturity Tiers

Before scoring, repositories are classified into maturity tiers which affect the thresholds used for Activity and Stability metrics:

| Tier | Criteria | Effect |
|------|----------|--------|
| Emerging | < 2 years old AND < 1k stars | Strictest thresholds (expects frequent activity) |
| Growing | 2-5 years OR 1k-10k stars | Moderate thresholds |
| Mature | 5+ years OR 10k+ stars | Relaxed thresholds (stable projects need less activity) |

**Classification logic:**
```
popularity = stars + (forks * 2)

if (age >= 5 years OR popularity >= 10,000) → mature
else if (age >= 2 years OR popularity >= 1,000) → growing
else → emerging
```

---

## Activity Category (70 points max)

Activity is weighted most heavily because no commits = not maintained.

### Last Commit (40 points max)

Scores how recently the repository received a commit.

**Scoring by maturity tier:**

| Points | Emerging | Growing | Mature |
|--------|----------|---------|--------|
| 40 (100%) | ≤ 30 days | ≤ 60 days | ≤ 120 days (4 mo) |
| 28 (70%) | ≤ 60 days | ≤ 120 days | ≤ 180 days (6 mo) |
| 16 (40%) | ≤ 120 days | ≤ 180 days | ≤ 365 days (1 yr) |
| 6 (15%) | ≤ 180 days | ≤ 365 days | ≤ 730 days (2 yr) |
| 0 | > 180 days | > 365 days | > 730 days |

**Special case:** `null` (no commits found) → 0 points

### Commit Volume (30 points max)

Scores the number of commits in the last 90 days.

**Scoring by maturity tier:**

| Points | Emerging | Growing | Mature |
|--------|----------|---------|--------|
| 30 (100%) | ≥ 30 commits | ≥ 20 commits | ≥ 10 commits |
| 20 (65%) | ≥ 10 commits | ≥ 5 commits | ≥ 3 commits |
| 9 (30%) | ≥ 3 commits | ≥ 1 commit | ≥ 1 commit |
| 0 | 0 commits | 0 commits | 0 commits |

---

## Responsiveness Category (10 points max)

Measures how well the project handles issues.

### Issue Resolution Time (10 points max)

Scores the median time to close issues (from issues closed in last 6 months).

| Points | Median Resolution Time |
|--------|----------------------|
| 10 (100%) | ≤ 7 days |
| 8 (80%) | ≤ 30 days |
| 5 (50%) | ≤ 90 days |
| 3 (25%) | ≤ 180 days |
| 0 | > 180 days or no data |

**Special case:** `null` (no recently closed issues) → 0 points

---

## Stability Category (12 points max)

Measures release cadence and project maturity.

### Release Recency (7 points max)

Scores how recently the project published a release.

**Scoring by maturity tier:**

| Points | Emerging | Growing | Mature |
|--------|----------|---------|--------|
| 7 (100%) | ≤ 60 days | ≤ 90 days | ≤ 180 days (6 mo) |
| 5 (65%) | ≤ 120 days | ≤ 180 days | ≤ 365 days (1 yr) |
| 2 (30%) | ≤ 180 days | ≤ 365 days | ≤ 730 days (2 yr) |
| 0 | > 180 days | > 365 days | > 730 days |

**Special case:** `null` (no releases) → 0 points

### Project Age (5 points max)

Scores how long the project has existed. Older projects are considered more proven.

| Points | Age |
|--------|-----|
| 5 (100%) | ≥ 5 years |
| 4 (80%) | ≥ 3 years |
| 3 (50%) | ≥ 1 year |
| 1 (25%) | ≥ 6 months |
| 0 (10%) | < 6 months |

**Special case:** `null` (unknown age) → 3 points (50%)

---

## Community Category (8 points max)

Measures community engagement through popularity.

### Popularity (8 points max)

Scores based on stars and forks combined.

```
popularity = stars + (forks * 2)
```

| Points | Popularity Score |
|--------|-----------------|
| 8 (100%) | ≥ 50,000 |
| 7 (85%) | ≥ 10,000 |
| 6 (70%) | ≥ 1,000 |
| 4 (50%) | ≥ 100 |
| 2 (30%) | ≥ 10 |
| 1 (10%) | < 10 |

---

## Special Cases

### Archived Repositories

Archived repositories always score **0 points** and are categorized as **inactive**, regardless of other metrics.

---

## Example: Stitches Scoring Breakdown

Repository: `stitchesjs/stitches`
- 930 days since last commit
- 0 commits in 90 days
- No recently closed issues (null resolution time)
- 1350 days since last release
- Created April 2020 (~4.7 years old)
- 7805 stars, 261 forks

**Maturity Tier:** Growing (popularity = 8327, which is > 1000)

**Activity (70 max):**
- Last Commit: 930 days > 365 days (growing tier) → 6 pts (15%)
- Commit Volume: 0 commits → 0 pts
- **Subtotal: 6 points**

**Responsiveness (10 max):**
- Issue Resolution: null → 0 pts
- **Subtotal: 0 points**

**Stability (12 max):**
- Release Recency: 1350 days > 365 days (growing tier) → 0 pts
- Project Age: ~4.7 years ≥ 3 years → 4 pts (80%)
- **Subtotal: 4 points**

**Community (8 max):**
- Popularity: 8327 ≥ 1000 → 6 pts (70%)
- **Subtotal: 6 points**

**Total: 6 + 0 + 4 + 6 = 16 points → Inactive**

---

## Removed Metrics

The following metrics were removed because they gave "free points" to inactive projects:

| Metric | Problem |
|--------|---------|
| Open Issues % | Low % could mean no users, not good maintenance |
| Issue Velocity | Low velocity rewards stale projects, penalizes popular ones |
| Open PRs | Few PRs could mean no contributors, not good PR management |

---

## Configuration Reference

All thresholds and weights are defined in `src/lib/maintenance-config.ts`:

```typescript
export const MAINTENANCE_CONFIG: MaintenanceConfig = {
  categoryThresholds: {
    healthy: 70,
    moderate: 45,
    atRisk: 20,
  },

  weights: {
    activity: { total: 70, lastCommit: 40, commitVolume: 30 },
    responsiveness: { total: 10, issueResolution: 10 },
    stability: { total: 12, releaseRecency: 7, projectAge: 5 },
    community: { total: 8, popularity: 8 },
  },

  maturityTiers: {
    emerging: { commitDays: [30, 60, 120, 180], commitVolume: [30, 10, 3], releaseDays: [60, 120, 180] },
    growing: { commitDays: [60, 120, 180, 365], commitVolume: [20, 5, 1], releaseDays: [90, 180, 365] },
    mature: { commitDays: [120, 180, 365, 730], commitVolume: [10, 3, 1], releaseDays: [180, 365, 730] },
  },

  // ... additional thresholds
};
```
