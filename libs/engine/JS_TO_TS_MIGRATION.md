# JavaScript to TypeScript Migration Plan

> **Status**: Ready for execution
> **Estimated Time**: 2-3 hours
> **Risk Level**: Low (all files have JSDoc types)

## Overview

Migrate 25 JavaScript files to TypeScript. All files already have JSDoc type annotations, so this is primarily a syntax conversion.

---

## Phase 1: Core Utilities (30 min)

These are foundational files with no external dependencies within the project.

### Files to migrate:

| File                              | Lines | Notes                          |
| --------------------------------- | ----- | ------------------------------ |
| `src/lib/utils/debounce.js`       | ~20   | Simple utility, no deps        |
| `src/lib/utils/json.js`           | ~30   | JSON helpers                   |
| `src/lib/utils/validation.js`     | ~170  | Security validators            |
| `src/lib/utils/csrf.js`           | ~85   | CSRF protection                |
| `src/lib/utils/api.js`            | ~155  | Client-side fetch wrapper      |
| `src/lib/utils/readability.js`    | ~200  | Text analysis (skip test file) |
| `src/lib/utils/imageProcessor.js` | ~100  | Image processing               |

### Migration steps for each file:

1. Rename `.js` → `.ts`
2. Convert JSDoc `@typedef` to `interface` or `type`
3. Convert `@param {Type} name` to `name: Type`
4. Convert `@returns {Type}` to `: Type` return annotation
5. Remove redundant JSDoc type comments (keep descriptions)
6. Run `pnpm check` to verify

### Example conversion:

```javascript
// BEFORE (validation.js)
/**
 * @param {string} email - Email address to validate
 * @returns {boolean} True if email is valid
 */
export function validateEmail(email) {
```

```typescript
// AFTER (validation.ts)
/**
 * Email address validation
 */
export function validateEmail(email: string): boolean {
```

---

## Phase 2: Auth Module (15 min)

### Files to migrate:

| File                      | Lines | Notes               |
| ------------------------- | ----- | ------------------- |
| `src/lib/auth/session.js` | ~90   | Tenant verification |
| `src/lib/auth/index.js`   | ~10   | Re-exports          |

### Key types to define:

```typescript
// session.ts
interface User {
  email: string;
}

interface SessionError extends Error {
  status: number;
}

interface TenantRow {
  email: string;
}
```

---

## Phase 3: Config Files (20 min)

### Files to migrate:

| File                          | Lines | Notes             |
| ----------------------------- | ----- | ----------------- |
| `src/lib/config/wisp.js`      | ~190  | Wisp AI config    |
| `src/lib/config/ai-models.js` | ~50   | Model definitions |

### Key types to define:

```typescript
// wisp.ts
interface ProviderConfig {
  name: string;
  baseUrl: string;
  role: "primary" | "backup" | "tertiary";
  zdr: boolean;
  models: Record<string, string>;
}

interface ModelPricing {
  input: number;
  output: number;
}

type AnalysisAction = "grammar" | "tone" | "readability";
type AnalysisMode = "quick" | "thorough";
```

---

## Phase 4: Server Module (30 min)

### Files to migrate:

| File                                 | Lines | Notes               |
| ------------------------------------ | ----- | ------------------- |
| `src/lib/server/inference-client.js` | ~320  | AI inference client |
| `src/lib/server/index.js`            | ~20   | Re-exports          |

### Key types to define:

```typescript
// inference-client.ts
interface InferenceRequest {
  prompt: string;
  mode?: "quick" | "thorough";
  maxTokens?: number;
  temperature?: number;
  preferredProvider?: string;
  preferredModel?: string;
}

interface InferenceResponse {
  content: string;
  usage: { input: number; output: number };
  model: string;
  provider: string;
}

interface InferenceSecrets {
  FIREWORKS_API_KEY?: string;
  CEREBRAS_API_KEY?: string;
  GROQ_API_KEY?: string;
}
```

---

## Phase 5: Composables (20 min)

Svelte 5 runes-based composables.

### Files to migrate:

| File                                                             | Lines | Notes            |
| ---------------------------------------------------------------- | ----- | ---------------- |
| `src/lib/components/admin/composables/useDraftManager.svelte.js` | ~150  | Draft storage    |
| `src/lib/components/admin/composables/useEditorTheme.svelte.js`  | ~80   | Theme management |
| `src/lib/components/admin/composables/index.js`                  | ~10   | Re-exports       |

### Notes:

- Keep `.svelte.ts` extension for runes support
- Svelte 5 runes (`$state`, `$derived`) work the same in TS

---

## Phase 6: Route Handlers (45 min)

Server-side route handlers.

### Files to migrate:

| File                                                 | Notes               |
| ---------------------------------------------------- | ------------------- |
| `src/routes/rss.xml/+server.js`                      | RSS feed generation |
| `src/routes/admin/+layout.server.js`                 | Admin layout data   |
| `src/routes/admin/blog/+page.server.js`              | Blog list           |
| `src/routes/admin/pages/+page.server.js`             | Pages list          |
| `src/routes/admin/pages/edit/[slug]/+page.server.js` | Page editor         |
| `src/routes/admin/subscribers/+page.server.js`       | Subscriber list     |
| `src/routes/api/admin/settings/+server.js`           | Admin settings API  |
| `src/routes/api/settings/+server.js`                 | Public settings API |
| `src/routes/api/images/analyze/+server.js`           | Image analysis      |
| `src/routes/api/images/delete/+server.js`            | Image deletion      |

### SvelteKit types to use:

```typescript
import type { RequestHandler } from "./$types";
import type { PageServerLoad } from "./$types";

export const GET: RequestHandler = async ({ params, platform, locals }) => {
  // ...
};

export const load: PageServerLoad = async ({ params, platform, locals }) => {
  // ...
};
```

---

## Files to SKIP

| File                            | Reason                                |
| ------------------------------- | ------------------------------------- |
| `src/lib/ui/tailwind.preset.js` | CommonJS config, not worth converting |
| `*.test.js` files               | Tests can stay JS, less overhead      |

---

## Verification Checklist

After each phase:

- [ ] `pnpm check` passes with 0 errors
- [ ] `pnpm build` succeeds
- [ ] No new warnings introduced

After all phases:

- [ ] `pnpm check` shows 0 errors
- [ ] `pnpm build` succeeds
- [ ] Commit with message: `refactor(engine): migrate JavaScript files to TypeScript`

---

## Quick Reference: JSDoc → TypeScript

| JSDoc                                | TypeScript                   |
| ------------------------------------ | ---------------------------- |
| `/** @type {string} */`              | `: string`                   |
| `/** @param {string} x */`           | `x: string`                  |
| `/** @returns {boolean} */`          | `): boolean`                 |
| `/** @typedef {Object} Foo */`       | `interface Foo {}`           |
| `/** @type {Record<string, any>} */` | `: Record<string, unknown>`  |
| `/** @type {import('x').Y} */`       | `import type { Y } from 'x'` |

---

## Commands

```bash
# Rename file
mv src/lib/utils/validation.js src/lib/utils/validation.ts

# Check types
pnpm check

# Build
pnpm build

# Commit when done
git add -A && git commit -m "refactor(engine): migrate JavaScript files to TypeScript"
```
