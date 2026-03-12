---
title: "Reverie Developer Guide"
description: "How the Reverie worker translates natural language into coordinated site configuration changes across 32 domains."
category: guides
guideCategory: infrastructure
lastUpdated: "2026-03-12"
aliases: []
tags:
  - reverie
  - ai
  - configuration
  - lumen
  - tool-calling
  - cloudflare-worker
---

# Reverie Developer Guide

Reverie is a Cloudflare Worker that turns natural language into site configuration. A Wanderer says "make my site feel cozy" and Reverie coordinates changes across themes, fonts, colors, cursors, ambient sounds, and more. It does this through a five-layer pipeline: Router, Loader, Converter, Composer, Validator. An isolated execution worker handles the actual writes.

The worker lives at `workers/reverie/`. Domain schemas and atmosphere definitions live in the engine library at `libs/engine/src/lib/reverie/`.

## How Reverie Works

Every request flows through the same pipeline:

```
"make my site feel like a midnight library"
       |
   [Router]      keyword match: "midnight" -> atmosphere entry
       |
   [Loader]      fetch schemas for matched domains, respect tier limits
       |
   [Converter]   transform schemas into LumenToolDefinition objects
       |
   [Composer]    call Lumen with tools, get back structured tool calls
       |
   [Validator]   parse tool call arguments, validate against schema constraints
       |
   [Response]    return change preview to the Wanderer
       |
   [Execute]     (separate request) apply changes via execution worker
```

The key design constraint: Reverie holds LLM access, and the execution worker holds write access. Neither has the other's secrets. This means a compromised LLM response cannot directly mutate data.

## The Five Layers

### 1. Router

**File:** `workers/reverie/src/lib/router.ts`

The router is pure keyword matching. No LLM, no I/O, fully deterministic. It scans input text against two sources: domain keywords from `SCHEMA_REGISTRY` and atmosphere aliases from the manifold.

At module load, it builds a precomputed `KEYWORD_TO_DOMAINS` map from every schema's `keywords` array. This gives O(1) lookup per keyword instead of iterating all schemas per request. Keywords are sorted longest-first for greedy matching.

The router returns one of four actions:

| Action | Trigger | Example |
|--------|---------|---------|
| `atmosphere` | Input matches an atmosphere keyword or alias | "make it cozy" |
| `configure` | Keywords match domain schemas | "change my font to monospace" |
| `query` | Keywords match + query words detected ("what", "show", "current") | "what font am I using?" |
| `no-match` | Nothing matched | "tell me a joke" |

For atmosphere matches, the router extracts domain IDs directly from the atmosphere entry's settings keys. The key format is `domainId.fieldName`, so `"foliage.theme.themeId"` resolves to the `foliage.theme` domain.

```typescript
// From router.ts -- atmosphere result builder
for (const key of Object.keys(atmosphere.settings)) {
  const parts = key.split(".");
  if (parts.length >= 2) {
    const domainId = `${parts[0]}.${parts[1]}` as DomainId;
    if (!domains.includes(domainId)) {
      domains.push(domainId);
    }
  }
}
```

### 2. Loader

**File:** `workers/reverie/src/lib/loader.ts`

The loader wraps `getSchemas()` from the registry with tier-based limits. Each tier gets a maximum number of domains per request:

| Tier | Max Domains |
|------|-------------|
| Free | 0 (no access) |
| Seedling | 3 |
| Sapling | 5 |
| Oak | 10 |
| Evergreen | 20 |

If the router matched 7 domains but the Wanderer is on Seedling, only the first 3 are loaded. The response includes a `trimmed` flag so the frontend can communicate this to the user.

### 3. Converter

**File:** `workers/reverie/src/lib/converter.ts`

The converter transforms domain schemas into `LumenToolDefinition` objects that the LLM can call. Each writable domain becomes a `set_` tool; read-only domains become `query_` tools.

The naming convention: `foliage.accent` becomes `set_foliage_accent`. Each field in the schema maps to a JSON Schema property:

| Field Type | JSON Schema Output |
|-----------|-------------------|
| `string` | `{ type: "string" }` with optional `maxLength`, `pattern` |
| `boolean` | `{ type: "boolean" }` |
| `integer` | `{ type: "integer" }` with optional `minimum`, `maximum` |
| `enum` | `{ type: "string", enum: [...] }` |
| `color` | `{ type: "string", pattern: "^#([0-9A-Fa-f]{3}\|[0-9A-Fa-f]{6})$" }` |
| `url` | `{ type: "string", format: "uri" }` |
| `font` | `{ type: "string", enum: [...] }` |
| `json` | `{ type: "object" }` |

Read-only fields are skipped for `set_` tools. No fields are marked as required since all updates are partial.

### 4. Composer

**File:** `workers/reverie/src/lib/composer.ts`

The composer calls Lumen through a `RemoteLumenClient` service binding. It picks between two Lumen tasks based on complexity:

- **`reverie`** for simple requests (3 or fewer domains, no atmosphere)
- **`reverie-compose`** for atmosphere or multi-domain requests (more than 3 domains)

Each task has its own system prompt. The simple prompt tells the model to call `set_` tools directly. The compose prompt emphasizes cross-domain harmony and coordinated aesthetics.

When an atmosphere entry is present, the user prompt is augmented with the atmosphere's suggested settings as JSON. The model treats these as strong hints, adapting to the Wanderer's specific wording.

```typescript
// From prompts.ts -- atmosphere-augmented user prompt
return `${input}

Reference atmosphere "${atmosphere.keyword}": ${atmosphere.description}
Suggested settings: ${JSON.stringify(atmosphere.settings, null, 2)}

