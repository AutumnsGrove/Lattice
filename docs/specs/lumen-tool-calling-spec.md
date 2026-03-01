---
title: "Lumen Tool Calling — Structured Output for Agentic Tasks"
description: "Extending Lumen's inference pipeline to support OpenRouter tool calling, enabling Reverie and future agentic features."
category: specs
specCategory: "infrastructure"
icon: wrench
lastUpdated: "2026-03-01"
aliases: []
date created: Saturday, March 1st 2026
date modified: Saturday, March 1st 2026
tags:
  - ai-integration
  - infrastructure
  - tool-calling
  - openrouter
  - reverie
type: tech-spec
---

# Lumen Tool Calling — Structured Output for Agentic Tasks

```
                    ╭─────────────────────╮
                   ╱                       ╲
                  ╱    ╭───────────────╮    ╲
                 │    ╱     · ✦ · ·    ╲    │
                 │   │    ·       ·      │   │
                 │   │   ·  LUMEN  ·     │   │
                 │   │    ·       ·      │   │
                 │    ╲     · · ✦ ·    ╱    │
                  ╲    ╰───────┬───────╯    ╱
                   ╲           │           ╱
                    ╰──────────┼──────────╯
                         ╱     │     ╲
                        ╱      │      ╲
                       ▼       ▼       ▼
                     🔧      🔧      🔧
                   set_     set_     set_
                   theme    font    accent

          The void learns to reach out and touch.
```

> *The void learns to reach out and touch.*

Lumen currently speaks in content: you ask, it answers with text. Tool calling teaches it to act. Instead of describing what to change, the model returns structured function calls that Reverie (and future agents) can validate and execute. Same pipeline. Same quota tracking. Same Songbird protection. New output shape.

**Spec Type:** Extension to [Lumen Spec](lumen-spec.md)
**First Consumer:** [Reverie](reverie-spec.md) (Natural Language Configuration)
**Status:** Planning
**Last Updated:** March 2026

This is an additive change. Every existing consumer (Wisp, Thorn, Timeline, Fireside, Petal) continues to call `lumen.run()` exactly as before and receives `content: string`. The tool calling path only activates when a caller passes `tools` in the request options.

---

## Overview

### What This Is

An extension to Lumen's inference pipeline that passes OpenRouter-compatible tool definitions to models and returns structured `tool_calls` instead of (or alongside) text content. This enables models to express intent as validated function calls rather than free-form text.

### Why Now

Reverie needs to translate "make my site feel like a midnight library" into concrete API calls across 5-7 configuration domains. Without tool calling, the model returns prose that Reverie must parse with brittle regex. With tool calling, the model returns `set_theme({ themeId: "night-garden" })` directly. The OpenRouter API already supports the `tools` parameter for models that handle it. Lumen just needs to pass it through and handle the response shape.

### Goals

- Add `tools` and `toolChoice` to `LumenRequestOptions`
- Add `toolCalls` to `LumenResponse` (alongside existing `content`)
- Pass tools through OpenRouter provider's `inference()` call
- Handle the response when `choices[0].message.tool_calls` is present
- Track tool-calling usage under existing quota system (same task, same quota)
- Maintain full backward compatibility. Zero changes for existing callers.

### Non-Goals

