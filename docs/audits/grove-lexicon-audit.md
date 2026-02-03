# Grove Lexicon Audit Report

**Issue:** #925 - Integrate Grove terminology UI and Waystone Lexicon Elements
**Generated:** 2026-02-03
**Purpose:** Complete hit list of all locations using Grove lexicon terms that may need `<GroveTerm>` integration

---

## Executive Summary

This audit identified **400+ locations** across the codebase where Grove lexicon terms appear in user-facing code. The most heavily used terms are:

| Term | Files | Priority |
|------|-------|----------|
| Bloom/Blooms | 40+ | High - emails, roadmap, workshop |
| Wanderer | 45+ | High - user identity, greetings |
| Seedling/Sapling/Oak/Evergreen | 100+ | High - pricing, features |
| Lumen | 66 | Medium - internal service |
| Grafts | 42 | Medium - feature flags |
| Rooted | 20+ | High - subscriber identity |

---

## FOUNDATIONAL TERMS

### Garden (Blog/Collection)

| File | Lines | Context |
|------|-------|---------|
| `packages/landing/src/routes/workshop/+page.svelte` | 117-135 | **CRITICAL** - Product definition |
| `packages/landing/src/routes/manifesto/+page.svelte` | 106-146 | "THE GARDEN THAT WAS" narrative |
| `packages/landing/src/routes/forest/+page.svelte` | 841 | "neighborhoods in a garden city" |
| `packages/plant/src/lib/server/lemonsqueezy.ts` | 146 | "Your garden awaits" email |
| `packages/plant/src/routes/api/check-username/+server.ts` | 107 | Username suffix option |
| `packages/domains/src/routes/admin/searcher/+page.svelte` | 206 | Domain suffix `.garden` |
| `packages/engine/src/lib/ui/components/nature/structural/Lattice.svelte` | 28 | Component comment |
| `packages/engine/src/lib/ui/components/nature/structural/GardenGate.svelte` | 26 | Component comment |

### Bloom/Blooms (Posts/Writing)

| File | Lines | Context |
|------|-------|---------|
| `packages/landing/src/routes/workshop/+page.svelte` | 118, 128-136 | **CRITICAL** - Product definition |
| `packages/landing/src/routes/roadmap/+page.svelte` | 65-1042 | Phase names: "full-bloom", "midnight-bloom" |
| `packages/plant/src/lib/server/lemonsqueezy.ts` | 146 | Subscription email |
| `packages/landing/src/lib/email/templates.ts` | 102, 153 | "Ready to bloom" messaging |
| `packages/engine/src/lib/email/lifecycle/RenewalThankYou.tsx` | - | Renewal email |
| `packages/engine/src/lib/email/updates/PatchNotesEmail.tsx` | - | Feature updates |
| `packages/engine/src/lib/email/sequences/WelcomeEmail.tsx` | - | Welcome sequence |
| `packages/engine/src/lib/email/sequences/Day7Email.tsx` | - | Inspiration emails |
| `packages/meadow/src/lib/components/EmailSignup.svelte` | 62, 73 | "Grove blooms" messaging |
| `packages/engine/src/lib/ui/tailwind.preset.js` | 185-186, 228 | Bloom animation |
| `packages/engine/src/lib/ui/components/nature/palette.ts` | 75, 129-206 | Color palettes |
| `packages/engine/src/lib/ui/components/nature/water/LilyPad.svelte` | 64-100 | CSS animation |
| `packages/engine/src/routes/(apps)/domains/+page.svelte` | 112 | "Coming in Full Bloom" |
| `packages/engine/src/routes/admin/curios/journey/+page.svelte` | 41 | "Coming in Full Bloom" |

### Wanderer (User)

| File | Lines | Context |
|------|-------|---------|
| `packages/engine/src/lib/email/types.ts` | 14, 18, 88-111 | **CRITICAL** - Audience type definitions |
| `packages/engine/src/lib/utils/user.ts` | 4, 19, 25, 29-30 | **CRITICAL** - Default display name |
| `packages/engine/src/lib/utils/user.test.ts` | 10, 21-34 | Test cases |
| `packages/engine/src/lib/grafts/login/index.ts` | 21 | "Welcome back, Wanderer" |
| `packages/engine/src/lib/grafts/login/LoginGraft.svelte` | 23, 176 | Login greeting |
| `packages/engine/src/lib/ui/components/chrome/MobileMenu.svelte` | 203 | Mobile menu display |
| `packages/plant/src/lib/components/OnboardingChecklist.svelte` | 172 | "Let's get started, Wanderer" |
| `packages/landing/src/routes/workshop/+page.svelte` | 112, 154, 198, 231, 260, 266, 368, 514, 518, 566, 643 | Multiple descriptions |
| `packages/landing/src/routes/admin/feedback/+page.svelte` | 112, 151, 203, 240 | "Wanderer Feedback" |
| `packages/landing/src/routes/admin/porch/+page.svelte` | 62 | Support conversations |
| `packages/landing/src/routes/contact/+page.svelte` | 28 | Help link |
| `packages/landing/src/routes/knowledge/+page.svelte` | 59 | "guides for Wanderers" |
| `packages/landing/src/routes/porch/new/+page.server.ts` | 207, 228 | Porch messages |
| `packages/landing/src/routes/porch/visits/[id]/+page.server.ts` | 127, 148, 158 | Visitor naming |
| `packages/landing/src/routes/porch/visits/+page.svelte` | 59 | "signed-in wanderers" |
| `workers/email-catchup/worker.ts` | 29, 49, 335 | Email sequences |
| `workers/email-render/src/worker.ts` | 10, 96, 121 | Email rendering |
| `packages/engine/src/lib/email/sequences/WelcomeEmail.tsx` | 6, 23 | Welcome email |
| `packages/engine/src/lib/email/sequences/Day7Email.tsx` | 5, 22 | Day 7 email |
| `packages/engine/src/lib/email/sequences/Day14Email.tsx` | 5, 18 | Philosophy email |
| `packages/engine/src/lib/email/sequences/Day30Email.tsx` | 5, 18 | Check-in email |

