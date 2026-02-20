---
title: Zephyr Implementation Plan
description: Complete implementation plan for the unified email gateway
category: plans
planCategory: infrastructure
icon: wind
lastUpdated: "2026-02-02"
status: planned
priority: high
tags:
  - email
  - infrastructure
  - cloudflare-workers
  - resend
---

# Zephyr Implementation Plan

```
                          . _ .  _ .  . _ .
                       .  _  . _   _ .  _  .
                    .   _   .   ~ ~ ~   .   _   .
                 .    _    . ~ ZEPHYR ~ .    _    .
                    .   _   .   ~ ~ ~   .   _   .
                       .  _  . _   _ .  _  .
                          . _ .  _ .  . _ .

                    The gentle wind that carries.
                    Invisible. Reliable. Warm.
```

> _Carrying messages on the wind._

**This document consolidates the findings from all animal consultations:**

- 🐕 Bloodhound Scout - Mapped 9+ email locations across the codebase
- 🦅 Eagle Architect - Designed the system architecture
- 🦢 Swan Design - Validated existing spec completeness
- 🦎 Chameleon Adapt - Confirmed UI requirements

---

## Executive Summary

Zephyr is Grove's unified email gateway. It centralizes all email sending from 9+ scattered locations into a single Cloudflare Worker with proper error handling, retries, and logging.

**The Problem:**

- Email sending scattered across 9+ files
- Silent failures (the Porch bug!)
- No retry logic
- 7 files reading RESEND_API_KEY directly
- 3 different template systems

**The Solution:**
One call to Zephyr handles everything: validation, rate limiting, template rendering, retries, logging, and error surfacing.

---

## Current State Analysis

### Email Locations Identified (🐕 Bloodhound Scout Report)

| Location                                                   | Purpose                     | Current Pattern      | Migration Priority     |
| ---------------------------------------------------------- | --------------------------- | -------------------- | ---------------------- |
| `apps/plant/src/lib/server/send-email.ts`                  | Basic utility               | Direct Resend        | Phase 3                |
| `apps/plant/src/lib/server/email-verification.ts`          | Verification codes          | Direct Resend        | Phase 3                |
| `libs/engine/src/lib/email/schedule.ts`                    | Welcome sequences           | React Email + Resend | Phase 2                |
| `apps/landing/src/lib/email/send.ts`                       | Welcome email               | Direct Resend        | Phase 3                |
| `libs/engine/src/lib/server/services/trace-email.ts`       | Trace notifications         | Direct Resend        | Phase 3                |
| `workers/email-catchup/worker.ts`                          | Catch-up worker             | Direct Resend        | Phase 3                |
| `apps/landing/workers/onboarding-emails/`                  | Old onboarding (deprecated) | Direct Resend        | Phase 4 (Delete)       |
| `apps/landing/src/routes/admin/porch/[id]/+page.server.ts` | Porch replies               | Direct Resend        | **Phase 1 (THE BUG!)** |
| Multiple `+page.server.ts` files                           | Various triggers            | Direct Resend        | Phase 3                |

### Template Systems

1. **React Email** (modern) - `libs/engine/src/lib/email/` sequences
2. **Inline HTML** (legacy) - `apps/plant/src/lib/server/email-templates.ts`
3. **Inline HTML** (legacy) - Onboarding worker

**Decision:** Migrate all to React Email over time. Start with `porch-reply` template in Phase 1.

---

## Architecture (🦅 Eagle Architect Blueprint)

### High-Level Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                        ZEPHYR ARCHITECTURE                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────────┐   │
│  │   Services  │────▶│ ZephyrClient│────▶│  Zephyr Worker  │   │
│  │  (Porch,    │     │  (Engine)   │     │  (Cloudflare)   │   │
│  │   Plant,    │     │             │     │                 │   │
│  │   Landing)  │     │ • Validate  │     │ • Rate Limit    │   │
│  │             │     │ • Build req │     │ • Unsub Check   │   │
│  └─────────────┘     │ • Error     │     │ • Template      │   │
│                      │   handling  │     │ • Provider      │   │
│                      └─────────────┘     │ • Retry Logic   │   │
│                                          │ • D1 Logging    │   │
│                                          └────────┬────────┘   │
│                                                   │             │
│                                          ┌────────▼────────┐   │
│                                          │  Email Provider │   │
│                                          │    (Resend)     │   │
│                                          └─────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Component Breakdown

#### 1. ZephyrClient (`libs/engine/src/lib/zephyr/client.ts`)

