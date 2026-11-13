---
title: "Grove Platform: Development Roadmap"
status: planned
category: general
lastUpdated: "2026-08-26"
---

# Grove Platform: Development Roadmap

> **Internal Technical Roadmap**
>
> This document tracks development through Grove's seasonal phases. Phase names are a sequence, not a calendar — nothing here is tied to a real-world date or deadline. Each phase has both a public-facing narrative and detailed technical implementation tasks.
>
> For the public roadmap, see: https://grove.place/roadmap

---

## Current Phase: Thaw

**Status:** Active Development

---

## Always Happening (Not a Phase)

Some work never "completes" — it's ongoing at every stage, revisited as the grove grows rather than checked off once.

- [ ] **Accessibility:** WCAG AA audits, keyboard navigation, screen reader support
- [ ] **Performance:** Fast everywhere, always
- [ ] **Mobile Experience:** Beautiful on every screen
- [ ] **Edge Cases:** The small things that matter

---

## Phase 1: First Frost (Complete)

_"The quiet before dawn"_

The groundwork laid in stillness. Foundations built when no one was watching.

### Completed

- [x] **Core Engine (Lattice):** Blog engine extracted from autumnsgrove.com
  - SvelteKit 2.0 + Svelte 5 runes
  - Cloudflare Workers, D1, KV, R2
  - Markdown editor with live preview
  - Post CRUD, media uploads, RSS feeds
  - Table of contents, gutter links (vines)

- [x] **Authentication (Heartwood):** Secure OAuth 2.0 + PKCE
  - Google OAuth provider
  - Magic code email auth via Resend
  - Session management in D1
  - Cross-subdomain cookies

- [x] **Landing Site:** grove.place welcomes visitors
  - Seasonal theme system
  - Randomized forest generation
  - Email waitlist
  - Vision, pricing, roadmap pages

- [x] **Infrastructure:** Cloudflare
  - D1 databases, KV namespaces, R2 buckets
  - Stripe products/prices via Dashboard
  - GitHub Actions CI/CD
  - Wrangler deployments

- [x] **Internal Tools:** Development infrastructure
  - Bloom (GroveBloom): Remote coding environments on-demand
  - Mycelium (GroveMCP): MCP server for AI agent integration
  - Vista (GroveMonitor): Infrastructure observability dashboard
  - See `docs/specs/bloom-spec.md`, `docs/specs/mycelium-spec.md`, `docs/specs/vista-spec.md`, and `docs/grove-mcp-guide.md`

- [x] **Petal:** Image content moderation
  - Privacy-first four-layer protection
  - CSAM detection (Layer 1)
  - Content classification (Layer 2)
  - Sanity check (Layer 3)
  - Output verification (Layer 4)
  - Zero data retention for all user images
  - See `docs/specs/petal-spec.md`

---

## Phase 2: Thaw (Current)

_"The ice begins to crack"_

Grove opens its doors. The first trees take root.

### Completed

- [x] **Sign Up Flow:** plant.grove.place
  - Google, email auth options
  - Profile creation with username
  - Plan selection (Seedling/Sapling/Oak/Evergreen)
  - Stripe checkout integration
  - Interactive onboarding tour

- [x] **Seedling Tier:** $8/month base offering
  - 50 posts, 1 GB storage
  - 3 themes to start
  - username.grove.place subdomain
  - Full Meadow access

- [x] **Markdown Writing:** Clean, focused editor
  - Live preview
  - Drag-and-drop images
  - Vine annotations (margin notes)

- [x] **Image Hosting:** R2-backed media
  - Automatic optimization
  - CDN delivery via cdn.grove.place
  - Alt text support

- [x] **RSS Feed:** Built-in, because it should be
  - Standard RSS 2.0 format
  - Full post content in feed

- [x] **Shade Protection:** AI crawlers blocked
  - Cloudflare Bot Fight Mode
  - robots.txt with comprehensive AI bot list
  - X-Robots-Tag: noai, noimageai
  - Turnstile human verification

- [x] **Data Export:** Your words, always portable
  - Markdown + images as zip
  - Full metadata preservation

- [x] **Help Center:** Built into admin panel
  - Contextual help buttons
  - SQLite FTS5 search
  - 10 knowledge categories

- [x] **Reeds:** Comments — replies and thoughtful discussions
  - Full service layer, DB migrations, admin panels (inbox, moderated, blocked, settings)
  - See `docs/specs/reeds-spec.md`

- [x] **Thorn:** Content moderation — keeping the grove safe
  - Behavioral + AI layers, moderation log, entity labels
  - See `docs/specs/thorn-spec.md`, `docs/specs/thorn-behavioral-spec.md`

- [x] **Porch:** Support conversations — come sit and talk
  - Completed alongside the rest of Thaw
  - See `docs/specs/porch-spec.md`

- [x] **Curios — Phase 1 (Foundation):** Guestbook, Gallery, Timeline, Polls
  - The first four curios live in production
  - See `docs/specs/curios-spec.md`, `docs/plans/features/active/curio-enhancement-roadmap.md`