### Rooted (Subscriber)

| File | Lines | Context |
|------|-------|---------|
| `packages/engine/src/lib/email/types.ts` | 16, 18, 111-115 | **CRITICAL** - Audience type |
| `packages/engine/src/lib/email/lifecycle/RenewalThankYou.tsx` | 4, 26, 30 | "Thank you for staying rooted" |
| `packages/engine/src/lib/email/lifecycle/GentleNudge.tsx` | 4 | Inactive rooted users |
| `packages/engine/src/lib/email/sequences/WelcomeEmail.tsx` | 8, 52 | Rooted welcome |
| `packages/engine/src/lib/grafts/pricing/PricingFineprint.svelte` | 25, 49 | **CRITICAL** - "Rooted Evergreens" |
| `packages/engine/src/routes/admin/+page.svelte` | 86-91, 411-417 | **CRITICAL** - Rooted badge |
| `packages/landing/src/routes/workshop/+page.svelte` | 266 | "Rooted Wanderers" |
| `packages/landing/src/routes/support/+page.svelte` | 115 | "Thank you for being rooted" |
| `packages/plant/src/lib/server/email-verification.ts` | 197 | Default identity |
| `workers/email-catchup/worker.ts` | 29, 59, 364 | Email sequences |
| `workers/email-render/src/worker.ts` | 96, 121 | Email rendering |

---

## IDENTITY & TIER TERMS

### Pathfinder (Trusted Guide)

| File | Lines | Context |
|------|-------|---------|
| `packages/landing/src/routes/contact/+page.svelte` | 28 | Help link URL |
| `packages/engine/src/routes/admin/+page.svelte` | 83 | Help URL reference |
| `scripts/generate/analyze-doc-keywords.ts` | 414 | Keyword analysis |

### Wayfinder (Autumn)

| File | Lines | Context |
|------|-------|---------|
| `packages/landing/src/routes/admin/+layout.svelte` | 52, 57 | Admin tabs variable |
| `packages/engine/src/routes/admin/settings/+page.server.ts` | 249 | Fallback value |
| `scripts/generate/analyze-doc-keywords.ts` | 415 | Keyword analysis |

### Seedling (Tier)

| File | Lines | Context |
|------|-------|---------|
| `packages/durable-objects/src/tiers.ts` | 206 | Tier definition |
| `packages/engine/src/lib/config/tiers.ts` | 206 | Tier definition |
| `packages/vineyard/src/lib/components/vineyard/TierGate.svelte` | 38 | UI mapping |
| `packages/engine/src/lib/ui/vineyard/TierGate.svelte` | 38 | UI mapping |
| `packages/landing/src/routes/pricing/+page.svelte` | 57 | "We're launching with Seedling" |
| `packages/landing/src/routes/+page.svelte` | 69 | "$8/month (Seedling)" |
| `packages/landing/src/routes/roadmap/+page.svelte` | 123 | Roadmap tier |
| `packages/engine/src/lib/grafts/pricing/PricingFineprint.svelte` | 32, 37, 44, 86, 95 | Pricing descriptions |
| `packages/plant/src/lib/server/stripe.ts` | 46 | Stripe tier |
| `packages/plant/src/lib/server/lemonsqueezy.ts` | 46 | Lemonsqueezy tier |
| `packages/plant/src/routes/plans/+page.svelte` | 284 | Navigation limits |
| `packages/engine/src/routes/admin/comped-invites/+page.svelte` | 56 | Tier selector |
| `packages/engine/src/lib/lumen/quota/limits.ts` | 45 | AI quota |

### Sapling (Tier)

