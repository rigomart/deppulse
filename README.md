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

## Maintenance Categories

| Category | Score | Description |
|----------|-------|-------------|
| **Healthy** | 70-100 | Active maintenance. Safe for long-term use. |
| **Moderate** | 45-69 | Maintained but quieter. May be mature or slowing down. |
| **At-Risk** | 20-44 | Reduced maintenance. Consider evaluating alternatives. |
| **Unmaintained** | 0-19 | Little to no activity. High risk for production use. |

## Metrics Analyzed

- **Commit recency** - Days since last commit
- **Commit volume** - Number of commits in last year
- **Release cadence** - Days since last release
- **Issue responsiveness** - Open issues ratio and median resolution time
- **PR backlog** - Number of open pull requests

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

- **Framework**: Next.js 15 with App Router
- **Database**: Neon PostgreSQL + Drizzle ORM
- **Styling**: Tailwind CSS v4 + Radix UI
- **Testing**: Vitest
- **Runtime**: Bun
