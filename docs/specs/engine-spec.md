---
aliases:
date created: Friday, November 21st 2025, 3:01:54 pm
date modified: Friday, November 21st 2025, 3:02:46 pm
tags:
type: tech-spec
---

# GroveEngine - Technical Specification

**Project:** GroveEngine - Core Blog Engine  
**Repository:** `grove-engine`  
**Type:** Core Library / Engine  
**Purpose:** Powers all individual blog instances with reusable components

---

## Overview

GroveEngine is the underlying blog platform that powers all Grove blogs. It's a SvelteKit-based engine that provides blog functionality, theming, media management, and admin tools. It can be deployed as a standalone blog or integrated into the multi-tenant Grove platform.

---

## Architecture

### Tech Stack
- **Framework:** SvelteKit 2.0+
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Content:** Markdown with frontmatter
- **Media:** Cloudflare R2 + Images Transformations
- **Storage:** Cloudflare D1 (per-tenant databases)
- **Build:** Vite

### Project Structure
```
grove-engine/
├── src/
│   ├── lib/
│   │   ├── components/          # Reusable blog components
│   │   │   ├── posts/
│   │   │   │   ├── PostList.svelte
│   │   │   │   ├── PostView.svelte
│   │   │   │   └── PostEditor.svelte
│   │   │   ├── layout/
│   │   │   │   ├── Header.svelte
│   │   │   │   ├── Footer.svelte
│   │   │   │   └── Sidebar.svelte
│   │   │   └── media/
│   │   │       ├── ImageUploader.svelte
│   │   │       └── MediaGallery.svelte
│   │   ├── themes/              # Theme system
│   │   │   ├── default/
│   │   │   │   ├── layout.svelte
│   │   │   │   ├── styles.css
│   │   │   │   └── config.json
│   │   │   └── [theme-name]/
│   │   ├── utils/               # Utilities
│   │   │   ├── markdown.ts
│   │   │   ├── slugify.ts
│   │   │   └── date-format.ts
│   │   └── api/                 # API clients
│   │       ├── posts.ts
│   │       ├── media.ts
│   │       └── config.ts
│   ├── routes/
│   │   ├── (blog)/
│   │   │   ├── +layout.svelte   # Blog layout
│   │   │   ├── +page.svelte     # Blog homepage
│   │   │   ├── [slug]/
│   │   │   │   └── +page.svelte # Individual post
│   │   │   └── rss.xml/+server.ts
│   │   └── admin/
│   │       ├── +layout.svelte   # Admin layout
│   │       ├── +page.svelte     # Admin dashboard
│   │       ├── posts/
│   │       │   ├── +page.svelte # Post list
│   │       │   ├── new/+page.svelte
│   │       │   └── [id]/+page.svelte
│   │       ├── media/+page.svelte
│   │       └── settings/+page.svelte
│   └── app.d.ts
├── static/
├── tests/
├── docs/
└── package.json
```

---

## Core Features

### 1. Post Management

**Create & Edit Posts:**
- Markdown editor with live preview
- Frontmatter support (title, date, tags, excerpt, featured image)
- Auto-save drafts
- Slug generation from title
- Word count display
- Reading time estimation

**Post Metadata:**
```typescript
interface Post {
  id: string;
  title: string;
  slug: string;
  content: string; // markdown
  excerpt?: string;
  created_at: number; // timestamp
  updated_at: number; // timestamp
  published: boolean;
  status: 'published' | 'draft' | 'archived';
  tags: string[];
  featured_image?: string;
  word_count: number;
  reading_time: number; // minutes
}
```

