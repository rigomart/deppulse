# AGENTS.md

Guidance for AI agents working with this codebase.

## Commands

```bash
bun run dev          # Start Next.js dev server
bun run build        # Production build
bun run check-types  # TypeScript type checking
bun run lint         # Lint and auto-fix with Biome
bun run test         # Run tests with Vitest
bun run test:ui      # Run tests with Vitest UI
bun run test -- src/lib/maintenance.test.ts  # Run a single test file

# Backend
npx convex dev       # Start backend (run alongside Next.js)
npx convex deploy    # Deploy backend to production
```

## Deployment

**Stack**: Vercel + Convex

### How it works
- **Production**: Vercel build command runs `bunx convex deploy --cmd 'bun run build'`, deploying backend functions then building Next.js
- **Dashboard**: Backend functions, data, and logs are managed via the Convex dashboard

### Environment Variables
Required on Vercel:
- `CONVEX_DEPLOY_KEY` — Deploy key for production
- `GITHUB_PAT` — GitHub Personal Access Token for API access

Auto-configured:
- `NEXT_PUBLIC_CONVEX_URL` — Backend URL for client queries

## Environment Variables

Required in `.env.local` for local development:
- `CONVEX_DEPLOYMENT` — Backend deployment identifier (set by `npx convex dev`)
- `NEXT_PUBLIC_CONVEX_URL` — Backend URL
- `GITHUB_PAT` — GitHub Personal Access Token for API access

## Server-First Architecture

**This application prioritizes server-side rendering for performance.**

### When to use Server Components (default)
- Data fetching via `fetchQuery` from `convex/nextjs`
- Static content display
- Components that don't need interactivity
- Pages and layouts

### When to use Client Components (`"use client"`)
Only when you need:
- React hooks (`useState`, `useEffect`, `useTransition`, `useRouter`)
- Real-time queries (`useQuery` for live subscriptions)
- Backend actions (`useAction` for triggering server functions)
- Browser APIs or event handlers
- Time-relative rendering (`formatDistanceToNow`, `Date.now()`)
- Radix UI primitives that require client-side JS

## Architecture

### Data Flow

```
User Input → parseProject() → analyzeProject action → mutations → render via queries
```

1. `src/lib/parse-project.ts` — Validates and extracts owner/project from URL or shorthand
2. `convex/analysis.ts` — `analyzeProject` action: fetches GitHub metrics, upserts repository, creates analysis run
3. `convex/analysisRuns.ts` — Queries (`getByRepositorySlug`, `listRecentCompleted`) and mutations for run lifecycle
4. `convex/_shared/mappers.ts` — Maps backend documents to flat shapes for the Next.js layer
5. `src/core/maintenance/` — Computes maintenance score (0-100) and category
6. `src/core/scoring/` — Scoring engine: quality signals, freshness multiplier, activity profiles

### Real-Time Updates

The project page uses a hybrid approach:
- **Server**: `fetchQuery` for initial data (SSR)
- **Client**: `useQuery` subscribes to live updates (commit activity progress, retries)

When an action completes asynchronously (e.g., commit activity retries), the subscription pushes updates to the client automatically.

### Key Modules

| Module | Purpose |
|--------|---------|
| `convex/analysis.ts` | GitHub API fetching action. Fetches metrics via GraphQL, commit activity via REST with retries. |
| `convex/analysisRuns.ts` | Queries and mutations for analysis runs. `startOrReuse` handles deduplication and freshness checks. |
| `convex/_shared/mappers.ts` | Maps repository + analysis run documents to flat domain shapes. |
| `convex/_shared/constants.ts` | Retry delays, freshness thresholds, terminal state checks. |
| `src/core/maintenance/` | Maintenance scoring algorithm. Categories: healthy (70+), moderate (45-69), at-risk (20-44), unmaintained (0-19). |
| `src/core/scoring/` | Scoring engine: quality × freshness model with activity profiles and hard caps. |
| `src/adapters/github/` | GitHub API client (modular). Used by server components for adapter-layer concerns. |
| `src/lib/logger.core.ts` | Structured logger for external API calls with duration and rate limit tracking. |

### Directory Structure

```
convex/                   # Backend (schema, actions, queries, mutations)
├── _shared/              # Shared types, constants, mappers
└── src/
    ├── app/              # Next.js App Router pages
    │   ├── _components/  # Homepage components
    │   └── p/[owner]/[project]/  # Dynamic project page
    ├── components/       # Shared UI components
    │   └── ui/           # Design system primitives (Radix + CVA)
    ├── core/             # Domain and business rules
    │   ├── assessment/   # Snapshot mapping
    │   ├── maintenance/  # Score computation + config
    │   └── scoring/      # Scoring engine (quality, freshness, profiles)
    ├── adapters/         # External integrations
    │   └── github/       # GitHub API client
    └── lib/
        ├── domain/       # Shared domain types (assessment, repository, score)
        └── ...           # Utils, logger, parsing
```

## Code Conventions

### Component Organization
- Page-specific components: `app/[route]/_components/` (underscore prefix)
- Design system components: `components/ui/` (Radix wrappers with CVA variants)
- Shared components: `components/` (Container, Header)

### Naming
- Components: PascalCase, named exports (`export function SearchForm`)
- Files: kebab-case (`search-form.tsx`, `parse-repo.ts`)
- TypeScript properties: camelCase (`analyzedAt`)

### Styling
- Tailwind CSS v4 with CSS variables (OKLch color space)
- Use semantic tokens: `bg-surface-2`, `text-muted-foreground`
- CVA for component variants (see `components/ui/button.tsx`)
- Mobile-first responsive: `text-2xl sm:text-3xl md:text-4xl`

## Testing

Tests in `*.test.ts` files alongside source. Run with `bun run test`.

### Guidelines

- **Test behavior, not implementation** — Tests should verify what the code does, not how it does it
- **Purpose is regression prevention** — Tests catch unintended changes when refactoring
- **Use realistic scenarios** — Describe real situations in test names, not arbitrary boundaries
- **Keep tests focused** — One concept per test, avoid testing multiple behaviors together
- **Handle edge cases** — Test null values, empty inputs, and boundary conditions
- **Allow valid ambiguity** — For borderline cases: `expect(["a", "b"]).toContain(result)`

## Instructions for AI

**Server-first mindset:**
- Default to server components — only add `"use client"` when hooks, `useQuery`, or `Date.now()` are needed
- Use `fetchQuery` from `convex/nextjs` for server-side data fetching
- Use `useQuery` from `convex/react` for real-time client subscriptions

**Backend patterns (Convex):**
- Actions (`action`/`internalAction`) for external API calls (GitHub)
- Mutations (`internalMutation`) for database writes
- Queries (`query`/`internalQuery`) for reads — these are reactive
- Use `ctx.scheduler.runAfter` for delayed/retry work
- Schema is in `convex/schema.ts` — modify there for data model changes

**Code quality:**
- Assume dev server is already running
- Avoid `any` or explicit type assertions
- Use existing patterns from `src/core/` and `src/lib/` for new utilities
- Run `bun run check-types` before committing
- Prefer editing existing files over creating new ones
- Use shared types from `src/lib/domain/`

**When adding new features:**
- Check existing components in `components/ui/` before creating new ones
- Follow the CVA variant pattern for new UI components
- Add `data-slot` attribute to new components for styling hooks
- Keep scoring/business logic in `src/core/`, UI in components
- Keep backend functions focused — actions for external calls, mutations for writes, queries for reads
