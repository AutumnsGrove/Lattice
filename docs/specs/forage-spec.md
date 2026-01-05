---
aliases: []
date created: Friday, May 28th 2025
date modified: Saturday, January 4th 2026
tags:
  - domain-search
  - ai-orchestration
  - cloudflare-workers
  - rdap
type: tech-spec
---

# Forage — Domain Discovery

```
                         .  ·  🔍  ·  .
                      ·                 ·
                    🍄    🍂    🌰    🍄
                   ·                     ·
                  🌿        ~~~        🌿
                   ·    searching     ·
                    🍂               🍂
                      ·  ·  ·  ·  ·
                ─────────────────────────
               ~~~~~~~~ forest floor ~~~~~~~~
               Before you plant, you search.
```

> *Before you can plant, you have to search.*

AI-powered asynchronous domain availability checker that reduces domain hunting from weeks to hours. Orchestrates AI agents to generate, check, and evaluate domain name candidates, producing curated lists of available, affordable options.

**Package:** `forage`
**Repository:** `GroveDomainTool`
**Type:** Python Package / MCP Server / Cloudflare Worker
**Purpose:** AI-powered asynchronous domain availability checker that reduces domain hunting from weeks to hours

---

> Before you can plant, you have to search. AI-powered domain discovery that reduces domain hunting from weeks to hours.

## Agent Instructions (Read First)

**For autonomous agents working on this project overnight:**

1. **Start by exploring** — Before writing code, read the existing `domain_checker.py` (if present) and understand the RDAP flow. Spawn a sub-agent at Haiku level to map the codebase structure first.

2. **Work in phases** — Complete Phase 1 fully before moving to Phase 2. Commit after each meaningful unit of work with descriptive messages.

3. **Test as you go** — Each component should be testable in isolation. Write a simple test before moving on.

4. **Configuration is sacred** — All magic numbers, model names, rate limits, etc. go in `config.py`. Never hardcode.

5. **When stuck** — If a design decision is unclear, document your assumption in a `DECISIONS.md` file and proceed. Don't block.

6. **Commit discipline**:
   - `feat: ...` for new features
   - `fix: ...` for bug fixes
   - `refactor: ...` for restructuring
   - `docs: ...` for documentation
   - `chore: ...` for config/tooling

---

## Overview

Forage is a standalone tool that orchestrates AI agents to generate, check, and evaluate domain name candidates for client consultations. It runs autonomously in the background, producing a curated list of ~25 available, affordable domain options.

**Origin:** Extracted and productized from a successful manual workflow using Claude Code Remote + RDAP checking.

### Core Philosophy

Before you can plant, you have to search. Forage reduces domain hunting from weeks to hours through intelligent AI orchestration and background processing.

## Goals

1. **Reduce domain search time** from 2-3 weeks of manual searching to 1-2 days of background processing
2. **Produce consultation-ready output** — 25 vetted domains with pricing tiers and quality indicators
3. **Handle the "no good results" case gracefully** — generate personalized follow-up questions using failed search data
4. **Be kind to APIs** — configurable rate limiting, parallel-but-respectful querying
5. **Support multiple AI providers** — Claude (primary), Kimi K2 (secondary), with stubs for others

## Non-Goals

- Not a public-facing domain search UI (backend/internal tool only)
- Not a registrar — just checks availability and reports pricing
- Not real-time — designed for async background processing
- Not handling domain purchase — that's manual or a separate integration

## Architecture

### Key Insight

Durable Objects are **free** on Cloudflare (SQLite backend). Each incoming request or alarm resets the 30s CPU limit. We chain work using the Alarm API — no paid Queues needed.

### System Flow

```mermaid
graph TB
    subgraph "Client Intake"
        FE[("SvelteKit Frontend<br/>5-Question Quiz")]
        FE -->|triggers| SEARCH[("Search Job")]
    end

    subgraph "Durable Object (FREE tier)"
        DO[("SearchJob DO")]
        DO -->|alarm chain| BATCH[("Batch Processing<br/>< 30s CPU each")]
        BATCH -->|persist| DB[(("SQLite<br/>Local State"))]
    end

    subgraph "AI Orchestration"
        DRIVER[("Driver Agent<br/>Sonnet/K2")]
        SWARM[("Haiku Swarm<br/>parallel")]
        RDAP[("RDAP Checker<br/>Core")]
    end

    subgraph "Output"
        EMAIL[("Email via Resend")]
        QUIZ[("Follow-up Quiz")]
    end

    FE -->|job created| DO
    DO -->|generate| DRIVER
    DRIVER -->|evaluate| SWARM
    SWARM -->|check| RDAP
    RDAP -->|persist| DB
    DB -->|results| EMAIL
    DB -->|no results| QUIZ
```

