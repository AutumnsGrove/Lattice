# Shutter API Reference

## Core Function

### `shutter()`

The main entry point for web content extraction.

```python
async def shutter(
    url: str,
    query: str,
    model: str = "fast",
    max_tokens: int = 500,
) -> ShutterResponse
```

#### Parameters

| Parameter    | Type  | Default  | Description                                                |
| ------------ | ----- | -------- | ---------------------------------------------------------- |
| `url`        | `str` | required | The URL to fetch and extract from                          |
| `query`      | `str` | required | What information to extract from the page                  |
| `model`      | `str` | `"fast"` | Model tier: `"fast"`, `"accurate"`, `"research"`, `"code"` |
| `max_tokens` | `int` | `500`    | Maximum tokens for the extraction response                 |

#### Returns

`ShutterResponse` dataclass (see below)

#### Example

```python
from grove_shutter import shutter

result = await shutter(
    url="https://stripe.com/pricing",
    query="What are the transaction fees?",
    model="fast",
    max_tokens=500,
)
```

---

## Data Models

### `ShutterResponse`

The response from a shutter extraction.

```python
@dataclass
class ShutterResponse:
    url: str
    extracted: Optional[str]
    tokens_input: int
    tokens_output: int
    model_used: str
    prompt_injection: Optional[PromptInjectionDetails]
```

#### Fields

| Field              | Type                             | Description                                    |
| ------------------ | -------------------------------- | ---------------------------------------------- |
| `url`              | `str`                            | The URL that was fetched                       |
| `extracted`        | `str \| None`                    | Extracted content, or `None` if blocked/failed |
| `tokens_input`     | `int`                            | Input tokens consumed                          |
| `tokens_output`    | `int`                            | Output tokens generated                        |
| `model_used`       | `str`                            | OpenRouter model ID used                       |
| `prompt_injection` | `PromptInjectionDetails \| None` | Injection details if detected                  |

---

### `PromptInjectionDetails`

Details about a detected prompt injection attempt.

```python
@dataclass
class PromptInjectionDetails:
    detected: bool
    type: str
    snippet: str
    domain_flagged: bool
    confidence: float = 1.0
    signals: list[str] = field(default_factory=list)
```

#### Fields

| Field            | Type        | Description                                                  |
| ---------------- | ----------- | ------------------------------------------------------------ |
| `detected`       | `bool`      | Always `True` when this object exists                        |
| `type`           | `str`       | Injection type identifier                                    |
| `snippet`        | `str`       | Snippet of suspicious content                                |
| `domain_flagged` | `bool`      | Whether domain was added to offenders list                   |
| `confidence`     | `float`     | Detection confidence (0.0-1.0)                               |
| `signals`        | `list[str]` | Contributing signals (e.g., `["instruction_override:0.95"]`) |

#### Injection Types

| Type                    | Description                             | Typical Confidence |
| ----------------------- | --------------------------------------- | ------------------ |
| `instruction_override`  | "Ignore previous instructions" patterns | 0.85-0.95          |
| `role_hijack`           | "You are now..." patterns               | 0.50-0.70          |
| `delimiter_injection`   | `<system>`, `[INST]` patterns           | 0.80-0.90          |
| `jailbreak_attempt`     | Jailbreak keywords                      | 0.85-0.90          |
| `safety_bypass`         | "Ignore safety" patterns                | 0.90               |
| `mode_switch`           | "Developer mode" patterns               | 0.75               |
| `memory_wipe`           | "Forget everything" patterns            | 0.80               |
| `prompt_leak`           | "Show your prompt" patterns             | 0.85               |
| `hidden_unicode_*`      | Zero-width characters, etc.             | 0.20-0.85          |
| `base64_payload`        | Long Base64 strings                     | 0.60-0.95          |
| `instruction_following` | LLM output shows hijacking              | 0.85               |
| `meta_discussion`       | LLM discusses its instructions          | 0.70               |
| `topic_deviation`       | LLM response off-topic                  | 0.65               |
| `domain_blocked`        | Domain on offenders list                | 0.90               |
| `fetch_error`           | URL fetch failed                        | N/A                |
| `empty_content`         | Page returned no content                | N/A                |

---

### `Offender`

A domain on the offenders list.

```python
@dataclass
class Offender:
    domain: str
    first_seen: str
    last_seen: str
    detection_count: int
    injection_types: list[str]
    avg_confidence: float = 0.0
    max_confidence: float = 0.0
```

#### Fields

| Field             | Type        | Description                            |
| ----------------- | ----------- | -------------------------------------- |
| `domain`          | `str`       | The flagged domain                     |
| `first_seen`      | `str`       | ISO timestamp of first detection       |
| `last_seen`       | `str`       | ISO timestamp of most recent detection |
| `detection_count` | `int`       | Total number of detections             |
| `injection_types` | `list[str]` | Types of injections detected           |
| `avg_confidence`  | `float`     | Running average confidence             |
| `max_confidence`  | `float`     | Highest confidence seen                |

