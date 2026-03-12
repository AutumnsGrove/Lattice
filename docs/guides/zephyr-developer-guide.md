# Zephyr Developer Guide

Zephyr is Grove's unified email gateway. Every email from every service goes through Zephyr: Porch replies, onboarding sequences, payment notifications, verification codes. It runs as a standalone Cloudflare Worker (`grove-zephyr`) and handles validation, rate limiting, unsubscribe checks, template rendering, retries, and logging.

This guide covers how to work with Zephyr day-to-day. For migrating existing email code to Zephyr, see `docs/guides/zephyr-migration-guide.md`. For the full architecture spec, see `docs/specs/zephyr-spec.md`.

---

## How Zephyr Works

The request flow looks like this:

```
Your code (Engine, Plant, Landing, etc.)
    │
    ▼
ZephyrClient  (libs/engine/src/lib/zephyr/client.ts)
    │
    ▼  POST /send with X-API-Key or X-Zephyr-Binding header
    │
Zephyr Worker  (services/zephyr/src/index.ts)
    │
    ├── 1. Auth check (middleware/auth.ts)
    ├── 2. Request validation (middleware/validation.ts)
    ├── 3. Rate limit check (middleware/rate-limit.ts)
    ├── 4. Unsubscribe check (middleware/unsubscribe.ts)
    ├── 5. Template rendering (templates/index.ts → email-render worker)
    ├── 6. Send via Resend with retry (providers/resend.ts)
    └── 7. Log to D1 (logging/d1.ts)
    │
    ▼
ZephyrResponse { success, messageId, errorCode, ... }
```

Named templates (like `WelcomeEmail` or `PorchReplyEmail`) are rendered by a separate `grove-email-render` worker. Zephyr calls it via a Cloudflare Service Binding (direct Worker-to-Worker, no public internet). The `raw` template bypasses rendering entirely and passes your pre-rendered HTML straight through.

Authentication uses an `X-API-Key` header for HTTP callers. When the client detects a Service Binding is available (deployed on Cloudflare), it sends a SHA-256 hash of the API key via `X-Zephyr-Binding` instead, avoiding issues with corrupted bytes in Cloudflare Pages secrets.

---

## How to Send an Email

### From Engine Code (SvelteKit)

Import the default client:

```typescript
import { zephyr } from "@autumnsgrove/lattice/zephyr";

const result = await zephyr.send({
  type: "notification",
  template: "porch-reply",
  to: recipientEmail,
  data: {
    content: replyContent,
    visitId: visit.id,
    subject: visit.subject,
  },
  tenant: "grove",
  source: "porch-admin",
  correlationId: visit.id,
});

if (!result.success) {
  console.error("Email failed:", result.errorCode, result.errorMessage);
  return fail(500, { error: "Email failed to send" });
}
```

The default `zephyr` singleton reads its URL and API key from environment variables (`VITE_ZEPHYR_URL`, `VITE_ZEPHYR_API_KEY`, or their `PUBLIC_` / non-prefixed equivalents).

### From Server Routes (with platform.env)

When you need the Service Binding for direct Worker-to-Worker calls, use the factory:

```typescript
import { createZephyrClient } from "@autumnsgrove/lattice/zephyr";

export const POST: RequestHandler = async ({ platform }) => {
  const zephyr = createZephyrClient(platform.env);
  const result = await zephyr.send({ ... });
};
```

The factory checks for a `ZEPHYR` Service Binding on `platform.env`. If present, requests route through Cloudflare's internal networking.

### Sending Raw HTML

If you already have rendered HTML (legacy templates, custom one-offs):

```typescript
const result = await zephyr.sendRaw({
  to: "user@example.com",
  subject: "Your receipt",
  html: "<p>Thanks for your payment.</p>",
  text: "Thanks for your payment.",
  type: "lifecycle",
  tenant: "grove",
  source: "plant-payments",
});
```

The `sendRaw` method wraps `send` with `template: "raw"`. You must provide both `subject` and either `html` or `text`.

### Required Fields

Every `send` call needs three fields: `type`, `template`, and `to`. Everything else is optional.