### Remaining for Thaw

- [ ] **Launch Signups:** Open plant.grove.place to public
  - Welcome email sequence (day 1, 3, 7, 30)
  - Support ticket system ready

- [ ] **First 3-5 Tenants:** Friends & family beta
  - Track actual support time
  - Gather UX feedback
  - Validate pricing model

### Technical Tasks

- [ ] **🛡️ Patina:** Automated nightly backups
  - Nightly SQL dumps of all D1 databases to R2
  - Weekly meta-backups (compress 7 days into archive)
  - 12-week retention for disaster recovery
  - See `docs/specs/patina-spec.md`

- [ ] **🛡️ Security Remediation:** Fix P0/P1 issues before launch
  - XSS sanitization, tenant isolation, PII removal

---

## Phase 3: First Buds

_"Green emerging through snow"_

New growth appears. The grove finds its voice.

### Planned Features

- [ ] **Sapling Tier:** $12/month growth tier
  - 250 posts, 5 GB storage
  - 10 themes
  - Priority support

- [ ] **Foliage:** Theme library — more color for your corner
  - Minimal, Night Garden, Zine
  - Moodboard, Typewriter, Solarpunk
  - See `docs/specs/foliage-project-spec.md`

- [ ] **Fireside Mode:** Conversational drafting
  - Have a conversation, get your words organized into a draft
  - The fire doesn't tell the story — it just creates the space where stories emerge
  - Stands alone (decoupled from the cut Wisp editor tooling)
  - See `docs/specs/ai-writing-assistant-spec.md` for the conversational-drafting portion

- [ ] **Scribe:** Voice transcription
  - Lands alongside Fireside — both lean on AI underneath
  - See `docs/specs/scribe-voice-transcription-spec.md`

- [ ] **Curios — Phase 2:** Mood Ring, Badges, Shelves, Cursors, Hit Counter
  - See `docs/plans/features/active/curio-enhancement-roadmap.md`

### Technical Implementation

- [ ] Connect Foliage theme package to engine, run Foliage migrations
- [ ] Fireside chat endpoint + session state management
- [ ] Scribe transcription pipeline (currently an early attempt, not near complete)

---

## Phase 4: Full Bloom

_"Petals everywhere"_

The grove becomes a community. Roots intertwine.

### Planned Features

- [ ] **Forests:** Community groves — find your people
  - Essentially subreddits for Grove — shared spaces around topics/interests
  - Needs substantial infrastructure changes before this can be reliably promised
  - Pushed here rather than First Buds because the underlying platform work isn't ready

- [ ] **Amber:** Storage dashboard — see and manage your files
  - See usage across posts and media, visual breakdown by file type
  - Pushed further out; not an immediate priority

- [ ] **Rings:** Private analytics — your growth, reflected
  - Lands ahead of the AI feature cluster (Fireside/Scribe)
  - Privacy-first design, daily visitor counts, not identities
  - See `docs/specs/rings-spec.md`

- [ ] **Oak & Evergreen Tiers:** Full control
  - Custom domains (BYOD)
  - Theme customizer
  - Custom fonts (Evergreen)
  - Domain search & registration (Evergreen)
  - **Note:** tier structure itself is under re-evaluation now that the feature set has changed substantially — Oak and Evergreen may not survive in their current form. Track that discussion separately from this roadmap pass.

- [ ] **Foliage:** Theme customizer — make it truly yours
  - See `docs/specs/foliage-project-spec.md`

- [ ] **Community Themes:** Share what you create

- [ ] **Curios — Phase 3:** Webring, Status Badge, Activity Status, Now Playing, Blogroll
  - See `docs/plans/features/active/curio-enhancement-roadmap.md`

### Technical Implementation

- [ ] Build storage metrics aggregation (Amber)
- [ ] Set up Cloudflare for SaaS (custom domains)
- [ ] Implement Rings analytics with Durable Objects
- [ ] Forests: schema design, moderation model, discovery UX (early — infra work, not feature work, comes first)

---

## Phase 5: Golden Hour

_"Warm light through the canopy"_

The grove settles into itself. A time for refinement — the AI-assisted layer and remaining polish-adjacent features that aren't part of the "always happening" bucket.

### Planned Features

- [ ] **Import Tools:** Bring your words home
  - WordPress import
  - Medium import
  - Substack import
  - Ghost import
  - Generic RSS/Atom

- [ ] **Newsletter Integration:** Email your readers
  - Resend-powered delivery
  - Subscriber management
  - Opt-in/opt-out handling

- [ ] **Theme Marketplace:** Community creations
  - Submit and review process
  - Preview before installing
  - Revenue sharing for creators

- [ ] **Curios — Phase 4:** Ambient, Clip Art, Custom Uploads
  - See `docs/plans/features/active/curio-enhancement-roadmap.md`

### Technical Implementation

- [ ] Import tool parsers for each platform
- [ ] Newsletter subscription database
- [ ] Theme marketplace moderation queue

---

## Phase 6: Deep Roots

_"What the grove becomes once it's had time to grow"_

