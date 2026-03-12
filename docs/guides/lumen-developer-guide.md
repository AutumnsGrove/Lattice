# Lumen Developer Guide

Lumen is Grove's unified AI gateway. Every AI request in the platform, whether it's Wisp generating text, Thorn moderating content, or Reverie interpreting natural language configuration, flows through Lumen. It handles provider routing, fallback chains, quota enforcement, PII scrubbing, and usage tracking in one place.

This guide covers how to work with Lumen day-to-day: making requests, adding new tasks, using tool calling, and debugging failures.

---

## How Lumen Works

Lumen sits between your application code and AI providers (OpenRouter, Cloudflare Workers AI). You describe _what_ you need done (a task like `"generation"` or `"moderation"`), and Lumen picks the right model and provider for that task.

The request pipeline runs in this order:

1. **Validate and preprocess** the request (input validation, PII scrubbing)
2. **Check quota** against the tenant's tier limits
3. **Run Songbird** prompt injection protection (if enabled)
4. **Route** the task to a provider and model based on the task registry
5. **Execute** the request, falling back through the chain if the primary fails
6. **Normalize** the response and record usage

### Three Client Modes

Lumen supports three deployment modes, auto-detected by `createLumenClientAuto()`:

| Mode | When it's used | How it connects |
|------|---------------|----------------|
| Service binding | Worker-to-worker (e.g., Reverie calling Lumen) | `env.LUMEN` fetcher binding, zero-latency internal networking |
| HTTP remote | External callers, CLI, agents | `LUMEN_URL` + `LUMEN_API_KEY` over HTTPS |
| In-process | Engine routes, same-process calls | Direct `OPENROUTER_API_KEY` + `AI` + `DB` bindings |

The factory function in `factory.ts` checks for these in priority order. Most of the time you use `createLumenClientAuto(env)` and let it figure it out.

```typescript
import { createLumenClientAuto } from "@autumnsgrove/lattice/lumen";

const lumen = createLumenClientAuto(platform.env);

const result = await lumen.run({
  task: "generation",
  input: "Write a haiku about aspen trees",
  tenant: "tenant_123",
}, "seedling");
```

---

## Making Requests

### Text Generation / Chat / Summary

All text-based tasks use `lumen.run()`. The `task` field determines which model and settings are used.

```typescript
const response = await lumen.run({
  task: "generation",
  input: "Summarize this article in three sentences",
  tenant: tenantId,
  options: {
    maxTokens: 1024,
    temperature: 0.5,
  },
}, tier);
```

The `input` field accepts either a plain string or an array of `LumenMessage` objects for multi-turn conversations:

```typescript
const response = await lumen.run({
  task: "chat",
  input: [
    { role: "system", content: "You are a helpful writing assistant." },
    { role: "user", content: "Help me rewrite this paragraph." },
  ],
  tenant: tenantId,
}, tier);
```

### Streaming

Use `lumen.stream()` for streaming responses. It returns an async generator:

```typescript
for await (const chunk of lumen.stream({
  task: "chat",
  input: messages,
  tenant: tenantId,
}, tier)) {
  process.stdout.write(chunk.content);
  if (chunk.done) {
    console.log("Usage:", chunk.usage);
  }
}
```

Streaming is only available through the OpenRouter provider.

### Embeddings

```typescript
const result = await lumen.embed({
  input: "Text to embed",
  tenant: tenantId,
}, tier);
// result.embeddings is number[][]
```

### Moderation

```typescript
const result = await lumen.moderate({
  content: userSubmittedContent,
  tenant: tenantId,
}, tier);
// result.safe, result.categories, result.confidence
```

### Transcription

```typescript
const result = await lumen.transcribe({
  audio: audioUint8Array,
  tenant: tenantId,
  options: { mode: "draft" }, // or "raw" for 1:1 transcription
}, tier);
```

Draft mode runs two inference steps: Whisper transcription followed by LLM structuring. It costs two quota units.

---

## The Task and Provider System

### Task Registry

Every task in `LumenTask` maps to a configuration in `TASK_REGISTRY` (defined in `config.ts`). Each entry specifies:

- A primary model and provider
- A fallback chain (tried in order when the primary fails)
- Default `maxTokens` and `temperature`

Here are the current task configurations:

| Task | Primary Model | Primary Provider | Fallback Models |
|------|--------------|-----------------|----------------|
| `generation` | DeepSeek V3.2 | OpenRouter | Kimi K2, Llama 70B |
| `summary` | DeepSeek V3.2 | OpenRouter | Kimi K2, Llama 70B |
| `chat` | DeepSeek V3.2 | OpenRouter | Kimi K2, Llama 70B |
| `code` | DeepSeek V3.2 | OpenRouter | Claude Haiku 4.5, Kimi K2 |
| `image` | Gemini 2.5 Flash | OpenRouter | Claude Haiku 4.5, CF Llama 4 Scout |
| `moderation` | GPT-oss Safeguard 20B | OpenRouter | LlamaGuard 4, DeepSeek V3.2 |
| `embedding` | BGE-M3 | OpenRouter | Qwen3 Embed, CF BGE Base |
| `transcription` | CF Whisper Turbo | Cloudflare AI | CF Whisper, CF Whisper Tiny |
| `reverie` | Liquid LFM-2 | OpenRouter | MiniMax M2.5 |
| `reverie-compose` | Liquid LFM-2 | OpenRouter | MiniMax M2.5 |

### How Fallback Works

When the primary model/provider fails, `executeWithFallback()` in `router.ts` tries each entry in the fallback chain until one succeeds. If all fail, it throws `AllProvidersFailedError` with details of each attempt.

Two situations disable fallback:

1. **Model override**: When the caller sets `options.model`, they chose a specific model. Silently switching to a different one would be unexpected (especially for BYOK users).
2. **Tool calling**: When `options.tools` is provided, tool schemas are model-specific. Falling back to a different model with the same tool definitions is unpredictable.

In both cases, only the primary model is tried.

### Providers

Lumen currently supports two providers:

**OpenRouter** handles most tasks: generation, chat, summary, code, image, moderation, and embeddings. It's the universal gateway with access to 100+ models. The `OpenRouterProvider` class in `providers/openrouter.ts` implements chat completions, streaming, embeddings, and moderation.

**Cloudflare Workers AI** handles transcription (Whisper) and serves as a last-resort fallback for embeddings and moderation. It runs through the `AI` binding (no HTTP calls), so it stays within the Cloudflare network.

### BYOK (Bring Your Own Key)

Tenants can provide their own OpenRouter API key through `options.tenantApiKey`. The request still flows through Lumen's full pipeline (routing, PII scrubbing, logging, normalization) but bills to the tenant's own account. Set `options.skipQuota: true` for BYOK users since they're paying directly.

---

## Tool Calling

Tool calling lets models return structured function calls instead of (or alongside) text content. The primary consumer is Reverie, which uses tool calls to translate natural language like "make my site feel cozy" into concrete API calls.

### Defining Tools

Pass `LumenToolDefinition` objects in `options.tools`:

```typescript
const tools: LumenToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "set_theme",
      description: "Set the site theme",
      parameters: {
        type: "object",
        properties: {
          themeId: { type: "string", description: "Theme identifier" },
        },
        required: ["themeId"],
      },
    },
  },
];

const response = await lumen.run({
  task: "reverie",
  input: [
    { role: "system", content: "You configure Grove sites..." },
    { role: "user", content: "Make my site feel like a midnight library" },
  ],
  tenant: tenantId,
  options: { tools },
}, tier);
```

### Handling Tool Call Responses

When the model returns tool calls, they appear in `response.toolCalls`. The `content` field may be empty.

```typescript
if (response.toolCalls && response.toolCalls.length > 0) {
  for (const call of response.toolCalls) {
    const args = JSON.parse(call.function.arguments);
    console.log(`Call: ${call.function.name}(${JSON.stringify(args)})`);
    // Execute the function, then build the next message if needed
  }
}
```

Each `LumenToolCall` has this shape:

```typescript
interface LumenToolCall {
  id: string;           // Unique ID from the provider
  type: "function";     // Always "function" for now
  function: {
    name: string;       // Matches a name from the tools you provided
    arguments: string;  // JSON-encoded string, you must parse it
  };
}
```

### Tool Choice

Control how the model uses tools with `options.toolChoice`:

| Value | Behavior |
|-------|----------|
| `"auto"` (default) | Model decides whether to call tools or respond with text |
| `"required"` | Model must call at least one tool |
| `"none"` | Tools are visible to the model for context, but it must respond with text |
| `{ type: "function", function: { name: "set_theme" } }` | Force the model to call a specific tool |

