---
title: "Lattice Safari — Full Ecosystem Expedition"
category: safari
lastUpdated: "2026-03-02"
tags:
  - lattice
  - architecture
  - monorepo
---

# Lattice Safari — Full Ecosystem Expedition

> **Lattice is not a blog engine. It's a platform SDK.**
> **Aesthetic principle**: Every subsystem has its own Grove name and character.
> **Scope**: Full survey of `libs/engine/src/lib/` — every module, every export path, architecture intent.

---

## 🗺️ Route Map

**Territory:** `libs/engine/src/lib/` — 30+ top-level modules
**Package:** `@autumnsgrove/lattice` v1.0.0 (AGPL-3.0-only, GitHub Package Registry)
**Terrain type:** SDK subsystems, UI components, server utilities, AI tools
**Stops driven:** 22 major subsystems

---

## Quick Survey

| Module              | What It Is                                           | Condition   | Spec Coverage                         |
| ------------------- | ---------------------------------------------------- | ----------- | ------------------------------------- |
| **Core (index.ts)** | Default export barrel — components + utils           | 🟢 Thriving | ❌ Absent                             |
| **UI system**       | Grove design system — 14 component categories        | 🟢 Thriving | ❌ Absent                             |
| **Heartwood**       | GroveAuth OAuth client + rate limiting               | 🟢 Thriving | ❌ Wrong (spec describes magic codes) |
| **Feature Flags**   | Full flag engine — bool/%, A/B, tiers, greenhouse    | 🟢 Thriving | ❌ Absent                             |
| **Grafts**          | UI components + server modules mounted on products   | 🟢 Thriving | ❌ Absent                             |
| **Curios**          | 22 website personality widgets                       | 🟢 Thriving | ❌ Absent                             |
| **Lumen**           | AI gateway — multi-provider, quota, PII scrubbing    | 🟢 Thriving | ❌ Absent                             |
| **Loom**            | Durable Object framework                             | 🟢 Thriving | 🔮 Planned only                       |
| **Threshold**       | Rate limiting SDK — 3 backends, 3 framework adapters | 🟢 Thriving | ❌ Absent                             |
| **Thorn**           | Content moderation — config-driven, Lumen-backed     | 🟢 Thriving | ❌ Absent                             |
| **Sentinel**        | Infrastructure load testing                          | 🟢 Thriving | ❌ Absent                             |
| **Zephyr**          | Email + social broadcasting client                   | 🟢 Thriving | ❌ Absent                             |
| **Email**           | React Email infrastructure — templates, sequences    | 🟢 Thriving | ❌ Absent                             |
| **Server**          | Rate limits, logger, Canopy dir, upload gate         | 🟢 Thriving | 🟡 Partial                            |
| **Config**          | Tiers, presets, blocklists, auth config              | 🟢 Thriving | ❌ Absent                             |
| **Scribe**          | Browser audio recording for voice transcription      | 🟢 Thriving | ❌ Absent                             |
| **Auth**            | Session management                                   | 🟡 Growing  | 🔴 Wrong (magic codes)                |
| **Payments**        | Abstract payment provider types                      | 🟡 Growing  | ❌ Absent                             |
| **Durable Objects** | Type definitions for DO classes                      | 🟡 Growing  | 🔮 Planned only                       |
| **Errors**          | Typed error system for API/arbor/site                | 🟢 Thriving | ❌ Absent                             |
| **Utils**           | 20+ utility modules                                  | 🟢 Thriving | 🟡 Partial                            |
| **Data**            | Grove term manifest (generated)                      | 🟢 Thriving | ❌ Absent                             |

---

## Full Expedition Notes

---

### 1. Package Identity

**Character**: The package that holds Grove together. Invisible infrastructure with Grove's name on it.

#### Safari findings

- [x] **Name**: `@autumnsgrove/lattice` v1.0.0 — spec still says `@lattice/core`
- [x] **License**: AGPL-3.0-only — not mentioned in spec at all
- [x] **Registry**: Dual-registry — `npm.pkg.github.com` (monorepo default, CI/CD) + `npmjs.com` (public releases, via publish workflow that temporarily swaps registry config)
- [x] **Peer deps**: SvelteKit `^2.0.0`, Svelte `^5.0.0`, Tailwind `^3.4.0`
- [x] **Build**: `svelte-package -o dist` via `@sveltejs/package`
- [x] **Test**: Vitest (100+ test files across the codebase)
- [x] **Pre-package**: Runs `scripts/generate/grove-term-manifest.ts` to generate GroveTerm manifest
- [ ] **Spec description**: Still describes a customer-installed "blog engine" — the actual model is a **monorepo SDK** used internally by all Grove packages

