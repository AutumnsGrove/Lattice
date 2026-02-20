# Grove Clearing Monitor

Automated health monitoring worker for [The Clearing](https://clearing.grove.place) status page.

## Overview

This Cloudflare Worker runs on a cron schedule to:

- **Every 2 minutes**: Check health of all Grove components
- **Daily at midnight UTC**: Record daily status history for uptime visualization

## Prerequisites

- KV namespace already created (ID in `wrangler.toml`)
- D1 database with status tables migrated (`apps/clearing/migrations/0001_status_tables.sql`)

## Setup

### 1. Set the Resend API key (optional, for email alerts)

```bash
pnpm -C workers/clearing-monitor exec wrangler secret put RESEND_API_KEY
```

### 2. Deploy

```bash
pnpm -C workers/clearing-monitor deploy
```

## Manual Testing

The worker exposes HTTP endpoints for testing:

```bash
# Run health checks and see results
curl https://grove-clearing-monitor.<your-subdomain>.workers.dev/

# Trigger daily aggregation manually
curl -X POST https://grove-clearing-monitor.<your-subdomain>.workers.dev/daily
```

## Configuration

| Variable         | Source          | Description                                                |
| ---------------- | --------------- | ---------------------------------------------------------- |
| `ALERT_EMAIL`    | `wrangler.toml` | Email recipient for alerts (default: `alerts@grove.place`) |
| `RESEND_API_KEY` | Secret          | Resend API key for sending emails (optional)               |

## Development

```bash
# Local dev server
pnpm -C workers/clearing-monitor dev

# Run tests
pnpm -C workers/clearing-monitor test

# Type check
pnpm -C workers/clearing-monitor exec tsc --noEmit

# Dry-run deploy (validates config)
pnpm -C workers/clearing-monitor exec wrangler deploy --dry-run
```

## Troubleshooting

- **No emails being sent**: Verify `RESEND_API_KEY` is set via `wrangler secret list`
- **Health checks timing out**: Default timeout is 10s; check if target services are responding
- **Incidents not auto-resolving**: Requires 2 consecutive healthy checks (4 minutes minimum)
- **Daily history missing**: Check D1 migration has the `UNIQUE(component_id, date)` constraint
- **View live logs**: `pnpm -C workers/clearing-monitor tail`
