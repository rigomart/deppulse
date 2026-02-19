# Deppulse

Quickly assess whether an open-source project is actively maintained. [deppulse.rigos.dev](https://deppulse.rigos.dev)

## Tech Stack

- **Next.js 16** — App Router, React 19, React Compiler
- **Convex** — Reactive backend (database, actions, real-time queries)
- **Tailwind CSS v4** — Radix UI primitives, CVA variants
- **Recharts / Three.js** — Data visualization and animated backgrounds
- **Vitest** — Unit testing
- **Biome** — Linting and formatting
- **Bun** — Package manager and runtime

## How It Works

A user pastes a GitHub URL or `owner/repo`. The app fetches repository data from GitHub, scores it, and stores the result. The frontend renders the analysis using server-fetched initial data and real-time subscriptions for in-progress updates.

**Data fetching** uses a single GitHub GraphQL query to pull repository metadata, issue metrics, releases, and README content. Commit activity is fetched separately via REST with automatic retries (GitHub returns 202 while computing stats).

**Scoring** uses a strict quality × freshness model:
- **Quality (0-100):** issue health, release cadence, community, maturity, and activity breadth.
- **Freshness multiplier (0-1):** based on days since latest commit, merged PR, or release.
- **Expected activity tiers (high/medium/low):** large or active repos are penalized harder when stale.
- **Hard caps:** high-expected repos with long inactivity windows cannot score above fixed ceilings.

Scores map to a category: Healthy, Moderate, Declining, or Inactive. Raw metrics are stored and scores are always recalculated with the current scoring rules.

**Real-time updates** — the project page subscribes to analysis run changes. When commit activity completes asynchronously, the UI updates live without a page refresh.

## Project Structure

```
convex/                               # Backend (schema, actions, queries, mutations)
├── schema.ts                         # Database schema (repositories, analysisRuns)
├── analysis.ts                       # GitHub fetching action + commit activity retries
├── analysisRuns.ts                   # Queries and mutations for analysis runs
└── _shared/                          # Shared types, constants, mappers
src/
├── app/                              # Pages and routing
│   ├── page.tsx                      # Homepage — search bar, recent analyses
│   ├── _components/                  # Homepage-only components (underscore = not a route)
│   └── p/[owner]/[project]/          # Project analysis page
│       └── _components/              # Score display, charts, README renderer
├── components/                       # Shared across pages
│   └── ui/                           # Design system primitives (Radix + CVA)
├── core/                             # Domain and business rules
│   ├── assessment/                   # Snapshot mapping
│   ├── maintenance/                  # Score APIs + config consumed by UI
│   └── scoring/                      # Scoring engine (profiles, signals, quality, freshness)
├── adapters/                         # External integrations
│   └── github/                       # GitHub API client (GraphQL + REST)
└── lib/
    ├── domain/                       # Shared domain types
    └── utils/logger/parsing          # Shared helpers
```

## Getting Started

```bash
git clone https://github.com/rigomart9/deppulse.git
cd deppulse
bun install
```

Create `.env.local` with:

```env
CONVEX_DEPLOYMENT=dev:your-deployment  # From `npx convex dev`
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
GITHUB_PAT=ghp_...                     # GitHub Personal Access Token
```

Start the backend and frontend:

```bash
npx convex dev   # Start backend (separate terminal)
bun run dev      # Start Next.js at localhost:3000
```

## Scripts

```bash
bun run dev            # Start Next.js dev server
bun run build          # Production build
bun run check-types    # TypeScript type checking
bun run lint           # Lint and auto-fix with Biome
bun run test           # Run tests with Vitest
bun run test:ui        # Vitest UI dashboard
bun run test:coverage  # Test with coverage report

# Backend
npx convex dev         # Start dev backend
npx convex deploy      # Deploy backend to production
```
