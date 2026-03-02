---
title: "Reverie Worker — Implementation Plan"
description: "Step-by-step plan for building the Reverie Cloudflare Worker, from domain schemas to live deployment."
category: specs
specCategory: "customization"
icon: sparkles
lastUpdated: "2026-03-01"
aliases: []
date created: Saturday, March 1st 2026
date modified: Saturday, March 1st 2026
tags:
  - composition
  - ai
  - natural-language
  - configuration
  - cloudflare-workers
  - implementation-plan
type: implementation-plan
---

# Reverie Worker — Implementation Plan

```
                           ☁
                    ·  ·       ·  ·
                ·                     ·
             ·    "make it cozy"         ·
           ·           │                   ·
          ·            ▼                    ·
         ·    ┌─────────────────┐           ·
        ·     │    REVERIE      │            ·
        ·     │    WORKER       │            ·
         ·    └────────┬────────┘           ·
          ·       ╱    │    ╲              ·
           ·    ╱      │      ╲          ·
            · ╱        │        ╲      ·
             ▼         ▼         ▼   ·
          🔧          🔧         🔧
        LUMEN       INFRA    THRESHOLD
     (tool calls)  (context) (rate limits)

      Standalone worker. Full Grove SDK integration.
```

> *From half-formed dream to living grove. One worker to bridge the gap.*

This document is the build plan for the Reverie Cloudflare Worker: a standalone Hono service that receives natural language configuration requests, routes them through Lumen's tool-calling pipeline, validates the results against domain schemas, and executes changes through Grove's existing APIs.

**Depends On:** [Lumen Tool Calling Spec](lumen-tool-calling-spec.md)
**Implements:** [Reverie Spec](reverie-spec.md)
**Status:** Planning
**Last Updated:** March 2026

---

## Overview

### What We're Building

A Cloudflare Worker at `workers/reverie/` that:

1. Receives natural language from Wanderers ("make my site feel like a midnight library")
2. Detects relevant configuration domains via keyword matching (Layer 1, no LLM)
3. Converts matched domain schemas into OpenRouter tool definitions
4. Calls Lumen with those tools, getting back structured `tool_calls` (Layer 2/3)
5. Validates the tool call arguments against schema constraints
6. Previews changes for confirmation
7. Executes confirmed changes against Grove APIs
8. Logs the interaction for analytics

### What We're Using

Every shared SDK in the Grove ecosystem participates:

| SDK | Role in Reverie |
|-----|----------------|
| **Lumen** (via RemoteLumenClient) | LLM inference with tool calling |
| **Infra** (GroveContext) | D1, KV, service bindings |
| **Threshold** (RateLimiter) | Per-tenant rate limiting |
| **Heartwood** (GroveAuthClient) | Token verification, tier lookup |
| **Reverie schemas** (lattice/reverie) | Domain registry, atmosphere manifold |
| **Loom** (LoomDO base) | Session state via Durable Objects |
| **Firefly** (JobExecutor) | Background interaction logging |

### What We're Not Building (Yet)

- Custom atmosphere creation and sharing (Phase 5)
- Terrarium scene generation (Phase 5)
- Mycelium MCP bridge (Phase 5)
- Streaming responses (deferred, batch is simpler and fast enough)

---

## Architecture

### Request Lifecycle

