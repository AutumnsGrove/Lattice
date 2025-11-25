# GroveEngine Extraction Prompt

> **Purpose:** Guide Claude Code through extracting the web engine from AutumnsGrove website and re-implementing the site to use it as an external dependency.

---

## CONTEXT

You are performing a delicate extraction operation. The goal is to:

1. **Extract** all reusable engine code from the AutumnsGrove website into the GroveEngine package
2. **Re-implement** the AutumnsGrove website to consume GroveEngine as a dependency
3. **Preserve** 100% of existing functionality - nothing should break

**Source Repository:** https://github.com/AutumnsGrove/AutumnsGrove
**Target Repository:** GroveEngine (this project)

---

## CRITICAL PRINCIPLES

Before you begin, understand these non-negotiable principles:

### 1. Surgical Precision
- Extract ONLY the engine code, not site-specific content
- Every file must be examined individually - no bulk operations
- Preserve exact functionality - no "improvements" during extraction

### 2. Zero Data Loss
- All user content (markdown, images, assets) must remain in the website
- All site-specific routes and features must continue working
- All configuration must be properly split and documented

### 3. Verification at Every Step
- After each phase, verify the website still builds and runs
- Test all components in isolation before integration
- Document any issues immediately

### 4. Clean Boundaries
- Engine code should have ZERO site-specific hardcoding
- Website code should import from engine, not duplicate
- Configuration should be clearly separated

---

## PHASE 1: SETUP & INVENTORY (Do First)

### 1.1 Clone Source Repository
```bash
git clone https://github.com/AutumnsGrove/AutumnsGrove /tmp/AutumnsGrove-source
cd /tmp/AutumnsGrove-source
```

### 1.2 Create Working Branch for Website
Create a new branch in the AutumnsGrove repo for the refactored version:
```bash
git checkout -b refactor/use-grove-engine
```

### 1.3 Initialize GroveEngine Package Structure
In the GroveEngine repository, create the package structure:

```
/home/user/GroveEngine/
├── package/                    # The NPM package
│   ├── src/
│   │   ├── auth/              # JWT & session management
│   │   ├── components/        # Svelte components
│   │   ├── styles/            # CSS files
│   │   ├── utils/             # Utility functions
│   │   └── index.js           # Main exports
│   ├── package.json
│   ├── svelte.config.js
│   ├── vite.config.js
│   └── README.md
└── docs/                       # Keep existing docs
```

### 1.4 Create Todo Tracking
Use TodoWrite to track all extraction tasks. Create these initial todos:

**Phase 1 Tasks:**
- [ ] Clone and examine source repository
- [ ] Create GroveEngine package structure
- [ ] Inventory all files to extract

**Phase 2 Tasks:**
- [ ] Extract authentication system
- [ ] Extract all 11 Svelte components
- [ ] Extract utility functions
- [ ] Extract CSS styles

**Phase 3 Tasks:**
- [ ] Configure package.json with dependencies
- [ ] Set up build configuration
- [ ] Create package exports

**Phase 4 Tasks:**
- [ ] Refactor website to use engine imports
- [ ] Update all import paths
- [ ] Split configuration files

**Phase 5 Tasks:**
- [ ] Build and test engine package
- [ ] Build and test refactored website
- [ ] Verify all features work

---

## PHASE 2: EXTRACT ENGINE CODE

### 2.1 Extract Authentication System

**Source files to extract:**
- `src/lib/auth/jwt.js` → `package/src/auth/jwt.js`
- `src/lib/auth/session.js` → `package/src/auth/session.js`

**Verification:**
- Functions are pure with no site-specific imports
- Web Crypto API compatible (Cloudflare Workers)
- No hardcoded secrets or URLs

**Export as:**
```javascript
// package/src/auth/index.js
export { signJwt, verifyJwt } from './jwt.js';
export {
  createSession,
  verifySession,
  createSessionCookie,
  clearSessionCookie,
  parseSessionCookie,
  isAllowedAdmin
} from './session.js';
```

### 2.2 Extract Svelte Components

**All 11 components to extract:**