#### Design spec (safari-approved)

Spec needs to open with the actual identity: monorepo internal SDK + publishable package. Not a customer-facing installation. The deployment model diagram needs to show the actual Grove monorepo structure, not a "customer installs from npm" fantasy.

---

### 2. Export Architecture

**Character**: A deeply namespaced SDK — almost 50 named export paths. Each subsystem has its own tree-shakeable path.

#### Safari findings: What exists today

**Main export (`.`)**:

- [x] Custom layout components: ContentWithGutter, GutterItem, LeftGutter, TableOfContents, MobileTOC, CollapsibleSection, CategoryNav
- [x] Admin components: MarkdownEditor, GutterManager, LumenAnalytics, SafetyMonitoring, ZephyrAnalytics
- [x] Wisp writing assistant: WispPanel, WispButton
- [x] Quota UI: QuotaWidget, QuotaWarning, UpgradePrompt
- [x] Gallery: ImageGallery, Lightbox, LightboxCaption, ZoomableImage
- [x] Full UI re-export via `export * from "./ui/index"`
- [x] Utilities: `cn`, `seededShuffle`
- [x] Config: COLOR_PRESETS, FONT_PRESETS, CANOPY_CATEGORIES
- [x] Heartwood client (all auth utilities)
- [x] Curio: Timeline module

**Named sub-paths (~47 export paths in package.json)**:

- `./ui` — full Grove design system
- `./ui/editor`, `./ui/arbor`, `./ui/chrome`, `./ui/stores`, `./ui/gallery`
- `./ui/charts`, `./ui/content`, `./ui/content/hum`, `./ui/content/curios`
- `./ui/feedback`, `./ui/forms`, `./ui/indicators`, `./ui/icons`, `./ui/states`
- `./ui/typography`, `./ui/nature`, `./ui/nature/*`, `./ui/tokens`, `./ui/utils`
- `./ui/styles`, `./ui/tailwind`, `./ui/terrarium`
- `./utils`, `./utils/*`
- `./auth`, `./auth/*`
- `./server`, `./server/*`
- `./config`, `./config/*`, `./config/terrarium`
- `./payments`, `./payments/*`, `./services`, `./services/*`
- `./vineyard`
- `./heartwood`, `./groveauth` (alias)
- `./feature-flags`
- `./curios`, `./curios/timeline`, `./curios/timeline/voices`, `./curios/gallery`
- `./grafts`, `./grafts/pricing`, `./grafts/login`, `./grafts/login/server`
- `./grafts/greenhouse`, `./grafts/uploads`, `./grafts/upgrades`
- `./lumen`
- `./threshold`, `./threshold/sveltekit`, `./threshold/hono`, `./threshold/worker`
- `./thorn`
- `./email`, `./email/components`, `./email/render`, `./email/sequences`
- `./email/types`, `./email/updates`, `./email/schedule`, `./email/urls`, `./email/porch`
- `./zephyr`
- `./errors`
- `./loom`, `./loom/sveltekit`, `./loom/worker`, `./loom/testing`

#### Design spec (safari-approved)

The spec's export examples all use the wrong package name and the wrong paths. Needs a complete rewrite of the Package Exports section showing the real ~47 paths organized by category.

---

### 3. UI System (`./ui`)

**Character**: A calm, organic design system. "GroveUI" — a place to Be.

#### Safari findings

**Core UI (`./ui` → `components/ui/`)**:

- [x] Accordion, Badge, BetaBadge, BetaWelcomeDialog, Button, Card
- [x] CollapsibleSection, Dialog, FeatureStar
- [x] Glass components: Glass, GlassButton, GlassCard, GlassCarousel, GlassComparisonTable, GlassConfirmDialog, GlassLegend, GlassLogo, GlassNavbar, GlassOverlay, GlassStatusWidget
- [x] Input, Logo, GlassLogoArchive
- [x] GroveTerm (glossary term linking), grove-messages

**Nature components (`./ui/nature`)**:

- [x] **botanical**: Acorn, Berry, DandelionPuff, FallingLeavesLayer, FallingPetalsLayer, Leaf, LeafFalling, PetalFalling, PineCone
- [x] **sky**: Cloud, CloudWispy, Moon, Rainbow, Star, StarCluster, StarShooting, Sun
- [x] **creatures**: (directory exists)
- [x] **ground**, **structural**, **trees**, **water**, **weather**: directories exist
- [x] GroveDivider, palette utilities

**Chrome components (`./ui/chrome`)**:

- [x] Header, HeaderMinimal, Footer, FooterMinimal
- [x] MobileMenu, AdminHeader, AccountStatus, ThemeToggle
- [x] tenant-nav utilities, defaults

**Content components (`./ui/content`)**:

- [x] EmbedWidget, FaqPage, LinkPreview, PlanCard, ProductCard, RoadmapPreview, SearchCard
- [x] Hum (subdirectory)
- [x] Curios UI components (subdirectory)

**Other categories**: indicators, feedback, forms, icons (lucide wrapper), states, charts, typography, gallery, terrarium, vineyard, arbor

#### Design spec (safari-approved)

Spec mentions "8 components in UI library." Reality: 100+ Svelte components across 14 categories plus the entire nature system (seasonal, animated, living). Needs full category listing.

---

### 4. Heartwood (`./heartwood`, `./groveauth`)

**Character**: Grove's auth nerve center. PKCE-based OAuth client for Heartwood (GroveAuth), wrapped with quota utilities and rate limiting.

#### Safari findings

- [x] `GroveAuthClient`, `createGroveAuthClient` — full OAuth PKCE client
- [x] PKCE helpers: `generateCodeVerifier`, `generateCodeChallenge`, `generateState`
- [x] Types: `TokenResponse`, `UserInfo`, `UserSubscription`, `SubscriptionTier`, `CanPostResponse`
- [x] OAuth provider types, Passkey types, 2FA/TOTP types, LinkedAccount types
- [x] `TIER_POST_LIMITS`, `TIER_NAMES` constants
- [x] Quota helpers: `getQuotaDescription`, `getQuotaUrgency`, `getSuggestedActions`, `getUpgradeRecommendation`, `getQuotaWidgetData`, `getPreSubmitCheck`
- [x] Color/variant helpers: `STATUS_COLORS`, `ALERT_VARIANTS`, `getStatusColorFromPercentage`, `getAlertVariantFromColor`
- [x] Rate limiting: `RateLimiter`, `RateLimitError`, `withRateLimit`, `DEFAULT_RATE_LIMITS`
- [x] TOTP validation: `isValidTotpCode`, `TOTP_CODE_LENGTH`, `TOTP_CODE_REGEX`
- [x] WebAuthn/passkey credential validation: `isValidCredential`
- [x] Auth error system: `AUTH_ERRORS`, `getAuthError`, `buildErrorParams`

#### Design spec (safari-approved)

Spec describes a non-existent "magic code" auth system with Resend. Heartwood is the real auth layer — OAuth via Heartwood (Google, passkeys, 2FA). The spec auth section needs to be **completely replaced** with the Heartwood integration model.

---

### 5. Feature Flags (`./feature-flags`)

**Character**: A Cloudflare-native feature flag engine with Grove-flavored names throughout.

#### Safari findings

- [x] **Core API**: `isFeatureEnabled`, `getFeatureValue`, `getVariant`, `getFlag`, `getFlags`
- [x] **Rule types**: boolean, percentage, tier-gated, user-specific, time-based, greenhouse
- [x] **A/B variants**: `getVariant` returns `'control'` by default
- [x] **Batch evaluation**: `getFlags` evaluates multiple flags in one call
- [x] **Caching**: KV-backed with `invalidateFlag`, `invalidateAllFlags`
- [x] **Greenhouse**: Beta tenant enrollment — `isInGreenhouse`, `enrollInGreenhouse`, `toggleGreenhouseStatus`
- [x] **Grafts API**: `getEnabledGrafts`, `isGraftEnabled`, `KnownGraftId` union type
- [x] **Upload suspension**: admin control over upload access per tenant
- [x] **Tenant overrides**: Self-serve flag overrides — `setTenantGraftOverride`, `resetTenantGraftOverrides`
- [x] **Admin (Cultivate Mode)**: `getFeatureFlags`, `getFeatureFlag`, `setFlagEnabled`
- [x] **Percentage**: `getUserBucket` (deterministic hashing by session/user)

#### Design spec (safari-approved)

Spec does not mention feature flags at all. This is a complete subsystem that controls availability of almost every feature on the platform. Needs its own section with the rule types and Grafts API explained.

---

### 6. Grafts (`./grafts`, `./grafts/*`)

**Character**: "Grafts" has two meanings in Grove — UI Graft components and Feature Graft flags. Both live here.

#### Safari findings

**Registry & helpers**:

- [x] `GRAFT_REGISTRY`, `getGraftEntry`, `isGraftEnabled`, `getAllGrafts`, `getGraftsByStatus`
- [x] Types: `GraftId`, `ProductId`, `GraftRegistryEntry`, `GraftContext`, `BaseGraftProps`
- [x] Svelte context: `setGraftContext`, `getGraftContext`, `requireGraftContext`

