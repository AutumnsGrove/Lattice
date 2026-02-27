# Lattice Security Remediation Plan

## Pre-v1.0 Release - Generated 2026-01-11

This document contains detailed, agent-executable tasks for fixing all security issues identified in the comprehensive audit. Each task is self-contained with all context needed for independent execution.

---

## Batch Organization

| Batch       | Focus                               | Tasks   | Parallelizable | Est. Time |
| ----------- | ----------------------------------- | ------- | -------------- | --------- |
| **Batch 1** | Critical Auth & Multi-Tenant        | 5 tasks | ✅ Yes         | 2-3 hours |
| **Batch 2** | Critical Rate Limiting & Headers    | 5 tasks | ✅ Yes         | 2-3 hours |
| **Batch 3** | High Priority - Logging & Secrets   | 4 tasks | ✅ Yes         | 1-2 hours |
| **Batch 4** | High Priority - Validation & CORS   | 5 tasks | ✅ Yes         | 2 hours   |
| **Batch 5** | High Priority - Database & Webhooks | 4 tasks | ✅ Yes         | 2 hours   |
| **Batch 6** | Medium Priority - Headers & CSP     | 4 tasks | ✅ Yes         | 1-2 hours |
| **Batch 7** | Medium Priority - Tests & Docs      | 3 tasks | ✅ Yes         | 2 hours   |

**Total Estimated Time:** 12-17 hours (but parallelized into ~4 hours with agents)

---

# BATCH 1: Critical Auth & Multi-Tenant Fixes

## Task 1.1: Add Tenant Ownership Verification to Posts API

**Severity:** 🔴 CRITICAL
**Priority:** P0
**Dependencies:** None
**Estimated Time:** 30 minutes

### Context

The posts API endpoints check for authentication but don't verify the user owns the tenant. The tenant context comes from the subdomain URL, not user ownership.

### Files to Modify

1. `/libs/engine/src/routes/api/posts/+server.ts`
2. `/libs/engine/src/routes/api/posts/[slug]/+server.ts`

### Current Code (Problem)

```typescript
// In /api/posts/+server.ts (lines 37-46)
export const POST: RequestHandler = async ({ request, platform, locals }) => {
  if (!locals.user) {
    throw error(401, "Unauthorized");
  }
  if (!locals.tenantId) {
    throw error(401, "Tenant ID not found");
  }
  // ❌ MISSING: Ownership verification
  const tenantDb = getTenantDb(platform.env.DB, { tenantId: locals.tenantId });
```

### Required Fix

```typescript
// Add import at top of file
import { getVerifiedTenantId } from "$lib/auth/session.js";

// Replace the auth check section with:
export const POST: RequestHandler = async ({ request, platform, locals }) => {
  if (!locals.user) {
    throw error(401, "Unauthorized");
  }
  if (!platform?.env?.DB) {
    throw error(500, "Database not configured");
  }

  // ✅ Verify the authenticated user owns this tenant
  const tenantId = await getVerifiedTenantId(
    platform.env.DB,
    locals.tenantId,
    locals.user
  );

  const tenantDb = getTenantDb(platform.env.DB, { tenantId });
```

### Apply Same Pattern To

- `POST` handler in `/api/posts/+server.ts`
- `GET` handler in `/api/posts/+server.ts` (for admin queries)
- `GET` handler in `/api/posts/[slug]/+server.ts`
- `PUT` handler in `/api/posts/[slug]/+server.ts`
- `DELETE` handler in `/api/posts/[slug]/+server.ts`

### Verification Steps

1. Run existing tests: `pnpm test:run --filter=posts`
2. Manual test: Login as user A, try to POST to user B's subdomain - should get 403
3. Check that legitimate post creation still works

---

## Task 1.2: Add Tenant Ownership Verification to Pages API

**Severity:** 🔴 CRITICAL
**Priority:** P0
**Dependencies:** None
**Estimated Time:** 20 minutes

### Context

Same issue as posts - pages API doesn't verify tenant ownership.

### Files to Modify

1. `/libs/engine/src/routes/api/pages/+server.ts`
2. `/libs/engine/src/routes/api/pages/[slug]/+server.ts`

### Required Fix

Apply the exact same pattern as Task 1.1:

```typescript
import { getVerifiedTenantId } from "$lib/auth/session.js";

// In each handler (POST, PUT, DELETE):
const tenantId = await getVerifiedTenantId(platform.env.DB, locals.tenantId, locals.user);
```

### Verification Steps

1. Run tests: `pnpm test:run --filter=pages`
2. Manual test: Cross-tenant page creation should fail with 403

---

## Task 1.3: Add Tenant Ownership Verification to Admin Settings API

**Severity:** 🔴 CRITICAL
**Priority:** P0
**Dependencies:** None
**Estimated Time:** 15 minutes

### Files to Modify

1. `/libs/engine/src/routes/api/admin/settings/+server.ts`

### Current Code (Problem)

```typescript
// Lines 18-36
export const PUT: RequestHandler = async ({ request, platform, locals }) => {
  if (!locals.user) {
    throw error(401, "Unauthorized");
  }
  if (!locals.tenantId) {
    throw error(400, "Tenant context required");
  }
  // ❌ MISSING: Ownership verification
```

### Required Fix

```typescript
import { getVerifiedTenantId } from "$lib/auth/session.js";

export const PUT: RequestHandler = async ({ request, platform, locals }) => {
  if (!locals.user) {
    throw error(401, "Unauthorized");
  }
  if (!platform?.env?.DB) {
    throw error(500, "Database not configured");
  }

  // ✅ Verify ownership
  const tenantId = await getVerifiedTenantId(
    platform.env.DB,
    locals.tenantId,
    locals.user
  );

  // Use tenantId instead of locals.tenantId for all subsequent operations
```

### Verification Steps

1. Manual test: User A cannot change User B's site settings
2. Verify legitimate settings changes still work

---

## Task 1.4: Add Tenant Ownership Verification to Images API

**Severity:** 🔴 CRITICAL
**Priority:** P0
**Dependencies:** None
**Estimated Time:** 25 minutes

### Files to Modify

1. `/libs/engine/src/routes/api/images/upload/+server.ts`
2. `/libs/engine/src/routes/api/images/delete/+server.ts`
3. `/libs/engine/src/routes/api/images/list/+server.ts`
4. `/libs/engine/src/routes/api/images/analyze/+server.ts`

