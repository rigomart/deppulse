# Deppulse

Quickly assess whether an open-source project is actively maintained. [deppulse.rigos.dev](https://deppulse.rigos.dev)

## Tech Stack

- **Next.js 16** — App Router, React 19, Cache Components, React Compiler
- **Neon PostgreSQL** — Serverless Postgres with Drizzle ORM
- **Workflow DevKit** — Durable background workflow execution
- **Tailwind CSS v4** — Radix UI primitives, CVA variants
- **Recharts / Three.js** — Data visualization and animated backgrounds
- **Vitest** — Unit testing
- **Biome** — Linting and formatting
- **Bun** — Package manager and runtime

## How It Works

A user pastes a GitHub URL or `owner/repo`. The app fetches repository data, scores it, and renders the result — all server-side.

**Data fetching** uses a single GitHub GraphQL query to pull repository metadata, issue metrics, releases, and README content. It also pulls light recent-activity counters (commits and merged PRs in the last 90 days) used by strictness rules.

**Scoring** uses a strict quality × freshness model:
- **Quality (0-100):** issue health, release cadence, community, maturity, and activity breadth.
- **Freshness multiplier (0-1):** based on days since latest commit, merged PR, or release.
- **Expected activity tiers (high/medium/low):** large or active repos are penalized harder when stale.
- **Hard caps:** high-expected repos with long inactivity windows cannot score above fixed ceilings.

Scores map to a category: Healthy, Moderate, Declining, or Inactive. Raw metrics are stored, and scores are always recalculated with the current scoring rules.

**Caching** uses Next.js 16 `"use cache"` directives at the page level with a 7-day TTL and tag-based invalidation. Once a project is analyzed, subsequent visits serve the cached result. When the cache expires, the page revalidates in the background while still serving stale content. Each analysis run is also persisted to the database so the homepage can show recent analyses without hitting GitHub.

## Project Structure

```
src/
├── app/                          # Pages and routing
│   ├── page.tsx                  # Homepage — search bar, recent analyses
│   ├── _components/              # Homepage-only components (underscore = not a route)
│   └── p/[owner]/[project]/      # Project analysis page, cached per repo
│       └── _components/          # Score display, charts, README renderer
├── components/                   # Shared across pages
│   └── ui/                       # Design system primitives (Radix + CVA)
├── core/                         # Domain and business rules
│   ├── assessment/               # Analysis orchestration and snapshot mapping
│   ├── maintenance/              # Score APIs + config consumed by UI
│   └── scoring/                  # Scoring engine (profiles, signals, quality, freshness)
├── db/                           # Drizzle schema and database client
├── adapters/                     # External integrations
│   ├── github/                   # GitHub GraphQL client + metrics mapping
│   └── persistence/              # Database adapters (repositories + analysis runs)
└── lib/
    ├── cache/                    # Cache lifecycle config, tag helpers, invalidation
    ├── domain/                   # Shared domain types
    └── utils/logger/parsing      # Shared helpers
migrations/                       # Auto-generated Drizzle SQL migrations, applied on deploy
```

## Getting Started

```bash
git clone https://github.com/rigomart9/deppulse.git
cd deppulse
bun install
```

Create `.env.local` with:

```env
DATABASE_URL=postgresql://...     # Neon connection string
GITHUB_PAT=ghp_...               # GitHub Personal Access Token

# Feature flags
ANALYSIS_V2_WRITE_PATH=true
ANALYSIS_V2_WORKFLOW=true
ANALYSIS_V2_POLLING=true
ANALYSIS_V2_READ_MODEL=true
ANALYSIS_V2_DIRECT_VISIT_FALLBACK=true

# Optional fallbacks / integration
ANALYSIS_V2_FALLBACK_RUNNER=false
ANALYSIS_V2_WORKFLOW_ENDPOINT=    # Optional external workflow endpoint
ANALYSIS_V2_WORKFLOW_TOKEN=       # Optional auth token
```

Set up the database and start the dev server:

```bash
bun run db:push    # Push schema to your Neon database
bun run dev        # Start at localhost:3000
```

## Scripts

```bash
bun run dev            # Start dev server
bun run build          # Production build
bun run check-types    # TypeScript type checking
bun run lint           # Lint and auto-fix with Biome
bun run test           # Run tests with Vitest
bun run test:ui        # Vitest UI dashboard
bun run test:coverage  # Test with coverage report

# Database
bun run db:generate    # Generate migrations from schema changes
bun run db:migrate     # Run pending migrations
bun run db:studio      # Open Drizzle Studio
bun run db:push        # Push schema directly (dev only)
```
