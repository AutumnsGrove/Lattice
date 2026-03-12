---
title: "Passage Developer Guide"
description: "How to work with Grove's subdomain routing Worker, add new routes, debug request flows, and understand the two-layer architecture."
category: guides
guideCategory: infrastructure
lastUpdated: "2026-03-12"
aliases: []
tags:
  - passage
  - routing
  - cloudflare-workers
  - subdomain
  - proxy
---

# Passage Developer Guide

Passage is the Cloudflare Worker that catches every `*.grove.place` request and sends it to the right place. It exists because Cloudflare Pages doesn't support wildcard custom domains, so one Worker sits in front of everything and proxies based on subdomain.

## How Passage Works

The request flow has two layers. Passage (the Worker) handles the initial routing, then Lattice (the SvelteKit engine) handles tenant resolution on the other side.

### Layer 1: The Worker (`services/grove-router/src/index.ts`)

A Wanderer visits `autumn.grove.place/garden/hello-world`. Cloudflare DNS routes all `*.grove.place` traffic to the Passage Worker. The Worker:

1. Extracts the subdomain from the hostname (`autumn`)
2. Checks `SUBDOMAIN_ROUTES` for a match
3. `autumn` isn't in the map, so it falls through to the default: proxy to `grove-lattice.pages.dev`
4. Sets `X-Forwarded-Host: autumn.grove.place` on the proxied request
5. Returns the response to the Wanderer

If the subdomain _is_ in the map, Passage routes to that specific service instead. `ivy.grove.place` goes to `ivy-3uv.pages.dev`, `meadow.grove.place` goes to `grove-meadow.pages.dev`, and so on.

### Layer 2: Tenant Resolution (`libs/engine/src/hooks.server.ts`)

When Lattice receives a proxied request, `hooks.server.ts` reads `X-Forwarded-Host` to figure out which tenant was requested. It extracts the subdomain, validates the format against RFC 1035 rules, then looks up the tenant:

1. Try TenantDO first (Durable Object with in-memory cache, fast)
2. Fall back to D1 if the DO is unavailable
3. Set `event.locals.context` to one of four types: `landing`, `app`, `tenant`, or `not_found`

If the tenant doesn't exist, Lattice checks `username_history` for a recent rename redirect before showing a 404. Old subdomains get a 302 (not 301) to the new name for 30 days.

### The Four Context Types

```typescript
type AppContext =
  | { type: "landing" }                              // grove.place (no subdomain)
  | { type: "app"; app: string; routePrefix: string } // reserved subdomain (auth, arbor, etc.)
  | { type: "tenant"; tenant: TenantInfo }            // valid tenant site
  | { type: "not_found"; subdomain: string };          // unregistered subdomain
```

Your SvelteKit routes read `event.locals.context` to decide what to render. A `+layout.server.ts` file early in the tree typically branches on `context.type`.

## Adding a New Service Route

You need a new subdomain pointed at a Pages project or Worker. Two files to edit.

### 1. Add to the Worker route map

Open `services/grove-router/src/index.ts` and add your entry to `SUBDOMAIN_ROUTES`:

```typescript
const SUBDOMAIN_ROUTES: Record<string, string | RouteTarget> = {
  // ... existing routes ...

  // Pages project: just a hostname string
  canopy: "grove-canopy.pages.dev",

  // Worker with Service Binding: origin + binding key
  birdsong: { origin: "grove-birdsong.m7jv4v7npb.workers.dev", binding: "BIRDSONG" },
};
```

For Workers, you also need to add the Service Binding to the `Env` interface and `wrangler.toml`:

```typescript
// In the Env interface
export interface Env {
  // ...existing bindings...
  BIRDSONG?: Fetcher;
}
```

```toml
# In wrangler.toml
[[services]]
binding = "BIRDSONG"
service = "grove-birdsong"
```

Service Bindings are optional at runtime. When present, they route internally (no DNS, no TLS overhead). When absent (local dev), the Worker falls back to a public `fetch()` to the origin URL.

### 2. Reserve it in Lattice hooks (if applicable)

If this subdomain should also be recognized by Lattice's hooks (for example, if some requests might reach Lattice directly without the Worker proxy), add it to `RESERVED_SUBDOMAINS` in `libs/engine/src/hooks.server.ts`:

```typescript
const RESERVED_SUBDOMAINS: Record<string, string | null> = {
  // ...existing entries...
  canopy: null, // External service, not handled by Lattice
};
```

A value of `null` means "this subdomain is handled elsewhere." A string value like `"/canopy"` means "rewrite to this route prefix within Lattice."

### 3. Write a test

Add a test in `services/grove-router/tests/router.test.ts`:

```typescript
it("routes canopy subdomain to grove-canopy", async () => {
  const request = createRequest("canopy", "/directory");
  await router.fetch(request, env);

  expect(mockFetch).toHaveBeenCalledWith(
    expect.objectContaining({
      url: expect.stringContaining("grove-canopy.pages.dev/directory"),
    }),
  );
});
```

## CDN Routing (`cdn.grove.place`)

The CDN subdomain is special. Instead of proxying to another service, Passage serves files directly from R2 buckets.

Two buckets are in play:

- `grove-cdn` (binding: `CDN`): Static assets, fonts, admin uploads
- `grove-media` (binding: `MEDIA`): Wanderer-uploaded images (tenant-prefixed paths)

The router decides which bucket to use based on the path pattern. Paths matching `{something}/(photos|profile)/...` go to `grove-media`. Everything else goes to `grove-cdn`.

Security note: dangerous content types (HTML, JavaScript, XML) are forced to `Content-Disposition: attachment` to prevent XSS through content-type sniffing. Images, fonts, PDFs, and other safe types display inline.

## Local Development