### Required Fix Pattern

```typescript
import { getVerifiedTenantId } from "$lib/auth/session.js";

// At the start of each handler after auth check:
const tenantId = await getVerifiedTenantId(platform.env.DB, locals.tenantId, locals.user);

// Replace all uses of locals.tenantId with tenantId
```

### Special Note for upload/+server.ts

The R2 key generation at line 155 uses `locals.tenantId` - make sure to use the verified `tenantId` instead:

```typescript
// Line 155 - CHANGE FROM:
const key = `${locals.tenantId}/${datePath}/${filename}`;
// TO:
const key = `${tenantId}/${datePath}/${filename}`;
```

### Verification Steps

1. User A cannot upload to User B's R2 bucket
2. User A cannot delete User B's images
3. User A cannot list User B's images
4. Legitimate image operations still work

---

## Task 1.5: Add Ownership Check to Admin Layout Server

**Severity:** 🔴 HIGH
**Priority:** P0
**Dependencies:** None
**Estimated Time:** 15 minutes

### Files to Modify

1. `/libs/engine/src/routes/admin/+layout.server.ts`

### Current Code (Problem)

```typescript
// Lines 20-48
export const load: LayoutServerLoad = async ({ locals, url, platform }) => {
  if (!locals.user) {
    throw redirect(302, `/auth/login?redirect=${encodeURIComponent(url.pathname)}`);
  }

  let tenant: TenantInfo | null = null;
  if (locals.tenantId && platform?.env?.DB) {
    // ❌ Loads tenant data without ownership check
    const result = await platform.env.DB.prepare(
      `SELECT id, subdomain, display_name FROM tenants WHERE id = ?`,
    ).bind(locals.tenantId).first();
```

### Required Fix

```typescript
export const load: LayoutServerLoad = async ({ locals, url, platform }) => {
  if (!locals.user) {
    throw redirect(302, `/auth/login?redirect=${encodeURIComponent(url.pathname)}`);
  }

  let tenant: TenantInfo | null = null;
  if (locals.tenantId && platform?.env?.DB) {
    // ✅ Query includes ownership verification
    const result = await platform.env.DB.prepare(
      `SELECT id, subdomain, display_name FROM tenants
       WHERE id = ? AND LOWER(email) = LOWER(?)`,
    ).bind(locals.tenantId, locals.user.email).first();

    // If no result, user doesn't own this tenant
    if (!result) {
      throw redirect(302, `/?error=access_denied`);
    }

    if (result) {
      tenant = {
        id: result.id as string,
        subdomain: result.subdomain as string,
        name: (result.display_name as string) || (result.subdomain as string),
      };
    }
  }
```

### Verification Steps

1. User A visiting User B's admin panel gets redirected
2. User A visiting their own admin panel works normally

---

# BATCH 2: Critical Rate Limiting & Security Headers

## Task 2.1: Add Rate Limiting to AI Image Analyze Endpoint

**Severity:** 🔴 CRITICAL
**Priority:** P0
**Dependencies:** None
**Estimated Time:** 20 minutes

### Context

The AI image analyze endpoint calls Claude API (~$0.003/request) with NO rate limiting. Attackers can cause massive API costs.

### Files to Modify

1. `/libs/engine/src/routes/api/images/analyze/+server.ts`

### Current Code (Problem)

```typescript
// Lines 24-40 - Only auth and CSRF checks, no rate limiting
export const POST: RequestHandler = async ({ request, platform, locals }) => {
  if (!locals.user) {
    throw error(401, "Unauthorized");
  }
  if (!validateCSRF(request)) {
    throw error(403, "Invalid origin");
  }
  // ❌ No rate limiting before expensive Claude API call
```

### Required Fix

```typescript
import { checkRateLimit, buildRateLimitKey, rateLimitHeaders } from "$lib/server/rate-limits/middleware.js";

export const POST: RequestHandler = async ({ request, platform, locals }) => {
  if (!locals.user) {
    throw error(401, "Unauthorized");
  }
  if (!validateCSRF(request)) {
    throw error(403, "Invalid origin");
  }

  // ✅ Rate limit expensive AI operations
  const kv = platform?.env?.CACHE_KV;
  if (kv) {
    const { allowed, remaining, resetAt, response } = await checkRateLimit({
      kv,
      key: buildRateLimitKey('ai/analyze', locals.user.id),
      limit: 20, // 20 analyses per day
      windowSeconds: 86400, // 24 hours
      namespace: 'ai-ratelimit',
    });

    if (response) {
      return new Response(JSON.stringify({
        error: 'rate_limited',
        message: 'Daily AI analysis limit reached. Limit resets in 24 hours.',
        remaining: 0,
        resetAt: new Date(resetAt * 1000).toISOString()
      }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          ...rateLimitHeaders({ remaining, resetAt, allowed }, 20)
        }
      });
    }
  }

  // ... rest of existing code
```

### Verification Steps

1. Call endpoint 21 times - 21st should return 429
2. Check rate limit headers in response
3. Verify legitimate usage still works

---

## Task 2.2: Add Rate Limiting to Image Upload Endpoint

**Severity:** 🔴 CRITICAL
**Priority:** P0
**Dependencies:** None
**Estimated Time:** 20 minutes

### Files to Modify

1. `/libs/engine/src/routes/api/images/upload/+server.ts`

### Required Fix

Add after authentication checks (around line 44):

```typescript
import {
	checkRateLimit,
	buildRateLimitKey,
	rateLimitHeaders,
} from "$lib/server/rate-limits/middleware.js";

// Add after auth/tenant checks:
const kv = platform?.env?.CACHE_KV;
if (kv) {
	const { allowed, remaining, resetAt, response } = await checkRateLimit({
		kv,
		key: buildRateLimitKey("upload/image", locals.user.id),
		limit: 50, // 50 uploads per hour
		windowSeconds: 3600,
		namespace: "upload-ratelimit",
	});

	if (response) {
		return new Response(
			JSON.stringify({
				error: "rate_limited",
				message: "Upload limit reached. Please wait before uploading more images.",
				remaining: 0,
				resetAt: new Date(resetAt * 1000).toISOString(),
			}),
			{
				status: 429,
				headers: {
					"Content-Type": "application/json",
					...rateLimitHeaders({ remaining, resetAt, allowed }, 50),
				},
			},
		);
	}
}
```

