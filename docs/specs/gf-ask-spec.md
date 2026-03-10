---
aliases: []
date created: Sunday, March 9th 2026
date modified: Sunday, March 9th 2026
lastUpdated: 2026-03-09
tags:
  - tooling
  - ai
  - search
  - local-llm
  - agent-integration
type: tech-spec
---

```
                    ╭──────────────────────────────────╮
                    │    🌿  G R O V E  F I N D  🌿    │
                    │                                  │
                    │         "where are the           │
                    │          damn icons?"             │
                    │              │                    │
                    │              ▼                    │
                    │         ╭────────╮               │
                    │         │ 🧠 LLM │               │
                    │         ╰───┬────╯               │
                    │             │                    │
                    │    ┌────────┼────────┐           │
                    │    ▼        ▼        ▼           │
                    │  grep    find     list           │
                    │    │        │        │           │
                    │    └────────┼────────┘           │
                    │             ▼                    │
                    │    libs/engine/src/lib/          │
                    │      workshop/entries.ts         │
                    │                                  │
                    ╰──────────────────────────────────╯

               Ask the forest. It knows where things grow.
```

> *Ask the forest. It knows where things grow.*

**Public Name:** Grove Find Ask (gf ask)
**Internal Name:** GroveAsk
**Package:** `tools/grove-find-go/` (Go, extends existing `gf` binary)
**Last Updated:** March 2026

You know what you're looking for. You just don't know what it's called. Maybe it's "that page with all the service icons" or "the thing that handles rate limiting for webhooks" or "wherever the seasonal theme stuff lives." Today that means guessing keywords, trying three or four `gf search` calls, scanning results, adjusting. Tomorrow you type what you mean and the forest finds it for you.

`gf ask` adds natural language search to Grove Find. A tiny local model (LFM 2.5 1.2B, running on your machine through LM Studio) translates your description into structured searches, executes them against the codebase, reads the results, and tells you exactly where to look. No cloud APIs. No latency. No cost per query. Just you, your words, and ripgrep doing the heavy lifting behind a model that speaks both languages.

---

## Overview

### What This Is

A new `gf ask` command that accepts natural language queries and returns file paths with explanations. It wraps an agentic tool-calling loop around `gf`'s existing search infrastructure, powered by a local LLM running in LM Studio.

### Goals

1. **Natural language in, file paths out.** Type what you mean, get where it lives.
2. **Zero cloud dependency.** Everything runs locally. No API keys, no usage fees, no network required.
3. **Zero new Go dependencies.** Raw `net/http` for the LLM client. Reuse existing Charm libraries for TUI.
4. **Sub-second typical response.** The model is 1.2B params. Searches take ~40ms each. Most queries resolve in 1-3 rounds.
5. **Graceful lifecycle management.** Auto-detect and auto-start LM Studio when possible.
6. **Two modes.** Single-shot (default) for quick answers. Interactive TUI (`-i`) for exploratory sessions.

### Non-Goals

