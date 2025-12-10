# Agent Guide: Creating New Grove Sites

**Purpose:** This guide helps AI agents understand and work with the GroveEngine platform to create, configure, and deploy new Grove blog sites.

**Last Updated:** December 1, 2025
**For:** Claude, GPT, and other AI agents
**Target Repository:** GroveEngine

---

## 1. What is GroveEngine?

GroveEngine is a **multi-tenant blog platform** where each user gets their own subdomain (e.g., `username.grove.place`) powered by their own Cloudflare Worker deployment.

### Key Characteristics

- **Multi-tenant architecture**: Each site runs independently
- **Cloudflare-native**: Built for Workers, Pages, D1, R2, and KV
- **SvelteKit-powered**: Modern SSR framework with excellent DX
- **Magic code authentication**: Passwordless email-based auth
- **Markdown-first**: Content stored as markdown with frontmatter
- **Unique gutter system**: Custom annotation sidebars for blog posts

### Technology Stack

```
Frontend:  SvelteKit 2.0+, Svelte 5, Tailwind CSS, TypeScript
Backend:   Cloudflare Workers + Pages
Database:  D1 (SQLite)
Storage:   R2 (media/images)
Cache:     KV (sessions, rate limiting)
Email:     Resend API
Auth:      Custom JWT + magic codes
```

---

## 2. Architecture Overview

### Platform Structure

```
grove.place (marketing site - not yet built)
├── Handles signups, billing, dashboard
├── Stripe integration for payments
├── Provisions new tenant Workers
└── Manages custom domains

username.grove.place (individual blog)
├── Own Cloudflare Worker deployment
├── Own D1 database (or shared with tenant_id)
├── Own R2 bucket (namespaced by tenant)
├── Own KV namespace (sessions, cache)
└── Powered by packages/engine
```

### Current State (Phase 0.1)

- Marketing site (`grove.place`): Not yet built
- Engine package: Extracted from AutumnsGrove, in migration
- Multi-tenancy: Planned but not yet implemented
- Current mode: Single-tenant deployments (one repo per customer)

### Worker Architecture

Each Grove site runs as a **Cloudflare Pages project** (not a Worker directly):

```
Cloudflare Pages
├── SvelteKit SSR via adapter-cloudflare
├── Static assets served automatically
├── Dynamic routes via Functions
└── Bindings to D1, R2, KV
```

**Important:** The platform uses `adapter-cloudflare` with Pages mode, NOT Workers mode. This means:
- No `main = "src/worker.js"` in wrangler.toml
- No manual asset handling (Pages does this automatically)
- No cron triggers (use Scheduled Functions instead)
- Bindings accessed via `event.platform.env`

---

## 3. Setting Up a New Grove Site

### Prerequisites

- Cloudflare account with Workers/Pages access
- Wrangler CLI installed (`npm install -g wrangler`)
- Resend API key (for sending magic codes)
- GitHub account (for hosting the repo)

### Step-by-Step Setup

#### 3.1 Clone the Engine Package

```bash
# Clone the GroveEngine repository
git clone https://github.com/AutumnsGrove/GroveEngine.git
cd GroveEngine/packages/engine

# Install dependencies
npm install
```

#### 3.2 Create Cloudflare Resources

```bash
# Create D1 database for posts
npx wrangler d1 create yoursite-posts
# Save the database_id from output

# Create KV namespace for caching
npx wrangler kv namespace create "yoursite-cache"
# Save the namespace id from output

# Create R2 bucket for images
npx wrangler r2 bucket create yoursite-images
```

#### 3.3 Configure wrangler.toml

Update `/home/user/GroveEngine/packages/engine/wrangler.toml`:

```toml
name = "yoursite"
compatibility_date = "2025-01-01"
pages_build_output_dir = ".svelte-kit/cloudflare"

# KV Namespace for API caching
[[kv_namespaces]]
binding = "CACHE_KV"
id = "your-kv-namespace-id-here"

# R2 Bucket for images
[[r2_buckets]]
binding = "IMAGES"
bucket_name = "yoursite-images"

# D1 Database for blog posts
[[d1_databases]]
binding = "POSTS_DB"
database_name = "yoursite-posts"
database_id = "your-database-id-here"

# Non-sensitive environment variables
[vars]
CACHE_TTL_SECONDS = "3600"
AI_CACHE_TTL_SECONDS = "21600"
```

