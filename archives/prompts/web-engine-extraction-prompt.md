# Lattice Extraction Prompt (Phase 1 of 2)

> **Purpose:** Extract reusable engine code from AutumnsGrove website into the `@lattice/core` package.
> **Next Step:** After extraction, use `implementation-prompt.md` to build remaining features.

---

## CONTEXT

You are performing the first phase of building Lattice. This phase extracts reusable code from the existing AutumnsGrove website. A second prompt handles implementing new features required by the specs.

**What this prompt covers:**

- Extracting and converting existing components to TypeScript
- Restructuring code to match the package architecture
- Setting up the npm package foundation

**What the second prompt covers:**

- Magic code authentication (Resend)
- D1 database schema and queries
- KV session management
- R2 media storage
- Admin panel components
- Customer repository template

**Source Repository:** https://github.com/AutumnsGrove/AutumnsGrove
**Target Package:** `@lattice/core`

---

## CRITICAL PRINCIPLES

### 1. TypeScript First

- Convert ALL extracted JavaScript to TypeScript (strict mode)
- Add proper type definitions for all exports
- Use interfaces for component props

### 2. Architectural Alignment

- Follow the package structure defined in `docs/specs/engine-spec.md`
- Components go in organized subfolders: `components/blog/`, `components/layout/`, `components/ui/`
- Server utilities go in `server/`

### 3. Clean Extraction

- Extract ONLY code that aligns with the engine spec
- Skip site-specific code (Git stats, GitHub API calls for dashboard, etc.)
- Preserve exact functionality of extracted code

### 4. Foundation for Phase 2

- Set up proper exports structure
- Create placeholder files for features built in Phase 2
- Ensure package.json is ready for additions

---

## PHASE 1: SETUP & INVENTORY

### 1.1 Clone Source Repository

```bash
git clone https://github.com/AutumnsGrove/AutumnsGrove /tmp/AutumnsGrove-source
cd /tmp/AutumnsGrove-source
```

### 1.2 Initialize Package Structure

Create the `@lattice/core` package structure in the Lattice repository:

```
/home/user/Lattice/
├── package/
│   ├── src/
│   │   ├── lib/
│   │   │   ├── components/
│   │   │   │   ├── ui/                    # Extracted UI components
│   │   │   │   │   ├── ZoomableImage.svelte
│   │   │   │   │   ├── Lightbox.svelte
│   │   │   │   │   ├── LightboxCaption.svelte
│   │   │   │   │   ├── ImageGallery.svelte
│   │   │   │   │   ├── CollapsibleSection.svelte
│   │   │   │   │   └── index.ts
│   │   │   │   ├── layout/                # Layout components
│   │   │   │   │   ├── ContentWithGutter.svelte
│   │   │   │   │   ├── LeftGutter.svelte
│   │   │   │   │   ├── GutterItem.svelte
│   │   │   │   │   ├── TableOfContents.svelte
│   │   │   │   │   ├── MobileTOC.svelte
│   │   │   │   │   ├── IconLegend.svelte
│   │   │   │   │   └── index.ts
│   │   │   │   ├── blog/                  # Placeholder for Phase 2
│   │   │   │   │   └── index.ts
│   │   │   │   ├── admin/                 # Placeholder for Phase 2
│   │   │   │   │   └── index.ts
│   │   │   │   ├── auth/                  # Placeholder for Phase 2
│   │   │   │   │   └── index.ts
│   │   │   │   └── index.ts               # Main component exports
│   │   │   ├── server/
│   │   │   │   ├── auth/                  # Placeholder for Phase 2
│   │   │   │   │   └── index.ts
│   │   │   │   ├── db/                    # Placeholder for Phase 2
│   │   │   │   │   └── index.ts
│   │   │   │   ├── storage/               # Placeholder for Phase 2
│   │   │   │   │   └── index.ts
│   │   │   │   ├── email/                 # Placeholder for Phase 2
│   │   │   │   │   └── index.ts
│   │   │   │   └── index.ts
│   │   │   ├── stores/
│   │   │   │   ├── theme.ts
│   │   │   │   ├── user.ts                # Placeholder for Phase 2
│   │   │   │   ├── siteConfig.ts
│   │   │   │   └── index.ts
│   │   │   ├── utils/
│   │   │   │   ├── gutter.ts              # Extracted from source
│   │   │   │   ├── markdown.ts            # Extracted from source
│   │   │   │   └── index.ts
│   │   │   ├── types/
│   │   │   │   ├── index.ts               # All type definitions
│   │   │   │   ├── post.ts
│   │   │   │   ├── user.ts
│   │   │   │   └── config.ts
│   │   │   └── index.ts                   # Public API exports
│   │   └── app.d.ts
│   ├── migrations/                        # Placeholder for Phase 2
│   │   └── .gitkeep
│   ├── package.json
│   ├── svelte.config.js
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── README.md
└── docs/
    ├── specs/                             # Keep existing
    └── prompts/                           # Keep existing
```