**Named Graft Modules**:

- [x] `./grafts/pricing` — Pricing page graft
- [x] `./grafts/login` — Login UI graft
- [x] `./grafts/login/server` — Server-side login utilities
- [x] `./grafts/greenhouse` — Greenhouse beta access graft
- [x] `./grafts/uploads` — Upload management graft
- [x] `./grafts/upgrades` — Upgrade flow graft

#### Design spec (safari-approved)

Completely absent from spec. Grafts are the primary extension mechanism for Grove — how new features get conditionally mounted on products. Needs its own section explaining the two-layer system (UI Graft component + Feature Graft flag).

---

### 7. Curios (`./curios`, `./curios/*`)

**Character**: The delightful, weird, personality-giving widgets that make a website feel _alive_. Web 1.0 energy meets modern craft.

#### Safari findings

**22 curios total**:

**Developer Curios** (fully exported from `./curios`):

- [x] **Timeline** (`./curios/timeline`) — AI-powered daily GitHub activity summaries via OpenRouter. Voice presets: professional, quest, casual, poetic, minimal. Full server-side secrets handling.
- [x] **Journey** — Repo growth visualization (language breakdowns, milestone snapshots)
- [x] **Gallery** (`./curios/gallery`) — Photo gallery curio
- [x] **Pulse** — Live development heartbeat from GitHub webhooks (includes Svelte components: Pulse, PulseCompact, PulseIndicator, PulseStats, PulseHeatmap, PulseFeed, PulseTrends)

**Visitor Curios** (type definitions + logic, UI components in `./ui/content/curios`):

- [x] **Activity Status** — online/away/offline indicators
- [x] **Ambient** — ambient audio/atmosphere
- [x] **Artifacts** — digital artifact collections
- [x] **Badges** — achievement/collection badge displays
- [x] **Blogroll** — blog recommendation lists
- [x] **Bookmark Shelf** — bookmark collections
- [x] **Clipart** — custom clipart displays
- [x] **Cursors** — custom cursor themes
- [x] **Custom Uploads** — user-uploadable content
- [x] **Guestbook** — visitor guestbooks
- [x] **Hit Counter** — retro page view counter (4 styles)
- [x] **Link Garden** — curated link collections
- [x] **Mood Ring** — mood/feeling indicators (glass effects, multiple display shapes)
- [x] **Now Playing** — music/media now playing widget
- [x] **Polls** — community polls
- [x] **Shrines** — tribute/fan shrine pages
- [x] **Status Badge** — status/availability badges
- [x] **Webring** — web ring membership

All curios have test files. `sanitize.ts` provides shared sanitization for curio content.

#### Design spec (safari-approved)

Curios don't exist in the spec _at all_. They're arguably the most user-facing feature of Grove's personality system. They need a full section: what curios are, the developer/visitor split, the architecture pattern (types + logic in `curios/`, UI in `ui/content/curios/`), and the full list.

---

### 8. Lumen (`./lumen`)

**Character**: Grove's unified AI gateway. All AI inference flows through here. Multi-provider, quota-aware, privacy-protecting.

#### Safari findings

- [x] `LumenClient`, `createLumenClient`, `createLumenClientWithDecryption`
- [x] **Tasks**: generation, summary, chat, image, code, moderation, embedding
- [x] **Providers**: OpenRouter (primary), Cloudflare Workers AI (fallback)
- [x] **Automatic fallback** when primary provider fails
- [x] **Tier-based quotas**: `LUMEN_QUOTAS`, `getTierQuota`, `isTaskAvailable`, `wouldExceedQuota`
- [x] **Quota tracker**: `QuotaTracker`, `createQuotaTracker` — D1-backed usage tracking
- [x] **Pipeline preprocessing**: `scrubPii`, `secureUserContent`, `validateRequest`
- [x] **Streaming**: `lumen.stream()` returns async iterator of chunks
- [x] **Embeddings**: `lumen.embed()` with Cloudflare AI
- [x] **Moderation**: `lumen.moderate()` (used by Thorn)
- [x] **Songbird**: `runSongbird` — specialized streaming chat
- [x] **Shutter**: `runShutter`, `injectShutterContext` — image analysis/generation
- [x] **MCP**: `McpServerRegistry`, `runMcpTools`, `injectMcpContext` — Model Context Protocol support
- [x] **Cost calculation**: `MODEL_COSTS`, `calculateCost`
- [x] **Error types**: `LumenError`, `QuotaExceededError`, `ProviderError`, `AllProvidersFailedError`
- [x] Transcription: `LumenTranscriptionRequest/Response` types

