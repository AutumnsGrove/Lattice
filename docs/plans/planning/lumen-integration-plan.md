# Lumen AI Gateway — Unified Integration Plan

## Summary

Migrate Grove's three independent AI systems (Wisp, Timeline, Petal) to use the Lumen unified gateway. The Lumen foundation (client, providers, quota, pipeline) already exists — this work connects the existing services to it.

**Branch:** `feat/lumen-integration`
**PR Target:** `main`
**Status:** Implemented

---

## Decisions Made

| System | Decision | Rationale |
|--------|----------|-----------|
| **Wisp** | Migrate to OpenRouter via Lumen | Fewer API keys (drop Fireworks/Cerebras/Groq), unified logging |
| **Timeline** | Keep BYOK, route through Lumen | Users keep model choice, gain quota tracking & normalization |
| **Petal** | Classification only via Lumen | CSAM/Layer1 stays separate (legally mandated, can't depend on disableable gateway) |

---

## Phase 1: Lumen Enhancements (Foundation Work)

### 1a. Per-Tenant API Key Support (for Timeline BYOK)

Added `tenantApiKey` option to `LumenRequestOptions` so Timeline can pass the user's own OpenRouter key. The client's `run()` method passes it to the provider instead of the global key.

**Files modified:**
- `packages/engine/src/lib/lumen/types.ts` — Added `tenantApiKey` to `LumenRequestOptions`
- `packages/engine/src/lib/lumen/client.ts` — Pass tenant key to provider when present
- `packages/engine/src/lib/lumen/providers/openrouter.ts` — Accept optional key override
- `packages/engine/src/lib/lumen/providers/types.ts` — Added `apiKeyOverride` to `LumenInferenceOptions`
- `packages/engine/src/lib/lumen/router.ts` — Thread key override through fallback chain

### 1b. Vision/Image Support Enhancement

Added Cloudflare Workers AI vision model support (Llama 4 Scout) and multimodal content part handling.

**Files modified:**
- `packages/engine/src/lib/lumen/providers/cloudflare-ai.ts` — Vision model support with multimodal content
- `packages/engine/src/lib/lumen/config.ts` — Added CF_LLAMA4_SCOUT model, updated image task fallback chain

### 1c. Model Override Skips Fallback Chain

When `options.model` is explicitly set, the router now skips the fallback chain entirely — the user chose a specific model, so trying others on failure would be unexpected.

**Files modified:**
- `packages/engine/src/lib/lumen/router.ts` — `skipFallbacks` logic when model override is present

---

## Phase 2: Wisp Migration

Migrated Wisp from direct Fireworks/Cerebras/Groq calls to Lumen's `generation` task.

**Changes:**
- Replaced `callInference()` with `lumen.run({ task: 'generation', ... })`
- Removed `secrets` object (FIREWORKS_API_KEY, CEREBRAS_API_KEY, GROQ_API_KEY)
- Created `LumenClient` from `platform.env.OPENROUTER_API_KEY` + `platform.env.AI` + `platform.env.DB`
- Kept existing rate limiting (KV-based hourly limit)
- Kept existing monthly cost cap check (wisp_requests table)

**Files modified:**
- `packages/engine/src/routes/api/grove/wisp/+server.ts`
- `packages/engine/src/routes/api/grove/wisp/fireside/+server.ts`

---

## Phase 3: Timeline Migration

Migrated Timeline from direct OpenRouter calls to Lumen's `summary` task with BYOK support.

**Changes:**
- Replaced `callOpenRouter()` with `lumen.run({ task: 'summary', ... })`
- Pass user's API key via `options.tenantApiKey`
- Pass user's model choice via `options.model`
- Kept `validateOpenRouterKey()` and `getOpenRouterModels()` for UI
- Removed `callOpenRouter` and `calculateOpenRouterCost` (dead code)

**Files modified:**
- `packages/engine/src/routes/api/curios/timeline/generate/+server.ts`
- `packages/engine/src/lib/curios/timeline/providers/openrouter.ts`
- `packages/engine/src/lib/curios/timeline/index.ts`
- `packages/engine/src/lib/index.ts`

---

## Phase 4: Petal Classification Migration

Created Lumen-based classification for optional content moderation. CSAM/Layer1 stays on direct vision-client path.

**Files created:**
- `packages/engine/src/lib/server/petal/lumen-classify.ts`

---

## Phase 5: Thorn Scaffolding (Content Moderation)

Created the foundation for Grove's text content moderation system.

**Files created:**
- `packages/engine/src/lib/thorn/index.ts` — Public exports
- `packages/engine/src/lib/thorn/config.ts` — Category/threshold config
- `packages/engine/src/lib/thorn/moderate.ts` — Core moderation function
- `packages/engine/src/lib/thorn/types.ts` — Type definitions

**Package export added:**
- `./thorn` in `packages/engine/package.json`

---

## Phase 6: Cleanup

**Removed:**
- Provider/model sections from `packages/engine/src/lib/config/wisp.ts`
- `callInference()` and provider logic from `packages/engine/src/lib/server/inference-client.ts`
- FIREWORKS/CEREBRAS/GROQ_API_KEY from `app.d.ts` and `env-validation.ts`
- Dead test files (`wisp.test.js`, `inference-client.test.js`)

**Added:**
- `OPENROUTER_API_KEY` to `app.d.ts` type definitions

**Kept:**
- Rate limits, content length, prompt modes in `wisp.ts`
- Utility functions (`secureUserContent`, `smartTruncate`, `stripMarkdown`) in `inference-client.ts`
- `TOGETHER_API_KEY` for Petal CSAM fallback path
