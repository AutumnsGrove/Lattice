# Deploy Clearing Status Page

Quick deployment guide for getting the clearing status page live at `status.grove.place`.

## Prerequisites

- Authenticated wrangler CLI session (`wrangler login`)
- Access to the `grove-engine-db` D1 database
- Cloudflare account with Pages access

## Deployment Commands

Run these commands in order from the `clearing/` directory:

### 1. Install Dependencies

```bash
cd clearing
pnpm install
```

### 2. Run Database Migrations

```bash
pnpm exec wrangler d1 execute grove-engine-db --remote --file=migrations/0001_status_tables.sql
```

This creates 6 tables:
- `status_components`
- `status_incidents`
- `status_updates`
- `status_incident_components`
- `status_scheduled`
- `status_daily_history`

### 3. Create Cloudflare Pages Project

```bash
pnpm exec wrangler pages project create grove-clearing --production-branch main
```

### 4. Build and Deploy

```bash
pnpm run deploy
```

This runs `pnpm run build && wrangler pages deploy .svelte-kit/cloudflare --project-name grove-clearing`

### 5. Configure Custom Domain

**Manual step in Cloudflare Dashboard:**

1. Go to **Cloudflare Dashboard** > **Pages** > **grove-clearing**
2. Click **Custom domains**
3. Click **Set up a custom domain**
4. Enter `status.grove.place`
5. Cloudflare will automatically configure DNS

### 6. Update Grove Router

Edit `packages/grove-router/src/index.ts` around line 65:

**Change:**
```typescript
status: "grove-landing.pages.dev", // Clearing status page (coming soon)
```

**To:**
```typescript
status: "grove-clearing.pages.dev", // Clearing status page
```

Then commit and deploy the router update:

```bash
cd ../packages/grove-router
git add src/index.ts
git commit -m "feat(router): route status subdomain to clearing pages project"
git push

# Deploy the updated router
pnpm exec wrangler deploy
```

## Verification

Once deployed, verify the status page is live:

```bash
curl -I https://status.grove.place
```

You should see a 200 response and the page should load in a browser.

## Troubleshooting

### Migration fails with "table already exists"

Tables may already exist from a previous attempt. Skip step 2 and proceed to step 3.

### Pages project already exists

If you get "Project already exists", skip step 3 and proceed to step 4.

### Build errors

Clear the build cache and try again:

```bash
rm -rf .svelte-kit node_modules
pnpm install
pnpm run build
```

## What Gets Deployed

- **Domain**: `status.grove.place`
- **Project**: `grove-clearing` (Cloudflare Pages)
- **Database**: `grove-engine-db` (shared D1 database)
- **Features**:
  - Overall system status banner
  - Component status grid
  - 90-day uptime history
  - Incident timeline
  - Scheduled maintenance announcements
  - RSS feed at `/feed`
  - Dark mode support

## Time Estimate

**Total time: 10-15 minutes**
- Steps 1-4: ~5 minutes
- Step 5 (custom domain): ~2 minutes
- Step 6 (router update): ~5 minutes
- Verification: ~2 minutes

---

*Once complete, users can check system status at https://status.grove.place*