#### 3.4 Run Database Migrations

```bash
# Navigate to engine directory
cd packages/engine

# Run each migration in order
npx wrangler d1 execute yoursite-posts --file=migrations/001_magic_codes.sql
npx wrangler d1 execute yoursite-posts --file=migrations/002_auth_security.sql
npx wrangler d1 execute yoursite-posts --file=migrations/003_site_settings.sql
npx wrangler d1 execute yoursite-posts --file=migrations/004_pages_table.sql

# Verify migrations
npx wrangler d1 execute yoursite-posts --command "SELECT name FROM sqlite_master WHERE type='table';"
```

#### 3.5 Set Environment Secrets

```bash
# Session secret (generate a strong random string)
npx wrangler secret put SESSION_SECRET
# Enter a 32+ character random string

# Allowed admin emails (comma-separated)
npx wrangler secret put ALLOWED_ADMIN_EMAILS
# Enter: admin@example.com,user@example.com

# Resend API key (for magic code emails)
npx wrangler secret put RESEND_API_KEY
# Enter your Resend API key from https://resend.com
```

#### 3.6 Deploy to Cloudflare

```bash
# Build the project
npm run build

# Deploy to Cloudflare Pages
npx wrangler pages deploy .svelte-kit/cloudflare --project-name=yoursite

# Or use Cloudflare Dashboard:
# 1. Connect GitHub repo
# 2. Set build command: npm run build
# 3. Set output directory: .svelte-kit/cloudflare
# 4. Add environment variables and bindings
```

---

## 4. Key Files to Understand

### Core Files

| File | Purpose | Critical Concepts |
|------|---------|-------------------|
| `src/hooks.server.js` | Request handler, auth middleware, security headers | Session verification, CSRF protection |
| `src/lib/auth/session.js` | Session management | JWT signing/verification |
| `src/lib/auth/jwt.js` | JWT utilities | Token creation, validation |
| `src/lib/utils/csrf.js` | CSRF protection | Token generation, validation |
| `src/lib/utils/markdown.js` | Markdown parsing | Gutter content loading, frontmatter |
| `src/lib/utils/sanitize.js` | XSS prevention | DOMPurify configuration |

### Route Structure

```
src/routes/
├── +layout.svelte           # Root layout, theme management
├── +layout.server.js        # Load user session, site settings
├── +page.svelte             # Homepage
├── +page.server.js          # Homepage data loading
├── admin/                   # CMS interface (protected)
│   ├── +layout.server.js    # Admin auth check
│   ├── +layout.svelte       # Admin layout
│   ├── +page.svelte         # Admin dashboard
│   ├── blog/                # Post management
│   ├── pages/               # Static page management
│   ├── images/              # Media library
│   └── settings/            # Site settings
├── auth/                    # Authentication routes
│   ├── login/               # Login page
│   ├── send-code/           # Send magic code
│   ├── verify-code/         # Verify code and create session
│   ├── logout/              # Logout
│   └── me/                  # Current user info
├── blog/                    # Public blog routes
│   ├── +page.svelte         # Blog list
│   ├── +page.server.js      # Load all posts
│   └── [slug]/              # Individual post
├── api/                     # API endpoints
│   ├── posts/               # CRUD for posts
│   ├── pages/               # CRUD for pages
│   ├── images/              # Image upload/management
│   └── settings/            # Settings management
├── about/                   # Static page
├── contact/                 # Static page
└── rss.xml/                 # RSS feed
```

### Component Library

```
src/lib/components/
├── custom/                  # Grove-specific components
│   ├── ContentWithGutter.svelte    # Main gutter system
│   ├── GutterItem.svelte           # Individual annotation
│   ├── LeftGutter.svelte           # Gutter container
│   ├── TableOfContents.svelte      # Auto-generated TOC
│   ├── MobileTOC.svelte            # Mobile TOC
│   └── CollapsibleSection.svelte   # Expandable content
├── admin/                   # CMS components
│   ├── MarkdownEditor.svelte       # Post editor
│   └── GutterManager.svelte        # Gutter UI
├── gallery/                 # Image components
│   ├── ImageGallery.svelte         # In-post galleries
│   ├── Lightbox.svelte             # Image modal
│   └── ZoomableImage.svelte        # Pan/zoom
└── ui/                      # Shadcn components
    ├── button/
    ├── card/
    ├── input/
    └── ... (15+ UI components)
```

