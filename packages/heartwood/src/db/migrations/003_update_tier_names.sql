-- Migration: Update subscription tier names to match GroveEngine v0.6.x
-- Old: starter, professional, business
-- New: seedling, sapling, evergreen, canopy, platform

-- Update existing tier values
UPDATE user_subscriptions SET tier = 'seedling' WHERE tier = 'starter';
UPDATE user_subscriptions SET tier = 'sapling' WHERE tier = 'professional';
UPDATE user_subscriptions SET tier = 'evergreen' WHERE tier = 'business';

-- Note: SQLite does not support ALTER TABLE to modify CHECK constraints.
-- The old constraint will remain but new inserts will only use new tier names.
-- To fully update the schema, you would need to recreate the table.

-- For production, consider running this recreate if needed:
-- CREATE TABLE user_subscriptions_new (
--   id TEXT PRIMARY KEY,
--   user_id TEXT UNIQUE NOT NULL,
--   tier TEXT NOT NULL DEFAULT 'seedling' CHECK (tier IN ('seedling', 'sapling', 'evergreen', 'canopy', 'platform')),
--   post_limit INTEGER,
--   post_count INTEGER NOT NULL DEFAULT 0,
--   grace_period_start TEXT,
--   grace_period_days INTEGER DEFAULT 14,
--   stripe_customer_id TEXT,
--   stripe_subscription_id TEXT,
--   billing_period_start TEXT,
--   billing_period_end TEXT,
--   custom_domain TEXT,
--   custom_domain_verified INTEGER DEFAULT 0,
--   created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
--   updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
--   FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
-- );
-- INSERT INTO user_subscriptions_new SELECT * FROM user_subscriptions;
-- DROP TABLE user_subscriptions;
-- ALTER TABLE user_subscriptions_new RENAME TO user_subscriptions;
-- CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
-- CREATE INDEX IF NOT EXISTS idx_user_subscriptions_tier ON user_subscriptions(tier);
