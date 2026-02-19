# Shutter

**Web Content Distillation Service**

> _Open. Capture. Close._

---

## Overview

Shutter is a web content distillation layer that sits between LLM agents and raw web pages. It fetches URLs, uses a cheap/fast LLM to extract only the relevant content based on a query, and returns clean, focused results. This serves two purposes:

1. **Token efficiency** — Agents get 200 tokens instead of 20,000
2. **Prompt injection defense** — Raw page content never reaches the driver model; injections never make it past the aperture

## Architecture

```
Driver Agent (Claude, GPT, etc.)
        │
        ▼
┌─────────────────────────────┐
│        Shutter              │
│  ┌─────────────────────┐    │
│  │   Fetch Layer       │    │  ← httpx / Tavily
│  └──────────┬──────────┘    │
│             ▼               │
│  ┌─────────────────────┐    │
│  │   Canary Check      │    │  ← Cheap LLM (PI detection)
│  └──────────┬──────────┘    │
│             ▼               │
│  ┌─────────────────────┐    │
│  │   Full Extraction   │    │  ← Selected model via OpenRouter
│  └──────────┬──────────┘    │
│             ▼               │
│  ┌─────────────────────┐    │
│  │   Response Format   │    │  ← Clean JSON
│  └─────────────────────┘    │
└─────────────────────────────┘
        │
        ▼
   Clean, safe content
```

**Two implementations, same interface:**

|                | Python                          | Cloudflare                 |
| -------------- | ------------------------------- | -------------------------- |
| Offenders list | SQLite (local)                  | D1 (shared)                |
| Rate limiting  | Honor system / local            | Durable Objects            |
| Fetch          | httpx + Tavily                  | fetch + Tavily             |
| LLM            | OpenRouter                      | OpenRouter                 |
| CLI            | `shutter` / `uvx grove-shutter` | `npx @groveengine/shutter` |

## Invocation Patterns

### CLI (Python — primary)

```bash
# After install
shutter "https://example.com/pricing" --query "extract pricing tiers"

# Via uvx (no install required)
uvx grove-shutter "https://example.com/pricing" --query "extract pricing tiers"
```

### CLI (Node.js — after v1.5)

```bash
npx @groveengine/shutter "https://example.com/pricing" --query "extract pricing tiers"
```

### Programmatic (Python)

```python
from grove_shutter import shutter

result = await shutter(
    url="https://example.com/pricing",
    query="extract pricing tiers",
    model="fast",
    max_tokens=500
)
```

### Programmatic (Node.js — after v1.5)

```typescript
import { shutter } from "@groveengine/shutter";

const result = await shutter({
	url: "https://example.com/pricing",
	query: "extract pricing tiers",
	model: "fast",
	maxTokens: 500,
});
```

### HTTP API (after v1.5 — hosted at shutter.grove.place)

```bash
curl -X POST "https://shutter.grove.place/fetch" \
  -H "Authorization: Bearer $SHUTTER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com/pricing",
    "query": "extract pricing tiers",
    "model": "fast"
  }'
```

## Response Format

```json
{
	"url": "https://example.com/pricing",
	"extracted": "Basic: $9/mo (1 user, 5GB). Pro: $29/mo (5 users, 50GB). Enterprise: custom pricing, contact sales.",
	"tokens_input": 24500,
	"tokens_output": 42,
	"model_used": "deepseek/deepseek-chat",
	"prompt_injection": null
}
```

### When Prompt Injection Detected

```json
{
	"url": "https://malicious.example.com",
	"extracted": null,
	"tokens_input": 8200,
	"tokens_output": 0,
	"model_used": "deepseek/deepseek-chat",
	"prompt_injection": {
		"detected": true,
		"type": "instruction_override",
		"snippet": "IGNORE ALL PREVIOUS INSTRUCTIONS...",
		"domain_flagged": true
	}
}
```

The `prompt_injection` object gives the driver model enough information to decide how to proceed. The domain gets added to an offenders list for future reference.

## Configuration Options