### Verification Steps

1. Upload 51 images rapidly - 51st should be blocked
2. Legitimate uploads work normally

---

## Task 2.3: Add HSTS Header to Engine App

**Severity:** 🔴 CRITICAL
**Priority:** P0
**Dependencies:** None
**Estimated Time:** 10 minutes

### Files to Modify

1. `/libs/engine/src/hooks.server.ts`

### Location

Find the section where security headers are set (around lines 385-409).

### Required Fix

Add after the existing security headers (around line 392):

```typescript
// Add HSTS header for HTTPS enforcement
response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
```

### Verification Steps

1. Deploy to staging
2. `curl -I https://staging.grove.place | grep -i strict-transport`
3. Should see: `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`

---

## Task 2.4: Add Security Headers to Landing App

**Severity:** 🔴 CRITICAL
**Priority:** P0
**Dependencies:** None
**Estimated Time:** 20 minutes

### Context

The landing app has NO security headers at all.

### Files to Modify

1. `/landing/src/hooks.server.ts`

### Required Fix

Find the `handle` function and add headers before returning:

```typescript
import type { Handle } from "@sveltejs/kit";

export const handle: Handle = async ({ event, resolve }) => {
	// ... existing auth/session logic ...

	const response = await resolve(event);

	// ✅ Add security headers
	response.headers.set("X-Frame-Options", "DENY");
	response.headers.set("X-Content-Type-Options", "nosniff");
	response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
	response.headers.set("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
	response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");

	// CSP for landing page
	const csp = [
		"default-src 'self'",
		"script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",
		"style-src 'self' 'unsafe-inline'",
		"img-src 'self' https://cdn.grove.place data:",
		"font-src 'self' https://cdn.grove.place",
		"connect-src 'self' https://*.grove.place https://challenges.cloudflare.com",
		"frame-src https://challenges.cloudflare.com",
		"frame-ancestors 'none'",
		"upgrade-insecure-requests",
	].join("; ");

	response.headers.set("Content-Security-Policy", csp);

	return response;
};
```

### Verification Steps

1. Check all headers present in browser DevTools
2. No CSP violations in console for normal pages

---

## Task 2.5: Add Security Headers to Plant & Domains Apps

**Severity:** 🔴 CRITICAL
**Priority:** P0
**Dependencies:** None
**Estimated Time:** 20 minutes

### Files to Modify

1. `/plant/src/hooks.server.ts`
2. `/domains/src/hooks.server.ts`

### Required Fix

Apply the same pattern as Task 2.4 to both files. The CSP can be slightly different per app needs.

For Plant (payments/onboarding):

```typescript
const csp = [
	"default-src 'self'",
	"script-src 'self' 'unsafe-inline' https://js.stripe.com https://challenges.cloudflare.com",
	"style-src 'self' 'unsafe-inline'",
	"img-src 'self' https://cdn.grove.place data:",
	"frame-src https://js.stripe.com https://challenges.cloudflare.com",
	"connect-src 'self' https://*.grove.place https://api.stripe.com",
	"frame-ancestors 'none'",
	"upgrade-insecure-requests",
].join("; ");
```

For Domains:

```typescript
const csp = [
	"default-src 'self'",
	"script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",
	"style-src 'self' 'unsafe-inline'",
	"img-src 'self' https://cdn.grove.place data:",
	"connect-src 'self' https://*.grove.place",
	"frame-src https://challenges.cloudflare.com",
	"frame-ancestors 'none'",
	"upgrade-insecure-requests",
].join("; ");
```

### Verification Steps

1. Headers present on both apps
2. Stripe checkout still works on plant app
3. No CSP violations for normal usage

---

# BATCH 3: High Priority - Logging & Secrets

## Task 3.1: Remove Debug Logging of Environment Variables

**Severity:** 🔴 HIGH
**Priority:** P1
**Dependencies:** None
**Estimated Time:** 15 minutes

### Files to Modify

1. `/landing/src/routes/api/signup/+server.ts`

### Current Code (Problem)

```typescript
// Lines 6-11 - Debug logging exposes env keys
console.log("Environment check:", {
	hasDB: !!platform?.env?.DB,
	envKeys: Object.keys(platform?.env || {}), // ❌ Exposes all env variable names
});
```

### Required Fix

Remove the debug logging entirely, or sanitize it:

```typescript
// Option A: Remove entirely (RECOMMENDED)
// Delete lines 6-11

// Option B: If debugging needed, only log boolean flags
if (process.env.NODE_ENV === "development") {
	console.log("Environment check:", {
		hasDB: !!platform?.env?.DB,
		hasResend: !!platform?.env?.RESEND_API_KEY,
		// Don't log key names or values
	});
}
```

### Also Check These Files for Similar Issues

- `/landing/src/routes/api/auth/request-code/+server.ts`
- `/plant/src/lib/server/stripe.ts`
- Any file with `console.log` and `env`

### Search Command

```bash
grep -rn "console\.\(log\|error\)" --include="*.ts" | grep -i "env\|secret\|key\|token"
```

### Verification Steps

1. Search for any remaining env logging
2. Check production logs don't contain sensitive keys

---

## Task 3.2: Sanitize Stripe Webhook Logging

**Severity:** 🔴 HIGH
**Priority:** P1
**Dependencies:** None
**Estimated Time:** 30 minutes

### Context

The Stripe webhook handler logs customer emails, usernames, and error details that may contain PII.

### Files to Modify

1. `/plant/src/routes/api/webhooks/stripe/+server.ts`
2. `/plant/src/lib/server/stripe.ts`

### Lines to Fix in webhook handler

Find and sanitize these console.log/error calls:

- Line 26: `console.error("[Webhook] Error processing event:", error)`
- Line 45: `console.log(...)`
- Line 81: `console.log(...)`
- Line 150, 163, 190, 207, 223, 256, 279, 303, 341, 362, 366, 422, 459, 463, 505, 545, 549

### Required Fix Pattern

```typescript
// BEFORE (unsafe):
console.log(`[Webhook] Created tenant for ${onboarding.username}`);
console.error("[Webhook] Error processing event:", error);

// AFTER (safe):
console.log(`[Webhook] Tenant created successfully`, { eventId: event.id });
console.error("[Webhook] Error processing event", {
	eventId: event.id,
	eventType: event.type,
	errorType: error instanceof Error ? error.name : "Unknown",
});
```