---

## 5. Cloudflare Worker Architecture

### Bindings Explained

Bindings give your Worker access to Cloudflare resources. Access them via `event.platform.env`:

```javascript
// In a +page.server.js or API route
export async function load({ platform }) {
  const db = platform.env.POSTS_DB;        // D1 database
  const images = platform.env.IMAGES;      // R2 bucket
  const cache = platform.env.CACHE_KV;     // KV namespace
  const secret = platform.env.SESSION_SECRET; // Secret
}
```

### D1 (Database)

SQLite database with full SQL support:

```javascript
// Query posts
const result = await db.prepare(
  'SELECT * FROM posts WHERE published = 1 ORDER BY date DESC'
).all();

// Insert a post
await db.prepare(
  'INSERT INTO posts (title, slug, content, published, date) VALUES (?, ?, ?, ?, ?)'
).bind(title, slug, content, 1, Date.now()).run();
```

**Database Schema:**

- `magic_codes` - Email verification codes
- `posts` - Blog posts (title, slug, content, date, published)
- `pages` - Static pages (title, slug, content)
- `site_settings` - Key-value settings (font_family, site_name, etc.)

### R2 (Object Storage)

S3-compatible storage for images:

```javascript
// Upload image
await images.put(`images/${filename}`, fileBuffer, {
  httpMetadata: {
    contentType: 'image/jpeg'
  }
});

// Get image
const object = await images.get(`images/${filename}`);
const blob = await object.blob();

// Delete image
await images.delete(`images/${filename}`);
```

### KV (Key-Value Store)

Fast distributed cache:

```javascript
// Cache API response
await cache.put('github:stats', JSON.stringify(data), {
  expirationTtl: 3600 // 1 hour
});

// Retrieve cached data
const cached = await cache.get('github:stats', 'json');
```

### Worker Routes

Cloudflare Pages automatically routes:
- `/` to your SvelteKit app
- `/api/*` to API routes
- Static assets served from `.svelte-kit/cloudflare`

For custom domains (Business plan), configure in Cloudflare Dashboard:
1. Add custom domain to Pages project
2. Set up DNS records (CNAME to pages.dev)
3. SSL is automatic

---

## 6. Environment Variables Required

### Secrets (set via `wrangler secret put`)

| Secret | Purpose | Example |
|--------|---------|---------|
| `SESSION_SECRET` | JWT signing key | Random 32+ char string |
| `ALLOWED_ADMIN_EMAILS` | Who can access `/admin` | `admin@example.com,user@gmail.com` |
| `RESEND_API_KEY` | Send magic code emails | `re_xxxxxxxxxxxxxxxxx` |

### Variables (set in wrangler.toml `[vars]`)

| Variable | Purpose | Default |
|----------|---------|---------|
| `CACHE_TTL_SECONDS` | API cache duration | `3600` (1 hour) |
| `AI_CACHE_TTL_SECONDS` | AI response cache | `21600` (6 hours) |

### Bindings (set in wrangler.toml)

| Binding | Type | Purpose |
|---------|------|---------|
| `POSTS_DB` | D1 | Main database |
| `IMAGES` | R2 | Media storage |
| `CACHE_KV` | KV | Caching layer |

---

## 7. Customization Points

### Per-Site Configuration

Currently, customization is done by editing files in the repo. Future versions will have a UI for this.

#### Site Settings (Database)

Stored in `site_settings` table:

```sql
-- Set site name
INSERT INTO site_settings (setting_key, setting_value, updated_at)
VALUES ('site_name', 'My Awesome Blog', strftime('%s', 'now'))
ON CONFLICT(setting_key) DO UPDATE SET setting_value = excluded.setting_value;

-- Set font family
UPDATE site_settings SET setting_value = 'alagard' WHERE setting_key = 'font_family';
```

Available fonts: `alagard`, `inter`, `geist`, `serif`

#### Homepage Content

Edit `src/routes/+page.svelte` to customize the homepage layout and content.

#### About/Contact Pages

Edit `src/routes/about/+page.svelte` and `src/routes/contact/+page.svelte` for static page content.

#### Styles and Theme

- Global styles: `src/lib/styles/app.css`
- Tailwind config: `tailwind.config.js`
- Theme switching: Handled in `src/routes/+layout.svelte` (light/dark mode)

#### Custom Components

Add site-specific components to `src/lib/components/custom/`.

