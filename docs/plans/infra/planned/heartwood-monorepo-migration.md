---
title: "Plan: Migrate Heartwood (GroveAuth) Into the Monorepo"
status: planned
category: infra
---

# Plan: Migrate Heartwood (GroveAuth) Into the Monorepo

## Context & Motivation

Heartwood (GroveAuth) currently lives in a separate repository at `~/Projects/GroveAuth`. This isolation was originally for security hardening, but in practice:

1. **Forced engine bumps** — The Heartwood frontend depends on `@autumnsgrove/lattice` via npm. Every engine change requires: bump version → publish to npm → update GroveAuth's `package.json`. Even if the fix is wrong and needs iteration, the version is already published.
2. **Constant context-switching** — Working on auth means constantly referencing a separate project, separate terminal, separate agent context. Debugging cross-repo issues requires juggling two codebases.
3. **Security isolation is a myth here** — The actual security hardening (rate limiting, PKCE, session encryption, CSP, audit logging, HSTS) lives in server-side code and Cloudflare infrastructure. Moving code between Git repositories doesn't change the security posture. The worker still deploys independently with its own secrets, D1 database, and KV namespace.

**After migration**: The Heartwood API worker becomes `services/heartwood/` in the monorepo. The Heartwood admin UI merges into the existing arbor admin panel. The internal codename "GroveAuth" is retired in favor of the public name "Heartwood" everywhere.

---

## Key Decisions

These decisions shape the entire migration:

| Decision                  | Choice                                              | Reasoning                                                                                                      |
| ------------------------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Package count**         | ONE new package (`services/heartwood/`)             | The API worker is the only independent deployable. The dashboard UI merges into arbor.                         |
| **Dashboard UI**          | Merge into `/arbor` admin panel in engine           | No need for two admin panels. Arbor already has auth, layout, and the AdminHeader pattern.                     |
| **Internal naming**       | Rename `groveauth` → `heartwood` everywhere in code | Unify on the public name. This is the chance to stop carrying two names.                                       |
| **Discord auth**          | Drop entirely                                       | Not using Discord for auth. Remove all Discord-related code, secrets, and config.                              |
| **Worker name**           | Keep `groveauth` in Cloudflare (for now)            | Secrets, D1 bindings, service bindings are tied to this name. Infrastructure rename is a separate future task. |
| **heartwood.grove.place** | Redirect to arbor or repurpose as info page         | Dashboard lives in arbor now; the standalone frontend is retired.                                              |
| **Git history**           | Copy files, don't merge history                     | Simpler; old repo stays archived for reference                                                                 |
| **Database**              | Keep separate D1 database                           | Auth data isolation is genuinely valuable                                                                      |

---

## What Heartwood Is (Current Architecture)

### API Worker (Hono.js on Cloudflare Workers)

- **Deployed to**: `auth-api.grove.place`
- **Framework**: Hono.js (not SvelteKit)
- **Entry**: `src/index.ts`
- **Auth library**: Better Auth (with passkey, magic link, TOTP plugins)
- **ORM**: Drizzle ORM
- **Database**: Own D1 database (`groveauth`, ID: `45eae4c7-...`)
- **Durable Objects**: `SessionDO` for per-user session management
- **KV**: `SESSION_KV` for Better Auth session cache
- **R2**: Shared `grove-cdn` bucket
- **Cron**: Minute-level keepalive + daily audit log cleanup
- **Secrets**: JWT keys, Google OAuth creds, Resend API key, session secret

### Frontend (SvelteKit — being dissolved into arbor)

- **Currently deployed to**: `heartwood.grove.place`
- **UI pages to migrate**: Security settings, device management, status page, CDN manager, Minecraft integration
- **UI pages NOT needed**: Login page (already handled by LoginGraft), standalone landing page

### Key Subsystems