### Create a Safe Logger Utility (Optional but Recommended)

```typescript
// /plant/src/lib/server/logger.ts
export function logWebhook(message: string, metadata: Record<string, unknown> = {}) {
	// Strip any PII from metadata
	const safeMetadata = Object.fromEntries(
		Object.entries(metadata).filter(
			([key]) => !["email", "username", "customer", "name"].includes(key.toLowerCase()),
		),
	);
	console.log(`[Webhook] ${message}`, JSON.stringify(safeMetadata));
}

export function logWebhookError(
	message: string,
	error: unknown,
	metadata: Record<string, unknown> = {},
) {
	console.error(`[Webhook] ${message}`, {
		errorType: error instanceof Error ? error.name : "Unknown",
		...metadata,
	});
}
```

### Verification Steps

1. Trigger a test webhook
2. Check logs contain no email addresses or usernames
3. Logs still contain enough info for debugging (event IDs, types)

---

## Task 3.3: Remove Hardcoded Stripe Price IDs

**Severity:** 🟠 HIGH
**Priority:** P1
**Dependencies:** None
**Estimated Time:** 20 minutes

### Context

Stripe price IDs are hardcoded in source code instead of environment variables.

### Files to Modify

1. `/plant/src/lib/server/stripe.ts` (find PRICE_ID constants)
2. Any other files with `price_` strings

### Search for Hardcoded IDs

```bash
grep -rn "price_" --include="*.ts" apps/ libs/ plant/ landing/
```

### Required Fix

```typescript
// BEFORE:
const SEEDLING_PRICE_ID = "price_1234567890abcdef";

// AFTER:
const SEEDLING_PRICE_ID = platform?.env?.STRIPE_SEEDLING_PRICE_ID;
if (!SEEDLING_PRICE_ID) {
	throw new Error("STRIPE_SEEDLING_PRICE_ID not configured");
}
```

### Environment Variables to Add

Document these in `.env.example`:

```
STRIPE_SEEDLING_PRICE_ID=price_xxx
STRIPE_SAPLING_PRICE_ID=price_xxx
STRIPE_OAK_PRICE_ID=price_xxx
STRIPE_EVERGREEN_PRICE_ID=price_xxx
```

### Verification Steps

1. No hardcoded `price_` strings in codebase
2. All price IDs loaded from environment
3. Checkout still works

---

## Task 3.4: Fix .gitignore Coverage

**Severity:** 🟠 HIGH
**Priority:** P1
**Dependencies:** None
**Estimated Time:** 10 minutes

### Files to Modify

1. `/.gitignore`

### Required Additions

```gitignore
# Existing entries are good, add these if missing:

# Environment files (all patterns)
.env
.env.*
.env.local
.env.*.local
!.env.example

# Secrets
secrets.json
*.secret
*.key
*.pem

# IDE
.vscode/
.idea/

# Wrangler
.wrangler/
.dev.vars

# Test coverage
coverage/

# Debug logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
```

### Verification Steps

1. `git status` shows no sensitive files
2. Run `git ls-files | grep -E "\.(env|secret|key)$"` - should be empty

---

# BATCH 4: High Priority - Validation & CORS

## Task 4.1: Fix Open Redirect Vulnerability

**Severity:** 🔴 CRITICAL
**Priority:** P0
**Dependencies:** None
**Estimated Time:** 15 minutes

### Files to Modify

1. `/libs/engine/src/routes/verify/+page.server.ts`

### Current Code (Problem)

```typescript
// Lines 20-21
const returnTo = url.searchParams.get("returnTo") || "/";
// ❌ No validation - can redirect to any URL
throw redirect(302, returnTo);
```

### Required Fix

```typescript
// Validate returnTo is a safe redirect target
const returnTo = url.searchParams.get("returnTo") || "/";

// Only allow relative paths or same-origin URLs
function isValidRedirect(target: string): boolean {
	// Allow relative paths
	if (target.startsWith("/") && !target.startsWith("//")) {
		return true;
	}

	// Allow same-origin absolute URLs
	try {
		const targetUrl = new URL(target, url.origin);
		return targetUrl.origin === url.origin;
	} catch {
		return false;
	}
}

const safeRedirect = isValidRedirect(returnTo) ? returnTo : "/";
throw redirect(302, safeRedirect);
```

### Verification Steps

1. `?returnTo=/admin` works (relative path)
2. `?returnTo=https://evil.com` redirects to `/` instead
3. `?returnTo=//evil.com` redirects to `/` instead
4. `?returnTo=javascript:alert(1)` redirects to `/` instead

---

## Task 4.2: Fix Wildcard CORS on Landing CDN

**Severity:** 🔴 HIGH
**Priority:** P1
**Dependencies:** None
**Estimated Time:** 20 minutes

### Files to Modify

1. `/landing/src/routes/cdn/[...path]/+server.ts`

### Current Code (Problem)

```typescript
// Line 38
headers: {
  'Access-Control-Allow-Origin': '*', // ❌ Allows any origin
```

### Required Fix

```typescript
export const OPTIONS: RequestHandler = async ({ request }) => {
	const origin = request.headers.get("Origin");

	// Validate origin against allowlist
	const isAllowed =
		origin &&
		(origin === "https://grove.place" ||
			origin === "https://www.grove.place" ||
			/^https:\/\/[\w-]+\.grove\.place$/.test(origin));

	return new Response(null, {
		headers: {
			"Access-Control-Allow-Origin": isAllowed ? origin : "https://grove.place",
			"Access-Control-Allow-Methods": "GET, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type",
			"Access-Control-Max-Age": "86400",
			Vary: "Origin", // Important for caching
		},
	});
};

export const GET: RequestHandler = async ({ request, params, platform }) => {
	const origin = request.headers.get("Origin");
	const isAllowed =
		origin && (origin === "https://grove.place" || /^https:\/\/[\w-]+\.grove\.place$/.test(origin));

	// ... existing GET logic ...

	return new Response(body, {
		headers: {
			// ... other headers ...
			"Access-Control-Allow-Origin": isAllowed && origin ? origin : "https://grove.place",
			Vary: "Origin",
		},
	});
};
```

### Verification Steps

