# Security Hardening Plan

**Created**: January 18, 2026
**Priority**: P1 (High)
**Status**: Ready for Implementation (NOT YET COMPLETED — verify before moving to completed)
**Estimated Effort**: 6-8 hours

---

## Overview

Two security improvements for defense-in-depth:

1. **Webhook Payload Sanitization** - Strip PII from stored webhook payloads and implement retention policy
2. **JSON Parsing Safety** - Standardize safe JSON parsing across the codebase

---

# Part 1: Webhook Payload Sanitization

## Current State

### Problem

LemonSqueezy webhook handler stores **complete raw JSON payloads** including PII:

**File**: `apps/plant/src/routes/api/webhooks/lemonsqueezy/+server.ts` (Line 87)

```typescript
// Current - stores entire payload
await db.prepare(
  `INSERT INTO webhook_events (..., payload, ...)
   VALUES (..., ?, ...)`
).bind(..., payload, ...).run();  // Full JSON with PII
```

### PII in Stored Payloads

| Field                          | Source                        | Risk Level |
| ------------------------------ | ----------------------------- | ---------- |
| `user_email`                   | Subscription attributes       | High       |
| `user_name`                    | Subscription/Order attributes | High       |
| `card_brand`, `card_last_four` | Payment details               | Medium     |
| `city`, `region`, `country`    | Customer location             | Medium     |
| `billing_address`              | Checkout data                 | High       |

### Compliance Risks

- **GDPR Article 5** - Data minimization violation
- **PCI DSS** - Card details in logs
- **No retention policy** - Data stored indefinitely

---

## Implementation Tasks

### Task 1.1: Create Payload Sanitization Utility

**File**: `libs/engine/src/lib/utils/webhook-sanitizer.ts`

```typescript
/**
 * Sanitize webhook payloads before storage.
 * Strips PII while preserving operational data needed for debugging.
 */

interface SanitizedPayload {
	// Keep: IDs and references
	id: string;
	event_id: string;
	customer_id: number;
	subscription_id?: number;
	order_id?: number;
	product_id?: number;
	variant_id?: number;

	// Keep: Status and timestamps
	status: string;
	event_name: string;
	created_at: string;
	updated_at?: string;
	renews_at?: string;
	ends_at?: string;

	// Keep: Non-PII business data
	product_name?: string;
	variant_name?: string;

	// Strip: All PII fields
	// user_email, user_name, card_*, billing_*, city, region, country
}

export function sanitizeWebhookPayload(rawPayload: unknown): SanitizedPayload {
	// Implementation: whitelist approach (only keep known-safe fields)
}

export function sanitizeLemonSqueezyPayload(payload: LemonSqueezyWebhookPayload): SanitizedPayload {
	// LemonSqueezy-specific sanitization
}
```

### Task 1.2: Update LemonSqueezy Webhook Handler

**File**: `apps/plant/src/routes/api/webhooks/lemonsqueezy/+server.ts`

```typescript
import { sanitizeLemonSqueezyPayload } from '$lib/utils/webhook-sanitizer';

// Before INSERT
const sanitizedPayload = sanitizeLemonSqueezyPayload(JSON.parse(payload));

await db.prepare(
  `INSERT INTO webhook_events (..., payload, ...)
   VALUES (..., ?, ...)`
).bind(..., JSON.stringify(sanitizedPayload), ...).run();
```

### Task 1.3: Add Expiration Column

**File**: `libs/engine/migrations/026_webhook_retention.sql`

```sql
-- Add expires_at column for TTL
ALTER TABLE webhook_events ADD COLUMN expires_at INTEGER;

-- Set 120-day expiration for existing records
-- (120 days aligns with payment processor chargeback windows)
UPDATE webhook_events
SET expires_at = created_at + (120 * 24 * 60 * 60)
WHERE expires_at IS NULL;

-- Create index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_webhook_events_expires
ON webhook_events(expires_at);
```

### Task 1.4: Create Scheduled Cleanup Job

**Option A: Cloudflare Cron Trigger**

**File**: `libs/engine/src/routes/api/cron/cleanup-webhooks/+server.ts`

```typescript
// Invoked by cron trigger in wrangler.toml
// [triggers]
// crons = ["0 3 * * *"]  // Daily at 3am UTC

export async function GET({ platform }) {
	const db = platform.env.DB;

	const result = await db
		.prepare(
			`
    DELETE FROM webhook_events
    WHERE expires_at < unixepoch()
    LIMIT 1000
  `,
		)
		.run();

	return json({
		deleted: result.meta.changes,
		timestamp: new Date().toISOString(),
	});
}
```

