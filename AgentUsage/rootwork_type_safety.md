# Rootwork: Type Safety at Every Boundary

> **MANDATORY**: Every trust boundary (KV reads, form submissions, webhook payloads, caught exceptions) MUST use a Rootwork utility. No `as` casts, no unvalidated `JSON.parse`, no `formData.get() as string`. No exceptions.

---

## What Rootwork Is

Grove has services that pass data across trust boundaries: KV caches, form submissions, webhook payloads, API responses. At every one of these boundaries, TypeScript's type system stops helping. A `KV.get()` returns `unknown`. A `formData.get()` returns `string | null`. A webhook payload is `Record<string, unknown>`.

Before Rootwork, the codebase handled this with unsafe casts (`as Record<string, number>`) and manual validation (30+ lines of hand-rolled checks per form). Rootwork replaces all of that with four small utilities that validate at the boundary so you can trust the types inside.

The name comes from a tree's root system: invisible infrastructure that keeps everything above ground healthy.

**Philosophy: validate at the boundary, trust inside the boundary.** Once data passes through a Rootwork utility, the rest of the code can trust the types.

---

## The Utilities

```
External Data Arrives
       │
       ├─ Form submission?     → parseFormData()
       ├─ KV cache read?       → safeJsonParse() or createTypedCacheReader()
       ├─ Caught exception?    → isRedirect() / isHttpError()
       └─ Webhook payload?     → asPushData() (or typed accessor pattern)
       │
       ▼
  Validated, typed data
  (safe to use everywhere)
```

### Import

```typescript
// Engine packages — all utilities from one path
import {
	isRedirect,
	isHttpError,
	parseFormData,
	safeJsonParse,
	createTypedCacheReader,
} from "@autumnsgrove/lattice/server";

// Pulse worker — event data accessor
import { asPushData } from "./types";

// Zod — always needed for schemas
import { z } from "zod";
```

---

## Pattern 1: Form Data — `parseFormData()`

Replaces `formData.get("field") as string` with Zod-validated extraction.

### Define the schema at module scope

```typescript
const ProfileSchema = z.object({
	displayName: z.string().trim().min(1, "Display name is required"),
	username: z.string().trim().toLowerCase().min(3).max(30),
	favoriteColor: z.string().optional().default(""),
});
```

### Parse in the action handler

```typescript
export const actions: Actions = {
	default: async ({ request }) => {
		const formData = await request.formData();
		const result = parseFormData(formData, ProfileSchema);
		if (!result.success) {
			const firstError = Object.values(result.errors).flat()[0];
			return fail(400, { error: firstError || "Invalid form data" });
		}
		// result.data is fully typed: { displayName: string, username: string, favoriteColor: string }
		const { displayName, username } = result.data;
	},
};
```

### Rules

- Define schemas at **module scope**, not inside handlers. Schemas are static; recreating them per-request wastes work.
- Use `z.coerce.number()` for numeric form fields (form data is always strings).
- Use `z.string().optional().default("")` for optional fields with defaults.
- Return `result.errors` for field-level inline validation, or flatten to a single message for simple forms.

---

## Pattern 2: KV Cache Reads — `safeJsonParse()`

Replaces `(await kv.get(key, "json")) as SomeType` with validated parsing.

### Define the schema

```typescript
const TodayStatsSchema = z.object({
	commits: z.number(),
	prsMerged: z.number(),
	issuesClosed: z.number(),
	linesAdded: z.number(),
	linesRemoved: z.number(),
});
```

### Read with validation

```typescript
const raw = await kv.get(`pulse:${tenantId}:today`);
const today = safeJsonParse(raw, TodayStatsSchema) ?? {
	commits: 0,
	prsMerged: 0,
	issuesClosed: 0,
	linesAdded: 0,
	linesRemoved: 0,
};
```

### Rules

- `safeJsonParse` returns `T | null`. Always provide a fallback with `??`.
- Use `kv.get(key)` (text mode) with `safeJsonParse`, not `kv.get(key, "json")`. The utility handles `JSON.parse` internally with proper try/catch.
- If a schema doesn't include all fields the writer stores, Zod strips unknown keys by default. **Your schema must match what consumers read.** If a component reads `active.message`, the schema must include `message`.

---

## Pattern 3: Typed Cache Reader — `createTypedCacheReader()`

Wraps a cache service with per-read schema validation. Useful when you have a shared cache interface.

```typescript
const typedCache = createTypedCacheReader(cache);

const active = await typedCache.get("pulse:active", tenantId, PulseActiveSchema, {
	isActive: false,
	lastCommit: 0,
	author: "",
	message: "",
});
// active is guaranteed to match PulseActiveSchema
```

### When to use which

| Situation                                          | Use                        |
| -------------------------------------------------- | -------------------------- |
| Raw KV string from `kv.get()`                      | `safeJsonParse()`          |
| Cache service with `.get(key, tenantId)` interface | `createTypedCacheReader()` |
| Inline JSON string from D1 column                  | `safeJsonParse()`          |

