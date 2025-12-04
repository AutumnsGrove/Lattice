# GroveEngine Boundary Map

> **Purpose**: This document defines what code lives in GroveEngine vs what's site-specific.
> **For Agents**: Read this file BEFORE making changes to understand where to edit.
> **Last Updated**: December 3, 2025

---

## 🏗️ Architecture Overview

### What is GroveEngine?
**GroveEngine is a library/toolkit, NOT a full SvelteKit app.**

Think of it like:
- **React** (library) vs **Your React App** (application)
- **Ruby on Rails** (framework) vs **Your Rails App** (application)
- **GroveEngine** (library) vs **AutumnsGrove** (your SvelteKit app)

**GroveEngine provides**:
- ✅ Reusable components (MarkdownEditor, Gallery, GutterManager)
- ✅ Utility functions (markdown parsing, validation, sanitization)
- ✅ Auth helpers (session management, JWT)
- ✅ Database schema (D1 SQL schema for blog/CMS)
- ✅ Payment system (Stripe integration)
- ✅ Styles (content.css, tokens.css)

**GroveEngine does NOT provide**:
- ❌ Routes (`/admin`, `/blog`, `/recipes`) - you define these
- ❌ SvelteKit configuration (`svelte.config.js`, `vite.config.js`)
- ❌ Deployment setup (`wrangler.toml`, adapter config)
- ❌ Your specific features (recipes, GitDashboard, AI assistant)
- ❌ Your branding and design

### What is AutumnsGrove?
**AutumnsGrove is a SvelteKit application that USES GroveEngine.**

It provides:
- ✅ All routes and pages (`/admin`, `/blog`, `/recipes`, etc.)
- ✅ SvelteKit app structure (`src/routes/`, `src/lib/`, `src/hooks.server.js`)
- ✅ Cloudflare deployment config (`wrangler.toml`, adapter setup)
- ✅ Site-specific features (recipes, GitDashboard, AI writing assistant)
- ✅ Custom styling and branding
- ✅ Environment configuration

---

## 🎯 Quick Reference

### When to Edit GroveEngine:
- Core reusable components (MarkdownEditor, GutterManager, Gallery)
- Generic utilities (markdown parsing, sanitization, validation)
- Shared UI primitives that all Grove sites need
- Database schema that all Grove sites share
- Payment/billing logic that's generic
- Core styling tokens

### When to Edit Site Code (AutumnsGrove):
- **All routes** (`/admin/*`, `/blog/*`, `/recipes/*`)
- Custom content types (recipes, your unique features)
- Site-specific components (AIWritingPanel, IconLegend, charts)
- Site configuration and branding
- Deployment config (wrangler.toml)
- SvelteKit hooks (hooks.server.js)

---

## 📦 GroveEngine Package (@autumnsgrove/groveengine v0.3.0)

**Location**: `/node_modules/@autumnsgrove/groveengine/dist/`

### Components (in GroveEngine)

#### Gallery Components
- `ImageGallery.svelte` - Multi-image gallery with navigation
- `ZoomableImage.svelte` - Pinch-to-zoom image viewer
- `Lightbox.svelte` - Full-screen image lightbox
- `LightboxCaption.svelte` - Caption overlay for lightbox

**Usage**:
```javascript
import { ImageGallery, ZoomableImage, Lightbox, LightboxCaption } from '$lib/components';
```

#### Admin Components
- `MarkdownEditor.svelte` - Rich markdown editor with:
  - Slash commands, command palette (Cmd+K)
  - Zen mode with typewriter scrolling
  - Campfire sessions with timer
  - Mermaid diagram previews
  - Custom markdown snippets
  - Ambient sounds (forest, rain, campfire, night, café)
  - Auto-save drafts
  - Drag-and-drop images
  - Writing goals and reading time estimates
- `GutterManager.svelte` - Sidebar annotation manager

**Usage**:
```javascript
import { MarkdownEditor, GutterManager } from '$lib/components';
```

