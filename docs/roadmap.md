# Grove Platform — Development Roadmap

> **Internal Technical Roadmap**
>
> This document tracks development through Grove's seasonal phases. Each phase has both a public-facing narrative and detailed technical implementation tasks.
>
> For the public roadmap, see: https://grove.place/roadmap

---

## Current Phase: Thaw

**Status:** Active Development (January 2025)
**Progress:** ~33%

---

## Phase 1: First Frost (Complete)

*"The quiet before dawn"*

The groundwork laid in stillness. Foundations built when no one was watching.

### Completed

- [x] **Core Engine (Lattice)** — Blog engine extracted from autumnsgrove.com
  - SvelteKit 2.0 + Svelte 5 runes
  - Cloudflare Workers, D1, KV, R2
  - Markdown editor with live preview
  - Post CRUD, media uploads, RSS feeds
  - Table of contents, gutter links (vines)

- [x] **Authentication (Heartwood)** — Secure OAuth 2.0 + PKCE
  - Google OAuth provider
  - GitHub OAuth provider
  - Magic code email auth via Resend
  - Session management in D1
  - Cross-subdomain cookies

- [x] **Landing Site** — grove.place welcomes visitors
  - Seasonal theme system
  - Randomized forest generation
  - Email waitlist (59 subscribers at launch)
  - Vision, pricing, roadmap pages

- [x] **Infrastructure** — SST + Cloudflare
  - D1 databases, KV namespaces, R2 buckets
  - Stripe products/prices defined in code
  - GitHub Actions CI/CD
  - Wrangler deployments

---

## Phase 2: Thaw (Current)

*"The ice begins to crack"*

Grove opens its doors. The first trees take root.

### Active Work

- [x] **Sign Up Flow** — plant.grove.place
  - Google, GitHub, email auth options
  - Profile creation with username
  - Plan selection (Seedling/Sapling/Oak/Evergreen)
  - Stripe checkout integration
  - Interactive onboarding tour

- [x] **Seedling Tier** — $8/month base offering
  - 50 posts, 1 GB storage
  - 3 themes to start
  - username.grove.place subdomain
  - Full Meadow access

- [x] **Markdown Writing** — Clean, focused editor
  - Live preview
  - Drag-and-drop images
  - Vine annotations (margin notes)

- [x] **Image Hosting** — R2-backed media
  - Automatic optimization
  - CDN delivery via cdn.grove.place
  - Alt text support

- [x] **RSS Feed** — Built-in, because it should be
  - Standard RSS 2.0 format
  - Full post content in feed

- [x] **Shade Protection** — AI crawlers blocked
  - Cloudflare Bot Fight Mode
  - robots.txt with comprehensive AI bot list
  - X-Robots-Tag: noai, noimageai
  - Turnstile human verification

- [x] **Data Export** — Your words, always portable
  - Markdown + images as zip
  - Full metadata preservation

- [x] **Help Center** — Built into admin panel
  - Contextual help buttons
  - SQLite FTS5 search
  - 10 knowledge categories

### Remaining for Thaw

- [ ] **Launch Signups** — Open plant.grove.place to public
  - Final Stripe webhook testing
  - Welcome email sequence (day 1, 3, 7, 30)
  - Support ticket system ready

- [ ] **First 3-5 Tenants** — Friends & family beta
  - Track actual support time
  - Gather UX feedback
  - Validate pricing model

### Technical Tasks

- [ ] Debug Edit button on blog list (navigation issue)
- [ ] Set Stripe secrets in Cloudflare Dashboard
- [ ] Create Stripe webhook endpoint configuration
- [ ] Set GROVEAUTH secrets for OAuth flow
- [ ] Complete Shade WAF rules (3 of 5 slots)
- [ ] Deploy robots.txt and meta tags

---

## Phase 3: First Buds

*"Green emerging through snow"*

New growth appears. The grove finds its voice.

### Planned Features

- [ ] **Ivy** — Email at @grove.place
  - Forward emails to personal inbox
  - Custom @username.grove.place addresses
  - Spam filtering via Cloudflare Email Routing

- [ ] **Amber** — Storage dashboard
  - See usage across posts and media
  - Visual breakdown by file type
  - Upgrade prompts near limits

- [ ] **Trails** — Personal roadmaps
  - Share your journey publicly
  - Seasonal theming integration
  - Embed in blog posts
  - See `docs/specs/trails-spec.md`

- [ ] **Sapling Tier** — $12/month growth tier
  - 250 posts, 5 GB storage
  - 10 themes
  - Email forwarding included
  - Priority support

- [ ] **More Themes** — Foliage expansion
  - Minimal, Night Garden, Zine
  - Moodboard, Typewriter, Solarpunk
  - See `@autumnsgrove/foliage`

### Technical Implementation

- [ ] Integrate Cloudflare Email Routing API
- [ ] Build storage metrics aggregation
- [ ] Implement Trails database schema
- [ ] Connect Foliage theme package to engine
- [ ] Run Foliage migrations

---

## Phase 4: Full Bloom

*"Petals everywhere"*

The grove becomes a community. Roots intertwine.

### Planned Features

- [ ] **Meadow** — The social layer
  - Optional community feed
  - Follow favorite blogs
  - No algorithms, just chronological
  - Connection without competition
  - See `docs/specs/social-spec.md`

- [ ] **Comments** — Dual-mode system
  - Reply = private message to author
  - Comment = public, requires approval
  - Rate limits: Free 20/week, Paid unlimited
  - See `docs/specs/comments-spec.md`

- [ ] **Private Reactions** — Encouragement only author sees
  - Emoji reactions
  - No public counts
  - No engagement metrics