| Subsystem            | Files                                                   | Concern                                     |
| -------------------- | ------------------------------------------------------- | ------------------------------------------- |
| **Better Auth**      | `src/auth/index.ts`                                     | OAuth, magic links, passkeys, TOTP          |
| **SessionDO**        | `src/durables/SessionDO.ts`, `src/lib/sessionBridge.ts` | Per-user session limits, device tracking    |
| **Rate Limiting**    | `src/middleware/rateLimit.ts`, `src/utils/constants.ts` | Token bucket per-endpoint protection        |
| **Audit Logging**    | `src/db/queries.ts::createAuditLog()`                   | Security event recording (90-day retention) |
| **JWT**              | `src/services/jwt.ts`                                   | RS256 signing/verification                  |
| **Email**            | `src/services/email.ts` (via `src/auth/`)               | Magic link delivery via Resend              |
| **Subscriptions**    | `src/routes/subscription.ts`                            | Tier management, post limits                |
| **Device Code Flow** | `src/routes/device.ts`, `src/templates/device.ts`       | RFC 8628 for CLI auth                       |
| **Admin API**        | `src/routes/admin.ts`                                   | Stats, user mgmt, audit log                 |
| **Status Page**      | `src/routes/status.ts`                                  | Incident management                         |
| **Minecraft**        | `src/routes/minecraft.ts`                               | Server integration                          |
| **CDN Manager**      | `src/routes/cdn.ts`                                     | File uploads                                |

### Database (D1)

**Separate from grove-engine-db** — Heartwood has its own D1 database with:

| Table Group          | Tables                                                                                  |
| -------------------- | --------------------------------------------------------------------------------------- |
| **Better Auth core** | `ba_user`, `ba_session`, `ba_account`, `ba_verification`, `ba_passkey`, `ba_two_factor` |
| **OAuth**            | `clients`, `allowed_emails`, `oauth_states`                                             |
| **Sessions**         | `user_sessions` (legacy), `rate_limits`, `failed_attempts`                              |
| **Subscriptions**    | `user_subscriptions`, `subscription_audit_log`                                          |
| **Device auth**      | `device_codes`                                                                          |
| **Security**         | `audit_log`                                                                             |
| **Content**          | `cdn_files`                                                                             |

**10 migration files** (numbered 0001-0010) manage schema evolution.

Also binds to **ENGINE_DB** (grove-engine-db) for email signup lookups and comped invites.

### Secrets (6 total after Discord removal)

```
JWT_PRIVATE_KEY, JWT_PUBLIC_KEY
GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
RESEND_API_KEY, SESSION_SECRET
```

Discord secrets (`DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`) will be removed.

---

## What Exists in the Engine Already

The engine already has auth-related code that serves as the **consumer side**:

| Path                           | Purpose                                                      | Changes Needed             |
| ------------------------------ | ------------------------------------------------------------ | -------------------------- |
| `engine/src/lib/auth/`         | Tenant ownership verification                                | None                       |
| `engine/src/lib/groveauth/`    | Client SDK (PKCE, errors, quotas, rate limiting, validation) | **Rename to `heartwood/`** |
| `engine/src/routes/auth/`      | OAuth callback, login page, logout                           | None                       |
| `engine/src/lib/grafts/login/` | LoginGraft component                                         | None                       |
| Landing `hooks.server.ts`      | Session validation via service binding                       | None                       |

---

## The Internal Rename: `groveauth` → `heartwood`

This is the chance to retire the internal codename and unify on the public name.

### What Gets Renamed

| Location                           | Before                                   | After                                    |
| ---------------------------------- | ---------------------------------------- | ---------------------------------------- |
| Engine lib directory               | `libs/engine/src/lib/groveauth/`     | `libs/engine/src/lib/heartwood/`     |
| Engine export path                 | `@autumnsgrove/lattice/groveauth`        | `@autumnsgrove/lattice/heartwood`        |
| Engine `package.json` exports      | `"./groveauth": { ... }`                 | `"./heartwood": { ... }`                 |
| All consumer imports               | `from '@autumnsgrove/lattice/groveauth'` | `from '@autumnsgrove/lattice/heartwood'` |
| Engine `src/lib/groveauth/` barrel | `groveauth/index.ts`                     | `heartwood/index.ts`                     |
| Engine error module                | `$lib/groveauth/errors`                  | `$lib/heartwood/errors`                  |
| Agent docs & skills                | References to "groveauth"                | References to "heartwood"                |