### Why Durable Objects Work (Free Tier)

1. **SQLite-backed DOs are free** — No paid plan required
2. **Alarm API** — Set alarms to wake the DO, each alarm resets the 30s CPU timer
3. **Built-in persistence** — State survives between alarms
4. **No external queue needed** — The DO *is* the queue

**Batch flow:**
```
alarm(0s) → batch 1 → save → alarm(+10s) → batch 2 → save → ... → done → email
```

Each batch:
- Generate 50 candidates (AI call, ~5s)
- Evaluate with swarm (parallel AI calls, ~10s)
- Check availability (RDAP, rate-limited, ~5-10s with 10s delays counted as I/O)
- Save results
- Set next alarm or finish

## Core Components

### 1. Domain Checker (Existing)

The `domain_checker.py` script — already built, battle-tested.

**Capabilities:**
- RDAP-based availability checking (no API keys needed)
- IANA bootstrap for TLD → RDAP server mapping
- Returns: status, registrar, expiration, creation date
- Configurable rate limiting (default 0.5s, production 10s)
- JSON or formatted output

**Enhancements Required:**
- Add price lookup integration (Cloudflare API for TLDs they sell)
- Return structured data suitable for D1 insertion
- Add batch ID for tracking which run produced which results

### 2. Orchestration Layer (MCP Server)

The brain that coordinates everything.

**MCP Tools Exposed:**

| Tool | Purpose | Returns |
|------|---------|---------|
| `forage.start_search()` | Kicks off autonomous search | `job_id` |
| `forage.get_status()` | Current batch progress | `batch_num`, `domains_checked`, `candidates_found` |
| `forage.get_results()` | Final curated list | `domains[]`, `pricing_tiers` |
| `forage.generate_followup_quiz()` | Creates personalized quiz | `quiz_questions[]` |
| `forage.resume_search()` | Continues with new context | `new_job_id` |

**Internal Orchestration Logic:**

```python
async def run_search(client_id: str, context: QuizResponses) -> SearchResult:
    """
    Main autonomous loop. Runs up to 6 batches before requesting human input.
    """
    for batch_num in range(1, 7):  # Max 6 batches
        # 1. Driver agent generates 50 domain candidates
        candidates = await driver_agent.generate_candidates(
            context=context,
            previous_results=get_previous_results(client_id),
            batch_num=batch_num
        )
        
        # 2. Spawn Haiku swarm to evaluate candidates in parallel
        evaluations = await haiku_swarm.evaluate(
            candidates=candidates,
            criteria=context.preferences
        )
        
        # 3. Check availability via RDAP (rate-limited)
        availability = await check_domains_batch(
            domains=[e.domain for e in evaluations if e.worth_checking],
            delay=10.0  # Production rate limit
        )
        
        # 4. Persist results
        await persist_batch(client_id, batch_num, evaluations, availability)
        
        # 5. Check if we have enough good results
        good_results = get_good_results(client_id)
        if len(good_results) >= 25:
            return SearchResult(status="complete", domains=good_results[:25])
    
    # Exhausted 6 batches without enough results
    return SearchResult(status="needs_followup", domains=get_good_results(client_id))
```

### 3. Configuration System

**Everything configurable from one file: `config.py`**

