# Tier Feature Centralization Plan

**Created**: 2026-01-12
**Status**: Ready for Implementation
**Priority**: Medium (improves maintainability)
**Estimated Effort**: 4-5 hours total

## Goal

Create a single source of truth for all tier-related data across the Grove ecosystem, eliminating scattered configurations and hardcoded values.

---

## Current State Analysis

### Tier Data Locations (8 files with different structures)

| File | Data Type | Tiers Defined |
|------|-----------|---------------|
| `packages/engine/src/lib/server/tier-features.ts` | Feature limits | free, seedling, sapling, oak, evergreen |
| `packages/engine/src/lib/server/rate-limits/config.ts` | Rate limits | seedling, sapling, oak, evergreen (no free) |
| `packages/engine/src/lib/groveauth/types.ts` | Post limits + names | seedling, sapling, oak, evergreen (no free) |
| `packages/engine/src/lib/server/billing.ts` | PlanTier type + feature requirements | free, seedling, sapling, oak, evergreen |
| `plant/src/lib/data/plans.ts` | Display info (UI) | seedling, sapling, oak, evergreen (no free) |
| `plant/src/lib/server/stripe.ts` | Stripe price IDs + display prices | seedling, sapling, oak, evergreen |
| `landing/src/routes/pricing/+page.svelte` | Hardcoded table values | free, seedling, sapling, oak, evergreen |
| `plant/src/routes/checkout/+page.svelte` | Hardcoded prices | seedling, sapling, oak, evergreen |

### Current Data Structures

**tier-features.ts:**
```typescript
{ posts, storage, themes, navPages, emailForwarding, customDomain, themeCustomizer, customFonts }
```

**rate-limits/config.ts:**
```typescript
{ requests: {limit, windowSeconds}, writes: {...}, uploads: {...}, ai: {...} }
```

**plans.ts:**
```typescript
{ id, name, tagline, description, monthlyPrice, features: string[], status, icon }
```

---

## Resolved Questions

### 1. Should Stripe price IDs live in the unified config?
**Answer: No.** Stripe price IDs are environment-specific (test vs live) and loaded via env vars. Keep `plant/src/lib/server/stripe.ts` as the Stripe layer - it imports tier names/prices from unified config but manages its own price IDs.

### 2. How to handle "coming soon" vs "available" status?
**Answer:** Add a `status` field to each tier:
```typescript
status: 'available' | 'coming_soon' | 'future' | 'deprecated'
```

### 3. Should the config be in engine or a separate package?
**Answer:** Keep in engine at `packages/engine/src/lib/config/tiers.ts`. Engine is already the shared package, and creating a separate package adds unnecessary complexity.

---

## Complete Unified Schema

Create `packages/engine/src/lib/config/tiers.ts`:

```typescript
// =============================================================================
// TIER IDENTIFIERS
// =============================================================================

export type TierKey = 'free' | 'seedling' | 'sapling' | 'oak' | 'evergreen';
export type PaidTierKey = Exclude<TierKey, 'free'>;
export type TierStatus = 'available' | 'coming_soon' | 'future' | 'deprecated';
export type TierIcon = 'user' | 'sprout' | 'tree-deciduous' | 'trees' | 'crown';

// =============================================================================
// INTERFACES
// =============================================================================

export interface TierLimits {
  posts: number;           // Infinity = unlimited, 0 = none
  storage: number;         // bytes (0 = none)
  themes: number;
  navPages: number;
  commentsPerWeek: number; // Infinity = unlimited
}

export interface TierFeatures {
  blog: boolean;
  meadow: boolean;
  emailForwarding: boolean;
  fullEmail: boolean;
  customDomain: boolean;
  byod: boolean;           // Bring Your Own Domain
  themeCustomizer: boolean;
  customFonts: boolean;
  centennial: boolean;
  shop: boolean;
  ai: boolean;
  analytics: boolean;
}

export interface RateLimitConfig {
  limit: number;
  windowSeconds: number;
}

export interface TierRateLimits {
  requests: RateLimitConfig;
  writes: RateLimitConfig;
  uploads: RateLimitConfig;
  ai: RateLimitConfig;
}

export interface TierPricing {
  monthlyPrice: number;      // dollars
  yearlyPrice: number;       // dollars
  monthlyPriceCents: number; // for Stripe
  yearlyPriceCents: number;  // for Stripe
}

export interface TierDisplay {
  name: string;
  tagline: string;
  description: string;
  icon: TierIcon;
  bestFor: string;
  featureStrings: string[];
}

export type SupportLevel = 'help_center' | 'community' | 'email' | 'priority' | 'dedicated';

export interface TierSupport {
  level: SupportLevel;
  displayString: string;
  includedHours?: number;
}

export interface TierConfig {
  id: TierKey;
  order: number;
  status: TierStatus;
  limits: TierLimits;
  features: TierFeatures;
  rateLimits: TierRateLimits;
  pricing: TierPricing;
  display: TierDisplay;
  support: TierSupport;
}

// =============================================================================
// TIER DEFINITIONS
// =============================================================================

export const TIERS: Record<TierKey, TierConfig> = {
  free: {
    id: 'free',
    order: 0,
    status: 'coming_soon',
    limits: {
      posts: 0,
      storage: 0,
      themes: 0,
      navPages: 0,
      commentsPerWeek: 20,
    },
    features: {
      blog: false,
      meadow: true,
      emailForwarding: false,
      fullEmail: false,
      customDomain: false,
      byod: false,
      themeCustomizer: false,
      customFonts: false,
      centennial: false,
      shop: false,
      ai: false,
      analytics: false,
    },
    rateLimits: {
      requests: { limit: 50, windowSeconds: 60 },
      writes: { limit: 20, windowSeconds: 3600 },
      uploads: { limit: 0, windowSeconds: 86400 },
      ai: { limit: 0, windowSeconds: 86400 },
    },
    pricing: {
      monthlyPrice: 0,
      yearlyPrice: 0,
      monthlyPriceCents: 0,
      yearlyPriceCents: 0,
    },
    display: {
      name: 'Free',
      tagline: 'Just visiting',
      description: 'Hang out in Meadow, follow blogs, react and comment.',
      icon: 'user',
      bestFor: 'Readers',
      featureStrings: ['Meadow access', '20 comments/week', 'Follow blogs', 'React to posts'],
    },
    support: { level: 'help_center', displayString: 'Help Center' },
  },

  seedling: {
    id: 'seedling',
    order: 1,
    status: 'available',
    limits: {
      posts: 50,
      storage: 1 * 1024 * 1024 * 1024, // 1 GB
      themes: 3,
      navPages: 0,
      commentsPerWeek: Infinity,
    },
    features: {
      blog: true,
      meadow: true,
      emailForwarding: false,
      fullEmail: false,
      customDomain: false,
      byod: false,
      themeCustomizer: false,
      customFonts: false,
      centennial: false,
      shop: false,
      ai: true,
      analytics: false,
    },
    rateLimits: {
      requests: { limit: 100, windowSeconds: 60 },
      writes: { limit: 50, windowSeconds: 3600 },
      uploads: { limit: 10, windowSeconds: 86400 },
      ai: { limit: 25, windowSeconds: 86400 },
    },
    pricing: {
      monthlyPrice: 8,
      yearlyPrice: 81.60,
      monthlyPriceCents: 800,
      yearlyPriceCents: 8160,
    },
    display: {
      name: 'Seedling',
      tagline: 'Just planted',
      description: 'Perfect for getting started. A quiet corner to call your own.',
      icon: 'sprout',
      bestFor: 'Curious',
      featureStrings: ['50 posts', '1 GB storage', '3 curated themes', 'Meadow access', 'RSS feed', 'No ads ever'],
    },
    support: { level: 'community', displayString: 'Community' },
  },

  sapling: {
    id: 'sapling',
    order: 2,
    status: 'coming_soon',
    limits: {
      posts: 250,
      storage: 5 * 1024 * 1024 * 1024, // 5 GB
      themes: 10,
      navPages: 3,
      commentsPerWeek: Infinity,
    },
    features: {
      blog: true,
      meadow: true,
      emailForwarding: true,
      fullEmail: false,
      customDomain: false,
      byod: false,
      themeCustomizer: false,
      customFonts: false,
      centennial: true,
      shop: true,
      ai: true,
      analytics: false,
    },
    rateLimits: {
      requests: { limit: 500, windowSeconds: 60 },
      writes: { limit: 200, windowSeconds: 3600 },
      uploads: { limit: 50, windowSeconds: 86400 },
      ai: { limit: 100, windowSeconds: 86400 },
    },
    pricing: {
      monthlyPrice: 12,
      yearlyPrice: 122.40,
      monthlyPriceCents: 1200,
      yearlyPriceCents: 12240,
    },
    display: {
      name: 'Sapling',
      tagline: 'Growing strong',
      description: 'For blogs finding their voice. Room to stretch and grow.',
      icon: 'tree-deciduous',
      bestFor: 'Hobbyists',
      featureStrings: ['250 posts', '5 GB storage', '10 themes', '3 nav pages', 'Email forwarding', 'Centennial eligible', 'Everything in Seedling'],
    },
    support: { level: 'email', displayString: 'Email' },
  },

  oak: {
    id: 'oak',
    order: 3,
    status: 'future',
    limits: {
      posts: Infinity,
      storage: 20 * 1024 * 1024 * 1024, // 20 GB
      themes: Infinity,
      navPages: 5,
      commentsPerWeek: Infinity,
    },
    features: {
      blog: true,
      meadow: true,
      emailForwarding: true,
      fullEmail: true,
      customDomain: true,
      byod: true,
      themeCustomizer: true,
      customFonts: false,
      centennial: true,
      shop: true,
      ai: true,
      analytics: true,
    },
    rateLimits: {
      requests: { limit: 1000, windowSeconds: 60 },
      writes: { limit: 500, windowSeconds: 3600 },
      uploads: { limit: 200, windowSeconds: 86400 },
      ai: { limit: 500, windowSeconds: 86400 },
    },
    pricing: {
      monthlyPrice: 25,
      yearlyPrice: 255,
      monthlyPriceCents: 2500,
      yearlyPriceCents: 25500,
    },
    display: {
      name: 'Oak',
      tagline: 'Deep roots',
      description: 'Full creative control. Your blog, your rules.',
      icon: 'trees',
      bestFor: 'Serious Bloggers',
      featureStrings: ['Unlimited posts', '20 GB storage', 'Theme customizer', '5 nav pages', 'Bring your own domain', 'Centennial eligible', 'Priority support'],
    },
    support: { level: 'priority', displayString: 'Priority' },
  },

  evergreen: {
    id: 'evergreen',
    order: 4,
    status: 'future',
    limits: {
      posts: Infinity,
      storage: 100 * 1024 * 1024 * 1024, // 100 GB
      themes: Infinity,
      navPages: 8,
      commentsPerWeek: Infinity,
    },
    features: {
      blog: true,
      meadow: true,
      emailForwarding: true,
      fullEmail: true,
      customDomain: true,
      byod: false, // Domain included
      themeCustomizer: true,
      customFonts: true,
      centennial: true,
      shop: true,
      ai: true,
      analytics: true,
    },
    rateLimits: {
      requests: { limit: 5000, windowSeconds: 60 },
      writes: { limit: 2000, windowSeconds: 3600 },
      uploads: { limit: 1000, windowSeconds: 86400 },
      ai: { limit: 2500, windowSeconds: 86400 },
    },
    pricing: {
      monthlyPrice: 35,
      yearlyPrice: 357,
      monthlyPriceCents: 3500,
      yearlyPriceCents: 35700,
    },
    display: {
      name: 'Evergreen',
      tagline: 'Always flourishing',
      description: 'The complete package. Everything Grove has to offer.',
      icon: 'crown',
      bestFor: 'Professionals',
      featureStrings: ['Unlimited everything', '100 GB storage', 'Custom fonts', '8 nav pages', 'Domain included', 'Centennial eligible', '8 hrs/mo dedicated support'],
    },
    support: { level: 'dedicated', displayString: '8hrs + Priority', includedHours: 8 },
  },
} as const;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export const TIER_ORDER: TierKey[] = ['free', 'seedling', 'sapling', 'oak', 'evergreen'];
export const PAID_TIERS: PaidTierKey[] = ['seedling', 'sapling', 'oak', 'evergreen'];

export function getTier(key: TierKey): TierConfig { return TIERS[key]; }

export function getTierSafe(key: string): TierConfig | undefined {
  return isValidTier(key) ? TIERS[key] : undefined;
}

export function isValidTier(key: string): key is TierKey { return key in TIERS; }

export function isPaidTier(key: string): key is PaidTierKey {
  return PAID_TIERS.includes(key as PaidTierKey);
}

export function getAvailableTiers(): TierConfig[] {
  return TIER_ORDER.map(k => TIERS[k]).filter(t => t.status === 'available');
}

export function getTiersInOrder(): TierConfig[] {
  return TIER_ORDER.map(k => TIERS[k]);
}

export function tierHasFeature(tier: TierKey, feature: keyof TierFeatures): boolean {
  return TIERS[tier].features[feature];
}

export function getTierLimit(tier: TierKey, limit: keyof TierLimits): number {
  return TIERS[tier].limits[limit];
}

export function getTierRateLimits(tier: TierKey): TierRateLimits {
  return TIERS[tier].rateLimits;
}

export function formatStorage(bytes: number): string {
  if (bytes === 0) return '—';
  if (bytes === Infinity) return 'Unlimited';
  const gb = bytes / (1024 * 1024 * 1024);
  return gb >= 1 ? `${gb} GB` : `${bytes / (1024 * 1024)} MB`;
}

export function formatLimit(value: number): string {
  if (value === 0) return '—';
  if (value === Infinity) return 'Unlimited';
  return value.toString();
}

export function getNextTier(current: TierKey): TierKey | null {
  const idx = TIER_ORDER.indexOf(current);
  return idx === -1 || idx === TIER_ORDER.length - 1 ? null : TIER_ORDER[idx + 1];
}

export function getTiersWithFeature(feature: keyof TierFeatures): TierKey[] {
  return TIER_ORDER.filter(key => TIERS[key].features[feature]);
}

// Backward compatibility
export const TIER_NAMES: Record<TierKey, string> = Object.fromEntries(
  TIER_ORDER.map(k => [k, TIERS[k].display.name])
) as Record<TierKey, string>;
```

