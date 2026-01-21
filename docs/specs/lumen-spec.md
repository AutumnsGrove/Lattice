---
aliases: []
date created: Tuesday, January 21st 2026
date modified: Tuesday, January 21st 2026
tags:
  - ai-integration
  - infrastructure
  - cloudflare-workers
type: tech-spec
---

# Lumen — AI Gateway

```
                    ╭─────────────────────╮
                   ╱                       ╲
                  ╱    ╭───────────────╮    ╲
                 │    ╱                 ╲    │
                 │   │                   │   │
                 │   │     · ✦ · ·       │   │
                 │   │    ·       ·      │   │
                 │   │   ·  LUMEN  ·     │   │
                 │   │    ·       ·      │   │
                 │   │     · · ✦ ·       │   │
                 │   │                   │   │
                 │    ╲                 ╱    │
                  ╲    ╰───────────────╯    ╱
                   ╲                       ╱
                    ╰─────────────────────╯

            The hollow center of a tube.
            The void through which everything flows.
            The darkness that contains illumination.
```

> *Light from the void.*

Grove's unified AI gateway. Every AI request passes through this hollow center: Wisp's writing assistance, Thorn's content moderation, Timeline's summaries, Fireside's conversations. One interface. Intelligent routing. The void through which intelligence flows.

**Public Name:** Lumen
**Internal Name:** GroveLumen
**Domain:** *(internal service)*
**Last Updated:** January 2026

In anatomy, a lumen is the hollow center of a tube: the empty space inside blood vessels, intestines, airways. It's not the wall. It's not the tissue. It's the void through which everything flows. But lumen also means light. The same word for darkness and illumination.

The paradox is the point. The hollow that carries light.

---

## Overview

Lumen is Grove's unified AI gateway: a single interface that routes all AI requests to the appropriate models, handles authentication and rate limiting, scrubs sensitive data, normalizes responses, and logs usage.

**The problem it solves:**
- AI integration scattered across services (Wisp, Thorn, Timeline, Fireside)
- Hardcoded model choices that can't adapt
- No unified rate limiting or quota management
- No consistent PII scrubbing or safety checks
- Overkill models for simple tasks (DeepSeek v3 for basic moderation)

**The solution:**
```typescript
// Before: Scattered, hardcoded
const response = await fetch("https://openrouter.ai/api/v1/chat", {
  headers: { "Authorization": `Bearer ${OPENROUTER_KEY}` },
  body: JSON.stringify({ model: "deepseek/deepseek-chat", messages })
});

// After: One call, intelligent routing
const response = await Lumen.inference({
  task: "moderation",
  input: userContent,
  tenant: tenantId
});
```

**One sentence:** *"Grove talks to AI through Lumen."*

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            GROVE SERVICES                                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │    Wisp     │  │    Thorn    │  │  Timeline   │  │  Fireside   │         │
│  │  (writing)  │  │(moderation) │  │ (summaries) │  │   (chat)    │         │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘         │
└─────────┼────────────────┼────────────────┼────────────────┼────────────────┘
          │                │                │                │
          │     Lumen.inference({ task, input, tenant })     │
          │                │                │                │
          └────────────────┴────────┬───────┴────────────────┘
                                    │
┌───────────────────────────────────┴─────────────────────────────────────────┐
│                           LUMEN (Cloudflare Worker)                          │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │                          Pre-Processing                                │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │  │
│  │  │ PII Scrubber │  │ Rate Limiter │  │ Quota Check  │                  │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘                  │  │
│  └────────────────────────────────┬───────────────────────────────────────┘  │
│                                   │                                          │
│  ┌────────────────────────────────┴───────────────────────────────────────┐  │
│  │                          Task Router                                   │  │
│  │                                                                        │  │
│  │   task: "moderation"  → LlamaGuard 3 (CF Workers AI)                   │  │
│  │   task: "generation"  → DeepSeek v3 (OpenRouter)                       │  │
│  │   task: "summary"     → DeepSeek v3 (OpenRouter)                       │  │
│  │   task: "embedding"   → bge-base (CF Workers AI)                       │  │
│  │   task: "chat"        → Claude/DeepSeek (OpenRouter)                   │  │
│  │   task: "image"       → Claude Sonnet (Anthropic)                      │  │
│  │                                                                        │  │
│  └────────────────────────────────┬───────────────────────────────────────┘  │
│                                   │                                          │
│  ┌────────────────────────────────┴───────────────────────────────────────┐  │
│  │                         Post-Processing                                │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │  │
│  │  │   Normalize  │  │  Add Meta    │  │  Log Usage   │                  │  │
│  │  │   Response   │  │   (model,    │  │  (tenant,    │                  │  │
│  │  │              │  │    tokens)   │  │   tokens)    │                  │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘                  │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │                     Cloudflare AI Gateway                              │  │
│  │        (caching, rate limiting, logging, analytics)                    │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
└───────────────────────────────────┬─────────────────────────────────────────┘
                                    │
