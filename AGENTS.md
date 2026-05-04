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
```

## Guidelines

- Default to server components; only use `"use client"` for hooks, subscriptions, browser APIs, or `Date.now()`
- Use `fetchQuery` (server) for SSR, `useQuery` (client) for real-time subscriptions
- Components: PascalCase named exports; files: kebab-case
- Test behavior, not implementation
- Assume dev server is already running
- Avoid `any` or explicit type assertions

## Agent skills

### Issue tracker

GitHub issues at `rigomart/deppulse` via the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Five canonical roles using default names; `wontfix` already exists in the repo. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` + `docs/adr/` at the repo root (created lazily by skills when needed). See `docs/agents/domain.md`.
