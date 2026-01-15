# GroveEngine Migration & Roadmap

**Source:** AutumnsGrove (autumnsgrove.com)
**Target:** GroveEngine (grove.place platform)
**Status:** Core Migration COMPLETE - Polish & New Features In Progress
**Created:** November 30, 2025
**Last Updated:** January 15, 2026

---

## Overview

This document tracks the extraction of the blog engine from AutumnsGrove into the standalone, multi-tenant GroveEngine platform. The core migration is **COMPLETE**. This document now serves as the roadmap for remaining polish and new features.

---

## Migration Status Summary

| Phase | Status | Completed |
|-------|--------|-----------|
| Phase 1: Repository Setup | COMPLETE | Dec 2025 |
| Phase 2: Multi-Tenant Foundation | COMPLETE | Dec 2025 |
| Phase 3: Plan Enforcement | COMPLETE | Jan 2026 |
| Phase 4: Theme System | IN PROGRESS | Foliage package exists |
| Phase 5: Testing & Polish | COMPLETE | Jan 2026 |
| Component Extraction | COMPLETE | Jan 14, 2026 |
| Asset Deduplication | COMPLETE | Jan 14, 2026 (11,925 lines removed) |

---

## Completed Work

### Engine v0.9.6 (Jan 14, 2026)

- [x] Consolidated duplicated utilities into engine package
- [x] Deleted 11,925 lines of duplication across apps
- [x] Added Engine-First pattern documentation to AGENT.md
- [x] Chrome components centralized (Header, Footer, MobileMenu, ThemeToggle)
- [x] Fixed code block renderer with copy button
- [x] Restored season cycling on logo tap

### Core Platform (Dec 2025 - Jan 2026)

- [x] Multi-tenant database schema deployed
- [x] Subdomain routing functional (*.grove.place)
- [x] API endpoints filter by tenant_id
- [x] Admin panel scoped to tenant
- [x] 4-tier pricing implemented (Seedling, Sapling, Oak, Evergreen)
- [x] Lemon Squeezy payment integration (code complete, awaiting store verification)
- [x] Plant signup flow deployed to plant.grove.place
- [x] Shade (AI protection) deployed with Turnstile verification
- [x] Rate limiting core (Threshold pattern) implemented
- [x] Security audit completed (all P0 issues fixed)
- [x] Glass design system 100% adopted across all properties

### Component Extraction (All COMPLETE)

| Component | Status | Notes |
|-----------|--------|-------|
| ContentWithGutter.svelte | COMPLETE | Gutter annotations working |
| TableOfContents.svelte | COMPLETE | Auto-generated TOC |
| MarkdownEditor.svelte | COMPLETE | Post editing |
| GutterManager.svelte | COMPLETE | Gutter UI |
| ImageGallery.svelte | COMPLETE | In-post galleries |
| Lightbox.svelte | COMPLETE | Image modal |
| All UI components | COMPLETE | Shadcn components |
| Chrome components | COMPLETE | Header, Footer, MobileMenu in engine |

---

## Remaining Work

### Priority 1: Immediate (This Week)

#### JXL Encoding (PR #336)
> **Spec:** `docs/plans/jxl-migration-spec.md`
> **Status:** Code review complete, needs fixes before merge

**Critical Issues (must fix):**
- [ ] Migration safety: Add "IF NOT EXISTS" protection to SQLite ALTER TABLE
- [ ] Backend integration: Upload API needs to persist format metadata
- [ ] Dead code: Remove unused `getImageData` function

**Should Fix:**
- [ ] Add metrics tracking to error paths
- [ ] Verify `@jsquash/jxl` dependency placement (dedupe)
- [ ] Add E2E test for JXL encoding flow

#### Disable Signups Gate
- [ ] Add gate until Lemon Squeezy approves store
  - Option A: Show "Coming Soon" page
  - Option B: Disable OAuth temporarily
  - Option C: Add waitlist capture

### Priority 2: Active Development

#### Gossamer (ASCII Visual Effects) - Phase M4
> **Location:** `~/Documents/Projects/Gossamer`
> **Status:** Core complete, 107 tests passing