### Files That Import from `groveauth` (need updating)

Based on grep across the monorepo, ~30 files reference "groveauth":

**Engine package** (~15 files):

- `src/routes/auth/callback/+server.ts`
- `src/routes/arbor/account/+page.server.ts`
- `src/routes/arbor/account/types.ts`
- `src/routes/arbor/account/PasskeyCard.svelte`
- `src/routes/api/passkey/**`
- `src/lib/grafts/login/server/callback.ts`
- `src/lib/components/quota/UpgradePrompt.svelte`
- `src/lib/server/services/users.ts`
- `src/lib/index.ts`
- `package.json` (exports map)
- `vite.config.js`
- Test files

**Plant package** (~6 files):

- `src/routes/auth/callback/+server.ts`
- `src/routes/auth/magic-link/callback/+server.ts`
- `src/routes/account/+page.server.ts`
- `src/routes/api/account/passkey/**`
- `src/routes/+layout.server.ts`
- `src/app.d.ts`

**Other packages** (~5 files):

- `apps/landing/wrangler.toml` (service binding name — keep as-is)
- `apps/plant/wrangler.toml` (service binding name — keep as-is)
- `apps/domains/wrangler.toml` (service binding name — keep as-is)
- `services/grove-router/src/index.ts`
- `services/grove-router/tests/router.test.ts`

**Note**: `wrangler.toml` service bindings (`service = "groveauth"`) stay as-is because they reference the Cloudflare worker name, which remains `groveauth` for now.

### Backwards Compatibility (Temporary)

During the transition, add a re-export from the old path:

```typescript
// libs/engine/src/lib/groveauth/index.ts (temporary, remove after all consumers updated)
export * from "../heartwood/index.js";
```

And a temporary export alias in `package.json`:

```json
{
  "./groveauth": {
    "types": "./dist/heartwood/index.d.ts",
    "default": "./dist/heartwood/index.js"
  }
}
```

Remove these after all consumers are updated (same PR ideally).

---

## Dashboard UI → Arbor Merge

Instead of creating a separate `heartwood-ui` package, the Heartwood frontend dashboard pages merge into the existing arbor admin panel at `libs/engine/src/routes/arbor/`.

### Current Arbor Structure

```
arbor/
├── +page.svelte              # Admin dashboard home
├── +layout.svelte            # AdminHeader, shared layout
├── +layout.server.ts         # Auth check, permission gating
├── account/                  # Account settings (passkeys, 2FA already here)
├── analytics/                # Analytics dashboard
├── garden/                   # Blog post management
├── pages/                    # Static page management
├── curios/                   # Curio management (timeline, gallery, journey)
├── images/                   # Image management
├── settings/                 # Site settings
├── subscribers/              # Subscriber management
├── traces/                   # Debug traces
├── timeline/                 # Timeline admin
├── safety/                   # Safety/moderation
├── reserved-usernames/       # Username management
├── comped-invites/           # Invite management
└── ... (Wayfinder-only sections)
```

### Pages to Migrate from Heartwood Frontend → Arbor

| Heartwood Page           | Arbor Target             | Notes                                                                                             |
| ------------------------ | ------------------------ | ------------------------------------------------------------------------------------------------- |
| `dashboard/security/`    | `arbor/account/`         | **Already partially there** — arbor account has passkey/2FA. Merge any missing security settings. |
| `dashboard/devices/`     | `arbor/account/devices/` | New subsection under account                                                                      |
| `dashboard/status/`      | `arbor/status/`          | New arbor section — incident management, component status                                         |
| `dashboard/minecraft/`   | `arbor/minecraft/`       | New arbor section — server integration, modpack/world management                                  |
| `dashboard/cdn/`         | `arbor/cdn/`             | New arbor section — file upload/management                                                        |
| `dashboard/+page.svelte` | `arbor/+page.svelte`     | Merge any unique stats/widgets into existing arbor dashboard                                      |
| `login/`                 | **Skip**                 | Already handled by LoginGraft                                                                     |
| `callback/`              | **Skip**                 | Already handled by engine's `/auth/callback`                                                      |
| `+page.svelte` (landing) | **Skip**                 | No standalone Heartwood landing needed                                                            |
| `error/`                 | **Skip**                 | Engine already has error handling                                                                 |

