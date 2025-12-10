# Mom's Publishing House - Launch TODO

> First client deployment. Keep it simple, ship it, iterate.

## Pre-Launch

### Discovery (Do First!)
- [ ] Call with Mom - what pages does she actually need?
- [ ] Get her content (logo, about text, book list, any existing images)
- [ ] Confirm domain situation (subdomain of grove.place or custom domain?)

### Security Audit
- [ ] Review auth flow (magic codes, JWT, session handling)
- [ ] Check CSRF protection on all forms
- [ ] Verify input sanitization (markdown, user inputs)
- [ ] Review R2 upload permissions (file type restrictions, size limits)
- [ ] Check for exposed secrets/env vars
- [ ] Test rate limiting on auth endpoints

### GitHub Org Setup
- [ ] Create @teamGrove (or @GrovePlatform) organization
- [ ] Create private repo for Mom's site deployment
- [ ] Set up deployment secrets in repo

## Build

### Site Pages
- [ ] Home page (hero, brief intro, featured books?)
- [ ] About page
- [ ] Gallery (use existing ImageGallery component)
- [ ] Books directory (custom component - list of published works)
- [ ] Blog (already done via engine)
- [ ] Contact page (simple form or just email link?)

### Site-Specific
- [ ] Configure site branding (colors, fonts, logo)
- [ ] Set up her admin account
- [ ] Configure Resend for her domain (if custom domain)

## Deploy
- [ ] Set up Cloudflare resources (D1, R2, KV)
- [ ] Run migrations
- [ ] Deploy to Cloudflare Pages
- [ ] Verify everything works
- [ ] Hand off admin credentials to Mom
- [ ] Quick training session on admin panel

## Post-Launch
- [ ] Monitor for issues first week
- [ ] Gather feedback
- [ ] Fix any bugs that come up

---

*Target: Get her live, then iterate based on real feedback.*
