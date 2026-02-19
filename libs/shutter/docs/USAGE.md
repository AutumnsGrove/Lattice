# Shutter Usage Guide

## Table of Contents

- [Installation](#installation)
- [CLI Examples](#cli-examples)
- [Python API Examples](#python-api-examples)
- [Configuration](#configuration)
- [Handling Prompt Injection](#handling-prompt-injection)
- [Integration Patterns](#integration-patterns)

---

## Installation

### Via UV (Recommended)

```bash
# Add to project
uv add grove-shutter

# Or install globally
uv tool install grove-shutter
```

### Via pip

```bash
pip install grove-shutter
```

### Run Without Installing

```bash
uvx grove-shutter "https://example.com" -q "extract main content"
```

---

## CLI Examples

### Basic Extraction

```bash
# Extract pricing information
shutter "https://stripe.com/pricing" -q "What are the transaction fees?"

# Extract from documentation
shutter "https://docs.python.org/3/library/asyncio.html" \
    -q "How do I create and run an async task?"
```

### Model Selection

```bash
# Fast extraction (default) - best for simple queries
shutter "https://example.com/about" -q "company mission" --model fast

# Accurate extraction - best for complex content
shutter "https://research.paper.com/abstract" -q "key findings" --model accurate

# Code extraction - best for technical docs
shutter "https://api.example.com/docs" -q "authentication flow" --model code

# Research extraction - best for analysis
shutter "https://news.site.com/article" -q "main arguments and evidence" --model research
```

### Managing the Offenders List

```bash
# View all flagged domains
shutter offenders

# Clear all flagged domains
shutter clear-offenders
```

### JSON Output

All CLI output is JSON, making it easy to pipe to other tools:

```bash
# Extract and process with jq
shutter "https://example.com" -q "get title" | jq '.extracted'

# Check if injection was detected
shutter "https://example.com" -q "test" | jq '.prompt_injection != null'
```

---

## Python API Examples

### Basic Usage

```python
import asyncio
from grove_shutter import shutter

async def main():
    result = await shutter(
        url="https://stripe.com/pricing",
        query="What are the transaction fees?",
    )

    print(f"Extracted: {result.extracted}")
    print(f"Tokens used: {result.tokens_input} in, {result.tokens_output} out")

asyncio.run(main())
```

### With Error Handling

```python
from grove_shutter import shutter
from grove_shutter.models import ShutterResponse

async def safe_extract(url: str, query: str) -> str | None:
    result = await shutter(url=url, query=query)

    # Check for prompt injection
    if result.prompt_injection:
        print(f"Warning: Injection detected on {url}")
        print(f"Type: {result.prompt_injection.type}")
        print(f"Confidence: {result.prompt_injection.confidence}")
        return None

    # Check for empty extraction
    if not result.extracted:
        print(f"No content extracted from {url}")
        return None

    return result.extracted
```

### Batch Processing

```python
import asyncio
from grove_shutter import shutter

async def batch_extract(urls: list[str], query: str) -> dict[str, str]:
    tasks = [
        shutter(url=url, query=query)
        for url in urls
    ]

    results = await asyncio.gather(*tasks, return_exceptions=True)

    extracted = {}
    for url, result in zip(urls, results):
        if isinstance(result, Exception):
            print(f"Error on {url}: {result}")
        elif result.extracted:
            extracted[url] = result.extracted

    return extracted

# Usage
urls = [
    "https://company1.com/pricing",
    "https://company2.com/pricing",
    "https://company3.com/pricing",
]

results = asyncio.run(batch_extract(urls, "What are the pricing tiers?"))
```

### Custom Model Selection

```python
from grove_shutter import shutter

# For simple factual queries
result = await shutter(
    url="https://example.com",
    query="What year was this founded?",
    model="fast",  # Fastest, cheapest
)

# For nuanced content analysis
result = await shutter(
    url="https://complex-article.com",
    query="Summarize the main arguments",
    model="accurate",  # Best quality
    max_tokens=1000,  # Allow longer response
)

# For code and technical docs
result = await shutter(
    url="https://api.docs.com/auth",
    query="Show the OAuth2 flow",
    model="code",  # Optimized for technical content
)
```

---

## Configuration

### Environment Variables

```bash
# Required
export OPENROUTER_API_KEY="sk-or-v1-..."

# Optional (enables Tavily fallback for JS-heavy sites)
export TAVILY_API_KEY="tvly-..."

# Optional (skip API calls for testing)
export SHUTTER_DRY_RUN="1"
```

### Config File (~/.shutter/config.toml)

```toml
[api]
openrouter_key = "sk-or-v1-..."
tavily_key = "tvly-..."  # optional

[defaults]
model = "fast"
max_tokens = 500
timeout = 30000

# Tune prompt injection detection
[canary]
block_threshold = 0.6  # Default. Raise to reduce false positives.

# Override specific pattern weights
[canary.weights]
instruction_override = 0.95  # Keep high
role_hijack = 0.40          # Lower if "act as" content causes false positives
hidden_unicode_zero_width = 0.20  # Lower for CMS-heavy sites
```

### Weight Override Examples

If you're getting false positives on legitimate content:

```toml
[canary.weights]
# "Act as a helpful assistant" triggers role_hijack
role_hijack = 0.35

# CMS sites with zero-width characters
hidden_unicode_zero_width = 0.20
hidden_unicode_word_joiners = 0.15

# Sites discussing prompt injection (security blogs)
instruction_override = 0.80
```

---

## Handling Prompt Injection

### Understanding Detection Results

```python
result = await shutter(url=url, query=query)

if result.prompt_injection:
    pi = result.prompt_injection

    # Type of injection attempt
    print(f"Type: {pi.type}")
    # Examples: instruction_override, role_hijack, delimiter_injection,
    #           jailbreak_attempt, hidden_unicode_zero_width, base64_payload

    # Confidence score (0.0 - 1.0)
    print(f"Confidence: {pi.confidence}")

    # Snippet of suspicious content
    print(f"Snippet: {pi.snippet}")

    # Whether domain was added to offenders list
    print(f"Domain flagged: {pi.domain_flagged}")

    # All contributing signals for debugging
    print(f"Signals: {pi.signals}")
```

### Confidence Thresholds

| Confidence | Meaning             | Action                  |
| ---------- | ------------------- | ----------------------- |
| 0.0 - 0.3  | Low suspicion       | Proceed normally        |
| 0.3 - 0.6  | Moderate suspicion  | LLM canary check runs   |
| 0.6 - 0.8  | High suspicion      | Blocked, domain flagged |
| 0.8 - 1.0  | Very high suspicion | Blocked, domain flagged |

### Soft Warning Pattern

For applications that want to show warnings but still proceed:

```python
async def extract_with_warning(url: str, query: str):
    result = await shutter(url=url, query=query)

    if result.prompt_injection:
        confidence = result.prompt_injection.confidence

        if confidence >= 0.8:
            # High confidence - don't use this content
            return {"error": "Content blocked due to injection risk"}
        elif confidence >= 0.5:
            # Medium confidence - warn but include
            return {
                "content": result.extracted,
                "warning": f"Possible injection detected (confidence: {confidence})",
            }

    return {"content": result.extracted}
```

---

## Integration Patterns

### With LangChain

```python
from langchain.tools import tool
from grove_shutter import shutter

@tool
async def fetch_webpage(url: str, query: str) -> str:
    """Fetch and extract relevant content from a webpage."""
    result = await shutter(url=url, query=query)

    if result.prompt_injection:
        return f"Error: Content blocked (injection risk: {result.prompt_injection.type})"

    return result.extracted or "No relevant content found."
```

### With FastAPI

```python
from fastapi import FastAPI, HTTPException
from grove_shutter import shutter

app = FastAPI()

@app.get("/extract")
async def extract(url: str, query: str):
    result = await shutter(url=url, query=query)

    if result.prompt_injection:
        raise HTTPException(
            status_code=422,
            detail={
                "error": "prompt_injection_detected",
                "type": result.prompt_injection.type,
                "confidence": result.prompt_injection.confidence,
            }
        )

    return {
        "url": result.url,
        "content": result.extracted,
        "model": result.model_used,
    }
```

### As Agent Tool

```python
async def web_fetch_tool(url: str, information_needed: str) -> dict:
    """
    Tool for LLM agents to fetch web content safely.

    Returns extracted content or error details.
    """
    result = await shutter(
        url=url,
        query=information_needed,
        model="fast",
        max_tokens=500,
    )

    return {
        "success": result.extracted is not None,
        "content": result.extracted,
        "blocked": result.prompt_injection is not None,
        "block_reason": result.prompt_injection.type if result.prompt_injection else None,
    }
```

---

## Troubleshooting

### "No content extracted"

1. Check if the site requires JavaScript rendering
2. Try with Tavily API key configured for better JS support
3. Some sites block automated requests - check with `curl` first

### False Positives

1. Check the `signals` field to see what triggered detection
2. Adjust weights in `~/.shutter/config.toml`
3. Raise `block_threshold` if needed

### API Key Issues

```bash
# Verify OpenRouter key works
curl https://openrouter.ai/api/v1/models \
  -H "Authorization: Bearer $OPENROUTER_API_KEY"

# Run in dry-run mode to test without API calls
SHUTTER_DRY_RUN=1 shutter "https://example.com" -q "test"
```
