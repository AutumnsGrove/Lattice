# Fiction House Publishing — Project Specification

> A warm, welcoming home for Fiction House Publishing. Built on GroveEngine, leveraging the tenant architecture with custom book catalog features.

**Repository:** `AutumnsGrove/FictionHousePublishing` (private)
**Business Name:** Fiction House Publishing
**Domain:** Custom domain (TBD)
**Type:** Custom site using `@autumnsgrove/groveengine` as dependency

---

## Project Overview

Fiction House Publishing is a publishing house portfolio site featuring:
- **Book Catalog** — Showcasing published works with cover images, descriptions, and purchase links
- **Blog** — Updates, author insights, and publishing news
- **About** — The story behind Fiction House
- **Contact** — How to reach the publisher

This is a **single-tenant deployment** using GroveEngine's infrastructure. We leverage the existing tenant architecture (D1 tables, auth, admin panel) with minimal site-specific additions.

---

## Design Philosophy

- **Warm & Comforting** — Like a cozy bookshop or reading nook
- **Grove Green** — Primary accent color from the Grove palette
- **Clean & Readable** — Typography-focused, content-first
- **Light Mode Default** — With dark mode toggle for evening readers
- **Professional but Personal** — A publishing house that feels approachable

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | SvelteKit 2.0+ with Svelte 5 |
| **Styling** | Tailwind CSS |
| **Database** | Cloudflare D1 (SQLite) |
| **Storage** | Cloudflare R2 (images, book covers) |
| **Auth** | Heartwood (GroveAuth) via engine |
| **Hosting** | Cloudflare Pages |
| **Package** | `@autumnsgrove/groveengine` |

---

## Project Structure

```
FictionHousePublishing/
├── src/
│   ├── app.css                    # Global styles, Grove theme
│   ├── app.html                   # HTML template
│   ├── routes/
│   │   ├── +layout.svelte         # Site layout with header/footer
│   │   ├── +layout.server.ts      # Load site settings, tenant data
│   │   ├── +page.svelte           # Homepage
│   │   ├── +page.server.ts        # Load featured books
│   │   ├── about/
│   │   │   └── +page.svelte       # About Fiction House
│   │   ├── books/
│   │   │   ├── +page.svelte       # Book catalog grid
│   │   │   ├── +page.server.ts    # Load all books from D1
│   │   │   └── [slug]/
│   │   │       ├── +page.svelte   # Individual book page
│   │   │       └── +page.server.ts
│   │   ├── blog/
│   │   │   ├── +page.svelte       # Blog listing
│   │   │   ├── +page.server.ts    # Load posts from D1
│   │   │   └── [slug]/
│   │   │       ├── +page.svelte   # Individual post
│   │   │       └── +page.server.ts
│   │   ├── contact/
│   │   │   └── +page.svelte       # Contact page with form
│   │   ├── api/
│   │   │   └── contact/
│   │   │       └── +server.ts     # Contact form email handler
│   │   ├── admin/                 # Admin panel (from engine)
│   │   │   └── [...path]/
│   │   │       └── +page.svelte   # Re-export engine admin
│   │   └── auth/                  # Auth routes (from engine)
│   │       ├── login/
│   │       ├── logout/
│   │       └── callback/
│   └── lib/
│       ├── components/
│       │   ├── Header.svelte      # Site header with nav
│       │   ├── Footer.svelte      # Site footer
│       │   ├── BookCard.svelte    # Book display card
│       │   ├── BookGrid.svelte    # Grid of BookCards
│       │   ├── BookDetail.svelte  # Full book page content
│       │   ├── HeroSection.svelte # Homepage hero
│       │   ├── FeaturedBooks.svelte # Homepage featured section
│       │   ├── ContactForm.svelte # Contact form with email send
│       │   └── ThemeToggle.svelte # Dark mode toggle
│       ├── server/
│       │   └── books.ts           # Book CRUD operations
│       └── types.ts               # TypeScript interfaces
├── migrations/
│   └── 001_books.sql              # Books table schema
├── static/
│   ├── favicon.ico
│   └── images/
│       └── placeholder-cover.jpg  # Default book cover
├── wrangler.toml                  # Cloudflare configuration
├── package.json
├── svelte.config.js
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

---

## Database Schema

### Using Existing Tenant Tables

From GroveEngine, we use:
- `tenants` — Site configuration (single tenant for this site)
- `posts` — Blog posts
- `pages` — Static pages (About content)
- `media` — Image uploads (book covers, blog images)

### New Table: Books

```sql
-- migrations/001_books.sql