These features need the platform itself to mature first — more infrastructure, more trust, more time — before they can be built and promised responsibly. Not cut. Not soon. Real, and worth the wait.

### Planned Features

- [ ] **Wander:** Immersive discovery — walk through the forest
  - Much further out than the rest of the roadmap
  - See `docs/specs/wander-spec.md`

- [ ] **Meadow:** Social feed — connection without competition
  - Chronological feed, private reactions, no algorithms
  - A comeback, not a cut — just further out than previously planned
  - See `docs/specs/meadow-spec.md`

- [ ] **Chirp:** 1:1 direct messaging
  - Lands together with Meadow's return, as part of the same social push
  - See `docs/specs/chirp-spec.md`

- [ ] **Centennial:** The 100-year promise
  - 100-year domain preservation and read-only archival after 12 cumulative months on Sapling+
  - Grove isn't ready to make this promise yet — needs The Reserve, succession planning, and financial infrastructure to actually be keepable
  - See prior draft: `_junkdrawer/features/centennial/centennial-status.md`

- [ ] **Curios — Phase 5:** Shrines, Artifacts
  - The most ambitious curios — Shrines needs a spatial canvas editor, Artifacts needs 21 individual mini-components
  - See `docs/plans/features/active/curio-enhancement-roadmap.md`

---

## Phase 7: Midnight Bloom

_"The far horizon: a dream taking shape"_

Where digital roots meet physical ground. The vision that pulls everything forward — but this phase is **only** about the physical tea shop. No grove.place features live here anymore; Wander, Meadow, and Chirp moved to Deep Roots because they're still part of the platform, just further out. Midnight Bloom is the dream beyond the platform entirely.

### The Dream

> "A soft glow spilling onto quiet sidewalks after the world has gone still. The kind of third place that becomes a first home. A bloom that opens only in darkness, for those who need it most."

- [ ] **The Cafe:** A late-night tea shop
  - Physical space for the sleepless and searching
  - Queer-friendly, trans-friendly
  - QR codes linking blogs to tables
  - Community board for local events

- [ ] **Community Boards:** Physical meets digital
  - Print local Grove blogs as zines
  - QR codes linking to online versions
  - Monthly featured writers

- [ ] **Local Zines:** Grove blogs printed and shared

- [ ] **A Third Place:** That becomes a first home
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

## Cut

These were on the roadmap and are no longer happening. Listed here so the decision doesn't get re-litigated by accident — not out of embarrassment, just so we remember we already thought about it.

- **Wisp** (base grammar/tone/readability editor tool) — the underlying idea (conversational drafting) survives as **Fireside Mode**, which now stands alone rather than as a sub-phase of Wisp. The grammar-checking/editing-assistant layer itself is cut.
- **Ivy** (email at @grove.place, forwarding + custom addresses) — frivolous scope creep, cut entirely.
- **Trails** (personal roadmaps)
- **Terrarium** (creative canvas / visual scene composer)
- **Weave** (visual composition, animations and diagrams)
- **Outpost** (community Minecraft server)

---

## Infrastructure & Architecture

### Durable Objects Implementation

> See `docs/grove-durable-objects-architecture.md` for full specification.

**DO Phase 1: Auth (Heartwood)** - Highest Priority

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

| User Type        | Domain          | Routing             | Cost           |
| ----------------- | --------------- | -------------------- | --------------- |
| Seedling/Sapling | `*.grove.place` | Worker wildcards    | Free           |
| Oak (BYOD)       | `custom.com`    | Cloudflare for SaaS | $0.10/hostname |
| Evergreen        | `custom.com`    | Cloudflare for SaaS | $0.10/hostname |

> **Note:** Oak/Evergreen tier structure is under re-evaluation — see the "Note" under Full Bloom's tier section above.

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

| Date       | Decision                                            |
| ---------- | ---------------------------------------------------- |
| 2025-11-21 | Split into 3 projects (Engine, Website, Social)     |
| 2025-11-21 | Raised pricing significantly ($8-35/month vs $5-10) |
| 2025-11-21 | Changed post limits to soft archival (no deletion)  |
| 2025-12-24 | Sent first launch emails to waitlist subscribers    |
| 2025-12-29 | Redesigned plant.grove.place signup page            |
| 2026-08-26 | Full roadmap overhaul: cut Wisp/Ivy/Trails/Terrarium/Weave/Outpost, decoupled Fireside from Wisp, added Deep Roots phase, redefined Midnight Bloom as tea-shop-only, split polish into an ongoing cross-cutting section, phased Curios across 5 sub-phases, marked Reeds/Thorn/Porch/Petal as shipped |

---

## Open Questions

- What will actual support time be for first 3 clients?
- Will non-technical users be able to use admin panel?
- How many clients can one person support before hiring help?
- Will social features drive retention or just add complexity?
- Does the Oak/Evergreen tier structure survive the changed feature set? (separate follow-up conversation, not resolved in this pass)

---

_Last Updated: August 2026_
_Next Review: After tier re-evaluation session_