**Option B: Queue-Based Cleanup**

Use Cloudflare Queues for batched deletion if volume is high.

### Task 1.5: Update Insert Logic for Expiration

```typescript
// Set expires_at to 120 days from now (aligns with chargeback windows)
const expiresAt = Math.floor(Date.now() / 1000) + 120 * 24 * 60 * 60;

await db
	.prepare(
		`
  INSERT INTO webhook_events (id, provider, event_type, payload, created_at, expires_at)
  VALUES (?, 'lemonsqueezy', ?, ?, unixepoch(), ?)
`,
	)
	.bind(id, eventName, sanitizedPayload, expiresAt)
	.run();
```

---

## Test Specification (Webhooks)

**File**: `libs/engine/src/lib/utils/webhook-sanitizer.test.ts`

```typescript
describe("sanitizeLemonSqueezyPayload", () => {
	it("should strip user_email from payload", () => {
		const input = { data: { attributes: { user_email: "test@example.com", status: "active" } } };
		const result = sanitizeLemonSqueezyPayload(input);
		expect(result.user_email).toBeUndefined();
		expect(result.status).toBe("active");
	});

	it("should strip user_name from payload", () => {});
	it("should strip card_brand and card_last_four", () => {});
	it("should strip billing_address fields", () => {});
	it("should strip city, region, country", () => {});

	it("should preserve customer_id for reconciliation", () => {});
	it("should preserve subscription_id for debugging", () => {});
	it("should preserve product_id and variant_id", () => {});
	it("should preserve status and timestamps", () => {});
	it("should preserve event metadata (event_name, event_id)", () => {});

	it("should handle missing optional fields gracefully", () => {});
	it("should handle malformed payload without throwing", () => {});
	it("should return empty object for null/undefined input", () => {});
});

describe("Webhook Retention", () => {
	it("should set expires_at to 120 days from created_at", () => {});
	it("should cleanup expired webhooks on cron run", () => {});
	it("should respect LIMIT to avoid long-running queries", () => {});
});
```

---

## Acceptance Criteria (Webhooks)

- [ ] PII fields stripped before storage (email, name, full card, address)
- [ ] `expires_at` column added to `webhook_events` table
- [ ] Cleanup job deletes records older than 120 days
- [ ] Cron trigger configured in wrangler.toml
- [ ] Existing TODOs at lines 79-80 resolved
- [ ] Unit tests for sanitization function (see spec above)
- [ ] Retention tests verify 120-day TTL calculation

---

# Part 2: JSON Parsing Safety

## Current State

### Existing Utility

**File**: `libs/engine/src/lib/utils/json.ts`

```typescript
export function safeJsonParse<T>(str: string | null | undefined, fallback: T = [] as T): T {
	if (!str) return fallback;
	try {
		return JSON.parse(str) as T;
	} catch (e) {
		console.warn("Failed to parse JSON:", e instanceof Error ? e.message : String(e));
		return fallback;
	}
}
```

### Audit Results

| Category                   | Count   |
| -------------------------- | ------- |
| Total `JSON.parse` calls   | 105     |
| Using `safeJsonParse`      | 35      |
| Wrapped in try/catch       | ~40     |
| **Unsafe (no protection)** | **~30** |

### High-Priority Unsafe Locations

| File                                         | Line(s)   | Context                          |
| -------------------------------------------- | --------- | -------------------------------- |
| `src/lib/payments/shop.ts`                   | 1219-1324 | Payment/product data (7 calls)   |
| `src/routes/(site)/timeline/+page.server.ts` | 105-110   | Timeline display (4 calls)       |
| `src/routes/api/curios/timeline/*.ts`        | Various   | Timeline API endpoints (8 calls) |
| `src/routes/admin/blog/*.ts`                 | Various   | Admin blog editor (3 calls)      |
| `src/lib/curios/timeline/context.ts`         | 303-304   | Timeline context (2 calls)       |

---

## Implementation Tasks

### Task 2.1: Enhance safeJsonParse Utility

**File**: `libs/engine/src/lib/utils/json.ts`