1. `curl -H "Origin: https://alice.grove.place" ...` - allowed
2. `curl -H "Origin: https://evil.com" ...` - gets `grove.place` origin, not `*`

---

## Task 4.3: Fix Wildcard CORS on Grove Router

**Severity:** 🔴 HIGH
**Priority:** P1
**Dependencies:** None
**Estimated Time:** 15 minutes

### Files to Modify

1. `/services/grove-router/src/index.ts`

### Location

Around line 152 where CORS headers are set.

### Required Fix

Apply the same origin validation pattern as Task 4.2.

```typescript
// Add helper function
function validateOrigin(origin: string | null): string {
	if (!origin) return "https://grove.place";

	if (
		origin === "https://grove.place" ||
		origin === "https://www.grove.place" ||
		/^https:\/\/[\w-]+\.grove\.place$/.test(origin)
	) {
		return origin;
	}

	return "https://grove.place";
}

// Use in headers
headers.set("Access-Control-Allow-Origin", validateOrigin(request.headers.get("Origin")));
headers.set("Vary", "Origin");
```

---

## Task 4.4: Remove SVG from Allowed Upload Types

**Severity:** 🔴 CRITICAL
**Priority:** P0
**Dependencies:** None
**Estimated Time:** 10 minutes

### Context

SVG files can contain JavaScript and are an XSS vector.

### Files to Modify

1. `/libs/engine/src/lib/server/services/storage.ts`

### Current Code (Problem)

```typescript
// Line 135
const ALLOWED_CONTENT_TYPES = new Set([
	"image/svg+xml", // ❌ XSS risk
	// ...
]);
```

### Required Fix

```typescript
const ALLOWED_CONTENT_TYPES = new Set([
	"image/jpeg",
	"image/png",
	"image/gif",
	"image/webp",
	// 'image/svg+xml', // Removed - XSS risk. Re-enable only with proper sanitization.
	"application/json",
	// Consider removing JS types too:
	// 'text/javascript',
	// 'application/javascript',
]);
```

### Also Update Upload Endpoint Validation

In `/libs/engine/src/routes/api/images/upload/+server.ts`:

```typescript
// Line 21 - ensure SVG not in allowed types
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
// DO NOT add "image/svg+xml"
```

### Verification Steps

1. Attempt to upload `.svg` file - should be rejected
2. JPEG, PNG, GIF, WebP still work

---

## Task 4.5: Add File Extension Validation

**Severity:** 🟠 HIGH
**Priority:** P1
**Dependencies:** None
**Estimated Time:** 15 minutes

### Files to Modify

1. `/libs/engine/src/routes/api/images/upload/+server.ts`

### Location

After MIME type validation (around line 126).

### Required Fix

```typescript
// After MIME type validation, add extension validation:

// Map of MIME types to valid extensions
const MIME_TO_EXTENSIONS: Record<string, string[]> = {
	"image/jpeg": ["jpg", "jpeg"],
	"image/png": ["png"],
	"image/gif": ["gif"],
	"image/webp": ["webp"],
};

// Extract and validate extension
const originalName = file.name;
const ext = originalName.split(".").pop()?.toLowerCase();

if (!ext) {
	throw error(400, "File must have an extension");
}

const validExtensions = MIME_TO_EXTENSIONS[file.type];
if (!validExtensions || !validExtensions.includes(ext)) {
	throw error(400, `File extension '${ext}' does not match content type '${file.type}'`);
}

// Also block double extensions that might indicate attacks
if (originalName.match(/\.(php|js|html|htm|exe|sh|bat)\./i)) {
	throw error(400, "Invalid file name");
}
```

### Verification Steps

1. Upload `image.jpg` with JPEG content - works
2. Upload `malicious.php.jpg` - rejected
3. Upload `image.jpg` with PNG content (wrong extension) - rejected

---

# BATCH 5: High Priority - Database & Webhooks

## Task 5.1: Whitelist SQL Column Names in Shop

**Severity:** 🟠 HIGH
**Priority:** P1
**Dependencies:** None
**Estimated Time:** 25 minutes

### Context

Dynamic column names in UPDATE statements create SQL injection risk.

### Files to Modify

1. `/libs/engine/src/lib/payments/shop.ts`

### Search for Dynamic Column Names

```bash
grep -n "UPDATE.*SET" libs/engine/src/lib/payments/shop.ts
```

### Required Fix Pattern

```typescript
// BEFORE (unsafe):
const columns = Object.keys(data);
const setClause = columns.map((col) => `${col} = ?`).join(", ");
await db
	.prepare(`UPDATE products SET ${setClause} WHERE id = ?`)
	.bind(...values)
	.run();

// AFTER (safe):
const ALLOWED_COLUMNS = new Set(["name", "description", "price", "active", "updated_at"]);

function buildSafeUpdate(data: Record<string, unknown>): {
	setClause: string;
	values: unknown[];
} {
	const entries = Object.entries(data).filter(([key]) => ALLOWED_COLUMNS.has(key));

	if (entries.length === 0) {
		throw new Error("No valid columns to update");
	}

	const setClause = entries.map(([key]) => `${key} = ?`).join(", ");
	const values = entries.map(([, value]) => value);

	return { setClause, values };
}

// Usage:
const { setClause, values } = buildSafeUpdate(data);
await db
	.prepare(`UPDATE products SET ${setClause} WHERE id = ?`)
	.bind(...values, id)
	.run();
```

### Apply to All Dynamic Updates

Search and fix all occurrences:

```bash
grep -rn "UPDATE.*\${" libs/engine/src/lib/payments/
```

### Verification Steps

1. Attempt to inject column name: `{ "name; DROP TABLE--": "test" }` - should fail
2. Legitimate updates still work

---

## Task 5.2: Fix Webhook Race Condition with Atomic Tenant Creation

**Severity:** 🟠 HIGH
**Priority:** P1
**Dependencies:** None
**Estimated Time:** 30 minutes

### Context

Both webhook and success page try to create tenant, potentially causing duplicates.

### Files to Modify

1. `/plant/src/routes/api/webhooks/stripe/+server.ts`
2. `/plant/src/routes/success/+page.server.ts`
3. `/plant/src/lib/server/tenant.ts`

### Required Fix - Add Unique Constraint Migration

Create new migration file:

