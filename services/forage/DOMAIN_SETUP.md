# Forage Domain Setup

## Current Status

- ✅ Worker deployed: `https://forage.m7jv4v7npb.workers.dev`
- ⚠️ Custom domain `forage.grove.place` conflicts with GroveEngine routing

## Recommended Setup

### Worker API

- Domain: `forage-api.grove.place` (recommended)
- Alternative: `api.forage.grove.place`
- Purpose: Backend worker for domain search

### Frontend

- Domain: `forage.grove.place`
- Purpose: User-facing domain search interface (Cloudflare Pages)

## Steps to Fix

1. **Add custom domain to worker:**

   ```bash
   pnpm exec wrangler domains add forage-api.grove.place
   ```

2. **Update GroveEngine environment variable:**
   - Variable: `DOMAIN_WORKER_URL`
   - Value: `https://forage-api.grove.place`
   - Location: Cloudflare Pages → grove-domains → Settings → Environment Variables

3. **Verify DNS:**
   - `forage.grove.place` → Cloudflare Pages (GroveEngine)
   - `forage-api.grove.place` → Worker

## Alternative: Use workers.dev URL

If you don't want to use a custom domain, update the environment variable to:

- `DOMAIN_WORKER_URL` = `https://forage.m7jv4v7npb.workers.dev`