**Post Limits (Soft Enforcement):**
- Track post count per blog
- Warning at 80% of limit (200/250)
- At limit: new posts archive oldest (don't delete)
- Archived posts accessible in admin panel
- Upgrade restores archived posts

### 2. Theme System

**Theme Structure:**
```
themes/
├── default/           # Default theme (current autumnsgrove.com design)
├── minimal/           # Clean, typography-focused
├── magazine/          # Grid layout, featured posts
└── portfolio/         # For photographers/artists
```

**Theme Configuration:**
```json
{
  "name": "Default",
  "version": "1.0.0",
  "author": "Grove",
  "description": "The default Grove blog theme",
  "features": {
    "gutter_links": true,
    "table_of_contents": true,
    "featured_images": true,
    "tags": true,
    "author_bio": true
  },
  "customizable": {
    "colors": ["primary", "secondary", "accent"],
    "fonts": ["heading", "body"],
    "layout": ["sidebar", "no-sidebar"]
  }
}
```

**Theme Switching:**
- Change theme via admin panel
- Preview before applying
- No data loss when switching
- Custom CSS override option

### 3. Media Management

**Image Upload:**
- Drag & drop upload in editor
- Multiple image formats (JPG, PNG, GIF, WebP)
- Automatic optimization & resizing
- Cloudflare R2 storage
- CDN delivery via `/cdn-cgi/image/`

**Image Processing:**
```html
<!-- Responsive images with Cloudflare transformations -->
<img 
  src="/cdn-cgi/image/width=800,format=auto,quality=85/image.jpg"
  srcset="
    /cdn-cgi/image/width=400,format=auto/image.jpg 400w,
    /cdn-cgi/image/width=800,format=auto/image.jpg 800w,
    /cdn-cgi/image/width=1200,format=auto/image.jpg 1200w
  "
  sizes="(max-width: 600px) 400px, (max-width: 1000px) 800px, 1200px"
  loading="lazy"
  alt="Description"
>
```

**Media Library:**
- Browse all uploaded images
- Search and filter by date
- Delete unused images
- Image metadata (size, format, upload date)

### 4. Admin Panel

**Dashboard:**
- Post count & limit indicator
- Recent posts list
- Quick stats (posts this month, total views if analytics enabled)
- Draft posts
- Archived posts (if over limit)

**Post Editor:**
- Split view: markdown on left, preview on right
- Toolbar for common markdown (bold, italic, links, images)
- Save draft / Publish / Unpublish actions
- Preview in new tab
- SEO preview (title, meta description)

**Settings:**
- Blog title & description
- Theme selection
- Social links
- RSS feed settings
- Post limit status & upgrade prompt

### 5. Content Features

**Gutter Links:**
- Sidebar links per post
- Configured via separate markdown files
- Appear on right side of post content
- Support for external links and internal references

**Table of Contents:**
- Auto-generated from post headings
- Sticky sidebar on desktop
- Collapsible on mobile
- Click to jump to section

**Tags:**
- Add tags to posts
- Tag archive pages
- Tag cloud widget
- Filter posts by tag

**RSS Feed:**
- Auto-generated RSS 2.0 feed
- Full content or excerpt option
- Custom feed URL: `/rss.xml`
- Category/tag-specific feeds

---

## Configuration

### Blog Configuration
```typescript
interface BlogConfig {
  // Identity
  title: string;
  description: string;
  author: string;
  author_bio?: string;
  avatar?: string;
  
  // URLs
  url: string; // Full URL including subdomain
  base_url: string; // For relative links
  
  // Features
  theme: string; // Theme name
  posts_per_page: number; // Pagination
  show_excerpts: boolean;
  show_reading_time: boolean;
  show_word_count: boolean;
  
  // Limits
  post_limit: number | null; // null = unlimited
  current_post_count: number;
  archived_post_count: number;
  
  // Social
  twitter?: string;
  github?: string;
  email?: string;
  
  // Dates
  created_at: number;
  updated_at: number;
}
```

### Environment Variables
```bash
# Cloudflare bindings
DATABASE_URL=  # D1 database
R2_BUCKET=     # Media storage
KV_NAMESPACE=  # Configuration cache

# Features
PUBLIC_SITE_URL=https://username.grove.com
PUBLIC_THEME=default
PUBLIC_POSTS_PER_PAGE=10
```

---

## API Reference

### Post API

**Get All Posts:**
```typescript
GET /api/posts
Query: {
  page?: number;
  limit?: number;
  status?: 'published' | 'draft' | 'archived';
  tag?: string;
}
Response: {
  posts: Post[];
  total: number;
  page: number;
  total_pages: number;
}
```

**Get Single Post:**
```typescript
GET /api/posts/[slug]
Response: Post | null
```

**Create Post:**
```typescript
POST /api/posts
Body: {
  title: string;
  content: string;
  excerpt?: string;
  tags?: string[];
  published?: boolean;
}
Response: { success: boolean; post: Post }
```

**Update Post:**
```typescript
PUT /api/posts/[id]
Body: Partial<Post>
Response: { success: boolean; post: Post }
```

**Delete Post:**
```typescript
DELETE /api/posts/[id]
Response: { success: boolean }
```

**Archive Post (at limit):**
```typescript
POST /api/posts/[id]/archive
Response: { success: boolean; archived: boolean }
```

### Media API

**Upload Image:**
```typescript
POST /api/media/upload
Content-Type: multipart/form-data
Body: { file: File }
Response: { 
  success: boolean; 
  url: string;
  metadata: {
    width: number;
    height: number;
    size: number;
    format: string;
  }
}
```

**List Media:**
```typescript
GET /api/media
Query: { page?: number; limit?: number }
Response: {
  files: MediaFile[];
  total: number;
}
```

### Config API

**Get Config:**
```typescript
GET /api/config
Response: BlogConfig
```

**Update Config:**
```typescript
PUT /api/config
Body: Partial<BlogConfig>
Response: { success: boolean; config: BlogConfig }
```

---

## Database Schema

### Posts Table (D1)
```sql
CREATE TABLE posts (
  id TEXT PRIMARY KEY, -- UUID
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,
  html TEXT, -- Pre-rendered HTML for performance
  
  -- Status & visibility
  status TEXT DEFAULT 'draft', -- 'draft', 'published', 'archived'
  published_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  
  -- Metadata
  word_count INTEGER,
  reading_time INTEGER, -- minutes
  featured_image TEXT,
  
  -- Relations
  author_id TEXT,
  FOREIGN KEY (author_id) REFERENCES users(id)
);

CREATE INDEX idx_posts_slug ON posts(slug);
CREATE INDEX idx_posts_status ON posts(status);
CREATE INDEX idx_posts_created ON posts(created_at DESC);
CREATE INDEX idx_posts_published ON posts(published_at DESC) WHERE status = 'published';
```

### Tags Table
```sql
CREATE TABLE tags (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX idx_tags_slug ON tags(slug);
```

### Post Tags (Many-to-Many)
```sql
CREATE TABLE post_tags (
  post_id TEXT NOT NULL,
  tag_id TEXT NOT NULL,
  PRIMARY KEY (post_id, tag_id),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE INDEX idx_post_tags_post ON post_tags(post_id);
CREATE INDEX idx_post_tags_tag ON post_tags(tag_id);
```

### Media Table
```sql
CREATE TABLE media (
  id TEXT PRIMARY KEY,
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  url TEXT NOT NULL,
  
  -- Metadata
  width INTEGER,
  height INTEGER,
  size INTEGER, -- bytes
  format TEXT, -- 'jpg', 'png', 'webp', etc.
  mime_type TEXT,
  
  -- Upload info
  uploaded_by TEXT,
  uploaded_at INTEGER NOT NULL,
  
  FOREIGN KEY (uploaded_by) REFERENCES users(id)
);

CREATE INDEX idx_media_uploaded_by ON media(uploaded_by);
CREATE INDEX idx_media_uploaded_at ON media(uploaded_at DESC);
```

### Configuration Table
```sql
CREATE TABLE config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL, -- JSON string
  updated_at INTEGER NOT NULL
);
```

---

## Theme Development

### Creating a New Theme

1. **Create theme directory:**
```bash
mkdir src/lib/themes/my-theme
cd src/lib/themes/my-theme
```

2. **Create config.json:**
```json
{
  "name": "My Theme",
  "version": "1.0.0",
  "description": "A custom theme for Grove blogs",
  "features": {
    "gutter_links": true,
    "table_of_contents": true,
    "featured_images": true,
    "tags": true,
    "author_bio": true,
    "related_posts": false
  }
}
```

3. **Create layout.svelte:**
```svelte
<script lang="ts">
  import type { BlogConfig } from '$lib/types';
  
  export let config: BlogConfig;
  export let posts: Post[];
</script>

<div class="my-theme-layout">
  <header>
    <h1>{config.title}</h1>
    <p>{config.description}</p>
  </header>
  
  <main>
    <slot />
  </main>
  
  <footer>
    <p>&copy; {new Date().getFullYear()} {config.author}</p>
  </footer>
</div>

<style>
  .my-theme-layout {
    /* Custom styles */
  }
</style>
```

4. **Add styles:**
```css
/* styles.css */
.my-theme-layout {
  --primary-color: #2563eb;
  --secondary-color: #64748b;
  --accent-color: #f59e0b;
  --font-heading: 'Georgia', serif;
  --font-body: 'Inter', sans-serif;
}
```

---

## Performance Optimization

### Caching Strategy

**Edge Caching (Cloudflare):**
- Cache static assets (CSS, JS, images) for 1 year
- Cache blog post pages for 1 hour
- Purge cache on content update

**Database Caching:**
- Cache config in KV (5 minute TTL)
- Cache post counts (1 minute TTL)
- Cache tag lists (10 minute TTL)

**Client-Side Caching:**
- Service worker for offline reading
- Cache recent posts in localStorage
- Lazy load images below fold

### Bundle Optimization

**Code Splitting:**
- Admin panel code separate from blog
- Theme components loaded dynamically
- Markdown editor loaded on demand

**Image Optimization:**
- WebP/AVIF format where supported
- Responsive images with srcset
- Lazy loading with loading="lazy"
- Blur-up placeholders

---

## Security

### Content Security
- Sanitize all markdown input (prevent XSS)
- Validate image uploads (type, size, dimensions)
- Rate limit post creation (max 10/hour per user)
- CSRF protection on all forms

### Data Security
- Parameterized queries only (prevent SQL injection)
- Environment variables for secrets
- No sensitive data in client-side code
- Secure cookies for sessions

### Access Control
- Admin routes protected by auth
- API endpoints validate permissions
- Media files served with proper headers
- CORS configured appropriately

---

## Testing

### Unit Tests
- Utility functions (slugify, date formatting)
- Markdown processing
- Configuration validation

### Integration Tests
- Post CRUD operations
- Media upload & processing
- Theme switching
- RSS feed generation

### E2E Tests
- Full post creation flow
- Admin panel navigation
- Blog rendering
- Mobile responsiveness

---

## Documentation

### For Developers
- Theme development guide
- API reference
- Database migrations
- Deployment instructions

### For Clients
- Using the admin panel
- Writing markdown
- Uploading images
- Customizing themes

---

## Deployment

### Cloudflare Pages
```toml
# wrangler.toml
name = "grove-engine"
main = "./.svelte-kit/cloudflare-worker.js"
compatibility_date = "2024-11-21"

[site]
bucket = ".svelte-kit/cloudflare"

[[d1_databases]]
binding = "DB"
database_name = "grove-engine"
database_id = "your-d1-id"

[[r2_buckets]]
binding = "MEDIA_BUCKET"
bucket_name = "grove-media"
```

### Build Process
```bash
# Install dependencies
npm install

# Build for production
npm run build

# Deploy to Cloudflare
wrangler pages deploy .svelte-kit/cloudflare
```

---

## Future Enhancements

See `TODOS.md` for full list of future features including:
- Advanced analytics
- Newsletter integration
- Collaborative editing
- Mobile app
- API access

---

## Success Metrics

**Performance:**
- Page load time < 2 seconds
- Lighthouse score > 90
- Bundle size < 200KB (gzipped)

**Reliability:**
- Zero data loss incidents
- 99.9% uptime
- All tests passing

**Developer Experience:**
- Build time < 30 seconds
- Hot reload working
- Clear error messages
- Good TypeScript coverage

---

*Last Updated: November 2025*