# AutumnsGrove Website Refactor Prompt (Phase 3 of 3)

> **Purpose:** Refactor the AutumnsGrove website to use `@groveengine/core` as an external dependency.
> **Prerequisites:** Complete Phase 1 (extraction) and Phase 2 (implementation) first.

---

## CONTEXT

You are performing the final phase of the GroveEngine migration. The engine package has been created with all necessary components, utilities, and server functions. Now you need to refactor the AutumnsGrove website to:

1. Install and use `@groveengine/core` as a dependency
2. Remove all code that was extracted to the engine
3. Update imports throughout the codebase
4. Configure Cloudflare bindings (D1, KV, R2)
5. Migrate to the new authentication system
6. Verify the site works identically to before

**Source Website:** `/tmp/AutumnsGrove-source` (cloned from https://github.com/AutumnsGrove/AutumnsGrove)
**Engine Package:** `/home/user/GroveEngine/package`

---

## CRITICAL PRINCIPLES

### 1. Zero Functionality Loss
- Every feature must work identically after refactoring
- All existing content (posts, recipes, images) must remain accessible
- No user-facing changes unless explicitly required

### 2. Clean Separation
- Website contains ONLY site-specific code
- All engine functionality comes from the package
- No duplicate code between engine and website

### 3. Incremental Verification
- Test after each major change
- Build frequently to catch errors early
- Keep the site deployable at all stages

### 4. Proper Dependency Management
- Use local file path for development
- Prepare for npm registry or GitHub package later
- Lock versions appropriately

---

## PHASE 1: SETUP

### 1.1 Create Refactor Branch

```bash
cd /tmp/AutumnsGrove-source
git checkout -b refactor/use-grove-engine
```

### 1.2 Update package.json

Add the engine as a local dependency (for development):

```json
{
  "name": "autumnsgrove",
  "version": "2.0.0",
  "description": "AutumnsGrove personal website - powered by GroveEngine",
  "type": "module",
  "scripts": {
    "dev": "vite dev",
    "dev:wrangler": "wrangler pages dev -- vite dev",
    "build": "vite build",
    "preview": "vite preview",
    "check": "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json",
    "db:migrate": "wrangler d1 migrations apply autumnsgrove-db",
    "db:migrate:local": "wrangler d1 migrations apply autumnsgrove-db --local"
  },
  "devDependencies": {
    "@cloudflare/workers-types": "^4.20241127.0",
    "@sveltejs/adapter-cloudflare": "^4.0.0",
    "@sveltejs/kit": "^2.0.0",
    "@sveltejs/vite-plugin-svelte": "^4.0.0",
    "@tailwindcss/typography": "^0.5.10",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.32",
    "svelte": "^5.0.0",
    "svelte-check": "^4.0.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.0.0",
    "vite": "^6.0.0",
    "wrangler": "^3.91.0"
  },
  "dependencies": {
    "@groveengine/core": "file:../../GroveEngine/package"
  }
}
```

**Note:** The file path `file:../../GroveEngine/package` assumes the GroveEngine repo is at the same level as the AutumnsGrove repo. Adjust as needed.

### 1.3 Install Dependencies

```bash
pnpm install
```

### 1.4 Create Todo Tracking

Use TodoWrite to track refactoring tasks:

**Phase 3 Tasks (This Prompt):**
- [ ] Update package.json with engine dependency
- [ ] Update TypeScript and SvelteKit configuration
- [ ] Configure Cloudflare bindings (wrangler.jsonc)
- [ ] Update app.d.ts with proper types
- [ ] Refactor hooks.server.ts for new auth
- [ ] Update component imports
- [ ] Update utility imports
- [ ] Create site-specific content loader
- [ ] Remove extracted files
- [ ] Update layouts and pages
- [ ] Configure Tailwind for engine components
- [ ] Test build and development
- [ ] Verify all features work

---

## PHASE 2: CONFIGURATION

### 2.1 Update svelte.config.js

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

### 2.2 Create/Update tsconfig.json

```json
{
  "extends": "./.svelte-kit/tsconfig.json",
  "compilerOptions": {
    "strict": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "noEmit": true
  }
}
```

### 2.3 Create wrangler.jsonc

```jsonc
{
  "$schema": "https://raw.githubusercontent.com/cloudflare/workers-sdk/main/packages/wrangler/schemas/config/config.schema.json",
  "name": "autumnsgrove",
  "compatibility_date": "2024-11-26",
  "compatibility_flags": ["nodejs_compat"],
  "pages_build_output_dir": ".svelte-kit/cloudflare",

  // D1 Database
  "d1_databases": [
    {
      "binding": "DB",
      "database_name": "autumnsgrove-db",
      "database_id": "YOUR_D1_DATABASE_ID"
    }
  ],

  // KV Namespace for sessions
  "kv_namespaces": [
    {
      "binding": "KV",
      "id": "YOUR_KV_NAMESPACE_ID"
    }
  ],

  // R2 Bucket for media
  "r2_buckets": [
    {
      "binding": "STORAGE",
      "bucket_name": "autumnsgrove-assets"
    }
  ],

  // Environment variables
  "vars": {
    "PUBLIC_SITE_URL": "https://autumnsgrove.com",
    "PUBLIC_SITE_NAME": "AutumnsGrove"
  }

  // Secrets (set via CLI):
  // wrangler secret put RESEND_API_KEY
}
```

### 2.4 Update src/app.d.ts

```typescript
/// <reference types="@cloudflare/workers-types" />

import type { User, Session, SiteConfig } from '@groveengine/core';

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
      siteConfig: SiteConfig;
      user: User | null;
    }

    // interface Error {}
  }
}

export {};
```

---

## PHASE 3: CREATE SITE CONFIGURATION

### 3.1 Create config/site.json

```json
{
  "name": "AutumnsGrove",
  "description": "A personal website for blogging, sharing projects, and recipes.",
  "tagline": "Thoughts, projects, and recipes",
  "domain": "autumnsgrove.com",
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
    "github": "AutumnsGrove",
    "email": "hello@autumnsgrove.com"
  },

  "owner": {
    "name": "AutumnsGrove",
    "email": "hello@autumnsgrove.com",
    "bio": "Developer and creator."
  },

  "seo": {
    "titleSuffix": " | AutumnsGrove",
    "defaultImage": "/og-image.png"
  }
}
```

---

## PHASE 4: UPDATE HOOKS

### 4.1 Update src/hooks.server.ts

Replace the existing hooks with the engine's auth system:

```typescript
import { validateSession } from '@groveengine/core/server';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
  // Get session from cookie
  const sessionId = event.cookies.get('session');

  if (sessionId && event.platform?.env) {
    // Validate session using engine utilities
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

## PHASE 5: UPDATE IMPORTS

### 5.1 Component Import Mapping

Search and replace imports throughout the codebase:

| Old Import | New Import |
|------------|------------|
| `import { ImageGallery } from '$lib/components'` | `import { ImageGallery } from '@groveengine/core'` |
| `import ContentWithGutter from '$lib/components/ContentWithGutter.svelte'` | `import { ContentWithGutter } from '@groveengine/core'` |
| `import TableOfContents from '$lib/components/TableOfContents.svelte'` | `import { TableOfContents } from '@groveengine/core'` |
| `import ZoomableImage from '$lib/components/ZoomableImage.svelte'` | `import { ZoomableImage } from '@groveengine/core'` |
| `import Lightbox from '$lib/components/Lightbox.svelte'` | `import { Lightbox } from '@groveengine/core'` |
| `import { parseAnchor } from '$lib/utils/gutter.js'` | `import { parseAnchor } from '@groveengine/core/utils'` |
| `import { parseMarkdownContent } from '$lib/utils/markdown.js'` | `import { parseMarkdownContent } from '@groveengine/core/utils'` |

### 5.2 Server Import Mapping

| Old Import | New Import |
|------------|------------|
| `import { verifySession } from '$lib/auth/session.js'` | `import { validateSession } from '@groveengine/core/server'` |
| `import { signJwt, verifyJwt } from '$lib/auth/jwt.js'` | N/A - Use session management instead |

### 5.3 Type Import Mapping

```typescript
// Old
import type { Post, User } from '$lib/types';

// New
import type { Post, User, SiteConfig } from '@groveengine/core';
```

### 5.4 Store Import Mapping

```typescript
// Old
import { theme } from '$lib/stores/theme';

// New
import { theme, siteConfig, user } from '@groveengine/core/stores';
```

---

## PHASE 6: CREATE CONTENT LOADER

The website needs a site-specific content loader for markdown files. This stays in the website because it uses `import.meta.glob` with site-specific paths.

### 6.1 Create src/lib/content/posts.ts

```typescript
/**
 * Site-specific content loading for posts
 * Uses import.meta.glob with paths specific to this site
 */

import { parseMarkdownContent } from '@groveengine/core/utils';
import matter from 'gray-matter';
import type { Post, PostListItem } from '@groveengine/core';

// Import all markdown files from content directory
const postModules = import.meta.glob('/src/content/posts/*.md', {
  eager: true,
  query: '?raw',
  import: 'default'
});

interface PostFrontmatter {
  title: string;
  date: string;
  excerpt?: string;
  featured_image?: string;
  tags?: string[];
  status?: 'draft' | 'published';
}

/**
 * Get all published posts
 */
export function getAllPosts(): PostListItem[] {
  const posts: PostListItem[] = [];

  for (const [path, content] of Object.entries(postModules)) {
    const { data, content: body } = matter(content as string);
    const frontmatter = data as PostFrontmatter;

    // Skip drafts
    if (frontmatter.status === 'draft') continue;

    const slug = path.split('/').pop()?.replace('.md', '') || '';
    const wordCount = body.trim().split(/\s+/).length;
    const readingTime = Math.ceil(wordCount / 200);

    posts.push({
      id: slug,
      title: frontmatter.title,
      slug,
      excerpt: frontmatter.excerpt,
      featured_image: frontmatter.featured_image,
      reading_time: readingTime,
      published_at: new Date(frontmatter.date).getTime() / 1000,
      tags: frontmatter.tags
    });
  }

  // Sort by date, newest first
  return posts.sort((a, b) => (b.published_at || 0) - (a.published_at || 0));
}

/**
 * Get a single post by slug
 */
export function getPostBySlug(slug: string): Post | null {
  const path = `/src/content/posts/${slug}.md`;
  const content = postModules[path];

  if (!content) return null;

  const { data, content: body } = matter(content as string);
  const frontmatter = data as PostFrontmatter;
  const html = parseMarkdownContent(body);
  const wordCount = body.trim().split(/\s+/).length;
  const readingTime = Math.ceil(wordCount / 200);

  return {
    id: slug,
    user_id: 'owner',
    title: frontmatter.title,
    slug,
    content: body,
    excerpt: frontmatter.excerpt,
    html,
    status: frontmatter.status || 'published',
    featured_image: frontmatter.featured_image,
    word_count: wordCount,
    reading_time: readingTime,
    published_at: new Date(frontmatter.date).getTime() / 1000,
    created_at: new Date(frontmatter.date).getTime() / 1000,
    updated_at: Date.now() / 1000,
    tags: frontmatter.tags
  };
}
```

### 6.2 Create src/lib/content/recipes.ts (if applicable)

```typescript
/**
 * Site-specific content loading for recipes
 */

import { parseMarkdownContent } from '@groveengine/core/utils';
import matter from 'gray-matter';

const recipeModules = import.meta.glob('/src/content/recipes/*.md', {
  eager: true,
  query: '?raw',
  import: 'default'
});

// Similar structure to posts.ts
// Adjust based on your recipe frontmatter structure
```

### 6.3 Create src/lib/content/index.ts

```typescript
export * from './posts';
// export * from './recipes';
```

---

## PHASE 7: UPDATE LAYOUTS

### 7.1 Update src/routes/+layout.svelte

```svelte
<script lang="ts">
  import { Header, Footer } from '@groveengine/core';
  import { siteConfig, user } from '@groveengine/core/stores';
  import '../app.css';

  let { data, children } = $props();

  // Initialize stores with server data
  $effect(() => {
    siteConfig.set(data.siteConfig);
    if (data.user) {
      user.set(data.user);
    }
  });
</script>

<svelte:head>
  <title>{data.siteConfig.name}</title>
  <meta name="description" content={data.siteConfig.description} />
</svelte:head>

<div class="min-h-screen flex flex-col">
  <!-- Use engine Header or keep custom header -->
  <header class="site-header">
    <!-- Your existing header content -->
  </header>

  <main class="flex-1">
    {@render children()}
  </main>

  <!-- Use engine Footer or keep custom footer -->
  <footer class="site-footer">
    <!-- Your existing footer content -->
  </footer>
</div>
```

### 7.2 Update src/routes/+layout.server.ts

```typescript
import type { LayoutServerLoad } from './$types';
import siteJson from '../../config/site.json';

export const load: LayoutServerLoad = async ({ locals }) => {
  return {
    siteConfig: siteJson,
    user: locals.user
  };
};
```

---

## PHASE 8: UPDATE PAGES

### 8.1 Update Blog Listing Page

**src/routes/blog/+page.svelte:**
```svelte
<script lang="ts">
  import { PostList } from '@groveengine/core';

  let { data } = $props();
</script>

<svelte:head>
  <title>Blog{data.siteConfig.seo.titleSuffix}</title>
</svelte:head>

<div class="container mx-auto px-4 py-8">
  <h1 class="text-3xl font-bold mb-8">Blog</h1>

  <PostList
    posts={data.posts}
    showReadingTime={data.siteConfig.posts.showReadingTime}
    showExcerpts={data.siteConfig.posts.showExcerpts}
  />
</div>
```

**src/routes/blog/+page.server.ts:**
```typescript
import type { PageServerLoad } from './$types';
import { getAllPosts } from '$lib/content';

export const load: PageServerLoad = async () => {
  const posts = getAllPosts();

  return {
    posts
  };
};
```

### 8.2 Update Blog Post Page

**src/routes/blog/[slug]/+page.svelte:**
```svelte
<script lang="ts">
  import { ContentWithGutter, TableOfContents } from '@groveengine/core';

  let { data } = $props();
</script>

<svelte:head>
  <title>{data.post.title}{data.siteConfig.seo.titleSuffix}</title>
  <meta name="description" content={data.post.excerpt || data.siteConfig.description} />
</svelte:head>

<article class="container mx-auto px-4 py-8">
  <ContentWithGutter
    content={data.post.html}
    headers={data.headers}
    showTableOfContents={data.siteConfig.features.tableOfContents}
  />
</article>
```

**src/routes/blog/[slug]/+page.server.ts:**
```typescript
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getPostBySlug } from '$lib/content';

