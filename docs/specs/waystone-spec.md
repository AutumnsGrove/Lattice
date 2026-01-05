---
aliases: []
date created: Monday, December 29th 2025
date modified: Thursday, January 2nd 2026
tags:
  - documentation
  - help-center
  - user-experience
type: tech-spec
---

# Waystone — Help Center

```
                                              🌲
      🌲                    ╱╲
               🌲          ╱  ╲               🌲
                          ╱ →  ╲
    ·  ·  ·  ·  ·  ·  ·  ╱──────╲  ·  ·  ·  ·  ·  ·  ·
    ─────────────────────────────────────────────────────
                      the path

                Markers for when you're lost.
```

> *Trail markers that guide you through the forest.*

Grove's built-in help center providing searchable documentation, contextual help buttons throughout the interface, and self-service support. Integrated directly into the platform so help is always where you need it.

**Public Name:** Waystone
**Internal Name:** GroveWaystone
**Version:** 1.0 Draft
**Last Updated:** December 2025

Waystones are the markers travelers leave along forest paths, guiding those who follow, showing the way forward. Waystone is Grove's built-in help center: searchable documentation, contextual help buttons, and a lantern to light your path when you're lost.

---

## Implementation Status

| Field | Value |
|-------|-------|
| **Status** | Specification approved, development pending |
| **Target Phase** | Phase 4 (Help & Documentation) |
| **Prerequisites** | Core blog engine, Admin panel |

---

## Overview

Grove's Help Center is built directly into the platform—no external docs site, no separate logins. It provides comprehensive documentation, contextual help buttons throughout the interface, and searchable articles for self-service support.

### Design Philosophy

- **Accessible:** Anyone can use Grove, regardless of technical skill
- **Integrated:** Help is where you need it, not hidden away
- **Searchable:** Find answers fast
- **Honest:** Clear about what Grove can and can't do
- **Maintainable:** Text-first for easy updates as the platform evolves

---

## 1. Help Center Structure

### 1.1 Main Categories

```
Help Center
├── 🌱 Getting Started
│   ├── Creating your account
│   ├── Choosing your plan
│   ├── Your first post
│   ├── Understanding the admin panel
│   └── Revisiting the tour
│
├── ✍️ Writing & Publishing
│   ├── The markdown editor
│   ├── Formatting your posts
│   ├── Adding images and media
│   ├── Tags and organization
│   ├── Vines (sidebar links)
│   ├── Drafts and scheduling
│   └── RSS feed
│
├── 🎨 Customization
│   ├── Choosing a theme
│   ├── Custom accent colors
│   ├── Theme customizer (Oak+)
│   ├── Custom fonts (Evergreen)
│   └── Community themes (Oak+)
│
├── ⚙️ Blog Settings
│   ├── Site title and description
│   ├── SEO and social previews
│   ├── Social links
│   ├── Privacy and visibility
│   └── Custom domain setup (Oak+)
│
├── 💬 Comments & Interaction
│   ├── Understanding replies vs comments
│   ├── Moderating your comments
│   ├── Comment settings
│   ├── Blocking users
│   └── Notifications
│
├── 🌿 Meadow (Social)
│   ├── What is Meadow?
│   ├── Opting into the feed
│   ├── Reactions and voting
│   ├── Your Meadow profile
│   └── Feed curation
│
├── 💳 Billing & Plans
│   ├── Understanding your plan
│   ├── Upgrading or downgrading
│   ├── Payment methods
│   ├── Invoices and receipts
│   └── Cancellation and refunds
│
├── 📦 Your Data
│   ├── Exporting your content
│   ├── Data portability
│   ├── Account deletion
│   ├── Backup information
│   └── GDPR and privacy rights
│
├── 📜 Vision & Legal
│   ├── Grove's vision
│   ├── Terms of Service
│   ├── Privacy Policy
│   ├── Acceptable Use Policy
│   ├── Data Portability Policy
│   └── Refund Policy
│
└── 🔧 Troubleshooting
    ├── Common issues
    ├── Browser compatibility
    ├── Known limitations
    ├── Status page
    └── Contact support
```

### 1.2 URL Structure

```
/help                           # Help Center home
/help/getting-started           # Category page
/help/getting-started/first-post # Individual article
/help/search?q=markdown         # Search results
```

---

## 2. Article Structure

### 2.1 Article Components

Each help article contains:

| Component | Required | Description |
|-----------|----------|-------------|
| Title | Yes | Clear, action-oriented |
| Description | Yes | One-sentence summary |
| Content | Yes | Step-by-step instructions |
| Related Articles | Optional | Links to related topics |
| Feedback | Yes | "Was this helpful?" prompt |
| Last Updated | Yes | When article was last revised |

