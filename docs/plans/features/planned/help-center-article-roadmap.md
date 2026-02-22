---
title: "Help Center Article Roadmap"
status: planned
category: features
---

# Help Center Article Roadmap

**Created**: January 15, 2026
**Status**: Planning
**Priority**: High — v1 launch depends on comprehensive help coverage
**Estimated Effort**: 4-6 focused writing sessions
**Prerequisites**: Help Center reorganization (completed)
**Blocks**: v1 public launch, reduced support burden

---

## Overview

The Help Center has been reorganized with proper sections and all orphaned articles now have homes. However, several critical gaps remain—articles that users **will** ask about on Day 1 of v1 launch.

**Goal**: Prioritized roadmap for writing missing help articles, organized by urgency and user impact.

---

## Current State

### Sections & Article Counts (Post-Reorganization)

| Section | Articles | Status |
|---------|----------|--------|
| Getting Started | 3 | ✅ Good |
| Writing & Publishing | 4 | ✅ Good |
| Customization | 5 | ✅ Good |
| Community & Social | 4 | ✅ Good |
| Account & Billing | 5 | ✅ Good |
| Privacy & Security | 5 | ✅ Excellent |
| AI Features | 2 | 🟡 Needs Wisp docs |
| Philosophy & Vision | 4 | ✅ Complete |
| Support & Resources | 6 | ✅ Good |
| Troubleshooting | 1 | 🔴 Critical gap |

**Total**: 39 articles | **Sections**: 10

---

## 🔴 Priority 1: Write Before v1 Launch

These articles address questions users **will** ask on Day 1. Missing them = support tickets.

### 1. Custom Domains Setup
- **Section**: Getting Started or Customization
- **Slug**: `custom-domains`
- **Why critical**: Every serious blogger asks "can I use my own domain?"
- **Content outline**:
  - Requirements (own domain, DNS access)
  - Step-by-step DNS configuration
  - SSL certificate handling (automatic via Cloudflare)
  - Troubleshooting DNS propagation
  - Subdomain vs apex domain considerations
- **Estimated length**: 800-1000 words

### 2. Can't Log In / Authentication Issues
- **Section**: Troubleshooting
- **Slug**: `cant-log-in`
- **Why critical**: Auth issues = frustrated users leaving forever
- **Content outline**:
  - Check Google account status
  - Clear browser cache/cookies
  - Try incognito mode
  - Check status.grove.place
  - Contact support if persistent
- **Estimated length**: 400-600 words

### 3. Images Not Uploading
- **Section**: Troubleshooting
- **Slug**: `images-not-uploading`
- **Why critical**: Broken media = broken posts
- **Content outline**:
  - Check file format (JPEG, PNG, WebP, GIF supported)
  - Check file size limits (varies by tier)
  - Check storage quota
  - Try different browser
  - Common error messages explained
- **Estimated length**: 500-700 words

### 4. Importing Your Content
- **Section**: Getting Started
- **Slug**: `importing-your-content`
- **Why critical**: People switching from Substack, WordPress, Medium
- **Content outline**:
  - What import options exist (or don't yet)
  - Manual migration process for now
  - Markdown compatibility
  - Image migration considerations
  - Roadmap for automated imports (if planned)
- **Estimated length**: 600-800 words

---

## 🟡 Priority 2: Write Soon After Launch

Important for good UX, but won't block launch.

### 5. Post Visibility Settings
- **Section**: Writing & Publishing
- **Slug**: `post-visibility`
- **Content**: Public vs. unlisted vs. draft states, when to use each

### 6. Viewing Your Analytics
- **Section**: Customization (or new Analytics section?)
- **Slug**: `viewing-your-analytics`
- **Content**: What stats Grove shows, where to find them, what they mean

### 7. SEO Basics for Your Grove
- **Section**: Writing & Publishing
- **Slug**: `seo-basics`
- **Content**: Meta descriptions, social cards, Open Graph, discoverability tips

### 8. Mobile Experience
- **Section**: Support & Resources
- **Slug**: `mobile-experience`
- **Content**: Is there an app? How does the editor work on mobile? Responsive design

### 9. Keyboard Shortcuts
- **Section**: Writing & Publishing or Customization
- **Slug**: `keyboard-shortcuts`
- **Content**: Editor shortcuts, navigation shortcuts, power user tips

---

## 🟢 Priority 3: Nice to Have

Fill these in as patterns emerge from user questions.

### Troubleshooting Expansion
- `post-not-appearing` — Stuck drafts, scheduling issues
- `rss-feed-not-updating` — Cache delays, feed validation
- `comments-not-showing` — Moderation queue, approval workflow
- `email-notifications-not-working` — If/when email features exist

### AI Features Expansion (for Wisp launch)
- `what-is-wisp` — The AI writing assistant
- `using-wisp-suggestions` — How to accept/reject AI help
- `wisp-privacy` — How Wisp protects your creative process

### Getting Started Expansion
- `quick-setup-checklist` — 5-minute onboarding guide
- `your-first-week-on-grove` — Week 1 guide for new users

---

## Section Order (Help Center Page)

Current order on the page:
1. Getting Started
2. Writing & Publishing
3. Customization
4. Community & Social
5. Account & Billing
6. Privacy & Security
7. AI Features
8. Philosophy & Vision
9. Support & Resources
10. Troubleshooting

**Recommendation**: This order is good! User-facing content first, philosophical/support content later.

---

## Implementation Notes

### Adding New Articles

1. **Add to knowledge-base.ts** — Create the article object in `helpArticles` array
2. **Add slug to section filter** — Edit `help/+page.svelte` to include in correct section
3. **Write the content** — Use existing articles as template for tone/format

### Future Improvement: Data-Driven Sections

The current hardcoded slug filters are fragile. See `docs/plans/data-driven-documentation-sections.md` for the proposed pattern to solve this properly.

---

## Success Metrics

- **v1 Launch Ready**: Priority 1 articles (4) complete
- **Week 2**: Priority 2 articles (5) complete
- **Month 1**: Troubleshooting section has 5+ articles
- **Ongoing**: New articles added based on support ticket patterns

---

## Related Documents

- `docs/plans/data-driven-documentation-sections.md` — Pattern for better section organization
- `docs/plans/documentation-accuracy-review.md` — Accuracy audit for existing articles
- `landing/src/lib/data/knowledge-base.ts` — Article data source
- `landing/src/routes/knowledge/help/+page.svelte` — Help Center page