---

## 8. Common Tasks

### Adding a New Blog Post

**Via Admin UI:**
1. Log in at `/auth/login`
2. Navigate to `/admin/blog`
3. Click "New Post"
4. Write content in Markdown
5. Add frontmatter (title, date, tags)
6. Click "Publish"

**Via Database:**
```javascript
await db.prepare(`
  INSERT INTO posts (title, slug, content, excerpt, date, published, category, tags)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`).bind(
  'My Post Title',
  'my-post-title',
  '# Content here...',
  'A brief excerpt',
  Date.now(),
  1, // published
  'tutorial',
  'svelte,cloudflare'
).run();
```

### Adding a New Static Page

**Via Admin UI:**
1. Navigate to `/admin/pages`
2. Click "New Page"
3. Enter title and slug
4. Write content
5. Save

**Programmatically:**
Create a new route in `src/routes/yourpage/+page.svelte`.

### Uploading Images

**Via Admin UI:**
1. Navigate to `/admin/images`
2. Click "Upload"
3. Select images (supports drag-and-drop)
4. Images are stored in R2 bucket

**Via API:**
```javascript
// POST /api/images/upload
const formData = new FormData();
formData.append('image', file);

const response = await fetch('/api/images/upload', {
  method: 'POST',
  body: formData,
  headers: {
    'X-CSRF-Token': csrfToken
  }
});
```

### Modifying the Layout

1. Edit `src/routes/+layout.svelte` for site-wide layout
2. Edit `src/routes/admin/+layout.svelte` for admin layout
3. Use `<slot />` to render child routes

### Updating Styles

1. Edit `src/lib/styles/app.css` for global styles
2. Use Tailwind classes in components
3. Theme variables defined in `:root` (CSS custom properties)

### Deploying Updates

```bash
# Make changes to code
git add .
git commit -m "Update X feature"
git push

# Build
npm run build

# Deploy
npx wrangler pages deploy .svelte-kit/cloudflare

# Or use GitHub integration (automatic deploys on push)
```

---

## 9. What NOT to Do

### Critical Rules

1. **Don't modify core engine code directly**
   - If you find a bug or want a feature, submit a PR to GroveEngine
   - Don't fork and diverge from upstream
   - Customer-specific changes should be additive, not modifications

2. **Don't hardcode tenant-specific values**
   - Use environment variables
   - Use database settings
   - Use configuration files
   - Future: Multi-tenancy will break hardcoded values

3. **Don't bypass the auth system**
   - Always check `event.locals.user` for auth
   - Don't create backdoors or skip CSRF validation
   - Don't expose admin routes without auth

4. **Don't skip migrations**
   - Always run migrations in order
   - Don't manually create tables
   - Schema changes must be in migration files

5. **Don't store secrets in code**
   - Use `wrangler secret put`
   - Never commit API keys, passwords, or tokens
   - Use environment variables for configuration

6. **Don't use Workers-only features**
   - No Durable Objects (use D1 instead)
   - No cron triggers in wrangler.toml (use Scheduled Functions)
   - No `fetch` handlers (use SvelteKit routes)

7. **Don't ignore security headers**
   - CSP is configured in `hooks.server.js`
   - Don't add 'unsafe-inline' without good reason
   - Don't disable CSRF protection

---

## 10. Troubleshooting

### Common Issues

#### "binding is not defined" or "platform.env is undefined"

**Cause:** Bindings not configured in wrangler.toml or not deployed correctly.

**Solution:**
```bash
# Check wrangler.toml has correct binding IDs
# Redeploy with:
npx wrangler pages deploy .svelte-kit/cloudflare
```

#### "Invalid CSRF token" on POST requests

**Cause:** Missing or incorrect CSRF token in form submission.

**Solution:**
```javascript
// In +page.server.js, pass csrfToken to page
export async function load({ locals }) {
  return { csrfToken: locals.csrfToken };
}

// In form submission
<input type="hidden" name="csrf_token" value={data.csrfToken} />
```

#### "D1_ERROR: no such table"

**Cause:** Migrations not run on D1 database.

**Solution:**
```bash
# Run all migrations
npx wrangler d1 execute yoursite-posts --file=migrations/001_magic_codes.sql
npx wrangler d1 execute yoursite-posts --file=migrations/002_auth_security.sql
npx wrangler d1 execute yoursite-posts --file=migrations/003_site_settings.sql
npx wrangler d1 execute yoursite-posts --file=migrations/004_pages_table.sql
```