In production, Passage sets `X-Forwarded-Host` and Lattice reads it. Locally, you don't have the Worker proxy running, so `hooks.server.ts` has two fallback mechanisms for simulating subdomains:

**Option 1: Header** (good for API testing)
```bash
curl -H "x-subdomain: autumn" http://localhost:5173/garden
```

**Option 2: Query parameter** (good for browser testing)
```
http://localhost:5173/garden?subdomain=autumn
```

Both only work when the raw `Host` header contains `localhost` or `127.0.0.1`. This is a security check: in production, these simulation paths are unreachable because the host header will be `*.grove.place`.

The subdomain value is validated against `SUBDOMAIN_PATTERN` (`/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/`) before it reaches any database query.

## Why Things Break

### "My new subdomain returns the landing page"

The subdomain isn't in `SUBDOMAIN_ROUTES`, so Passage routes it to Lattice. Lattice doesn't find a tenant with that name, so it renders the landing context. If you're adding a service route, make sure you added it to the route map and redeployed the Worker.

### "Tenant pages work in production but not locally"

You're probably hitting `localhost:5173` without the `?subdomain=` param or `x-subdomain` header. Without either, `extractSubdomain()` returns `null` and you get the landing page.

### "Auth redirects go to the wrong place"

The auth subdomains (`auth`, `admin`, `heartwood`) all 301 redirect to `login.grove.place`. If you're seeing a redirect loop, check that `login` itself routes correctly in `SUBDOMAIN_ROUTES` (it should point to `grove-login.pages.dev`, not `REDIRECT_TO_LOGIN`).

### "CDN returns 404 for a file I just uploaded"

Check which bucket the file is in. User-uploaded media goes to `grove-media`, but the R2 routing logic checks for `/(photos|profile)/` in the path. If your upload path doesn't match that pattern, it'll look in `grove-cdn` instead.

### "502 Proxy error"

The target service is down or unreachable. Check if the Pages project or Worker is deployed. If using Service Bindings, verify the binding name in `wrangler.toml` matches the actual worker name. The Worker logs `"Proxy error:"` with the underlying error to the console.

### "CORS failures on CDN requests"

`validateOrigin()` only allows `https://grove.place` and `https://*.grove.place`. Any other origin gets `https://grove.place` as the `Access-Control-Allow-Origin` value (not a rejection, just a mismatch that the browser rejects). Make sure your requesting origin matches the pattern.

## Architecture Notes

### Service Bindings vs. Public Fetch

The `RouteTarget` type supports an optional `binding` key. When the Service Binding exists in the environment, the Worker calls `fetcher.fetch()` directly. This uses Cloudflare's internal network, skipping DNS resolution and TLS handshakes. It also avoids Error 1042 (Worker subrequest to itself via public URL).

In local development, bindings aren't available, so the Worker falls back to `fetch()` with the public origin URL. This is why both `origin` and `binding` exist on `RouteTarget`.

### Keepalive Cron

Passage runs a cron trigger every minute (`* * * * *`) that just logs a message. This prevents cold starts on the Worker. Without it, the first request after idle can take around 10 seconds while the Worker spins up and establishes Service Binding connections. Since Passage is the entry point for all `*.grove.place` traffic, a cold start there delays everything.

### Auth Subdomain Consolidation

The `auth`, `admin`, and `heartwood` subdomains all redirect to `login.grove.place` with a 301. The `auth-api` subdomain has special handling: browser requests (those with `Accept: text/html`) redirect to `login.grove.place`, but API requests continue through to the auth Worker via Service Binding. This keeps magic link callbacks working during the transition period.

### Reserved Subdomains

About a dozen subdomains are reserved for future services. They all route to `grove-landing` (the landing page Worker). This prevents Wanderers from registering a subdomain like `search.grove.place` that would conflict with a future search service.

The reserved list in the Worker (`SUBDOMAIN_ROUTES`) and the reserved list in hooks (`RESERVED_SUBDOMAINS`) overlap but aren't identical. The Worker list is the authoritative one for DNS-level routing. The hooks list matters for requests that reach Lattice directly.

### Redirect Safety

The `www` subdomain gets a 301 (permanent) redirect to `grove.place`. Username renames get a 302 (temporary) redirect. The 302 is intentional: the old subdomain's hold expires after 30 days, and someone else could register it. A cached 301 would permanently bypass the new owner's site.

## Key Files

| File | What it does |
|------|-------------|
| `services/grove-router/src/index.ts` | The Passage Worker. Route map, proxy logic, R2 serving, CORS. |
| `services/grove-router/wrangler.toml` | Worker config: route pattern, R2 bindings, Service Bindings, cron. |
| `services/grove-router/tests/router.test.ts` | Worker tests. Pure routing logic with mock R2 and fetch. |
| `libs/engine/src/hooks.server.ts` | Tenant resolution. Reads `X-Forwarded-Host`, looks up tenant, sets context. |
| `libs/engine/src/app.d.ts` | Type definitions for `AppContext`, `TenantInfo`, `Locals`. |
| `docs/specs/passage-spec.md` | Full spec with architecture diagrams and naming history. |

## Quick Checklist

When adding a new routed subdomain:

- [ ] Add entry to `SUBDOMAIN_ROUTES` in `services/grove-router/src/index.ts`
- [ ] If it's a Worker, add `Env` interface binding and `wrangler.toml` `[[services]]` block
- [ ] Add entry to `RESERVED_SUBDOMAINS` in `libs/engine/src/hooks.server.ts` if Lattice needs to know about it
- [ ] Write a routing test in `services/grove-router/tests/router.test.ts`
- [ ] Deploy the Worker (`wrangler deploy` from `services/grove-router/`)
- [ ] Verify the subdomain resolves correctly in production