export const load: PageServerLoad = async ({ params }) => {
  const post = getPostBySlug(params.slug);

  if (!post) {
    throw error(404, 'Post not found');
  }

  return {
    post
  };
};
```

---

## PHASE 9: UPDATE STYLES

### 9.1 Update src/app.css

```css
@import 'tailwindcss/base';
@import 'tailwindcss/components';
@import 'tailwindcss/utilities';

/* Import engine styles if needed */
/* @import '@groveengine/core/styles.css'; */

/* Site-specific styles */
:root {
  --color-primary: #4f46e5;
  --color-secondary: #10b981;
  --color-accent: #f59e0b;
}

/* Your existing site styles */
```

### 9.2 Update tailwind.config.js

```javascript
import typography from '@tailwindcss/typography';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/**/*.{html,js,svelte,ts}',
    // Include engine components in content scanning
    './node_modules/@groveengine/core/**/*.{html,js,svelte,ts}'
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'var(--color-primary)'
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

## PHASE 10: REMOVE EXTRACTED FILES

After verifying imports work, delete files that were extracted to the engine:

### 10.1 Delete Component Files

```bash
rm -rf src/lib/components/ContentWithGutter.svelte
rm -rf src/lib/components/ImageGallery.svelte
rm -rf src/lib/components/ZoomableImage.svelte
rm -rf src/lib/components/Lightbox.svelte
rm -rf src/lib/components/LightboxCaption.svelte
rm -rf src/lib/components/TableOfContents.svelte
rm -rf src/lib/components/MobileTOC.svelte
rm -rf src/lib/components/LeftGutter.svelte
rm -rf src/lib/components/GutterItem.svelte
rm -rf src/lib/components/CollapsibleSection.svelte
rm -rf src/lib/components/IconLegend.svelte
rm -rf src/lib/components/index.js
```