```
Wanderer: "make my site feel like a midnight library"
  │
  ▼
┌─────────────────────────────────────────────────────────────────────┐
│  REVERIE WORKER (Hono)                                               │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  MIDDLEWARE STACK                                               │  │
│  │                                                                │  │
│  │  1. CORS (grove.place origins)                                 │  │
│  │  2. Infra Context (createCloudflareContext)                    │  │
│  │  3. Auth (Heartwood session token → tenant + tier)             │  │
│  │  4. Rate Limit (Threshold, keyed by tenant + "reverie")        │  │
│  └────────────────────────────────┬───────────────────────────────┘  │
│                                   │                                  │
│  ┌────────────────────────────────▼───────────────────────────────┐  │
│  │  LAYER 1: ROUTER (no LLM, ~80 lines)                          │  │
│  │                                                                │  │
│  │  Input: "make my site feel like a midnight library"            │  │
│  │                                                                │  │
│  │  ┌─────────────────────────────────────────────────────────┐   │  │
│  │  │  Keyword scan against DOMAIN_KEYWORDS                   │   │  │
│  │  │  "midnight" → atmosphere keyword detected               │   │  │
│  │  │  No direct domain keywords found                        │   │  │
│  │  │                                                         │   │  │
│  │  │  Atmosphere: "midnight"                                 │   │  │
│  │  │  Load manifold entry → domains:                         │   │  │
│  │  │    foliage.theme, foliage.accent, foliage.typography,   │   │  │
│  │  │    curios.cursor, curios.ambient, curios.guestbook,     │   │  │
│  │  │    curios.moodring                                      │   │  │
│  │  └─────────────────────────────────────────────────────────┘   │  │
│  │                                                                │  │
│  │  Output: RouterResult { domains, action, atmosphere, keywords }│  │
│  └────────────────────────────────┬───────────────────────────────┘  │
│                                   │                                  │
│  ┌────────────────────────────────▼───────────────────────────────┐  │
│  │  LAYER 2: LOADER + CONVERTER                                   │  │
│  │                                                                │  │
│  │  Load 7 domain schemas from SCHEMA_REGISTRY                    │  │
│  │  Load atmosphere manifold entry for "midnight"                 │  │
│  │  Convert each schema → LumenToolDefinition                     │  │
│  │                                                                │  │
│  │  Example tool:                                                 │  │
│  │  {                                                             │  │
│  │    type: "function",                                           │  │
│  │    function: {                                                 │  │
│  │      name: "set_foliage_theme",                                │  │
│  │      description: "Change the blog theme",                     │  │
│  │      parameters: {                                             │  │
│  │        type: "object",                                         │  │
│  │        properties: {                                           │  │
│  │          themeId: {                                             │  │
│  │            type: "string",                                     │  │
│  │            enum: ["night-garden", "cozy-cabin", ...]           │  │
│  │          }                                                     │  │
│  │        }                                                       │  │
│  │      }                                                         │  │
│  │    }                                                           │  │
│  │  }                                                             │  │
│  │                                                                │  │
│  │  Output: LumenToolDefinition[] (3-12 tools)                    │  │
│  └────────────────────────────────┬───────────────────────────────┘  │
│                                   │                                  │
│  ┌────────────────────────────────▼───────────────────────────────┐  │
│  │  LAYER 3: COMPOSER (Lumen with tool calling)                   │  │
│  │                                                                │  │
│  │  POST to Lumen Worker:                                         │  │
│  │  {                                                             │  │
│  │    task: "reverie" or "reverie-compose",                       │  │
│  │    input: [system prompt, user message, atmosphere context],   │  │
│  │    tenant: tenantId,                                           │  │
│  │    options: {                                                  │  │
│  │      tools: [set_foliage_theme, set_foliage_accent, ...],      │  │
│  │      toolChoice: "required",                                   │  │
│  │      songbird: true                                            │  │
│  │    }                                                           │  │
│  │  }                                                             │  │
│  │                                                                │  │
│  │  Lumen returns:                                                │  │
│  │  {                                                             │  │
│  │    content: "",                                                │  │
│  │    toolCalls: [                                                │  │
│  │      { name: "set_foliage_theme", args: '{"themeId":"night-garden"}' },  │
│  │      { name: "set_foliage_accent", args: '{"accentColor":"#6B21A8"}' },  │
│  │      { name: "set_foliage_typography", args: '{"font":"ibm-plex-mono"}' },│
│  │      { name: "set_curios_ambient", args: '{"soundSet":"night-crickets","volume":15}' },│
│  │    ]                                                           │  │
│  │  }                                                             │  │
│  └────────────────────────────────┬───────────────────────────────┘  │
│                                   │                                  │
│  ┌────────────────────────────────▼───────────────────────────────┐  │
│  │  LAYER 4: VALIDATOR + PREVIEW                                  │  │
│  │                                                                │  │
│  │  For each tool call:                                           │  │
│  │    1. Parse arguments JSON                                     │  │
│  │    2. Validate against domain schema constraints               │  │
│  │    3. Check tier access (can this Wanderer touch this domain?) │  │
│  │    4. Fetch current value from Grove API (for diff)            │  │
│  │    5. Build preview entry                                      │  │
│  │                                                                │  │
│  │  Return preview to Wanderer:                                   │  │
│  │  {                                                             │  │
│  │    changes: [                                                  │  │
│  │      { domain: "foliage.theme", field: "themeId",              │  │
│  │        from: "grove", to: "night-garden" },                    │  │
│  │      { domain: "foliage.accent", field: "accentColor",         │  │
│  │        from: "#16a34a", to: "#6B21A8" },                       │  │
│  │      ...                                                       │  │
│  │    ],                                                          │  │
│  │    summary: "I'll change 4 settings across 4 domains...",      │  │
│  │    requiresConfirmation: true                                  │  │
│  │  }                                                             │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  [Wanderer confirms]                                                 │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  LAYER 5: EXECUTOR                                             │  │
│  │                                                                │  │
│  │  For each confirmed change:                                    │  │
│  │    1. Call Grove API endpoint (from schema.writeEndpoint)      │  │
│  │    2. Track success/failure per domain                         │  │
│  │    3. Log interaction to reverie_interactions table             │  │
│  │                                                                │  │
│  │  Return execution report:                                      │  │
│  │  {                                                             │  │
│  │    results: [                                                  │  │
│  │      { domain: "foliage.theme", status: "success" },           │  │
│  │      { domain: "foliage.accent", status: "success" },          │  │
│  │      { domain: "curios.ambient", status: "failed",             │  │
│  │        error: "Ambient sounds require Sapling tier" },         │  │
│  │    ],                                                          │  │
│  │    successCount: 3,                                            │  │
│  │    failureCount: 1                                             │  │
│  │  }                                                             │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### Layer Decision Tree

```
Input arrives
    │
    ▼