```sql
-- /plant/migrations/XXX_tenant_onboarding_unique.sql
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_onboarding_tenant_unique
ON user_onboarding(id) WHERE tenant_id IS NOT NULL;

-- Or add constraint to tenants table
CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_onboarding_unique
ON tenants(onboarding_id) WHERE onboarding_id IS NOT NULL;
```

### Required Fix - Use INSERT OR IGNORE Pattern

```typescript
// In tenant.ts - createTenantForOnboarding function
export async function createTenantForOnboarding(
	db: D1Database,
	onboarding: OnboardingRecord,
	stripeData: StripeData,
): Promise<{ created: boolean; tenantId: string }> {
	// First, try to get existing tenant
	const existing = await db
		.prepare("SELECT tenant_id FROM user_onboarding WHERE id = ? AND tenant_id IS NOT NULL")
		.bind(onboarding.id)
		.first();

	if (existing?.tenant_id) {
		return { created: false, tenantId: existing.tenant_id as string };
	}

	// Use transaction for atomic creation
	const tenantId = crypto.randomUUID();

	try {
		await db.batch([
			db
				.prepare(
					`
        INSERT INTO tenants (id, subdomain, email, display_name, active, created_at)
        VALUES (?, ?, ?, ?, 1, datetime('now'))
      `,
				)
				.bind(tenantId, onboarding.username, onboarding.email, onboarding.username),

			db
				.prepare(
					`
        UPDATE user_onboarding
        SET tenant_id = ?, status = 'completed', completed_at = datetime('now')
        WHERE id = ? AND tenant_id IS NULL
      `,
				)
				.bind(tenantId, onboarding.id),
		]);

		// Verify the update actually happened (tenant_id was null)
		const verification = await db
			.prepare("SELECT tenant_id FROM user_onboarding WHERE id = ?")
			.bind(onboarding.id)
			.first();

		if (verification?.tenant_id !== tenantId) {
			// Another process created the tenant first - use theirs
			// Clean up our orphaned tenant
			await db.prepare("DELETE FROM tenants WHERE id = ?").bind(tenantId).run();
			return { created: false, tenantId: verification?.tenant_id as string };
		}

		return { created: true, tenantId };
	} catch (error) {
		// Unique constraint violation - another process won
		const existing = await db
			.prepare("SELECT tenant_id FROM user_onboarding WHERE id = ?")
			.bind(onboarding.id)
			.first();

		if (existing?.tenant_id) {
			return { created: false, tenantId: existing.tenant_id as string };
		}

		throw error;
	}
}
```

### Update Webhook and Success Page

Both should use this function and handle `created: false` gracefully.

### Verification Steps

1. Simulate concurrent requests - only one tenant created
2. Both webhook and success page get correct tenant ID
3. No orphaned tenant records

---

## Task 5.3: Fix image_hashes Table Missing tenant_id

**Severity:** 🔴 CRITICAL
**Priority:** P0
**Dependencies:** None
**Estimated Time:** 15 minutes

### Files to Modify

1. Create migration: `/libs/engine/migrations/007_image_hashes_tenant.sql`

### Migration SQL

```sql
-- Add tenant_id column to image_hashes table
-- This fixes cross-tenant image URL exposure

-- Step 1: Add column (nullable first)
ALTER TABLE image_hashes ADD COLUMN tenant_id TEXT;

-- Step 2: Create new index (composite key)
DROP INDEX IF EXISTS idx_image_hashes_hash;
CREATE INDEX idx_image_hashes_tenant_hash ON image_hashes(tenant_id, hash);

-- Step 3: Add unique constraint for tenant+hash combination
CREATE UNIQUE INDEX idx_image_hashes_unique ON image_hashes(tenant_id, hash);

-- Note: Existing rows will have NULL tenant_id
-- They can be cleaned up manually or will be naturally replaced
```

### Update Upload Endpoint Query

In `/libs/engine/src/routes/api/images/upload/+server.ts`:

```typescript
// Line ~97-100 - Fix the query to use tenant_id
const existing = (await platform.env.DB.prepare(
	"SELECT key, url FROM image_hashes WHERE hash = ? AND tenant_id = ?",
)
	.bind(hash, tenantId)
	.first()) as { key: string; url: string } | null;

// Line ~175-180 - Fix the insert to include tenant_id
await platform.env.DB.prepare(
	"INSERT INTO image_hashes (hash, key, url, tenant_id) VALUES (?, ?, ?, ?)",
)
	.bind(hash, key, finalUrl, tenantId)
	.run();
```

### Verification Steps

1. Run migration
2. Upload same image to two different tenants - both get their own copy
3. Tenant A's duplicate detection doesn't return Tenant B's URL

---

## Task 5.4: Add Consistent Timing to Magic Link Endpoint

**Severity:** 🟠 HIGH
**Priority:** P1
**Dependencies:** None
**Estimated Time:** 15 minutes

### Context

Timing differences reveal whether an email is in the admin list.

### Files to Modify

1. `/landing/src/routes/api/auth/request-code/+server.ts`

### Current Code (Problem)

```typescript
// Non-admin returns immediately (fast)
if (adminEmails.length > 0 && !adminEmails.includes(normalizedEmail)) {
	return json({ success: true, message: "..." });
}
// Admin path does DB + email operations (slow)
```

### Required Fix

```typescript
export const POST: RequestHandler = async ({ request, platform }) => {
	const startTime = Date.now();
	const MINIMUM_RESPONSE_TIME_MS = 200; // Consistent timing

	// ... existing validation code ...

	// Helper to ensure consistent response timing
	async function respondWithTiming(response: Response): Promise<Response> {
		const elapsed = Date.now() - startTime;
		if (elapsed < MINIMUM_RESPONSE_TIME_MS) {
			await new Promise((r) =>
				setTimeout(r, MINIMUM_RESPONSE_TIME_MS - elapsed + Math.random() * 50),
			);
		}
		return response;
	}

	// Non-admin check
	if (adminEmails.length > 0 && !adminEmails.includes(normalizedEmail)) {
		return respondWithTiming(
			json({
				success: true,
				message: "If this email is registered, a code has been sent",
			}),
		);
	}

	// Admin flow
	try {
		await getOrCreateUser(DB, normalizedEmail);
		await createMagicCode(DB, normalizedEmail);
		// ... send email ...

		return respondWithTiming(
			json({
				success: true,
				message: "If this email is registered, a code has been sent",
			}),
		);
	} catch (error) {
		// Even errors should have consistent timing
		return respondWithTiming(
			json({
				success: true,
				message: "If this email is registered, a code has been sent",
			}),
		);
	}
};
```

