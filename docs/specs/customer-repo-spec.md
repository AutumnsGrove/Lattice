---
date created: Tuesday, November 26th 2025
date modified: Tuesday, November 26th 2025
tags:
type: tech-spec
---

# Customer Repository Specification

**Purpose:** Documents the template structure for customer blog repositories
**Deployment:** Cloudflare Workers/Pages with D1, KV, and R2

---

## Overview

Each customer has their own repository that imports `@groveengine/core` as a dependency. This single-tenant model provides:

- **Isolation:** Each customer has dedicated Cloudflare resources
- **Customization:** Full control over routes, styling, and configuration
- **Independence:** Updates can be managed per-customer
- **Simplicity:** Standard SvelteKit project structure

---

## Repository Structure

```
customer-blog/
├── src/
│   ├── routes/
│   │   ├── +layout.svelte         # Imports engine layout components
│   │   ├── +layout.server.ts      # Loads site config, validates session
│   │   ├── +page.svelte           # Homepage (can customize or use engine default)
│   │   ├── +page.server.ts        # Load homepage data
│   │   ├── blog/
│   │   │   ├── +page.svelte       # Blog listing
│   │   │   ├── +page.server.ts    # Load posts
│   │   │   └── [slug]/
│   │   │       ├── +page.svelte   # Individual post
│   │   │       └── +page.server.ts
│   │   ├── admin/
│   │   │   ├── +layout.svelte     # Admin layout with auth check
│   │   │   ├── +layout.server.ts  # Protect admin routes
│   │   │   └── [...path]/
│   │   │       ├── +page.svelte   # Admin panel (imports from engine)
│   │   │       └── +page.server.ts
│   │   ├── login/
│   │   │   ├── +page.svelte       # Login page
│   │   │   └── +page.server.ts    # Handle auth actions
│   │   ├── rss.xml/
│   │   │   └── +server.ts         # RSS feed endpoint
│   │   └── api/
│   │       └── [...path]/
│   │           └── +server.ts     # API routes (uses engine handlers)
│   ├── hooks.server.ts            # Auth middleware, session loading
│   ├── app.html                   # HTML template
│   ├── app.css                    # Custom styles (extends engine theme)
│   └── app.d.ts                   # Type declarations
├── static/
│   ├── favicon.ico
│   ├── logo.png
│   └── robots.txt
├── config/
│   └── site.json                  # Site-specific configuration
├── package.json
├── pnpm-lock.yaml
├── svelte.config.js
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── tsconfig.json
├── wrangler.jsonc                 # Cloudflare configuration
├── renovate.json                  # Renovate configuration
└── .github/
    └── workflows/
        └── deploy.yml             # CI/CD workflow
```

---

## Site Configuration

### config/site.json

```json
{
  "name": "My Awesome Blog",
  "description": "A blog about technology, creativity, and life",
  "tagline": "Thoughts and musings",
  "domain": "myblog.grove.place",
  "language": "en",
  "timezone": "America/New_York",

  "theme": {
    "name": "default",
    "colors": {
      "primary": "#4f46e5",
      "secondary": "#10b981",
      "accent": "#f59e0b",
      "background": "#ffffff",
      "text": "#1f2937"
    },
    "fonts": {
      "heading": "Inter",
      "body": "Inter"
    },
    "layout": "sidebar"
  },

  "features": {
    "comments": false,
    "newsletter": false,
    "analytics": false,
    "rss": true,
    "search": true,
    "tableOfContents": true,
    "gutterLinks": true
  },

  "posts": {
    "perPage": 10,
    "showExcerpts": true,
    "showReadingTime": true,
    "showWordCount": false,
    "showAuthor": true
  },

  "social": {
    "twitter": "@myblog",
    "github": "myblog",
    "email": "hello@myblog.grove.place",
    "mastodon": ""
  },

  "owner": {
    "name": "Blog Owner",
    "email": "owner@example.com",
    "bio": "Writer, developer, and creative thinker."
  },

  "seo": {
    "titleSuffix": " | My Awesome Blog",
    "defaultImage": "/og-image.png"
  }
}
```