### 2.2 Article Template

```markdown
---
title: "Your First Post"
description: "Learn how to write and publish your first blog post on Grove."
category: "getting-started"
order: 3
lastUpdated: "2025-12-13"
---

# Your First Post

Welcome! Let's get your first post published.

## Step 1: Open the Editor

From your admin panel, click **New Post** in the sidebar.

![Screenshot of new post button](/help/images/new-post-button.png)

## Step 2: Write Your Content

Grove uses Markdown for formatting. Here are the basics:

- **Bold:** `**text**`
- *Italic:* `*text*`
- [Links](#): `[text](url)`

> 💡 **Tip:** Use the preview panel to see how your post will look.

## Step 3: Add a Title

Enter your post title at the top. This becomes your URL slug.

## Step 4: Publish

Click **Publish** when you're ready. Your post is now live!

---

## Related Articles

- [The Markdown Editor](/help/writing/markdown-editor)
- [Adding Images](/help/writing/adding-images)
- [Vines (Sidebar Links)](/help/writing/vines)

---

*Was this helpful?* [Yes] [No]
```

### 2.3 Writing Guidelines

- **Action-oriented titles:** "Adding Images" not "Images in Grove"
- **Step-by-step format:** Numbered steps for tasks
- **Screenshots:** Use sparingly (they become outdated)
- **Tips and warnings:** Use callout boxes
- **Plain language:** No jargon, explain technical terms
- **Short paragraphs:** Easy to scan

---

## 3. Contextual Help

### 3.1 Overview

Throughout the admin panel, contextual help buttons link directly to relevant documentation—similar to Cloudflare's approach.

### 3.2 Help Button Placement

```
┌─────────────────────────────────────────────────────────────────┐
│ Theme Settings                                           [?]    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Choose your theme:                                             │
│  ...                                                            │
└─────────────────────────────────────────────────────────────────┘
           │
           └─→ Links to /help/customization/choosing-theme
```

### 3.3 Help Button Component

```svelte
<script>
  export let article: string; // e.g., "customization/choosing-theme"
</script>

<a
  href="/help/{article}"
  target="_blank"
  class="help-button"
  title="Learn more"
>
  <span class="sr-only">Help: {article}</span>
  ?
</a>

<style>
  .help-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    color: var(--color-foreground-muted);
    font-size: 12px;
    text-decoration: none;
  }

  .help-button:hover {
    background: var(--color-accent);
    color: white;
    border-color: var(--color-accent);
  }
</style>
```

### 3.4 Contextual Help Mapping

| Admin Section | Help Article |
|---------------|--------------|
| Post Editor | `/help/writing/markdown-editor` |
| Media Gallery | `/help/writing/adding-images` |
| Theme Settings | `/help/customization/choosing-theme` |
| Comment Settings | `/help/comments/settings` |
| Site Settings | `/help/settings/site-title` |
| Billing | `/help/billing/understanding-plans` |
| Export Data | `/help/data/exporting` |
| Vines Editor | `/help/writing/vines` |

---

## 4. Search

### 4.1 Search Requirements

- **Full-text search** across all articles
- **Instant results** as user types (debounced)
- **Relevance ranking** based on title > description > content
- **Category filtering** (optional)
- **No external service** (built into platform)

### 4.2 Search UI

```
┌─────────────────────────────────────────────────────────────────┐
│ Help Center                                                     │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ 🔍 Search help articles...                              │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  Results for "markdown"                             3 results   │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ The Markdown Editor                                      │   │
│  │ Learn to use Grove's markdown editor with live preview.  │   │
│  │ Writing & Publishing                                     │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Formatting Your Posts                                    │   │
│  │ All the markdown syntax you need to know.                │   │
│  │ Writing & Publishing                                     │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 4.3 Search Implementation

Using SQLite FTS5 (available in D1):

```sql
-- Create FTS table for help articles
CREATE VIRTUAL TABLE help_search USING fts5(
  title,
  description,
  content,
  category,
  slug UNINDEXED
);

-- Search query
SELECT
  slug,
  title,
  description,
  category,
  highlight(help_search, 0, '<mark>', '</mark>') as title_highlighted
