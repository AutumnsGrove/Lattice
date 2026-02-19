-- Migration: Loam Blocklist Population
-- Database: D1 (SQLite) - grove-engine-db
-- Run with: wrangler d1 execute grove-engine-db --file=migrations/015_loam_blocklist.sql --remote
--
-- This migration populates the reserved_usernames table with comprehensive
-- blocklist entries from the Loam name protection system.
--
-- @see docs/specs/loam-spec.md

-- =============================================================================
-- UPDATE TABLE STRUCTURE (add category and notes columns if not present)
-- =============================================================================

-- Add category column for more specific categorization
ALTER TABLE reserved_usernames ADD COLUMN category TEXT;

-- Add notes column for audit/documentation
ALTER TABLE reserved_usernames ADD COLUMN notes TEXT;

-- Create index on reason for efficient queries by category
CREATE INDEX IF NOT EXISTS idx_reserved_reason ON reserved_usernames(reason);

-- Create index on category for admin filtering
CREATE INDEX IF NOT EXISTS idx_reserved_category ON reserved_usernames(category);

-- =============================================================================
-- GROVE SERVICES (grove_service)
-- =============================================================================

INSERT OR IGNORE INTO reserved_usernames (username, reason, category, notes) VALUES
  -- Public services with subdomains
  ('meadow', 'grove_service', 'public', 'Social feed service'),
  ('forage', 'grove_service', 'public', 'Domain discovery tool'),
  ('foliage', 'grove_service', 'public', 'Theming system'),
  ('heartwood', 'grove_service', 'public', 'Authentication service'),
  ('trove', 'grove_service', 'public', 'Library book finder'),
  ('outpost', 'grove_service', 'public', 'Minecraft server'),
  ('aria', 'grove_service', 'public', 'Music curation'),
  ('ivy', 'grove_service', 'public', 'Email client'),
  ('amber', 'grove_service', 'public', 'Storage management'),
  ('bloom', 'grove_service', 'public', 'Remote coding infrastructure'),
  ('mycelium', 'grove_service', 'public', 'MCP server'),
  ('vista', 'grove_service', 'public', 'Infrastructure observability'),
  ('pantry', 'grove_service', 'public', 'Shop & provisioning'),
  ('nook', 'grove_service', 'public', 'Private video sharing'),
  ('clearing', 'grove_service', 'public', 'Status page'),
  ('porch', 'grove_service', 'public', 'Support system'),

  -- Route-based services
  ('shade', 'grove_service', 'route', 'AI content protection'),
  ('trails', 'grove_service', 'route', 'Personal roadmaps'),
  ('vineyard', 'grove_service', 'route', 'Tool showcase'),
  ('terrarium', 'grove_service', 'route', 'Creative canvas'),
  ('weave', 'grove_service', 'route', 'Visual composition'),

  -- Internal services
  ('patina', 'grove_service', 'internal', 'Backup system'),
  ('rings', 'grove_service', 'internal', 'Analytics'),
  ('waystone', 'grove_service', 'internal', 'Help center'),
  ('reeds', 'grove_service', 'internal', 'Comments system'),
  ('press', 'grove_service', 'internal', 'Image processing CLI'),
  ('wisp', 'grove_service', 'internal', 'Writing assistant'),
  ('thorn', 'grove_service', 'internal', 'Content moderation'),
  ('loam', 'grove_service', 'internal', 'Name protection'),
  ('fireside', 'grove_service', 'internal', 'Writing mode'),
  ('vines', 'grove_service', 'internal', 'Lattice feature'),
  ('arbor', 'grove_service', 'internal', 'Admin panel'),
  ('sway', 'grove_service', 'internal', 'Future service'),
  ('fern', 'grove_service', 'internal', 'Future service'),

  -- Service aliases
  ('domains', 'grove_service', 'alias', 'Forage alias'),
  ('music', 'grove_service', 'alias', 'Aria alias'),
  ('mc', 'grove_service', 'alias', 'Outpost alias'),
  ('auth-api', 'grove_service', 'alias', 'Heartwood alias'),
  ('scout', 'grove_service', 'alias', 'Search alias'),
  ('search', 'grove_service', 'alias', 'Search alias'),
  ('og', 'grove_service', 'alias', 'OpenGraph service'),
  ('monitor', 'grove_service', 'alias', 'Vista alias'),

  -- Internal codenames
  ('grovesocial', 'grove_service', 'codename', 'Meadow codename'),
  ('grovedomaintool', 'grove_service', 'codename', 'Forage codename'),
  ('grovethemes', 'grove_service', 'codename', 'Foliage codename'),
  ('groveauth', 'grove_service', 'codename', 'Heartwood codename'),
  ('grovepatina', 'grove_service', 'codename', 'Patina codename'),
  ('treasuretrove', 'grove_service', 'codename', 'Trove codename'),
  ('grovemc', 'grove_service', 'codename', 'Outpost codename'),
  ('grovemusic', 'grove_service', 'codename', 'Aria codename'),
  ('seedbed', 'grove_service', 'codename', 'Plant codename'),
  ('groveanalytics', 'grove_service', 'codename', 'Rings codename'),
  ('grovemail', 'grove_service', 'codename', 'Ivy codename'),
  ('grovestorage', 'grove_service', 'codename', 'Amber codename'),
  ('groveshade', 'grove_service', 'codename', 'Shade codename'),
  ('grovetrails', 'grove_service', 'codename', 'Trails codename'),
  ('groveshowcase', 'grove_service', 'codename', 'Vineyard codename'),
  ('grovebloom', 'grove_service', 'codename', 'Bloom codename'),
  ('grovemcp', 'grove_service', 'codename', 'Mycelium codename'),
  ('grovemonitor', 'grove_service', 'codename', 'Vista codename'),
  ('grovepress', 'grove_service', 'codename', 'Press codename'),
  ('grovewisp', 'grove_service', 'codename', 'Wisp codename'),
  ('groveshop', 'grove_service', 'codename', 'Pantry codename'),
  ('grovenook', 'grove_service', 'codename', 'Nook codename'),
  ('groveclear', 'grove_service', 'codename', 'Clearing codename'),
  ('grovewaystone', 'grove_service', 'codename', 'Waystone codename'),
  ('grovereeds', 'grove_service', 'codename', 'Reeds codename'),
  ('groveporch', 'grove_service', 'codename', 'Porch codename'),
  ('grovethorn', 'grove_service', 'codename', 'Thorn codename'),
  ('grovearbor', 'grove_service', 'codename', 'Arbor codename'),
  ('grovescout', 'grove_service', 'codename', 'Scout codename'),
  ('groveengine', 'grove_service', 'codename', 'Lattice codename'),
  ('groveplace', 'grove_service', 'codename', 'Grove codename'),
  ('groveloam', 'grove_service', 'codename', 'Loam codename');