-- Books catalog for Fiction House Publishing
CREATE TABLE IF NOT EXISTS books (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,

  -- Book metadata
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  subtitle TEXT,
  author TEXT NOT NULL,
  description TEXT,               -- Short blurb for cards
  long_description TEXT,          -- Full description for book page

  -- Cover image (stored in R2 via media table)
  cover_image_url TEXT,
  cover_image_alt TEXT,

  -- Publication info
  publication_date TEXT,          -- ISO date string
  isbn TEXT,
  page_count INTEGER,
  genre TEXT,                     -- e.g., "Fiction", "Mystery", "Romance"

  -- Purchase links (JSON array)
  -- Format: [{"name": "Amazon", "url": "https://..."}, ...]
  purchase_links TEXT DEFAULT '[]',

  -- Display options
  is_featured INTEGER DEFAULT 0,  -- Show on homepage
  display_order INTEGER DEFAULT 0,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),

  -- Timestamps
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),

  UNIQUE(tenant_id, slug),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_books_tenant ON books(tenant_id);
CREATE INDEX idx_books_status ON books(tenant_id, status);
CREATE INDEX idx_books_featured ON books(tenant_id, is_featured) WHERE is_featured = 1;
CREATE INDEX idx_books_slug ON books(tenant_id, slug);
```

---

## TypeScript Interfaces

```typescript
// src/lib/types.ts

export interface Book {
  id: string;
  tenant_id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  author: string;
  description: string | null;
  long_description: string | null;
  cover_image_url: string | null;
  cover_image_alt: string | null;
  publication_date: string | null;
  isbn: string | null;
  page_count: number | null;
  genre: string | null;
  purchase_links: PurchaseLink[];
  is_featured: number;
  display_order: number;
  status: 'draft' | 'published' | 'archived';
  created_at: number;
  updated_at: number;
}

export interface PurchaseLink {
  name: string;      // "Amazon", "Barnes & Noble", "IndieBound", etc.
  url: string;
  icon?: string;     // Optional icon identifier
}

export interface SiteSettings {
  name: string;
  tagline: string;
  description: string;
  contact_email: string;
  social_links: SocialLink[];
}

export interface SocialLink {
  platform: string;
  url: string;
}
```

---

## Page Specifications

### Homepage (`/`)

```
┌─────────────────────────────────────────────────────────────────┐
│ [Logo] Fiction House Publishing          [Books] [Blog] [About] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│                    FICTION HOUSE                                │
│                    PUBLISHING                                   │
│                                                                 │
│         Stories that feel like coming home.                     │
│                                                                 │
│              [Explore Our Books →]                              │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Featured Books                                                │
│                                                                 │
│   ┌─────────┐  ┌─────────┐  ┌─────────┐                         │
│   │ [cover] │  │ [cover] │  │ [cover] │                         │
│   │ Title   │  │ Title   │  │ Title   │                         │
│   │ Author  │  │ Author  │  │ Author  │                         │
│   └─────────┘  └─────────┘  └─────────┘                         │
│                                                                 │
│              [View All Books →]                                 │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   From the Blog                                                 │
│                                                                 │
│   • Latest Post Title                          Dec 15, 2025     │
│   • Another Blog Post                          Dec 10, 2025     │
│   • Third Post Title                           Dec 5, 2025      │
│                                                                 │
│              [Read More →]                                      │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   © 2025 Fiction House Publishing                               │
│   [Contact] | [Privacy] | [Dark Mode Toggle]                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Data Requirements:**
- Featured books (is_featured = 1, limit 3)
- Recent blog posts (limit 3)
- Site settings (tagline, description)

### Books Page (`/books`)

Grid layout showing all published books.