```python
"""
Forage configuration

All magic numbers, API keys, model choices, and behavior settings live here.
Environment variables override defaults for deployment flexibility.
"""

import os
from dataclasses import dataclass, field
from typing import Literal

@dataclass
class RateLimitConfig:
    """How fast we hit external APIs"""
    rdap_delay_seconds: float = float(os.getenv("RDAP_DELAY", "10.0"))
    ai_delay_seconds: float = float(os.getenv("AI_DELAY", "0.5"))
    max_concurrent_rdap: int = int(os.getenv("MAX_CONCURRENT_RDAP", "1"))
    max_concurrent_ai: int = int(os.getenv("MAX_CONCURRENT_AI", "12"))

@dataclass  
class SearchConfig:
    """Search behavior"""
    max_batches: int = int(os.getenv("MAX_BATCHES", "6"))
    candidates_per_batch: int = int(os.getenv("CANDIDATES_PER_BATCH", "50"))
    target_good_results: int = int(os.getenv("TARGET_RESULTS", "25"))
    alarm_delay_seconds: int = int(os.getenv("ALARM_DELAY", "10"))

@dataclass
class PricingConfig:
    """Domain price thresholds"""
    bundled_max_cents: int = int(os.getenv("BUNDLED_MAX", "3000"))  # $30
    recommended_max_cents: int = int(os.getenv("RECOMMENDED_MAX", "5000"))  # $50
    premium_flag_above_cents: int = int(os.getenv("PREMIUM_ABOVE", "5000"))

@dataclass
class ModelConfig:
    """AI model selection"""
    driver_provider: Literal["claude", "kimi"] = os.getenv("DRIVER_PROVIDER", "claude")
    driver_model: str = os.getenv("DRIVER_MODEL", "claude-sonnet-4-20250514")
    swarm_provider: Literal["claude", "kimi"] = os.getenv("SWARM_PROVIDER", "claude")
    swarm_model: str = os.getenv("SWARM_MODEL", "claude-haiku-3-20240307")
    parallel_providers: bool = os.getenv("PARALLEL_PROVIDERS", "false").lower() == "true"
    
    # Kimi alternatives
    kimi_driver_model: str = os.getenv("KIMI_DRIVER", "kimi-k2-0528-thinking")
    kimi_swarm_model: str = os.getenv("KIMI_SWARM", "kimi-k2-0528")

@dataclass
class EmailConfig:
    """Resend email settings"""
    from_address: str = os.getenv("EMAIL_FROM", "domains@grove.place")
    resend_api_key: str = os.getenv("RESEND_API_KEY", "")

@dataclass
class Config:
    """Master config — import this"""
    rate_limit: RateLimitConfig = field(default_factory=RateLimitConfig)
    search: SearchConfig = field(default_factory=SearchConfig)
    pricing: PricingConfig = field(default_factory=PricingConfig)
    models: ModelConfig = field(default_factory=ModelConfig)
    email: EmailConfig = field(default_factory=EmailConfig)
    
    # Quick presets
    @classmethod
    def fast_mode(cls) -> "Config":
        """For development/testing — aggressive rate limits"""
        cfg = cls()
        cfg.rate_limit.rdap_delay_seconds = 0.2
        cfg.rate_limit.ai_delay_seconds = 0.1
        cfg.search.alarm_delay_seconds = 1
        return cfg
    
    @classmethod
    def cheap_mode(cls) -> "Config":
        """Minimize AI costs — fewer candidates, Haiku only"""
        cfg = cls()
        cfg.search.candidates_per_batch = 25
        cfg.models.driver_model = "claude-haiku-3-20240307"
        return cfg

# Singleton
config = Config()
```

### 4. AI Agent Configuration

**Driver Agent (Sonnet/Opus):**
- Receives quiz responses + previous batch results
- Generates 50 domain candidates per batch
- Learns from what's been tried (avoids repetition)
- Adjusts strategy based on availability patterns

**Haiku Swarm (12 parallel):**
- Each evaluates ~4 candidates from the batch
- Scores: pronounceability, memorability, brand fit, email-ability
- Flags potential issues (unfortunate spellings, trademark risks)
- Quick yes/no/maybe on "worth checking"