### Loading Configuration

```typescript
// src/routes/+layout.server.ts
import { getSiteConfig } from '@groveengine/core/server';
import siteJson from '../../config/site.json';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ platform, locals }) => {
  // Merge static config with dynamic config from D1
  const dynamicConfig = await getSiteConfig(platform?.env.DB);

  return {
    siteConfig: {
      ...siteJson,
      ...dynamicConfig
    },
    user: locals.user
  };
};
```

---

## Key Files

### package.json

```json
{
  "name": "my-grove-blog",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite dev",
    "build": "vite build",
    "preview": "vite preview",
    "check": "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json",
    "check:watch": "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json --watch",
    "test": "vitest",
    "lint": "prettier --check . && eslint .",
    "format": "prettier --write .",
    "db:migrate": "wrangler d1 migrations apply grove-blog",
    "db:migrate:local": "wrangler d1 migrations apply grove-blog --local",
    "deploy": "wrangler pages deploy"
  },
  "dependencies": {
    "@groveengine/core": "^0.1.0"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20241127.0",
    "@sveltejs/adapter-cloudflare": "^4.0.0",
    "@sveltejs/kit": "^2.0.0",
    "@sveltejs/vite-plugin-svelte": "^4.0.0",
    "@tailwindcss/typography": "^0.5.10",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.32",
    "prettier": "^3.1.0",
    "prettier-plugin-svelte": "^3.1.2",
    "svelte": "^5.0.0",
    "svelte-check": "^4.0.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.0.0",
    "vite": "^6.0.0",
    "vitest": "^2.0.0",
    "wrangler": "^3.91.0"
  }
}
```

### svelte.config.js

```javascript
import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({
      routes: {
        include: ['/*'],
        exclude: ['<all>']
      }
    }),
    alias: {
      $config: './config'
    }
  }
};

export default config;
```

### wrangler.jsonc

```jsonc
{
  "$schema": "https://raw.githubusercontent.com/cloudflare/workers-sdk/main/packages/wrangler/schemas/config/config.schema.json",
  "name": "my-grove-blog",
  "compatibility_date": "2024-11-26",
  "compatibility_flags": ["nodejs_compat"],
  "pages_build_output_dir": ".svelte-kit/cloudflare",

  // D1 Database
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "grove-blog-myblog",
      "database_id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
    }
  ],

  // KV Namespace for sessions and cache
  "kv_namespaces": [
    {
      "binding": "KV",
      "id": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
    }
  ],

  // R2 Bucket for media storage
  "r2_buckets": [
    {
      "binding": "STORAGE",
      "bucket_name": "grove-assets-myblog"
    }
  ],

  // Environment variables
  "vars": {
    "PUBLIC_SITE_URL": "https://myblog.grove.place"
  }

  // Secrets (set via CLI):
  // wrangler secret put RESEND_API_KEY
}
```

### src/app.d.ts

```typescript
/// <reference types="@cloudflare/workers-types" />

import type { User, Session } from '@groveengine/core';

declare global {
  namespace App {
    interface Platform {
      env: {
        DB: D1Database;
        KV: KVNamespace;
        STORAGE: R2Bucket;
        RESEND_API_KEY: string;
      };
      context: ExecutionContext;
      caches: CacheStorage;
    }

    interface Locals {
      user: User | null;
      session: Session | null;
    }

    interface PageData {
      siteConfig: import('$config/site.json');
      user: User | null;
    }

    // interface Error {}
  }
}

export {};
```

### src/hooks.server.ts