**Complete:**
- [x] GossamerRenderer class + 5 pattern generators
- [x] 12 character sets + animation loop with FPS limiting
- [x] 5 Svelte components (Clouds, Image, Text, Overlay, Border)
- [x] 11 presets (grove, seasonal, ambient themes)

**Remaining:**
- [ ] Create vanilla JS examples (`examples/vanilla/`)
- [ ] Create SvelteKit integration example (`examples/svelte-kit/`)
- [ ] Finish API documentation (`docs/API.md`)
- [ ] Configure ESLint/Prettier
- [ ] Set up CI/CD pipeline

#### Timeline Curio - AutumnsGrove Migration
> **Status:** Phase 7 COMPLETE, needs deployment to production

**Complete:**
- [x] OpenRouter provider with BYOK
- [x] Voice presets (professional, quest, casual, poetic, minimal)
- [x] Admin UI (`/admin/curios/timeline`)
- [x] API endpoints (generate, activity, backfill, config)
- [x] Long-horizon context system (12 task patterns, 3-day memory)
- [x] Timeline.svelte component with gutter comments
- [x] Heatmap.svelte - GitHub-style activity visualization

**Remaining:**
- [ ] Run migration on AutumnsGrove's D1 database
- [ ] Configure GitHub token + OpenRouter key in Arbor
- [ ] Test generation with AutumnsGrove's GitHub activity
- [ ] Update AutumnsGrove to render Timeline from new Curio system
- [ ] Retire old timeline implementation

#### Journey Curio - Implementation
> **Spec:** `docs/plans/journey-curio-implementation.md`
> **Status:** Planning complete

- [ ] Implement Journey Curio following spec
- [ ] Tag-walking strategy for navigation
- [ ] Integration with existing Curios system

### Priority 3: Infrastructure

#### Feature Flags System
> **Spec:** `docs/plans/feature-flags-spec.md`
> **Status:** Planning complete, prerequisite for JXL rollout

**Phase 1: Core Infrastructure**
- [ ] Create D1 migration (feature_flags, flag_rules, flag_audit_log tables)
- [ ] Implement evaluation logic (`packages/engine/src/lib/feature-flags/`)
- [ ] Add `FLAGS_KV` binding to wrangler.toml
- [ ] Write unit tests for percentage rollout determinism

**Phase 2: Admin UI**
- [ ] Create `/admin/flags` routes
- [ ] Build RuleEditor, PercentageSlider, TierSelector components
- [ ] Add audit log display

**Phase 3: Integration**
- [ ] Create initial flags (jxl_encoding, jxl_kill_switch, meadow_access)
- [ ] Integrate with image processor for JXL rollout
- [ ] Connect to Rings analytics for flag exposure tracking

#### Shutter (Content Protection) - v1.6 Auth
> **Location:** `~/Documents/Projects/Shutter`
> **Status:** Core complete, needs auth integration

**Complete:**
- [x] Python CLI with Jina -> Tavily -> httpx fetch chain
- [x] 2-phase Canary prompt injection detection
- [x] OpenRouter integration (4 model tiers)
- [x] Cloudflare Workers port with D1 offenders database
- [x] Published to PyPI as `grove-shutter`

**Security (before resuming):**
- [ ] Rotate OpenRouter API key (exposed during dev)
- [ ] Re-add secrets: `wrangler secret put OPENROUTER_API_KEY`

**v1.6 Auth:**
- [ ] Register Shutter as GroveAuth OAuth client
- [ ] Implement OAuth PKCE flow + JWT verification
- [ ] Rate limiting via Durable Objects
- [ ] Deploy to `shutter.grove.place`
- [ ] NPM package: `@groveengine/shutter`

### Priority 4: Theme System (Foliage Integration)

> **Repository:** https://github.com/AutumnsGrove/Foliage
> **Status:** Package exists, needs engine integration

**Foliage provides:**
- 10 curated themes (Grove, Minimal, Night Garden, Zine, etc.)
- Tier-gated access (Seedling=3, Sapling=10, Oak+=customizer)
- CSS variable generation with WCAG AA contrast validation
- Community themes (Oak+ can browse/submit)
- Custom font uploads to R2 (Evergreen tier)