#### Gutter/TOC Components
- `ContentWithGutter.svelte` - Main content + sidebar layout
- `LeftGutter.svelte` - Left sidebar container
- `GutterItem.svelte` - Individual gutter annotation
- `TableOfContents.svelte` - Auto-generated TOC from headers
- `MobileTOC.svelte` - Mobile-friendly TOC
- `CollapsibleSection.svelte` - Collapsible UI section

**Usage**:
```javascript
import { ContentWithGutter, LeftGutter, GutterItem, TableOfContents, MobileTOC, CollapsibleSection } from '$lib/components';
```

### Database Schema (in GroveEngine)

**Location**: `/dist/db/schema.sql`

GroveEngine provides a complete D1 database schema for:
- Posts and pages
- Tags and categories
- Image metadata
- Cache management
- And more...

**Usage**: Copy the schema and extend it with your site-specific tables.

### Payment System (in GroveEngine)

**Location**: `/dist/payments/`

GroveEngine includes a **complete Stripe payment integration**:

**Files**:
- `index.js` - Main payment exports
- `shop.js` - Shop/product management (22KB of payment logic!)
- `types.d.ts` - TypeScript types for payments
- `stripe/` - Stripe-specific integrations

**Features**:
- Product management
- Subscription handling
- Payment processing
- Webhook handling

**Import**:
```javascript
import { /* payment functions */ } from '@autumnsgrove/groveengine/payments';
```

**Note**: This is a complete payment system ready to use! You haven't implemented this in AutumnsGrove yet, but it's available.

### Styles (in GroveEngine)

**Location**: `/dist/styles/`

GroveEngine provides base CSS:
- `content.css` (11KB) - Content/typography styles
- `tokens.css` (5KB) - CSS custom properties/design tokens

**Usage**:
```javascript
// In your +layout.svelte or app.css
import '@autumnsgrove/groveengine/styles/content.css';
import '@autumnsgrove/groveengine/styles/tokens.css';
```

### Utilities (in GroveEngine)

**Core utilities available** (but not currently used due to site-specific extensions):

- `utils/markdown.js` - Generic markdown processing:
  - `extractHeaders(markdown)` ✓
  - `processAnchorTags(html)` ✓
  - `getSiteConfig()` ✓
  - `getAllPosts()` ✓
  - `getLatestPost()` ✓
  - `getHomePage()` ✓
  - `getPostBySlug(slug)` ✓
  - `getAboutPage()` ✓
  - `getContactPage()` ✓
  - `processGutterContent()` ✓ (generic)
  - `createContentLoader()` ✓
  - ❌ Missing: `getAllRecipes()`, `getRecipeBySlug()`, `getRecipeGutterContent()` (site-specific)

- `utils/sanitize.js` - XSS protection:
  - `sanitizeHTML(html)`
  - `sanitizeSVG(svg)`
  - `sanitizeMarkdown(markdownHTML)`
  - `sanitizeURL(url)`

- `utils/validation.js` - Input validation:
  - `validateFileSignature(file, expectedType)`
  - `sanitizeObject(obj)`
  - `sanitizeFilename(filename)`
  - `validatePath(path)`
  - `validateEmail(email)`
  - `validateURL(url)`
  - `validateSlug(slug)`

- `utils/gallery.js` - Image utilities:
  - `parseImageFilename(r2Key)`
  - `getImageTitle(image)`
  - `getImageDate(image)`
  - `searchImages(images, query)`
  - `filterImagesByDateRange(images, startDate, endDate)`

- `utils/gutter.js` - Gutter helpers:
  - `parseAnchor(anchor)`
  - `getAnchorKey(anchor, headers)`
  - `getUniqueAnchors(items)`
  - `getAnchorLabel(anchor)`

- `auth/session.js` - Session management:
  - `createSession(user, secret)`
  - `verifySession(token, secret)`
  - `createSessionCookie(token, isProduction)`
  - `clearSessionCookie()`
  - `parseSessionCookie(cookieHeader)`
  - `isAllowedAdmin(email, allowedList)`