- Replacing existing `gf search`, `gf class`, `gf func` commands (those are precise tools, this is a fuzzy finder)
- Supporting cloud LLM providers (this is intentionally local-only)
- Code generation or modification (search only)
- Indexing or embedding the codebase (we lean on ripgrep, not vector search)

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                           gf ask "query"                             │
│                                                                      │
│  cmd/ask.go                                                          │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  Parse flags (-i, --no-autostart, --max-rounds, --model)      │  │
│  │  Invoke nlp.EnsureServer() → nlp.RunAgent()                   │  │
│  └────────────────────────────────┬───────────────────────────────┘  │
│                                   │                                  │
│  internal/nlp/                    │                                  │
│  ┌────────────────────────────────▼───────────────────────────────┐  │
│  │                                                                │  │
│  │  server.go         client.go         codemap.go               │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │  │
│  │  │ Health check │  │ net/http POST│  │ Scan dirs    │         │  │
│  │  │ Auto-start   │  │ OpenAI types │  │ Build prompt │         │  │
│  │  │ Model load   │  │ Stream parse │  │ ~150 tokens  │         │  │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │  │
│  │         │                 │                  │                 │  │
│  │  ┌──────▼─────────────────▼──────────────────▼───────────────┐ │  │
│  │  │                    agent.go                                │ │  │
│  │  │                                                            │ │  │
│  │  │  System prompt + codebase map + user query                 │ │  │
│  │  │           │                                                │ │  │
│  │  │           ▼                                                │ │  │
│  │  │  POST /v1/chat/completions (messages + tools)              │ │  │
│  │  │           │                                                │ │  │
│  │  │           ├── finish_reason: "tool_calls"                  │ │  │
│  │  │           │     Execute via tools.go → search.*            │ │  │
│  │  │           │     Append results, round++                    │ │  │
│  │  │           │     Loop (max 7 rounds)                        │ │  │
│  │  │           │                                                │ │  │
│  │  │           ├── finish_reason: "stop"                        │ │  │
│  │  │           │     Render answer + file paths                 │ │  │
│  │  │           │                                                │ │  │
│  │  │           └── give_up tool called                          │ │  │
│  │  │                 Show reason + suggested gf commands         │ │  │
│  │  └────────────────────────────────────────────────────────────┘ │  │
│  │                                                                │  │
│  │  tools.go                                                      │  │
│  │  ┌────────────────────────────────────────────────────────────┐ │  │
│  │  │  grep_search  ──→  search.RunRg()                         │ │  │
│  │  │  find_files   ──→  search.FindFiles()                     │ │  │
│  │  │  find_by_glob ──→  search.FindFilesByGlob()               │ │  │
│  │  │  list_dir     ──→  os.ReadDir()                           │ │  │
│  │  │  give_up      ──→  terminates loop                        │ │  │
│  │  └────────────────────────────────────────────────────────────┘ │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  internal/asktui/ (Phase 2)                                          │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  Bubble Tea program: spinner → search status → answer viewer  │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  EXISTING (untouched):                                               │
│  internal/search/  internal/output/  internal/config/                │
│  internal/pager/   internal/tools/                                   │
└──────────────────────────────────────────────────────────────────────┘
```

### Tech Stack

| Component | Technology | Why |
|-----------|-----------|-----|
| LLM Client | Raw `net/http` + `encoding/json` | Zero new dependencies |
| LLM Runtime | LM Studio (localhost:1234) | Local, free, OpenAI-compatible |
| Model | LFM 2.5 1.2B (`liquid/lfm2.5-1.2b`) | Fast, small, good at tool calling |
| Search Backend | ripgrep + fd (existing) | Already integrated via `search.*` |
| TUI Framework | Bubble Tea (existing) | Already a dependency for pager |
| Server Management | `lms` CLI (exec) | Ships with LM Studio |

### Package Structure

```
tools/grove-find-go/
├── cmd/
│   ├── ask.go              ← NEW: Cobra command for gf ask
│   └── ... (existing)
├── internal/
│   ├── nlp/                ← NEW: all LLM logic
│   │   ├── server.go       ← LM Studio lifecycle
│   │   ├── client.go       ← OpenAI-compatible HTTP client
│   │   ├── agent.go        ← Agentic loop + system prompt
│   │   ├── tools.go        ← Tool definitions + executor
│   │   └── codemap.go      ← Dynamic codebase map
│   ├── asktui/             ← NEW (Phase 2): interactive TUI
│   │   └── tui.go          ← Bubble Tea program
│   ├── search/             (existing, untouched)
│   ├── config/             (extended: 3 new fields)
│   ├── output/             (existing, untouched)
│   ├── pager/              (existing, untouched)
│   └── tools/              (extended: lms binary discovery)
└── ...
```

---

## The Agentic Loop

This is the core of the system. A conversation loop between `gf` and the local model, mediated by tool calls.

```
Round 0                    Round 1                    Round 2
┌─────────────┐            ┌─────────────┐            ┌─────────────┐
│ System:     │            │ Tool result:│            │ Tool result:│
│  codebase   │            │  12 matches │            │  3 files    │
│  map +      │            │  in libs/   │            │  found      │
│  rules      │            │             │            │             │
│             │            │             │            │             │
│ User:       │            │             │            │             │
│  "where are │            │             │            │             │
│   the icons"│            │             │            │             │
└──────┬──────┘            └──────┬──────┘            └──────┬──────┘
       │                          │                          │
       ▼                          ▼                          ▼
  ┌─────────┐              ┌─────────┐              ┌─────────────┐
  │  Model   │              │  Model   │              │    Model    │
  │ decides: │              │ decides: │              │   decides:  │
  │ grep for │              │ list_dir │              │   "stop"    │
  │ "icon"   │              │ workshop/│              │   (answer)  │
  └─────────┘              └─────────┘              └─────────────┘
