# Writing Guide for Grove Help Center

This guide captures the voice, tone, and approach for writing Grove help documentation. Use it to maintain consistency across all articles.

---

## The Grove Voice

Grove's help documentation should feel like getting advice from a thoughtful friend who happens to know a lot about the platform, not a corporate knowledge base, not a chatbot, not a manual written by committee.

### Core Principles

**1. Warm, not cutesy**
- Write like you're helping a real person, not performing helpfulness
- "Let's get started" works. "Let's gooo! 🚀" doesn't.
- Avoid exclamation points unless genuinely warranted

**2. Direct, not curt**
- Say what you mean without unnecessary padding
- Don't soften everything with "just" and "simply"—if it's actually simple, let the instructions speak for themselves
- Get to the point, but don't rush past context that helps

**3. Honest, not defensive**
- Acknowledge limitations clearly: "Grove isn't trying to be everything"
- If something isn't possible, say so. Don't hide it in vague language.
- "This feature is Oak+ only" is better than elaborate justifications

**4. Helpful, not condescending**
- Assume readers are intelligent humans who are simply unfamiliar with *this specific thing*
- Don't over-explain basics, but don't assume everyone knows jargon
- When in doubt, briefly define terms on first use

**5. Human, not corporate**
- Write sentences you'd actually say to someone
- Avoid marketing-speak, buzzwords, and hollow phrases like "seamlessly integrate"
- Contractions are fine. Personality is welcome.

---

## What Makes Grove Documentation Different

### We acknowledge emotions
Users reading help articles are often frustrated, confused, or anxious. Acknowledge this without being patronizing:

> "Site outages are stressful. We take them seriously."

> "If you've ever lost a draft to a browser crash, you know the feeling. Grove autosaves every few seconds, so you won't lose your work."

### We're transparent about limitations
Don't hide what Grove can't do. Users respect honesty more than spin:

> "If you need e-commerce, complex membership tiers, or a design tool with infinite customization, Grove probably isn't the right fit."

### We explain the *why*
When a feature works a certain way, briefly explain why. This builds trust and reduces support questions:

> "IP addresses are kept for one minute. We need them briefly for rate limiting (preventing abuse). After 60 seconds, they're discarded."

### We use specificity to build trust
Vague reassurances feel empty. Specifics feel real:

- Not: "We respect your privacy"
- Yes: "IP addresses are kept for 60 seconds. Error logs are kept for 7 days. Your content stays until you delete it."

---

## Writing Style

### Tone by context

| Article Type | Tone | Example |
|--------------|------|---------|
| Getting Started | Encouraging, low-pressure | "Doesn't have to be perfect. First posts rarely are." |
| How-To | Clear, practical | "Click **Settings → Themes** to choose one." |
| Troubleshooting | Calm, empathetic | "If it's not working, let's figure out why." |
| Privacy/Legal | Transparent, specific | "We don't track your visitors. No analytics scripts." |
| Billing | Honest, no-pressure | "Seedling is a real plan, not a trial." |

### Formatting conventions

**Headings**
- Use H2 (`##`) for main sections
- Use H3 (`###`) for subsections
- Action-oriented where possible: "Writing your first post" not "About posts"

**UI elements**
- Bold for clickable things: **Settings**, **Publish**, **New Post**
- Use `→` for navigation paths: **Settings → Themes → Choose**

**Lists**
- Bullet points for features, options, non-sequential items
- Numbered lists only for sequential steps

**Code and technical terms**
- Inline code for URLs, file paths, and code: `{{blog_url}}/rss.xml`
- Define technical terms on first use if readers might not know them

**Callouts** (use sparingly)
```markdown
> 💡 **Tip:** Helpful suggestion that's not essential

> ⚠️ **Note:** Something important to be aware of

> ⚠️ **Warning:** Something that could cause problems if ignored
```

---

## Article Structure

### Frontmatter template

