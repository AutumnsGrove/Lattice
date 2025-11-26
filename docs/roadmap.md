# Grove Platform - Development Roadmap & TODOs

This file tracks all development tasks, from current MVP work to future features. Items are organized by phase.

---

## Phase 1: MVP - GroveEngine Core (Current)

**Goal:** Extract and refine core blog engine from autumnsgrove.com

### Immediate Tasks (This Week)
- [ ] Create `grove-engine` GitHub repository
- [ ] Extract blog functionality from autumnsgrove.com codebase
- [ ] Set up project structure with proper TypeScript config
- [ ] Configure build pipeline (Vite + SvelteKit)
- [ ] Set up D1 database for local development
- [ ] Set up R2 bucket for media storage

### npm Package Setup
- [ ] Set up npm org `@groveengine` at npmjs.com/org/create
- [ ] Configure `svelte-package` for library builds
- [ ] Set up package.json exports map
- [ ] Configure peer dependencies (Svelte 5, SvelteKit 2)
- [ ] Create initial package version (0.1.0)
- [ ] Set up npm publish workflow in GitHub Actions

### Authentication System
- [ ] Implement magic code auth with Resend
- [ ] Create magic code generation (6-digit, SHA-256 hashed)
- [ ] Set up KV storage for codes (10-min TTL)
- [ ] Build session management (KV-based, 7-day TTL)
- [ ] Create login/logout UI components
- [ ] Set up secure cookie handling

### Database & Migrations
- [ ] Set up D1 migrations system
- [ ] Create initial schema migration (users, posts, sessions, site_config)
- [ ] Add supporting tables (tags, post_tags, media)
- [ ] Document migration workflow for customers

### Update Infrastructure
- [ ] Set up Renovate on GroveEngine repo
- [ ] Create customer repo template
- [ ] Configure Renovate for customer repos (auto-merge engine updates)
- [ ] Document update propagation flow

### Core Engine Development (Weeks 1-2)
- [ ] Implement post CRUD operations (create, read, update, delete)
- [ ] Build markdown editor with live preview
- [ ] Create post list view with pagination
- [ ] Implement post status system (draft, published, archived)
- [ ] Build media upload functionality
- [ ] Create media library browser
- [ ] Implement image optimization pipeline
- [ ] Build RSS feed generator
- [ ] Create theme system foundation
- [ ] Extract current autumnsgrove.com theme as "default"
- [ ] Build theme switcher in admin panel
- [ ] Implement table of contents generation
- [ ] Add gutter links support
- [ ] Create tag system (add, edit, filter by tags)

### Post Limit System (Week 3)
- [ ] Implement post counting per blog
- [ ] Build warning system (80%, 90%, 100% alerts)
- [ ] Create archival system (move old posts to 'archived' status)
- [ ] Build archive browser in admin panel
- [ ] Add upgrade prompts when near limit
- [ ] Test limit enforcement thoroughly

### Testing & Stabilization (Week 4)
- [ ] Test with Mom's publishing house content
- [ ] Fix all bugs and edge cases
- [ ] Performance optimization
- [ ] Mobile responsiveness check
- [ ] Cross-browser testing
- [ ] Accessibility audit
- [ ] Security review (XSS, CSRF, etc.)

### Documentation (Ongoing)
- [ ] Write engine installation guide
- [ ] Create theme development documentation
- [ ] Document API endpoints
- [ ] Write admin panel user guide
- [ ] Create troubleshooting FAQ

