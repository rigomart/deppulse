# AGENTS.md

This file provides guidance to AI Agents when working with code in this repository.

## Commands

```bash
bun run dev          # Start dev server
bun run build        # Production build
bun run check-types  # TypeScript type checking
bun run lint         # Lint and auto-fix with Biome
bun run test         # Run tests with Vitest
bun run test:ui      # Run tests with Vitest UI
bun run test -- src/lib/risk.test.ts  # Run a single test file

# Database (Drizzle + Neon)
bun run db:push      # Push schema to database
bun run db:generate  # Generate migrations
bun run db:migrate   # Run migrations
bun run db:studio    # Open Drizzle Studio
```

## Environment Variables

Required in `.env.local`:
- `DATABASE_URL` - Neon PostgreSQL connection string
- `GITHUB_PAT` - GitHub Personal Access Token for API access

## Architecture

**Deppulse** analyzes GitHub repositories and provides maintenance risk assessments (Active, Stable, At-Risk, Abandoned).

### Data Flow

1. User enters repo URL → `parseRepoUrl()` extracts owner/repo (`src/lib/parse-repo.ts`)
2. Server action `analyze()` orchestrates the analysis (`src/actions/analyze.ts`)
3. `fetchRepoMetrics()` fetches GitHub data via Octokit (`src/lib/github.ts`)
4. `calculateRisk()` computes risk score and category (`src/lib/risk.ts`)
5. Results stored in `assessments` table with upsert (`src/db/schema.ts`)
6. Cache invalidation via Next.js `updateTag()` for granular revalidation

### Key Modules

- **`src/lib/risk.ts`**: Risk scoring algorithm. Weighs: commit recency (30pts max), commit volume (20pts), release recency (15pts), open issues ratio (15pts), issue resolution time (10pts), open PRs (10pts). Lower score = healthier.
- **`src/lib/github.ts`**: GitHub API client with `RepoMetrics` interface. Fetches repo info, commits (90d window), releases, issues, and PRs in parallel.
- **`src/lib/data.ts`**: Cached database queries using `unstable_cache` with 24hr TTL and tag-based invalidation.
- **`src/db/`**: Drizzle ORM with Neon serverless driver. Single `assessments` table.

### Tech Stack

- Next.js 16 with React Compiler enabled
- Bun runtime
- Drizzle ORM + Neon PostgreSQL
- Biome for linting/formatting
- Vitest for testing
- Tailwind CSS v4 + Radix UI components