```

### Loop Rules

1. **Max 7 rounds.** After round 7, the agent is forced to summarize whatever it found. The model is tiny and fast, so 7 rounds adds at most ~3-4 seconds.

2. **Duplicate detection.** If the model calls the same tool with the same arguments twice, inject a system message: "You already tried that search. Try different terms, a broader pattern, or call give_up if nothing matches."

3. **Empty result escalation.** If rounds 1-5 all return empty, inject: "All searches have returned empty. Call give_up with what you tried, or try a completely different approach."

4. **give_up terminates immediately.** No further rounds. The loop exits and renders the give_up payload.

5. **Multiple tool calls per round.** If the model returns multiple tool calls in one response, execute them all (in parallel where possible) and return all results in a single round.

### Convergence Guarantee

The loop always terminates via one of:
- Model returns `finish_reason: "stop"` (natural answer)
- Model calls `give_up` tool (explicit surrender)
- Round counter exceeds 7 (forced summarization)
- HTTP error or timeout (error path)

There is no path to infinite iteration.

---

## Tool Definitions

Five tools. Each maps directly to existing `gf` infrastructure.

### `grep_search`

Search file contents using ripgrep.

```json
{
  "type": "function",
  "function": {
    "name": "grep_search",
    "description": "Search file contents for a regex pattern. Returns matching lines with file paths and line numbers.",
    "parameters": {
      "type": "object",
      "properties": {
        "pattern": {
          "type": "string",
          "description": "Regex pattern to search for"
        },
        "file_type": {
          "type": "string",
          "description": "Filter by file type: svelte, ts, js, py, go, md, json, yaml, css, html"
        },
        "path": {
          "type": "string",
          "description": "Limit search to this directory path (relative to project root)"
        },
        "max_results": {
          "type": "integer",
          "description": "Maximum number of result lines to return (default: 20)"
        }
      },
      "required": ["pattern"]
    }
  }
}
```

**Maps to:** `search.RunRg(pattern, WithType(...), WithPath(...))` with result truncation.

**Default max_results: 20.** A 1.2B model can't process hundreds of grep lines. 20 gives enough signal to orient without flooding the context window.

### `find_files`

Search for files by name.

```json
{
  "type": "function",
  "function": {
    "name": "find_files",
    "description": "Find files whose names match a pattern. Returns file paths.",
    "parameters": {
      "type": "object",
      "properties": {
        "pattern": {
          "type": "string",
          "description": "File name pattern to search for (e.g. 'workshop', 'icon')"
        },
        "glob": {
          "type": "string",
          "description": "Glob pattern filter (e.g. '*.svelte', '*.ts')"
        }
      },
      "required": ["pattern"]
    }
  }
}
```

**Maps to:** `search.FindFiles(pattern, WithGlob(...))`.

### `find_by_glob`

Find files matching glob patterns.

```json
{
  "type": "function",
  "function": {
    "name": "find_by_glob",
    "description": "Find files matching one or more glob patterns. Returns file paths.",
    "parameters": {
      "type": "object",
      "properties": {
        "globs": {
          "type": "array",
          "items": { "type": "string" },
          "description": "Glob patterns (e.g. ['libs/engine/**/*.ts', 'apps/**/*.svelte'])"
        }
      },
      "required": ["globs"]
    }
  }
}
```

**Maps to:** `search.FindFilesByGlob(globs)`.

### `list_directory`

List the contents of a directory (one level deep).

```json
{
  "type": "function",
  "function": {
    "name": "list_directory",
    "description": "List files and subdirectories in a directory (one level). Use this to explore before searching.",
    "parameters": {
      "type": "object",
      "properties": {
        "path": {
          "type": "string",
          "description": "Directory path relative to project root"
        }
      },
      "required": ["path"]
    }
  }
}
```

**Maps to:** `os.ReadDir()` on the resolved path. Returns entries as `name/` (dirs) or `name` (files). Capped at 100 entries to protect context.

### `give_up`

Signal that the search cannot find what the user described.

```json
{
  "type": "function",
  "function": {
    "name": "give_up",
    "description": "Call this when you cannot find what the user described after trying multiple searches. Provide what you tried so the user can refine their query.",
    "parameters": {
      "type": "object",
      "properties": {
        "reason": {
          "type": "string",
          "description": "Why you could not find it"
        },
        "tried": {
          "type": "array",
          "items": { "type": "string" },
          "description": "List of search strategies you attempted"
        },
        "suggestions": {
          "type": "array",
          "items": { "type": "string" },
          "description": "Suggested gf commands the user could try manually"
        }
      },
      "required": ["reason", "tried"]
    }
  }
}
```

**Maps to:** Loop termination. Renders the give_up payload with mode-specific formatting (see Output section).

---

## System Prompt

The system prompt has two parts: static instructions and a dynamic codebase map.

### Static Instructions (~200 tokens)

```
You are a codebase search assistant for a monorepo called Lattice.

