# GroveEngine Migration Plan

**Source:** AutumnsGrove (autumnsgrove.com)
**Target:** GroveEngine (grove.place platform)
**Status:** Planning Phase
**Created:** November 30, 2025

---

## Overview

This document outlines the strategy for extracting the blog engine from AutumnsGrove into a standalone, multi-tenant platform (GroveEngine). The goal is a smooth migration that preserves all working code while adding multi-tenant capabilities.

---

## Current State: AutumnsGrove

### Completed Features (Ready to Extract)

| Component | Location | Extraction Priority | Notes |
|-----------|----------|---------------------|-------|
| **Blog Engine** | `src/routes/blog/` | Critical | Core markdown rendering, frontmatter |
| **Gutter Annotations** | `src/lib/components/ContentWithGutter.svelte` | Critical | Unique feature, sidebar annotations |
| **Table of Contents** | `src/lib/components/TableOfContents.svelte` | Critical | Auto-generated from headings |
| **Admin Panel** | `src/routes/admin/` | Critical | Full CRUD for posts/pages/images |
| **Markdown Parser** | `src/lib/utils/markdown.js` | Critical | Marked.js with custom extensions |
| **R2 Image Hosting** | `src/routes/api/images/` | High | CDN integration, upload handling |
| **D1 Database** | `src/lib/db/schema.sql` | High | Needs multi-tenant adaptation |
| **Auth System** | `src/lib/auth/`, `src/routes/auth/` | High | GitHub OAuth, JWT, sessions |
| **Security Patterns** | `src/lib/utils/csrf.js`, `hooks.server.js` | High | XSS/CSRF/rate limiting |
| **Photo Gallery** | `src/lib/components/gallery/` | Medium | Lightbox, zoom, captions |
| **Custom Fonts** | Admin settings, `static/fonts/` | Medium | 7 self-hosted fonts |
| **Code Blocks** | Markdown renderer | Medium | GitHub-style with copy button |
| **Pages System** | `src/routes/admin/pages/` | Medium | Home/About/Contact editable |

### Features NOT to Extract (Personal/Site-Specific)

| Component | Reason |
|-----------|--------|
| GitHub Dashboard | Personal feature, not needed for blog platform |
| Timeline | Site-specific activity tracking |
| Willow Gallery | Personal content |
| AI Repository Analysis | GitHub-specific feature |

### Security Status

- **CVSS Score:** 8.6/10
- **Tests:** 181 security tests passing
- **XSS Protection:** DOMPurify sanitization
- **CSRF Protection:** Token validation on all mutations
- **Rate Limiting:** Exponential backoff, KV-based
- **Headers:** Full security headers in hooks.server.js

---

## Target State: GroveEngine

### Multi-Tenant Architecture

```
grove.place/                 # Marketing site (grove-website)
├── /pricing
├── /signup
├── /login
└── /dashboard              # Client management

username.grove.place/        # Individual blogs (grove-engine)
├── /                       # Blog homepage
├── /blog/[slug]           # Individual posts
├── /about, /contact       # Static pages
└── /admin/                # Blog admin panel
```

### Database Schema Changes

**Current (Single Tenant):**
```sql
CREATE TABLE posts (
  id INTEGER PRIMARY KEY,
  slug TEXT UNIQUE,
  title TEXT,
  content TEXT,
  ...
);
```

**Target (Multi-Tenant):**
```sql
CREATE TABLE posts (
  id INTEGER PRIMARY KEY,
  tenant_id TEXT NOT NULL,  -- subdomain identifier
  slug TEXT,
  title TEXT,
  content TEXT,
  ...
  UNIQUE(tenant_id, slug)   -- Composite unique constraint
);

CREATE TABLE tenants (
  id TEXT PRIMARY KEY,      -- e.g., "username"
  subdomain TEXT UNIQUE,
  plan TEXT DEFAULT 'starter',
  storage_used INTEGER DEFAULT 0,
  post_count INTEGER DEFAULT 0,
  created_at TEXT,
  ...
);
```

### Subdomain Routing

```javascript
// hooks.server.js
export async function handle({ event, resolve }) {
  const host = event.request.headers.get('host');
  const subdomain = host?.split('.')[0];

  if (subdomain && subdomain !== 'www' && subdomain !== 'grove') {
    // This is a tenant blog
    event.locals.tenant = await getTenant(subdomain);
    event.locals.isTenantRequest = true;
  }

  return resolve(event);
}
```

