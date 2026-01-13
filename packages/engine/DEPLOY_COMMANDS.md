# Feature Flags Deployment Commands

Run these commands after merging to set up the feature flags infrastructure.

## 1. Create KV Namespace

```bash
# Create the FLAGS_KV namespace
npx wrangler kv:namespace create FLAGS_KV

# Output will look like:
# ✨ Successfully created KV namespace "FLAGS_KV"
# Add the following to your wrangler.toml:
# [[kv_namespaces]]
# binding = "FLAGS_KV"
# id = "abc123def456..."
```

Copy the ID from the output and update `packages/engine/wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "FLAGS_KV"
id = "YOUR_ACTUAL_ID_HERE"  # Replace PLACEHOLDER_CREATE_WITH_WRANGLER
```

## 2. Run Database Migration

```bash
# Preview migration (dry run)
npx wrangler d1 execute grove-engine-db \
  --file=packages/engine/migrations/018_feature_flags.sql \
  --local

# Run on production
npx wrangler d1 execute grove-engine-db \
  --file=packages/engine/migrations/018_feature_flags.sql \
  --remote
```

## 3. Verify Setup

```bash
# Check tables were created
npx wrangler d1 execute grove-engine-db \
  --command="SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'flag%';" \
  --remote

# Check seed data
npx wrangler d1 execute grove-engine-db \
  --command="SELECT id, name, enabled FROM feature_flags;" \
  --remote
```

## Expected Output

After migration, you should see 3 seeded flags:

| id | name | enabled |
|----|------|---------|
| jxl_encoding | JPEG XL Encoding | 0 |
| jxl_kill_switch | JXL Kill Switch | 1 |
| meadow_access | Meadow Access | 0 |

## Rollback (if needed)

```bash
# Drop feature flags tables
npx wrangler d1 execute grove-engine-db \
  --command="DROP TABLE IF EXISTS flag_audit_log; DROP TABLE IF EXISTS flag_rules; DROP TABLE IF EXISTS feature_flags;" \
  --remote
```