| File | Lines | Context |
|------|-------|---------|
| `packages/durable-objects/src/tiers.ts` | 264 | Tier definition |
| `packages/engine/src/lib/config/tiers.ts` | 264 | Tier definition |
| `packages/vineyard/src/lib/components/vineyard/TierGate.svelte` | 39 | UI mapping |
| `packages/engine/src/lib/ui/vineyard/TierGate.svelte` | 39 | UI mapping |
| `packages/landing/src/routes/workshop/+page.svelte` | 239, 242 | Centennial feature |
| `packages/landing/src/routes/roadmap/+page.svelte` | 140 | Roadmap tier |
| `packages/engine/src/routes/admin/pages/+page.svelte` | 101 | Custom pages copy |
| `packages/engine/src/lib/grafts/pricing/PricingFineprint.svelte` | 37, 42, 67, 69, 86, 95 | Pricing docs |
| `packages/plant/src/lib/server/stripe.ts` | 43 | Stripe tier |
| `packages/plant/src/lib/server/lemonsqueezy.ts` | 51 | Lemonsqueezy tier |
| `packages/plant/src/routes/plans/+page.svelte` | 285 | Navigation pages |
| `packages/engine/src/routes/admin/comped-invites/+page.svelte` | 57 | Tier selector |
| `packages/engine/src/lib/lumen/quota/limits.ts` | 57 | AI quota |

### Oak (Tier)

| File | Lines | Context |
|------|-------|---------|
| `packages/durable-objects/src/tiers.ts` | 322 | Tier definition |
| `packages/engine/src/lib/config/tiers.ts` | 322 | Tier definition |
| `packages/vineyard/src/lib/components/vineyard/TierGate.svelte` | 40 | UI mapping |
| `packages/engine/src/lib/ui/vineyard/TierGate.svelte` | 40 | UI mapping |
| `packages/landing/src/routes/+page.svelte` | 59 | Domain feature |
| `packages/engine/src/routes/admin/timeline/+page.svelte` | 65 | Timeline feature |
| `packages/engine/src/lib/grafts/pricing/PricingFineprint.svelte` | 37, 42, 54, 86, 93, 95 | Pricing docs |
| `packages/plant/src/lib/server/stripe.ts` | 48 | Stripe tier |
| `packages/plant/src/lib/server/lemonsqueezy.ts` | 56 | Lemonsqueezy tier |
| `packages/plant/src/routes/plans/+page.svelte` | 285 | Navigation pages |
| `packages/landing/src/routes/roadmap/+page.svelte` | 163 | Roadmap |
| `packages/landing/src/routes/workshop/+page.svelte` | 581 | Feature description |
| `packages/engine/src/routes/admin/comped-invites/+page.svelte` | 58 | Tier selector |
| `packages/engine/src/lib/lumen/quota/limits.ts` | 69 | AI quota |

### Evergreen (Tier)

| File | Lines | Context |
|------|-------|---------|
| `packages/durable-objects/src/tiers.ts` | 380 | Tier definition |
| `packages/engine/src/lib/config/tiers.ts` | 380 | Tier definition |
| `packages/engine/src/routes/admin/comped-invites/+page.svelte` | 59 | UI mapping |
| `packages/landing/src/routes/+page.svelte` | 59 | Domain registration |
| `packages/engine/src/lib/grafts/pricing/PricingFineprint.svelte` | 25, 37, 42, 54, 62, 64, 86, 93 | Pricing docs |
| `packages/plant/src/lib/server/stripe.ts` | 53 | Stripe tier |
| `packages/plant/src/lib/server/lemonsqueezy.ts` | 61 | Lemonsqueezy tier |
| `packages/plant/src/routes/plans/+page.svelte` | 285 | Navigation pages |
| `packages/landing/src/routes/pricing/full/+page.svelte` | 60 | "Beyond Evergreen" |
| `packages/landing/src/routes/roadmap/+page.svelte` | 163 | Roadmap |
| `packages/landing/src/routes/workshop/+page.svelte` | 549, 581 | Features |
| `packages/engine/src/lib/lumen/quota/limits.ts` | 81 | AI quota |

---

## PLATFORM SERVICES

### Heartwood (Authentication)

| File | Lines | Context |
|------|-------|---------|
| `packages/landing/src/routes/workshop/+page.svelte` | 77, 84 | Workshop listing |
| `packages/vineyard/src/lib/components/vineyard/VineyardLayout.svelte` | 30 | Description |
| `packages/domains/src/hooks.server.ts` | 4, 45, 47-51, 95, 106 | Auth references |
| `packages/domains/src/app.d.ts` | 18 | Service binding |
| `packages/engine/src/app.d.ts` | 11, 13, 54 | User/auth context |

### Arbor (Admin Panel)

| File | Lines | Context |
|------|-------|---------|
| `packages/landing/src/routes/workshop/+page.svelte` | 160-162, 178, 181, 269, 482 | Workshop descriptions |
| `packages/landing/src/routes/api/webhooks/email-feedback/+server.ts` | 138, 153 | Email notifications |
| `packages/landing/src/routes/porch/visits/[id]/+page.server.ts` | 155, 167 | Porch emails |
| `packages/plant/src/lib/server/tenant.ts` | 73 | Default settings |
| `packages/engine/src/routes/admin/+layout.svelte` | 83, 86, 129 | Admin header |
| `packages/landing/src/lib/utils/icons.ts` | 440-442 | Icon docs |

### Plant (Onboarding)

