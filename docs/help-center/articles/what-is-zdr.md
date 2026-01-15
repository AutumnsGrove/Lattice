---
title: "What is ZDR and Why Does It Matter?"
slug: what-is-zdr
category: data-and-privacy
order: 3
keywords: [zdr, zero data retention, privacy, ai, wisp, thorn, forage, inference, data protection]
related: [understanding-your-privacy, how-grove-protects-your-content, what-is-grove]
---

# What is ZDR and Why Does It Matter?

When you use AI features on Grove, your words pass through external services. Most AI providers log everything: your prompts, their responses, your data. They might use it to train future models. They might keep it indefinitely.

Grove's AI features work differently. We use Zero Data Retention.

## What ZDR means

Zero Data Retention is exactly what it sounds like. When your content goes to an AI service for processing, nothing gets stored. The service reads it, processes it, responds, and forgets. No logs. No training data. No copies sitting on servers somewhere.

Your words go in. The result comes out. Everything in between vanishes.

## Where Grove uses ZDR

Three Grove features rely on AI processing:

**Wisp** (writing assistant) analyzes your drafts for grammar, tone, and readability. Your post content goes to an inference provider, gets analyzed, and disappears. Only the suggestions come back.

**Thorn** (content moderation) reviews posts against community guidelines. The post content is processed, a decision is made, and the content is deleted. We keep the outcome (pass, flag, or escalate) but never the words themselves.

**Forage** (domain discovery) helps you find available domain names. Your project description gets processed, domain suggestions come back, and your input is gone.

In each case: processing happens, results return, content vanishes.

## How we enforce it

We only work with inference providers that guarantee zero retention. Our approved providers are Fireworks AI, Cerebras, and Groq. Each has explicit ZDR policies.

Before using any provider, we verify:

- No logging of prompts or responses
- No training on community data
- SOC 2 compliance
- US-based processing with encryption in transit

We exclude providers that can't meet these standards. OpenAI, Anthropic's hosted API, and DeepSeek's direct API are all off the table for processing Wanderer content.

## What we do keep

ZDR applies to the AI providers. Grove itself keeps minimal metadata for the features to work:

- Wisp: request timestamp, token usage, cost
- Thorn: moderation decision (pass/flag/escalate), timestamp
- Forage: nothing beyond the session

We never store your content. The AI sees it, we don't log it, the provider forgets it.

## Why this matters

Most AI interactions leave traces. Your questions to ChatGPT might train GPT-5. Your documents in Google Docs might inform Gemini. The terms of service allow it, buried in paragraphs nobody reads.

ZDR is a different contract. Your writing stays yours. It doesn't become training data. It doesn't persist on servers. It doesn't get analyzed by humans reviewing logs.

Grove's AI features help you write and keep the community safe. They don't extract value from your words in the process.

## Verification

For technically-minded users: you can verify our ZDR policies in these specs:

- [Wisp spec](/knowledge/specs/wisp-spec) (Section: Privacy First, Model Strategy)
- [Thorn spec](/knowledge/specs/thorn-spec) (Section: Inference Provider Requirements)
- [Shade spec](/knowledge/specs/shade-spec) (broader privacy protections)

The providers' own documentation confirms their ZDR policies:
- [Fireworks AI Data Handling](https://docs.fireworks.ai/guides/security_compliance/data_handling)
- [Cerebras Trust Center](https://trust.cerebras.ai/)
- [Groq Data Processing](https://console.groq.com/docs/your-data)

---

*Your words pass through. They don't stay behind.*
