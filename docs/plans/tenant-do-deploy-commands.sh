#!/bin/bash
# ============================================================================
# TenantDO Deployment Commands
# ============================================================================
# Run these locally after implementing the code changes.
# Prerequisites: wrangler CLI authenticated, pnpm installed
# ============================================================================

set -e  # Exit on any error

echo "========================================"
echo "  TenantDO Deployment"
echo "========================================"
echo ""

# ----------------------------------------------------------------------------
# Step 1: Verify you're in the right directory
# ----------------------------------------------------------------------------
echo "Step 1: Checking directory..."
if [ ! -f "package.json" ]; then
    echo "ERROR: Run this from the GroveEngine root directory"
    exit 1
fi
echo "  ✓ In GroveEngine root"

# ----------------------------------------------------------------------------
# Step 2: Build the engine package
# ----------------------------------------------------------------------------
echo ""
echo "Step 2: Building engine package..."
cd packages/engine
pnpm build
echo "  ✓ Build complete"

# ----------------------------------------------------------------------------
# Step 3: Run D1 migration for analytics_events table
# ----------------------------------------------------------------------------
echo ""
echo "Step 3: Running D1 migration..."
echo "  This creates the analytics_events table for DO flush"

# Find the next migration number
LAST_MIGRATION=$(ls -1 migrations/*.sql 2>/dev/null | sort -V | tail -1 | grep -oP '\d+' | head -1)
NEXT_MIGRATION=$((LAST_MIGRATION + 1))
MIGRATION_FILE="migrations/$(printf '%03d' $NEXT_MIGRATION)_analytics_events.sql"

echo "  Migration file: $MIGRATION_FILE"

# Check if migration already exists
if [ -f "$MIGRATION_FILE" ]; then
    echo "  Migration file already exists, skipping creation"
else
    echo "  Creating migration file..."
    cat > "$MIGRATION_FILE" << 'EOF'
-- Analytics events table (populated by TenantDO flush)
-- Created for DO Phase 2: TenantDO implementation

CREATE TABLE IF NOT EXISTS analytics_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT NOT NULL,
  type TEXT NOT NULL,
  path TEXT NOT NULL,
  post_id TEXT,
  visitor_hash TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  referrer TEXT,
  user_agent TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch() * 1000),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE INDEX IF NOT EXISTS idx_analytics_tenant_timestamp
  ON analytics_events(tenant_id, timestamp);

CREATE INDEX IF NOT EXISTS idx_analytics_type
  ON analytics_events(type);

CREATE INDEX IF NOT EXISTS idx_analytics_path
  ON analytics_events(path);
EOF
    echo "  ✓ Migration file created"
fi

# Apply migration
echo "  Applying migration to remote D1..."
wrangler d1 migrations apply grove-engine-db --remote
echo "  ✓ Migration applied"

# ----------------------------------------------------------------------------
# Step 4: Deploy engine with TenantDO
# ----------------------------------------------------------------------------
echo ""
echo "Step 4: Deploying engine with TenantDO..."
echo "  This deploys the worker with the new Durable Object"
wrangler deploy
echo "  ✓ Engine deployed"

# ----------------------------------------------------------------------------
# Step 5: Verify deployment
# ----------------------------------------------------------------------------
echo ""
echo "Step 5: Verifying deployment..."
cd ../..

# Check health endpoint
echo "  Checking health endpoint..."
HEALTH=$(curl -s https://groveengine.grove.place/api/health 2>/dev/null || echo '{"error":"failed"}')
echo "  Response: $HEALTH"

# ----------------------------------------------------------------------------
# Done!
# ----------------------------------------------------------------------------
echo ""
echo "========================================"
echo "  Deployment Complete!"
echo "========================================"
echo ""
echo "To verify TenantDO is working:"
echo ""
echo "  1. Visit any tenant subdomain (e.g., alice.grove.place)"
echo "     - First request loads config from D1"
echo "     - Subsequent requests use cached config"
echo ""
echo "  2. Check Cloudflare Dashboard > Workers & Pages > groveengine"
echo "     - Go to 'Durable Objects' tab"
echo "     - You should see TenantDO instances being created"
echo ""
echo "  3. Test rate limiting (spam refresh should hit 429)"
echo "     - After 60 requests in 1 minute, you'll get rate limited"
echo ""
echo "  4. Check analytics buffering"
echo "     - Events buffer in DO, flush to D1 every 60s"
echo "     - Query: SELECT COUNT(*) FROM analytics_events;"
echo ""
echo "Rollback if needed:"
echo "  1. Revert hooks.server.ts to D1 fallback only"
echo "  2. Run: cd packages/engine && wrangler deploy"
echo ""
