# Elephant Build — Signpost Errors Reference

## Error Handling with Signpost Codes

Every error in Grove code MUST use a Signpost error code. Bare `throw new Error()` or raw `error(500, 'message')` is not acceptable.

## Import

```typescript
import {
  API_ERRORS,
  ARBOR_ERRORS,
  SITE_ERRORS,
  throwGroveError,
  logGroveError,
  buildErrorJson,
  buildErrorUrl,
} from "@autumnsgrove/lattice/errors";

// For auth errors:
import { AUTH_ERRORS } from "@autumnsgrove/lattice/heartwood";

// For Plant app errors:
import { PLANT_ERRORS } from "apps/plant/src/lib/errors.ts";
```

## Which Helper to Use Where

| Context | Helper | Example |
|---------|--------|---------|
| API routes (`+server.ts`) | `buildErrorJson()` | `return json(buildErrorJson(API_ERRORS.UNAUTHORIZED), { status: 401 })` |
| Page loads (`+page.server.ts`) | `throwGroveError()` | `throwGroveError(404, SITE_ERRORS.POST_NOT_FOUND, 'Engine')` |
| Auth redirects | `buildErrorUrl()` | `redirect(302, buildErrorUrl(AUTH_ERRORS.SESSION_EXPIRED, '/login'))` |
| Any server context (logging) | `logGroveError()` | `logGroveError('Engine', API_ERRORS.INTERNAL_ERROR, { path, cause: err })` |

## Error Catalogs

| Catalog | Prefix | Where |
|---------|--------|-------|
| `API_ERRORS` | `GROVE-API-XXX` | `@autumnsgrove/lattice/errors` |
| `ARBOR_ERRORS` | `GROVE-ARBOR-XXX` | `@autumnsgrove/lattice/errors` |
| `SITE_ERRORS` | `GROVE-SITE-XXX` | `@autumnsgrove/lattice/errors` |
| `AUTH_ERRORS` | `HW-AUTH-XXX` | `@autumnsgrove/lattice/heartwood` |
| `PLANT_ERRORS` | `PLANT-XXX` | `apps/plant/src/lib/errors.ts` |

## Number Ranges

- 001–019: Infrastructure errors
- 020–039: Authentication errors
- 040–059: Business logic errors
- 060–079: Rate limiting errors
- 080–099: Internal errors

## Full Patterns

### API Route (`+server.ts`)

```typescript
import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import {
  API_ERRORS,
  buildErrorJson,
  logGroveError,
} from "@autumnsgrove/lattice/errors";

export const POST: RequestHandler = async ({ request, locals }) => {
  // 1. Auth check
  if (!locals.user) {
    logGroveError("Engine", API_ERRORS.UNAUTHORIZED, { path: "/api/resource" });
    return json(buildErrorJson(API_ERRORS.UNAUTHORIZED), { status: 401 });
  }

  // 2. Validation failure
  const parsed = MySchema.safeParse(await request.json());
  if (!parsed.success) {
    return json(buildErrorJson(API_ERRORS.VALIDATION_ERROR), { status: 400 });
  }

  // 3. Business logic error
  try {
    const result = await createThing(parsed.data);
    return json({ success: true, data: result });
  } catch (err) {
    logGroveError("Engine", API_ERRORS.INTERNAL_ERROR, { cause: err });
    return json(buildErrorJson(API_ERRORS.INTERNAL_ERROR), { status: 500 });
  }
};
```

### Page Server Load (`+page.server.ts`)

```typescript
import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { throwGroveError, SITE_ERRORS } from "@autumnsgrove/lattice/errors";

export const load: PageServerLoad = async ({ locals, params }) => {
  if (!locals.user) {
    redirect(302, "/login");
  }

  const post = await getPost(params.slug, locals.tenant.id);
  if (!post) {
    throwGroveError(404, SITE_ERRORS.POST_NOT_FOUND, "Engine");
  }

  return { post };
};
```

### Auth Redirect

```typescript
import { redirect } from "@sveltejs/kit";
import { buildErrorUrl, AUTH_ERRORS } from "@autumnsgrove/lattice/heartwood";

// When session expired
redirect(302, buildErrorUrl(AUTH_ERRORS.SESSION_EXPIRED, "/login"));
```

## Client-Side Toast Feedback

```typescript
import { toast } from "@autumnsgrove/lattice/ui";

// After successful action
toast.success("Post published!");

// After failed action
toast.error(err instanceof Error ? err.message : "Something went wrong");

// Async operations with loading state
toast.promise(apiRequest("/api/export", { method: "POST" }), {
  loading: "Exporting...",
  success: "Export complete!",
  error: "Export failed.",
});

// Multi-step: show loading, then resolve
const id = toast.loading("Saving...");
// ... later
toast.dismiss(id);
toast.success("Saved!");
```

## When NOT to Use Toast

- Form validation errors — use `fail()` + inline display
- Page load failures — `+error.svelte` handles these
- Persistent admin notices — use GroveMessages

## Error Handling Checklist

```
[ ] Server errors use a Signpost code from the appropriate catalog
[ ] API routes return buildErrorJson() — never ad-hoc JSON
[ ] Page loads use throwGroveError() for expected errors
[ ] logGroveError() called for all server-side errors
[ ] Client actions show toast.success() or toast.error()
[ ] New error codes follow number ranges and have warm userMessage
[ ] adminMessage never reaches the client
[ ] Auth errors don't reveal user existence (same response for valid/invalid)
```