**Success Criteria:**
- [ ] One blog (Mom's publishing house) running smoothly
- [ ] Zero data loss incidents
- [ ] Page load time < 2 seconds
- [ ] Admin panel usable by non-technical user
- [ ] All core features working (posts, media, RSS, themes)

---

## Phase 2: Multi-Tenant Infrastructure

**Goal:** Support multiple subdomain blogs from single engine

### Subdomain Routing (Weeks 5-6)
- [ ] Implement subdomain detection from request hostname
- [ ] Create per-subdomain configuration system
- [ ] Build namespace isolation (per-tenant D1 databases)
- [ ] Implement configuration loading per subdomain
- [ ] Create subdomain provisioning script
- [ ] Set up wildcard DNS configuration
- [ ] Test with multiple subdomains locally

### Tenant Management (Weeks 7-8)
- [ ] Build tenant configuration schema
- [ ] Implement post limit tracking per tenant
- [ ] Create tenant onboarding workflow
- [ ] Build tenant data export/import tools
- [ ] Implement tenant deletion/cleanup
- [ ] Add tenant usage analytics

### Beta Testing (Week 9)
- [ ] Deploy 3-5 subdomain blogs for friends/family
- [ ] Track support time per client meticulously
- [ ] Gather feedback on admin panel UX
- [ ] Identify common issues and pain points
- [ ] Refine onboarding process
- [ ] Adjust pricing based on actual time spent

**Success Criteria:**
- [ ] 3-5 subdomain blogs live and stable
- [ ] Complete data isolation between tenants
- [ ] Support time tracked and documented
- [ ] Onboarding process takes < 1 hour
- [ ] No cross-tenant data leakage

---

## Phase 3: Grove Website & Onboarding

**Goal:** Build main website with automated signup and provisioning

### Website Development (Weeks 10-12)
- [ ] Create `grove-website` repository
- [ ] Design marketing pages (homepage, pricing, features)
- [ ] Build client signup flow with Stripe integration
- [ ] Create subdomain selection & availability check
- [ ] Implement automated provisioning system
- [ ] Build client dashboard (manage blogs, view usage)
- [ ] Create support ticket system
- [ ] Add documentation/help center

### Billing & Subscriptions (Weeks 13-14)
- [ ] Integrate Stripe for subscription management
- [ ] Implement tier-based feature gating
- [ ] Build upgrade/downgrade flows
- [ ] Create invoice generation system
- [ ] Add payment failure handling
- [ ] Implement dunning management

### Launch Preparation (Week 15)
- [ ] Beta test website with existing clients
- [ ] Set up monitoring and alerting
- [ ] Create marketing materials
- [ ] Write launch announcement
- [ ] Prepare support documentation

**Success Criteria:**
- [ ] Website live at grove.place
- [ ] Automated signup & provisioning works
- [ ] Billing system functional
- [ ] Client dashboard usable
- [ ] Support ticket system ready

---

## Phase 4: Grove Social (Community Feed)

**Goal:** Build social features for community discovery

### User Accounts (Weeks 16-17)
- [ ] Create `grove-social` repository
- [ ] Implement user registration & authentication
- [ ] Build user profile system
- [ ] Create session management
- [ ] Add password reset flow
- [ ] Implement email verification

### Feed System (Weeks 18-20)
- [ ] Build feed aggregation system
- [ ] Implement opt-in mechanism for posts
- [ ] Create feed API endpoints
- [ ] Build feed UI (grove.place/feed)
- [ ] Add pagination & infinite scroll
- [ ] Implement caching for performance

### Voting & Reactions (Weeks 21-23)
- [ ] Build voting system (upvote/downvote)
- [ ] Implement vote tracking per user
- [ ] Create emoji reaction system
- [ ] Add Emoji Kitchen integration
- [ ] Build reaction UI with size scaling
- [ ] Implement vote/reaction aggregation

### Feed Algorithms (Weeks 24-25)
- [ ] Implement chronological sorting
- [ ] Build "popular" algorithm (by net score)
- [ ] Create "hot" algorithm (time-decay)
- [ ] Add "top" filter (by time period)
- [ ] Implement personalization (future)

**Success Criteria:**
- [ ] Feed live at grove.place/feed
- [ ] Users can vote and react
- [ ] Performance acceptable with 10+ blogs
- [ ] No spam or abuse issues
- [ ] 50+ posts on feed

---

## Phase 5: Polish & Scale

**Goal:** Refine based on usage, add premium features

### Comments Integration (Weeks 26-27)
- [ ] Research and select comment system
- [ ] Integrate Hyvor Talk or custom solution
- [ ] Add comment moderation tools
- [ ] Implement email notifications
- [ ] Build comment analytics

### Advanced Features (Weeks 28-30)
- [ ] Add analytics dashboard per blog
- [ ] Implement SEO tools (meta tags, sitemaps)
- [ ] Build newsletter integration
- [ ] Add content scheduling
- [ ] Create import tools (WordPress, Medium, etc.)

### Theme Expansion (Weeks 31-32)
- [ ] Design 2-3 additional themes
- [ ] Build theme customizer UI
- [ ] Add custom CSS override option
- [ ] Create theme marketplace (future)

### Scale to 20 Clients (Weeks 33-36)
- [ ] Onboard 10-15 new paying clients
- [ ] Refine support processes
- [ ] Optimize performance
- [ ] Improve documentation
- [ ] Build referral program

**Success Criteria:**
- [ ] 20 paying clients
- [ ] $500/month MRR
- [ ] < 5% churn rate
- [ ] Net Promoter Score > 50
- [ ] < 10 hours support per client/month

---

## Future Enhancements (Post-MVP)

These features are planned for after the core engine is stable and deployed to initial customers.

### Authentication Enhancements
- [ ] **Username/Password Auth** - Optional alternative to magic codes
  - Allow users to set password in addition to magic code login
  - Secure password hashing with Argon2 or bcrypt
  - "Remember me" functionality
  - Password reset via email

### Extensibility
- [ ] **Theme Marketplace** - Community-contributed themes
  - Theme submission and review process
  - Preview themes before installing
  - Theme versioning and updates
  - Premium themes (revenue share model)

- [ ] **Plugin System** - Extend functionality without forking
  - Hook system for customization points
  - Plugin manifest format
  - Sandboxed plugin execution
  - Plugin marketplace

### Community Features
- [ ] **Grove Social** - Multi-tenant community features
  - Central feed aggregating opt-in posts (grove.place/feed)
  - Voting and reactions on community posts
  - User profiles across the Grove network
  - Follow system for favorite blogs
  - See `docs/specs/social-spec.md` for details

---

## Phase 6+ (Future Features)

### Enhanced Social
- [ ] User profiles & avatars
- [ ] Follow system for favorite blogs
- [ ] Direct messaging between users
- [ ] Community events & challenges
- [ ] Collaborative posts (multiple authors)

### Business Features
- [ ] Team collaboration (multiple users per blog)
- [ ] White-label option for agencies
- [ ] Advanced analytics & reporting
- [ ] API access for third-party integrations
- [ ] Content scheduling & automation

### Platform Expansion
- [ ] Mobile PWA for offline reading
- [ ] Newsletter platform integration
- [ ] E-commerce features (simple products)
- [ ] Membership/paywall system
- [ ] Podcast hosting support

### Infrastructure
- [ ] Advanced CDN optimization
- [ ] Database sharding for scale
- [ ] External database option (Neon/Turso)
- [ ] Automated backup system
- [ ] Uptime monitoring & status page

---

## Nice-to-Have (Maybe Never)

### Experimental
- [ ] Federated comments (ActivityPub)
- [ ] Web monetization (Coil)
- [ ] Blockchain publishing (Arweave/IPFS)
- [ ] AI writing assistant integration
- [ ] Voice posts with transcription

### Community
- [ ] Virtual meetups & workshops
- [ ] Writing challenges & prompts
- [ ] Guest posting system
- [ ] Cross-blog collaborations
- [ ] Community-curated collections

---

## Research & Investigation

### Technical Research Needed
- [ ] Username/password auth (optional alternative to magic codes)
- [ ] Comment system evaluation (Hyvor vs Remark42 vs custom)
- [ ] Cloudflare limits & scaling thresholds
- [ ] GDPR compliance requirements
- [ ] Payment processing options (Stripe vs alternatives)
- [ ] Email service providers (SendGrid, Resend, etc.)

### Market Research Needed
- [ ] Competitive analysis update (Ghost, Substack, WordPress.com)
- [ ] Pricing sensitivity testing
- [ ] Target audience interviews (5-10 potential users)
- [ ] Support burden estimation (track actual time)
- [ ] Feature prioritization survey

---

## Documentation Tasks

### Technical Docs
- [ ] API reference documentation
- [ ] Theme development guide
- [ ] Database schema documentation
- [ ] Deployment instructions
- [ ] Troubleshooting guide
- [ ] Security best practices

### Client-Facing Docs
- [ ] Admin panel user guide
- [ ] Markdown cheat sheet
- [ ] Image optimization guide
- [ ] SEO best practices
- [ ] Using Claude Code for customizations
- [ ] FAQ & common issues

### Business Docs
- [ ] Terms of Service
- [ ] Privacy Policy
- [ ] Acceptable Use Policy
- [ ] Support SLA
- [ ] Refund policy

---

## Completed Tasks

*Keep this section updated as tasks are completed*

- [x] Initial project ideation & concept development
- [x] Created project documentation structure
- [x] Researched Cloudflare infrastructure options
- [x] Designed pricing structure (v1)
- [x] Created client onboarding flow
- [x] Split project into 3 separate repositories
- [x] Updated pricing to reflect actual value
- [x] Revised post limit approach (soft limits)
- [x] Created comprehensive TODO roadmap

---

## Notes & Decisions

**Key Principles:**
- Start small, prove concept, then scale
- Track time meticulously to inform pricing
- Build only what clients actually need
- Maintain work-life balance (set boundaries)
- Transparency with clients about capabilities

**Decision Log:**
- 2025-11-21: Split into 3 projects (Engine, Website, Social)
- 2025-11-21: Raised pricing significantly ($12-25/month vs $5-10)
- 2025-11-21: Changed post limits to soft archival (no deletion)
- 2025-11-21: Increased support hours in Month 1 (10-20 hours)
- 2025-11-21: Set hourly support rate to $75/hour (was $25)

**Open Questions:**
- What will actual support time be for first 3 clients?
- Will non-technical users be able to use admin panel?
- How many clients can one person support before hiring help?
- Will social features drive retention or just add complexity?

---

*Last Updated: November 2025*
*Next Review: After first 3 clients are onboarded*

---

## Phase 2+ Features (Post-MVP)

### Social Features
- [ ] **Grove Feed** (grove.com/feed) - Aggregated posts from opt-in users
- [ ] **Voting System** - Hacker News style upvote/downvote, no public scores
- [ ] **Emoji Reactions** - Emoji Kitchen hybrids (~100 custom) + 5 generic emojis
- [ ] **Emoji Size Scaling** - Popular emojis grow, unpopular shrink (visual effect)
- [ ] **Feed Sorting** - Chronological, Popular (by internal score), Hot (time-decay)
- [ ] **Feed Opt-In Toggle** - Admin panel setting to share posts publicly
- [ ] **Post Stats Dashboard** - Show votes, reactions for feed-enabled posts

### Comment System
- [ ] **Comment Integration** - Research and implement comment system
  - Options: Hyvor Talk ($5.50/mo), self-hosted Remark42, or custom Cloudflare solution
  - Nested replies (2-3 levels deep)
  - Moderation tools for post authors
  - Email notifications for new comments/replies
  - Spam protection (Cloudflare Turnstile + first-comment moderation)

### Enhanced Theming
- [ ] **Emoji Kitchen Curation** - Select ~100 custom hybrid emojis for reaction library
- [ ] **Additional Themes** - Create 4-9 more blog themes beyond the default
  - Portfolio theme (for photographers/artists)
  - Minimal theme (clean, typography-focused)
  - Magazine theme (grid layout, featured posts)
  - Personal brand theme (customizable colors/fonts)
- [ ] **Theme Customizer** - UI for clients to tweak colors, fonts, layouts

### Advanced Features
- [ ] **Analytics Dashboard** - Basic traffic stats per blog
- [ ] **SEO Tools** - Meta tags, sitemaps, social sharing optimization
- [ ] **Newsletter Integration** - Email subscription for blog updates
- [ ] **Advanced Media Management** - Image galleries, video embedding
- [ ] **Mobile App** - PWA for offline reading/posting
- [ ] **API Access** - REST API for third-party integrations

### Business Features
- [ ] **Referral Program** - Clients get free month for successful referrals
- [ ] **Affiliate Partnerships** - Revenue sharing for recommended services
- [ ] **White-Label Option** - Agency plan for managing multiple client sites
- [ ] **Team Collaboration** - Multiple users per blog with role-based permissions
- [ ] **Content Scheduling** - Schedule posts for future publication
- [ ] **Import Tools** - Import from WordPress, Medium, Substack, Ghost

### Infrastructure
- [ ] **CDN Optimization** - Advanced caching strategies for high-traffic blogs
- [ ] **Database Sharding** - If D1 limits become constraint at scale
- [ ] **External Database Option** - Neon/Turso for enterprise clients
- [ ] **Advanced Backup** - Automated daily backups with 30-day retention
- [ ] **Uptime Monitoring** - Status page and alerting for client sites

---

## Nice-to-Have Ideas (Maybe Never)

### Experimental Features
- [ ] **Federated Comments** - ActivityPub integration for decentralized social
- [ ] **Web Monetization** - Coil integration for micropayments
- [ ] **Blockchain Publishing** - Permanent archives via Arweave/IPFS
- [ ] **AI Writing Assistant** - Integrated help for drafting posts
- [ ] **Voice Posts** - Audio blog posts with transcription

### Community Features
- [ ] **User Profiles** - Public profiles for feed participants
- [ ] **Follow System** - Follow favorite blogs in the Grove network
- [ ] **Direct Messaging** - Private messages between users
- [ ] **Community Events** - Virtual meetups, writing challenges
- [ ] **Collaborative Posts** - Multiple authors on single post

---

## Research Needed

### Technical Research
- [ ] **Username/Password Auth** - Add as optional alternative to magic codes
- [ ] **Comment System Evaluation** - Full comparison of hosted vs self-hosted options
- [ ] **Cloudflare Limits** - Subdomain, storage, bandwidth thresholds
- [ ] **GDPR Compliance** - Data export, deletion, privacy policy requirements
- [ ] **Payment Processing** - Stripe integration for subscriptions

### Market Research
- [ ] **Competitive Analysis** - Feature comparison with Ghost, Substack, WordPress.com
- [ ] **Pricing Sensitivity** - What will early adopters actually pay?
- [ ] **Target Audience Interviews** - Talk to 5-10 potential beta users
- [ ] **Support Burden Estimation** - Track actual time spent on first 3 clients

---

## Implementation Priority

### High Priority (Next 3 Months)
1. Fix auth on autumnsgrove.com
2. Build GroveEngine (core blog engine)
3. Create first subdomain blog (Mom's publishing house)
4. Test post limit enforcement with soft limits
5. Document client onboarding process

### Medium Priority (3-6 Months)
1. Build main website (grove.place) with signup flow
2. Implement subdomain provisioning system
3. Add 3-5 beta clients (friends/family)
4. Create basic analytics for client blogs
5. Design second blog theme

### Low Priority (6+ Months)
1. Grove feed (social features)
2. Comment system integration
3. Advanced theming system
4. Mobile PWA
5. API development

---

## Notes

- **Don't implement features just because they're cool** - Wait for client demand
- **Track feature requests** - Maintain list of what clients actually ask for
- **Consider building in public** - Share development journey on your own blog
- **Stay focused on core value** - Simple, cheap, community-owned blogging
- **Avoid feature creep** - Every new feature = more support burden

---

*Last Updated: November 2025*
