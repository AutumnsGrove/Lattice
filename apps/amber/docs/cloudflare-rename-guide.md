# Cloudflare Asset Rename Guide: Cellar → Amber

This guide helps you rename Cloudflare resources from "cellar" to "amber" using a logged-in wrangler session.

## Prerequisites

- Wrangler CLI installed and authenticated (`wrangler login`)
- Access to your Cloudflare account with the relevant resources

## Step 1: Inspect Current Assets

First, list all existing resources to understand what needs to be renamed:

```bash
# List all D1 databases
wrangler d1 list

# List all R2 buckets
wrangler r2 bucket list

# List all Workers
wrangler deployments list

# List all KV namespaces (if any)
wrangler kv namespace list
```

### Expected "cellar" resources to find:

- D1 Database: `cellar`
- Worker: `cellar-worker`
- Worker (staging): `cellar-worker-staging`

## Step 2: Create New "Amber" Resources

D1 databases and Workers cannot be renamed directly. You need to create new ones and migrate.

### Create New D1 Database

```bash
# Create the new amber database
wrangler d1 create amber

# Note the database_id from the output - update wrangler.toml with it
# Example output:
# ✅ Successfully created DB 'amber'
# database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

### Run Schema Migration on New Database

```bash
# Apply the schema to the new database
wrangler d1 execute amber --file=./worker/migrations/schema.sql
```

## Step 3: Migrate D1 Data (If Applicable)

If the old "cellar" database has data you need to preserve:

```bash
# Export data from old database
wrangler d1 execute cellar --command="SELECT * FROM user_storage" --json > user_storage_backup.json
wrangler d1 execute cellar --command="SELECT * FROM storage_files" --json > storage_files_backup.json
wrangler d1 execute cellar --command="SELECT * FROM storage_addons" --json > storage_addons_backup.json
wrangler d1 execute cellar --command="SELECT * FROM storage_exports" --json > storage_exports_backup.json

# Then manually import or use SQL INSERT statements
```

## Step 4: Update wrangler.toml

Ensure `worker/wrangler.toml` has the correct configuration:

```toml
# Amber Worker Configuration
name = "amber-worker"
main = "src/index.ts"
compatibility_date = "2024-12-01"
compatibility_flags = ["nodejs_compat"]

[[d1_databases]]
binding = "DB"
database_name = "amber"
database_id = "YOUR_NEW_DATABASE_ID_HERE"  # From step 2

[[r2_buckets]]
binding = "R2_BUCKET"
bucket_name = "grove-storage"  # R2 bucket name stays the same

[triggers]
crons = ["0 3 * * *"]

[env.production]
name = "amber-worker"
routes = [
  { pattern = "amber-api.grove.place/*", zone_name = "grove.place" }
]

[env.staging]
name = "amber-worker-staging"
```

## Step 5: Deploy New Worker

```bash
# Deploy the renamed worker
wrangler deploy --config worker/wrangler.toml

# For staging
wrangler deploy --config worker/wrangler.toml --env staging
```

## Step 6: Update DNS/Routes (If Using Custom Domain)

If you have DNS records or routes pointing to `cellar-api.grove.place`:

1. Go to Cloudflare Dashboard → DNS
2. Update any CNAME or A records from `cellar-api` to `amber-api`
3. Or add new records for `amber-api.grove.place`

## Step 7: Clean Up Old Resources

After verifying the new "amber" resources work correctly:

```bash
# Delete old worker (be careful - this is irreversible!)
wrangler delete cellar-worker

# Delete old D1 database (only after data migration!)
wrangler d1 delete cellar
```

## Verification Checklist

- [ ] New D1 database `amber` created
- [ ] Schema applied to new database
- [ ] Data migrated (if applicable)
- [ ] `wrangler.toml` updated with new database_id
- [ ] Worker deployed as `amber-worker`
- [ ] DNS/routes updated (if using custom domain)
- [ ] API endpoints responding correctly
- [ ] Old resources cleaned up

## Rollback Plan

If something goes wrong:

1. Keep the old `cellar` resources until new ones are verified
2. Revert `wrangler.toml` changes if needed
3. Redeploy with old configuration

## Notes

- **R2 Bucket**: The R2 bucket `grove-storage` does NOT need to be renamed - it's shared across Grove products
- **Secrets**: Worker secrets are tied to the worker name. Re-set them for the new worker:
  ```bash
  wrangler secret put HEARTWOOD_API_KEY --name amber-worker
  wrangler secret put STRIPE_SECRET_KEY --name amber-worker
  ```