### 10.2 Delete Auth Files

```bash
rm -rf src/lib/auth/
```

### 10.3 Delete Utility Files (that were fully extracted)

```bash
rm src/lib/utils/gutter.js
# Keep markdown.js if it has site-specific functions
# or delete if fully extracted
```

### 10.4 Delete Old Styles (if extracted)

```bash
# Only if styles were fully extracted
# rm src/lib/styles/content.css
```

### 10.5 Keep Site-Specific Files

Keep these files as they contain site-specific code:
- `src/lib/content/` (new content loader)
- `src/lib/db/` (if it has site-specific schema)
- `src/lib/utils/github.js` (if used for site-specific features)
- Any other site-specific utilities

---

## PHASE 11: UPDATE AUTH ROUTES

### 11.1 Update Login Page

**src/routes/login/+page.svelte:**
```svelte
<script lang="ts">
  import { LoginForm } from '@groveengine/core';
  import { goto } from '$app/navigation';

  let { data } = $props();

  async function handleRequestCode(email: string): Promise<boolean> {
    const response = await fetch('/api/auth/request-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    return response.ok;
  }

  async function handleVerifyCode(email: string, code: string): Promise<boolean> {
    const response = await fetch('/api/auth/verify-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code })
    });

    if (response.ok) {
      // Redirect to dashboard or home
      goto('/admin');
      return true;
    }
    return false;
  }
</script>

<svelte:head>
  <title>Login{data.siteConfig.seo.titleSuffix}</title>
</svelte:head>

<div class="container mx-auto px-4 py-16">
  <LoginForm
    onRequestCode={handleRequestCode}
    onVerifyCode={handleVerifyCode}
    siteName={data.siteConfig.name}
  />
</div>
```

