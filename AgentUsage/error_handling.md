# Error Handling: Signpost Error Codes & Toast Notifications

> **MANDATORY**: Every server-side error MUST use a Signpost error code. Every client-side action MUST show feedback via Toast. No exceptions.

---

## Overview

Grove's **Signpost** error system ensures every error tells you three things:

1. **What broke** — a structured code like `GROVE-API-040`
2. **Who fixes it** — category: `user` (retry), `admin` (config), or `bug` (investigation)
3. **What to say** — a warm `userMessage` (safe for users) and a detailed `adminMessage` (for logs)

**Toast** is the primary client-side feedback mechanism — success, error, loading, and info notifications powered by svelte-sonner via the engine.

---

## Error Flow

```
Server Error Occurs
       │
       ▼
logGroveError()          ← Log with full context (never reaches client)
       │
       ├─ API route?     → buildErrorJson()  → json() response
       ├─ Page load?     → throwGroveError()  → renders in +error.svelte
       └─ Auth redirect? → buildErrorUrl()    → redirect with error params

Client Receives Error
       │
       ▼
apiRequest() catches     ← Extracts error message from response
       │
       ▼
toast.error(message)     ← User sees warm, actionable feedback
```

---

## Error Catalogs

| Catalog        | Prefix            | Codes | Import Path                       |
| -------------- | ----------------- | ----- | --------------------------------- |
| `API_ERRORS`   | `GROVE-API-XXX`   | 37    | `@autumnsgrove/lattice/errors`    |
| `ARBOR_ERRORS` | `GROVE-ARBOR-XXX` | 13    | `@autumnsgrove/lattice/errors`    |
| `SITE_ERRORS`  | `GROVE-SITE-XXX`  | 14    | `@autumnsgrove/lattice/errors`    |
| `AUTH_ERRORS`  | `HW-AUTH-XXX`     | 16    | `@autumnsgrove/lattice/heartwood` |
| `PLANT_ERRORS` | `PLANT-XXX`       | 11    | `apps/plant/src/lib/errors.ts`    |

**Total: ~91 structured error codes across 5 catalogs.**

### Error Code Structure

Every error code is a `GroveErrorDef`:

```typescript
interface GroveErrorDef {
	code: string; // "GROVE-API-040"
	category: ErrorCategory; // "user" | "admin" | "bug"
	userMessage: string; // Safe, warm — shown to users
	adminMessage: string; // Detailed — for logs only
}
```

### Number Ranges

| Range     | Purpose                        | Examples                            |
| --------- | ------------------------------ | ----------------------------------- |
| `001-019` | Infrastructure                 | DB not configured, bindings missing |
| `020-039` | Authentication & authorization | Unauthorized, invalid token, CSRF   |
| `040-059` | Business logic                 | Invalid input, not found, conflicts |
| `060-079` | Rate limiting                  | Rate limited, quota exceeded        |
| `080-099` | Internal errors                | Unexpected failures, catch-all      |

---

## Server-Side Patterns