---

## Pattern 4: Type Guards — `isRedirect()` / `isHttpError()`

Replaces `(err as any)?.status` casts in catch blocks.

SvelteKit's `redirect()` and `error()` throw objects that don't extend `Error`. Without type guards, catch blocks resort to unsafe casts.

```typescript
try {
	// ... route logic that might redirect or throw
} catch (err) {
	if (isRedirect(err)) throw err; // Re-throw redirects as-is
	if (isHttpError(err)) {
		return json({ error: err.body.message }, { status: err.status });
	}
	// Handle unexpected errors
	logGroveError("Engine", API_ERRORS.INTERNAL_ERROR, { cause: err });
	return json(buildErrorJson(API_ERRORS.INTERNAL_ERROR), { status: 500 });
}
```

### Rules

- Always check `isRedirect` first. Redirects must be re-thrown, not swallowed.
- Use these in any catch block that wraps SvelteKit route logic.
- The guards use shape checking, not `instanceof`. They work across module boundaries.

---

## Pattern 5: Event Data Accessors — `asPushData()`

Replaces `(event.data as any).commits` with typed field extraction.

```typescript
if (event.eventType === "push") {
	const push = asPushData(event.data);
	today.commits += push.commits ?? 1;
	today.linesAdded += push.additions ?? 0;
}
```

### Adding new event accessors

When a new event type needs typed data access, follow the same pattern:

```typescript
export interface IssueEventData {
	number?: number;
	labels?: string[];
}

export function asIssueData(data: Record<string, unknown>): IssueEventData {
	return {
		number: typeof data.number === "number" ? data.number : undefined,
		labels: Array.isArray(data.labels)
			? data.labels.filter((l): l is string => typeof l === "string")
			: undefined,
	};
}
```

Each field is individually type-checked. Missing or wrong-typed fields become `undefined`, not runtime errors.

---

## Decision Guide

| You're reading data from...          | Use this                         | Import from                    |
| ------------------------------------ | -------------------------------- | ------------------------------ |
| `request.formData()`                 | `parseFormData()`                | `@autumnsgrove/lattice/server` |
| `kv.get()` or any JSON string        | `safeJsonParse()`                | `@autumnsgrove/lattice/server` |
| A cache service with `.get()`        | `createTypedCacheReader()`       | `@autumnsgrove/lattice/server` |
| A `catch` block in a SvelteKit route | `isRedirect()` / `isHttpError()` | `@autumnsgrove/lattice/server` |
| `NormalizedEvent.data` in Pulse      | `asPushData()` (or new accessor) | `./types`                      |

---

## Common Mistakes

| Mistake                                    | Correct Approach                                                    |
| ------------------------------------------ | ------------------------------------------------------------------- |
| `formData.get("name") as string`           | `parseFormData(formData, Schema)`                                   |
| `(await kv.get(key, "json")) as MyType`    | `safeJsonParse(await kv.get(key), MySchema)`                        |
| `JSON.parse(raw) as Config`                | `safeJsonParse(raw, ConfigSchema)`                                  |
| `(err as any)?.status === 302`             | `if (isRedirect(err)) throw err`                                    |
| `event.data.commits` (untyped)             | `asPushData(event.data).commits`                                    |
| Schema defined inside handler              | Hoist schema to module scope                                        |
| Schema missing fields consumers read       | Schema must include all fields the writer stores AND consumers read |
| `kv.get(key, "json")` with `safeJsonParse` | Use `kv.get(key)` (text mode); `safeJsonParse` handles parsing      |

---

## Checklist

```
[ ] All form data extraction uses parseFormData() with a Zod schema
[ ] All KV/JSON reads use safeJsonParse() or createTypedCacheReader()
[ ] All catch blocks in SvelteKit routes use isRedirect()/isHttpError()
[ ] All webhook event data access uses typed accessor functions
[ ] Schemas are defined at module scope, not inside handlers
[ ] Schemas include every field that any consumer reads
[ ] KV reads use text mode when paired with safeJsonParse()
[ ] Fallback values are provided for every cache read
[ ] No `as` casts at trust boundaries
```

---

## Source Files

- **Type guards:** `libs/engine/src/lib/server/utils/type-guards.ts`
- **Form data:** `libs/engine/src/lib/server/utils/form-data.ts`
- **Typed cache:** `libs/engine/src/lib/server/utils/typed-cache.ts`
- **Pulse accessors:** `services/pulse/src/types.ts`
- **Barrel export:** `libs/engine/src/lib/server/utils/index.ts`
- **Public API:** `@autumnsgrove/lattice/server`
- **Spec:** `docs/specs/grove-types-spec.md`

---

_The roots hold the tree. Validate at the boundary, trust inside it._