### 1.3 Create Todo Tracking

Use TodoWrite to track extraction tasks:

**Phase 1 Tasks (This Prompt):**

- [ ] Clone source repository
- [ ] Create package directory structure
- [ ] Extract and convert UI components to TypeScript
- [ ] Extract and convert layout components to TypeScript
- [ ] Extract and convert utility functions to TypeScript
- [ ] Create type definitions
- [ ] Create Svelte stores
- [ ] Configure package.json and build setup
- [ ] Create placeholder exports for Phase 2 features
- [ ] Verify package builds successfully

---

## PHASE 2: EXTRACT & CONVERT COMPONENTS

### 2.1 Extract UI Components

These components are general-purpose and reusable:

| Source File                                    | Target File                                               | Notes                              |
| ---------------------------------------------- | --------------------------------------------------------- | ---------------------------------- |
| `src/lib/components/ZoomableImage.svelte`      | `package/src/lib/components/ui/ZoomableImage.svelte`      | Convert to TS, add props interface |
| `src/lib/components/Lightbox.svelte`           | `package/src/lib/components/ui/Lightbox.svelte`           | Convert to TS                      |
| `src/lib/components/LightboxCaption.svelte`    | `package/src/lib/components/ui/LightboxCaption.svelte`    | Convert to TS                      |
| `src/lib/components/ImageGallery.svelte`       | `package/src/lib/components/ui/ImageGallery.svelte`       | Convert to TS                      |
| `src/lib/components/CollapsibleSection.svelte` | `package/src/lib/components/ui/CollapsibleSection.svelte` | Convert to TS                      |

**For each component:**

1. Read the source file
2. Add TypeScript `<script lang="ts">`
3. Define props interface
4. Update imports to use relative paths within package
5. Add JSDoc comments for exported props

**Example conversion:**

```svelte
<!-- Before (JavaScript) -->
<script>
  export let src;
  export let alt = '';
</script>

<!-- After (TypeScript) -->
<script lang="ts">
  interface Props {
    /** Image source URL */
    src: string;
    /** Alt text for accessibility */
    alt?: string;
  }

  let { src, alt = '' }: Props = $props();
</script>
```

### 2.2 Extract Layout Components

These components handle content layout with the gutter system:

| Source File                                   | Target File                                                  |
| --------------------------------------------- | ------------------------------------------------------------ |
| `src/lib/components/ContentWithGutter.svelte` | `package/src/lib/components/layout/ContentWithGutter.svelte` |
| `src/lib/components/LeftGutter.svelte`        | `package/src/lib/components/layout/LeftGutter.svelte`        |
| `src/lib/components/GutterItem.svelte`        | `package/src/lib/components/layout/GutterItem.svelte`        |
| `src/lib/components/TableOfContents.svelte`   | `package/src/lib/components/layout/TableOfContents.svelte`   |
| `src/lib/components/MobileTOC.svelte`         | `package/src/lib/components/layout/MobileTOC.svelte`         |
| `src/lib/components/IconLegend.svelte`        | `package/src/lib/components/layout/IconLegend.svelte`        |

**Critical: ContentWithGutter.svelte**

This is the most complex component. Update internal imports:

```typescript
// Before (in source)
import TableOfContents from "$lib/components/TableOfContents.svelte";
import { parseAnchor } from "$lib/utils/gutter.js";

// After (in package)
import TableOfContents from "./TableOfContents.svelte";
import { parseAnchor } from "../../utils/gutter";
```

### 2.3 Create Component Index Files

**package/src/lib/components/ui/index.ts:**

```typescript
export { default as ZoomableImage } from "./ZoomableImage.svelte";
export { default as Lightbox } from "./Lightbox.svelte";
export { default as LightboxCaption } from "./LightboxCaption.svelte";
export { default as ImageGallery } from "./ImageGallery.svelte";
export { default as CollapsibleSection } from "./CollapsibleSection.svelte";
```

**package/src/lib/components/layout/index.ts:**

