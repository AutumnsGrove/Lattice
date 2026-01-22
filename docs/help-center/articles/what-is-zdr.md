---
title: What is ZDR and Why Does It Matter?
description: >-
  Zero Data Retention: how Grove's AI features process your content without
  storing it
category: help
section: ai-features
lastUpdated: '2026-01-07'
keywords:
  - zdr
  - zero data retention
  - privacy
  - ai
  - wisp
  - thorn
  - petal
  - forage
  - inference
  - data protection
  - image moderation
order: 3
---

# What is ZDR and Why Does It Matter?

When you use AI features on Grove, your words pass through external services. Most AI providers log everything: your prompts, their responses, your data. They might use it to train future models. They might keep it indefinitely.

Grove's AI features work differently. We use Zero Data Retention.

## What ZDR means

Zero Data Retention is exactly what it sounds like. When your content goes to an AI service for processing, nothing gets stored. The service reads it, processes it, responds, and forgets. No logs. No training data. No copies sitting on servers somewhere.

Your words go in. The result comes out. Everything in between vanishes.

## Where Grove uses ZDR

Four Grove features rely on AI processing:

**Wisp** (writing assistant) analyzes your drafts for grammar, tone, and readability. Your post content goes to an inference provider, gets analyzed, and disappears. Only the suggestions come back.

**Thorn** (text content moderation) reviews blog posts and written content against community guidelines. The post content is processed, a decision is made, and the content is deleted. We keep the outcome (pass, flag, or escalate) but never the words themselves.

**Petal** (image content moderation) reviews uploaded images against community guidelines. Your image is processed through vision AI, a decision is made, and the image is deleted. We keep the moderation outcome but never your images.

**Forage** (domain discovery) helps you find available domain names. Your project description gets processed, domain suggestions come back, and your input is gone.

In each case: processing happens, results return, content vanishes.

**One exception:** Petal includes mandatory CSAM (child sexual abuse material) detection as required by federal law. If a CSAM match is detected, we must retain the image hash (a mathematical fingerprint, not the image) and report it to authorities. This is the only case where any data is retained, and it's a legal requirement that applies to all platforms.

## How we enforce it

We only work with inference providers that guarantee zero retention.

**For text processing (Wisp, Thorn, Forage):** Fireworks AI, Cerebras, and Groq. Each has explicit ZDR policies.

**For image processing (Petal):** Together.ai and FAL.ai. Both support ZDR for vision models.

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
- Petal: moderation decision (pass/block), timestamp
- Petal CSAM detection: image hash and metadata **only if a match is found** (legal requirement)
- Forage: nothing beyond the session

We never store your content. The AI sees it, we don't log it, the provider forgets it. The one exception is CSAM detection, where federal law requires us to retain evidence and report to authorities.

## Why this matters

Most AI interactions leave traces. Your questions to ChatGPT might train GPT-5. Your documents in Google Docs might inform Gemini. The terms of service allow it, buried in paragraphs nobody reads.

ZDR is a different contract. Your writing stays yours. It doesn't become training data. It doesn't persist on servers. It doesn't get analyzed by humans reviewing logs.

Grove's AI features help you write and keep the community safe. They don't extract value from your words in the process.

## Verification

For technically-minded users: you can verify our ZDR policies in these specs:

- [Wisp spec](/knowledge/specs/wisp-spec) (Section: Privacy First, Model Strategy)
- [Thorn spec](/knowledge/specs/thorn-spec) (Section: Inference Provider Requirements)
- [Petal spec](/knowledge/specs/petal-spec) (Section: Data Lifecycle, Inference Provider Requirements)
- [Shade spec](/knowledge/specs/shade-spec) (broader privacy protections)

The providers' own documentation confirms their ZDR policies:

**Text processing providers:**
- [Fireworks AI Data Handling](https://docs.fireworks.ai/guides/security_compliance/data_handling)
- [Cerebras Trust Center](https://trust.cerebras.ai/)
- [Groq Data Processing](https://console.groq.com/docs/your-data)

**Image processing providers:**
- [Together.ai Privacy](https://www.together.ai/privacy)
- [FAL.ai Security](https://fal.ai/security)

---

*Your words and images pass through. They don't stay behind.*
