---
title: Zephyr — Email Gateway
description: Unified email delivery worker with retries, fallbacks, and observability
category: specs
specCategory: operations
icon: send
lastUpdated: "2026-02-01"
aliases: []
tags:
  - email
  - infrastructure
  - cloudflare-workers
  - resend
---

# Zephyr — Email Gateway

```
                         . _ .  _ .  . _ .
                      .  _  . _   _ .  _  .
                   .   _   .   ~ ~ ~   .   _   .
                .    _    . ~ ZEPHYR ~ .    _    .
                   .   _   .   ~ ~ ~   .   _   .
                      .  _  . _   _ .  _  .
                         . _ .  _ .  . _ .

                ╭────────────────────────────────╮
                │     ✉️  →  →  →  →  →  📬      │
                │                                │
                │   from Grove · to Wanderer     │
                ╰────────────────────────────────╯

                  The gentle wind that carries.
                  Invisible. Reliable. Warm.
```

> _Carrying messages on the wind._

Grove's unified email gateway. Every email from every service rides the same wind: Porch replies, onboarding sequences, payment notifications, verification codes. One interface. Intelligent routing. Retries that actually work. The breeze that carries messages home.

**Public Name:** Zephyr
**Internal Name:** GroveZephyr
**Domain:** _(internal service)_
**Last Updated:** February 2026

In mythology, Zephyrus was the god of the west wind—the gentlest of the four winds, bringer of spring. While other winds howled and destroyed, the zephyr carried seeds to new soil, pollen to waiting flowers, whispers to distant ears.

The metaphor is the architecture. Gentle delivery. Invisible infrastructure.

---

## Overview

Zephyr is Grove's unified email gateway: a single Cloudflare Worker that handles all email sending, retries failed deliveries, provides fallback providers, logs everything, and surfaces errors instead of swallowing them.

**The problem it solves:**

- Email sending scattered across 9+ locations (Engine, Plant, Landing, Workers, Admin)
- Silent failures — errors logged but never surfaced (the Porch bug)
- No retry logic — if Resend fails, email is lost forever
- 7 files reading `RESEND_API_KEY` directly
- 3 different template systems (React Email, HTML functions, inline strings)
- No centralized logging — can't track what was sent or failed
- Inconsistent `from` addresses across services

**The solution:**

```typescript
// Before: Scattered, inconsistent, silent failures
const resend = new Resend(env.RESEND_API_KEY);
await resend.emails.send({
	from: "Grove <hello@grove.place>", // inconsistent
	to: recipient,
	subject: "...",
	html: "...",
});
// Error? Logged and forgotten.

// After: One call, retries, logging, error surfacing
const result = await Zephyr.send({
	type: "transactional",
	template: "porch-reply",
	to: recipient,
	data: { content, visitId },
});

if (!result.success) {
	// Error is RETURNED, not swallowed
	return fail(500, { error: "Failed to send notification" });
}
```

**One sentence:** _"Grove sends email through Zephyr."_

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            GROVE SERVICES                                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │    Porch    │  │    Plant    │  │   Landing   │  │   Arbor     │         │
│  │  (support)  │  │ (payments)  │  │ (onboard)   │  │  (admin)    │         │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘         │
└─────────┼────────────────┼────────────────┼────────────────┼────────────────┘
          │                │                │                │
          │     Zephyr.send({ type, template, to, data })    │
          │                │                │                │
          └────────────────┴────────┬───────┴────────────────┘
                                    │
