# Zephyr - Email Gateway

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

Zephyr is Grove's unified email gateway—a single Cloudflare Worker that handles all email sending across the entire ecosystem. One API. Consistent templates. Intelligent retries. Full observability.

## Overview

### What is Zephyr?

Zephyr replaces the scattered email code throughout Grove with a single, well-designed service. Instead of seven different files importing `Resend` directly, services now call one API that handles everything: validation, rate limiting, template rendering, retries, logging, and error handling.

### The Problem It Solves

Before Zephyr, Grove's email system was fragmented:

- **9+ locations** sending email independently
- **Silent failures**—errors logged but never surfaced (the Porch bug)
- **No retry logic**—if Resend failed, the email was lost forever
- **7 files** reading `RESEND_API_KEY` directly
- **3 different template systems** (React Email, HTML functions, inline strings)
- **No centralized logging**—impossible to track what was sent or why it failed
- **Inconsistent `from` addresses** across services

### The Solution

```typescript
// Before: Scattered, inconsistent, silent failures
const resend = new Resend(env.RESEND_API_KEY);
await resend.emails.send({
  from: "Grove <hello@grove.place>",
  to: recipient,
  subject: "...",
  html: "...",
});
// Error? Logged and forgotten.

// After: One call, retries, logging, error surfacing
const result = await Zephyr.send({
  type: "notification",
  template: "porch-reply",
  to: recipient,
  data: { content, visitId },
});

if (!result.success) {
  // Error is RETURNED, not swallowed
  return fail(500, { error: "Failed to send notification" });
}
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        GROVE SERVICES                            │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌───────────┐  │
│  │    Porch    │ │    Plant    │ │   Landing   │ │   Arbor   │  │
│  │  (support)  │ │ (payments)  │ │ (onboard)   │ │  (admin)  │  │
│  └──────┬──────┘ └──────┬──────┘ └──────┬──────┘ └─────┬─────┘  │
└─────────┼───────────────┼───────────────┼──────────────┼────────┘
          │               │               │              │
          │   Zephyr.send({ type, template, to, data })  │
          │               │               │              │
          └───────────────┴───────┬───────┴──────────────┘
                                  │
┌─────────────────────────────────┴─────────────────────────────────┐
│                      ZEPHYR WORKER                                 │
│                                                                    │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │                     PRE-PROCESSING                          │   │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │   │
│  │  │  Validation  │ │ Rate Limiter │ │ Unsubscribe  │        │   │
│  │  │  (schema)    │ │ (per-tenant) │ │   Check      │        │   │
│  │  └──────────────┘ └──────────────┘ └──────────────┘        │   │
│  └────────────────────────────────┬───────────────────────────┘   │
│                                   │                                │
│  ┌────────────────────────────────┴───────────────────────────┐   │
│  │                    TEMPLATE ENGINE                          │   │
│  │                                                             │   │
│  │   template: "welcome"      →  WelcomeEmail (React)          │   │
│  │   template: "porch-reply"  →  PorchReplyEmail (React)       │   │
│  │   template: "raw"          →  Pass-through HTML             │   │
│  │                                                             │   │
│  └────────────────────────────────┬───────────────────────────┘   │
│                                   │                                │
│  ┌────────────────────────────────┴───────────────────────────┐   │
│  │                    PROVIDER LAYER                           │   │
│  │                                                             │   │
│  │   Resend API with retry logic (3 attempts)                  │   │
│  │   Circuit breaker: 5 failures → 30s pause                   │   │
│  │                                                             │   │
│  └────────────────────────────────┬───────────────────────────┘   │
│                                   │                                │
│  ┌────────────────────────────────┴───────────────────────────┐   │
│  │                    POST-PROCESSING                          │   │
│  │  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐        │   │
│  │  │  Log to D1   │ │  Update      │ │  Return      │        │   │
│  │  │  (audit)     │ │  Metrics     │ │  Result      │        │   │
│  │  └──────────────┘ └──────────────┘ └──────────────┘        │   │
│  └────────────────────────────────────────────────────────────┘   │
│                                                                    │
└─────────────────────────────────┬─────────────────────────────────┘
                                  │
                         ┌────────┴────────┐
                         │    RESEND API   │
                         └─────────────────┘
```

### Components

| Component           | Purpose                   | Location                        |
| ------------------- | ------------------------- | ------------------------------- |
| **Auth Middleware** | API key validation        | `src/middleware/auth.ts`        |
| **Validation**      | Request schema validation | `src/middleware/validation.ts`  |
| **Rate Limiter**    | Per-tenant rate limiting  | `src/middleware/rate-limit.ts`  |
| **Unsubscribe**     | Check opt-out list        | `src/middleware/unsubscribe.ts` |
| **Templates**       | React Email rendering     | `src/templates/index.ts`        |
| **Provider**        | Resend with retries       | `src/providers/resend.ts`       |
| **D1 Logging**      | Audit trail               | `src/logging/d1.ts`             |

