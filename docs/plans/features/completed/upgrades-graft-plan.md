# UpgradesGraft Plan

> **Date:** February 9, 2026
> **Priority:** Medium — Future architecture improvement
> **Related:** LoginGraft pattern, `/api/billing` in engine, Plant checkout flow
>
> _"Every grove begins as a single seed in the wind."_

## Overview

Create a centralized `UpgradesGraft` module for consistent upgrade and cultivation management across all Grove properties. Currently, the growth logic is scattered across the orchard:

- `apps/plant/src/routes/api/select-plan/+server.ts` — First planting (onboarding)
- `apps/plant/src/lib/server/stripe.ts` — Payment tending
- `libs/engine/src/routes/api/billing/+server.ts` — Garden management

Following the successful `LoginGraft` pattern, UpgradesGraft will provide:

- Server-side API handlers for cultivation (upgrades), garden management (billing portal), and growth tracking
- Client-side UI components for the nurturing journey
- Unified configuration for checkout and tending

## The Grove Perspective

In Grove, upgrades aren't transactions — they're **growth**.

|          | Technical          | Grove Perspective     |
| -------- | ------------------ | --------------------- |
| Upgrade  | Change plan tier   | Your grove flourishes |
| Billing  | Payment management | Tend your garden      |
| Tier     | Subscription level | Stage of growth       |
| Checkout | Purchase flow      | Planting ceremony     |
| Portal   | Account management | Garden tools          |

**The journey:**

```
Wanderer → Seedling → Sapling → Oak → Evergreen
   🌱          🌿         🌳        🌲        🌲
  (free)      (paid)    (growth)  (shade)  (legacy)
```

## Why a Graft?

### Current State

```
plant/                    landing/arbor/
  ├─ checkout/              ├─ garden tools (missing)
  ├─ plans/                 └─ growth path → ???
  ├─ api/select-plan/
  └─ lib/server/stripe.ts
```

**Problems:**

- Plant package contains planting-specific logic, but growing happens elsewhere
- Existing groves (Arbor) have no clear path to flourish
- Garden tending logic split between packages
- Duplicated payment configuration

### After UpgradesGraft

```
engine/src/lib/grafts/upgrades/
  ├─ index.ts              # Main export (the seed catalog)
  ├─ server/
  │   ├─ api/
  │   │   ├─ cultivate.ts  # POST /api/grafts/upgrades/cultivate (upgrade)
  │   │   ├─ tend.ts       # POST /api/grafts/upgrades/tend (billing portal)
  │   │   └─ growth.ts     # GET /api/grafts/upgrades/growth (status)
  │   ├─ planting.ts       # Checkout session creation
  │   └─ garden.ts         # Garden utilities
  ├─ config.ts             # Checkout URLs, tier mapping
  ├─ types.ts              # TypeScript interfaces
  └─ components/
      ├─ GrowthCard.svelte      # Tier display with nurturing button
      ├─ GardenModal.svelte     # Modal for comparing growth stages
      ├─ CurrentStageBadge.svelte # Show where you are in the journey
      └─ GardenStatus.svelte    # Nurturing overview for dashboard

plant/                    landing/arbor/
  └─ uses UpgradesGraft    └─ uses UpgradesGraft
```

**Grove Language:** Use `cultivate` instead of `upgrade`, `tend` instead of `portal`, `growth` instead of `status`.

## Server-Side API: The Garden Tools

### `POST /api/grafts/upgrades/cultivate`

Help your grove grow to the next stage.

```typescript
// Request body
interface CultivateRequest {
	targetStage: TierKey; // 'seedling', 'sapling', 'oak', 'evergreen'
	billingCycle: "monthly" | "annual";
	returnTo?: string; // Where to return after planting
}

// Response
interface CultivateResponse {
	plantingUrl: string; // Redirect here to begin
	sessionId?: string; // Track the growth
}
```

**The Flow:**

1. Verify the grove owner is authenticated
2. Check current growth stage (cannot prune down via this endpoint)
3. Create a Stripe planting session with proration for immediate growth
4. Redirect to the planting ceremony

---

### `POST /api/grafts/upgrades/tend`

Open the garden shed for self-service management.