### Also Add Rate Limiting

```typescript
// At the start of handler
const kv = platform?.env?.CACHE_KV;
const clientIp = request.headers.get("CF-Connecting-IP") || "unknown";

if (kv) {
	const { response } = await checkRateLimit({
		kv,
		key: `magic-link:${clientIp}`,
		limit: 10, // 10 requests per 5 minutes
		windowSeconds: 300,
		namespace: "auth-ratelimit",
	});
	if (response) return response;
}
```

### Verification Steps

1. Time requests for admin vs non-admin emails - should be similar
2. Rate limiting blocks rapid enumeration attempts

---

# BATCH 6: Medium Priority - Headers & CSP

## Task 6.1: Add upgrade-insecure-requests to CSP

**Severity:** 🟡 MEDIUM
**Priority:** P2
**Dependencies:** Task 2.3, 2.4, 2.5 completed
**Estimated Time:** 10 minutes

### Files to Modify

1. `/libs/engine/src/hooks.server.ts`
2. `/landing/src/hooks.server.ts`
3. `/plant/src/hooks.server.ts`
4. `/domains/src/hooks.server.ts`

### Required Fix

Add `upgrade-insecure-requests` to CSP in each file:

```typescript
const csp = [
	"default-src 'self'",
	"upgrade-insecure-requests", // ✅ Add this
	// ... rest of directives
].join("; ");
```

---

## Task 6.2: Implement Per-Route CSP for unsafe-eval

**Severity:** 🟠 HIGH
**Priority:** P1
**Dependencies:** None
**Estimated Time:** 30 minutes

### Context

CSP allows `unsafe-eval` globally for Mermaid diagrams, but it should only be enabled on pages that need it.

### Files to Modify

1. `/libs/engine/src/hooks.server.ts`

### Required Fix

```typescript
// Around line 398, modify CSP generation:

// Routes that need unsafe-eval for Mermaid diagrams
const MERMAID_ROUTES = ["/blog/", "/docs/", "/admin/blog/"];

const needsUnsafeEval = MERMAID_ROUTES.some((route) => event.url.pathname.includes(route));

const scriptSrc = needsUnsafeEval
	? "'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net https://challenges.cloudflare.com"
	: "'self' 'unsafe-inline' https://challenges.cloudflare.com";

const csp = [
	"default-src 'self'",
	`script-src ${scriptSrc}`,
	"style-src 'self' 'unsafe-inline'",
	// ... rest of directives
].join("; ");
```

### Verification Steps

1. Blog pages still render Mermaid diagrams
2. Non-blog pages have stricter CSP (check DevTools)
3. No CSP violations on any normal page

---

## Task 6.3: Add Content-Disposition to CDN Responses

**Severity:** 🟡 MEDIUM
**Priority:** P2
**Dependencies:** None
**Estimated Time:** 15 minutes

### Files to Modify

1. `/services/grove-router/src/index.ts`

### Location

Around line 147-154 where R2 responses are built.

### Required Fix

```typescript
const headers = new Headers();
headers.set("Content-Type", contentType);
headers.set("Cache-Control", "public, max-age=31536000");
headers.set("X-Content-Type-Options", "nosniff"); // ✅ Add

// Force download for potentially dangerous types
const DANGEROUS_TYPES = ["image/svg+xml", "text/html", "application/pdf", "text/javascript"];
if (DANGEROUS_TYPES.includes(contentType)) {
	headers.set("Content-Disposition", "attachment"); // ✅ Add
}
```

---

## Task 6.4: Standardize Cookie Domain Handling

**Severity:** 🟡 MEDIUM
**Priority:** P2
**Dependencies:** None
**Estimated Time:** 20 minutes

### Create Shared Utility

1. Create file: `/libs/engine/src/lib/server/cookies.ts`

```typescript
/**
 * Standardized cookie configuration for Grove platform
 */

export interface CookieOptions {
	name: string;
	value: string;
	maxAge: number;
	sameSite?: "strict" | "lax" | "none";
	httpOnly?: boolean;
	path?: string;
}

export function buildCookieHeader(options: CookieOptions, url: URL): string {
	const isProduction = url.hostname !== "localhost" && url.hostname !== "127.0.0.1";
	const isGrovePlatform = url.hostname.endsWith("grove.place");

	const parts = [
		`${options.name}=${options.value}`,
		`Path=${options.path || "/"}`,
		`Max-Age=${options.maxAge}`,
	];

	if (options.httpOnly !== false) {
		parts.push("HttpOnly");
	}

	if (isProduction) {
		parts.push("Secure");
	}

	parts.push(`SameSite=${options.sameSite || "Lax"}`);

	// Only set domain for production Grove platform
	if (isProduction && isGrovePlatform) {
		parts.push("Domain=.grove.place");
	}

	return parts.join("; ");
}
```

### Update Files to Use Utility

- `/libs/engine/src/routes/api/verify/turnstile/+server.ts`
- `/libs/engine/src/routes/auth/callback/+server.ts`
- `/landing/src/routes/auth/callback/+server.ts`

---

# BATCH 7: Medium Priority - Tests & Documentation

## Task 7.1: Add Cross-Tenant Authorization Tests

**Severity:** 🟡 MEDIUM
**Priority:** P2
**Dependencies:** Batch 1 completed
**Estimated Time:** 45 minutes

### Files to Create

