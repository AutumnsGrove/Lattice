-- Post Migration Script for GroveEngine
-- Copies all posts from one tenant to another
--
-- USAGE:
-- 1. First run diagnose-tenants.sql to find the source and target tenant IDs
-- 2. Replace SOURCE_TENANT_ID and TARGET_TENANT_ID below with actual UUIDs
-- 3. Run with: npx wrangler d1 execute grove-engine-db --file=scripts/migrate-posts.sql --remote
--
-- WARNING: This is a one-way copy operation. Backup your data first!

-- Set these to your actual tenant IDs (found from diagnose-tenants.sql)
-- Example:
--   SOURCE_TENANT_ID = 'abc123-...'  (the tenant with your posts, e.g., autumnsgrove)
--   TARGET_TENANT_ID = 'def456-...'  (the tenant you want posts in, e.g., dave2)

-- Uncomment and run this after setting the correct IDs:

/*
INSERT INTO posts (
  id,
  tenant_id,
  slug,
  title,
  description,
  markdown_content,
  html_content,
  gutter_content,
  tags,
  status,
  featured_image,
  word_count,
  reading_time,
  published_at,
  created_at,
  updated_at
)
SELECT
  -- Generate new UUID for each post
  lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' ||
  substr(lower(hex(randomblob(2))), 2) || '-' ||
  substr('89ab', abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))), 2) || '-' ||
  lower(hex(randomblob(6))) as id,
  'TARGET_TENANT_ID' as tenant_id,  -- Replace with actual target tenant ID
  slug,
  title,
  description,
  markdown_content,
  html_content,
  gutter_content,
  tags,
  status,
  featured_image,
  word_count,
  reading_time,
  published_at,
  created_at,
  updated_at
FROM posts
WHERE tenant_id = 'SOURCE_TENANT_ID'  -- Replace with actual source tenant ID
  AND slug NOT IN (
    SELECT slug FROM posts WHERE tenant_id = 'TARGET_TENANT_ID'  -- Avoid duplicates
  );
*/

-- Alternatively, if you want to MOVE posts (change tenant_id):
-- This is simpler but means the source tenant loses access to posts
/*
UPDATE posts
SET tenant_id = 'TARGET_TENANT_ID'
WHERE tenant_id = 'SOURCE_TENANT_ID';
*/

-- Verification query (run after migration to confirm):
SELECT
  t.subdomain,
  COUNT(p.id) as post_count
FROM tenants t
LEFT JOIN posts p ON p.tenant_id = t.id
WHERE t.subdomain IN ('autumnsgrove', 'dave2', 'autumn')
GROUP BY t.id, t.subdomain;