┌───────────────────────────────────┴─────────────────────────────────────────┐
│                         ZEPHYR (Cloudflare Worker)                           │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │                          Pre-Processing                                │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │  │
│  │  │  Validation  │  │ Rate Limiter │  │ Unsubscribe  │                  │  │
│  │  │  (schema)    │  │ (per-tenant) │  │   Check      │                  │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘                  │  │
│  └────────────────────────────────┬───────────────────────────────────────┘  │
│                                   │                                          │
│  ┌────────────────────────────────┴───────────────────────────────────────┐  │
│  │                          Template Engine                               │  │
│  │                                                                        │  │
│  │   template: "welcome"       → WelcomeEmail (React Email)               │  │
│  │   template: "porch-reply"   → PorchReplyEmail (React Email)            │  │
│  │   template: "verification"  → VerificationEmail (React Email)          │  │
│  │   template: "payment-failed"→ PaymentFailedEmail (React Email)         │  │
│  │   template: "raw"           → Pass-through (pre-rendered HTML)         │  │
│  │                                                                        │  │
│  └────────────────────────────────┬───────────────────────────────────────┘  │
│                                   │                                          │
│  ┌────────────────────────────────┴───────────────────────────────────────┐  │
│  │                          Provider Router                               │  │
│  │                                                                        │  │
│  │   Primary: Resend API                                                  │  │
│  │   Fallback: (future) Amazon SES / Postmark                             │  │
│  │                                                                        │  │
│  │   Retry: 3 attempts with exponential backoff                           │  │
│  │   Circuit breaker: If 5 failures in 1 min, pause 30s                   │  │
│  │                                                                        │  │
│  └────────────────────────────────┬───────────────────────────────────────┘  │
│                                   │                                          │
│  ┌────────────────────────────────┴───────────────────────────────────────┐  │
│  │                         Post-Processing                                │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │  │
│  │  │  Log to D1   │  │  Update      │  │  Return      │                  │  │
│  │  │  (audit)     │  │  Metrics     │  │  Result      │                  │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘                  │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │
┌───────────────────────────────────┴─────────────────────────────────────────┐
│                            EMAIL PROVIDERS                                   │
│                                                                              │
│  ┌──────────────────────────────────┐  ┌──────────────────────────────────┐  │
│  │            Resend                │  │         (Future Fallback)        │  │
│  │          (Primary)               │  │        Amazon SES / Postmark     │  │
│  │                                  │  │                                  │  │
│  │  Transactional    Marketing      │  │  High-volume      Backup         │  │
│  │  Broadcasts       Sequences      │  │  Cold-start       Resilience     │  │
│  └──────────────────────────────────┘  └──────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Email Types & Routing

Zephyr routes emails based on type, applying appropriate handling for each category.

### Email Type Registry

| Type            | Description                          | From Address         | Retry | Track Opens |
| --------------- | ------------------------------------ | -------------------- | ----- | ----------- |
| `transactional` | One-to-one triggered emails          | `hello@grove.place`  | 3x    | No          |
| `notification`  | System notifications (replies, etc.) | `porch@grove.place`  | 3x    | No          |
| `verification`  | Auth codes, magic links              | `hello@grove.place`  | 3x    | No          |
| `sequence`      | Onboarding drip emails               | `autumn@grove.place` | 3x    | Yes         |
| `lifecycle`     | Payment, renewal, trial              | `hello@grove.place`  | 3x    | No          |
| `broadcast`     | Marketing, announcements             | `autumn@grove.place` | 1x    | Yes         |

### Why This Routing?

**Transactional & Notification (3 retries, no tracking):**
These emails are triggered by user actions and expected immediately. Open tracking adds weight and privacy concerns. Retries ensure delivery without being aggressive.

**Verification (3 retries, no tracking):**
Time-sensitive by nature. Users are actively waiting. Must arrive quickly. No tracking because it's a security flow.

**Sequence (3 retries, with tracking):**
Onboarding emails benefit from knowing what users engage with. Retries because losing an onboarding touchpoint loses a user.

**Lifecycle (3 retries, no tracking):**
Payment emails are critical. Users need to know when things fail. But tracking payment emails feels invasive.

**Broadcast (1 retry, with tracking):**
Marketing can afford to miss occasionally. Tracking helps optimize content. Single retry respects rate limits.

---

## Template Registry