Use these as strong hints but adapt to the user's specific wording.`;
```

The composer returns the raw `LumenToolCall[]` array along with the model name and latency.

### 5. Validator

**File:** `workers/reverie/src/lib/validator.ts`

The validator parses each tool call and checks it against the actual domain schema. It performs three layers of validation:

1. **Domain existence.** The tool name is parsed back to a domain ID (`set_foliage_accent` to `foliage.accent`). Unknown domains are rejected.
2. **Write permission.** Attempts to write to read-only domains are rejected.
3. **Field-level validation.** Each field value is checked against its schema constraints: type checks, enum membership, regex patterns, integer bounds, hex color format.

The hex color regex is precompiled (`/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/`) to avoid recompilation per call.

The validator produces a `ValidationResult` containing both the validated `ChangePreview[]` entries and any `ValidationError[]` entries. The response includes both, so the Wanderer sees what would change and what failed.

## Domain Schemas

Domain schemas are static TypeScript objects that live in `libs/engine/src/lib/reverie/schemas/`, organized by group: `appearance/`, `content/`, `curios/`, `identity/`, `infra/`, `social/`.

Each schema implements the `DomainSchema` interface:

```typescript
export const accentSchema: DomainSchema = {
  id: "foliage.accent",
  name: "Accent Color",
  description: "The primary accent color used across links, buttons, ...",
  group: "appearance",
  database: "engine",
  readEndpoint: "GET /api/admin/settings?key=accent_color",
  writeEndpoint: "PUT /api/admin/settings",
  writeMethod: "PUT",
  fields: {
    accentColor: {
      type: "color",
      description: "Hex color value for the site accent",
      default: "#16a34a",
      constraints: {
        pattern: "^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$",
      },
    },
  },
  examples: [
    "Change my accent color to lavender",
    "Make my links purple",
  ],
  keywords: ["color", "accent", "tint", "links", "buttons"],
};
```

Two fields deserve attention:

- **`keywords`** powers the router. These are the strings that cause this domain to be loaded when they appear in user input. They're case-insensitive and matched against the full input string.
- **`examples`** provide natural language context. They're available for documentation and could be used for few-shot prompting in the future.

Many schemas also export companion constants. The typography schema exports `FONT_MOODS` (a mapping from feeling-words like "handwritten" to font IDs like "caveat"). The accent schema exports `ACCENT_PRESETS` (named colors to hex values). These help the router and documentation but aren't used directly by the pipeline.

All 32 domains are registered in `SCHEMA_REGISTRY` in the index file. The `DOMAIN_CATALOG` tracks implementation status, field counts, and phase numbers for inventory purposes.

## The Atmosphere System

**File:** `libs/engine/src/lib/reverie/atmosphere.ts`

An atmosphere is a pre-composed set of settings across multiple domains that creates a cohesive aesthetic. The manifold contains 14 entries spanning seven categories: Warm & Intimate, Dark & Mysterious, Nature & Green, Clean & Minimal, Retro & Indie, Dreamy & Ethereal, and Bright & Warm.

Each entry has a primary keyword and a list of aliases:

```typescript
{
  keyword: "cozy",
  description: "Warm amber light, handwritten touches, rain on the roof.",
  aliases: ["comfy", "snug", "homey", "hygge"],
  settings: {
    "foliage.theme.themeId": "cozy-cabin",
    "foliage.accent.accentColor": "#d97706",
    "foliage.typography.fontFamily": "calistoga",
    "curios.cursor.preset": "leaf",
    "curios.cursor.trailEnabled": true,
    "curios.cursor.trailEffect": "sparkle",
    "curios.ambient.enabled": true,
    "curios.ambient.soundSet": "forest-rain",
    "curios.ambient.volume": 20,
    "curios.guestbook.style": "cozy",
    "curios.moodring.colorScheme": "warm",
  },
}
```

The `findAtmosphere()` function does a linear scan, checking both primary keywords and aliases. Since the manifold is small (14 entries, ~50 aliases total), this is fast enough. The `ALL_ATMOSPHERE_KEYWORDS` constant flattens every keyword and alias into a single array for the router's detection pass.

When the router finds an atmosphere match, it sets `action: "atmosphere"` and passes the full `AtmosphereEntry` through to the composer. The composer's user prompt includes the atmosphere settings as JSON, giving the LLM a concrete starting point that it can refine based on the Wanderer's specific language.

## Authentication

**File:** `workers/reverie/src/auth/middleware.ts`

Reverie is not called directly by browsers. The SvelteKit engine acts as a proxy: it authenticates users through Heartwood, extracts tenant context, then forwards requests to Reverie via a Cloudflare service binding with a shared API key.

The auth middleware performs three checks:

1. **API key verification.** The `X-API-Key` header is compared against `REVERIE_API_KEY` using timing-safe comparison (`timingSafeEqual` from `@autumnsgrove/lattice/utils`). This verifies the caller is the engine proxy.
2. **Tenant context extraction.** `X-Tenant-Id` and `X-Tier` headers carry the verified tenant identity. The tier is validated against a known set (`wanderer`, `seedling`, `sapling`, `oak`, `evergreen`); unknown values default to `wanderer`.
3. **Tier gating.** The `wanderer` (free) tier is rejected with a `REV-003` error. Reverie requires a paid plan.

Rate limiting runs after auth, keyed by tenant ID rather than IP address. It uses the Threshold SDK with Durable Object storage for per-tenant rate limiting. The rate limiter fails open: a DO outage will not block configuration requests.

## The Execution Split

Reverie uses a split-worker architecture. The main Reverie worker handles natural language processing, LLM inference, and change preview generation. A separate execution worker (`reverie-exec`) handles the actual writes to Grove APIs.

The `/configure` endpoint returns a preview with a `requestId`. The `/execute` endpoint takes that `requestId` and the change list, re-validates everything, then delegates to the execution worker via service binding.

Request IDs are tenant-scoped: `${tenantId}:${crypto.randomUUID()}`. The execute route verifies ownership by checking the tenant ID prefix. This prevents one tenant from executing another tenant's previewed changes.

The executor sends changes to `reverie-exec` over an internal service binding with its own `EXEC_API_KEY`. If the binding or key is missing, every change in the batch fails with a clear error rather than silently doing nothing.

## Adding a New Domain

### Step 1: Create the schema file

Add a new file in `libs/engine/src/lib/reverie/schemas/{group}/{domain}.ts`:

```typescript
import type { DomainSchema } from "../../types";

