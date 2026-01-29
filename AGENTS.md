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
bun run db:generate  # Generate migrations from schema changes
bun run db:migrate   # Run pending migrations
bun run db:studio    # Open Drizzle Studio
bun run db:push      # Push schema directly (dev only, destructive)
```

## Database Migrations

After modifying `src/db/schema.ts`, generate and commit migration files:

```bash
bun run db:generate  # Creates SQL migration in ./migrations/
git add migrations/
git commit -m "chore(db): add migration for <change>"
```

**Do not use `db:push` in production** - it can be destructive. Use migrations instead.

Migration files are auto-applied on Vercel deploy via the build command.

## Deployment

**Stack**: Vercel + Neon (via Vercel Marketplace integration)

### How it works
- **Production**: Vercel runs `db:migrate` before build, applying migrations to the main Neon database
- **Preview deployments**: Neon creates an isolated database branch per PR, migrations run against it
- **Cleanup**: Preview database branches auto-delete when deployments are removed

### Environment Variables
The Neon integration auto-configures these on Vercel:
- `DATABASE_URL` - Pooled connection (for serverless)
- `DATABASE_URL_UNPOOLED` - Direct connection (for migrations)

## Environment Variables

Required in `.env.local` for local development:
- `DATABASE_URL` - Neon PostgreSQL connection string
- `GITHUB_PAT` - GitHub Personal Access Token for API access

On Vercel, these are auto-configured by the Neon integration.

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
- Time-relative rendering (`formatDistanceToNow`, `Date.now()`) - requires Suspense boundary
- Radix UI primitives that require client-side JS

### Server-Only Modules
Use `import "server-only"` at the top of files that should never run on client:
- `src/lib/services/` - Business logic and data orchestration
- `src/lib/persistence/` - Database queries
- `src/lib/github/` - GitHub API client (modular directory)

## Architecture

### Data Flow

```
User Input → parseProject() → redirect to project page → startAnalysis() → ensureScoreCompletion() → render
```

1. `src/lib/parse-project.ts` - Validates and extracts owner/project from URL or shorthand
2. `src/app/p/[owner]/[project]/page.tsx` - Page with `"use cache"`, calls `startAnalysis()`
3. `src/lib/services/assessment-service.ts` - Orchestrates analysis: fetches metrics, creates runs, calculates scores
4. `src/lib/github/` - Fetches metrics from GitHub API via Octokit (GraphQL + REST)
5. `src/lib/maintenance.ts` - Computes maintenance score (0-100) and category
6. `src/lib/persistence/` - Repository and analysis run queries with Drizzle ORM

### Key Modules

| Module | Purpose |
|--------|---------|
| `src/lib/services/assessment-service.ts` | Business logic: `startAnalysis()` creates runs, `ensureScoreCompletion()` calculates scores. |
| `src/lib/persistence/` | Database access: `repository-repo.ts` and `analysis-run-repo.ts` for Drizzle queries. |
| `src/lib/maintenance.ts` | Maintenance scoring algorithm. Categories: healthy (70+), moderate (45-69), at-risk (20-44), unmaintained (0-19). |
| `src/lib/maintenance-config.ts` | Centralized config for scoring weights, thresholds, and maturity tiers. All tunable values in one place. |
| `src/lib/github/` | GitHub API client (modular). `metrics.ts` for GraphQL, `activity.ts` for REST commit stats, `rate-limit.ts` for parsing. |
| `src/lib/cache/` | Cache utilities: `tags.ts` for tag generation, `invalidation.ts` for cache busting. |
| `src/lib/logger.ts` | Generic structured logger for external API calls with duration and rate limit tracking. |

### Directory Structure

```
├── migrations/       # Drizzle SQL migrations (auto-generated)
└── src/
    ├── app/              # Next.js App Router pages
    │   ├── _components/  # Homepage components
    │   └── p/[owner]/[project]/  # Dynamic project page with cache components
    ├── components/       # Shared UI components
    ├── db/               # Drizzle schema and client
    └── lib/
        ├── cache/        # Cache tags and invalidation utilities
        ├── domain/       # Domain types (assessment, repository)
        ├── github/       # GitHub API client (modular)
        ├── persistence/  # Database repositories (Drizzle queries)
        └── services/     # Business logic orchestration
```

## Code Patterns

### Caching Strategy (Next.js 16 Cache Components)

**Page-level caching**: The project page uses `"use cache"` directive with `cacheLife("weeks")` and `cacheTag()`:
```tsx
export default async function ProjectPage({ params }) {
  "use cache";
  cacheLife("weeks");
  cacheTag(getProjectTag(owner, project));

  const run = await startAnalysis(owner, project);
  // ...
}
```

**Cache invalidation**: Use `after()` from `next/server` to schedule invalidation after response:
```tsx
after(() => {
  invalidateProjectCache(owner, project);
});
```

**Tag-based invalidation**: `project:{owner}/{project}` for specific projects.

**Important**: `updateTag()` cannot be called during render or inside cached functions. Always use `after()` to schedule invalidation.

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
- Default to server components - only add `"use client"` when hooks or `Date.now()` are needed
- Fetch data in server components, not in client components
- Use `"use cache"` at the page level for data-fetching pages
- Cache invalidation must use `after()` - never call `updateTag()` during render

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