## Installation

```bash
cd workers/zephyr
pnpm install
```

## Configuration

### Environment Variables

| Variable             | Required | Default                                | Description                         |
| -------------------- | -------- | -------------------------------------- | ----------------------------------- |
| `RESEND_API_KEY`     | Yes      | —                                      | Resend API key for sending emails   |
| `ZEPHYR_API_KEY`     | Yes      | —                                      | API key for authenticating requests |
| `EMAIL_RENDER_URL`   | No       | `https://grove-email-render.pages.dev` | Email render worker URL             |
| `DEFAULT_FROM_EMAIL` | No       | `autumn@grove.place`                   | Default sender email                |
| `DEFAULT_FROM_NAME`  | No       | `Autumn`                               | Default sender name                 |
| `ENVIRONMENT`        | No       | —                                      | `production` or `staging`           |

### D1 Database Setup

```bash
# Create the database
wrangler d1 create zephyr-logs

# Run migrations
wrangler d1 execute zephyr-logs --file=migrations/001_zephyr_logs.sql

# Optional: Add indexes for better query performance
wrangler d1 execute zephyr-logs --file=migrations/002_zephyr_indexes.sql
```

### Secrets

```bash
# Set Resend API key
wrangler secret put RESEND_API_KEY

# Set Zephyr service API key (generate a strong one)
wrangler secret put ZEPHYR_API_KEY
# Tip: Generate with: openssl rand -base64 32
```

## Deployment

```bash
# Deploy to Cloudflare Workers
wrangler deploy

# Or deploy to specific environment
wrangler deploy --env production
```

## API Reference

### POST /send

Send an email. Requires authentication.

**Headers:**

```
Content-Type: application/json
X-API-Key: your-api-key-here
```

**Request Body:**

```typescript
{
  type: EmailType;           // Email category
  template: string;          // Template name or "raw"
  to: string;                // Recipient email
  toName?: string;           // Recipient name
  subject?: string;          // Required for raw templates
  data?: Record<string, unknown>;  // Template variables
  html?: string;             // For raw template
  text?: string;             // For raw template
  from?: string;             // Override sender
  fromName?: string;         // Override sender name
  replyTo?: string;          // Reply-to address
  tenant?: string;           // For rate limiting
  source?: string;           // Service identifier
  correlationId?: string;    // For tracing
  idempotencyKey?: string;   // Prevent duplicates
  scheduledAt?: string;      // ISO timestamp for delayed send
}
```

**Example Request:**

```bash
curl -X POST https://grove-zephyr.m7jv4v7npb.workers.dev/send \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $ZEPHYR_API_KEY" \
  -d '{
    "type": "notification",
    "template": "porch-reply",
    "to": "user@example.com",
    "data": {
      "content": "Thanks for reaching out!",
      "visitId": "123"
    },
    "tenant": "grove",
    "source": "porch-admin"
  }'
```

**Success Response (200):**

```json
{
  "success": true,
  "messageId": "resend-message-id-123",
  "attempts": 1,
  "latencyMs": 245
}
```

**Error Response (4xx/5xx):**

```json
{
  "success": false,
  "errorCode": "RATE_LIMITED",
  "errorMessage": "Rate limit exceeded: 65/60 per minute for type 'notification'",
  "latencyMs": 12
}
```

### GET /health

Health check endpoint. No authentication required.

**Response:**

```json
{
  "status": "ok",
  "templates": ["welcome", "porch-reply", "verification", "payment-failed"],
  "version": "1.0.0"
}
```

### GET /templates

List all available templates. No authentication required.

**Response:**

```json
{
  "templates": [
    "welcome",
    "porch-reply",
    "verification",
    "payment-failed",
    "raw"
  ],
  "version": "1.0.0"
}
```

## Email Types

Zephyr categorizes emails by type for appropriate handling:

| Type            | Per Minute | Per Day | Use Case                         | Retry |
| --------------- | ---------- | ------- | -------------------------------- | ----- |
| `transactional` | 60         | 1,000   | Password resets, confirmations   | 3×    |
| `notification`  | 60         | 1,000   | Activity notifications, replies  | 3×    |
| `verification`  | 10         | 100     | Email verifications, magic links | 3×    |
| `sequence`      | 100        | 5,000   | Onboarding drip emails           | 3×    |
| `lifecycle`     | 60         | 500     | Payment, renewal, trial events   | 3×    |
| `broadcast`     | 1,000      | 10,000  | Newsletters, announcements       | 1×    |