---

## Migration Phases

### Phase 1: Repository Setup (Week 1)

- [ ] Create `grove-engine` repository from AutumnsGrove fork
- [ ] Remove personal features (dashboard, timeline, willow gallery)
- [ ] Update package.json, README, AGENT.md
- [ ] Configure CI/CD for grove-engine
- [ ] Set up development environment variables

**Files to Remove:**
```
src/routes/dashboard/
src/routes/timeline/
src/routes/showcase/
src/routes/api/git/
src/routes/api/ai/
workers/daily-summary/
UserContent/Posts/*  (keep structure, remove personal content)
```

**Files to Keep (Core Engine):**
```
src/routes/blog/
src/routes/admin/
src/routes/auth/
src/routes/api/posts/
src/routes/api/images/
src/routes/api/pages/
src/lib/components/
src/lib/utils/
src/lib/auth/
src/lib/db/
```

### Phase 2: Multi-Tenant Foundation (Week 2-3)

- [ ] Add `tenant_id` column to all content tables
- [ ] Create `tenants` table for subdomain management
- [ ] Implement subdomain detection in hooks.server.js
- [ ] Update all queries to filter by tenant_id
- [ ] Add tenant context to all API routes
- [ ] Create tenant provisioning script

**Key Files to Modify:**
```
src/lib/db/schema.sql       # Add tenant tables
src/hooks.server.js         # Subdomain routing
src/routes/api/**           # Add tenant filtering
src/routes/admin/**         # Scope to current tenant
```

### Phase 3: Plan Enforcement (Week 3-4)

- [ ] Implement post limits (Starter: 250, Pro: unlimited)
- [ ] Implement storage limits (5GB, 20GB, 100GB)
- [ ] Add archival system for over-limit posts (soft limits)
- [ ] Create usage tracking in tenant table
- [ ] Add upgrade prompts in admin panel

**Limit Enforcement Logic:**
```javascript
async function canCreatePost(tenant) {
  if (tenant.plan === 'professional' || tenant.plan === 'business') {
    return { allowed: true };
  }

  const count = await getPostCount(tenant.id);
  if (count >= 250) {
    return {
      allowed: false,
      reason: 'post_limit',
      message: 'Upgrade to Professional for unlimited posts'
    };
  }
  return { allowed: true };
}
```

### Phase 4: Theme System (Week 4-5)

- [ ] Extract theme system from current implementation
- [ ] Create 3-5 base themes
- [ ] Add theme selector to admin panel
- [ ] Implement per-tenant theme storage
- [ ] Add theme preview functionality

**Theme Structure:**
```
src/lib/themes/
├── default/
│   ├── theme.css
│   └── config.json
├── minimal/
├── forest/
├── ocean/
└── sunset/
```

### Phase 5: Testing & Polish (Week 5-6)

- [ ] Migrate security tests to multi-tenant context
- [ ] Add tenant isolation tests
- [ ] Test subdomain routing edge cases
- [ ] Performance testing with multiple tenants
- [ ] Documentation updates

---

## Component Extraction Checklist

### Critical Path (Must Have for MVP)

- [ ] **ContentWithGutter.svelte** - Main blog post layout
- [ ] **GutterItem.svelte** - Sidebar annotation component
- [ ] **LeftGutter.svelte** - Gutter container
- [ ] **TableOfContents.svelte** - Auto-generated TOC
- [ ] **MobileTOC.svelte** - Mobile-friendly TOC
- [ ] **markdown.js** - Markdown parser with extensions
- [ ] **Admin routes** - Post/page management
- [ ] **Auth system** - OAuth + session management
- [ ] **Image upload** - R2 integration

### High Priority (Should Have)

- [ ] **ImageGallery.svelte** - Multi-image galleries
- [ ] **Lightbox.svelte** - Modal image viewer
- [ ] **ZoomableImage.svelte** - Pan/zoom support
- [ ] **CodeBlock styling** - GitHub-style code blocks
- [ ] **Custom fonts** - 7 self-hosted fonts
- [ ] **CollapsibleSection.svelte** - Expandable content

### Nice to Have (Can Wait)

