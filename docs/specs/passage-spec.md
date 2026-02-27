---
title: Passage — The Hidden Way Through
description: Subdomain routing infrastructure that makes the impossible possible
category: specs
specCategory: core-infrastructure
icon: kayak
lastUpdated: '2026-01-25'
aliases: []
tags:
  - core
  - cloudflare-workers
  - routing
  - infrastructure
---

# Passage — The Hidden Way Through

> **This is the canonical specification for Grove's subdomain routing system.**
> See [Implementation Status](#implementation-status) for current state.

```
                    🌲         🌲         🌲
                     │          │          │
         ════════════╪══════════╪══════════╪════════════
                     │          │          │
        *.grove.place │          │          │
              │       │          │          │
              ▼       │          │          │
         ╭────────────┴──────────┴──────────┴───────────╮
         │                                              │
         │    🛶  ═══════════════════════════════►     │
         │         navigating the river passage         │
         │                                              │
         ╰──────────────────────────────────────────────╯
                     │          │          │
                     ▼          ▼          ▼
                  autumn     meadow    heartwood
                 .grove     .grove      .grove
                 .place     .place      .place

              The way through was always there.
                 Passage just reveals it.
```

> *The way through was always there. Passage just reveals it.*

A passage is a way through—a corridor connecting spaces that seem separate. In impossible architecture, passages are the secret: rotate the structure, and a passage appears where none existed. The geometry shouldn't allow it. The passage doesn't care.

**Public Name:** Passage
**Internal Name:** GroveRouter (legacy), GrovePassage (future)
**Package:** `services/grove-router` (pending rename to `services/passage`)
**Worker:** `grove-router` on Cloudflare Workers

Passage is how the grove makes the impossible feel inevitable. Without it, every tenant would need a manually configured page. Every URL would require hand-wired routing. The architecture would collapse under its own complexity. But Passage arches over all of it.

Type `autumn.grove.place`, and Passage carries you there—navigating the river of subdomains to your destination like a kayak finding its channel. Not by traveling the distance, but by making the distance irrelevant.

---

## Implementation Status

> **Last Updated:** January 25, 2026

| Feature | Status | Notes |
|---------|--------|-------|
| **Wildcard Routing** | ✅ Live | Catches all `*.grove.place` requests |
| **Service Routing** | ✅ Live | Routes to Heartwood, Amber, Plant, etc. |
| **Tenant Routing** | ✅ Live | Unknown subdomains → Lattice for tenant lookup |
| **CDN/R2 Serving** | ✅ Live | Direct R2 serving for `cdn.grove.place` |
| **WWW Redirect** | ✅ Live | `www.grove.place` → `grove.place` |
| **CORS Validation** | ✅ Live | Restricts to `*.grove.place` origins |
| **Reserved Subdomains** | ✅ Live | Prevents registration conflicts |
| **Custom Domains** | 🔮 Planned | Route custom domains through Passage |
| **Loom Integration** | 🔮 Planned | TenantDO coordination (see issue #637) |

---

## Overview

Cloudflare Pages doesn't support wildcard custom domains. This creates a problem: how do you route `autumn.grove.place`, `meadow.grove.place`, and `heartwood.grove.place` to their respective services when Pages only allows explicit domain configuration?

Passage solves this with elegant simplicity. A Cloudflare Worker sits at `*.grove.place`, catches every subdomain request, and proxies it to the correct destination—adding the original hostname via `X-Forwarded-Host` so the destination knows who was being requested.

The impossible becomes possible. One Worker, infinite destinations.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         The Internet                                │
│                                                                     │
│    autumn.grove.place    meadow.grove.place    heartwood.grove.place│
│           │                     │                      │            │
└───────────┼─────────────────────┼──────────────────────┼────────────┘
            │                     │                      │
            └──────────────┬──────┴──────────────────────┘
                           │
                           ▼
            ╔══════════════════════════════╗
            ║        PASSAGE WORKER        ║
            ║     (grove-router.workers)   ║
            ╠══════════════════════════════╣
            ║                              ║
            ║  1. Extract subdomain        ║
            ║  2. Check route map          ║
            ║  3. Proxy to destination     ║
            ║  4. Pass X-Forwarded-Host    ║
            ║                              ║
            ╚══════════════════════════════╝
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
┌───────────────┐  ┌───────────────┐  ┌───────────────┐
│ grove-lattice │  │ grove-meadow  │  │   groveauth   │
│  .pages.dev   │  │  .pages.dev   │  │  .pages.dev   │
│               │  │               │  │               │
│  (Tenant DB   │  │  (Social      │  │  (Auth        │
│   lookup)     │  │   feed)       │  │   system)     │
└───────────────┘  └───────────────┘  └───────────────┘
```

### Request Flow

1. **Visitor** types `autumn.grove.place/blog/hello-world`
2. **Cloudflare DNS** routes `*.grove.place` to the Passage Worker
3. **Passage** extracts subdomain: `autumn`
4. **Route check**: `autumn` not in special routes → default to Lattice
5. **Proxy** request to `grove-lattice.pages.dev`
6. **Header**: Add `X-Forwarded-Host: autumn.grove.place`
7. **Lattice** receives request, reads header, looks up tenant `autumn` in D1
8. **Response** flows back through Passage to visitor

---

## Subdomain Route Map

Passage maintains a route map of special subdomains. Anything not in this map routes to Lattice for tenant lookup.

### Service Routes

| Subdomain | Destination | Purpose |
|-----------|-------------|---------|
| `heartwood`, `auth`, `admin`, `login` | groveauth-frontend.pages.dev | Authentication |
| `amber` | amber-4x2.pages.dev | Storage management |
| `ivy` | ivy-3uv.pages.dev | Email client |
| `plant` | grove-plant.pages.dev | Onboarding |
| `vineyard` | vineyard-grove-place.pages.dev | Tool showcases |
| `meadow` | grove-meadow.pages.dev | Social feed |
| `aria`, `music` | grovemusic.pages.dev | Music curation |
| `forage`, `domains` | grove-domains.pages.dev | Domain discovery |
| `status`, `clearing` | grove-clearing.pages.dev | Status page |

### Worker Routes

| Subdomain | Destination | Purpose |
|-----------|-------------|---------|
| `scout` | scout.workers.dev | Shopping research |
| `auth-api` | groveauth.workers.dev | Auth API |
| `mc-control` | mc-control.workers.dev | Minecraft control |
| `mycelium` | mycelium.workers.dev | MCP server |
| `og` | grove-og.workers.dev | OG image generation |

### Special Handling

| Subdomain | Behavior |
|-----------|----------|
| `www` | 301 redirect to `grove.place` |
| `cdn` | Direct R2 serving (not proxied) |

### Reserved Subdomains

These route to the landing page but are reserved for future services:

`pantry`, `nook`, `trove`, `bloom`, `vista`, `foliage`, `mc`, `search`, `porch`

---

## Technical Details

### Environment Bindings

```typescript
export interface Env {
  CDN: R2Bucket;  // For cdn.grove.place direct serving
}
```

### Proxy Mechanism

```typescript
// Create proxy request with forwarded host
const headers = new Headers(request.headers);
headers.set("X-Forwarded-Host", originalHostname);

const proxyRequest = new Request(targetUrl, {
  method: request.method,
  headers: headers,
  body: request.body,
  redirect: "manual",  // Don't follow redirects, pass them through
});

const response = await fetch(proxyRequest);
```

### CORS Validation

Passage validates CORS origins to restrict access to the Grove domain:

```typescript
function validateOrigin(origin: string | null): string {
  if (!origin) return "https://grove.place";

  // Allow grove.place and all subdomains
  if (
    origin === "https://grove.place" ||
    origin === "https://www.grove.place" ||
    /^https:\/\/[\w-]+\.grove\.place$/.test(origin)
  ) {
    return origin;
  }

  return "https://grove.place";
}
```

### R2 CDN Serving

For `cdn.grove.place`, Passage serves files directly from R2 with:
- Content-type detection by extension
- XSS protection via Content-Disposition headers
- 1-year cache headers for immutable assets
- CORS headers for cross-origin access

---

## Security Considerations

### Content-Type Sniffing Protection

Dangerous content types are forced to download rather than display inline:

```typescript
const dangerousTypes = [
  "application/javascript",
  "text/html",
  "application/xhtml+xml",
  "text/xml",
  "application/xml",
];

if (dangerousTypes.some(type => contentType.includes(type))) {
  headers.set("Content-Disposition", "attachment");
}
```

### Subdomain Reservation

Reserved subdomains prevent:
- Impersonation of Grove services
- Squatting on future service names
- Confusion between tenants and services

### Header Passthrough

The `X-Forwarded-Host` header is critical for multi-tenant operation. Downstream services MUST read this header to determine which tenant is being accessed.

---

## Future Enhancements

### Loom Integration (Issue #637)

Passage will integrate with Loom's TenantDO for:
- Real-time tenant configuration
- Dynamic route updates without redeploy
- Per-tenant feature flags affecting routing

### Custom Domain Support

For Oak+ tiers with custom domains:
- Custom domain → Passage → Lattice with domain header
- CNAME/proxy configuration via Cloudflare for SaaS
- SSL certificate provisioning

### Geographic Routing

Future consideration for multi-region deployments:
- Route to nearest Lattice instance
- Tenant data residency compliance

---

## Deployment

### Wrangler Configuration

```toml
name = "grove-router"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[[r2_buckets]]
binding = "CDN"
bucket_name = "grove-cdn"
```

### DNS Configuration

```
*.grove.place  →  grove-router.workers.dev (CNAME/Proxy)
```

---

## Related Documentation

- [Lattice Spec](/knowledge/specs/lattice-spec) — The engine Passage routes to
- [Heartwood Spec](/knowledge/specs/heartwood-spec) — Authentication service
- [Loom Pattern](/knowledge/patterns/loom-durable-objects-pattern) — Future coordination layer

---

## Naming Journey

Passage was named through the [Walking Through the Grove](/knowledge/philosophy/walking-through-the-grove) process. The journey explored:

- **Threshold** — Taken (rate limiting SDK)
- **Verge** — Trademark concerns (The Verge)
- **Fold, Twist, Arc** — Too abstract
- **Parallax, Refract, Transmute** — Escher-inspired but complex

**Passage** won because it captures the Monument Valley essence: hidden corridors through impossible architecture, paths that connect what shouldn't connect. The kayak icon represents navigating the river passage—finding your channel through the subdomains.

*The way through was always there. Passage just reveals it.*
