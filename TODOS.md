# TODOs for Grove Platform

> **Note:** UI components and Design System have been split into [GroveUI](https://github.com/AutumnsGrove/GroveUI). This repo focuses on the core engine, example site, and hosting (grove.place).

---

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
- [x] Migrate to @groveengine/ui package → **DONE: v0.3.0 published to npm (2025-12-03)**
- [x] Fix CI/CD for example site → **DONE: Removed mermaid (crypto issues), fixed wrangler deploy command (2025-12-04)**
- [ ] Set up pre-commit hooks (optional, see AgentUsage/pre_commit_hooks/)

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
- [ ] **Session duration** - Consider reducing from 7 days to 24 hours
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
- [ ] **TLD Diversity Feature** (2025-12-06)
  - Add "Diverse TLDs" toggle to search UI
  - Modify prompts to encourage varied TLDs when enabled
  - Expand TLD options in UI beyond current 6 (add .club, .garden, .place, .life, .earth, .green, etc.)
  - Improve base prompts to be slightly more TLD-diverse by default
- [x] **Change default AI to DeepSeek** → **DONE (2025-12-06)**
  - UI default changed from 'claude' to 'deepseek'
  - Worker fallback changed from 'claude' to 'deepseek'
  - DeepSeek now shows as "(Recommended)" in provider dropdown
- [ ] **History/Results Page UX Issues** (2025-12-06)
  - Stats not live (domains checked/found/tokens/batch don't update without refresh)
  - No live streaming of results from DO to history detail page
  - Search parameters not fully shown (domain_idea, keywords, custom preferences missing)
  - If user provided a domain idea, show checkmark/X for availability status
- [ ] **Searcher Page Running Job Issue** (2025-12-06)
  - Right panel shows last COMPLETED job, not currently running job
  - Should show running job status or link to it
- [ ] Add search queue support (allow multiple concurrent searches)
  - Currently only one search can run at a time
  - Would need to track multiple jobs in UI state

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

## MarkdownEditor Refactoring
> The MarkdownEditor.svelte is 3000+ lines and needs to be split into manageable pieces.
> **Bug fix completed (2025-12-04):** Fixed `$derived(() => ...)` patterns causing browser freezes.

### Phase 1: Extract Composables/Stores
- [ ] Extract slash commands system into `useSlashCommands.svelte.js`
- [ ] Extract command palette into `useCommandPalette.svelte.js`
- [ ] Extract snippets manager into `useSnippets.svelte.js`
- [ ] Extract ambient sounds into `useAmbientSounds.svelte.js`
- [ ] Extract theme system into `useEditorTheme.svelte.js`
- [ ] Extract draft/auto-save into `useDraftManager.svelte.js`
- [ ] Extract writing goals/campfire into `useWritingSession.svelte.js`

### Phase 2: Extract Subcomponents
- [ ] Create `EditorToolbar.svelte` component
- [ ] Create `EditorStatusBar.svelte` component
- [ ] Create `SlashCommandMenu.svelte` component
- [ ] Create `CommandPalette.svelte` component
- [ ] Create `SnippetsModal.svelte` component
- [ ] Create `AmbientSoundPanel.svelte` component
- [ ] Create `FullPreviewModal.svelte` component

### Phase 3: Styles & Polish
- [ ] Move CSS to separate `MarkdownEditor.css` or use CSS modules
- [ ] Consider extracting theme CSS variables to shared file
- [ ] Add proper TypeScript types for all composables
- [ ] Add tests for critical editor functions

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
