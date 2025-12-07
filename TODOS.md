# TODOs for Grove Platform

> **Note:** UI components and Design System have been split into [GroveUI](https://github.com/AutumnsGrove/GroveUI). This repo focuses on the core engine, example site, and hosting (grove.place).

---

## Setup Tasks
- [x] Initialize `grove-engine` GitHub repository → **DONE: GroveEngine monorepo created**
- [x] Set up SvelteKit project with TypeScript → **DONE: SvelteKit 2.5+ with Svelte 5**
- [x] Configure Cloudflare Workers and D1 database → **DONE: 7 migrations in place**
- [x] Implement magic link auth (6-digit email codes via Resend) → **DONE**
- [ ] Implement Google Sign-In (OAuth 2.0 with PKCE) → **PENDING** (based on @docs/Google-signin.md)
- [x] Configure Stripe for payments → **DONE: Stripe payments system with provider abstraction**
- [x] Set up Resend for email → **DONE: Used for magic code auth**
- [x] Check domain availability → **DONE: grove.place secured!**
- [x] Set up development environment with proper tooling → **DONE: pnpm workspaces, Vite, TypeScript**
- [x] Configure Tailwind CSS → **DONE: Tailwind CSS 3.4+ configured**
- [x] Split UI/Design System into separate repo → **DONE: [GroveUI](https://github.com/AutumnsGrove/GroveUI)**
- [x] Migrate to @groveengine/ui package → **DONE: v0.3.0 published to npm (2025-12-03)**
- [x] Fix CI/CD for example site → **DONE: Removed mermaid (crypto issues), fixed wrangler deploy command (2025-12-04)**
- [x] Set up pre-commit hooks (optional, see AgentUsage/pre_commit_hooks/)

## Security Audit Fixes (2025-12-05)
> **PRIORITY: Fix before production deployment.** Audit performed by Claude Code.

### Critical (Fix Immediately)
- [x] **Tenant authorization bypass** - Add ownership validation to all shop/billing endpoints → **DONE (2025-12-05)**
  - Added `getVerifiedTenantId()` helper to verify user owns tenant
  - Applied to: `/api/shop/orders`, `/api/shop/products`, `/api/shop/connect`, `/api/billing`
- [x] **SameSite cookie** - Change from `Lax` to `Strict` → **DONE (2025-12-05)**
- [x] **SVG uploads** - Remove `image/svg+xml` from CDN allowed types → **DONE (2025-12-05)**
- [x] **Shop checkout CSRF** - Enable CSRF validation → **DONE (2025-12-05)**
  - Added origin validation + tenant existence check
- [x] **Auth endpoints CSRF** - Add origin-based protection → **DONE (2025-12-05)**
  - Auth endpoints now use `validateCSRF()` for origin checking

### High Priority
- [x] **Race condition in magic code** - Use atomic DB update → **DONE (2025-12-05)**
  - Changed to `UPDATE ... WHERE used = 0` and check `rowsModified`
- [x] **Public image endpoints** - Add auth checks → **DONE (2025-12-05)**
  - Added to `/api/images/list` and `/api/images/filters`
- [ ] **CDN magic byte validation** - Add file signature validation (engine has it, CDN doesn't)
  - Location: `landing/src/routes/api/admin/cdn/upload/+server.ts`
- [x] **Order authorization** - Verify order belongs to user's tenant → **DONE (2025-12-05)**
  - Added tenant ownership check in PATCH handler
- [x] **Session duration** - Consider reducing from 7 days to 24 hours
  - Location: `session.js:8`

### Medium Priority
- [ ] **Email enumeration timing** - Add consistent delays for non-allowed emails
  - Location: `send-code/+server.js:169-173`
- [ ] **CSRF token rotation** - Implement per-session or periodic rotation
- [ ] **Rate limiting** - Add to image upload, post creation, settings endpoints
- [ ] **Content-Disposition headers** - Add to R2 uploads for forced download
- [ ] **Image bomb protection** - Add dimension validation after image load
- [ ] **JS/CSS CDN uploads** - Force download or remove from allowed types

### Low Priority (Polish)
- [ ] **Logout CSRF** - Consider requiring POST instead of GET
- [ ] **Failed attempts cleanup** - Add cleanup for old `failed_attempts` records
- [ ] **CSP headers** - Add Content-Security-Policy headers in hooks
- [ ] **Alt text sanitization** - Sanitize before DB storage in CDN patch endpoint

### Already Secure (No Action Needed)
- [x] DOMPurify sanitization on all `{@html}` usage
- [x] Magic byte validation on engine image uploads
- [x] JWT with HMAC-SHA256
- [x] Rate limiting on magic code requests
- [x] Constant-time comparison for codes
- [x] Prototype pollution prevention
- [x] File size limits enforced
- [x] Parameterized SQL queries (no injection)

---

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
- [ ] Integrate Shopify
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
- [x] Build domain search worker → **DONE: Deployed and tested via API (2025-12-05)**
  - AI-powered async domain availability checker
  - Speeds up domain search from 2-3 weeks to 1-2 days
  - Enhances client consultations with pre-vetted available domains
- [x] Wire up domain search worker to `domains.grove.place` UI → **DONE (2025-12-05)**
  - Worker call implemented in `domains/src/routes/api/search/start/+server.ts`
  - Cancel button added to UI
- [x] Upgrade domain tool with Durable Objects + live pricing → **DONE (2025-12-06)**
  - TypeScript rewrite with Durable Objects for persistence
  - Live pricing from Cloudflare Registrar (cfdomainpricing.com)
  - Pricing categories: bundled (<=$30), recommended (<=$50), standard, premium
  - Follow-up quiz system when max batches reached
  - Token usage tracking and display
  - Full UI integration with pricing summary, follow-up forms
- [x] Enhanced domain tool UI with SSE streaming + evaluation details → **DONE (2025-12-06)**
  - Real-time SSE streaming for live progress updates (with polling fallback)
  - Multi-provider AI support (Claude, DeepSeek, Kimi, Cloudflare AI)
  - Expandable domain cards with detailed evaluation scores
  - Evaluation indicators: pronounceable, memorable, brand fit, email friendly
  - RDAP metadata display (registrar, expiration date)
  - Token usage breakdown with cost estimation
- [x] AI provider selection in domain search UI → **DONE (2025-12-06)**
  - Dropdown to select AI model (Claude, DeepSeek, Kimi, Llama 4)
  - Passes `driver_provider` and `swarm_provider` to worker API
  - Worker `/api/jobs` endpoint for batch status queries
- [x] **BUG: Job ID tracking between worker and D1** → **DONE (2025-12-06)**
  - Worker creates jobs successfully but UI sometimes showed "failed to start"
  - Root cause: D1 insert could fail, disconnecting UI from worker job
  - **Fix: Added D1-based job index in worker**
    - New `job_index` table in worker's D1 for centralized tracking
    - New endpoints: `/api/jobs/list`, `/api/jobs/recent`, `/api/backfill`
    - History page auto-syncs from worker on load + manual "Sync" button
    - All new jobs are indexed immediately when created
- [x] **Job index shows stale data** → **DONE (2025-12-06)**
  - Status/counts don't update after job completes unless /api/status is polled
  - **Fix: Added `/api/jobs/refresh` endpoint**
    - Queries DOs in parallel for fresh status
    - Added `input_tokens` and `output_tokens` to job_index schema (migration 0002)
    - DO status response now includes token counts
    - Sync endpoints call refresh before listing
    - History table now shows Tokens column
- [x] **TLD Diversity Feature** → **DONE (2025-12-06)**
  - Added grouped TLD selector with 6 categories (Classic, Tech, Creative, Nature, Business, Personal) - 27 TLDs total
  - Added "Diverse TLDs" toggle to encourage variety in AI-generated suggestions
  - Updated prompts to be more TLD-diverse by default
  - Expanded TLD scoring in swarm.ts for all new TLDs
- [x] **Change default AI to DeepSeek** → **DONE (2025-12-06)**
  - UI default changed from 'claude' to 'deepseek'
  - Worker fallback changed from 'claude' to 'deepseek'
  - DeepSeek now shows as "(Recommended)" in provider dropdown
- [x] **History/Results Page UX Issues** → **PARTIALLY DONE (2025-12-06)**
  - ✅ Live SSE streaming for running jobs
  - ✅ Domains appear with slide-in animation as found
  - ✅ Live elapsed time and batch progress
  - ✅ Domain idea availability status (checkmark/X)
  - ✅ Stats update in real-time
  - ⚠️ Timezone issue: dates display in UTC (SSR limitation)
- [x] **Follow-up Quiz on History Detail Page** (2025-12-06) → **DONE (2025-12-06)**
  - When job status is `needs_followup`, show the follow-up quiz questions
  - Fetch from `/api/search/followup?job_id=...`
  - Allow user to submit answers to resume search
  - Implemented in `domains/src/routes/admin/history/[id]/+page.svelte`
  - Full UI with validation, loading states, and error handling
- [x] **Searcher Page Running Job Issue** (2025-12-06)
  - Right panel shows last COMPLETED job, not currently running job
  - Should show running job status or link to it
- [ ] Add search queue support (allow multiple concurrent searches)
  - Currently only one search can run at a time
  - Would need to track multiple jobs in UI state
     
### Personal TODOS
- [x] Fix markdowneditor side panel not properly collapsing when requested.
      This actually is working, but only if the site is refreshed. Needs to work and have a nice slide animation.
      **FIXED (2025-12-07):** Added CSS transitions for smooth slide animation; side panel now collapses/expands without requiring refresh.
- [x] In admin page, when creating a blog post, and honestly, just across the admin page, the sidebar needs to be toggleable. It can be ... in the way, at times.
      **FIXED (2025-12-07):** Sidebar toggleability improved via CSS transitions; the sidebar can be collapsed/expanded with smooth animation.
- [x] In markdown editor, clicking "forest" does nothing as well as clicking the gutter content button. seems to not work. Might be related to our refactoring of the one file into multiple components.
      **FIXED (2025-12-07):** Fixed ambient sounds panel overlapping and z‑index; forest button now opens ambient sounds panel correctly. Gutter content button layout adjusted for clickability.
- [ ] Within markdown editor, allow for Drafts. These are not _posted_ yet but are saveable and can be posted later, when the user is finished.
      **PENDING:** Feature not yet implemented; can be added in a future iteration.
- [x] Overlapping contents looks very strange - https://ibb.co/FL0JHDZy
      **FIXED (2025-12-07):** Used `{#key previewHtml}` blocks to force DOM re‑creation, eliminating overlapping text layers.
- [x] Hiding the preview in the editor is also broken
      **FIXED (2025-12-07):** Overlapping fix also resolved preview hiding; preview now toggles correctly without visual artifacts.
- [x] The buttons on the toolbar are still ... entirely broken. When clicked, the editor completely freezes and cannot be resumed unless the browser is FULLY closed.
      **FIXED (2025-12-07):** Added re‑entrancy guards (`isUpdating`) to `wrapSelection`, `insertAtCursor`, and `insertCodeBlock`; toolbar buttons no longer freeze the editor.
- [x] Showing gutter contents isn't _fully_ working, it _works_ but only if you refresh the website, and have other sidebars collapsed.
      **FIXED (2025-12-07):** Improved gutter button layout and z‑index; gutter contents now show/hide reliably without requiring refresh.
- [x] WHen submitting post from MarkdownEditor, received "Invalid CSRF token"
      **FIXED (2025-12-07):** Added CSRF token meta tag injection in `+layout.svelte` and ensured token is passed from `+layout.server.js`; API client now includes token in headers.

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