| Field | Required | Purpose |
|-------|----------|---------|
| `type` | Yes | Email category (see types below) |
| `template` | Yes | Template name or `"raw"` |
| `to` | Yes | Recipient email address |
| `data` | No | Template variables (key-value pairs) |
| `subject` | For raw only | Subject line (templates set their own) |
| `html` | For raw only | Pre-rendered HTML body |
| `from` | No | Override sender address |
| `replyTo` | No | Reply-to address |
| `tenant` | No | Tenant ID for rate limiting |
| `source` | No | Calling service name (for logs) |
| `correlationId` | No | Request tracing ID |
| `idempotencyKey` | No | Prevents duplicate sends |
| `scheduledAt` | No | ISO 8601 timestamp for delayed send |

---

## Email Types and Rate Limits

Zephyr recognizes six email types. Each type has its own rate limits, retry behavior, and default sender address.

| Type | Per Minute | Per Day | Retries | Default From | Use Case |
|------|-----------|---------|---------|--------------|----------|
| `transactional` | 60 | 1,000 | 3 | `hello@grove.place` | One-to-one triggered emails |
| `notification` | 60 | 1,000 | 3 | `porch@grove.place` | System notifications (Porch replies) |
| `verification` | 10 | 100 | 3 | `hello@grove.place` | Auth codes, magic links |
| `sequence` | 100 | 5,000 | 3 | `autumn@grove.place` | Onboarding drip emails |
| `lifecycle` | 60 | 500 | 3 | `hello@grove.place` | Payment, renewal, trial |
| `broadcast` | 1,000 | 10,000 | 1 | `autumn@grove.place` | Marketing, announcements |

Rate limits are per-tenant. The rate limiter uses atomic D1 counters (INSERT ... ON CONFLICT DO UPDATE) to avoid race conditions from concurrent requests. If the rate limit check itself fails (D1 outage, etc.), Zephyr fails open and allows the request through.

Verification emails have the tightest limits (10/min, 100/day) because they're security-sensitive. Broadcast has the loosest because marketing volume is higher.

---

## How to Add a New Email Template

Email templates live in the engine's email module as React Email components. They are rendered by the `grove-email-render` worker, which Zephyr calls via Service Binding.

### Step 1: Create the React Email Component

Add a new `.tsx` file in the appropriate subdirectory under `libs/engine/src/lib/email/`:

- `sequences/` for onboarding drip emails
- `lifecycle/` for payment and subscription emails
- `porch/` for Porch-related emails
- `updates/` for patch notes and announcements
- `seasonal/` for seasonal greetings

Example component:

```tsx
// libs/engine/src/lib/email/lifecycle/TrialEndingEmail.tsx
import React from "react";
import { GroveEmail, GroveText, GroveButton } from "../components";

interface TrialEndingEmailProps {
  name?: string;
  daysLeft: number;
  upgradeUrl: string;
}

export function TrialEndingEmail({ name, daysLeft, upgradeUrl }: TrialEndingEmailProps) {
  return (
    <GroveEmail>
      <GroveText>
        Hi {name || "there"}, your trial ends in {daysLeft} days.
      </GroveText>
      <GroveButton href={upgradeUrl}>
        Upgrade now
      </GroveButton>
    </GroveEmail>
  );
}
```

The `GroveEmail`, `GroveText`, `GroveButton`, `GroveDivider`, and `GroveHighlight` components in `libs/engine/src/lib/email/components/` provide consistent Grove branding across all templates.

### Step 2: Export from the Subdirectory Index

Add your component to the relevant `index.ts`:

```typescript
// libs/engine/src/lib/email/lifecycle/index.ts
export { TrialEndingEmail } from "./TrialEndingEmail";
```

### Step 3: Register in the Email-Render Worker

The `grove-email-render` worker needs to know about your template. Add it to the render worker's template registry so Zephyr can request rendering by name.

### Step 4: Send Through Zephyr

```typescript
const result = await zephyr.send({
  type: "lifecycle",
  template: "TrialEndingEmail",
  to: userEmail,
  data: {
    name: userName,
    daysLeft: 3,
    upgradeUrl: "https://grove.place/billing/upgrade",
  },
  tenant: "grove",
  source: "plant-billing",
});
```

The template name you pass to `send` must match what the email-render worker recognizes. You can check available templates by hitting the `GET /templates` or `GET /health` endpoint on Zephyr.

---

## Retry Logic and Error Handling

### Retry Strategy

Zephyr retries up to 3 times with exponential backoff:

- Attempt 1: immediate
- Attempt 2: after 1 second
- Attempt 3: after 2 seconds

Only transient errors trigger retries. These patterns are considered retryable:

- Timeout errors
- Network errors (`ECONNRESET`, `ECONNREFUSED`)
- 5xx responses from Resend
- Rate limit responses from the upstream provider