### 11.2 Create Auth API Endpoints

**src/routes/api/auth/request-code/+server.ts:**
```typescript
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
  generateMagicCode,
  storeMagicCode
} from '@groveengine/core/server';
import { sendMagicCodeEmail } from '@groveengine/core/server';

export const POST: RequestHandler = async ({ request, platform }) => {
  if (!platform?.env) {
    return json({ error: 'Server configuration error' }, { status: 500 });
  }

  const { email } = await request.json();

  if (!email || typeof email !== 'string') {
    return json({ error: 'Email is required' }, { status: 400 });
  }

  // Generate and store magic code
  const code = generateMagicCode();
  await storeMagicCode(platform.env.KV, email, code);

  // Send email
  const result = await sendMagicCodeEmail(
    platform.env.RESEND_API_KEY,
    email,
    code,
    'AutumnsGrove'
  );

  if (!result.success) {
    return json({ error: 'Failed to send email' }, { status: 500 });
  }

  return json({ success: true });
};
```

**src/routes/api/auth/verify-code/+server.ts:**
```typescript
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
  verifyMagicCode,
  createSession,
  getSessionCookieOptions
} from '@groveengine/core/server';
import { getOrCreateUser } from '@groveengine/core/server';

export const POST: RequestHandler = async ({ request, platform, cookies }) => {
  if (!platform?.env) {
    return json({ error: 'Server configuration error' }, { status: 500 });
  }

  const { email, code } = await request.json();

  if (!email || !code) {
    return json({ error: 'Email and code are required' }, { status: 400 });
  }

  // Verify the code
  const isValid = await verifyMagicCode(platform.env.KV, email, code);

  if (!isValid) {
    return json({ error: 'Invalid or expired code' }, { status: 401 });
  }

  // Get or create user
  const user = await getOrCreateUser(platform.env.DB, email);

  // Create session
  const sessionId = await createSession(platform.env.KV, user);

  // Set session cookie
  cookies.set('session', sessionId, getSessionCookieOptions(true));

  return json({ success: true, user: { id: user.id, email: user.email } });
};
```

