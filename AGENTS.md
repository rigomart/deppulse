# AGENTS.md

Guidance for AI agents working with this codebase.

## Commands

```bash
bun run dev          # Start dev server
bun run build        # Production build
bun run check-types  # TypeScript type checking
bun run lint         # Lint and auto-fix with Biome
bun run test         # Run tests with Vitest
bun run test:ui      # Run tests with Vitest UI
bun run test -- src/lib/maintenance.test.ts  # Run a single test file

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

## Server-First Architecture

**This application prioritizes server-side rendering for performance and caching.**

### When to use Server Components (default)
- Data fetching and database queries
- Static content display
- Components that don't need interactivity
- Pages and layouts

### When to use Client Components (`"use client"`)
Only when you need:
- React hooks (`useState`, `useEffect`, `useTransition`, `useRouter`)
- Browser APIs or event handlers
- Radix UI primitives that require client-side JS

### Server-Only Modules
Use `import "server-only"` at the top of files that should never run on client:
- `src/db/queries.ts` - Database queries
- `src/lib/github/` - GitHub API client (modular directory)
- `src/actions/analyze.ts` - Server actions

## Architecture

### Data Flow

```
User Input → parseProject() → analyze() → fetchRepoMetrics() → calculateMaintenanceScore() → DB upsert → Cache invalidation
```

1. `src/lib/parse-project.ts` - Validates and extracts owner/project from URL or shorthand
2. `src/actions/analyze.ts` - Server action orchestrating the analysis
3. `src/lib/github/` - Fetches metrics from GitHub API via Octokit (GraphQL + REST)
4. `src/lib/maintenance.ts` - Computes maintenance score (0-100) and category
5. `src/db/schema.ts` - Single `assessments` table with upsert on conflict
6. `src/db/queries.ts` - Cached queries with `unstable_cache` + React `cache()` for request deduplication

### Key Modules

| Module | Purpose |
|--------|---------|
| `src/lib/maintenance.ts` | Maintenance scoring algorithm. Categories: healthy (70+), moderate (45-69), at-risk (20-44), unmaintained (0-19). |
| `src/lib/maintenance-config.ts` | Centralized config for scoring weights, thresholds, and maturity tiers. All tunable values in one place. |
| `src/lib/github/` | GitHub API client (modular). `metrics.ts` for GraphQL, `activity.ts` for REST commit stats, `rate-limit.ts` for parsing. |
| `src/db/queries.ts` | Database queries with caching: `cache()` for request-level deduplication, `unstable_cache` for persistent project cache. |
| `src/lib/logger.ts` | Generic structured logger for external API calls with duration and rate limit tracking. |

### Directory Structure

```
src/
├── actions/          # Server actions
├── app/              # Next.js App Router pages
│   ├── _components/  # Homepage components
│   └── p/[owner]/[project]/  # Dynamic project page
├── components/       # Shared UI components
├── db/               # Drizzle schema, client, and queries
└── lib/              # Core business logic
    └── github/       # GitHub API client (modular)
```

## Code Patterns

### Caching Strategy
- `unstable_cache` with tags for persistent project cache (24hr TTL)
- React `cache()` wrapper for request-level deduplication
- Tag-based invalidation: `project:{owner}/{project}` for specific projects
- Recent assessments query has no persistent cache (always fresh from DB)

## Code Conventions

### Component Organization
- Page-specific components: `app/[route]/_components/` (underscore prefix)
- Design system components: `components/ui/` (Radix wrappers with CVA variants)
- Shared components: `components/` (Container, Header)

### Naming
- Components: PascalCase, named exports (`export function SearchForm`)
- Files: kebab-case (`search-form.tsx`, `parse-repo.ts`)
- Database columns: snake_case (`analyzed_at`)
- TypeScript properties: camelCase (`analyzedAt`)

### Styling
- Tailwind CSS v4 with CSS variables (OKLch color space)
- Use semantic tokens: `bg-surface-2`, `text-muted-foreground`
- CVA for component variants (see `components/ui/button.tsx`)
- Mobile-first responsive: `text-2xl sm:text-3xl md:text-4xl`

## Testing

Tests in `*.test.ts` files alongside source. Run with `bun run test`.

### Guidelines

- **Test behavior, not implementation** - Tests should verify what the code does, not how it does it
- **Purpose is regression prevention** - Tests catch unintended changes when refactoring
- **Use realistic scenarios** - Describe real situations in test names, not arbitrary boundaries
- **Keep tests focused** - One concept per test, avoid testing multiple behaviors together
- **Handle edge cases** - Test null values, empty inputs, and boundary conditions
- **Allow valid ambiguity** - For borderline cases: `expect(["a", "b"]).toContain(result)`

## Instructions for AI

**Server-first mindset:**
- Default to server components - only add `"use client"` when hooks are needed
- Fetch data in server components, not in client components
- Use server actions for mutations, not API routes
- Leverage caching (`unstable_cache`, React `cache()`) aggressively

**Code quality:**
- Assume dev server is already running
- Avoid `any` or explicit type assertions
- Use existing patterns from `src/lib/` for new utilities
- Run `bun run check-types` before committing
- Prefer editing existing files over creating new ones
- Use shared types from `src/lib/types.ts`

**When adding new features:**
- Check existing components in `components/ui/` before creating new ones
- Follow the CVA variant pattern for new UI components
- Add `data-slot` attribute to new components for styling hooks
- Keep business logic in `src/lib/`, UI in components
