---
title: Wisp — Writing Assistant
description: Ethical AI writing tool that polishes without replacing
category: specs
specCategory: content-community
icon: wind
lastUpdated: "2026-11-26"
aliases: []
tags:
  - writing-assistant
  - ai
  - privacy
  - cloudflare-workers
---

```
         🌲  🌲  🌲
          \   |   /
           \  |  /
             ✨
            ╱ ╲
           ╱   ╲
          ╱  ·  ╲
         ╱   ·   ╲
        ╱    ·    ╲
       ·     ·     ·
         gentle
         guiding
          light
```

> _A helper, not a writer—and sometimes, a good listener_

---

# Wisp: Writing Assistant

> _A helper, not a writer, and sometimes, a good listener._

An ethical AI writing tool that helps users polish their voice without replacing it. Wisp analyzes grammar, tone, and readability but never generates or expands content. Your words, refined, not replaced.

**Public Name:** Wisp
**Internal Name:** GroveWisp
**Target:** Lattice integration
**Last Updated:** April 2026

Like a will-o'-the-wisp in the forest: light, airy, ephemeral. Wisp appears when you need it, offers gentle guidance, and fades when you don't. It never overstays, never overwrites, never replaces your voice. A wisp of help. Nothing more, nothing less.

Wisp is Grove's ethical AI writing tool. It helps you polish your voice without replacing it. It analyzes grammar, tone, and readability, but never generates or expands content. Your words, refined. Not replaced.

---

## Overview

An ethical AI writing tool that helps users polish their voice without replacing it. The assistant analyzes existing content for grammar, tone, and readability - it will **never** generate, expand, or brainstorm content.

**Fireside Mode** extends this philosophy for writers who freeze at the blank page. Through guided conversation, Wisp helps users discover what they want to say, and then organizes _their own words_ into a draft. The fire doesn't tell the story. It just creates the space where stories emerge.

This specification unifies:

- The original AI Writing Assistant design (AutumnsGrove)
- The Content Moderation infrastructure patterns (Lattice)

---

## Core Principles

### AI is a TOOL, Never a Writer

| Allowed                 | Forbidden                    |
| ----------------------- | ---------------------------- |
| Grammar/spelling fixes  | "Write a post about X"       |
| Tone analysis           | "Expand this to 1000 words"  |
| Readability scoring     | Auto-completion              |
| Word choice suggestions | Any full sentence generation |
| Structure feedback      | Content brainstorming        |

### User Agency

- **All features OFF by default** (opt-in only)
- Clear indication when AI is analyzing content
- Transparent about data flow and privacy
- Easy to disable at any time
- User's voice is sacred - we polish, never replace
- **Monthly cost cap: $5.00/user** — usage is automatically halted when the cap is reached (warning shown at 80%)
- **Hourly rate limit: 10 requests/hour** — burst protection separate from the monthly cap

### Privacy First

Following Grove's Content Moderation privacy model:

- Zero Data Retention (ZDR) from inference providers
- Content stripped of metadata before analysis
- Immediate deletion after review completes
- No human surveillance of user content
- Outcome-only retention (scores, not content)

Usage metadata (action, mode, model, token counts, cost) is logged to the `wisp_requests` table for cost tracking and rate-limit enforcement. Content itself is never stored.

---

## Model Strategy

### Primary Model: DeepSeek V3.2

Selected for:

- Open source (MIT license)
- Large parameter count for nuanced understanding
- Hosted by US-based providers with full privacy protections

### Approved Inference Providers

| Provider         | Role     | ZDR Policy              |
| ---------------- | -------- | ----------------------- |
| **Fireworks AI** | Primary  | Default for open models |
| **Cerebras**     | Backup   | Explicit zero retention |
| **Groq**         | Tertiary | Explicit ZDR toggle     |

All providers must meet:

- TLS 1.2+ encryption
- SOC 2 compliance
- No training on user data

### Fallback Cascade

