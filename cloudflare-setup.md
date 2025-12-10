# Cloudflare Infrastructure Setup

**Account:** AutumnsGrove
**Account ID:** `04e847fa7655624e84414a8280b3a4d0`
**Domain:** grove.place
**Setup Date:** November 24, 2025

---

## Created Resources

### D1 Database (SQL)
**Purpose:** Store blog posts, users, tenants, and all relational data

- **Name:** grove-engine-db
- **UUID:** `a6394da2-b7a6-48ce-b7fe-b1eb3e730e68`
- **Region:** ENAM (East North America)
- **Created:** 2025-11-24T18:48:46.878Z
- **Status:** ✅ Active

**Binding for wrangler.toml:**
```toml
[[d1_databases]]
binding = "DB"
database_name = "grove-engine-db"
database_id = "a6394da2-b7a6-48ce-b7fe-b1eb3e730e68"
```

---

### R2 Bucket (Object Storage)
**Purpose:** Store uploaded images, media files, and user assets

- **Name:** grove-media
- **Region:** ENAM (East North America)
- **Storage Class:** Standard
- **Created:** 2025-11-24T18:49:26.020Z
- **Status:** ✅ Active

**Binding for wrangler.toml:**
```toml
[[r2_buckets]]
binding = "MEDIA"
bucket_name = "grove-media"
```

---

### KV Namespace (Key-Value Store)
**Purpose:** Cache rendered pages, session data, rate limiting

- **Title:** grove-cache
- **ID:** `514e91e81cc44d128a82ec6f668303e4`
- **URL Encoding:** Supported
- **Created:** 2025-11-24T18:49:26.020Z (approx)
- **Status:** ✅ Active

**Binding for wrangler.toml:**
```toml
[[kv_namespaces]]
binding = "CACHE"
id = "514e91e81cc44d128a82ec6f668303e4"
```

---

## Verification

All resources are created and visible via Wrangler CLI:

```bash
# Verify D1 database
wrangler d1 list
# ✅ grove-engine-db visible

# Verify R2 bucket
wrangler r2 bucket list
# ✅ grove-media visible

# Verify KV namespace
wrangler kv namespace list
# ✅ grove-cache visible (ID: 514e91e81cc44d128a82ec6f668303e4)
```

---

## Next Steps

### DNS Configuration (Manual via Cloudflare Dashboard)
**Location:** dash.cloudflare.com → grove.place → DNS → Records

- [ ] Add wildcard subdomain record: `*.grove.place` → Cloudflare Pages (when Pages project is created)
- [ ] Verify SSL certificate provisioning (should be automatic)
- [ ] Test subdomain routing once deployed (test.grove.place)

**Note:** DNS configuration requires the Pages project to exist first. Do this after creating the Pages project below.

### Cloudflare Pages Setup
**Option 1: Via CLI (after GitHub repo is created)**
```bash
wrangler pages project create grove-engine --production-branch=main
```

**Option 2: Via Dashboard (Easier for first setup)**
- Go to dash.cloudflare.com → Pages → Create application
- Connect to GitHub repository (grove-engine)
- Configure build settings:
  - Framework preset: SvelteKit
  - Build command: `pnpm run build`
  - Build output directory: `.svelte-kit/cloudflare`
  - Node version: 20
- Add environment variables with resource IDs from above

### GitHub Integration
- [ ] Create grove-engine repository at github.com/AutumnsGrove/grove-engine
- [ ] Push initial SvelteKit project
- [ ] Connect to Cloudflare Pages (option 2 above is easiest)
- [ ] First deployment will automatically set up the integration

---

## Wrangler Configuration Template

Once you create your SvelteKit project, add this to `wrangler.toml`:

```toml
name = "grove-engine"
compatibility_date = "2025-11-24"
account_id = "04e847fa7655624e84414a8280b3a4d0"

# D1 Database
[[d1_databases]]
binding = "DB"
database_name = "grove-engine-db"
database_id = "a6394da2-b7a6-48ce-b7fe-b1eb3e730e68"

# R2 Storage
[[r2_buckets]]
binding = "MEDIA"
bucket_name = "grove-media"

# KV Cache
[[kv_namespaces]]
binding = "CACHE"
id = "514e91e81cc44d128a82ec6f668303e4"
```

---

## Cost Estimate

**Current Setup (Free Tier):**
- D1: Free (5GB storage, 5M reads/day, 100K writes/day)
- R2: Free (10GB storage, 10M reads/month, 1M writes/month)
- KV: Free (1GB storage, 100K reads/day, 1K writes/day)
- Pages: Free (500 builds/month, unlimited bandwidth)

**Projected Costs (10 users):**
- $0-5/month on free tier
- Scale pricing kicks in after free tier limits

---

## Access & Authentication

**Cloudflare API Token:** (store in `.env` - DO NOT COMMIT)
```bash
CLOUDFLARE_API_TOKEN=your_token_here
CLOUDFLARE_ACCOUNT_ID=04e847fa7655624e84414a8280b3a4d0
```

**Wrangler Auth Status:** Already logged in ✅

---

*Last Updated: November 24, 2025*