---

## Database Functions

### `init_db()`

Initialize the offenders database. Called automatically on first use.

```python
from grove_shutter.database import init_db

init_db()  # Creates ~/.shutter/offenders.db if not exists
```

### `add_offender()`

Add or update an offender record.

```python
def add_offender(
    domain: str,
    injection_type: str,
    confidence: float = 1.0
) -> None
```

### `get_offender()`

Get an offender record by domain.

```python
def get_offender(domain: str) -> Optional[Offender]
```

### `list_offenders()`

List all offenders, ordered by detection count descending.

```python
def list_offenders() -> list[Offender]
```

### `should_skip_fetch()`

Check if a domain should be skipped based on offender status.

```python
def should_skip_fetch(domain: str) -> bool
```

Skip conditions:

- `detection_count >= 3`, OR
- `max_confidence >= 0.90`, OR
- `avg_confidence >= 0.80 AND detection_count >= 2`

### `clear_offenders()`

Clear all offender records.

```python
def clear_offenders() -> None
```

---

## Canary Functions

### `canary_check()`

Run prompt injection detection on content.

```python
async def canary_check(
    content: str,
    query: str
) -> Optional[PromptInjectionDetails]
```

Returns `None` if content is clean, `PromptInjectionDetails` if injection detected.

### `check_heuristics()`

Run regex-based pattern matching.

```python
def check_heuristics(content: str) -> list[tuple[str, str, float]]
```

Returns list of `(injection_type, snippet, confidence)` tuples.

### `check_unicode()`

Check for suspicious Unicode characters.

```python
def check_unicode(content: str) -> Optional[tuple[str, str, float]]
```

### `check_base64()`

Check for suspicious Base64-encoded payloads.

```python
def check_base64(content: str) -> Optional[tuple[str, str, float]]
```

### `aggregate_confidence()`

Combine detection signals into final confidence score.

```python
def aggregate_confidence(
    heuristic_matches: list[tuple[str, str, float]],
    unicode_result: Optional[tuple[str, str, float]],
    base64_result: Optional[tuple[str, str, float]],
) -> tuple[float, Optional[str], Optional[str], list[str]]
```

Returns `(confidence, primary_type, primary_snippet, signals)`.

---

## Configuration Functions

### `get_api_key()`

Get an API key from config/environment.

```python
def get_api_key(service: str) -> Optional[str]
```

Priority: Environment variable > secrets.json > config.toml

### `get_canary_settings()`

Get canary detection settings.

```python
def get_canary_settings() -> dict
```

Returns:

```python
{
    "block_threshold": 0.6,  # Or value from config
    "weight_overrides": {},  # Pattern -> confidence overrides
}
```

### `is_dry_run()`

Check if dry-run mode is enabled.

```python
def is_dry_run() -> bool
```

Set via `SHUTTER_DRY_RUN=1` environment variable.

### `setup_config()`

Run interactive configuration setup.

```python
def setup_config() -> None
```

---

## Fetch Functions

### `fetch_url()`

Fetch content from a URL using the smart fetch chain.

```python
async def fetch_url(url: str) -> str
```

Fetch chain: Jina Reader → Tavily → Basic httpx

### `extract_domain()`

Extract domain from URL for offender tracking.

```python
def extract_domain(url: str) -> str
```

Strips `www.` prefix and port numbers.

---

## Model Tiers

### `get_model_for_tier()`

Get OpenRouter model ID for a tier.

```python
def get_model_for_tier(tier: str) -> str
```

| Tier       | Model ID                              |
| ---------- | ------------------------------------- |
| `fast`     | `openai/gpt-oss-120b`                 |
| `accurate` | `deepseek/deepseek-v3.2`              |
| `research` | `alibaba/tongyi-deepresearch-30b-a3b` |
| `code`     | `minimax/minimax-m2.1`                |

---

## Constants

### Detection Patterns

```python
# From canary.py
INJECTION_PATTERNS = [
    (r"ignore\s+(all\s+)?previous\s+instructions?", "instruction_override", 0.95),
    # ... 17 patterns total
]

SUSPICIOUS_UNICODE_RANGES = [
    (0xE0000, 0xE007F, "tag_characters", 0.85),
    (0x200B, 0x200F, "zero_width", 0.35),
    (0x2060, 0x206F, "word_joiners", 0.30),
    (0xFEFF, 0xFEFF, "bom", 0.20),
]

BLOCK_THRESHOLD = 0.6  # Default, configurable
```

### File Locations

```python
CONFIG_DIR = Path.home() / ".shutter"
CONFIG_PATH = CONFIG_DIR / "config.toml"
DB_PATH = CONFIG_DIR / "offenders.db"
```
