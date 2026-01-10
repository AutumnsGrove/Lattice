# Threshold Pattern

# Threshold: Rate Limiting & Abuse Prevention

> *The forest has boundaries. Threshold enforces them.*

**Public Name:** Threshold  
**Internal Name:** GroveThreshold  
**Pattern Type:** Security & Infrastructure  
**Last Updated:** January 2026  

Threshold is Grove's rate limiting and abuse prevention layer. Moving beyond naive IP-based limits, Threshold uses Durable Objects for precise per-user, per-tenant, and per-endpoint rate limiting with graceful degradation.

---

## Executive Summary

**Current State:** Basic 60-second IP-based rate limiter on write endpoints.

**Problems with IP-based limiting:**
- Shared IPs (corporate networks, mobile carriers) punish innocent users
- VPNs and rotating IPs allow trivial bypass
- No per-user context (heavy user vs new user treated the same)
- No per-tenant fairness (one tenant's traffic affects another)

**Threshold Solution:**
1. **Layered Rate Limiting** — IP → User → Tenant → Endpoint
2. **DO-Backed Precision** — Per-user limits stored in SessionDO
3. **Cloudflare Rate Limiting Rules** — Edge enforcement for DDoS
4. **Graduated Response** — Warning → Slowdown → Block → Ban

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         INCOMING REQUEST                                 │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  LAYER 1: Cloudflare Edge Rate Limiting                                 │
│  ─────────────────────────────────────────────────────────────────────  │
│  Purpose: Block volumetric attacks before they hit Workers              │
│  Method: CF Rate Limiting Rules (WAF)                                   │
│  Limits: 1000 req/min per IP (configurable)                             │
│                                                                         │
│  ✗ Blocked → 429 Too Many Requests (CF serves)                          │
│  ✓ Passed → Continue to Layer 2                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  LAYER 2: Tenant Rate Limiting (TenantDO)                               │
│  ─────────────────────────────────────────────────────────────────────  │
│  Purpose: Ensure fair resource distribution across tenants              │
│  Method: TenantDO.checkRateLimit()                                      │
│  Limits: Based on tier (Seedling: 100/min, Oak: 1000/min)               │
│                                                                         │
│  ✗ Exceeded → 429 + Retry-After header                                  │
│  ✓ Within limit → Continue to Layer 3                                   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  LAYER 3: User Rate Limiting (SessionDO)                                │
│  ─────────────────────────────────────────────────────────────────────  │
│  Purpose: Per-user fairness and abuse detection                         │
│  Method: SessionDO.checkRateLimit()                                     │
│  Limits: Endpoint-specific (auth: 10/min, posts: 30/min)                │
│                                                                         │
│  ✗ Exceeded → 429 + Retry-After + Warning cookie                        │
│  ✓ Within limit → Continue to Layer 4                                   │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  LAYER 4: Endpoint-Specific Limits                                      │
│  ─────────────────────────────────────────────────────────────────────  │
│  Purpose: Protect expensive operations                                  │
│  Method: Worker middleware                                              │
│  Examples:                                                              │
│    - POST /api/posts: 10 per hour                                       │
│    - POST /api/upload: 50MB per day                                     │
│    - POST /api/ai/*: 100 per day (Songbird protected)                   │
│                                                                         │
│  ✗ Exceeded → 429 + specific limit info                                 │
│  ✓ Within limit → Process request                                       │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Layer 1: Cloudflare Edge Rate Limiting

### Why Edge Limiting?

Workers are billed per request. A DDoS attack costs money even if your Worker returns 429. Edge limiting stops requests *before* they hit Workers.

### Cloudflare WAF Rate Limiting Rules

Configure via Cloudflare Dashboard or Terraform:

```hcl
# terraform/rate_limiting.tf

resource "cloudflare_ruleset" "grove_rate_limiting" {
  zone_id     = var.zone_id
  name        = "Grove Rate Limiting"
  description = "Rate limiting rules for grove.place"
  kind        = "zone"
  phase       = "http_ratelimit"

  # Rule 1: General request limit per IP
  rules {
    action = "block"
    action_parameters {
      response {
        status_code = 429
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

  # Rule 2: Auth endpoint stricter limit
  rules {
    action = "block"
    action_parameters {
      response {
        status_code = 429
        content      = "{\"error\": \"auth_rate_limited\", \"retry_after\": 300}"
        content_type = "application/json"
      }
    }
    ratelimit {
      characteristics     = ["ip.src"]
      period              = 300
      requests_per_period = 50
      mitigation_timeout  = 300
    }
    expression  = "(http.host eq \"auth.grove.place\" and http.request.uri.path contains \"/oauth\")"
    description = "Auth rate limit: 50 req/5min per IP"
    enabled     = true
  }

  # Rule 3: Upload endpoint limit
  rules {
    action = "block"
    action_parameters {
      response {
        status_code = 429
        content      = "{\"error\": \"upload_rate_limited\", \"retry_after\": 3600}"
        content_type = "application/json"
      }
    }
    ratelimit {
      characteristics     = ["ip.src"]
      period              = 3600
      requests_per_period = 100
      mitigation_timeout  = 3600
    }
    expression  = "(http.request.uri.path contains \"/api/upload\" or http.request.uri.path contains \"/api/images\")"
    description = "Upload rate limit: 100 req/hour per IP"
    enabled     = true
  }

  # Rule 4: AI endpoint limit (Songbird-protected routes)
  rules {
    action = "block"
    action_parameters {
      response {
        status_code = 429
        content      = "{\"error\": \"ai_rate_limited\", \"retry_after\": 86400}"
        content_type = "application/json"
      }
    }
    ratelimit {
      characteristics     = ["ip.src"]
      period              = 86400
      requests_per_period = 500
      mitigation_timeout  = 3600
    }
    expression  = "(http.request.uri.path contains \"/api/ai/\" or http.request.uri.path contains \"/api/wisp/\")"
    description = "AI rate limit: 500 req/day per IP"
    enabled     = true
  }
}
```

### When to Use Edge vs DO Rate Limiting

| Scenario | Edge (CF) | DO (Loom) |
|----------|-----------|-----------|
| DDoS protection | ✅ Primary | ❌ Too late |
| Per-user limits | ❌ No user context | ✅ SessionDO |
| Per-tenant limits | ❌ No tenant context | ✅ TenantDO |
| Cost protection | ✅ Before Workers | ✅ Secondary |
| Graduated response | ❌ Binary block | ✅ Warn → Slow → Block |

---

## Layer 2: Tenant Rate Limiting (TenantDO)

### Purpose

Ensure one tenant's traffic doesn't degrade another tenant's experience. Limits scale with tier.

### Tier-Based Limits

| Tier | Requests/min | Writes/hour | Uploads/day | AI calls/day |
|------|--------------|-------------|-------------|--------------|
| Seedling (free) | 100 | 50 | 10 | 25 |
| Sapling | 500 | 200 | 50 | 100 |
| Oak | 1,000 | 500 | 200 | 500 |
| Evergreen | 5,000 | 2,000 | 1,000 | 2,500 |

### TenantDO Rate Limit Implementation

```typescript
// In TenantDO

interface RateLimitConfig {
  key: string;         // 'requests', 'writes', 'uploads', 'ai'
  limit: number;       // Max count
  windowSeconds: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;     // Unix timestamp
  retryAfter?: number; // Seconds until reset
}

class TenantDO extends DurableObject {
  // Rate limit storage schema:
  // CREATE TABLE rate_limits (
  //   key TEXT PRIMARY KEY,
  //   count INTEGER NOT NULL,
  //   window_start INTEGER NOT NULL
  // );

  async checkRateLimit(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
    const now = Math.floor(Date.now() / 1000);
    
    // Get current window
    const result = await this.ctx.storage.sql
      .exec('SELECT count, window_start FROM rate_limits WHERE key = ?', key)
      .toArray();
    
    const row = result[0];
    const windowStart = row?.window_start ?? now;
    const windowEnd = windowStart + windowSeconds;
    
    // Window expired? Reset.
    if (now >= windowEnd) {
      await this.ctx.storage.sql.exec(
        'INSERT OR REPLACE INTO rate_limits (key, count, window_start) VALUES (?, 1, ?)',
        key, now
      );
      return {
        allowed: true,
        remaining: limit - 1,
        resetAt: now + windowSeconds,
      };
    }
    
    // Check if over limit
    const currentCount = row?.count ?? 0;
    if (currentCount >= limit) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: windowEnd,
        retryAfter: windowEnd - now,
      };
    }
    
    // Increment and allow
    await this.ctx.storage.sql.exec(
      'UPDATE rate_limits SET count = count + 1 WHERE key = ?',
      key
    );
    
    return {
      allowed: true,
      remaining: limit - currentCount - 1,
      resetAt: windowEnd,
    };
  }

  // Convenience method with tier-aware defaults
  async checkTenantRateLimit(
    category: 'requests' | 'writes' | 'uploads' | 'ai'
  ): Promise<RateLimitResult> {
    const config = await this.getConfig();
    const limits = TIER_LIMITS[config.tier];
    
    const limitConfig = {
      requests: { limit: limits.requestsPerMin, window: 60 },
      writes: { limit: limits.writesPerHour, window: 3600 },
      uploads: { limit: limits.uploadsPerDay, window: 86400 },
      ai: { limit: limits.aiPerDay, window: 86400 },
    }[category];
    
    return this.checkRateLimit(category, limitConfig.limit, limitConfig.window);
  }
}

const TIER_LIMITS = {
  seedling: { requestsPerMin: 100, writesPerHour: 50, uploadsPerDay: 10, aiPerDay: 25 },
  sapling: { requestsPerMin: 500, writesPerHour: 200, uploadsPerDay: 50, aiPerDay: 100 },
  oak: { requestsPerMin: 1000, writesPerHour: 500, uploadsPerDay: 200, aiPerDay: 500 },
  evergreen: { requestsPerMin: 5000, writesPerHour: 2000, uploadsPerDay: 1000, aiPerDay: 2500 },
};
```

### Router Integration

```typescript
// In router worker middleware

async function tenantRateLimitMiddleware(
  request: Request, 
  env: Env, 
  tenant: string
): Promise<Response | null> {
  const tenantDO = env.TENANTS.get(env.TENANTS.idFromName(`tenant:${tenant}`));
  
  // Determine category based on request
  const category = categorizRequest(request);
  const result = await tenantDO.checkTenantRateLimit(category);
  
  if (!result.allowed) {
    return new Response(JSON.stringify({
      error: 'tenant_rate_limited',
      category,
      retryAfter: result.retryAfter,
      resetAt: new Date(result.resetAt * 1000).toISOString(),
    }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(result.retryAfter),
        'X-RateLimit-Limit': String(TIER_LIMITS[tenant.tier][category]),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(result.resetAt),
      },
    });
  }
  
  // Add rate limit headers even on success
  request.headers.set('X-RateLimit-Remaining', String(result.remaining));
  
  return null; // Continue processing
}

function categorizeRequest(request: Request): 'requests' | 'writes' | 'uploads' | 'ai' {
  const url = new URL(request.url);
  const method = request.method;
  
  if (url.pathname.includes('/api/ai/') || url.pathname.includes('/api/wisp/')) {
    return 'ai';
  }
  if (url.pathname.includes('/api/upload') || url.pathname.includes('/api/images')) {
    return 'uploads';
  }
  if (method === 'POST' || method === 'PUT' || method === 'DELETE') {
    return 'writes';
  }
  return 'requests';
}
```

---

## Layer 3: User Rate Limiting (SessionDO)

### Purpose

Per-user limits prevent abuse while being fair to legitimate heavy users. Also enables graduated response.

### SessionDO Rate Limit Extension

```typescript
// Add to SessionDO

interface UserRateLimitState {
  warnings: number;       // Escalation counter
  lastWarning: number;    // Timestamp
  shadowBanned: boolean;  // Silent degradation
  bannedUntil: number | null;
}

class SessionDO extends DurableObject {
  // Rate limit storage:
  // CREATE TABLE user_rate_limits (
  //   key TEXT PRIMARY KEY,
  //   count INTEGER NOT NULL,
  //   window_start INTEGER NOT NULL
  // );
  // 
  // CREATE TABLE user_abuse_state (
  //   key TEXT PRIMARY KEY DEFAULT 'state',
  //   warnings INTEGER DEFAULT 0,
  //   last_warning INTEGER,
  //   shadow_banned INTEGER DEFAULT 0,
  //   banned_until INTEGER
  // );

  async checkUserRateLimit(
    endpoint: string,
    limit: number,
    windowSeconds: number
  ): Promise<RateLimitResult & { warning?: boolean; banned?: boolean }> {
    // Check if user is banned
    const state = await this.getAbuseState();
    if (state.bannedUntil && Date.now() / 1000 < state.bannedUntil) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: state.bannedUntil,
        retryAfter: state.bannedUntil - Math.floor(Date.now() / 1000),
        banned: true,
      };
    }
    
    // Check rate limit
    const key = `rate:${endpoint}`;
    const result = await this.checkRateLimit(key, limit, windowSeconds);
    
    if (!result.allowed) {
      // Escalate abuse state
      await this.escalateAbuse();
      const newState = await this.getAbuseState();
      
      return {
        ...result,
        warning: newState.warnings > 0 && newState.warnings < 3,
        banned: newState.bannedUntil !== null,
      };
    }
    
    return result;
  }

  private async getAbuseState(): Promise<UserRateLimitState> {
    const result = await this.ctx.storage.sql
      .exec('SELECT * FROM user_abuse_state WHERE key = ?', 'state')
      .toArray();
    
    if (result.length === 0) {
      return { warnings: 0, lastWarning: 0, shadowBanned: false, bannedUntil: null };
    }
    
    return {
      warnings: result[0].warnings,
      lastWarning: result[0].last_warning,
      shadowBanned: result[0].shadow_banned === 1,
      bannedUntil: result[0].banned_until,
    };
  }

  private async escalateAbuse(): Promise<void> {
    const state = await this.getAbuseState();
    const now = Math.floor(Date.now() / 1000);
    
    // Reset warnings if last warning was >24h ago
    const warningDecay = 24 * 60 * 60;
    let newWarnings = state.warnings;
    if (now - state.lastWarning > warningDecay) {
      newWarnings = 0;
    }
    
    newWarnings++;
    
    // Graduated response
    let bannedUntil = null;
    let shadowBanned = state.shadowBanned;
    
    if (newWarnings >= 5) {
      // 5+ violations in 24h: 24-hour ban
      bannedUntil = now + 86400;
    } else if (newWarnings >= 3) {
      // 3-4 violations: Shadow ban (requests succeed but with artificial delay)
      shadowBanned = true;
    }
    
    await this.ctx.storage.sql.exec(`
      INSERT OR REPLACE INTO user_abuse_state 
      (key, warnings, last_warning, shadow_banned, banned_until)
      VALUES ('state', ?, ?, ?, ?)
    `, newWarnings, now, shadowBanned ? 1 : 0, bannedUntil);
    
    // Log for security analysis
    console.log(JSON.stringify({
      event: 'abuse_escalation',
      userId: this.ctx.id.toString(),
      warnings: newWarnings,
      shadowBanned,
      bannedUntil,
      timestamp: new Date().toISOString(),
    }));
  }

  // Check if request should be artificially delayed (shadow ban)
  async getShadowBanDelay(): Promise<number> {
    const state = await this.getAbuseState();
    if (state.shadowBanned) {
      // Add 1-3 second random delay
      return 1000 + Math.random() * 2000;
    }
    return 0;
  }
}
```

### Endpoint-Specific User Limits

```typescript
// Limits vary by sensitivity of endpoint

const USER_RATE_LIMITS: Record<string, { limit: number; window: number }> = {
  // Auth endpoints (most sensitive)
  'auth/login': { limit: 5, window: 300 },      // 5 per 5 minutes
  'auth/token': { limit: 10, window: 60 },      // 10 per minute
  'auth/password-reset': { limit: 3, window: 3600 }, // 3 per hour
  
  // Write endpoints
  'posts/create': { limit: 10, window: 3600 },  // 10 posts per hour
  'posts/update': { limit: 30, window: 3600 },  // 30 updates per hour
  'comments/create': { limit: 20, window: 300 }, // 20 comments per 5 min
  
  // Upload endpoints
  'upload/image': { limit: 20, window: 3600 },  // 20 images per hour
  'upload/media': { limit: 10, window: 3600 },  // 10 media per hour
  
  // AI endpoints (expensive)
  'ai/fireside': { limit: 50, window: 86400 },  // 50 per day
  'ai/draft': { limit: 20, window: 86400 },     // 20 per day
  
  // Default for unspecified endpoints
  'default': { limit: 100, window: 60 },        // 100 per minute
};
```

---

## Layer 4: Endpoint-Specific Limits

### Middleware Chain

```typescript
// In worker middleware

async function rateLimitMiddleware(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response | null> {
  const url = new URL(request.url);
  const tenant = extractTenant(request);
  const user = await validateAuth(request, env);
  
  // Layer 2: Tenant limit (always applies)
  if (tenant) {
    const tenantResult = await checkTenantRateLimit(env, tenant, request);
    if (tenantResult) return tenantResult; // 429 response
  }
  
  // Layer 3: User limit (if authenticated)
  if (user) {
    const userResult = await checkUserRateLimit(env, user.id, request);
    if (userResult.response) return userResult.response;
    
    // Apply shadow ban delay if applicable
    if (userResult.delay > 0) {
      await new Promise(resolve => setTimeout(resolve, userResult.delay));
    }
  }
  
  // Layer 4: Endpoint-specific limits (additional restrictions)
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

// Special endpoint limits (on top of user/tenant limits)
const ENDPOINT_LIMITS: Record<string, { limit: number; window: number; periodDescription: string }> = {
  'POST:/api/posts': { limit: 10, window: 3600, periodDescription: '10 posts per hour' },
  'POST:/api/signup': { limit: 3, window: 86400, periodDescription: '3 signups per day per IP' },
  'POST:/api/password-reset': { limit: 3, window: 3600, periodDescription: '3 reset requests per hour' },
  'POST:/api/ai/fireside/send': { limit: 100, window: 86400, periodDescription: '100 AI messages per day' },
  'DELETE:/api/account': { limit: 1, window: 86400, periodDescription: '1 account deletion per day' },
};
```

---

## Graduated Response System

### Response Escalation

```
First violation:  → Allow + Warning header
Second violation: → Allow + Warning header + Log
Third violation:  → 429 + 1 min cooldown
Fourth violation: → 429 + 5 min cooldown + Shadow ban
Fifth violation:  → 429 + 24 hour ban
```

### Response Headers

```typescript
function buildRateLimitResponse(
  result: RateLimitResult,
  context: { warning?: boolean; banned?: boolean; shadowBan?: boolean }
): Response {
  const headers = new Headers({
    'Content-Type': 'application/json',
    'X-RateLimit-Remaining': String(result.remaining),
    'X-RateLimit-Reset': String(result.resetAt),
  });
  
  if (!result.allowed) {
    headers.set('Retry-After', String(result.retryAfter));
  }
  
  if (context.warning) {
    headers.set('X-RateLimit-Warning', 'true');
  }
  
  if (context.banned) {
    headers.set('X-RateLimit-Banned', 'true');
  }
  
  // Never expose shadow ban status
  
  return new Response(JSON.stringify({
    error: result.allowed ? undefined : 'rate_limited',
    retryAfter: result.retryAfter,
    remaining: result.remaining,
    resetAt: new Date(result.resetAt * 1000).toISOString(),
  }), {
    status: result.allowed ? 200 : 429,
    headers,
  });
}
```

---

## Integration with Heartwood

### Auth-Specific Rate Limiting

```typescript
// In Heartwood OAuth handler

async function handleTokenRequest(request: Request, env: Env): Promise<Response> {
  const ip = request.headers.get('cf-connecting-ip') ?? 'unknown';
  
  // IP-level brute force protection (Layer 1 handled by CF, this is backup)
  const ipKey = `auth:ip:${ip}`;
  const ipResult = await checkRateLimit(env.RATE_KV, ipKey, 20, 300); // 20 per 5 min
  
  if (!ipResult.allowed) {
    // Log potential brute force
    console.log(JSON.stringify({
      event: 'auth_ip_rate_limit',
      ip: ip,
      timestamp: new Date().toISOString(),
    }));
    
    return new Response(JSON.stringify({
      error: 'too_many_requests',
      message: 'Too many authentication attempts. Please try again later.',
    }), {
      status: 429,
      headers: { 'Retry-After': String(ipResult.retryAfter) },
    });
  }
  
  // Attempt authentication...
  const body = await request.formData();
  const grantType = body.get('grant_type');
  
  if (grantType === 'password') {
    // Password grants get stricter limits
    const username = body.get('username');
    const userKey = `auth:user:${username}`;
    const userResult = await checkRateLimit(env.RATE_KV, userKey, 5, 900); // 5 per 15 min
    
    if (!userResult.allowed) {
      // Account lockout
      console.log(JSON.stringify({
        event: 'auth_user_lockout',
        username: username,
        ip: ip,
        timestamp: new Date().toISOString(),
      }));
      
      return new Response(JSON.stringify({
        error: 'account_locked',
        message: 'Too many failed attempts. Account temporarily locked.',
      }), {
        status: 429,
        headers: { 'Retry-After': String(userResult.retryAfter) },
      });
    }
  }
  
  // Continue with authentication...
}
```

### Login Attempt Tracking in SessionDO

```typescript
// In SessionDO

async function recordLoginAttempt(success: boolean): Promise<{
  allowed: boolean;
  lockoutRemaining?: number;
}> {
  const state = await this.getLoginState();
  const now = Math.floor(Date.now() / 1000);
  
  // Check if currently locked out
  if (state.lockoutUntil && now < state.lockoutUntil) {
    return {
      allowed: false,
      lockoutRemaining: state.lockoutUntil - now,
    };
  }
  
  if (success) {
    // Reset failed attempts on success
    await this.ctx.storage.sql.exec(`
      UPDATE login_state SET failed_attempts = 0, lockout_until = NULL WHERE key = 'state'
    `);
    return { allowed: true };
  }
  
  // Failed attempt
  const newFailedAttempts = state.failedAttempts + 1;
  let lockoutUntil = null;
  
  // Progressive lockout
  if (newFailedAttempts >= 10) {
    lockoutUntil = now + 3600; // 1 hour
  } else if (newFailedAttempts >= 5) {
    lockoutUntil = now + 300; // 5 minutes
  } else if (newFailedAttempts >= 3) {
    lockoutUntil = now + 60; // 1 minute
  }
  
  await this.ctx.storage.sql.exec(`
    INSERT OR REPLACE INTO login_state (key, failed_attempts, last_attempt, lockout_until)
    VALUES ('state', ?, ?, ?)
  `, newFailedAttempts, now, lockoutUntil);
  
  return {
    allowed: lockoutUntil === null,
    lockoutRemaining: lockoutUntil ? lockoutUntil - now : undefined,
  };
}
```

---

## Monitoring & Alerting

### Metrics to Track

```typescript
interface RateLimitMetrics {
  // Per-layer stats
  edgeBlocks: number;        // CF rate limit blocks
  tenantBlocks: number;      // TenantDO blocks
  userBlocks: number;        // SessionDO blocks
  endpointBlocks: number;    // Endpoint-specific blocks
  
  // Abuse tracking
  warningsIssued: number;
  shadowBansActive: number;
  bansActive: number;
  
  // Per-tenant breakdown
  topBlockedTenants: Array<{ tenant: string; blocks: number }>;
  
  // Per-endpoint breakdown
  topBlockedEndpoints: Array<{ endpoint: string; blocks: number }>;
}
```

### Vista Integration

```typescript
// Report rate limit events to Vista

async function reportRateLimitEvent(env: Env, event: {
  layer: 'edge' | 'tenant' | 'user' | 'endpoint';
  blocked: boolean;
  tenant?: string;
  userId?: string;
  endpoint: string;
  ip: string;
}) {
  // Buffer in KV, flush to D1 via Vista collector
  const key = `ratelimit:${Date.now()}:${crypto.randomUUID()}`;
  await env.MONITOR_KV.put(key, JSON.stringify(event), {
    expirationTtl: 3600, // 1 hour buffer
  });
}
```

### Alert Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| Edge blocks/min | 100 | 1000 |
| Tenant blocks/min | 50 | 200 |
| User bans/hour | 10 | 50 |
| Single IP blocks/min | 20 | 100 |

---

## Implementation Checklist

### Phase 1: Edge Rate Limiting (Day 1-2)

- [ ] Configure Cloudflare WAF rate limiting rules
- [ ] Set up general request limit (1000/min/IP)
- [ ] Set up auth endpoint limit (50/5min/IP)
- [ ] Set up upload endpoint limit (100/hour/IP)
- [ ] Test with synthetic traffic

### Phase 2: Tenant Rate Limiting (Day 3-4)

- [ ] Add rate limit tables to TenantDO
- [ ] Implement `checkTenantRateLimit()`
- [ ] Add tier-based limits
- [ ] Integrate with router middleware
- [ ] Add rate limit headers to responses

### Phase 3: User Rate Limiting (Day 5-7)

- [ ] Add rate limit tables to SessionDO
- [ ] Implement `checkUserRateLimit()`
- [ ] Implement graduated response system
- [ ] Add shadow ban logic
- [ ] Integrate with Heartwood login flow

### Phase 4: Monitoring (Day 8-10)

- [ ] Add rate limit event logging
- [ ] Create Vista dashboard component
- [ ] Configure alerts
- [ ] Document runbooks

---

## Cost Considerations

### Cloudflare Rate Limiting Pricing

- **Enterprise WAF:** Included
- **Pro/Business:** Rate limiting rules may have limits; check plan

### DO Storage for Rate Limits

- Each rate limit key: ~50 bytes
- Per-user abuse state: ~100 bytes
- Minimal cost impact (< $0.01/user/month)

---

## Implementation Notes

### KV vs DO for Rate Limiting

The current implementation uses Cloudflare KV for rate limit state storage. This has important implications:

**KV Race Conditions:** KV's eventual consistency model means concurrent requests can read stale counts. Under high concurrency, a user might exceed their limit before the counter catches up. This is acceptable because:

1. Rate limits are protective, not billing-critical — slight overruns are fine
2. The fail-open design already allows requests on KV errors
3. KV's global distribution provides low-latency reads

**When to Migrate to DO:** For endpoints where precision matters (auth brute-force protection, billing-sensitive AI calls), consider Durable Objects:

- DO provides strong consistency within a single object
- Trade-off: single point of execution (slightly higher latency for distant users)
- Migration path: Create `RateLimitDO` for high-precision endpoints

**Recommended Architecture:**
- **KV:** General rate limits (requests, writes, uploads)
- **DO:** Auth endpoints, AI endpoints, billing-sensitive operations

---

*Pattern created: January 2026*  
*For use by: Heartwood, Lattice, all Grove Workers*