| Source | Target | Priority |
|--------|--------|----------|
| `src/lib/components/ContentWithGutter.svelte` | `package/src/components/` | Critical |
| `src/lib/components/TableOfContents.svelte` | `package/src/components/` | Critical |
| `src/lib/components/ImageGallery.svelte` | `package/src/components/` | Critical |
| `src/lib/components/ZoomableImage.svelte` | `package/src/components/` | High |
| `src/lib/components/Lightbox.svelte` | `package/src/components/` | High |
| `src/lib/components/LightboxCaption.svelte` | `package/src/components/` | High |
| `src/lib/components/GutterItem.svelte` | `package/src/components/` | High |
| `src/lib/components/LeftGutter.svelte` | `package/src/components/` | High |
| `src/lib/components/MobileTOC.svelte` | `package/src/components/` | Medium |
| `src/lib/components/CollapsibleSection.svelte` | `package/src/components/` | Medium |
| `src/lib/components/IconLegend.svelte` | `package/src/components/` | Low |

**For each component:**
1. Read the source file completely
2. Identify any site-specific imports or paths
3. Replace site-specific references with configurable props or imports from engine utils
4. Update internal component imports to use relative paths within package

**Critical: ContentWithGutter.svelte**
This is the most complex component (~400 lines). It imports:
- `TableOfContents.svelte`
- `MobileTOC.svelte`
- `GutterItem.svelte`
- `$lib/utils/gutter.js`

Update all these imports to relative paths:
```javascript
// Before (in website)
import TableOfContents from '$lib/components/TableOfContents.svelte';
import { parseAnchor } from '$lib/utils/gutter.js';

// After (in engine package)
import TableOfContents from './TableOfContents.svelte';
import { parseAnchor } from '../utils/gutter.js';
```

**Export as:**
```javascript
// package/src/components/index.js
export { default as ContentWithGutter } from './ContentWithGutter.svelte';
export { default as TableOfContents } from './TableOfContents.svelte';
export { default as ImageGallery } from './ImageGallery.svelte';
export { default as ZoomableImage } from './ZoomableImage.svelte';
export { default as Lightbox } from './Lightbox.svelte';
export { default as LightboxCaption } from './LightboxCaption.svelte';
export { default as GutterItem } from './GutterItem.svelte';
export { default as LeftGutter } from './LeftGutter.svelte';
export { default as MobileTOC } from './MobileTOC.svelte';
export { default as CollapsibleSection } from './CollapsibleSection.svelte';
export { default as IconLegend } from './IconLegend.svelte';
```

### 2.3 Extract Utility Functions

**Files to extract:**

#### gutter.js (100% engine - extract completely)
- `src/lib/utils/gutter.js` → `package/src/utils/gutter.js`
- Contains: parseAnchor, getAnchorKey, getUniqueAnchors, getAnchorLabel, getItemsForAnchor, getOrphanItems, findAnchorElement

#### github.js (extract reusable patterns)
- `src/lib/utils/github.js` → `package/src/utils/github.js`
- Extract: validateUsername, getHeaders, getGraphQLHeaders, getCacheKey
- Keep in engine as reusable utilities for GitHub integration

#### markdown.js (SPLIT - this is the most delicate operation)

This file has BOTH engine code and site-specific code. You must split it:

**Extract to engine (package/src/utils/markdown.js):**
```javascript
// Pure parsing utilities - no file system access
export function isValidUrl(string) { ... }
export function parseMarkdownContent(content) { ... }  // Uses marked
export function extractFrontmatter(content) { ... }   // Uses gray-matter
export function initializeMermaid() { ... }
```

**Keep in website (src/lib/utils/content.js):**
```javascript
// Site-specific content loading
import { parseMarkdownContent, extractFrontmatter } from 'grove-engine/utils';

// These use import.meta.glob with hardcoded paths - must stay in website
export function getAllPosts() { ... }
export function getPostBySlug(slug) { ... }
export function getAllRecipes() { ... }
export function getHomePage() { ... }
export function getAboutPage() { ... }
export function getContactPage() { ... }
```

### 2.4 Extract Styles

**Source file:**
- `src/lib/styles/content.css` → `package/src/styles/content.css`

**Verification:**
- No hardcoded colors (should use CSS variables)
- Responsive breakpoints are generic (769px tablet, 1200px desktop)
- Dark mode uses `:global(.dark)` selectors

**Export guidance:**
In package README, document that sites should either:
1. Import the CSS directly: `import 'grove-engine/styles/content.css'`
2. Or extend it with their own variables