-- =============================================================================
-- TRADEMARKS (trademark)
-- =============================================================================

INSERT OR IGNORE INTO reserved_usernames (username, reason, category, notes) VALUES
  -- Brand variations
  ('grove-place', 'trademark', 'brand', 'Grove brand'),
  ('thegrove', 'trademark', 'brand', 'Grove brand'),
  ('the-grove', 'trademark', 'brand', 'Grove brand'),
  ('autumnsgrove', 'trademark', 'brand', 'Grove brand'),
  ('autumns-grove', 'trademark', 'brand', 'Grove brand'),
  ('autumngrove', 'trademark', 'brand', 'Grove brand'),
  ('autumn-grove', 'trademark', 'brand', 'Grove brand'),
  ('autumn', 'trademark', 'brand', 'Grove founder'),
  ('autumns', 'trademark', 'brand', 'Grove founder'),

  -- Membership tiers
  ('free', 'trademark', 'tier', 'Pricing tier'),
  ('premium', 'trademark', 'tier', 'Pricing tier'),
  ('pro', 'trademark', 'tier', 'Pricing tier'),
  ('plus', 'trademark', 'tier', 'Pricing tier'),
  ('basic', 'trademark', 'tier', 'Pricing tier'),
  ('starter', 'trademark', 'tier', 'Pricing tier'),
  ('enterprise', 'trademark', 'tier', 'Pricing tier'),

  -- Brand concepts
  ('centennial', 'trademark', 'concept', 'Grove concept'),
  ('seasons', 'trademark', 'concept', 'Grove concept'),
  ('canopy', 'trademark', 'concept', 'Grove concept'),
  ('understory', 'trademark', 'concept', 'Grove concept'),
  ('overstory', 'trademark', 'concept', 'Grove concept'),
  ('forest', 'trademark', 'concept', 'Grove concept'),
  ('woods', 'trademark', 'concept', 'Grove concept'),
  ('woodland', 'trademark', 'concept', 'Grove concept'),
  ('tree', 'trademark', 'concept', 'Grove concept'),
  ('trees', 'trademark', 'concept', 'Grove concept'),
  ('branch', 'trademark', 'concept', 'Grove concept'),
  ('branches', 'trademark', 'concept', 'Grove concept'),
  ('leaf', 'trademark', 'concept', 'Grove concept'),
  ('leaves', 'trademark', 'concept', 'Grove concept'),
  ('grove-keeper', 'trademark', 'concept', 'Grove concept'),
  ('grovekeeper', 'trademark', 'concept', 'Grove concept');

