---
date created: Thursday, January 2nd 2026
date modified: Thursday, January 2nd 2026
tags:
  - security
  - infrastructure
  - abuse-prevention
type: guide
---

# Rate Limiting & Abuse Prevention Guide

Step-by-step guide for implementing and configuring the Threshold rate limiting system in Grove.

---

## Overview

Threshold is Grove's multi-layer rate limiting and abuse prevention system. It protects your blog from DDoS attacks, brute force attempts, and resource exhaustion while being fair to legitimate users.

**Key Features:**
- **4-layer protection** - Edge → Tenant → User → Endpoint
- **Graduated response** - Warning → Slowdown → Block → Ban
- **Tier-based fairness** - Higher plans get more generous limits
- **Shadow banning** - Silent degradation for suspicious users
- **Real-time monitoring** - Integrated with Vista dashboard

---

## Prerequisites

Before configuring Threshold, ensure you have:

- [ ] Cloudflare Enterprise or Business plan (for WAF rate limiting rules)
- [ ] Durable Objects enabled in your Cloudflare account
- [ ] Access to Cloudflare Dashboard
- [ ] TenantDO and SessionDO deployed (part of Loom architecture)
- [ ] Vista monitoring deployed (optional but recommended)

---

## Step 1: Configure Cloudflare Edge Rate Limiting

### Why Edge Limiting?
Workers are billed per request. Edge limiting stops attacks *before* they hit Workers, saving costs and protecting your infrastructure.

### Cloudflare WAF Rate Limiting Rules

Configure via Cloudflare Dashboard or Terraform:

```hcl
# Example: General request limit per IP
resource "cloudflare_ruleset" "grove_rate_limiting" {
  zone_id = var.zone_id
  name    = "Grove Rate Limiting"
  kind    = "zone"
  phase   = "http_ratelimit"

  rules {
    action = "block"
    action_parameters {
      response {
        status_code  = 429
        content      = "{\"error\": \"rate_limited\", \"retry_after\": 60}"
        content_type = "application/json"
      }
    }
    ratelimit {
      characteristics     = ["ip.src"]
      period              = 60
      requests_per_period = 1000
      mitigation_timeout  = 60
    }
    expression  = "(http.host contains \"grove.place\")"
    description = "General rate limit: 1000 req/min per IP"
    enabled     = true
  }
}
```

### Recommended Edge Limits

| Endpoint Category | Limit | Window | Purpose |
|-------------------|-------|--------|---------|
| General requests | 1000 | 60 seconds | DDoS protection |
| Auth endpoints | 50 | 300 seconds | Brute force prevention |
| Upload endpoints | 100 | 3600 seconds | Storage abuse prevention |
| AI endpoints | 500 | 86400 seconds | Cost protection |

---

## Step 2: Implement Tenant Rate Limiting (TenantDO)

### Purpose
Ensure one tenant's traffic doesn't degrade another tenant's experience. Limits scale with tier.

### Tier-Based Defaults

| Tier | Requests/min | Writes/hour | Uploads/day | AI calls/day |
|------|--------------|-------------|-------------|--------------|
| Seedling (free) | 100 | 50 | 10 | 25 |
| Sapling | 500 | 200 | 50 | 100 |
| Oak | 1,000 | 500 | 200 | 500 |
| Evergreen | 5,000 | 2,000 | 1,000 | 2,500 |

### Implementation

Add rate limit tables to your TenantDO schema:

```sql
-- In TenantDO migrations
CREATE TABLE rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  window_start INTEGER NOT NULL
);
```

Use the `checkTenantRateLimit()` method in your TenantDO:

```typescript
// Example usage in router middleware
async function tenantRateLimitMiddleware(request: Request, env: Env, tenant: string) {
  const tenantDO = env.TENANTS.get(env.TENANTS.idFromName(`tenant:${tenant}`));
  const result = await tenantDO.checkTenantRateLimit('requests');
  
  if (!result.allowed) {
    return new Response(JSON.stringify({
      error: 'tenant_rate_limited',
      retryAfter: result.retryAfter,
      resetAt: new Date(result.resetAt * 1000).toISOString(),
    }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(result.retryAfter),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(result.resetAt),
      },
    });
  }
  
  // Add rate limit headers even on success
  request.headers.set('X-RateLimit-Remaining', String(result.remaining));
  return null; // Continue processing
}
```

---

## Step 3: Implement User Rate Limiting (SessionDO)

### Purpose
Per-user limits prevent abuse while being fair to legitimate heavy users. Enables graduated response.

### SessionDO Schema Additions

