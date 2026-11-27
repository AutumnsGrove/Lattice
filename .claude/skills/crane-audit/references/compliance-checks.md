# Crane Audit — Compliance Checks Reference

The crane's checklist. Every category has: what to look for, what passes, what fails, and how to fix it.

**C0 and C0b are the most important categories.** They govern the project's architectural integrity — violations here are structural debt that compounds. All other categories derive from these two principles.

---

## Category 0: Data Primacy (Single Source of Truth)

> **Code translates data. It never defines it.**

This is the most important category. Everything else is secondary.

- No string literals hardcoded in logic that belong in a config module, manifest, or named constant — if a value could change independently of the code, it must live outside the code
- No duplicate values — if the same string, number, or structure appears in two places, one must derive from the other or both must derive from a shared source
- No parallel data structures that shadow an existing config — if a config module already defines a set of things, code must not define a second list of the same things
- No switch/if-else chains dispatching on string literals where a map or table-driven approach would eliminate the duplication
- No behavior baked into code that should be driven by configuration — thresholds, model names, endpoint URLs, retry counts belong in config modules
- Repeated string literals that are semantically the same value must be extracted to a named constant or config key

**Sources of truth in Lattice:**

| Data | Source of Truth | Import |
|------|----------------|--------|
| Tier definitions (names, limits, pricing) | `platform/config/tiers.ts` | `@autumnsgrove/lattice/platform/config` |
| AI model names and metadata | `libs/lumen-registry/src/data/models.json` | `@autumnsgrove/lumen-registry` |
| Error codes and messages | Signpost catalogs (`errors/*.ts`) | `@autumnsgrove/lattice/errors` |
| Design tokens and colors | Prism (`libs/prism/`) | `@autumnsgrove/prism` |
| Rate limit definitions | Threshold/Thorn config | `@autumnsgrove/lattice/platform/threshold` |
| Billing URLs | `platform/config/billing.ts` | `@autumnsgrove/lattice/platform/config` |
| Icon identity | `libs/prism/src/lib/icons/manifest.ts` | `@autumnsgrove/prism/icons` |

**Specific patterns to flag:**

- The same model name string appearing in more than one file
- Tier names or numeric limits duplicated in route handlers instead of reading from `tiers.ts`
- Inline error message strings instead of Signpost catalog references
- Magic threshold values (token counts, rate limits, timeouts) as bare literals instead of named constants
- Hardcoded hex colors instead of Prism CSS variables
- Rate limit windows as magic numbers (3600, 86400) instead of named constants

---

## Category 0b: SDK Boundaries

> **Every capability is accessed through its owning SDK. If no SDK exists, build the shared function so the next consumer doesn't reinvent it.**

This is the behavioral sibling of C0. Where C0 governs *values*, C0b governs *behavior*. Together: code translates data through SDK boundaries — it never defines data, and it never reimplements behavior.

**The test:** *"If I needed to change how this works, how many files would I touch?"* 1 (the owning SDK/package) = PASS. >1 = FAIL.

**The resolution order (consumers must follow):**

1. **SDK exists** → Use it (Infra, Amber, Lumen, Threshold, Signpost, Prism, etc.)
2. **Engine has it** → Import from `@autumnsgrove/lattice/...`
3. **Neither exists** → Build it in the engine first, then import
4. **Truly app-specific** → Local code is acceptable, but scrutinize whether it's really unique

**Capability ownership map:**

| Capability | Owner | Consumers call | They do NOT |
|---|---|---|---|
| Database queries | `@autumnsgrove/infra` | `GroveDatabase`, `createDb()`, `scopedDb()` | Use raw `env.DB.prepare()` or `platform.env.DB` |
| File storage | `@autumnsgrove/lattice/amber` | `FileManager`, `ExportManager`, `QuotaManager` | Use raw `env.BUCKET.put()` or `R2Bucket` ops |
| KV storage | `@autumnsgrove/infra` | `GroveKV` via `GroveContext` | Use raw `env.KV.get()` / `env.KV.put()` |
| AI inference | `@autumnsgrove/lattice/ai/lumen` | `createLumenClient()`, `RemoteLumenClient` | Construct `new OpenAI()` or raw fetch to model APIs |
| Rate limiting | `@autumnsgrove/lattice/platform/threshold` | `createThreshold()`, `thresholdMiddleware()` | Write ad-hoc KV read-modify-write rate limiters |
| Content moderation | `@autumnsgrove/lattice/thorn` | `moderatePublishedContent()` | Build custom profanity/spam filters |
| Error handling | `@autumnsgrove/lattice/errors` | `throwGroveError()`, `logGroveError()`, `buildErrorJson()` | Use bare `throw new Error()` or `console.error()` |
| Email | `@autumnsgrove/lattice/zephyr` | `createZephyrClient()`, `zephyr.send()` | Use raw `new Resend()` or direct email API calls |
| Credentials | Warden (service binding) | `createWardenClient()` | Store raw API keys in worker env or code |
| Icons | `@autumnsgrove/prism/icons` | Semantic groups (`stateIcons`, `navIcons`) | Import from `@lucide/svelte` directly |
| Design tokens | `@autumnsgrove/prism` | CSS vars + Tailwind preset | Hardcode hex values or duplicate token defs |
| Type-safe boundaries | `@autumnsgrove/lattice/server` | `parseFormData()`, `safeJsonParse()` | Cast with `as any` on external data |
| Client-side fetch | `$lib/utils/api` | `apiRequest()` (auto-injects CSRF) | Use raw `fetch()` for internal API calls |