#### Design spec (safari-approved)

Completely absent. Lumen is the AI backbone of every Grove feature that uses AI — Wisp (writing assistant), Thorn (moderation), Timeline curio, and any future AI features. Needs its own section: what it is, the task routing model, provider fallback, quota management, the preprocessing pipeline.

---

### 9. Loom (`./loom`, `./loom/*`)

**Character**: Grove's Durable Object coordination framework. Everything that needs to live beyond a single Worker request goes through Loom.

#### Safari findings

- [x] **LoomDO** — base class for all Grove Durable Objects
- [x] **Router** — `matchRoute`, `buildRequestContext` — HTTP routing inside DOs
- [x] **AlarmScheduler** — cron/alarm management
- [x] **SqlHelper**, **JsonStore** — SQLite utilities (DO storage layer)
- [x] **WebSocketManager** — WebSocket connection management inside DOs
- [x] **LoomLogger** — structured logging
- [x] **PromiseLockMap** — concurrency control
- [x] **Factory helpers**: `getLoomStub`, `getLoomStubById`, `loomFetch`, `loomFetchJson`
- [x] **Adapters**: `./loom/sveltekit`, `./loom/worker` — framework-specific fetch routing
- [x] **Testing**: `./loom/testing` — mock helpers
- [x] **Error constants**: `LOOM_ERRORS`, `LoomResponse`

Actual DO classes live in `services/durable-objects/` (separate worker), Loom provides the base class.

#### Design spec (safari-approved)

Spec listed DOs as "🔮 Planned." They're live. Loom is the framework around them. Needs a section explaining the Loom pattern: DO base class → Grove DOs (TenantDO, PostMetaDO, PostContentDO, SentinelDO) → deployed as separate worker, referenced via `script_name`.

---

### 10. Threshold (`./threshold`, `./threshold/*`)

**Character**: Grove's rate limiting SDK. Three storage backends, three framework adapters, endpoint-aware configuration, abuse tracking.

#### Safari findings

- [x] **Threshold** class — core rate limiter
- [x] **categorizeRequest** — smart request classification
- [x] **Storage backends**:
  - `ThresholdKVStore` — Cloudflare KV
  - `ThresholdD1Store` — D1 database
  - `ThresholdDOStore` — Durable Object
- [x] **Framework adapters**:
  - `./threshold/sveltekit` — SvelteKit hooks integration
  - `./threshold/hono` — Hono middleware
  - `./threshold/worker` — raw Worker handler
- [x] **`ENDPOINT_RATE_LIMITS`** — config map for all Grove API endpoints
- [x] **`ENDPOINT_MAP`**, `getEndpointLimit`, `getEndpointLimitByKey`
- [x] **Abuse tracking**: `getAbuseState`, `recordViolation`, `isBanned`, `getBanRemaining`, `clearAbuseState`
- [x] **Factory**: `createThreshold`
- [x] **Error constants**: `THRESHOLD_ERRORS`
- [x] **Test utilities**: `createMockKV`, `createMockD1`, `createMockStore`

#### Design spec (safari-approved)

Absent from spec (rate limiting noted as "✅ Live" but no architecture). Threshold replaces ad-hoc KV-based rate limiting across the codebase. Needs a section showing the three-backend pattern and how it integrates with SvelteKit/Hono/Worker contexts.

---

### 11. Thorn (`./thorn`)

**Character**: The protective layer that keeps Grove communities safe. Content moderation with graduated enforcement and a human review layer.

#### Safari findings

**Status**: Live — wired into publish flow

- [x] `moderateContent(content, { lumen, tenant, contentType })` — primary API
- [x] **Config-driven**: `THORN_CONFIG` with per-content-type thresholds
- [x] **Actions**: allow → review → flag → block (graduated enforcement)
- [x] **Content types**: post, comment, profile_update (hooks defined; comment/profile pending)
- [x] **Logging**: `logModerationEvent`, `flagContent`, `getRecentEvents`, `getFlaggedContent`, `updateFlagStatus`, `getStats`
- [x] **Publish hook**: `moderatePublishedContent` — called via `waitUntil` (non-blocking)
- [x] **Admin review**: via `SafetyMonitoring` component (in Lumen analytics panel)
- [ ] Comment moderation hook — spec'd, not wired
- [ ] Profile bio moderation hook — spec'd, not wired

#### Design spec (safari-approved)

Absent. Thorn is active in production. Needs a section explaining the moderation pipeline: content → Lumen moderation task → Thorn threshold evaluation → action → audit log.

---

### 12. Sentinel (`./sentinel`)