FROM help_search
WHERE help_search MATCH ?
ORDER BY rank
LIMIT 20;
```

---

## 5. Feedback System

### 5.1 "Was This Helpful?"

Every article includes a feedback prompt:

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  Was this helpful?                                              │
│                                                                 │
│  [👍 Yes]  [👎 No]                                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 Feedback Flow

**If "Yes":**
```
Thanks! Glad we could help. 🌿
```

**If "No":**
```
┌─────────────────────────────────────────────────────────────────┐
│ Sorry this wasn't helpful. What were you looking for?           │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────┐     │
│ │                                                         │     │
│ │                                                         │     │
│ └─────────────────────────────────────────────────────────┘     │
│                                                                 │
│ [Submit Feedback]  [Contact Support]                            │
└─────────────────────────────────────────────────────────────────┘
```

### 5.3 Feedback Metrics

Track per article:
- Total views
- Helpful: Yes count
- Helpful: No count
- Helpfulness ratio (Yes / Total responses)
- Feedback comments

**Admin Dashboard Widget:**
```
┌─────────────────────────────────────────────────────────────────┐
│ Help Center Metrics                                  [Admin]    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Most Viewed (This Week)         Needs Improvement (<70%)       │
│  1. Your First Post (342)        • Custom Domain Setup (52%)    │
│  2. Adding Images (289)          • RSS Feed (61%)               │
│  3. Markdown Editor (201)        • GDPR Rights (65%)            │
│                                                                 │
│  Overall Helpfulness: 84%                                       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 6. Contact Support

### 6.1 Support Flow

When users can't find what they need:

```
┌─────────────────────────────────────────────────────────────────┐
│ Contact Support                                                 │
│                                                                 │
│  Can't find what you're looking for?                            │
│                                                                 │
│  Email: autumnbrown23@pm.me                                      │
│  Response time: Within 48 hours                                 │
│                                                                 │
│  Or describe your issue below and we'll get back to you:        │
│                                                                 │
│  Subject: [                                               ]     │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ Describe your issue...                                  │    │
│  │                                                         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  [Send Message]                                                 │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 6.2 Support Tiers

| Tier | Support Level | Response Time |
|------|---------------|---------------|
| Free | Help Center only | — |
| Seedling | Help Center only | — |
| Sapling | Email support | 48 hours |
| Oak | Priority email | 24 hours |
| Evergreen | Priority email + 8hrs included | 24 hours |

---

## 7. Tour Integration

### 7.1 Revisiting the Tour

Users can restart the interactive tour from the Help Center:

```
┌─────────────────────────────────────────────────────────────────┐
│ Getting Started                                                 │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ 🎓 Take the Tour                                         │   │
│  │                                                          │   │
│  │ New to Grove? Our interactive tour walks you through     │   │
│  │ everything you need to know in about 5 minutes.          │   │
│  │                                                          │   │
│  │ [Start Tour →]                                           │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Articles:                                                      │
│  • Creating your account                                        │
│  • Choosing your plan                                           │
│  • Your first post                                              │
│  ...                                                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 8. Legal & Vision Pages

### 8.1 Integrated Legal Docs

The Help Center includes links to all legal documents:

- Terms of Service
- Privacy Policy
- Acceptable Use Policy
- Data Portability Policy
- Refund Policy

These are displayed in the same clean format as help articles.

### 8.2 Vision Page

Link to Grove's vision document (`grove-vision.md`) for users who want to understand the philosophy behind the platform.

```
┌─────────────────────────────────────────────────────────────────┐
│ Grove's Vision                                                  │
│                                                                 │
│  Why Grove exists, what we're building, and the principles      │
│  that guide us.                                                 │
│                                                                 │
│  [Read Our Vision →]                                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 9. Database Schema

### 9.1 Help Articles Table

```sql
CREATE TABLE help_articles (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL, -- e.g., "writing/markdown-editor"

  title TEXT NOT NULL,
  description TEXT NOT NULL,
  content TEXT NOT NULL, -- Markdown

  category TEXT NOT NULL,
  category_order INTEGER DEFAULT 0, -- For sorting within category

  -- Metadata
  last_updated INTEGER DEFAULT (unixepoch()),
  created_at INTEGER DEFAULT (unixepoch()),

  -- Status
  published INTEGER DEFAULT 1
);

CREATE INDEX idx_help_category ON help_articles(category);
CREATE INDEX idx_help_slug ON help_articles(slug);
```

### 9.2 Help Feedback Table

```sql
CREATE TABLE help_feedback (
  id TEXT PRIMARY KEY,
  article_id TEXT NOT NULL,

  helpful INTEGER NOT NULL, -- 1 = yes, 0 = no
  comment TEXT, -- Optional feedback text

  user_id TEXT, -- NULL for anonymous
  created_at INTEGER DEFAULT (unixepoch()),

  FOREIGN KEY (article_id) REFERENCES help_articles(id)
);