```typescript
import { validateSession } from '@groveengine/core/server';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
  // Get session from cookie
  const sessionId = event.cookies.get('session');

  if (sessionId && event.platform?.env) {
    // Validate session and get user
    const { user, session } = await validateSession(
      sessionId,
      event.platform.env.KV,
      event.platform.env.DB
    );

    event.locals.user = user;
    event.locals.session = session;
  } else {
    event.locals.user = null;
    event.locals.session = null;
  }

  return resolve(event);
};
```

---

## Route Examples

### src/routes/+layout.svelte

```svelte
<script lang="ts">
  import { Header, Footer } from '@groveengine/core';
  import { siteConfig } from '@groveengine/core/stores';
  import '../app.css';

  let { data, children } = $props();

  // Initialize store with server data
  $effect(() => {
    siteConfig.set(data.siteConfig);
  });
</script>

<div class="min-h-screen flex flex-col">
  <Header config={data.siteConfig} user={data.user} />

  <main class="flex-1">
    {@render children()}
  </main>

  <Footer config={data.siteConfig} />
</div>
```

### src/routes/blog/+page.svelte

```svelte
<script lang="ts">
  import { PostList } from '@groveengine/core';

  let { data } = $props();
</script>

<svelte:head>
  <title>Blog{data.siteConfig.seo.titleSuffix}</title>
  <meta name="description" content={data.siteConfig.description} />
</svelte:head>

<div class="container mx-auto px-4 py-8">
  <h1 class="text-3xl font-bold mb-8">Blog</h1>

  <PostList
    posts={data.posts}
    showExcerpts={data.siteConfig.posts.showExcerpts}
    showReadingTime={data.siteConfig.posts.showReadingTime}
  />

  {#if data.totalPages > 1}
    <nav class="mt-8 flex justify-center gap-2">
      {#each Array(data.totalPages) as _, i}
        <a
          href="/blog?page={i + 1}"
          class="px-4 py-2 rounded {data.page === i + 1
            ? 'bg-primary text-white'
            : 'bg-gray-100'}"
        >
          {i + 1}
        </a>
      {/each}
    </nav>
  {/if}
</div>
```

### src/routes/blog/+page.server.ts

```typescript
import { getPosts } from '@groveengine/core/server';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ platform, url }) => {
  const page = Number(url.searchParams.get('page')) || 1;
  const limit = 10;

  const { posts, total } = await getPosts(platform?.env.DB, {
    status: 'published',
    page,
    limit
  });

  return {
    posts,
    page,
    total,
    totalPages: Math.ceil(total / limit)
  };
};
```

### src/routes/blog/[slug]/+page.svelte

```svelte
<script lang="ts">
  import { PostView, TableOfContents, GutterLinks } from '@groveengine/core';

  let { data } = $props();
</script>

<svelte:head>
  <title>{data.post.title}{data.siteConfig.seo.titleSuffix}</title>
  <meta name="description" content={data.post.excerpt || data.siteConfig.description} />

  <!-- Open Graph -->
  <meta property="og:title" content={data.post.title} />
  <meta property="og:description" content={data.post.excerpt} />
  <meta property="og:image" content={data.post.featured_image || data.siteConfig.seo.defaultImage} />
  <meta property="og:type" content="article" />
</svelte:head>

<article class="container mx-auto px-4 py-8">
  <div class="grid grid-cols-1 lg:grid-cols-[1fr_250px] gap-8">
    <div>
      <PostView post={data.post} />
    </div>

    <aside class="hidden lg:block">
      {#if data.siteConfig.features.tableOfContents}
        <TableOfContents content={data.post.content} />
      {/if}

      {#if data.siteConfig.features.gutterLinks && data.post.gutterLinks}
        <GutterLinks links={data.post.gutterLinks} />
      {/if}
    </aside>
  </div>
</article>
```

### src/routes/admin/[...path]/+page.svelte

```svelte
<script lang="ts">
  import { AdminPanel } from '@groveengine/core';

  let { data } = $props();
</script>

<svelte:head>
  <title>Admin | {data.siteConfig.name}</title>
</svelte:head>

<AdminPanel
  user={data.user}
  siteConfig={data.siteConfig}
/>
```

