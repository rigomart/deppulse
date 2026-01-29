# Deppulse

**Quickly assess whether an open-source project is actively maintained.**

Deppulse analyzes GitHub repositories and provides a clear maintenance status—Active, Stable, At-Risk, or Abandoned—backed by transparent metrics like commit recency, issue responsiveness, and release cadence.

Paste a repo URL, get an answer in seconds. No signup required.

---

## Why It Exists

If you need a dependency for a long-term project, you should know if it's actively maintained. Stars, good docs, and downloads can be misleading. A project can look healthy on paper while maintainers haven't touched it in months.

## How It Works

1. Enter a GitHub repository URL or `owner/repo`
2. Deppulse fetches recent activity data from GitHub
3. You get a risk category with the evidence behind it

## Scoring System

Repositories are scored 0-100 based on four categories:

- **Activity** — Commit recency and volume (weighted most heavily)
- **Responsiveness** — How quickly issues get resolved
- **Stability** — Release cadence and project age
- **Community** — Popularity signals (stars, forks)

Thresholds adapt to project maturity—established projects can have longer gaps between commits without penalty, while newer projects are expected to show more frequent activity.

The final score maps to a category: **Healthy**, **Moderate**, **Declining**, or **Inactive**.

For detailed thresholds and weights, see [`src/lib/maintenance-config.ts`](src/lib/maintenance-config.ts).

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) runtime
- [Neon](https://neon.tech/) PostgreSQL database
- GitHub Personal Access Token

### Setup

```bash
# Install dependencies
bun install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your DATABASE_URL and GITHUB_PAT

# Push database schema
bun run db:push

# Start development server
bun run dev
```

### Scripts

```bash
bun run dev          # Start dev server
bun run build        # Production build
bun run test         # Run tests
bun run lint         # Lint with Biome
bun run check-types  # TypeScript checking
```

## Tech Stack

- **Framework**: Next.js 16 with App Router and Cache Components
- **Database**: Neon PostgreSQL + Drizzle ORM
- **Styling**: Tailwind CSS v4 + Radix UI
- **Testing**: Vitest
- **Runtime**: Bun