```typescript
export { default as ContentWithGutter } from "./ContentWithGutter.svelte";
export { default as LeftGutter } from "./LeftGutter.svelte";
export { default as GutterItem } from "./GutterItem.svelte";
export { default as TableOfContents } from "./TableOfContents.svelte";
export { default as MobileTOC } from "./MobileTOC.svelte";
export { default as IconLegend } from "./IconLegend.svelte";
```

**package/src/lib/components/index.ts:**

```typescript
// UI Components
export * from "./ui";

// Layout Components
export * from "./layout";

// Blog Components (Phase 2)
// export * from './blog';

// Admin Components (Phase 2)
// export * from './admin';

// Auth Components (Phase 2)
// export * from './auth';
```

---

## PHASE 3: EXTRACT & CONVERT UTILITIES

### 3.1 Extract Gutter Utilities

**Source:** `src/lib/utils/gutter.js`
**Target:** `package/src/lib/utils/gutter.ts`

Convert to TypeScript with proper types:

```typescript
// package/src/lib/utils/gutter.ts

export interface AnchorData {
  key: string;
  label: string;
}

export interface GutterItem {
  anchor: string;
  content: string;
  type?: string;
}

/**
 * Parse an anchor string into key and label
 */
export function parseAnchor(anchor: string): AnchorData {
  // ... implementation from source
}

/**
 * Get unique anchor key
 */
export function getAnchorKey(anchor: string): string {
  // ... implementation from source
}

/**
 * Get unique anchors from items
 */
export function getUniqueAnchors(items: GutterItem[]): string[] {
  // ... implementation from source
}

/**
 * Get label for an anchor
 */
export function getAnchorLabel(anchor: string): string {
  // ... implementation from source
}

/**
 * Get items for a specific anchor
 */
export function getItemsForAnchor(
  items: GutterItem[],
  anchor: string,
): GutterItem[] {
  // ... implementation from source
}

/**
 * Get items without a valid anchor
 */
export function getOrphanItems(items: GutterItem[]): GutterItem[] {
  // ... implementation from source
}

/**
 * Find anchor element in DOM
 */
export function findAnchorElement(anchor: string): HTMLElement | null {
  // ... implementation from source
}
```

### 3.2 Extract Markdown Utilities

**Source:** `src/lib/utils/markdown.js`
**Target:** `package/src/lib/utils/markdown.ts`

Extract ONLY the pure parsing utilities (not file-loading functions):

```typescript
// package/src/lib/utils/markdown.ts

import { marked } from "marked";

export interface ParsedMarkdown {
  html: string;
  headings: Heading[];
}

export interface Heading {
  level: number;
  text: string;
  id: string;
}

/**
 * Check if a string is a valid URL
 */
export function isValidUrl(str: string): boolean {
  // ... implementation from source
}

/**
 * Parse markdown content to HTML
 */
export function parseMarkdownContent(content: string): string {
  // ... implementation from source using marked
}

/**
 * Extract headings from markdown for TOC
 */
export function extractHeadings(content: string): Heading[] {
  // ... implementation
}

/**
 * Initialize mermaid for diagrams (if used)
 */
export async function initializeMermaid(): Promise<void> {
  // ... implementation from source
}
```

**DO NOT extract:** File-loading functions that use `import.meta.glob` - these are site-specific.

### 3.3 Create Utils Index

**package/src/lib/utils/index.ts:**

```typescript
export * from "./gutter";
export * from "./markdown";
```

---

## PHASE 4: CREATE TYPE DEFINITIONS

### 4.1 Core Types

**package/src/lib/types/post.ts:**

```typescript
export interface Post {
  id: string;
  user_id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  html?: string;
  status: "draft" | "published" | "archived";
  featured_image?: string;
  word_count: number;
  reading_time: number;
  published_at?: number;
  created_at: number;
  updated_at: number;
  tags?: string[];
}

export interface PostListItem {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  featured_image?: string;
  reading_time: number;
  published_at?: number;
  tags?: string[];
}
```

**package/src/lib/types/user.ts:**

```typescript
export interface User {
  id: string;
  email: string;
  name?: string;
  role: "admin" | "editor" | "user";
  avatar_url?: string;
  created_at: number;
  updated_at: number;
}

export interface Session {
  id: string;
  user_id: string;
  expires_at: number;
  created_at: number;
}
```

**package/src/lib/types/config.ts:**