┌───────────────────────────────────┴─────────────────────────────────────────┐
│                            AI PROVIDERS                                      │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  Cloudflare │  │ OpenRouter  │  │  Anthropic  │  │  Fireworks  │         │
│  │ Workers AI  │  │             │  │   Direct    │  │             │         │
│  │             │  │             │  │             │  │             │         │
│  │ LlamaGuard  │  │ DeepSeek v3 │  │Claude Sonnet│  │   Llama 3   │         │
│  │ bge-base    │  │ Claude      │  │             │  │             │         │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Task Types & Routing

Lumen routes requests based on task type, selecting the optimal model for each job.

### Task Registry

| Task | Primary Model | Provider | Fallback | Use Case |
|------|--------------|----------|----------|----------|
| `moderation` | LlamaGuard 3 8B | CF Workers AI | ShieldGemma2 | Content safety checks |
| `generation` | DeepSeek v3 | OpenRouter | Claude Sonnet | Long-form writing |
| `summary` | DeepSeek v3 | OpenRouter | Llama 3.3 70B | Summarization |
| `embedding` | bge-base-en-v1.5 | CF Workers AI | - | Vector embeddings |
| `chat` | DeepSeek v3 | OpenRouter | Claude Sonnet | Conversational |
| `image` | Claude Sonnet 4 | Anthropic | - | Image analysis |
| `code` | Claude Sonnet 4 | Anthropic | DeepSeek v3 | Code generation |

### Why This Routing?

**Moderation (LlamaGuard):**
Using DeepSeek v3 for moderation is like hiring a PhD to check IDs at the door. LlamaGuard 3 is purpose-built for content safety, runs on CF Workers AI (fast, cheap), and returns structured safety decisions.

**Generation (DeepSeek v3):**
For long-form writing assistance (Wisp, Fireside), DeepSeek v3 offers excellent quality at a fraction of Claude's cost. OpenRouter provides unified access with automatic failover.

**Image Analysis (Claude):**
Claude Sonnet 4 has best-in-class vision capabilities. For image analysis (descriptions, alt text), it's worth the premium.

---

## API Design

### Core Interface

```typescript
interface LumenRequest {
  task: TaskType;
  input: string | Message[];
  tenant?: string;
  options?: {
    model?: string;        // Override default model
    maxTokens?: number;
    temperature?: number;
    stream?: boolean;
    metadata?: Record<string, string>;
  };
}

interface LumenResponse {
  content: string;
  metadata: {
    model: string;
    provider: string;
    inputTokens: number;
    outputTokens: number;
    latencyMs: number;
    cached: boolean;
  };
}

type TaskType =
  | "moderation"
  | "generation"
  | "summary"
  | "embedding"
  | "chat"
  | "image"
  | "code";
```

### Usage Examples

```typescript
import { Lumen } from "@autumnsgrove/groveengine/lumen";

// Content moderation (Thorn)
const safety = await Lumen.inference({
  task: "moderation",
  input: userSubmittedContent,
  tenant: "autumn"
});

if (!safety.content.includes("safe")) {
  throw new Error("Content flagged for review");
}

// Writing assistance (Wisp)
const suggestions = await Lumen.inference({
  task: "generation",
  input: [
    { role: "system", content: "You are a writing assistant. Suggest improvements." },
    { role: "user", content: draftText }
  ],
  tenant: "autumn",
  options: { maxTokens: 500 }
});

// Timeline summary
const summary = await Lumen.inference({
  task: "summary",
  input: `Summarize these commits:\n${commitMessages.join("\n")}`,
  tenant: "autumn"
});

// Embedding for search
const embedding = await Lumen.inference({
  task: "embedding",
  input: "How do I customize my theme?"
});
```

### Streaming Support

```typescript
const stream = await Lumen.inference({
  task: "chat",
  input: messages,
  options: { stream: true }
});

for await (const chunk of stream) {
  process.stdout.write(chunk.content);
}
```

---

## Pre-Processing Pipeline

### PII Scrubbing

Before any request leaves Grove:

```typescript
const scrubbed = await scrubPII(input, {
  patterns: [
    "email",      // user@domain.com → [EMAIL]
    "phone",      // +1-555-123-4567 → [PHONE]
    "ssn",        // 123-45-6789 → [SSN]
    "creditCard", // 4111... → [CARD]
    "ipAddress",  // 192.168.1.1 → [IP]
  ],
  customPatterns: tenant.piiPatterns // Per-tenant rules
});
```

