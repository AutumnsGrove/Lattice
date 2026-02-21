# Elephant Build — File Patterns Reference

## SvelteKit File Patterns

### Route Files

```
src/routes/
├── {feature}/
│   ├── +page.svelte          — UI component
│   ├── +page.server.ts       — Server-side load + form actions
│   ├── +layout.svelte        — Layout wrapper (optional)
│   └── +layout.server.ts     — Layout load (optional)
│
├── api/{feature}/
│   └── +server.ts            — REST endpoint (GET/POST/PUT/DELETE)
│
└── (group)/                  — Route group (no URL segment)
    └── {feature}/
        └── +page.svelte
```

### Naming Conventions

- Route files: always `+page.svelte`, `+server.ts`, etc.
- Lib files: `kebab-case.ts` for utilities, `PascalCase.svelte` for components
- Services: `src/lib/services/{feature}.ts`
- Types: `src/lib/types/{feature}.ts` or inline in the service

### Component Structure

```svelte
<script lang="ts">
  // 1. Imports (external, then internal)
  import { toast } from "@autumnsgrove/lattice/ui";
  import { cn } from "@autumnsgrove/lattice/ui/utils";

  // 2. Props (Svelte 5 runes)
  let { data, onSubmit } = $props<{ data: SomeType; onSubmit: () => void }>();

  // 3. State
  let loading = $state(false);
  let value = $state("");

  // 4. Derived
  let isValid = $derived(value.length > 0);

  // 5. Effects
  $effect(() => {
    // side effects
  });

  // 6. Functions
  async function handleSubmit() {
    loading = true;
    try {
      await onSubmit();
      toast.success("Done!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      loading = false;
    }
  }
</script>

<!-- Template -->
<div class={cn("base-classes", { "conditional": someCondition })}>
  <!-- content -->
</div>
```

### API Route Pattern (`+server.ts`)

```typescript
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import {
  API_ERRORS,
  buildErrorJson,
  logGroveError,
} from "@autumnsgrove/lattice/errors";

export const POST: RequestHandler = async ({ request, locals, platform }) => {
  // 1. Auth check
  if (!locals.user) {
    return json(buildErrorJson(API_ERRORS.UNAUTHORIZED), { status: 401 });
  }

  // 2. Parse & validate input
  const body = await request.json();
  // validate with Zod...

  // 3. Business logic
  try {
    const result = await doSomething(body);
    return json({ success: true, data: result });
  } catch (err) {
    logGroveError("Engine", API_ERRORS.INTERNAL_ERROR, { cause: err });
    return json(buildErrorJson(API_ERRORS.INTERNAL_ERROR), { status: 500 });
  }
};
```

### Page Server Pattern (`+page.server.ts`)

```typescript
import { error, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { throwGroveError } from "@autumnsgrove/lattice/errors";

export const load: PageServerLoad = async ({ locals, params }) => {
  if (!locals.user) {
    redirect(302, "/login");
  }

  const item = await getItem(params.id);
  if (!item) {
    throwGroveError(404, SITE_ERRORS.NOT_FOUND, "Engine");
  }

  return { item };
};

export const actions: Actions = {
  default: async ({ request, locals }) => {
    const data = await request.formData();
    // handle form action
    return { success: true };
  },
};
```

## Component File Organization

### Engine-First Imports

Always check engine before creating locally:

```typescript
// UI Components
import { GlassCard, GlassButton } from "@autumnsgrove/lattice/ui";
import { Header, Footer } from "@autumnsgrove/lattice/ui/chrome";
import { cn } from "@autumnsgrove/lattice/ui/utils";

// Stores
import { seasonStore, themeStore } from "@autumnsgrove/lattice/ui/stores";

// Nature
import { TreePine } from "@autumnsgrove/lattice/ui/nature";

// Utils
import { sanitize, markdown } from "@autumnsgrove/lattice/utils";

// Auth
import { validateSession } from "@autumnsgrove/lattice/auth";
```

### New Files vs Modified Files

When planning the build, categorize explicitly:

```
NEW FILES (create from scratch):
- src/lib/services/my-service.ts
- src/routes/my-feature/+page.svelte
- src/routes/api/my-endpoint/+server.ts

MODIFIED FILES (edit existing):
- src/lib/db/schema.ts  (add table definition)
- src/routes/+layout.server.ts  (add new load)
- src/lib/types.ts  (add new type)

CONFIG CHANGES:
- wrangler.toml  (add binding)
- .env.example  (add new var)
```

## Build Sequence

Always follow this order to avoid dependency issues:

```
1. Types & Constants
   └── Define interfaces, enums, constants first

2. Database / Schema
   └── Add table definitions, run migrations

3. Backend Services
   └── Business logic, data access layer

4. API Layer
   └── Endpoints that expose services

5. Frontend Components
   └── UI that calls APIs

6. Integration Points
   └── Wire new routes into existing navigation

7. Tests
   └── Unit for services, integration for API, component for UI
```