```
┌─────────────────────────────────────────────────────────────────┐
│   Our Books                                                     │
│                                                                 │
│   ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐            │
│   │ [cover] │  │ [cover] │  │ [cover] │  │ [cover] │            │
│   │ Title   │  │ Title   │  │ Title   │  │ Title   │            │
│   │ Author  │  │ Author  │  │ Author  │  │ Author  │            │
│   │ Genre   │  │ Genre   │  │ Genre   │  │ Genre   │            │
│   └─────────┘  └─────────┘  └─────────┘  └─────────┘            │
│                                                                 │
│   ┌─────────┐  ┌─────────┐                                      │
│   │ [cover] │  │ [cover] │                                      │
│   │ Title   │  │ Title   │                                      │
│   │ Author  │  │ Author  │                                      │
│   │ Genre   │  │ Genre   │                                      │
│   └─────────┘  └─────────┘                                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Individual Book Page (`/books/[slug]`)

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   ┌─────────────┐                                               │
│   │             │    BOOK TITLE                                 │
│   │   [cover]   │    Subtitle if present                        │
│   │             │                                               │
│   │             │    by Author Name                             │
│   │             │                                               │
│   └─────────────┘    Genre • 320 pages • ISBN                   │
│                                                                 │
│   ─────────────────────────────────────────────────────────     │
│                                                                 │
│   Long description of the book goes here. This is the full      │
│   marketing copy that tells readers what to expect from the     │
│   book, the story premise, and why they should read it.         │
│                                                                 │
│   Multiple paragraphs are supported via markdown rendering.     │
│                                                                 │
│   ─────────────────────────────────────────────────────────     │
│                                                                 │
│   Get Your Copy                                                 │
│                                                                 │
│   [Amazon]  [Barnes & Noble]  [IndieBound]                      │
│                                                                 │
│   ─────────────────────────────────────────────────────────     │
│                                                                 │
│   ← Back to All Books                                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Blog Page (`/blog`)

Uses engine's post system. Standard blog listing with:
- Post title
- Publication date
- Excerpt/description
- Featured image (optional)

### About Page (`/about`)

Static content (stored in `pages` table) with:
- Story of Fiction House Publishing
- Mission/vision
- Photo of publisher (optional)

Content managed via admin panel.

### Contact Page (`/contact`)

Interactive contact form that sends email via Resend:
- Name field
- Email field
- Message textarea
- Submit button with loading state
- Success/error feedback

Plus static contact information:
- Email address
- Social media links (optional)

```
┌─────────────────────────────────────────────────────────────────┐
│   Get in Touch                                                  │
│                                                                 │
│   We'd love to hear from you. Whether you have a question       │
│   about our books or a story to share, drop us a line.          │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │ Your Name                                               │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │ Email Address                                           │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │ Your Message                                            │   │
│   │                                                         │   │
│   │                                                         │   │
│   └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│   [Send Message]                                                │
│                                                                 │
│   ─────────────────────────────────────────────────────────     │
│                                                                 │
│   Or email us directly:                                         │
│   contact@fictionhouse.com                                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Contact Form API

```typescript
// src/routes/api/contact/+server.ts
import { json } from '@sveltejs/kit';
import { Resend } from 'resend';

export const POST = async ({ request, platform }) => {
  const { name, email, message } = await request.json();

  // Validation
  if (!name || !email || !message) {
    return json({ error: 'All fields are required' }, { status: 400 });
  }

  const resend = new Resend(platform.env.RESEND_API_KEY);

  try {
    await resend.emails.send({
      from: 'Fiction House <noreply@fictionhouse.com>',
      to: 'contact@fictionhouse.com',
      replyTo: email,
      subject: `Contact Form: ${name}`,
      text: `
Name: ${name}
Email: ${email}

Message:
${message}
      `,
    });

    return json({ success: true });
  } catch (err) {
    console.error('Failed to send contact email:', err);
    return json({ error: 'Failed to send message' }, { status: 500 });
  }
};
```

---

## Components

### Header.svelte