| Template           | Type          | Use Case                       | Current Home |
| ------------------ | ------------- | ------------------------------ | ------------ |
| `welcome`          | sequence      | New signup welcome             | engine       |
| `day-1`            | sequence      | First day follow-up            | engine       |
| `day-7`            | sequence      | Week check-in                  | engine       |
| `day-14`           | sequence      | Two week follow-up             | engine       |
| `day-30`           | sequence      | Month check-in                 | engine       |
| `porch-reply`      | notification  | **Support reply** (THE BUG)    | NEW          |
| `verification`     | verification  | Email verification code        | plant        |
| `payment-received` | lifecycle     | Subscription confirmed         | plant        |
| `payment-failed`   | lifecycle     | Charge failed                  | plant        |
| `trial-ending`     | lifecycle     | Trial expiring soon            | plant        |
| `feedback-forward` | transactional | Forward inbound email          | landing      |
| `raw`              | any           | Pre-rendered HTML pass-through | any          |

---

## API Design

### Core Interface

```typescript
interface ZephyrRequest {
	/** Email category for routing */
	type: EmailType;
	/** Template to render (or "raw" for pre-rendered) */
	template: string;
	/** Recipient email address */
	to: string;
	/** Template data for personalization */
	data?: Record<string, unknown>;
	/** Override from address */
	from?: string;
	/** Override subject line */
	subject?: string;
	/** Pre-rendered HTML (when template is "raw") */
	html?: string;
	/** Pre-rendered text (when template is "raw") */
	text?: string;
	/** Schedule for later delivery (ISO timestamp) */
	scheduledAt?: string;
	/** Idempotency key to prevent duplicates */
	idempotencyKey?: string;
	/** Metadata for logging */
	metadata?: {
		tenant?: string;
		source?: string;
		correlationId?: string;
	};
}

interface ZephyrResponse {
	success: boolean;
	messageId?: string;
	error?: {
		code: ZephyrErrorCode;
		message: string;
		retryable: boolean;
	};
	metadata: {
		provider: string;
		attempts: number;
		latencyMs: number;
	};
}

type EmailType =
	| "transactional"
	| "notification"
	| "verification"
	| "sequence"
	| "lifecycle"
	| "broadcast";

type ZephyrErrorCode =
	| "INVALID_REQUEST"
	| "INVALID_TEMPLATE"
	| "INVALID_RECIPIENT"
	| "RATE_LIMITED"
	| "UNSUBSCRIBED"
	| "PROVIDER_ERROR"
	| "TEMPLATE_ERROR"
	| "CIRCUIT_OPEN";
```

### Usage Examples

```typescript
import { Zephyr } from "@autumnsgrove/lattice/zephyr";

// Porch reply notification (THE FIX)
const result = await Zephyr.send({
	type: "notification",
	template: "porch-reply",
	to: recipientEmail,
	data: {
		content: replyContent,
		visitId: visit.id,
		visitNumber: visit.visit_number,
		subject: visit.subject,
	},
	metadata: {
		source: "porch-admin",
		correlationId: visit.id,
	},
});

if (!result.success) {
	// NOW WE KNOW IT FAILED
	console.error("Porch reply email failed:", result.error);
	return { replySuccess: true, emailFailed: true };
}

// Verification code
const result = await Zephyr.send({
	type: "verification",
	template: "verification",
	to: userEmail,
	data: {
		code: verificationCode,
		expiresIn: "15 minutes",
	},
});

// Onboarding sequence (scheduled)
const result = await Zephyr.send({
	type: "sequence",
	template: "day-7",
	to: userEmail,
	data: { name: userName, audienceType: "wanderer" },
	scheduledAt: addDays(new Date(), 7).toISOString(),
	idempotencyKey: `${userId}-day7-${signupDate}`,
});

// Raw HTML (for legacy templates during migration)
const result = await Zephyr.send({
	type: "transactional",
	template: "raw",
	to: recipient,
	subject: "Custom Email",
	html: preRenderedHtml,
	text: preRenderedText,
});
```

---

## Pre-Processing Pipeline

### Request Validation

Before processing, Zephyr validates every request:

```typescript
const validation = {
	// Required fields
	required: ["type", "template", "to"],

	// Email format validation
	email: (to: string) => isValidEmail(to),

	// Template existence check
	template: (name: string) => templates.has(name) || name === "raw",

	// Type validity
	type: (t: string) => emailTypes.includes(t),

	// Raw template requires html
	rawRequiresHtml: (req: ZephyrRequest) => req.template !== "raw" || (req.html && req.subject),
};
```