### 2.5 Extract Server Hook

**Source file:**
- `src/hooks.server.js` → `package/src/hooks/auth.js`

**Modification needed:**
Convert from SvelteKit hook to exportable middleware function:

```javascript
// package/src/hooks/auth.js
import { verifySession, parseSessionCookie } from '../auth/index.js';

export function createAuthHook(options = {}) {
  return async function handle({ event, resolve }) {
    const token = parseSessionCookie(event.request.headers);
    if (token) {
      const session = await verifySession(
        token,
        options.sessionSecret || event.platform?.env?.SESSION_SECRET
      );
      if (session) {
        event.locals.user = session;
      }
    }
    return resolve(event);
  };
}
```

---

## PHASE 3: CONFIGURE ENGINE PACKAGE

### 3.1 Create package.json

```json
{
  "name": "grove-engine",
  "version": "0.1.0",
  "description": "SvelteKit blog engine with gutter content system",
  "type": "module",
  "svelte": "./src/index.js",
  "main": "./src/index.js",
  "exports": {
    ".": "./src/index.js",
    "./auth": "./src/auth/index.js",
    "./components": "./src/components/index.js",
    "./utils": "./src/utils/index.js",
    "./styles/*": "./src/styles/*",
    "./hooks": "./src/hooks/index.js"
  },
  "files": [
    "src"
  ],
  "peerDependencies": {
    "svelte": "^5.0.0"
  },
  "dependencies": {
    "marked": "^14.1.2",
    "gray-matter": "^4.0.3"
  },
  "devDependencies": {
    "@sveltejs/kit": "^2.0.0",
    "@sveltejs/vite-plugin-svelte": "^3.0.0",
    "vite": "^5.0.0"
  },
  "keywords": [
    "svelte",
    "sveltekit",
    "blog",
    "engine",
    "gutter",
    "markdown"
  ],
  "author": "AutumnsGrove",
  "license": "MIT"
}
```

### 3.2 Create Main Export

```javascript
// package/src/index.js
// Auth
export * from './auth/index.js';

// Components
export * from './components/index.js';

// Utils
export * from './utils/index.js';

// Hooks
export { createAuthHook } from './hooks/auth.js';
```

### 3.3 Create Utils Index

```javascript
// package/src/utils/index.js
export * from './gutter.js';
export * from './markdown.js';
export * from './github.js';
```

---

## PHASE 4: REFACTOR WEBSITE TO USE ENGINE

### 4.1 Add Engine as Dependency

In the AutumnsGrove website's package.json, add:

```json
{
  "dependencies": {
    "grove-engine": "file:../GroveEngine/package"
  }
}
```

Note: For local development, use file path. Later change to npm registry or GitHub package.

### 4.2 Update All Imports

**Search and replace all imports throughout the website:**

#### Components
```javascript
// Before
import { ContentWithGutter } from '$lib/components';
import TableOfContents from '$lib/components/TableOfContents.svelte';

// After
import { ContentWithGutter, TableOfContents } from 'grove-engine/components';
```

#### Auth
```javascript
// Before
import { verifySession, createSessionCookie } from '$lib/auth/session.js';
import { signJwt } from '$lib/auth/jwt.js';

// After
import { verifySession, createSessionCookie, signJwt } from 'grove-engine/auth';
```

#### Utils
```javascript
// Before
import { parseAnchor, findAnchorElement } from '$lib/utils/gutter.js';
import { validateUsername, getHeaders } from '$lib/utils/github.js';

// After
import { parseAnchor, findAnchorElement } from 'grove-engine/utils';
import { validateUsername, getHeaders } from 'grove-engine/utils';
```

#### Styles
```javascript
// Before (in +layout.svelte or component)
import '$lib/styles/content.css';

// After
import 'grove-engine/styles/content.css';
```

#### Hooks
```javascript
// Before (src/hooks.server.js)
import { verifySession, parseSessionCookie } from '$lib/auth/session.js';
// ... inline hook code

// After (src/hooks.server.js)
import { createAuthHook } from 'grove-engine/hooks';
export const handle = createAuthHook();
```

### 4.3 Create Site Content Loader

Create a new file that uses the engine's parsing utilities but loads site-specific content:

```javascript
// src/lib/utils/content.js
import { parseMarkdownContent, extractFrontmatter } from 'grove-engine/utils';

// Import all markdown files from site content
const postModules = import.meta.glob('../../UserContent/Posts/*.md', { eager: true, as: 'raw' });
const recipeModules = import.meta.glob('../../UserContent/Recipes/*.md', { eager: true, as: 'raw' });
// ... etc

export function getAllPosts() {
  return Object.entries(postModules).map(([path, content]) => {
    const { data, content: body } = extractFrontmatter(content);
    const html = parseMarkdownContent(body);
    const slug = path.split('/').pop().replace('.md', '');
    return { slug, ...data, html };
  });
}

// ... other content loading functions
```

### 4.4 Delete Extracted Files from Website

Once imports are updated and working, remove the now-redundant files:

**Delete from website:**
- `src/lib/auth/` (entire directory)
- `src/lib/components/` (entire directory - all 11 components)
- `src/lib/utils/gutter.js`
- `src/lib/utils/github.js` (if all utilities moved)
- `src/lib/styles/content.css`

**Keep in website:**
- `src/lib/utils/content.js` (the new site content loader)
- Any site-specific utilities
- `src/lib/db/` (database schema is site-specific)

### 4.5 Split Configuration Files

#### wrangler.toml
Keep site-specific configuration, remove engine defaults.

#### .dev.vars
Split into engine required secrets and site optional secrets:
```bash
# Engine Required
SESSION_SECRET=xxx
GITHUB_TOKEN=xxx
GITHUB_CLIENT_ID=xxx
GITHUB_CLIENT_SECRET=xxx

# Site Specific
ANTHROPIC_API_KEY=xxx
ADMIN_GITHUB_USERNAMES=xxx
```

---

## PHASE 5: VERIFICATION & TESTING

### 5.1 Build Engine Package

```bash
cd /home/user/GroveEngine/package
pnpm install
pnpm run build  # If you add a build step
```

Verify:
- No TypeScript errors
- All exports resolve correctly
- Package can be imported

### 5.2 Build Website

```bash
cd /tmp/AutumnsGrove-source
pnpm install
pnpm run build
```

**If build fails, check:**
- Import paths updated correctly
- All dependencies installed
- No circular imports

### 5.3 Run Website Dev Server

```bash
pnpm run dev
```

**Test every feature manually:**

#### Homepage
- [ ] Page loads without errors
- [ ] Hero section displays
- [ ] Image gallery works (navigation, lightbox)
- [ ] Dark mode toggle works

#### Blog
- [ ] Blog index lists all posts
- [ ] Individual post pages render
- [ ] ContentWithGutter layout works
- [ ] Table of contents appears on desktop
- [ ] Mobile TOC appears on mobile
- [ ] Gutter items position correctly
- [ ] Images zoom on click

#### Recipes
- [ ] Recipe index lists all recipes
- [ ] Individual recipe pages render
- [ ] Instruction icons display
- [ ] Gutter positioning works

#### Authentication
- [ ] Login page loads
- [ ] GitHub OAuth redirect works
- [ ] Callback creates session
- [ ] Admin routes protected
- [ ] Logout clears session

#### Admin Panel
- [ ] Dashboard loads
- [ ] Blog management works
- [ ] Image upload works
- [ ] Settings page works

#### Responsive Design
- [ ] Desktop layout (3 columns)
- [ ] Tablet layout (2 columns)
- [ ] Mobile layout (1 column)
- [ ] Breakpoints work correctly

### 5.4 Run Type Checking

```bash
pnpm run check  # svelte-check
```

Ensure no type errors in either project.

---

## PHASE 6: COMMIT & DOCUMENT

### 6.1 Commit Engine Package

In GroveEngine repository:
```bash
git add package/
git commit -m "feat: initial extraction of web engine from AutumnsGrove

- Extract auth system (JWT, sessions)
- Extract 11 Svelte components
- Extract utility functions (gutter, markdown, github)
- Extract CSS styles
- Create exportable auth hook
- Configure package.json with proper exports"
```

### 6.2 Commit Website Refactor

In AutumnsGrove repository (on refactor branch):
```bash
git add .
git commit -m "refactor: use grove-engine as external dependency

- Replace local engine code with grove-engine imports
- Create site-specific content loader
- Update all import paths
- Remove redundant files
- Split configuration"
```