- [ ] Recipe system with semantic icons
- [ ] Mermaid diagram support
- [ ] Advanced analytics
- [ ] Comment system integration

---

## Data Migration Strategy

### For First Client (Mom's Publishing House)

1. Export existing content from autumnsgrove.com
2. Create new tenant in grove-engine
3. Import content with new tenant_id
4. Verify all posts, images, pages render correctly
5. Update DNS to point to new subdomain

### Content Export Script

```javascript
// scripts/export-content.js
async function exportContent(sourceDb) {
  const posts = await sourceDb.prepare('SELECT * FROM posts').all();
  const pages = await sourceDb.prepare('SELECT * FROM pages').all();
  const images = await sourceDb.prepare('SELECT * FROM images').all();

  return {
    posts: posts.results,
    pages: pages.results,
    images: images.results,
    exported_at: new Date().toISOString()
  };
}
```

### Content Import Script

```javascript
// scripts/import-content.js
async function importContent(targetDb, tenantId, exportData) {
  for (const post of exportData.posts) {
    await targetDb.prepare(`
      INSERT INTO posts (tenant_id, slug, title, content, ...)
      VALUES (?, ?, ?, ?, ...)
    `).bind(tenantId, post.slug, post.title, post.content, ...).run();
  }
  // Similar for pages, images...
}
```

---

## Risk Mitigation

### Technical Risks

| Risk | Mitigation |
|------|------------|
| Data leakage between tenants | Per-tenant D1 databases OR strict tenant_id filtering with tests |
| Subdomain routing failures | Comprehensive routing tests, fallback to main site |
| Auth token cross-contamination | Tenant-scoped JWT claims, strict validation |
| Storage quota bypass | Server-side enforcement, not client-side |

### Business Risks

| Risk | Mitigation |
|------|------------|
| Migration breaks existing site | Keep autumnsgrove.com running until grove-engine proven |
| First client unhappy | Extensive testing with Mom before public launch |
| Feature regression | Maintain comprehensive test suite from AutumnsGrove |

---

## Success Criteria

### Phase 1 Complete When:
- [ ] grove-engine repo exists with clean codebase
- [ ] All personal features removed
- [ ] CI/CD pipeline passing
- [ ] Local development works

### Phase 2 Complete When:
- [ ] Multiple subdomains can be created
- [ ] Each subdomain shows its own content
- [ ] No data leakage between tenants (tested)
- [ ] Subdomain provisioning automated

### Phase 3 Complete When:
- [ ] Plan limits enforced correctly
- [ ] Archival system works (no data loss)
- [ ] Usage tracking accurate
- [ ] Upgrade prompts display correctly

### MVP Complete When:
- [ ] Mom's publishing house live on subdomain
- [ ] All existing features work
- [ ] Admin panel fully functional
- [ ] Zero data loss verified
- [ ] Page load < 2 seconds

---

## Timeline Summary

| Week | Phase | Key Deliverables |
|------|-------|------------------|
| 1 | Setup | Clean grove-engine repo, CI/CD |
| 2-3 | Multi-tenant | Subdomain routing, tenant DB |
| 3-4 | Plan Enforcement | Limits, archival, tracking |
| 4-5 | Themes | 3-5 themes, selector UI |
| 5-6 | Testing | Security tests, performance |
| 7+ | Launch | First client (Mom), iterate |

---

## Reference Links

- **AutumnsGrove Source:** [github.com/AutumnsGrove/AutumnsGrove](https://github.com/AutumnsGrove/AutumnsGrove)
- **GroveEngine Specs:** [docs/specs/engine-spec.md](specs/engine-spec.md)
- **Vision Document:** [THE_JOURNEY.md](https://github.com/AutumnsGrove/AutumnsGrove/blob/main/docs/THE_JOURNEY.md)
- **Security Audit:** AutumnsGrove TODOS.md (Security & Polish Audit section)

---

## Related Documents

- **[MIGRATION-STRATEGY.md](MIGRATION-STRATEGY.md)** - Detailed execution plan with file-by-file extraction guide
- **[schema/multi-tenant-schema.sql](schema/multi-tenant-schema.sql)** - Complete D1 database schema for multi-tenant architecture

---

*Last Updated: December 1, 2025*
*Status: Planning Complete - Ready for Execution*