-- =============================================================================
-- IMPERSONATION PREVENTION (impersonation)
-- =============================================================================

INSERT OR IGNORE INTO reserved_usernames (username, reason, category, notes) VALUES
  -- Official status terms
  ('authentic', 'impersonation', 'official', 'Impersonation risk'),
  ('real', 'impersonation', 'official', 'Impersonation risk'),
  ('true', 'impersonation', 'official', 'Impersonation risk'),
  ('original', 'impersonation', 'official', 'Impersonation risk'),
  ('genuine', 'impersonation', 'official', 'Impersonation risk'),
  ('certified', 'impersonation', 'official', 'Impersonation risk'),
  ('approved', 'impersonation', 'official', 'Impersonation risk'),
  ('authorized', 'impersonation', 'official', 'Impersonation risk'),
  ('licensed', 'impersonation', 'official', 'Impersonation risk'),
  ('legit', 'impersonation', 'official', 'Impersonation risk'),
  ('legitimate', 'impersonation', 'official', 'Impersonation risk'),

  -- Roles (additional to existing)
  ('administrator', 'impersonation', 'role', 'Role impersonation'),
  ('mods', 'impersonation', 'role', 'Role impersonation'),
  ('cofounder', 'impersonation', 'role', 'Role impersonation'),
  ('co-founder', 'impersonation', 'role', 'Role impersonation'),
  ('cto', 'impersonation', 'role', 'Role impersonation'),
  ('cfo', 'impersonation', 'role', 'Role impersonation'),
  ('coo', 'impersonation', 'role', 'Role impersonation'),
  ('president', 'impersonation', 'role', 'Role impersonation'),
  ('director', 'impersonation', 'role', 'Role impersonation'),
  ('manager', 'impersonation', 'role', 'Role impersonation'),
  ('operator', 'impersonation', 'role', 'Role impersonation'),
  ('creator', 'impersonation', 'role', 'Role impersonation'),
  ('developer', 'impersonation', 'role', 'Role impersonation'),
  ('engineer', 'impersonation', 'role', 'Role impersonation'),
  ('maintainer', 'impersonation', 'role', 'Role impersonation'),

  -- Support terms
  ('helpdesk', 'impersonation', 'support', 'Support impersonation'),
  ('help-desk', 'impersonation', 'support', 'Support impersonation'),
  ('customerservice', 'impersonation', 'support', 'Support impersonation'),
  ('customer-service', 'impersonation', 'support', 'Support impersonation'),
  ('trust', 'impersonation', 'support', 'Support impersonation'),
  ('safety', 'impersonation', 'support', 'Support impersonation'),
  ('moderation', 'impersonation', 'support', 'Support impersonation'),
  ('enforcement', 'impersonation', 'support', 'Support impersonation'),
  ('billing-support', 'impersonation', 'support', 'Support impersonation'),
  ('tech-support', 'impersonation', 'support', 'Support impersonation');

-- =============================================================================
-- FRAUD PATTERNS (fraud)
-- =============================================================================

