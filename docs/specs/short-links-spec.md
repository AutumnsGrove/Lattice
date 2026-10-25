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
  link.grove.place/k7m2xq     link.grove.place/anything
        │
        ▼
  ╭─────────────╮            ╭──────────────────╮
  │  grove-     │───────────▶│   link-worker    │
  │  router     │            │  resolveShortLink│
  ╰─────────────╯            ╰────────┬─────────╯
                                      │ one read
                             ╭────────▼─────────╮
                             │   D1 (engine)    │
                             │ short_links      │
                             │ ⨝ posts ⨝ tenants│
                             ╰────────┬─────────╯
                                      ▼
        302 → https://autumn.grove.place/garden/{current-slug}
```

> *A shorter path home.*

# Short Links

A short link is a small, readable address that forwards to somewhere in a Wanderer's grove. `link.grove.place/k7m2xq` is easier to say, paste and remember than a full bloom URL. It is a small feature on purpose: one worker, one table, one service module.

**Public Name:** Short links (no codename)
**Host:** `link.grove.place`
**Worker:** `services/link-worker` (deployed as `grove-link`)
**Service:** `@autumnsgrove/lattice/services/short-links`
**Issue:** #1593
**Status:** Built, awaiting deploy

---

## Goals

- Any Wanderer can share a bloom with a short link, and can make their own named links to pages in their grove.
- The Wayfinder can create short links to anywhere, from the landing Arbor, for personal use.
- A bloom's short link never changes. Sharing it twice gives the same link, and it keeps working when the bloom is renamed.
- Short links cannot be used to send people somewhere a Wanderer doesn't own.

## Non-goals

- No arbitrary-URL shortening for Wanderers. That would need abuse moderation, and the destination rule below removes the need.
- No per-click analytics, IP logging or fingerprinting. One aggregate count per link.
- No separate short domain. `link.grove.place` is covered by the existing `*.grove.place` certificate.
- No per-tier link caps. Creation is rate limited instead.
- No expiry, QR codes or UTM tooling.

---

## Two Kinds of Link

| Kind | Made by | Points to | Notes |
| --- | --- | --- | --- |
| `post` | A Wanderer, from the garden's "Short link" button | Their bloom, resolved when visited | One per post, ever. Follows slug renames. Can't be retired. |
| `custom` | A Wanderer from Arbor, or the Wayfinder from the landing Arbor | An explicit `https` URL | Wanderers: their own grove only. Wayfinder: anywhere. |

The destination rule is the central safety decision. Because a Wanderer's link can only reach their own grove, a short link can't be used for phishing or as a redirect relay. That keeps reports, blocklists and review queues out of scope.

A Wanderer's "own grove" is `{subdomain}.grove.place`, plus their custom domain on tiers with `customDomain: true` (Oak and Evergreen). The Wayfinder's links store `tenant_id = NULL`.

---

## Data

One table in `grove-engine-db`, migration `120_short_links.sql`.

```sql
CREATE TABLE IF NOT EXISTS short_links (
  slug         TEXT PRIMARY KEY,
  kind         TEXT NOT NULL CHECK (kind IN ('post', 'custom')),
  tenant_id    TEXT REFERENCES tenants(id) ON DELETE CASCADE,  -- NULL = Wayfinder
  post_id      TEXT,                 -- post links only; no FK on purpose
  target_url   TEXT,                 -- custom links only
  created_at   INTEGER NOT NULL DEFAULT (unixepoch()),
  disabled_at  INTEGER,              -- soft delete; NULL = active
  click_count  INTEGER NOT NULL DEFAULT 0,
  CHECK (
    (kind = 'post' AND tenant_id IS NOT NULL AND post_id IS NOT NULL AND target_url IS NULL)
    OR (kind = 'custom' AND post_id IS NULL AND target_url IS NOT NULL)
  )
);

CREATE UNIQUE INDEX idx_short_links_post ON short_links(post_id) WHERE post_id IS NOT NULL;
CREATE INDEX idx_short_links_tenant ON short_links(tenant_id, created_at DESC);
```

- **Post links store the post's ID, never its URL.** The slug is looked up when the link is visited, so renaming a bloom changes nothing about its short link, and a stale URL can never be served.
- **One link per post** is enforced by the unique index. Creating is `INSERT OR IGNORE` followed by a read, so concurrent callers all get the same slug.
- **Retired custom links keep their row.** The slug stays reserved forever, so a slug that was once shared can never silently start pointing somewhere else.
- **A deleted post leaves its link behind.** `post_id` has no foreign key; the worker answers `410` for it.
- Slugs are global and first come, first served.
- A grove's links are removed with the grove (`ON DELETE CASCADE`).

---

## Redirect Worker

`services/link-worker`, modeled on `services/og-worker`. It only speaks HTTP; every rule lives in the service module.

| Request | Response |
| --- | --- |
| `GET /` | `302` to `https://grove.place` |
| `GET /{slug}`, resolves | `302` to the destination, `Cache-Control: private, max-age=0` |
| `GET /{slug}`, gone | `410` with a gentle "this link has gone quiet" page |
| `GET /{slug}`, unknown or not a slug | `404` |
| Lookup fails | `500` friendly page, logged with `GROVE-LINK-001` |
| Anything but `GET`/`HEAD` | `405` |

