# Documentation Accuracy Review Plan

**Created**: January 15, 2026
**Status**: Ready for Implementation
**Priority**: High — outdated documentation erodes user trust and causes support burden
**Estimated Effort**: 2-3 focused sessions
**Prerequisites**: None
**Blocks**: Help center launch, marketing accuracy

---

## Overview

As Grove has evolved, documentation has drifted from implementation. Articles written during planning or early development now describe features that have changed (fonts reduced from 20 to 11), features that didn't exist yet (unsubscribe flow), or workflows that have been redesigned.

**Goal**: Systematically review all documentation against actual implementation, update inaccuracies, and establish a lightweight process to prevent future drift.

---

## 🚨 Known Critical Issues

These are **confirmed** inaccuracies that need immediate attention:

| Issue | Affected Docs | Severity |
|-------|---------------|----------|
| **Stripe → LemonSqueezy** — Payment processor changed | Privacy Policy, Terms of Service, Refund Policy | 🔴 Critical |
| **Auth uses Better Auth** — Internally upgraded, still branded "Heartwood" | Privacy Policy, `creating-your-account.md`, any signup references | 🟡 Moderate |
| **Font count** — Claims 20 fonts, now 11 | `custom-fonts.md` | 🟡 Moderate |

### ✅ Recently Resolved (PR #341)

The following issues were addressed in the subscription management PR:

| Issue | Resolution | Status |
|-------|------------|--------|
| **Account deletion** — Article described non-existent UI | Updated to support-based flow (email to request deletion) | ✅ Fixed |
| **Data export** — Export UI didn't exist | Admin "Account & Subscription" page now has "Your Data" section | ✅ Fixed |
| **Data portability** — Process was unclear | Updated to describe current JSON export + coming Amber improvements | ✅ Fixed |

### Payment Processor: LemonSqueezy
Legal docs currently reference Stripe as a third-party service. All payment-related documentation needs updating to reference **LemonSqueezy** instead.

### Authentication: Heartwood (Better Auth Backend)
Auth system uses **Better Auth** internally but is still branded **Heartwood** to users. Currently **Google sign-in only** (more options coming later). Review documentation for:
- Email/password signup references → Wrong (Google only)
- Multiple auth providers → Partially wrong (only Google currently)
- Account creation flow → Verify matches current Google OAuth flow

---

## Scope

### In Scope
- **40 help center articles** (`docs/help-center/articles/`)
- **7 legal documents** (`docs/legal/`)
- **Feature accuracy** — do described features match implementation?
- **UI accuracy** — do button names, navigation paths, and screenshots match?
- **Pricing/tier accuracy** — do plan names, prices, and limits match?
- **Policy accuracy** — do stated policies match actual behavior?

### Out of Scope (for now)
- Internal docs (`docs/internal/`)
- Technical specs (`docs/specs/`) — these are implementation guides, not user-facing
- Marketing docs (`docs/marketing/`) — separate review
- Pattern docs (`docs/patterns/`) — architecture reference

---

## Review Methodology

### For Each Document

1. **Read the document** — note all factual claims
2. **Verify against implementation** — check the actual code/UI/database
3. **Categorize issues found**:
   - 🔴 **Critical**: Factually wrong (wrong prices, non-existent features, incorrect limits)
   - 🟡 **Moderate**: Outdated but not misleading (old UI labels, deprecated terminology)
   - 🟢 **Minor**: Style/voice issues, could be clearer
4. **Update or flag** — fix immediately or note for batch update
5. **Mark reviewed** — track progress in checklist below

### Verification Sources