INSERT OR IGNORE INTO reserved_usernames (username, reason, category, notes) VALUES
  -- Money scams
  ('free-money', 'fraud', 'money', 'Scam pattern'),
  ('freemoney', 'fraud', 'money', 'Scam pattern'),
  ('getrich', 'fraud', 'money', 'Scam pattern'),
  ('get-rich', 'fraud', 'money', 'Scam pattern'),
  ('makemoney', 'fraud', 'money', 'Scam pattern'),
  ('make-money', 'fraud', 'money', 'Scam pattern'),
  ('earnmoney', 'fraud', 'money', 'Scam pattern'),
  ('earn-money', 'fraud', 'money', 'Scam pattern'),
  ('crypto-giveaway', 'fraud', 'money', 'Scam pattern'),
  ('cryptogiveaway', 'fraud', 'money', 'Scam pattern'),
  ('giveaway', 'fraud', 'money', 'Scam pattern'),
  ('airdrop', 'fraud', 'money', 'Scam pattern'),
  ('freebitcoin', 'fraud', 'money', 'Scam pattern'),
  ('free-bitcoin', 'fraud', 'money', 'Scam pattern'),

  -- Phishing patterns
  ('password', 'fraud', 'phishing', 'Phishing pattern'),
  ('passwords', 'fraud', 'phishing', 'Phishing pattern'),
  ('login-here', 'fraud', 'phishing', 'Phishing pattern'),
  ('signin-here', 'fraud', 'phishing', 'Phishing pattern'),
  ('sign-in', 'fraud', 'phishing', 'Phishing pattern'),
  ('click-here', 'fraud', 'phishing', 'Phishing pattern'),
  ('clickhere', 'fraud', 'phishing', 'Phishing pattern'),
  ('download-now', 'fraud', 'phishing', 'Phishing pattern'),
  ('downloadnow', 'fraud', 'phishing', 'Phishing pattern'),
  ('limited-time', 'fraud', 'phishing', 'Phishing pattern'),
  ('limitedtime', 'fraud', 'phishing', 'Phishing pattern'),
  ('act-now', 'fraud', 'phishing', 'Phishing pattern'),
  ('actnow', 'fraud', 'phishing', 'Phishing pattern'),

  -- Scam patterns
  ('winner', 'fraud', 'scam', 'Scam pattern'),
  ('congratulations', 'fraud', 'scam', 'Scam pattern'),
  ('congrats', 'fraud', 'scam', 'Scam pattern'),
  ('prize', 'fraud', 'scam', 'Scam pattern'),
  ('prizes', 'fraud', 'scam', 'Scam pattern'),
  ('lottery', 'fraud', 'scam', 'Scam pattern'),
  ('jackpot', 'fraud', 'scam', 'Scam pattern'),
  ('invoice', 'fraud', 'scam', 'Scam pattern'),
  ('receipt', 'fraud', 'scam', 'Scam pattern'),
  ('verify', 'fraud', 'scam', 'Scam pattern'),
  ('verification', 'fraud', 'scam', 'Scam pattern'),
  ('confirm', 'fraud', 'scam', 'Scam pattern'),
  ('confirmation', 'fraud', 'scam', 'Scam pattern'),
  ('account-suspended', 'fraud', 'scam', 'Scam pattern'),
  ('account-locked', 'fraud', 'scam', 'Scam pattern'),
  ('urgent', 'fraud', 'scam', 'Scam pattern'),
  ('warning', 'fraud', 'scam', 'Scam pattern'),
  ('alert', 'fraud', 'scam', 'Scam pattern'),
  ('suspended', 'fraud', 'scam', 'Scam pattern'),

  -- Brand impersonation
  ('paypal', 'fraud', 'brand', 'Brand impersonation'),
  ('stripe', 'fraud', 'brand', 'Brand impersonation'),
  ('venmo', 'fraud', 'brand', 'Brand impersonation'),
  ('cashapp', 'fraud', 'brand', 'Brand impersonation'),
  ('zelle', 'fraud', 'brand', 'Brand impersonation'),
  ('apple', 'fraud', 'brand', 'Brand impersonation'),
  ('google', 'fraud', 'brand', 'Brand impersonation'),
  ('microsoft', 'fraud', 'brand', 'Brand impersonation'),
  ('amazon', 'fraud', 'brand', 'Brand impersonation'),
  ('facebook', 'fraud', 'brand', 'Brand impersonation'),
  ('instagram', 'fraud', 'brand', 'Brand impersonation'),
  ('twitter', 'fraud', 'brand', 'Brand impersonation'),
  ('tiktok', 'fraud', 'brand', 'Brand impersonation'),
  ('netflix', 'fraud', 'brand', 'Brand impersonation'),
  ('spotify', 'fraud', 'brand', 'Brand impersonation');

