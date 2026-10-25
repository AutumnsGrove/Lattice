---
title: "Short Links"
description: "Short, readable links at link.grove.place for Wanderers' own groves, and for the Wayfinder's personal use"
category: specs
specCategory: content-community
aliases: []
date created: Sunday, October 25th 2026
date modified: Sunday, October 25th 2026
tags:
  - links
  - redirects
  - cloudflare-workers
  - lattice
type: tech-spec
lastUpdated: "2026-10-25"
---

```
   Wanderer shares            Wayfinder (landing Arbor)
        │                              │
        ▼                              ▼
  link.grove.place/my-bloom      link.grove.place/anything
        │
        ▼
  ╭─────────────╮    miss    ╭──────────╮
  │  grove-     │───────────▶│    D1    │
  │  router     │            │  grove-  │
  ╰──────┬──────╯            │ engine-db│
         │                   ╰────┬─────╯
         ▼                        │ fill
  ╭─────────────╮   hit     ╭─────▼────╮
  │ link-worker │◀──────────│    KV    │
  ╰──────┬──────╯           ╰──────────╯
         │
         ▼
   302 → https://autumn.grove.place/garden/my-bloom
```

> *A shorter path home.*

# Short Links

A short link is a small, readable address that forwards to somewhere in a Wanderer's grove. `link.grove.place/my-bloom` is easier to say, paste and remember than a full bloom URL. It is a small feature on purpose: one worker, one table, one validator.

**Public Name:** Short links (no codename)
**Host:** `link.grove.place`
**Worker:** `services/link-worker`
**Introduced:** October 2026
**Status:** Planned

---

## Goals

- Any Wanderer can create short links to their own grove, with a slug they choose or one we generate.
- The Wayfinder can create short links to anywhere, from the landing Arbor, for personal use.
- Redirects are fast: one cache read on the hot path, and nothing else.
- Short links cannot be used to send people somewhere a Wanderer doesn't own.

## Non-goals

- No arbitrary-URL shortening for Wanderers. That would need abuse moderation, and the destination rule below removes the need.
- No per-click analytics, IP logging or fingerprinting. Only one aggregate count per link.
- No separate short domain. `link.grove.place` is covered by the existing `*.grove.place` certificate.
- No link expiry, QR codes or UTM tooling in v1.

---

## Who Can Link Where

| Creator | Surface | Allowed destinations |
| --- | --- | --- |
| Wanderer | Arbor in Aspen | `https` URLs on their own grove: `{subdomain}.grove.place`, or their custom domain on tiers with `customDomain: true` |
| Wayfinder | Landing Arbor | Any `https` URL |

The destination rule is the central safety decision. Because a Wanderer's link can only reach their own grove, a short link can't be used for phishing or as a redirect relay. That keeps reports, blocklists and review queues out of scope.

The Wayfinder is identified the same way the landing Arbor already gates its pages. Wayfinder links store `tenant_id = NULL`.

---

## Data

One table in `grove-engine-db`, added as the next numbered migration after `119`.

```sql
CREATE TABLE IF NOT EXISTS short_links (
  slug         TEXT PRIMARY KEY,
  target_url   TEXT NOT NULL,
  tenant_id    TEXT,                       -- NULL = Wayfinder link
  created_at   INTEGER NOT NULL,
  disabled_at  INTEGER,                    -- soft delete; NULL = active
  click_count  INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_short_links_tenant
  ON short_links(tenant_id, created_at DESC);
```

- Slugs are global and first come, first served.
- Deleting a link sets `disabled_at`. The slug stays reserved, so a deleted link never silently starts pointing somewhere else.
- `ON DELETE CASCADE` removes a Wanderer's links when their grove is deleted.

---

## Redirect Worker

`services/link-worker`, modeled on `services/og-worker`.

| Request | Response |
| --- | --- |
| `GET /` | `302` to `https://grove.place` |
| `GET /{slug}`, active | `302` to `target_url`, with `Cache-Control: private, max-age=0` |
| `GET /{slug}`, disabled | `410` with a gentle "this link has gone" page |
| `GET /{slug}`, unknown | `404` |

**Lookup:** KV first, then D1 on a miss, filling KV afterwards. Create, edit and disable all delete the KV entry. Negative results are not cached.

**Click counting:** `waitUntil` increments `click_count` after the redirect is sent. A failed increment never fails the redirect.

**Why `302`:** targets can change, and browsers must not cache a destination that may be edited or disabled.

**Bindings:** D1 and KV are accessed through `@autumnsgrove/infra` (`GroveDatabase`, `GroveKV`), never raw bindings.

**Routing:** `grove-router` gets a `link` entry in `SUBDOMAIN_ROUTES` with a `LINK` service binding. `link` is added to `domain-blocklist.json` as a system word. It is not blocked today, so a Wanderer could currently register it.

---

## Validation

Lives in the engine so both Arbor surfaces share one implementation.

**Slugs**
- 3 to 32 characters: lowercase letters, digits and hyphens. No leading or trailing hyphen.
- Must not collide with the domain blocklist's reserved words or match the offensive blocklist.
- When none is supplied, generate 6 characters from an alphabet without look-alikes (no `0/o`, `1/l/i`), and retry on collision.

**Targets**
- `https` only. No `javascript:`, `data:` or other schemes. No credentials in the URL.
- Max length 2048.
- The host must not be `link.grove.place` (no loops or chains).
- Wanderers: host must be their grove or custom domain, as above.

**Rate limits and quotas**
- Creation is rate limited through Threshold, never a hand-rolled limiter.
- A per-tier cap on active links lives in `platform/config/tiers` as data, next to the other tier limits. Numbers are to be decided.

**Errors**
- Codes and messages live in a Signpost catalog, not in handlers.

---

## Surfaces

**Aspen Arbor (Wanderers)**
- A short links page: list, create, disable.
- A "Copy short link" action on each post, which creates the link on first use.
- Writes use the standard CSRF handling.

**Landing Arbor (Wayfinder)**
- `apps/landing/src/routes/arbor/links/`, next to `cdn` and `uploads`. Auth comes from the parent `/arbor` layout.
- List, create with optional custom slug, disable and delete.

---

## Open Questions

1. Per-tier link caps (see above).
2. Should a post's short link follow when its slug changes? The target would be rewritten when a post is renamed. Leaning yes, and it is the main reason to have this feature.
3. Do Meadow shares use short links? `meadow_posts.link` currently stores the canonical URL.

---

## Rollout

1. Reserve `link`: blocklist entry, router entry and binding, tests.
2. Migration, engine validator and its tests.
3. `link-worker` with redirect tests (hit, miss, disabled, unknown, KV invalidation).
4. Landing Arbor page.
5. Aspen Arbor surface and the post action.
6. Meadow and share integration, if the open question lands that way.

## Verification

- Validator: table-driven tests for every slug and target rule above, including Wanderer-vs-Wayfinder host checks.
- Worker: unit tests with mocked infra bindings for each response in the table.
- Router and blocklist: a test that `link` can't be registered and routes to the worker.
- Manually, through `./scripts/dev-stack.sh`: create a link and follow it.