```svelte
<script lang="ts">
  import { page } from '$app/stores';
  import ThemeToggle from './ThemeToggle.svelte';

  const navItems = [
    { href: '/books', label: 'Books' },
    { href: '/blog', label: 'Blog' },
    { href: '/about', label: 'About' },
    { href: '/contact', label: 'Contact' },
  ];
</script>

<header class="sticky top-0 z-50 bg-white dark:bg-gray-900 border-b">
  <nav class="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
    <a href="/" class="text-xl font-semibold text-primary">
      Fiction House
    </a>

    <div class="flex items-center gap-6">
      {#each navItems as item}
        <a
          href={item.href}
          class="hover:text-primary transition-colors"
          class:text-primary={$page.url.pathname.startsWith(item.href)}
        >
          {item.label}
        </a>
      {/each}

      <ThemeToggle />
    </div>
  </nav>
</header>
```

### BookCard.svelte

```svelte
<script lang="ts">
  import type { Book } from '$lib/types';

  export let book: Book;
</script>

<a href="/books/{book.slug}" class="group block">
  <div class="aspect-[2/3] bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden mb-3">
    {#if book.cover_image_url}
      <img
        src={book.cover_image_url}
        alt={book.cover_image_alt || book.title}
        class="w-full h-full object-cover group-hover:scale-105 transition-transform"
      />
    {:else}
      <div class="w-full h-full flex items-center justify-center text-gray-400">
        <span class="text-4xl">📚</span>
      </div>
    {/if}
  </div>

  <h3 class="font-semibold group-hover:text-primary transition-colors">
    {book.title}
  </h3>

  <p class="text-sm text-gray-600 dark:text-gray-400">
    {book.author}
  </p>

  {#if book.genre}
    <p class="text-xs text-gray-500 mt-1">
      {book.genre}
    </p>
  {/if}
</a>
```

### HeroSection.svelte

```svelte
<script lang="ts">
  export let title = "Fiction House Publishing";
  export let tagline = "Stories that feel like coming home.";
</script>

<section class="py-24 text-center bg-gradient-to-b from-primary/5 to-transparent">
  <div class="max-w-3xl mx-auto px-4">
    <h1 class="text-5xl font-bold mb-4 text-gray-900 dark:text-white">
      {title}
    </h1>

    <p class="text-xl text-gray-600 dark:text-gray-300 mb-8">
      {tagline}
    </p>

    <a
      href="/books"
      class="inline-flex items-center gap-2 bg-primary text-white px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors"
    >
      Explore Our Books
      <span>→</span>
    </a>
  </div>
</section>
```

### ContactForm.svelte

```svelte
<script lang="ts">
  let name = $state('');
  let email = $state('');
  let message = $state('');
  let status = $state<'idle' | 'sending' | 'success' | 'error'>('idle');
  let errorMessage = $state('');

  async function handleSubmit(e: Event) {
    e.preventDefault();
    status = 'sending';
    errorMessage = '';

    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message');
      }

      status = 'success';
      name = '';
      email = '';
      message = '';
    } catch (err) {
      status = 'error';
      errorMessage = err instanceof Error ? err.message : 'Something went wrong';
    }
  }
</script>

<form onsubmit={handleSubmit} class="space-y-4">
  <div>
    <label for="name" class="block text-sm font-medium mb-1">Your Name</label>
    <input
      type="text"
      id="name"
      bind:value={name}
      required
      class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-800 dark:border-gray-700"
    />
  </div>

  <div>
    <label for="email" class="block text-sm font-medium mb-1">Email Address</label>
    <input
      type="email"
      id="email"
      bind:value={email}
      required
      class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-800 dark:border-gray-700"
    />
  </div>

  <div>
    <label for="message" class="block text-sm font-medium mb-1">Your Message</label>
    <textarea
      id="message"
      bind:value={message}
      required
      rows="5"
      class="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent dark:bg-gray-800 dark:border-gray-700"
    ></textarea>
  </div>

  {#if status === 'error'}
    <div class="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">
      {errorMessage}
    </div>
  {/if}

  {#if status === 'success'}
    <div class="p-3 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-lg text-sm">
      Thanks for reaching out! We'll get back to you soon.
    </div>
  {/if}

  <button
    type="submit"
    disabled={status === 'sending'}
    class="w-full bg-primary text-white py-3 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
  >
    {#if status === 'sending'}
      Sending...
    {:else}
      Send Message
    {/if}
  </button>
</form>
```