#### "R2 bucket not found"

**Cause:** R2 bucket doesn't exist or binding name is wrong.

**Solution:**
```bash
# Create bucket
npx wrangler r2 bucket create yoursite-images

# Update wrangler.toml
[[r2_buckets]]
binding = "IMAGES"  # Must match code
bucket_name = "yoursite-images"  # Must match bucket
```

#### "Email not sent" (magic code)

**Cause:** Missing or invalid RESEND_API_KEY.

**Solution:**
```bash
# Set the secret
npx wrangler secret put RESEND_API_KEY
# Enter your API key from https://resend.com

# Verify it's set
npx wrangler secret list
```

#### "Cannot access /admin" even after login

**Cause:** Email not in ALLOWED_ADMIN_EMAILS list.

**Solution:**
```bash
# Update allowed emails
npx wrangler secret put ALLOWED_ADMIN_EMAILS
# Enter: youremail@example.com,other@example.com
```

#### Build fails with "adapter-cloudflare" errors

**Cause:** Incorrect configuration in svelte.config.js or wrangler.toml.

**Solution:**
```javascript
// svelte.config.js should have:
import adapter from '@sveltejs/adapter-cloudflare';

export default {
  kit: {
    adapter: adapter()
  }
};

// wrangler.toml should NOT have:
// main = "src/worker.js"  // Remove this line!
```

#### Gutter annotations not showing

**Cause:** Gutter content files missing or incorrect path.

**Solution:**
```
UserContent/
└── blog/
    └── your-post-slug/
        ├── _index.md          # Main post content
        └── gutter/
            ├── intro.md       # Gutter annotation
            └── conclusion.md  # Another annotation

# Reference in post:
<Gutter id="intro" />
```

#### Images not loading from R2

**Cause:** R2 binding not set or CORS issues.

**Solution:**
```bash
# Check binding in wrangler.toml
[[r2_buckets]]
binding = "IMAGES"
bucket_name = "yoursite-images"

# Set CORS if accessing from different domain
npx wrangler r2 bucket cors put yoursite-images --cors '{"AllowedOrigins": ["*"]}'
```

---

## 11. Understanding the Gutter System

The gutter system is a unique feature of GroveEngine. It allows annotations, asides, and commentary to appear in the margins of blog posts.

### How It Works

1. **ContentWithGutter.svelte** - Main container that positions content and gutter
2. **LeftGutter.svelte** - The margin area where annotations appear
3. **GutterItem.svelte** - Individual annotation component
4. **Gutter content files** - Markdown files in `UserContent/blog/[slug]/gutter/`

### Usage in a Post

```markdown
<!-- In your post markdown -->
# My Post Title

This is the main content. <Gutter id="intro" />

More content here.
```

```markdown
<!-- UserContent/blog/my-post-title/gutter/intro.md -->
This is a side note that appears in the margin!
```

### Creating Gutter Annotations in Admin

1. Go to admin blog editor
2. Write your post content
3. Click "Add Gutter" button
4. Enter gutter ID (e.g., "intro")
5. Write annotation content
6. Insert `<Gutter id="intro" />` in your post where you want it to appear

---

## 12. Advanced: Multi-Tenancy (Future)

**Status:** Planned but not yet implemented.

When multi-tenancy is added, the architecture will change:

```
Shared infrastructure:
├── One GroveEngine Worker (multi-tenant)
├── One D1 database (with tenant_id column)
├── One R2 bucket (with tenant prefix)
└── One KV namespace (with tenant prefix)

Per-tenant:
├── Subdomain routing (username.grove.place)
├── Custom domains (Business plan)
├── Isolated data by tenant_id
└── Per-tenant settings and quotas
```

### What Will Change

- `hooks.server.js` will detect subdomain and set tenant context
- All database queries will filter by `tenant_id`
- All R2 keys will be prefixed with `tenant-{id}/`
- All KV keys will be prefixed with `tenant-{id}:`

### What Will Stay the Same

- Core blog functionality
- Component library
- API routes (with tenant context)
- Admin UI (with tenant context)

---

## 13. Resources and Links

### Official Documentation

- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [D1 Database Docs](https://developers.cloudflare.com/d1/)
- [R2 Storage Docs](https://developers.cloudflare.com/r2/)
- [SvelteKit Docs](https://kit.svelte.dev/)
- [Wrangler CLI Docs](https://developers.cloudflare.com/workers/wrangler/)

### GroveEngine Resources

- Repository: `https://github.com/AutumnsGrove/GroveEngine`
- Migration Strategy: `/docs/MIGRATION-STRATEGY.md`
- Customer Setup Guide: `/docs/guides/customer-setup.md`
- Architecture Guide: `/docs/cloudflare-architecture-guide.md`

### Community

- Discussions: GitHub Discussions (when repository is public)
- Issues: GitHub Issues
- Email: support@grove.place (when available)

---

## 14. Quick Reference: File Paths

**Key for agents:** Always use absolute paths from the repository root.

```
Repository Root: /home/user/GroveEngine/

Core Files:
- Engine package: packages/engine/
- Wrangler config: packages/engine/wrangler.toml
- Server hooks: packages/engine/src/hooks.server.js
- Root layout: packages/engine/src/routes/+layout.svelte

Authentication:
- Session utils: packages/engine/src/lib/auth/session.js
- JWT utils: packages/engine/src/lib/auth/jwt.js
- Auth routes: packages/engine/src/routes/auth/

Admin CMS:
- Admin routes: packages/engine/src/routes/admin/
- Post editor: packages/engine/src/lib/components/admin/MarkdownEditor.svelte
- Gutter manager: packages/engine/src/lib/components/admin/GutterManager.svelte

Custom Components:
- Gutter system: packages/engine/src/lib/components/custom/ContentWithGutter.svelte
- Table of contents: packages/engine/src/lib/components/custom/TableOfContents.svelte

Database:
- Migrations: packages/engine/migrations/
- DB utilities: packages/engine/src/lib/db/

Utilities:
- Markdown parser: packages/engine/src/lib/utils/markdown.js
- CSRF protection: packages/engine/src/lib/utils/csrf.js
- Sanitization: packages/engine/src/lib/utils/sanitize.js

Documentation:
- Main README: README.md
- Migration docs: docs/MIGRATION-STRATEGY.md
- Customer setup: docs/guides/customer-setup.md
- This guide: docs/guides/AGENT-GUIDE-NEW-GROVE-SITES.md
```

---

## 15. Deployment Checklist

When setting up a new Grove site, verify:

- [ ] Cloudflare account set up
- [ ] Wrangler CLI installed and authenticated
- [ ] D1 database created
- [ ] KV namespace created
- [ ] R2 bucket created
- [ ] wrangler.toml configured with correct IDs
- [ ] All migrations run successfully
- [ ] SESSION_SECRET set
- [ ] ALLOWED_ADMIN_EMAILS set
- [ ] RESEND_API_KEY set
- [ ] Site builds successfully (`npm run build`)
- [ ] Site deploys successfully (`npx wrangler pages deploy`)
- [ ] Can access site at URL
- [ ] Can log in at `/auth/login`
- [ ] Can access `/admin` dashboard
- [ ] Can create and publish a test post
- [ ] Can upload an image
- [ ] RSS feed works at `/rss.xml`

---

## 16. Agent Tips

**For AI agents working with GroveEngine:**

1. **Always read the migration strategy first** - Understanding what was extracted from AutumnsGrove helps you understand the codebase structure.

2. **Check wrangler.toml before making changes** - This tells you what bindings are available and how they're named.

3. **Never assume environment variables exist** - Always check if a secret or variable is set before using it.

4. **Use the hooks.server.js file as your security reference** - This is where CSRF, session validation, and security headers are configured.

5. **When debugging auth issues, check three places:**
   - `event.locals.user` (set in hooks.server.js)
   - `ALLOWED_ADMIN_EMAILS` secret
   - Session cookie in browser

6. **The gutter system is unique** - No other platform has this. Don't try to replace it with standard components.

7. **Migrations are sequential and immutable** - Never edit an existing migration. Create a new one.

8. **R2 paths don't need leading slashes** - Use `images/photo.jpg` not `/images/photo.jpg`

9. **D1 is SQLite** - Use SQLite syntax, not PostgreSQL or MySQL.

10. **Platform-specific code goes in `+*.server.js` files** - Never import `platform.env` in client-side `.svelte` files.

---

**End of Guide**

This guide will be updated as GroveEngine evolves. If you encounter issues not covered here, check the migration documentation or create a GitHub issue.

**Happy coding!**
