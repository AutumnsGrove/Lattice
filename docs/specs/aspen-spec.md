---
title: "Aspen — The Living Grove"
description: "Specification for apps/aspen, the Cloudflare Worker that serves the tenant experience at subdomain.grove.place."
category: specs
specCategory: core-infrastructure
icon: tree-deciduous
lastUpdated: "2026-03-14"
aliases: []
date created: Saturday, March 14th 2026
date modified: Saturday, March 14th 2026
tags:
  - core
  - architecture
  - aspen
  - cloudflare
  - worker
  - deployment
type: tech-spec
---

```
              🌿                           🌿
             ╱│╲                          ╱│╲
            ╱ │ ╲                        ╱ │ ╲
           ╱  │  ╲                      ╱  │  ╲
          ╱   │   ╲                    ╱   │   ╲
              │                            │
              │                            │
         ─────┼────────────────────────────┼─────
        ╱ ╱ ╱ │ ╲ ╲ ╲ ╱ ╱ ╱ ╱ ╲ ╲ ╲ ╱ ╱ │ ╲ ╲
       ╱ ╱   ─┼─   ╲ ╱ ╱ shared ╲ ╲ ╱   ─┼─   ╲
              │        roots beneath       │
              │          the soil           │

       One grove. Many trunks. Shared roots.
```

> *The aspen doesn't grow alone. It sends out roots, finds light through shared ground, and becomes a forest that is one living thing.*

# Aspen: The Tenant Deployment

Aspen is the Cloudflare Worker that serves the daily tenant experience. When a wanderer visits `autumn.grove.place`, this is what answers. The admin panel, the garden, the curios, the API endpoints. Everything a tenant interacts with runs through this Worker.

**Worker Name:** `grove-aspen`
**Location:** `apps/aspen/`
**Framework:** SvelteKit with `@sveltejs/adapter-cloudflare` (Worker mode)
**Imports from:** `@autumnsgrove/lattice` (the engine library)
**Last Updated:** March 2026

Before the Lattice Split, all of this lived inside `libs/engine/`. Routes, hooks, app shell, deployment config, mixed into a library package. The split let the app be an app. The library stays in `libs/engine/`. The deployment lives here. Same code, better address.

---

## Overview

### What This Is

A SvelteKit application deployed as a Cloudflare Worker. It handles:

- Tenant site rendering (public pages, garden posts, curio displays)
- Admin panel (arbor: settings, analytics, post editor, curio config)
- API endpoints (31 groups, 144 route files)
- Authentication flows (login, callback, logout, magic link)
- Subdomain routing (extract tenant from `X-Forwarded-Host`)
- Security middleware (CSRF, rate limiting, CSP, session validation)

### Goals

- The engine library has no routes. `libs/engine/` is a package you import from, not a thing you deploy.
- Tenant infrastructure runs as a Worker, with direct binding access and `wrangler dev` for local development.
- Same runtime behavior as the previous Pages deployment. No rewrites, no regressions.

### Non-Goals

- Consolidating other apps (landing, plant, meadow) into Aspen. Each keeps its subdomain.
- Changing any API contracts or auth flows. The move preserved behavior exactly.
- Optimizing route handlers during the move. That's separate work.

---

## Architecture

### Where Aspen Fits

```
                    wanderer visits autumn.grove.place
                                   │
                                   ▼
                           grove-router
                        (Cloudflare Worker)
                                   │
                     X-Forwarded-Host: autumn.grove.place
                                   │
              ┌────────────────────┼────────────────────┐
              │                    ▼                    │
              │              grove-aspen               │
              │          (Cloudflare Worker)            │
              │                    │                    │
              │         ┌─────────┼─────────┐          │
              │         ▼         ▼         ▼          │
              │     D1 (DB)   R2 (media)  DOs         │
              │     KV        Services    AI          │
              └────────────────────────────────────────┘
```

Other apps in the monorepo handle their own subdomains:

| App | Subdomain | Purpose |
|-----|-----------|---------|
| **aspen** | `*.grove.place` (default) | Tenant experience |
| landing | `grove.place` (root) | Marketing |
| plant | `plant.grove.place` | Onboarding |
| meadow | `meadow.grove.place` | Community feed |
| login | `login.grove.place` | Auth hub |
| billing | `billing.grove.place` | Payment management |
| domains | `domains.grove.place` | Domain configuration |
| clearing | `status.grove.place` | Status page |
| terrarium | `terrarium.grove.place` | Visual composer |

Aspen is the **default fallback**. If the subdomain isn't reserved, the router sends it to Aspen.

### Request Flow

```
Request arrives at grove-aspen Worker
    │
    ▼
hooks.server.ts (837 lines)
    │
    ├── Extract subdomain from X-Forwarded-Host
    │   ("autumn.grove.place" → "autumn")
    │   RFC 1035 validation rejects malformed subdomains
    │
    ├── Look up tenant (parallel with session check)
    │   TenantDO (cached) → D1 fallback
    │   Set event.locals.tenantId, event.locals.context
    │
    ├── Validate session (parallel with tenant lookup)
    │   SessionDO → Heartwood OAuth → JWT fallback
    │   Set event.locals.user (or null for anonymous)
    │
    ├── Turnstile verification
    │   Cloudflare bot protection on auth-sensitive routes
    │
    ├── Internal service auth
    │   Timing-safe HMAC for worker-to-worker calls
    │
    ├── Body size validation
    │   1MB limit for JSON/urlencoded (multipart excluded)
    │
    ├── API rate limiting
    │   Threshold SDK: 30 writes/min, 120 reads/min
    │   Per-user (authenticated) or per-IP (anonymous)
    │
    ├── CSRF protection
    │   Session-bound HMAC tokens (authenticated)
    │   Random UUID tokens (guests)
    │   No Domain attribute on cookie (prevents cross-tenant sharing)
    │
    ├── Security headers
    │   CSP with per-request nonce, HSTS with preload
    │   X-Frame-Options DENY, nosniff, strict referrer
    │   AI opt-out headers (X-Robots-Tag: noai, noimageai)
    │
    ▼
Route handler (page or API endpoint)
    │
    ▼
Response with security headers
```

### Why a Worker (Not Pages)

| Concern | Pages | Worker |
|---------|-------|--------|
| Durable Object bindings | Through Pages Functions layer | Direct, first-class |
| Local dev | `wrangler pages dev` (abstractions) | `wrangler dev` (direct) |
| Deployment | Build + Pages pipeline | `wrangler deploy` |
| Routing control | Pages routing rules | Full Worker routing |
| Secrets | `--pages <project>` (easy to misconfigure) | `--worker <name>` (direct) |
| Smart Placement | Not available | Runs closer to backend services |
| Observability | Limited | Structured logs in dashboard |

---

## Route Inventory

291 route files across the full tenant experience.

### API Routes (144 files, 31 groups)

| Group | Purpose |
|-------|---------|
| `admin/` | Admin-only operations |
| `auth/` | Session management |
| `blazes/` | Content markers |
| `blooms/` | Blog post CRUD |
| `chat/` | Messaging (Chirp DMs) |
| `check-domain/` | Domain availability |
| `curios/` | Curio management (20+ widget types) |
| `drafts/` | Draft posts |
| `export/` | GDPR data export |
| `feed/` | RSS/Atom feeds |
| `friends/` | Friend system (Lantern) |
| `git/` | GitHub integration |
| `grafts/` | Feature flags UI |
| `grove/` | Grove metadata |
| `health/` | Health checks |
| `hum/` | Content cards |
| `images/` | Image upload/processing (8-layer validation + Petal) |
| `lumen/` | AI gateway |
| `oembed/` | oEmbed provider |
| `pages/` | Static pages CRUD |
| `passkey/` | WebAuthn |
| `posts/` | Post operations |
| `reeds/` | Comments |
| `reverie/` | AI config pipeline |
| `sentinel/` | Stress testing |
| `settings/` | Tenant settings |
| `stats/` | Analytics |
| `tenants/` | Tenant operations |
| `trace/` | Observability |
| `username/` | Username management |
| `verify/` | Email verification |