- Validates requests before sending
- Builds properly typed payload
- Calls Zephyr Worker via HTTP POST
- Returns typed `ZephyrResponse`
- Handles network errors gracefully

#### 2. Zephyr Worker (`workers/zephyr/src/index.ts`)

- HTTP endpoint: `POST /send`
- Pre-processing pipeline:
  - Request validation (schema)
  - Rate limiting (per-tenant)
  - Unsubscribe check
- Template rendering (React Email)
- Provider routing with retry logic
- Post-processing: D1 logging

#### 3. Database Schema (`zephyr_logs` table)

```sql
CREATE TABLE zephyr_logs (
  id TEXT PRIMARY KEY,
  message_id TEXT,
  type TEXT NOT NULL,
  template TEXT NOT NULL,
  recipient TEXT NOT NULL,
  subject TEXT,
  success INTEGER NOT NULL,
  error_code TEXT,
  error_message TEXT,
  provider TEXT,
  attempts INTEGER DEFAULT 1,
  latency_ms INTEGER,
  tenant TEXT,
  source TEXT,
  correlation_id TEXT,
  idempotency_key TEXT,
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

#### 4. Retry Strategy

```
Attempt 1: Immediate
Attempt 2: 1000ms delay (exponential backoff)
Attempt 3: 2000ms delay

Circuit Breaker: 5 failures in 1 minute → pause 30s
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1) - CRITICAL

**Goal:** Deploy Zephyr worker, fix the Porch bug

**Files to Create:**

- [ ] `workers/zephyr/src/index.ts` - Worker entry point
- [ ] `workers/zephyr/src/types.ts` - Type definitions
- [ ] `workers/zephyr/src/handlers/send.ts` - Main send handler
- [ ] `workers/zephyr/src/middleware/validation.ts` - Request validation
- [ ] `workers/zephyr/src/middleware/rate-limit.ts` - Rate limiting
- [ ] `workers/zephyr/src/middleware/unsubscribe.ts` - Unsubscribe check
- [ ] `workers/zephyr/src/providers/resend.ts` - Resend provider
- [ ] `workers/zephyr/src/templates/index.ts` - Template registry
- [ ] `workers/zephyr/src/templates/porch-reply.tsx` - NEW template
- [ ] `workers/zephyr/src/logging/d1.ts` - D1 log writer
- [ ] `workers/zephyr/wrangler.toml` - Worker config
- [ ] `workers/zephyr/package.json` - Dependencies
- [ ] `libs/engine/src/lib/zephyr/index.ts` - Public exports
- [ ] `libs/engine/src/lib/zephyr/client.ts` - ZephyrClient
- [ ] `libs/engine/src/lib/zephyr/types.ts` - Shared types

**Files to Modify:**

- [ ] `apps/landing/src/routes/admin/porch/[id]/+page.server.ts` - **MIGRATE TO ZEPHYR (THE FIX)**
- [ ] `libs/engine/package.json` - Add zephyr export

**Database Migration:**

- [ ] Create `zephyr_logs` table in D1

**Verification:**

- [ ] Porch reply emails actually arrive
- [ ] Errors are returned (not swallowed)
- [ ] All sends logged to D1

### Phase 2: Templates (Week 2)

**Goal:** Consolidate templates into React Email

**Templates to Migrate:**

- [ ] `verification-code` (from Plant)
- [ ] `payment-received` (from Plant)
- [ ] `payment-failed` (from Plant)
- [ ] `trial-ending` (from Plant)
- [ ] Migrate onboarding sequences (already in React Email, just wire up)

**Files to Modify:**

- [ ] `apps/plant/src/lib/server/email-verification.ts` - Use Zephyr
- [ ] `apps/plant/src/routes/api/webhooks/lemonsqueezy/+server.ts` - Use Zephyr for payment emails

**Add:**

- [ ] Template preview endpoint for testing

### Phase 3: Full Migration (Week 3)

**Goal:** All email sending goes through Zephyr

**Files to Migrate:**

- [ ] `apps/landing/src/lib/email/send.ts` - Welcome emails
- [ ] `libs/engine/src/lib/email/schedule.ts` - Welcome sequences
- [ ] `libs/engine/src/lib/server/services/trace-email.ts` - Trace notifications
- [ ] `apps/landing/src/routes/api/webhooks/email-feedback/+server.ts` - Feedback forwarding
- [ ] `workers/email-catchup/worker.ts` - Catch-up worker
- [ ] All remaining `+page.server.ts` files with email

