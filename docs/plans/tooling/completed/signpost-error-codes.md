---
title: Signpost — Grove Error Code System
description: Structured error codes across all Grove packages, so every failure tells you where to look
category: plans
specCategory: developer-experience
icon: alert-triangle
lastUpdated: "2026-02-07"
aliases: []
date created: Friday, February 7th 2026
date modified: Friday, February 7th 2026
tags:
  - error-handling
  - developer-experience
  - infrastructure
type: implementation-plan
---

# Signpost — Grove Error Code System

```
                    ╭─────────────╮
                    │  GROVE-042  │
                    ╰──────┬──────╯
                           │
                     ┌─────┴─────┐
                     │  ◈  ◈  ◈  │
                     │ what broke │
                     │ who can    │
                     │ fix it     │
                     │ what to do │
                     └─────┬─────┘
                           │
                      ╱╱╱╱╱│╲╲╲╲╲
                     ╱  ╱  │  ╲  ╲
                    ·  ·   │   ·  ·
                           │
                    ═══════╧═══════

           Every error tells you where to look.
```

> _Every error tells you where to look._

When something breaks in Grove right now, you see "Something went wrong." That's useless at 2 AM when you're trying to figure out if it's a D1 binding, a cookie issue, or a missing config. You have to dig through Worker logs, guess which package threw it, and grep for the string.

Two packages already have proper error codes: Heartwood auth (`HW-AUTH-XXX`) and Plant onboarding (`PLANT-XXX`). They work beautifully. When you see `PLANT-040`, you know instantly it's an onboarding database query failure. The goal is to bring that clarity to the entire ecosystem.

**Public Name:** Signpost
**Internal Name:** GroveSignpost
**Status:** In Progress (Phase 0)