| Claim Type | Where to Verify |
|------------|-----------------|
| Pricing/tiers | `packages/engine/src/lib/config/tiers.ts` |
| Feature limits | `packages/engine/src/lib/config/tiers.ts` |
| UI elements | Run the app, check actual screens |
| Font options | `packages/engine/src/lib/ui/tokens/fonts.ts` (11 fonts) |
| Auth system | `packages/engine/src/lib/server/auth/` (Better Auth/Heartwood) |
| Data retention | Privacy policy + actual TTLs in code |
| Email workflows | `docs/templates/emails/`, Resend dashboard |
| Payment processor | `packages/engine/src/lib/server/billing/lemonsqueezy/` |
| Account deletion | Support-based flow — contact via admin panel |
| Data export | `packages/engine/src/routes/admin/account/DataExportCard.svelte` |
| Subscription mgmt | `packages/engine/src/routes/admin/account/` (new in PR #341) |

### Review Approach

Use a **mix approach** for efficiency:
- **Auto-fix**: Obvious factual errors (font counts, processor names, broken links)
- **Flag for review**: Complex policy changes, tone rewrites, structural changes
- **Document findings**: Track all changes and flags in the session log below

---

## Phase 1: High-Priority Articles (Do First)

These articles are most likely to be outdated or have user-facing impact:

### Customization & Features
- [ ] `custom-fonts.md` — **KNOWN ISSUE**: Claims 20 fonts, now 11
- [ ] `choosing-a-theme.md` — Verify theme list matches available themes
- [ ] `the-markdown-editor.md` — Verify editor features match description

### Billing & Plans
- [ ] `choosing-your-plan.md` — Verify tier names, prices, limits
- [ ] `understanding-your-plan.md` — Verify usage tracking, Centennial criteria
- [ ] `upgrading-or-downgrading.md` — Verify the actual flow matches
- [ ] `centennial-status.md` — Verify earning criteria matches implementation

### Account & Data (Updated in PR #341)
- [ ] `account-deletion.md` — **✅ Recently updated** — Quick verify support-based flow is accurate
  - Check: "Account & Subscription → Danger Zone → email link" flow matches
  - Check: Data retention timelines still accurate
- [ ] `exporting-your-content.md` — **✅ Recently updated** — Quick verify export UI matches
  - Check: "Account & Subscription → Your Data" section exists and matches
  - Check: JSON format description is accurate
- [ ] `data-portability.md` — **✅ Recently updated** — Quick verify migration guidance
  - Check: JSON export description matches actual format
  - Check: "Amber update" timeline reference is appropriate

### Getting Started
- [ ] `creating-your-account.md` — **🟡 MODERATE**: Verify matches Heartwood/Google OAuth flow
  - Check: Remove any email/password signup references (Google only)
  - Check: Verify sign-in flow description is accurate
  - Check: Note that more auth options coming later
- [ ] `understanding-the-admin-panel.md` — Verify navigation matches current UI
- [ ] `wanderers-and-pathfinders.md` — Verify terminology matches implementation

### Foundational (Previously Missing from Review)
- [ ] `what-is-grove.md` — Core explainer, verify feature claims match reality
- [ ] `writing-your-first-post.md` — Onboarding flow, verify UI matches
- [ ] `groves-vision.md` — Philosophy doc, verify links and claims

---

## Phase 2: Feature Documentation

### Writing & Publishing
- [ ] `formatting-your-posts.md` — Verify all markdown syntax works
- [ ] `adding-images-and-media.md` — Verify upload limits, formats
- [ ] `drafts-and-scheduling.md` — Verify scheduling actually works
- [ ] `your-rss-feed.md` — Verify RSS format and availability
- [ ] `tags-and-organization.md` — Verify tag behavior

### Social & Community
- [ ] `what-is-meadow.md` — Verify Meadow features match description
- [ ] `opting-into-the-feed.md` — Verify opt-in process
- [ ] `reactions-and-voting.md` — Verify reaction types available
- [ ] `understanding-replies-vs-comments.md` — Verify comment system behavior

### New/Recent Features
- [ ] `what-is-swarm.md` — Verify Swarm is implemented
- [ ] `what-is-zdr.md` — Verify ZDR claims match AI implementation
- [ ] `what-is-solarpunk.md` — Philosophy doc, verify links work
- [ ] `known-limitations.md` — Verify limitations are still accurate

### Privacy & Security (Previously Missing from Review)
- [ ] `understanding-your-privacy.md` — May reference payment/auth providers
- [ ] `how-grove-protects-your-content.md` — Shade AI features, verify claims
- [ ] `how-grove-backs-up-your-data.md` — Data handling, verify backup claims
- [ ] `why-grove-is-different.md` — Marketing claims, verify differentiators

---

## Phase 3: Troubleshooting & Support

- [ ] `my-site-isnt-loading.md` — Verify troubleshooting steps work
- [ ] `browser-compatibility.md` — Verify supported browsers list
- [ ] `checking-grove-status.md` — Verify status page URL
- [ ] `contact-support.md` — Verify support email/methods
- [ ] `sessions-and-cookies.md` — Verify cookie information

---

## Phase 4: Legal Documents

**Extra care required** — legal docs have compliance implications.

### 🚨 Infrastructure Updates Required

**Payment Processor: Stripe → LemonSqueezy**
All references to Stripe must be replaced with LemonSqueezy. Documents affected:
- `privacy-policy.md` — Lists Stripe as third-party service
- `terms-of-service.md` — May reference Stripe billing
- `refund-policy.md` — May reference Stripe processes

**Authentication: Heartwood (Better Auth Backend)**
Auth system uses Better Auth internally but is branded "Heartwood" externally. Only Google sign-in currently. Verify docs don't mention:
- Email/password signup (not available)
- Multiple OAuth providers (only Google for now)

### Core Legal
- [ ] `privacy-policy.md` — **🔴 CRITICAL: Multiple infrastructure changes**
  - Check: Replace Stripe → LemonSqueezy in third-party services
  - Check: Update auth provider info (Better Auth, Google sign-in)
  - Check: Data retention periods match actual TTLs
  - Check: AI crawler blocking list is current
- [ ] `terms-of-service.md` — **🔴 CRITICAL: Update payment references**
  - Check: Pricing matches current tiers
  - Check: Features described exist
  - Check: Geographic restrictions accurate
  - Check: Payment/billing section reflects current processor
- [ ] `acceptable-use-policy.md` — Verify enforcement matches policy
  - Check: Prohibited content categories current
  - Check: Escalation process matches implementation

### Operational Legal
- [ ] `dmca-policy.md` — Verify contact info, process
- [ ] `data-portability-separation.md` — Verify export process matches
- [ ] `refund-policy.md` — **🔴 CRITICAL: Update to LemonSqueezy**
  - Check: Refund windows match LemonSqueezy capabilities
  - Check: Process description matches actual flow

### Help Center Legal
- [ ] `gdpr-and-privacy-rights.md` — Verify rights explanations match policy

---

## Phase 5: Establish Maintenance Process

After review, establish lightweight process to prevent future drift:

### Recommended Practices

1. **Feature flag docs** — When adding a feature behind a flag, draft docs but mark as "unreleased"
2. **PR checklist item** — "Does this change require doc updates?" in PR template
3. **Quarterly review** — Brief check of high-churn articles (billing, features)
4. **Version notes** — Add "Last verified: [date]" to article frontmatter

### Suggested Frontmatter Addition
```yaml
---
title: Custom Fonts
slug: custom-fonts
category: customization
last_verified: 2026-01-15
verified_by: autumn
---
```

---

## Tracking Progress

### Summary Checklist

| Category | Total | Reviewed | Updated | Notes |
|----------|-------|----------|---------|-------|
| High-Priority | 16 | 0 | 0 | Phase 1 (includes 3 foundational) |
| Features | 18 | 0 | 0 | Phase 2 (includes 4 privacy/security) |
| Troubleshooting | 5 | 0 | 0 | Phase 3 |
| Legal | 6 | 0 | 0 | Phase 4 |
| **Total** | **45** | **0** | **0** | 40 help center + 5 legal (GDPR is help center) |

### Review Session Log

| Date | Articles Reviewed | Issues Found | Notes |
|------|-------------------|--------------|-------|
| | | | |

---

## Quick Reference: File Locations

```
docs/
├── help-center/
│   ├── articles/          # 40 articles to review
│   └── WRITING-GUIDE.md   # Voice/style reference
├── legal/
│   ├── privacy-policy.md
│   ├── terms-of-service.md
│   ├── acceptable-use-policy.md
│   ├── dmca-policy.md
│   ├── data-portability-separation.md
│   └── refund-policy.md
└── plans/
    └── documentation-accuracy-review.md  # This file
```

---

## Success Criteria

- [ ] All 40 help center articles reviewed and updated
- [ ] All 6 legal documents verified against implementation
- [ ] No critical (🔴) issues remaining
- [ ] Stripe references replaced with LemonSqueezy in legal docs
- [x] ~~Account deletion article addressed~~ (resolved in PR #341 — support-based flow)
- [ ] PR #341 updates verified (account-deletion, exporting-your-content, data-portability)
- [ ] `last_verified` frontmatter added to reviewed articles
- [ ] Maintenance process documented and agreed upon

---

## Notes

- Prioritize user-facing accuracy over perfection
- When in doubt, check the actual UI/code — don't assume docs are wrong
- Legal docs may need legal review for significant changes
- Keep Grove's warm, honest voice when updating — don't make it corporate

---

## Changelog

| Date | Change | By |
|------|--------|-----|
| 2026-01-15 | Initial plan created | Autumn |
| 2026-01-15 | Updated after codebase exploration: corrected auth status (Better Auth integrated as Heartwood), font count (11), added 7 missing articles, added account deletion implementation gap, updated verification sources with actual file paths, added review approach section | Claude |
| 2026-01-16 | Rebased with main after PR #341 merged: marked account-deletion, exporting-your-content, data-portability as recently updated; removed account deletion implementation gap (now support-based flow); added new verification sources for admin account page and data export | Claude |
