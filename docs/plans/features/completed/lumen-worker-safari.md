# Lumen Worker Architecture Safari

> _"Grove talks to AI through Lumen."_ — but only when someone's home.
>
> **Aesthetic principle**: One hollow center for all intelligence, reachable from anywhere.
> **Scope**: Lumen's current library architecture, the timeline-sync worker's parallel AI implementation, and the path to Lumen-as-a-Worker.

---

## Ecosystem Overview

**6 stops** across the Lumen landscape:

1. Lumen SDK (the library in the engine)
2. Timeline Generate API (Lumen used correctly — inside the engine)
3. Timeline-Sync Worker (Lumen bypassed — standalone cron)
4. Other Lumen consumers (Wisp, Fireside, Thorn, Petal)
5. The Warden spec (the architectural blueprint we need)
6. The gap between spec and reality

### Items by category

**Working correctly** (in-engine consumers): Timeline Generate API, Wisp, Fireside, Thorn, Petal, Transcribe
**Broken by architecture** (can't reach Lumen): Timeline-Sync Worker
**Built and deployed**: Warden Worker (external API gateway)
**Not yet built**: Lumen Worker, Warden OpenRouter service

---

## 1. Lumen SDK — The Library

**Character**: _A well-built AI gateway that lives inside the engine's walls — powerful, well-designed, but imprisoned._

### What exists today

**Location**: `libs/engine/src/lib/lumen/` (~15 files)

**Architecture**: Lumen is a **TypeScript library** that gets imported directly by engine code. It's instantiated per-request:

```typescript
// Every consumer does this:
const lumen = createLumenClient({
  openrouterApiKey: platform.env.OPENROUTER_API_KEY,
  ai: platform.env.AI, // Cloudflare Workers AI binding
  db: platform.env.DB, // D1 for quota tracking
});
```

**What it provides** (and provides well):

- [x] Task-based routing (moderation, generation, summary, chat, image, code, embedding, transcription)
- [x] Multi-provider support (OpenRouter primary, Cloudflare Workers AI fallback)
- [x] Automatic fallback chains when providers fail
- [x] PII scrubbing before requests leave Grove
- [x] Tier-based quota management
- [x] Usage tracking and analytics
- [x] Songbird prompt injection protection
- [x] Streaming support
- [x] BYOK (Bring Your Own Key) via `tenantApiKey` option

**The fundamental constraint**: Lumen requires `platform.env` bindings that only exist inside the engine's SvelteKit request context. It cannot be instantiated by external workers.

**Key files**:

| File | Purpose |
|------|---------|
| `client.ts` | LumenClient class — main entry point |
| `types.ts` | All type definitions |
| `providers/` | OpenRouter and Cloudflare AI provider implementations |
| `pipeline/` | Pre-processing (PII scrub, validation) and post-processing (normalization, logging) |
| `router.ts` | Task-based routing and fallback execution |
| `quota/` | Quota enforcement and tracking |
| `config.ts` | Model registry, task configs, cost tables |
| `songbird.ts` | Prompt injection detection |

---

## 2. Timeline Generate API — Lumen Used Correctly

**Character**: _The well-behaved sibling. Does everything right because it lives under the same roof._

### What exists today

**Location**: `libs/engine/src/routes/api/curios/timeline/generate/+server.ts` (803 lines)

This is the **manual generation endpoint** — triggered by an admin clicking "Generate" in the Timeline curio settings. It:

- [x] Creates a `LumenClient` from `platform.env`
- [x] Uses Lumen's `run()` with task: `"summary"`
- [x] Passes tenant's own OpenRouter key via `tenantApiKey` option
- [x] Gets full pipeline benefits (PII scrubbing, quota tracking, fallback chains)
- [x] Rate-limited via Threshold
- [x] Authenticated via Heartwood

**This works** because it runs inside the engine's request cycle. The user is viewing the page, SvelteKit is handling the request, `platform.env` is available.

**The irony**: This endpoint does the exact same work as the timeline-sync worker (fetch commits → build prompt → call AI → store summary), but it can use Lumen and the worker can't.

---

## 3. Timeline-Sync Worker — Lumen Bypassed

**Character**: _The orphan child. Built to do the same job as its sibling but raised outside the family home, so it learned to fend for itself._

### What exists today

**Location**: `workers/timeline-sync/` (11 files)

This is the **nightly cron worker** — runs at 1 AM UTC via Cloudflare Cron Triggers. It:

- Queries D1 for enabled tenants
- Decrypts their GitHub tokens and OpenRouter keys
- Fetches GitHub commits for yesterday
- Calls OpenRouter directly for AI summary generation
- Stores results back to D1

### The problem: complete Lumen bypass

The worker has its **own OpenRouter implementation** (`openrouter.ts`, 231 lines) that:

- [x] Makes raw `fetch()` calls to `https://openrouter.ai/api/v1/chat/completions`
- [x] Has its own type definitions (`OpenRouterMessage`, `OpenRouterResponse`)
- [x] Has its own cost estimation table
- [x] Has its own response parsing
- [ ] **Missing**: PII scrubbing (commits go to AI unscrubbed)
- [ ] **Missing**: Fallback chains (single model, no retry)
- [ ] **Missing**: Quota enforcement
- [ ] **Missing**: Usage normalization
- [ ] **Missing**: Songbird protection
- [ ] **Missing**: Cloudflare AI Gateway integration
- [ ] **Missing**: Cloudflare Workers AI as fallback provider

### Why this happened

The worker's `wrangler.toml` has:

```toml
[[d1_databases]]
binding = "DB"
database_name = "grove-engine-db"

# Env type:
# DB: D1Database
# GROVE_KEK: string
# OPENROUTER_API_KEY?: string  (fallback)
```

No `AI` binding (Cloudflare Workers AI). No service binding to the engine. No way to import `@autumnsgrove/lattice/lumen` because:

1. Workers are bundled independently — they can't import from sibling packages at runtime
2. Even if they could, `LumenClient` needs `platform.env.AI` which the worker doesn't have
3. The engine isn't running at 1 AM when nobody's viewing the site

**Your suspicion is confirmed.** The daily summaries can't use Lumen because the timeline-sync worker is architecturally isolated from it.

---

## 4. Other Lumen Consumers — All Inside the Engine

**Character**: _The well-connected family members who never had to leave home._

All current Lumen consumers live inside the engine and work correctly:

| Consumer | File | Task |
|----------|------|------|
| **Wisp** (writing assist) | `routes/api/grove/wisp/+server.ts` | `generation` |
| **Fireside** (chat) | `routes/api/grove/wisp/fireside/+server.ts` | `chat` |
| **Thorn** (moderation) | `lib/thorn/hooks.ts` | `moderation` |
| **Petal** (classification) | `lib/server/petal/lumen-classify.ts` | `moderation` |
| **Scribe** (transcription) | `routes/api/lumen/transcribe/+server.ts` | `transcription` |
| **Timeline** (manual) | `routes/api/curios/timeline/generate/+server.ts` | `summary` |

Every one of these does `createLumenClient({ openrouterApiKey, ai, db })` inline.

**None of them can be called from workers.** If any future worker needs AI (moderation for scheduled posts, email subject generation, content summarization for newsletters), it will face the same wall as timeline-sync.

---

## 5. Warden — The Living Blueprint

**Character**: _No longer a spec on paper. The architect's drawing has become a building — and it shows us exactly how Lumen should be built._

Warden is now a **fully built Cloudflare Worker** at `workers/warden/` with a mature SDK at `libs/engine/src/lib/warden/`.

### What Warden provides today

**Worker** (`workers/warden/`, Hono-based, ~23 files):

- [x] Dual auth middleware (`auth/dual-auth.ts`): API key header OR HMAC challenge-response
- [x] Service registry pattern (`services/registry.ts`): each service self-registers with Zod-validated actions
- [x] Per-tenant credential resolution via SecretsManager (`lib/credentials.ts`): tenant keys → global fallback
- [x] Audit logging to its own D1 database (`lib/logging.ts`)
- [x] Rate limiting per agent/service via KV (`middleware/rate-limit.ts`)
- [x] Response scrubbing (`middleware/scrub.ts`)
- [x] Admin endpoints for agent management (`routes/admin.ts`)

**Registered services** (6 today):

| Service | Actions | Auth |
|---------|---------|------|
| `github` | list_repos, get_repo, get_issue, list_issues, create_issue, create_comment, list_workflow_runs, trigger_workflow | Bearer token |
| `tavily` | search, crawl, extract | API key body |
| `cloudflare` | list_workers, list_kv, list_d1, list_dns | Bearer token |
| `exa` | search, contents, find_similar | Bearer token |
| `resend` | send_email | Bearer token |
| `stripe` | get_customer, list_subscriptions, list_invoices | Bearer token |

**Not registered**: `openrouter`. This is the gap that matters for Lumen.

**SDK** (`libs/engine/src/lib/warden/`, ~12 files):

```typescript
// Factory auto-detects auth mode from what's provided:
const warden = createWardenClient(platform.env);
// Checks: env.WARDEN (service binding) → env.WARDEN_API_KEY → env.WARDEN_AGENT_ID + SECRET

// Typed service helpers:
const repos = await warden.github.listRepos({ owner: 'AutumnsGrove' });
const results = await warden.tavily.search({ query: 'grove.place' });
```

**Warden's bindings** (`wrangler.toml`):

- `DB`: its own D1 (`grove-warden`) for agent registry + audit log
- `TENANT_DB`: engine D1 (`grove-engine-db`) for SecretsManager credential lookup
- `NONCES`: KV for challenge-response nonce storage (30s TTL)
- `RATE_LIMITS`: KV for per-agent rate limiting

### What this means for Lumen

Warden already solved every infrastructure problem Lumen faces:

1. **Dual auth** — API key for service bindings, HMAC for external callers
2. **Credential injection** — per-tenant via SecretsManager, global fallback
3. **Service registry** — self-registering services with Zod validation
4. **SDK factory** — auto-detects auth mode from environment

Adding OpenRouter as a Warden service is trivial — it follows the exact same `registerService()` pattern as `github.ts`. One new file, ~50 lines.

The deeper question is whether Lumen should:
- **A)** Become a Warden service (raw OpenRouter proxy — loses pipeline features)
- **B)** Become its own worker that CALLS Warden for credential-injected OpenRouter access (preserves full pipeline)
- **C)** Both — OpenRouter as a Warden service for raw access, Lumen worker for full-pipeline access