```typescript
export interface SiteConfig {
  name: string;
  description: string;
  tagline?: string;
  domain: string;
  language: string;
  timezone: string;
  theme: ThemeConfig;
  features: FeatureFlags;
  posts: PostConfig;
  social: SocialLinks;
  owner: OwnerInfo;
  seo: SeoConfig;
}

export interface ThemeConfig {
  name: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
  layout: "sidebar" | "no-sidebar";
}

export interface FeatureFlags {
  comments: boolean;
  newsletter: boolean;
  analytics: boolean;
  rss: boolean;
  search: boolean;
  tableOfContents: boolean;
  gutterLinks: boolean;
}

export interface PostConfig {
  perPage: number;
  showExcerpts: boolean;
  showReadingTime: boolean;
  showWordCount: boolean;
  showAuthor: boolean;
}

export interface SocialLinks {
  twitter?: string;
  github?: string;
  email?: string;
  mastodon?: string;
}

export interface OwnerInfo {
  name: string;
  email: string;
  bio?: string;
}

export interface SeoConfig {
  titleSuffix: string;
  defaultImage: string;
}
```

**package/src/lib/types/index.ts:**

```typescript
export * from "./post";
export * from "./user";
export * from "./config";
```

---

## PHASE 5: CREATE SVELTE STORES

### 5.1 Theme Store

**package/src/lib/stores/theme.ts:**

```typescript
import { writable } from "svelte/store";

export type Theme = "light" | "dark" | "system";

function createThemeStore() {
  const { subscribe, set, update } = writable<Theme>("system");

  return {
    subscribe,
    set,
    toggle: () => update((t) => (t === "light" ? "dark" : "light")),
    setSystem: () => set("system"),
  };
}

export const theme = createThemeStore();
```

### 5.2 Site Config Store

**package/src/lib/stores/siteConfig.ts:**

```typescript
import { writable } from "svelte/store";
import type { SiteConfig } from "../types";

function createSiteConfigStore() {
  const { subscribe, set } = writable<SiteConfig | null>(null);

  return {
    subscribe,
    set,
    init: (config: SiteConfig) => set(config),
  };
}

export const siteConfig = createSiteConfigStore();
```

### 5.3 User Store (Placeholder)

**package/src/lib/stores/user.ts:**

```typescript
import { writable } from "svelte/store";
import type { User } from "../types";

// Full implementation in Phase 2
function createUserStore() {
  const { subscribe, set } = writable<User | null>(null);

  return {
    subscribe,
    set,
    clear: () => set(null),
  };
}

export const user = createUserStore();
```

### 5.4 Stores Index

**package/src/lib/stores/index.ts:**

```typescript
export { theme } from "./theme";
export { siteConfig } from "./siteConfig";
export { user } from "./user";
```

---

## PHASE 6: CONFIGURE PACKAGE

### 6.1 package.json

```json
{
  "name": "@lattice/core",
  "version": "0.1.0",
  "description": "SvelteKit blog engine with gutter content system",
  "type": "module",
  "scripts": {
    "dev": "vite dev",
    "build": "vite build && npm run package",
    "package": "svelte-kit sync && svelte-package -o dist",
    "prepublishOnly": "npm run package",
    "check": "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json",
    "check:watch": "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json --watch"
  },
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "svelte": "./dist/index.js"
    },
    "./components": {
      "types": "./dist/components/index.d.ts",
      "svelte": "./dist/components/index.js"
    },
    "./components/*": {
      "types": "./dist/components/*/index.d.ts",
      "svelte": "./dist/components/*/index.js"
    },
    "./server": {
      "types": "./dist/server/index.d.ts",
      "default": "./dist/server/index.js"
    },
    "./stores": {
      "types": "./dist/stores/index.d.ts",
      "svelte": "./dist/stores/index.js"
    },
    "./utils": {
      "types": "./dist/utils/index.d.ts",
      "default": "./dist/utils/index.js"
    },
    "./types": {
      "types": "./dist/types/index.d.ts"
    }
  },
  "svelte": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "files": ["dist", "!dist/**/*.test.*", "!dist/**/*.spec.*"],
  "peerDependencies": {
    "svelte": "^5.0.0",
    "@sveltejs/kit": "^2.0.0"
  },
  "dependencies": {
    "marked": "^14.1.2"
  },
  "devDependencies": {
    "@sveltejs/adapter-auto": "^3.0.0",
    "@sveltejs/kit": "^2.0.0",
    "@sveltejs/package": "^2.0.0",
    "@sveltejs/vite-plugin-svelte": "^4.0.0",
    "svelte": "^5.0.0",
    "svelte-check": "^4.0.0",
    "typescript": "^5.0.0",
    "vite": "^6.0.0"
  },
  "keywords": [
    "svelte",
    "sveltekit",
    "blog",
    "engine",
    "gutter",
    "markdown",
    "cloudflare"
  ],
  "author": "AutumnsGrove",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/AutumnsGrove/Lattice"
  }
}
```