Layer 1: Router (keyword scan, no LLM)
    │
    ├── Exact domain match? (e.g., "change my font")
    │   └── Load 1-2 schemas → Layer 2 with task: "reverie"
    │
    ├── Atmosphere keyword? (e.g., "cozy", "midnight")
    │   └── Load manifold + 5-7 schemas → Layer 2 with task: "reverie"
    │
    ├── Ambiguous? (e.g., "make it feel like a rainy bookshop")
    │   └── Load broad set + manifold → Layer 2 with task: "reverie-compose"
    │
    ├── Query only? (e.g., "what theme am I using?")
    │   └── Read from Grove API directly, no LLM needed
    │
    └── No match? (e.g., "tell me a joke")
        └── Return friendly error: "I can help with site configuration..."
```

---

## File Structure

```
workers/reverie/
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── wrangler.toml
└── src/
    ├── index.ts                    # Hono app entry point
    ├── types.ts                    # Env bindings, request/response Zod schemas
    │
    ├── auth/
    │   └── middleware.ts            # Heartwood session validation
    │
    ├── lib/
    │   ├── router.ts               # Layer 1: keyword matching, domain detection
    │   ├── loader.ts               # Layer 2: schema loading from registry
    │   ├── converter.ts            # Layer 2: DomainSchema → LumenToolDefinition
    │   ├── composer.ts             # Layer 3: Lumen client call with tools
    │   ├── validator.ts            # Layer 4: argument validation, diff building
    │   ├── executor.ts             # Layer 5: Grove API calls
    │   ├── prompts.ts              # System prompts for Lumen calls
    │   └── rate-limit.ts           # Threshold rate limiting wrapper
    │
    └── routes/
        ├── configure.ts            # POST /configure (main NL endpoint)
        ├── execute.ts              # POST /execute (confirm and apply)
        ├── preview.ts              # POST /preview (dry-run, no apply)
        ├── atmospheres.ts          # GET /atmospheres (list all manifold entries)
        ├── domains.ts              # GET /domains (list available domains for tier)
        ├── query.ts                # POST /query (read-only questions)
        └── history.ts              # GET /history (interaction log)
```

---

## Service Bindings and Infrastructure

### `wrangler.toml`

```toml
name = "grove-reverie"
main = "src/index.ts"
compatibility_date = "2025-01-01"
compatibility_flags = ["nodejs_compat"]

# D1 — Engine DB for reading tenant settings, writing interaction logs
[[d1_databases]]
binding = "DB"
database_name = "grove-engine-db"
database_id = "a6394da2-b7a6-48ce-b7fe-b1eb3e730e68"

# D1 — Curios DB for reading/writing curio configuration
[[d1_databases]]
binding = "CURIO_DB"
database_name = "grove-curios-db"
database_id = "..." # curios database ID

# KV — Rate limit counters (Threshold SDK)
[[kv_namespaces]]
binding = "RATE_LIMITS"
title = "grove-reverie-ratelimits"
id = "..."

# Service Bindings — Internal worker-to-worker
[[services]]
binding = "LUMEN"
service = "grove-lumen"

[[services]]
binding = "AUTH"
service = "grove-auth"

[[services]]
binding = "IVY"
service = "grove-ivy"

# Secrets (via: gw secret apply <name> --worker grove-reverie)
# LUMEN_API_KEY    - API key for calling Lumen worker
# AUTH_CLIENT_ID   - Heartwood client ID
# AUTH_SECRET      - Heartwood client secret
```

### Environment Bindings Type

```typescript
export interface Env {
  // D1 Databases
  DB: D1Database;
  CURIO_DB: D1Database;

  // KV
  RATE_LIMITS: KVNamespace;

  // Service Bindings
  LUMEN: Fetcher;
  AUTH: Fetcher;
  IVY: Fetcher;

