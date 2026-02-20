# Documentation Maintenance Guide

How to keep Grove's help center documentation accurate and up-to-date.

---

## The Problem We're Solving

Documentation drifts from implementation over time. Features get added, UIs change, pricing updates—and docs fall behind. Users then encounter articles describing buttons that don't exist or features that work differently than described.

This guide establishes lightweight practices to prevent documentation drift.

---

## Verification Tracking

Every help center article includes frontmatter that tracks when it was last verified:

```yaml
---
title: Example Article
slug: example-article
last_verified: 2026-01-16
verified_by: claude
---
```

- **last_verified**: Date when the article was checked against the actual implementation
- **verified_by**: Who performed the verification (person or "claude" for AI review)

When you verify an article is accurate, update these fields. When you update an article, update these fields.

---

## PR Documentation Checklist

Every PR template includes a documentation checklist:

1. **No docs needed** — The change doesn't affect user-facing features
2. **Docs updated** — Help center articles were updated as part of this PR
3. **Docs flagged** — Docs need updates but are tracked separately

If your PR changes user-facing behavior, you should either update the docs in the same PR or create a tracking issue.

---

## Automated Freshness Checks

A GitHub Actions workflow (`.github/workflows/docs-freshness.yml`) automatically monitors documentation freshness:

**When it runs:**
- Weekly on Monday mornings (scheduled)
- On any PR that touches `docs/help-center/` or `docs/legal/`
- Manually via workflow dispatch

**What it does:**
- Scans all help center articles for `last_verified` dates
- Flags articles older than 90 days
- On PRs: Comments with a list of stale articles
- On scheduled runs: Creates a GitHub issue if stale docs are found

**Example output:**
```
⚠️ Found 3 stale articles

| Article | Status | Last Verified |
|---------|--------|---------------|
| choosing-your-plan.md | 95 days | 2026-01-16 |
| understanding-your-plan.md | 92 days | 2026-01-16 |
```

---

## Quarterly Review Process

Every quarter, perform a brief review of high-churn documentation areas:

### High-Churn Areas (review every quarter)

| Area | Articles | Why they drift |
|------|----------|----------------|
| **Billing/Plans** | choosing-your-plan.md, understanding-your-plan.md, upgrading-or-downgrading.md | Pricing changes, tier adjustments, feature additions |
| **Admin Panel** | understanding-the-admin-panel.md | Navigation changes, new sections |
| **Getting Started** | creating-your-account.md, writing-your-first-post.md | Auth flow changes, editor updates |

### Quarterly Review Checklist

1. **Check `last_verified` dates** — Any article over 90 days old should be spot-checked
2. **Verify pricing table** — Compare docs to `libs/engine/src/lib/config/tiers.ts`
3. **Check admin navigation** — Compare docs to `libs/engine/src/routes/admin/+layout.svelte`
4. **Spot-check screenshots** — If we add screenshots, verify they match current UI

### Running the Review

```bash
# Find articles not verified in the last 90 days
grep -l "last_verified: 202[0-5]" docs/help-center/articles/*.md

# Or check for specific date patterns
grep -r "last_verified:" docs/help-center/articles/ | sort
```

---

## Feature Flag Documentation

When adding a feature behind a feature flag:

1. **Draft the docs** during development
2. **Mark as unreleased** in the article (e.g., "Coming in Full Bloom")
3. **Update on launch** when the flag is removed

This prevents the common pattern of launching features with no documentation.

---

## Source of Truth Files

When verifying documentation, check these authoritative sources:

| Documentation Claim | Verify Against |
|--------------------|----------------|
| Tier limits (posts, storage) | `libs/engine/src/lib/config/tiers.ts` |
| Font availability | `libs/engine/src/lib/config/presets.ts` |
| Admin navigation | `libs/engine/src/routes/admin/+layout.svelte` |
| Auth flow | `libs/engine/src/hooks.server.ts` |
| API endpoints | `libs/engine/src/routes/api/` |

---

## Common Drift Patterns

Watch for these patterns that often cause documentation drift:

### 1. Aspirational Documentation
Docs written during planning that describe features not yet implemented.
**Fix**: Add "coming soon" notices or remove until implemented.

### 2. UI Label Changes
Button text or navigation labels change but docs still reference old names.
**Fix**: Search docs for the old label when making UI changes.

### 3. Tier Feature Changes
Features move between tiers or get added/removed.
**Fix**: Always update docs when changing `tiers.ts`.

### 4. Pricing Updates
Prices change but docs show old amounts.
**Fix**: Search all docs for dollar amounts when changing pricing.

---

## Voice and Style

When updating docs, maintain Grove's voice:

- **Warm and welcoming** — Not corporate or technical
- **Clear and direct** — No jargon, no marketing fluff
- **Honest about limitations** — If something doesn't work yet, say so

See `docs/help-center/WRITING-GUIDE.md` for full voice guidelines.

---

## Review History

The initial comprehensive review was completed on January 16, 2026:

- **44 articles reviewed** (40 help center + 4 legal policies)
- **25 articles updated** to fix inaccuracies
- **Plan document**: `docs/plans/completed/documentation-accuracy-review.md`

---

*Documentation is a feature. Treat accuracy as a requirement, not an afterthought.*