| Option           | Type | Default  | Description                        |
| ---------------- | ---- | -------- | ---------------------------------- |
| `url`            | str  | required | URL to fetch                       |
| `query`          | str  | required | What to extract                    |
| `model`          | str  | `"fast"` | Model preference (see below)       |
| `max_tokens`     | int  | `500`    | Max output tokens                  |
| `extended_query` | str  | `None`   | Additional extraction instructions |
| `timeout`        | int  | `30000`  | Fetch timeout (ms)                 |

### Model Preferences

| Value      | Use Case                            | Model                                |
| ---------- | ----------------------------------- | ------------------------------------ |
| `fast`     | Quick extractions, simple queries   | Cerebras or Groq (fastest available) |
| `accurate` | Complex extraction, nuanced content | DeepSeek V3.2                        |
| `research` | Web-optimized, longer analysis      | Tongyi DeepResearcher (Qwen3 30B-3B) |
| `code`     | Technical docs, code extraction     | Minimax M2.1                         |

## Prompt Injection Defense

### Simplified Songbird Pattern

Rather than full 3-bird Songbird, Shutter uses a 2-phase approach:

**Phase 1: Canary Check**

- Run extraction with minimal tokens (100-200)
- Check for instruction-override patterns in output
- Cost: ~$0.001

**Phase 2: Full Extraction** (only if Phase 1 passes)

- Run full extraction with requested token limit
- Cost: varies by model and content

If Canary detects injection patterns, the request is halted and the domain is flagged. The driver model receives detailed injection info rather than a silent failure.

### Offenders List

Shutter maintains a persistent list of domains where prompt injections have been detected:

- **Python**: SQLite at `~/.shutter/offenders.db`
- **Cloudflare**: D1 (shared across all instances)

```python
@dataclass
class Offender:
    domain: str
    first_seen: datetime
    last_seen: datetime
    detection_count: int
    injection_types: list[str]
```

When a request comes in, Shutter checks the offenders list first:

- **Not on list**: Proceed normally
- **On list, < 3 detections**: Proceed with warning in response
- **On list, ≥ 3 detections**: Return early with warning, skip fetch entirely

This creates trial-and-error defense that improves over time.

## Infrastructure

### Python Stack (v0.1 - v1.0)

| Component      | Tool                          |
| -------------- | ----------------------------- |
| HTTP Client    | httpx (async)                 |
| LLM Provider   | OpenRouter                    |
| Enhanced Fetch | Tavily SDK                    |
| Offenders List | SQLite (local)                |
| CLI            | Typer                         |
| Validation     | Pydantic                      |
| Config         | TOML (~/.shutter/config.toml) |

### Cloudflare Stack (v1.5+)

| Component      | Tool            |
| -------------- | --------------- |
| Compute        | Workers         |
| Offenders List | D1 (shared)     |
| Rate Limiting  | Durable Objects |
| Config Cache   | KV              |
| Content Cache  | R2 (v3.0)       |

### Fetch Providers (v1)

| Provider           | Use Case                                         |
| ------------------ | ------------------------------------------------ |
| Native fetch/httpx | Direct URL fetching, simple pages                |
| Tavily             | Enhanced extraction, JavaScript-rendered content |

Additional providers (Exa, Brave, etc.) planned for v2.

### Authentication

**Python (local):**

- API keys stored in `~/.shutter/config.toml`
- Environment variables as fallback

**Cloudflare (hosted at shutter.grove.place):**

_For Grove services (internal):_

- Service-to-service auth via encrypted key exchange
- Validated against known Grove service signatures

_For external API users:_

- API key tied to Heartwood user account
- Rate limits based on subscription tier:
  - Free: 100 requests/day
  - Paid: 10,000 requests/day
  - Enterprise: Custom

## Distribution

### Development Strategy

**Python first.** The Python implementation is the proof of concept. Once validated, port to Cloudflare Workers.

This approach:

- Validates the concept before investing in edge infrastructure
- Creates a version that always works (no Cloudflare dependency)
- Aligns with ML/AI ecosystem (most tooling is Python)
- Makes the TypeScript version a port, not a gamble

### Phase 1: Python Package — `grove-shutter`

Fully standalone implementation. No Cloudflare required.

**Stack:**

