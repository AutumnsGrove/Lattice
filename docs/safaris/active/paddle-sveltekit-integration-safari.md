# Paddle + SvelteKit Integration Safari — How Does This Actually Work?

> Not "should we use Paddle?" — that was the last safari. This is "how does it live inside SvelteKit?"
> **Aesthetic principle**: Concrete code patterns over abstract architecture diagrams
> **Scope**: Paddle.js client-side, Node SDK server-side, webhooks in SvelteKit routes, Grove mapping

---

## The Short Answer

**Does Paddle use webhooks?** Yes — it's the primary mechanism for knowing what happened.

**Can we integrate directly in SvelteKit?** Yes — Paddle.js loads client-side in your Svelte components, webhooks land on SvelteKit `+server.ts` routes. No external service needed.

**Do we need to externalise it like LemonSqueezy?** No. LemonSqueezy used external checkout URLs that redirect users away from your site. Paddle's overlay checkout stays on your page — it opens as a modal on top of your content. The customer never leaves Grove.

---

## How Paddle's Architecture Works

```
┌─────────────────────────────────────────────────────────────────┐
│                         GROVE (SvelteKit)                       │
│                                                                 │
│  ┌──────────────────────┐     ┌──────────────────────────────┐  │
│  │  Client (Browser)    │     │  Server (+server.ts routes)  │  │
│  │                      │     │                              │  │
│  │  @paddle/paddle-js   │     │  @paddle/paddle-node-sdk     │  │
│  │  ┌────────────────┐  │     │  ┌────────────────────────┐  │  │
│  │  │ Paddle.Init()  │  │     │  │ new Paddle(API_KEY)    │  │  │
│  │  │ Paddle.Checkout│  │     │  │ paddle.webhooks        │  │  │
│  │  │   .open()      │──┼─────┼──│   .unmarshal()         │  │  │
│  │  └────────────────┘  │     │  │ paddle.subscriptions   │  │  │
│  │                      │     │  │ paddle.customers       │  │  │
│  └──────────┬───────────┘     │  └────────────────────────┘  │  │
│             │                 │             ▲                 │  │
│             │ opens overlay   │             │ POST webhooks   │  │
│             ▼                 │             │                 │  │
│  ┌──────────────────────┐     │  ┌──────────────────────────┐ │  │
│  │  Paddle Checkout     │     │  │ /api/webhooks/paddle/    │ │  │
│  │  (overlay on page)   │     │  │ +server.ts               │ │  │
│  │  ┌────────────────┐  │     │  └──────────────────────────┘ │  │
│  │  │ Email / address│  │     │                              │  │
│  │  │ Payment method │  │     └──────────────────────────────┘  │
│  │  │ Tax (auto)     │  │                                       │
│  │  │ Complete ──────┼──┼────► Paddle servers ─── webhook ──►   │
│  │  └────────────────┘  │                                       │
│  └──────────────────────┘                                       │
└─────────────────────────────────────────────────────────────────┘
```

**Two libraries, two sides of the wall:**

| Library | Side | Purpose | Package |
|---------|------|---------|---------|
| **Paddle.js** | Client (browser) | Checkout UI, payment collection | `@paddle/paddle-js` (npm) or CDN: `https://cdn.paddle.com/paddle.js` |
| **Paddle Node SDK** | Server (SvelteKit) | API calls, webhook verification | `@paddle/paddle-node-sdk` |

---

## Stop 1: Paddle.js — The Client Side

*The jeep rolls to the first stop. Binoculars up. How does Paddle.js actually load and work inside a Svelte component?*

### How Paddle.js Loads — Two Options

**Option A: npm package (recommended for SvelteKit)**

```bash
npm install @paddle/paddle-js
```

Paddle provides an official npm wrapper `@paddle/paddle-js` with TypeScript types and a clean `initializePaddle()` function. This is the right choice for SvelteKit — no script tag injection, proper types, tree-shakeable.

**Option B: CDN script tag**

```html
<script src="https://cdn.paddle.com/paddle.js"></script>
```

Injects `window.Paddle` global. Works but requires `@ts-expect-error` casts everywhere.

### Initialization