  // Secrets
  LUMEN_API_KEY: string;
  AUTH_CLIENT_ID: string;
  AUTH_SECRET: string;
}
```

---

## Route Definitions

### `POST /configure` — Main Natural Language Endpoint

The primary entry point. Accepts natural language, returns a preview of proposed changes.

**Request:**
```json
{
  "input": "make my site feel like a midnight library",
  "sessionId": "optional-session-id-for-context"
}
```

**Response (preview):**
```json
{
  "success": true,
  "data": {
    "requestId": "rev_abc123",
    "action": "compose",
    "atmosphere": "midnight",
    "changes": [
      {
        "domain": "foliage.theme",
        "field": "themeId",
        "from": "grove",
        "to": "night-garden",
        "description": "Theme: Night Garden"
      },
      {
        "domain": "foliage.accent",
        "field": "accentColor",
        "from": "#16a34a",
        "to": "#6B21A8",
        "description": "Accent: Deep Plum"
      }
    ],
    "summary": "I found a midnight atmosphere. Here's what I'd change across 4 domains...",
    "domainsAffected": 4,
    "fieldsChanged": 4,
    "requiresConfirmation": true,
    "lumenMeta": {
      "task": "reverie",
      "model": "liquid/lfm2-8b-a1b",
      "latencyMs": 340
    }
  }
}
```

### `POST /execute` — Confirm and Apply

Applies a previously previewed set of changes.

**Request:**
```json
{
  "requestId": "rev_abc123",
  "selectedChanges": ["foliage.theme", "foliage.accent", "foliage.typography"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "results": [
      { "domain": "foliage.theme", "status": "success" },
      { "domain": "foliage.accent", "status": "success" },
      { "domain": "foliage.typography", "status": "failed",
        "error": "Font 'ibm-plex-mono' requires Sapling tier" }
    ],
    "successCount": 2,
    "failureCount": 1
  }
}
```

### `POST /preview` — Dry Run

Same as `/configure` but explicitly marked as preview-only. Useful for UI integrations that want to show changes without the full pipeline.

### `POST /query` — Read-Only Questions

Handles questions like "what theme am I using?" without going through the LLM. The router detects `query` action and reads directly from Grove APIs.

**Request:**
```json
{
  "input": "what plan am I on?"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "action": "query",
    "domain": "infra.billing",
    "result": {
      "tier": "sapling",
      "status": "active",
      "storageUsed": "1.2 GB",
      "storageLimit": "5 GB"
    }
  }
}
```

### `GET /atmospheres` — List Manifold Entries

Returns all available atmosphere presets for the UI.

### `GET /domains` — List Available Domains

Returns domains available to the current Wanderer's tier.

### `GET /history` — Interaction Log

Returns the Wanderer's recent Reverie interactions.

---

## Schema-to-Tool Conversion

This is the core translation layer. Each domain schema becomes one or more OpenRouter tool definitions.

### Conversion Rules

```
DomainSchema                          LumenToolDefinition
─────────────                         ───────────────────
id: "foliage.accent"          →       name: "set_foliage_accent"
name: "Accent Color"          →       description: "Change the site accent color..."
fields: {                    →       parameters: {
  accentColor: {             →         type: "object",
    type: "color",           →         properties: {
    description: "...",      →           accentColor: {
    constraints: {           →             type: "string",
      pattern: "^#..."       →             pattern: "^#...",
    }                        →             description: "Hex color value..."
  }                          →           }
}                            →         }
                             →       }
```

### Naming Convention

Tool names follow `{action}_{domain}` with dots replaced by underscores:

- `foliage.accent` → `set_foliage_accent`
- `curios.cursor` → `set_curios_cursor`
- `content.posts` → `configure_content_posts`
- `infra.billing` → `query_infra_billing` (read-only domains get `query_` prefix)

### Field Type Mapping

| Schema Type | JSON Schema Type | Notes |
|------------|-----------------|-------|
| `string` | `"string"` | Direct mapping |
| `boolean` | `"boolean"` | Direct mapping |
| `integer` | `"integer"` with `minimum`/`maximum` | From constraints.min/max |
| `enum` | `"string"` with `enum` array | From options[] |
| `color` | `"string"` with `pattern` | Hex color regex |
| `url` | `"string"` with `format: "uri"` | Standard URI format |
| `json` | `"object"` | Complex nested config |

### Converter Implementation

```typescript
import type { LumenToolDefinition } from "@autumnsgrove/lattice/lumen";
import type { DomainSchema, FieldDefinition } from "./types";

export function schemaToTool(schema: DomainSchema): LumenToolDefinition {
  const isReadOnly = schema.writeEndpoint === null;
  const prefix = isReadOnly ? "query" : "set";
  const name = `${prefix}_${schema.id.replace(/\./g, "_")}`;

  const properties: Record<string, unknown> = {};
  const required: string[] = [];

  for (const [fieldName, field] of Object.entries(schema.fields)) {
    if (field.readonly) continue;
    properties[fieldName] = fieldToJsonSchema(field);
    required.push(fieldName);
  }

  return {
    type: "function",
    function: {
      name,
      description: `${schema.name}: ${schema.description}`,
      parameters: {
        type: "object",
        properties,
        required,
      },
    },
  };
}