**Option C is the right call.** OpenRouter as a Warden service is an immediate, easy win. The Lumen worker is the deeper work that preserves PII scrubbing, fallback chains, quota management, and Songbird. Workers that just need "call this model with these messages" use Warden directly. Workers that need "do AI the Grove way" call Lumen.

---

## 6. The Gap — Spec vs Reality

**Character**: _The distance between the map and the territory._

The Lumen spec's ASCII architecture diagram literally says:

```
│                           LUMEN (Cloudflare Worker)                          │
```

But Lumen was implemented as an **in-process library**, not a Cloudflare Worker. The spec envisioned it as a standalone service. The implementation kept it embedded in the engine.

This isn't a design failure — it was likely the pragmatic choice. Building Lumen as a library first let it be iterated on rapidly without the overhead of worker deployment, service bindings, and HTTP serialization. But now the limitation is real: workers can't use it.

---

## Expedition Summary

### By the numbers

| Metric | Count |
|--------|-------|
| Total stops | 6 |
| Working correctly (in-engine) | 5 |
| Broken by architecture | 1 (timeline-sync) |
| Duplicate AI code in worker | ~230 lines (openrouter.ts) |
| Missing pipeline features in worker | 6 (PII, fallback, quota, normalization, Songbird, AI Gateway) |

