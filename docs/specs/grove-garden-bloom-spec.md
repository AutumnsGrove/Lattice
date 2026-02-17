---
title: Grove, Garden, Bloom — The Heart of It All
description: Foundational terminology for personal spaces, collections, and content in the Grove ecosystem
category: specs
specCategory: foundational
icon: flower
lastUpdated: "2026-02-02"
aliases: []
tags:
  - terminology
  - content
  - naming
  - foundational
---

# Grove, Garden, Bloom — The Heart of It All

```
                                    ☀️


                    🌸         🌸         🌸
                       ╲       │       ╱
                         ╲     │     ╱
                           ╲   │   ╱
                ┌───────────────────────────────┐
                │                               │
                │      🌷  🌺  🌻  🌸  🌹        │
                │         ╲ │ │ │ ╱             │
                │      ════════════════         │
                │           GARDEN              │
                │      ════════════════         │
                │                               │
                └───────────────────────────────┘
                              │
                    ══════════╪══════════
                         YOUR GROVE
                    ══════════╪══════════
                              │
                      🌲  🌳  │  🌲  🌳
                           🌲 │ 🌲
                              │
                ══════════════╪══════════════════
                         THE GROVE
                ══════════════╪══════════════════


          wander → take root → tree grows → grove flourishes → blooms
```

> _What you call things matters. These three words are the foundation._

The language of content in Grove. Not "blogs" and "posts." Groves, gardens, and blooms. This document defines the foundational terminology that shapes how Wanderers understand and interact with their spaces.

**Category:** Foundational Terminology
**Applies To:** All user-facing text, UI, documentation, and marketing
**Status:** Active (February 2026)

---

## The Philosophy

From the grove-naming document:

> "These names aren't just branding. They're the language of an ecosystem."

When someone creates a space on Grove, they're not starting a blog. They're planting a tree. When they write, they're not posting. They're growing blooms in their garden.

This isn't just branding. It's how we think about what we're building: a forest of voices, where every Wanderer is a tree in the grove.

---

## The Three Terms

### Your Grove

```
        🌲  🌳  🌲
           🌲
    ═══════════════════
       autumn's grove
    ═══════════════════
         🌲  🌳
```

**What it replaces:** blog, site, space

**What it is:** A grove is a small group of trees growing together. Intimate, sheltered, yours. The platform is called Grove. Your space within it is _your_ grove.

**Domain:** `{you}.grove.place`

**When to use:**

- "Welcome to my grove"
- "Come visit Autumn's grove"
- "Your grove is where your words live"
- "Start your grove today"

**Implementation:**

- Used in headers, navigation, welcome messages
- The possessive makes it personal: "Autumn's grove" not "Autumn's Grove"
- Lowercase when referring to a specific person's space
- Uppercase when referring to the platform concept

**Aria/Accessibility:** "blog" or "personal site"

---

### Your Garden

```
    ┌───────────────────────────┐
    │   🌷  🌺  🌻  🌸  🌹  🌼   │
    │     ╲  │  │  │  ╱        │
    │   ═══════════════════     │
    │         garden            │
    │   ═══════════════════     │
    │      organized by         │
    │    season or by hand      │
    └───────────────────────────┘
```

**What it replaces:** blog index, posts page, archive

**What it is:** A garden is where you tend what grows. It's the cultivated space within your grove where your blooms are planted, arranged, and displayed for visitors to wander through.

**URL:** `{you}.grove.place/garden`

**When to use:**

- "Browse my garden"
- "New blooms in the garden"
- "Your garden holds all your writing"
- "Visit the garden to see everything they've grown"

**Implementation:**

- The main listing page for all blooms
- Can be organized chronologically or by category/tag
- Supports pagination, filtering, search
- May include featured/pinned blooms

**Aria/Accessibility:** "blog posts" or "articles"

---

### Blooms