**Character**: The watcher. Infrastructure stress testing — runs load tests on Cloudflare resources to ensure Grove can handle growth.

#### Safari findings

- [x] **SentinelRunner** — executes load tests against D1, KV, R2
- [x] **Profile presets**: `createSpikeProfile`, `createSustainedProfile`, `createOscillationProfile`, `createRampProfile`, `createSmokeTestProfile`, `createStressTestProfile`, `createSoakTestProfile`
- [x] **Three-phase model**: ramp-up, sustained, ramp-down with configurable composition
- [x] **Traffic composition**: `TRAFFIC_COMPOSITION`, `getSystemWeights`, `selectWeightedSystem`
- [x] **Scheduler**: cron-triggered tests via `handleScheduledEvent`, `getWeeklyMidnightScheduleConfig`, `getDailySmokeTestConfig`
- [x] **SentinelDO** — Loom-based DO for tests > 30 seconds (avoids Worker CPU limits)
- [x] **Cost estimation**: `estimateCloudflareCost`
- [x] **Status types**: `ClearingStatus`, `IncidentSeverity`, `IncidentStatus` — ties into status page

#### Design spec (safari-approved)

Absent. Sentinel is an internal devops tool — probably doesn't need a public-facing spec section, but should be mentioned as part of the platform infrastructure overview.

---

### 13. Zephyr (`./zephyr`)

**Character**: The wind that carries Grove's words out into the world. Email delivery + social cross-posting in one client.

#### Safari findings

- [x] `ZephyrClient`, `zephyr` singleton, `createZephyrClient`
- [x] Types: `ZephyrRequest`, `ZephyrResponse`, `ZephyrConfig`, `EmailType`
- [x] Broadcasting: `BroadcastRequest`, `BroadcastResponse`, `SocialDelivery`, `SocialPlatform`
- [x] Has test suite (`client.test.ts`)
- [x] Factory pattern (`factory.ts`) — likely environment-aware client creation

#### Design spec (safari-approved)

Absent. Zephyr handles the "post is published → send it to the world" pipeline. Needs a section explaining the client's role, its relationship to the Zephyr service (separate backend), and the broadcast/social architecture.

---

### 14. Email (`./email`, `./email/*`)

**Character**: Grove's email infrastructure, built on React Email + Resend. Beautiful branded templates with Grove's warm voice.

#### Safari findings

- [x] **Components**: `./email/components` — Grove-branded React Email components (GroveEmail, GroveButton, etc.)
- [x] **Sequences**: `./email/sequences` — onboarding flow (Day 0, 1, 7...)
- [x] **Updates**: `./email/updates` — patch notes and announcements
- [x] **Porch**: `./email/porch` — lifecycle emails (subscription, renewals)
- [x] **Render**: `./email/render` — rendering utilities
- [x] **Schedule**: `./email/schedule` — scheduling via Resend
- [x] **URL helpers**: `./email/urls` — consistent link generation
- [x] **Types**: `./email/types` — EmailType, etc.
- [x] Dev server: `email dev -p 3001` for template preview
- [x] Export: `email export` for static export

#### Design spec (safari-approved)

Absent. The email module is surprisingly rich — not just "send an email" but a full email design system with templates, sequences, and scheduling. Needs its own section.

---

### 15. Server (`./server`)

**Character**: The server-side utilities that glue everything together.

#### Safari findings

- [x] **Rate limits**: Full re-export from `./rate-limits/` subdirectory
- [x] **Logger**: Structured logger
- [x] **Canopy Directory**: `fetchCanopyDirectory`, `CanopyWanderer`, `CategoryCount`, `CanopyDirectoryResult` — public directory of Grove sites
- [x] **Upload gate**: `canUploadImages`, `UploadGateResult`
- Additional server files (not in barrel): `billing.ts`, `activity-tracking.ts`, `encryption.ts`, `secrets-manager.ts`, `secrets.ts`, `tier-features.ts`, `inference-client.ts`, `env-validation.ts`, `curio-status.ts`, `origin.ts`

#### Design spec (safari-approved)

Spec mentions server utilities vaguely. Needs listing of the actual exported API surface. The non-exported utilities (encryption, secrets management) are also worth noting in architecture.

---

### 16. Config (`./config`)

**Character**: The single source of truth for everything configurable across Grove.

#### Safari findings

- [x] **Tiers**: Full 5-tier system — free/seedling/sapling/oak/evergreen
  - free (Wanderer): 25 posts, 100 MB, no AI
  - seedling ($8/mo): 100 posts, 1 GB, 750 AI words/mo
  - sapling ($12/mo, coming soon): unlimited posts, 5 GB, 3000 AI words/mo
  - oak ($25/mo, future): custom domain, BYOD, 20 GB
  - evergreen ($35/mo, future): domain included, 100 GB, dedicated support
