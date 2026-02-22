---
aliases: []
date created: Sunday, February 22nd 2026
date modified: Sunday, February 22nd 2026
tags:
  - content
  - architecture
  - post-types
  - garden
type: tech-spec
lastUpdated: "2026-02-22"
---

```
              🌸 bloom        🌿 note        🖼️ image
               │               │               │
               │               │               │
          ╭────┴────╮    ╭─────┴────╮    ╭─────┴────╮
          │  title  │    │  body    │    │  media   │
          │  body   │    │  tags    │    │  caption │
          │  tags   │    │         │    │  alt     │
          │  slug   │    │         │    │         │
          ╰────┬────╯    ╰─────┬────╯    ╰─────┬────╯
               │               │               │
               └───────────────┼───────────────┘
                               │
                    ╭──────────┴──────────╮
                    │    Content Pipeline │
                    │    render · store   │
                    │    index · export   │
                    ╰─────────────────────╯

       Same soil, different seeds, infinite gardens.
```

> _Same soil, different seeds, infinite gardens._

# Dynamic Post Types: Extensible Content Architecture

> _Same soil, different seeds, infinite gardens._

Today, Grove has two post types: blooms (long-form blog posts) and notes (short-form text on Meadow). Adding a third requires schema changes, new API endpoints, new rendering paths, and new export logic. Dynamic Post Types turns content types into configuration instead of architecture. Define a type, define its fields, and the pipeline handles the rest.

**Public Name:** Dynamic Post Types
**Internal Name:** GroveContentTypes
**Location:** `libs/engine/src/lib/content/`
**Extends:** Engine content pipeline, Meadow social feed, Garden display
**Last Updated:** February 2026

A forest isn't just trees. It's ferns and fungi, wildflowers and moss, berry bushes and ivy. Each grows differently, needs different things, but they all share the same soil. Dynamic Post Types gives Grove that same diversity: many content shapes, one content pipeline.

---

## Overview

### What This Is

A system that defines content types as data instead of code. Each type specifies its fields, validation rules, rendering template, and feed behavior. The content pipeline (storage, indexing, export, display) handles all types uniformly. Adding a new type means adding a definition, not changing the architecture.

### Goals

- Add new content types without database migrations
- Extend notes beyond Meadow to individual Grove sites (Garden page)
- Support future content types: images, bookmarks, audio, quotes
- Keep the content pipeline generic: one path for all types
- Maintain backward compatibility with existing blooms and notes

### Non-Goals (Out of Scope)