-- =============================================================================
-- FUTURE RESERVED (future_reserved)
-- =============================================================================

INSERT OR IGNORE INTO reserved_usernames (username, reason, category, notes) VALUES
  -- Nature places
  ('hollow', 'future_reserved', 'nature_place', 'Potential service name'),
  ('glade', 'future_reserved', 'nature_place', 'Potential service name'),
  ('thicket', 'future_reserved', 'nature_place', 'Potential service name'),
  ('copse', 'future_reserved', 'nature_place', 'Potential service name'),
  ('dell', 'future_reserved', 'nature_place', 'Potential service name'),
  ('glen', 'future_reserved', 'nature_place', 'Potential service name'),
  ('grove-commons', 'future_reserved', 'nature_place', 'Potential service name'),
  ('bower', 'future_reserved', 'nature_place', 'Potential service name'),
  ('arbor-day', 'future_reserved', 'nature_place', 'Potential service name'),
  ('arborday', 'future_reserved', 'nature_place', 'Potential service name'),

  -- Growing things
  ('seedbank', 'future_reserved', 'nature_growing', 'Potential service name'),
  ('greenhouse', 'future_reserved', 'nature_growing', 'Potential service name'),
  ('nursery', 'future_reserved', 'nature_growing', 'Potential service name'),
  ('mulch', 'future_reserved', 'nature_growing', 'Potential service name'),
  ('compost', 'future_reserved', 'nature_growing', 'Potential service name'),
  ('humus', 'future_reserved', 'nature_growing', 'Potential service name'),
  ('topsoil', 'future_reserved', 'nature_growing', 'Potential service name'),
  ('sprout', 'future_reserved', 'nature_growing', 'Potential service name'),
  ('bud', 'future_reserved', 'nature_growing', 'Potential service name'),
  ('petal', 'future_reserved', 'nature_growing', 'Potential service name'),

  -- Creatures
  ('birdsong', 'future_reserved', 'nature_creature', 'Potential service name'),
  ('cricket', 'future_reserved', 'nature_creature', 'Potential service name'),
  ('firefly', 'future_reserved', 'nature_creature', 'Potential service name'),
  ('moth', 'future_reserved', 'nature_creature', 'Potential service name'),
  ('owl', 'future_reserved', 'nature_creature', 'Potential service name'),
  ('fox', 'future_reserved', 'nature_creature', 'Potential service name'),
  ('deer', 'future_reserved', 'nature_creature', 'Potential service name'),
  ('rabbit', 'future_reserved', 'nature_creature', 'Potential service name'),
  ('cardinal', 'future_reserved', 'nature_creature', 'Potential service name'),
  ('robin', 'future_reserved', 'nature_creature', 'Potential service name'),
  ('bluebird', 'future_reserved', 'nature_creature', 'Potential service name'),
  ('chickadee', 'future_reserved', 'nature_creature', 'Potential service name'),

  -- Plants
  ('moss', 'future_reserved', 'nature_plant', 'Potential service name'),
  ('lichen', 'future_reserved', 'nature_plant', 'Potential service name'),
  ('mushroom', 'future_reserved', 'nature_plant', 'Potential service name'),
  ('fungus', 'future_reserved', 'nature_plant', 'Potential service name'),
  ('truffle', 'future_reserved', 'nature_plant', 'Potential service name'),
  ('clover', 'future_reserved', 'nature_plant', 'Potential service name'),
  ('daisy', 'future_reserved', 'nature_plant', 'Potential service name'),
  ('wildflower', 'future_reserved', 'nature_plant', 'Potential service name'),

  -- Water
  ('stream', 'future_reserved', 'nature_water', 'Potential service name'),
  ('brook', 'future_reserved', 'nature_water', 'Potential service name'),
  ('creek', 'future_reserved', 'nature_water', 'Potential service name'),
  ('pond', 'future_reserved', 'nature_water', 'Potential service name'),
  ('spring', 'future_reserved', 'nature_water', 'Potential service name'),
  ('well', 'future_reserved', 'nature_water', 'Potential service name'),
  ('rain', 'future_reserved', 'nature_water', 'Potential service name'),
  ('mist', 'future_reserved', 'nature_water', 'Potential service name'),
  ('dew', 'future_reserved', 'nature_water', 'Potential service name'),

  -- Time
  ('sunrise', 'future_reserved', 'nature_time', 'Potential service name'),
  ('sunset', 'future_reserved', 'nature_time', 'Potential service name'),
  ('dawn', 'future_reserved', 'nature_time', 'Potential service name'),
  ('dusk', 'future_reserved', 'nature_time', 'Potential service name'),
  ('twilight', 'future_reserved', 'nature_time', 'Potential service name'),
  ('midnight', 'future_reserved', 'nature_time', 'Potential service name'),
  ('noon', 'future_reserved', 'nature_time', 'Potential service name'),
  ('solstice', 'future_reserved', 'nature_time', 'Potential service name'),
  ('equinox', 'future_reserved', 'nature_time', 'Potential service name');

