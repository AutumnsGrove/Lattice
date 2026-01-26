---
title: What is ZDR and Why Does It Matter?
description: >-
  Zero Data Retention: how Grove's AI features process your content without
  storing it
category: help
section: how-it-works
lastUpdated: '2026-01-26'
keywords:
  - zdr
  - zero data retention
  - privacy
  - ai
  - wisp
  - scribe
  - flow
  - thorn
  - petal
  - forage
  - fireside
  - lumen
  - inference
  - data protection
  - image moderation
  - voice transcription
order: 3
---

# What is ZDR and Why Does It Matter?

When you use AI features on Grove, your words pass through external services. Most AI providers log everything: your prompts, their responses, your data. They might use it to train future models. They might keep it indefinitely.

Grove's AI features work differently. We use Zero Data Retention.

## What ZDR means

Zero Data Retention is exactly what it sounds like. When your content goes to an AI service for processing, nothing gets stored. The service reads it, processes it, responds, and forgets. No logs. No training data. No copies sitting on servers somewhere.

Your words go in. The result comes out. Everything in between vanishes.

## Where Grove uses ZDR

All AI features in Grove route through **Lumen**, our unified AI gateway. Lumen scrubs sensitive data before requests leave Grove, enforces rate limits, and ensures every provider we use meets our ZDR requirements. Here's what that powers:

**Wisp** (writing assistant) analyzes your drafts for grammar, tone, and readability. Your post content goes to an inference provider, gets analyzed, and disappears. Only the suggestions come back.

**Fireside** (conversational drafting) helps you get past the blank page. You talk through your ideas and the AI organizes your own words into a draft. The conversation is processed, the draft is generated, and everything disappears—we only store a simple flag noting that Fireside helped with the post, never the conversation itself. Fireside is powered by Wisp but works as its own distinct mode.

**Scribe** (voice transcription) lets you speak your posts into existence. Your voice is recorded in your browser, sent to Cloudflare's Whisper models for transcription, and the audio is immediately discarded—only the text comes back. In Draft mode, an additional AI step structures your rambling into a clean draft with auto-generated Vines. PII (emails, phone numbers) is automatically scrubbed from the output. We never store your voice recordings.

**Flow** (writing sanctuary) is Grove's immersive Markdown editor where you compose posts. When you use AI features within Flow—like Wisp's grammar checks, Fireside conversations, or Scribe's voice input—those requests route through Lumen with full ZDR. Your drafts live in your browser until you publish; Flow never sends your writing to AI servers without your explicit action.

**Thorn** (text content moderation) reviews blog posts and written content against community guidelines. The post content is processed, a decision is made, and the content is deleted. We keep the outcome (pass, flag, or escalate) but never the words themselves.

**Petal** (image content moderation) reviews uploaded images against community guidelines. Your image is processed through vision AI, a decision is made, and the image is deleted. We keep the moderation outcome but never your images.

**Forage** (domain discovery) helps you find available domain names. Your project description gets processed, domain suggestions come back, and your input is gone.

In each case: processing happens, results return, content vanishes.

**One exception:** Petal includes mandatory CSAM (child sexual abuse material) detection as required by federal law. If a CSAM match is detected, we must retain the image hash (a mathematical fingerprint, not the image) and report it to authorities. This is the only case where any data is retained, and it's a legal requirement that applies to all platforms.

## How we enforce it

All AI requests flow through Lumen, Grove's AI gateway. Lumen strips personally identifiable information before content leaves our servers and routes requests only to providers that guarantee zero retention.

**For text processing (Wisp, Fireside, Flow, Thorn, Forage):** OpenRouter, which enforces ZDR across all models we access through it.

**For voice transcription (Scribe):** Cloudflare Workers AI Whisper models, processed at the edge with no audio retention.

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
- Fireside: only whether a post was drafted with Fireside assistance (a simple flag, not the conversation)
- Scribe: request timestamp, audio duration, tier—never the audio or transcript content
- Flow: request metadata only, no content
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

- [Lumen spec](/knowledge/specs/lumen-spec) (Section: Security Considerations—the AI gateway all features use)
- [Wisp spec](/knowledge/specs/wisp-spec) (Section: Privacy First, Model Strategy, Fireside Data Handling)
- [Scribe spec](/knowledge/specs/scribe-voice-transcription-spec) (Section: Privacy, PII Scrubbing)
- [Flow spec](/knowledge/specs/flow-spec) (Section: Fireside Mode)
- [Thorn spec](/knowledge/specs/thorn-spec) (Section: Inference Provider Requirements)
- [Petal spec](/knowledge/specs/petal-spec) (Section: Data Lifecycle, Inference Provider Requirements)
- [Shade spec](/knowledge/specs/shade-spec) (broader privacy protections)

The providers' own documentation confirms their ZDR policies:

**Text processing:**
- [OpenRouter Data Policy](https://openrouter.ai/privacy) (our gateway for all text AI features)

**Voice transcription:**
- [Cloudflare Workers AI](https://developers.cloudflare.com/workers-ai/models/whisper/) (Whisper models with edge processing)

**Image processing:**
- [Together.ai Privacy](https://www.together.ai/privacy)
- [FAL.ai Security](https://fal.ai/security)

---

*Your words, your voice, your images pass through. They don't stay behind.*