- Custom field types beyond the standard set (text, number, url, media, tags, date)
- User-defined content types (Wanderers don't create types. Grove does.)
- Changing the Meadow social feed architecture
- Replacing the existing posts table (migration is additive)
- Full CMS-style content modeling (Grove is a blog platform with extras, not a CMS)

---

## Current State

### What Exists Today

```
Engine (individual sites):
  posts table
    └── All posts are blooms (long-form blog posts)
    └── Fields: title, slug, markdown_content, description, tags, status, ...
    └── Displayed on: blog page, post pages, RSS feed

Meadow (community feed):
  meadow_posts table
    └── post_type: "bloom" | "note"
    └── Blooms: syndicated via RSS from individual sites
    └── Notes: native short-form, body field (1000 char limit)
    └── Notes exist ONLY on Meadow (not on individual sites)
```

### The Problem

Notes live only on Meadow. A Wanderer writes a note, and it appears in the social feed but not on their own site. The Garden page was envisioned as the place for notes on individual sites, but it doesn't exist yet because the engine's content pipeline only knows about blooms.

Adding notes to individual sites means:
- Adding `post_type` to the engine's `posts` table
- Creating a Notes API separate from the Posts API (or extending it)
- Building the Garden page
- Teaching the RSS feed about notes
- Teaching the export system about notes
- Teaching themes about notes

Each new type would repeat this process. Dynamic Post Types makes it happen once.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                      Content Type Registry                           │
│                                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│  │  Bloom   │  │   Note   │  │  Image   │  │ Bookmark │  ...      │
│  │ (long)   │  │ (short)  │  │ (visual) │  │ (link)   │           │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘           │
│       │              │              │              │                │
│       └──────────────┴──────┬───────┴──────────────┘                │
│                             │                                       │
│                     Content Pipeline                                │
│                                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│  │ Validate │→│  Store   │→│  Index   │→│  Render  │           │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘           │
│                                                                      │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                          │
│  │  Export  │  │   Feed   │  │   API    │                          │
│  └──────────┘  └──────────┘  └──────────┘                          │
└─────────────────────────────────────────────────────────────────────┘
```

### Content Type Definition

Each type is defined as a TypeScript object:

```typescript
interface ContentTypeDefinition {
  /** Unique type identifier */
  type: string;

  /** Display name */
  label: string;

  /** Description for Wanderers */
  description: string;

  /** Where this type appears */
  display: {
    /** Show on the individual site? (blog page, or dedicated page) */
    site: boolean;
    /** Show on Meadow social feed? */
    meadow: boolean;
    /** Dedicated page slug on the site (e.g., "garden" for notes) */
    page?: string;
    /** Include in RSS feed? */
    rss: boolean;
    /** Include in .grove exports? */
    export: boolean;
  };

  /** Field definitions */
  fields: ContentField[];

  /** Validation rules */
  validation: {
    maxLength?: Record<string, number>;
    required: string[];
  };

  /** Rendering hints */
  rendering: {
    /** Template to use for display */
    template: "long-form" | "short-form" | "media" | "link";
    /** Show title in feeds? */
    showTitle: boolean;
    /** Excerpt strategy */
    excerpt: "description" | "truncate" | "none";
  };
}

interface ContentField {
  name: string;
  type: "text" | "richtext" | "url" | "media" | "tags" | "number" | "date";
  label: string;
  required: boolean;
  maxLength?: number;
}
```

### Built-in Type Definitions

```typescript
const BLOOM: ContentTypeDefinition = {
  type: "bloom",
  label: "Blog Post",
  description: "Long-form writing. The heart of your grove.",
  display: {
    site: true,
    meadow: true,
    page: undefined,   // Shows on main blog page
    rss: true,
    export: true,
  },
  fields: [
    { name: "title", type: "text", label: "Title", required: true, maxLength: 200 },
    { name: "slug", type: "text", label: "URL Path", required: true },
    { name: "description", type: "text", label: "Description", required: false, maxLength: 500 },
    { name: "markdown_content", type: "richtext", label: "Content", required: true },
    { name: "featured_image", type: "media", label: "Featured Image", required: false },
    { name: "tags", type: "tags", label: "Tags", required: false },
  ],
  validation: {
    maxLength: { title: 200, description: 500 },
    required: ["title", "slug", "markdown_content"],
  },
  rendering: {
    template: "long-form",
    showTitle: true,
    excerpt: "description",
  },
};

const NOTE: ContentTypeDefinition = {
  type: "note",
  label: "Note",
  description: "Short thoughts. Quick updates. Garden whispers.",
  display: {
    site: true,
    meadow: true,
    page: "garden",    // Notes appear on the Garden page
    rss: true,
    export: true,
  },
  fields: [
    { name: "body", type: "text", label: "Note", required: true, maxLength: 1000 },
    { name: "tags", type: "tags", label: "Tags", required: false },
  ],
  validation: {
    maxLength: { body: 1000 },
    required: ["body"],
  },
  rendering: {
    template: "short-form",
    showTitle: false,
    excerpt: "truncate",
  },
};
```

### Future Type Definitions

```typescript
const IMAGE: ContentTypeDefinition = {
  type: "image",
  label: "Image Post",
  description: "A photo or illustration with optional caption.",
  display: {
    site: true,
    meadow: true,
    page: "gallery",
    rss: true,
    export: true,
  },
  fields: [
    { name: "media", type: "media", label: "Image", required: true },
    { name: "caption", type: "text", label: "Caption", required: false, maxLength: 500 },
    { name: "alt", type: "text", label: "Alt Text", required: true, maxLength: 300 },
    { name: "tags", type: "tags", label: "Tags", required: false },
  ],
  validation: {
    required: ["media", "alt"],
  },
  rendering: {
    template: "media",
    showTitle: false,
    excerpt: "none",
  },
};

const BOOKMARK: ContentTypeDefinition = {
  type: "bookmark",
  label: "Bookmark",
  description: "A link to something worth remembering.",
  display: {
    site: true,
    meadow: false,     // Bookmarks are personal, not social
    page: "bookmarks",
    rss: false,
    export: true,
  },
  fields: [
    { name: "url", type: "url", label: "Link", required: true },
    { name: "title", type: "text", label: "Title", required: false, maxLength: 200 },
    { name: "description", type: "text", label: "Why I saved this", required: false, maxLength: 500 },
    { name: "tags", type: "tags", label: "Tags", required: false },
  ],
  validation: {
    required: ["url"],
  },
  rendering: {
    template: "link",
    showTitle: true,
    excerpt: "description",
  },
};
```

---

## Database Design

### Schema Changes

Instead of adding columns for each new type, use a flexible schema that stores type-specific data as JSON.

```sql
-- Add post_type to the engine's posts table
ALTER TABLE posts ADD COLUMN post_type TEXT NOT NULL DEFAULT 'bloom';

-- Flexible fields for non-bloom content
ALTER TABLE posts ADD COLUMN content_fields TEXT DEFAULT '{}';
-- JSON object with type-specific fields:
-- Notes: {"body": "Short thought here"}
-- Images: {"media_id": "fil_01JN", "caption": "Sunset", "alt": "Orange sky over mountains"}
-- Bookmarks: {"url": "https://...", "description": "Great article about..."}

-- Index for type-based queries
CREATE INDEX idx_posts_type ON posts(tenant_id, post_type, published_at DESC);
```

### Why JSON for Extra Fields?

Blooms use the existing columns (`title`, `markdown_content`, `description`, etc.). They don't change. Other types store their fields in `content_fields` JSON. This avoids:

- Schema migrations for each new type
- NULL columns that only apply to one type
- Breaking existing queries that expect bloom-shaped data

The tradeoff: JSON fields can't be indexed for search. That's acceptable because search is already handled by a separate full-text index, and type-specific queries (like "show all bookmarks with this URL") are rare.

### Query Patterns

```sql
-- Get all blooms for a tenant (existing query, unchanged)
SELECT * FROM posts WHERE tenant_id = ? AND post_type = 'bloom' AND status = 'published'
ORDER BY published_at DESC;

-- Get all notes for the Garden page
SELECT id, content_fields, tags, published_at
FROM posts WHERE tenant_id = ? AND post_type = 'note' AND status = 'published'
ORDER BY published_at DESC;

-- Get all content for export (all types)
SELECT * FROM posts WHERE tenant_id = ? AND status = 'published'
ORDER BY published_at DESC;

-- Get notes body via JSON
SELECT json_extract(content_fields, '$.body') as body FROM posts
WHERE post_type = 'note' AND tenant_id = ?;
```

---

## The Garden

The Garden is the dedicated page for notes on individual Grove sites. Like the blog page is for blooms, the Garden is for notes.

```
autumn.grove.place/garden

┌─────────────────────────────────────────────────────────────┐
│                                                              │
│  🌿 Garden                                                   │
│                                                              │
│  ─────────────────────────────────────────────               │
│                                                              │
│  Just realized the best code I wrote today was                │
│  the code I deleted.                                         │
│  February 22, 2026 · #coding #reflections                    │
│                                                              │
│  ─────────────────────────────────────────────               │
│                                                              │
│  Morning tea, morning code, morning light through              │
│  the window. Some days just start right.                      │
│  February 21, 2026 · #mornings                               │
│                                                              │
│  ─────────────────────────────────────────────               │
│                                                              │
│  New spec finished! Content signing gives every post          │
│  a cryptographic signature. Your words carry your             │
│  name. Always.                                               │
│  February 20, 2026 · #grove #development                    │
│                                                              │
│  ─────────────────────────────────────────────               │
│                                                              │
│  « Older notes                                               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Garden as a Curio

The Garden page is enabled through the existing Curios system. Curios are optional features that Wanderers can toggle on/off.

```typescript
// Addition to curios configuration
const GARDEN_CURIO: CurioDefinition = {
  id: "garden",
  name: "Garden",
  description: "A page for short notes and quick thoughts.",
  route: "/garden",
  icon: "🌿",
  defaultEnabled: false,    // Opt-in (for now)
  requiresPostType: "note", // Only available when notes are enabled
};
```

---

## Content Pipeline

### Unified API

All content types go through one API, differentiated by `post_type`:

```
POST   /api/posts              ← Create any type (post_type in body)
GET    /api/posts              ← List all types (filter by post_type)
GET    /api/posts/:id          ← Get any type
PUT    /api/posts/:id          ← Update any type
DELETE /api/posts/:id          ← Delete any type
POST   /api/posts/:id/publish  ← Publish any type
```

### Type-Specific Validation

```typescript
async function validateContent(
  postType: string,
  data: Record<string, unknown>,
): Promise<ValidationResult> {
  const typeDef = getContentType(postType);
  if (!typeDef) {
    throw new GroveError(API_ERRORS.INVALID_POST_TYPE);
  }

  const errors: string[] = [];

  for (const field of typeDef.fields) {
    const value = data[field.name];

    if (field.required && !value) {
      errors.push(`${field.label} is required.`);
    }

    if (value && field.maxLength && String(value).length > field.maxLength) {
      errors.push(`${field.label} exceeds ${field.maxLength} characters.`);
    }
  }

  return { valid: errors.length === 0, errors };
}
```

### RSS Feed Integration

Notes and other types that have `display.rss: true` appear in the site's RSS feed. Each type renders differently in the feed:

```typescript
function renderFeedItem(post: Post, typeDef: ContentTypeDefinition): FeedItem {
  switch (typeDef.rendering.template) {
    case "long-form":
      return {
        title: post.title,
        description: post.description,
        content: post.html_content,
        link: `/${post.slug}`,
      };

    case "short-form":
      const fields = JSON.parse(post.content_fields);
      return {
        title: null,   // Notes don't have titles
        description: truncate(fields.body, 200),
        content: `<p>${escapeHtml(fields.body)}</p>`,
        link: `/garden#${post.id}`,
      };

    case "media":
      const mediaFields = JSON.parse(post.content_fields);
      return {
        title: mediaFields.caption || "Image post",
        description: mediaFields.alt,
        content: `<img src="${mediaFields.media_url}" alt="${mediaFields.alt}">`,
        link: `/gallery#${post.id}`,
      };

    // ... other templates
  }
}
```

### Export Integration

All content types are included in `.grove` exports. The `content-index.json` includes the type:

```json
{
  "posts": [
    {
      "slug": "hello-world",
      "title": "Hello World",
      "postType": "bloom",
      "file": "posts/hello-world.md"
    },
    {
      "postType": "note",
      "file": "notes/note-01JM.json",
      "body": "Just realized the best code I wrote today was the code I deleted.",
      "tags": ["coding", "reflections"]
    }
  ]
}
```

Notes export as JSON files (not Markdown, since they don't have rich content). Images export with the media file and a metadata JSON. Bookmarks export as JSON with the URL and description.

---

## Meadow Integration

Meadow already supports `post_type: "bloom" | "note"`. Dynamic Post Types extends this with the type registry, but Meadow's social feed stays curated. Not all types belong in Meadow.

```
Type        → Meadow?  → Why
─────────────────────────────────────────────
bloom       → yes      → Community sharing
note        → yes      → Quick thoughts
image       → yes      → Visual sharing
bookmark    → no       → Personal, not social
quote       → yes      → Sharing inspiration
audio       → yes      → Podcasts, music
```

The `display.meadow` flag in each type definition controls this.

---

## Theme Integration

Themes need to render different content types. The type registry provides rendering hints that themes can use.

```css
/* Theme CSS can style types differently */
.grove-post[data-type="bloom"] {
  /* Long-form blog post styles */
}