### 6.2 svelte.config.js

```javascript
import adapter from "@sveltejs/adapter-auto";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter(),
  },
};

export default config;
```

### 6.3 tsconfig.json

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

### 6.4 vite.config.ts

```typescript
import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [sveltekit()],
});
```

---

## PHASE 7: CREATE PLACEHOLDER EXPORTS

Create placeholder files for features implemented in Phase 2:

### 7.1 Server Placeholders

**package/src/lib/server/auth/index.ts:**

```typescript
// Authentication utilities - Implemented in Phase 2
// See: docs/prompts/implementation-prompt.md

export function validateSession(): never {
  throw new Error("Not implemented - see implementation-prompt.md");
}

export function createSession(): never {
  throw new Error("Not implemented - see implementation-prompt.md");
}
```

**package/src/lib/server/db/index.ts:**

```typescript
// Database utilities - Implemented in Phase 2
// See: docs/prompts/implementation-prompt.md

export function getPosts(): never {
  throw new Error("Not implemented - see implementation-prompt.md");
}

export function getPostBySlug(): never {
  throw new Error("Not implemented - see implementation-prompt.md");
}
```

**package/src/lib/server/index.ts:**

```typescript
// Server utilities
// Full implementation in Phase 2

export * from "./auth";
export * from "./db";
// export * from './storage';
// export * from './email';
```

### 7.2 Component Placeholders

**package/src/lib/components/blog/index.ts:**

```typescript
// Blog components - Implemented in Phase 2
// PostList, PostCard, PostView, etc.
export {};
```

**package/src/lib/components/admin/index.ts:**

```typescript
// Admin components - Implemented in Phase 2
// AdminPanel, PostEditor, MediaLibrary, etc.
export {};
```

**package/src/lib/components/auth/index.ts:**

```typescript
// Auth components - Implemented in Phase 2
// LoginForm, MagicCodeInput, etc.
export {};
```

---

## PHASE 8: CREATE MAIN EXPORTS

**package/src/lib/index.ts:**

```typescript
// @lattice/core - Main exports

// Types
export type * from "./types";

// Components
export * from "./components";

// Stores
export * from "./stores";

// Utils
export * from "./utils";

// Note: Server utilities should be imported from '@lattice/core/server'
// to ensure proper tree-shaking and avoid client-side imports of server code
```

---

## PHASE 9: VERIFICATION

### 9.1 Build Package

```bash
cd /home/user/Lattice/package
pnpm install
pnpm run check
pnpm run package
```

**Verify:**

- No TypeScript errors
- All exports resolve correctly
- `dist/` folder is created with compiled files

### 9.2 Check Exports

```bash
# Verify the package structure
ls -la dist/
ls -la dist/components/
ls -la dist/utils/
```

---

## PHASE 10: COMMIT

```bash
cd /home/user/Lattice
git add package/
git commit -m "feat: extract and convert components from AutumnsGrove

Phase 1 of Lattice implementation:
- Extract UI components (ZoomableImage, Lightbox, ImageGallery, etc.)
- Extract layout components (ContentWithGutter, TableOfContents, etc.)
- Extract utility functions (gutter, markdown parsing)
- Convert all code to TypeScript
- Create type definitions (Post, User, SiteConfig)
- Set up Svelte stores (theme, siteConfig, user)
- Configure package.json with proper exports
- Add placeholder exports for Phase 2 features

Next: Run implementation-prompt.md for auth, database, and admin features"
```

---

## SUCCESS CRITERIA

Phase 1 is complete when:

- [ ] All 11 components extracted and converted to TypeScript
- [ ] Utility functions extracted with proper types
- [ ] Type definitions created for Post, User, SiteConfig
- [ ] Svelte stores created (theme, siteConfig, user)
- [ ] Package builds without errors (`pnpm run check` passes)
- [ ] Package compiles to `dist/` folder
- [ ] All exports properly configured in package.json
- [ ] Placeholder files created for Phase 2 features
- [ ] Changes committed to repository

---

## NEXT STEPS

After completing this prompt, proceed to:
**`docs/prompts/implementation-prompt.md`** - Phase 2: Implement remaining features

This includes:

- Magic code authentication with Resend
- D1 database schema and queries
- KV session management
- R2 media storage
- Blog components (PostList, PostCard, PostView)
- Admin panel components
- Customer repository template

---

_Last Updated: November 2025_
