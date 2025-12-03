# TODOs for Grove Platform

> **Note:** UI components and Design System have been split into [GroveUI](https://github.com/AutumnsGrove/GroveUI). This repo focuses on the core engine, example site, and hosting (grove.place).

## Setup Tasks
- [x] Initialize `grove-engine` GitHub repository → **DONE: GroveEngine monorepo created**
- [x] Set up SvelteKit project with TypeScript → **DONE: SvelteKit 2.5+ with Svelte 5**
- [x] Configure Cloudflare Workers and D1 database → **DONE: 7 migrations in place**
- [x] Implement magic link auth (6-digit email codes via Resend) → **DONE**
- [x] Configure Stripe for payments → **DONE: Stripe payments system with provider abstraction**
- [x] Set up Resend for email → **DONE: Used for magic code auth**
- [x] Check domain availability → **DONE: grove.place secured!**
- [x] Set up development environment with proper tooling → **DONE: pnpm workspaces, Vite, TypeScript**
- [x] Configure Tailwind CSS → **DONE: Tailwind CSS 3.4+ configured**
- [x] Split UI/Design System into separate repo → **DONE: [GroveUI](https://github.com/AutumnsGrove/GroveUI)**
- [ ] Set up pre-commit hooks (optional, see AgentUsage/pre_commit_hooks/)

## Phase 1: GroveEngine MVP (Weeks 1-4)
- [x] Extract blog functionality from autumnsgrove.com → **DONE: Complete migration in PR #14**
- [x] Implement core blog engine with post creation/editing → **DONE: Full CRUD with MarkdownEditor**
- [x] Add basic theming system (1 theme) → **DONE: Theme system foundation with switcher**
- [ ] Implement post limits (250 for Starter plan)
- [x] Set up R2 storage for media uploads → **DONE: CDN admin upload system (PR #17, #20)**
- [x] Build admin dashboard for Mom's publishing house → **DONE: Full admin panel with CDN uploader**
- [ ] Test with Mom's publishing house as first client
- [ ] Implement basic analytics

## Phase 2: Multi-tenant Infrastructure (Weeks 5-9)
- [ ] Implement subdomain routing system
- [x] Set up tenant isolation in D1 database → **DONE: Multi-tenant schema designed (migration 005)**
- [ ] Build tenant onboarding flow
- [ ] Implement plan management (Starter/Professional/Business)
- [ ] Add custom domain support for Business plan
- [ ] Build tenant admin panel
- [ ] Implement storage limits per plan

## Phase 3: Grove Website (Weeks 10-15)
- [x] Create marketing website → **DONE: Landing site deployed at grove.place**
- [ ] Build pricing page with plan comparison
- [x] Implement billing system with Stripe → **DONE: Stripe payments with provider abstraction (PR #19)**
- [ ] Add customer portal
- [x] Build landing page with features → **DONE: "How It Works" and footer links (PR #11)**
- [ ] Implement signup flow
- [ ] Add documentation/help center

## Phase 4: Grove Social (Weeks 16-25)
- [ ] Build community feed system
- [ ] Implement post sharing between blogs
- [ ] Add voting system (upvotes/downvotes)
- [ ] Implement emoji reactions
- [ ] Build social features UI
- [ ] Add privacy controls for shared posts
- [ ] Implement moderation tools

## Phase 5: Polish & Scale (Weeks 26-36)
- [ ] Performance optimization
- [ ] Add more themes (3 for Professional, 10 for Business)
- [ ] Implement advanced analytics (see docs/specs/analytics-spec.md)
- [ ] Build priority support system
- [ ] Implement comment system (Hyvor Talk for MVP, see docs/research/comment-system-strategy.md)
- [ ] Implement data export (markdown + pictures as zip)
- [ ] Implement backup/restore functionality
- [ ] Scale infrastructure as needed

## Future Considerations (Post-Launch)

### Shop Feature (E-commerce)
- [x] Design shop data model (products, variants, inventory) → **DONE: migration 007_shop_payments.sql**
- [ ] Create product management UI in admin panel
- [ ] Build product listing page with filtering/sorting
- [ ] Implement product detail pages
- [ ] Add shopping cart functionality (client-side state)
- [ ] Integrate Stripe for checkout
- [ ] Implement order management system
- [ ] Add order confirmation emails via Resend
- [ ] Build order history for customers
- [ ] Implement inventory tracking
- [ ] Add product categories and tags
- [ ] Support digital products/downloads
- [ ] Add product image gallery with R2 storage
- [ ] Implement product search
- [ ] Add related products recommendations
- [ ] Build shop analytics (views, conversions)

### Theme System Expansion
> *Note: UI components are managed in [GroveUI](https://github.com/AutumnsGrove/GroveUI)*
- [ ] Custom CSS override option for advanced users
- [ ] Theme marketplace (users buy/sell themes)
- [ ] User-uploadable themes with validation
- [ ] Theme builder/customizer UI
- [ ] More color/font customization options

### Internal Tools
- [ ] Integrate `grove-domain-search` package
  - AI-powered async domain availability checker (MCP server / UV tool)
  - Separate project - will be published as its own package
  - Backend use only - call at various integration points
  - Speeds up domain search from 2-3 weeks to 1-2 days
  - Enhances client consultations with pre-vetted available domains

### Migration Tools Expansion
- [ ] WordPress import tool
- [ ] Ghost import tool
- [ ] Medium import tool
- [ ] Substack import tool
- [ ] Generic RSS/Atom import
- [ ] Bulk media migration

### API Access (Paid Add-on)
- [ ] Public REST API for reading posts
- [ ] Authenticated API for creating/editing posts
- [ ] API key management in dashboard
- [ ] Rate limiting and usage tracking
- [ ] API documentation and examples
- [ ] Webhook support for external integrations
- [ ] SDK/client libraries (JavaScript, Python)

## Documentation Tasks
- [x] Update README.md with project specifics → **DONE: PR #16**
- [x] Document API/architecture decisions → **DONE: 7 specs in docs/specs/**
- [ ] Add usage examples for tenants
- [x] Create deployment guide → **DONE: DEPLOY-GUIDE.md, CLOUDFLARE-SETUP.md**
- [ ] Write testing documentation

## Success Metrics
- [ ] Zero data loss incidents
- [ ] Page load time < 2 seconds
- [ ] < 10 hours support per client/month
- [ ] < 5% monthly churn rate
- [ ] Net Promoter Score > 50
- [ ] 10 clients by Month 3
- [ ] 20 clients by Month 6
- [ ] $500 MRR by Month 12