| File | Lines | Context |
|------|-------|---------|
| `packages/meadow/src/routes/+page.svelte` | 204 | CTA text |
| `packages/landing/src/routes/workshop/+page.svelte` | 192-194 | Service description |
| `packages/plant/src/routes/+page.svelte` | 152 | Blog signup CTA |
| `packages/plant/src/routes/+layout.svelte` | 48, 63, 69 | Plant layout |
| `packages/landing/src/routes/+page.svelte` | 179, 184 | Homepage CTAs |
| `packages/landing/src/routes/go/[...path]/+server.ts` | 46 | Signup redirect |

### Amber (Storage)

| File | Lines | Context |
|------|-------|---------|
| `packages/vineyard/src/lib/components/vineyard/VineyardLayout.svelte` | 24 | Description |
| `packages/landing/src/routes/workshop/+page.svelte` | 225, 232 | Workshop description |
| `packages/engine/src/routes/admin/curios/+page.svelte` | 15 | Admin text |
| `packages/engine/src/routes/admin/curios/gallery/+page.svelte` | 87, 210, 213, 271 | Gallery features |
| `packages/landing/src/lib/utils/icons.ts` | 553 | Icon docs |

### Foliage (Theming)

| File | Lines | Context |
|------|-------|---------|
| `packages/landing/src/routes/workshop/+page.svelte` | 284, 290 | Service listing |
| `packages/vineyard/src/lib/components/vineyard/VineyardLayout.svelte` | 26 | Description |
| `packages/landing/src/routes/roadmap/+page.svelte` | 143, 164 | Roadmap |
| `packages/engine/src/routes/vineyard/+page.svelte` | 45, 927 | Palette display |
| `packages/engine/src/lib/ui/components/ui/GlassLogo.svelte` | 349, 406 | Logo gradients |
| `packages/landing/src/lib/utils/icons.ts` | 427-429, 556 | Icon docs |

### Terrarium (Creative Canvas)

| File | Lines | Context |
|------|-------|---------|
| `packages/landing/src/routes/workshop/+page.svelte` | 315, 333, 336 | Service description |
| `packages/terrarium/src/routes/+page.svelte` | 50, 70 | Responsive messaging |
| `packages/engine/src/routes/terrarium/+page.svelte` | 41, 48, 58 | Title and messaging |
| `packages/engine/src/lib/ui/components/terrarium/Terrarium.svelte` | 30-32, 39 | Component docs |
| `packages/landing/src/routes/roadmap/+page.svelte` | 166 | Roadmap |
| `packages/engine/src/lib/config/terrarium.ts` | 2, 4 | Configuration |

### Curios (Cabinet of Wonders)

| File | Lines | Context |
|------|-------|---------|
| `packages/landing/src/routes/workshop/+page.svelte` | 300 | Service listing |
| `packages/engine/src/routes/admin/curios/+page.svelte` | 53, 61, 62 | Admin header |
| `packages/engine/src/routes/admin/pages/+page.svelte` | 168, 173, 176 | Feature description |
| `packages/engine/src/routes/admin/account/FeaturesCard.svelte` | 29, 45, 61 | Feature descriptions |
| `packages/engine/src/lib/grafts/pricing/PricingFineprint.svelte` | 40-42 | Pricing details |
| `packages/landing/src/lib/utils/icons.ts` | 405-407, 589 | Icon docs |

### Waystone (Help Center)

| File | Lines | Context |
|------|-------|---------|
| `packages/landing/src/routes/workshop/+page.svelte` | 352, 354 | Service description |
| `packages/engine/src/lib/ui/components/ui/waystone/types.ts` | 2, 4, 9, 28, 31, 34 | Type definitions |
| `packages/engine/src/lib/ui/components/ui/waystone/Waystone.svelte` | 7, 13-14, 57, 65, 71 | Component |
| `packages/engine/src/routes/admin/timeline/+page.svelte` | 11 | Help integration |
| `packages/engine/src/routes/admin/settings/+page.svelte` | 741, 965 | Settings help |
| `packages/engine/src/routes/admin/analytics/+page.svelte` | 11 | Analytics help |
| `packages/engine/src/routes/admin/curios/gallery/+page.svelte` | 81 | Gallery help |

### Porch (Support)

| File | Lines | Context |
|------|-------|---------|
| `packages/landing/src/routes/workshop/+page.svelte` | 362-363 | Service description |
| `packages/landing/src/routes/porch/+page.svelte` | 25 | Homepage title |
| `packages/landing/src/routes/porch/visits/[id]/+page.svelte` | 43 | Page title |
| `packages/landing/src/routes/porch/new/+page.svelte` | 39, 264 | Visit creation |
| `packages/landing/src/routes/porch/new/+page.server.ts` | 205, 207, 223, 245, 263 | Email templates |
| `packages/landing/src/routes/admin/porch/+page.svelte` | 56, 61 | Admin interface |
| `packages/landing/src/routes/admin/+layout.svelte` | 53 | Admin navigation |
| `packages/landing/src/lib/utils/icons.ts` | 477, 586 | Icon docs |

### Clearing (Status Page)