- **httpx** — Async HTTP client for fetching
- **SQLite** — Local offenders list (portable, same concept as D1)
- **OpenRouter** — LLM provider abstraction
- **Tavily SDK** — Enhanced fetching
- **Typer** — CLI framework
- **Pydantic** — Request/response validation

**Install & Run:**

```bash
# Install
pip install grove-shutter
# or
uv add grove-shutter

# CLI
shutter "https://example.com/pricing" --query "extract pricing tiers"

# Or via uvx (no install)
uvx grove-shutter "https://example.com/pricing" --query "extract pricing tiers"
```

**Programmatic:**

```python
from grove_shutter import shutter

result = await shutter(
    url="https://example.com/pricing",
    query="extract pricing tiers",
    model="fast",
    max_tokens=500
)
```

**Config:**

```bash
# First run prompts for setup, or set env vars:
export OPENROUTER_API_KEY="..."
export TAVILY_API_KEY="..."  # optional, for enhanced fetching
```

**Local storage:**

```
~/.shutter/
  config.toml      # API keys, default model, etc.
  offenders.db     # SQLite offenders list
```

### Phase 2: Cloudflare Workers — `@groveengine/shutter`

Port after Python version is validated.

**Stack:**

- **Workers** — Edge compute
- **D1** — Offenders list (shared across instances)
- **Durable Objects** — Rate limiting
- **KV** — Config cache

**Why port to Cloudflare:**

- Edge latency (faster for global users)
- Shared offenders list across all users
- Integration with other Grove services
- Scalability without managing servers

**CLI via npx:**

```bash
npx @groveengine/shutter "https://example.com/pricing" --query "extract pricing tiers"
```

The npm package can either:

- Call the hosted API at `shutter.grove.place`
- Run standalone with user's own OpenRouter key (same as Python)

### Self-Hosting

**Python (recommended for most users):**

```bash
pip install grove-shutter
# Configure API keys
shutter --setup
```

**Cloudflare (for Grove-scale deployments):**

```bash
git clone https://github.com/AutumnsGrove/Shutter
cd Shutter/cloudflare
cp wrangler.example.toml wrangler.toml
# Add your OpenRouter API key
wrangler deploy
```

## Roadmap

### v0.1 — Python Proof of Concept

- [ ] Core fetch + summarization logic
- [ ] OpenRouter integration
- [ ] Basic prompt injection detection
- [ ] CLI with Typer
- [ ] Local SQLite offenders list

### v1.0 — Python Production

- [ ] Full Canary-based PI detection
- [ ] Tavily integration for enhanced fetching
- [ ] All four model tiers (fast/accurate/research/code)
- [ ] PyPI release (`grove-shutter`)
- [ ] uvx one-liner support
- [ ] Config management (~/.shutter/)

### v1.5 — Cloudflare Port

- [ ] Worker implementation (port from Python)
- [ ] D1 shared offenders list
- [ ] Durable Objects rate limiting
- [ ] HTTP API with Heartwood auth
- [ ] NPM package (`@groveengine/shutter`)
- [ ] npx one-liner support

### v2.0 — Search

- [ ] Multi-URL search queries
- [ ] Additional providers (Exa, Brave, etc.)
- [ ] Result aggregation and deduplication
- [ ] Source ranking

### v3.0 — Caching & Intelligence

- [ ] Content caching
- [ ] Smart cache invalidation
- [ ] Injection pattern learning

## Future Considerations

Shutter isn't just a fetch tool—it's proving a pattern: _cheap LLM as security/efficiency layer between untrusted input and expensive processing_. If this works for web pages, the architecture applies elsewhere.

### Patterns This Proves

| Pattern                | Application                                                                    |
| ---------------------- | ------------------------------------------------------------------------------ |
| **Sanitization layer** | Any untrusted content passes through cheap LLM before reaching driver models   |
| **Token compression**  | Reduce 20k tokens to 200 without losing signal                                 |
| **Fail-loud security** | Return detailed rejection info so orchestrators can adapt, not silent failures |
| **Offenders list**     | Trial-and-error defense that improves over time                                |

### Grove Integration Points