- [ ] **Rings** — Private analytics
  - Your growth, reflected
  - Privacy-first design
  - Daily visitor counts, not identities
  - See `docs/specs/analytics-spec.md`

- [ ] **Oak & Evergreen Tiers** — Full control
  - Custom domains (BYOD)
  - Theme customizer
  - Custom fonts (Evergreen)
  - Domain search & registration (Evergreen)

- [ ] **Content Moderation** — Keeping the grove safe
  - AI-assisted review with human escalation
  - Zero data retention on external APIs
  - See `docs/Specs/CONTENT-MODERATION.md`

### Technical Implementation

- [ ] Create meadow.grove.place SvelteKit app
- [ ] Implement Meadow feed aggregation
- [ ] Build comment database schema
- [ ] Integrate content moderation service
- [ ] Set up Cloudflare for SaaS (custom domains)
- [ ] Implement Rings analytics with DOs

---

## Phase 5: Golden Hour

*"Warm light through the canopy"*

The grove settles into itself. A time for refinement.

### Planned Features

- [ ] **Polish** — Attention to every detail
  - Accessibility audit (WCAG AA)
  - Performance optimization
  - Mobile experience refinement
  - Edge case handling

- [ ] **Import Tools** — Bring your words home
  - WordPress import
  - Medium import
  - Substack import
  - Ghost import
  - Generic RSS/Atom

- [ ] **Newsletter Integration** — Email your readers
  - Resend-powered delivery
  - Subscriber management
  - Opt-in/opt-out handling

- [ ] **Theme Marketplace** — Community creations
  - Submit and review process
  - Preview before installing
  - Revenue sharing for creators

### Technical Implementation

- [ ] Lighthouse CI integration
- [ ] Automated accessibility testing
- [ ] Import tool parsers for each platform
- [ ] Newsletter subscription database
- [ ] Theme marketplace moderation queue

---

## Phase 6: Midnight Bloom

*"The far horizon — A dream taking shape"*

Where digital roots meet physical ground. The vision that pulls everything forward.

### The Dream

> "A soft glow spilling onto quiet sidewalks after the world has gone still. The kind of third place that becomes a first home. A bloom that opens only in darkness, for those who need it most."

- [ ] **The Cafe** — A late-night tea shop
  - Physical space for the sleepless and searching
  - Queer-friendly, trans-friendly
  - QR codes linking blogs to tables
  - Community board for local events

- [ ] **Community Boards** — Physical meets digital
  - Print local Grove blogs as zines
  - QR codes linking to online versions
  - Monthly featured writers

- [ ] **A Third Place** — That becomes a first home
  - Workshop events
  - Writing groups
  - Digital literacy classes

### What This Means Technically

- Integration between physical and digital presence
- Print-friendly blog export formats
- QR code generation for posts
- Event management system
- Community moderation at scale

---

## Infrastructure & Architecture

### Durable Objects Implementation

> See `docs/grove-durable-objects-architecture.md` for full specification.

**DO Phase 1: Auth (Heartwood)** — Highest Priority
- SessionDO for cross-subdomain auth
- Expected: Login 15s -> 2-3s, validation sub-millisecond

**DO Phase 2: Tenant Coordination**
- TenantDO for config caching
- Per-tenant rate limiting
- Analytics buffering

**DO Phase 3: Content Coordination**
- PostDO for real-time reactions
- Comment WebSocket for live updates
- Presence indicators

**DO Phase 4: Meadow Social**
- FeedDO for personalized feeds
- NotificationDO for aggregation
- Push notifications via WebSocket

**DO Phase 5: Analytics (Rings)**
- AnalyticsDO per tenant per day
- 87% reduction in D1 writes
- Real-time dashboard via WebSocket

### Hybrid Routing Strategy

| User Type | Domain | Routing | Cost |
|-----------|--------|---------|------|
| Seedling/Sapling | `*.grove.place` | Worker wildcards | Free |
| Oak (BYOD) | `custom.com` | Cloudflare for SaaS | $0.10/hostname |
| Evergreen | `custom.com` | Cloudflare for SaaS | $0.10/hostname |

---

## Success Metrics

### Launch Targets

- [ ] 10 clients by Month 3
- [ ] 20 clients by Month 6
- [ ] $500 MRR by Month 12

### Quality Targets

- [ ] Zero data loss incidents
- [ ] Page load time < 2 seconds
- [ ] < 10 hours support per client/month
- [ ] < 5% monthly churn rate
- [ ] Net Promoter Score > 50

---

## Research & Investigation

### Technical Research

- [ ] Username/password auth (optional alternative to magic codes)
- [ ] Comment system performance at scale
- [ ] Cloudflare D1 limits and scaling thresholds
- [ ] GDPR compliance requirements

### Market Research

- [ ] Competitive analysis (Ghost, Substack, WordPress.com)
- [ ] Pricing sensitivity testing
- [ ] Target audience interviews (5-10 potential users)
- [ ] Support burden estimation (track actual time)

---

## Decision Log

| Date | Decision |
|------|----------|
| 2025-11-21 | Split into 3 projects (Engine, Website, Social) |
| 2025-11-21 | Raised pricing significantly ($8-35/month vs $5-10) |
| 2025-11-21 | Changed post limits to soft archival (no deletion) |
| 2025-12-24 | Sent first launch emails to 59 waitlist subscribers |
| 2025-12-29 | Redesigned plant.grove.place signup page |

---

## Open Questions

- What will actual support time be for first 3 clients?
- Will non-technical users be able to use admin panel?
- How many clients can one person support before hiring help?
- Will social features drive retention or just add complexity?

---

*Last Updated: December 2025*
*Next Review: After first 5 clients are onboarded*