---

## Admin Panel Integration

The admin panel is imported from GroveEngine with site-specific extensions:

### Admin Routes

```typescript
// src/routes/admin/+layout.server.ts
import { redirect } from '@sveltejs/kit';
import { getUserFromSession } from '@autumnsgrove/groveengine/services';

export const load = async ({ cookies, platform }) => {
  const accessToken = cookies.get('access_token');
  if (!accessToken) {
    redirect(302, '/auth/login');
  }

  const user = await getUserFromSession(
    platform.env.DB,
    accessToken,
    platform.env.GROVEAUTH_URL
  );

  if (!user) {
    redirect(302, '/auth/login');
  }

  return { user };
};
```

### Admin Books Management

Add a `/admin/books` section for managing the book catalog:

```
/admin/books           - List all books
/admin/books/new       - Add new book
/admin/books/[slug]    - Edit book
```

Use engine's MarkdownEditor for the long_description field.

---

## Placeholder Content

### Seed Data (migrations/002_seed_data.sql)

```sql
-- Seed placeholder content for Fiction House Publishing

-- Create tenant
INSERT INTO tenants (id, subdomain, display_name, email, plan, active)
VALUES (
  'fh-tenant-001',
  'fictionhouse',
  'Fiction House Publishing',
  'contact@fictionhouse.com',
  'professional',
  1
);

-- Seed example books
INSERT INTO books (id, tenant_id, slug, title, subtitle, author, description, long_description, genre, page_count, is_featured, status, display_order) VALUES
(
  'book-001',
  'fh-tenant-001',
  'the-quiet-hours',
  'The Quiet Hours',
  'A Novel',
  'Melony Brown',
  'A heartwarming story about finding peace in unexpected places.',
  'In the small coastal town of Millbrook, Sarah Chen has spent years running from her past. When she inherits her grandmother''s cottage, she returns to face the memories she left behind—and discovers that sometimes the quietest moments hold the loudest truths.

*The Quiet Hours* is a tender exploration of grief, healing, and the courage it takes to start again. Perfect for fans of character-driven literary fiction.',
  'Literary Fiction',
  324,
  1,
  'published',
  1
),
(
  'book-002',
  'fh-tenant-001',
  'beneath-the-garden-wall',
  'Beneath the Garden Wall',
  NULL,
  'Melony Brown',
  'A mystery wrapped in secrets, set in a charming English village.',
  'When journalist Emma Wright arrives in Thornbury to write a travel piece, she expects quaint tea shops and rolling hills. Instead, she finds a village with a secret—one that has been buried beneath the old garden wall for decades.

As Emma uncovers the truth, she realizes that some stories are meant to stay hidden. But others demand to be told.

A cozy mystery with heart, *Beneath the Garden Wall* blends atmospheric setting with compelling characters.',
  'Mystery',
  298,
  1,
  'published',
  2
);

-- Seed blog posts
INSERT INTO posts (id, tenant_id, slug, title, description, markdown_content, html_content, status, published_at) VALUES
(
  'post-001',
  'fh-tenant-001',
  'welcome-to-fiction-house',
  'Welcome to Fiction House Publishing',
  'An introduction to our publishing house and what we stand for.',
  '# Welcome to Fiction House

We''re so glad you found us.

Fiction House Publishing was born from a simple belief: **stories matter**. The right book at the right time can change everything—it can comfort, challenge, and connect us to each other.

We specialize in literary fiction and cozy mysteries—stories that feel like coming home. Our authors write with heart, and we publish with care.

## What We Look For

- Character-driven narratives
- Atmospheric settings
- Emotional resonance
- Stories that stay with you

## Stay Connected

Follow along as we share updates about upcoming releases, author insights, and the occasional book recommendation.

Welcome to the Fiction House family.',
  '<h1>Welcome to Fiction House</h1><p>We''re so glad you found us.</p>...',
  'published',
  unixepoch()
),
(
  'post-002',
  'fh-tenant-001',
  'coming-soon-the-quiet-hours',
  'Coming Soon: The Quiet Hours',
  'A sneak peek at our debut novel.',
  '# Coming Soon: The Quiet Hours

We''re thrilled to announce the upcoming release of **The Quiet Hours** by Melony Brown.

This debut novel has been years in the making, and we couldn''t be more proud to bring it to readers.

## About the Book

Set in a small coastal town, *The Quiet Hours* follows Sarah Chen as she returns to her grandmother''s cottage and confronts the past she''s been running from.

## Release Date

Coming Spring 2025.

Sign up for our newsletter to be the first to know when pre-orders open.',
  '<h1>Coming Soon: The Quiet Hours</h1>...',
  'published',
  unixepoch() - 86400 * 7
);

-- Seed About page
INSERT INTO pages (id, tenant_id, slug, title, description, type, markdown_content, html_content) VALUES
(
  'page-about',
  'fh-tenant-001',
  'about',
  'About Fiction House',
  'The story behind Fiction House Publishing.',
  'page',
  '# About Fiction House Publishing

Fiction House Publishing was founded with a simple mission: to bring readers stories that feel like coming home.

## Our Story

What started as a dream in a small home office has grown into a boutique publishing house dedicated to literary fiction and cozy mysteries. We believe in the power of stories to connect, comfort, and inspire.

## Our Values

- **Quality over quantity** — We publish selectively, ensuring each book receives the attention it deserves.
- **Author partnerships** — We work closely with our authors at every step of the journey.
- **Reader experience** — Beautiful books, thoughtful design, stories that linger.

## Meet the Publisher

**Melony Brown** founded Fiction House after decades of loving books and finally deciding to help bring them into the world. When she''s not reading manuscripts, you can find her in her garden or walking the coastal trails near her home.

---

*Have a story to share? We''re always looking for new voices. [Get in touch](/contact).*',
  '<h1>About Fiction House Publishing</h1>...'
);
```