```sql
-- In SessionDO migrations
CREATE TABLE user_rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  window_start INTEGER NOT NULL
);

CREATE TABLE user_abuse_state (
  key TEXT PRIMARY KEY DEFAULT 'state',
  warnings INTEGER DEFAULT 0,
  last_warning INTEGER,
  shadow_banned INTEGER DEFAULT 0,
  banned_until INTEGER
);
```

### Endpoint-Specific User Limits

Configure sensitive endpoints with appropriate limits:

```typescript
const USER_RATE_LIMITS = {
  // Auth endpoints (most sensitive)
  'auth/login': { limit: 5, window: 300 },      // 5 per 5 minutes
  'auth/token': { limit: 10, window: 60 },      // 10 per minute
  
  // Write endpoints  
  'posts/create': { limit: 10, window: 3600 },  // 10 posts per hour
  'comments/create': { limit: 20, window: 300 }, // 20 comments per 5 min
  
  // Upload endpoints
  'upload/image': { limit: 20, window: 3600 },  // 20 images per hour
  
  // Default for unspecified endpoints
  'default': { limit: 100, window: 60 },        // 100 per minute
};
```

### Graduated Response System

Threshold uses progressive escalation:

```
First violation:  → Allow + Warning header
Second violation: → Allow + Warning header + Log  
Third violation:  → 429 + 1 min cooldown
Fourth violation: → 429 + 5 min cooldown + Shadow ban
Fifth violation:  → 429 + 24 hour ban
```

Shadow banning adds 1-3 second random delays to requests without the user knowing.

---

## Step 4: Configure Endpoint-Specific Limits

### Special Endpoint Restrictions

Some endpoints need additional protection beyond user/tenant limits:

```typescript
const ENDPOINT_LIMITS = {
  'POST:/api/posts': { limit: 10, window: 3600, periodDescription: '10 posts per hour' },
  'POST:/api/signup': { limit: 3, window: 86400, periodDescription: '3 signups per day per IP' },
  'POST:/api/password-reset': { limit: 3, window: 3600, periodDescription: '3 reset requests per hour' },
  'DELETE:/api/account': { limit: 1, window: 86400, periodDescription: '1 account deletion per day' },
};
```

### Middleware Integration

```typescript
async function rateLimitMiddleware(request: Request, env: Env, ctx: ExecutionContext) {
  const url = new URL(request.url);
  const tenant = extractTenant(request);
  const user = await validateAuth(request, env);
  
  // Layer 2: Tenant limit
  if (tenant) {
    const tenantResult = await checkTenantRateLimit(env, tenant, request);
    if (tenantResult) return tenantResult;
  }
  
  // Layer 3: User limit
  if (user) {
    const userResult = await checkUserRateLimit(env, user.id, request);
    if (userResult.response) return userResult.response;
    
    // Apply shadow ban delay if applicable
    if (userResult.delay > 0) {
      await new Promise(resolve => setTimeout(resolve, userResult.delay));
    }
  }
  
  // Layer 4: Endpoint-specific limits
  const endpointKey = getEndpointKey(request);
  const endpointLimit = ENDPOINT_LIMITS[endpointKey];
  
  if (endpointLimit) {
    const result = await checkEndpointLimit(env, user?.id ?? getClientIP(request), endpointKey, endpointLimit);
    if (!result.allowed) {
      return new Response(JSON.stringify({
        error: 'endpoint_rate_limited',
        endpoint: endpointKey,
        retryAfter: result.retryAfter,
        limit: endpointLimit.limit,
        period: endpointLimit.periodDescription,
      }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(result.retryAfter),
        },
      });
    }
  }
  
  return null; // Continue to handler
}
```

---

## Step 5: Monitoring & Alerting

### Vista Integration

Report rate limit events to your Vista monitoring dashboard:

```typescript
async function reportRateLimitEvent(env: Env, event: {
  layer: 'edge' | 'tenant' | 'user' | 'endpoint';
  blocked: boolean;
  tenant?: string;
  userId?: string;
  endpoint: string;
  ip: string;
}) {
  const key = `ratelimit:${Date.now()}:${crypto.randomUUID()}`;
  await env.MONITOR_KV.put(key, JSON.stringify(event), {
    expirationTtl: 3600, // 1 hour buffer
  });
}
```

### Alert Thresholds

Configure alerts for these metrics:

| Metric | Warning | Critical | Action |
|--------|---------|----------|--------|
| Edge blocks/min | 100 | 1000 | Check for DDoS |
| Tenant blocks/min | 50 | 200 | Review tenant behavior |
| User bans/hour | 10 | 50 | Investigate coordinated attack |
| Single IP blocks/min | 20 | 100 | Consider IP block |