Given a natural language description, use the provided tools to find the relevant files and code. Return specific file paths and a brief description of what you found.

Rules:
- Start with the most likely location based on the codebase map below
- Use grep_search for content, find_files for file names, list_directory to explore
- If a search returns nothing, try alternative keywords or broader patterns
- Keep pattern arguments short and specific
- If nothing matches after thorough searching, call give_up with what you tried
- When you find it, respond with the file path(s) and a one-sentence description
- Do not guess file paths. Only report paths from search results.
```

### Dynamic Codebase Map (~150 tokens)

Generated at runtime by `codemap.go`:

```
Codebase Map:
apps: amber, clearing, domains, ivy, landing, login, meadow, plant, terrarium
libs: engine (core business logic), foliage, gossamer, grove-agent, infra, prism, server-sdk, shutter, vineyard
workers: email-catchup, loft, lumen, meadow-poller, onboarding, patina, post-migrator, reverie-exec, reverie, timeline-sync, vista-collector, warden, webhook-cleanup
tools: cairn, census, glimpse, grove-find-go, grove-wrap-go
docs: specs/, plans/, guides/
```

**Generation algorithm:**

1. Read directories in `GroveRoot` at depth 0
2. For `apps/`, `libs/`, `workers/`, `tools/`: list subdirectory names at depth 1
3. For `docs/`: list subdirectory names at depth 1
4. Skip: `node_modules`, `.git`, `dist`, `build`, `_archived`, hidden dirs (`.` prefix)
5. Format as compact key-value lines

The `libs/engine` entry gets a parenthetical "(core business logic)" because it's the largest package and most searches end up there. This hint saves the model a round of exploration.

---

## LM Studio Lifecycle Management

### Startup Sequence

```
gf ask invoked
    │
    ▼
GET /v1/models ─── 200 OK ──→ Server running
    │                              │
    Connection                     ▼
    refused                   Parse model list
    │                              │
    ▼                         ┌────┴─────────────┐
which lms                     │ Models loaded?   │
    │                         └────┬──────┬──────┘
    ├── not found                  │      │
    │     → Error:                Yes    No
    │       "LM Studio            │      │
    │        required"            │      ▼
    │                             │   lms load liquid/lfm2.5-1.2b
    ▼                             │     --gpu max
lms server start                  │     --identifier gf-search
    │                             │      │
    Poll /v1/models               │      Poll /v1/models
    every 1s, up to 10s           │      every 2s, up to 30s
    │                             │      │
    ├── success ──────────────────┤      ├── success
    │                             │      │
    └── timeout                   ▼      └── timeout
          → Error:             Ready!          → Error:
            "Could not                           "Model failed
             start server"                        to load"