**"Gone"** means the link existed and no longer leads anywhere: it was retired, its bloom is a draft or deleted, or its grove is inactive.

**Lookup:** one indexed D1 read joining `short_links`, `posts` and `tenants`. There is deliberately no KV cache: post links must follow renames, and a cache would need invalidating on every post save to keep that true.

**Post destinations** are always `https://{subdomain}.grove.place/garden/{slug}` for published posts. The subdomain always works, whereas a custom domain might not be verified.

**Clicks:** `waitUntil` increments `click_count` after the redirect is sent (`GET` only, not `HEAD`). A failed increment is logged and never fails the redirect.

**Why `302`:** destinations can change, and browsers must not remember one.

**Defense in depth:** the worker refuses to redirect to anything that doesn't start with `https://`, even though everything stored was validated.

**Routing:** `grove-router` has a `link` entry in `SUBDOMAIN_ROUTES` with a `LINK` service binding. `link` is in `domain-blocklist.json` as a Grove service, so no Wanderer can register it.

---

## Service Module

`libs/engine/src/lib/server/services/short-links.ts` is the single owner of short link behavior. The worker, Aspen's Arbor and the landing Arbor all call it.

| Function | Purpose |
| --- | --- |
| `validateSlug`, `validateTarget` | The rules below |
| `generateSlug` | 6 characters, no look-alikes, unbiased |
| `getOrCreatePostLink` | A bloom's one short link |
| `createCustomLink`, `disableLink`, `listLinks` | Managing named links |
| `getGroveOwner` | Loads a grove, including custom domain only on tiers that have one |
| `resolveShortLink`, `recordClick` | Used by the worker |

Constants (host, slug rules, generator alphabet) live in `platform/config/short-links.ts`. Errors live in the `LINK_ERRORS` Signpost catalog (`GROVE-LINK-NNN`). Tests run the real queries against SQLite built from the real migration.

### Slugs

- 3 to 32 characters: lowercase letters, digits, single hyphens, no leading or trailing hyphen.
- Wanderers can't use reserved words: the domain blocklist (system names, impersonation) and the offensive blocklist apply. This also stops anyone making `link.grove.place/help` look official.
- **The Wayfinder skips both blocklists** (the format rules still apply), since the reserved words are theirs.
- Generated slugs come from `23456789abcdefghjkmnpqrstuvwxyz`, are checked against the blocklists, and retry on collision.

### Targets

- `https` only. No credentials, no explicit port, at most 2048 characters.
- Never `link.grove.place` itself (no loops or chains).
- Wanderers: the host must be exactly their grove's host. `autumn.grove.place.evil.com`, `sub.autumn.grove.place`, and `autumn.grove.place@evil.com` are all rejected.

### Rate limiting

`links/create` in Threshold's endpoint config: 30 per hour per Wanderer, applied to custom link creation.

---

## Surfaces

**Shared UI:** `ShortLinksManager` (`@autumnsgrove/lattice/ui/arbor`) renders the list, the create form and the copy button for both Arbors. Plain `<form method="POST">`, so it works without JavaScript.

**Aspen Arbor (Wanderers)**
- `/arbor/settings/links`, reached from a Short Links card in Settings (no sidebar item; short links are a small feature). List, create, retire. Form actions verify ownership themselves, because actions don't run the layout's load.
- `POST /api/blooms/{slug}/short-link`: owner-only, returns `{ slug, shortUrl }`. The garden's "Short link" button calls it and copies the result.

**Landing Arbor (Wayfinder)**
- `/arbor/links`, a full panel in the Wayfinder Tools section. Gated by `isWayfinder`.

---

## Rollout

1. Reserve `link`, route it through `grove-router`. Done.
2. Migration, service module, tests. Done.
3. `link-worker`. Done.
4. Landing Arbor page. Done.
5. Aspen Arbor page and the garden button. Done.

**Deploy order matters.** `grove-router` binds to the `grove-link` service, so `grove-link` must exist before the router deploys. Apply migration `120` to `grove-engine-db`, deploy `grove-link`, then the router.

## Possible later

- Show a bloom's short link in the editor and on the public post page.
- Use short links in Meadow shares (`meadow_posts.link` currently stores the canonical URL).
- A KV layer in front of custom links, if traffic ever calls for it.