### Page Routes

| Group | Files | Purpose |
|-------|:-----:|---------|
| `arbor/` | 99 | Admin panel (settings, garden, curios, analytics, account) |
| `garden/` | ~8 | Blog content, search, post pages |
| `auth/` | ~6 | Login, callback, logout, magic link |
| `(tenant)/` | varies | Auth-gated tenant layout |
| `(site)/` | varies | Public curio pages (gallery, guestbook, timeline, pulse) |
| `(apps)/` | varies | Domains monitor |
| Root | ~5 | Homepage, layout, error page |

### App-Level Files

| File | Lines | What It Does |
|------|:-----:|-------------|
| `hooks.server.ts` | 837 | Subdomain extraction, tenant lookup (TenantDO/D1), session validation (5 auth paths), Turnstile verification, internal service HMAC auth, body size validation, CSRF tokens, rate limiting (Threshold SDK), security headers (CSP with nonce, HSTS), Grove terminology redirects |
| `app.html` | 249 | Grove Entrance loading overlay (pre-hydration HTML+CSS), theme detection script, CSP nonce meta tag, favicons, PWA manifest. Respects `prefers-reduced-motion`. |
| `app.d.ts` | 197 | `App.Error`, `App.Locals`, `App.Platform` interfaces, `AppContext` type, `TenantInfo` interface, full `Platform.env` bindings. Shared with `libs/engine/src/app.d.ts` for library type-checking. |
| `app.css` | ~150 | Global styles, shadcn HSL variables |

---

## Import Pattern

Route files import from the engine as a package, not via `$lib/`:

```typescript
// Aspen routes import from the lattice package
import { API_ERRORS, throwGroveError } from "@autumnsgrove/lattice/errors";
import Button from "@autumnsgrove/lattice/ui/components/ui/Button.svelte";
import { createDb } from "@autumnsgrove/lattice/db";
import { thresholdCheck } from "@autumnsgrove/lattice/threshold/sveltekit";
```

SvelteKit builtins work normally:

```typescript
import { page } from "$app/state";
import { env } from "$env/dynamic/private";
```

Relative imports between route files are unchanged:

```typescript
// +page.svelte importing from sibling server file
import type { PageData } from "./$types";
```

---

## Cloudflare Bindings

All bindings configured in `apps/aspen/wrangler.toml`.

### D1 Databases

| Binding | Database | Purpose |
|---------|----------|---------|
| `DB` | grove-engine-db | Main multi-tenant database (tenants, posts, pages, settings, moderation) |
| `CURIO_DB` | grove-curios-db | Curio-specific data (gallery, timeline, guestbook, polls, badges) |

D1 migrations live in `libs/engine/migrations/`. The `wrangler.toml` references them with a relative path: `migrations_dir = "../../libs/engine/migrations"`.

### R2 Buckets

| Binding | Bucket | Purpose |
|---------|--------|---------|
| `IMAGES` | grove-media | User-uploaded images |
| `EXPORTS_BUCKET` | grove-exports | GDPR/backup zip archives (7-day TTL) |
| `IMAGES_SOURCE` | autumnsgrove-images | Migration source bucket |

### KV Namespaces

| Binding | Purpose |
|---------|---------|
| `CACHE_KV` | Rate limiting counters, response caching |
| `FLAGS_KV` | Feature flag state |

### Durable Objects

All DOs live in the `grove-durable-objects` Worker. Aspen accesses them via service bindings.

| Binding | DO Class | Purpose |
|---------|----------|---------|
| `TENANTS` | TenantDO | Config caching, draft sync, analytics aggregation |
| `POST_META` | PostMetaDO | Reactions, view counts, presence tracking |
| `POST_CONTENT` | PostContentDO | Content caching, version history |
| `SENTINEL` | SentinelDO | Stress test coordination |
| `EXPORTS` | ExportDO | Zip assembly for data exports |
| `THRESHOLD` | ThresholdDO | Per-identifier rate limiting |
| `CHAT` | ChatDO | Direct messages, hibernation-aware WebSocket |