```

### Server Discovery

The `lms` binary is discovered the same way as `rg`, `fd`, and `git`: via `exec.LookPath`. Added to the existing `internal/tools/Tools` struct:

```go
type Tools struct {
    Rg  string
    Fd  string
    Git string
    Gh  string
    Lms string  // NEW
}
```

### Auto-start Behavior

Auto-start is **on by default**. The `--no-autostart` flag disables it, which is useful when:
- Running in CI (no LM Studio installed)
- The user manages LM Studio manually
- Testing against a different endpoint

When auto-start is disabled and the server isn't running, `gf ask` exits immediately with a clear message about what's needed.

---

## Configuration

### New Config Fields

```go
type Config struct {
    // ... existing fields ...

    LLMEndpoint string // env: GF_LLM_ENDPOINT, default: http://localhost:1234/v1
    LLMModel    string // env: GF_LLM_MODEL,    default: liquid/lfm2.5-1.2b
    LLMTimeout  int    // env: GF_LLM_TIMEOUT,  default: 30 (seconds)
}
```

### Flags

**Persistent (all commands):**

| Flag | Env Var | Default | Description |
|------|---------|---------|-------------|
| `--llm-endpoint` | `GF_LLM_ENDPOINT` | `http://localhost:1234/v1` | LM Studio API endpoint |
| `--llm-model` | `GF_LLM_MODEL` | `liquid/lfm2.5-1.2b` | Model to use |

**Ask-specific:**

| Flag | Default | Description |
|------|---------|-------------|
| `-i`, `--interactive` | `false` | Launch interactive TUI mode |
| `--no-autostart` | `false` | Skip LM Studio auto-start |
| `--max-rounds` | `7` | Maximum agentic loop iterations |

### Precedence

Flag > Environment variable > Default. Same pattern as existing `--root` / `GROVE_ROOT`.

---

## Output

### Single-shot Mode (default)

The model's answer rendered through existing output functions, with file paths styled as clickable references.

**Success:**

```
  Searching: "that place where all the damn icons are"

  ◐ Thinking... (round 1/7)
  ◐ Searching... grep_search("icon", path: "libs/engine")  (round 2/7)
  ◐ Exploring... list_directory("libs/engine/src/lib/workshop")  (round 3/7)

  Found it!

  libs/engine/src/lib/workshop/entries.ts
  libs/engine/src/lib/workshop/icons.ts

  The service icons and descriptions are defined in the workshop module.
  entries.ts maps each service to its icon, category, and description.
  icons.ts exports the icon components used across service pages.
```

Status lines (`◐ Thinking...`) are printed to stderr so they don't pollute piped output. The final answer goes to stdout.

**give_up (regular mode):**

```
  Searching: "the quantum flux capacitor config"

  Could not find what you described.

  Tried:
    grep_search("quantum")
    grep_search("flux capacitor")
    find_files("quantum")

  You could try:
    gf search "capacitor"
    gf search "flux" --type ts
    gf func "quantumConfig"
```

**Agent mode** (`--agent`): No spinners, no colors. Plain text with `---` section markers.

**JSON mode** (`--json`):

```json
{
  "command": "ask",
  "query": "that place where all the damn icons are",
  "rounds": 3,
  "answer": "The service icons are defined in the workshop module...",
  "files": [
    "libs/engine/src/lib/workshop/entries.ts",
    "libs/engine/src/lib/workshop/icons.ts"
  ],
  "tool_calls": [
    {"tool": "grep_search", "args": {"pattern": "icon", "path": "libs/engine"}, "result_count": 12},
    {"tool": "list_directory", "args": {"path": "libs/engine/src/lib/workshop"}, "result_count": 8},
    {"tool": "grep_search", "args": {"pattern": "icon", "file_type": "ts", "path": "libs/engine/src/lib/workshop"}, "result_count": 3}
  ]
}
```

### Interactive TUI Mode (Phase 2)

A Bubble Tea program with live status, streaming output, and post-answer actions.

```
┌──────────────────────────────────────────────────────────┐
│  gf ask -i                                               │
│                                                          │
│  ◐ Thinking...                                           │
│                                                          │
│  ▸ grep_search("icon", type: "svelte")                   │
│    → 12 results in libs/engine/src/lib/workshop/         │
│                                                          │
│  ▸ list_directory("libs/engine/src/lib/workshop")        │
│    → entries.ts, icons.ts, services.ts, ...              │
│                                                          │
│  ───────────────────────────────────────────────────────  │
│                                                          │
│  Found it! The service icons are defined in:             │
│                                                          │
│    libs/engine/src/lib/workshop/entries.ts               │
│    Each entry maps a service name to its icon,           │
│    description, and category.                            │
│                                                          │
│  ↑↓ scroll  q quit  r retry  n new query  c copy path   │
└──────────────────────────────────────────────────────────┘
```