| File | Lines | Context |
|------|-------|---------|
| `packages/landing/src/routes/workshop/+page.svelte` | 148, 155 | Service listing |
| `packages/clearing/src/routes/+page.svelte` | 3 | Status component |
| `workers/clearing-monitor/src/index.ts` | 2, 4 | Monitor docs |
| `packages/engine/src/routes/vineyard/+page.svelte` | 480, 495 | Status widget |
| `packages/engine/src/lib/ui/components/ui/GlassStatusWidget.svelte` | 3, 5, 54 | Widget component |
| `packages/landing/src/routes/roadmap/+page.svelte` | 110 | Roadmap |
| `packages/landing/src/lib/utils/icons.ts` | 579 | Icon docs |

---

## CONTENT & COMMUNITY

### Wisp (Writing Assistant)

| File | Lines | Context |
|------|-------|---------|
| `packages/landing/src/routes/workshop/+page.svelte` | 461, 463 | Service listing |
| `packages/landing/src/routes/roadmap/+page.svelte` | 142 | Roadmap |
| `packages/engine/src/lib/config/wisp.ts` | 2, 4 | Configuration |
| `packages/engine/src/routes/api/grove/wisp/+server.ts` | 2-317 | API endpoint |
| `packages/engine/src/routes/api/grove/wisp/fireside/+server.ts` | - | Fireside endpoint |
| `packages/engine/src/lib/components/WispPanel.svelte` | - | UI panel |
| `packages/engine/src/lib/components/WispButton.svelte` | - | UI button |

### Fireside (Conversation Mode)

| File | Lines | Context |
|------|-------|---------|
| `packages/landing/src/routes/workshop/+page.svelte` | 178, 186, 463, 471 | Service description |
| `packages/engine/src/routes/api/grove/wisp/fireside/fireside.ts` | - | Types |
| `packages/engine/src/routes/api/grove/wisp/fireside/+server.ts` | - | API endpoint |
| `packages/engine/src/lib/components/admin/FiresideChat.svelte` | - | Chat component |
| `packages/engine/src/lib/components/admin/MarkdownEditor.svelte` | 118-367, 782-887 | Editor integration |
| `packages/engine/src/lib/grafts/pricing/PricingFineprint.svelte` | 86, 88 | Pricing |

### Scribe (Voice Transcription)

| File | Lines | Context |
|------|-------|---------|
| `packages/landing/src/routes/workshop/+page.svelte` | 477 | Service listing |
| `packages/engine/src/routes/api/lumen/transcribe/+server.ts` | - | API endpoint |
| `packages/engine/src/lib/scribe/recorder.ts` | - | Recorder class |
| `packages/engine/src/lib/scribe/recorder.test.ts` | - | Tests |
| `packages/engine/src/lib/components/admin/VoiceInput.svelte` | - | UI component |
| `packages/engine/src/lib/lumen/types.ts` | 255, 270 | Type definitions |

### Reeds (Comments)

| File | Lines | Context |
|------|-------|---------|
| `packages/landing/src/routes/workshop/+page.svelte` | 494, 496 | Service listing |
| `packages/landing/src/routes/roadmap/+page.svelte` | 160 | Roadmap |
| `packages/landing/src/routes/vineyard/+page.svelte` | 33, 160, 215 | Showcase |
| `packages/engine/src/lib/ui/components/nature/water/Reeds.svelte` | - | Nature component |

### Thorn (Content Moderation)

| File | Lines | Context |
|------|-------|---------|
| `packages/landing/src/routes/workshop/+page.svelte` | 431, 433 | Service listing |
| `packages/landing/src/routes/roadmap/+page.svelte` | 162 | Roadmap |
| `packages/engine/src/lib/thorn/types.ts` | - | Type definitions |
| `packages/engine/src/lib/thorn/moderate.ts` | - | Core function |
| `packages/engine/src/lib/thorn/config.ts` | - | Configuration |
| `packages/engine/src/lib/thorn/index.ts` | - | Exports |
| `packages/engine/src/lib/thorn/thorn.test.ts` | - | Tests |

### Meadow (Social)

| File | Lines | Context |
|------|-------|---------|
| `packages/landing/src/routes/workshop/+page.svelte` | 415, 417 | Service listing |
| `packages/landing/src/routes/roadmap/+page.svelte` | 157 | Roadmap |
| `packages/meadow/src/routes/+page.svelte` | - | Main page |
| `packages/engine/src/lib/config/tiers.ts` | 8, 153, 157, 216 | Tier config |
| `packages/engine/src/lib/grafts/pricing/PricingFineprint.svelte` | 25, 32 | Pricing |
| `packages/engine/src/lib/grafts/pricing/PricingTable.svelte` | 104 | Pricing table |

### Forests (Communities)

| File | Lines | Context |
|------|-------|---------|
| `packages/landing/src/routes/workshop/+page.svelte` | 508, 510 | Service listing |
| `packages/landing/src/routes/roadmap/+page.svelte` | 141 | Roadmap |
| `packages/landing/src/routes/forest/+page.svelte` | 833, 841 | Landing page |

### Wander (Discovery)

