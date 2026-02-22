# GroveAuth Agent Handoff - User Subscriptions & Post Limits

> **Instructions for GroveAuth Agent**: Implement these changes to add user subscription tracking and post limits to GroveAuth.

---

## Overview

Lattice is implementing posting limits based on user tiers. GroveAuth needs to track subscription data for each user so that Lattice can check limits before allowing post creation.

**Tier Limits (source of truth: `libs/engine/src/lib/config/tiers.ts`):**

- `free` (Wanderer): 25 posts
- `seedling`: 100 posts
- `sapling`: unlimited
- `oak`: unlimited
- `evergreen`: unlimited

---

## Changes Needed

### 1. Create Database Migration

Create `src/db/migrations/001_user_subscriptions.sql`:

```sql
-- User Subscriptions table for tracking tiers and post limits
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'seedling', 'sapling', 'oak', 'evergreen')),
  post_limit INTEGER,                     -- NULL = unlimited
  post_count INTEGER NOT NULL DEFAULT 0,
  grace_period_start TEXT,
  grace_period_days INTEGER DEFAULT 14,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  billing_period_start TEXT,
  billing_period_end TEXT,
  custom_domain TEXT,
  custom_domain_verified INTEGER DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_tier ON user_subscriptions(tier);

-- Audit log for subscription changes
CREATE TABLE IF NOT EXISTS subscription_audit_log (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'subscription_created', 'tier_upgraded', 'tier_downgraded',
    'grace_period_started', 'grace_period_ended', 'post_limit_reached',
    'post_archived', 'custom_domain_added', 'custom_domain_verified', 'custom_domain_removed'
  )),
  old_value TEXT,
  new_value TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_subscription_audit_user ON subscription_audit_log(user_id);
```

### 2. Add Types to `src/types.ts`

Add at the end of the file:

```typescript
// =============================================================================
// SUBSCRIPTION TYPES
// =============================================================================

export type SubscriptionTier = "free" | "seedling" | "sapling" | "oak" | "evergreen";

export interface UserSubscription {
  id: string;
  user_id: string;
  tier: SubscriptionTier;
  post_limit: number | null;
  post_count: number;
  grace_period_start: string | null;
  grace_period_days: number;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  billing_period_start: string | null;
  billing_period_end: string | null;
  custom_domain: string | null;
  custom_domain_verified: number;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionAuditLog {
  id: string;
  user_id: string;
  event_type: SubscriptionAuditEventType;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
}

export type SubscriptionAuditEventType =
  | "subscription_created"
  | "tier_upgraded"
  | "tier_downgraded"
  | "grace_period_started"
  | "grace_period_ended"
  | "post_limit_reached"
  | "post_archived"
  | "custom_domain_added"
  | "custom_domain_verified"
  | "custom_domain_removed";

export const TIER_POST_LIMITS: Record<SubscriptionTier, number | null> = {
  free: 25,
  seedling: 100,
  sapling: null, // unlimited
  oak: null,
  evergreen: null,
};

export interface SubscriptionStatus {
  tier: SubscriptionTier;
  post_count: number;
  post_limit: number | null;
  posts_remaining: number | null;
  percentage_used: number | null;
  is_at_limit: boolean;
  is_in_grace_period: boolean;
  grace_period_days_remaining: number | null;
  can_create_post: boolean;
  upgrade_required: boolean;
}
```

### 3. Add Query Functions to `src/db/queries.ts`

Add these subscription management functions:

```typescript
// ==================== User Subscriptions ====================

import type {
  UserSubscription,
  SubscriptionTier,
  SubscriptionStatus,
  SubscriptionAuditEventType,
} from "../types.js";
import { TIER_POST_LIMITS } from "../types.js";

export async function getUserSubscription(
  db: D1Database,
  userId: string,
): Promise<UserSubscription | null> {
  return db
    .prepare("SELECT * FROM user_subscriptions WHERE user_id = ?")
    .bind(userId)
    .first<UserSubscription>();
}

export async function createUserSubscription(
  db: D1Database,
  userId: string,
  tier: SubscriptionTier = "free",
): Promise<UserSubscription> {
  const id = generateUUID();
  const postLimit = TIER_POST_LIMITS[tier];
  const now = new Date().toISOString();

  await db
    .prepare(
      `INSERT INTO user_subscriptions (id, user_id, tier, post_limit, post_count, grace_period_days, created_at, updated_at)
     VALUES (?, ?, ?, ?, 0, 14, ?, ?)`,
    )
    .bind(id, userId, tier, postLimit, now, now)
    .run();

  await createSubscriptionAuditLog(db, {
    user_id: userId,
    event_type: "subscription_created",
    new_value: JSON.stringify({ tier, post_limit: postLimit }),
  });

  return (await getUserSubscription(db, userId))!;
}

export async function getOrCreateUserSubscription(
  db: D1Database,
  userId: string,
): Promise<UserSubscription> {
  const existing = await getUserSubscription(db, userId);
  if (existing) return existing;
  return createUserSubscription(db, userId, "free");
}

export async function incrementPostCount(
  db: D1Database,
  userId: string,
): Promise<UserSubscription | null> {
  const subscription = await getUserSubscription(db, userId);
  if (!subscription) return null;

  const newCount = subscription.post_count + 1;
  const now = new Date().toISOString();
  const isAtLimit =
    subscription.post_limit !== null && newCount >= subscription.post_limit;

  let graceStart = subscription.grace_period_start;
  if (isAtLimit && !graceStart) {
    graceStart = now;
  }

  await db
    .prepare(
      `UPDATE user_subscriptions SET post_count = ?, grace_period_start = ?, updated_at = ? WHERE user_id = ?`,
    )
    .bind(newCount, graceStart, now, userId)
    .run();

  return getUserSubscription(db, userId);
}

export async function decrementPostCount(
  db: D1Database,
  userId: string,
): Promise<UserSubscription | null> {
  const subscription = await getUserSubscription(db, userId);
  if (!subscription) return null;

  const newCount = Math.max(0, subscription.post_count - 1);
  const now = new Date().toISOString();

  // Clear grace period if now under limit
  let graceStart = subscription.grace_period_start;
  if (subscription.post_limit !== null && newCount < subscription.post_limit) {
    graceStart = null;
  }

  await db
    .prepare(
      `UPDATE user_subscriptions SET post_count = ?, grace_period_start = ?, updated_at = ? WHERE user_id = ?`,
    )
    .bind(newCount, graceStart, now, userId)
    .run();

  return getUserSubscription(db, userId);
}

export function getSubscriptionStatus(
  subscription: UserSubscription,
): SubscriptionStatus {
  const {
    tier,
    post_count,
    post_limit,
    grace_period_start,
    grace_period_days,
  } = subscription;

  const posts_remaining =
    post_limit !== null ? Math.max(0, post_limit - post_count) : null;
  const percentage_used =
    post_limit !== null ? Math.min(100, (post_count / post_limit) * 100) : null;
  const is_at_limit = post_limit !== null && post_count >= post_limit;

  let is_in_grace_period = false;
  let grace_period_days_remaining: number | null = null;

  if (grace_period_start) {
    is_in_grace_period = true;
    const graceStart = new Date(grace_period_start);
    const graceEnd = new Date(
      graceStart.getTime() + grace_period_days * 24 * 60 * 60 * 1000,
    );
    const msRemaining = graceEnd.getTime() - Date.now();
    grace_period_days_remaining = Math.max(
      0,
      Math.ceil(msRemaining / (24 * 60 * 60 * 1000)),
    );
  }

  const grace_expired =
    grace_period_days_remaining !== null && grace_period_days_remaining <= 0;
  const can_create_post =
    !is_at_limit || (is_in_grace_period && !grace_expired);
  const upgrade_required = is_at_limit && grace_expired;

  return {
    tier,
    post_count,
    post_limit,
    posts_remaining,
    percentage_used,
    is_at_limit,
    is_in_grace_period,
    grace_period_days_remaining,
    can_create_post,
    upgrade_required,
  };
}

export async function canUserCreatePost(
  db: D1Database,
  userId: string,
): Promise<{
  allowed: boolean;
  status: SubscriptionStatus;
  subscription: UserSubscription;
}> {
  const subscription = await getOrCreateUserSubscription(db, userId);
  const status = getSubscriptionStatus(subscription);
  return { allowed: status.can_create_post, status, subscription };
}

export async function createSubscriptionAuditLog(
  db: D1Database,
  data: {
    user_id: string;
    event_type: SubscriptionAuditEventType;
    old_value?: string;
    new_value?: string;
  },
): Promise<void> {
  const id = generateUUID();
  await db
    .prepare(
      `INSERT INTO subscription_audit_log (id, user_id, event_type, old_value, new_value) VALUES (?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      data.user_id,
      data.event_type,
      data.old_value || null,
      data.new_value || null,
    )
    .run();
}
```

### 4. Create API Routes - `src/routes/subscription.ts`

Create new file with these endpoints:

- `GET /subscription` - Get current user's subscription (requires Bearer token)
- `GET /subscription/:userId` - Get specific user's subscription
- `GET /subscription/:userId/can-post` - Check if user can create a post
- `POST /subscription/:userId/post-count` - Update post count (body: `{ action: 'increment' | 'decrement' }` or `{ count: number }`)
- `PUT /subscription/:userId/tier` - Update tier (body: `{ tier: 'starter' | 'professional' | 'business' }`)

All routes require Bearer token authentication via `verifyJWT`.

### 5. Register Routes in `src/index.ts`

Add:

```typescript
import subscription from "./routes/subscription.js";
// ...
app.route("/subscription", subscription);
```

And update the API info object to include subscription endpoints.

---

## Testing

After implementing:

1. Run `pnpm tsc --noEmit` to check for TypeScript errors
2. Run the migration on a test database
3. Test these flows:
   - Create subscription for new user
   - Check can-post returns correct status
   - Increment post count and verify grace period starts at limit
   - Decrement and verify grace period clears

---

## Notes

- Grace period is 14 days by default
- After grace period expires, `can_create_post` returns false
- `business` tier has `post_limit: null` (unlimited)
- Stripe fields are placeholders for future billing integration

---

_Created: 2025-12-08_
_For: Lattice posting limits feature_