### Type Selection Guide

- **Transactional**: User-triggered, time-sensitive, one-to-one
- **Notification**: System-triggered alerts, activity updates
- **Verification**: Authentication flows, security codes
- **Sequence**: Time-delayed onboarding or nurture emails
- **Lifecycle**: Subscription events, billing notifications
- **Broadcast**: Marketing emails to multiple recipients

## Error Codes

| Code                | HTTP | Description                               | Retryable            |
| ------------------- | ---- | ----------------------------------------- | -------------------- |
| `INVALID_REQUEST`   | 400  | Malformed request or missing fields       | No                   |
| `INVALID_TEMPLATE`  | 400  | Unknown template name                     | No                   |
| `INVALID_RECIPIENT` | 400  | Invalid email format                      | No                   |
| `RATE_LIMITED`      | 429  | Too many requests for tenant/type         | No                   |
| `UNSUBSCRIBED`      | 403  | Recipient has opted out                   | No                   |
| `PROVIDER_ERROR`    | 502  | Resend API error                          | Yes (auto-retried)   |
| `TEMPLATE_ERROR`    | 400  | Template rendering failed                 | No                   |
| `CIRCUIT_OPEN`      | 503  | Circuit breaker active, too many failures | Yes (after cooldown) |
| `INTERNAL_ERROR`    | 500  | Unexpected server error                   | Yes (1 retry)        |

## Usage Example (Client)

```typescript
import { zephyr } from "@autumnsgrove/lattice/zephyr";

// Send a notification email
const result = await zephyr.send({
  type: "notification",
  template: "porch-reply",
  to: "user@example.com",
  data: {
    content: "Thanks for your message!",
    visitId: "abc123",
  },
  tenant: "grove",
  source: "porch-admin",
  correlationId: visit.id,
});

if (!result.success) {
  console.error("Email failed:", result.errorCode, result.errorMessage);
  // Handle error appropriately
}

// Send with idempotency key (prevents duplicates)
const result2 = await zephyr.send({
  type: "transactional",
  template: "welcome",
  to: "newuser@example.com",
  data: { name: "Autumn" },
  idempotencyKey: `welcome-${userId}-${Date.now()}`,
});

// Send raw HTML (for legacy templates)
const result3 = await zephyr.sendRaw({
  type: "transactional",
  to: "user@example.com",
  subject: "Custom Email",
  html: "<h1>Hello!</h1><p>Custom content here</p>",
  text: "Hello! Custom content here",
  tenant: "grove",
});

// Check service health
const health = await zephyr.health();
if (health) {
  console.log("Service healthy, available templates:", health.templates);
}
```

## Development

```bash
# Run locally with hot reload
pnpm run dev

# Run tests
pnpm test

# Run tests with coverage
pnpm test --coverage

# Type check
pnpm run typecheck
```

## Security

### Authentication

All `/send` requests require a valid `X-API-Key` header. The key is validated using timing-safe comparison to prevent timing attacks.

```typescript
// Valid request
fetch("/send", {
  headers: {
    "X-API-Key": "your-secret-key",
  },
  // ...
});
```

### Privacy

Zephyr respects privacy by design:

- **Email body/content is never logged**—only metadata (recipient, subject, template name)
- **Template data is never stored**—personalization variables stay in memory only
- **Idempotency keys are hashed** if stored for duplicate prevention

### Rate Limiting

Per-tenant rate limits prevent abuse:

- Separate limits per email type
- Rolling window (not calendar-based)
- Failed sends don't count against limits
- Rate limit headers returned on 429 responses

## Monitoring

### D1 Logs

Every send attempt is logged to D1 for audit and debugging:

```sql
-- Query recent sends
SELECT * FROM zephyr_logs
WHERE created_at > unixepoch('now') - 86400
ORDER BY created_at DESC;

-- Check failures
SELECT type, template, error_code, COUNT(*)
FROM zephyr_logs
WHERE success = 0
GROUP BY type, template, error_code;

-- Rate limit hits per tenant
SELECT tenant, type, COUNT(*)
FROM zephyr_logs
WHERE error_code = 'RATE_LIMITED'
GROUP BY tenant, type;
```

### Health Endpoint

Monitor the service health:

```bash
curl https://grove-zephyr.m7jv4v7npb.workers.dev/health
```

### Circuit Breaker Status

The circuit breaker protects against cascading failures. Monitor via logs:

```
[Zephyr] Circuit breaker opened for provider
```

## License

Grove License - See repository root for details.

---

_The wind carries what matters. Zephyr delivers._