| File | Lines | Context |
|------|-------|---------|
| `packages/landing/src/routes/workshop/+page.svelte` | 523, 566 | Service listing |
| `packages/landing/src/routes/roadmap/+page.svelte` | 178 | Roadmap |

### Trails (Roadmaps)

| File | Lines | Context |
|------|-------|---------|
| `packages/landing/src/routes/workshop/+page.svelte` | 405 | Service listing |
| `packages/landing/src/routes/roadmap/+page.svelte` | 146 | Roadmap |
| `packages/engine/src/routes/admin/timeline/+page.svelte` | 11, 24, 163-165 | Admin integration |
| `packages/vineyard/src/lib/components/vineyard/VineyardLayout.svelte` | 29 | Vineyard description |
| `packages/engine/src/lib/ui/vineyard/VineyardLayout.svelte` | 30 | UI layout |

---

## TOOLS

### Ivy (Email)

| File | Lines | Context |
|------|-------|---------|
| `packages/landing/src/routes/workshop/+page.svelte` | 575, 582 | Service listing |
| `packages/landing/src/routes/roadmap/+page.svelte` | 145 | Roadmap |
| `packages/grove-router/src/index.ts` | 32 | Router config |
| `packages/vineyard/src/lib/components/vineyard/VineyardLayout.svelte` | 25 | Description |

### Forage (Domain Discovery)

| File | Lines | Context |
|------|-------|---------|
| `packages/landing/src/routes/workshop/+page.svelte` | 543, 550 | Service listing |
| `packages/landing/src/routes/roadmap/+page.svelte` | 113 | Roadmap |
| `packages/domains/src/routes/+page.svelte` | - | Main page |
| `packages/engine/src/routes/(apps)/domains/+page.svelte` | 3-54 | App page |
| `packages/domains/src/routes/api/search/start/+server.ts` | 4 | API |

### Trove (Book Finder)

| File | Lines | Context |
|------|-------|---------|
| `packages/landing/src/routes/beyond/+page.svelte` | 65, 67, 72 | Beyond page |
| `packages/grove-router/src/index.ts` | 61 | Router config |

### Nook (Video Sharing)

| File | Lines | Context |
|------|-------|---------|
| `packages/landing/src/routes/workshop/+page.svelte` | 624, 630 | Service listing |
| `packages/grove-router/src/index.ts` | 60 | Router config |

### Shutter (Web Distillation)

| File | Lines | Context |
|------|-------|---------|
| `packages/landing/src/routes/beyond/+page.svelte` | 42, 49 | Beyond page |
| `packages/engine/src/lib/lumen/types.ts` | 101, 102, 407-424, 436-468 | Types |
| `packages/engine/src/lib/lumen/shutter.ts` | - | Integration stubs |
| `packages/engine/src/lib/lumen/index.ts` | 95-100, 121 | Exports |

### Aria (Music)

| File | Lines | Context |
|------|-------|---------|
| `packages/landing/src/routes/beyond/+page.svelte` | 55, 57 | Beyond page |

### Etch (Link Saving)

| File | Lines | Context |
|------|-------|---------|
| `packages/landing/src/routes/workshop/+page.svelte` | 637 | Service listing |

### Outpost (Minecraft)

| File | Lines | Context |
|------|-------|---------|
| `packages/landing/src/routes/workshop/+page.svelte` | 560 | Service listing |
| `packages/landing/src/routes/roadmap/+page.svelte` | 169 | Roadmap |
| `packages/grove-router/src/index.ts` | 67 | Router config |

---

## OPERATIONS & INFRASTRUCTURE

### Lumen (AI Gateway)

| File | Lines | Context |
|------|-------|---------|
| `packages/engine/src/lib/lumen/` | - | **Core system** (11 files) |
| `packages/engine/src/lib/lumen/client.ts` | - | Main client |
| `packages/engine/src/lib/lumen/router.ts` | - | Task routing |
| `packages/engine/src/lib/lumen/types.ts` | - | Type definitions |
| `packages/engine/src/lib/lumen/config.ts` | - | Configuration |
| `packages/engine/src/lib/server/petal/lumen-classify.ts` | 2, 39, 41 | Image classification |
| `packages/engine/src/routes/api/lumen/transcribe/+server.ts` | 113, 156 | Transcription |
| `packages/landing/src/routes/workshop/+page.svelte` | 696-698, 833 | Documentation |

### Zephyr (Email Gateway)

| File | Lines | Context |
|------|-------|---------|
| `workers/zephyr/src/index.ts` | 2 | Main module |
| `workers/zephyr/src/types.ts` | 2, 12, 23, 189 | Types |
| `workers/zephyr/src/middleware/rate-limit.ts` | - | Rate limiting |
| `workers/zephyr/src/middleware/auth.ts` | 57 | Auth |
| `workers/zephyr/src/handlers/send.ts` | 250 | Send handler |
| `workers/zephyr/src/providers/resend.ts` | 83 | Provider |
| `packages/engine/src/lib/zephyr/client.ts` | 2, 4, 180 | Client |
| `packages/engine/src/lib/zephyr/types.ts` | 2, 4 | Types |
| `packages/landing/src/routes/workshop/+page.svelte` | 710-712 | Documentation |