### Rate Limiting

Per-tenant rate limits prevent abuse:

```typescript
const rateLimits = {
	transactional: { rpm: 60, daily: 1000 },
	notification: { rpm: 60, daily: 1000 },
	verification: { rpm: 10, daily: 100 },
	sequence: { rpm: 100, daily: 5000 },
	lifecycle: { rpm: 60, daily: 500 },
	broadcast: { rpm: 1000, daily: 10000 },
};

// Checked before sending
await rateLimiter.check(tenant, type);
```

### Unsubscribe Check

Before any email leaves, check the unsubscribe list:

```typescript
const isUnsubscribed = await db
	.prepare("SELECT 1 FROM unsubscribes WHERE email = ?")
	.bind(to)
	.first();

if (isUnsubscribed) {
	return {
		success: false,
		error: {
			code: "UNSUBSCRIBED",
			message: "Recipient has unsubscribed",
			retryable: false,
		},
	};
}
```

---

## Error Handling

### Error Types

```typescript
type ZephyrError =
	| { code: "INVALID_REQUEST"; message: string; field?: string }
	| { code: "INVALID_TEMPLATE"; template: string }
	| { code: "INVALID_RECIPIENT"; reason: "malformed" | "blocklisted" }
	| { code: "RATE_LIMITED"; retryAfter: number }
	| { code: "UNSUBSCRIBED"; email: string; unsubscribedAt: string }
	| { code: "PROVIDER_ERROR"; provider: string; message: string }
	| { code: "TEMPLATE_ERROR"; template: string; message: string }
	| { code: "CIRCUIT_OPEN"; provider: string; opensAt: string };
```

### Retry Strategy

```typescript
const retryConfig = {
	maxAttempts: 3,
	baseDelayMs: 1000,
	maxDelayMs: 30000,
	backoffMultiplier: 2,

	// Only retry on transient errors
	retryable: [
		"PROVIDER_ERROR", // Resend 5xx
		"CIRCUIT_OPEN", // Will retry after circuit closes
	],

	// Never retry these
	nonRetryable: [
		"INVALID_REQUEST",
		"INVALID_TEMPLATE",
		"INVALID_RECIPIENT",
		"UNSUBSCRIBED",
		"RATE_LIMITED", // Respect rate limits
	],
};

// Retry flow:
// Attempt 1: immediate
// Attempt 2: 1000ms delay
// Attempt 3: 2000ms delay
```

### Circuit Breaker

Protects against cascading failures when Resend is having issues:

```typescript
const circuitConfig = {
	failureThreshold: 5, // Failures before opening
	windowMs: 60000, // 1 minute window
	cooldownMs: 30000, // 30 seconds before retry
	halfOpenRequests: 2, // Test requests in half-open state
};

// Circuit states:
// CLOSED: Normal operation, requests flow through
// OPEN: Failures exceeded threshold, all requests fail fast
// HALF_OPEN: Testing if provider recovered
```

```
┌────────────────────────────────────────────────────────────────┐
│                     CIRCUIT BREAKER STATES                     │
│                                                                │
│    ┌──────────┐    5 failures     ┌──────────┐                │
│    │  CLOSED  │ ───────────────▶  │   OPEN   │                │
│    │  ✓ ✓ ✓   │                   │   ✗ ✗ ✗  │                │
│    └────┬─────┘                   └────┬─────┘                │
│         │                              │                       │
│         │    ◀─── success ───┐    30s cooldown                │
│         │                    │         │                       │
│         │               ┌────┴────┐    │                       │
│         │               │  HALF   │◀───┘                       │
│         │               │  OPEN   │                            │
│         └───failure ───▶│  ? ? ?  │                            │
│                         └─────────┘                            │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## Logging & Observability

### Email Log Schema (D1)

```sql
CREATE TABLE zephyr_logs (
  id TEXT PRIMARY KEY,
  message_id TEXT,

  -- Request
  type TEXT NOT NULL,
  template TEXT NOT NULL,
  recipient TEXT NOT NULL,
  subject TEXT,

  -- Result
  success INTEGER NOT NULL,
  error_code TEXT,
  error_message TEXT,

  -- Metadata
  provider TEXT,
  attempts INTEGER DEFAULT 1,
  latency_ms INTEGER,

  -- Context
  tenant TEXT,
  source TEXT,
  correlation_id TEXT,
  idempotency_key TEXT,

  -- Timestamps
  created_at INTEGER NOT NULL,
  scheduled_at INTEGER,
  sent_at INTEGER
);