```
           🌸
          ╱│╲
         ╱ │ ╲
        ╱  │  ╲
       ╱   │   ╲
      ─────┼─────
           │
           │
          ╱│╲
         ╱ │ ╲
        ╱  │  ╲
       ═══════════
         a bloom
```

**What it replaces:** post, article, entry

**What it is:** A bloom is a flower opening. A moment of expression, color, and beauty. It's what your grove produces. It's why visitors come.

**URL:** `{you}.grove.place/garden/{slug}`

**When to use:**

- "Read my latest bloom"
- "I wrote a new bloom this morning"
- "Their garden has beautiful blooms"
- "This bloom was written in autumn"

**Implementation:**

- Individual pieces of written content
- Has title, body, metadata, optional images
- Can be published, drafted, or scheduled
- Supports Vines (sidebar widgets) per bloom

**Aria/Accessibility:** "blog post" or "article"

---

## The Metaphor Chain

The journey of a Wanderer through Grove:

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   WANDER    │───►│  TAKE ROOT  │───►│ TREE GROWS  │───►│   GROVE     │───►│   BLOOMS    │
│             │    │             │    │             │    │ FLOURISHES  │    │             │
│  explore    │    │  subscribe  │    │   build     │    │   thrive    │    │   create    │
│  the Grove  │    │  plant tree │    │   space     │    │   garden    │    │   content   │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

Each stage has its own vocabulary:

| Stage      | Action      | Result                     |
| ---------- | ----------- | -------------------------- |
| Wander     | Exploring   | Visitor becomes interested |
| Take Root  | Subscribing | Wanderer becomes Rooted    |
| Tree Grows | Customizing | Grove takes shape          |
| Flourishes | Thriving    | Garden fills with blooms   |
| Blooms     | Creating    | Words reach the world      |

---

## Implementation Pattern

### The "step away (unsubscribe)" Approach

Grove terms appear prominently with standard terms available for accessibility:

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│   What Users See          What Screen Readers Say   │
│   ──────────────          ───────────────────────   │
│   "Your Garden"           "blog posts"              │
│   "New Bloom"             "write new post"          │
│   "Visit my grove"        "visit my blog"           │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### URL Structure

| Concept        | URL Pattern                            | Example                                 |
| -------------- | -------------------------------------- | --------------------------------------- |
| Grove (home)   | `{username}.grove.place`               | `autumn.grove.place`                    |
| Garden (index) | `{username}.grove.place/garden`        | `autumn.grove.place/garden`             |
| Bloom (single) | `{username}.grove.place/garden/{slug}` | `autumn.grove.place/garden/hello-world` |
| Static page    | `{username}.grove.place/{slug}`        | `autumn.grove.place/about`              |

### Database Considerations

Internal tables may keep standard names for clarity:

| Public Term | Internal Table | Notes                               |
| ----------- | -------------- | ----------------------------------- |
| Grove       | `tenants`      | The tenant/site record              |
| Garden      | (computed)     | Listing of posts, no separate table |
| Bloom       | `posts`        | Individual content pieces           |

This mirrors the Lattice/Lattice pattern: poetic externally, pragmatic internally.

### UI Components

**Navigation:**

```svelte
<nav aria-label="blog navigation">
  <a href="/garden">Garden</a>
  <a href="/garden/new" aria-label="write new post">New Bloom</a>
</nav>
```

**Bloom Card:**

```svelte
<article class="bloom" aria-label="blog post">
  <h2>{bloom.title}</h2>
  <time>{bloom.publishedAt}</time>
  <p>{bloom.excerpt}</p>
  <a href="/garden/{bloom.slug}" aria-label="read blog post">
    Read this bloom
  </a>
</article>
```

**Empty State:**

```svelte
<div class="garden-empty">
  <p>Your garden is waiting to grow.</p>
  <a href="/garden/new">Plant your first bloom</a>
</div>
```

---

## Voice Examples

### Marketing Copy

**Good:**