**Acceptable escape hatches (mark PASS with note):**

- SDK library files themselves (`libs/infra/`, `libs/engine/src/lib/threshold/`) wrap raw bindings by design
- Durable Objects with dual-binding strategy (e.g., Warden's `TENANT_DB`)
- Migration scripts, CLI tools, and test mocks
- Lines with `// boundary-ok` are intentional exceptions

---

## Category 1: Grove SDK Compliance

The grove has purpose-built SDKs for every platform primitive. Raw bindings are never acceptable in application code.

**Note:** This category provides the detailed pass/fail patterns for C0b. If you've already checked C0b thoroughly, use this for specific pattern verification rather than re-auditing the same findings.

### Database — `GroveDatabase` from `@autumnsgrove/infra`

| Pattern | Status | Remediation |
|---------|--------|-------------|
| `env.DB.prepare()` / `c.env.DB` | FAIL | Use `GroveDatabase` from `@autumnsgrove/infra` |
| `env.DB.exec()` | FAIL | Use `GroveDatabase.exec()` |
| `new D1Database()` | FAIL | Use `GroveDatabase` via `GroveContext` |
| `ctx.db.prepare()` via GroveContext | PASS | Correct usage |

### Storage (R2) — `Amber` from `@autumnsgrove/lattice/amber`

| Pattern | Status | Remediation |
|---------|--------|-------------|
| `env.BUCKET.put()` / `.get()` / `.delete()` | FAIL | Use `FileManager` from `@autumnsgrove/lattice/amber` |
| Raw `R2Bucket` operations | FAIL | Use `GroveStorage` from `@autumnsgrove/infra` (infra-level) or Amber (app-level) |
| `FileManager`, `ExportManager`, `QuotaManager` | PASS | Correct Amber usage |
| `GroveStorage` from `@autumnsgrove/infra` | PASS | Correct infra-level usage |

### KV — `GroveKV` from `@autumnsgrove/infra`

| Pattern | Status | Remediation |
|---------|--------|-------------|
| `env.KV.get()` / `env.KV.put()` | FAIL | Use `GroveKV` from `@autumnsgrove/infra` |
| Raw `KVNamespace` operations | FAIL | Use `GroveKV` via `GroveContext` |
| `GroveKV` via GroveContext | PASS | Correct usage |

### AI Inference — `Lumen` from `@autumnsgrove/lattice/lumen`

| Pattern | Status | Remediation |
|---------|--------|-------------|
| `new Anthropic()` / `new OpenAI()` | FAIL | Use `LumenClient` or `RemoteLumenClient` |
| Raw `fetch()` to OpenRouter/Anthropic/OpenAI URLs | FAIL | Use `LumenClient` with task-based routing |
| Direct `env.OPENROUTER_API_KEY` in application code | FAIL | Let Lumen handle credential resolution (BYOK → Warden → fallback) |
| `createLumenClient()` / `RemoteLumenClient` | PASS | Correct usage |
| `lumen.run({ task, input, tenant }, tier)` | PASS | Correct task-based pattern |

### Email — `Zephyr` from `@autumnsgrove/lattice/zephyr`

| Pattern | Status | Remediation |
|---------|--------|-------------|
| `new Resend()` / `import { Resend }` | FAIL | Use `ZephyrClient` from `@autumnsgrove/lattice/zephyr` |
| Raw `fetch()` to email APIs (Resend, SendGrid, Mailgun) | FAIL | Use `zephyr.send()` or `zephyr.sendRaw()` |
| Direct SMTP calls | FAIL | Use Zephyr — it provides retries, rate limiting, circuit breaking, and audit logging |
| `createZephyrClient(env)` | PASS | Correct factory pattern |
| `zephyr.send({ type, template, to, data })` | PASS | Correct usage |
| `zephyr.broadcast()` | PASS | Correct for batch sends |

### Credential Resolution — `Warden` from `@autumnsgrove/lattice/warden`

| Pattern | Status | Remediation |
|---------|--------|-------------|
| `env.GITHUB_TOKEN` in application code | FAIL | Use `createWardenClient(env)` — Warden resolves credentials |
| Raw API keys stored in worker env for external services | FAIL | Route through Warden for credential injection |
| Agent code holding raw API tokens | FAIL | Agents must request via Warden (challenge-response or service binding) |
| `createWardenClient(env)` with service methods | PASS | Correct usage |
| `warden.github.*`, `warden.tavily.*`, etc. | PASS | Correct service-scoped pattern |
| `signNonce()` for challenge-response auth | PASS | Correct external auth pattern |

**Warden-managed services:** GitHub, Tavily, Exa, Cloudflare, Resend, Stripe, OpenRouter, Hetzner, Fly

### Rate Limiting — `Threshold` from `@autumnsgrove/lattice/threshold`

| Pattern | Status | Remediation |
|---------|--------|-------------|
| Hand-rolled rate limit with KV read-modify-write | FAIL | Use `Threshold` with `ThresholdKVStore` |
| Manual rate limit key construction (`rl:${id}:min:${...}`) | FAIL | Use `Threshold` — it handles key prefixing |
| Bespoke rate limit constants scattered across packages | FAIL | Use `ENDPOINT_RATE_LIMITS` from `@autumnsgrove/lattice/threshold` |
| `new Threshold({ store })` with any store adapter | PASS | Correct core usage |
| `createThreshold(env)` factory | PASS | Correct (DO-first, KV fallback) |
| `thresholdMiddleware()` for Hono | PASS | Correct middleware pattern |
| `thresholdCheck()` for SvelteKit | PASS | Correct adapter usage |
| `threshold.checkEndpoint()` / `threshold.checkTier()` | PASS | Correct tier-aware checks |

**Three storage tiers:** KV (default, fast), D1 (strong consistency), DO (per-identifier isolation)
**Fail modes:** `"open"` (default, allow on error) or `"closed"` (deny on error, for auth paths)

### Content Moderation — `Thorn` from `@autumnsgrove/lattice/thorn`

| Pattern | Status | Remediation |
|---------|--------|-------------|
| Manual content filtering without Thorn | WARN | Consider `moderatePublishedContent()` from `@autumnsgrove/lattice/thorn` |
| Custom profanity/spam checks | WARN | Thorn has behavioral (sub-ms) + AI (Lumen) layers |
| `moderatePublishedContent()` | PASS | Correct usage |
| Thorn entity labels for reputation | PASS | Correct behavioral layer usage |

### Error Handling — Signpost from `@autumnsgrove/lattice/errors`

| Pattern | Status | Remediation |
|---------|--------|-------------|
| `throw new Error("something broke")` | WARN | Use `throwGroveError(status, ERROR_DEF, source)` |
| `console.error()` without `logGroveError()` | WARN | Use `logGroveError(source, ERROR_DEF, context)` |
| Ad-hoc JSON error responses | WARN | Use `buildErrorJson()` for consistent error shape |
| `alert()` in Svelte | FAIL | Use `toast` from `@autumnsgrove/lattice/ui` |
| `adminMessage` exposed to client responses | FAIL | Admin messages are server-only |
| `throwGroveError()` / `logGroveError()` | PASS | Correct Signpost usage |

### SDK Exceptions (Mark PASS with note)

Some code legitimately uses raw bindings:
- **Durable Objects** with dual-binding strategy (e.g., warden's `TENANT_DB`)
- **Migration scripts** that run outside the normal SDK flow
- **SDK libraries themselves** (`libs/infra/`, `libs/engine/src/lib/threshold/`) — they wrap raw bindings by design
- **Test mocks** — may reference raw types for typing
- **Wrangler config** — bindings declared in `wrangler.toml` are fine

---

## Category 1b: Icon Gateway Compliance

All icons MUST route through `@autumnsgrove/prism/icons`. The pre-commit hook enforces this, but the crane should also verify in PR diffs.

### Bare Lucide Imports

| Pattern | Status | Remediation |
|---------|--------|-------------|
| `from '@lucide/svelte'` | FAIL | Use `from '@autumnsgrove/prism/icons'` with semantic groups |
| `from '@autumnsgrove/lattice/ui/icons'` with named icons (e.g., `{ Check, ArrowRight }`) | FAIL | Use Prism groups: `{ stateIcons, navIcons }` |
| `from '@autumnsgrove/prism/icons'` with group imports | PASS | Correct |
| `from '@lucide/svelte'` with `// prism-ok` comment | PASS | Intentional exception (BeeIcon only) |

### Template Patterns

| Pattern | Status | Remediation |
|---------|--------|-------------|
| `<Check class="..." />` (bare Lucide component) | FAIL | Use `<stateIcons.check class="..." />` |
| `<svelte:component this={stateIcons.check} />` | WARN | Svelte 5 supports dotted access directly — use `<stateIcons.check />` |
| `<stateIcons.check class="w-5 h-5" />` | PASS | Correct dotted access |

### Dynamic/JS Usage

| Pattern | Status | Remediation |
|---------|--------|-------------|
| `icon: Check` (Lucide component reference) | FAIL | Use `icon: stateIcons.check` |
| `const icon = resolveAnyIcon(name, stateIcons.help)` | PASS | Correct dynamic resolution |

### Allowed Exception

`libs/prism/src/lib/icons/adapters/lucide.ts` — the ONE adapter file. `apps/landing/src/lib/components/icons/BeeIcon.svelte` — needs `Icon` base component from Lucide for lab icons.

---

## Category 2: Fetch Safety & CSRF

### Bare Fetch Calls

Application code should not use raw `fetch()` for external calls. The codebase provides wrappers.

| Pattern | Status | Remediation |
|---------|--------|-------------|
| Raw `fetch()` to external APIs | FAIL | Use the appropriate SDK (Lumen, Zephyr, Warden) |
| Raw `fetch()` for web scraping/content | WARN | Use `fetchUrl()` from `@autumnsgrove/lattice/shutter` (fallback chain: Jina → Tavily → basic) |
| Raw `fetch()` to internal APIs without CSRF | FAIL | Use `apiRequest()` from `$lib/utils/api` (auto-injects CSRF) |
| `apiRequest<T>()` from `$lib/utils/api` | PASS | Correct client-side pattern (CSRF, credentials, error handling) |
| `fetchUrl()` from Shutter | PASS | Correct content fetching with fallback chain |
| SDK client calls (Lumen, Zephyr, Warden) | PASS | SDKs handle their own fetch internally |

**Exception:** `fetch()` in server-side code calling Cloudflare service bindings is fine — service bindings don't go over the network.

### CSRF Protection

The codebase uses a three-layer CSRF defense. Check that state-mutating endpoints validate.

| Pattern | Status | Remediation |
|---------|--------|-------------|
| POST/PUT/DELETE handler without CSRF validation | FAIL | Use `validateCSRF()` + `validateCSRFToken()` from `$lib/utils/csrf` |
| Timing-unsafe token comparison (`===` for CSRF tokens) | FAIL | Use constant-time comparison (built into `validateCSRFToken()`) |
| Missing `Origin` header validation | WARN | Use `validateCSRF()` which checks Origin vs Host |
| Client forms without CSRF token | FAIL | Use `apiRequest()` which auto-injects from cookie/meta tag |
| `validateCSRF()` in hooks.server.ts | PASS | Correct origin-based validation |
| `generateSessionCSRFToken()` for authenticated users | PASS | Correct session-bound HMAC token |

---

## Category 3: Barrel Import Safety

Barrel cascades kill hydration. Check that Svelte files use direct imports.

### Dangerous Barrels (FAIL if imported from)

```
$lib/ui                           — mega-barrel (~100 modules)
$lib/ui/components/ui             — 47+ components
$lib/ui/components/nature         — 40+ nature components
@autumnsgrove/lattice             — top-level barrel (if importing UI)
```

### Correct Pattern

```typescript
// FAIL: barrel import
import { Button } from "$lib/ui";

// PASS: direct import
import Button from "$lib/ui/components/ui/Button.svelte";
```

### Severity by Context

| Context | Severity |
|---------|----------|
| Layout routes (`+layout.svelte`) | FAIL — barrel cascades are critical here |
| Page routes (`+page.svelte`) | WARN — bloats route bundle but doesn't break hydration |
| Component files (`.svelte`) | WARN — contributes to bundle bloat |
| Server files (`+page.server.ts`) | PASS — no client bundle impact |
| Test files | PASS — bundle size doesn't matter |

### Suppression

Lines with `// barrel-ok` comment are intentionally using barrels. Mark as PASS.

---

## Category 4: Svelte 5 Patterns

Check for correct Svelte 5 (runes) usage and common migration pitfalls.

### Runes vs Stores

| Pattern | Status | Remediation |
|---------|--------|-------------|
| `import { writable } from 'svelte/store'` | WARN | Use `$state()` rune |
| `$: reactive = ...` | WARN | Use `$derived()` or `$derived.by()` |
| `$state()` | PASS | Correct rune usage |
| `$derived()` / `$derived.by()` | PASS | Correct rune usage |
| `$effect()` | PASS | Correct (but verify necessity) |

### $derived.by() Values

```typescript
// FAIL: calling derived value as function
const tags = $derived.by(() => computeTags());
console.log(tags());  // WRONG — tags is a plain value

// PASS: using derived value directly
console.log(tags);  // CORRECT
```

### {@const} Type Widening

```svelte
<!-- WARN: type widens to string -->
{@const variant = "primary"}

<!-- PASS: preserves literal type -->
{@const variant = "primary" as const}
```

### Stale svelte-ignore Comments

- `svelte-ignore` comments that reference rules no longer triggered → WARN
- The `svelte/no-unused-svelte-ignore` lint rule catches these

### Multi-rule svelte-ignore

```svelte
<!-- WARN: unreliable in Svelte 5 -->
<!-- svelte-ignore a11y-click rule2 -->

<!-- PASS: split onto separate lines -->
<!-- svelte-ignore a11y-click -->
<!-- svelte-ignore rule2 -->
```

---

## Category 5: Tailwind & Design Tokens

The color system is three layers: Foliage tokens (TS) → Tailwind preset (JS) → CSS custom properties (runtime). Tailwind is the enforcement point.

### Sources of Truth

| Layer | File | Purpose |
|-------|------|---------|
| Color definitions | `libs/foliage/src/lib/tokens/colors.ts` | Pure TS: `grove`, `cream`, `bark`, `semantic`, `status` |
| Accent color scale | `libs/prism/src/lib/css/grove-tokens.css` | SSOT for `--grove-accent-*` CSS custom properties |
| Tailwind integration | `libs/prism/src/lib/tailwind/preset.js` | Maps colors to CSS vars for Tailwind classes |
| CSS variables | `libs/engine/src/lib/styles/tokens.css` | Runtime RGB values (light + `.dark` mode) |
| Shadcn HSL layer | `libs/engine/src/app.css` | Semantic HSL variables (`--primary`, `--surface`, etc.) |

### Hardcoded Color Violations

| Pattern | Status | Remediation |
|---------|--------|-------------|
| `var(--grove-accent)` / `var(--grove-accent-N)` for accent surfaces | PASS | Correct accent usage |
| Hex colors in `<style>` blocks (`color: #4a7c59`) | FAIL | Use Tailwind class or CSS var. For accent colors, use `var(--grove-accent-*)`. Suppress with `// accent-ok` if this is brand green. |
| Hardcoded green hex for accent (`#22c55e`, `#4ade80`, `#16a34a`, etc.) | FAIL | Use `var(--grove-accent-*)` — user's accent may not be green |
| `rgba(34, 197, 94, ...)` or similar green rgba for accent | FAIL | Use `var(--grove-accent-N)` opacity stops (5-80) |
| `var(--grove-500, #hex)` scale tokens for accent surfaces | FAIL | Use `var(--grove-accent)` for solid accent, `var(--grove-accent-N)` for tints |
| `rgb()` / `hsl()` literals in styles | FAIL | Use Tailwind class or CSS var |
| Inline `style="color: green"` | WARN | Use Tailwind class |
| Tailwind class with valid token (`bg-grove-600`) | PASS | Correct for brand/palette use (NOT accent) |
| CSS var reference (`rgb(var(--grove-600))`) for brand green | PASS | Correct for brand green (logo, nature SVGs) — NOT for accent |
| Semantic class (`bg-primary`, `text-foreground`) | PASS | Correct |

### Accent Color Compliance

Grove has a unified accent color system. Users choose their accent color — it is NOT always green. All accent-colored surfaces MUST use `--grove-accent-*` CSS custom properties. This is enforced by pre-commit hook.

**The accent scale (defined in `libs/prism/src/lib/css/grove-tokens.css`):**

| Token | Purpose |
|-------|---------|
| `var(--grove-accent)` | Solid accent color |
| `var(--grove-accent-dark)` | Darkened for hover/pressed states |
| `var(--grove-accent-light)` | Lightened variant |
| `var(--grove-accent-5)` through `var(--grove-accent-80)` | Opacity tints (stops: 5, 6, 8, 10, 12, 15, 20, 25, 30, 35, 40, 50, 70, 80) |

**What IS accent (must use `--grove-accent-*`):**
- Buttons, links, and interactive highlights that reflect the user's chosen color
- Accent-tinted backgrounds, borders, and focus rings
- Any surface that changes when the user picks a different accent color

**What is NOT accent (leave as-is):**
- Brand greens: Grove logo, nature SVGs, tree/leaf illustrations — mark with `// accent-ok` if flagged
- Semantic status colors: `--success`, `text-success`, `bg-success` (green means "good", not "accent")
- Color palette definitions in Prism itself
- Tailwind `grove-*` classes for palette backgrounds (e.g., `bg-grove-50` for a decorative light green surface)

**Common violations:**

| Pattern | Why It Fails |
|---------|-------------|
| `background: #22c55e` in a button | User's accent might be purple — use `var(--grove-accent)` |
| `border-color: rgba(34, 197, 94, 0.2)` | Use `var(--grove-accent-20)` for 20% opacity tint |
| `color: var(--grove-500)` on an accent link | Use `var(--grove-accent)` — grove-500 is always green |
| `hover:bg-green-600` on accent button | Use `var(--grove-accent-dark)` for hover |

**Suppression:** Lines with `// accent-ok` are intentional brand-green usage. Mark as PASS.

### Token Existence Validation (Critical!)

**This is the most common slip-up.** Tailwind silently drops classes that reference nonexistent tokens — no build error, just missing styles at runtime.

**The crane MUST cross-reference:**

1. Any new `bg-{name}-{shade}`, `text-{name}-{shade}`, `border-{name}-{shade}` classes in the diff
2. Check that `{name}` exists in the Tailwind preset (`libs/prism/src/lib/tailwind/preset.js`)
3. Check that `{shade}` is a valid shade for that color family

**Valid color families from the preset:**

| Family | Valid shades | Source |
|--------|-------------|--------|
| `grove` | 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950 | CSS vars (`--grove-*`) |
| `cream` | DEFAULT, 50, 100, 200, 300, 400, 500 | CSS vars (`--cream-*`) |
| `bark` | DEFAULT, 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950 | CSS vars (`--bark-*`) |
| `primary` | DEFAULT, foreground | HSL (`--primary`) |
| `secondary` | DEFAULT, foreground | HSL (`--secondary`) |
| `foreground` | DEFAULT, muted, subtle, faint | HSL vars |
| `surface` | DEFAULT, hover, elevated, subtle, alt | HSL vars |
| `muted` | DEFAULT, foreground | HSL vars |
| `accent` | DEFAULT, foreground, muted, subtle | HSL vars |
| `success` | DEFAULT | HSL (`--success`) |
| `warning` | DEFAULT | HSL (`--warning`) |
| `error` | DEFAULT (hardcoded `#dc2626`) | Static |
| `divider` | DEFAULT | CSS var (`--cream-200`) |

**Also valid:** Tailwind default colors used in Blazes palette (amber, rose, pink, sky, violet, yellow, slate, red, orange, teal, emerald, cyan, indigo, fuchsia, lime) — but only shades Tailwind ships.

| Pattern | Status | Remediation |
|---------|--------|-------------|
| `bg-grove-600` | PASS | Valid family + shade |
| `bg-grove-550` | FAIL | Shade 550 doesn't exist in grove |
| `bg-forest-600` | FAIL | `forest` is not a color family in the preset |
| `text-cream-800` | FAIL | Cream only goes to 500 |
| `bg-bark-DEFAULT` / `bg-bark` | PASS | Valid |
| `bg-surface-hover` | PASS | Valid semantic |
| `bg-surface-active` | FAIL | `active` not in surface variants |

### Dynamic Class Construction

```typescript
// FAIL: Tailwind can't scan this — class won't be generated
class={`bg-grove-${level}`}

// PASS: Use complete static class strings
class={level === 'high' ? 'bg-grove-600' : 'bg-grove-300'}
```

### Cross-Reference Procedure

When the diff introduces new Tailwind color classes:

1. Extract all color utility classes from changed `.svelte` and `.ts` files
2. Parse family + shade from each (e.g., `bg-grove-600` → family=`grove`, shade=`600`)
3. Look up family in Tailwind preset (`libs/prism/src/lib/tailwind/preset.js`) → exists?
4. Look up shade within that family → exists?
5. If the color is used for **accent** purposes, verify it uses `var(--grove-accent-*)` not `var(--grove-N)` or hardcoded hex
6. If CSS var based, verify the var exists in `tokens.css` → exists?
7. FAIL on any missing link in the chain

### Exceptions

- **SVG/nature graphics** (`libs/engine/src/lib/ui/components/nature/palette.ts`) — these use hex colors for canvas/SVG rendering, not Tailwind
- **Third-party component overrides** where tokens can't reach
- **Print stylesheets** that need specific colors

---

## Category 6: Rootwork Type Safety

Rootwork enforces validated types at trust boundaries — form data, KV/JSON reads, catch blocks. No unsafe `as` casts on external data.

All utilities import from `@autumnsgrove/lattice/server`.

### Form Data — `parseFormData()`

| Pattern | Status | Remediation |
|---------|--------|-------------|
| `formData.get("name") as string` | FAIL | Use `parseFormData(formData, ZodSchema)` |
| `formData.get("count") as number` | FAIL | Use Zod schema with `z.coerce.number()` |
| `String(formData.get("field"))` | WARN | Fragile — use `parseFormData()` for validation |
| `parseFormData(formData, Schema)` with result check | PASS | Correct |

```typescript
// FAIL
const name = formData.get("name") as string;

// PASS
const result = parseFormData(formData, ProfileSchema);
if (!result.success) return fail(400, { errors: result.errors });
const { name } = result.data;
```

**Schema placement:** Define at module scope, not inside handler functions.

### KV/JSON Reads — `safeJsonParse()`

| Pattern | Status | Remediation |
|---------|--------|-------------|
| `(await kv.get(key, "json")) as MyType` | FAIL | Use `safeJsonParse(await kv.get(key), ZodSchema)` |
| `JSON.parse(raw) as Config` | FAIL | Use `safeJsonParse(raw, ConfigSchema)` |
| `(await request.json()) as Record<string, unknown>` | WARN | Acceptable for simple cases, but prefer Zod schema |
| `safeJsonParse(raw, Schema) ?? fallback` | PASS | Correct — always provide `??` fallback |

```typescript
// FAIL
const stats = (await kv.get("stats", "json")) as StatsType;

// PASS
const stats = safeJsonParse(await kv.get("stats"), StatsSchema) ?? defaultStats;
```

**Note:** Use `kv.get(key)` in text mode (not `"json"`) — `safeJsonParse` handles `JSON.parse` internally.

### Error Type Guards — `isRedirect()` / `isHttpError()`

| Pattern | Status | Remediation |
|---------|--------|-------------|
| `(err as any)?.status === 302` | FAIL | Use `isRedirect(err)` |
| `(err as any)?.status >= 400` | FAIL | Use `isHttpError(err)` |
| Catch block that swallows redirects | FAIL | Always check `isRedirect(err)` first, re-throw |
| `if (isRedirect(err)) throw err` at top of catch | PASS | Correct |

```typescript
// FAIL
try { ... } catch (err) {
  if ((err as any).status === 302) throw err;
  return json({ error: (err as any).message });
}

// PASS
try { ... } catch (err) {
  if (isRedirect(err)) throw err;
  if (isHttpError(err)) return json({ error: err.body.message }, { status: err.status });
  logGroveError("Engine", API_ERRORS.INTERNAL_ERROR, { cause: err });
  return json(buildErrorJson(API_ERRORS.INTERNAL_ERROR), { status: 500 });
}
```

### General `as` Cast Violations

| Pattern | Status | Remediation |
|---------|--------|-------------|
| `as any` on external data (form, KV, webhooks, API responses) | FAIL | Use appropriate Rootwork utility |
| `as SomeType` on `request.json()` | WARN | Use Zod schema validation |
| `as const` for literal narrowing | PASS | This is fine |
| `as SomeType` on internal known data | PASS | Trust inside the boundary |

### Decision Guide

| Reading from... | Use |
|-----------------|-----|
| `request.formData()` | `parseFormData(formData, Schema)` |
| `kv.get()` or any JSON string | `safeJsonParse(raw, Schema)` |
| Cache service `.get()` | `createTypedCacheReader(cache)` |
| SvelteKit catch block | `isRedirect()` / `isHttpError()` |
| Webhook `event.data` | Custom typed accessor (e.g., `asPushData()`) |

---

## Category 7: Security Anti-Patterns

Check for known security anti-patterns in changed code.

### Prototype Pollution

```typescript
// FAIL: Object.assign with untrusted data
Object.assign(new Error(), untrustedData);
Object.assign(target, JSON.parse(userInput));

// PASS: direct property assignment
const err = new Error(message);
err.code = untrustedData.code;
```

### Timing-Unsafe Comparisons

```typescript
// FAIL: string equality for secrets/tokens
if (token === expectedToken) { ... }
if (apiKey == storedKey) { ... }

// PASS: timing-safe comparison
import { timingSafeEqual } from 'crypto';
if (timingSafeEqual(Buffer.from(token), Buffer.from(expectedToken))) { ... }
```

### Randomness

```typescript
// FAIL: Math.random() for security-sensitive values
const token = Math.random().toString(36);

// PASS: cryptographic randomness
const bytes = crypto.getRandomValues(new Uint8Array(32));
```

### Other Patterns

| Pattern | Status | Notes |
|---------|--------|-------|
| `eval()` or `new Function()` | FAIL | Code injection risk |
| `innerHTML = userInput` | FAIL | XSS risk |
| `JSON.parse()` without try/catch at trust boundary | WARN | Unhandled parse errors |
| `console.log` with sensitive data (tokens, keys, passwords) | WARN | May leak secrets to logs |
| Bare `request.json()` without type assertion | WARN | Returns `unknown` in strict TS — use `as Record<string, unknown>` |
| Unsafe `as` casts on external data (form submissions, KV reads, webhooks) | WARN | Use proper parsing/validation |

### Secrets in Code (Complements Pre-Commit Hook)

The pre-commit hook already scans for secret patterns (`sk-ant-api`, `ghp_`, AWS keys, etc.). The crane should also flag:

| Pattern | Status | Notes |
|---------|--------|-------|
| Hardcoded API keys/tokens in source | FAIL | Use environment variables |
| `.env` files in diff (not `.env.example`) | FAIL | Should be in `.gitignore` |
| Connection strings with credentials | FAIL | Use Warden for credential resolution |
| `Bearer ${hardcodedToken}` | FAIL | Use Warden or environment variable |

---

## Category 8: Test Coverage

Check that new code has corresponding test files.

### Rules

- New `.ts` files in `src/lib/` → should have corresponding `.test.ts`
- New route files (`+page.server.ts`, `+server.ts`) → should have route tests or integration tests
- New utility functions → should have unit tests
- Modified test files → PASS (tests are being maintained)

### Exceptions

- Type definition files (`.d.ts`) — no tests needed
- Config files — no tests needed
- Svelte component files — tests encouraged but not required
- Index/barrel files — no tests needed
- Migration files — no tests needed (tested via integration)

---

## Category 9: Type Safety

Run type checks for affected packages.

### Commands by Package Type

```bash
# SvelteKit packages (libs/engine, apps/grove, etc.)
cd {package} && bun svelte-check

# Pure TypeScript (workers, tools)
cd {package} && tsc --noEmit

# Packages with custom check scripts
cd {package} && pnpm run check
```

### Interpreting Results

- **0 errors** → PASS
- **Errors in changed files** → FAIL (the PR introduced type errors)
- **Errors in unchanged files** → WARN with note (pre-existing, not caused by this PR)

---

## Compliance Report Format

```
◆ CRANE COMPLIANCE REPORT 🪶

PR #{number} — {title}
Author: @{author} | Base: {base_branch} | Files: {count}

┌────────────────────────┬────────┬──────────────────────────────────┐
│ Category               │ Status │ Details                          │
├────────────────────────┼────────┼──────────────────────────────────┤
│ Grove SDK Compliance   │ {stat} │ {summary}                        │
│ Fetch Safety & CSRF    │ {stat} │ {summary}                        │
│ Barrel Import Safety   │ {stat} │ {summary}                        │
│ Svelte 5 Patterns      │ {stat} │ {summary}                        │
│ Foliage Tokens         │ {stat} │ {summary}                        │
│ Security Patterns      │ {stat} │ {summary}                        │
│ Test Coverage          │ {stat} │ {summary}                        │
│ Type Safety            │ {stat} │ {summary}                        │
└────────────────────────┴────────┴──────────────────────────────────┘

Overall: {X passes} | {Y warnings} | {Z failures}

FAILURES: (listed with file:line and remediation)
WARNINGS: (listed with file:line and suggestion)

Remediation: {suggested animals to invoke}
```

Status markers: `✓ PASS` | `⚠ WARN` | `✗ FAIL`

---

## SDK Quick Reference

| Need | SDK | Import |
|------|-----|--------|
| Database queries | GroveDatabase | `@autumnsgrove/infra` |
| File storage | Amber FileManager | `@autumnsgrove/lattice/amber` |
| KV storage | GroveKV | `@autumnsgrove/infra` |
| AI inference | Lumen | `@autumnsgrove/lattice/lumen` |
| Email/notifications | Zephyr | `@autumnsgrove/lattice/zephyr` |
| Credential resolution | Warden | `@autumnsgrove/lattice/warden` |
| Rate limiting | Threshold | `@autumnsgrove/lattice/threshold` |
| Content moderation | Thorn | `@autumnsgrove/lattice/thorn` |
| Error handling | Signpost | `@autumnsgrove/lattice/errors` |
| Theme tokens | Foliage | `@autumnsgrove/foliage` |
| Accent color scale | Prism | `@autumnsgrove/prism` — CSS: `var(--grove-accent-*)` |
| Type-safe form data | Rootwork parseFormData | `@autumnsgrove/lattice/server` |
| Type-safe JSON/KV reads | Rootwork safeJsonParse | `@autumnsgrove/lattice/server` |
| Error type guards | Rootwork isRedirect/isHttpError | `@autumnsgrove/lattice/server` |
| Client-side fetch | apiRequest | `$lib/utils/api` |
| Content fetching | Shutter fetchUrl | `@autumnsgrove/lattice/shutter` |
| CSRF validation | csrf utils | `$lib/utils/csrf` |
