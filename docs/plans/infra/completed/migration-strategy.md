# Lattice Migration Strategy

**Source Repository:** [AutumnsGrove](https://github.com/AutumnsGrove/AutumnsGrove)
**Target Repository:** Lattice (this repo)
**Status:** Ready to Execute
**Created:** December 1, 2025

---

## Executive Summary

This document provides a detailed, executable migration strategy for extracting the blog engine from AutumnsGrove into the standalone Lattice platform. The goal is a clean extraction that:

1. Preserves all working blog functionality
2. Removes personal/site-specific features
3. Prepares the codebase for multi-tenant architecture
4. Maintains security standards (CVSS 8.6/10)

---

## Source Repository Analysis

### Repository Structure Overview

```
AutumnsGrove/
├── src/
│   ├── routes/
│   │   ├── admin/           # KEEP - Blog admin panel
│   │   ├── api/             # PARTIAL - Keep blog APIs, remove git/ai/timeline
│   │   ├── auth/            # KEEP - Magic code auth system
│   │   ├── blog/            # KEEP - Core blog routes
│   │   ├── about/           # KEEP - Static page
│   │   ├── contact/         # KEEP - Static page
│   │   ├── dashboard/       # REMOVE - Personal GitHub dashboard
│   │   ├── gallery/         # REMOVE - Personal photo gallery
│   │   ├── recipes/         # EVALUATE - Could be useful feature
│   │   ├── showcase/        # REMOVE - Personal content
│   │   ├── timeline/        # REMOVE - Personal activity tracking
│   │   └── rss.xml/         # KEEP - RSS feed
│   └── lib/
│       ├── auth/            # KEEP - Session/JWT management
│       ├── components/      # PARTIAL - See component analysis
│       ├── server/          # KEEP - Server utilities
│       ├── styles/          # KEEP - Styling
│       └── utils/           # KEEP - Core utilities
├── UserContent/             # TEMPLATE - Keep structure, remove personal content
├── migrations/              # ADAPT - Modify for multi-tenant
├── static/                  # KEEP - Fonts, assets
└── workers/                 # REMOVE - Personal workers (daily-summary)
```

---

## Component Extraction Matrix

### Routes - Keep

| Route       | Files                                            | Notes                  |
| ----------- | ------------------------------------------------ | ---------------------- |
| `/admin/`   | Layout, dashboard, blog, pages, images, settings | Core CMS functionality |
| `/auth/`    | login, logout, send-code, verify-code, me        | Magic code auth        |
| `/blog/`    | list, [slug], search                             | Blog display           |
| `/about/`   | +page.svelte, +page.server.js                    | Static page            |
| `/contact/` | +page.svelte, +page.server.js                    | Static page            |
| `/rss.xml/` | +server.js                                       | RSS feed               |

### Routes - Remove

| Route         | Reason                                           |
| ------------- | ------------------------------------------------ |
| `/dashboard/` | Personal GitHub stats dashboard                  |
| `/gallery/`   | Personal photo gallery (Willow photos)           |
| `/timeline/`  | Personal AI-generated activity tracking          |
| `/showcase/`  | Personal showcase content                        |
| `/recipes/`   | Optional - evaluate for future (cooking recipes) |
| `/credits/`   | Site-specific credits page                       |

### API Routes - Keep

| Route                  | Files                         | Notes               |
| ---------------------- | ----------------------------- | ------------------- |
| `/api/posts/`          | CRUD operations               | Core blog API       |
| `/api/pages/`          | Page management               | Static pages API    |
| `/api/images/`         | upload, list, delete, filters | R2 media management |
| `/api/settings/`       | Site settings                 | Per-tenant config   |
| `/api/admin/settings/` | Admin settings                | Protected admin API |
| `/api/feed/`           | RSS generation                | Content feed        |

### API Routes - Remove

| Route                 | Reason                               |
| --------------------- | ------------------------------------ |
| `/api/git/`           | GitHub API integration (personal)    |
| `/api/ai/`            | AI repository analysis (personal)    |
| `/api/timeline/`      | Timeline generation (personal)       |
| `/api/gallery/`       | Photo gallery management (personal)  |
| `/api/admin/gallery/` | Gallery admin (personal)             |
| `/api/admin/logs/`    | Site logs (rebuild for multi-tenant) |

### Components - Keep

| Component                 | Path                    | Priority | Notes                     |
| ------------------------- | ----------------------- | -------- | ------------------------- |
| ContentWithGutter.svelte  | lib/components/custom/  | Critical | Unique gutter annotations |
| GutterItem.svelte         | lib/components/custom/  | Critical | Individual annotation     |
| LeftGutter.svelte         | lib/components/custom/  | Critical | Gutter container          |
| TableOfContents.svelte    | lib/components/custom/  | Critical | Auto-generated TOC        |
| MobileTOC.svelte          | lib/components/custom/  | Critical | Mobile TOC                |
| CollapsibleSection.svelte | lib/components/custom/  | High     | Expandable content        |
| MarkdownEditor.svelte     | lib/components/admin/   | Critical | Post editing              |
| GutterManager.svelte      | lib/components/admin/   | Critical | Gutter UI                 |
| ImageGallery.svelte       | lib/components/gallery/ | High     | In-post galleries         |
| Lightbox.svelte           | lib/components/gallery/ | High     | Image modal               |
| ZoomableImage.svelte      | lib/components/gallery/ | High     | Pan/zoom                  |
| All UI components         | lib/components/ui/      | High     | Shadcn components         |

### Components - Remove

| Component                  | Path                   | Reason           |
| -------------------------- | ---------------------- | ---------------- |
| ActivityOverview.svelte    | lib/components/charts/ | GitHub dashboard |
| LOCBar.svelte              | lib/components/charts/ | GitHub stats     |
| RepoBreakdown.svelte       | lib/components/charts/ | GitHub stats     |
| Sparkline.svelte           | lib/components/charts/ | GitHub stats     |
| LogViewer.svelte           | lib/components/custom/ | Personal logs    |
| InternalsPostViewer.svelte | lib/components/custom/ | Internal tooling |
| IconLegend.svelte          | lib/components/custom/ | Recipe-specific  |

---

## Utility Files Analysis

### Keep (Core Engine)

| File                        | Purpose                                  |
| --------------------------- | ---------------------------------------- |
| `src/lib/utils/markdown.js` | Markdown parsing, gutter content loading |
| `src/lib/utils/csrf.js`     | CSRF protection                          |
| `src/lib/utils/sanitize.js` | XSS prevention (DOMPurify)               |
| `src/lib/auth/session.js`   | Session management                       |
| `src/lib/auth/jwt.js`       | JWT signing/verification                 |
| `src/hooks.server.js`       | Security headers, CSRF, auth             |

### Modify for Multi-Tenant

| File                        | Changes Needed                             |
| --------------------------- | ------------------------------------------ |
| `src/lib/utils/markdown.js` | Remove hardcoded paths, use tenant context |
| `src/hooks.server.js`       | Add subdomain detection, tenant context    |
| All API routes              | Add tenant_id filtering                    |
| All admin routes            | Scope to current tenant                    |

---

## Database Schema Migration

### Current Tables (Source)

**From `schema.sql` (git stats - NOT needed):**

- repositories, repo_snapshots, commits, todo_snapshots
- ai_analyses, commit_activity, daily_summaries
- ai_usage, ai_requests, background_jobs
- gallery_images, gallery_tags, gallery_image_tags
- gallery_collections, gallery_collection_images

**From migrations (NEEDED with modifications):**

```sql
-- 001_magic_codes.sql (KEEP - auth)
magic_codes (id, email, code, created_at, expires_at, used)

-- 003_site_settings.sql (KEEP - per-tenant settings)
site_settings (id, setting_key, setting_value, updated_at)

-- 004_pages_table.sql (KEEP - static pages)
pages (slug, title, description, type, markdown_content, html_content,
       hero, gutter_content, font, created_at, updated_at)
```

### Target Schema (Multi-Tenant)

```sql
-- Tenants table (NEW)
CREATE TABLE tenants (
  id TEXT PRIMARY KEY,                    -- UUID
  subdomain TEXT UNIQUE NOT NULL,         -- e.g., "autumn", "mom"
  display_name TEXT NOT NULL,
  email TEXT NOT NULL,
  plan TEXT DEFAULT 'starter' CHECK (plan IN ('starter', 'professional', 'business')),
  storage_used INTEGER DEFAULT 0,         -- Bytes
  post_count INTEGER DEFAULT 0,
  custom_domain TEXT,                     -- Business plan only
  theme TEXT DEFAULT 'default',
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch())
);

-- Posts table (NEW - replaces markdown files)
CREATE TABLE posts (
  id TEXT PRIMARY KEY,                    -- UUID
  tenant_id TEXT NOT NULL,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  markdown_content TEXT NOT NULL,
  html_content TEXT,                      -- Pre-rendered
  gutter_content TEXT DEFAULT '[]',       -- JSON array
  tags TEXT DEFAULT '[]',                 -- JSON array
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  featured_image TEXT,
  word_count INTEGER DEFAULT 0,
  reading_time INTEGER DEFAULT 0,         -- Minutes
  published_at INTEGER,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(tenant_id, slug),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- Pages table (MODIFIED - add tenant_id)
CREATE TABLE pages (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'page',
  markdown_content TEXT NOT NULL,
  html_content TEXT,
  hero TEXT,
  gutter_content TEXT DEFAULT '[]',
  font TEXT DEFAULT 'default',
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(tenant_id, slug),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- Media table (NEW - replaces R2-only approach)
CREATE TABLE media (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  url TEXT NOT NULL,
  size INTEGER,                           -- Bytes
  width INTEGER,
  height INTEGER,
  mime_type TEXT,
  uploaded_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- Site settings (MODIFIED - add tenant_id)
CREATE TABLE site_settings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT NOT NULL,
  setting_key TEXT NOT NULL,
  setting_value TEXT NOT NULL,
  updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
  UNIQUE(tenant_id, setting_key),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- Magic codes (KEEP as-is, codes are global)
CREATE TABLE magic_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  used INTEGER DEFAULT 0
);

-- Sessions (NEW - replaces JWT-only)
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  user_email TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- Indexes
CREATE INDEX idx_posts_tenant ON posts(tenant_id);
CREATE INDEX idx_posts_status ON posts(status) WHERE status = 'published';
CREATE INDEX idx_posts_published ON posts(published_at DESC);
CREATE INDEX idx_pages_tenant ON pages(tenant_id);
CREATE INDEX idx_media_tenant ON media(tenant_id);
CREATE INDEX idx_settings_tenant ON site_settings(tenant_id);
CREATE INDEX idx_sessions_tenant ON sessions(tenant_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);
```

---

## Migration Execution Plan

### Phase 1: Clean Extraction (Day 1-2)

**Step 1.1: Create grove-engine directory structure**

```bash
# In Lattice repo, create the engine package
mkdir -p libs/engine/src/{routes,lib}
mkdir -p libs/engine/src/lib/{auth,components,utils,server}
mkdir -p libs/engine/src/routes/{admin,api,auth,blog}
mkdir -p libs/engine/migrations
mkdir -p libs/engine/static/fonts
```

**Step 1.2: Copy core files from source**

```bash
# Auth system
cp -r source/src/lib/auth/* libs/engine/src/lib/auth/

# Core utilities
cp source/src/lib/utils/markdown.js libs/engine/src/lib/utils/
cp source/src/lib/utils/csrf.js libs/engine/src/lib/utils/
cp source/src/lib/utils/sanitize.js libs/engine/src/lib/utils/

# Components - Custom (gutter, TOC)
cp -r source/src/lib/components/custom/* libs/engine/src/lib/components/custom/
# Remove: LogViewer.svelte, InternalsPostViewer.svelte, IconLegend.svelte

# Components - Admin
cp -r source/src/lib/components/admin/* libs/engine/src/lib/components/admin/

# Components - Gallery (for posts)
cp -r source/src/lib/components/gallery/* libs/engine/src/lib/components/gallery/

# Components - UI (shadcn)
cp -r source/src/lib/components/ui/* libs/engine/src/lib/components/ui/

# Routes - Blog
cp -r source/src/routes/blog/* libs/engine/src/routes/blog/

# Routes - Admin (selective)
cp source/src/routes/admin/+layout.* libs/engine/src/routes/admin/
cp source/src/routes/admin/+page.svelte libs/engine/src/routes/admin/
cp -r source/src/routes/admin/blog/* libs/engine/src/routes/admin/blog/
cp -r source/src/routes/admin/pages/* libs/engine/src/routes/admin/pages/
cp -r source/src/routes/admin/images/* libs/engine/src/routes/admin/images/
cp -r source/src/routes/admin/settings/* libs/engine/src/routes/admin/settings/

# Routes - Auth
cp -r source/src/routes/auth/* libs/engine/src/routes/auth/

# Routes - API (selective)
cp -r source/src/routes/api/posts/* libs/engine/src/routes/api/posts/
cp -r source/src/routes/api/pages/* libs/engine/src/routes/api/pages/
cp -r source/src/routes/api/images/* libs/engine/src/routes/api/images/
cp -r source/src/routes/api/settings/* libs/engine/src/routes/api/settings/
cp -r source/src/routes/api/feed/* libs/engine/src/routes/api/feed/

# Static pages
cp -r source/src/routes/about/* libs/engine/src/routes/about/
cp -r source/src/routes/contact/* libs/engine/src/routes/contact/

# RSS feed
cp -r source/src/routes/rss.xml/* libs/engine/src/routes/rss.xml/

# Core hooks
cp source/src/hooks.server.js libs/engine/src/

# Styles
cp -r source/src/lib/styles/* libs/engine/src/lib/styles/

# Static assets (fonts)
cp -r source/static/fonts/* libs/engine/static/fonts/

# Tailwind configs
cp source/tailwind.config.js libs/engine/
cp source/tailwind.typography.config.js libs/engine/
cp source/postcss.config.js libs/engine/
```

**Step 1.3: Remove unwanted files**

```bash
# Remove from copied components
rm -f libs/engine/src/lib/components/custom/LogViewer.svelte
rm -f libs/engine/src/lib/components/custom/InternalsPostViewer.svelte
rm -f libs/engine/src/lib/components/custom/IconLegend.svelte

# Remove charts (GitHub dashboard specific)
rm -rf libs/engine/src/lib/components/charts/
```

**Step 1.4: Create template UserContent**

```bash
mkdir -p libs/engine/UserContent/{Posts,About,Contact,Home}

# Create empty template files
cat > libs/engine/UserContent/site-config.json << 'EOF'
{
  "owner": {
    "name": "Your Name",
    "email": "you@example.com"
  },
  "site": {
    "title": "My Grove Blog",
    "description": "A beautiful blog powered by Lattice",
    "copyright": "Your Name"
  },
  "social": {}
}
EOF
```

### Phase 2: Multi-Tenant Adaptation (Day 3-5)

**Step 2.1: Update hooks.server.js**

Add subdomain detection:

```javascript
// At top of handle function
const host = event.request.headers.get("host");
const subdomain = extractSubdomain(host);

if (subdomain && subdomain !== "www" && subdomain !== "grove") {
  const tenant = await getTenant(event.platform?.env?.DB, subdomain);
  if (tenant) {
    event.locals.tenant = tenant;
    event.locals.isTenantRequest = true;
  }
}
```

**Step 2.2: Update API routes**

All API routes need tenant context:

```javascript
// Before any query
const tenant = event.locals.tenant;
if (!tenant) {
  throw error(404, "Blog not found");
}

// In queries
const posts = await db
  .prepare("SELECT * FROM posts WHERE tenant_id = ? AND status = ?")
  .bind(tenant.id, "published")
  .all();
```

**Step 2.3: Update markdown.js**

Replace hardcoded import.meta.glob with database queries:

```javascript
// Remove all import.meta.glob calls
// Add functions that query D1 database instead

export async function getAllPosts(db, tenantId) {
  const result = await db
    .prepare(
      "SELECT * FROM posts WHERE tenant_id = ? AND status = ? ORDER BY published_at DESC",
    )
    .bind(tenantId, "published")
    .all();
  return result.results;
}
```

### Phase 3: Testing & Validation (Day 6-7)

**Step 3.1: Security tests**

- CSRF protection still works
- XSS sanitization intact
- Auth flows functional
- Rate limiting active

**Step 3.2: Functionality tests**

- Create/edit/delete posts
- Upload images
- Gutter annotations render
- TOC generates correctly
- RSS feed works

**Step 3.3: Multi-tenant isolation tests**

- Tenant A cannot see Tenant B's posts
- API endpoints filter by tenant
- Sessions scoped to tenant

---

## Files NOT to Migrate

### Workers (Remove entirely)

```
workers/
├── daily-summary/           # AI timeline generation
└── sync-posts/              # GitHub sync (if exists)
```

### Routes (Skip)

```
src/routes/dashboard/        # GitHub dashboard
src/routes/gallery/          # Photo gallery
src/routes/timeline/         # AI timeline
src/routes/showcase/         # Personal showcase
src/routes/recipes/          # Cooking recipes (evaluate later)
src/routes/credits/          # Site credits
```

### API Routes (Skip)

```
src/routes/api/git/          # All GitHub API
src/routes/api/ai/           # AI analysis
src/routes/api/timeline/     # Timeline API
src/routes/api/gallery/      # Gallery API
src/routes/api/admin/gallery/# Gallery admin
src/routes/api/admin/logs/   # Log viewer
```

### Database Tables (Don't Create)

```sql
-- These are for personal features, not needed:
repositories, repo_snapshots, commits, todo_snapshots
ai_analyses, commit_activity, daily_summaries
ai_usage, ai_requests, background_jobs
gallery_images, gallery_tags, gallery_image_tags
gallery_collections, gallery_collection_images
```

---

## Content Migration (First Client)

### Export from AutumnsGrove

```javascript
// scripts/export-content.js
async function exportAutumnsGrove() {
  // Read all markdown files
  const posts = glob.sync("UserContent/Posts/*.md");
  const pages = glob.sync("UserContent/{About,Contact,Home}/*.md");

  // Parse frontmatter and content
  const exportData = {
    posts: posts.map(parseMdFile),
    pages: pages.map(parseMdFile),
    gutterContent: extractGutterManifests(),
    siteConfig: require("UserContent/site-config.json"),
    exportedAt: new Date().toISOString(),
  };

  return exportData;
}
```

### Import to Grove Engine

```javascript
// scripts/import-content.js
async function importToTenant(db, tenantId, exportData) {
  for (const post of exportData.posts) {
    await db
      .prepare(
        `
      INSERT INTO posts (id, tenant_id, slug, title, description,
                        markdown_content, html_content, gutter_content,
                        tags, status, published_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
      )
      .bind(
        generateUUID(),
        tenantId,
        post.slug,
        post.title,
        post.description,
        post.content,
        renderMarkdown(post.content),
        JSON.stringify(post.gutterContent || []),
        JSON.stringify(post.tags || []),
        "published",
        post.date,
        post.date,
        Date.now(),
      )
      .run();
  }
}
```

---

## Risk Mitigation Checklist

- [ ] Keep AutumnsGrove running until Grove Engine validated
- [ ] Back up all content before any migration
- [ ] Test with Mom's content before going live
- [ ] Verify all 181 security tests pass after migration
- [ ] Ensure no personal content (Willow photos) accidentally included
- [ ] Validate subdomain routing in staging environment
- [ ] Test tenant isolation thoroughly
- [ ] Verify CDN URLs work for migrated images

---

## Success Criteria

### Phase 1 Complete

- [ ] Clean codebase with no personal features
- [ ] All components compile without errors
- [ ] Basic routes respond correctly
- [ ] Authentication flow works

### Phase 2 Complete

- [ ] Multi-tenant database schema deployed
- [ ] Subdomain routing functional
- [ ] API endpoints filter by tenant
- [ ] Admin panel scoped to tenant

### MVP Complete

- [ ] First client (Mom) live on subdomain
- [ ] All posts migrated successfully
- [ ] Gutter annotations working
- [ ] Image uploads functional
- [ ] RSS feed generating
- [ ] Page load < 2 seconds

---

## Next Steps

1. **Approve this strategy** - Review with stakeholders
2. **Create grove-engine package** - Execute Phase 1 extraction
3. **Set up CI/CD** - GitHub Actions for the new package
4. **Deploy staging** - Test on staging subdomain
5. **Migrate Mom's content** - First real tenant test
6. **Go live** - Point DNS to new infrastructure

---

_Last Updated: December 1, 2025_
_Status: Ready for Execution_