If DeepSeek V3.2 unavailable:

1. Kimi K2-0905
2. Llama 3.3 70B (`meta-llama/llama-3.3-70b-instruct`)

### Prompt Modes (Not Model Swap)

Instead of switching models, users select analysis depth:

| Mode         | Description                             | Token Budget  | Temperature | Use Case       |
| ------------ | --------------------------------------- | ------------- | ----------- | -------------- |
| **Quick**    | Lightweight prompt, essential checks    | ~1,000 output | 0.1         | Fast iteration |
| **Thorough** | Detailed prompt, comprehensive analysis | ~2,500 output | 0.2         | Final polish   |

Same model, different prompt complexity.

---

## Analysis Types

### 1. Grammar Analysis (AI-Powered)

**Request:**

```typescript
interface GrammarRequest {
	content: string;
	mode: "quick" | "thorough";
}
```

**Response:**

```typescript
interface GrammarResult {
	suggestions: Array<{
		original: string; // Text with issue
		suggestion: string; // Proposed fix
		reason: string; // Brief explanation (1 sentence)
		severity: "error" | "warning" | "style";
	}>;
	overallScore: number; // 0-100 clarity score
}
```

**Severity Levels:**

- `error` - Grammar/spelling mistakes
- `warning` - Unclear or confusing phrasing
- `style` - Minor improvements (use sparingly)

### 2. Tone Analysis (AI-Powered)

**Request:**

```typescript
interface ToneRequest {
	content: string;
	context?: {
		title?: string;
		audience?: string; // Free-form; common values: "technical", "casual", "professional"
	};
}
```

**Response:**

```typescript
interface ToneResult {
	analysis: string; // 2-3 sentence summary
	traits: Array<{
		trait: string; // e.g., "formal", "warm", "technical"
		score: number; // 0-100
	}>;
	suggestions: string[]; // Max 3 observations
}
```

### 3. Readability Analysis (Local - No AI)

Calculated entirely client-side or server-side without AI:

```typescript
interface ReadabilityResult {
	fleschKincaid: number; // Grade level (e.g., 8.5)
	readingTime: string; // "5 min read"
	wordCount: number;
	sentenceCount: number;
	sentenceStats: {
		average: number; // Words per sentence
		longest: number;
		shortest: number;
	};
	suggestions: string[]; // Generated from thresholds
}
```

**Why local?** Readability is algorithmic - no AI needed. Saves cost, latency, and privacy concerns.

---

## Fireside Mode

> **Moved.** Fireside is now its own feature with its own spec: **[Fireside — A Good Listener, Not a Ghostwriter](fireside-spec.md)**.

This document described Fireside when Wisp was the centre of Grove's AI. Three things have changed
since, and all three are recorded in the new spec:

- **Lumen is where AI enters the grove.** Wisp and Fireside are siblings on it, not parent and child.
- **Conversations are kept** in the tenant database, so a session can be resumed and a post can
  publish its own transcript. The old "never stored anywhere" promise is deliberately gone.
- **Inference runs on the Wanderer's own key**, so there is no cost cap to enforce here.

Everything in this document about grammar, tone and readability still applies to Wisp, which remains
its own feature.

---

## Smart Content Handling

### Length Limits

| Limit         | Value        | Rationale                          |
| ------------- | ------------ | ---------------------------------- |
| Max content   | 50,000 chars | ~10k words, reasonable post length |
| Target tokens | <5,000 input | Cost efficiency                    |

### Smart Truncation (for long content)

For posts exceeding ~4,000 tokens, capture:

1. Title + metadata
2. Opening section (first ~500 words)
3. Conclusion (last ~300 words)
4. Sampled middle paragraphs

This maintains accuracy for typical issues while controlling costs.

### Markdown Awareness

Strip before analysis:

- Code blocks (`...`)
- Inline code
- Link URLs (keep link text)
- Markdown formatting chars (#, \*, \_, ~)
- List markers

---

## Security

### Prompt Injection Protection

Wisp uses the **Songbird Pattern**: a three-layer defense system against prompt injection attacks:

1. **Canary**: Tripwire detection. Runs a minimal check; if response deviates from expected output, input is poisoned.
2. **Kestrel**: Semantic validation. Verifies input looks like legitimate content for this context.
3. **Robin**: Production response. Only runs after Canary and Kestrel have verified safety.

See: `docs/specs/songbird-pattern.md` for full implementation details.

Together, Canary and Kestrel cost ~$0.0004 per request: negligible insurance against compromised responses.

### Rate Limiting

| Limit             | Value           |
| ----------------- | --------------- |
| Requests per hour | 20 per user     |
| Monthly cost cap  | $5 USD per user |
| Warning threshold | 80% of cap      |

### Authentication

- All endpoints require valid session
- CSRF token validation
- Feature must be explicitly enabled in settings

---

## User Interface

### Panel Design

Side panel with:

- Collapsible/minimizable state
- Content length indicator with warnings
- Mode selector (Quick/Thorough)
- Action buttons (Grammar, Tone, Readability, Full Check)
- Tabbed results display
- One-click fix application
- Usage stats (tokens, cost)

### The Vibes System

ASCII art atmosphere that responds to state:

```
Idle:                    Analyzing:               Success:
   .  *  .    .  *         . * . analyzing . *           *
  .    _    .      .         \  |  /             .    *  /|\   .
     /   \    *  .         -- (o.o) --  thinking    *   / | \    *
    / ~ ~ \  .    .          /  |  \                   /__|__\
   /       \______        ~~~~~~~~~~~~~~~~~       ~~~~/       \~~~~
  ~~~~~~~~~~~~~~~~~~~       words flowing...        all clear
```

Seasonal rotations for idle state:

- Forest morning
- Starry grove
- Mountain vista
- Meadow
- Night grove

### Footer Philosophy

Always visible: **"a helper, not a writer"**

---

## API Design

### Endpoint

```
POST /api/grove/wisp
```

### Request Schema

```typescript
interface WispRequest {
	content: string;
	action: "grammar" | "tone" | "readability" | "all";
	mode?: "quick" | "thorough"; // Default: 'quick'
	context?: {
		title?: string;
		audience?: string;
	};
}
```

### Response Schema

```typescript
interface WispResponse {
	grammar?: GrammarResult;
	tone?: ToneResult;
	readability?: ReadabilityResult;
	meta: {
		tokensUsed: number;
		cost: number;
		model: string;
		provider: string;
		mode: "quick" | "thorough";
	};
}
```

### Error Responses

| Status | Meaning                                        |
| ------ | ---------------------------------------------- |
| 401    | Not authenticated                              |
| 403    | Feature disabled or CSRF invalid               |
| 429    | Rate limit or cost cap exceeded                |
| 400    | Invalid request (content too long, bad action) |
| 503    | AI service unavailable (all providers down)    |

---

## Database Schema

```sql
-- Track Wisp usage
CREATE TABLE IF NOT EXISTS wisp_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  action TEXT NOT NULL,           -- 'grammar', 'tone', 'readability', 'all'
  mode TEXT NOT NULL,             -- 'quick', 'thorough'
  model TEXT NOT NULL,            -- Model used
  provider TEXT NOT NULL,         -- Inference provider
  input_tokens INTEGER,
  output_tokens INTEGER,
  cost REAL,
  post_slug TEXT,                 -- Optional: which post was analyzed
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for rate limiting and usage queries
CREATE INDEX IF NOT EXISTS idx_wisp_user_time
  ON wisp_requests(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wisp_created
  ON wisp_requests(created_at DESC);
```

---

## Implementation Guide (Stubs)

### Phase 1: Infrastructure Setup

```
Files to create/modify:
├── libs/engine/src/lib/config/
│   └── wisp.js                    # Model config, provider URLs, pricing
├── libs/engine/src/lib/server/
│   └── inference-client.js        # Generic inference client (shared with content-mod)
├── libs/engine/src/lib/utils/
│   └── readability.js             # Local readability calculations
```

**Key tasks:**

- [ ] Set up Fireworks AI client with ZDR headers
- [ ] Implement provider fallback logic
- [ ] Port readability algorithm from existing implementation
- [ ] Add syllable counting utility

### Phase 2: API Endpoint

```
Files to create:
├── libs/engine/src/routes/api/grove/
│   └── wisp/
│       └── +server.js             # Main endpoint
```

**Key tasks:**

- [ ] Request validation (auth, CSRF, content length)
- [ ] Rate limiting logic
- [ ] Prompt construction with injection protection
- [ ] Response parsing and error handling
- [ ] Usage logging to database

### Phase 3: UI Component

```
Files to create:
├── libs/engine/src/lib/components/
│   └── WispPanel.svelte           # Main panel component
│   └── WispButton.svelte          # Toolbar integration button
```

**Key tasks:**

- [ ] Panel layout with minimize/expand states
- [ ] ASCII vibes system with state transitions
- [ ] Results display with tabbed interface
- [ ] One-click fix application
- [ ] Keyboard navigation (Escape to minimize)

### Phase 4: Settings Integration

```
Files to modify:
├── libs/engine/src/lib/components/
│   └── SettingsPanel.svelte       # Add Wisp toggle + mode selector
```

**Key tasks:**

- [ ] Enable/disable toggle (Wisp OFF by default)
- [ ] Default mode preference
- [ ] Usage statistics display
- [ ] Clear explanation of data flow and privacy

### Phase 5: Migration

For existing AutumnsGrove implementation:

- [ ] Remove `src/lib/config/ai-models.js`
- [ ] Remove `src/routes/api/ai/writing-assist/`
- [ ] Replace `AIWritingPanel.svelte` with engine's `WispPanel.svelte`
- [ ] Migrate database from `ai_writing_requests` to `wisp_requests`
- [ ] Update any UI references from "AI Writing Assistant" to "Wisp"

---

## Cost Estimates

Using DeepSeek V3.2 via Fireworks AI:

| Usage Level                 | Monthly Requests | Estimated Cost |
| --------------------------- | ---------------- | -------------- |
| Light (10 posts, 3 checks)  | 30               | ~$0.01         |
| Medium (30 posts, 5 checks) | 150              | ~$0.05         |
| Heavy (50 posts, 10 checks) | 500              | ~$0.15         |

_Significantly cheaper than Claude models_

---

## Testing Checklist

### Unit Tests

- [ ] Readability calculation accuracy
- [ ] Syllable counting edge cases
- [ ] Cost calculation
- [ ] JSON response parsing
- [ ] Markdown stripping

### Integration Tests

- [ ] Full analysis flow with mock provider
- [ ] Rate limiting enforcement
- [ ] Provider fallback cascade
- [ ] Settings toggle behavior

### Manual Tests

- [ ] Various content lengths
- [ ] Markdown with code blocks
- [ ] Non-English text handling
- [ ] Error states and recovery
- [ ] Panel UX on mobile

---

## Resolved Questions

1. **Naming:** ✅ **Wisp**: light, airy, ephemeral. Like a will-o'-the-wisp. Internal: `GroveWisp`
2. **Scope:** ✅ Lives at engine level (`libs/engine/`) for all Grove sites
3. **Sharing:** ✅ Yes. Inference client shared with Content Moderation in `src/lib/server/inference-client.js`

---

## References

- [Thorn: Content Moderation](/knowledge/specs/thorn-spec)
- [Grove Naming Guide](https://github.com/AutumnsGrove/Lattice/blob/main/docs/grove-naming.md)

---

_Created: December 2025_
_Naming approved: December 26, 2025_
_Status: Ready for implementation_
