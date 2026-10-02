# Local Development Guide

Running Grove locally means running the *actual* stack — real Workers, real Durable Objects, real D1/KV/R2. No mocks, no stubs, no "close enough." Miniflare handles the local infrastructure; wrangler handles the orchestration. It should feel like production, just quieter.

---

## Quick Start

```bash
pnpm install
pnpm -r run package         # Build engine dist (DOs need it)
./scripts/dev-stack.sh      # Seed data + start all workers
```

Then open **http://localhost:5173**.

That's it. The script handles migrations, seeding, and starting everything in the right order.

---

## Prerequisites

- **Node.js 20+** and **pnpm** installed
- **Google OAuth credentials** — needed if you want to test sign-in ([see Auth Setup](#auth-setup-google-oauth))
- `services/heartwood/.dev.vars` — copy from `.dev.vars.example` and fill in your credentials

Everything else (D1 databases, KV namespaces, R2 buckets) is created locally by miniflare on first run. No cloud accounts needed for basic use.

---

## Architecture

```
Heartwood (port 8787)  ←  separate wrangler dev process
       ↕
   dev registry  (wrangler's local service discovery)
       ↕
Multi-config wrangler dev (port 5173):
├── grove-aspen             (primary — serves HTTP, owns port 5173)
├── grove-durable-objects   (auxiliary — Loom DOs)
└── grove-zephyr            (auxiliary — email gateway)
```

**Why Heartwood is separate:** Heartwood has a `[[routes]]` `custom_domain` in its `wrangler.toml`. If it ran inside the multi-config group, wrangler would use its hostname as the primary `Host` header, breaking Aspen's routing. Running it as a separate process fixes this — wrangler's dev registry still lets service bindings find each other automatically.

**What's local:** D1, KV, and R2 all use real SQLite files on disk (`.wrangler/state/v3/`). DOs run real instances, not mocked. State persists between restarts unless you `reset`.

---

## Dev Stack Commands

| Command | What it does |
|---------|-------------|
| `./scripts/dev-stack.sh` | Full stack: migrate + seed + start all workers |
| `./scripts/dev-stack.sh seed` | Apply migrations + seed the `blog` profile, then exit |
| `./scripts/dev-stack.sh reset` | Delete all local DB state, re-migrate, re-seed |
| `./scripts/dev-stack.sh workers` | Migrate + seed + start workers only (same as full, no separate SvelteKit step) |

---

## Port Assignments

| Service | Port | Notes |
|---------|------|-------|
| Aspen | 5173 | Primary worker — the blog frontend |
| Heartwood | 8787 | Auth API (Google OAuth, email codes, session management) |
| Login hub | 5176 | `apps/login` under `vite dev` — hosts "Continue with email" |
| Durable Objects | — | No dedicated port; reached via service binding |
| Zephyr | — | No dedicated port; reached via service binding |

---

## Auth Setup (Google OAuth)

Auth works on localhost — Google exempts `localhost` from the usual HTTPS requirement.

**One-time setup in Google Cloud Console:**

1. Go to **APIs & Services → Credentials → OAuth 2.0 Client IDs**
2. Add these **Authorized JavaScript origins:**
   - `http://localhost:8787`
   - `http://localhost:5173`
3. Add this **Authorized redirect URI:**
   - `http://localhost:8787/api/auth/callback/google`

**Configure `.dev.vars`:**

```bash
cp services/heartwood/.dev.vars.example services/heartwood/.dev.vars
```

Fill in `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. The other secrets can be generated locally:

```bash
# BETTER_AUTH_SECRET and SESSION_SECRET
openssl rand -hex 32

# JWT_PRIVATE_KEY and JWT_PUBLIC_KEY
openssl ecparam -genkey -name prime256v1 -noout | openssl pkcs8 -topk8 -nocrypt
```

`ZEPHYR_API_KEY` can be left as a placeholder locally — auth still works, email just won't deliver (see [What's Not Local](#whats-not-local)).

---

## Auth Setup (Email Code)

No Google credentials needed. Sign in or sign up with just an email address and a 6-digit code.

1. Run `./scripts/dev-stack.sh`.
2. Open **http://localhost:5175** (Plant) and click **Sign in with Grove** — or go straight to the login hub at **http://localhost:5176**.
3. Enter any email and press **Continue with email**.
4. Find the code (see below) and type it into the page. A first-time email creates a new account; a known one signs in.

`dev-stack.sh` points every app's sign-in button at the local hub by exporting `VITE_LOGIN_URL=http://localhost:5176` before building them. Without it, the buttons go to production `login.grove.place`.

**Finding the code.** Local Zephyr has no `ZEPHYR_API_KEY`, so nothing is emailed. Heartwood prints the code instead:

```
[heartwood] [LoginCode:dev] sign-in code for you@example.com: 123456
```

If you didn't start the stack from your own terminal (or the log is buffered), read it from Heartwood's local log store:

```bash
curl -s -X POST http://localhost:8787/cdn-cgi/local/explorer/api/local/observability/query \
  -H 'Content-Type: application/json' \
  -d '{"sql":"SELECT created_at, message FROM logs WHERE message LIKE '"'"'%LoginCode:dev%'"'"' ORDER BY ts_ms DESC LIMIT 5"}'
```

The dev log only happens when `AUTH_BASE_URL` starts with `http://localhost`.

**Behavior locally:**

- Codes expire after 10 minutes, are stored hashed in the local `ba_verification` table, and are burned after 3 wrong guesses.
- The send limit is relaxed locally (the login hub under `vite dev` can't see a real client IP, so every request shares one rate-limit bucket). In production it's 3 codes per 10 minutes per IP, plus a per-address cap in Zephyr (5 per minute, 20 per day).
- With no `?redirect=`, the hub sends you to Plant (`http://localhost:5175`); in production it falls back to `https://grove.place`. Localhost redirects are only accepted in dev builds.
- The local Heartwood database is set up by `dev-stack.sh` from the three migrations Better Auth needs (`0001`, `0011`, `0015`). To start clean: `./scripts/dev-stack.sh reset`.

---

## Tenant Resolution

On localhost, Aspen defaults to the **"midnight-bloom"** tenant automatically — no subdomain needed.

To test a different tenant, use either:
- Query param: `http://localhost:5173/?subdomain=my-other-tenant`
- Header: `X-Subdomain: my-other-tenant`

Both methods are security-gated: they only work on localhost and are ignored in production.

---

## Seeding Data

The `blog` profile (default) seeds three tenants — enough to have something to look at, and enough to test cross-account features (Lantern friends, Reeds comments) between distinct accounts.

| Profile | What you get |
|---------|-------------|
| `blog` | Midnight Bloom tea shop + Driftwood & Ink bookshop + The Quiet Orchard, 3-4 posts and 2-4 pages each |
| `empty` | One tenant, no content |
| `fresh` | Migrations only, no tenant data |

Run a specific profile:

```bash
./scripts/dev-stack.sh seed blog
./scripts/dev-stack.sh seed empty
./scripts/dev-stack.sh seed fresh
```

Seed scripts live in `scripts/db/`. Local D1 data lives in `.wrangler/state/v3/d1/` — that directory is gitignored, so it's yours to mess with. `seed-tenant-002.sql` and `seed-tenant-003.sql` are local-only (unlike Midnight Bloom's tenant row, which also lives in a real migration) — they never touch production.

### The Three Seeded Accounts

| Tenant | Subdomain | Vibe |
|--------|-----------|------|
| The Midnight Bloom | `midnight-bloom` | Late-night tea café |
| Driftwood & Ink | `driftwood-ink` | Secondhand bookshop + letterpress |
| The Quiet Orchard | `quiet-orchard` | Small orchard journal |

`./scripts/dev-stack.sh` prints a demo login URL for each on startup. There are two different ways to "switch accounts" locally, for two different purposes:

- **Switch which grove you're viewing** — visit a tenant's demo login URL (`?demo=<secret>&subdomain=<x>`), or use `?subdomain=` / the `X-Subdomain` header from [Tenant Resolution](#tenant-resolution). This changes the page you're looking at, and by default also changes who you're logged in as (demo mode simulates the *viewed* tenant's owner).
- **Switch who you're logged in as, independent of the page you're viewing** — open Lantern (the floating nav panel) while in demo mode and use the "Demo Identity" column. This is what you need for cross-account testing: e.g. view Midnight Bloom's post while logged in as Driftwood & Ink's owner, so you can leave a Reeds comment or send a Lantern friend request that's genuinely from a different account.

---

## What's Not Local

A few things genuinely need the cloud:

| Thing | Why | Workaround |
|-------|-----|-----------|
| **Workers AI** | Always remote (Cloudflare's GPU infra) | May incur small charges; disable AI features locally if needed |
| **Stripe webhooks** | Needs a public URL to receive events | Use [ngrok](https://ngrok.com/) or a Cloudflare Tunnel for billing flow testing |
| **Email delivery** | Zephyr has no Resend key locally | Auth still completes; sign-in codes print in the Heartwood log (see [Email Code](#auth-setup-email-code)) |
| **CDN fonts** | Loads from `cdn.grove.place` | Works fine, just slightly slower on first load |

---

## Troubleshooting

**"Class extends value undefined" on startup**
The engine dist isn't built. Run `pnpm -r run package` from the repo root, then try again.

**Port already in use**
A stale wrangler process is probably running. Kill it:
```bash
pkill -f wrangler
```

**Auth not working / Google redirect fails**
Check that `services/heartwood/.dev.vars` exists and has real (not placeholder) `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` values. Also verify the redirect URI in Google Cloud Console matches exactly: `http://localhost:8787/api/auth/callback/google`.

**404 on the home page**
The D1 database exists but has no tenant data. Run:
```bash
./scripts/dev-stack.sh seed
```

**Wrangler fails with a migration error**
Migrations may be out of sync with your local state. Reset cleanly:
```bash
./scripts/dev-stack.sh reset
```
This deletes all local DB state and rebuilds from scratch.

**Changes to the engine aren't reflected**
If you edit anything in `libs/engine/src/lib/loom/` or other engine library code, rebuild:
```bash
pnpm -r run package
```
Then restart the dev stack.