- Multi-turn tool execution loops (the caller handles follow-up calls)
- Tool result injection (the caller builds the next message with tool results)
- MCP server integration (that's the existing stub in `mcp.ts`, separate concern)
- Streaming tool calls (complex, deferred to a future extension)

---

## Architecture

### Current Flow (Content Only)

```
Caller → lumen.run({ task, input })
           │
           ▼
    Preprocess → Quota → Songbird → Router → OpenRouter
                                                  │
                                                  ▼
                                        { content: "Here's what..." }
                                                  │
                                                  ▼
                                        Postprocess → Response
                                                  │
                                                  ▼
                                   { content: "Here's what..." }
```

### New Flow (Tool Calling)

```
Caller → lumen.run({ task, input, options: { tools, toolChoice } })
           │
           ▼
    Preprocess → Quota → Songbird → Router → OpenRouter
                                                  │
                                        (tools passed in request body)
                                                  │
                                                  ▼
                                        { tool_calls: [...] }
                                           or
                                        { content: "..." }
                                           or
                                        { content: "...", tool_calls: [...] }
                                                  │
                                                  ▼
                                        Postprocess → Response
                                                  │
                                                  ▼
                              { content: "...", toolCalls: [...] }
```

The key difference: the OpenRouter request body gains a `tools` array and optional `tool_choice` field. The response may contain `tool_calls` instead of (or in addition to) `content`.

---

## Type Changes

### New Types in `types.ts`

```typescript
// =============================================================================
// TOOL CALLING TYPES
// =============================================================================

/**
 * Tool definition following the OpenAI/OpenRouter function calling spec.
 * These are passed directly to the model to describe available actions.
 */
export interface LumenToolDefinition {
  /** Always "function" for now */
  type: "function";

  /** Function specification */
  function: {
    /** Tool name (alphanumeric + underscores, max 64 chars) */
    name: string;

    /** Human description for the model */
    description: string;

    /** JSON Schema for the function parameters */
    parameters: Record<string, unknown>;

    /**
     * Whether the model must always provide every parameter.
     * When true, all parameters in the schema are treated as required.
     * Default: false
     */
    strict?: boolean;
  };
}

/**
 * Controls how the model uses the provided tools.
 *
 * - "auto": Model decides whether to call tools or respond with text
 * - "required": Model must call at least one tool
 * - "none": Model must respond with text only (tools visible but not callable)
 * - { type: "function", function: { name: "..." } }: Force a specific tool
 */
export type LumenToolChoice =
  | "auto"
  | "required"
  | "none"
  | { type: "function"; function: { name: string } };

/**
 * A tool call returned by the model.
 * Each call represents one function the model wants to invoke.
 */
export interface LumenToolCall {
  /** Unique ID for this tool call (from the provider) */
  id: string;

  /** Always "function" for now */
  type: "function";

  /** The function to call and its arguments */
  function: {
    /** Tool name (matches a name from the provided tools) */
    name: string;

    /** JSON-encoded arguments string (caller must parse) */
    arguments: string;
  };
}
```

### Changes to `LumenRequestOptions`

```typescript
export interface LumenRequestOptions {
  // ... existing fields unchanged ...

  /**
   * Tool definitions for function calling.
   * When provided, the model may return tool_calls instead of (or with) content.
   * Only supported by OpenRouter provider with compatible models.
   */
  tools?: LumenToolDefinition[];

  /**
   * How the model should use the provided tools.
   * Default: "auto" (model decides)
   */
  toolChoice?: LumenToolChoice;
}
```

### Changes to `LumenResponse`

```typescript
export interface LumenResponse {
  /** Generated content (may be empty string when model only returns tool calls) */
  content: string;

  /**
   * Tool calls returned by the model (only present when tools were provided).
   * Each call includes the function name and JSON-encoded arguments.
   * The caller is responsible for parsing arguments and executing the calls.
   */
  toolCalls?: LumenToolCall[];

  /** Model that was used */
  model: string;

  /** Provider that was used */
  provider: LumenProviderName;

  /** Token usage and cost */
  usage: LumenUsage;

  /** Whether response was served from cache */
  cached: boolean;

  /** Total latency in milliseconds */
  latency: number;
}
```

---

## Provider Changes

### OpenRouter Provider (`openrouter.ts`)

The OpenRouter API follows the OpenAI chat completions spec, which already supports `tools` and `tool_choice`. The changes are minimal.

#### Request Body Changes

```typescript
// Current request body
{
  model,
  messages: this.formatMessages(messages),
  max_tokens: options.maxTokens,
  temperature: options.temperature,
  stream: false,
}

// New request body (when tools provided)
{
  model,
  messages: this.formatMessages(messages),
  max_tokens: options.maxTokens,
  temperature: options.temperature,
  stream: false,
  tools: options.providerOptions?.tools,           // NEW
  tool_choice: options.providerOptions?.toolChoice, // NEW
}
```

#### Response Parsing Changes

```typescript
// Current response type
interface OpenRouterAPIResponse {
  choices?: Array<{
    message?: {
      content?: string;
      role?: string;
    };
    // ...
  }>;
  // ...
}

// Extended response type
interface OpenRouterAPIResponse {
  choices?: Array<{
    message?: {
      content?: string;
      role?: string;
      tool_calls?: Array<{       // NEW
        id: string;
        type: "function";
        function: {
          name: string;
          arguments: string;
        };
      }>;
    };
    // ...
  }>;
  // ...
}
```

#### Provider Response Changes

```typescript
// Current provider response
export interface LumenProviderResponse {
  content: string;
  usage: LumenUsage;
  model: string;
  raw?: unknown;
}

// Extended provider response
export interface LumenProviderResponse {
  content: string;
  usage: LumenUsage;
  model: string;
  raw?: unknown;
  toolCalls?: LumenToolCall[];  // NEW
}
```

#### Implementation in `inference()`

```typescript
async inference(
  model: string,
  messages: LumenMessage[],
  options: LumenInferenceOptions,
): Promise<LumenProviderResponse> {
  // ... existing setup ...

  const body: Record<string, unknown> = {
    model,
    messages: this.formatMessages(messages),
    max_tokens: options.maxTokens,
    temperature: options.temperature,
    stream: false,
  };

  // Pass through tool calling options
  if (options.providerOptions?.tools) {
    body.tools = options.providerOptions.tools;
  }
  if (options.providerOptions?.toolChoice) {
    body.tool_choice = options.providerOptions.toolChoice;
  }

  // ... existing fetch call with body ...

  const content = data.choices?.[0]?.message?.content ?? "";
  const toolCalls = data.choices?.[0]?.message?.tool_calls;   // NEW

  return {
    content,
    usage: { /* ... existing ... */ },
    model: data.model ?? model,
    raw: data,
    toolCalls: toolCalls?.map(tc => ({                        // NEW
      id: tc.id,
      type: tc.type,
      function: {
        name: tc.function.name,
        arguments: tc.function.arguments,
      },
    })),
  };
}
```

### LumenInferenceOptions (`providers/types.ts`)

No structural changes needed. The `providerOptions?: Record<string, unknown>` field already exists and can carry `tools` and `toolChoice`. The OpenRouter provider reads them from there.

### Cloudflare AI Provider

No changes. Cloudflare Workers AI does not support tool calling. If a request with `tools` routes to CF AI (unlikely, since tool-calling tasks should use OpenRouter models), the tools are silently ignored and the model responds with content only.

---

## Client Changes

### `LumenClient.run()` Changes

The main `run()` method in `client.ts` passes tools through to the router.

```typescript
async run(request: LumenRequest, tier?: TierKey): Promise<LumenResponse> {
  // Steps 1-3 unchanged (preprocess, quota, songbird)

  // Step 5: Execute with fallback
  const result = await executeWithFallback(
    request.task,
    preprocessResult.messages,
    this.providers,
    {
      model: request.options?.model,
      maxTokens: request.options?.maxTokens ?? taskConfig.defaultMaxTokens,
      temperature: request.options?.temperature ?? taskConfig.defaultTemperature,
      apiKeyOverride: request.options?.tenantApiKey,
      // NEW: Pass tool definitions through
      tools: request.options?.tools,
      toolChoice: request.options?.toolChoice,
    },
  );

  // Step 6: Normalize response (now includes toolCalls)
  const response = normalizeResponse({
    providerResponse: result.response,
    // ... existing fields ...
  });

  // Step 7: Record usage (unchanged, tool calls still consume tokens)

  return response;
}
```

### Router Changes (`router.ts`)

The `executeWithFallback` function passes `tools` and `toolChoice` via `providerOptions`:

```typescript
export async function executeWithFallback(
  task: LumenTask,
  messages: LumenMessage[],
  providers: ProviderRegistry,
  options: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
    timeoutMs?: number;
    apiKeyOverride?: string;
    tools?: LumenToolDefinition[];         // NEW
    toolChoice?: LumenToolChoice;          // NEW
  } = {},
): Promise<ExecuteResult> {
  // ... existing chain building ...

  for (const { provider: providerName, model } of chain) {
    const provider = providers[providerName];
    if (!provider) continue;

    try {
      const inferenceOptions: LumenInferenceOptions = {
        maxTokens: options.maxTokens ?? config.defaultMaxTokens,
        temperature: options.temperature ?? config.defaultTemperature,
        timeoutMs: options.timeoutMs,
        apiKeyOverride: options.apiKeyOverride,
        providerOptions: {                               // NEW
          ...(options.tools && { tools: options.tools }),
          ...(options.toolChoice && { tool_choice: options.toolChoice }),
        },
      };

      const response = await provider.inference(model, messages, inferenceOptions);
      return { response, provider: providerName, model };
    } catch (err) {
      // ... existing fallback logic ...
    }
  }

  throw new AllProvidersFailedError(task, attempts);
}
```

### Postprocessor Changes (`pipeline/postprocessor.ts`)

The `normalizeResponse` function passes through `toolCalls`:

```typescript
export function normalizeResponse(input: PostprocessInput): LumenResponse {
  return {
    content: input.providerResponse.content,
    toolCalls: input.providerResponse.toolCalls,  // NEW (undefined if not present)
    model: input.model,
    provider: input.provider,
    usage: input.providerResponse.usage,
    cached: input.cached,
    latency: Date.now() - input.startTime,
  };
}
```

---

## Worker Changes

### New Request Schema (`workers/lumen/src/types.ts`)

```typescript
// Tool definition schema (Zod)
const ToolFunctionSchema = z.object({
  name: z.string().min(1).max(64),
  description: z.string().min(1).max(1024),
  parameters: z.record(z.unknown()),
  strict: z.boolean().optional(),
});

const ToolDefinitionSchema = z.object({
  type: z.literal("function"),
  function: ToolFunctionSchema,
});

const ToolChoiceSchema = z.union([
  z.literal("auto"),
  z.literal("required"),
  z.literal("none"),
  z.object({
    type: z.literal("function"),
    function: z.object({ name: z.string() }),
  }),
]);

// Updated InferenceRequestSchema
export const InferenceRequestSchema = z.object({
  task: LumenTaskSchema,
  input: z.union([z.string(), z.array(MessageSchema)]),
  tenant_id: z.string().optional(),
  tier: TierSchema.optional(),
  options: z.object({
    // ... existing fields ...
    tools: z.array(ToolDefinitionSchema).max(128).optional(),  // NEW
    tool_choice: ToolChoiceSchema.optional(),                   // NEW
  }).optional(),
});
```

### Updated Response Shape

```typescript
// Tool call in response
const ToolCallSchema = z.object({
  id: z.string(),
  type: z.literal("function"),
  function: z.object({
    name: z.string(),
    arguments: z.string(),
  }),
});

// Updated inference response data
const InferenceDataSchema = z.object({
  content: z.string(),
  tool_calls: z.array(ToolCallSchema).optional(),  // NEW
  model: z.string(),
  provider: z.string(),
  usage: UsageSchema,
  cached: z.boolean(),
});
```

### Route Handler (`routes/inference.ts`)

The inference route handler passes tools through to the Lumen client:

```typescript
const response = await lumen.run(
  {
    task,
    input,
    tenant: tenant_id,
    options: {
      model: options?.model,
      maxTokens: options?.max_tokens,
      temperature: options?.temperature,
      skipQuota: options?.skip_quota,
      skipPiiScrub: options?.skip_pii_scrub,
      songbird: options?.songbird,
      tenantApiKey: options?.tenant_api_key,
      tools: options?.tools,              // NEW
      toolChoice: options?.tool_choice,   // NEW
      metadata: options?.metadata,
    },
  },
  tier,
);

return c.json<LumenWorkerResponse>({
  success: true,
  data: {
    content: response.content,
    tool_calls: response.toolCalls,    // NEW
    model: response.model,
    provider: response.provider,
    usage: response.usage,
    cached: response.cached,
  },
  meta: {
    task,
    model: response.model,
    provider: response.provider,
    latencyMs: response.latency,
  },
});
```

### RemoteLumenClient (`remote.ts`)

The remote client must pass tools in the POST body and parse tool_calls from the response:

```typescript
async run(request: LumenRequest, tier?: TierKey): Promise<LumenResponse> {
  const body = {
    task: request.task,
    input: request.input,
    tenant_id: request.tenant,
    tier,
    options: {
      // ... existing options ...
      tools: request.options?.tools,
      tool_choice: request.options?.toolChoice,
    },
  };

  const result = await this.post("/inference", body);
  // Zod validates response including optional tool_calls field
  const data = InferenceDataSchema.parse(result.data);

  return {
    content: data.content,
    toolCalls: data.tool_calls,   // NEW
    model: data.model,
    provider: data.provider,
    usage: data.usage,
    cached: data.cached,
    latency: result.meta?.latencyMs ?? 0,
  };
}
```

---

## New Task Types for Reverie

Two new entries in `config.ts` and `quota/limits.ts`.

### Task Registry Additions

```typescript
// In types.ts — extend LumenTask
export type LumenTask =
  | "moderation"
  | "generation"
  | "summary"
  | "embedding"
  | "chat"
  | "image"
  | "code"
  | "transcription"
  | "reverie"          // NEW: fast tool-calling for configuration
  | "reverie-compose"; // NEW: deeper reasoning for aesthetic composition

// In config.ts — add MODELS
export const MODELS = {
  // ... existing models ...

  /** Reverie routing — Liquid LFM2 8B (fast, excellent tool calling) */
  LIQUID_LFM2: "liquid/lfm2-8b-a1b",

  /** Reverie composition — MiniMax M2.5 (strong reasoning + tool calling) */
  MINIMAX_M2_5: "minimax/minimax-m2.5",
} as const;

// In config.ts — add MODEL_COSTS
export const MODEL_COSTS = {
  // ... existing costs ...
  [MODELS.LIQUID_LFM2]: { input: 0.08, output: 0.3 },
  [MODELS.MINIMAX_M2_5]: { input: 0.5, output: 2.0 },
};

// In config.ts — add TASK_REGISTRY entries
export const TASK_REGISTRY = {
  // ... existing tasks ...

  // ─────────────────────────────────────────────────────────────────────────
  // Reverie: Fast Tool Calling (Liquid LFM2 → Kimi K2)
  //
  // Primary: Liquid LFM2 8B — small, fast, excellent structured output
  //   and tool calling. Under $0.10/M input. Perfect for routing
  //   natural language to 1-5 tool calls.
  // Fallback: Kimi K2 — strong tool calling, larger context, more
  //   expensive but reliable.
  //
  // NOTE: DeepSeek V3.2 is explicitly excluded. It performs poorly
  //   on structured tool calling despite excelling at text generation.
  // ─────────────────────────────────────────────────────────────────────────
  reverie: {
    primaryModel: MODELS.LIQUID_LFM2,
    primaryProvider: "openrouter",
    fallbackChain: [
      { provider: "openrouter", model: MODELS.KIMI_K2 },
    ],
    defaultMaxTokens: 1024,
    defaultTemperature: 0.1,
    description: "Configuration tool calling (Reverie)",
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Reverie Compose: Deep Reasoning + Tool Calling (MiniMax M2.5 → Kimi K2)
  //
  // Primary: MiniMax M2.5 — strong reasoning model with good tool
  //   calling support. Used when Reverie needs to interpret ambiguous
  //   requests, compose cross-domain atmospheres, or reason about
  //   aesthetic coherence.
  // Fallback: Kimi K2 — large context, reliable reasoning.
  // ─────────────────────────────────────────────────────────────────────────
  "reverie-compose": {
    primaryModel: MODELS.MINIMAX_M2_5,
    primaryProvider: "openrouter",
    fallbackChain: [
      { provider: "openrouter", model: MODELS.KIMI_K2 },
    ],
    defaultMaxTokens: 2048,
    defaultTemperature: 0.4,
    description: "Aesthetic composition and reasoning (Reverie)",
  },
};
```

### Quota Additions

```typescript
// In quota/limits.ts — extend LUMEN_QUOTAS
export const LUMEN_QUOTAS: Record<TierKey, Record<LumenTask, number>> = {
  free: {
    // ... existing ...
    reverie: 0,
    "reverie-compose": 0,
  },
  seedling: {
    // ... existing ...
    reverie: 20,
    "reverie-compose": 5,
  },
  sapling: {
    // ... existing ...
    reverie: 100,
    "reverie-compose": 25,
  },
  oak: {
    // ... existing ...
    reverie: 500,
    "reverie-compose": 100,
  },
  evergreen: {
    // ... existing ...
    reverie: 2000,
    "reverie-compose": 500,
  },
};
```

---

## Songbird Considerations

Tool-calling requests still pass through Songbird when `options.songbird` is enabled. The user's natural language input is checked before the model sees any tool definitions. This prevents prompt injection from manipulating tool calls.

A new Kestrel context for Reverie tasks:

```typescript
// In songbird.ts — add to TASK_CONTEXTS
const TASK_CONTEXTS: Partial<Record<LumenTask, KestrelContext>> = {
  // ... existing contexts ...

  reverie: {
    contextType: "grove-configuration-agent",
    expectedUseCase: "Natural language site configuration via tool calls",
    expectedPatterns:
      "- Requests to change themes, colors, fonts, cursors, ambient sounds\n"
      + "- Atmosphere keywords (cozy, midnight, garden, retro, etc.)\n"
      + "- Questions about current configuration\n"
      + "- References to specific Grove curios and features",
    relevantPolicies:
      "- Must relate to Grove site configuration\n"
      + "- Cannot request billing changes or account deletion\n"
      + "- Cannot generate code or arbitrary content\n"
      + "- Cannot access other users' configurations",
  },

  "reverie-compose": {
    contextType: "grove-aesthetic-composition",
    expectedUseCase: "Cross-domain aesthetic reasoning for site atmospheres",
    expectedPatterns:
      "- Abstract aesthetic descriptions (midnight library, cozy bookshop)\n"
      + "- Mood and feeling words that need interpretation\n"
      + "- Requests that span multiple configuration domains\n"
      + "- Refinement of existing atmosphere choices",
    relevantPolicies:
      "- Must relate to Grove visual/audio/interactive aesthetics\n"
      + "- Cannot modify content, billing, or infrastructure\n"
      + "- Cannot generate arbitrary text beyond configuration values",
  },
};
```

---

## Quota and Cost Impact

### Per-Request Cost Estimates

| Task | Model | Input Tokens | Output Tokens | Est. Cost |
|------|-------|-------------|---------------|-----------|
| `reverie` | Liquid LFM2 8B | ~800 (prompt + 3-5 tool defs) | ~200 (1-3 tool calls) | ~$0.000124 |
| `reverie-compose` | MiniMax M2.5 | ~1500 (prompt + 5-7 tool defs + atmosphere) | ~400 (reasoning + 3-7 tool calls) | ~$0.001550 |

### Monthly Cost Projection (Per Active User)

| Usage Pattern | reverie calls | compose calls | Monthly Cost |
|---------------|--------------|---------------|-------------|
| Light (Seedling) | 10 | 2 | ~$0.004 |
| Medium (Sapling) | 50 | 10 | ~$0.022 |
| Heavy (Oak) | 200 | 40 | ~$0.087 |
| Power (Evergreen) | 500 | 100 | ~$0.217 |

These costs are well within tier pricing margins.

---

## Testing Strategy

### Unit Tests

```typescript
// openrouter.test.ts additions
describe("tool calling", () => {
  it("passes tools in request body when provided");
  it("parses tool_calls from response");
  it("returns content when model responds with text instead of tools");
  it("handles mixed content + tool_calls response");
  it("returns undefined toolCalls when tools not requested");
  it("handles malformed tool_calls gracefully");
});

// client.test.ts additions
describe("tool calling", () => {
  it("passes tools through to executeWithFallback");
  it("includes toolCalls in normalized response");
  it("records usage for tool-calling requests");
  it("enforces quota for reverie task type");
  it("runs Songbird on tool-calling requests");
});

// router.test.ts additions
describe("tool calling fallback", () => {
  it("retries with fallback model when primary fails");
  it("passes tools to fallback provider");
  it("skips fallback when model explicitly specified");
});
```

### Integration Tests (Worker)

```typescript
// inference.test.ts additions
describe("POST /inference with tools", () => {
  it("validates tool definitions against schema");
  it("rejects tools array exceeding 128 entries");
  it("rejects invalid tool_choice values");
  it("returns tool_calls in response envelope");
  it("returns 400 for tools with non-OpenRouter provider");
});
```

---

## Migration Path

### Step 1: Types and Interfaces

Add new types to `types.ts`. No breaking changes.

### Step 2: Provider

Update `openrouter.ts` response type and `inference()` method. Add tool passthrough.

### Step 3: Router

Update `executeWithFallback()` to accept and pass `tools`/`toolChoice`.

### Step 4: Client

Update `LumenClient.run()` to pass tools through options.

### Step 5: Postprocessor

Update `normalizeResponse()` to include `toolCalls`.

### Step 6: Config

Add `reverie` and `reverie-compose` task entries, model definitions, and costs.

### Step 7: Quotas

Add quota entries for new task types.

### Step 8: Songbird

Add Kestrel contexts for Reverie tasks.

### Step 9: Worker

Update Zod schemas and route handlers in `workers/lumen/`.

### Step 10: Remote Client

Update `RemoteLumenClient` to handle tool_calls in response.

### Step 11: Tests

Add test coverage for all new paths.

---

## Implementation Checklist

### Engine Library (`libs/engine/src/lib/lumen/`)

- [ ] Add `LumenToolDefinition`, `LumenToolChoice`, `LumenToolCall` to `types.ts`
- [ ] Add `tools` and `toolChoice` to `LumenRequestOptions`
- [ ] Add `toolCalls` to `LumenResponse`
- [ ] Add `toolCalls` to `LumenProviderResponse` in `providers/types.ts`
- [ ] Update `OpenRouterAPIResponse` interface in `openrouter.ts`
- [ ] Update `OpenRouterProvider.inference()` to pass tools and parse tool_calls
- [ ] Update `executeWithFallback()` in `router.ts` to accept tools
- [ ] Update `LumenClient.run()` in `client.ts` to pass tools
- [ ] Update `normalizeResponse()` in `postprocessor.ts`
- [ ] Add `LIQUID_LFM2` and `MINIMAX_M2_5` to `MODELS` in `config.ts`
- [ ] Add model costs for new models
- [ ] Add `reverie` and `reverie-compose` to `LumenTask` type
- [ ] Add task registry entries for both Reverie tasks
- [ ] Add quota entries for both Reverie tasks in `limits.ts`
- [ ] Add Songbird Kestrel contexts for Reverie tasks
- [ ] Update barrel exports in `index.ts`
- [ ] Write unit tests for tool calling in OpenRouter provider
- [ ] Write unit tests for tool calling in client
- [ ] Write unit tests for Reverie task routing

### Worker (`workers/lumen/`)

- [ ] Add Zod schemas for tool definitions in `types.ts`
- [ ] Update `InferenceRequestSchema` with tools fields
- [ ] Update inference route handler to pass tools
- [ ] Update response schema to include tool_calls
- [ ] Update `RemoteLumenClient` in `remote.ts`
- [ ] Write integration tests for tool-calling inference

### Documentation

- [ ] Update `lumen-spec.md` with tool calling section
- [ ] Update API examples with tool-calling usage

---

## References

- [Lumen Spec](lumen-spec.md) — base spec this extends
- [Reverie Spec](reverie-spec.md) — first consumer of tool calling
- [OpenRouter API: Tool Use](https://openrouter.ai/docs#tool-use) — provider API reference
- [OpenAI Function Calling](https://platform.openai.com/docs/guides/function-calling) — compatible spec
- [Liquid LFM2](https://openrouter.ai/models/liquid/lfm2-8b-a1b) — primary Reverie model
- [MiniMax M2.5](https://openrouter.ai/models/minimax/minimax-m2.5) — composition model

---

*The void reaches out. A function name. An argument. A change. Light becomes action.*
