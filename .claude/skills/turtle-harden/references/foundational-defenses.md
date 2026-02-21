# Turtle Harden: Foundational Defenses Reference

> Loaded by turtle-harden during Phase 2 (LAYER). See SKILL.md for the full workflow.

---

## 2A. Input Validation & Sanitization

Every entry point identified in Phase 1 must be validated.

```
VALIDATION CHECKLIST:
[ ] All user input is validated SERVER-SIDE (client-side is UX only)
[ ] Validation uses ALLOWLISTS, not blocklists
[ ] Strict type constraints enforced (string, number, boolean — never trust incoming types)
[ ] Length limits enforced on all string inputs
[ ] Range limits enforced on all numeric inputs
[ ] Format validation for structured data (email, URL, date, UUID)
[ ] Runtime schema validation at API boundaries (Zod, Valibot, or equivalent)
[ ] Invalid input is REJECTED with an error, not silently "fixed" or coerced
[ ] Null bytes, control characters, and Unicode normalization handled
[ ] Content-Type header validated on all incoming requests
```

**SvelteKit pattern (`+page.server.ts` or `+server.ts`):**

```typescript
import { z } from "zod";

const CreatePostSchema = z.object({
  title: z.string().min(1).max(200).trim(),
  content: z.string().min(1).max(50000),
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .max(100),
});

export const actions = {
  default: async ({ request, locals }) => {
    const formData = await request.formData();
    const result = CreatePostSchema.safeParse({
      title: formData.get("title"),
      content: formData.get("content"),
      slug: formData.get("slug"),
    });

    if (!result.success) {
      return fail(400, { errors: result.error.flatten() });
    }

    // result.data is now typed and validated
  },
};
```

---

## 2B. Output Encoding

Every exit point must encode data for its context.

```
ENCODING CHECKLIST:
[ ] HTML context: HTML entity encoding (< > & " ')
[ ] JavaScript context: JavaScript encoding (\xHH)
[ ] URL context: Percent encoding (%HH)
[ ] CSS context: CSS encoding (\HHHHHH)
[ ] JSON API responses: Proper serialization (no raw HTML in JSON values)
[ ] SVG context: Full sanitization (strip scripts, event handlers, foreignObject)
[ ] Rich text output uses DOMPurify or equivalent with strict allowlist
[ ] innerHTML / @html (Svelte) NEVER used with unsanitized user input
```

**SvelteKit pattern:**

```svelte
<!-- DANGEROUS: Never do this with user input -->
{@html userContent}

<!-- SAFE: Svelte auto-escapes by default -->
{userContent}

<!-- SAFE: If you MUST render HTML, sanitize first -->
{@html DOMPurify.sanitize(userContent, { ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'] })}
```

---

## 2C. Parameterized Queries

```
DATABASE CHECKLIST:
[ ] ALL database queries use parameterized statements / prepared statements
[ ] ZERO string concatenation in SQL queries
[ ] Table and column names validated against alphanumeric pattern (never from user input)
[ ] Use the typed query helpers from database.ts where available
[ ] Each independent query has its own try/catch (no cascading failures)
[ ] Independent queries run in parallel with Promise.all()
```

**Pattern:**

```typescript
// NEVER: String concatenation
const results = await db
  .prepare(`SELECT * FROM posts WHERE slug = '${slug}'`)
  .all();

// ALWAYS: Parameterized
const results = await db
  .prepare("SELECT * FROM posts WHERE slug = ?")
  .bind(slug)
  .all();

// BEST: Typed query helper
const post = await findById<Post>(db, "posts", postId);
```

---

## 2D. Type Safety & Secure Defaults

```
TYPE SAFETY CHECKLIST:
[ ] TypeScript strict mode enabled ("strict": true)
[ ] strictNullChecks enabled
[ ] No use of 'any' type (use 'unknown' with type guards)
[ ] No eval(), new Function(), setTimeout(string), setInterval(string)
[ ] No dynamic import() with user-controlled paths
[ ] Object.create(null) for dictionaries (no prototype chain)
[ ] Map/Set instead of plain objects where appropriate
[ ] Explicit return types on security-critical functions
```

---

## 2E. Error Handling (Signpost Standard)

Every error MUST use a Signpost error code. No bare `throw new Error()` or `throw error(500, ...)`.

```
ERROR HANDLING CHECKLIST (SIGNPOST):
[ ] All errors use a Signpost code from the appropriate catalog
    (API_ERRORS, ARBOR_ERRORS, SITE_ERRORS, AUTH_ERRORS, PLANT_ERRORS)
[ ] logGroveError() called for all server-side errors (never console.error alone)
[ ] API routes return buildErrorJson() — never ad-hoc JSON error shapes
[ ] Page loads use throwGroveError() for expected errors (renders in +error.svelte)
[ ] userMessage is warm, clear, and contains NO technical details
[ ] adminMessage is detailed and actionable (for logs/dashboards only)
[ ] Error category is correct: "user" (they can fix), "admin" (config), "bug" (investigate)
[ ] Client-side actions show toast.success() or toast.error() feedback
[ ] Production error pages show GENERIC userMessage only (no stack traces)
[ ] Different errors produce the SAME response for auth (no user enumeration)
    "Invalid credentials" — never "user not found" vs "wrong password"
[ ] adminMessage never reaches the client (information disclosure prevention)
[ ] try/catch blocks don't silently swallow errors — at minimum logGroveError()
```

See `AgentUsage/error_handling.md` for the complete Signpost reference.
