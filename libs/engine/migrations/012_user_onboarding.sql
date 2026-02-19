-- Migration: User Onboarding System
-- Database: D1 (SQLite) - grove-engine-db
-- Run with: wrangler d1 execute grove-engine-db --file=migrations/011_user_onboarding.sql --remote
--
-- This migration creates tables for the tenant onboarding flow:
--   - user_onboarding: Tracks signup progress, checklist, email status
--   - reserved_usernames: System reserved words and trademarks
--
-- Flow: Heartwood auth → profile collection → plan selection → payment → tenant creation

-- =============================================================================
-- USER ONBOARDING TABLE
-- =============================================================================
-- Tracks the entire signup journey from Heartwood auth through tenant creation

CREATE TABLE IF NOT EXISTS user_onboarding (
  -- Identity
  id TEXT PRIMARY KEY,                    -- UUID generated on creation

  -- Heartwood link (from GroveAuth /userinfo)
  groveauth_id TEXT UNIQUE NOT NULL,      -- Heartwood user ID
  email TEXT NOT NULL,                    -- Email from Heartwood

  -- Profile data (collected after auth on plant.grove.place/profile)
  display_name TEXT,                      -- How they want to be called
  username TEXT UNIQUE,                   -- Becomes subdomain (e.g., "autumn" → autumn.grove.place)
  favorite_color TEXT,                    -- HSL values or preset name for theme accent
  interests TEXT DEFAULT '[]',            -- JSON array of selected interests

  -- Progress tracking (Unix timestamps)
  auth_completed_at INTEGER,              -- When Heartwood auth finished
  profile_completed_at INTEGER,           -- When profile form submitted
  plan_selected TEXT,                     -- 'seedling', 'sapling', 'oak', 'evergreen', 'free'
  plan_billing_cycle TEXT,                -- 'monthly', 'yearly'
  plan_selected_at INTEGER,               -- When plan was chosen
  payment_completed_at INTEGER,           -- When Stripe payment succeeded (NULL for free)
  tenant_created_at INTEGER,              -- When D1 tenant was provisioned
  tour_started_at INTEGER,                -- When tour began
  tour_completed_at INTEGER,              -- When tour finished
  tour_skipped INTEGER DEFAULT 0,         -- 1 if user skipped tour

  -- Onboarding checklist (displayed in admin sidebar)
  checklist_dismissed INTEGER DEFAULT 0,  -- 1 if user dismissed checklist
  first_post_at INTEGER,                  -- When first post was published
  first_vine_at INTEGER,                  -- When first vine was added
  theme_customized_at INTEGER,            -- When theme/color was changed

  -- Follow-up email tracking
  welcome_email_sent INTEGER DEFAULT 0,   -- 1 if welcome email sent
  day1_email_sent INTEGER DEFAULT 0,      -- 1 if day 1 reminder sent
  day3_email_sent INTEGER DEFAULT 0,      -- 1 if day 3 check-in sent
  day7_email_sent INTEGER DEFAULT 0,      -- 1 if day 7 check-in sent
  day30_email_sent INTEGER DEFAULT 0,     -- 1 if day 30 check-in sent
  checkin_emails_unsubscribed INTEGER DEFAULT 0, -- 1 if unsubscribed from check-ins

  -- Stripe references (for paid tiers)
  stripe_customer_id TEXT,                -- Stripe cus_xxx
  stripe_subscription_id TEXT,            -- Stripe sub_xxx
  stripe_checkout_session_id TEXT,        -- Stripe cs_xxx (for verification)

  -- Link to tenant (once created)
  tenant_id TEXT,                         -- Foreign key to tenants table

  -- Timestamps
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

-- Indexes for user_onboarding
CREATE INDEX IF NOT EXISTS idx_onboarding_groveauth ON user_onboarding(groveauth_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_username ON user_onboarding(username) WHERE username IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_onboarding_email ON user_onboarding(email);
CREATE INDEX IF NOT EXISTS idx_onboarding_tenant ON user_onboarding(tenant_id) WHERE tenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_onboarding_stripe_session ON user_onboarding(stripe_checkout_session_id) WHERE stripe_checkout_session_id IS NOT NULL;

-- =============================================================================
-- RESERVED USERNAMES TABLE
-- =============================================================================
-- Prevents users from claiming system routes, trademarks, or offensive names

CREATE TABLE IF NOT EXISTS reserved_usernames (
  username TEXT PRIMARY KEY,              -- The reserved username (lowercase)
  reason TEXT NOT NULL,                   -- 'system', 'trademark', 'offensive', 'taken_external'
  created_at INTEGER DEFAULT (unixepoch())
);

-- Insert system reserved names (routes, infrastructure)
INSERT OR IGNORE INTO reserved_usernames (username, reason) VALUES
  -- System routes
  ('admin', 'system'),
  ('api', 'system'),
  ('app', 'system'),
  ('auth', 'system'),
  ('login', 'system'),
  ('logout', 'system'),
  ('signup', 'system'),
  ('register', 'system'),
  ('account', 'system'),
  ('settings', 'system'),
  ('dashboard', 'system'),
  ('billing', 'system'),
  ('help', 'system'),
  ('support', 'system'),
  ('contact', 'system'),
  ('about', 'system'),
  ('pricing', 'system'),
  ('plans', 'system'),
  ('checkout', 'system'),
  ('subscribe', 'system'),
  ('unsubscribe', 'system'),

  -- Infrastructure subdomains
  ('www', 'system'),
  ('mail', 'system'),
  ('email', 'system'),
  ('smtp', 'system'),
  ('imap', 'system'),
  ('pop', 'system'),
  ('ftp', 'system'),
  ('ssh', 'system'),
  ('cdn', 'system'),
  ('static', 'system'),
  ('assets', 'system'),
  ('media', 'system'),
  ('images', 'system'),
  ('files', 'system'),
  ('upload', 'system'),
  ('uploads', 'system'),
  ('download', 'system'),
  ('downloads', 'system'),

  -- Grove-specific subdomains
  ('plant', 'system'),
  ('create', 'system'),
  ('new', 'system'),
  ('start', 'system'),
  ('join', 'system'),
  ('blog', 'system'),
  ('blogs', 'system'),
  ('post', 'system'),
  ('posts', 'system'),
  ('feed', 'system'),
  ('rss', 'system'),
  ('atom', 'system'),
  ('sitemap', 'system'),
  ('robots', 'system'),
  ('favicon', 'system'),
  ('status', 'system'),
  ('health', 'system'),
  ('metrics', 'system'),
  ('analytics', 'system'),

  -- Legal pages
  ('legal', 'system'),
  ('terms', 'system'),
  ('privacy', 'system'),
  ('dmca', 'system'),
  ('copyright', 'system'),
  ('abuse', 'system'),
  ('security', 'system'),
  ('report', 'system'),

  -- Documentation
  ('docs', 'system'),
  ('documentation', 'system'),
  ('wiki', 'system'),
  ('guide', 'system'),
  ('guides', 'system'),
  ('tutorial', 'system'),
  ('tutorials', 'system'),

  -- Grove trademarks
  ('grove', 'trademark'),
  ('groveplace', 'trademark'),
  ('thegrove', 'trademark'),
  ('meadow', 'trademark'),
  ('lattice', 'trademark'),
  ('heartwood', 'trademark'),
  ('acorn', 'trademark'),
  ('seedling', 'trademark'),
  ('sapling', 'trademark'),
  ('oak', 'trademark'),
  ('evergreen', 'trademark'),

  -- Common reserved
  ('root', 'system'),
  ('null', 'system'),
  ('undefined', 'system'),
  ('test', 'system'),
  ('testing', 'system'),
  ('demo', 'system'),
  ('example', 'system'),
  ('sample', 'system'),
  ('temp', 'system'),
  ('tmp', 'system'),

  -- Authority/trust
  ('official', 'system'),
  ('verified', 'system'),
  ('moderator', 'system'),
  ('mod', 'system'),
  ('staff', 'system'),
  ('employee', 'system'),
  ('team', 'system'),
  ('founder', 'system'),
  ('ceo', 'system'),
  ('owner', 'system');

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_reserved_reason ON reserved_usernames(reason);

-- =============================================================================
-- MIGRATION NOTES
-- =============================================================================
--
-- 1. ONBOARDING FLOW:
--    plant.grove.place → Heartwood auth → /profile → /plans → /checkout → /success
--
-- 2. TENANT CREATION TIMING:
--    - Free tier: After profile completion (when we have username)
--    - Paid tier: After Stripe webhook confirms payment
--
-- 3. CHECKLIST TRACKING:
--    - Items auto-complete when user performs action (tracked in engine)
--    - Engine routes check user_onboarding and update timestamps
--
-- 4. EMAIL SCHEDULING:
--    - Welcome: Immediate after tenant creation
--    - Day 1/3/7/30: Scheduled job checks created_at and sends if not sent
--
-- 5. USERNAME VALIDATION:
--    - Check reserved_usernames table first
--    - Then check tenants.subdomain for existing tenants
--    - Then check user_onboarding.username for in-progress signups
--