### Phase 4: Observability & Cleanup (Week 4)

**Goal:** Dashboard, monitoring, cleanup

**Files to Create:**

- [ ] Arbor dashboard page for email logs
- [ ] Vista metrics integration

**Files to Delete:**

- [ ] `apps/landing/workers/onboarding-emails/` (deprecated)
- [ ] `apps/plant/src/lib/server/send-email.ts` (migrated)
- [ ] `apps/landing/src/lib/email/send.ts` (migrated)
- [ ] Inline HTML templates (migrated)

**Add:**

- [ ] Circuit breaker implementation
- [ ] Email delivery rate alerts

---

## API Specification

### Request

```typescript
interface ZephyrRequest {
	/** Email category for routing */
	type: "transactional" | "notification" | "verification" | "sequence" | "lifecycle" | "broadcast";
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
```

### Response

```typescript
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

### Usage Example

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
```

---

## File Structure

```
workers/zephyr/
├── src/
│   ├── index.ts              # Worker entry point
│   ├── types.ts              # Type definitions
│   ├── handlers/
│   │   └── send.ts           # Main send handler
│   ├── middleware/
│   │   ├── validation.ts     # Request validation
│   │   ├── rate-limit.ts     # Per-tenant limits
│   │   ├── unsubscribe.ts    # Check unsubscribe list
│   │   └── circuit-breaker.ts# Provider health
│   ├── providers/
│   │   ├── index.ts          # Provider factory
│   │   ├── types.ts          # Provider interface
│   │   └── resend.ts         # Resend implementation
│   ├── templates/
│   │   ├── index.ts          # Template registry
│   │   ├── render.ts         # React Email rendering
│   │   └── components/       # Shared email components
│   └── logging/
│       └── d1.ts             # D1 log writer
├── templates/                 # React Email templates
│   ├── PorchReplyEmail.tsx   # NEW for Phase 1
│   ├── VerificationEmail.tsx # Phase 2
│   ├── PaymentFailedEmail.tsx# Phase 2
│   └── ...
├── wrangler.toml
└── package.json

libs/engine/src/lib/zephyr/
├── index.ts                  # Public exports & client
├── client.ts                 # ZephyrClient class
└── types.ts                  # Shared types (re-exported)
```

---

## Package Exports

Add to `libs/engine/package.json`:

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

## Success Metrics

### Immediate (Post-Phase 1)

- [ ] Porch reply emails actually arrive
- [ ] Zero silent failures — all errors returned to caller
- [ ] 100% of email sends logged to D1

### Short-term (Post-Phase 4)

- [ ] Single `RESEND_API_KEY` location (Zephyr worker only)
- [ ] All emails use React Email templates
- [ ] Delivery rate visible in Arbor dashboard
- [ ] < 100ms added latency per send

### Long-term

- [ ] < 1% email failure rate
- [ ] Automatic fallback to backup provider (future)
- [ ] Per-tenant email analytics

---

## Cost Analysis

**No additional cost** — Resend pricing remains the same:

- Free tier: 3,000 emails/month
- Paid: $0.001 per email after free tier

Current volume: ~850 emails/month (~$0.85, well under free tier)

**Benefits:**

- Better visibility into email costs per service
- Reduced waste through retry logic
- Audit capability for debugging

---

## Security Considerations

1. **No body logging** — Email content never stored in logs
2. **API key isolation** — `RESEND_API_KEY` only in Zephyr worker
3. **Unsubscribe enforcement** — Check before sending
4. **Rate limiting** — Prevent abuse, respect provider limits
5. **Audit trail** — Every send attempt logged (without content)
6. **Idempotency** — Prevent duplicate sends with keys

---

## References

- **Spec:** `docs/specs/zephyr-spec.md` (complete technical specification)
- **Original Plan:** `docs/plans/planned/zephyr-email-gateway-plan.md`
- **Resend API:** https://resend.com/docs
- **React Email:** https://react.email
- **Grove Naming:** `docs/philosophy/grove-naming.md`

---

## Next Steps

**Ready to begin development!**

Summon the gathering-feature skill to start the implementation:

```
The drum sounds. The animals gather.
Bloodhound, Eagle, Swan, and Chameleon ready.
Let the building begin.
```

---

_Carrying messages on the wind._

**Last updated:** February 2, 2026
**Status:** Planned - Ready for Implementation
**Author:** Autumn Brown + The Animals 🐕🦅🦢🦎