### Rate Limiting

Per-tenant and per-task limits:

```typescript
const limits = {
  moderation: { rpm: 1000, daily: 50000 },
  generation: { rpm: 100, daily: 5000 },
  chat: { rpm: 60, daily: 2000 },
  image: { rpm: 10, daily: 100 }
};

// Checked before routing
await rateLimiter.check(tenant, task);
```

### Quota Management

Integrated with Grove's tier system:

| Tier | Moderation | Generation | Chat | Image |
|------|------------|------------|------|-------|
| Free | 100/day | 10/day | 5/day | 0 |
| Seedling | 1,000/day | 100/day | 50/day | 10/day |
| Sapling | 5,000/day | 500/day | 200/day | 50/day |
| Oak | 20,000/day | 2,000/day | 1,000/day | 200/day |
| Evergreen | Unlimited | 10,000/day | 5,000/day | 1,000/day |

---

## Post-Processing Pipeline

### Response Normalization

All responses follow a consistent format regardless of provider:

```typescript
// OpenRouter returns
{ choices: [{ message: { content: "..." } }] }

// Anthropic returns
{ content: [{ type: "text", text: "..." }] }

// Workers AI returns
{ response: "..." }

// Lumen normalizes to
{ content: "...", metadata: { ... } }
```

### Usage Logging

Every request is logged (without content) for:
- Tenant usage tracking
- Cost attribution
- Rate limit enforcement
- Analytics (via Rings)

```typescript
await logUsage({
  tenant,
  task,
  model: response.metadata.model,
  inputTokens: response.metadata.inputTokens,
  outputTokens: response.metadata.outputTokens,
  latencyMs: response.metadata.latencyMs,
  cached: response.metadata.cached,
  timestamp: Date.now()
});
```

---

## Cloudflare AI Gateway Integration

Lumen uses Cloudflare AI Gateway as its underlying infrastructure:

```
┌─────────────────────────────────────────────────────────────────┐
│                    Cloudflare AI Gateway                         │
│                                                                  │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│   │   Caching    │  │   Logging    │  │   Analytics  │          │
│   │  (semantic)  │  │  (requests)  │  │   (costs)    │          │
│   └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                  │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│   │Rate Limiting │  │   Fallback   │  │   Retries    │          │
│   │  (provider)  │  │   (chains)   │  │  (auto)      │          │
│   └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**Benefits:**
- **Caching:** Semantic caching reduces redundant calls
- **Logging:** Full request/response logging (redacted)
- **Analytics:** Cost tracking per gateway
- **Rate Limiting:** Provider-level limits (distinct from tenant limits)
- **Fallback:** Automatic failover to backup providers
- **Retries:** Exponential backoff on transient failures

---

## Provider Configuration

### Workers AI (Moderation, Embeddings)

```typescript
const workersAI = {
  binding: env.AI, // Cloudflare Workers AI binding
  models: {
    moderation: "@cf/meta/llama-guard-3-8b",
    embedding: "@cf/baai/bge-base-en-v1.5"
  }
};
```

### OpenRouter (Generation, Chat)

```typescript
const openRouter = {
  baseUrl: "https://openrouter.ai/api/v1",
  apiKey: env.OPENROUTER_API_KEY,
  models: {
    generation: "deepseek/deepseek-chat",
    chat: "deepseek/deepseek-chat",
    summary: "deepseek/deepseek-chat"
  },
  headers: {
    "HTTP-Referer": "https://grove.place",
    "X-Title": "Grove"
  }
};
```

### Anthropic Direct (Image, Code)

```typescript
const anthropic = {
  baseUrl: "https://api.anthropic.com/v1",
  apiKey: env.ANTHROPIC_API_KEY,
  models: {
    image: "claude-sonnet-4-20250514",
    code: "claude-sonnet-4-20250514"
  }
};
```

---

## Error Handling

### Error Types

```typescript
type LumenError =
  | { code: "RATE_LIMITED"; retryAfter: number }
  | { code: "QUOTA_EXCEEDED"; task: TaskType; limit: number }
  | { code: "PROVIDER_ERROR"; provider: string; message: string }
  | { code: "INVALID_TASK"; task: string }
  | { code: "PII_DETECTED"; fields: string[] }
  | { code: "CONTENT_BLOCKED"; reason: string };
```

### Fallback Chain

```typescript
const fallbackChains = {
  generation: ["deepseek/deepseek-chat", "anthropic/claude-sonnet-4", "meta-llama/llama-3.3-70b"],
  moderation: ["@cf/meta/llama-guard-3-8b", "google/shieldgemma-2-2b"],
  chat: ["deepseek/deepseek-chat", "anthropic/claude-sonnet-4"]
};