CREATE INDEX idx_zephyr_recipient ON zephyr_logs(recipient);
CREATE INDEX idx_zephyr_type ON zephyr_logs(type);
CREATE INDEX idx_zephyr_created ON zephyr_logs(created_at);
CREATE INDEX idx_zephyr_correlation ON zephyr_logs(correlation_id);
CREATE UNIQUE INDEX idx_zephyr_idempotency ON zephyr_logs(idempotency_key)
  WHERE idempotency_key IS NOT NULL;
```

### What Gets Logged

| Field          | Logged | Purpose          |
| -------------- | ------ | ---------------- |
| Recipient      | Yes    | Debugging, audit |
| Subject line   | Yes    | Debugging        |
| Email body     | **No** | Privacy          |
| Template name  | Yes    | Analytics        |
| Template data  | **No** | Privacy          |
| Error messages | Yes    | Debugging        |
| Latency        | Yes    | Performance      |
| Provider used  | Yes    | Cost tracking    |
| Attempts       | Yes    | Retry visibility |

### Idempotency

Prevent duplicate sends with idempotency keys:

```typescript
// Check if we've already processed this key
const existing = await db
	.prepare("SELECT id, success FROM zephyr_logs WHERE idempotency_key = ?")
	.bind(idempotencyKey)
	.first();

if (existing) {
	// Return cached result
	return existing.success
		? { success: true, messageId: existing.id, cached: true }
		: { success: false, error: cached.error, cached: true };
}
```

---

## Provider Configuration

### Resend (Primary Provider)

```typescript
const resend = {
	baseUrl: "https://api.resend.com",
	apiKey: env.RESEND_API_KEY,
	defaultFrom: {
		transactional: "Grove <hello@grove.place>",
		notification: "Grove Porch <porch@grove.place>",
		verification: "Grove <hello@grove.place>",
		sequence: "Autumn <autumn@grove.place>",
		lifecycle: "Grove <hello@grove.place>",
		broadcast: "Autumn <autumn@grove.place>",
	},
};
```

### Future Fallbacks

```typescript
// Amazon SES (planned)
const ses = {
	region: "us-east-1",
	credentials: env.AWS_CREDENTIALS,
	// Use for: High volume, cost optimization
};

// Postmark (planned)
const postmark = {
	apiToken: env.POSTMARK_API_TOKEN,
	// Use for: Deliverability-critical emails
};
```

### Fallback Chain

```typescript
const fallbackChains = {
	transactional: [
		{ provider: "resend", priority: 1 },
		{ provider: "ses", priority: 2 }, // future
	],
	verification: [
		{ provider: "resend", priority: 1 },
		// No fallback - verification must be fast
	],
	broadcast: [
		{ provider: "resend", priority: 1 },
		{ provider: "ses", priority: 2 }, // future - cost optimization
	],
};
```

---

## Implementation

### File Structure

```
workers/zephyr/
├── src/
│   ├── index.ts              # Worker entry point
│   ├── types.ts              # Type definitions
│   ├── client.ts             # ZephyrClient class
│   ├── router.ts             # Type → config routing
│   ├── errors.ts             # Custom error types
│   ├── providers/
│   │   ├── index.ts          # Provider factory
│   │   ├── types.ts          # Provider interface
│   │   ├── resend.ts         # Resend implementation
│   │   └── ses.ts            # (Future) Amazon SES
│   ├── templates/
│   │   ├── index.ts          # Template registry
│   │   ├── render.ts         # React Email rendering
│   │   └── components/       # Shared email components
│   ├── middleware/
│   │   ├── validation.ts     # Request validation
│   │   ├── rate-limiter.ts   # Per-tenant limits
│   │   ├── unsubscribe.ts    # Check unsubscribe list
│   │   └── circuit-breaker.ts# Provider health
│   └── logging/
│       ├── d1.ts             # D1 log writer
│       └── metrics.ts        # Vista integration
├── templates/                 # React Email templates
│   ├── PorchReplyEmail.tsx
│   ├── VerificationEmail.tsx
│   ├── PaymentFailedEmail.tsx
│   └── ... (migrated from engine)
├── wrangler.toml
└── package.json