### Important: No Fallback with Tools

When tools are provided, the fallback chain is disabled. Tool schemas are model-specific, so trying the same schema on a different model after failure is unreliable. If the primary model fails with tools, you get an error immediately.

---

## Adding a New AI Task

### Step-by-Step

1. **Add to `LumenTask` union** in `libs/engine/src/lib/lumen/types.ts`:

```typescript
export type LumenTask =
  | "moderation"
  | "generation"
  // ... existing tasks
  | "my-new-task";  // Add here
```

2. **Add task config** in `libs/engine/src/lib/lumen/config.ts`. Add an entry to `TASK_REGISTRY`:

```typescript
"my-new-task": {
  primaryModel: MODELS.DEEPSEEK_V3,
  primaryProvider: "openrouter",
  fallbackChain: [
    { provider: "openrouter", model: MODELS.KIMI_K2 },
    { provider: "openrouter", model: MODELS.LLAMA_70B },
  ],
  defaultMaxTokens: 2048,
  defaultTemperature: 0.7,
  description: "What this task does",
},
```

3. **Add quota limits** in `libs/engine/src/lib/lumen/quota/limits.ts`. Add the task to every tier in `LUMEN_QUOTAS`:

```typescript
wanderer: {
  // ... existing tasks
  "my-new-task": 10,
},
seedling: {
  // ... existing tasks
  "my-new-task": 100,
},
// ... repeat for sapling, oak, evergreen
```

4. **Add to worker validation** in `workers/lumen/src/types.ts`. Add your task to `LumenTaskSchema`:

```typescript
export const LumenTaskSchema = z.enum([
  "generation",
  "chat",
  // ... existing tasks
  "my-new-task",
]);
```

5. **Test it**. Call your new task through the client:

```typescript
const response = await lumen.run({
  task: "my-new-task",
  input: "Test input",
  tenant: "test-tenant",
}, "seedling");
```

### Quick Checklist

- [ ] Added to `LumenTask` type union in `types.ts`
- [ ] Added to `TASK_REGISTRY` in `config.ts` with model, provider, and fallback chain
- [ ] Added quota limits for all five tiers in `quota/limits.ts`
- [ ] Added to `LumenTaskSchema` in `workers/lumen/src/types.ts`
- [ ] Tested through `lumen.run()` with the new task name

---

## The Lumen Worker

The Lumen worker (`workers/lumen/`) is a standalone Cloudflare Worker that exposes Lumen's pipeline over HTTP and service bindings. It uses Hono for routing.

### Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/health` | No | Health check, returns binding status |
| `POST` | `/inference` | Yes | Text inference (generation, chat, summary, code, image) |
| `POST` | `/embed` | Yes | Vector embeddings |
| `POST` | `/moderate` | Yes | Content moderation |
| `POST` | `/transcribe` | Yes | Voice-to-text |

Authentication uses the `X-API-Key` header, validated against `env.LUMEN_API_KEY`.

### Request/Response Envelope

All worker responses follow the same envelope:

```typescript
{
  success: boolean;
  data?: { /* route-specific data */ };
  error?: { code: string; message: string };
  meta?: { task: string; model: string; provider: string; latencyMs: number };
}
```

The `RemoteLumenClient` handles this envelope automatically. It validates all responses through Zod schemas at the trust boundary (the "Rootwork" pattern).

---

## Quota System

Quotas are enforced per tenant, per task, per day (resetting at midnight UTC). Each pricing tier has different limits defined in `quota/limits.ts`.

Example limits for the `seedling` tier:

| Task | Daily Limit |
|------|------------|
| `moderation` | 1,000 |
| `generation` | 100 |
| `embedding` | 500 |
| `chat` | 50 |
| `image` | 10 |
| `transcription` | 100 |

When quota is exceeded, Lumen throws `QuotaExceededError` with the error code `QUOTA_EXCEEDED`. The user-facing message tells them it resets at midnight UTC.

Skip quota enforcement with `options.skipQuota: true` for system operations or BYOK users.

---

## Why Things Break

### Common Failure Modes

**`ALL_PROVIDERS_FAILED`**: Every model in the fallback chain failed. This usually means OpenRouter is having an outage, or the API key is invalid. Check the `attempts` array on the error for per-provider details.

