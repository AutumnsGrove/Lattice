---
title: "🐆 PANTHER STRIKE: Issue #459 - Greenhouse Self-Serve Graft Controls"
status: completed
category: features
lastUpdated: "2026-02-22"
---

# 🐆 PANTHER STRIKE: Issue #459 - Greenhouse Self-Serve Graft Controls

---
aliases: []
date created: Friday, January 31st 2026
date modified: Friday, January 31st 2026
tags:
  - grafts
  - greenhouse
  - admin-ui
  - feature
type: implementation-plan
---

```
         🌱  🌿  🌱
          \\  |  //
           \\ | //
      ╭─────────────╮
     ╱  ✧ GRAFTS ✧  ╲
    ╱   ───────────   ╲
   │  [🌿] Fireside    │
   │  [🌿] Scribe      │
   │  [ ] Voice AI     │
   │  [ ] Beta Theme   │
    ╲   ───────────   ╱
     ╲   🌲  🌲  🌲  ╱
      ╰─────────────╯
          ╱   ╲
         ╱     ╲
        ╱       ╲
   ～～～～～～～～～～～～
   your grafts, your grove
```

> *In the greenhouse, you tend your own garden.*

## Target Summary

**Issue #459**: Greenhouse self-serve graft controls
**Status**: 🐆 IN PROGRESS
**Phase**: Design → Implementation

Greenhouse tenants need a **delightful** UI to toggle and configure their own feature grafts. Not just wrangler commands — a visual, intuitive interface where tenants can actually *see* and *grasp* what's available.

---

## Architecture Overview

### Where Does This Live?

**Primary Location**: `/admin/settings` page
**Visibility**: Greenhouse members only (`data.grafts` cascade from layout)

The Settings page already shows `GreenhouseStatusCard` for greenhouse members. We'll add a new **GraftControlPanel** card below it that:
1. Shows all grafts the tenant can toggle
2. Displays current status with visual indicators
3. Allows one-click enable/disable
4. Groups by category (experimental, stable, etc.)