### The verdict: Your suspicion is correct

The daily timeline summaries don't work because:

1. **Lumen is a library**, not a worker
2. **The timeline-sync cron runs at 1 AM** when nobody's viewing the site
3. **The worker can't reach Lumen** because Lumen only exists inside the engine's request context
4. **The worker built its own AI call** (`openrouter.ts`), but it's missing half of Lumen's pipeline
5. **There's no service binding** between the worker and the engine (and even if there were, the engine isn't running as a persistent service — it's a Pages Function that responds to HTTP requests)

### What needs to happen

#### Phase 0: Add OpenRouter to Warden (quick win)

Add `openrouter` as a Warden service. This is the immediate unblock — trivial to implement, follows existing patterns exactly.

**New file**: `workers/warden/src/services/openrouter.ts` (~80 lines)

```typescript
// Follows the exact pattern of github.ts, tavily.ts, etc.
registerService({
  name: "openrouter",
  baseUrl: "https://openrouter.ai/api/v1",
  auth: { type: "bearer" },
  actions: {
    chat_completion: {
      schema: z.object({
        model: z.string(),
        messages: z.array(z.object({
          role: z.enum(["system", "user", "assistant"]),
          content: z.string(),
        })),
        max_tokens: z.number().optional(),
        temperature: z.number().optional(),
        stream: z.boolean().optional(),
      }),
      buildRequest: (params, token) => ({
        url: "https://openrouter.ai/api/v1/chat/completions",
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://grove.place",
          "X-Title": "Grove",
        },
        body: JSON.stringify(params),
      }),
    },
    // Could add: list_models, get_generation, get_credits
  },
});
```

