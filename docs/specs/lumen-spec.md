---
title: Lumen — AI Gateway
description: Unified AI routing layer with task-based provider selection and observability
category: specs
specCategory: operations
icon: lamp-ceiling
lastUpdated: "2026-01-29"
aliases: []
tags:
  - ai-integration
  - infrastructure
  - cloudflare-workers
  - openrouter
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

> _Light from the void._

Grove's unified AI gateway. Every AI request passes through this hollow center: Wisp's writing assistance, Thorn's content moderation, Timeline's summaries, Fireside's conversations. One interface. Intelligent routing. The void through which intelligence flows.

**Public Name:** Lumen
**Internal Name:** GroveLumen
**Domain:** _(internal service)_
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
	headers: { Authorization: `Bearer ${OPENROUTER_KEY}` },
	body: JSON.stringify({ model: "deepseek/deepseek-chat", messages }),
});

// After: One call, intelligent routing
const response = await Lumen.inference({
	task: "moderation",
	input: userContent,
	tenant: tenantId,
});
```

**One sentence:** _"Grove talks to AI through Lumen."_

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
│  │   task: "moderation"  → GPT-oss Safeguard 20B (OpenRouter)             │  │
│  │   task: "generation"  → DeepSeek v3.2 (OpenRouter)                     │  │
│  │   task: "summary"     → DeepSeek v3.2 (OpenRouter)                     │  │
│  │   task: "embedding"   → BGE-M3 (OpenRouter)                            │  │
│  │   task: "chat"        → DeepSeek v3.2 (OpenRouter)                     │  │
│  │   task: "image"       → Gemini 2.5 Flash (OpenRouter)                  │  │
│  │   task: "code"        → DeepSeek v3.2 (OpenRouter)                     │  │
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
│                                                                              │
│  ┌──────────────────────────────────┐  ┌──────────────────────────────────┐  │
│  │           OpenRouter             │  │      Cloudflare Workers AI       │  │
│  │          (Primary)               │  │          (Fallback)              │  │
│  │                                  │  │                                  │  │
│  │  GPT-oss Safeg.   Kimi K2        │  │  LlamaGuard 3    ShieldGemma     │  │
│  │  DeepSeek v3.2    Gemini Flash   │  │  BGE Base                        │  │
│  │  LlamaGuard 4     Claude Haiku   │  │                                  │  │
│  │  BGE-M3           Qwen3 Embed    │  │                                  │  │
│  └──────────────────────────────────┘  └──────────────────────────────────┘  │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Task Types & Routing

Lumen routes requests based on task type, selecting the optimal model for each job.

### Task Registry

| Task            | Primary Model          | Provider      | Fallback Chain                       | Use Case              |
| --------------- | ---------------------- | ------------- | ------------------------------------ | --------------------- |
| `moderation`    | GPT-oss Safeguard 20B  | OpenRouter    | LlamaGuard 4 12B → DeepSeek V3.2      | Content safety checks |
| `generation`    | DeepSeek v3.2          | OpenRouter    | Kimi K2 → Llama 3.3 70B              | Long-form writing     |
| `summary`       | DeepSeek v3.2          | OpenRouter    | Kimi K2 → Llama 3.3 70B              | Summarization         |
| `embedding`     | BGE-M3                 | OpenRouter    | Qwen3 Embed → BGE Base (CF)          | Vector embeddings     |
| `chat`          | DeepSeek v3.2          | OpenRouter    | Kimi K2 → Llama 3.3 70B              | Conversational        |
| `image`         | Gemini 2.5 Flash       | OpenRouter    | Claude Haiku 4.5                     | Image analysis        |
| `code`          | DeepSeek v3.2          | OpenRouter    | Claude Haiku 4.5 → Kimi K2           | Code generation       |
| `transcription` | Whisper Large v3 Turbo | Cloudflare AI | Whisper → Whisper Tiny EN            | Voice-to-text         |

### Why This Routing?

**Moderation (GPT-oss Safeguard 20B):**
GPT-oss Safeguard 20B is OpenAI's purpose-built safety reasoning model (Apache 2.0). It interprets Grove's moderation policy at inference time via chain-of-thought reasoning, returning real confidence scores and audit-ready reasoning traces. LlamaGuard 4 12B serves as first fallback (fast binary classifier), with DeepSeek V3.2 as a general-purpose last resort. All three models route through OpenRouter.

**Generation/Chat/Summary (DeepSeek v3.2):**
DeepSeek v3.2 offers excellent quality at $0.25/$0.38 per million tokens. Kimi K2 provides strong reasoning as first fallback, with Llama 3.3 70B as a reliable tertiary option. All via OpenRouter for unified access.

**Embeddings (BGE-M3):**
BGE-M3 on OpenRouter provides high-quality multilingual embeddings at $0.02/M tokens. Qwen3 Embed offers a solid fallback, with CF Workers AI's BGE Base as a free last resort.

**Image Analysis (Gemini 2.5 Flash):**
Gemini 2.5 Flash offers excellent vision capabilities at just $0.15/$0.60 per million tokens. That's ~6x cheaper than Claude Haiku while delivering comparable quality. Claude Haiku 4.5 serves as premium fallback if needed.

**Code (DeepSeek v3.2):**
DeepSeek excels at code generation. Claude Haiku provides a quality fallback for complex cases, with Kimi K2's reasoning capabilities as tertiary.

**Transcription (Whisper Large v3 Turbo):**
Cloudflare Workers AI provides Whisper models at zero cost. The turbo variant offers fast, accurate transcription for voice input. Fallback to standard Whisper, then Whisper Tiny EN for resilience. All transcription stays on Cloudflare's edge network.

---

## API Design

### Core Interface

```typescript
interface LumenRequest {
	task: TaskType;
	input: string | Message[];
	tenant?: string;
	options?: {
		model?: string; // Override default model
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
	| "code"
	| "transcription";
```

### Usage Examples

```typescript
import { Lumen } from "@autumnsgrove/lattice/lumen";

// Content moderation (Thorn)
const safety = await Lumen.inference({
	task: "moderation",
	input: userSubmittedContent,
	tenant: "autumn",
});

if (!safety.content.includes("safe")) {
	throw new Error("Content flagged for review");
}

// Writing assistance (Wisp)
const suggestions = await Lumen.inference({
	task: "generation",
	input: [
		{
			role: "system",
			content: "You are a writing assistant. Suggest improvements.",
		},
		{ role: "user", content: draftText },
	],
	tenant: "autumn",
	options: { maxTokens: 500 },
});

// Timeline summary
const summary = await Lumen.inference({
	task: "summary",
	input: `Summarize these commits:\n${commitMessages.join("\n")}`,
	tenant: "autumn",
});

// Embedding for search
const embedding = await Lumen.inference({
	task: "embedding",
	input: "How do I customize my theme?",
});

// Voice transcription (Scribe)
const transcript = await Lumen.transcribe({
	audio: audioData, // Uint8Array
	tenant: "autumn",
	options: { mode: "draft" }, // "raw" or "draft"
});
// transcript.text, transcript.gutterContent (for draft mode)
```

### Streaming Support

```typescript
const stream = await Lumen.inference({
	task: "chat",
	input: messages,
	options: { stream: true },
});

for await (const chunk of stream) {
	process.stdout.write(chunk.content);
}
```

---

## Scribe: Voice Transcription

Lumen handles voice-to-text transcription via Cloudflare Workers AI's Whisper models. Two modes support different use cases.

### Transcription Modes

**Raw Mode** — Direct 1:1 transcription. What you say is what you get.

```typescript
const result = await lumen.transcribe({
	audio: audioData,
	tenant: "autumn",
	options: { mode: "raw" },
});
// result.text = "Hello world, this is exactly what was said."
// result.wordCount = 8
// result.duration = 2.5
```

**Draft Mode** — AI-structured transcription with auto-generated Vines. The raw transcript passes through an LLM that cleans filler words, structures the content, and extracts tangents as gutter content.

```typescript
const result = await lumen.transcribe({
	audio: audioData,
	tenant: "autumn",
	options: { mode: "draft" },
});
// result.text = "Cleaned, structured transcript."
// result.rawTranscript = "Original unstructured transcript with um, uh..."
// result.gutterContent = [{ type: "vine", content: "A tangent", anchor: "word" }]
```

### Transcription Flow

```
┌────────────────────────────────────────────────────────────────────────┐
│                           AUDIO INPUT                                  │
│                        (Uint8Array, max 25MB)                          │
└─────────────────────────────────┬──────────────────────────────────────┘
                                  │
                                  ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     CLOUDFLARE WHISPER                                 │
│                                                                        │
│   Primary: @cf/openai/whisper-large-v3-turbo                           │
│   Fallback: @cf/openai/whisper → @cf/openai/whisper-tiny-en            │
│                                                                        │
│   Output: { text, word_count, words[]?, duration? }                    │
└─────────────────────────────────┬──────────────────────────────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
              mode="raw"                  mode="draft"
                    │                           │
                    ▼                           ▼
           ┌───────────────┐         ┌─────────────────────────┐
           │  PII Scrub    │         │   LLM Structuring       │
           │  Return text  │         │   (DeepSeek v3.2)       │
           └───────────────┘         │                         │
                                     │   - Clean filler words  │
                                     │   - Structure content   │
                                     │   - Extract Vines       │
                                     │                         │
                                     └────────────┬────────────┘
                                                  │
                                                  ▼
                                     ┌─────────────────────────┐
                                     │  PII Scrub              │
                                     │  Return structured text │
                                     │  + gutterContent[]      │
                                     └─────────────────────────┘
```

### Quota Consumption

- **Raw mode:** 1 transcription quota unit
- **Draft mode:** 1 transcription + 1 generation quota unit (two-step process)

### PII Scrubbing

Transcription output passes through the same PII scrubber as other Lumen tasks. Email addresses, phone numbers, and other sensitive patterns are replaced with tokens before returning to the client.

### Browser Integration (Flow Editor)

The VoiceInput component provides a microphone button for the Flow editor:

- Press-and-hold recording (default)
- Toggle mode for accessibility
- Audio level visualization
- Automatic codec detection (webm/opus preferred, mp4 for Safari)
- Keyboard shortcut: `Cmd/Ctrl+Shift+U`

---

## Pre-Processing Pipeline

### PII Scrubbing

Before any request leaves Grove:

```typescript
const scrubbed = await scrubPII(input, {
	patterns: [
		"email", // user@domain.com → [EMAIL]
		"phone", // +1-555-123-4567 → [PHONE]
		"ssn", // 123-45-6789 → [SSN]
		"creditCard", // 4111... → [CARD]
		"ipAddress", // 192.168.1.1 → [IP]
	],
	customPatterns: tenant.piiPatterns, // Per-tenant rules
});
```

### Rate Limiting

Per-tenant and per-task limits:

```typescript
const limits = {
	moderation: { rpm: 1000, daily: 50000 },
	generation: { rpm: 100, daily: 5000 },
	chat: { rpm: 60, daily: 2000 },
	image: { rpm: 10, daily: 100 },
};

// Checked before routing
await rateLimiter.check(tenant, task);
```

### Quota Management

Integrated with Grove's tier system:

| Tier      | Moderation | Generation | Chat      | Image     | Transcription |
| --------- | ---------- | ---------- | --------- | --------- | ------------- |
| Free      | 100/day    | 10/day     | 5/day     | 0         | 10/day        |
| Seedling  | 1,000/day  | 100/day    | 50/day    | 10/day    | 100/day       |
| Sapling   | 5,000/day  | 500/day    | 200/day   | 50/day    | 500/day       |
| Oak       | 20,000/day | 2,000/day  | 1,000/day | 200/day   | 2,000/day     |
| Evergreen | Unlimited  | 10,000/day | 5,000/day | 1,000/day | 10,000/day    |

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
	timestamp: Date.now(),
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

Lumen uses just two providers: OpenRouter as the universal gateway for all primary inference, and Cloudflare Workers AI as a fast, free fallback layer.

### OpenRouter (Primary Provider)

```typescript
const openRouter = {
	baseUrl: "https://openrouter.ai/api/v1",
	apiKey: env.OPENROUTER_API_KEY,
	models: {
		// Generation/Chat/Summary
		generation: "deepseek/deepseek-v3.2",
		chat: "deepseek/deepseek-v3.2",
		summary: "deepseek/deepseek-v3.2",
		// Moderation
		moderation: "openai/gpt-oss-safeguard-20b",
		// Image
		image: "google/gemini-2.5-flash",
		// Code
		code: "deepseek/deepseek-v3.2",
		// Embeddings
		embedding: "baai/bge-m3",
		// Fallback models
		fallback_chat: "moonshotai/kimi-k2-0905",
		fallback_vision: "anthropic/claude-haiku-4.5",
		fallback_embed: "qwen/qwen3-embedding-8b",
	},
	headers: {
		"HTTP-Referer": "https://grove.place",
		"X-Title": "Grove",
	},
};
```

### Workers AI (Fallback Provider)

```typescript
const workersAI = {
	binding: env.AI, // Cloudflare Workers AI binding
	models: {
		moderation: "@cf/meta/llama-guard-3-8b", // CF-local moderation (not in primary cascade)
		moderation_alt: "@hf/google/shieldgemma-2b", // Legacy tertiary (not in primary cascade)
		embedding: "@cf/baai/bge-base-en-v1.5", // Fallback embeddings
	},
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
	generation: [
		{ provider: "openrouter", model: "deepseek/deepseek-v3.2" },
		{ provider: "openrouter", model: "moonshotai/kimi-k2-0905" },
		{ provider: "openrouter", model: "meta-llama/llama-3.3-70b-instruct" },
	],
	moderation: [
		{ provider: "openrouter", model: "openai/gpt-oss-safeguard-20b" },
		{ provider: "openrouter", model: "meta-llama/llama-guard-4-12b" },
		{ provider: "openrouter", model: "deepseek/deepseek-v3.2" },
	],
	image: [
		{ provider: "openrouter", model: "google/gemini-2.5-flash" },
		{ provider: "openrouter", model: "anthropic/claude-haiku-4.5" },
	],
	embedding: [
		{ provider: "openrouter", model: "baai/bge-m3" },
		{ provider: "openrouter", model: "qwen/qwen3-embedding-8b" },
		{ provider: "cloudflare-ai", model: "@cf/baai/bge-base-en-v1.5" },
	],
	transcription: [
		{ provider: "cloudflare-ai", model: "@cf/openai/whisper-large-v3-turbo" },
		{ provider: "cloudflare-ai", model: "@cf/openai/whisper" },
		{ provider: "cloudflare-ai", model: "@cf/openai/whisper-tiny-en" },
	],
};

// If primary fails, try fallbacks in order
for (const { provider, model } of fallbackChains[task]) {
	try {
		return await callProvider(provider, model, input);
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
libs/engine/src/lib/lumen/
├── index.ts              # Public exports & factory
├── types.ts              # Type definitions (includes ScribeMode, GutterItem)
├── client.ts             # LumenClient class (includes transcribe())
├── router.ts             # Task → model routing
├── config.ts             # Task registry & model configs (includes Whisper)
├── errors.ts             # Custom error types
├── providers/
│   ├── index.ts          # Provider factory & registry
│   ├── types.ts          # Provider interface
│   ├── cloudflare-ai.ts  # CF Workers AI (moderation, embeddings, transcription)
│   └── openrouter.ts     # OpenRouter (primary)
├── prompts/
│   └── scribe-draft.ts   # Draft mode LLM structuring prompt
├── pipeline/
│   ├── preprocessor.ts   # PII scrubbing, input validation
│   └── postprocessor.ts  # Response normalization, usage logging
└── quota/
    ├── tracker.ts        # D1-backed usage tracking
    └── limits.ts         # Tier-based daily limits
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

### Per-Million Token Costs (USD)

| Task                    | Model            | Input | Output |
| ----------------------- | ---------------- | ----- | ------ |
| Generation/Chat/Summary | DeepSeek v3.2    | $0.25 | $0.38  |
| Fallback                | Kimi K2          | $0.39 | $1.90  |
| Tertiary                | Llama 3.3 70B    | $0.10 | $0.32  |
| Image                   | Gemini 2.5 Flash | $0.15 | $0.60  |
| Image Fallback          | Claude Haiku 4.5 | $1.00 | $5.00  |
| Moderation              | GPT-oss Safeg.   | $0.075| $0.30  |
| Moderation Fallback     | LlamaGuard 4     | $0.10 | $0.10  |
| Embedding               | BGE-M3           | $0.02 | -      |
| Embedding Fallback      | Qwen3 Embed      | $0.02 | -      |
| CF Workers AI           | All models       | Free  | Free   |

### Cost Comparison: Old vs New

| Task            | Old (Claude Sonnet) | New (Primary) | Savings |
| --------------- | ------------------- | ------------- | ------- |
| Image Analysis  | $3.00/$15.00        | $0.15/$0.60   | ~95%    |
| Code Generation | $3.00/$15.00        | $0.25/$0.38   | ~97%    |
| Generation      | $0.30/$1.00         | $0.25/$0.38   | ~60%    |

### Monthly Estimates (Per Active User)

| Usage Level | Moderation | Generation | Chat      | Image    | Total  |
| ----------- | ---------- | ---------- | --------- | -------- | ------ |
| Light       | 100 calls  | 20 calls   | 10 calls  | 5 calls  | ~$0.02 |
| Medium      | 500 calls  | 100 calls  | 50 calls  | 20 calls | ~$0.10 |
| Heavy       | 2000 calls | 500 calls  | 200 calls | 50 calls | ~$0.40 |

---

## Implementation Checklist

### Phase 1: Foundation

- [ ] Create `libs/engine/src/lib/lumen/` structure
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
- [GPT-oss Safeguard](https://openai.com/index/introducing-gpt-oss-safeguard/)
- [LlamaGuard 4](https://ai.meta.com/research/publications/llama-guard-llm-based-input-output-safeguard-for-human-ai-conversations/)
- [Grove Naming Guide](/docs/philosophy/grove-naming.md)

---

_Light from the void._

**Last updated:** January 2026
**Status:** Implementation Complete (PR #415)
**Author:** Autumn Brown