### Import

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
import {
	AUTH_ERRORS,
	getAuthError,
	logAuthError,
	buildErrorParams,
} from "@autumnsgrove/lattice/heartwood";
```

### Pattern 1: API Route (`+server.ts`)

```typescript
export const POST: RequestHandler = async ({ request, locals, platform }) => {
	if (!locals.user) {
		logGroveError("Engine", API_ERRORS.UNAUTHORIZED, { path: "/api/posts" });
		return json(buildErrorJson(API_ERRORS.UNAUTHORIZED), { status: 401 });
	}

	const body = schema.safeParse(await request.json());
	if (!body.success) {
		return json(buildErrorJson(API_ERRORS.INVALID_REQUEST_BODY), {
			status: 400,
		});
	}

	// ... business logic
};
```

### Pattern 2: Page Load (`+page.server.ts`)

```typescript
export const load: PageServerLoad = async ({ params, locals }) => {
	const post = await getPost(params.slug);
	if (!post) {
		throwGroveError(404, SITE_ERRORS.POST_NOT_FOUND, "Engine");
	}
	return { post };
};
```

### Pattern 3: Auth Redirect

```typescript
if (errorParam) {
	const authError = getAuthError(errorParam);
	logAuthError(authError, { path: "/auth/callback", ip });
	redirect(302, buildErrorUrl(authError, "/login"));
}
```

### Pattern 4: Structured Logging

```typescript
try {
  await db.prepare('INSERT INTO posts ...').bind(...).run();
} catch (err) {
  logGroveError('Engine', API_ERRORS.INTERNAL_ERROR, {
    path: '/api/posts',
    userId: locals.user?.id,
    detail: 'Failed to insert post',
    cause: err,
  });
  return json(buildErrorJson(API_ERRORS.INTERNAL_ERROR), { status: 500 });
}
```

---

## Client-Side Patterns (Toast)

### Import

```typescript
import { toast } from "@autumnsgrove/lattice/ui";
```

### After Successful Action

```typescript
const response = await apiRequest("/api/posts", { method: "POST", body });
if (response.ok) {
	toast.success("Post published!");
}
```

### After Failed Action

```typescript
try {
	await apiRequest("/api/posts", { method: "DELETE" });
	toast.success("Post deleted");
} catch (err) {
	toast.error(err instanceof Error ? err.message : "Something went wrong");
}
```

### Async Operations with `toast.promise()`

```typescript
toast.promise(apiRequest("/api/export", { method: "POST" }), {
	loading: "Exporting your data...",
	success: "Export complete!",
	error: "Export failed. Please try again.",
});
```

### Multi-Step Flows with Loading

```typescript
const id = toast.loading("Saving changes...");
try {
	await apiRequest("/api/settings", { method: "PUT", body });
	toast.dismiss(id);
	toast.success("Settings saved!");
} catch (err) {
	toast.dismiss(id);
	toast.error("Failed to save settings");
}
```

### Toast Methods Reference

| Method                   | Duration   | Use For                                 |
| ------------------------ | ---------- | --------------------------------------- |
| `toast.success(msg)`     | 3s         | Completed actions                       |
| `toast.error(msg)`       | 4s         | Failed actions                          |
| `toast.info(msg)`        | 3s         | Neutral information                     |
| `toast.warning(msg)`     | 3.5s       | Caution notices                         |
| `toast.loading(msg)`     | Persistent | In-progress operations (returns ID)     |
| `toast.promise(p, msgs)` | Auto       | Async with loading/success/error states |
| `toast.dismiss(id?)`     | —          | Dismiss specific or all toasts          |

---

## When NOT to Use Toast

| Situation                | Use Instead                                                                  |
| ------------------------ | ---------------------------------------------------------------------------- |
| Form validation errors   | `fail()` + inline error display next to fields                               |
| Page load failures       | `+error.svelte` (SvelteKit handles this automatically via `throwGroveError`) |
| Persistent admin notices | `GroveMessages` component                                                    |
| Console-only debugging   | `logGroveError()` server-side (never `console.error` alone)                  |

---

## Adding New Error Codes

1. **Pick the catalog** — Which system owns this error? (API, Arbor, Site, Auth, Plant)
2. **Pick the range** — Infrastructure (001-019), auth (020-039), business (040-059), rate limiting (060-079), internal (080-099)
3. **Write the `userMessage`** — Warm, clear, no technical details. "We couldn't find that page" not "404 resource not found"
4. **Write the `adminMessage`** — Detailed, actionable. Include what failed and what to check
5. **Set the `category`** — `user` (they can fix it), `admin` (config issue), `bug` (needs investigation)
6. **Add to the `.ts` file** — Follow alphabetical ordering within the catalog
7. **Verify** — Run `npx svelte-check` to ensure types resolve

**Example:**

```typescript
// In api-errors.ts
MEDIA_UPLOAD_FAILED: {
  code: 'GROVE-API-045',
  category: 'user',
  userMessage: 'We had trouble uploading your file. Please try a smaller image.',
  adminMessage: 'R2 upload failed. Check bucket permissions and file size limits.',
},
```

---

## Common Pitfalls

| Pitfall                              | Correct Approach                                                                     |
| ------------------------------------ | ------------------------------------------------------------------------------------ |
| `throw new Error('Not found')`       | `throwGroveError(404, SITE_ERRORS.PAGE_NOT_FOUND, 'Engine')`                         |
| `throw error(500, 'Internal error')` | `return json(buildErrorJson(API_ERRORS.INTERNAL_ERROR), { status: 500 })`            |
| `console.error(err)` alone           | `logGroveError('Engine', API_ERRORS.INTERNAL_ERROR, { cause: err })`                 |
| `alert('Saved!')`                    | `toast.success('Saved!')`                                                            |
| Exposing `adminMessage` to client    | Always return `userMessage` only; `adminMessage` stays in server logs                |
| `fetch('/api/...')` for mutations    | `apiRequest('/api/...')` — handles CSRF + credentials automatically                  |
| Auth errors revealing user existence | Use same message: "Invalid credentials" (never "user not found" vs "wrong password") |

---

## Error Handling Checklist

```
[ ] Server errors use a Signpost code from the appropriate catalog
[ ] API routes return buildErrorJson() — never ad-hoc JSON
[ ] Page loads use throwGroveError() for expected errors
[ ] logGroveError() called for all server-side errors
[ ] Client actions show toast.success() or toast.error()
[ ] New error codes follow number ranges and have warm userMessage
[ ] adminMessage never reaches the client
[ ] Auth errors don't reveal user existence
[ ] All API calls use apiRequest() — never bare fetch()
```

---

## Related Resources

- **Error system source:** `libs/engine/src/lib/errors/`
- **Auth errors source:** `libs/engine/src/lib/heartwood/errors.ts`
- **Plant errors source:** `apps/plant/src/lib/errors.ts`
- **Toast source:** `libs/engine/src/lib/ui/components/ui/toast.ts`
- **Signpost developer docs:** `docs/developer/signpost-error-codes.md`
- **API utility (`apiRequest`):** Each package's `$lib/utils/api.ts`

---

_Every error tells a story. Signpost makes sure it's the right one._