### Data Flow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         GRAFT CONTROL FLOW                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│   admin/+layout.server.ts                                               │
│   ┌──────────────────────────────────────────────────────┐              │
│   │  Load greenhouse status + all grafts                  │              │
│   │  → grafts: { fireside_mode: true, scribe_mode: true } │              │
│   │  → inGreenhouse: true                                 │              │
│   └──────────────────────────┬───────────────────────────┘              │
│                              │                                           │
│                              ▼  (cascade via data.grafts)               │
│   settings/+page.server.ts                                              │
│   ┌──────────────────────────────────────────────────────┐              │
│   │  Load flag summaries for tenant controls              │              │
│   │  → tenantGrafts: FeatureFlagSummary[] (filtered)      │              │
│   └──────────────────────────┬───────────────────────────┘              │
│                              │                                           │
│                              ▼                                           │
│   settings/+page.svelte                                                 │
│   ┌──────────────────────────────────────────────────────┐              │
│   │  {#if data.greenhouseStatus.inGreenhouse}             │              │
│   │    <GreenhouseStatusCard ... />                       │              │
│   │    <GraftControlPanel                                 │              │
│   │      grafts={data.tenantGrafts}                       │              │
│   │      currentValues={data.grafts}                      │              │
│   │      onToggle={...}                                   │              │
│   │    />                                                 │              │
│   │  {/if}                                                │              │
│   └──────────────────────────────────────────────────────┘              │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Key Distinction: Operator vs Tenant Controls

| Operator (Wayfinder) | Tenant (Greenhouse Member) |
|---------------------|---------------------------|
| Lives at `/admin/greenhouse` (landing) | Lives at `/admin/settings` (engine) |
| Can enable/disable flags GLOBALLY | Can toggle flags FOR THEMSELVES |
| Sees all tenants, manages enrollment | Sees only their own grafts |
| Uses `setFlagEnabled()` | Uses new `setTenantGraftOverride()` |

**Critical**: Tenant toggling creates an **override rule**, not a global change. The tenant's preference is stored as a flag_rule with `rule_type = 'tenant_override'`.

---

## Implementation Plan

### Phase 1: Backend - Tenant Graft Override API

**New Function**: `setTenantGraftOverride(flagId, tenantId, enabled, env)`

```typescript
// In src/lib/feature-flags/tenant-grafts.ts

/**
 * Create or update a tenant-specific graft override.
 * This does NOT change the global flag - it creates a rule just for this tenant.
 */
export async function setTenantGraftOverride(
  flagId: string,
  tenantId: string,
  enabled: boolean,
  env: FeatureFlagsEnv,
): Promise<boolean> {
  // Insert or update a flag_rule with rule_type = 'tenant_override'
  // Priority: 50 (below explicit tenant rules at 100, but above defaults)
}

/**
 * Get all grafts a tenant can control (greenhouse-only flags they have access to).
 */
export async function getTenantControllableGrafts(
  tenantId: string,
  env: FeatureFlagsEnv,
): Promise<TenantGraftInfo[]>;
```

### Phase 2: UI Components

**New Component**: `GraftControlPanel.svelte`

```
┌─────────────────────────────────────────────────────────────────┐
│  ✧ Your Experimental Features                          [?]     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  You're part of the Greenhouse program! Toggle experimental     │
│  features on or off for your site.                              │
│                                                                 │
│  ───────────────────────────────────────────────────────────    │
│                                                                 │
│  🌿 Fireside Mode                                   [ON ●───]   │
│  AI-assisted writing with conversational prompts                │
│                                                                 │
│  🌿 Scribe Mode                                     [ON ●───]   │
│  Voice-to-text transcription for hands-free writing            │
│                                                                 │
│  ───────────────────────────────────────────────────────────    │
│                                                                 │
│  💡 Coming soon:                                                │
│  • Voice AI improvements                                        │
│  • Dark mode themes                                             │
│                                                                 │
│                                          [Reset to Defaults]    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Design Elements**:
- GlassCard with frosted variant
- Toggle switches using existing GreenhouseToggle pattern
- Sprout emoji (🌿) for enabled, seedling (🌱) for disabled
- Description under each graft name
- "Coming soon" section for discovery (browse available grafts)
- Reset to defaults button

### Phase 3: Settings Page Integration

Update `settings/+page.server.ts`:
```typescript
// Load tenant-controllable grafts if in greenhouse
let tenantGrafts: TenantGraftInfo[] = [];
if (greenhouseStatus.inGreenhouse && platform?.env?.DB) {
  tenantGrafts = await getTenantControllableGrafts(
    locals.tenantId,
    { DB: platform.env.DB, FLAGS_KV: platform.env.CACHE_KV }
  );
}
```

Update `settings/+page.svelte`:
```svelte
{#if greenhouseStatus.inGreenhouse}
  <GreenhouseStatusCard ... />

  <!-- NEW: Graft Control Panel -->
  <GraftControlPanel
    grafts={data.tenantGrafts}
    currentValues={data.grafts}
    onToggle={handleGraftToggle}
    onReset={handleResetDefaults}
  />
{/if}
```

### Phase 4: Form Actions

Add to `settings/+page.server.ts`:
```typescript
export const actions: Actions = {
  toggleGraft: async ({ request, locals, platform }) => {
    // Validate greenhouse membership
    // Call setTenantGraftOverride()
    // Return success/failure
  },

  resetGrafts: async ({ locals, platform }) => {
    // Remove all tenant_override rules for this tenant
    // Return to default behavior
  }
};
```

---

## Files to Create/Modify

### Create
- [ ] `src/lib/feature-flags/tenant-grafts.ts` - Tenant graft override API
- [ ] `src/lib/grafts/greenhouse/GraftControlPanel.svelte` - Main UI component
- [ ] `src/lib/grafts/greenhouse/GraftToggleRow.svelte` - Individual graft row
- [ ] `migrations/041_tenant_graft_overrides.sql` - Add rule_type enum value

### Modify
- [ ] `src/routes/admin/settings/+page.server.ts` - Load tenant grafts, add actions
- [ ] `src/routes/admin/settings/+page.svelte` - Render GraftControlPanel
- [ ] `src/lib/feature-flags/index.ts` - Export new functions
- [ ] `src/lib/grafts/greenhouse/index.ts` - Export new components

---

## Acceptance Criteria Mapping

| Criteria | Implementation |
|----------|----------------|
| Graft control panel in tenant dashboard | GraftControlPanel in Settings page |
| Greenhouse-only visibility | `{#if data.greenhouseStatus.inGreenhouse}` |
| Toggle UI for feature grafts | GraftToggleRow with GreenhouseToggle |
| Parameter adjustment UI | Future: extend for non-boolean flags |
| "Active grafts" overview | Show current values from data.grafts |
| Reset to defaults | resetGrafts form action |
| Graft discovery UI | "Coming soon" section |
| Experimental features badge | 🌱/🌿 emoji indicators |

---

## Delightful Details

User said: "this needs to be delightful"

**Micro-interactions**:
- Toggle animation with spring physics
- Success toast with sprout animation: "🌿 Fireside Mode enabled!"
- Smooth collapse/expand for graft descriptions

**Visual warmth**:
- GlassCard with grove-mist gossamer background
- Emerald green for enabled, soft gray for disabled
- Descriptive copy that explains what each graft does

**Discovery joy**:
- "Coming soon" teases future features
- Waystone link to learn more about the Greenhouse program
- Friendly empty state if no grafts available yet

---

## Strike Sequence

1. **STALK**: Create tenant-grafts.ts with override API ✏️
2. **AMBUSH**: Build GraftControlPanel + GraftToggleRow components ✏️
3. **LEAP**: Integrate into Settings page with form actions ✏️
4. **SILENCE**: Test, commit, push 🐆

---

*The hunt begins. One issue. One kill.*