**Integration Tasks:**
- [ ] Add `@autumnsgrove/foliage` as dependency to engine
- [ ] Run Foliage migrations (theme_settings, community_themes tables)
- [ ] Add R2 bucket for custom fonts (`foliage-fonts`)
- [ ] Import `loadThemeSettings` in engine's `+layout.server.ts`
- [ ] Apply theme CSS vars via `applyThemeVariables()` in `+layout.svelte`
- [ ] Add theme admin routes (`/admin/themes/`)
- [ ] Wire up tier access using `canAccessTheme()`, `canUseCustomizer()`

### Priority 5: Post-Launch Polish

#### Plant Signup Flow Polish
- [ ] Add loading states to form submissions
- [ ] Improve error messages (contextual, not generic)
- [ ] Add "back" navigation (profile <-> plans)
- [ ] Tour mobile polish (swipe hints, better touch targets)
- [ ] Success page CTA ("Go to your blog" button)

#### Rate Limiting Route Integration
- [ ] Add rate limiting to auth endpoints (`/api/auth/*`)
- [ ] Add rate limiting to CDN upload endpoints (`/api/cdn/*`)
- [ ] Add rate limiting to post creation endpoints
- [ ] Integrate `checkTenantRateLimit()` in router middleware

#### Safari Reader Mode Fix
- [ ] Add `@supports not (backdrop-filter: blur(1px))` fallback
- [ ] Wrap glass card content in semantic elements
- [ ] Test in Safari iOS and macOS

---

## Future Phases (Post-Launch)

### Durable Objects Implementation
> **Spec:** `docs/grove-durable-objects-architecture.md`

- DO Phase 1: Auth (SessionDO) - Highest priority
- DO Phase 2: Tenant Coordination (TenantDO)
- DO Phase 3: Content Coordination (PostDO)
- DO Phase 4: Meadow Social (FeedDO, NotificationDO)
- DO Phase 5: Analytics (AnalyticsDO)

### Meadow (Social Features)
> **Spec:** `docs/specs/social-spec.md`

- Landing page explaining Meadow philosophy
- Chronological feed (no algorithmic ranking)
- Reactions visible only to author
- Connection without competition

### Content Moderation System
> **Spec:** `docs/Specs/CONTENT-MODERATION.md`

- Fireworks AI / Groq integration
- Encrypted content queue
- Decision engine with confidence thresholds
- Appeal submission flow

---

## Architecture Reference

### Current State

```
grove.place/                 # Landing site
plant.grove.place/           # Signup flow
status.grove.place/          # Clearing (status page)
username.grove.place/        # Tenant blogs

packages/
├── engine/                  # Core blog engine (npm: @autumnsgrove/groveengine)
├── grove-router/            # Cloudflare Worker routing
├── og-worker/               # OG image generation
├── durable-objects/         # DO implementations (future)
└── post-migrator/           # Content migration tools
```

### Engine-First Pattern

All apps import from the engine package:

```typescript
// DO THIS - import from engine
import { Header, Footer } from '@autumnsgrove/groveengine/ui';
import { parseMarkdown } from '@autumnsgrove/groveengine/utils';
import { checkRateLimit } from '@autumnsgrove/groveengine/server';

// NOT THIS - no local duplicates
import Header from '$lib/components/Header.svelte'; // WRONG
```

### Database Schema

Multi-tenant D1 with tenant_id on all content tables:
- `tenants` - Subdomain, plan, storage tracking
- `posts` - Blog posts with UNIQUE(tenant_id, slug)
- `pages` - Static pages per tenant
- `media` - R2 references per tenant
- `site_settings` - Per-tenant configuration

---

## Success Metrics

- [x] Zero data loss incidents
- [x] Page load < 2 seconds
- [x] Security audit passed (all P0 fixed)
- [ ] 10 clients by Month 3
- [ ] 20 clients by Month 6
- [ ] $500 MRR by Month 12

---

## Related Documents

- **TODOS.md** - Daily task tracking
- **AGENT.md** - Development guidelines and patterns
- **docs/specs/** - Feature specifications
- **docs/plans/** - Implementation plans
- **docs/patterns/** - Architecture patterns (Prism, Threshold)

---

*This document consolidates the original migration-plan.md and migration-strategy.md.*
*The detailed file extraction lists from migration-strategy.md are now archived as that work is complete.*