### Vista (Observability)

| File | Lines | Context |
|------|-------|---------|
| `packages/engine/src/routes/(apps)/monitor/+page.svelte` | 3, 6, 19, 44 | Dashboard |
| `packages/landing/src/routes/workshop/+page.svelte` | 752-754, 848 | Documentation |
| `packages/grove-router/src/index.ts` | 63 | Router config |
| `packages/engine/src/routes/admin/+layout.svelte` | 30, 130, 134 | Admin integration |
| `packages/landing/src/lib/utils/icons.ts` | 447, 460 | Icon mapping |

### Patina (Backups)

| File | Lines | Context |
|------|-------|---------|
| `packages/landing/src/routes/workshop/+page.svelte` | 676-678, 682 | Documentation |
| `packages/landing/src/routes/roadmap/+page.svelte` | 111 | Roadmap |
| `packages/landing/src/lib/utils/icons.ts` | 550 | Icon mapping |

### Mycelium (MCP Server)

| File | Lines | Context |
|------|-------|---------|
| `packages/landing/src/routes/workshop/+page.svelte` | 724-726 | Documentation |
| `packages/landing/src/lib/utils/icons.ts` | 549 | Icon mapping |

### Shade (AI Protection)

| File | Lines | Context |
|------|-------|---------|
| `packages/landing/src/routes/shade/+page.svelte` | - | Landing page |
| `packages/landing/src/routes/workshop/+page.svelte` | 659-661 | Documentation |
| `packages/landing/src/routes/roadmap/+page.svelte` | 131 | Roadmap |
| `packages/landing/src/routes/+page.svelte` | 49, 304 | Homepage |
| `packages/engine/src/routes/verify/+page.svelte` | 2, 77 | Verification |
| `packages/engine/src/hooks.server.ts` | 286, 582 | Turnstile middleware |
| `packages/engine/src/lib/server/services/turnstile.ts` | 2, 5 | Verification |
| `packages/engine/src/lib/ui/components/forms/TurnstileWidget.svelte` | 3 | UI component |
| `packages/landing/src/lib/utils/icons.ts` | 445-446, 454, 461, 475 | Icon mappings |

### Press (Image Processing)

| File | Lines | Context |
|------|-------|---------|
| `packages/landing/src/routes/workshop/+page.svelte` | 686-688 | Documentation |
| `packages/landing/src/routes/admin/cdn/+page.svelte` | 269 | CLI reference |

### Rings (Analytics)

| File | Lines | Context |
|------|-------|---------|
| `packages/engine/src/routes/admin/analytics/+page.svelte` | 10, 11, 24, 95 | Dashboard |
| `packages/durable-objects/src/TenantDO.ts` | 553, 558, 559 | DO comments |
| `packages/landing/src/routes/workshop/+page.svelte` | 383-385 | Documentation |
| `packages/landing/src/routes/roadmap/+page.svelte` | 161 | Roadmap |
| `packages/engine/src/routes/admin/account/FeaturesCard.svelte` | 21, 28, 29 | Features |
| `packages/engine/src/routes/admin/+page.svelte` | 180 | Dashboard link |
| `packages/vineyard/src/lib/components/vineyard/VineyardLayout.svelte` | 28 | Description |
| `packages/landing/src/lib/utils/icons.ts` | 433-435 | Icon mappings |

### Lattice (Core Platform)

| File | Lines | Context |
|------|-------|---------|
| `packages/engine/src/lib/ui/components/nature/structural/Lattice.svelte` | 25 | Component |
| `packages/engine/src/lib/ui/components/nature/structural/LatticeWithVine.svelte` | 33, 41 | Extended component |
| `packages/landing/src/routes/workshop/+page.svelte` | 65 | Documentation |
| `packages/landing/src/routes/vineyard/+page.svelte` | 35, 170, 217, 279, 280, 287 | Showcase |
| `packages/landing/src/routes/roadmap/+page.svelte` | 107 | Roadmap |
| `packages/landing/src/routes/knowledge/exhibit/+page.svelte` | 63, 79 | Lattice Museum |
| `packages/landing/src/routes/knowledge/+page.svelte` | 230 | Knowledge base |
| `packages/engine/src/routes/+layout.svelte` | 115 | Footer |
| `packages/landing/src/lib/utils/icons.ts` | 416 | Icon mapping |

### Passage (Subdomain Routing)

| File | Lines | Context |
|------|-------|---------|
| `packages/landing/src/routes/workshop/+page.svelte` | 95-97 | Documentation |
| `packages/grove-router/src/index.ts` | 63 | Router config |
| `packages/landing/src/lib/utils/icons.ts` | 220, 509, 510 | Icon mappings |

### Gossamer (ASCII Effects)