```typescript
/**
 * Safely parse JSON with type validation and logging.
 *
 * @param str - String to parse
 * @param fallback - Default value if parsing fails
 * @param options - Optional configuration
 * @returns Parsed value or fallback
 *
 * @example
 * const data = safeJsonParse<User[]>(jsonString, []);
 * const config = safeJsonParse(raw, { theme: 'dark' }, { silent: true });
 */
export function safeJsonParse<T>(
	str: string | null | undefined,
	fallback: T,
	options?: {
		/** Suppress console.warn on parse failure */
		silent?: boolean;
		/** Context for debugging (e.g., "user settings") */
		context?: string;
	},
): T {
	if (!str) return fallback;
	try {
		return JSON.parse(str) as T;
	} catch (e) {
		if (!options?.silent) {
			const ctx = options?.context ? ` (${options.context})` : "";
			console.warn(`Failed to parse JSON${ctx}:`, e instanceof Error ? e.message : String(e));
		}
		return fallback;
	}
}

/**
 * Parse JSON or return null on failure.
 * Useful when you need to distinguish "no value" from "invalid value".
 */
export function tryJsonParse<T>(str: string | null | undefined): T | null {
	if (!str) return null;
	try {
		return JSON.parse(str) as T;
	} catch {
		return null;
	}
}
```

### Task 2.2: Add to Engine Exports

**File**: `libs/engine/package.json` (verify export exists)

```json
{
	"exports": {
		"./utils": "./src/lib/utils/index.ts"
	}
}
```

### Task 2.3: Fix High-Priority Files

**Priority order** (based on risk):

1. **Payment handling** - `src/lib/payments/shop.ts`
2. **Timeline API** - `src/routes/api/curios/timeline/*.ts`
3. **Timeline display** - `src/routes/(site)/timeline/+page.server.ts`
4. **Admin blog** - `src/routes/admin/blog/*.ts`
5. **Timeline context** - `src/lib/curios/timeline/context.ts`

**Example fix pattern**:

```typescript
// Before
const metadata = JSON.parse(row.metadata);

// After
import { safeJsonParse } from "$lib/utils/json";
const metadata = safeJsonParse(row.metadata, {});
```

### Task 2.4: Add ESLint Rule (Optional)

**File**: `.eslintrc.cjs` or `eslint.config.js`

```javascript
// Custom rule to warn on raw JSON.parse
rules: {
  'no-restricted-syntax': [
    'warn',
    {
      selector: 'CallExpression[callee.object.name="JSON"][callee.property.name="parse"]',
      message: 'Use safeJsonParse() from $lib/utils/json instead of raw JSON.parse()'
    }
  ]
}
```

---

## Acceptance Criteria (JSON Safety)

- [ ] `safeJsonParse` enhanced with options parameter
- [ ] `tryJsonParse` variant added for null-returning use case
- [ ] All payment-related JSON.parse calls wrapped
- [ ] All timeline-related JSON.parse calls wrapped
- [ ] All admin-related JSON.parse calls wrapped
- [ ] Export verified in engine package
- [ ] (Optional) ESLint rule warns on new raw JSON.parse usage

---

## Files to Modify

### Webhook Sanitization

| File                                                              | Change           |
| ----------------------------------------------------------------- | ---------------- |
| `libs/engine/src/lib/utils/webhook-sanitizer.ts`              | New file         |
| `apps/plant/src/routes/api/webhooks/lemonsqueezy/+server.ts`  | Use sanitizer    |
| `libs/engine/migrations/026_webhook_retention.sql`            | New migration    |
| `libs/engine/src/routes/api/cron/cleanup-webhooks/+server.ts` | New endpoint     |
| `libs/engine/wrangler.toml`                                   | Add cron trigger |

### JSON Safety

| File                                                         | Change          |
| ------------------------------------------------------------ | --------------- |
| `libs/engine/src/lib/utils/json.ts`                      | Enhance utility |
| `libs/engine/src/lib/payments/shop.ts`                   | 7 fixes         |
| `libs/engine/src/routes/api/curios/timeline/*.ts`        | 8 fixes         |
| `libs/engine/src/routes/(site)/timeline/+page.server.ts` | 4 fixes         |
| Multiple admin routes                                        | Various fixes   |

---

## Related Documents

- Security audit: `docs/security/SECURITY_AUDIT_REPORT.md`
- LemonSqueezy setup: `docs/setup/lemonsqueezy-setup.md`
- AGENT.md error handling patterns