> "Start your grove. Grow your garden. Let it bloom."

> "Your words deserve a home. Plant them somewhere beautiful."

> "Every bloom starts with a single thought."

**Avoid:**

> "Start your blog today!"

> "Create your first post!"

> "Your content management system awaits."

### UI Microcopy

**Good:**

- Empty garden: "Your garden is waiting. Plant something."
- New bloom: "What's growing in your mind?"
- Publish: "Let it bloom"
- Save draft: "Tuck it away for now"
- Delete: "Pull this bloom from the garden?"

**Avoid:**

- "No posts yet"
- "Write something"
- "Publish post"
- "Save"
- "Delete post?"

### Error Messages

**Good:**

> "This bloom couldn't be saved. Check your connection and try again."

> "That bloom doesn't exist. It may have been moved or unpublished."

**Avoid:**

> "Post save failed."

> "404: Post not found."

---

## Edge Cases

### When NOT to Use Grove Terms

1. **Legal/compliance text**: Use standard terms for clarity
2. **Developer documentation**: Internal docs can use "posts" and "blogs"
3. **API responses**: Keep JSON keys standard (`posts`, `content`)
4. **Database schemas**: Tables named pragmatically
5. **Error logs**: Technical accuracy over poetry

### Plural Forms

| Singular | Plural  | Usage                         |
| -------- | ------- | ----------------------------- |
| bloom    | blooms  | "Read their blooms"           |
| garden   | gardens | Rare; typically one per grove |
| grove    | groves  | "Explore other groves"        |

### Possessive Forms

- "Autumn's grove" (not "Autumn's Grove")
- "Your garden's blooms" (the blooms in your garden)
- "The grove's wanderers" (people visiting the platform)

---

## Integration with Other Systems

### Reeds (Comments)

Comments on blooms are called Reeds. The terminology complements:

> "The reeds are whispering about your latest bloom."

### Foliage (Theming)

Visual customization applies to the whole grove:

> "Change your foliage to give your grove a new look."

### Vines (Sidebar Widgets)

Content alongside blooms:

> "Add a vine to show related blooms."

### Arbor (Admin Panel)

Where you tend your grove:

> "Head to Arbor to plant a new bloom."

---

## Migration Notes

When updating existing systems:

### Search & Replace (User-Facing)

| Find       | Replace |
| ---------- | ------- |
| blog       | grove   |
| posts      | blooms  |
| post       | bloom   |
| articles   | blooms  |
| article    | bloom   |
| blog index | garden  |
| archive    | garden  |

### Do NOT Replace

- Database table names (keep `posts`)
- API endpoints (keep `/api/posts`)
- Internal variable names (keep `post`, `posts`)
- Technical documentation
- Legal text

---

## Validation Checklist

Before launching any user-facing feature:

- [ ] UI text uses "grove," "garden," "bloom" (not blog/post)
- [ ] Aria labels use standard terms for accessibility
- [ ] Error messages feel warm, not robotic
- [ ] Empty states invite action, not scold
- [ ] Marketing copy follows the voice guide
- [ ] URLs use `/garden` and `/garden/{slug}` pattern
- [ ] Internal code can use standard terms
- [ ] No "Not X, but Y" AI patterns in copy

---

## Quick Reference

| Old Term   | Grove Term  | URL                 | Aria Label       |
| ---------- | ----------- | ------------------- | ---------------- |
| blog       | grove       | `{you}.grove.place` | "blog"           |
| blog index | garden      | `/garden`           | "blog posts"     |
| post       | bloom       | `/garden/{slug}`    | "blog post"      |
| write post | plant bloom | `/garden/new`       | "write new post" |
| all posts  | all blooms  | `/garden`           | "all blog posts" |
| draft      | tucked away | —                   | "draft"          |
| published  | in bloom    | —                   | "published"      |

---

_What you call things matters. These three words are the foundation._

_The name was always there. We just had to walk until we found it._
