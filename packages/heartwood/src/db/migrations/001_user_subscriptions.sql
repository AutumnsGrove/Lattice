-- User Subscriptions table for tracking tiers and post limits
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  tier TEXT NOT NULL DEFAULT 'starter' CHECK (tier IN ('starter', 'professional', 'business')),
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