libs/engine/src/lib/zephyr/
├── index.ts                  # Public exports & client
└── types.ts                  # Shared types (re-exported)
```

### Package Exports

```json
{
	"exports": {
		"./zephyr": {
			"types": "./dist/lib/zephyr/index.d.ts",
			"import": "./dist/lib/zephyr/index.js"
		}
	}
}
```

---

## Security Considerations

1. **No body logging** — Email content never stored in logs
2. **API key isolation** — `RESEND_API_KEY` only in Zephyr worker
3. **Unsubscribe enforcement** — Check before sending
4. **Rate limiting** — Prevent abuse, respect provider limits
5. **Audit trail** — Every send attempt logged (without content)
6. **Idempotency** — Prevent duplicate sends with keys
7. **Input validation** — All requests validated before processing

---

## Cost Analysis

### Resend Pricing

- **Free tier:** 3,000 emails/month
- **Paid:** $0.001 per email after free tier

### Monthly Estimates

| Email Type            | Volume/month | Cost      |
| --------------------- | ------------ | --------- |
| Onboarding sequences  | ~500         | $0.50     |
| Verification codes    | ~200         | $0.20     |
| Payment notifications | ~100         | $0.10     |
| Porch replies         | ~50          | $0.05     |
| **Total**             | ~850         | **$0.85** |

(Well under free tier)

### Cost Benefits

| Benefit              | Impact                             |
| -------------------- | ---------------------------------- |
| Single API key       | Easier management, fewer secrets   |
| Retry logic          | No lost emails = no lost users     |
| Centralized logging  | Debug issues faster                |
| Template consistency | Lower maintenance, better branding |

---

## Implementation Checklist

### Phase 1: Foundation

- [ ] Create `workers/zephyr/` worker structure
- [ ] Implement core send API with Resend provider
- [ ] Add retry logic with exponential backoff
- [ ] Create `porch-reply` template (React Email)
- [ ] Migrate `/admin/porch/[id]` to use Zephyr
- [ ] **Verify Porch emails actually send**
- [ ] Add D1 logging table

### Phase 2: Templates

- [ ] Migrate verification template from Plant
- [ ] Migrate payment templates from Plant
- [ ] Migrate onboarding sequences from Engine
- [ ] Add template preview endpoint
- [ ] Remove inline HTML templates

### Phase 3: Full Migration

- [ ] Migrate `apps/landing/src/lib/email/send.ts`
- [ ] Migrate `apps/plant/src/lib/server/send-email.ts`
- [ ] Migrate `libs/engine/src/lib/email/schedule.ts`
- [ ] Migrate `apps/plant/.../email-verification.ts`
- [ ] Migrate LemonSqueezy webhook email triggers
- [ ] Migrate feedback forwarding

### Phase 4: Observability

- [ ] Add circuit breaker
- [ ] Add email dashboard in Arbor
- [ ] Add Vista metrics integration
- [ ] Delete deprecated email workers
- [ ] Remove direct Resend imports from packages

---

## References

- [Lumen Spec](/docs/specs/lumen-spec.md) — Architecture pattern reference
- [Resend API](https://resend.com/docs) — Primary email provider
- [React Email](https://react.email) — Template system
- [Cloudflare Workers](https://developers.cloudflare.com/workers/) — Runtime
- [Grove Naming Guide](/docs/philosophy/grove-naming.md)

---

_Carrying messages on the wind._

**Last updated:** February 2026
**Status:** Planned
**Author:** Autumn Brown