- `auth/jwt.js` - JWT utilities:
  - `signJwt(payload, secret)`
  - `verifyJwt(token, secret)`

- `server/logger.js` - Server logging:
  - `logAPI(endpoint, method, status, metadata)`
  - `logGitHub(operation, metadata)`
  - `logError(message, error, metadata)`
  - `logCache(operation, key, metadata)`

---

## 🏠 Site-Specific Code (AutumnsGrove)

**Location**: `/src/`

### Routes (Site-Specific)

**All routes are site-specific** - they define your unique site structure:

#### Admin Routes (`/src/routes/admin/`)
- `+page.svelte` - Admin dashboard
- `settings/+page.svelte` - Settings page
- `images/+page.svelte` - Image management
- `blog/+page.svelte` - Blog post listing
- `blog/new/+page.svelte` - Create new post
- `blog/edit/[slug]/+page.svelte` - Edit post
- `logs/+page.svelte` - System logs viewer
- `recipes/+page.svelte` - Recipe management (site-specific!)
- `timeline/+page.svelte` - AI timeline (site-specific!)
- `pages/+page.svelte` - Static pages management
- `pages/edit/[slug]/+page.svelte` - Edit pages
- `analytics/+page.svelte` - Analytics dashboard

**Note**: Admin routes use GroveEngine components (`MarkdownEditor`, `GutterManager`) but the routes themselves are yours.

#### Public Routes (`/src/routes/`)
- `/` - Homepage
- `/blog/*` - Blog system
- `/recipes/*` - Recipe system (site-specific!)
- `/gallery` - Image gallery
- `/dashboard` - GitDashboard (site-specific!)
- `/timeline` - AI timeline (site-specific!)
- `/about`, `/contact` - Static pages

### Components (Site-Specific)

#### Admin Components (`/src/lib/components/admin/`)
- `AIWritingPanel.svelte` - AI writing assistant (YOUR feature!)

#### Custom Components (`/src/lib/components/custom/`)
- `IconLegend.svelte` - Recipe icon legend (site-specific!)
- `InternalsPostViewer.svelte` - Post viewer with DOMPurify
- `LogViewer.svelte` - Admin log viewer

#### Chart Components (`/src/lib/components/charts/`)
**GitDashboard D3.js visualizations** (YOUR feature!):
- `Sparkline.svelte`
- `LOCBar.svelte`
- `RepoBreakdown.svelte`
- `ActivityOverview.svelte`

#### UI Components (`/src/lib/components/ui/`)
**shadcn-svelte wrappers** (site-specific for now):
- All shadcn-svelte components
- To be migrated to `@groveengine/ui` eventually

### Utilities (Site-Specific Extensions)

#### `src/lib/utils/markdown.js`
**Extended with recipe-specific functions**:
- ✓ All GroveEngine functions (via local implementation)
- ➕ `getAllRecipes()` - YOUR addition!
- ➕ `getRecipeBySlug(slug)` - YOUR addition!
- ➕ `getRecipeGutterContent(slug)` - YOUR addition!
- ➕ `getRecipeSidecar(slug)` - YOUR addition!
- ➕ `getAboutGutterContent(slug)` - YOUR addition!
- ➕ `getContactGutterContent(slug)` - YOUR addition!
- ➕ `getGutterContent(slug)` - YOUR addition!
- ➕ `getHomeGutterContent(slug)` - YOUR addition!

**Why local**: Your site has recipes and custom gutter content types that aren't in the generic GroveEngine.

#### `src/lib/utils/github.js`
**GitDashboard feature** (YOUR feature!):
- GitHub API utilities
- GraphQL queries for commit stats
- User validation functions
- Cache key generation
- Commit pagination logic

**Why local**: This is your unique GitDashboard feature, not part of generic GroveEngine.