---

## Implementation Steps

### Phase 1: Create Unified Config (1-2 hours)

#### Step 1.1: Create the config file
Create `packages/engine/src/lib/config/tiers.ts` with the schema above.

#### Step 1.2: Create index export
Create `packages/engine/src/lib/config/index.ts`:
```typescript
export * from './tiers.js';
```

#### Step 1.3: Update engine exports
Add to `packages/engine/src/lib/server/index.ts`:
```typescript
export * from '../config/tiers.js';
```

### Phase 2: Update Existing Files (2 hours)

#### Step 2.1: Update tier-features.ts
Convert to backward-compatible wrapper:
```typescript
import { TIERS, type TierKey, isValidTier } from '../config/tiers.js';

export type SubscriptionTier = TierKey;

export const TIER_FEATURE_LIMITS = Object.fromEntries(
  Object.entries(TIERS).map(([key, config]) => [key, {
    posts: config.limits.posts,
    storage: config.limits.storage,
    themes: config.limits.themes,
    navPages: config.limits.navPages,
    emailForwarding: config.features.emailForwarding,
    customDomain: config.features.customDomain,
    themeCustomizer: config.features.themeCustomizer,
    customFonts: config.features.customFonts,
  }])
) as Record<TierKey, TierFeatures>;

// Keep existing function signatures, delegate to new config
export function getNavPageLimit(tier: string): number {
  if (!isValidTier(tier)) return 0;
  return TIERS[tier].limits.navPages;
}
// ... rest delegates to unified config
```

