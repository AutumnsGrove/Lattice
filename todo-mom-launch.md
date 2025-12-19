# Mom's Publishing House - Launch TODO

> Site-specific deployment using GroveEngine. A custom site for a publishing house, not a standard Grove blog tenant.

**Repository:** `AutumnsGrove/[repo-name-tbd]` (private)
**Type:** Custom site using `@autumnsgrove/groveengine` as dependency
**Target:** Publishing house portfolio site with book catalog

---

## Pre-Launch

### Discovery (Do First!)
- [ ] Call with Mom - what pages does she actually need?
- [ ] Get her content (logo, about text, book list, any existing images)
- [ ] Confirm domain situation (subdomain of grove.place or custom domain?)
- [ ] Clarify: Is a blog needed, or just static pages with admin editing?

### Repository Setup
- [ ] Create private repo under AutumnsGrove
- [ ] Initialize SvelteKit project with Cloudflare adapter
- [ ] Add `@autumnsgrove/groveengine` as dependency
- [ ] Set up deployment secrets in repo
- [ ] Configure CI/CD for Cloudflare Pages

---

## Build

### Site Architecture
This is a **custom site using the engine**, not a multi-tenant blog. Structure:

```
mom-site/
├── src/
│   ├── routes/
│   │   ├── +page.svelte           # Home page
│   │   ├── about/+page.svelte     # About the publishing house
│   │   ├── books/                 # Book catalog
│   │   │   ├── +page.svelte       # Book listing
│   │   │   └── [slug]/+page.svelte # Individual book page
│   │   ├── gallery/+page.svelte   # Image gallery (uses engine component)
│   │   ├── blog/                  # Optional: blog section
│   │   ├── contact/+page.svelte   # Contact page
│   │   └── admin/                 # Admin panel (from engine)
│   └── lib/
│       └── components/            # Site-specific components
├── static/
│   └── images/                    # Site assets
└── wrangler.toml                  # Cloudflare config
```

### Site Pages
- [ ] Home page (hero, brief intro, featured books)
- [ ] About page (publishing house story, mission)
- [ ] Books directory (custom component - list of published works with covers)
- [ ] Individual book pages (description, purchase links, reviews)
- [ ] Gallery (use engine's ImageGallery component)
- [ ] Contact page (simple form or just email link)
- [ ] Blog (optional - only if she wants to write posts)

### Components to Build
- [ ] `BookCard` - Display book cover, title, author, brief description
- [ ] `BookGrid` - Grid layout for book listings
- [ ] `BookDetail` - Full book page with description, links, etc.
- [ ] `HeroSection` - Homepage hero with publishing house branding

### Site-Specific Configuration
- [ ] Configure site branding (colors, fonts, logo)
- [ ] Set up her admin account in D1
- [ ] Configure Resend for contact form (if using custom domain)

---

## Deploy

### Cloudflare Setup
- [ ] Create D1 database for site
- [ ] Create R2 bucket for images
- [ ] Create KV namespace (if needed for caching)
- [ ] Run database migrations

### Deployment
- [ ] Deploy to Cloudflare Pages
- [ ] Configure custom domain (if applicable)
- [ ] Set up DNS records
- [ ] Verify SSL/HTTPS working
- [ ] Test all pages and admin panel

### Handoff
- [ ] Hand off admin credentials to Mom
- [ ] Quick training session on admin panel
- [ ] Document how to add/edit books
- [ ] Document how to upload images

---

## Post-Launch

- [ ] Monitor for issues first week
- [ ] Gather feedback
- [ ] Fix any bugs that come up
- [ ] Iterate based on real usage

---

## Engine Components to Use

From `@autumnsgrove/groveengine`:
- **Admin Panel** - Content management
- **MarkdownEditor** - For editing page content
- **ImageGallery** - For gallery page
- **Auth System** - Admin authentication (via Heartwood)
- **R2 Storage** - Image uploads and CDN
- **D1 Utilities** - Database operations

---

## Differences from Standard Grove Tenant

| Aspect | Grove Tenant | Mom's Site |
|--------|--------------|------------|
| **Hosting** | Multi-tenant (dave.grove.place) | Standalone site |
| **Scope** | Blog-focused | Portfolio/catalog-focused |
| **Pages** | Posts + standard pages | Custom pages (books, gallery) |
| **Billing** | Grove subscription tier | No billing (family) |
| **Customization** | Theme system (Foliage) | Fully custom design |

---

*Keep it simple. Ship it. Iterate based on real feedback.*