### Service Bindings

| Binding | Worker | Purpose |
|---------|--------|---------|
| `AUTH` | groveauth | Heartwood session validation |
| `ZEPHYR` | grove-zephyr | Email gateway |
| `REVERIE` | grove-reverie | AI configuration pipeline |

### Workers AI

| Binding | Purpose |
|---------|---------|
| `AI` | Petal image content moderation (Llama 4 Scout vision) |

### Static Assets

| Binding | Purpose |
|---------|---------|
| `ASSETS` | SvelteKit static asset serving (Worker mode) |

### Environment Variables

Non-sensitive values in `[vars]`:

| Variable | Value | Purpose |
|----------|-------|---------|
| `CACHE_TTL_SECONDS` | `3600` | Default cache duration |
| `ZEPHYR_URL` | `https://grove-zephyr.*.workers.dev` | Email gateway URL |
| `GROVEAUTH_URL` | `https://auth.grove.place` | Heartwood auth URL |
| `CLEARING_API_URL` | `https://status.grove.place` | Status page API |
| `TURNSTILE_SITE_KEY` | `0x4AAA...` | Cloudflare bot protection (public key) |

### Secrets

Managed via `gw secret apply --worker grove-aspen`. Never hardcoded.

| Secret | Purpose |
|--------|---------|
| `SESSION_SECRET` | JWT signing (32+ random chars) |
| `ALLOWED_ADMIN_EMAILS` | Comma-separated admin email list |
| `RESEND_API_KEY` | Resend email service (deprecated, use Zephyr) |
| `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile server key |
| `GROVEAUTH_CLIENT_ID` | OAuth client ID |
| `GROVEAUTH_CLIENT_SECRET` | OAuth client secret |
| `GROVE_KEK` | Key Encryption Key for envelope encryption (64 hex chars) |
| `CSRF_SECRET` | HMAC secret for session-bound CSRF tokens |
| `DEMO_MODE_SECRET` | Arbor panel screenshot mode |
| `INTERNAL_SERVICE_KEY` | Worker-to-worker HMAC auth |
| `REVERIE_API_KEY` | Reverie worker authentication |
| `OPENROUTER_API_KEY` | Lumen AI inference |
| `TOGETHER_API_KEY` | Petal CSAM fallback provider |
| `TOKEN_ENCRYPTION_KEY` | Tenant API token encryption in D1 |

---

## Configuration

### SvelteKit Config (`svelte.config.js`)

```javascript
adapter: adapter({
  routes: {
    include: ["/*"],
    exclude: ["<all>"],
  },
}),
csrf: {
  trustedOrigins: ["*"],  // SvelteKit's built-in CSRF bypassed
},                         // hooks.server.ts handles CSRF with HMAC tokens
```

SvelteKit's `checkOrigin` is bypassed because it can't handle wildcard subdomains behind `grove-router`. The hooks provide three-layer CSRF defense: SameSite cookies, Origin vs X-Forwarded-Host validation, and session-bound HMAC tokens.

### Smart Placement

```toml
[placement]
mode = "smart"
```

Cloudflare runs the Worker closer to backend services (D1, R2, KV, DOs) rather than the user's edge location. For a data-heavy app with 7 DOs and 2 databases, this reduces latency on server-side operations.

### Observability

```toml
[observability]
enabled = true

[observability.logs]
enabled = true
invocation_logs = true
```

Structured logs visible in the Cloudflare dashboard for debugging and monitoring.

---

## Local Development

```bash
# Start dev server (uses wrangler for local D1/KV/R2 bindings)
cd apps/aspen && pnpm dev

# Local tenant routing uses query parameter
http://localhost:5173/?subdomain=midnight-bloom     # Home
http://localhost:5173/garden?subdomain=midnight-bloom  # Blog
http://localhost:5173/arbor?subdomain=midnight-bloom    # Admin

# Seed test data
uv run --project tools/glimpse glimpse seed --yes

# Type-check
cd apps/aspen && bun svelte-check

# Run tests
cd apps/aspen && pnpm test:run