#### Step 2.2: Update rate-limits/config.ts
```typescript
import { TIERS, PAID_TIERS, type PaidTierKey } from '../../config/tiers.js';

export const TIER_RATE_LIMITS = Object.fromEntries(
  PAID_TIERS.map(key => [key, TIERS[key].rateLimits])
) as Record<PaidTierKey, typeof TIERS['seedling']['rateLimits']>;
// Keep endpoint limits unchanged (not tier-specific)
```

#### Step 2.3: Update groveauth/types.ts
```typescript
import { TIERS, type PaidTierKey } from '../config/tiers.js';

export const TIER_POST_LIMITS: Record<PaidTierKey, number | null> = {
  seedling: TIERS.seedling.limits.posts === Infinity ? null : TIERS.seedling.limits.posts,
  // ... derive from config
};
```

#### Step 2.4: Update billing.ts
```typescript
import { getTiersWithFeature, type TierKey } from '../config/tiers.js';

const FEATURE_REQUIREMENTS: Record<string, TierKey[]> = {
  ai: getTiersWithFeature('ai'),
  shop: getTiersWithFeature('shop'),
  // ... derive from config
};
```

#### Step 2.5: Update plant/src/lib/data/plans.ts
```typescript
import { TIERS, PAID_TIERS } from '@autumnsgrove/groveengine/config';

export const plans: Plan[] = PAID_TIERS.map(key => {
  const tier = TIERS[key];
  return {
    id: key,
    name: tier.display.name,
    tagline: tier.display.tagline,
    description: tier.display.description,
    monthlyPrice: tier.pricing.monthlyPrice,
    features: tier.display.featureStrings,
    status: tier.status,
    icon: key,
  };
});
```