| File | Lines | Context |
|------|-------|---------|
| `packages/engine/src/lib/ui/components/ui/GlassCard.svelte` | 16, 27, 38, 76, 93, 116-122, 252, 276 | Primary integration |
| `packages/engine/src/lib/ui/components/ui/Glass.svelte` | 15, 24, 31, 55, 69, 96, 100-106, 201, 217, 241 | Secondary integration |
| `packages/landing/src/routes/workshop/+page.svelte` | 609-615 | Documentation |
| `packages/landing/src/routes/vineyard/+page.svelte` | 58, 396 | Showcase |
| `packages/engine/src/routes/(apps)/monitor/+page.svelte` | 354 | Monitor reference |
| `packages/landing/src/lib/utils/icons.ts` | 413, 414, 582 | Icon mappings |

### Grafts (Feature Flags)

| File | Lines | Context |
|------|-------|---------|
| `packages/engine/src/lib/grafts/` | - | **Core system** (8+ files) |
| `packages/engine/src/lib/grafts/index.ts` | 2 | Exports |
| `packages/engine/src/lib/grafts/types.ts` | 2-9 | Types |
| `packages/engine/src/lib/grafts/registry.ts` | 2, 5, 24, 57 | Registry |
| `packages/engine/src/lib/grafts/pricing/` | - | Pricing system (4 files) |
| `packages/engine/src/lib/grafts/greenhouse/` | - | Greenhouse controls |
| `packages/engine/src/lib/grafts/login/` | - | Login graft |
| `packages/engine/src/lib/feature-flags/grafts.ts` | 2, 68 | Core API |
| `packages/engine/src/lib/feature-flags/tenant-grafts.ts` | 2 | Tenant overrides |
| `packages/landing/src/routes/workshop/+page.svelte` | 206-215 | Documentation |
| `packages/engine/src/routes/admin/settings/+page.svelte` | 97, 414, 705 | Admin controls |

### Burrow (Cross-Property Access)

| File | Lines | Context |
|------|-------|---------|
| `packages/landing/src/routes/workshop/+page.svelte` | 264-266 | Documentation |
| `packages/landing/src/lib/utils/icons.ts` | 216, 505, 506 | Icon mappings |

### Weave (Visual Composition)

| File | Lines | Context |
|------|-------|---------|
| `packages/landing/src/routes/workshop/+page.svelte` | 331-333 | Documentation |
| `packages/landing/src/routes/roadmap/+page.svelte` | 168 | Roadmap |
| `packages/engine/src/lib/config/domain-blocklist.ts` | 319 | Blocklist reference |
| `packages/landing/src/lib/utils/icons.ts` | 397, 398, 401, 591 | Icon mappings |

### Reverie (AI Composition)

**Not yet implemented** - No code references found

---

## PRIORITY RANKING FOR ISSUE #925

### Tier 1: Critical (High-visibility, user-facing)

1. **`packages/landing/src/routes/workshop/+page.svelte`** - The main product definition page with nearly every term
2. **`packages/landing/src/routes/roadmap/+page.svelte`** - Public roadmap with phase names and features
3. **`packages/engine/src/lib/grafts/pricing/PricingFineprint.svelte`** - Pricing terms visible to all users
4. **`packages/engine/src/lib/email/types.ts`** - Email audience definitions
5. **`packages/engine/src/lib/utils/user.ts`** - "Wanderer" as default user identity
6. **Email sequences** (`packages/engine/src/lib/email/sequences/`) - All welcome/onboarding emails

### Tier 2: High (Admin/authenticated UI)

1. **`packages/engine/src/routes/admin/+page.svelte`** - Admin dashboard with Rooted badge
2. **`packages/engine/src/routes/admin/curios/`** - Curios admin pages
3. **`packages/engine/src/lib/grafts/login/LoginGraft.svelte`** - "Welcome back, Wanderer"
4. **`packages/plant/src/lib/components/OnboardingChecklist.svelte`** - Onboarding copy
5. **`packages/landing/src/routes/porch/`** - Support system pages

### Tier 3: Medium (Supporting pages)

1. **`packages/landing/src/routes/manifesto/+page.svelte`** - Philosophy/narrative
2. **`packages/landing/src/routes/forest/+page.svelte`** - Forests feature page
3. **`packages/landing/src/routes/shade/+page.svelte`** - Shade landing page
4. **`packages/meadow/src/routes/+page.svelte`** - Meadow main page
5. **Vineyard pages** (`packages/landing/src/routes/vineyard/`, `packages/vineyard/`)

### Tier 4: Internal/Low priority

1. **Tier configuration** (`packages/engine/src/lib/config/tiers.ts`) - Mostly internal
2. **Test files** - No user visibility
3. **Icon documentation** (`packages/landing/src/lib/utils/icons.ts`) - Comments only
4. **Worker internals** - Backend only

---

## Implementation Notes

When implementing `<GroveTerm>` components:

1. **Color categories per grove-naming.md:**
   - Foundational (grove, garden, bloom) → warm gold
   - Platform services → grove green
   - Content & community → soft purple
   - Tools → amber
   - Operations → muted blue

2. **Accessibility:**
   - Screen readers: "Grove term: [term]"
   - Respect `prefers-reduced-motion`

3. **Definition source:**
   - All definitions from `docs/philosophy/grove-naming.md`

4. **Scope:**
   - UI text only - internal code unchanged
   - Marketing, Arbor, onboarding, help docs, error messages