1. `/libs/engine/src/routes/api/posts/posts.security.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST, PUT, DELETE } from "./+server";
import { GET as GET_SLUG, PUT as PUT_SLUG, DELETE as DELETE_SLUG } from "./[slug]/+server";

describe("Posts API - Cross-Tenant Security", () => {
	const mockDb = {
		prepare: vi.fn().mockReturnValue({
			bind: vi.fn().mockReturnValue({
				first: vi.fn(),
				run: vi.fn(),
				all: vi.fn(),
			}),
		}),
	};

	const aliceUser = { id: "alice-123", email: "alice@example.com" };
	const bobTenantId = "bob-tenant-456";

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("POST /api/posts", () => {
		it("rejects authenticated user creating post on unowned tenant", async () => {
			// Setup: Alice is authenticated, but Bob's tenant from subdomain
			const mockPlatform = { env: { DB: mockDb } };
			const mockLocals = { user: aliceUser, tenantId: bobTenantId };
			const mockRequest = {
				json: async () => ({ title: "Hacked!", content: "test" }),
			};

			// Mock: Alice doesn't own Bob's tenant
			mockDb.prepare().bind().first.mockResolvedValue(null);

			// Execute
			await expect(
				POST({
					request: mockRequest as any,
					platform: mockPlatform as any,
					locals: mockLocals as any,
				} as any),
			).rejects.toThrow(/forbidden|unauthorized|access denied/i);
		});

		it("allows authenticated user creating post on owned tenant", async () => {
			const mockPlatform = { env: { DB: mockDb } };
			const mockLocals = { user: aliceUser, tenantId: "alice-tenant-123" };
			const mockRequest = {
				json: async () => ({ title: "My Post", content: "test" }),
			};

			// Mock: Alice owns this tenant
			mockDb.prepare().bind().first.mockResolvedValue({
				id: "alice-tenant-123",
				email: "alice@example.com",
			});

			// Should not throw
			const result = await POST({
				request: mockRequest as any,
				platform: mockPlatform as any,
				locals: mockLocals as any,
			} as any);

			expect(result.status).toBe(201);
		});
	});

	describe("DELETE /api/posts/[slug]", () => {
		it("rejects authenticated user deleting post on unowned tenant", async () => {
			const mockPlatform = { env: { DB: mockDb } };
			const mockLocals = { user: aliceUser, tenantId: bobTenantId };

			mockDb.prepare().bind().first.mockResolvedValue(null); // Alice doesn't own Bob's tenant

			await expect(
				DELETE_SLUG({
					platform: mockPlatform as any,
					locals: mockLocals as any,
					params: { slug: "bobs-post" },
				} as any),
			).rejects.toThrow(/forbidden|unauthorized|access denied/i);
		});
	});
});
```

### Run Tests

```bash
pnpm test:run libs/engine/src/routes/api/posts/posts.security.test.ts
```

---

## Task 7.2: Add Rate Limiting Tests

**Severity:** 🟡 MEDIUM
**Priority:** P2
**Dependencies:** Batch 2 completed
**Estimated Time:** 30 minutes

### Files to Create

1. `/libs/engine/src/routes/api/images/analyze/analyze.security.test.ts`

```typescript
import { describe, it, expect, vi } from "vitest";

describe("AI Analyze Endpoint - Rate Limiting", () => {
	it("blocks requests after limit exceeded", async () => {
		const mockKv = {
			get: vi.fn(),
			put: vi.fn(),
		};

		// Simulate limit reached
		mockKv.get.mockResolvedValue(
			JSON.stringify({
				count: 20,
				resetAt: Date.now() + 86400000,
			}),
		);

		// ... test implementation
	});

	it("includes rate limit headers in response", async () => {
		// ... test implementation
	});

	it("allows requests within limit", async () => {
		// ... test implementation
	});
});
```

---

## Task 7.3: Create Security Documentation

**Severity:** 🟡 MEDIUM
**Priority:** P2
**Dependencies:** None
**Estimated Time:** 30 minutes

### Files to Create

1. `/docs/security/SECURITY_MODEL.md`

```markdown
# Lattice Security Model

## Multi-Tenant Architecture

### Tenant Isolation Layers

1. **Database Layer (TenantDb)**
   - All queries automatically scoped by `tenant_id`
   - Table/column name validation prevents injection
   - Foreign key constraints enforce relationships

2. **Storage Layer (R2)**
   - All keys prefixed with `{tenant_id}/`
   - Path traversal protection
   - Ownership verification before deletion

3. **API Layer**
   - Authentication via Heartwood SessionDO
   - Ownership verification via `getVerifiedTenantId()`
   - CSRF protection on all mutations

### Authentication Flow

1. User authenticates via Heartwood (Google OAuth / Magic Link)
2. Session stored in Cloudflare Durable Object
3. Session cookie set with `Domain=.grove.place`
4. Each API request verifies:
   - Valid session exists
   - User owns the tenant from current subdomain

### Security Headers

All responses include:

- `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Content-Security-Policy: [app-specific policy]`

### Rate Limiting

| Endpoint      | Limit | Window   |
| ------------- | ----- | -------- |
| Auth login    | 5     | 5 min    |
| Auth callback | 10    | 5 min    |
| Image upload  | 50    | 1 hour   |
| AI analyze    | 20    | 24 hours |
| Wisp AI       | 50    | 24 hours |

### Secrets Management

- All secrets in Cloudflare Workers secrets (wrangler secret)
- Never logged or exposed in responses
- `.env` files in `.gitignore`
- Template files show structure without values

## Security Review Checklist for New Endpoints

- [ ] Authentication required (`locals.user` check)
- [ ] Ownership verified (`getVerifiedTenantId()` for mutations)
- [ ] CSRF validation (`validateCSRF()` or `validateCSRFToken()`)
- [ ] Rate limiting for expensive operations
- [ ] Input validation and sanitization
- [ ] No PII in logs
- [ ] SQL uses parameterized queries via TenantDb
```

---

# Summary: Agent Execution Commands

## Running Batches in Parallel

```bash
# Batch 1: Critical Auth (5 tasks can run in parallel)
# Each task modifies different files

# Batch 2: Critical Rate Limiting & Headers (5 tasks)
# Each task modifies different files

# Batch 3: Logging & Secrets (4 tasks)
# Tasks 3.1 and 3.2 may touch same files - run sequentially

# Batch 4: Validation & CORS (5 tasks)
# Each task modifies different files

# Batch 5: Database & Webhooks (4 tasks)
# Task 5.2 and 5.3 may have shared dependencies

# Batch 6: Headers & CSP (4 tasks)
# Can mostly run in parallel

# Batch 7: Tests & Docs (3 tasks)
# Independent, can run in parallel
```

## Verification After Each Batch

```bash
# Type check
pnpm check

# Run tests
pnpm test:run

# Build all apps
pnpm build

# Security headers check (after deployment)
curl -I https://staging.grove.place | grep -E "Strict-Transport|X-Frame|X-Content|Content-Security"
```

---

**Document Generated:** 2026-01-11
**Total Tasks:** 27
**Estimated Total Time:** 12-17 hours (sequential) / ~4 hours (parallel with agents)
