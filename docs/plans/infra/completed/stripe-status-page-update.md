# Plan: Issue #921 - Update Clearing Status Page for Stripe Payment Testing

## Summary

Grove has been approved by Stripe! This plan updates the Clearing status page to show Stripe integration instead of the previous LemonSqueezy setup, and implements a real Stripe health check.

## Scope

**In scope:**

- Update Payments component description from "LemonSqueezy" to "Stripe"
- Change Payments component status from `maintenance` to `operational`
- Implement real Stripe API health check in the health endpoint
- Update mock data to reflect Stripe

**Out of scope:**

- Removing LemonSqueezy code entirely (it remains as backup)
- Adding Stripe icons (none exist in the codebase currently)
- Webhook delivery tracking UI (future enhancement)

---

## Files to Modify

### 1. Database Migration (NEW FILE)

**Path:** `apps/clearing/migrations/0009_update_payments_to_stripe.sql`

Update the Payments component in D1 to reflect Stripe:

```sql
UPDATE status_components
SET
  description = 'Stripe integration for subscriptions',
  current_status = 'operational',
  updated_at = CURRENT_TIMESTAMP
WHERE id = 'comp_payments';
```

### 2. Health Endpoint Update

**Path:** `libs/engine/src/routes/api/health/payments/+server.ts`

Current: Returns static `maintenance` status with LemonSqueezy message.

Change to:

- Check if `STRIPE_SECRET_KEY` is configured
- Make lightweight Stripe API call (`GET /v1/balance`) to verify connectivity
- Check if `STRIPE_WEBHOOK_SECRET` is configured
- Return `healthy` (HTTP 200) when all checks pass
- Return `degraded` if secrets missing but API works
- Return `unhealthy` if Stripe API unreachable

### 3. Mock Data Update

**Path:** `apps/clearing/src/routes/+page.server.ts`

Lines 160-170: Update the mock data for local development:

```typescript
{
  id: "comp_payments",
  name: "Payments",
  slug: "payments",
  description: "Stripe integration for subscriptions",  // Was: LemonSqueezy
  display_order: 4,
  current_status: "operational" as const,  // Was: maintenance
  // ...
}
```

---

## Implementation Details

### Health Check Logic

**Key distinction:** Configuration issues ≠ outages. Missing secrets means _we_ haven't configured things, not that Stripe is down.

| Condition                            | Status        | HTTP | Meaning                       |
| ------------------------------------ | ------------- | ---- | ----------------------------- |
| All configured + Stripe reachable    | `healthy`     | 200  | Payments fully operational    |
| Stripe works, webhook secret missing | `degraded`    | 200  | Payments work, webhooks won't |
| Secrets not configured               | `maintenance` | 203  | Config issue, not an outage   |
| Stripe API unreachable               | `unhealthy`   | 503  | Actual Stripe outage          |

```typescript
// Pseudo-code for the health check
if (!hasSecretKey) {
	// No API key = config issue, not outage
	return { status: "maintenance", httpStatus: 203 };
} else if (!apiReachable) {
	// Have key but Stripe down = real outage
	return { status: "unhealthy", httpStatus: 503 };
} else if (!hasWebhookSecret) {
	// Stripe works but webhooks won't
	return { status: "degraded", httpStatus: 200 };
} else {
	// Everything good!
	return { status: "healthy", httpStatus: 200 };
}
```

### Why `GET /v1/balance`?

This endpoint is:

- Lightweight (minimal data returned)
- Read-only (no side effects)
- Fast (typically <200ms)
- Available in both test and live mode
- Doesn't require any specific scope/permissions

---

## Verification Plan

### 1. Local Testing

```bash
# Start clearing in dev mode
cd packages/clearing && bun run dev

# Verify mock data shows "Stripe integration" and "operational"
# Open http://localhost:5173
```

### 2. Health Endpoint Testing

```bash
# Test the health endpoint directly (requires STRIPE_SECRET_KEY)
curl http://localhost:5174/api/health/payments | jq

# Expected response:
# {
#   "status": "healthy",
#   "service": "grove-payments",
#   "checks": [
#     {"name": "stripe_secret_key", "status": "pass"},
#     {"name": "stripe_api", "status": "pass"},
#     {"name": "stripe_webhook_secret", "status": "pass"}
#   ],
#   "timestamp": "..."
# }
```

### 3. Production Deployment

1. Run the migration on production D1:
   ```bash
   gw db migrate --write apps/clearing/migrations/0009_update_payments_to_stripe.sql
   ```
2. Deploy engine with updated health endpoint
3. Deploy clearing (mock data update)
4. Verify at https://status.grove.place that Payments shows "operational"

---

## Rollback Plan

If Stripe integration issues are discovered:

1. Create migration `0010_revert_payments_to_maintenance.sql`
2. Revert health endpoint to return `maintenance` status
3. This can be done quickly without code deployment (just migration)

---

## Acceptance Criteria Checklist

From the issue:

- [x] Update status indicators to show Stripe integration status
- [x] Add payment processor health check (Stripe API connectivity)
- [x] Update any Lemon Squeezy references to Stripe
- [x] Test webhook connectivity display (via `stripe_webhook_secret` check)
- [x] Verify billing status can be shown (status page will show operational)

---

## Task Order

1. **Create migration** `0009_update_payments_to_stripe.sql` ✅
2. **Update health endpoint** in engine to check Stripe connectivity ✅
3. **Update mock data** in clearing for local dev ✅
4. **Test locally** - verify both changes work
5. **Deploy** - migration, then engine, then clearing