### What This Means for `heartwood.grove.place`

Options (decide during implementation):

1. **Redirect to arbor** — `heartwood.grove.place` → `grove.place/arbor` (or the tenant's arbor)
2. **Info page** — Simple "Heartwood is Grove's authentication system" page with a link to arbor
3. **Retire the domain** — Remove the Cloudflare Pages project entirely

Recommendation: Option 1 or 3. No reason to maintain a separate site.

### Arbor API Integration

The Heartwood dashboard currently talks to `auth-api.grove.place` via fetch. After merging into arbor, these API calls can either:

1. **Stay as external fetch** to `auth-api.grove.place` (simplest, works immediately)
2. **Use the service binding** `platform.env.AUTH.fetch()` (better, matches engine pattern, avoids public internet)

Recommendation: Use service binding (option 2) since arbor already has access to `platform.env.AUTH` via the engine's wrangler.toml.

---

## Discord: Dropped

Discord OAuth is not being used. The following will be removed during migration:

### From Heartwood Worker

- `DISCORD_CLIENT_ID` and `DISCORD_CLIENT_SECRET` secrets (don't copy to new package)
- `DISCORD_CLIENT_ID` and `DISCORD_CLIENT_SECRET` from `Env` interface
- Any Discord-specific OAuth routes or provider config in Better Auth setup
- Discord references in `src/services/oauth.ts` (if any)
- Discord as an `OAuthProvider` type variant

### From Engine

- `discord` from `OAuthProvider` type in `src/lib/heartwood/types.ts` (after rename)
- Any Discord-specific UI in LoginGraft or login pages

### Verification

After removal, grep for `discord` (case-insensitive) across both packages to catch stragglers.

---

## Target Structure

```
packages/
├── heartwood/                    # NEW — Worker API (Hono.js)
│   ├── src/
│   │   ├── index.ts              # Hono app entry
│   │   ├── auth/                 # Better Auth configuration
│   │   │   └── index.ts
│   │   ├── routes/               # All API route handlers
│   │   │   ├── betterAuth.ts
│   │   │   ├── token.ts
│   │   │   ├── verify.ts
│   │   │   ├── session.ts
│   │   │   ├── admin.ts
│   │   │   ├── subscription.ts
│   │   │   ├── device.ts
│   │   │   ├── minecraft.ts
│   │   │   ├── cdn.ts
│   │   │   ├── status.ts
│   │   │   ├── health.ts
│   │   │   └── settings.ts
│   │   ├── middleware/            # Security, CORS, rate limiting
│   │   ├── db/                   # Schema, migrations, queries
│   │   ├── durables/             # SessionDO
│   │   ├── services/             # JWT, OAuth (Google only), email
│   │   ├── utils/                # Constants, crypto, validation
│   │   ├── lib/                  # Session utilities, bridges
│   │   ├── templates/            # HTML templates (device flow)
│   │   └── client/               # Auth utility functions
│   ├── migrations/               # D1 migration SQL files
│   ├── e2e/                      # Playwright tests
│   ├── package.json
│   ├── wrangler.toml             # Worker name stays "groveauth" for now
│   ├── tsconfig.json
│   ├── vitest.config.ts
│   └── worker-configuration.d.ts
│
├── engine/                       # MODIFIED
│   ├── src/lib/
│   │   ├── heartwood/            # RENAMED from groveauth/
│   │   │   ├── index.ts
│   │   │   ├── client.ts
│   │   │   ├── types.ts
│   │   │   ├── errors.ts
│   │   │   ├── limits.ts
│   │   │   ├── colors.ts
│   │   │   ├── rate-limit.ts
│   │   │   └── validation.ts
│   │   ├── auth/                 # UNCHANGED (tenant verification)
│   │   └── ...
│   ├── src/routes/arbor/
│   │   ├── ...existing sections...
│   │   ├── account/devices/      # NEW — migrated from heartwood frontend
│   │   ├── status/               # NEW — incident management
│   │   ├── minecraft/            # NEW — server integration
│   │   └── cdn/                  # NEW — file management
│   └── package.json              # Export renamed: ./groveauth → ./heartwood
│
├── landing/                      # MODIFIED (credits page updated)
├── plant/                        # MODIFIED (imports renamed)
├── ...
```

---

## Migration Phases

### Phase 0: Preparation (no code changes)

- [ ] Verify current GroveAuth deployment is stable and all tests pass
- [ ] Take a snapshot of GroveAuth repo state (tag `pre-monorepo-migration`)
- [ ] Document current deployment URLs and Cloudflare resource IDs
- [ ] Review open GroveAuth issues/PRs — close or note for post-migration
- [ ] Inventory Discord-related code to remove

### Phase 1: Copy Worker Code Into Monorepo

**Goal**: Get the Heartwood API worker building inside the monorepo.

- [ ] Create `services/heartwood/` directory
- [ ] Copy GroveAuth `src/`, `migrations/`, `e2e/`, `wrangler.toml`, `tsconfig.json`, `vitest.config.ts`, `worker-configuration.d.ts`
- [ ] Create `services/heartwood/package.json`:
  - Name: `grove-heartwood`
  - Private: true
  - Dependencies: better-auth, hono, drizzle-orm, jose, zod (no Discord packages)
- [ ] Remove Discord-related code from copied sources:
  - Strip `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET` from Env types and wrangler.toml
  - Remove Discord provider config from Better Auth setup
  - Remove Discord references from OAuth service
- [ ] Add `services/heartwood/` to `pnpm-workspace.yaml`
- [ ] Run `pnpm install` from root
- [ ] Verify `services/heartwood/` builds: `cd packages/heartwood && pnpm run typecheck`
- [ ] Verify tests pass: `cd packages/heartwood && pnpm run test:run`

### Phase 2: Internal Rename (groveauth → heartwood)

**Goal**: Unify naming across the monorepo.

- [ ] Rename `libs/engine/src/lib/groveauth/` → `libs/engine/src/lib/heartwood/`
- [ ] Update `libs/engine/package.json` exports:
  - Change `"./groveauth"` → `"./heartwood"`
  - Temporarily keep `"./groveauth"` as alias pointing to heartwood (remove after all consumers updated)
- [ ] Update all engine internal imports (`$lib/groveauth/*` → `$lib/heartwood/*`)
- [ ] Update plant package imports (`@autumnsgrove/lattice/groveauth` → `@autumnsgrove/lattice/heartwood`)
- [ ] Update all other consumer imports across the monorepo
- [ ] Update grove-router references if needed
- [ ] Run `svelte-package -o dist` in engine to rebuild exports
- [ ] Verify all packages build after rename
- [ ] Remove temporary `./groveauth` alias from engine exports

### Phase 3: Merge Dashboard UI Into Arbor

**Goal**: Bring Heartwood's admin pages into the engine's arbor panel.

- [ ] **Devices page**: Copy `frontend/src/routes/dashboard/devices/` → `engine/src/routes/arbor/account/devices/`
  - Adapt imports to use engine patterns (`$lib/heartwood/*`, engine UI components)
  - Wire up API calls via `platform.env.AUTH.fetch()` service binding
- [ ] **Status page**: Copy `frontend/src/routes/dashboard/status/` → `engine/src/routes/arbor/status/`
  - Migrate incident management UI
  - Adapt component status display
- [ ] **Minecraft page**: Copy `frontend/src/routes/dashboard/minecraft/` → `engine/src/routes/arbor/minecraft/`
  - Migrate server control, modpack, and world management
- [ ] **CDN manager**: Copy `frontend/src/routes/dashboard/cdn/` → `engine/src/routes/arbor/cdn/`
  - Migrate file upload/download UI
- [ ] **Dashboard widgets**: Review `frontend/src/routes/dashboard/+page.svelte` for any stats/widgets not already in arbor
  - Merge unique widgets into `arbor/+page.svelte`
- [ ] **Security settings**: Compare `frontend/src/routes/dashboard/security/` with `arbor/account/`
  - Merge any missing security features
- [ ] Add navigation items for new sections to arbor's AdminHeader/sidebar
- [ ] Gate new sections appropriately (Wayfinder-only vs all admins)

### Phase 4: Copy Documentation & Tests

- [ ] Copy `GROVEAUTH_SPEC.md` → `docs/specs/heartwood-spec.md` (update existing or replace)
- [ ] Copy `docs/OAUTH_CLIENT_SETUP.md` → `docs/setup/oauth-client-setup.md` (may already exist)
- [ ] Copy `docs/INTEGRATION_GUIDE.md` → `docs/developer/integration/heartwood-integration.md` (note the name change)
- [ ] Copy e2e tests and verify Playwright config works from new location
- [ ] Copy unit tests and verify vitest runs from new location
- [ ] Update all docs to use "Heartwood" instead of "GroveAuth" where referencing internal code

### Phase 5: Update References & Housekeeping

- [ ] Update `.claude/skills/heartwood-auth` skill to reference new package locations
- [ ] Update `AGENT.md` references — remove all `~/Projects/GroveAuth/` paths, update to `services/heartwood/`
- [ ] Update the turtle hardening plan (`docs/plans/planned/turtle-hardening-plan.md`) which references `GroveAuth/` paths
- [ ] Update agent memory (`MEMORY.md`) with new paths
- [ ] **Update credits page** (`apps/landing/src/routes/credits/+page.svelte`) — add Heartwood as a package/component
- [ ] Rename "GroveAuth" to "Heartwood" in any remaining user-facing or developer-facing text

### Phase 6: CI/CD Setup

- [ ] Add `services/heartwood/` to GitHub Actions workflows
  - Worker deployment: `cd packages/heartwood && wrangler deploy`
  - Type checking: `cd packages/heartwood && pnpm run typecheck`
  - Tests: `cd packages/heartwood && pnpm run test:run`
- [ ] Verify deployment target matches existing Cloudflare project
  - Worker name in wrangler.toml: `groveauth` (kept for infrastructure compatibility)
- [ ] Verify engine build succeeds with renamed exports

### Phase 7: Deployment Verification

- [ ] Deploy `services/heartwood/` to Cloudflare Workers — verify `auth-api.grove.place` responds
- [ ] Test full OAuth flow: Google sign-in → callback → session created
- [ ] Test session validation from engine: `POST /session/validate` via service binding
- [ ] Test passkey registration and authentication
- [ ] Test magic link flow
- [ ] Verify cron jobs run (keepalive + audit cleanup)
- [ ] Test new arbor sections (devices, status, minecraft, cdn) load and function
- [ ] Test that `heartwood.grove.place` redirects or shows appropriate message
- [ ] Verify credits page shows Heartwood

### Phase 8: Archive Old Repository

- [ ] Tag final state: `git tag archived-monorepo-migration`
- [ ] Update GroveAuth README: "This repository has been archived. Heartwood now lives in the Lattice monorepo at `services/heartwood/`."
- [ ] Archive the repository on GitHub (Settings → Archive)
- [ ] Retire `heartwood.grove.place` Cloudflare Pages project (or redirect)
- [ ] Remove Discord secrets from Cloudflare: `wrangler secret delete DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET`
- [ ] Update any bookmarks, documentation, or wiki links

---

## What Does NOT Change

| Aspect                             | Before                                                | After                  | Changed?                                  |
| ---------------------------------- | ----------------------------------------------------- | ---------------------- | ----------------------------------------- |
| Worker name (Cloudflare)           | `groveauth`                                           | `groveauth`            | No (infrastructure rename is future work) |
| API domain                         | `auth-api.grove.place`                                | `auth-api.grove.place` | No                                        |
| D1 database                        | `groveauth` (ID: 45eae4c7...)                         | Same                   | No                                        |
| D1 database ID                     | `45eae4c7-8ae7-4078-9218-8e1677a4360f`                | Same                   | No                                        |
| ENGINE_DB binding                  | `a6394da2-b7a6-48ce-b7fe-b1eb3e730e68`                | Same                   | No                                        |
| KV namespace                       | `7cfbd9e67125405994b49ecf80a372a4`                    | Same                   | No                                        |
| SessionDO class                    | `SessionDO`                                           | Same                   | No                                        |
| Service binding from consumer apps | `AUTH → groveauth`                                    | Same                   | No                                        |
| Session cookies                    | `grove_session`, `__Secure-better-auth.session_token` | Same                   | No                                        |
| Auth flow                          | Better Auth + PKCE + SessionDO bridge                 | Same                   | No                                        |

**Zero downtime.** The Cloudflare worker name stays the same. Deployments just come from a different directory.

---

## What DOES Change

| Aspect             | Before                                     | After                                | Benefit                         |
| ------------------ | ------------------------------------------ | ------------------------------------ | ------------------------------- |
| Code location      | `~/Projects/GroveAuth/`                    | `services/heartwood/`                | Single monorepo, single context |
| Dashboard UI       | Separate site at `heartwood.grove.place`   | Merged into `/arbor` admin panel     | One admin panel, not two        |
| Internal naming    | `groveauth` in code, `heartwood` in public | `heartwood` everywhere               | No more dual naming confusion   |
| Engine import path | `@autumnsgrove/lattice/groveauth`          | `@autumnsgrove/lattice/heartwood`    | Name matches public identity    |
| Discord auth       | Configured but unused                      | Removed                              | Less dead code, fewer secrets   |
| Engine dependency  | `^0.9.96` (npm)                            | N/A (UI merged into engine directly) | No version bumping at all       |
| Secrets count      | 8                                          | 6                                    | Cleaner secret management       |
| CI/CD              | Separate GitHub Actions                    | Unified monorepo CI                  | One pipeline                    |
| Credits page       | Missing Heartwood                          | Heartwood listed                     | Proper attribution              |

---

## Risks & Mitigations

### Risk: Breaking worker deployment

**Severity**: High
**Mitigation**: The `wrangler.toml` is identical (same worker name, same D1 IDs, same KV IDs). Deployment is directory-agnostic — Cloudflare doesn't care where the code lives on disk.

### Risk: Import rename breaks consumers

**Severity**: Medium
**Mitigation**: The rename (`groveauth` → `heartwood`) is done in a single PR that updates all ~30 files. Temporary re-export alias from old path provides safety net. Engine rebuild (`svelte-package -o dist`) happens before consumer updates.

### Risk: Arbor UI merge introduces bugs

**Severity**: Medium
**Mitigation**: This is the highest-risk phase. Each page (devices, status, minecraft, cdn) should be migrated and tested individually. The Heartwood API endpoints are unchanged — only the UI consuming them moves.

### Risk: D1 migrations confusion

**Severity**: Medium
**Mitigation**: Migrations are idempotent SQL files. They reference the same database ID. Moving the files doesn't change what they do.

### Risk: SessionDO state

**Severity**: Low
**Mitigation**: Durable Objects are bound by class name (`SessionDO`), not by deployment source. As long as the class name and migration tags stay the same, existing DO instances persist.

### Risk: Secrets not available

**Severity**: High
**Mitigation**: Secrets are bound to the **worker name** (`groveauth`), not the repo. Since the worker name stays the same, all 6 remaining secrets stay available. Verify with `wrangler secret list` after first deployment.

### Risk: pnpm workspace conflicts

**Severity**: Low
**Mitigation**: Heartwood's dependencies (hono, drizzle-orm, jose) are unique to it — no version conflicts with other packages.

---

## Dependency Inventory

### heartwood (Worker) — New Dependencies to Add

| Package                  | Version | Purpose                                |
| ------------------------ | ------- | -------------------------------------- |
| `hono`                   | ^4.10.7 | HTTP framework for worker              |
| `drizzle-orm`            | 0.44.5  | Database ORM (Better Auth requirement) |
| `jose`                   | ^6.1.3  | JWT operations                         |
| `zod`                    | ^4.1.13 | Input validation                       |
| `better-auth`            | ^1.4.10 | Auth framework                         |
| `better-auth-cloudflare` | ^0.2.9  | Cloudflare adapter for Better Auth     |
| `@better-auth/passkey`   | ^1.4.10 | Passkey/WebAuthn plugin                |

### Removed (Discord)

| Package                        | Reason                 |
| ------------------------------ | ---------------------- |
| Any Discord OAuth packages     | Not using Discord auth |
| `DISCORD_CLIENT_ID` secret     | Removed                |
| `DISCORD_CLIENT_SECRET` secret | Removed                |

---

## Post-Migration Opportunities

Once Heartwood is in the monorepo, several improvements become trivial:

1. **Shared type definitions** — The `Env` interface, user types, session types can be shared between heartwood and engine without publishing
2. **Unified testing** — `gw test` from root runs all tests including heartwood
3. **Atomic auth changes** — Fix a session validation bug in heartwood AND update the consumer code in engine in a single commit
4. **Better Auth version alignment** — The engine's `heartwood/client.ts` and heartwood's server can share the same `better-auth` version
5. **Shared rate limiting** — The engine already has rate limiting utilities (`engine/src/lib/heartwood/rate-limit.ts`); heartwood has its own. These can be consolidated
6. **Consolidated error codes** — Error definitions in `engine/src/lib/heartwood/errors.ts` and `heartwood/src/routes/` can share a single source of truth
7. **Future worker rename** — Once stable, rename the Cloudflare worker from `groveauth` to `heartwood` (requires re-uploading secrets, updating all wrangler.toml service bindings)

---

## Security Considerations

### What Security Properties Are Preserved

| Property                   | How It's Maintained                                                            |
| -------------------------- | ------------------------------------------------------------------------------ |
| **Isolated D1 database**   | Heartwood keeps its own D1 (`groveauth`), not shared with grove-engine-db      |
| **Separate secrets**       | 6 secrets bound to `groveauth` worker name, inaccessible to other packages     |
| **Independent deployment** | Worker deploys separately from engine; a bad engine deploy doesn't affect auth |
| **PKCE enforcement**       | Code doesn't change; PKCE is enforced in Better Auth config                    |
| **Session encryption**     | SessionDO + cookie encryption unchanged                                        |
| **Rate limiting**          | All rate limits preserved in middleware                                        |
| **Audit logging**          | All audit events still logged, 90-day retention still enforced                 |
| **CSP headers**            | Security headers middleware unchanged                                          |

### What Improves

- **Faster security patches** — Fix a vulnerability and deploy without waiting for npm publish cycle
- **Unified security audits** — The turtle hardening plan can audit both codebases in one session
- **Consistent dependencies** — No version drift between engine and heartwood for shared packages
- **Smaller attack surface** — Discord auth code removed; fewer unused code paths

---

## Estimated Scope

| Phase                            | Effort   | Risk        |
| -------------------------------- | -------- | ----------- |
| Phase 0: Preparation             | ~30 min  | None        |
| Phase 1: Copy worker code        | ~2 hours | Low         |
| Phase 2: Internal rename         | ~2 hours | Medium      |
| Phase 3: Dashboard UI → arbor    | ~4 hours | Medium-High |
| Phase 4: Docs & tests            | ~1 hour  | Low         |
| Phase 5: Update references       | ~1 hour  | Low         |
| Phase 6: CI/CD setup             | ~1 hour  | Medium      |
| Phase 7: Deployment verification | ~1 hour  | Medium      |
| Phase 8: Archive old repo        | ~30 min  | None        |

**Total estimated effort**: ~13 hours across 3-4 sessions

Phase 3 (arbor merge) is the largest and riskiest — it involves adapting UI components to a new context. Everything else is mechanical.

---

## Implementation Order Recommendation

The phases are ordered to minimize risk:

1. **Phases 0-1** (Session 1): Get the worker building in the monorepo. Verify deployment works. This is the foundation — everything else depends on it.
2. **Phase 2** (Session 2): Internal rename. This is a big search-and-replace but low risk since it's all within the monorepo. Verify all packages build.
3. **Phases 3-5** (Session 3): Dashboard merge + docs + reference updates. This is the creative work — adapting UI to fit arbor's patterns. Do one page at a time.
4. **Phases 6-8** (Session 4): CI/CD, verification, archive. This is the "go live" session.