**src/routes/api/auth/logout/+server.ts:**
```typescript
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { deleteSession } from '@groveengine/core/server';

export const POST: RequestHandler = async ({ platform, cookies }) => {
  const sessionId = cookies.get('session');

  if (sessionId && platform?.env) {
    await deleteSession(platform.env.KV, sessionId);
  }

  cookies.delete('session', { path: '/' });

  return json({ success: true });
};
```

---

## PHASE 12: VERIFICATION

### 12.1 Type Check

```bash
cd /tmp/AutumnsGrove-source
pnpm run check
```

Fix any TypeScript errors before proceeding.

### 12.2 Development Build

```bash
pnpm run dev
```

### 12.3 Test All Features

**Homepage:**
- [ ] Page loads without errors
- [ ] All images display correctly
- [ ] Navigation works

**Blog:**
- [ ] Blog listing shows all posts
- [ ] Individual post pages render correctly
- [ ] ContentWithGutter layout works
- [ ] Table of contents appears (desktop)
- [ ] Mobile TOC works (mobile)
- [ ] Images zoom on click

**Recipes (if applicable):**
- [ ] Recipe listing works
- [ ] Individual recipe pages render
- [ ] Gutter content displays correctly

**Admin:**
- [ ] Login page loads
- [ ] Magic code request works
- [ ] Code verification works
- [ ] Session persists across pages
- [ ] Logout works

