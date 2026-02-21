---
title: What is Lumen?
description: The AI gateway that routes every intelligent request through Grove
category: help
section: how-it-works
lastUpdated: '2026-02-01'
keywords:
  - lumen
  - ai gateway
  - ai
  - infrastructure
  - technical
  - how grove works
  - cloudflare
  - openrouter
order: 4
---

# What is Lumen?

You don't need to understand Lumen to use Grove. But if you're curious about how AI features work under the hood, here's the story.

## The short version

Lumen is Grove's AI gateway. Every time Grove needs artificial intelligence (moderating content, suggesting edits, transcribing voice, summarizing text) the request flows through Lumen. It picks the right model for the job, handles rate limiting and quotas, strips sensitive data, and returns the results.

Think of it as a universal translator between Grove and the AI models that power its features.

## The problem it solves

Modern AI infrastructure is fragmented. Different tasks need different models: content moderation works best with specialized safety models, text generation with large language models, embeddings with dedicated embedding models. Each provider has its own API, pricing, rate limits, and quirks.

Without something like Lumen, every Grove feature that uses AI would need to:

- Choose its own model and provider
- Handle its own authentication
- Implement its own rate limiting
- Build its own error handling
- Track its own costs

That's a lot of repeated work. And it makes it hard to change providers, optimize costs, or add new AI capabilities.

Lumen centralizes all of that.

## How it works

When a Grove service needs AI, it makes a simple request to Lumen:

```
Task: moderation
Input: [user's blog post content]
Tenant: autumn
```

Lumen handles the rest:

1. **Routes** the request to the appropriate model (LlamaGuard for moderation)
2. **Scrubs** sensitive data before sending it anywhere
3. **Checks** rate limits and quotas
4. **Executes** the request through Cloudflare AI Gateway
5. **Logs** usage for analytics (without storing content)
6. **Returns** the result in a normalized format

The calling service doesn't need to know which model handled the request, which provider it went to, or how authentication works.

## What this means for you

**AI features just work.** You don't need to configure API keys or choose models. Lumen handles the infrastructure so you can focus on writing.

**Your content stays private.** Lumen scrubs personally identifiable information before sending requests to AI providers. What you write doesn't get stored or used for training.

**Costs stay predictable.** Each tier has AI quotas. Lumen enforces them so you're never surprised by a bill.

**It gets better over time.** When better models become available, the Wayfinder can update Lumen's routing. Your features improve without you doing anything.

## Where Lumen shows up

You won't see "Lumen" in the Grove interface. It's infrastructure. But it powers:

- **Thorn.** Content moderation for comments and community features. Lumen routes these to GPT-oss Safeguard, a purpose-built safety reasoning model.
- **Wisp.** Writing assistance and Fireside mode. When you ask for suggestions or dictate a draft, Lumen handles the generation.
- **Petal.** Image moderation. When you upload photos, Lumen checks them for policy compliance.
- **Scribe.** Voice transcription. When you speak into the editor, Lumen transcribes through Cloudflare's Whisper models.
- **Timeline.** Commit summaries and changelog generation flow through Lumen's summarization routing.

## The technical details

Lumen is a Cloudflare Worker that sits in front of multiple AI providers. The primary provider is OpenRouter, which gives access to GPT-oss Safeguard, LlamaGuard, DeepSeek, Gemini, and other models through a unified API. Cloudflare Workers AI serves as a fallback layer for embeddings and transcription.

Requests route based on task type:

| Task | Primary Model | Use Case |
|------|---------------|----------|
| `moderation` | GPT-oss Safeguard 20B | Content safety checks |
| `generation` | DeepSeek v3.2 | Long-form writing |
| `chat` | DeepSeek v3.2 | Conversational AI |
| `image` | Gemini 2.5 Flash | Image analysis |
| `embedding` | BGE-M3 | Vector search |
| `transcription` | Whisper Large v3 | Voice-to-text |

If the primary model fails, Lumen automatically tries fallback options. GPT-oss Safeguard down? Fall back to LlamaGuard 4, then DeepSeek. All models route through OpenRouter for unified access.

Everything flows through Cloudflare AI Gateway for caching, logging, and analytics.

If you're the type who reads technical specifications, the full architecture is documented in the Lumen specification.

## Why we mention it

Most platforms don't explain their AI infrastructure. Grove does, because transparency matters. You should know:

- What AI models touch your content
- That your data isn't being stored or trained on
- How costs are controlled
- What happens when things go wrong

Lumen is the hollow center through which intelligence flows. You'll never interact with it directly. But every AI feature you use passes through it.

---

*Light from the void.*