export const myDomainSchema: DomainSchema = {
  id: "curios.mydomain",
  name: "My Domain",
  description: "One sentence explaining what this configures.",
  group: "curios",
  database: "curios",
  readEndpoint: "GET /api/curios/mydomain",
  writeEndpoint: "PUT /api/curios/mydomain",
  writeMethod: "PUT",
  fields: {
    enabled: {
      type: "boolean",
      description: "Whether the domain is active",
      default: false,
    },
    style: {
      type: "enum",
      description: "Visual style preset",
      options: ["minimal", "classic", "playful"],
      default: "classic",
    },
  },
  examples: [
    "Enable my domain",
    "Make my domain look playful",
  ],
  keywords: ["mydomain", "related-keyword"],
};
```

### Step 2: Register in the index

In `libs/engine/src/lib/reverie/index.ts`:

1. Import the schema at the top, in the appropriate phase section.
2. Add it to `SCHEMA_REGISTRY` with the domain ID as key.
3. Add a `CatalogEntry` to `DOMAIN_CATALOG`.

```typescript
// Import
import { myDomainSchema } from "./schemas/curios/mydomain";

// Registry
"curios.mydomain": myDomainSchema,

// Catalog
{ id: "curios.mydomain", status: "implemented", fieldCount: 2, phase: 4, file: "curios/mydomain.ts" },
```

### Step 3: Add the DomainId

In `libs/engine/src/lib/reverie/types.ts`, add your domain ID to the `DomainId` union type:

```typescript
export type DomainId =
  // ...existing domains...
  | "curios.mydomain"
```

### Step 4: Wire up atmosphere entries (optional)

If your domain should participate in atmosphere compositions, add its fields to the relevant entries in `atmosphere.ts`:

```typescript
{
  keyword: "cozy",
  settings: {
    // ...existing settings...
    "curios.mydomain.style": "playful",
  },
}
```

### Step 5: Rebuild

The schemas live in the engine library, so you need to rebuild:

```bash
cd libs/engine && bun svelte-check
```

The router's `KEYWORD_TO_DOMAINS` map rebuilds automatically at module load from `SCHEMA_REGISTRY`, so no manual keyword mapping is needed.

## Lumen Integration

Reverie uses Lumen's tool-calling capability through `RemoteLumenClient`. The integration has a few specifics worth knowing.

**Task selection.** Reverie registers two tasks with Lumen: `"reverie"` (simple) and `"reverie-compose"` (atmosphere/multi-domain). The compose task gets a longer, more detailed system prompt about cross-domain harmony.

**Tool choice.** Reverie sets `toolChoice: "required"`, forcing the model to always produce at least one tool call. If the model returns zero tool calls despite this, the configure route returns a `REV-006` (no domains matched) error.

**Fallback skipping.** When tools are provided, Lumen skips cross-model fallback. Tool schemas are model-specific, so falling back to a different model could produce incompatible tool calls.

**Error mapping.** Lumen error codes are mapped to Reverie error codes. `QUOTA_EXCEEDED` and `RATE_LIMITED` from Lumen become `REV-011` (rate limited, 429). All other Lumen errors become `REV-013` (Lumen error, 502).

## Error Codes

All errors use the `REV-XXX` prefix. The full catalog is in `workers/reverie/src/errors.ts`.

| Code | HTTP | Meaning |
|------|------|---------|
| REV-001 | 401 | Missing auth header or tenant ID |
| REV-002 | 401 | Invalid API key |
| REV-003 | 403 | Free tier cannot use Reverie |
| REV-004 | 400 | Malformed request body |
| REV-005 | 400 | Input exceeds 2000 characters |
| REV-006 | 400 | No domains matched the input |
| REV-007 | 404 | Request ID not found or expired |
| REV-008 | 403 | Attempted write to read-only domain |
| REV-009 | 400 | Field validation failed |
| REV-010 | 500 | Execution worker error |
| REV-011 | 429 | Rate limited |
| REV-012 | 502 | Lumen service unavailable |
| REV-013 | 502 | Lumen returned an error |
| REV-014 | 500 | Unhandled internal error |
| REV-015 | 500 | D1 database error |

Errors are built through `buildReverieError()`, which takes a `ReverieErrorDef` and an optional detail string. The detail is appended to the user-facing message. Internal details (stack traces, raw error messages) are logged server-side only.

## API Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/health` | No | Health check, binding availability |
| GET | `/domains` | Yes | List available domain schemas |
| GET | `/atmospheres` | Yes | List atmosphere presets |
| GET | `/history` | Yes | Recent interaction log |
| POST | `/configure` | Yes | Natural language to change preview |
| POST | `/execute` | Yes | Apply previewed changes |
| POST | `/query` | Yes | Read-only domain query |

