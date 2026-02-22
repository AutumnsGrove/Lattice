# Zephyr Client

The official client for Zephyr, Grove's unified email gateway.

```
    🍃 Zephyr Client 🍃

    Simple. Reliable. Grove-native.
```

## Installation

The client is included in `@autumnsgrove/lattice`:

```bash
npm install @autumnsgrove/lattice
# or
pnpm add @autumnsgrove/lattice
```

## Quick Start

```typescript
import { zephyr } from "@autumnsgrove/lattice/zephyr";

// Send an email
const result = await zephyr.send({
  type: "notification",
  template: "porch-reply",
  to: "user@example.com",
  data: {
    content: "Thanks for your message!",
    visitId: "123",
  },
});

if (!result.success) {
  console.error("Email failed:", result.errorMessage);
}
```

## Configuration

The client automatically reads from environment variables:

| Variable              | Description         | Default                                       |
| --------------------- | ------------------- | --------------------------------------------- |
| `VITE_ZEPHYR_URL`     | Zephyr worker URL   | (use service binding in production) |
| `VITE_ZEPHYR_API_KEY` | Your API key        | —                                             |
| `PUBLIC_ZEPHYR_URL`   | Alternative URL var | —                                             |
| `ZEPHYR_API_KEY`      | Alternative key var | —                                             |

### Custom Configuration

```typescript
import { ZephyrClient } from '@autumnsgrove/lattice/zephyr';

// In production, use the ZEPHYR service binding instead of a URL.
// Direct URL is only for local development.
const client = new ZephyrClient({
  baseUrl: env.ZEPHYR_URL || 'http://localhost:8787',
  apiKey: env.ZEPHYR_API_KEY,
});

const result = await client.send({...});
```

## API Reference

### `zephyr.send(request)`

Send an email through Zephyr.

**Parameters:**

```typescript
interface ZephyrRequest {
  type: EmailType; // 'transactional' | 'notification' | 'verification' | 'sequence' | 'lifecycle' | 'broadcast'
  template: string; // Template name or 'raw'
  to: string; // Recipient email
  toName?: string; // Recipient name
  subject?: string; // Required for raw templates
  data?: Record<string, any>; // Template variables
  html?: string; // For raw template
  text?: string; // For raw template
  from?: string; // Override sender email
  fromName?: string; // Override sender name
  replyTo?: string; // Reply-to address
  tenant?: string; // For rate limiting
  source?: string; // Service identifier
  correlationId?: string; // For tracing
  idempotencyKey?: string; // Prevent duplicate sends
  scheduledAt?: string; // ISO timestamp for delayed delivery
}
```

**Returns:**

```typescript
interface ZephyrResponse {
  success: boolean;
  messageId?: string; // Provider message ID
  errorCode?: ZephyrErrorCode;
  errorMessage?: string;
  attempts?: number; // Number of retry attempts
  latencyMs?: number; // Response time
  unsubscribed?: boolean; // True if recipient opted out
}
```

**Example:**

```typescript
const result = await zephyr.send({
  type: "transactional",
  template: "welcome",
  to: "newuser@example.com",
  toName: "Jane Doe",
  data: {
    name: "Jane",
    signupDate: new Date().toISOString(),
  },
  tenant: "grove",
  source: "landing-signup",
  correlationId: "signup-123",
  idempotencyKey: `welcome-${userId}`,
});

if (result.success) {
  console.log("Email sent:", result.messageId);
} else {
  console.error("Failed:", result.errorCode, result.errorMessage);
}
```

### `zephyr.sendRaw(params)`

Send a pre-rendered email (useful for legacy templates during migration).

**Parameters:**

```typescript
{
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
  fromName?: string;
  replyTo?: string;
  tenant?: string;
  type?: EmailType;  // defaults to 'transactional'
}
```

**Example:**

```typescript
const result = await zephyr.sendRaw({
  to: "user@example.com",
  subject: "Custom Email",
  html: "<h1>Hello!</h1><p>Custom content</p>",
  text: "Hello! Custom content",
  tenant: "grove",
});
```

### `zephyr.health()`

Check if the Zephyr service is healthy and list available templates.

**Returns:**

```typescript
{
  status: string;      // 'ok' or error status
  templates: string[]; // Available template names
  version: string;     // Service version
} | null
```

**Example:**

```typescript
const health = await zephyr.health();
if (health) {
  console.log("Service is healthy");
  console.log("Available templates:", health.templates);
} else {
  console.error("Zephyr service is down");
}
```

## Email Types

Choose the appropriate type for your email:

| Type            | Use Case                       | Rate Limit          |
| --------------- | ------------------------------ | ------------------- |
| `transactional` | Password resets, confirmations | 60/min, 1000/day    |
| `notification`  | Activity alerts, replies       | 60/min, 1000/day    |
| `verification`  | Auth codes, magic links        | 10/min, 100/day     |
| `sequence`      | Onboarding drips               | 100/min, 5000/day   |
| `lifecycle`     | Payment, renewal events        | 60/min, 500/day     |
| `broadcast`     | Newsletters, marketing         | 1000/min, 10000/day |

## Error Handling

Always check the `success` flag and handle errors appropriately:

```typescript
const result = await zephyr.send({...});

if (!result.success) {
  switch (result.errorCode) {
    case 'RATE_LIMITED':
      // Back off and retry later
      await delay(60000);
      break;

    case 'UNSUBSCRIBED':
      // Update user preferences
      await markUserUnsubscribed(userId);
      break;

    case 'INVALID_TEMPLATE':
      // Fix template name
      console.error('Unknown template:', templateName);
      break;

    case 'PROVIDER_ERROR':
    case 'CIRCUIT_OPEN':
      // Temporary failure, might retry
      await queueForRetry(request);
      break;

    default:
      // Log for investigation
      console.error('Email failed:', result);
  }
}
```