```typescript
// Request body
interface TendRequest {
	returnTo: string; // Return to your grove after tending
}

// Response
interface TendResponse {
	shedUrl: string; // Redirect to the garden shed
}
```

**The Flow:**

1. Verify the grove owner is authenticated
2. Retrieve the grove's customer ID from platform_billing
3. Open the garden shed (Stripe Billing Portal)
4. Redirect to tend your garden

**What you can tend:**

- View harvest records (invoices)
- Update your watering method (payment method)
- Prune your grove (cancel subscription)
- Regrow a pruned grove (resume subscription)

---

### `GET /api/grafts/upgrades/growth`

Check how your grove is flourishing.

```typescript
// Response
interface GrowthStatus {
	currentStage: TierKey;
	flourishState: "active" | "trialing" | "past_due" | "resting" | "pruned";
	currentPeriodEnd: string | null;
	pruningScheduled: boolean; // Cancel at period end
	trialEnd: string | null;
	isComped: boolean; // Gifted grove
	wateringMethod?: {
		// Payment method
		source: string; // Card brand
		lastDigits: string; // Last 4 digits
	};
}
```

### Client-Side Components

### Client-Side Components

#### `GrowthCard.svelte`

Display a growth stage for nurturing with action button.

```svelte
<script>
	import { PricingCTA } from "@autumnsgrove/lattice/grafts/pricing";
</script>

<PricingCTA {tier} {billingPeriod} variant="primary" onPlant={handlePlanting} />
```

|**Props:**

```typescript
interface GrowthCardProps {
	tier: PricingTier;
	currentTier?: TierKey; // Show "Current Stage" if matches
	billingPeriod: BillingPeriod;
	onPlant?: (tier: TierKey, period: BillingPeriod) => void;
}
```

#### `GardenModal.svelte`

Modal with stage comparison for nurturing your grove.

```svelte
<script>
	import { GrowthCard, PricingToggle } from "@autumnsgrove/lattice/grafts/upgrades";
</script>

<PricingToggle {billingPeriod} onPeriodChange={setBillingPeriod} />

{#each availableTiers as tier}
	<GrowthCard {tier} {billingPeriod} currentTier={userTier} />
{/each}
```

#### `CurrentStageBadge.svelte`

Show user's current growth stage with nurture CTAs.

```svelte
<script>
	import { NurtureCTA } from "@autumnsgrove/lattice/grafts/upgrades";
</script>

<div class="current-stage">
	<span class="stage-name">{TIERS[currentTier].display.name}</span>
	{#if canNurture}
		<NurtureCTA tier={nextTier} />
	{/if}
</div>
```

## Configuration: The Seed Catalog

Following the `LoginGraft` pattern, configuration is environment-driven — like preparing your seed catalog for the season:

```typescript
// libs/engine/src/lib/grafts/upgrades/config.ts

export interface UpgradesConfig {
	/** Planting URLs by stage and billing cycle */
	plantingUrls: Record<TierKey, { monthly?: string; annual?: string }>;
	/** Stripe secret key (from environment) */
	stripeSecretKey: string;
	/** Garden shed URL */
	gardenShedUrl: string;
}

/**
 * Create the seed catalog from environment variables
 */
export function createUpgradeConfig(env: Record<string, string | undefined>): UpgradesConfig {
	return {
		plantingUrls: {
			seedling: {
				monthly: env.STRIPE_PLANT_SEEDLING_MONTHLY,
				annual: env.STRIPE_PLANT_SEEDLING_YEARLY,
			},
			sapling: {
				/* ... */
			},
			oak: {
				/* ... */
			},
			evergreen: {
				/* ... */
			},
		},
		stripeSecretKey: env.STRIPE_SECRET_KEY ?? "",
		gardenShedUrl: `${env.APP_URL ?? "https://grove.place"}/api/grafts/upgrades/tend`,
	};
}
```

## Migration Plan: The Growing Season

### Phase 1: Prepare the Soil (Extract Server-Side API)

1. **Create graft skeleton** (`libs/engine/src/lib/grafts/upgrades/`)
2. **Migrate first planting logic** from `apps/plant/src/routes/api/select-plan/+server.ts`
3. **Migrate garden management** from `libs/engine/src/routes/api/billing/+server.ts`
4. **Create unified planting handler** supporting both new groves and growth