**TUI States:**

| State | Display | Transitions |
|-------|---------|-------------|
| Connecting | Spinner + "Connecting to LM Studio..." | → Thinking (on connect) |
| Thinking | Spinner + "Thinking..." | → Searching (on tool call) |
| Searching | Tool call name + live result count | → Thinking (next round) or Answer |
| Answer | Scrollable viewport with file paths | → New Query (n) or Quit (q) |
| Failed | Error message + retry prompt | → Connecting (r) or Quit (q) |
| GiveUp | Reason + "Try different phrasing?" prompt | → Thinking (y) or Quit (q) |

**Interactive give_up:** Instead of suggesting `gf` commands, the TUI prompts: "Could not find that. Want to try different words?" The user can type a new description without leaving the session.

**Streaming:** The TUI uses `"stream": true` in the API request. SSE chunks are parsed and rendered token-by-token for the final answer. Tool call arguments stream in too, so the user sees the search pattern forming in real time.

---

## OpenAI-Compatible Client

Raw `net/http` implementation. No external dependencies.

### Types

```go
// Message represents a chat message in the OpenAI format.
type Message struct {
    Role       string      `json:"role"`
    Content    string      `json:"content,omitempty"`
    ToolCalls  []ToolCall  `json:"tool_calls,omitempty"`
    ToolCallID string      `json:"tool_call_id,omitempty"`
}

// ToolCall represents a function call from the model.
type ToolCall struct {
    ID       string       `json:"id"`
    Type     string       `json:"type"`
    Function FunctionCall `json:"function"`
}

// FunctionCall holds the function name and arguments.
type FunctionCall struct {
    Name      string `json:"name"`
    Arguments string `json:"arguments"` // JSON string
}

// ChatRequest is the POST body for /v1/chat/completions.
type ChatRequest struct {
    Model    string    `json:"model"`
    Messages []Message `json:"messages"`
    Tools    []Tool    `json:"tools,omitempty"`
    Stream   bool      `json:"stream,omitempty"`
}

// ChatResponse is the response from /v1/chat/completions.
type ChatResponse struct {
    Choices []Choice `json:"choices"`
}

// Choice holds one completion result.
type Choice struct {
    Message      Message `json:"message"`
    FinishReason string  `json:"finish_reason"`
}

// Tool defines a function the model can call.
type Tool struct {
    Type     string         `json:"type"`
    Function ToolDefinition `json:"function"`
}

// ToolDefinition holds the function schema.
type ToolDefinition struct {
    Name        string `json:"name"`
    Description string `json:"description"`
    Parameters  any    `json:"parameters"`
}
```

### Client

```go
type Client struct {
    endpoint   string        // e.g. "http://localhost:1234/v1"
    model      string        // e.g. "liquid/lfm2.5-1.2b"
    httpClient *http.Client  // with timeout
}

func NewClient(endpoint, model string, timeout time.Duration) *Client
func (c *Client) ChatCompletion(ctx context.Context, req ChatRequest) (*ChatResponse, error)
func (c *Client) ListModels(ctx context.Context) ([]string, error)
func (c *Client) IsHealthy(ctx context.Context) bool
```

The `ChatCompletion` method handles:
- JSON marshaling of the request
- POST to `{endpoint}/chat/completions`
- Response parsing with proper error messages for non-200 status codes
- Timeout enforcement via `http.Client.Timeout` and context cancellation

---

## Error Handling

### Error Catalog

| Code | Condition | User Message |
|------|-----------|-------------|
| `GF-ASK-001` | LM Studio not running, `lms` not found | "LM Studio is required for gf ask. Install from lmstudio.ai" |
| `GF-ASK-002` | LM Studio not running, auto-start failed | "Could not start LM Studio. Start it manually and try again." |
| `GF-ASK-003` | Server running, model failed to load | "Could not load model. Run: lms load liquid/lfm2.5-1.2b --gpu max" |
| `GF-ASK-004` | Request timeout | "Model took too long to respond. Check GPU load or try a smaller model." |
| `GF-ASK-005` | Model returned unparseable response | "Model returned an unexpected response. Retrying..." (retry once) |
| `GF-ASK-006` | Max rounds exceeded | (not an error, forced summarization) |
| `GF-ASK-007` | Duplicate tool call detected | (inject hint to model, not shown to user) |