#### Other Utilities
All other utils (`sanitize.js`, `validation.js`, `gallery.js`, `gutter.js`, `csrf.js`, `json.js`, `debounce.js`, `api.js`, `cn.ts`) are currently **local copies** of GroveEngine utilities. They work fine locally but could be replaced with GroveEngine imports in the future.

### Configuration (Site-Specific)

- `src/lib/config/ai-models.js` - AI writing assistant config
- `src/lib/db/schema.sql` - D1 database schema
- `src/lib/styles/*` - Site-specific styling
- `wrangler.toml` - Cloudflare Workers config
- `.dev.vars` - Local secrets

---

## 🔍 Decision Tree: Where Should I Edit?

```
┌─────────────────────────────────────────┐
│ I need to change something...           │
└─────────────────┬───────────────────────┘
                  │
                  ▼
        ┌─────────────────────┐
        │ Is it a COMPONENT?  │
        └──────────┬───────────┘
                  ├─YES─────────────────────────────┐
                  │                                  │
                  ▼                                  ▼
    ┌──────────────────────────┐     ┌─────────────────────────────┐
    │ Gallery, MarkdownEditor, │     │ AIWritingPanel, IconLegend, │
    │ GutterManager, TOC,      │     │ LogViewer, Charts?          │
    │ or Gutter components?    │     │                             │
    └──────────┬───────────────┘     └──────────┬──────────────────┘
               │                                 │
               ▼                                 ▼
    ┌──────────────────────┐         ┌──────────────────────┐
    │ Edit in GroveEngine  │         │ Edit in site code    │
    │ (upstream package)   │         │ (src/lib/components) │
    └──────────────────────┘         └──────────────────────┘
                  │
                  NO
                  │
                  ▼
        ┌─────────────────────┐
        │ Is it a ROUTE/PAGE? │
        └──────────┬───────────┘
                  │
                  ▼
    ┌──────────────────────────────────┐
    │ Always site-specific             │
    │ Edit in src/routes/              │
    └──────────────────────────────────┘
                  │
                  │
                  ▼
        ┌──────────────────────┐
        │ Is it a UTILITY?     │
        └──────────┬────────────┘
                  │
                  ▼
    ┌──────────────────────────────────┐
    │ Does it have site-specific       │
    │ features (recipes, GitDashboard)?│
    └──────────┬───────────────────────┘
               ├─YES────────────────────┐
               │                        │
               ▼                        ▼
    ┌──────────────────────┐  ┌─────────────────────┐
    │ Edit in site code    │  │ Edit in GroveEngine │
    │ (src/lib/utils)      │  │ (if generic enough) │
    └──────────────────────┘  └─────────────────────┘
```

---

## 🚨 Common Pitfalls to Avoid

### ❌ DON'T:
1. **Don't edit `/node_modules/@autumnsgrove/groveengine/`**
   - Changes will be lost on `npm install`
   - Edit the upstream GroveEngine repo instead

2. **Don't duplicate GroveEngine components in site code**
   - If it's in GroveEngine, import it - don't copy it

3. **Don't put site-specific features in GroveEngine**
   - Recipes, GitDashboard, AI features → stay in site code
   - Generic blog/CMS features → belong in GroveEngine

### ✅ DO:
1. **Import from GroveEngine when available**:
   ```javascript
   import { MarkdownEditor, GutterManager } from '$lib/components';
   ```

2. **Keep site-specific extensions local**:
   - Recipe functions → `src/lib/utils/markdown.js`
   - GitDashboard → `src/lib/utils/github.js`
   - AI features → `src/lib/components/admin/AIWritingPanel.svelte`

3. **Use the barrel export** (`src/lib/components/index.js`):
   - It abstracts whether components are from GroveEngine or local
   - Makes future migrations easier

---

## 🔧 Debugging: Is This a GroveEngine or Site Issue?

### If something breaks, ask:

1. **What component/file is failing?**
   - Check the boundary map above
   - GroveEngine component? → Check GroveEngine package
   - Site-specific? → Check local code

