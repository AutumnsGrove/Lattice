# GroveEngine Commands to Run Later

> **Note:** These commands require local machine access with wrangler CLI.
> Run these after GroveAuth is fully deployed and configured.

---

## GroveAuth Integration Setup

### 1. Set GroveAuth Client Credentials

For each GroveEngine site (landing, domains, etc.), set the GroveAuth client credentials:

```bash
# For the domains site
cd domains
wrangler secret put GROVEAUTH_CLIENT_ID    # Enter: domains
wrangler secret put GROVEAUTH_CLIENT_SECRET # Enter: your-client-secret

# For the landing site (if using auth)
cd ../landing
wrangler secret put GROVEAUTH_CLIENT_ID
wrangler secret put GROVEAUTH_CLIENT_SECRET
```

### 2. Update wrangler.toml Variables

Add these to each site's `wrangler.toml`:

```toml
[vars]
GROVEAUTH_URL = "https://auth.grove.place"
GROVEAUTH_REDIRECT_URI = "https://domains.grove.place/auth/callback"
```

---

## Database Migrations

### Session Table Migration (Required for Token Storage)

Run this migration to add token storage columns to the sessions table:

```bash
# Add token columns to sessions table
wrangler d1 execute grove-domains-db --remote --command="
-- Add OAuth token columns to sessions table
-- These store tokens in the database instead of cookies for better security
ALTER TABLE sessions ADD COLUMN access_token TEXT;
ALTER TABLE sessions ADD COLUMN refresh_token TEXT;
ALTER TABLE sessions ADD COLUMN token_expires_at TEXT;
"
```

**Note:** SQLite ALTER TABLE only supports adding columns. If you need to modify existing columns, you'll need to create a new table and migrate data.

### Run Post Limit Migration (After GroveAuth Integration)

If you need to sync post counts from GroveEngine to GroveAuth:

```bash
# Get current post counts per tenant
wrangler d1 execute grove-engine-db --remote --command="
SELECT t.id as tenant_id, t.email, COUNT(p.id) as post_count
FROM tenants t
LEFT JOIN posts p ON p.tenant_id = t.id AND p.status = 'published'
GROUP BY t.id;
"
```

---

## Verify GroveAuth Integration

### Test Login Flow

1. Navigate to `https://domains.grove.place/auth/login`
2. Should redirect to `https://auth.grove.place/login`
3. After authentication, should redirect back to `/auth/callback`
4. Should create session and redirect to `/admin`

### Test Subscription API

```bash
# Check if subscription endpoint works
curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  https://auth.grove.place/subscription

# Check if user can create post
curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  https://auth.grove.place/subscription/USER_ID/can-post
```

---

## Rollback Instructions

If GroveAuth integration causes issues, you can temporarily disable it:

1. Keep the existing magic code auth routes (`/api/auth/*`)
2. Update login page to use magic code flow instead of GroveAuth redirect
3. The hooks.server.ts still checks for local sessions, so existing sessions will work

---

## Client Registration in GroveAuth

Make sure these clients are registered in GroveAuth:

```bash
# Domain Finder
wrangler d1 execute groveauth --remote --command="
INSERT INTO clients (id, name, client_id, client_secret_hash, redirect_uris, allowed_origins)
VALUES (
  'domains-grove-place',
  'Domain Finder',
  'domains',
  -- Generate: echo -n 'your-secret' | openssl dgst -sha256
  'YOUR_HASHED_SECRET',
  '[\"https://domains.grove.place/auth/callback\", \"http://localhost:5174/auth/callback\"]',
  '[\"https://domains.grove.place\", \"http://localhost:5174\"]'
)
ON CONFLICT(client_id) DO UPDATE SET
  redirect_uris = excluded.redirect_uris,
  allowed_origins = excluded.allowed_origins;
"
```

---

## Rate Limiting Considerations

### API Rate Limits

GroveAuth API calls should be rate-limited to prevent abuse. The client includes subscription caching (5 min TTL by default) which reduces API load.

**Recommended rate limits for GroveAuth endpoints:**

| Endpoint | Rate Limit | Notes |
|----------|------------|-------|
| `/token` | 10/min per IP | Prevents brute-force token requests |
| `/subscription/*` | 60/min per user | Subscription queries |
| `/subscription/*/post-count` | 30/min per user | Post count updates |
| `/subscription/*/can-post` | 120/min per user | Pre-submit checks (higher for UX) |

**Client-side caching:**

The GroveAuthClient has built-in subscription caching:
- Default TTL: 5 minutes (300000ms)
- Configurable via `cacheTTL` constructor option
- Automatically invalidated on post count changes
- Use `client.clearSubscriptionCache(userId)` to manually clear

```typescript
const client = createGroveAuthClient({
  clientId: 'your-client-id',
  clientSecret: env.GROVEAUTH_CLIENT_SECRET,
  redirectUri: 'https://your-site.com/auth/callback',
  cacheTTL: 600000, // 10 minutes (optional)
});
```

---

## Migration Strategy

### Phase 1: Deploy GroveAuth Changes

1. Run the SQL migration in GroveAuth (see `docs/GROVEAUTH_HANDOFF.md`)
2. Deploy GroveAuth with new subscription endpoints
3. Register GroveEngine clients in GroveAuth

### Phase 2: Deploy GroveEngine Integration

1. Set wrangler secrets for each site:
   ```bash
   wrangler secret put GROVEAUTH_CLIENT_SECRET
   ```

2. Update wrangler.toml with GROVEAUTH_URL and GROVEAUTH_REDIRECT_URI

3. Deploy GroveEngine sites:
   ```bash
   pnpm deploy
   ```

### Phase 3: Initial Post Count Sync

After both systems are deployed, sync existing post counts:

```bash
# 1. Get post counts from GroveEngine
wrangler d1 execute grove-engine-db --remote --command="
SELECT t.id, t.email, COUNT(p.id) as post_count
FROM tenants t
LEFT JOIN posts p ON p.tenant_id = t.id AND p.status = 'published'
GROUP BY t.id;
"

# 2. For each tenant, update their GroveAuth subscription:
curl -X POST "https://auth.grove.place/subscription/USER_ID/post-count" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"count": POST_COUNT}'
```

### Phase 4: Enable Enforcement

1. Start with warnings only (grace period always active)
2. Monitor logs for quota warnings
3. After 1-2 weeks, enable full enforcement
4. Send email notifications to users approaching limits

### Rollback Plan

If issues occur, the rollback process is:

1. **Immediate:** Set a feature flag to bypass quota checks
2. **Short-term:** Revert to previous GroveEngine deployment
3. **Long-term:** Keep existing magic code auth as fallback

The QuotaWidget/QuotaWarning components gracefully handle missing data with defensive checks, so partial rollbacks won't break the UI.

---

*Last updated: 2025-12-08*