-- =============================================================================
-- ADDITIONAL SYSTEM ENTRIES
-- =============================================================================

INSERT OR IGNORE INTO reserved_usernames (username, reason, category, notes) VALUES
  -- Additional email/communication
  ('emails', 'system', 'email', 'Email infrastructure'),
  ('pop3', 'system', 'email', 'Email infrastructure'),
  ('webmail', 'system', 'email', 'Email infrastructure'),
  ('mx', 'system', 'email', 'Email infrastructure'),
  ('newsletters', 'system', 'email', 'Email infrastructure'),
  ('noreply', 'system', 'email', 'Email infrastructure'),
  ('no-reply', 'system', 'email', 'Email infrastructure'),
  ('mailer', 'system', 'email', 'Email infrastructure'),
  ('bounce', 'system', 'email', 'Email infrastructure'),
  ('mailbox', 'system', 'email', 'Email infrastructure'),

  -- Network infrastructure
  ('sftp', 'system', 'network', 'Network infrastructure'),
  ('vpn', 'system', 'network', 'Network infrastructure'),
  ('proxy', 'system', 'network', 'Network infrastructure'),
  ('gateway', 'system', 'network', 'Network infrastructure'),
  ('firewall', 'system', 'network', 'Network infrastructure'),
  ('fonts', 'system', 'network', 'Static assets'),
  ('img', 'system', 'network', 'Static assets'),
  ('js', 'system', 'network', 'Static assets'),
  ('css', 'system', 'network', 'Static assets'),
  ('cache', 'system', 'network', 'Network infrastructure'),
  ('server', 'system', 'network', 'Network infrastructure'),
  ('servers', 'system', 'network', 'Network infrastructure'),
  ('node', 'system', 'network', 'Network infrastructure'),
  ('nodes', 'system', 'network', 'Network infrastructure'),
  ('cluster', 'system', 'network', 'Network infrastructure'),
  ('worker', 'system', 'network', 'Network infrastructure'),
  ('workers', 'system', 'network', 'Network infrastructure'),

  -- DNS
  ('ns', 'system', 'dns', 'DNS infrastructure'),
  ('ns1', 'system', 'dns', 'DNS infrastructure'),
  ('ns2', 'system', 'dns', 'DNS infrastructure'),
  ('ns3', 'system', 'dns', 'DNS infrastructure'),
  ('dns', 'system', 'dns', 'DNS infrastructure'),
  ('nameserver', 'system', 'dns', 'DNS infrastructure'),
  ('whois', 'system', 'dns', 'DNS infrastructure'),
  ('rdap', 'system', 'dns', 'DNS infrastructure'),

  -- Additional development
  ('demos', 'system', 'dev', 'Development'),
  ('examples', 'system', 'dev', 'Development'),
  ('samples', 'system', 'dev', 'Development'),
  ('staging', 'system', 'dev', 'Development'),
  ('development', 'system', 'dev', 'Development'),
  ('production', 'system', 'dev', 'Development'),
  ('internal', 'system', 'dev', 'Development'),
  ('beta', 'system', 'dev', 'Development'),
  ('alpha', 'system', 'dev', 'Development'),
  ('canary', 'system', 'dev', 'Development'),
  ('nightly', 'system', 'dev', 'Development'),
  ('preview', 'system', 'dev', 'Development'),
  ('release', 'system', 'dev', 'Development'),
  ('releases', 'system', 'dev', 'Development'),

  -- Web infrastructure
  ('oauth2', 'system', 'web', 'Web infrastructure'),
  ('sso', 'system', 'web', 'Web infrastructure'),
  ('backend', 'system', 'web', 'Web infrastructure'),
  ('control', 'system', 'web', 'Web infrastructure'),
  ('panel', 'system', 'web', 'Web infrastructure'),
  ('console', 'system', 'web', 'Web infrastructure'),
  ('payment', 'system', 'web', 'Web infrastructure'),
  ('payments', 'system', 'web', 'Web infrastructure'),
  ('pay', 'system', 'web', 'Web infrastructure'),
  ('preferences', 'system', 'web', 'Web infrastructure'),
  ('configuration', 'system', 'web', 'Web infrastructure'),
  ('config', 'system', 'web', 'Web infrastructure'),
  ('profile', 'system', 'web', 'Web infrastructure'),
  ('profiles', 'system', 'web', 'Web infrastructure'),
  ('user', 'system', 'web', 'Web infrastructure'),
  ('users', 'system', 'web', 'Web infrastructure'),
  ('member', 'system', 'web', 'Web infrastructure'),
  ('members', 'system', 'web', 'Web infrastructure'),
  ('accounts', 'system', 'web', 'Web infrastructure'),
  ('signin', 'system', 'web', 'Web infrastructure'),
  ('signout', 'system', 'web', 'Web infrastructure'),

  -- Metadata
  ('sitemaps', 'system', 'metadata', 'Site metadata'),
  ('healthcheck', 'system', 'metadata', 'Site metadata'),
  ('ping', 'system', 'metadata', 'Site metadata'),
  ('telemetry', 'system', 'metadata', 'Site metadata'),
  ('logs', 'system', 'metadata', 'Site metadata'),
  ('log', 'system', 'metadata', 'Site metadata'),
  ('debug', 'system', 'metadata', 'Site metadata'),
  ('trace', 'system', 'metadata', 'Site metadata'),
  ('error', 'system', 'metadata', 'Site metadata'),
  ('errors', 'system', 'metadata', 'Site metadata'),
  ('manifest', 'system', 'metadata', 'Site metadata'),
  ('atom', 'system', 'metadata', 'Site metadata'),
  ('feeds', 'system', 'metadata', 'Site metadata'),

  -- Legal
  ('reports', 'system', 'legal', 'Legal pages'),
  ('vulnerability', 'system', 'legal', 'Legal pages'),
  ('cve', 'system', 'legal', 'Legal pages'),
  ('compliance', 'system', 'legal', 'Legal pages'),
  ('gdpr', 'system', 'legal', 'Legal pages'),
  ('ccpa', 'system', 'legal', 'Legal pages'),
  ('dsar', 'system', 'legal', 'Legal pages'),
  ('tos', 'system', 'legal', 'Legal pages'),
  ('eula', 'system', 'legal', 'Legal pages'),
  ('trademark', 'system', 'legal', 'Legal pages'),

  -- Documentation
  ('faq', 'system', 'docs', 'Documentation'),
  ('faqs', 'system', 'docs', 'Documentation'),
  ('kb', 'system', 'docs', 'Documentation'),
  ('knowledgebase', 'system', 'docs', 'Documentation'),
  ('manual', 'system', 'docs', 'Documentation'),
  ('manuals', 'system', 'docs', 'Documentation'),
  ('reference', 'system', 'docs', 'Documentation'),
  ('spec', 'system', 'docs', 'Documentation'),
  ('specs', 'system', 'docs', 'Documentation'),
  ('info', 'system', 'docs', 'Documentation'),
  ('contacts', 'system', 'docs', 'Documentation');

-- =============================================================================
-- MIGRATION NOTES
-- =============================================================================
--
-- This migration populates the reserved_usernames table with comprehensive
-- entries from the Loam name protection system.
--
-- Categories added:
--   - grove_service: All Grove services (public, internal, aliases, codenames)
--   - trademark: Grove brand and tier names
--   - impersonation: Terms that could be used for impersonation
--   - fraud: Common scam/phishing patterns
--   - future_reserved: Nature terms reserved for future services
--   - system: Infrastructure and technical terms
--
-- The Loam TypeScript blocklist and this database table should be kept in sync.
-- The TypeScript blocklist serves as the primary source of truth for validation,
-- while this database allows for dynamic additions via admin interface.
--
-- @see docs/specs/loam-spec.md
-- @see packages/engine/src/lib/config/domain-blocklist.ts