Non-retryable errors (invalid request, bad template, unsubscribed recipient) fail immediately without retry.

### Circuit Breaker

If the Resend provider fails 5 times, the circuit breaker opens for 30 seconds. During that window, all send attempts fail fast with `CIRCUIT_OPEN` instead of hitting Resend. After 30 seconds, the circuit resets and tries again.

The circuit breaker state lives in worker memory, so it resets on worker restarts. This is intentional for a Cloudflare Worker (short-lived isolates).

### Error Response Shape

Every `send` call returns a `ZephyrResponse`:

```typescript
interface ZephyrResponse {
  success: boolean;
  messageId?: string;       // Resend message ID on success
  errorCode?: string;       // ZEPHYR-NNN code on failure
  errorMessage?: string;    // Human-readable description
  attempts?: number;        // How many attempts were made
  latencyMs?: number;       // Total request time
  unsubscribed?: boolean;   // True if recipient opted out
}
```

Always check `result.success` before assuming the email was sent. The whole point of Zephyr is that errors are returned, not swallowed.

### Logging

Every send attempt (success or failure) is logged to D1 in the `zephyr_logs` table. Logging is fire-and-forget (via `executionCtx.waitUntil`), so it never blocks the response. If the log write itself fails, the error is printed to console but the email response is still returned normally.

Logged fields include: recipient, subject, template name, error details, latency, attempt count, provider, tenant, and correlation ID. Email body content is never logged.

---

## The Engine Integration

The engine-side client lives at `libs/engine/src/lib/zephyr/`. It provides:

- `ZephyrClient` class with `send()`, `sendRaw()`, `broadcast()`, and `health()` methods
- `createZephyrClient()` factory for creating instances from `platform.env`
- A default `zephyr` singleton configured from environment variables
- All shared types (`ZephyrRequest`, `ZephyrResponse`, `EmailType`, etc.)

Import path: `@autumnsgrove/lattice/zephyr`

The client performs its own request validation before sending to the worker. If `type`, `template`, or `to` is missing, or if the email format is invalid, it returns an error immediately without making a network call.

The client also handles two authentication modes transparently. With a Service Binding (`fetcher` in config), it sends a SHA-256 hash via `X-Zephyr-Binding`. Without a binding, it sends the raw key via `X-API-Key` (after sanitizing newlines and control characters).

---

## Why Things Break

### "ZEPHYR-071: Template not found"

The template name you passed doesn't match anything in the email-render worker's registry. Template names are case-sensitive. Hit `GET /health` on Zephyr to see the list of available templates.

### "ZEPHYR-050: Rate limit exceeded"

You've exceeded the per-minute or per-day limit for that email type and tenant. Verification emails have the tightest cap (10/min). If you're hitting limits in production, check if your code is retrying in a loop or if the email type is wrong for your use case.

### "ZEPHYR-060: Provider error" (Resend API failure)

Resend returned an error. This could be a bad API key, a malformed email address that passed Zephyr's basic validation, or a Resend outage. Check the `errorMessage` for details. If Resend is consistently failing, the circuit breaker will open after 5 failures.

### "ZEPHYR-061: Circuit breaker open"

Too many consecutive Resend failures. Zephyr is pausing sends for 30 seconds to avoid hammering a broken provider. Wait and retry.

### "ZEPHYR-070: Template rendering failed"

The email-render worker returned an error. This usually means the template data is missing a required field, or the render worker itself is down. Check that `EMAIL_RENDER_URL` is correct and that the `grove-email-render` worker is deployed.

### "ZEPHYR-051: Unsubscribed"

The recipient has opted out via the `email_signups` table. Zephyr checks both the `unsubscribed_at` timestamp and the `onboarding_emails_unsubscribed` flag. This is a non-retryable, policy-enforced block.

### "ZEPHYR-020/021/022: Authentication errors"

The API key is missing, too short (minimum 16 characters), or doesn't match the configured `ZEPHYR_API_KEY` secret. For Service Binding callers, check that the `ZEPHYR_API_KEY` secret is set on both the calling worker and the Zephyr worker.

### Network errors from the client

If `ZephyrClient.send()` returns `errorCode: "INTERNAL_ERROR"` with a message starting with "Network error:", the HTTP request to Zephyr itself failed. This means either the Zephyr worker URL is wrong, the worker is down, or there's a connectivity issue. When using a Service Binding, this is rare.

---

## Key Files

### Zephyr Worker (services/zephyr/)