A signpost at a fork in the trail tells you which path leads where. You don't have to guess. You don't have to retrace your steps. You read the sign, you know where you are, you know where to go. That's what every error in Grove should do.

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [The Shared Type](#the-shared-type)
4. [Error Flow](#error-flow)
5. [Package Error Prefixes](#package-error-prefixes)
6. [Code Range Convention](#code-range-convention)
7. [Error Inventory](#error-inventory)
8. [Shared Helpers](#shared-helpers)
9. [App.Error Augmentation](#apperror-augmentation)
10. [ErrorNotice Component](#errornotice-component)
11. [Backward Compatibility](#backward-compatibility)
12. [Lumen Errors](#lumen-errors)
13. [Implementation Phases](#implementation-phases)
14. [Edge Cases](#edge-cases)
15. [Verification](#verification)

---

## Overview

**The outcome:** Every error surface in Grove carries a unique, structured code. You see the code, you know the package, the category, and the fix.

**What exists today:**

- `HW-AUTH-XXX` in `libs/engine/src/lib/heartwood/errors.ts` (complete)
- `PLANT-XXX` in `apps/plant/src/lib/errors.ts` (complete)
- ~750 hardcoded error strings everywhere else

**What we're building:**

- A shared `GroveErrorDef` type in the engine that all packages import
- Error catalogs for every package with namespaced prefixes
- Shared helpers for logging, URL building, JSON responses, and SvelteKit errors
- An `ErrorNotice` component for consistent error display
- Backward-compatible wrappers so existing imports don't break

---

## Architecture

### Shared Foundation in Engine

```
libs/engine/src/lib/errors/
  types.ts       shared GroveErrorDef, ErrorCategory
  helpers.ts     logGroveError(), buildErrorUrl(), buildErrorJson(), throwGroveError()
  index.ts       barrel export
```

Export path in `libs/engine/package.json`:

```json
"./errors": {
  "types": "./dist/errors/index.d.ts",
  "default": "./dist/errors/index.js"
}
```

Consumer import:

```typescript
import {
  type GroveErrorDef,
  logGroveError,
  buildErrorUrl,
} from "@autumnsgrove/lattice/errors";
```

---

## The Shared Type

Both `AuthErrorDef` and `PlantErrorDef` are structurally identical. They become a single type:

```typescript
export type ErrorCategory = "user" | "admin" | "bug";

export interface GroveErrorDef {
  code: string; // e.g. "GROVE-API-040"
  category: ErrorCategory;
  userMessage: string; // warm, safe for display
  adminMessage: string; // detailed, for logs
}
```

---

## Error Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                    Something Goes Wrong                          │
└───────────────────────────┬──────────────────────────────────────┘
                            │
                            ▼
┌──────────────────────────────────────────────────────────────────┐
│  1. Look up error in package catalog                            │
│     LANDING_ERRORS.DB_UNAVAILABLE                               │
│                                                                  │
│  2. Log with structured context (no secrets)                    │
│     logGroveError('Landing', error, { path, cause })            │
│                                                                  │
│  3. Surface to user via the right channel                       │
└───────┬──────────────┬───────────────┬───────────────────────────┘
        │              │               │
        ▼              ▼               ▼
  ┌──────────┐  ┌──────────────┐  ┌──────────────┐
  │ Redirect │  │  JSON API    │  │ SvelteKit    │
  │ ?error=  │  │ { error,     │  │ throw error  │
  │ &error_  │  │   error_code │  │ (status, {   │
  │  code=   │  │ }            │  │   message,   │
  │          │  │              │  │   code })    │
  └────┬─────┘  └──────┬───────┘  └──────┬───────┘
       │               │                 │
       ▼               ▼                 ▼
  ┌──────────┐  ┌──────────────┐  ┌──────────────┐
  │ ErrorNo- │  │ Client-side  │  │ +error.svelte│
  │ tice     │  │ error        │  │ renders code │
  │ GlassCard│  │ handling     │  │ in monospace │
  └──────────┘  └──────────────┘  └──────────────┘
```

---

## Package Error Prefixes

| Package               | Prefix            | File Location                                     |
| --------------------- | ----------------- | ------------------------------------------------- |
| Engine (API routes)   | `GROVE-API-XXX`   | `libs/engine/src/lib/errors/api-errors.ts`    |
| Engine (Arbor admin)  | `GROVE-ARBOR-XXX` | `libs/engine/src/lib/errors/arbor-errors.ts`  |
| Engine (Public pages) | `GROVE-SITE-XXX`  | `libs/engine/src/lib/errors/site-errors.ts`   |
| Heartwood (Auth)      | `HW-AUTH-XXX`     | **Already exists**                                |
| Heartwood (Sessions)  | `HW-SESS-XXX`     | `services/heartwood/src/errors/session-errors.ts` |
| Plant (Onboarding)    | `PLANT-XXX`       | **Already exists**                                |
| Landing               | `GROVE-LAND-XXX`  | `apps/landing/src/lib/errors.ts`              |
| Domains               | `GROVE-DOM-XXX`   | `apps/domains/src/lib/errors.ts`              |
| Clearing              | `GROVE-CLR-XXX`   | `apps/clearing/src/lib/errors.ts`             |

---

## Code Range Convention

All packages follow the same numbering scheme:

| Range   | Category                                                |
| ------- | ------------------------------------------------------- |
| 001-019 | Service bindings, infrastructure (D1/KV/R2 unavailable) |
| 020-039 | Auth, session, CSRF, origin validation                  |
| 040-059 | Business logic, data validation                         |
| 060-079 | Rate limiting, security                                 |
| 080-099 | Internal / catch-all                                    |

---

## Error Inventory

Approximate hardcoded error count by package:

| Package   | Files | Hardcoded Errors   | Priority               |
| --------- | ----- | ------------------ | ---------------------- |
| Engine    | ~70   | ~596               | High (largest surface) |
| Landing   | ~20   | ~67                | Medium                 |
| Domains   | ~12   | ~67                | Medium                 |
| Plant     | ~25   | ~14 remaining      | Low (mostly done)      |
| Heartwood | ~8    | ~30 JSON responses | Medium                 |
| Clearing  | ~2    | ~5                 | Low                    |

---

## Shared Helpers

### `logGroveError(prefix, error, context)`

Structured logging. Sanitizes `cause` to extract message only. Never logs tokens, secrets, or passwords.

```typescript
logGroveError("Landing", LANDING_ERRORS.DB_UNAVAILABLE, {
  path: "/blog",
  cause: err,
});
// → [Landing] GROVE-LAND-001: D1 database binding unavailable {"code":"GROVE-LAND-001",...}
```

### `buildErrorUrl(error, baseUrl, extra)`

Builds `/?error=message&error_code=CODE` for redirect-based error display. Same pattern Plant uses today.

```typescript
const url = buildErrorUrl(PLANT_ERRORS.SESSION_FETCH_FAILED, "/");
// → /?error=We+couldn't+verify...&error_code=PLANT-020
```

### `buildErrorJson(error)`

Returns `{ error: code, error_code: code, error_description: userMessage }` for JSON API responses. Compatible with Heartwood's existing format.

```typescript
return c.json(buildErrorJson(AUTH_ERRORS.RATE_LIMITED), 429);
// → { "error": "HW-AUTH-060", "error_code": "HW-AUTH-060", "error_description": "Too many..." }
```

### `throwGroveError(status, error, prefix, context)`

Calls SvelteKit's `error()` with augmented `App.Error` body: `{ message, code, category }`. Logs first, then throws.

```typescript
throwGroveError(500, GROVE_API_ERRORS.DB_UNAVAILABLE, "Engine", {
  path: url.pathname,
});
// logs → [Engine] GROVE-API-001: ...
// throws → error(500, { message: "...", code: "GROVE-API-001", category: "bug" })
```

### `toastError(error)`

Client-side helper. Wraps `toast.error(error.userMessage, { description: error.code })` for admin pages.

---

## App.Error Augmentation

To surface error codes through SvelteKit's error pages:

```typescript
// libs/engine/src/app.d.ts
declare global {
  namespace App {
    interface Error {
      message: string;
      code?: string;
      category?: string;
    }
  }
}
```

Then `+error.svelte` renders the code in monospace when present. Same visual pattern Plant already uses.

---

## ErrorNotice Component

Three login pages (Engine, Domains, Landing) and Plant's homepage all render nearly identical error display markup. Extract to a shared engine component:

`libs/engine/src/lib/ui/components/feedback/ErrorNotice.svelte`

```
┌─────────────────────────────────────────────────────────────┐
│  ⚠  Your sign-in session wasn't found.                     │
│     Please request a new magic link.                        │
│                                                             │
│     PLANT-021                                               │
└─────────────────────────────────────────────────────────────┘
```

- Props: `error`, `errorCode`, `variant` (inline | card)
- Card variant: GlassCard with red border, AlertTriangle icon, monospace code
- Inline variant: lighter weight for embedding in forms

---

## Backward Compatibility

Existing imports continue to work with zero changes:

**Heartwood errors.ts**: `AuthErrorDef` becomes a type alias for `GroveErrorDef`. All existing exports preserved. `logAuthError` and `buildErrorParams` become thin wrappers around shared helpers.

```typescript
// Before (still works)
import { AUTH_ERRORS, logAuthError, AuthErrorDef } from "$lib/heartwood/errors";

// After (also works)
import { GroveErrorDef, logGroveError } from "@autumnsgrove/lattice/errors";
```

**Plant errors.ts**: Same approach. `PlantErrorDef = GroveErrorDef`. `logPlantError` wraps `logGroveError('Plant', ...)`. Every existing import still works.

---

## Lumen Errors

The Lumen AI error system uses a class-based pattern (`LumenError extends Error`) with runtime context (provider, retryable, etc.). Leave it as-is. When Lumen errors surface in API routes, the route handler maps them to `GROVE-API-XXX` codes.

---

## Implementation Phases

### Phase 0: Shared Infrastructure

**Cannot be parallelized. Foundation for everything.**

1. Create `libs/engine/src/lib/errors/` (types.ts, helpers.ts, index.ts)
2. Add `"./errors"` to engine `package.json` exports
3. Run `svelte-package -o dist`
4. Migrate heartwood/errors.ts to use shared types (type alias, no behavioral change)
5. Migrate plant/errors.ts to use shared types (thin wrappers)
6. Verify all existing imports still resolve

**Key files:**

- `libs/engine/src/lib/errors/types.ts` (new)
- `libs/engine/src/lib/errors/helpers.ts` (new)
- `libs/engine/src/lib/errors/index.ts` (new)
- `libs/engine/package.json` (add export)
- `libs/engine/src/lib/heartwood/errors.ts` (migrate types)
- `apps/plant/src/lib/errors.ts` (migrate types)

### Phase 1: Engine Error Catalogs + App.Error

**Can split across 2-3 agents by catalog file.**

1. Create `api-errors.ts`, `arbor-errors.ts`, `site-errors.ts`
2. Augment `App.Error` in `src/app.d.ts`
3. Upgrade `+error.svelte` to display error codes
4. Create `throwGroveError` helper
5. Replace `throw error(...)` calls across engine files

**Grouping for parallel work:**

- API routes (~45 files)
- Arbor admin pages (~15 files)
- Public site pages (~10 files)

### Phase 2: Landing + Domains + Clearing

**All three can run in parallel.**

For each: create `src/lib/errors.ts`, define error catalog, replace hardcoded strings.

### Phase 3: Heartwood Sessions + Subscriptions

**Can run alongside Phase 2.**

1. Create `services/heartwood/src/errors/session-errors.ts`
2. Create Hono `jsonError()` helper
3. Replace `c.json({ error: "..." })` calls

### Phase 4: ErrorNotice Component + Plant Expansion

**Can overlap with Phase 3.**

1. Create `ErrorNotice.svelte` in engine feedback components
2. Export through feedback barrel
3. Migrate login pages and Plant homepage to use it
4. Expand Plant error catalog for remaining passkey/verify routes

### Phase 5: Toast Enhancement + Audit

**Final cleanup pass.**

1. Add `toastError()` helper
2. Migrate high-value arbor toast calls
3. Final grep for remaining "Something went wrong" strings

---

## Edge Cases

1. **SvelteKit redirect re-throws**: `throwGroveError` calls `throw error()` which can be caught by outer try blocks. The existing `isRedirect()` check pattern must be preserved.

2. **Prerendered pages**: Landing knowledge pages can't access `platform.env`. Errors here are build-time. Use plain `error()` without structured logging.

3. **Engine rebuild**: After adding the `./errors` export, run `svelte-package -o dist` before consumer packages can import.

4. **Error code uniqueness**: Enforced by prefix namespacing across packages. Within a package, add a simple dev-mode uniqueness check.

5. **Heartwood is Hono**: `throwGroveError` (SvelteKit) must not be used in Heartwood. Use `jsonError` (Hono) instead.

6. **Toast scope**: Not every `toast.error()` needs a structured code. Client-side validation ("Title is required") stays as inline strings. Focus codes on server-side errors the Wayfinder needs to diagnose.

7. **Plant OAuth callback dual system**: `auth/callback/+server.ts` has its own `ERROR_MESSAGES` map alongside `PLANT_ERRORS`. Consolidate so OAuth errors reference `HW-AUTH-XXX` codes from engine.

---

## Verification

1. **Type check**: `npx svelte-check --tsconfig ./tsconfig.json` in each modified package
2. **Import resolution**: After engine rebuild, verify consumer packages can `import { GroveErrorDef } from '@autumnsgrove/lattice/errors'`
3. **Backward compat**: Verify `import { PLANT_ERRORS, logPlantError } from '$lib/errors'` still works in Plant
4. **Visual check**: Load Plant homepage with `?error=test&error_code=PLANT-001` and verify GlassCard renders
5. **Error page check**: Trigger a 404 in engine and verify `+error.svelte` renders the code
6. **Log check**: Run dev server, trigger an error, verify structured JSON appears in console
7. **Grep audit**: `rg "Something went wrong" packages/` should return zero hits when done

---

_A signpost stands where paths diverge. It doesn't fix the road. It tells you where you are._
