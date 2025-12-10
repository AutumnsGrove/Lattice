# AutumnsGrove Post-Migration Guide

**Document Purpose:** Guide for agents working on the AutumnsGrove repository after blog engine extraction
**Target Audience:** Future AI agents, developers maintaining AutumnsGrove
**Status:** Ready for Use
**Created:** December 1, 2025

---

## Executive Summary

**The blog engine has been extracted from AutumnsGrove into a standalone package: GroveEngine.**

AutumnsGrove (autumnsgrove.com) is now a **consumer** of the `@grove/engine` npm package, not the owner of the blog code. The extraction separates concerns:

- **GroveEngine** (`@grove/engine` npm package): Reusable blog platform, admin panel, auth system
- **AutumnsGrove** (personal site): Personal features + blog functionality via GroveEngine

**What This Means:**
- Blog engine code lives in the [GroveEngine repository](https://github.com/AutumnsGrove/GroveEngine)
- AutumnsGrove imports components from `@grove/engine` package
- Personal features (GitHub dashboard, gallery, timeline, recipes) remain in AutumnsGrove
- No more duplicated blog code between projects

---

## What Was Migrated to GroveEngine

The following components, routes, and utilities were extracted from AutumnsGrove to GroveEngine:

### Core Routes (Moved to GroveEngine)

| Route | Components | Purpose |
|-------|-----------|---------|
| `/blog/` | List, [slug], search | Blog post display and search |
| `/admin/` | Dashboard, blog, pages, images, settings | Complete CMS admin panel |
| `/auth/` | login, logout, send-code, verify-code, me | Magic code authentication system |
| `/api/posts/` | CRUD operations | Post management API |
| `/api/pages/` | CRUD operations | Static page management API |
| `/api/images/` | upload, list, delete, filters | R2 media management |
| `/api/settings/` | Site settings | Configuration API |
| `/api/feed/` | RSS generation | RSS feed generation |
| `/rss.xml/` | RSS endpoint | RSS feed endpoint |
| `/about/` | Static page | About page (template) |
| `/contact/` | Static page | Contact page (template) |

### Components (Moved to GroveEngine)

**Critical Blog Components:**
- `ContentWithGutter.svelte` - Main blog post layout with gutter annotations
- `GutterItem.svelte` - Individual gutter annotation component
- `LeftGutter.svelte` - Gutter container
- `TableOfContents.svelte` - Auto-generated table of contents
- `MobileTOC.svelte` - Mobile-friendly TOC

**Admin Components:**
- `MarkdownEditor.svelte` - Rich markdown editor for posts
- `GutterManager.svelte` - UI for managing gutter annotations
- All admin panel UI components

**Gallery Components:**
- `ImageGallery.svelte` - Multi-image galleries in posts
- `Lightbox.svelte` - Modal image viewer
- `ZoomableImage.svelte` - Pan/zoom image viewer

**UI Components:**
- All shadcn-svelte components (button, card, dialog, input, etc.)

### Utilities (Moved to GroveEngine)

| Utility | Purpose |
|---------|---------|
| `src/lib/utils/markdown.js` | Markdown parsing with gutter content loading |
| `src/lib/utils/csrf.js` | CSRF protection |
| `src/lib/utils/sanitize.js` | XSS prevention (DOMPurify) |
| `src/lib/auth/session.js` | Session management |
| `src/lib/auth/jwt.js` | JWT signing and verification |
| `src/hooks.server.js` | Security headers, CSRF, auth hooks |

### Database Schema (Moved to GroveEngine)

**Tables migrated:**
- `magic_codes` - Magic code authentication
- `site_settings` - Site configuration (modified for multi-tenant)
- `pages` - Static pages (modified for multi-tenant)

**New tables in GroveEngine:**
- `tenants` - Subdomain management
- `posts` - Blog posts (replaces markdown files)
- `media` - Media file tracking
- `sessions` - Session management

---

## What Remains in AutumnsGrove

AutumnsGrove retains all personal, site-specific features that are NOT part of the generic blog engine:

### Personal Routes (Remain in AutumnsGrove)

| Route | Purpose | Status |
|-------|---------|--------|
| `/dashboard/` | Personal GitHub stats dashboard | Keep |
| `/gallery/` | Personal photo gallery (Willow photos) | Keep |
| `/timeline/` | AI-generated activity tracking | Keep |
| `/showcase/` | Personal project showcase | Keep |
| `/recipes/` | Personal cooking recipes | Keep |
| `/credits/` | Site credits | Keep |

### Personal API Routes (Remain in AutumnsGrove)

| Route | Purpose | Why It Stays |
|-------|---------|--------------|
| `/api/git/` | GitHub API integration | Personal GitHub data |
| `/api/ai/` | AI repository analysis | Personal repositories |
| `/api/timeline/` | Timeline generation | Personal activity |
| `/api/gallery/` | Photo gallery management | Personal photos (Willow) |
| `/api/admin/gallery/` | Gallery admin | Personal gallery admin |
| `/api/admin/logs/` | Site logs | Personal logging |

### Personal Components (Remain in AutumnsGrove)

- `ActivityOverview.svelte` - GitHub dashboard stats
- `LOCBar.svelte` - Lines of code visualization
- `RepoBreakdown.svelte` - Repository breakdown charts
- `Sparkline.svelte` - Sparkline charts
- `LogViewer.svelte` - Personal log viewer
- `InternalsPostViewer.svelte` - Internal tooling viewer
- `IconLegend.svelte` - Recipe-specific legend

### Personal Content (Remains in AutumnsGrove)

```
UserContent/
├── Posts/              # Your actual blog posts (markdown files)
├── About/              # Your about page content
├── Contact/            # Your contact page content
├── Home/               # Your home page content
└── site-config.json    # Your site configuration
```

### Personal Workers (Remain in AutumnsGrove)

```
workers/
├── daily-summary/      # AI timeline generation worker
└── sync-posts/         # Any post sync workers
```

---

## Architecture After Migration

### Before Migration (Monolithic)

```
AutumnsGrove
├── Blog Engine (custom code)
├── Admin Panel (custom code)
├── Auth System (custom code)
├── Personal Features
└── Deploys to Cloudflare Pages
```

### After Migration (Modular)

```
AutumnsGrove (autumnsgrove.com)
├── Uses @grove/engine npm package
│   ├── Blog engine components
│   ├── Admin panel
│   └── Auth system
├── Personal Features (local)
│   ├── GitHub dashboard
│   ├── Photo gallery
│   ├── Timeline
│   ├── Recipes
│   └── Showcase
├── Personal API Routes
├── Personal Content (UserContent/)
└── Cloudflare Workers deployment
    ├── D1 database (existing)
    ├── R2 storage (existing)
    └── KV storage (existing)

GroveEngine (@grove/engine npm package)
├── Published to npm registry
├── Reusable blog engine
├── Admin panel components
├── Auth system (magic codes)
├── Multi-tenant ready
└── Used by multiple sites
    ├── autumnsgrove.com
    ├── mom.grove.place (future)
    └── username.grove.place (future customers)
```

### Data Flow After Migration

```
User Request → autumnsgrove.com
              ↓
         Cloudflare Workers
              ↓
    ┌─────────┴─────────┐
    ↓                   ↓
Blog Routes          Personal Routes
(@grove/engine)      (AutumnsGrove)
    ↓                   ↓
    ↓               GitHub API
    ↓               AI Analysis
    ↓               Gallery DB
    ↓                   ↓
    └────────┬──────────┘
             ↓
       D1 Database
    (shared tables)
```

---

## Reconnection Guide: Using GroveEngine

Once the `@grove/engine` package is published to npm, here's how to reconnect AutumnsGrove to use it:

### Step 1: Install the Package

```bash
# In AutumnsGrove repository root
pnpm add @grove/engine
# or
npm install @grove/engine
```

### Step 2: Update Import Statements

**Before (local imports):**
```javascript
// ❌ Old way (won't work after migration)
import ContentWithGutter from '$lib/components/custom/ContentWithGutter.svelte';
import { parseMarkdown } from '$lib/utils/markdown.js';
import { verifySession } from '$lib/auth/session.js';
```

**After (package imports):**
```javascript
// ✅ New way (import from @grove/engine)
import ContentWithGutter from '@grove/engine/components/ContentWithGutter.svelte';
import { parseMarkdown } from '@grove/engine/utils/markdown';
import { verifySession } from '@grove/engine/auth/session';
```

### Step 3: Configure GroveEngine

Create a `grove.config.js` in your AutumnsGrove root:

```javascript
// grove.config.js
export default {
  tenant: {
    id: 'autumn',
    subdomain: 'autumnsgrove',
    mode: 'standalone', // Not part of grove.place multi-tenant
  },

  database: {
    binding: 'DB', // Your D1 binding name
  },

  storage: {
    r2Binding: 'R2_BUCKET', // Your R2 binding
    cdnUrl: 'https://cdn.autumnsgrove.com',
  },

  auth: {
    jwtSecret: process.env.JWT_SECRET,
    sessionExpiry: 7 * 24 * 60 * 60 * 1000, // 7 days
  },

  content: {
    postsPath: './UserContent/Posts',
    pagesPath: './UserContent',
    useDatabase: false, // Still using markdown files
  },

  features: {
    gutterAnnotations: true,
    tableOfContents: true,
    imageGalleries: true,
    rss: true,
  },
};
```

### Step 4: Update Environment Variables

Ensure these environment variables are set:

```bash
# .env.local (development)
JWT_SECRET=your-jwt-secret-here
SESSION_COOKIE_NAME=autumn_session
ADMIN_EMAIL=autumn@autumnsgrove.com

# Cloudflare bindings (wrangler.toml)
# - DB (D1 database)
# - R2_BUCKET (R2 storage)
# - KV (KV namespace for rate limiting)
```

### Step 5: Update Route Files

Update your route files to use GroveEngine components:

**Example: Blog Post Page**

```svelte
<!-- src/routes/blog/[slug]/+page.svelte -->
<script>
  // ✅ Import from @grove/engine
  import ContentWithGutter from '@grove/engine/components/ContentWithGutter.svelte';
  import TableOfContents from '@grove/engine/components/TableOfContents.svelte';

  export let data;
</script>

<ContentWithGutter
  content={data.post.html}
  gutterItems={data.post.gutterContent}
/>

<TableOfContents headings={data.post.headings} />
```

### Step 6: Remove Duplicated Code

After confirming everything works with `@grove/engine`, remove the duplicated code:

```bash
# Delete blog engine code (now in @grove/engine)
rm -rf src/routes/admin/blog/
rm -rf src/routes/api/posts/
rm -rf src/lib/components/custom/ContentWithGutter.svelte
rm -rf src/lib/components/custom/GutterItem.svelte
rm -rf src/lib/components/custom/TableOfContents.svelte
rm -rf src/lib/utils/markdown.js

# Keep personal features!
# DON'T delete: dashboard/, gallery/, timeline/, recipes/, etc.
```

### Step 7: Test Everything

```bash
# Run tests
pnpm test

# Test blog functionality
pnpm dev
# - Visit /blog/some-post
# - Check gutter annotations render
# - Verify TOC generates
# - Test admin panel at /admin

# Test personal features
# - Visit /dashboard (GitHub stats)
# - Visit /gallery (Willow photos)
# - Visit /timeline (AI timeline)
# - Visit /recipes
```

---

## For the Agent Working on AutumnsGrove

### What You Should Know

1. **Two Repositories Now Exist:**
   - **AutumnsGrove**: Personal site (where you are now)
   - **GroveEngine**: Blog engine package (separate repo)

2. **Where to Make Changes:**
   - Blog engine bugs/features → Go to GroveEngine repository
   - Personal features → Work in AutumnsGrove repository
   - If unsure → Ask the user

3. **What NOT to Touch:**
   - Don't modify blog engine code that should be in `@grove/engine`
   - Don't recreate components that exist in GroveEngine
   - Don't add new blog features to AutumnsGrove (add to GroveEngine instead)

### Decision Tree: Where Does This Code Go?

```
Is this feature related to blogging,
admin panel, or auth system?
    ↓
   YES → Go to GroveEngine repository
    │    (It's reusable blog functionality)
    │
   NO → Stay in AutumnsGrove repository
        (It's personal/site-specific)

Examples:
- Fix gutter annotation bug → GroveEngine
- Add new blog theme → GroveEngine
- Improve markdown parser → GroveEngine
- Add GitHub dashboard chart → AutumnsGrove
- Update Willow gallery → AutumnsGrove
- Fix timeline generation → AutumnsGrove
```

### Quick Reference: What Lives Where

| Feature | Repository | Reason |
|---------|-----------|--------|
| Blog post rendering | GroveEngine | Reusable across all Grove blogs |
| Admin panel | GroveEngine | Every Grove blog needs admin |
| Magic code auth | GroveEngine | Standard auth for all blogs |
| Gutter annotations | GroveEngine | Core blog feature |
| GitHub dashboard | AutumnsGrove | Personal to Autumn's site |
| Photo gallery | AutumnsGrove | Personal photos (Willow) |
| AI timeline | AutumnsGrove | Personal activity tracking |
| Cooking recipes | AutumnsGrove | Personal content |

### Common Tasks After Migration

#### Task: Update Blog Styling

1. Check if styling is in `@grove/engine` or AutumnsGrove
2. If in `@grove/engine`:
   - Go to GroveEngine repository
   - Make changes there
   - Publish new version
   - Update `@grove/engine` version in AutumnsGrove
3. If in AutumnsGrove (personal overrides):
   - Make changes in AutumnsGrove CSS files

#### Task: Add New Personal Feature

1. Create in AutumnsGrove (this is the right place!)
2. Follow existing patterns (see `/dashboard/`, `/gallery/`)
3. Add API route if needed in `/api/`
4. Don't worry about GroveEngine

#### Task: Fix Bug in Blog Engine

1. Go to GroveEngine repository
2. Fix the bug there
3. Test in GroveEngine
4. Publish new package version
5. Update AutumnsGrove to use new version:
   ```bash
   pnpm update @grove/engine
   ```

#### Task: Update Dependencies

```bash
# Update GroveEngine package
pnpm update @grove/engine

# Update other dependencies
pnpm update

# Check for security issues
pnpm audit
```

---

## Timeline and Next Steps

### Current Status (Phase 1 Complete)

- ✅ GroveEngine extracted to separate repository
- ✅ Blog engine, admin panel, auth system in GroveEngine
- ✅ Personal features remain in AutumnsGrove
- ✅ Multi-tenant database schema designed
- ⏳ `@grove/engine` package not yet published to npm

### What Needs to Happen Next

#### Phase 2: Package Publishing (Week 1-2)

- [ ] Publish `@grove/engine` to npm registry
- [ ] Create package documentation
- [ ] Set up semantic versioning
- [ ] Configure package.json exports correctly

#### Phase 3: AutumnsGrove Integration (Week 2-3)

- [ ] Install `@grove/engine` in AutumnsGrove
- [ ] Update all imports to use `@grove/engine`
- [ ] Configure grove.config.js
- [ ] Test all blog functionality
- [ ] Test all personal features
- [ ] Remove duplicated engine code

#### Phase 4: Migration Validation (Week 3-4)

- [ ] Run full test suite
- [ ] Verify security tests pass (181 tests)
- [ ] Test in staging environment
- [ ] Check performance (page load < 2s)
- [ ] Verify all features work
- [ ] Test personal features not affected

#### Phase 5: Production Deployment (Week 4+)

- [ ] Deploy to production
- [ ] Monitor for errors
- [ ] Verify analytics working
- [ ] Confirm no regressions
- [ ] Document any issues

### What You Should Do Right Now

**If you're an agent working on AutumnsGrove TODAY:**

1. ❌ **DO NOT** try to install `@grove/engine` yet (not published)
2. ✅ **DO** continue using the local blog code for now
3. ✅ **DO** work on personal features (dashboard, gallery, timeline, recipes)
4. ✅ **DO** fix bugs in personal features
5. ⚠️ **BE AWARE** that blog engine code will move to `@grove/engine` soon
6. 📋 **DOCUMENT** any blog engine changes (they'll need to be ported)

**When `@grove/engine` is published:**

You'll see a task in TODOS.md that says:
```
- [ ] Integrate @grove/engine package into AutumnsGrove
```

At that point, follow the "Reconnection Guide" section above.

---

## Testing the Integration

### Pre-Migration Testing Checklist

Before removing any duplicated code, verify these features work:

#### Blog Engine Features (from @grove/engine)

- [ ] Blog post list page loads
- [ ] Individual blog post renders correctly
- [ ] Gutter annotations appear on the side
- [ ] Table of contents generates correctly
- [ ] Mobile TOC works on small screens
- [ ] Image galleries display properly
- [ ] Lightbox opens for images
- [ ] Zoom/pan works in lightbox
- [ ] Admin panel loads
- [ ] Can create/edit/delete posts in admin
- [ ] Markdown editor works
- [ ] Image upload works
- [ ] Magic code login works
- [ ] Session management works
- [ ] RSS feed generates correctly
- [ ] About/Contact pages render

#### Personal Features (AutumnsGrove)

- [ ] GitHub dashboard loads
- [ ] GitHub stats display correctly
- [ ] Photo gallery loads
- [ ] Willow photos display
- [ ] Timeline generates
- [ ] Timeline shows activity
- [ ] Recipes page loads
- [ ] Recipe icons display
- [ ] Showcase page works
- [ ] All personal API routes work

#### Security & Performance

- [ ] All 181 security tests pass
- [ ] CSRF protection works
- [ ] XSS sanitization working
- [ ] Rate limiting active
- [ ] Page load < 2 seconds
- [ ] Images load from CDN
- [ ] No console errors

### Post-Migration Testing Script

```bash
#!/bin/bash
# test-migration.sh

echo "Testing AutumnsGrove after @grove/engine integration..."

# Test blog engine features
echo "1. Testing blog routes..."
curl -I https://autumnsgrove.com/blog/
curl -I https://autumnsgrove.com/blog/some-post-slug/

# Test admin panel
echo "2. Testing admin routes..."
curl -I https://autumnsgrove.com/admin/

# Test personal features
echo "3. Testing personal routes..."
curl -I https://autumnsgrove.com/dashboard/
curl -I https://autumnsgrove.com/gallery/
curl -I https://autumnsgrove.com/timeline/
curl -I https://autumnsgrove.com/recipes/

# Run test suite
echo "4. Running test suite..."
pnpm test:run

# Check security tests
echo "5. Running security tests..."
pnpm test:security

echo "Testing complete!"
```

---

## Troubleshooting

### Issue: Import Errors After Installing @grove/engine

**Symptom:**
```
Error: Cannot find module '@grove/engine/components/ContentWithGutter.svelte'
```

**Solution:**
1. Check package exports in `@grove/engine/package.json`
2. Verify import path matches package exports
3. Clear node_modules and reinstall:
   ```bash
   rm -rf node_modules pnpm-lock.yaml
   pnpm install
   ```

### Issue: Blog Posts Not Rendering

**Symptom:**
Blog posts return 404 or show errors.

**Solution:**
1. Check `grove.config.js` has correct paths
2. Verify D1 binding name matches wrangler.toml
3. Check that `UserContent/Posts/` still has markdown files
4. Review browser console for errors

### Issue: Admin Panel Returns 403

**Symptom:**
Admin panel denies access after migration.

**Solution:**
1. Check JWT secret is set in environment
2. Verify session cookie name matches config
3. Clear cookies and re-login
4. Check ADMIN_EMAIL environment variable

### Issue: Personal Features Broken

**Symptom:**
Dashboard, gallery, or timeline don't work.

**Solution:**
1. These should NOT be affected by migration
2. Check personal API routes still exist in `/api/git/`, `/api/gallery/`, etc.
3. Verify personal components not accidentally deleted
4. Check database tables for personal features still exist

### Issue: Images Not Loading

**Symptom:**
Blog images return 404.

**Solution:**
1. Check R2 binding name in grove.config.js
2. Verify CDN URL is correct
3. Check R2 bucket still has images
4. Review CORS settings on R2 bucket

---

## Additional Resources

### Documentation

- **GroveEngine Docs**: [GroveEngine/docs/project-plan.md](https://github.com/AutumnsGrove/GroveEngine/blob/main/docs/project-plan.md)
- **Migration Strategy**: [GroveEngine/docs/migration-strategy.md](https://github.com/AutumnsGrove/GroveEngine/blob/main/docs/migration-strategy.md)
- **Engine Spec**: [GroveEngine/docs/specs/engine-spec.md](https://github.com/AutumnsGrove/GroveEngine/blob/main/docs/specs/engine-spec.md)
- **Multi-Tenant Schema**: [GroveEngine/docs/schema/multi-tenant-schema.sql](https://github.com/AutumnsGrove/GroveEngine/blob/main/docs/schema/multi-tenant-schema.sql)

### Repositories

- **AutumnsGrove**: [github.com/AutumnsGrove/AutumnsGrove](https://github.com/AutumnsGrove/AutumnsGrove)
- **GroveEngine**: [github.com/AutumnsGrove/GroveEngine](https://github.com/AutumnsGrove/GroveEngine)

### Support

If you encounter issues:
1. Check TODOS.md for known issues
2. Review test output for clues
3. Compare with working pre-migration version
4. Ask the user for guidance

---

## Summary: The Big Picture

**Before Migration:**
- AutumnsGrove = Everything (blog + personal features)
- Duplicated code for every new Grove blog
- Hard to maintain, hard to scale

**After Migration:**
- GroveEngine = Reusable blog platform (npm package)
- AutumnsGrove = Personal site + blog via GroveEngine
- Easy to maintain, easy to scale to multiple blogs
- Mom can have her own blog (mom.grove.place)
- Future customers can have blogs (username.grove.place)

**Your Role as Agent:**
- Work on AutumnsGrove personal features (dashboard, gallery, timeline, recipes)
- Don't touch blog engine code (that's in GroveEngine now)
- When user wants blog features changed, go to GroveEngine repository
- Keep the two repositories separate and focused

**The Goal:**
Enable a multi-tenant blog platform where:
- AutumnsGrove remains a personal site with blog functionality
- New blogs can launch easily using the same engine
- Everyone shares improvements to the core engine
- Personal features stay personal

---

*Last Updated: December 1, 2025*
*Status: Ready for AutumnsGrove Integration*
*Next Action: Wait for @grove/engine npm package publication*