| File | Purpose |
|------|---------|
| `src/index.ts` | Hono app entry point, route definitions |
| `src/types.ts` | All type definitions (request, response, env, rate limits) |
| `src/errors.ts` | Error catalog (ZEPHYR-001 through ZEPHYR-082) |
| `src/handlers/send.ts` | Main email send orchestration |
| `src/handlers/broadcast.ts` | Social cross-posting to Bluesky |
| `src/handlers/health.ts` | Health check endpoint |
| `src/middleware/auth.ts` | API key validation (X-API-Key and X-Zephyr-Binding) |
| `src/middleware/validation.ts` | Request field validation |
| `src/middleware/rate-limit.ts` | Per-tenant atomic rate limiting |
| `src/middleware/unsubscribe.ts` | Recipient opt-out check |
| `src/providers/resend.ts` | Resend provider with retry and circuit breaker |
| `src/templates/index.ts` | Template registry and rendering dispatch |
| `src/logging/d1.ts` | D1 log writer and query helpers |
| `wrangler.toml` | Worker config, D1 binding, service binding |

### Engine Integration (libs/engine/src/lib/zephyr/)

| File | Purpose |
|------|---------|
| `index.ts` | Public exports |
| `client.ts` | ZephyrClient class and default singleton |
| `factory.ts` | `createZephyrClient()` for platform.env usage |
| `types.ts` | Client-side type definitions |
| `client.test.ts` | Unit tests for the client |

### Email Templates (libs/engine/src/lib/email/)

| Directory | Purpose |
|-----------|---------|
| `components/` | Shared React Email components (GroveEmail, GroveButton, etc.) |
| `sequences/` | Onboarding drip emails (Welcome, Day 1, 7, 14, 30) |
| `lifecycle/` | Payment and subscription emails (GentleNudge, RenewalThankYou) |
| `porch/` | Porch reply notification email |
| `seasonal/` | Seasonal greeting emails |
| `updates/` | Patch notes and announcements |
| `render.ts` | React Email rendering utilities |
| `types.ts` | Email-related type definitions |

### D1 Migrations (services/zephyr/migrations/)

| Migration | Tables |
|-----------|--------|
| `001_zephyr_logs.sql` | `zephyr_logs` (email send audit trail) |
| `002_rate_limit_counters.sql` | `zephyr_rate_limits`, `zephyr_rate_limits_daily` |
| `003_social_broadcasts.sql` | `zephyr_broadcasts`, `zephyr_social_deliveries` |

---

## Quick Checklist

### Adding a New Email Template

- [ ] Create React Email component in the right `libs/engine/src/lib/email/` subdirectory
- [ ] Use `GroveEmail` wrapper and shared components for consistent branding
- [ ] Export from the subdirectory's `index.ts`
- [ ] Register in the `grove-email-render` worker
- [ ] Test rendering locally (the render worker has a preview mode)
- [ ] Send a test email through Zephyr with your template name and data

### Adding a New Email to an Existing Feature

- [ ] Pick the correct email type (transactional, notification, verification, sequence, lifecycle, broadcast)
- [ ] Call `zephyr.send()` or `createZephyrClient(platform.env).send()`
- [ ] Check `result.success` and handle failures visibly (return error to user, log, etc.)
- [ ] Include `tenant`, `source`, and `correlationId` for traceability
- [ ] Use `idempotencyKey` if the send could be retried by your code
- [ ] Add a unit test that mocks the zephyr client

### Deploying Zephyr Changes

- [ ] Run tests: `cd services/zephyr && pnpm test:run`
- [ ] Apply any new D1 migrations: `wrangler d1 migrations apply zephyr-logs`
- [ ] Deploy: `wrangler deploy` from `services/zephyr/`
- [ ] Verify health: `curl https://grove-zephyr.m7jv4v7npb.workers.dev/health`
- [ ] If adding secrets: `wrangler secret put SECRET_NAME`

### Debugging a Failed Email

- [ ] Check `result.errorCode` and `result.errorMessage` from the send response
- [ ] Query D1 logs: `wrangler d1 execute zephyr-logs --command="SELECT * FROM zephyr_logs WHERE recipient = 'email@example.com' ORDER BY created_at DESC LIMIT 10"`
- [ ] Check if the recipient is unsubscribed in the `email_signups` table
- [ ] Check if rate limits are being hit (look for ZEPHYR-050 in logs)
- [ ] Verify the email-render worker is healthy and the template exists