### Error Codes

| Code                | Description               | Action               |
| ------------------- | ------------------------- | -------------------- |
| `INVALID_REQUEST`   | Missing or invalid fields | Fix request payload  |
| `INVALID_TEMPLATE`  | Template not found        | Check template name  |
| `INVALID_RECIPIENT` | Bad email format          | Validate email first |
| `RATE_LIMITED`      | Too many requests         | Wait and retry       |
| `UNSUBSCRIBED`      | User opted out            | Respect preference   |
| `PROVIDER_ERROR`    | Resend API error          | Auto-retried 3×      |
| `TEMPLATE_ERROR`    | Rendering failed          | Check template data  |
| `CIRCUIT_OPEN`      | Too many failures         | Wait 30s, then retry |
| `INTERNAL_ERROR`    | Server error              | Retry once           |

## Advanced Usage

### Idempotency

Prevent duplicate sends with idempotency keys:

```typescript
const result = await zephyr.send({
  type: "transactional",
  template: "welcome",
  to: "user@example.com",
  data: { name: "User" },
  // Same key = same result (cached for 24h)
  idempotencyKey: `welcome-${userId}-${signupDate}`,
});
```

### Scheduled Delivery

Send emails at a specific time:

```typescript
const tomorrow = new Date(Date.now() + 86400000);

const result = await zephyr.send({
  type: "sequence",
  template: "day-7",
  to: "user@example.com",
  data: { name: "User" },
  scheduledAt: tomorrow.toISOString(),
});
```

### Correlation IDs

Trace emails across services:

```typescript
const correlationId = crypto.randomUUID();

// Log context
console.log("Processing signup:", correlationId);

// Send email with same ID
await zephyr.send({
  type: "transactional",
  template: "welcome",
  to: "user@example.com",
  correlationId, // Appears in D1 logs
});

// Later, query logs by correlation ID
```

### Multi-Tenant Usage

For services handling multiple tenants:

```typescript
await zephyr.send({
  type: "notification",
  template: "alert",
  to: "admin@tenant.com",
  data: { message: "Server alert" },
  tenant: "tenant-slug", // Separate rate limits per tenant
  source: "arbor-monitoring",
});
```

### Health Checks

Monitor service availability:

```typescript
async function checkEmailHealth(): Promise<boolean> {
  const health = await zephyr.health();
  return health?.status === "ok";
}

// In your health check endpoint
app.get("/health", async (c) => {
  const emailHealthy = await checkEmailHealth();
  return c.json({
    status: emailHealthy ? "ok" : "degraded",
    services: { email: emailHealthy },
  });
});
```

## Testing

### Mock the Client

```typescript
// In your test setup
import { vi } from "vitest";

vi.mock("@autumnsgrove/lattice/zephyr", () => ({
  zephyr: {
    send: vi.fn(),
    sendRaw: vi.fn(),
    health: vi.fn(),
  },
}));

// In your tests
import { zephyr } from "@autumnsgrove/lattice/zephyr";

test("sends welcome email", async () => {
  vi.mocked(zephyr.send).mockResolvedValue({
    success: true,
    messageId: "test-123",
  });

  await signupUser("test@example.com");

  expect(zephyr.send).toHaveBeenCalledWith(
    expect.objectContaining({
      type: "transactional",
      template: "welcome",
    }),
  );
});
```

### Integration Testing

```typescript
test("end-to-end email flow", async () => {
  // Use real Zephyr in test environment
  const client = new ZephyrClient({
    baseUrl: "http://localhost:8787",
    apiKey: "test-key",
  });

  const result = await client.send({
    type: "transactional",
    template: "welcome",
    to: "test@example.com",
    data: { name: "Test" },
  });

  expect(result.success).toBe(true);
  expect(result.messageId).toBeDefined();
});
```

## TypeScript Types

Import types for your own code:

```typescript
import type {
  ZephyrRequest,
  ZephyrResponse,
  ZephyrConfig,
  EmailType,
  ZephyrErrorCode,
} from "@autumnsgrove/lattice/zephyr";

function createWelcomeEmail(user: User): ZephyrRequest {
  return {
    type: "transactional",
    template: "welcome",
    to: user.email,
    data: { name: user.name },
  };
}
```

## Best Practices

1. **Always check `success` flag** — Don't assume emails sent
2. **Use idempotency keys** — Prevent duplicates on retries
3. **Handle `UNSUBSCRIBED`** — Respect user preferences
4. **Set `source`** — Makes debugging easier
5. **Use `correlationId`** — Trace across services
6. **Check health** — Fail gracefully if service is down
7. **Don't log API keys** — Keep them secret

## Troubleshooting

**Emails not sending?**

- Check `VITE_ZEPHYR_URL` is set correctly
- Verify `VITE_ZEPHYR_API_KEY` is valid
- Check D1 logs for errors

**Getting 401 errors?**

- API key is missing or invalid
- Header should be `X-API-Key`, not `Authorization`

**Rate limited?**

- Check your email type limits
- Consider if a different type is appropriate
- Implement backoff/retry logic

**Template not found?**

- Names are case-sensitive
- Check `/templates` endpoint for available templates
- Use `raw` template for custom HTML

---

_Simple as a breeze, reliable as the wind._
