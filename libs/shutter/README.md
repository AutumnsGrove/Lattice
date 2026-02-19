# Shutter

**Web Content Distillation Service**

> _Open. Capture. Close._

[![PyPI version](https://badge.fury.io/py/grove-shutter.svg)](https://badge.fury.io/py/grove-shutter)
[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## Overview

Shutter is a web content distillation layer that sits between LLM agents and raw web pages. It fetches URLs, uses a cheap/fast LLM to extract only the relevant content based on a query, and returns clean, focused results.

**Two key benefits:**

1. **Token efficiency** — Agents get 200 tokens instead of 20,000
2. **Prompt injection defense** — Raw page content never reaches the driver model; injections never make it past the aperture

## Quick Start

### Installation

```bash
# Install via UV (recommended)
uv add grove-shutter

# Or via pip
pip install grove-shutter

# Or run directly without installing
uvx grove-shutter --help
```

### First Run Setup

```bash
# Interactive setup (creates ~/.shutter/config.toml)
shutter setup

# Or set environment variables
export OPENROUTER_API_KEY="sk-or-v1-..."
export TAVILY_API_KEY="tvly-..."  # optional, for enhanced fetching
```

### CLI Usage

```bash
# Basic extraction
shutter "https://stripe.com/pricing" -q "What are the transaction fees?"

# Choose model tier
shutter "https://docs.python.org/3/library/asyncio.html" -q "How do I create a task?" --model code

# View offenders list
shutter offenders

# Clear offenders list
shutter clear-offenders
```

### Programmatic Usage

```python
from grove_shutter import shutter

result = await shutter(
    url="https://stripe.com/pricing",
    query="What are the transaction fees?",
    model="fast",
    max_tokens=500
)

print(result.extracted)
# Output: "2.9% + 30¢ per successful card charge. Additional 0.5% for..."

# Check for prompt injection
if result.prompt_injection:
    print(f"Injection detected: {result.prompt_injection.type}")
    print(f"Confidence: {result.prompt_injection.confidence}")
```

## Configuration

### Configuration File

Shutter stores configuration at `~/.shutter/config.toml`:

```toml
[api]
openrouter_key = "sk-or-v1-..."
tavily_key = "tvly-..."  # optional

[defaults]
model = "fast"
max_tokens = 500
timeout = 30000

# Optional: Tune prompt injection detection
[canary]
block_threshold = 0.6  # 0.0-1.0, lower = more sensitive

[canary.weights]
# Override confidence weights for specific patterns
instruction_override = 0.95
role_hijack = 0.40  # Lower if you get false positives on "act as" content
```

## Response Format

### Clean Extraction

```json
{
	"url": "https://stripe.com/pricing",
	"extracted": "2.9% + 30¢ per successful card charge. Additional 0.5% for manually entered cards. 1.5% for international cards.",
	"tokens_input": 24500,
	"tokens_output": 42,
	"model_used": "openai/gpt-oss-120b",
	"prompt_injection": null
}
```

### Prompt Injection Detected

```json
{
	"url": "https://malicious.example.com",
	"extracted": null,
	"tokens_input": 8200,
	"tokens_output": 0,
	"model_used": "",
	"prompt_injection": {
		"detected": true,
		"type": "instruction_override",
		"snippet": "...IGNORE ALL PREVIOUS INSTRUCTIONS...",
		"domain_flagged": true,
		"confidence": 0.95,
		"signals": ["instruction_override:0.95"]
	}
}
```

The `prompt_injection` object includes:

- **confidence**: 0.0-1.0 score indicating detection certainty
- **signals**: List of contributing detection signals for debugging
- **domain_flagged**: Whether the domain was added to the offenders list

## Model Tiers

| Tier       | Use Case                            | Model                                 | Speed       |
| ---------- | ----------------------------------- | ------------------------------------- | ----------- |
| `fast`     | Quick extractions, simple queries   | `openai/gpt-oss-120b` (Cerebras)      | ~2000 tok/s |
| `accurate` | Complex extraction, nuanced content | `deepseek/deepseek-v3.2`              | ~200 tok/s  |
| `research` | Web-optimized, longer analysis      | `alibaba/tongyi-deepresearch-30b-a3b` | ~150 tok/s  |
| `code`     | Technical docs, code extraction     | `minimax/minimax-m2.1`                | ~300 tok/s  |

## How It Works

### Fetch Chain

Shutter uses a smart fetch chain for JavaScript-rendered content:

1. **Jina Reader** (primary) — Free JS rendering via `r.jina.ai/{url}`
2. **Tavily** (fallback) — SDK-based JS rendering (requires API key)
3. **Basic httpx** (final) — Direct HTML fetch with trafilatura extraction

### Prompt Injection Defense

Shutter uses a **2-phase Canary approach** with confidence scoring:

**Phase 1: Heuristic Checks** (free)

- 17 weighted regex patterns for injection attempts
- Unicode hidden character detection
- Base64 payload detection
- Multi-pattern boost (2+ matches = higher confidence)

**Phase 2: LLM Canary** (only if heuristics inconclusive)

- Minimal extraction (100 tokens) with output analysis
- Detects instruction-following and topic deviation
- Cost: ~$0.001

If confidence exceeds the threshold (default 0.6), extraction is blocked and the domain is flagged.

### Offenders List

Shutter maintains a persistent SQLite database of flagged domains:

- **Location**: `~/.shutter/offenders.db`
- **Skip conditions**:
  - 3+ detections on the domain
  - Single detection with confidence ≥ 0.90
  - 2+ detections with average confidence ≥ 0.80

This creates trial-and-error defense that improves over time.

## Development

### Setup

```bash
# Clone the repository
git clone https://github.com/AutumnsGrove/Shutter.git
cd Shutter

# Install dependencies with UV
uv sync --dev

# Run tests
uv run pytest

# Format code
uv run black src/ tests/
uv run ruff check src/ tests/
```

### Test Coverage

```bash
# Run with coverage
uv run pytest --cov=grove_shutter --cov-report=term-missing

# Current: 120 tests passing
```

## Roadmap

### v1.0 — Python Production (Current)

- [x] Core fetch + extraction with OpenRouter
- [x] Jina/Tavily fetch chain for JS rendering
- [x] Canary-based prompt injection detection
- [x] Confidence scoring (0.0-1.0)
- [x] Config-based weight overrides
- [x] SQLite offenders list with smart thresholds
- [x] CLI with setup, offenders commands
- [x] PyPI release (`grove-shutter`)

### v1.5 — Cloudflare Port

- [ ] TypeScript Workers implementation
- [ ] D1 shared offenders list
- [ ] HTTP API with authentication
- [ ] NPM package (`@groveengine/shutter`)

### v2.0 — Search

- [ ] Multi-URL search queries
- [ ] Additional providers (Exa, Brave)
- [ ] Result aggregation and deduplication

### v3.0 — Caching & Intelligence

- [ ] Content caching (R2)
- [ ] Injection pattern learning
- [ ] Vectorize integration

## License

MIT

## Links

- **Repository**: [github.com/AutumnsGrove/Shutter](https://github.com/AutumnsGrove/Shutter)
- **Documentation**: [docs/SPEC.md](docs/SPEC.md)
- **Issues**: [github.com/AutumnsGrove/Shutter/issues](https://github.com/AutumnsGrove/Shutter/issues)

---

_A shutter controls what reaches the lens. Open it, and light floods in—everything, all at once, overwhelming. But a photographer doesn't want everything. They want the shot. The shutter opens precisely when needed, captures exactly what's in frame, and closes before the noise can follow._