**Responsive:**
- [ ] Desktop layout (3 columns)
- [ ] Tablet layout (2 columns)
- [ ] Mobile layout (1 column)

### 12.4 Production Build

```bash
pnpm run build
```

Ensure build completes without errors.

---

## PHASE 13: COMMIT

### 13.1 Commit Refactored Website

```bash
cd /tmp/AutumnsGrove-source
git add .
git commit -m "refactor: migrate to @groveengine/core

Major refactoring to use GroveEngine as external dependency:
- Add @groveengine/core as dependency
- Update all component imports to use engine
- Update utility imports to use engine
- Implement magic code authentication
- Create site-specific content loader
- Configure Cloudflare bindings (D1, KV, R2)
- Remove extracted code (components, auth, utils)
- Update layouts and pages for new architecture
- Add Tailwind configuration for engine components

Breaking changes:
- Authentication now uses magic codes instead of GitHub OAuth
- Session storage moved from JWT to KV

All existing functionality preserved."
```

### 13.2 Push to Remote

```bash
git push -u origin refactor/use-grove-engine
```

---

## SUCCESS CRITERIA

Phase 3 is complete when:

- [ ] `@groveengine/core` installed as dependency
- [ ] All imports updated to use engine package
- [ ] Extracted files removed from website
- [ ] Site-specific content loader working
- [ ] Magic code authentication working
- [ ] All Cloudflare bindings configured
- [ ] TypeScript type checking passes
- [ ] Development server runs without errors
- [ ] Production build succeeds
- [ ] All features work identically to before
- [ ] Changes committed and pushed

---

## DEPLOYMENT NOTES

### Before Deploying to Production

1. **Create Cloudflare Resources:**
   ```bash
   # Create D1 database
   wrangler d1 create autumnsgrove-db

   # Create KV namespace
   wrangler kv:namespace create KV

   # Create R2 bucket
   wrangler r2 bucket create autumnsgrove-assets
   ```

2. **Update wrangler.jsonc** with actual IDs

3. **Run Database Migrations:**
   ```bash
   wrangler d1 migrations apply autumnsgrove-db
   ```

4. **Set Secrets:**
   ```bash
   wrangler secret put RESEND_API_KEY
   ```

5. **Deploy:**
   ```bash
   wrangler pages deploy
   ```

### Switching to npm Registry

When ready to publish `@groveengine/core` to npm:

1. Update package.json dependency:
   ```json
   {
     "dependencies": {
       "@groveengine/core": "^0.1.0"
     }
   }
   ```

2. Remove the local file path reference

3. Run `pnpm install` to fetch from npm

---

## ROLLBACK PLAN

If the refactor fails:

1. **Revert to main branch:**
   ```bash
   git checkout main
   ```

2. **Delete refactor branch:**
   ```bash
   git branch -D refactor/use-grove-engine
   ```

The original website on main branch remains fully functional.

---

*Last Updated: November 2025*
