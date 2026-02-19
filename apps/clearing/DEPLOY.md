# Clearing Deployment Guide

> **Note**: These commands should be executed by a local agent with access to an authenticated wrangler CLI session.

## Overview

Clearing is deployed to Cloudflare Pages at `status.grove.place`. It shares the D1 database with the main Grove application.

## Prerequisites

1. Authenticated wrangler CLI (`wrangler login`)
2. Access to the `grove-engine-db` D1 database
3. Node.js 20+ and pnpm installed

## First-Time Setup

### 1. Install Dependencies

```bash
cd clearing
pnpm install
```

### 2. Run Database Migrations

The status tables need to be created in the shared D1 database:

```bash
# Apply migrations to production database
wrangler d1 execute grove-engine-db --remote --file=migrations/0001_status_tables.sql
```

### 3. Create Cloudflare Pages Project

```bash
# Create the Pages project
wrangler pages project create grove-clearing --production-branch main
```

### 4. Configure Custom Domain

In the Cloudflare Dashboard:
1. Go to **Pages** > **grove-clearing** > **Custom domains**
2. Add `status.grove.place`
3. Configure DNS if needed

### 5. Deploy

```bash
# Build and deploy
pnpm run deploy
```

Or manually:

```bash
pnpm run build
wrangler pages deploy .svelte-kit/cloudflare --project-name grove-clearing
```

## Routine Deployments

For subsequent deployments:

```bash
cd clearing
pnpm install  # If dependencies changed
pnpm run deploy
```

## Local Development

```bash
cd clearing
pnpm install
pnpm dev
```

The local dev server runs at `http://localhost:5173` with mock data.

To test with the real D1 database locally:

```bash
pnpm preview
```

## Environment Configuration

### Bindings (configured in wrangler.toml)

| Binding | Type | Description |
|---------|------|-------------|
| `DB` | D1 | Shared Grove database (`grove-engine-db`) |

### Secrets

No secrets are required for the public status page.

## Database Tables

The following tables are created by the migration:

- `status_components` - Platform components (Blog Engine, CDN, etc.)
- `status_incidents` - Incident records
- `status_updates` - Timeline updates for incidents
- `status_incident_components` - Junction table for incident-component relationships
- `status_scheduled` - Scheduled maintenance announcements
- `status_daily_history` - 90-day uptime history for visualization

## Troubleshooting

### Migration fails

If the migration fails, you can run individual statements:

```bash
wrangler d1 execute grove-engine-db --remote --command "SELECT 1"  # Test connection
```

### Pages deployment fails

Ensure you're authenticated and have the correct permissions:

```bash
wrangler whoami
```

### Build errors

Clear the build cache:

```bash
rm -rf .svelte-kit node_modules
pnpm install
pnpm run build
```

## Rollback

To rollback to a previous deployment:

```bash
# List deployments
wrangler pages deployment list --project-name grove-clearing

# Rollback to specific deployment
wrangler pages deployment rollback --project-name grove-clearing --deployment-id <id>
```

## Monitoring

- Check deployment status in Cloudflare Dashboard > Pages
- View real-time logs with `wrangler pages deployment tail --project-name grove-clearing`

---

*Last updated: 2026-01-05*