### Dashboard Metrics

Track these key metrics in your Vista dashboard:
- Total blocks per layer (edge, tenant, user, endpoint)
- Top blocked tenants and endpoints
- Abuse escalation counts (warnings, shadow bans, full bans)
- Success rate by tier (Seedling vs Oak completion rates)

---

## Step 6: Testing & Validation

### Test Scenarios

1. **Basic rate limiting:** Send 101 requests in 60 seconds as a Seedling tenant
2. **Tier fairness:** Compare Seedling (100/min) vs Oak (1000/min) limits
3. **Graduated response:** Trigger multiple violations to test warning → shadow ban → ban
4. **Endpoint-specific:** Test special limits like 10 posts/hour
5. **Recovery:** Verify limits reset after window expires

### Load Testing with Sentinel

Use the Sentinel pattern to validate your rate limiting configuration:

```bash
# Run load test against auth endpoints
pnpm sentinel:run --endpoint auth --rate 20 --duration 300
```

Expected results:
- First 5 requests succeed (within limit)
- Requests 6-20 get 429 with Retry-After headers
- No service degradation for other tenants

---

## Troubleshooting

### Common Issues

#### Edge Limits Not Triggering
- Verify Cloudflare WAF rate limiting rules are enabled
- Check you're on Enterprise/Business plan (required for custom rules)
- Confirm rule expression matches your domain

#### TenantDO Rate Limits Not Working
- Check TenantDO is properly deployed and bound
- Verify rate limit tables exist in TenantDO SQLite storage
- Confirm tenant tier is correctly set in database

#### User Limits Too Strict
- Review USER_RATE_LIMITS configuration
- Check if user is shadow banned (look for artificial delays)
- Verify abuse state isn't persisting beyond decay period

#### False Positives
- Adjust tier limits based on actual usage patterns
- Consider increasing limits for heavy but legitimate users
- Implement appeal mechanism for incorrectly banned users

### Debug Headers

Threshold adds these headers to responses:

| Header | Description | Example |
|--------|-------------|---------|
| `X-RateLimit-Remaining` | Requests left in window | `42` |
| `X-RateLimit-Reset` | Unix timestamp when window resets | `1735849200` |
| `X-RateLimit-Warning` | Present if user received warning | `true` |
| `Retry-After` | Seconds to wait before retrying (429 only) | `60` |

---

## Implementation Checklist

### Phase 1: Edge Rate Limiting (Days 1-2)
- [ ] Configure Cloudflare WAF rate limiting rules
- [ ] Set up general request limit (1000/min/IP)
- [ ] Set up auth endpoint limit (50/5min/IP)
- [ ] Set up upload endpoint limit (100/hour/IP)
- [ ] Test with synthetic traffic

### Phase 2: Tenant Rate Limiting (Days 3-4)
- [ ] Add rate limit tables to TenantDO
- [ ] Implement `checkTenantRateLimit()`
- [ ] Add tier-based limits
- [ ] Integrate with router middleware
- [ ] Add rate limit headers to responses

### Phase 3: User Rate Limiting (Days 5-7)
- [ ] Add rate limit tables to SessionDO
- [ ] Implement `checkUserRateLimit()`
- [ ] Implement graduated response system
- [ ] Add shadow ban logic
- [ ] Integrate with Heartwood login flow

### Phase 4: Monitoring (Days 8-10)
- [ ] Add rate limit event logging
- [ ] Create Vista dashboard component
- [ ] Configure alerts
- [ ] Document runbooks

---

## Time Estimate

| Task | Time |
|------|------|
| Configure Cloudflare edge rules | 30 min |
| Implement TenantDO rate limiting | 2 hours |
| Implement SessionDO rate limiting | 3 hours |
| Add endpoint-specific limits | 1 hour |
| Set up monitoring & alerts | 1 hour |
| Testing & validation | 2 hours |
| **Total** | **~9.5 hours** |

---

## Related Resources

- **Threshold Pattern:** `docs/patterns/threshold-pattern.md` - Full technical specification
- **Loom Architecture:** `docs/patterns/loom-durable-objects-pattern.md` - Durable Objects foundation
- **Vista Monitoring:** `docs/specs/vista-spec.md` - Monitoring system integration
- **Sentinel Pattern:** `docs/patterns/sentinel-pattern.md` - Load testing framework

---

*Last Updated: January 2026*  
*Part of the Grove Security & Infrastructure Patterns*