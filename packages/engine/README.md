# Lattice (@autumnsgrove/groveengine)

> **Internal codename:** GroveEngine

Multi-tenant blog engine for the Grove Platform. Each Grove site runs as its own Cloudflare Worker, powered by Lattice. A lattice is the framework that supports growth—vines climb it, gardens are built around it.

## Features

- **Gutter Annotations** - Unique sidebar annotation system for blog posts
- **Markdown Editor** - Full-featured editor with live preview, themes, and drag-drop image upload
- **Magic Code Auth** - Passwordless authentication via email codes
- **Admin Panel** - Complete CMS for posts, pages, images, and settings
- **Multi-Tenant Ready** - Designed for username.grove.place architecture
- **Cloudflare Native** - D1 database, R2 storage, KV caching, Workers deployment

## Architecture

```
Each Grove Site (Cloudflare Worker)
├── src/
│   ├── routes/
│   │   ├── admin/        # CMS admin panel
│   │   ├── api/          # REST API endpoints
│   │   ├── auth/         # Magic code authentication
│   │   ├── blog/         # Blog listing and posts
│   │   ├── about/        # Static about page
│   │   └── contact/      # Static contact page
│   └── lib/
│       ├── auth/         # JWT and session management
│       ├── components/   # Svelte components
│       │   ├── admin/    # MarkdownEditor, GutterManager
│       │   ├── custom/   # ContentWithGutter, TableOfContents
│       │   ├── gallery/  # ImageGallery, Lightbox, ZoomableImage
│       │   └── ui/       # shadcn-svelte components
│       ├── utils/        # Markdown parser, CSRF, sanitization
│       └── styles/       # CSS and tokens
├── UserContent/          # Site-specific content
├── migrations/           # D1 database migrations
└── static/fonts/         # Self-hosted fonts
```

## Cloudflare Bindings Required

```toml
# wrangler.toml
[[d1_databases]]
binding = "DB"
database_name = "your-site-db"
database_id = "your-database-id"

[[r2_buckets]]
binding = "IMAGES"
bucket_name = "your-site-images"

[[kv_namespaces]]
binding = "CACHE"
id = "your-kv-id"
```

## Environment Variables

```bash
# .dev.vars
JWT_SECRET=your-secret-key
ALLOWED_ADMIN_EMAILS=admin@example.com
RESEND_API_KEY=re_xxxxx
```

## Quick Start

1. **Clone and install**
   ```bash
   cd packages/engine
   npm install
   ```

2. **Set up Cloudflare resources**
   ```bash
   npx wrangler d1 create your-site-db
   npx wrangler r2 bucket create your-site-images
   npx wrangler kv:namespace create CACHE
   ```

3. **Run migrations**
   ```bash
   npx wrangler d1 execute your-site-db --local --file=migrations/001_magic_codes.sql
   npx wrangler d1 execute your-site-db --local --file=migrations/002_auth_security.sql
   npx wrangler d1 execute your-site-db --local --file=migrations/003_site_settings.sql
   npx wrangler d1 execute your-site-db --local --file=migrations/004_pages_table.sql
   npx wrangler d1 execute your-site-db --local --file=migrations/005_multi_tenant.sql
   ```

4. **Configure environment**
   ```bash
   cp .dev.vars.example .dev.vars
   # Edit .dev.vars with your values
   ```

5. **Start development**
   ```bash
   npm run dev
   ```

6. **Deploy**
   ```bash
   npx wrangler pages deploy
   ```

## Fonts

Lattice includes self-hosted accessibility-focused fonts in `static/fonts/`. After installing the package, copy the fonts to your project's static directory:

```bash
# Copy fonts from node_modules to your static folder
cp -r node_modules/@autumnsgrove/groveengine/static/fonts/ static/fonts/
```

**Included fonts:**
- `alagard.ttf` - Pixel art style
- `AtkinsonHyperlegible-Regular.ttf` - High legibility
- `CozetteVector.ttf` - Bitmap style
- `Cormorant-Regular.ttf` - Elegant serif
- `Lexend-Regular.ttf` - Reading optimized
- `OpenDyslexic-Regular.otf` - Dyslexia-friendly
- `Quicksand-Regular.ttf` - Rounded sans-serif

Your `@font-face` declarations should reference `/fonts/fontname.ttf`.

## Key Components

### Gutter System
The unique gutter annotation system allows sidebar notes on blog posts:
- `ContentWithGutter.svelte` - Main content layout
- `GutterItem.svelte` - Individual annotations
- `LeftGutter.svelte` - Gutter container
- `GutterManager.svelte` - Admin UI for managing gutters

### Markdown Editor
Full-featured editor with:
- Live preview
- Multiple themes (Grove, Amber, Matrix, Dracula, Nord, Rose)
- Drag-drop image upload to R2
- Mermaid diagram support
- Slash commands
- Zen mode

### Authentication
Passwordless magic code system:
- Email-based verification codes
- JWT sessions
- Rate limiting
- Constant-time comparison for security

## Multi-Tenant Schema

The engine supports multi-tenant deployment where each tenant gets isolated data:

```sql
-- Each tenant (subdomain)
CREATE TABLE tenants (
  id TEXT PRIMARY KEY,
  subdomain TEXT UNIQUE NOT NULL,
  plan TEXT DEFAULT 'starter',
  -- ...
);

-- Posts scoped to tenant
CREATE TABLE posts (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  slug TEXT NOT NULL,
  -- ...
  UNIQUE(tenant_id, slug)
);
```

## Related Documentation

- [Migration Strategy](../../docs/MIGRATION-STRATEGY.md)
- [Agent Guide for New Sites](../../docs/guides/AGENT-GUIDE-NEW-GROVE-SITES.md)
- [Customer Setup Guide](../../docs/guides/customer-setup.md)

## License

MIT
