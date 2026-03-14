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

Right now, all of this lives inside `libs/engine/`. Routes, hooks, app shell, deployment config. All stuffed into a library package. Aspen is what happens when you let the app be an app. The library stays in `libs/engine/`. The deployment moves to `apps/aspen/`. Same code, better address.

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
- Same runtime behavior as the current Pages deployment. No rewrites, no regressions.

### Non-Goals

- Rewriting `hooks.server.ts`. Copy it. It works.
- Consolidating other apps (landing, plant, meadow) into Aspen.
- Changing any API contracts or auth flows.
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
hooks.server.ts
    │
    ├── Extract subdomain from X-Forwarded-Host
    │   ("autumn.grove.place" → "autumn")
    │
    ├── Look up tenant
    │   TenantDO (cached) → D1 fallback
    │   Set event.locals.tenantId, event.locals.context
    │
    ├── Validate session
    │   SessionDO → Heartwood OAuth → JWT fallback
    │   Set event.locals.user (or null for anonymous)
    │
    ├── CSRF token
    │   Generate/validate csrf_token cookie
    │
    ├── Rate limiting
    │   ThresholdDO per-identifier checks
    │
    ├── Security headers
    │   CSP with nonce, HSTS, X-Frame-Options
    │
    ▼
Route handler (page or API endpoint)
    │
    ▼
Response with security headers
```

### Why a Worker

The engine currently deploys as a Cloudflare Pages project (`grove-lattice`). Workers are better for this use case:

| Concern | Pages | Worker |
|---------|-------|--------|
| Durable Object bindings | Through Pages Functions layer | Direct, first-class |
| Local dev | `wrangler pages dev` (abstractions) | `wrangler dev` (direct) |
| Deployment | Build + Pages pipeline | `wrangler deploy` |
| Routing control | Pages routing rules | Full Worker routing |
| Cold starts | Similar | Similar |
| Secrets | `--pages <project>` (easy to misconfigure) | `--worker <name>` (direct) |

---

## Route Inventory

291 files move from `libs/engine/src/routes/` to `apps/aspen/src/routes/`.

### API Routes (144 files, 31 groups)

| Group | Purpose |
|-------|---------|
| `admin/` | Admin-only operations |
| `auth/` | Session management |
| `blazes/` | Content markers |
| `blooms/` | Blog post CRUD |
| `chat/` | Messaging |
| `check-domain/` | Domain availability |
| `curios/` | Curio management |
| `drafts/` | Draft posts |
| `export/` | Data export |
| `feed/` | RSS/Atom feeds |
| `friends/` | Friend system |
| `git/` | GitHub integration |
| `grafts/` | Feature flags UI |
| `grove/` | Grove metadata |
| `health/` | Health checks |
| `hum/` | Content cards |
| `images/` | Image upload/processing |
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
| `(site)/` | varies | Public-facing site pages |
| `(apps)/` | varies | Domains monitor |
| Root | ~5 | Homepage, layout, error page |

### App-Level Files

| File | Lines | What It Does |
|------|:-----:|-------------|
| `hooks.server.ts` | 837 | Subdomain extraction, tenant lookup (TenantDO/D1), session validation (5 auth paths), CSRF tokens, rate limiting (ThresholdDO), security headers (CSP with nonce, HSTS), body size validation, Grove terminology redirects |
| `app.html` | 249 | Grove Entrance loading overlay (pre-hydration HTML+CSS), theme detection script, CSP nonce meta tag, favicons, PWA manifest |
| `app.d.ts` | 197 | `App.Error`, `App.Locals`, `App.Platform` interfaces, `AppContext` type, `TenantInfo` interface, full `Platform.env` bindings |
| `app.css` | ~150 | Global styles |

---

## Cloudflare Bindings

Everything the Worker needs to function. Copied from `libs/engine/wrangler.toml`.

### D1 Databases

| Binding | Database | Purpose |
|---------|----------|---------|
| `DB` | grove-engine-db | Main multi-tenant database (tenants, posts, pages, settings, moderation) |
| `CURIO_DB` | grove-curios-db | Curio-specific data (gallery, timeline, guestbook, polls, badges) |

### R2 Buckets

| Binding | Bucket | Purpose |
|---------|--------|---------|
| `IMAGES` | grove-media | User-uploaded images |
| `EXPORTS_BUCKET` | grove-exports | GDPR/backup zip archives |
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
| `AI` | Petal image content moderation |

### Environment Variables and Secrets

30+ values including session secrets, Stripe keys, API keys, CSRF secrets, Turnstile keys, and service URLs. Managed via `gw secret apply --worker grove-aspen`.

---

## Migration: Pages to Worker

### Router Changes

`services/grove-router/` currently sends unmatched subdomains to `grove-lattice.pages.dev`. After migration:

```typescript
// BEFORE
const DEFAULT_TARGET = "grove-lattice.pages.dev";

// AFTER
const DEFAULT_TARGET = "grove-aspen.<account>.workers.dev";
```

One line change. The router doesn't need to know whether the target is Pages or Worker. It proxies with `X-Forwarded-Host` either way.

### Deployment Strategy

1. Deploy `grove-aspen` Worker with all bindings
2. Smoke test directly via `grove-aspen.<account>.workers.dev`
3. Update router to send a test subdomain to the Worker
4. Verify auth, CSRF, routing, DOs all function
5. Gradually shift traffic (more subdomains pointed to Worker)
6. When stable, update default fallback to Worker
7. Decommission `grove-lattice` Pages project

### Rollback

Change one line in `grove-router` to point back to `grove-lattice.pages.dev`. The Pages project stays deployed until the Worker is confirmed stable.

---

## Security Considerations

- `hooks.server.ts` moves as-is. All 5 auth paths (SessionDO, Heartwood OAuth, JWT, internal service, anonymous) transfer unchanged.
- CSRF token cookie scoping (no Domain attribute) prevents cross-tenant sharing. Verify during testing.
- Rate limiting via ThresholdDO creates per-identifier instances. Same cost model as Pages.
- CSP nonce injection, HSTS, X-Frame-Options all set in hooks. Worker deployment doesn't affect header behavior.
- Secrets deployed via `gw secret apply --worker grove-aspen`. Verify all secrets are present before traffic shift.

---

## Relationship to Other Specs

| Spec | Relationship |
|------|-------------|
| `lattice-split-spec.md` | Parent spec. Defines the full execution plan (internal cleanup + Aspen creation). |
| `thorn-behavioral-spec.md` | Thorn moderation runs within Aspen's request context. Same behavior. |
| `grove-agent-spec.md` | Grove Agent SDK is a separate Worker. Aspen may receive service bindings from agents in the future. |

---

## Implementation Checklist

This app doesn't exist yet. Creation is Phase 1-2 of `docs/specs/lattice-split-spec.md`.

- [ ] Create `apps/aspen/` directory with SvelteKit + Worker config
- [ ] Configure `wrangler.toml` with all bindings listed above
- [ ] Move 291 route files from `libs/engine/src/routes/`
- [ ] Move app-level files (hooks, app.html, app.d.ts, app.css)
- [ ] Update route imports: `$lib/` to `@autumnsgrove/lattice/`
- [ ] Deploy secrets via `gw secret apply --worker grove-aspen`
- [ ] Smoke test all auth paths
- [ ] Blue-green cutover via grove-router
- [ ] Decommission grove-lattice Pages project

---

*One grove. Many trunks. Shared roots beneath the soil.*