2. **Is it in the build output?**
   ```bash
   ls node_modules/@autumnsgrove/groveengine/dist/components/admin/
   ```

3. **Is it imported correctly?**
   ```javascript
   // ✅ Good - uses barrel export
   import { MarkdownEditor } from '$lib/components';

   // ❌ Bad - direct import (won't work if deleted)
   import MarkdownEditor from '$lib/components/admin/MarkdownEditor.svelte';
   ```

---

## 📝 Admin Page Debugging Checklist

The `/admin` route has been broken. Here's the complete architecture:

### Admin Architecture

**GroveEngine Provides:**
- ✅ Admin components (MarkdownEditor, GutterManager)
- ✅ Auth utilities (session management, JWT)
- ✅ Utilities (markdown, validation, sanitization)

**Your Site Provides:**
- ✅ Admin routes (`/src/routes/admin/*`)
- ✅ Admin layout (`/src/routes/admin/+layout.svelte`)
- ✅ Auth middleware (`/src/hooks.server.js`)
- ✅ Site-specific admin components (AIWritingPanel)

### Debug Steps

1. **Check Auth Flow:**
   ```
   Request → hooks.server.js → Check session → Set locals.user
          → admin/+layout.server.js → Check locals.user → Redirect if not logged in
          → admin/+page.svelte → Render dashboard
   ```

2. **Verify Environment:**
   ```bash
   # Check .dev.vars has:
   SESSION_SECRET=your-secret-here
   ```

3. **Test Auth Locally:**
   ```bash
   # Visit /auth/login first
   # Then visit /admin
   ```

4. **Check Imports:**
   ```javascript
   // hooks.server.js should use local imports (not GroveEngine)
   import { parseSessionCookie, verifySession } from "$lib/auth/session";

   // Admin pages should use barrel exports
   import { MarkdownEditor, GutterManager } from '$lib/components';
   ```

5. **Common Issues:**
   - ❌ Not logged in (redirects to `/auth/login`)
   - ❌ Missing `SESSION_SECRET` environment variable
   - ❌ Imports pointing to deleted components
   - ❌ Build/deploy issues with GroveEngine package resolution

### Why Admin Might Be Broken

The admin dashboard itself is simple - it just renders a health check. Issues are likely:

1. **Auth not working** - Can't access admin without login
2. **Component imports broken** - If any admin child routes import components incorrectly
3. **API routes failing** - `/api/git/health` might be broken
4. **Environment config** - SESSION_SECRET not set in production

### Solution: Create an Explore Task

To diagnose the admin issue, you need to:
1. Check what specific error the admin page shows (500? 404? Redirect loop?)
2. Check production logs in Cloudflare Pages
3. Verify all admin sub-routes are working
4. Test auth flow end-to-end

---

## 🎯 Future Migration Path

As GroveEngine matures, you can migrate more utilities:

### Phase 1 (✅ Done - December 2025):
- Gallery components
- Admin components (MarkdownEditor, GutterManager)
- Gutter/TOC components

### Phase 2 (Future):
- Migrate shadcn-svelte wrappers to `@groveengine/ui`
- Keep using barrel exports for seamless transition

### Phase 3 (Future):
- Consider: Add recipe support to GroveEngine as optional module
- Keep: GitDashboard, AI features (too site-specific)

---

## 📚 For Agents: Instructions

When you're asked to edit code in this project:

1. **Read this file first** to understand boundaries
2. **Check the decision tree** to determine where to edit
3. **Ask the user** if unclear whether something is generic (GroveEngine) or site-specific
4. **Never edit `/node_modules/`** - propose GroveEngine updates instead
5. **Always use barrel imports** from `$lib/components` when possible

---

## 📦 Package Versions

- `@autumnsgrove/groveengine`: `^0.3.0`
- `@groveengine/ui`: `^0.3.0`

**Last verified working**: December 3, 2025

---

*This is a living document. Update it as the boundary between GroveEngine and site code evolves.*