function fieldToJsonSchema(field: FieldDefinition): Record<string, unknown> {
  const schema: Record<string, unknown> = {
    description: field.description,
  };

  switch (field.type) {
    case "string":
      schema.type = "string";
      if (field.constraints?.maxLength) schema.maxLength = field.constraints.maxLength;
      if (field.constraints?.pattern) schema.pattern = field.constraints.pattern;
      break;
    case "boolean":
      schema.type = "boolean";
      break;
    case "integer":
      schema.type = "integer";
      if (field.constraints?.min !== undefined) schema.minimum = field.constraints.min;
      if (field.constraints?.max !== undefined) schema.maximum = field.constraints.max;
      break;
    case "enum":
      schema.type = "string";
      schema.enum = field.options;
      break;
    case "color":
      schema.type = "string";
      schema.pattern = "^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$";
      break;
    case "url":
      schema.type = "string";
      schema.format = "uri";
      break;
    case "json":
      schema.type = "object";
      break;
  }

  if (field.default !== undefined) {
    schema.default = field.default;
  }

  return schema;
}
```

### Example Output

For the `foliage.accent` schema:

```json
{
  "type": "function",
  "function": {
    "name": "set_foliage_accent",
    "description": "Accent Color: The primary accent color used across links, buttons, and interactive elements.",
    "parameters": {
      "type": "object",
      "properties": {
        "accentColor": {
          "type": "string",
          "description": "Hex color value for the site accent",
          "pattern": "^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$",
          "default": "#16a34a"
        }
      },
      "required": ["accentColor"]
    }
  }
}
```

---

## System Prompts

### Reverie System Prompt (Layer 2/3)

```typescript
export const REVERIE_SYSTEM_PROMPT = `You are Reverie, a configuration assistant for Grove, a personal blogging platform.

Your job: translate what the Wanderer wants into tool calls that configure their site.

## Rules
- ALWAYS use tool calls. Never respond with text alone.
- Call multiple tools in a single response when changes span domains.
- Use the atmosphere context (if provided) as a starting point, then refine based on the Wanderer's specific words.
- Choose values that feel cohesive together. A "midnight library" should have dark themes, serif fonts, and quiet ambient sounds.
- When the Wanderer's request is vague, make tasteful choices. You have aesthetic judgment.
- Never touch domains the Wanderer didn't mention or imply.
- For colors, choose from the provided palette or generate harmonious hex values.

## What You Cannot Do
- Modify billing, subscription, or infrastructure settings
- Delete content (posts, pages, blazes)
- Access other Wanderers' configurations
- Generate code, CSS, or HTML
`;

export const REVERIE_COMPOSE_SYSTEM_PROMPT = `You are Reverie, a configuration assistant for Grove.

The Wanderer has described a feeling or aesthetic that spans multiple parts of their site. Your task is to interpret their vision and translate it into coordinated tool calls.

## How to Think
1. Identify the core aesthetic: what feeling are they after?
2. Choose a theme that anchors the visual identity.
3. Select fonts, colors, and accents that reinforce the theme.
4. Add ambient and interactive elements that complete the atmosphere.
5. Every choice should feel like it belongs in the same room.

## Rules
- ALWAYS use tool calls. Multiple tools per response.
- Prioritize coherence over coverage. 4 perfectly matched changes beat 8 random ones.
- Lean into the metaphor. "Midnight library" means dark, quiet, bookish. Not generic dark mode.
- When in doubt, understate. Subtle is better than loud.
`;
```

### Atmosphere Context Injection

When an atmosphere keyword is detected, inject the manifold entry as context:

```typescript
function buildAtmosphereContext(
  atmosphere: string,
  manifoldEntry: AtmosphereEntry,
): string {
  return `## Atmosphere Reference: "${atmosphere}"
${manifoldEntry.description}

Suggested starting values:
${Object.entries(manifoldEntry.settings)
  .map(([key, value]) => `- ${key}: ${value}`)
  .join("\n")}

Use these as a foundation, then adjust based on the Wanderer's specific request.`;
}
```

---

## Session State (Durable Objects)

### Why Sessions

Follow-up requests like "make it a bit warmer" need context from the previous interaction. Without session state, each request is isolated and the model can't know what "it" refers to.

### Session DO Design

```typescript
import { LoomDO } from "@autumnsgrove/lattice/loom";

export class ReverieSessionDO extends LoomDO {
  // Session expires after 30 minutes of inactivity
  private static readonly TTL_MS = 30 * 60 * 1000;

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    switch (url.pathname) {
      case "/messages":
        if (request.method === "GET") return this.getMessages();
        if (request.method === "POST") return this.addMessage(request);
        break;
      case "/config-snapshot":
        if (request.method === "GET") return this.getConfigSnapshot();
        if (request.method === "PUT") return this.setConfigSnapshot(request);
        break;
      case "/pending":
        if (request.method === "GET") return this.getPendingChanges();
        if (request.method === "PUT") return this.setPendingChanges(request);
        if (request.method === "DELETE") return this.clearPendingChanges();
        break;
    }