- [x] **Presets**: `COLOR_PRESETS`, `FONT_PRESETS`, `DEFAULT_ACCENT_COLOR`, `DEFAULT_FONT`, `getFontFamily`
- [x] **Canopy categories**: `CANOPY_CATEGORIES`, `CANOPY_SETTINGS_SCHEMA`, `isValidCanopyCategory`
- [x] **Domain blocklist**: Reserved/protected domains
- [x] **Offensive blocklist**: Prohibited usernames/content
- [x] **AI models**: `OPENROUTER_MODELS`, `DEFAULT_OPENROUTER_MODEL`
- [x] **Auth config**: client IDs, etc.
- [x] **Wayfinder config**: Admin email list (`WAYFINDER_EMAILS`)
- [x] **Petal config** (from `petal.ts`)
- [x] **Terrarium config** (`./config/terrarium`)
- [x] **Wisp config** (`./config/wisp.ts`)

#### Design spec (safari-approved)

Spec has an incomplete tier table (only shows planned auth features, not actual tier limits). Needs the full `TIERS` structure documented — this is the canonical source of truth for pricing, features, and rate limits.

---

### 17. Scribe (`./scribe` — not yet in exports)

**Character**: The voice behind the keyboard. Browser audio recording for Wisp voice dictation.

#### Safari findings

- [x] `ScribeRecorder` class — full lifecycle management
- [x] Cross-browser: webm/opus (Chrome/Firefox), mp4 (Safari/iOS)
- [x] Warm-up phase: pre-requests microphone to reduce first-record latency
- [x] Audio level metering via Web Audio API (for waveform UI)
- [x] `getState()`, `isRecording()`, `checkMicrophonePermission()`
- [x] `warm()`, `start()`, `stop()`, `cancel()`, `dispose()` lifecycle
- [x] Returns `{ blob, data: Uint8Array, mimeType, duration }` on stop
- [ ] Not yet in `package.json` exports — internal to engine dev

#### Design spec (safari-approved)

Absent. Scribe is the foundation for Wisp's voice mode. Worth noting in the Wisp/Lumen section rather than standalone.

---

### 18. Utils (`./utils`)

**Character**: The utility belt. Everything you need, nothing you don't.

#### Safari findings

20+ utility modules:

- [x] `api` — `apiRequest()` with CSRF token injection + credentials
- [x] `cn` — Tailwind className merging (clsx + tailwind-merge)
- [x] `csrf` — `getCSRFToken()`, `validateCSRF()`
- [x] `debounce` — debounce factory
- [x] `shuffle` — `seededShuffle` (deterministic shuffle)
- [x] `gallery` — image filename parsing, metadata, search/filter
- [x] `gutter` — anchor parsing, gutter item grouping
- [x] `imageProcessor` — JXL encoding, WebP conversion, HEIC support
- [x] `json` — safe JSON parse/stringify
- [x] `markdown` — full markdown pipeline (markdown-it + rehype)
- [x] `markdown-hum` — Hum markdown variant
- [x] `markdown-directives` — custom markdown directive parsing
- [x] `markdown-mentions` — @username mention plugin
- [x] `readability` — reading time, word count
- [x] `sanitize` — DOMPurify HTML sanitization
- [x] `user` — display name, avatar URL helpers
- [x] `trace-path` — debug tracing utilities
- [x] `validation` — input validation (slugs, URLs, emails)
- [x] `webauthn` — WebAuthn credential handling
- [x] `webhook-sanitizer` — webhook payload sanitization
- [x] `grove-url` — URL construction for Grove resources
- [x] `rehype-groveterm` — rehype plugin for Grove term linking
- [x] `upload-validation` — `getActionableUploadError()`

#### Design spec (safari-approved)

Spec barely mentions utilities. The CSRF pattern (`apiRequest` from `./utils/api`) is particularly important — all client-side API calls must go through it.

---

### 19. Auth (`./auth`)

**Character**: Session utilities. Thin layer over the Heartwood cookie system.

#### Safari findings

- [x] `session.ts` — session management utilities
- [x] Has test file
- [x] Export path: `./auth` and `./auth/*`

---

### 20. Payments (`./payments`)

**Character**: Provider-agnostic payment abstraction. Ready for Stripe, LemonSqueezy, or whatever comes next.

#### Safari findings

- [x] Abstract types: `Money`, `PricingType`, `BillingInterval`, `RecurringConfig`
- [x] `ProductType`, `ProductStatus` — product catalog types
- [x] LemonSqueezy is in dependencies (`@lemonsqueezy/lemonsqueezy.js`)