---

## Configuration Files

### wrangler.toml

```toml
name = "fiction-house-publishing"
main = ".svelte-kit/cloudflare/_worker.js"
site.bucket = ".svelte-kit/cloudflare"
compatibility_date = "2024-12-01"
compatibility_flags = ["nodejs_compat"]

# D1 Database
[[d1_databases]]
binding = "DB"
database_name = "fiction-house-db"
database_id = "YOUR_DATABASE_ID_HERE"

# R2 Storage for images
[[r2_buckets]]
binding = "BUCKET"
bucket_name = "fiction-house-assets"

# Environment variables
[vars]
SITE_NAME = "Fiction House Publishing"
GROVEAUTH_URL = "https://auth.grove.place"
GROVEAUTH_CLIENT_ID = "fiction-house"

# Production secrets (set via wrangler secret)
# GROVEAUTH_CLIENT_SECRET
```

### package.json

```json
{
  "name": "fiction-house-publishing",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite dev",
    "build": "vite build",
    "preview": "vite preview",
    "check": "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json",
    "lint": "eslint .",
    "deploy": "wrangler pages deploy .svelte-kit/cloudflare",
    "db:migrate": "wrangler d1 execute fiction-house-db --file=migrations/001_books.sql --remote",
    "db:seed": "wrangler d1 execute fiction-house-db --file=migrations/002_seed_data.sql --remote"
  },
  "dependencies": {
    "@autumnsgrove/groveengine": "^0.6.4",
    "resend": "^4.0.0"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20241205.0",
    "@sveltejs/adapter-cloudflare": "^4.0.0",
    "@sveltejs/kit": "^2.0.0",
    "@sveltejs/vite-plugin-svelte": "^4.0.0",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.32",
    "svelte": "^5.0.0",
    "svelte-check": "^4.0.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.0.0",
    "vite": "^6.0.0",
    "wrangler": "^3.0.0"
  }
}
```