    return this.error("NOT_FOUND", "Route not found", 404);
  }

  // Store last 10 messages for conversational context
  private async getMessages(): Promise<Response> {
    const messages = await this.getState<LumenMessage[]>("messages") ?? [];
    return this.json(messages);
  }

  private async addMessage(request: Request): Promise<Response> {
    const message = await request.json();
    const messages = await this.getState<LumenMessage[]>("messages") ?? [];
    messages.push(message);

    // Keep only last 10 messages
    if (messages.length > 10) messages.splice(0, messages.length - 10);

    await this.setState("messages", messages);

    // Reset TTL
    await this.scheduleAlarm(Date.now() + ReverieSessionDO.TTL_MS);

    return this.json({ ok: true });
  }

  // Store current config snapshot for diffing
  private async getConfigSnapshot(): Promise<Response> {
    const snapshot = await this.getState("configSnapshot");
    return this.json(snapshot ?? {});
  }

  private async setConfigSnapshot(request: Request): Promise<Response> {
    const snapshot = await request.json();
    await this.setState("configSnapshot", snapshot);
    return this.json({ ok: true });
  }

  // Store pending changes awaiting confirmation
  private async getPendingChanges(): Promise<Response> {
    const pending = await this.getState("pendingChanges");
    return this.json(pending ?? null);
  }

  private async setPendingChanges(request: Request): Promise<Response> {
    const changes = await request.json();
    await this.setState("pendingChanges", changes);
    return this.json({ ok: true });
  }

  private async clearPendingChanges(): Promise<Response> {
    await this.deleteState("pendingChanges");
    return this.json({ ok: true });
  }

  // Expire session on alarm
  async alarm(): Promise<void> {
    await this.deleteState("messages");
    await this.deleteState("configSnapshot");
    await this.deleteState("pendingChanges");
  }
}
```

### Session Key

Sessions are keyed by `tenant:{tenantId}:{sessionId}`. The `sessionId` is generated by the client (Arbor UI) and passed in the request. Same session ID = same conversation context. New session ID = fresh start.

### wrangler.toml Addition

```toml
[[durable_objects.bindings]]
name = "REVERIE_SESSION"
class_name = "ReverieSessionDO"

[[migrations]]
tag = "v1"
new_classes = ["ReverieSessionDO"]
```

---

## Rate Limiting Strategy

### Per-Tenant Limits

Using Threshold SDK with the existing `checkTier` pattern:

```typescript
import { checkTier } from "@autumnsgrove/lattice/threshold";

// In middleware
const allowed = await checkTier(tier, "reverie", tenantId, {
  kv: env.RATE_LIMITS,
});

if (!allowed) {
  return c.json({
    success: false,
    error: { code: "RATE_LIMITED", message: "..." },
  }, 429);
}
```

### Tier-Specific Rate Limits

| Tier | Requests/Hour | Domains/Request | Notes |
|------|--------------|-----------------|-------|
| Free | 0 | 0 | No Reverie access |
| Seedling | 10 | 3 | Templates + basic config |
| Sapling | 30 | 7 | Full NL access |
| Oak | 60 | 15 | Power users |
| Evergreen | 120 | 32 | Everything |

These are independent of Lumen quotas. A single Reverie request may consume 1 Lumen `reverie` quota unit, but the Reverie-level rate limit controls how often a Wanderer can invoke the full pipeline.

---

## Executor: Grove API Integration

### API Call Patterns

The executor translates tool calls into real Grove API requests. Each domain schema specifies its `readEndpoint` and `writeEndpoint`.

```typescript
interface ExecutionStep {
  domain: string;
  endpoint: string;
  method: "GET" | "PUT" | "POST" | "PATCH";
  payload: Record<string, unknown>;
  description: string;
}

async function executeSteps(
  steps: ExecutionStep[],
  ctx: { ivy: Fetcher; auth: string; tenantId: string },
): Promise<ExecutionResult[]> {
  // Execute all steps in parallel
  const results = await Promise.allSettled(
    steps.map(step => executeStep(step, ctx))
  );

  return results.map((result, i) => ({
    domain: steps[i].domain,
    status: result.status === "fulfilled" ? "success" : "failed",
    error: result.status === "rejected"
      ? (result.reason instanceof Error ? result.reason.message : "Unknown error")
      : undefined,
  }));
}