After loading, you initialize with your **client-side token** (not the API key — that's server-only):

```typescript
import { initializePaddle } from '@paddle/paddle-js';

const paddle = await initializePaddle({
  token: "ptk_live_or_sandbox_xxxx",  // Client-side token from Paddle dashboard
  environment: "sandbox",              // or "production"
  eventCallback: (event) => {
    // Global event listener for ALL checkout events
    // 18 event types: checkout.loaded, checkout.completed, checkout.failed, etc.
  },
});
```

### SvelteKit Integration Pattern

Since Paddle.js needs the browser, it initializes in `onMount`. Using the npm package:

```svelte
<!-- src/lib/components/PaddleProvider.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { initializePaddle, type Paddle } from '@paddle/paddle-js';
  import { PUBLIC_PADDLE_CLIENT_TOKEN, PUBLIC_PADDLE_ENV } from '$env/static/public';

  // Expose the paddle instance to child components via context or store
  import { setPaddleInstance } from '$lib/stores/paddle';

  onMount(async () => {
    const paddle = await initializePaddle({
      token: PUBLIC_PADDLE_CLIENT_TOKEN,
      environment: PUBLIC_PADDLE_ENV || 'sandbox',
      eventCallback: (event) => {
        if (event.name === 'checkout.completed') {
          // Optimistic UI update — real confirmation comes via webhook
        }
      },
    });

    if (paddle) {
      setPaddleInstance(paddle);
    }
  });
</script>

<!-- This component renders nothing — it's a side-effect provider -->
```

**Where it goes in Grove:** In the root `+layout.svelte` of `apps/plant`, alongside other providers. It loads once and stays resident.

### Client-Side Checkout Events

The `eventCallback` fires for 18+ events during the checkout lifecycle:

| Event | When |
|-------|------|
| `checkout.loaded` | Checkout UI rendered |
| `checkout.customer.created` | New customer during checkout |
| `checkout.payment.selected` | Customer chose a payment method |
| `checkout.payment.initiated` | Payment processing started |
| `checkout.completed` | Payment succeeded |
| `checkout.failed` | Payment failed |
| `checkout.closed` | Customer closed the overlay |
| `checkout.error` | Something went wrong |

These are **client-side only** — for optimistic UI updates, analytics, and UX feedback. The webhook is still the source of truth for provisioning.

### Opening a Checkout

Two modes: **overlay** (modal on your page) and **inline** (embedded frame in a div).

#### Overlay Checkout (Recommended for Grove)

```svelte
<!-- src/lib/components/PaddleCheckoutButton.svelte -->
<script lang="ts">
  import { getPaddleInstance } from '$lib/stores/paddle';

  export let priceId: string;
  export let customerEmail: string | undefined = undefined;
  export let customData: Record<string, unknown> = {};

  function openCheckout() {
    const paddle = getPaddleInstance();

    // Two mutually exclusive modes (TypeScript-enforced via `never`):
    // Mode A: pass items[] (Paddle auto-creates transaction)
    // Mode B: pass transactionId (you created it server-side)
    // For new signups, Mode A is simpler:

    paddle?.Checkout.open({
      items: [{ priceId, quantity: 1 }],
      customer: customerEmail ? { email: customerEmail } : undefined,
      customData,  // Stored on transaction AND copied to subscription
      settings: {
        displayMode: 'overlay',
        variant: 'one-page',  // Single-page checkout (vs multi-page)
        theme: 'light',
        locale: 'en',
      },
    });
  }
</script>

<button on:click={openCheckout}>
  <slot>Subscribe</slot>
</button>
```

**Key `Paddle.Checkout.open()` parameters:**

| Parameter | Type | Purpose |
|-----------|------|---------|
| `items` | `[{ priceId, quantity }]` | What they're buying — maps to Paddle Price IDs |
| `customer` | `{ email }` or `{ id }` | Pre-fill customer (email OR Paddle customer ID, not both) |
| `customData` | JSON object | Your metadata — stored on transaction, **copied to subscription** |
| `settings.displayMode` | `"overlay"` or `"inline"` | Modal vs embedded |
| `settings.variant` | `"one-page"` or `"multi-page"` | Checkout UX layout |
| `settings.theme` | `"light"` or `"dark"` | Checkout theme |
| `settings.locale` | string | Language code |
| `settings.successUrl` | URL | Redirect after successful payment |

#### Inline Checkout (Alternative)

```svelte
<!-- src/lib/components/PaddleInlineCheckout.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';

  export let priceId: string;
  export let customerEmail: string | undefined = undefined;

  let container: HTMLDivElement;

  onMount(() => {
    window.Paddle?.Checkout.open({
      items: [{ priceId, quantity: 1 }],
      customer: customerEmail ? { email: customerEmail } : undefined,
      settings: {
        displayMode: 'inline',
        frameTarget: 'paddle-checkout-container',
        frameStyle: 'width:100%; min-width:312px; background:transparent; border:0;',
        frameInitialHeight: 420,
      },
    });
  });
</script>

<div bind:this={container} class="paddle-checkout-container" />
```

### Overlay vs Inline — Which for Grove?

| Aspect | Overlay | Inline |
|--------|---------|--------|
| **Setup** | 4 steps, simpler | 5 steps, more complex |
| **UX** | Modal over your page — customer doesn't leave | Embedded in your page layout |
| **Items list** | Built-in (shows price, quantity, totals) | You build your own pricing display |
| **Branding** | Less customizable | More control (branded inline checkout) |
| **Min width** | N/A | 286px (no padding) / 312px (with padding) |
| **Best for** | Quick integration, standard checkout | Custom-branded, embedded experience |

**Recommendation for Grove: Overlay.** It's simpler, shows the full checkout context (items, tax, totals), and the one-page variant is clean. The pricing page already shows tier details — the overlay just needs to collect payment.

### `customData` — How Grove Passes Context Through Paddle

This is critical. `customData` is the equivalent of Stripe's `metadata`. Whatever you put in `customData` when opening the checkout:

1. Gets stored on the **transaction** Paddle creates
2. Gets **automatically copied** to the **subscription** when created
3. Gets **included in webhook payloads** for that transaction/subscription
4. Is visible in the Paddle dashboard

**For Grove**, this is how we link Paddle events back to our users:

```typescript
Paddle.Checkout.open({
  items: [{ priceId: PADDLE_PRICES.seedling.monthly, quantity: 1 }],
  customer: { email: user.email },
  customData: {
    grove_onboarding_id: onboardingRecord.id,
    grove_username: user.username,
    grove_plan: 'seedling',
    grove_billing_cycle: 'monthly',
  },
});
```

When the webhook fires, `customData` is in the payload — we use `grove_onboarding_id` to find the onboarding record, exactly like Stripe's `metadata.onboarding_id`.

### Safari Finding

**No SvelteKit-specific Paddle tutorial exists anywhere online.** Zero. This is greenfield territory. But the integration is clean because `@paddle/paddle-js` is a proper npm package with TypeScript types and `initializePaddle()` — not just a CDN script. The Svelte pattern is `onMount` → `initializePaddle()` → store the instance → `paddle.Checkout.open()`. Typed throughout, no `window` globals or `@ts-expect-error` casts needed.

---

## Stop 2: Paddle Node SDK — The Server Side

*The jeep bounces across a dry riverbed. On the other side, the server-side landscape opens up.*

### Installation

```bash
# Server-side SDK (API calls, webhook verification)
pnpm add @paddle/paddle-node-sdk

# Client-side SDK (checkout UI, TypeScript types)
pnpm add @paddle/paddle-js
```

### Initialization

```typescript
// src/lib/server/paddle.ts
import { Paddle, Environment } from '@paddle/paddle-node-sdk';

export const paddle = new Paddle(PADDLE_API_KEY, {
  environment: Environment.sandbox, // or Environment.production
});
```

**Important:** The SDK uses **camelCase** for properties even though the Paddle API uses snake_case. The SDK handles the translation.

### SDK Resources

The SDK provides typed access to all Paddle resources:

```typescript
// Products
const products = paddle.products.list();
for await (const product of products) { /* ... */ }

// Subscriptions
const sub = await paddle.subscriptions.get('sub_xxx');
await paddle.subscriptions.cancel('sub_xxx', { effectiveFrom: 'next_billing_period' });

// Customers
const customer = await paddle.customers.get('ctm_xxx');

// Prices
const prices = paddle.prices.list();
```

### Resource Mapping: Paddle → Stripe → Grove

| Paddle Resource | Stripe Equivalent | Grove PaymentProvider Method |
|----------------|-------------------|----------------------------|
| Products | Products | `syncProduct()` |
| Prices | Prices | `syncPrice()` |
| Customers | Customers | `syncCustomer()`, `getCustomer()` |
| Subscriptions | Subscriptions | `getSubscription()`, `cancelSubscription()`, `resumeSubscription()` |
| Transactions | PaymentIntents | `createCheckoutSession()`, `getPaymentStatus()` |
| Adjustments | Refunds | `refund()` |
| Customer Portal | Billing Portal | `createBillingPortalSession()` |
| Notification Settings | Webhook Endpoints | (dashboard config) |

### Direct API Calls (Without SDK)

Grove's Stripe integration uses a custom `StripeClient` class (fetch-based, no Stripe npm package) for Cloudflare Workers compatibility. The same approach works for Paddle:

```typescript
// libs/engine/src/lib/payments/paddle/client.ts
const PADDLE_API_BASE = 'https://api.paddle.com';      // production
const PADDLE_SANDBOX = 'https://sandbox-api.paddle.com'; // sandbox

export class PaddleClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(apiKey: string, sandbox = false) {
    this.apiKey = apiKey;
    this.baseUrl = sandbox ? PADDLE_SANDBOX : PADDLE_API_BASE;
  }

  async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`${this.baseUrl}/${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
        ...options?.headers,
      },
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Paddle API error ${res.status}: ${text}`);
    }

    const json = await res.json();
    return json.data as T; // Paddle wraps responses in { data: ... }
  }
}
```

**Why this matters for Grove:** The existing `StripeClient` is fetch-based (478 lines) specifically because it needs to run on Cloudflare Workers. A `PaddleClient` would follow the exact same pattern — no Node.js-specific APIs, pure fetch.

### Safari Finding

The Paddle Node SDK (`@paddle/paddle-node-sdk`) is clean and well-typed. **However**, if Grove needs Cloudflare Workers compatibility (like the current Stripe integration), we'd build a custom `PaddleClient` class following the same fetch-based pattern as `StripeClient`. The SDK is great for local dev and testing, but the custom client is the production pattern.

---

## Stop 3: Webhooks in SvelteKit — The Bridge

*The most important stop on the safari. This is where Paddle talks back to Grove. The jeep parks. We're staying here a while.*

### How Paddle Webhooks Work

1. You configure a **webhook endpoint URL** in the Paddle dashboard (Developer Tools → Notifications)
2. When events happen (subscription created, payment completed, etc.), Paddle POSTs to that URL
3. The POST includes a `paddle-signature` header for verification
4. Your server verifies the signature, processes the event, returns 200

### The SvelteKit Webhook Route

```typescript
// apps/plant/src/routes/api/webhooks/paddle/+server.ts
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import crypto from 'node:crypto';

const PADDLE_WEBHOOK_SECRET = env.PADDLE_WEBHOOK_SECRET;

export const POST: RequestHandler = async ({ request }) => {
  // 1. Get raw body (MUST be text, not parsed JSON — signature covers raw bytes)
  const rawBody = await request.text();

  // 2. Get signature header
  const signature = request.headers.get('paddle-signature');
  if (!signature) {
    return error(400, 'Missing Paddle-Signature header');
  }

  // 3. Verify signature
  const isValid = verifyPaddleSignature(rawBody, signature, PADDLE_WEBHOOK_SECRET);
  if (!isValid) {
    return error(400, 'Invalid webhook signature');
  }

  // 4. Parse the payload
  const payload = JSON.parse(rawBody);

  // 5. Process event (respond 200 FIRST, then process)
  // Paddle requires 200 within 5 seconds — process async if needed

  // 6. Idempotency check (same pattern as Stripe handler)
  const eventId = payload.event_id;
  // Check webhook_events table for duplicate...

  // 7. Route by event type
  switch (payload.event_type) {
    case 'transaction.completed':
      await handleTransactionCompleted(payload);
      break;
    case 'subscription.created':
      await handleSubscriptionCreated(payload);
      break;
    case 'subscription.updated':
      await handleSubscriptionUpdated(payload);
      break;
    case 'subscription.canceled':
      await handleSubscriptionCanceled(payload);
      break;
    case 'subscription.past_due':
      await handleSubscriptionPastDue(payload);
      break;
    default:
      // Log unknown event types
      break;
  }

  return json({ received: true });
};
```

### Signature Verification — The Details

The `paddle-signature` header format is: `ts=TIMESTAMP;h1=HASH`

```typescript
function verifyPaddleSignature(
  rawBody: string,
  signatureHeader: string,
  secret: string
): boolean {
  // Parse the header: "ts=1234567890;h1=abc123..."
  const parts = signatureHeader.split(';');
  const tsStr = parts.find(p => p.startsWith('ts='))?.replace('ts=', '');
  const h1 = parts.find(p => p.startsWith('h1='))?.replace('h1=', '');

  if (!tsStr || !h1) return false;

  // Reconstruct the signed payload: "timestamp:rawBody"
  const signedPayload = `${tsStr}:${rawBody}`;

  // Compute expected signature
  const expected = crypto
    .createHmac('sha256', secret)
    .update(signedPayload, 'utf8')
    .digest('hex');

  // Timing-safe comparison (prevents timing attacks)
  try {
    return crypto.timingSafeEqual(
      Buffer.from(h1),
      Buffer.from(expected)
    );
  } catch {
    return false;
  }
}
```

**Or using the Paddle SDK (recommended — handles everything including typing):**

```typescript
import { Paddle, Environment } from '@paddle/paddle-node-sdk';

const paddle = new Paddle(PADDLE_API_KEY, { environment: Environment.production });

// The SDK handles signature verification + event parsing + type mapping
// Returns a typed event (SubscriptionCreatedEvent, TransactionCompletedEvent, etc.)
const event = await paddle.webhooks.unmarshal(rawBody, PADDLE_WEBHOOK_SECRET, signature);
// Note: unmarshal is ASYNC — uses RuntimeProvider for cross-platform crypto
// Works in both Node.js and edge runtimes (Cloudflare Workers compatible)
```

### Production Warning: 5-Second Replay Window

The Paddle SDK's `WebhooksValidator` rejects signatures where the timestamp is more than **5 seconds** old (`MAX_VALID_TIME_DIFFERENCE = 5`). This is extremely tight — Stripe uses 300 seconds (5 minutes). In production:

- Server clock skew can cause false rejections
- If your webhook handler takes >5 seconds to receive the request (network latency, cold starts), it'll fail
- **Mitigation**: Use NTP for accurate server time, or implement your own signature verification with a more generous window (Grove's Stripe handler uses 256 seconds)

If using the custom `verifyPaddleSignature()` function above, you can add your own timestamp tolerance check. If using `paddle.webhooks.unmarshal()`, you're locked to 5 seconds.

### Webhook Events Grove Needs to Handle

| Paddle Event | What Happened | Grove Action |
|-------------|---------------|-------------|
| `transaction.completed` | Payment succeeded | Create tenant (onboarding flow) or record payment |
| `subscription.created` | New subscription created | Store `provider_subscription_id` in platform_billing |
| `subscription.activated` | Trial ended, billing started | Update status to `active` |
| `subscription.updated` | Plan change, payment method, etc. | Update tier/status in platform_billing |
| `subscription.canceled` | Subscription ended | Set status to `cancelled`, update period end |
| `subscription.past_due` | Payment failed, dunning started | Set status to `past_due`, send email |
| `subscription.paused` | Subscription paused | Set status to `paused` |
| `subscription.resumed` | Subscription resumed | Set status to `active` |

### How This Compares to Grove's Current Stripe Webhook Handler

The existing handler at `apps/plant/src/routes/api/webhooks/stripe/+server.ts` (518 lines) does:

1. Idempotency via `webhook_events` table ← **Same pattern for Paddle**
2. PII sanitization before storage ← **Same pattern**
3. 120-day event retention ← **Same pattern**
4. Event routing via switch statement ← **Same pattern, different event names**

**The Paddle handler would be structurally identical.** The only differences are:
- Different signature verification (Paddle's `ts=;h1=` format vs Stripe's `t=,v1=` format)
- Different event names (`subscription.canceled` vs `customer.subscription.deleted`)
- Different payload shapes (Paddle nests data in `event.data`, Stripe uses `event.data.object`)
- Paddle includes `customData` in webhooks (Grove's metadata strategy carries through)

### Safari Finding

**Webhooks integrate directly in SvelteKit.** No external service needed. A `+server.ts` file at `/api/webhooks/paddle/` handles everything. The pattern is nearly identical to the existing Stripe handler — same idempotency checks, same PII sanitization, same event routing. This is a translation task, not an architecture task.

---

## Stop 4: The Complete Checkout Flow

*Stepping back to see the full picture. How does a customer go from clicking "Subscribe" to having an active Grove account?*

### Current Flow (Stripe)

```
User clicks "Subscribe to Seedling"
  ↓
Server creates Stripe Checkout Session (with metadata)
  ↓
Redirect to Stripe hosted checkout page (leaves Grove)
  ↓
Customer fills in payment details on Stripe
  ↓
Stripe redirects back to Grove success URL
  ↓
Stripe fires webhook: checkout.session.completed
  ↓
Grove webhook handler creates tenant via createTenant()
  ↓
Account active
```

### Proposed Flow (Paddle)

```
User clicks "Subscribe to Seedling"
  ↓
Paddle.Checkout.open() called with priceId + customData  (NO server round-trip!)
  ↓
Paddle overlay appears ON Grove's page (customer never leaves)
  ↓
Customer fills in email, address, payment details in overlay
  ↓
Paddle handles tax calculation, payment processing, 3DS
  ↓
Overlay closes. Optional redirect to success URL
  ↓
Paddle fires webhook: transaction.completed + subscription.created
  ↓
Grove webhook handler creates tenant via createTenant()
  ↓
Account active
```

### Key Difference: No Server-Side Checkout Session

With Stripe, Grove creates a checkout session on the server (`createCheckoutSession()`) and redirects the user. With Paddle, the checkout opens **entirely from the client** — `Paddle.Checkout.open()` is called from a Svelte component with the price ID and metadata baked in. No server round-trip to create a session.

```
STRIPE:   Client → Server (create session) → Redirect → Stripe → Redirect back → Webhook
PADDLE:   Client → Paddle overlay (on page) → Webhook
```

This is **simpler** and **faster** — two fewer network hops, no redirect, no "Redirecting you to Stripe..." loading state.

### What About Server-Side Transaction Creation?

For more complex scenarios (server-generated checkout tokens, authenticated plan changes), Paddle also supports creating transactions server-side:

```typescript
// Server-side transaction creation (alternative to client-side Paddle.Checkout.open)
const transaction = await paddle.transactions.create({
  items: [{ priceId: 'pri_xxx', quantity: 1 }],
  customerId: 'ctm_xxx',  // Existing Paddle customer
  customData: { grove_tenant_id: tenant.id },
});

// Then open checkout with the transaction ID
// Client-side:
Paddle.Checkout.open({ transactionId: transaction.id });
```

This is useful for **existing customers changing plans** where you want server-side control over what's in the checkout.

---

## Stop 5: How It Maps to Grove's PaymentProvider Interface

*The final stop. The big question: does the existing interface hold, or does it need surgery?*

### Interface Method Mapping

```typescript
// libs/engine/src/lib/payments/types.ts — PaymentProvider interface

interface PaymentProvider {
  // PRODUCTS & PRICES
  syncProduct(product: Product): Promise<SyncResult>;           // ✅ Paddle Products API
  syncPrice(price: ProductVariant): Promise<SyncResult>;        // ✅ Paddle Prices API
  archiveProduct(providerProductId: string): Promise<void>;     // ✅ Paddle archive product

  // CHECKOUT
  createCheckoutSession(params: CheckoutParams): Promise<CheckoutSession>;
    // ⚠️ DIFFERENT: Paddle opens client-side, not server-created sessions
    // Option A: Return price IDs + customData, let client call Paddle.Checkout.open()
    // Option B: Create server-side transaction, return transactionId for client

  getCheckoutSession(id: string): Promise<CheckoutSession>;     // ✅ Get transaction

  // PAYMENTS
  getPaymentStatus(id: string): Promise<PaymentStatus>;         // ✅ Transaction status
  refund(params: RefundParams): Promise<RefundResult>;           // ✅ Adjustments API

  // SUBSCRIPTIONS
  getSubscription(id: string): Promise<Subscription>;           // ✅ Subscriptions API
  cancelSubscription(id: string, opts?): Promise<void>;         // ✅ Cancel subscription
  resumeSubscription(id: string): Promise<void>;                // ✅ Resume (if paused)

  // CUSTOMERS
  syncCustomer(customer: Customer): Promise<SyncResult>;        // ✅ Customers API
  getCustomer(id: string): Promise<Customer>;                   // ✅ Get customer
  createBillingPortalSession(params): Promise<PortalSession>;   // ✅ Customer portal sessions

  // WEBHOOKS
  handleWebhook(rawBody: string, signature: string): Promise<WebhookEvent>;
    // ✅ Signature verification + event parsing

  // STRIPE CONNECT (optional)
  createConnectAccount?(): Promise<...>;                        // ❌ Not applicable
  getConnectAccount?(): Promise<...>;                           // ❌ Not applicable
  createConnectAccountLink?(): Promise<...>;                    // ❌ Not applicable
  createConnectLoginLink?(): Promise<...>;                      // ❌ Not applicable
}
```

**Score: 13/14 core methods implementable** (Connect methods are optional and Paddle doesn't have an equivalent — but they're already optional in the interface).

### The `createCheckoutSession` Challenge

This is the one method that doesn't map cleanly. Stripe's flow:

```
Server: createCheckoutSession() → returns URL → Client: redirect
```

Paddle's flow:

```
Client: Paddle.Checkout.open({ priceId, customData }) → overlay opens
```

**Two design options:**

#### Option A: Server returns checkout config, client opens overlay

```typescript
// PaddleProvider.createCheckoutSession() returns data for client-side use
async createCheckoutSession(params: CheckoutParams): Promise<CheckoutSession> {
  // Don't create anything on Paddle — just build the client config
  return {
    id: crypto.randomUUID(), // Local tracking ID
    status: 'pending',
    // Paddle-specific: client reads these to call Paddle.Checkout.open()
    providerData: {
      priceId: params.priceId,
      customData: params.metadata,
      customerEmail: params.customerEmail,
    },
  };
}
```

**Pros:** Simplest. No server round-trip to open checkout.
**Cons:** `createCheckoutSession` doesn't actually create anything on Paddle's side.

#### Option B: Server creates a Paddle transaction, client opens with transaction ID

```typescript
async createCheckoutSession(params: CheckoutParams): Promise<CheckoutSession> {
  const transaction = await this.client.request('transactions', {
    method: 'POST',
    body: JSON.stringify({
      items: [{ price_id: params.priceId, quantity: 1 }],
      custom_data: params.metadata,
    }),
  });

  return {
    id: transaction.id,
    status: 'pending',
    providerData: { transactionId: transaction.id },
  };
}

// Client opens with:
// Paddle.Checkout.open({ transactionId: session.providerData.transactionId })
```

**Pros:** Server controls what's in the checkout. More Stripe-like flow.
**Cons:** Extra server round-trip.

**Recommendation: Option A for new signups, Option B for plan changes.** New signups are simple (fixed price, one item) — no need for server involvement. Plan changes on existing subscriptions need server logic (proration, customer validation).

### The Factory Pattern — Adding Paddle

```typescript
// libs/engine/src/lib/payments/index.ts (currently 75 lines)
export function createPaymentProvider(
  type: ProviderType,
  config: PaymentProviderConfig
): PaymentProvider {
  switch (type) {
    case 'stripe':
      return createStripeProvider(config);
    case 'paddle':
      return createPaddleProvider(config);  // ← Implement this
    default:
      throw new Error(`Unknown payment provider: ${type}`);
  }
}
```

The slot already exists. Literally just needs the implementation.

### Status Mapping

```typescript
// Paddle subscription statuses → Grove internal statuses
const PADDLE_STATUS_MAP: Record<string, string> = {
  'active':     'active',
  'trialing':   'trialing',
  'past_due':   'past_due',
  'paused':     'paused',
  'canceled':   'cancelled',   // Note: Paddle uses American spelling
};
```

Compare to the existing Stripe mapping in `apps/plant/src/lib/server/stripe.ts`:

```typescript
// Already maps: active, past_due, canceled, trialing, paused, unpaid
// The Paddle mapping is nearly identical
```

---

## Stop 6: Environment & Configuration

*Quick stop. What environment variables does this need?*

### Required Environment Variables

```env
# Server-side (NEVER exposed to client)
PADDLE_API_KEY=pdl_live_xxxx           # or pdl_sdbx_xxxx for sandbox
PADDLE_WEBHOOK_SECRET=whsec_xxxx       # From Paddle dashboard → Developer Tools → Notifications

# Client-side (safe for browser)
PUBLIC_PADDLE_CLIENT_TOKEN=ptk_live_xxxx   # or ptk_sdbx_xxxx for sandbox
PUBLIC_PADDLE_ENV=sandbox                   # or "production"

# Price IDs (from Paddle dashboard → Catalog → Products → Prices)
PADDLE_SEEDLING_MONTHLY=pri_xxxx
PADDLE_SEEDLING_YEARLY=pri_xxxx
PADDLE_SAPLING_MONTHLY=pri_xxxx
PADDLE_SAPLING_YEARLY=pri_xxxx
PADDLE_OAK_MONTHLY=pri_xxxx
PADDLE_OAK_YEARLY=pri_xxxx
PADDLE_EVERGREEN_MONTHLY=pri_xxxx
PADDLE_EVERGREEN_YEARLY=pri_xxxx
```

### Paddle Dashboard Configuration

```
1. Paddle Dashboard → Catalog → Products
   - Create: Seedling, Sapling, Oak, Evergreen
   - Each with monthly + yearly prices
   - Copy price IDs (pri_xxx) to env vars

2. Paddle Dashboard → Developer Tools → Authentication
   - API Key (server-side): pdl_xxx
   - Client Token: ptk_xxx

3. Paddle Dashboard → Developer Tools → Notifications
   - Add webhook URL: https://yourgrove.com/api/webhooks/paddle
   - Subscribe to events: transaction.completed, subscription.*
   - Copy webhook secret: whsec_xxx
```

---

## Stop 7: Local Development & Testing

*The sun is low. One more stop — how do you actually develop and test this?*

### Paddle Sandbox

Paddle has a separate sandbox environment. Everything has sandbox equivalents:
- Sandbox API: `https://sandbox-api.paddle.com`
- Sandbox dashboard: `https://sandbox-vendors.paddle.com`
- Sandbox client tokens start with `ptk_sdbx_`

### Test Cards

Paddle sandbox accepts test cards:
- `4242 4242 4242 4242` — successful payment
- `4000 0000 0000 0002` — declined
- Standard Stripe-like test card numbers

### Local Webhook Testing

Paddle webhooks require a **public URL**. For local development:

```bash
# Option 1: ngrok
ngrok http 5173

# Option 2: Paddle's webhook simulator
# Dashboard → Developer Tools → Notifications → Simulate
# Sends test events to your configured URL
```

Paddle's webhook simulator lets you trigger specific events (subscription.created, etc.) without making real transactions. This is better than Stripe CLI for quick testing.

### Dual-Provider Development

During the transition, you'd run both Stripe and Paddle:

```typescript
// The provider is selected per-request, not globally
const provider = createPaymentProvider(
  tenant.billing_provider, // 'stripe' or 'paddle' — stored per tenant
  providerConfig
);
```

New signups go through Paddle. Existing Stripe customers keep using Stripe. The `platform_billing` table already has a `provider` concept through the generic `provider_*` columns.

---

## Expedition Summary

### By the Numbers

| Stop | Topic | Finding |
|------|-------|---------|
| 1 | Paddle.js (Client) | Framework-agnostic CDN script. `onMount` + `Paddle.Checkout.open()` in Svelte. No npm package needed client-side |
| 2 | Node SDK (Server) | `@paddle/paddle-node-sdk` or custom fetch-based client. Clean API, typed, camelCase |
| 3 | Webhooks in SvelteKit | Direct `+server.ts` route. HMAC-SHA256 signature verification. Structurally identical to existing Stripe handler |
| 4 | Checkout Flow | Simpler than Stripe — no server session creation, no redirect. Overlay opens on page |
| 5 | PaymentProvider Mapping | 13/14 methods implementable. `createCheckoutSession` needs slight adaptation |
| 6 | Environment Config | 2 server vars, 2 client vars, 8 price IDs |
| 7 | Local Dev | Sandbox env + webhook simulator. Dual-provider via per-tenant config |

### Key Findings

1. **No external service needed.** Paddle integrates directly into SvelteKit — Paddle.js on the client, webhook handler as a server route. Unlike LemonSqueezy which redirected users to an external checkout page, Paddle's overlay stays on your site.

2. **No dedicated SvelteKit + Paddle guide exists online.** Zero tutorials, zero blog posts, zero boilerplates specifically for SvelteKit. But it doesn't matter — Paddle.js is framework-agnostic and the server patterns are standard fetch/webhook handlers.

3. **The checkout flow is simpler than Stripe's.** Stripe requires a server round-trip to create a checkout session, then a redirect. Paddle opens an overlay directly from the client with `Paddle.Checkout.open()`. Two fewer network hops.

4. **Webhook handling is nearly identical to Stripe's.** Same concept (POST to endpoint, verify signature, route events), different header format and event names. Grove's existing webhook handler pattern (idempotency, PII sanitization, event retention) translates directly.

5. **Grove's architecture is ready.** The factory pattern has a paddle slot. The interface maps 13/14 methods. The database uses generic `provider_*` columns. The `StripeClient` pattern (fetch-based, Workers-compatible) templates the `PaddleClient`. This is a translation job.

6. **`customData` is the bridge.** Paddle's `customData` (passed via `Paddle.Checkout.open()`) flows through to webhooks on both transactions and subscriptions. It's the exact equivalent of Stripe's `metadata` — and Grove already uses metadata to link checkout events back to onboarding records.

### Recommended Implementation Order

| # | Task | Effort | Depends On |
|---|------|--------|------------|
| 1 | Create Paddle account, set up sandbox | Trivial | Nothing |
| 2 | Create products + prices in Paddle dashboard | Trivial | #1 |
| 3 | Implement `PaddleClient` (fetch-based) | Medium | #1 |
| 4 | Implement `PaddleProvider` (PaymentProvider interface) | Medium | #3 |
| 5 | Wire factory (`payments/index.ts`) | Trivial | #4 |
| 6 | Add `PaddleProvider.svelte` to root layout | Low | #1 |
| 7 | Add `PaddleCheckoutButton.svelte` to pricing page | Low | #6 |
| 8 | Create `/api/webhooks/paddle/+server.ts` | Medium | #3 |
| 9 | Update webhook handler to create tenants | Medium | #8 |
| 10 | Add billing portal link (Paddle customer portal) | Low | #4 |
| 11 | Test full flow in sandbox | Medium | All above |
| 12 | Dual-provider routing (new = Paddle, existing = Stripe) | Medium | #11 |

**Estimated total: 2–3 weeks of focused work.**

### What Doesn't Change

- Database schema (zero changes — `provider_*` columns work for both)
- Tier definitions (`tiers.ts` is provider-agnostic)
- Feature access checks (`billing.ts` reads from `platform_billing`, not from Stripe)
- Billing audit logging (same `audit_log` table)
- The front-end pricing page (just swap the checkout button component)

### Files to Create

```
libs/engine/src/lib/payments/paddle/
├── client.ts          # PaddleClient — fetch-based API wrapper (~300 lines)
├── provider.ts        # PaddleProvider — implements PaymentProvider (~500 lines)
└── types.ts           # Paddle-specific TypeScript types (~200 lines)

apps/plant/src/lib/server/paddle.ts          # Price IDs, checkout config (~100 lines)
apps/plant/src/lib/components/
├── PaddleProvider.svelte                    # Script loader (~30 lines)
└── PaddleCheckoutButton.svelte              # Checkout trigger (~40 lines)
apps/plant/src/routes/api/webhooks/paddle/
└── +server.ts                               # Webhook handler (~300 lines)
```

**Total new code: ~1,500 lines.** For reference, the Stripe implementation is ~2,200 lines across provider.ts (701) + client.ts (478) + stripe.ts (480) + webhook handler (518).

---

## Sources

### Paddle Official
- [Build Overlay Checkout](https://developer.paddle.com/build/checkout/build-overlay-checkout)
- [Paddle.js Overview](https://developer.paddle.com/paddlejs/overview)
- [Paddle.Checkout.open() API](https://developer.paddle.com/paddlejs/methods/paddle-checkout-open)
- [Inline Checkout](https://developer.paddle.com/build/checkout/build-branded-inline-checkout)
- [Webhooks Overview](https://developer.paddle.com/webhooks/overview)
- [Handle Webhook Delivery](https://developer.paddle.com/webhooks/respond-to-webhooks)
- [Custom Data](https://developer.paddle.com/api-reference/about/custom-data)
- [Paddle Node SDK (GitHub)](https://github.com/PaddleHQ/paddle-node-sdk)
- [Paddle Next.js Starter Kit — Webhook Processing](https://deepwiki.com/PaddleHQ/paddle-nextjs-starter-kit/4.1-webhook-processing)

### Community Examples
- [Paddle Integration for SaaS — AverageDevs](https://www.averagedevs.com/blog/paddle-integration-for-saas)
- [Paddle Billing Implementation Guide — DEV.to](https://dev.to/arshan_nawaz/paddle-billing-integration-implementation-guide-25op)
- [Overlay Checkout + Webhooks — Medium](https://medium.com/@girish1729/using-overlay-checkout-in-paddle-and-configuring-webhook-for-one-time-payments-3ea02f099624)
- [MakerKit Paddle Configuration](https://makerkit.dev/docs/next-supabase-turbo/billing/paddle)
- [Simple Overlay Checkout — CodePen](https://codepen.io/heymcgovern/pen/wvZMmGq)
- [Paddle Billing Community Wrapper (TypeScript)](https://github.com/kossnocorp/paddle-billing)

### SvelteKit Context
- [SvelteKit + Stripe (pattern reference)](https://github.com/srmullen/sveltekit-stripe)
- [Recurring Payments with SvelteKit + Stripe — DEV.to](https://dev.to/joshnuss/recurring-payments-with-sveltekit-stripe-3d1j)
- [DesignShipy SvelteKit Boilerplate (includes Paddle)](https://designshipy.vercel.app/)

---

*The fire crackles. Seven stops, one creature observed from every angle. The journal is full of code patterns, architecture sketches, and a clear implementation path. No mystery left — just work. The overlay opens on your page, the webhooks land in your routes, the factory was already waiting. Tomorrow, we build. But tonight? Tonight was the drive. And the creature was exactly what we hoped it would be.*