| Service            | How Shutter Could Help                                                                                        |
| ------------------ | ------------------------------------------------------------------------------------------------------------- |
| **Mycelium**       | MCP server routes all external web access through Shutter. One security boundary for all Grove agents.        |
| **Daily Clearing** | News verification swarm uses Shutter as its fetch primitive. Already doing similar patterns—now standardized. |
| **Meadow**         | Shared link previews pass through Shutter before rendering. Malicious links caught before they hit users.     |
| **Ivy**            | Email link scanning. Inbound emails with suspicious links get Shutter-checked before preview generation.      |
| **Forage**         | Domain research fetches (WHOIS pages, registrar info) go through Shutter for clean extraction.                |
| **Aria**           | Lyrics/metadata fetching from external sources. Token-efficient, safe.                                        |

### The Broader Primitive

The "cheap LLM sanitization" pattern could become a Grove-wide primitive for any external input:

```
Untrusted Input → Cheap LLM Check → Safe Output (or rejection with details)
```

This applies to:

- Web fetches (Shutter v1)
- User-submitted content in social features
- File uploads and attachments
- Webhook payloads from external services
- Any data entering Grove from outside

Shutter proves the pattern. If it works, the architecture spreads.

### Not Currently Planned

These were considered but don't make sense yet:

| Idea                                       | Why Not Now                                                                                                                                                                        |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vectorize for injection patterns**       | Canary LLM already does semantic detection. Vector search would be faster but dumber—solving a scale problem we don't have. Revisit if Canary costs become painful at high volume. |
| **Full web index / semantic search**       | That's Exa's lane. Shutter extracts from URLs; it doesn't discover them.                                                                                                           |
| **Content caching with semantic matching** | Premature optimization. Simple URL+query caching (if added) handles 90% of cases.                                                                                                  |

### Agent Tooling Standard

Shutter's response format could become the template for how Grove tools expose themselves to LLM agents:

```python
@dataclass
class GroveToolResponse:
    success: bool
    data: Any                    # The actual result
    metadata: dict               # tokens_used, latency, etc.
    warning: str | None          # Non-fatal issues
    error: GroveToolError | None # Structured failure info
```

Consistent shapes across all Grove tools means agents can handle errors uniformly. Shutter is the first tool to use this pattern—others follow.

---

## Naming Entry

For `grove-naming.md`:

---

## Shutter

**Web Content Distillation** · `shutter.grove.place`
**Repository:** [AutumnsGrove/Shutter](https://github.com/AutumnsGrove/Shutter)

A shutter controls what reaches the lens. Open it, and light floods in—everything, all at once, overwhelming. But a photographer doesn't want everything. They want _the shot_. The shutter opens precisely when needed, captures exactly what's in frame, and closes before the noise can follow.

Shutter is Grove's web content distillation service. Hand it a URL and a question, and it opens briefly—just long enough to capture what you need—then closes, leaving the chaos outside. Your agents get clean, focused content instead of raw HTML noise. Token budgets stay sane. Prompt injection attempts never make it past the aperture.

_Open. Capture. Close._

---

## Pre-Development Research

Before implementation begins, run a research session to:

1. **Check for leaked extraction prompts** — Search for Anthropic's web fetch prompt, any documented approaches from Exa/Tavily/Perplexity
2. **Survey extraction techniques** — What patterns work best for different content types (articles, docs, pricing pages)?
3. **Prompt injection patterns** — Catalog known web-based injection techniques to inform Canary detection

This research informs the extraction prompt design rather than building blind.

---

## Open Questions

1. ~~**Extraction prompt**: Research existing approaches (check if Anthropic's prompt has leaked) or develop through trial and error?~~ Research first (see above)

2. ~~**Offenders list sharing**: Should there be a global Grove-maintained list that all instances can subscribe to?~~ Yes, D1 shared across instances

3. ~~**Fetch backend**: Start with native fetch, or integrate Exa/Tavily from v1 for better extraction quality?~~ Native fetch + Tavily for v1, more providers in v2/3

4. ~~**Pricing model**: Per-request? Monthly subscription? Credit-based like other Beyond services?~~ TBD with rest of Beyond