# Deploy
cd apps/aspen && pnpm run deploy
```

---

## Security

### Authentication (5 paths)

1. **SessionDO** (primary): Validates session cookie via Heartwood service binding. Fastest path.
2. **Better Auth session**: Checks `__Secure-better-auth.session_token` cookie.
3. **Legacy JWT**: Fallback for sessions created before the Better Auth migration.
4. **Internal service**: Timing-safe HMAC validation of `X-Internal-Service-Key` header for worker-to-worker calls.
5. **Anonymous**: No session. `event.locals.user` is `null`.

### CSRF (3 layers)

1. **SameSite=Lax** cookie attribute on CSRF token.
2. **Origin validation** against `X-Forwarded-Host` (proxy-aware).
3. **Session-bound HMAC tokens** for authenticated users, random UUIDs for guests.

The CSRF cookie has no `Domain` attribute, which prevents cross-tenant token sharing.

### Rate Limiting

| Scope | Limit | Backend |
|-------|-------|---------|
| API writes (POST/PUT/PATCH/DELETE) | 30/min | Threshold SDK (DO or KV) |
| API reads (GET) | 120/min | Threshold SDK (DO or KV) |
| Image uploads | 50/hr | Threshold SDK |
| Upload rejections | 5/hr before block | Threshold SDK |
| Auth callback | Per-IP, fail-closed | Threshold SDK |
| Request body | 1MB max (JSON/urlencoded) | hooks.server.ts |

### Security Headers

| Header | Value |
|--------|-------|
| `Content-Security-Policy` | Nonce-based `script-src`, `frame-ancestors 'none'` |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` |
| `X-Frame-Options` | `DENY` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | geolocation, microphone, camera disabled |
| `X-Robots-Tag` | `noai, noimageai` (Shade Layer 5) |

---

## Deployment

### First Deploy

```bash
# 1. Build and deploy the Worker
cd apps/aspen && pnpm run deploy

# 2. Deploy all secrets
gw secret apply --worker grove-aspen

# 3. Smoke test directly
curl https://grove-aspen.<account>.workers.dev/api/health
```

### Router Cutover

`services/grove-router/` sends unmatched subdomains to the default target. To switch from the old Pages project to the Aspen Worker:

```typescript
// BEFORE (Pages)
const DEFAULT_TARGET = "grove-lattice.pages.dev";

// AFTER (Worker)
const DEFAULT_TARGET = "grove-aspen.<account>.workers.dev";
```

One line change. The router proxies with `X-Forwarded-Host` either way.

### Blue-Green Strategy

1. Deploy `grove-aspen` Worker with all bindings and secrets
2. Smoke test directly via `grove-aspen.<account>.workers.dev`
3. Update router to send a test subdomain to the Worker
4. Verify auth, CSRF, routing, DOs all function
5. Gradually shift more subdomains to the Worker
6. When stable, update the default fallback
7. Decommission `grove-lattice` Pages project

### Rollback

Change the default target in `grove-router` back to `grove-lattice.pages.dev`. The Pages project stays deployed until the Worker is confirmed stable.

---

## Relationship to Other Specs

| Spec | Relationship |
|------|-------------|
| `lattice-split-spec.md` | Parent spec. Defines the full execution plan (internal cleanup + Aspen creation). |
| `thorn-behavioral-spec.md` | Thorn moderation runs within Aspen's request context. Same behavior. |
| `grove-agent-spec.md` | Grove Agent SDK is a separate Worker. Aspen may receive service bindings from agents in the future. |

---

## Spec History

### v1 (March 14th, 2026)

Written before the split. Described what Aspen would be, its route inventory, bindings, and migration strategy. Served as the blueprint for implementation.

### v2 (March 14th, 2026)

Updated after the Lattice Split shipped (PR #1471). Changed future tense to present tense. Added import pattern documentation, local development commands, full secret inventory, configuration details (Smart Placement, observability, CSRF bypass rationale), security section with auth paths and rate limits, and deployment procedures. Removed the "This app doesn't exist yet" checklist.

---

*One grove. Many trunks. Shared roots beneath the soil.*
