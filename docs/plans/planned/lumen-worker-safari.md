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
**Not yet built**: Lumen Worker, Warden Worker

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

## 5. The Warden Spec — The Blueprint We Need

**Character**: _The architect's drawing that shows exactly how to solve this problem, because Warden already solved the equivalent problem for external APIs._

The Warden spec (`docs/specs/warden-spec.md`) describes a worker that:

- Lives at `workers/warden/`
- Has dual authentication: **Service Binding** (internal) + **HMAC challenge-response** (external)
- Proxies requests to external services with credential injection
- Has an SDK at `@autumnsgrove/lattice/warden` that auto-detects auth mode

The comparison table in the spec:

| Aspect | Lumen | Warden |
|--------|-------|--------|
| Purpose | AI model inference | External API proxy |
| Consumer | Grove services | Agents, CLI, **Workers** |
| Auth | Tenant via Heartwood | Dual: binding + HMAC |

**The key insight**: Warden was designed from the start for consumers that live outside the engine. Lumen wasn't. But the same dual-auth, service-binding pattern applies perfectly.

The Warden SDK factory detects the environment:

```typescript
// Service binding available (deployed on Cloudflare)
const warden = createWardenClient({
  WARDEN: env.WARDEN, // Service binding
  WARDEN_API_KEY: env.WARDEN_API_KEY,
});

// External caller (no service binding)
const warden = createWardenClient({
  WARDEN_URL: "https://warden.grove.place",
  WARDEN_AGENT_ID: env.WARDEN_AGENT_ID,
  WARDEN_AGENT_SECRET: env.WARDEN_AGENT_SECRET,
});
```

**Lumen needs this exact same pattern.**

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

#### Phase 1: Lumen Worker (`workers/lumen/`)

Turn Lumen into a standalone Cloudflare Worker that:

- Exposes the full Lumen pipeline via HTTP API (`POST /inference`, `POST /transcribe`, `POST /moderate`, `POST /embed`)
- Owns the AI bindings (`AI`, `OPENROUTER_API_KEY`)
- Shares the D1 database for quota tracking
- Handles tenant authentication (API key or service binding)
- Runs the full pipeline: validation → PII scrub → quota check → route → execute → normalize → log

#### Phase 2: SDK Dual-Mode (`@autumnsgrove/lattice/lumen`)

Update the Lumen SDK to support two modes (following the Warden pattern):

```typescript
// Mode 1: In-process (current behavior, for engine routes)
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

The SDK auto-detects which mode to use based on what's provided.

#### Phase 3: Timeline-Sync Migration

Update the timeline-sync worker to:

- Add `LUMEN` service binding in `wrangler.toml`
- Replace `openrouter.ts` with Lumen SDK calls
- Delete the duplicate AI implementation (~230 lines)
- Gain all pipeline benefits for free

#### Phase 4: Warden Integration

For workers that need to call Lumen from environments without service bindings (external agents, CLI tools), Lumen and Warden need to coordinate:

- Warden handles credential injection for external APIs (GitHub, Tavily, etc.)
- Lumen handles AI inference with its own credential management
- Both use the same dual-auth pattern
- The timeline-sync worker could use Warden for GitHub API calls too (currently uses raw fetch)

### Cross-cutting themes

1. **The library-vs-worker tension**: Lumen is the most mature service that's still a library. All the infrastructure is there — it just needs to be wrapped in a worker shell.

2. **The Warden pattern is the answer**: Dual auth (service binding + HTTP), SDK auto-detection, credential injection. This pattern was already designed for Warden; Lumen needs the same thing.

3. **timeline-sync is the canary**: It's the first worker that needed AI and couldn't get it. There will be more: scheduled moderation, email AI, notification summaries, feed ranking. Every one will hit this same wall.

4. **Shared D1 is the bridge**: All workers already share `grove-engine-db`. The Lumen worker would too. Quota tracking, usage logging, and tenant config all live in D1 and are accessible from any worker with the binding.

### Recommended implementation order

1. **Lumen Worker** — Build the worker, expose the HTTP API, add service bindings
2. **SDK update** — Add dual-mode detection to `createLumenClient`
3. **Timeline-sync migration** — Replace `openrouter.ts` with Lumen SDK
4. **Warden** — Build separately (already spec'd), integrate with Lumen for external callers

---

_The fire dies to embers. The journal is full — 6 stops, the whole landscape mapped. The hollow center needs to become its own thing, reachable from anywhere in the grove, not just from inside the engine's walls. Tomorrow, the animals go to work. But tonight was the drive. And it was glorious._