### Retry Policy

- **Model garbage (GF-ASK-005):** Retry once with the same messages. If it fails again, show the error.
- **Timeout (GF-ASK-004):** No retry. Timeouts usually mean the model is stuck or the GPU is overloaded.
- **Server errors (5xx from LM Studio):** Retry once after a 1-second pause.
- **Everything else:** No retry. Show the error and exit.

---

## Security Considerations

- **Local only.** All traffic goes to `localhost`. No data leaves the machine.
- **No secrets in prompts.** The codebase map contains only directory names, never file contents. Search results are ephemerally passed to the model and discarded.
- **No arbitrary code execution.** The model can only call the 5 defined tools. Tool arguments are validated before execution (e.g., `path` is resolved relative to GroveRoot and cannot escape it).
- **Path traversal prevention.** `list_directory` and `WithPath` resolve paths with `filepath.Join(cfg.GroveRoot, path)` and verify the result is still under GroveRoot.
- **Pattern length cap.** Inherited from `search.RunRg`: max 4096 bytes per regex pattern.

---

## Testing Strategy

| File | Approach | What It Covers |
|------|----------|----------------|
| `client_test.go` | `httptest.NewServer` returning scripted JSON | Request format, response parsing, error handling, timeout |
| `tools_test.go` | Unit tests on tool definition JSON + executor with mock search | Schema validity, argument mapping, result truncation |
| `codemap_test.go` | `os.MkdirTemp` with known structure | Map generation, skip rules, format |
| `agent_test.go` | Mock HTTP server returning tool-call sequences | Loop termination, duplicate detection, give_up handling, round counting |
| `server_test.go` | Mock `exec.Command` (Go test helper pattern) | lms detection, start sequence, model loading |
| `ask_test.go` | Integration: mock server + real search on test fixtures | End-to-end query flow |

The mock HTTP server for `agent_test.go` follows a scripted conversation: round 1 returns a tool call, round 2 returns another, round 3 returns a stop. This validates the full loop without needing a real LLM.

---

## Implementation Checklist

### Phase 1: Single-shot MVP

- [ ] `internal/nlp/client.go` — OpenAI-compatible HTTP client with types
- [ ] `internal/nlp/client_test.go` — Mock server tests
- [ ] `internal/nlp/tools.go` — Tool definitions, JSON schemas, executor
- [ ] `internal/nlp/tools_test.go` — Schema validation, argument mapping
- [ ] `internal/nlp/codemap.go` — Dynamic codebase map generator
- [ ] `internal/nlp/codemap_test.go` — Temp dir structure tests
- [ ] `internal/nlp/agent.go` — Agentic loop, system prompt, convergence
- [ ] `internal/nlp/agent_test.go` — Scripted conversation tests
- [ ] `internal/nlp/server.go` — LM Studio health, auto-start, model load
- [ ] `internal/nlp/server_test.go` — Mock exec tests
- [ ] `internal/tools/tools.go` — Add `Lms` field + `HasLms()`
- [ ] `internal/config/config.go` — Add LLM fields + env var parsing
- [ ] `cmd/ask.go` — Cobra command, flag wiring, orchestration
- [ ] `cmd/root.go` — Register `askCmd`, add persistent LLM flags
- [ ] Manual E2E test with real LM Studio

### Phase 2: Interactive TUI

- [ ] `internal/asktui/tui.go` — Bubble Tea model, states, key bindings
- [ ] Streaming SSE parser in `client.go`
- [ ] `-i` flag wiring in `cmd/ask.go`
- [ ] Live tool-call display during search rounds
- [ ] Post-answer actions: retry, new query, copy path
- [ ] give_up → "try different words?" prompt

### Phase 3: Polish

- [ ] Tune system prompt based on real usage patterns
- [ ] Adjust `max_results` defaults per tool based on model performance
- [ ] Add `--verbose` output showing full tool call details
- [ ] Consider caching codebase map for 60s (if startup scan is noticeable)
- [ ] Document in `gf --help` and `AGENT.md`

---

*You already know where everything is. You just forgot the name. The forest remembers.*
