---
title: "Service Binding Migration"
status: planned
category: infra
---

# Service Binding Migration

**Created**: 2026-02-06
**Status**: Implemented (pending deploy)
**Priority**: Medium (reliability + latency)

## Goal

Replace public URL fetches between Cloudflare Workers/Pages with Service Bindings for direct Worker-to-Worker communication. Eliminates DNS resolution, public routing, and error 1042 failures.

## Background

An audit on 2026-02-06 found multiple Worker-to-Worker calls using bare `fetch()` to `*.workers.dev` URLs instead of Service Bindings. The AUTH integration already uses the correct pattern (`platform.env.AUTH.fetch()`). This plan extends that pattern to all internal service calls.

### Already Fixed

| Caller | Target | Binding |
|--------|--------|---------|
| grove-zephyr | grove-email-render | `env.EMAIL_RENDER` |
| grove-email-catchup | grove-email-render | `env.EMAIL_RENDER` |

## Phase 1: Grove Router (5 Worker targets)

The router (`packages/grove-router`) proxies requests to Workers via public URLs. Add Service Bindings for Workers (Pages targets must remain URL-based).

### Workers to bind

| Subdomain | Worker Name | Binding Name |
|-----------|-------------|-------------|
| scout.grove.place | scout | `SCOUT` |
| api.grove.place | groveauth | `AUTH_API` |
| mc.grove.place | mc-control | `MC_CONTROL` |
| mycelium.grove.place | mycelium | `MYCELIUM` |
| og (internal) | grove-og | `OG` |

### Changes

1. **`services/grove-router/wrangler.toml`** — Add 5 `[[services]]` entries
2. **`services/grove-router/src/index.ts`** — Update route map to include binding references. When proxying, check if target has a binding and use `binding.fetch()` instead of `fetch(proxyRequest)`

### Pattern

```typescript
// Route map entry gains optional binding key
{ host: "scout.grove.place", origin: "https://scout.m7jv4v7npb.workers.dev", binding: "SCOUT" }

// In proxy logic
const target = routeMap[hostname];
const response = target.binding && env[target.binding]
  ? await env[target.binding].fetch(proxyRequest)
  : await fetch(proxyRequest);
```

### Env type update

```typescript
interface Env {
  // ... existing
  SCOUT?: Fetcher;
  AUTH_API?: Fetcher;
  MC_CONTROL?: Fetcher;
  MYCELIUM?: Fetcher;
  OG?: Fetcher;
}
```

## Phase 2: Pages → Zephyr

Pages projects (engine, plant, landing) call Zephyr via the `ZephyrClient` using `fetch()`. Add a `ZEPHYR` Service Binding to each Pages project's wrangler config and extend the client to accept a `Fetcher`.

### Changes per package

1. **`wrangler.toml`** (engine, plant, landing) — Add `[[services]]` binding for `grove-zephyr`
2. **`libs/engine/src/lib/zephyr/client.ts`** — Add optional `fetcher?: Fetcher` to `ZephyrConfig`. When present, use `fetcher.fetch()` instead of global `fetch()`
3. **`libs/engine/src/lib/zephyr/factory.ts`** — Update `createZephyrClient()` to accept platform env and extract binding
4. **Call sites** — Pass `platform.env.ZEPHYR` where available (server-side code only)

### Pattern (matches existing AUTH pattern)

```typescript
// In +page.server.ts / +server.ts
const zephyr = createZephyrClient({
  apiKey: platform.env.ZEPHYR_API_KEY,
  fetcher: platform.env.ZEPHYR,  // Service Binding
});
```

## Verification

- `wrangler deploy` for each worker/pages project — confirm bindings listed in output
- Test router: `curl -H "Host: scout.grove.place" https://grove.place/health` — should proxy via binding
- Test email: Send a test invite from arbor admin — should render + send without 1042
- Check `wrangler tail grove-router` for subrequest patterns

## Notes

- Pages-to-Pages routing (e.g., router → grove-landing) **cannot** use Service Bindings — those must stay as URL fetches
- Service Bindings are only available in deployed Workers, not in local `wrangler dev` — keep URL fallbacks for local dev
- The `Fetcher` type is globally available in Workers types (no import needed)
- Binding names are optional keys (`?`) in Env interfaces so local dev doesn't break