### Phase 2: Plant the Seeds (Create Client Components)

1. **GrowthCard.svelte** — Reusable stage display with nurture button
2. **GardenModal.svelte** — Modal for comparing growth stages
3. **CurrentStageBadge.svelte** — Your current place on the journey
4. **GardenStatus.svelte** — Dashboard nurturing overview
5. **Export from graft index** alongside pricing components

### Phase 3: First Planting (Update Plant Package)

1. **Replace `/api/select-plan/+server.ts`** with graft API call
2. **Update planting flow** to use graft components
3. **Remove duplicated payment logic** from `apps/plant/lib/server/stripe.ts`

### Phase 4: Growth for Existing Groves (Integrate with Arbor)

1. **Add garden section** to the Arbor dashboard
2. **Link from settings** → garden shed
3. **Show growth options** when on Wanderer or Seedling stage

## API Compatibility

### Deprecation Path

| Endpoint                       | Status     | Replacement                         |
| ------------------------------ | ---------- | ----------------------------------- |
| `POST /api/select-plan`        | Deprecated | `POST /api/grafts/upgrades/upgrade` |
| `GET /api/billing`             | Migrate    | `GET /api/grafts/upgrades/status`   |
| `POST /api/billing` (checkout) | Migrate    | `POST /api/grafts/upgrades/upgrade` |
| `PUT /api/billing` (portal)    | Migrate    | `POST /api/grafts/upgrades/portal`  |
| `PATCH /api/billing` (cancel)  | Migrate    | Portal self-service                 |

## Example Usage: Growing Your Grove

### First Planting (Plant package)

```svelte
<script>
	import { GrowthCard } from "@autumnsgrove/lattice/grafts/upgrades";
</script>

{#each availableStages as stage}
	<GrowthCard
		{stage}
		{billingCycle}
		currentStage={yourStage}
		onPlant={async (stage, cycle) => {
			const res = await fetch("/api/grafts/upgrades/cultivate", {
				method: "POST",
				body: JSON.stringify({ targetStage: stage, billingCycle: cycle }),
			});
			const { plantingUrl } = await res.json();
			window.location.href = plantingUrl;
		}}
	/>
{/each}
```

### Your Growing Grove (Arbor dashboard)

```svelte
<script>
	import { CurrentStageBadge, GardenModal } from "@autumnsgrove/lattice/grafts/upgrades";
</script>

<CurrentStageBadge currentStage={yourStage} />

{#if showGardenModal}
	<GardenModal
		currentStage={yourStage}
		onCultivate={(stage) => {
			/* redirect to planting */
		}}
		onTend={() => {
			/* open garden shed */
		}}
	/>
{/if}
```

## Environment Variables: The Seed Catalog

```bash
# Stripe (existing, reuse)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Planting URLs (per-stage, per-cycle)
# These replace the hardcoded URLs in plant/lib/server/stripe.ts
STRIPE_PLANT_SEEDLING_MONTHLY=https://checkout.stripe.com/...
STRIPE_PLANT_SEEDLING_YEARLY=https://checkout.stripe.com/...
STRIPE_PLANT_SAPLING_MONTHLY=https://checkout.stripe.com/...
STRIPE_PLANT_SAPLING_YEARLY=https://checkout.stripe.com/...
STRIPE_PLANT_OAK_MONTHLY=https://checkout.stripe.com/...
STRIPE_PLANT_OAK_YEARLY=https://checkout.stripe.com/...
STRIPE_PLANT_EVERGREEN_MONTHLY=https://checkout.stripe.com/...
STRIPE_PLANT_EVERGREEN_YEARLY=https://checkout.stripe.com/...
```

## Open Questions: Planning the Harvest

1. **Immediate growth:** Should cultivation activate immediately with prorated care, or wait for the next season?
2. **Pruning:** Support through garden shed only, or also via API?
3. **First planting:** Is the flow different for Wanderer → Seedling vs Seedling → Sapling?
4. **Gifted groves:** How does cultivation work with comped stages?

These are decisions the Wayfinder will make when implementation begins.

## Security Considerations: Protecting the Grove