async function executeStep(
  step: ExecutionStep,
  ctx: { ivy: Fetcher; auth: string; tenantId: string },
): Promise<void> {
  const url = new URL(step.endpoint, "https://ivy.internal");
  url.searchParams.set("tenant_id", ctx.tenantId);

  const response = await ctx.ivy.fetch(url.toString(), {
    method: step.method,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${ctx.auth}`,
    },
    body: step.method !== "GET" ? JSON.stringify(step.payload) : undefined,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`${step.domain}: ${response.status} — ${error}`);
  }
}
```

### Engine DB vs. Curios DB Routing

Some domains live in the engine DB (foliage, content, social) and others in the curios DB (curios.*). The executor routes writes to the correct database based on the domain group:

```typescript
function getDbForDomain(domain: string): "engine" | "curios" {
  if (domain.startsWith("curios.")) return "curios";
  if (domain.startsWith("identity.activitystatus")) return "curios";
  if (domain.startsWith("identity.badges")) return "curios";
  return "engine";
}
```

For most domains, the executor calls Ivy's existing API endpoints via service binding. Some curio domains may need direct D1 writes (for curios not yet exposed via API). The schema's `writeEndpoint` determines the path.

---

## Interaction Logging

### D1 Table (Engine DB)

```sql
CREATE TABLE reverie_interactions (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  input_text TEXT NOT NULL,
  action TEXT NOT NULL,                -- configure | query | compose
  domains_matched TEXT NOT NULL,       -- JSON array
  atmosphere_used TEXT,                -- atmosphere keyword if used
  tool_calls_generated TEXT,           -- JSON array of tool call names
  changes_applied TEXT,                -- JSON: final applied changes
  lumen_task TEXT,                     -- reverie | reverie-compose
  lumen_model TEXT,                    -- model used
  lumen_latency_ms INTEGER,           -- inference latency
  success INTEGER DEFAULT 1,
  error_message TEXT,
  session_id TEXT,
  created_at INTEGER DEFAULT (unixepoch()),

  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_reverie_interactions_tenant
  ON reverie_interactions(tenant_id, created_at);

CREATE INDEX idx_reverie_interactions_atmosphere
  ON reverie_interactions(atmosphere_used)
  WHERE atmosphere_used IS NOT NULL;
```

### Logging Strategy

Interactions are logged asynchronously via `ctx.waitUntil()` to avoid blocking the response:

```typescript
ctx.executionCtx.waitUntil(
  logInteraction(ctx.db, {
    tenantId,
    inputText: request.input,
    action: routerResult.action,
    domainsMatched: routerResult.domains,
    atmosphereUsed: routerResult.atmosphere,
    toolCallsGenerated: response.toolCalls?.map(tc => tc.function.name) ?? [],
    changesApplied: executionResults,
    lumenTask: task,
    lumenModel: response.model,
    lumenLatencyMs: response.latency,
    success: executionResults.every(r => r.status === "success"),
    sessionId,
  })
);
```

---

## Error Handling

### Error Taxonomy

```typescript
// Reverie-specific error codes
export const REVERIE_ERRORS = {
  // Router errors
  NO_DOMAINS_MATCHED: "REV-001",      // Input didn't match any domain
  UNSUPPORTED_ACTION: "REV-002",       // Action not supported (e.g., "delete my account")

  // Loader errors
  SCHEMA_NOT_FOUND: "REV-003",         // Domain schema missing from registry
  TOO_MANY_DOMAINS: "REV-004",         // Exceeds tier's domain limit

  // Composer errors
  LUMEN_UNAVAILABLE: "REV-005",        // Lumen service down
  NO_TOOL_CALLS: "REV-006",            // Model returned text instead of tool calls
  MALFORMED_TOOL_CALL: "REV-007",      // Tool call args didn't parse as JSON

  // Validator errors
  INVALID_FIELD_VALUE: "REV-008",      // Value violates schema constraints
  TIER_ACCESS_DENIED: "REV-009",       // Feature requires higher tier
  READ_ONLY_DOMAIN: "REV-010",         // Tried to write to read-only domain

  // Executor errors
  API_CALL_FAILED: "REV-011",          // Grove API returned error
  PARTIAL_FAILURE: "REV-012",          // Some API calls failed

  // Session errors
  SESSION_EXPIRED: "REV-013",          // Session DO timed out
  PENDING_NOT_FOUND: "REV-014",        // No pending changes to execute

  // Rate limiting
  RATE_LIMITED: "REV-015",             // Exceeded tier rate limit
} as const;
```

---

## Security Considerations

### Input Safety

1. **Songbird protection.** Every Lumen call enables `songbird: true`. Prompt injection is caught before the model sees tool definitions.
2. **PII scrubbing.** Lumen's preprocessor scrubs PII from the Wanderer's input before inference.
3. **Input length.** Maximum 500 characters for natural language input. Reverie is for short configuration commands, not essays.

### Execution Safety

1. **Schema validation.** Every tool call argument is validated against the domain schema before execution. Invalid values never reach Grove APIs.
2. **Tier enforcement.** The validator checks the Wanderer's tier against each domain's access requirements. A Seedling cannot configure Oak-only features.
3. **Write confirmation.** All write operations require explicit confirmation. No changes apply without the Wanderer approving the preview.
4. **Read-only domains.** Billing and feature flags cannot be modified. The converter generates `query_` prefixed tools for these, and the executor refuses write attempts.

### Tenant Isolation

1. **Session scoping.** Session DOs are keyed by tenant ID. No cross-tenant access.
2. **API scoping.** Every Grove API call includes the tenant ID from the authenticated session. Existing API-level tenant isolation protects against cross-tenant writes.
3. **No raw SQL.** Reverie never constructs SQL from user input. All database access goes through prepared statements or Grove API endpoints.

---

## Implementation Phases

### Phase 1: Foundation (Router + Schemas + Preview)

Build the pipeline up to preview. No LLM calls yet. Use the atmosphere manifold for deterministic composition.

- [ ] Scaffold `workers/reverie/` with Hono, wrangler.toml, package.json
- [ ] Implement env types and Zod request/response schemas
- [ ] Implement Heartwood auth middleware
- [ ] Implement Layer 1 router (keyword matching from reverie-spec.md)
- [ ] Implement schema loader (from `@autumnsgrove/lattice/reverie`)
- [ ] Implement schema-to-tool converter
- [ ] Implement `POST /atmospheres` endpoint (manifold listing)
- [ ] Implement `POST /domains` endpoint (domain listing by tier)
- [ ] Write router unit tests
- [ ] Write converter unit tests

### Phase 2: Lumen Integration (Tool Calling)

Wire up Lumen for actual LLM-powered composition.

**Prerequisite:** Lumen tool calling extension must be implemented first.

- [ ] Implement composer (RemoteLumenClient with tools)
- [ ] Implement system prompts
- [ ] Implement `POST /configure` endpoint
- [ ] Implement `POST /preview` endpoint
- [ ] Implement atmosphere context injection
- [ ] Add Threshold rate limiting middleware
- [ ] Write composer integration tests (mocked Lumen)
- [ ] Write route integration tests

### Phase 3: Validation and Execution

Complete the pipeline with validation and API execution.

- [ ] Implement tool call argument validator
- [ ] Implement tier access checker
- [ ] Implement current-value fetcher (for diff preview)
- [ ] Implement executor (Grove API calls via service binding)
- [ ] Implement `POST /execute` endpoint
- [ ] Implement `POST /query` endpoint (read-only questions)
- [ ] Write validator unit tests
- [ ] Write executor integration tests

### Phase 4: Sessions and History

Add conversational context and interaction logging.

- [ ] Implement ReverieSessionDO (Loom-based)
- [ ] Wire session loading into `/configure` route
- [ ] Implement session context in Lumen calls
- [ ] Implement interaction logging (D1)
- [ ] Implement `GET /history` endpoint
- [ ] Create `reverie_interactions` migration
- [ ] Write session DO tests

### Phase 5: Polish

Production readiness.

- [ ] Add error handling for all Reverie error codes
- [ ] Add health check endpoint
- [ ] Add Rings analytics events
- [ ] Deploy to staging
- [ ] End-to-end testing with real Lumen calls
- [ ] Deploy to production

---

## Dependencies

### Must Be Done First

1. **Lumen tool calling extension** ([lumen-tool-calling-spec.md](lumen-tool-calling-spec.md))
   - New types: `LumenToolDefinition`, `LumenToolCall`, `LumenToolChoice`
   - OpenRouter provider: tool passthrough and response parsing
   - New task types: `reverie`, `reverie-compose`
   - Quota entries for new tasks

2. **Reverie domain schemas** (already done, PR branch)
   - 32 domain schemas in `libs/engine/src/lib/reverie/`
   - Atmosphere manifold entries
   - Schema registry exports

### Can Be Done In Parallel

- Session DO implementation (independent of Lumen)
- Router implementation (no LLM dependency)
- Converter implementation (schema → tool, no LLM dependency)
- Interaction logging table migration

---

## Success Criteria

1. **"Change my accent color to lavender"** → one tool call, one API write, under 500ms total.
2. **"Make my site feel cozy"** → 5-7 coordinated tool calls via atmosphere manifold, preview shown, all applied on confirm.
3. **"Make it feel like a midnight library"** → `reverie-compose` task, cross-domain aesthetic reasoning, 3-7 coherent tool calls.
4. **"What theme am I using?"** → direct API read, no LLM call, under 100ms.
5. **"Make it a bit warmer"** (follow-up) → session context informs the model about current config, adjusts 1-2 settings.
6. **Tier limits respected.** Seedling gets templates only, Oak gets full NL, Free gets nothing.
7. **Zero new backend endpoints.** All writes go through existing Ivy/Plant/Curios APIs.

---

## References

- [Reverie Spec](reverie-spec.md) — the vision this plan implements
- [Lumen Tool Calling Spec](lumen-tool-calling-spec.md) — the LLM capability this depends on
- [Lumen Spec](lumen-spec.md) — the AI gateway
- [Foliage Project Spec](foliage-project-spec.md) — theme system APIs
- [Curios Spec](curios-spec.md) — curio configuration APIs
- [Threshold Spec](threshold-spec.md) — rate limiting SDK
- [Heartwood Spec](heartwood-spec.md) — authentication
- [Loom Spec](meadow-loom-spec.md) — Durable Objects framework

---

*A Wanderer speaks. The grove listens. Between the words and the change, Reverie dreams the configuration into being.*