.grove-post[data-type="note"] {
  /* Short, casual note styles */
  font-size: 1.1rem;
  border-left: 3px solid var(--accent);
  padding-left: 1rem;
}

.grove-post[data-type="image"] {
  /* Image-forward layout */
}
```

The rendering template hint (`long-form`, `short-form`, `media`, `link`) tells themes which layout to use. Themes don't need to know every type. They support templates.

---

## Security Considerations

- **Type registry is code, not user data.** Wanderers can't create custom types. Type definitions live in the codebase. This prevents injection of arbitrary field definitions.
- **JSON field validation.** `content_fields` is validated against the type definition before storage. No arbitrary JSON accepted.
- **Existing security applies.** CSRF, auth, tenant isolation, rate limiting all work the same regardless of content type.

---

## Implementation Checklist

### Phase 1: Type Registry (Week 1)

- [ ] Create `libs/engine/src/lib/content/` directory
- [ ] Define `ContentTypeDefinition` interface
- [ ] Register `BLOOM` and `NOTE` built-in types
- [ ] Implement `getContentType()` and `listContentTypes()`

### Phase 2: Schema and API (Week 1-2)

- [ ] Add `post_type` and `content_fields` columns to posts table
- [ ] Extend POST/PUT `/api/posts` to accept `post_type`
- [ ] Implement type-specific validation in the API
- [ ] Update GET `/api/posts` to filter by `post_type`

### Phase 3: Notes on Sites (Week 2-3)

- [ ] Create `/garden` route in engine
- [ ] Add Garden curio definition
- [ ] Build note creation UI in Arbor dashboard
- [ ] Render notes in the site's RSS feed

### Phase 4: Meadow Sync (Week 3)

- [ ] Sync site notes to Meadow (like blooms sync via RSS)
- [ ] Update Meadow feed to handle new types via registry
- [ ] Ensure backward compatibility with existing meadow_posts

### Phase 5: Export and Themes (Week 3-4)

- [ ] Update `.grove` export to include all content types
- [ ] Update content-index.json schema for type metadata
- [ ] Add type-based CSS classes for theme styling
- [ ] Document theme template hints for theme developers

### Phase 6: Future Types (When Needed)

- [ ] Image type (requires Gallery curio)
- [ ] Bookmark type (requires Bookmarks curio)
- [ ] Quote type
- [ ] Audio type

---

*Same soil, different seeds, infinite gardens.*