The billing subsystem has been surveyed using the Hawk security methodology. These controls must be preserved and extended in UpgradesGraft:

### Critical Security Controls to Preserve

| Control                            | Location                                               | Purpose                                             |
| ---------------------------------- | ------------------------------------------------------ | --------------------------------------------------- |
| **Webhook Signature Verification** | `apps/plant/src/routes/api/webhooks/stripe/+server.ts` | HMAC-SHA256 verification of Stripe events           |
| **Tenant Isolation**               | `libs/engine/src/lib/auth/session.ts:58`               | Ownership verification before any tenant operation  |
| **Rate Limiting**                  | `libs/engine/src/lib/server/rate-limits.ts`            | 20 ops/hour for billing, 3 free accounts/IP/30 days |
| **CSRF Validation**                | `libs/engine/src/lib/utils/csrf.ts`                    | Origin/referer validation for API requests          |
| **PIl Sanitization**               | `libs/engine/src/lib/utils/webhook-sanitizer.ts`       | Removes PII before logging webhook payloads         |

### Validation Requirements

**Onboarding Step Sequencing** (`HAWK-001`):

- Plan selection must verify `profile_completed_at` and `email_verified` are set
- Prevent skipping onboarding steps by calling API directly
- Return 400 with descriptive error message

**Tenant ID Handling** (`HAWK-002`):

- Never accept `tenant_id` from query parameters
- Use only `locals.tenantId` from authenticated session
- Always run ownership verification via `getVerifiedTenantId`

### New Graft Security Requirements

When building UpgradesGraft:

1. **Plan Selection API** (`POST /api/grafts/upgrades/cultivate`):
   - Validate onboarding status before allowing cultivation
   - Check rate limits before any DB writes
   - Audit log all cultivation attempts

2. **Billing Portal API** (`POST /api/grafts/upgrades/tend`):
   - Verify tenant ownership before opening portal
   - Validate returnTo URL against allowlist
   - Log portal session creation

3. **Growth Status API** (`GET /api/grafts/upgrades/growth`):
   - Return minimal data (only what's needed for UI)
   - Never expose provider customer IDs to client
   - Cache appropriately with tenant isolation

---

## Dependencies

- `@autumnsgrove/lattice/config` — Growth stage definitions
- `@autumnsgrove/lattice/grafts/pricing` — Stage display components
- `stripe` — Payment provider SDK

## Files to Create/Modify: Building the Graft

### New Files

```
libs/engine/src/lib/grafts/upgrades/
├── index.ts                    # Main export (seed catalog)
├── types.ts                    # TypeScript interfaces (growth stages)
├── config.ts                   # Configuration & environment handling
└── server/
    ├── api/
    │   ├── cultivate.ts        # POST /api/grafts/upgrades/cultivate
    │   ├── tend.ts             # POST /api/grafts/upgrades/tend
    │   └── growth.ts           # GET /api/grafts/upgrades/growth
    ├── planting.ts             # Planting session creation
    └── garden.ts               # Garden utilities

libs/engine/src/lib/grafts/pricing/
└── components/
    ├── GrowthCard.svelte
    ├── GardenModal.svelte
    ├── CurrentStageBadge.svelte
    └── GardenStatus.svelte
```

### Modified Files

```
libs/engine/src/routes/api/billing/+server.ts  # Migrate to graft
libs/engine/src/routes/api/grafts/
  └── upgrades/+server.ts                          # New combined endpoint
apps/plant/src/routes/api/select-plan/+server.ts  # Use graft
apps/plant/src/lib/server/stripe.ts           # Remove duplicated code
apps/plant/src/routes/checkout/+page.server.ts # Use graft
```

## Acceptance Criteria: Ready for the Grove

- [ ] Server-side API handles cultivation, garden shed, and growth tracking
- [ ] Client components work for both first planting and existing groves
- [ ] Plant package uses graft instead of duplicated payment logic
- [ ] All existing billing operations continue to work seamlessly
- [ ] Environment-driven configuration (no hardcoded Stripe URLs)
- [ ] Audit logging for all growth operations
- [ ] Rate limiting on all cultivation endpoints

---

_The graft is ready. The grove awaits its growth._ 🌳