### src/routes/admin/+layout.server.ts

```typescript
import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
  if (!locals.user) {
    throw redirect(302, '/login?redirect=/admin');
  }

  if (locals.user.role !== 'admin' && locals.user.role !== 'editor') {
    throw redirect(302, '/');
  }

  return {
    user: locals.user
  };
};
```

---

## Styling

### src/app.css

```css
@import 'tailwindcss/base';
@import 'tailwindcss/components';
@import 'tailwindcss/utilities';

/* Import engine base styles */
@import '@groveengine/core/styles.css';

/* Custom site overrides */
:root {
  --color-primary: theme('colors.indigo.600');
  --color-secondary: theme('colors.emerald.500');
  --color-accent: theme('colors.amber.500');
}

/* Custom component styles */
.custom-header {
  /* Override header styles */
}

/* Typography customization */
.prose {
  --tw-prose-links: var(--color-primary);
}
```

### tailwind.config.js

```javascript
import typography from '@tailwindcss/typography';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/**/*.{html,js,svelte,ts}',
    './node_modules/@groveengine/core/**/*.{html,js,svelte,ts}'
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--color-primary)',
          // Add shades if needed
        },
        secondary: {
          DEFAULT: 'var(--color-secondary)'
        },
        accent: {
          DEFAULT: 'var(--color-accent)'
        }
      }
    }
  },
  plugins: [typography]
};
```

---

## CI/CD Workflow

### .github/workflows/deploy.yml

```yaml
name: Deploy to Cloudflare

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 9

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run type check
        run: pnpm check

      - name: Run tests
        run: pnpm test -- --run

      - name: Build
        run: pnpm build

      - name: Deploy to Cloudflare Pages
        if: github.ref == 'refs/heads/main'
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: pages deploy .svelte-kit/cloudflare --project-name=my-grove-blog
```

---

## Domain Configuration

### grove.place Subdomain

For `myblog.grove.place`:

1. Cloudflare Pages automatically handles subdomains
2. Configure in Cloudflare dashboard under Pages > Custom domains
3. DNS is managed centrally on the grove.place zone

### Custom Domain

For `www.example.com`:

1. Customer adds custom domain in Cloudflare Pages
2. Customer updates their DNS to point to Cloudflare:
   - CNAME `www` → `my-grove-blog.pages.dev`
   - Or use Cloudflare as DNS provider

3. Update `wrangler.jsonc`:
   ```jsonc
   {
     "vars": {
       "PUBLIC_SITE_URL": "https://www.example.com"
     }
   }
   ```

4. Update `config/site.json`:
   ```json
   {
     "domain": "www.example.com"
   }
   ```

---

## Database Migrations

### Running Migrations

Customer repos include migrations from the engine:

```bash
# Copy migrations from engine (done during setup)
cp node_modules/@groveengine/core/migrations/*.sql migrations/

# Apply migrations locally
pnpm db:migrate:local

# Apply migrations to production
pnpm db:migrate
```

### Migration Directory

```
migrations/
├── 0001_initial_schema.sql
├── 0002_add_sessions.sql
└── 0003_add_media.sql
```

---

## Customization Points

### What Customers Can Customize

| Area | Customization Level |
|------|---------------------|
| Site config | Full control via `config/site.json` |
| Colors/fonts | CSS variables in `app.css` |
| Route structure | Can add/modify routes |
| Components | Can override or wrap engine components |
| Static assets | Full control over `static/` |
| API routes | Can add custom endpoints |

### What is Managed by Engine

| Area | Engine Control |
|------|----------------|
| Core components | Updated via npm |
| Database schema | Migrations from engine |
| Authentication logic | Server utilities |
| Admin panel UI | Engine components |
| API handlers | Engine server code |

---

*Last Updated: November 2025*