CREATE INDEX idx_feedback_article ON help_feedback(article_id);
```

### 9.3 Help Search Index

```sql
-- FTS5 virtual table for search
CREATE VIRTUAL TABLE help_search USING fts5(
  title,
  description,
  content,
  slug UNINDEXED,
  content='help_articles',
  content_rowid='rowid'
);

-- Triggers to keep FTS in sync
CREATE TRIGGER help_ai AFTER INSERT ON help_articles BEGIN
  INSERT INTO help_search(rowid, title, description, content, slug)
  VALUES (NEW.rowid, NEW.title, NEW.description, NEW.content, NEW.slug);
END;

CREATE TRIGGER help_ad AFTER DELETE ON help_articles BEGIN
  INSERT INTO help_search(help_search, rowid, title, description, content, slug)
  VALUES ('delete', OLD.rowid, OLD.title, OLD.description, OLD.content, OLD.slug);
END;

CREATE TRIGGER help_au AFTER UPDATE ON help_articles BEGIN
  INSERT INTO help_search(help_search, rowid, title, description, content, slug)
  VALUES ('delete', OLD.rowid, OLD.title, OLD.description, OLD.content, OLD.slug);
  INSERT INTO help_search(rowid, title, description, content, slug)
  VALUES (NEW.rowid, NEW.title, NEW.description, NEW.content, NEW.slug);
END;
```

---

## 10. Future Migration

### 10.1 Migration Considerations

If Grove eventually outgrows the built-in Help Center, migration paths include:

| Platform | Pros | Cons |
|----------|------|------|
| **GitBook** | Beautiful, versioned, free tier | External, less integrated |
| **Docusaurus** | Open source, self-hosted | More maintenance |
| **Notion** | Easy editing, familiar | External, less customizable |
| **ReadMe** | Developer-focused, API docs | Overkill for Grove |

### 10.2 Migration Preparation

To ease future migration:

- Articles stored as standard Markdown
- Clear frontmatter format
- Images in portable structure
- Export script included

**Export Script (Future):**
```typescript
// Export all help articles to standard markdown files
async function exportHelpCenter(): Promise<void> {
  const articles = await db.query('SELECT * FROM help_articles');

  for (const article of articles) {
    const path = `help-export/${article.category}/${article.slug}.md`;
    const content = formatArticleAsMarkdown(article);
    await writeFile(path, content);
  }
}
```

---

## 11. Implementation Checklist

### Phase 1: Core Structure
- [ ] Create help center routes (`/help`, `/help/[category]`, `/help/[...slug]`)
- [ ] Build article layout component
- [ ] Create help articles database table
- [ ] Build category navigation
- [ ] Implement basic search (FTS5)

### Phase 2: Content
- [ ] Write Getting Started articles (5)
- [ ] Write Writing & Publishing articles (7)
- [ ] Write Customization articles (5)
- [ ] Write Settings articles (5)
- [ ] Write Comments articles (5)
- [ ] Write Meadow articles (5)
- [ ] Write Billing articles (5)
- [ ] Write Data articles (5)
- [ ] Write Troubleshooting articles (5)

### Phase 3: Integration
- [ ] Add contextual help buttons throughout admin panel
- [ ] Map all help buttons to articles
- [ ] Integrate tour restart from Help Center
- [ ] Link legal docs from Help Center

### Phase 4: Feedback
- [ ] Build "Was this helpful?" component
- [ ] Create feedback database table
- [ ] Build admin metrics dashboard
- [ ] Set up feedback alerts for low-rated articles

### Phase 5: Polish
- [ ] Add article last-updated dates
- [ ] Build related articles component
- [ ] Add breadcrumb navigation
- [ ] Optimize search ranking
- [ ] Add keyboard shortcuts (/ to search)

---

## 12. Content Guidelines

### 12.1 Voice & Tone

- **Warm but not cutesy:** "Let's get started" not "Let's gooo! 🚀"
- **Direct:** Say what you mean
- **Helpful:** Assume good faith, explain patiently
- **Honest:** Acknowledge limitations

### 12.2 Formatting Rules

- **Headings:** Use H2 for main sections, H3 for subsections
- **Lists:** Prefer bullet points for features, numbered lists for steps
- **Code:** Use inline code for UI elements (`**Bold**`)
- **Images:** Alt text required, max width 600px
- **Callouts:** Use sparingly for tips and warnings

### 12.3 Callout Types

```markdown
> 💡 **Tip:** Helpful suggestion

> ⚠️ **Warning:** Something to watch out for

> ℹ️ **Note:** Additional context

> 🎉 **New:** Recently added feature
```

---

*This specification ensures Grove users can find help when they need it—whether through searchable articles, contextual buttons, or the interactive tour. The Help Center is built to grow with the platform while remaining maintainable.*