// If primary fails, try fallbacks in order
for (const model of fallbackChains[task]) {
  try {
    return await callProvider(model, input);
  } catch (e) {
    if (isRetryable(e)) continue;
    throw e;
  }
}
```

---

## Implementation

### File Structure

```
packages/engine/src/lib/lumen/
├── index.ts              # Public exports
├── types.ts              # Type definitions
├── router.ts             # Task → model routing
├── providers/
│   ├── index.ts          # Provider registry
│   ├── workers-ai.ts     # CF Workers AI
│   ├── openrouter.ts     # OpenRouter
│   ├── anthropic.ts      # Anthropic Direct
│   └── fireworks.ts      # Fireworks AI
├── pipeline/
│   ├── pre-process.ts    # PII scrubbing, rate limiting
│   ├── post-process.ts   # Normalization, logging
│   └── scrubber.ts       # PII detection patterns
├── config/
│   ├── tasks.ts          # Task definitions
│   ├── models.ts         # Model configurations
│   └── limits.ts         # Rate/quota limits
└── utils/
    ├── tokens.ts         # Token counting
    └── cache.ts          # Cache key generation
```

### Package Exports

```json
{
  "exports": {
    "./lumen": {
      "types": "./dist/lib/lumen/index.d.ts",
      "import": "./dist/lib/lumen/index.js"
    }
  }
}
```

---

## Security Considerations

1. **No content logging** — Request/response content never stored
2. **PII scrubbing** — Sensitive data removed before external calls
3. **API key isolation** — Keys stored as Cloudflare secrets
4. **Tenant isolation** — Requests scoped to tenant, no cross-tenant access
5. **Rate limiting** — Prevents abuse, protects quotas
6. **Audit trail** — Usage logged (without content) for accountability

---

## Cost Analysis

### Per-Request Costs (Estimated)

| Task | Model | Input (1K tokens) | Output (1K tokens) |
|------|-------|-------------------|-------------------|
| Moderation | LlamaGuard 3 | ~$0.0001 | ~$0.0001 |
| Generation | DeepSeek v3 | ~$0.0003 | ~$0.001 |
| Summary | DeepSeek v3 | ~$0.0003 | ~$0.001 |
| Embedding | bge-base | ~$0.00001 | - |
| Chat | DeepSeek v3 | ~$0.0003 | ~$0.001 |
| Image | Claude Sonnet | ~$0.003 | ~$0.015 |

### Monthly Estimates (Per Active User)

| Usage Level | Moderation | Generation | Chat | Total |
|-------------|------------|------------|------|-------|
| Light | 100 calls | 20 calls | 10 calls | ~$0.05 |
| Medium | 500 calls | 100 calls | 50 calls | ~$0.25 |
| Heavy | 2000 calls | 500 calls | 200 calls | ~$1.00 |

---

## Implementation Checklist

### Phase 1: Foundation
- [ ] Create `packages/engine/src/lib/lumen/` structure
- [ ] Define types and interfaces
- [ ] Implement task router
- [ ] Add Workers AI provider (moderation, embeddings)
- [ ] Add OpenRouter provider (generation, chat)
- [ ] Basic pre-processing (rate limiting)

### Phase 2: Integration
- [ ] Migrate Thorn to use Lumen for moderation
- [ ] Migrate Wisp to use Lumen for generation
- [ ] Migrate Timeline curio to use Lumen for summaries
- [ ] Add PII scrubbing pipeline
- [ ] Add quota management

### Phase 3: Production
- [ ] Add Cloudflare AI Gateway integration
- [ ] Implement fallback chains
- [ ] Add comprehensive error handling
- [ ] Usage logging to Rings
- [ ] Performance monitoring via Vista

### Phase 4: Advanced
- [ ] Streaming support
- [ ] Semantic caching
- [ ] A/B testing for models
- [ ] Custom model overrides per tenant
- [ ] Cost attribution dashboard

---

## References

- [Cloudflare Workers AI](https://developers.cloudflare.com/workers-ai/)
- [Cloudflare AI Gateway](https://developers.cloudflare.com/ai-gateway/)
- [OpenRouter API](https://openrouter.ai/docs)
- [LlamaGuard 3](https://ai.meta.com/research/publications/llama-guard-llm-based-input-output-safeguard-for-human-ai-conversations/)
- [Grove Naming Guide](/docs/philosophy/grove-naming.md)

---

*Light from the void.*

**Last updated:** January 2026
**Status:** Specification Draft
**Author:** Autumn Brown
