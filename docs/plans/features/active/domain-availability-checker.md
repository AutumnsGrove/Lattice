---
title: "Domain Availability Checker — Implementation Plan"
status: active
category: features
lastUpdated: "2026-02-27"
---

# Domain Availability Checker — Implementation Plan

## Overview

A self-service domain availability checker that lives as a reusable Svelte component, displayed as a popup modal triggered from near the username change field in Arbor Settings. Also available as a standalone page at `/arbor/domain`. Visible to all tiers — lower tiers see a gentle upgrade prompt alongside the checker, Oak+ users see the full experience.

The UX mirrors the existing username availability checker from the Plant signup flow: debounced input, real-time RDAP checks, clear available/taken/error states. No suggestions in v1 — keep it simple, iterate later.

---

## Architecture

### 1. API Endpoint — `/api/check-domain`

**File**: `libs/engine/src/routes/api/check-domain/+server.ts`

- **Method**: GET
- **Query param**: `?domain=example.com`
- **Response**: `{ domain, status: "available" | "registered" | "unknown", registrar?, error? }`
- **Auth**: Requires authenticated session (rate limit abuse prevention)
- **Rate limiting**: Use existing engine rate limiting (e.g., 10 checks per minute)

The implementation copies the slim RDAP logic from `services/forage/src/rdap.ts` — specifically the `fetchRdapBootstrap()` and `checkDomain()` functions. This avoids cross-worker service binding overhead and keeps it self-contained, following the same pattern as `/api/check-username`.

**Key behavior:**
- Normalize input: lowercase, trim, strip protocol/path if someone pastes a URL
- Validate format (must contain a dot, valid TLD chars)
- Bootstrap RDAP cache in KV for fast repeated lookups (optional optimization)
- Return structured result

### 2. Svelte Component — `DomainChecker.svelte`

**File**: `libs/engine/src/lib/ui/components/domain/DomainChecker.svelte`

A reusable component that contains:
- Text input with `.com` suffix hint (similar to the `.grove.place` suffix in username checker)
- Debounced RDAP check (300ms, same as username checker)
- Status indicator: idle → checking (spinner) → available (check) → taken (X) → error
- Current address display: "Your grove is at **username.grove.place**"
- Tier-aware messaging:
  - **Oak+ users**: "This domain is available! Contact us to set it up." (or future self-service)
  - **Lower tiers**: "Custom domains are available on the Oak plan. [See plans →]"
- The component accepts props for `variant: "inline" | "modal"` to control layout

**UI Pattern** (mirrors Plant username checker):
```
┌─────────────────────────────────────────┐
│  🌐 Check Domain Availability           │
│                                         │
│  Your grove lives at autumn.grove.place  │
│  Want your own address?                 │
│                                         │
│  ┌─────────────────────────────┐        │
│  │ coolname.com            ✓  │        │
│  └─────────────────────────────┘        │
│  ✓ coolname.com is available!           │
│                                         │
│  Custom domains are available on the    │
│  Oak plan. See plans →                  │
│                                         │
│  Need help finding the perfect domain?  │
│  Reach out and we'll run Forage for you │
└─────────────────────────────────────────┘
```

### 3. Modal Wrapper — `DomainCheckerModal.svelte`

**File**: `libs/engine/src/lib/ui/components/domain/DomainCheckerModal.svelte`

Wraps `DomainChecker` in a modal dialog, following the same accessible modal pattern used by `UpgradePrompt.svelte` and `GlassConfirmDialog`:
- Focus trap
- Escape to close
- Backdrop click to close
- ARIA attributes
- Focus restoration on close

Props: `open: boolean`, `onClose: () => void`, `userTier: TierKey`, `username: string`

### 4. Trigger CTA — Near Username Change

In the Arbor Settings page, near the username change field (being built by another agent), add a small contextual upsell:

```
┌─────────────────────────────────────────┐
│  ✨ Want your own domain?               │
│  Check if your dream .com is available  │
│  [Check Availability]                   │
└─────────────────────────────────────────┘
```

This is a small, warm `div` (not a full GlassCard — just a subtle prompt) that opens the `DomainCheckerModal`. It should feel like a helpful suggestion, not a sales pitch.

**Implementation note**: Since the username change feature is being built by another agent on a different branch, we'll add a standalone GlassCard section that will naturally sit near it. We won't modify the username change code — just place the domain CTA in a logical position that will work well with or without the username field nearby.

### 5. Dedicated Page — `/arbor/domain`

**Files**:
- `libs/engine/src/routes/arbor/domain/+page.svelte`
- `libs/engine/src/routes/arbor/domain/+page.server.ts`

A standalone page that renders `DomainChecker` in `inline` variant (not modal). The page server load passes the user's tier and username. This gives a direct link that can be shared or accessed from nav.

---

## File Inventory

| # | File | Action | Description |
|---|------|--------|-------------|
| 1 | `libs/engine/src/lib/server/rdap.ts` | **Create** | RDAP domain checker (slim copy from Forage) |
| 2 | `libs/engine/src/routes/api/check-domain/+server.ts` | **Create** | GET endpoint for domain availability |
| 3 | `libs/engine/src/lib/ui/components/domain/DomainChecker.svelte` | **Create** | Reusable domain checker component |
| 4 | `libs/engine/src/lib/ui/components/domain/DomainCheckerModal.svelte` | **Create** | Modal wrapper for the checker |
| 5 | `libs/engine/src/lib/ui/components/domain/index.ts` | **Create** | Barrel export |
| 6 | `libs/engine/src/routes/arbor/domain/+page.svelte` | **Create** | Standalone domain checker page |
| 7 | `libs/engine/src/routes/arbor/domain/+page.server.ts` | **Create** | Page server load (tier, username) |
| 8 | `libs/engine/src/routes/arbor/settings/+page.svelte` | **Edit** | Add domain CTA trigger near site identity section |

---

## Design Decisions

1. **No suggestions in v1** — Just available/taken/error status. Users who want deeper domain hunting reach out for the full Forage pipeline.

2. **RDAP bootstrap caching** — The IANA bootstrap file (~50KB) maps TLDs to RDAP servers. We cache it in memory (same as Forage does), which survives for the Worker's lifetime. Future optimization: cache in KV with TTL.

3. **Gentle upsell tone** — The copy should feel like a friend mentioning a cool option, not a sales banner. "Want your own address?" not "UPGRADE NOW FOR CUSTOM DOMAINS!"

4. **Rate limiting** — Authenticated-only endpoint + existing rate limits prevent abuse. RDAP servers are free but rate-limited themselves, so we respect that with the 10/min limit.

5. **No domain purchase flow** — v1 is discovery only. Users check availability, then either contact for setup (Forage pipeline) or self-service comes later when Cloudflare Registrar integration is built.

6. **Component reusability** — The `DomainChecker` component works in both modal and page contexts, making it easy to embed elsewhere later (e.g., during onboarding, in upgrade flows).