#### Step 2.6: Update plant/src/lib/server/stripe.ts
```typescript
import { TIERS, PAID_TIERS } from '@autumnsgrove/groveengine/config';

export const PLAN_INFO = Object.fromEntries(
  PAID_TIERS.map(key => [key, {
    name: TIERS[key].display.name,
    monthlyPrice: TIERS[key].pricing.monthlyPriceCents,
    yearlyPrice: TIERS[key].pricing.yearlyPriceCents,
  }])
);
// Keep Stripe price ID logic unchanged (env-specific)
```

### Phase 3: Update UI Components (1 hour)

#### Step 3.1: Create pricing page server load
Create `landing/src/routes/pricing/+page.server.ts`:
```typescript
import { TIERS, TIER_ORDER } from '@autumnsgrove/groveengine/config';

export function load() {
  return { tiers: TIER_ORDER.map(key => TIERS[key]) };
}
```

#### Step 3.2: Refactor pricing page
Update `landing/src/routes/pricing/+page.svelte` to use `data.tiers` instead of hardcoded values.

#### Step 3.3: Update checkout page
Replace hardcoded `planPrices` in `plant/src/routes/checkout/+page.svelte` with config-derived values.

#### Step 3.4: Update UpgradePrompt.svelte
Use `getNextTier()` helper instead of hardcoded tier progression.

### Phase 4: Testing (30 min)

#### Step 4.1: Add unit tests
Create `packages/engine/src/lib/config/tiers.test.ts` with tests for:
- All tiers exist with correct structure
- Helper functions work correctly
- Backward compatibility exports match expected values

#### Step 4.2: Run full test suite
```bash
pnpm run build --recursive
pnpm test --recursive
```

---

## Files Summary

### Create
| File | Purpose |
|------|---------|
| `packages/engine/src/lib/config/tiers.ts` | **Single source of truth** |
| `packages/engine/src/lib/config/index.ts` | Config module exports |
| `packages/engine/src/lib/config/tiers.test.ts` | Unit tests |
| `landing/src/routes/pricing/+page.server.ts` | Load tier data for UI |

### Modify
| File | Change |
|------|--------|
| `packages/engine/src/lib/server/tier-features.ts` | Import from config, keep exports |
| `packages/engine/src/lib/server/rate-limits/config.ts` | Import rate limits from config |
| `packages/engine/src/lib/groveauth/types.ts` | Derive from config |
| `packages/engine/src/lib/server/billing.ts` | Derive feature requirements |
| `packages/engine/src/lib/server/index.ts` | Add config exports |
| `plant/src/lib/data/plans.ts` | Generate from config |
| `plant/src/lib/server/stripe.ts` | Derive PLAN_INFO |
| `plant/src/routes/checkout/+page.svelte` | Use config prices |
| `landing/src/routes/pricing/+page.svelte` | Use server data |
| `packages/engine/src/lib/components/quota/UpgradePrompt.svelte` | Use getNextTier() |

---

## Benefits

- **Single source of truth**: Change price/limits in one place
- **Type safety**: Full TypeScript validation
- **No drift**: Display values always match actual limits
- **Testable**: One file to test for tier logic
- **Future-proof**: Easy to add tiers or properties
- **Backward compatible**: Existing imports continue working

---

## Verification Checklist

- [ ] All builds pass (`pnpm run build --recursive`)
- [ ] All tests pass (`pnpm test --recursive`)
- [ ] Pricing pages display correct values
- [ ] Admin UI shows correct tier limits
- [ ] Rate limiting uses correct values
- [ ] Stripe checkout works with correct prices
- [ ] UpgradePrompt shows correct next tier