---

### 21. Durable Objects (`./durable-objects`)

**Character**: The memory Grove doesn't lose between requests.

#### Safari findings

- [x] **TenantDO** (types only): `TenantConfig`, `TierLimits`, `Draft`, `DraftMetadata`, `AnalyticsEvent`
- [x] **PostMetaDO** (class + types): `PostMeta`, `ReactionCounts`, `ReactionEvent`, `PresenceInfo`
- [x] **PostContentDO** (class + types): `PostContent`, `ContentUpdate`
- Note: Actual DO instances deployed in `services/durable-objects/` (separate worker), referenced via `script_name` binding

---

### 22. Errors (`./errors`)

**Character**: Typed error codes across every layer.

#### Safari findings

- [x] `api-errors.ts` — API-level errors
- [x] `arbor-errors.ts` — Admin panel errors
- [x] `site-errors.ts` — Site-level errors
- [x] `helpers.ts` — error utilities
- [x] `integrity.test.ts` — tests that error codes haven't drifted
- [x] `types.ts` — shared error type interfaces

---

### 23. Data (`./data`)

**Character**: Generated artifacts.

#### Safari findings

- [x] `grove-term-manifest.json` — generated by `scripts/generate/grove-term-manifest.ts` during pre-package. Powers the `rehypeGroveTerm` plugin.
- [x] Has test file

---

### 24. Git (`./git`)

**Character**: Git-related utilities (likely for the Timeline + Journey curios).

#### Safari findings

- [x] `index.ts`, `index.test.ts` — unknown internals (likely repo data fetching helpers)

---

## Expedition Summary

### By the numbers

| Metric                       | Count                  |
| ---------------------------- | ---------------------- |
| Total subsystems surveyed    | 24                     |
| Thriving 🟢                  | 19                     |
| Growing 🟡                   | 4                      |
| Absent from spec ❌          | 18                     |
| Wrong in spec 🔴             | 2 (auth, package name) |
| Partial in spec 🟡           | 3                      |
| Export paths in package.json | ~47                    |
| Curio types                  | 22                     |
| UI component categories      | 14                     |
| Test files                   | 100+                   |

### Cross-cutting themes

1. **Package identity**: Spec says `@lattice/core`, reality says `@autumnsgrove/lattice`. Package is dual-registry (npmjs.com for public releases + GitHub Packages for monorepo/CI) — the spec's npmjs.com reference is correct, but the package name and version need updating.

2. **Auth is completely wrong**: Spec describes a magic-code-via-Resend system that was never built. Reality is Heartwood OAuth (PKCE, Google, passkeys, 2FA). The entire auth section needs replacement.

3. **AI is a first-class citizen**: Lumen, Thorn, Scribe, Wisp, Timeline curio — AI is woven through the platform. The spec has zero mention of AI.

4. **Grove vocabulary**: The spec uses generic terms (posts, users, sessions). The actual codebase has Grove vocabulary: blooms, wanderers, grafts, curios, the grove, canopy, heartwood, loom, thorn, threshold, lumen, zephyr, sentinel. The spec should use Grove language.

5. **Tier system is real**: Five tiers (free/seedling/sapling/oak/evergreen), live pricing, feature gates, rate limits per tier — all defined in `config/tiers.ts`. Spec has no tier section.

6. **The deployment model is wrong**: Spec shows "customer installs @lattice/core and deploys their blog." Reality: monorepo internal SDK used by all Grove packages (landing, meadow, plant, clearing, terrarium, etc.).

7. **Nature components**: An entire animated seasonal nature system exists (botanical, sky, weather, etc.). Not mentioned anywhere in spec.

---

## Recommended spec structure

```
# Lattice — Grove Platform SDK

## Identity
## Architecture
  ### Tech Stack (updated: Svelte 5, Tiptap, React Email, etc.)
  ### Deployment Model (monorepo SDK)
  ### Package Configuration (real exports, AGPL, GitHub registry)

## Core Subsystems
  ### Heartwood — Authentication
  ### Threshold — Rate Limiting
  ### Loom — Durable Object Framework
  ### Lumen — AI Gateway
  ### Thorn — Content Moderation
  ### Feature Flags & Grafts
  ### Zephyr — Publishing

## User-Facing Features
  ### Curios (22 widgets)
  ### UI System & Design Components
  ### Email Infrastructure

## Platform Configuration
  ### Tiers & Pricing
  ### Config Constants

## Implementation Status (updated)
```

---

_The fire dies to embers. 24 stops, the whole landscape mapped. Tomorrow, we write the spec._