**`QUOTA_EXCEEDED`**: The tenant hit their daily limit for this task type. They can wait until midnight UTC, upgrade their tier, or use BYOK to bypass quotas.

**`PROVIDER_TIMEOUT`**: A model took too long to respond. OpenRouter's default timeout is 60 seconds, Cloudflare AI is 30 seconds. The error is marked `retryable: true`.

**`SONGBIRD_REJECTED`**: The input failed prompt injection detection. Check whether the input legitimately triggers Songbird's heuristics or if the detection threshold needs tuning.

**`PROVIDER_ERROR`**: The upstream provider returned an HTTP error. Check `statusCode` on the error. 5xx errors are retryable, 4xx usually aren't. Common causes: model temporarily unavailable on OpenRouter, malformed input, context length exceeded.

**`DISABLED`**: Lumen is disabled (`enabled: false` in config). This can happen if the feature flag is off.

### Debugging Tips

All Lumen errors extend `LumenError` and include a `code` field, an optional `provider` field, and a `retryable` boolean. The `toUserMessage()` method returns a safe string you can show to users.

```typescript
try {
  const result = await lumen.run(request, tier);
} catch (err) {
  if (err instanceof LumenError) {
    console.error(`Lumen ${err.code}:`, err.message);
    if (err.retryable) {
      // Safe to retry
    }
    // err.toUserMessage() for user-facing text
  }
}
```

When debugging provider failures, check the Lumen worker logs. The worker logs infra events with timing and error details.

---

## Key Files

### Engine Library (`libs/engine/src/lib/lumen/`)

| File | Purpose |
|------|---------|
| `types.ts` | All type definitions: `LumenTask`, `LumenRequest`, `LumenResponse`, tool calling types |
| `config.ts` | `TASK_REGISTRY`, `MODELS`, `MODEL_COSTS`, provider configs |
| `client.ts` | `LumenClient` class, the main in-process entry point |
| `remote.ts` | `RemoteLumenClient`, routes through the Lumen worker via HTTP or service binding |
| `factory.ts` | `createLumenClientAuto()`, tri-mode auto-detection |
| `router.ts` | `routeTask()`, `executeWithFallback()`, fallback chain logic |
| `errors.ts` | `LumenError` hierarchy and error codes |
| `index.ts` | Barrel export for `@autumnsgrove/lattice/lumen` |
| `songbird.ts` | Prompt injection protection (3-layer pipeline) |
| `quota/limits.ts` | Tier-based daily quota definitions |
| `quota/tracker.ts` | D1-backed quota enforcement and usage recording |
| `providers/openrouter.ts` | OpenRouter provider: inference, streaming, embeddings, moderation |
| `providers/cloudflare-ai.ts` | Cloudflare Workers AI provider: embeddings, moderation, transcription |
| `providers/types.ts` | `LumenProvider` interface that all providers implement |
| `pipeline/preprocessor.ts` | Input validation, PII scrubbing |
| `pipeline/postprocessor.ts` | Response normalization, usage logging |

### Worker (`workers/lumen/`)

| File | Purpose |
|------|---------|
| `src/index.ts` | Hono app with routes, middleware, error handling |
| `src/types.ts` | Zod schemas for request validation, environment bindings |
| `src/routes/inference.ts` | `POST /inference` handler |
| `src/routes/embed.ts` | `POST /embed` handler |
| `src/routes/moderate.ts` | `POST /moderate` handler |
| `src/routes/transcribe.ts` | `POST /transcribe` handler |
| `src/auth/middleware.ts` | API key authentication middleware |
| `src/lib/client-factory.ts` | Creates `LumenClient` from worker environment |
| `src/lib/rate-limit.ts` | Threshold SDK rate limiting |

### Specs

| File | Purpose |
|------|---------|
| `docs/specs/lumen-spec.md` | Full architecture spec |
| `docs/specs/lumen-tool-calling-spec.md` | Tool calling extension spec |

---

## Updating Models

To swap a model, update the `MODELS` constant in `config.ts`. Model IDs follow the OpenRouter format (`provider/model-name`). Find available models at [openrouter.ai/models](https://openrouter.ai/models).

After changing a model:

1. Update its cost in `MODEL_COSTS` (same file)
2. Update any `TASK_REGISTRY` entries that reference it
3. Test with a simple inference call to confirm routing works

Cloudflare Workers AI models use the `@cf/` prefix and run through the `AI` binding (no API key needed).