### 6.3 Create Engine README

```markdown
# Grove Engine

A SvelteKit blog engine with a powerful gutter content system.

## Features

- **Gutter System**: Display supplementary content alongside your main content
- **Authentication**: JWT-based session management for Cloudflare Workers
- **Components**: 11 production-ready Svelte 5 components
- **Responsive**: Mobile-first design with 3 breakpoints

## Installation

```bash
pnpm add grove-engine
```

## Usage

### Components

```svelte
<script>
  import { ContentWithGutter, ImageGallery } from 'grove-engine/components';
</script>

<ContentWithGutter
  content={post.html}
  gutterContent={post.gutterItems}
  headers={post.headers}
  showTableOfContents={true}
/>
```

### Authentication

```javascript
import { createSession, verifySession } from 'grove-engine/auth';

const session = await createSession(user, SECRET);
const verified = await verifySession(token, SECRET);
```

### Styles

```javascript
import 'grove-engine/styles/content.css';
```

## Components

| Component | Description |
|-----------|-------------|
| ContentWithGutter | Main layout with left gutter, content, and TOC |
| TableOfContents | Sticky table of contents |
| ImageGallery | Image gallery with lightbox |
| ZoomableImage | Clickable zoomable image |
| Lightbox | Modal image viewer |
| ... | ... |

## License

MIT
```

---

## ERROR HANDLING

### Common Issues & Solutions

#### Import Resolution Errors
**Error:** `Cannot find module 'grove-engine/components'`
**Solution:** Check package.json exports map, ensure paths are correct

#### Component Props Mismatch
**Error:** `Unknown prop 'x' on component`
**Solution:** Verify prop names match between engine and website usage

#### CSS Not Loading
**Error:** Styles missing, layout broken
**Solution:** Ensure CSS import is in +layout.svelte, check path

#### Auth Hook Fails
**Error:** `event.locals.user is undefined`
**Solution:** Check hooks.server.js uses createAuthHook correctly

#### Gutter Positioning Wrong
**Error:** Gutter items in wrong positions
**Solution:** Verify gutter.js imported from engine, check anchor parsing

---

## ROLLBACK PLAN

If extraction fails at any point:

1. **Engine Package**: Delete `/home/user/GroveEngine/package/` directory
2. **Website**: `git checkout main` to return to original state
3. **Dependencies**: Remove grove-engine from website package.json

The original website in the main branch remains fully functional.

---

## SUCCESS CRITERIA

The extraction is complete when:

1. **Engine Package**
   - [ ] All 11 components extracted and exported
   - [ ] Auth system fully functional
   - [ ] Utils properly exported
   - [ ] Styles importable
   - [ ] Package builds without errors

2. **Website**
   - [ ] All imports use grove-engine
   - [ ] No duplicate engine code
   - [ ] All features work identically to before
   - [ ] Build succeeds
   - [ ] Type checking passes

3. **Documentation**
   - [ ] Engine README complete
   - [ ] All exports documented
   - [ ] Usage examples provided

---

## NOTES FOR CLAUDE CODE

### Be Methodical
- Read each file completely before extracting
- Test after each major step
- Commit frequently with clear messages

### Preserve Functionality
- This is an extraction, not a refactor
- Don't "improve" code during extraction
- Match exact behavior

### Ask Questions
- If something is unclear, ask before proceeding
- If a file doesn't fit neatly into categories, ask
- If tests fail, investigate before continuing

### Track Progress
- Use TodoWrite to track all tasks
- Mark items complete as you go
- Add new tasks if you discover issues

---

## ESTIMATED EFFORT

| Phase | Time |
|-------|------|
| Phase 1: Setup & Inventory | 30 min |
| Phase 2: Extract Engine | 2-3 hours |
| Phase 3: Configure Package | 30 min |
| Phase 4: Refactor Website | 1-2 hours |
| Phase 5: Testing | 1-2 hours |
| Phase 6: Documentation | 30 min |
| **Total** | **5-8 hours** |

---

## BEGIN EXTRACTION

Start with Phase 1.1 - clone the source repository and examine the current state. Use this prompt as your guide throughout the process, checking off tasks as you complete them.

Good luck! 🍂