**Prompt context includes:**
- Cloudflare TLD list (what's actually purchasable)
- Price tiers by TLD
- Client's quiz responses
- All previous batch results (what worked, what didn't, why)

### 5. Persistence Layer (SQLite in Durable Object)

Each SearchJob DO has its own SQLite database. No D1 needed — storage is local to the DO.

**Tables:**

```sql
-- Core job tracking (single row per DO instance)
CREATE TABLE search_jobs (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL,
    status TEXT NOT NULL,  -- 'pending', 'running', 'complete', 'needs_followup', 'failed'
    batch_num INTEGER DEFAULT 0,
    quiz_responses TEXT,   -- JSON
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Individual domain results
CREATE TABLE domain_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_num INTEGER NOT NULL,
    domain TEXT NOT NULL,
    tld TEXT NOT NULL,
    status TEXT NOT NULL,  -- 'available', 'registered', 'unknown'
    price_cents INTEGER,
    score REAL,            -- AI evaluation score 0-1
    flags TEXT,            -- JSON: ['premium', 'client_requested']
    evaluation_data TEXT,  -- JSON blob
    created_at TEXT DEFAULT (datetime('now'))
);

-- Markdown artifacts for follow-up quiz generation
CREATE TABLE search_artifacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    batch_num INTEGER NOT NULL,
    artifact_type TEXT NOT NULL,  -- 'batch_report', 'strategy_notes', 'followup_quiz'
    content TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
);
```

### 6. Quiz System

**Aesthetic: Terminal/CLI inspired (like Charm's gum/bubbletea)**

The quiz should feel like a beautifully designed terminal app. Monospace fonts, subtle animations, clean selections. This aesthetic carries through to emails.

**Design principles:**
- Monospace/code font throughout
- Minimal color palette (think Catppuccin or Nord)
- Box-drawing characters for structure
- Subtle cursor blink animations on focus
- No corporate SaaS feel — this is a developer tool aesthetic

**Initial Quiz (5 questions, <60 seconds):**

```
┌─────────────────────────────────────────────────────┐
│                                                     │
│  DOMAIN FINDER                                      │
│  ─────────────                                      │
│                                                     │
│  Let's find your perfect domain.                   │
│  This takes about 60 seconds.                      │
│                                                     │
│  ▸ Business or project name                        │
│    _________________________                        │
│                                                     │
│  ▸ Domain in mind? (optional)                      │
│    _________________________                        │
│                                                     │
│  ▸ Preferred endings                               │
│    ◉ .com (most recognized)                        │
│    ○ .co (modern alternative)                      │
│    ○ .io (tech-focused)                            │
│    ○ .me (personal brand)                          │
│    ◉ Open to anything                              │
│                                                     │
│  ▸ What vibe fits your brand?                      │
│    ○ Professional & trustworthy                    │
│    ● Creative & playful                            │
│    ○ Minimal & modern                              │
│    ○ Bold & memorable                              │
│    ○ Personal & approachable                       │
│                                                     │
│  ▸ Keywords or themes (optional)                   │
│    _________________________                        │
│                                                     │
│           [ FIND MY DOMAIN ]                       │
│                                                     │
└─────────────────────────────────────────────────────┘
```

**Schema:**

```yaml
questions:
  - id: business_name
    type: text
    prompt: "Business or project name"
    required: true
    
  - id: domain_idea
    type: text
    prompt: "Domain in mind?"
    required: false
    placeholder: "e.g., mybusiness.com"
    
  - id: tld_preference
    type: multi_select
    prompt: "Preferred endings"
    options:
      - { value: "com", label: ".com (most recognized)" }
      - { value: "co", label: ".co (modern alternative)" }
      - { value: "io", label: ".io (tech-focused)" }
      - { value: "me", label: ".me (personal brand)" }
      - { value: "any", label: "Open to anything" }
    default: ["com", "any"]
    
  - id: vibe
    type: single_select
    prompt: "What vibe fits your brand?"
    options:
      - { value: "professional", label: "Professional & trustworthy" }
      - { value: "creative", label: "Creative & playful" }
      - { value: "minimal", label: "Minimal & modern" }
      - { value: "bold", label: "Bold & memorable" }
      - { value: "personal", label: "Personal & approachable" }
      
  - id: keywords
    type: text
    prompt: "Keywords or themes"
    required: false
    placeholder: "e.g., nature, tech, local, artisan"
```

**Follow-up Quiz (3 questions, generated dynamically):**

Generated by AI using:
- Original quiz responses
- All failed/rejected domains and why
- Patterns in what's available vs. taken
- Client's stated preferences vs. market reality

Example generated questions:
- "Your top choice [name].com is taken. Would you consider [name]studio.com, get[name].com, or try a different TLD?"
- "We found availability in .co and .io but nothing in .com. Focus there, or is .com essential?"
- "Short names are mostly taken. Would you consider longer, more descriptive options?"

**Email aesthetic (same terminal vibe):**

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│  YOUR DOMAINS ARE READY                             │
│  ──────────────────────                             │
│                                                      │
│  We found 27 available options for "Sunrise Bakery" │
│                                                      │
│  ★ TOP PICKS (bundled, no extra cost)               │
│                                                      │
│    sunrisebakes.co ............... $12/yr           │
│    getbakedsunrise.com ........... $15/yr           │
│    sunrisebakeryatl.com .......... $15/yr           │
│                                                      │
│  ◆ PREMIUM (worth considering)                      │
│                                                      │
│    sunrisebakery.com ............. $89/yr           │
│                                                      │
│  ▸ View all 27 options                              │
│    https://grove.place/domains/abc123              │
│                                                      │
│  ▸ Book a call to finalize                          │
│    https://grove.place/book                         │
│                                                      │
│  ─────────────────────────────────────────────────  │
│  grove.place • domain setup                         │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### 7. Multi-Model Support

**Primary:** Claude (Sonnet driver, Haiku swarm)
**Secondary:** Kimi K2 (can run in parallel for 2x speed)

```python
class ModelProvider(Protocol):
    async def generate(self, prompt: str, **kwargs) -> str: ...
    async def generate_batch(self, prompts: list[str], **kwargs) -> list[str]: ...

class ClaudeProvider(ModelProvider):
    def __init__(self, driver_model: str = "claude-sonnet-4-20250514",
                 swarm_model: str = "claude-haiku-3-20240307"):
        ...

class KimiProvider(ModelProvider):
    def __init__(self, model: str = "kimi-k2-0528-thinking"):
        ...

# Usage: can run both in parallel
providers = [ClaudeProvider(), KimiProvider()]
results = await asyncio.gather(*[p.run_search(context) for p in providers])
merged = merge_and_dedupe(results)
```

## Output Format

**Final deliverable (terminal aesthetic via email and web):**

```
┌──────────────────────────────────────────────────────────────┐
│                                                              │
│  DOMAIN OPTIONS FOR SUNRISE BAKERY                          │
│  ════════════════════════════════                           │
│                                                              │
│  ★ TOP RECOMMENDATIONS                                      │
│    Bundled with your package — no extra cost                │
│                                                              │
│    DOMAIN                      PRICE     NOTES              │
│    ───────────────────────────────────────────────          │
│    sunrisebakes.co             $12/yr    Short, modern      │
│    getbakedsunrise.com         $15/yr    Action-oriented    │
│    sunrisebakeryatl.com        $15/yr    Location-specific  │
│    morningdough.co             $12/yr    Creative wordplay  │
│    riseandbake.com             $15/yr    Memorable phrase   │
│                                                              │
│  ◆ PREMIUM OPTIONS                                          │
│    Worth considering if budget allows                       │
│                                                              │
│    sunrisebakery.com           $89/yr    The gold standard  │
│                                                              │
│  ▸ FULL LIST                                                │
│    25 total options available                               │
│    View all: https://grove.place/d/abc123                   │
│                                                              │
│  ─────────────────────────────────────────────────────────  │
│  Generated by Forage • 2025-XX-XX                         │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

## Rate Limiting Strategy

| Context | Delay | Rationale |
|---------|-------|-----------|
| Development/testing | 0.2s | Fast iteration |
| Single client, urgent | 1.0s | Reasonably fast |
| Background processing | 10.0s | Kind to APIs, no rush |
| Multiple concurrent jobs | 15.0s | Extra cautious |

**Per-TLD rate tracking:**
Some RDAP servers are more aggressive about rate limiting. Track 429 responses and back off per-server.

## Integration Points

**GroveEngine integration:**
- Import as dependency: `from forage import DomainSearchClient`
- Or call MCP server tools directly
- Webhook on completion → triggers email/notification

**SvelteKit frontend:**
- Quiz component (reusable for initial + follow-up)
- Results dashboard (for internal review before sending to client)
- Unique links per client for follow-up quizzes

## File Structure

```
forage/
├── README.md
├── LICENSE                     # MIT
├── pyproject.toml              # UV/pip package config
├── DECISIONS.md                # Design decisions log (for agents)
│
├── src/
│   └── forage/
│       ├── __init__.py
│       ├── config.py           # ALL configuration here
│       ├── checker.py          # Core RDAP checker (existing script)
│       ├── orchestrator.py     # Main search loop logic
│       ├── agents/
│       │   ├── __init__.py
│       │   ├── driver.py       # Sonnet/K2 driver agent
│       │   ├── swarm.py        # Haiku swarm coordinator
│       │   └── prompts.py      # All prompt templates
│       ├── providers/
│       │   ├── __init__.py
│       │   ├── base.py         # ModelProvider protocol
│       │   ├── claude.py       # Anthropic implementation
│       │   └── kimi.py         # Moonshot implementation (stub)
│       ├── quiz/
│       │   ├── __init__.py
│       │   ├── schema.py       # Quiz question definitions
│       │   └── followup.py     # Dynamic quiz generator
│       └── cli.py              # CLI entry point
│
├── worker/
│   ├── src/
│   │   ├── index.ts            # Worker entry point
│   │   ├── durable-object.ts   # SearchJob Durable Object
│   │   ├── types.ts            # TypeScript types
│   │   └── email.ts            # Resend integration
│   ├── wrangler.toml           # Worker config
│   └── package.json
│
├── mcp/
│   ├── server.py               # MCP server implementation
│   └── tools.py                # Tool definitions
│
├── data/
│   └── cloudflare_tlds.json    # TLDs + pricing from Cloudflare
│
├── tests/
│   ├── test_checker.py
│   ├── test_orchestrator.py
│   └── ...
│
└── docs/
    ├── SPEC.md                 # This document
    └── PROMPTS.md              # Prompt engineering notes
```

## Development Phases

### Phase 1: Extraction & Core
- [ ] Extract `domain_checker.py` to standalone package
- [ ] Add Cloudflare pricing lookup
- [ ] Set up pyproject.toml for UV
- [ ] Basic CLI: `forage check example.com`
- [ ] Create `config.py` with all configurable settings

### Phase 2: Durable Object & Persistence
- [ ] Set up Cloudflare Worker with Durable Object
- [ ] Implement SQLite schema in DO
- [ ] Alarm-based batch chaining
- [ ] Basic job lifecycle (create → running → complete/needs_followup)

### Phase 3: AI Orchestration
- [ ] Implement driver agent with prompt templates
- [ ] Implement Haiku swarm parallel evaluation
- [ ] Build main search loop (6 batch limit)
- [ ] Results scoring and ranking

### Phase 4: MCP Server
- [ ] Implement MCP tool definitions
- [ ] Add job status tracking
- [ ] Build results aggregation

### Phase 5: Quiz System
- [ ] Static initial quiz schema (JSON)
- [ ] Follow-up quiz generator (AI-based)
- [ ] SvelteKit quiz components (terminal aesthetic)
- [ ] Resend email integration

### Phase 6: Multi-Model & Polish
- [ ] Add Kimi K2 provider
- [ ] Parallel provider execution
- [ ] Email templates (terminal aesthetic)
- [ ] GroveEngine integration

## License

**MIT License**

This is an internal tool that may be open-sourced. MIT keeps it simple — use it, fork it, modify it.

```
MIT License

Copyright (c) 2025 Autumn Brown

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Resolved Decisions

1. ~~Cloudflare Worker vs. separate server?~~ → **Durable Objects** with Alarm API for chained execution. Free tier compatible.

2. ~~TLDs Cloudflare doesn't sell?~~ → **Exclude for now**. Add TODO for future "available elsewhere" flag.

3. ~~Client notification method?~~ → **Email via Resend** from domains@grove.place (or similar).

## Open Questions

1. **Pricing data freshness?** Cloudflare TLD prices don't change often, but should we fetch live or use cached JSON?

2. **Follow-up quiz expiration?** Should unique links expire after X days?

3. **Concurrent job limits?** How many searches can run in parallel per account before we hit DO limits?

## Future TODOs (Not MVP)

- [ ] Support TLDs from other registrars (Namecheap, Porkbun) with "available elsewhere" flag
- [ ] SMS notifications via Twilio
- [ ] Webhook on completion for custom integrations
- [ ] Dashboard for viewing all active/completed searches
- [ ] Domain purchase integration (auto-buy from results)
- [ ] A/B testing different prompt strategies
- [ ] Analytics on which domain patterns succeed most often

---

*Last updated: 2025-05-28*
*Author: Autumn Brown (@autumnsgrove)*