POST routes require `Content-Type: application/json`. All request bodies are validated through Zod schemas at the trust boundary.

## Key Files

| Path | Purpose |
|------|---------|
| `workers/reverie/src/index.ts` | Hono app, middleware chain, route registration |
| `workers/reverie/src/auth/middleware.ts` | API key + tenant auth |
| `workers/reverie/src/lib/router.ts` | Keyword-based intent detection |
| `workers/reverie/src/lib/loader.ts` | Schema loading with tier limits |
| `workers/reverie/src/lib/converter.ts` | Schema-to-tool-definition transform |
| `workers/reverie/src/lib/composer.ts` | Lumen tool-calling orchestration |
| `workers/reverie/src/lib/prompts.ts` | System prompts for reverie/reverie-compose tasks |
| `workers/reverie/src/lib/validator.ts` | Tool call argument validation |
| `workers/reverie/src/lib/executor.ts` | Delegates to reverie-exec via service binding |
| `workers/reverie/src/lib/rate-limit.ts` | Threshold SDK rate limiting per tenant |
| `workers/reverie/src/routes/configure.ts` | Full pipeline orchestration |
| `workers/reverie/src/routes/execute.ts` | Change application with re-validation |
| `workers/reverie/src/types.ts` | Env bindings, Zod request schemas, response types |
| `workers/reverie/src/errors.ts` | REV-XXX error catalog |
| `libs/engine/src/lib/reverie/index.ts` | Schema registry, catalog, re-exports |
| `libs/engine/src/lib/reverie/types.ts` | DomainSchema, FieldDefinition, AtmosphereEntry types |
| `libs/engine/src/lib/reverie/atmosphere.ts` | Atmosphere manifold (14 entries) |
| `libs/engine/src/lib/reverie/schemas/` | All 32 domain schema files |

## Quick Checklist

When working on Reverie, keep these in mind:

- [ ] The router is deterministic. No LLM calls in the routing layer.
- [ ] Schemas are static. They define what Reverie can configure, not runtime state.
- [ ] The converter builds JSON Schema from domain field definitions. If you add a new `FieldType`, update `fieldToJsonSchema()` in `converter.ts`.
- [ ] Tier limits are enforced in the loader, not the router. The router matches freely; the loader trims.
- [ ] The validator re-parses tool names back to domain IDs. The convention is `set_{group}_{domain}`. If your domain ID has underscores, the parser uses only the first underscore as the namespace separator.
- [ ] Request IDs are tenant-scoped (`${tenantId}:${uuid}`). The execute route checks the prefix for ownership.
- [ ] The execution worker is a separate Cloudflare Worker with its own API key. Reverie sends changes to it over a service binding, not over the public internet.
- [ ] Atmosphere entries are additive. Adding fields to an existing atmosphere entry automatically pulls in the corresponding domain through the router's key-parsing logic.
- [ ] All POST request bodies are Zod-validated at the boundary. Input max length is 2000 characters.
- [ ] Interaction history is logged asynchronously via `waitUntil()`. A failed log write does not block the response.