```yaml
---
title: "Clear, Action-Oriented Title"
slug: "url-friendly-slug"
category: "getting-started"  # See categories below
order: 1  # Sort order within category
keywords: ["search", "terms", "users", "might", "use"]
related:
  - slug-of-related-article
  - another-related-article
---
```

### Body structure

1. **Opening line**: What this article helps with (1-2 sentences, no preamble)
2. **Main content**: Steps, explanations, or information
3. **Related articles**: Links to naturally connected topics
4. **Closing**: Optional—only if it adds value (encouragement, next steps)

### Example opening lines

Good:
> "Your blog has an RSS feed. Here's how to share it and why it matters."

> "If your site isn't loading, let's figure out why."

> "Grove uses magic links—no password to remember."

Avoid:
> "Welcome to this article about RSS feeds! In this guide, we'll cover everything you need to know about..."

> "Many users wonder about RSS feeds. This comprehensive guide will help you understand..."

---

## Categories

| Category | Slug | Description |
|----------|------|-------------|
| Getting Started | `getting-started` | First steps, orientation, basics |
| Writing & Publishing | `writing` | Editor, formatting, media, drafts |
| Customization | `customization` | Themes, colors, fonts |
| Blog Settings | `settings` | Configuration, SEO, domains |
| Comments & Interaction | `comments` | Moderation, blocking, notifications |
| Billing & Plans | `billing` | Plans, payments, upgrades |
| Your Data | `data` | Export, deletion, privacy rights |
| Troubleshooting | `troubleshooting` | Common issues, fixes |
| Vision & Legal | `legal` | Policies, vision, values |

---

## Planned Articles (53 total)

### Getting Started (5 articles)
1. `creating-your-account` — Account creation and verification flow
2. `choosing-your-plan` — Plan comparison and selection guidance
3. `writing-your-first-post` — ✅ **Written** (see existing article)
4. `understanding-the-admin-panel` — Admin panel orientation and navigation
5. `revisiting-the-tour` — How to restart the interactive tour

### Writing & Publishing (7 articles)
6. `the-markdown-editor` — Editor interface and features
7. `formatting-your-posts` — Markdown syntax reference
8. `adding-images-and-media` — Uploading and embedding media
9. `tags-and-organization` — Using tags to organize content
10. `vines-sidebar-links` — Creating and managing sidebar links
11. `drafts-and-scheduling` — Saving drafts, scheduling posts
12. `your-rss-feed` — RSS feed basics and sharing

### Customization (5 articles)
13. `choosing-a-theme` — Theme selection and preview
14. `custom-accent-colors` — Color customization options
15. `theme-customizer` — Advanced theme customization (Oak+)
16. `custom-fonts` — Font selection and upload (Evergreen)
17. `community-themes` — Installing community themes (Oak+)

### Blog Settings (5 articles)
18. `site-title-and-description` — Basic blog identity settings
19. `seo-and-social-previews` — Open Graph, meta tags, search optimization
20. `social-links` — Adding social media links
21. `privacy-and-visibility` — Blog visibility settings
22. `custom-domain-setup` — Connecting your own domain (Oak+)

### Comments & Interaction (5 articles)
23. `understanding-replies-vs-comments` — How Grove's comment system works
24. `moderating-your-comments` — Comment moderation tools
25. `comment-settings` — Configuring comment behavior
26. `blocking-users` — How to block problematic users
27. `notifications` — Notification preferences and management

### Meadow / Social (5 articles) — deferred

Meadow is parked, not built. These stay unwritten until the junk-drawer review in #1637
settles what comes back; the slugs below are kept so nobody re-invents near-duplicates
in the meantime.

28. `what-is-meadow` — covered negatively in what-is-grove.md ("what Grove isn't")
29. `opting-into-the-feed` — How to share posts to Meadow
30. `reactions-and-voting` — Community engagement features
31. `your-meadow-profile` — Profile settings for Meadow
32. `feed-curation` — Customizing your Meadow feed

