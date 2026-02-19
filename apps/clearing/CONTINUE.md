# Clearing - Setup Instructions for Local Agent

This document provides step-by-step instructions for deploying the Clearing status page to Cloudflare.

## Prerequisites

Before starting, ensure you have:
1. Access to an authenticated `wrangler` CLI session (`wrangler login`)
2. Access to the Cloudflare account that owns `grove-engine-db`
3. Node.js 20+ and pnpm installed

## Step 1: Install Dependencies

```bash
cd clearing
pnpm install
```

## Step 2: Verify Build

Before deploying, make sure the app builds successfully:

```bash
pnpm run build
```

If there are any TypeScript errors, fix them before continuing.

## Step 3: Run Database Migrations

The status tables need to be added to the shared D1 database. Run:

```bash
wrangler d1 execute grove-engine-db --remote --file=migrations/0001_status_tables.sql
```

This creates the following tables:
- `status_components` - Platform components (pre-seeded with Blog Engine, CDN, Auth, etc.)
- `status_incidents` - Incident records
- `status_updates` - Timeline updates
- `status_incident_components` - Component-incident relationships
- `status_scheduled` - Scheduled maintenance
- `status_daily_history` - 90-day uptime data

### Verify Migration

```bash
wrangler d1 execute grove-engine-db --remote --command "SELECT name FROM status_components ORDER BY display_order"
```

Expected output: Blog Engine, CDN, Authentication, Meadow, Payments, API

## Step 4: Create Cloudflare Pages Project

```bash
wrangler pages project create grove-clearing --production-branch main
```

## Step 5: Deploy

```bash
pnpm run deploy
```

Or manually:

```bash
pnpm run build
wrangler pages deploy .svelte-kit/cloudflare --project-name grove-clearing
```

## Step 6: Configure Custom Domain

In the Cloudflare Dashboard:

1. Navigate to **Workers & Pages** → **grove-clearing** → **Custom domains**
2. Click **Set up a custom domain**
3. Enter `status.grove.place`
4. Follow the DNS configuration steps if needed

## Step 7: Verify Deployment

Visit `https://status.grove.place` and verify:
- [ ] Page loads with "All Systems Operational" banner
- [ ] All 6 components are displayed
- [ ] 90-day uptime bars are visible
- [ ] RSS feed works at `/feed`
- [ ] Dark mode toggle works
- [ ] Incident detail page works (try `/incidents/cdn-degraded-performance-jan-03`)

## Troubleshooting

### Build Fails

```bash
rm -rf .svelte-kit node_modules
pnpm install
pnpm run build
```

### Migration Fails

Check database connectivity:
```bash
wrangler d1 execute grove-engine-db --remote --command "SELECT 1"
```

### Pages Deployment Fails

Verify authentication:
```bash
wrangler whoami
```

### Data Not Loading

The page uses mock data if D1 is unavailable. Check:
1. D1 binding is correct in `wrangler.toml`
2. Tables exist in the database
3. No errors in the Cloudflare dashboard logs

## Post-Deployment

### Optional: Seed Test Data

If you want to create a test incident:

```bash
wrangler d1 execute grove-engine-db --remote --command "
INSERT INTO status_incidents (id, title, slug, status, impact, type, started_at, created_at, updated_at)
VALUES ('inc_test', 'Test Incident', 'test-incident-jan-05', 'resolved', 'minor', 'degraded', datetime('now', '-2 hours'), datetime('now', '-2 hours'), datetime('now'));

INSERT INTO status_updates (id, incident_id, status, message, created_at)
VALUES ('upd_test_1', 'inc_test', 'investigating', 'We are investigating reports of issues.', datetime('now', '-2 hours'));

INSERT INTO status_updates (id, incident_id, status, message, created_at)
VALUES ('upd_test_2', 'inc_test', 'resolved', 'The issue has been resolved.', datetime('now'));

INSERT INTO status_incident_components (incident_id, component_id)
VALUES ('inc_test', 'comp_api');
"
```

### Set Up Monitoring

Consider setting up:
- Cloudflare Analytics for the Pages project
- Real-time logs: `wrangler pages deployment tail --project-name grove-clearing`

## Architecture Notes

- **Frontend**: SvelteKit with SSR on Cloudflare Workers
- **Database**: Shared D1 database with main Grove app
- **Styling**: Tailwind CSS with glassmorphism (consistent with Grove design)
- **Updates**: Manual via GroveAuth admin (Phase 2)

## Next Steps (Phase 2)

The admin interface for managing incidents will be added to GroveAuth. See `docs/specs/clearing-spec.md` for the full specification.

---

*Questions? Check the [Clearing Spec](../docs/specs/clearing-spec.md) or [README](./README.md).*
