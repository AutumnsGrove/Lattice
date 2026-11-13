---
title: Lattice — Grove Platform SDK
description: Architecture, subsystems, and implementation details for @autumnsgrove/lattice
category: specs
specCategory: core-infrastructure
icon: codesandbox
lastUpdated: "2026-02-17"
aliases: []
tags:
  - core
  - sveltekit
  - npm
  - cloudflare-workers
---

# Lattice — Grove Platform SDK

> **This is the canonical specification for Grove's core engine.**
> See [Implementation Status](#implementation-status) for what's live vs. planned.

```
              🌿            🌿            🌿
                ╲          ╱  ╲          ╱
                 ╲        ╱    ╲        ╱
                  ╲      ╱      ╲      ╱
                   ╲    ╱        ╲    ╱
                    ╲  ╱          ╲  ╱
                     ╳             ╳
                    ╱  ╲          ╱  ╲
                   ╱    ╲        ╱    ╲
                  ╱      ╲      ╱      ╲
                 ╱        ╲    ╱        ╲
                ╱          ╲  ╱          ╲
              🌿            🌿            🌿

          The framework that supports growth.
```

> _The framework that supports growth._

**Public Name:** Lattice
**Package:** `@autumnsgrove/lattice`
**Version:** `1.0.0`
**License:** AGPL-3.0-only
**Registry:** Dual — `npmjs.com` (public releases) + `npm.pkg.github.com` (monorepo/CI default)

A lattice is the framework that supports growth. Vines climb it. Gardens are built around it. The lattice stays invisible; what matters is everything it supports.

Lattice is the npm package powering every Grove site and every Grove service. It's not just a component library. It's the full platform SDK: authentication, rate limiting, AI inference, content moderation, Durable Object coordination, email infrastructure, feature flags, curios, and the Grove design system — all of it, published as one versioned package.

You don't admire a lattice. You build on it, and watch what grows.

---

## Architecture

### Tech Stack

| Layer                | Technology                                              |
| -------------------- | ------------------------------------------------------- |
| **Framework**        | SvelteKit 2.0+ with `svelte-package` for library builds |
| **Language**         | TypeScript (strict mode)                                |
| **Styling**          | Tailwind CSS 3.4+                                       |
| **UI Components**    | Svelte 5, bits-ui, tailwind-variants                    |
| **Rich Text Editor** | Tiptap 3 (ProseMirror-based)                            |
| **Content**          | Markdown via markdown-it + remark/rehype pipeline       |
| **Email**            | React Email + Resend                                    |
| **Media**            | Cloudflare R2 + JXL/WebP encoding (`@jsquash/jxl`)      |
| **Database**         | Cloudflare D1 (SQLite at the edge)                      |
| **Cache/Sessions**   | Cloudflare KV                                           |
| **Realtime**         | Cloudflare Durable Objects (via Loom)                   |
| **AI**               | OpenRouter + Cloudflare Workers AI (via Lumen)          |
| **Build**            | Vite + pnpm workspaces                                  |
| **Testing**          | Vitest (100+ test files across the codebase)            |

### Deployment Model

Lattice lives in the Grove monorepo at `libs/engine/`. Every other Grove package imports from it directly via workspace resolution during development, and from the published npm package in production CI.

```
libs/
├── engine/          ← @autumnsgrove/lattice (this package)
├── gossamer/        ← imports from @autumnsgrove/lattice
├── foliage/         ← imports from @autumnsgrove/lattice

apps/
├── landing/         ← imports from @autumnsgrove/lattice
├── meadow/          ← imports from @autumnsgrove/lattice
├── plant/           ← imports from @autumnsgrove/lattice
├── clearing/        ← imports from @autumnsgrove/lattice
├── terrarium/       ← imports from @autumnsgrove/lattice
├── heartwood/       ← Grove's auth service (separate Hono worker)
└── domains/         ← Domain management app

services/
├── durable-objects/ ← Grove's DO worker (separate Cloudflare Worker)
├── heartwood/       ← (if applicable to services)
├── forage/          ← Service app
├── zephyr/          ← Service app
├── grove-router/    ← Router service
├── og-worker/       ← OG image generation
└── email-render/    ← Email rendering
```

Consumer packages each have their own Cloudflare resources (D1, KV, R2) and deploy as independent Workers or Pages projects.

### Vite Configuration Note

Every package that imports from `@autumnsgrove/lattice` must add this to its `vite.config.ts`:

```ts
optimizeDeps: { exclude: ['@jsquash/jxl'] },
build: { rollupOptions: { external: ['@jsquash/jxl'] } }
```

Without it, Rollup fails with "IIFE output formats are not supported for code-splitting builds."

---

## Package Exports

Lattice uses ~47 named export paths for tree-shaking. Each subsystem has its own path.

### Export Map

```json
{
	".": "Main barrel — components, UI, heartwood client, utils",
	"./ui": "Full Grove design system",
	"./ui/editor": "Tiptap-based markdown editor",
	"./ui/arbor": "Admin panel UI components",
	"./ui/chrome": "Header, Footer, MobileMenu, ThemeToggle",
	"./ui/stores": "Svelte stores (theme, etc.)",
	"./ui/gallery": "Image gallery components",
	"./ui/charts": "Chart components",
	"./ui/content": "Content display components",
	"./ui/content/hum": "Hum variant content components",
	"./ui/content/curios": "Curio display components (Svelte)",
	"./ui/feedback": "Toast, alerts, loading states",
	"./ui/forms": "Form controls and wrappers",
	"./ui/indicators": "Status indicators, badges",
	"./ui/icons": "Lucide icon wrapper",
	"./ui/states": "Empty/error/loading state components",
	"./ui/typography": "Font wrapper components",
	"./ui/nature": "Seasonal nature components (botanical, sky, etc.)",
	"./ui/nature/*": "Individual nature subsystems",
	"./ui/tokens": "Design tokens",
	"./ui/utils": "UI utility functions",
	"./ui/styles": "grove.css (Tailwind base styles)",
	"./ui/tailwind": "Tailwind preset",
	"./ui/terrarium": "Terrarium-specific UI",
	"./vineyard": "Vineyard components",
	"./utils": "Client-side utility functions",
	"./utils/*": "Individual utility modules",
	"./auth": "Session management utilities",
	"./auth/*": "Individual auth modules",
	"./server": "Server-side utilities (rate limits, logger, canopy dir)",
	"./server/*": "Individual server modules",
	"./platform/config": "Platform configuration constants",
	"./platform/config/*": "Individual config modules",
	"./platform/config/terrarium": "Terrarium-specific config",
	"./payments": "Abstract payment provider types",
	"./services": "Server services",
	"./auth": "GroveAuth OAuth client",
	"./groveauth": "Alias for ./auth",
	"./platform/feature-flags": "Feature flag evaluation engine",
	"./curios": "Curio types, logic, developer curio components",
	"./curios/timeline": "Timeline curio (AI daily summaries)",
	"./curios/timeline/voices": "Timeline voice presets",
	"./curios/gallery": "Gallery curio",
	"./platform/pricing": "Pricing page component",
	"./platform/greenhouse": "Greenhouse beta access component",
	"./platform/uploads": "Upload management component",
	"./platform/upgrades": "Upgrade flow component",
	"./auth/login": "Login UI component",
	"./auth/login/server": "Login server utilities",
	"./ai/lumen": "AI inference gateway",
	"./platform/threshold": "Rate limiting SDK",
	"./platform/threshold/sveltekit": "Threshold SvelteKit adapter",
	"./platform/threshold/hono": "Threshold Hono adapter",
	"./platform/threshold/worker": "Threshold raw Worker adapter",
	"./thorn": "Content moderation",
	"./email": "Email infrastructure (components, types, templates)",
	"./email/components": "Grove-branded React Email components",
	"./email/render": "Email rendering utilities",
	"./email/sequences": "Onboarding email sequences",
	"./email/types": "Email type definitions",
	"./email/updates": "Patch notes and announcement emails",
	"./email/schedule": "Resend scheduling utilities",
	"./email/urls": "Email link generation",
	"./email/porch": "Subscription lifecycle emails",
	"./zephyr": "Email + social broadcasting client",
	"./errors": "Typed error system",
	"./loom": "Durable Object framework base",
	"./loom/sveltekit": "Loom SvelteKit adapter",
	"./loom/worker": "Loom raw Worker adapter",
	"./loom/testing": "Loom test utilities"
}
```

---

## Core Subsystems

---

### Heartwood — Authentication

**Import:** `@autumnsgrove/lattice/auth` (also aliased as `./groveauth`)

Heartwood is Grove's authentication service — a separate Hono worker that handles OAuth, sessions, passkeys, and 2FA. Lattice ships the client library for interacting with it.

Auth uses PKCE-based OAuth. There are no magic codes, no Resend-based email auth. Google OAuth is live; passkeys and 2FA are supported in the API.

#### Client Setup

```typescript
import { createGroveAuthClient } from "@autumnsgrove/lattice/auth";

const auth = createGroveAuthClient({
	clientId: "your-client-id",
	clientSecret: env.GROVEAUTH_CLIENT_SECRET,
	redirectUri: "https://yoursite.grove.place/auth/callback",
});

// Generate login URL (PKCE)
const { url, state, codeVerifier } = await auth.getLoginUrl();

// Exchange code for tokens
const tokens = await auth.exchangeCode(code, codeVerifier);

// Check if user can post (quota check)
const { allowed, status } = await auth.canUserCreatePost(tokens.access_token, userId);
```

#### PKCE Helpers

```typescript
import {
	generateCodeVerifier,
	generateCodeChallenge,
	generateState,
} from "@autumnsgrove/lattice/auth";
```

#### Quota Utilities

```typescript
import {
	getQuotaWidgetData,
	getPreSubmitCheck,
	getQuotaDescription,
	getQuotaUrgency,
	getSuggestedActions,
	getUpgradeRecommendation,
} from "@autumnsgrove/lattice/auth";

// Powers the QuotaWidget component
const widgetData = getQuotaWidgetData(subscription);

// Call before submit to warn users at limit
const check = getPreSubmitCheck(subscription);
if (!check.canPost) {
	// show upgrade prompt
}
```

#### Rate Limiting (Client-Side)

```typescript
import { RateLimiter, withRateLimit } from "@autumnsgrove/lattice/auth";

await withRateLimit(limiter, "operation-key", async () => {
	await doExpensiveThing();
});
```

#### Key Types

```typescript
type SubscriptionTier = "free" | "seedling" | "sapling" | "oak" | "evergreen";

interface UserSubscription {
	tier: SubscriptionTier;
	status: SubscriptionStatus;
	postsUsed: number;
	postsLimit: number;
}

interface CanPostResponse {
	allowed: boolean;
	status: "ok" | "near_limit" | "at_limit" | "over_limit";
	postsUsed: number;
	postsLimit: number;
}

// Passkeys, 2FA, linked accounts — all typed in ./heartwood/types.ts
```

#### Auth Error System

```typescript
import { AUTH_ERRORS, getAuthError, buildErrorParams } from "@autumnsgrove/lattice/auth";

const error = getAuthError("INVALID_SESSION");
const params = buildErrorParams(error, context);
```

#### Status Colors (for UI)

```typescript
import {
	getStatusColorFromPercentage,
	getAlertVariantFromColor,
} from "@autumnsgrove/lattice/auth";

const color = getStatusColorFromPercentage((postsUsed / postsLimit) * 100); // 'green' | 'yellow' | 'orange' | 'red'
const variant = getAlertVariantFromColor(color); // 'success' | 'warning' | 'destructive'
```

---

### Threshold — Rate Limiting

**Import:** `@autumnsgrove/lattice/platform/threshold`

Threshold is the unified rate limiting SDK used across all Grove workers. Three storage backends. Three framework adapters. Endpoint-aware configuration with abuse tracking.

#### Quick Start

```typescript
import { createThreshold, ThresholdKVStore } from "@autumnsgrove/lattice/platform/threshold";

const threshold = createThreshold({
	store: new ThresholdKVStore(env.KV),
	keyPrefix: "rl:",
});

const result = await threshold.check({
	key: clientIp,
	limit: 60,
	windowSeconds: 60,
});

if (!result.allowed) {
	return new Response("Rate limited", { status: 429 });
}
```

#### Storage Backends

```typescript
import {
	ThresholdKVStore, // Cloudflare KV — fastest, approximate
	ThresholdD1Store, // D1 — exact counts, audit trail
	ThresholdDOStore, // Durable Object — exact, consistent, for hot paths
} from "@autumnsgrove/lattice/platform/threshold";
```

#### Framework Adapters

```typescript
// SvelteKit hooks.server.ts
import { thresholdHandle } from "@autumnsgrove/lattice/platform/threshold/sveltekit";
export const handle = thresholdHandle({ store, limits: ENDPOINT_RATE_LIMITS });

// Hono middleware
import { thresholdMiddleware } from "@autumnsgrove/lattice/platform/threshold/hono";

// Raw Worker
import { applyThreshold } from "@autumnsgrove/lattice/platform/threshold/worker";
```

#### Endpoint Configuration

```typescript
import { ENDPOINT_RATE_LIMITS, getEndpointLimit } from "@autumnsgrove/lattice/platform/threshold";

// Pre-configured limits for all Grove API endpoints
const limit = getEndpointLimit("/api/posts");
```

#### Abuse Tracking

```typescript
import {
	recordViolation,
	isBanned,
	getBanRemaining,
	clearAbuseState,
} from "@autumnsgrove/lattice/platform/threshold";

await recordViolation(store, ip, "rate_limit_exceeded");
const banned = await isBanned(store, ip);
```

---

### Loom — Durable Object Framework

**Import:** `@autumnsgrove/lattice/loom`

Loom is Grove's base framework for Cloudflare Durable Objects. Every Grove DO extends `LoomDO`. The framework handles routing, storage, WebSockets, alarms, logging, and concurrency — so individual DOs focus on their domain logic.

Actual DO classes live in `services/durable-objects/` (deployed as a separate Cloudflare Worker). Lattice provides the base class, types, and factory helpers.

#### Base Class

```typescript
import { LoomDO } from "@autumnsgrove/lattice/loom";

export class MyDO extends LoomDO {
	async handleRequest(ctx: LoomRequestContext): Promise<Response> {
		return LoomResponse.json({ ok: true });
	}
}
```

#### Storage Utilities

```typescript
import { SqlHelper, JsonStore, safeJsonParse } from "@autumnsgrove/lattice/loom";

// SqlHelper wraps DO's SQL storage with typed helpers
// JsonStore provides key/value JSON storage over DO storage
const store = new JsonStore(this.ctx.storage);
await store.set("config", { theme: "autumn" });
const config = await store.get<Config>("config");
```

#### Alarm Scheduler

```typescript
import { AlarmScheduler } from "@autumnsgrove/lattice/loom";

// Schedule recurring work inside a DO (survives hibernation)
const scheduler = new AlarmScheduler(this.ctx.storage);
await scheduler.schedule("daily-summary", Date.now() + 86400_000);
```

#### WebSocket Manager

```typescript
import { WebSocketManager } from "@autumnsgrove/lattice/loom";

// Manages WebSocket connections inside a DO — useful for realtime presence
const ws = new WebSocketManager(this.ctx);
ws.broadcast({ type: "update", data });
```

#### Factory Helpers

```typescript
import { getLoomStub, loomFetchJson } from "@autumnsgrove/lattice/loom";

// Get a DO stub by name (for requests from SvelteKit/Worker)
const stub = getLoomStub(env.MY_DO, "tenant:123");

// Typed fetch helper
const result = await loomFetchJson<{ ok: boolean }>(stub, "/status");
```

#### Adapters

```typescript
// From SvelteKit load/action functions
import { getLoomStubFromRequest } from "@autumnsgrove/lattice/loom/sveltekit";

// From raw Worker fetch handlers
import { routeLoomRequest } from "@autumnsgrove/lattice/loom/worker";

// In tests
import { createMockLoomDO } from "@autumnsgrove/lattice/loom/testing";
```

#### Grove DOs

| DO              | Purpose                                              | Location                    |
| --------------- | ---------------------------------------------------- | --------------------------- |
| `TenantDO`      | Per-tenant config, drafts, analytics events          | `services/durable-objects/` |
| `PostMetaDO`    | Per-post reactions, view counts, presence (hot data) | `services/durable-objects/` |
| `PostContentDO` | Per-post content caching (warm data, hibernates)     | `services/durable-objects/` |
| `SentinelDO`    | Long-running load tests (> 30s Worker CPU limit)     | `libs/engine/sentinel/`     |

---

### Lumen — AI Gateway

**Import:** `@autumnsgrove/lattice/ai/lumen`

Lumen is Grove's unified AI inference layer. All AI features — Wisp (writing assistant), Thorn (content moderation), the Timeline curio, and anything else that touches a model — run through Lumen. It handles provider routing, fallback, tier-based quotas, PII scrubbing, usage tracking, and streaming.

#### Providers

- **OpenRouter** — primary for generation, summary, chat, code
- **Cloudflare Workers AI** — fallback + embeddings + transcription + moderation

Lumen automatically falls back to Cloudflare AI when OpenRouter fails.

#### Quick Start

```typescript
import { createLumenClient } from "@autumnsgrove/lattice/ai/lumen";

const lumen = createLumenClient({
	openrouterApiKey: env.OPENROUTER_API_KEY,
	ai: env.AI, // Cloudflare AI binding
	db: env.DB, // D1 for quota tracking
});

// Text generation
const response = await lumen.run(
	{
		task: "generation",
		input: "Write a haiku about fog",
		tenant: tenantId,
	},
	"seedling",
);

// Streaming
for await (const chunk of lumen.stream(
	{
		task: "chat",
		input: messages,
		tenant: tenantId,
	},
	"seedling",
)) {
	process.stdout.write(chunk.content);
}

// Embeddings
const { embedding } = await lumen.embed({ input: text, tenant: tenantId }, "seedling");

// Moderation (used by Thorn)
const { flagged, categories } = await lumen.moderate(
	{ content: text, tenant: tenantId },
	"seedling",
);
```

#### Task Types

```typescript
type LumenTask =
	| "generation" // Open-ended text generation
	| "summary" // Summarization
	| "chat" // Multi-turn conversation
	| "image" // Image generation (Shutter)
	| "code" // Code generation/analysis
	| "moderation" // Content safety (used by Thorn)
	| "embedding"; // Text embeddings
```

#### Quota Management

```typescript
import { getTierQuota, wouldExceedQuota, LUMEN_QUOTAS } from "@autumnsgrove/lattice/ai/lumen";

const quota = getTierQuota("seedling", "generation");
const wouldExceed = wouldExceedQuota(currentUsage, estimatedTokens, quota);
```

#### Songbird (Streaming Chat)

```typescript
import { runSongbird } from "@autumnsgrove/lattice/ai/lumen";

// Specialized streaming for Wisp writing assistant
const result = await runSongbird(lumen, options, context);
```

#### Shutter (Image Analysis)

```typescript
import { runShutter, injectShutterContext } from "@autumnsgrove/lattice/ai/lumen";

// Image description and analysis
const description = await runShutter(lumen, { imageUrl, task: "describe" });
```

#### MCP Tool Support

```typescript
import { McpServerRegistry, runMcpTools } from "@autumnsgrove/lattice/ai/lumen";

// Model Context Protocol integration
const registry = new McpServerRegistry();
registry.add({ name: "grove-tools", transport: "http", url: toolsUrl });
const result = await runMcpTools(lumen, registry, request);
```

#### Pipeline

Every request runs through:

1. **Preprocessing** — PII scrubbing, content validation, prompt injection prevention
2. **Routing** — task → model → provider selection
3. **Execution** — with automatic fallback
4. **Postprocessing** — response normalization, usage logging, cost tracking

---

### Thorn — Content Moderation

**Import:** `@autumnsgrove/lattice/thorn`

Thorn wraps Lumen's moderation task with config-driven thresholds and graduated enforcement. It keeps Grove communities safe without requiring per-app moderation logic.

**Status:** Live in production — wired into the post publish and edit flows.

#### Core API

```typescript
import { moderateContent } from "@autumnsgrove/lattice/thorn";

const result = await moderateContent(userContent, {
	lumen,
	tenant: tenantId,
	contentType: "post", // 'post' | 'comment' | 'profile_update'
});

if (!result.allowed) {
	// result.action: 'review' | 'flag' | 'block'
	// result.categories: string[] — what triggered moderation
}
```

#### Enforcement Levels

| Action   | Meaning                                         |
| -------- | ----------------------------------------------- |
| `allow`  | Content passes — no action                      |
| `review` | Borderline — queued for human review            |
| `flag`   | Likely violation — soft-blocked, admin notified |
| `block`  | Clear violation — hard-blocked, not published   |

Thresholds are content-type-specific. A post and a comment have different sensitivity levels.

#### Publish Hook

```typescript
import { moderatePublishedContent } from "@autumnsgrove/lattice/thorn";

// In your publish handler — non-blocking via waitUntil
ctx.waitUntil(moderatePublishedContent({ postId, content, lumen, db, tenant }));
```

#### Audit Trail

```typescript
import {
	logModerationEvent,
	flagContent,
	getRecentEvents,
	getFlaggedContent,
	updateFlagStatus,
	getStats,
} from "@autumnsgrove/lattice/thorn";

// Get flagged content for admin review
const flagged = await getFlaggedContent(db, { status: "pending" });

// Update flag status after review
await updateFlagStatus(db, flagId, "cleared");

// Dashboard stats
const stats = await getStats(db, tenantId);
```

---

### Feature Flags

**Import:** `@autumnsgrove/lattice/platform/feature-flags`

A Cloudflare-native feature flag engine. Flags are stored in D1 and cached in KV. They support boolean on/off, percentage rollouts, tier-gating, user-specific rules, time-based windows, and A/B variants.

#### Core API

```typescript
import {
	isFeatureEnabled,
	getFeatureValue,
	getVariant,
	getFlags,
} from "@autumnsgrove/lattice/platform/feature-flags";

// Boolean check
const enabled = await isFeatureEnabled("jxl_encoding", { tenantId }, env);

// Typed value with default
const maxUploads = await getFeatureValue("max_uploads", { tier }, env, 10);

// A/B variant
const variant = await getVariant("pricing_experiment", { sessionId }, env);
// Returns 'control', 'treatment_a', etc.

// Batch evaluation (more efficient for page loads)
const flags = await getFlags(["meadow_access", "new_nav"], { tenantId, tier }, env);
```

#### Evaluation Context

```typescript
interface EvaluationContext {
	tenantId?: string;
	userId?: string;
	tier?: string;
	sessionId?: string;
	email?: string;
}
```

#### Rule Types

| Rule         | Description                                           |
| ------------ | ----------------------------------------------------- |
| `boolean`    | Simple on/off                                         |
| `percentage` | Deterministic rollout by user/session bucket          |
| `tier`       | Gate by subscription tier (e.g., "sapling and above") |
| `user`       | Specific user IDs or emails                           |
| `time`       | Active between two timestamps                         |
| `greenhouse` | Beta tenant enrollment group                          |

#### Greenhouse (Beta Groups)

```typescript
import {
	isInGreenhouse,
	enrollInGreenhouse,
	getGreenhouseTenants,
	toggleGreenhouseStatus,
} from "@autumnsgrove/lattice/platform/feature-flags";

// Enroll a tenant in beta testing
await enrollInGreenhouse(db, tenantId, kv, { notes: "Early access partner" });
const inBeta = await isInGreenhouse(db, tenantId, kv);
```

#### Grafts API

Grafts are Grove's name for named feature flags — the horticulture metaphor for capabilities grafted onto a tenant's tree. In code, these are "flags" (`KnownFlagId`). They're loaded once per request and cascaded down.

```typescript
import {
	getEnabledFlags,
	isFlagEnabled,
	type KnownFlagId,
} from "@autumnsgrove/lattice/platform/feature-flags";

// Load all flags for a request (in +layout.server.ts)
const flags = await getEnabledFlags(env, context);

// Check a specific flag
const canAccessMeadow = isFlagEnabled(flags, "meadow_access");
```

In Svelte: `const flag = $derived(flags?.flag_id ?? false)`

#### Upload Suspension

```typescript
import {
	getUploadSuspensionStatus,
	setUploadSuspension,
} from "@autumnsgrove/lattice/platform/feature-flags";

// Suspend uploads for a tenant (admin action)
await setUploadSuspension(db, tenantId, { suspended: true, reason: "abuse" });
```

#### Tenant Self-Serve Controls

```typescript
import {
	getTenantControllableFlags,
	setTenantFlagOverride,
} from "@autumnsgrove/lattice/platform/feature-flags";

// Let tenants toggle their own optional features
const controllable = await getTenantControllableFlags(db, tenantId, env);
await setTenantFlagOverride(db, tenantId, "dark_mode_default", true);
```

#### Admin (Cultivate Mode)

```typescript
import { getFeatureFlags, setFlagEnabled } from "@autumnsgrove/lattice/platform/feature-flags";

const flags = await getFeatureFlags(db);
await setFlagEnabled(db, kv, "jxl_encoding", true);
```

---

### Platform UI Components

Feature flags control availability; these platform UI components handle rendering. They live under domain-specific paths reflecting The Big Refactor's reorganization.

#### Named Platform Modules

| Path                       | What It Is                                       |
| -------------------------- | ------------------------------------------------ |
| `./platform/pricing`       | Pricing page component                           |
| `./auth/login`             | Login UI (sign-in form, OAuth buttons)           |
| `./auth/login/server`      | Server-side login utilities (session, redirect)  |
| `./platform/greenhouse`    | Greenhouse beta signup/status UI                 |
| `./platform/uploads`       | Upload gate and suspension messaging             |
| `./platform/upgrades`      | Upgrade flow (tier selection, checkout redirect) |

---

### Zephyr — Publishing Gateway

**Import:** `@autumnsgrove/lattice/zephyr`

Zephyr is the client for Grove's publishing service. It handles two things: sending transactional emails (via the Zephyr worker), and broadcasting posts to social platforms.

```typescript
import { createZephyrClient } from "@autumnsgrove/lattice/zephyr";

const zephyr = createZephyrClient({ apiKey: env.ZEPHYR_API_KEY });

// Send a transactional email
await zephyr.send({
	to: user.email,
	type: "welcome",
	data: { name: user.name },
});

// Broadcast a post to connected social accounts
const result = await zephyr.broadcast({
	postId: post.id,
	content: post.content,
	platforms: ["mastodon", "bluesky"],
});

// result.success = true only if ALL platforms succeeded
// result.partial = true if some-but-not-all succeeded
// Check result.deliveries[] for per-platform status
```

#### Partial Failure Pattern

When broadcasting to multiple platforms, Zephyr uses `success: false, partial: true` when some — but not all — targets succeed. `success: true` only when every target delivers. Callers must inspect `deliveries` individually. This prevents silent partial failures from being treated as full success.

If a platform is structurally incompatible with the content (e.g., long-form only content sent to a short-form platform), it returns `skipped: true` with a reason rather than an error.

---

## User-Facing Features

---

### Curios

**Import:** `@autumnsgrove/lattice/curios` (plus individual paths for some)

Curios are the delightful, weird, personality-giving widgets that make a Grove site feel alive. They range from guestbooks and hit counters to AI-powered GitHub activity summaries. Every curio has its own type definitions, server logic, and test coverage in `libs/engine/src/lib/curios/`.

Curio UI components live separately in `@autumnsgrove/lattice/ui/content/curios`.

#### Architecture

```
libs/engine/src/lib/
├── curios/
│   ├── timeline/       ← logic, AI integration, voice presets
│   ├── journey/        ← logic, GitHub repo analysis
│   ├── gallery/        ← logic
│   ├── guestbook/      ← types, validation
│   ├── hitcounter/     ← types, display styles
│   ├── moodring/       ← types, mood palettes
│   ├── nowplaying/     ← types, media integration
│   └── ...22 total
├── ui/components/content/curios/  ← Svelte display components
└── curios/sanitize.ts             ← shared content sanitization
```

#### Developer Curios

These have full implementations including Svelte components exported from `./curios`:

**Timeline** (`./curios/timeline`)

AI-powered daily summaries of GitHub activity. The most complex curio.

```typescript
import {
	getOpenRouterModels,
	validateOpenRouterKey,
	buildVoicedPrompt,
	getAllVoices,
	getVoice,
	parseAIResponse,
	DEFAULT_TIMELINE_CONFIG,
} from "@autumnsgrove/lattice/curios/timeline";

// Voice presets for generating summaries
import {
	professional,
	quest,
	casual,
	poetic,
	minimal,
} from "@autumnsgrove/lattice/curios/timeline";

// Build a voiced prompt for the AI
const prompt = buildVoicedPrompt(activity, getVoice("poetic"));
```

**Journey**

Repo growth visualization — language breakdowns and milestone snapshots over time.

**Gallery** (`./curios/gallery`)

Photo gallery curio with metadata and categorization.

#### Visitor Curios

Type definitions and server logic. UI components in `./ui/content/curios`.

| Curio               | What It Does                                                            |
| ------------------- | ----------------------------------------------------------------------- |
| **Activity Status** | Shows online/away/offline status                                        |
| **Ambient**         | Ambient audio and atmosphere sounds                                     |
| **Artifacts**       | Digital artifact/collectible displays                                   |
| **Badges**          | Achievement and collection badge grids                                  |
| **Blogroll**        | Curated list of recommended blogs                                       |
| **Bookmark Shelf**  | Link collections grouped by topic                                       |
| **Clipart**         | Custom clipart and illustration displays                                |
| **Cursors**         | Custom cursor themes                                                    |
| **Custom Uploads**  | User-uploadable content (images, files)                                 |
| **Guestbook**       | Visitor message board                                                   |
| **Hit Counter**     | Retro page view counter (4 display styles)                              |
| **Link Garden**     | Curated link collections with descriptions                              |
| **Mood Ring**       | Current mood/feeling indicator (glass effects, multiple display shapes) |
| **Now Playing**     | Music and media currently playing                                       |
| **Polls**           | Community polls with live results                                       |
| **Shrines**         | Fan/tribute shrine pages                                                |
| **Status Badge**    | Online/availability status badge                                        |
| **Webring**         | Web ring membership and navigation                                      |

#### Shared Sanitization

All curio content runs through `curios/sanitize.ts` before storage or display to prevent XSS.

---

### UI System

**Import:** `@autumnsgrove/lattice/ui`

GroveUI is a calm, organic design system. "A place to Be." It's built on Svelte 5, Tailwind CSS, and bits-ui, with a nature-themed glassmorphism aesthetic.

#### Component Categories

| Import Path           | Components                                                                                        |
| --------------------- | ------------------------------------------------------------------------------------------------- |
| `./ui`                | All components (full re-export)                                                                   |
| `./ui/chrome`         | Header, HeaderMinimal, Footer, FooterMinimal, MobileMenu, AdminHeader, AccountStatus, ThemeToggle |
| `./ui/arbor`          | Admin panel UI components                                                                         |
| `./ui/gallery`        | ImageGallery, Lightbox, LightboxCaption, ZoomableImage                                            |
| `./ui/charts`         | Chart components                                                                                  |
| `./ui/content`        | EmbedWidget, FaqPage, LinkPreview, PlanCard, ProductCard, RoadmapPreview, SearchCard              |
| `./ui/content/hum`    | Hum variant content components                                                                    |
| `./ui/content/curios` | Curio display components (Svelte)                                                                 |
| `./ui/feedback`       | Toast (svelte-sonner), alerts, loading states                                                     |
| `./ui/forms`          | Form controls and wrappers                                                                        |
| `./ui/indicators`     | Status indicators, progress, badges                                                               |
| `./ui/icons`          | Lucide icon wrapper                                                                               |
| `./ui/states`         | Empty state, error state, loading state components                                                |
| `./ui/typography`     | Font wrapper components (serif, sans)                                                             |
| `./ui/nature`         | Seasonal nature components                                                                        |
| `./ui/tokens`         | Design tokens                                                                                     |
| `./ui/editor`         | Tiptap-based rich text editor                                                                     |

#### Core UI Components (`./ui` → `components/ui/`)

- **Primitives**: Accordion, Badge, BetaBadge, Button, Card, CollapsibleSection, Dialog, Input
- **Glass system**: Glass, GlassButton, GlassCard, GlassCarousel, GlassComparisonTable, GlassConfirmDialog, GlassLegend, GlassLogo, GlassNavbar, GlassOverlay, GlassStatusWidget
- **Brand**: Logo, GlassLogoArchive, FeatureStar
- **Grove-specific**: GroveTerm (glossary linking), grove-messages

#### Nature Components (`./ui/nature`)

Animated, seasonal decorative elements. Every component respects `prefers-reduced-motion`.

| Subsystem    | Components                                                                                                     |
| ------------ | -------------------------------------------------------------------------------------------------------------- |
| `botanical`  | Acorn, Berry, DandelionPuff, FallingLeavesLayer, FallingPetalsLayer, Leaf, LeafFalling, PetalFalling, PineCone |
| `sky`        | Cloud, CloudWispy, Moon, Rainbow, Star, StarCluster, StarShooting, Sun                                         |
| `creatures`  | Forest creature elements                                                                                       |
| `ground`     | Ground-level decorative elements                                                                               |
| `structural` | Structural nature elements (branches, bark)                                                                    |
| `trees`      | Tree elements                                                                                                  |
| `water`      | Water and rain elements                                                                                        |
| `weather`    | Weather effects                                                                                                |

Also exported: `GroveDivider`, palette utilities.

#### Glassmorphism System

Two patterns:

- `.glass-grove` CSS class (in `app.css`): `white/70, blur-md` — lightweight, for simple wrappers
- `GlassCard` component: `default` variant is `white/80 dark:cream-100/65`, `frosted` is `white/90 dark:cream-100/80` — full-featured, supports Gossamer

GlassCard adds its own `px-6 py-4` padding. Don't double up when migrating from raw `.glass-grove p-6`.

#### Color System

All CSS palette vars store space-separated RGB channels, not hex:

```css
--grove-600: 22 163 74;
```

The Tailwind preset uses `rgb(var(--name) / <alpha-value>)` so alpha modifiers (`/50`) work. Hex CSS vars break Tailwind alpha silently — no warning, just no alpha.

The grove color scale is **inverted in dark mode**: `grove-50` = deep green, `grove-950` = near-white. Use `cream-*` tokens for dark mode glass/neutral surfaces.

#### Tailwind Preset

```typescript
// tailwind.config.ts in consumer packages
import preset from "@autumnsgrove/lattice/ui/tailwind";

export default {
	presets: [preset],
	// ...
};
```

#### Stores

```typescript
import { themeStore, prefersDark } from "@autumnsgrove/lattice/ui/stores";
```

---

### Email Infrastructure

**Import:** `@autumnsgrove/lattice/email` (and subpaths)

Grove's email system is built on React Email + Resend. There's a full design system for branded templates, a sequence system for onboarding, and a development server for template preview.

#### Components

```tsx
import { GroveEmail, GroveButton, GroveHeading } from "@autumnsgrove/lattice/email/components";
import { render } from "@autumnsgrove/lattice/email/render";

const html = await render(
	<GroveEmail subject="Welcome">
		<GroveHeading>Your grove is ready.</GroveHeading>
		<GroveButton href="https://grove.place">Open your grove</GroveButton>
	</GroveEmail>,
);
```

#### Email Modules

| Path                 | What's Inside                                                        |
| -------------------- | -------------------------------------------------------------------- |
| `./email/components` | Grove-branded React Email components (GroveEmail, GroveButton, etc.) |
| `./email/sequences`  | Onboarding flow (Day 0, Day 1, Day 7, ...)                           |
| `./email/updates`    | Patch notes and platform announcements                               |
| `./email/porch`      | Subscription lifecycle (renewals, lapse notices)                     |
| `./email/render`     | `render()` — React Email → HTML string                               |
| `./email/schedule`   | `scheduleEmail()` — Resend scheduling                                |
| `./email/urls`       | Consistent link construction for email content                       |
| `./email/types`      | `EmailType` and related types                                        |

#### Development

```bash
# Preview templates in browser
pnpm email:dev  # runs on port 3001

# Export static HTML
pnpm email:export
```

---

### Utilities

**Import:** `@autumnsgrove/lattice/utils`

#### API Requests (Critical)

All client-side API calls must go through `apiRequest()`. It injects CSRF tokens and `credentials: 'include'` automatically.

```typescript
import { apiRequest } from "@autumnsgrove/lattice/utils";

// Instead of bare fetch('/api/posts', { method: 'POST', ... })
const result = await apiRequest("/api/posts", {
	method: "POST",
	body: JSON.stringify({ title, content }),
});
```

Bare `fetch()` in client files is caught by the pre-commit hook. Suppress with `// csrf-ok` for intentional exceptions.

#### Markdown

```typescript
import { renderMarkdown, parseMarkdown } from "@autumnsgrove/lattice/utils";
// Full remark/rehype pipeline with GroveTerm linking, mentions, custom directives
```

#### Image Processing

```typescript
import { encodeAsJxl, convertToWebP, processHeic } from "@autumnsgrove/lattice/utils";
// JXL encoding via @jsquash/jxl, WebP conversion, HEIC support
```

#### Other Utilities

| Module              | What It Does                                       |
| ------------------- | -------------------------------------------------- |
| `cn`                | Tailwind className merging (clsx + tailwind-merge) |
| `csrf`              | `getCSRFToken()`, `validateCSRF()`                 |
| `debounce`          | Debounce factory                                   |
| `shuffle`           | `seededShuffle` — deterministic shuffle by seed    |
| `gallery`           | Image filename parsing, metadata, search/filter    |
| `gutter`            | Anchor parsing, gutter item grouping               |
| `json`              | Safe JSON parse/stringify                          |
| `readability`       | Reading time, word count                           |
| `sanitize`          | DOMPurify HTML sanitization                        |
| `user`              | Display name, avatar URL helpers                   |
| `validation`        | Slug, URL, email validation                        |
| `webauthn`          | WebAuthn credential handling                       |
| `webhook-sanitizer` | Webhook payload sanitization                       |
| `grove-url`         | URL construction for Grove resources               |
| `markdown-mentions` | `@username` mention plugin                         |
| `rehype-groveterm`  | Rehype plugin for Grove term linking               |
| `upload-validation` | `getActionableUploadError()`                       |

---

### Wisp — Writing Assistant

**Export:** from main `@autumnsgrove/lattice` default

Wisp is Grove's AI-powered writing assistant. It appears as a slide-in panel with context-aware suggestions, voice transcription, and generation tools. Powered by Lumen (generation, streaming) and Scribe (audio recording).

```typescript
import { WispPanel, WispButton } from "@autumnsgrove/lattice";

// WispButton — floating trigger button
// WispPanel — the full assistant panel
```

Wisp uses:

- **Lumen** (`runSongbird`) for streaming text generation
- **Scribe** (`ScribeRecorder`) for voice dictation
- **Lumen** (`lumen.moderate`) via Thorn for output safety

---

## Platform Configuration

**Import:** `@autumnsgrove/lattice/platform/config`

Grove's subscription model lives in a single source of truth: `config/tiers.ts`. Pricing pages, rate limiters, upload gates, and feature checks all read from the same `TIERS` object. If the limits change, they change everywhere at once.

### Tier Reference

| Tier          | Price  | Posts     | Storage | Status      |
| ------------- | ------ | --------- | ------- | ----------- |
| **Wanderer**  | Free   | 25        | 100 MB  | Available   |
| **Seedling**  | $8/mo  | 100       | 1 GB    | Available   |
| **Sapling**   | $12/mo | Unlimited | 5 GB    | Coming soon |
| **Oak**       | $25/mo | Unlimited | 20 GB   | Future      |
| **Evergreen** | $35/mo | Unlimited | 100 GB  | Future      |

#### Features by Tier

| Feature              | Wanderer | Seedling | Sapling | Oak | Evergreen |
| -------------------- | -------- | -------- | ------- | --- | --------- |
| Blog                 | ✓        | ✓        | ✓       | ✓   | ✓         |
| Meadow               | ✓        | ✓        | ✓       | ✓   | ✓         |
| AI writing (Wisp)    | —        | ✓        | ✓       | ✓   | ✓         |
| Email forwarding     | —        | —        | ✓       | ✓   | ✓         |
| Full email inbox     | —        | —        | —       | ✓   | ✓         |
| Custom domain (BYOD) | —        | —        | —       | ✓   | ✓         |
| Domain included      | —        | —        | —       | —   | ✓         |
| Centennial           | —        | —        | ✓       | ✓   | ✓         |
| Shop                 | —        | —        | ✓       | ✓   | ✓         |

### Config API

```typescript
import { TIERS, tierHasFeature } from "@autumnsgrove/lattice/platform/config";

// Check if a feature is available for a tenant's tier
const hasAI = tierHasFeature("seedling", "ai"); // true

// Get full tier config
const config = TIERS.seedling;
const limit = config.limits.posts; // 100
const price = config.pricing.monthlyPrice; // 8
const aiQuota = config.limits.aiWordsPerMonth; // 750
```

### Grove Mode Naming

Each tier has two names. The active one depends on whether Grove Mode is on.

| Standard Name | Grove Name |
| ------------- | ---------- |
| Free          | Wanderer   |
| Starter       | Seedling   |
| Growth        | Sapling    |
| Professional  | Oak        |
| Premier       | Evergreen  |

Use `GroveTerm` or `[[term]]` syntax when displaying tier names in UI or help text.

---

## Server Utilities

**Import:** `@autumnsgrove/lattice/server`

Server-side helpers for Grove workers. Not safe to import in browser bundles.

### Logger

```typescript
import { createLogger } from "@autumnsgrove/lattice/server";

const log = createLogger("my-worker");
log.info("Processing request", { tenantId });
log.error("Something broke", { error: e.message });
```

### Canopy Directory

```typescript
import { fetchCanopyDirectory } from "@autumnsgrove/lattice/server";

// Fetches the public grove.place wanderer directory
const { wanderers, categories } = await fetchCanopyDirectory(kv);
```

### Upload Gate

```typescript
import { canUploadImages } from "@autumnsgrove/lattice/server";

const result = await canUploadImages({ tenant, db });
// result.allowed — whether the tenant can upload right now
// result.reason — why it was blocked, if applicable
```

### Rate Limiting (Legacy)

Pre-Threshold helpers. New code should use Threshold instead.

```typescript
import { checkRateLimit, TIER_RATE_LIMITS } from "@autumnsgrove/lattice/server";
```

---

## Implementation Status

A snapshot of where each subsystem stands.

| Module               | Status        | Notes                                             |
| -------------------- | ------------- | ------------------------------------------------- |
| **Heartwood**        | Live          | PKCE OAuth client, auth errors, quota checks      |
| **Threshold**        | Live          | KV/D1/DO backends, SvelteKit/Hono/Worker adapters |
| **Loom**             | Live          | Base DO class; DOs live in `durable-objects/`     |
| **Lumen**            | Live          | OpenRouter primary, Workers AI fallback           |
| **Thorn**            | Live          | Wired into publish and edit hooks via waitUntil   |
| **Feature Flags**    | Live          | 6 rule types, Greenhouse management               |
| **Grafts (Platform UI)** | Live      | Named grafts (feature flags), `KnownFlagId` union |
| **Zephyr**           | In progress   | Email sending live; social broadcast building     |
| **Curios (dev)**     | Live          | Timeline, Journey, Gallery                        |
| **Curios (visitor)** | In progress   | Types/logic ready; UI components in progress      |
| **UI System**        | Live          | Full component library, 7 categories              |
| **Email**            | Live          | React Email, sequences, render pipeline, Resend   |
| **Wisp**             | Live (beta)   | Streaming generation, voice transcription         |
| **Scribe**           | Live          | Used by Wisp; cross-browser audio recording       |
| **Config / Tiers**   | Live          | 5-tier system, Grove Mode naming                  |
| **Server utilities** | Live          | Logger, canopy directory, upload gate             |
| **Sentinel**         | Internal only | Load testing — not for consumer use               |

---

_The grove grows. These paths are living documentation — expect new exports, new adapters, and new capabilities as the platform matures._