### tailwind.config.js

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Grove green palette
        primary: {
          DEFAULT: 'hsl(142, 43%, 35%)',
          50: 'hsl(142, 43%, 95%)',
          100: 'hsl(142, 43%, 90%)',
          200: 'hsl(142, 43%, 80%)',
          300: 'hsl(142, 43%, 65%)',
          400: 'hsl(142, 43%, 50%)',
          500: 'hsl(142, 43%, 35%)',
          600: 'hsl(142, 43%, 28%)',
          700: 'hsl(142, 43%, 22%)',
          800: 'hsl(142, 43%, 16%)',
          900: 'hsl(142, 43%, 10%)',
        },
      },
      fontFamily: {
        sans: ['Lexend', 'system-ui', 'sans-serif'],
        serif: ['Merriweather', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
};
```

---

## Implementation Phases

### Phase 1: Foundation (Day 1)
- [ ] Initialize SvelteKit project with Cloudflare adapter
- [ ] Install dependencies (`@autumnsgrove/groveengine`, Tailwind, etc.)
- [ ] Set up Tailwind with Grove theme
- [ ] Create base layout (Header, Footer, ThemeToggle)
- [ ] Set up wrangler.toml configuration

### Phase 2: Database & Auth (Day 1-2)
- [ ] Create D1 database on Cloudflare
- [ ] Run engine migrations (tenants, posts, pages, media)
- [ ] Run books migration (001_books.sql)
- [ ] Register OAuth client with GroveAuth
- [ ] Set up auth routes (login, callback, logout)
- [ ] Test admin access

### Phase 3: Core Pages (Day 2-3)
- [ ] Build Homepage with HeroSection and FeaturedBooks
- [ ] Build Books listing page with BookGrid
- [ ] Build individual Book page with BookDetail
- [ ] Build About page (content from D1 pages table)
- [ ] Build Contact page
- [ ] Build Blog listing and post pages (using engine's post system)

### Phase 4: Admin Extensions (Day 3-4)
- [ ] Add Books management to admin panel
- [ ] Create book editor form (with cover upload)
- [ ] Test full CRUD for books
- [ ] Seed placeholder content

### Phase 5: Polish & Deploy (Day 4-5)
- [ ] Add dark mode toggle
- [ ] Responsive design testing
- [ ] SEO meta tags
- [ ] Deploy to Cloudflare Pages
- [ ] Configure custom domain (when ready)
- [ ] Final testing

---

## Repository Initialization Checklist

For the agent initializing this project:

- [ ] Create `AutumnsGrove/FictionHousePublishing` repo (private)
- [ ] Initialize SvelteKit: `pnpm create svelte@latest` (skeleton, TypeScript)
- [ ] Install Cloudflare adapter: `pnpm add -D @sveltejs/adapter-cloudflare`
- [ ] Install engine: `pnpm add @autumnsgrove/groveengine`
- [ ] Install Tailwind: `pnpm add -D tailwindcss postcss autoprefixer`
- [ ] Copy this spec to `docs/PROJECT-SPEC.md`
- [ ] Create `AGENT.md` with project instructions
- [ ] Set up directory structure per spec
- [ ] Create migrations directory with SQL files
- [ ] Create components per spec
- [ ] Set up CI/CD (GitHub Actions → Cloudflare Pages)

---

## Environment Variables

**Set via `wrangler secret put`:**

| Variable | Description |
|----------|-------------|
| `GROVEAUTH_CLIENT_SECRET` | OAuth client secret from GroveAuth |
| `RESEND_API_KEY` | API key from Resend for contact form emails |

**Set in wrangler.toml [vars]:**

| Variable | Value |
|----------|-------|
| `SITE_NAME` | Fiction House Publishing |
| `GROVEAUTH_URL` | https://auth.grove.place |
| `GROVEAUTH_CLIENT_ID` | fiction-house |
| `CONTACT_EMAIL` | contact@fictionhouse.com |

---

## Success Criteria

- [ ] Homepage loads with featured books
- [ ] Book catalog displays all published books
- [ ] Individual book pages show full details
- [ ] Blog posts display correctly
- [ ] About page content editable via admin
- [ ] Contact form sends email via Resend
- [ ] Admin panel accessible after auth
- [ ] Books manageable via admin (CRUD)
- [ ] Dark mode toggle works
- [ ] Responsive on mobile/tablet/desktop
- [ ] Deploys successfully to Cloudflare Pages

---

*Fiction House Publishing — Stories that feel like coming home.*