**Also needs**:
- Add `"openrouter"` to the `WardenService` type union in both worker and SDK types
- Add `OPENROUTER_API_KEY` to wrangler.toml secrets and Env interface
- Add `openrouter: "openrouter_api_key"` to the credential resolution maps
- Add `WardenOpenRouter` service helper class to the SDK
- Warden already has `TENANT_DB` + `GROVE_KEK` for SecretsManager — per-tenant OpenRouter key resolution comes for free

**Immediate payoff**: Any worker with a Warden service binding can call OpenRouter with credential injection. Timeline-sync's `openrouter.ts` could be replaced today.

#### Phase 1: Lumen Worker (`workers/lumen/`)

Turn Lumen into a standalone Cloudflare Worker that wraps the existing pipeline and uses Warden for credential-injected provider access.

- Exposes the full Lumen pipeline via HTTP API (`POST /inference`, `POST /transcribe`, `POST /moderate`, `POST /embed`)
- Calls Warden internally for OpenRouter access (service binding) — Lumen never holds raw API keys
- Has its own `AI` binding for Cloudflare Workers AI (direct, no Warden needed — CF-native)
- Shares the engine D1 database for quota tracking
- Handles tenant authentication (API key or service binding, following Warden's dual-auth pattern)
- Runs the full pipeline: validation → PII scrub → quota check → route → execute (via Warden) → normalize → log

**Key architectural decision**: Lumen calls Warden for OpenRouter. This means:
- Warden owns ALL external API credentials (single source of truth)
- Lumen owns the AI pipeline (PII, quota, fallback, Songbird)
- Clean separation: Warden = "talk to external APIs", Lumen = "talk to AI models"

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  timeline-  │     │   LUMEN     │     │   WARDEN    │
│  sync       │────▶│  (worker)   │────▶│  (worker)   │────▶ OpenRouter
│  (cron)     │     │  PII/quota/ │     │  cred inject│
└─────────────┘     │  fallback   │     └─────────────┘
                    │             │────▶ Cloudflare Workers AI (direct)
                    └─────────────┘
```

#### Phase 2: SDK Dual-Mode (`@autumnsgrove/lattice/lumen`)

Update the Lumen SDK to support three modes (following the Warden factory pattern):

```typescript
// Mode 1: In-process (current behavior, for engine routes)
// SvelteKit callers pass platform.env.*; standalone workers pass env.* directly
const lumen = createLumenClient({
  openrouterApiKey: env.OPENROUTER_API_KEY,
  ai: env.AI,
  db: env.DB,
});

// Mode 2: Service binding (for workers on Cloudflare)
const lumen = createLumenClient({
  LUMEN: env.LUMEN,  // Service binding to lumen worker
});

// Mode 3: HTTP (for external callers, CLI, agents)
const lumen = createLumenClient({
  LUMEN_URL: "https://lumen.grove.place",
  LUMEN_API_KEY: env.LUMEN_API_KEY,
});
```

The SDK auto-detects which mode to use based on what's provided. Same pattern as `createWardenClient()`.

#### Phase 3: Timeline-Sync Migration

Update the timeline-sync worker to use the Lumen worker:

- Add `LUMEN` service binding in `wrangler.toml`
- Replace `openrouter.ts` with Lumen SDK calls via service binding
- Delete the duplicate AI implementation (~230 lines)
- Gain full pipeline benefits for free (PII scrubbing, fallback chains, quota, Songbird)
- Optionally: also add `WARDEN` service binding to replace raw GitHub `fetch()` calls with Warden's GitHub service (timeline-sync currently does its own GitHub API calls too)

#### Phase 4: Deeper Warden-Lumen Coordination

For the full vision where Lumen and Warden work together seamlessly:

- Warden handles ALL external API credentials (OpenRouter, GitHub, Tavily, etc.)
- Lumen handles ALL AI inference with its full pipeline
- Both use the same dual-auth pattern (service binding + HMAC)
- Both have typed SDKs with auto-detection factories
- Any worker that needs AI adds a `LUMEN` service binding; any worker that needs external APIs adds a `WARDEN` service binding; both are zero-config

### Cross-cutting themes

1. **Warden is the proven pattern**: Dual auth, service registry, credential injection, SDK auto-detection — all built, deployed, working. Lumen doesn't need to invent anything new; it follows the same architecture.

2. **OpenRouter in Warden is the quick win**: Adding one service file to Warden (~80 lines) immediately unblocks any worker that needs raw AI access. Timeline-sync could use it today. This is the fastest path to working daily summaries.

3. **Lumen worker is the deeper work**: For the full pipeline (PII scrubbing, fallback chains, quota, Songbird), Lumen needs to become its own worker that calls Warden for credential-injected OpenRouter access. This is the "do AI the Grove way" path.

4. **timeline-sync is the canary**: It's the first worker that needed AI and couldn't get it. There will be more: scheduled moderation, email AI, notification summaries, feed ranking. Every one will hit this same wall.

5. **The credential hierarchy**: Warden already has per-tenant credential resolution via SecretsManager + global fallback. Adding OpenRouter to Warden means the timeline-sync worker's manual key decryption (`GROVE_KEK` + `openrouter_key_encrypted`) gets replaced by Warden's proven credential pipeline.

### Recommended implementation order

1. **OpenRouter in Warden** — Add `openrouter` service to Warden's registry (quick, follows existing patterns exactly)
2. **Lumen Worker** — Build the worker, expose the HTTP API, call Warden for OpenRouter access
3. **SDK update** — Add dual-mode detection to `createLumenClient` following the `createWardenClient` factory pattern
4. **Timeline-sync migration** — Replace `openrouter.ts` with Lumen SDK calls, optionally replace raw GitHub API calls with Warden's GitHub service

---

_The fire dies to embers. The journal is full — 6 stops, the whole landscape mapped. The hollow center needs to become its own thing, reachable from anywhere in the grove, not just from inside the engine's walls. Tomorrow, the animals go to work. But tonight was the drive. And it was glorious._