### Billing & Plans (5 articles)
33. `understanding-your-plan` — Plan features and limits explained
34. `upgrading-or-downgrading` — How to change plans
35. `payment-methods` — Accepted payment options
36. `invoices-and-receipts` — Accessing billing history
37. `cancellation-and-refunds` — Cancellation process and refund policy

### Your Data (5 articles)
38. `exporting-your-content` — Data export in standard formats
39. `data-portability` — Taking your content elsewhere
40. `account-deletion` — How to close your account
41. `backup-information` — How Grove backs up your data
42. `gdpr-and-privacy-rights` — Your rights under GDPR and similar laws

### Vision & Legal (6 articles)
43. `groves-vision` — The philosophy behind Grove
44. `terms-of-service` — Terms of Service summary/link
45. `privacy-policy` — Privacy Policy summary/link
46. `acceptable-use-policy` — What's allowed on Grove
47. `data-portability-policy` — Data portability commitments
48. `refund-policy` — Refund terms and process

### Troubleshooting (5 articles)
49. `my-site-isnt-loading` — ✅ **Written** (see existing article)
50. `browser-compatibility` — Supported browsers and known issues
51. `known-limitations` — What Grove intentionally doesn't do
52. `checking-grove-status` — Status page and incident history
53. `contact-support` — How to reach a human

---

## Already Written (4 articles)

These articles are complete and can be used as voice/style references:

| Article | Location | Notes |
|---------|----------|-------|
| What is Grove? | `what-is-grove.md` | Vision, values, "what Grove isn't" |
| Writing Your First Post | `writing-your-first-post.md` | Low-pressure how-to |
| Understanding Your Privacy | `understanding-your-privacy.md` | Specific retention times, ZDR |
| My Site Isn't Loading | `my-site-isnt-loading.md` | Empathetic troubleshooting |

---

## Voice Examples

### Do write like this

**Explaining a feature:**
> "Your blog has an RSS feed at `{{blog_url}}/rss.xml`. If you're not familiar: RSS lets people subscribe to your blog in a feed reader. When you publish something new, it shows up for them automatically. No algorithms deciding who sees what."

**Acknowledging frustration:**
> "Site outages are stressful. We take them seriously."

**Setting expectations:**
> "Response time: Within 48 hours. Real person on the other end."

**Being honest about limitations:**
> "If you need e-commerce, complex membership tiers, or a design tool with infinite customization, Grove probably isn't the right fit."

**Encouraging without pressure:**
> "Doesn't have to be perfect. First posts rarely are. The point is to start."

### Don't write like this

**Over-enthusiastic:**
> "Welcome to your amazing new blog! 🎉 We're SO excited to have you here! Let's get started on your incredible journey!"

**Corporate-speak:**
> "Grove leverages cutting-edge technology to seamlessly deliver your content to readers across all platforms."

**Condescending:**
> "Don't worry—this is really simple! Anyone can do it! Just follow these easy steps!"

**Vague reassurances:**
> "We take your privacy seriously and are committed to protecting your data."

**Over-explained:**
> "In this comprehensive guide, we will walk you through each and every step of the process, ensuring that you understand exactly what you need to do at each stage of your journey."

---

## Final Checklist

Before submitting an article, verify:

- [ ] Title is action-oriented and clear
- [ ] Opening line gets to the point immediately
- [ ] Technical terms are defined on first use
- [ ] UI elements are bolded with navigation arrows
- [ ] No marketing language or corporate-speak
- [ ] Limitations are acknowledged honestly
- [ ] Tone matches the article type (see table above)
- [ ] Related articles are linked where natural
- [ ] Frontmatter is complete (title, slug, category, keywords)
- [ ] No unnecessary exclamation points
- [ ] Would Autumn actually say this to a user?

---

*This guide should help maintain Grove's voice across all documentation. When in doubt, re-read the existing articles and aim for that same warmth—the warmth of a midnight tea shop, the clarity of good documentation.*
