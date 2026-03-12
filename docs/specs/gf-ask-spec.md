---
title: "GF Ask: Hybrid Vector Search"
description: "Natural language codebase queries combining vector search with grep"
category: specs
specCategory: tooling
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
  - embeddings
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
                    │         ╭─────────╮              │
                    │         │ vectors │              │
                    │         ╰────┬────╯              │
                    │              │ top 20             │
                    │              ▼                    │
                    │         ╭────────╮               │
                    │         │ 🧠 LLM │               │
                    │         ╰───┬────╯               │
                    │             │ refine              │
                    │             ▼                     │
                    │    libs/engine/src/lib/           │
                    │      workshop/entries.ts          │
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

`gf ask` adds natural language search to Grove Find. A local embedding model indexes your codebase into vectors. When you search, your query is embedded and compared against the index. The top matches are handed to a local LLM agent that reads them, refines with targeted searches, and tells you exactly where to look. No cloud APIs. No latency. No cost per query. Two models working together: one for understanding, one for reasoning.

---

## Overview

### What This Is

A new `gf ask` command that accepts natural language queries and returns file paths with explanations. It combines **vector similarity search** (for fast semantic matching) with an **agentic LLM loop** (for refinement and explanation), powered entirely by local models running in LM Studio.

### The Hybrid Approach

Neither vectors nor agents work well alone for this problem:

- **Vectors alone** return ranked files but can't filter noise. "Payment stuff" might return 20 files mentioning "payment" with no way to distinguish the core payment module from a migration doc.
- **Agent alone** (what we built first) can reason about results, but a 1.2B model can't reliably decide *what* to search for. It wastes rounds on broad globs, misses obvious directories, and gives up too early.

**Together:** Vectors handle discovery (semantic understanding). The agent handles interpretation (picking the right files from candidates, drilling in with grep). Each model does what it's good at.

```
 VECTORS                          AGENT
 (embedding model)                (language model)
 ┌──────────────┐                 ┌──────────────┐
 │ Understands   │                │ Reads context │
 │ meaning       │                │ Makes choices │
 │ Ranks by      │                │ Refines with  │
 │ similarity    │                │ grep/list_dir │
 └───────┬──────┘                 └───────┬──────┘
         │ "these 20 files                │ "these 3 are
         │  are most relevant"            │  what you want"
         └──────────────┬─────────────────┘
                        ▼
                  Final answer
```

### Goals

1. **Natural language in, file paths out.** Type what you mean, get where it lives.
2. **Zero cloud dependency.** Everything runs locally. No API keys, no usage fees, no network required.
3. **Zero new Go dependencies.** Raw `net/http` for both LLM and embedding clients. Cosine similarity in pure Go.
4. **Vector-first search.** Semantic understanding via embeddings. The agent refines, not discovers.
5. **Fast indexing, fast queries.** Full index in under 30 seconds. Incremental re-index in seconds. Query response in 2-5 seconds.
6. **Graceful lifecycle management.** Auto-detect and auto-start LM Studio when possible.
7. **Two modes.** Single-shot (default) for quick answers. Interactive TUI (`-i`) for exploratory sessions.

### Non-Goals

- Replacing existing `gf search`, `gf class`, `gf func` commands (those are precise tools, this is a fuzzy finder)
- Supporting cloud LLM providers (this is intentionally local-only)
- Code generation or modification (search only)
- Real-time index updates on every file save (too expensive; re-index on demand or via git hooks)

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
│  │  │ Model load   │  │ Chat + Embed │  │ ~150 tokens  │         │  │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │  │
│  │         │                 │                  │                 │  │
│  │  ┌──────▼─────────────────▼──────────────────▼───────────────┐ │  │
│  │  │                    agent.go                                │ │  │
│  │  │                                                            │ │  │
│  │  │  1. Load vector index                                      │ │  │
│  │  │  2. Embed query via /v1/embeddings                         │ │  │
│  │  │  3. Cosine similarity → top 20 candidates                  │ │  │
│  │  │  4. Build prompt with candidates + codebase map            │ │  │
│  │  │           │                                                │ │  │
│  │  │           ▼                                                │ │  │
│  │  │  POST /v1/chat/completions (messages + tools)              │ │  │
│  │  │           │                                                │ │  │
│  │  │           ├── finish_reason: "tool_calls"                  │ │  │
│  │  │           │     Execute grep_search / list_directory       │ │  │
│  │  │           │     Append results, round++                    │ │  │
│  │  │           │     Loop (max 14 rounds)                       │ │  │
│  │  │           │                                                │ │  │
│  │  │           ├── finish_reason: "stop"                        │ │  │
│  │  │           │     Render answer + file paths                 │ │  │
│  │  │           │                                                │ │  │
│  │  │           └── give_up tool called                          │ │  │
│  │  │                 Show reason + suggested gf commands         │ │  │
│  │  └────────────────────────────────────────────────────────────┘ │  │
│  │                                                                │  │
│  │  index.go                                                      │  │
│  │  ┌────────────────────────────────────────────────────────────┐ │  │
│  │  │  BuildIndex()    ── walk codebase, chunk, embed, save     │ │  │
│  │  │  LoadIndex()     ── read from .grove/gf-index.bin         │ │  │
│  │  │  QueryIndex()    ── embed query, cosine sim, top N        │ │  │
│  │  │  IncrementalUpdate() ── re-embed changed files only       │ │  │
│  │  └────────────────────────────────────────────────────────────┘ │  │
│  │                                                                │  │
│  │  tools.go                                                      │  │
│  │  ┌────────────────────────────────────────────────────────────┐ │  │
│  │  │  vector_search ──→  index.QueryIndex()                    │ │  │
│  │  │  grep_search   ──→  search.RunRg()                        │ │  │
│  │  │  list_dir      ──→  os.ReadDir()                          │ │  │
│  │  │  give_up       ──→  terminates loop                       │ │  │
│  │  └────────────────────────────────────────────────────────────┘ │  │
│  └────────────────────────────────────────────────────────────────┘  │
│                                                                      │
│  internal/asktui/                                                    │
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
| Embedding Client | Raw `net/http` (same client) | Same LM Studio endpoint |
| LLM Runtime | LM Studio (localhost:1234) | Local, free, OpenAI-compatible |
| Chat Model | LFM 2.5 1.2B (`liquid/lfm2.5-1.2b`) | Fast, small, good at tool calling |
| Embedding Model | `jina-code-embeddings-0.5b` | Code-specialized, 896-dim, 32K context, trained on modern TS/Svelte |
| Vector Math | Pure Go (cosine similarity) | No CGo, no external deps |
| Index Storage | Binary file (`.grove/gf-index.bin`) | Fast load, compact |
| Search Backend | ripgrep + fd (existing) | Already integrated via `search.*` |
| TUI Framework | Bubble Tea (existing) | Already a dependency for pager |
| Server Management | `lms` CLI (exec) | Ships with LM Studio |

### Package Structure

```
tools/grove-find-go/
├── cmd/
│   ├── ask.go              ← Cobra command for gf ask
│   └── ... (existing)
├── internal/
│   ├── nlp/
│   │   ├── server.go       ← LM Studio lifecycle
│   │   ├── client.go       ← OpenAI-compatible HTTP client (chat + embeddings)
│   │   ├── agent.go        ← Hybrid loop: vector search → agent refinement
│   │   ├── tools.go        ← Tool definitions + executor (vector_search, grep, list_dir, give_up)
│   │   ├── index.go        ← NEW: Vector index (build, load, query, incremental update)
│   │   ├── chunk.go        ← NEW: File chunking strategies
│   │   └── codemap.go      ← Dynamic codebase map (still used in system prompt)
│   ├── asktui/
│   │   └── tui.go          ← Bubble Tea interactive mode
│   ├── search/             (existing, untouched)
│   ├── config/             (extended: embedding model fields)
│   ├── output/             (existing, untouched)
│   ├── pager/              (existing, untouched)
│   └── tools/              (extended: lms binary discovery)
├── .grove/
│   └── gf-index.bin        ← Vector index file (gitignored, machine-local)
└── ...
```

---

## Vector Index

The index is the foundation of the search system. It maps every meaningful chunk of code to a vector embedding, enabling semantic similarity search.

### Chunking Strategy

Files are chunked based on size:

```
File size              Strategy
─────────────────────  ─────────────────────────────────────────────
< 6000 chars           Whole file as one chunk
                       Embedding text: "{filepath}\n{full content}"

6000-20000 chars       Split on natural boundaries:
                       - Function/class declarations
                       - Export blocks
                       - Section comments (// ----, // ====)
                       Each chunk: "{filepath}:{startLine}-{endLine}\n{content}"

> 20000 chars           Split into ~4000 char windows with 500 char overlap
                       Each chunk: "{filepath}:{startLine}-{endLine}\n{content}"
```

Every chunk is tagged with its file path so results always trace back to the source.

### File Selection

**Indexed:**
- `*.ts`, `*.svelte`, `*.js`, `*.go`, `*.md`, `*.json`, `*.yaml`, `*.css`, `*.html`
- Markdown files (specs, docs) are valuable search targets

**Skipped:**
- `node_modules/`, `dist/`, `build/`, `.git/`, `_archived/`
- `.wrangler/`, `.venv/`, `.worktrees/`, `.svelte-kit/`
- `worker-configuration.d.ts` (generated, 12k+ lines)
- Files over 50000 chars (generated bundles)
- Binary files

### Embedding

Each chunk is embedded via LM Studio's `/v1/embeddings` endpoint:

```
POST /v1/embeddings
{
  "model": "jina-code-embeddings-0.5b",
  "input": "libs/engine/src/lib/payments/stripe.ts\nimport { StripeClient } from..."
}

→ { "data": [{ "embedding": [0.023, -0.118, ...] }] }  // 896 floats
```

Embeddings are 896-dimensional float32 vectors. At ~3.5KB per vector and ~7000 chunks, the full index is roughly **24-28MB**.

### Index Storage Format

Binary format for fast loading:

```
Header:
  magic: "GFIDX" (5 bytes)
  version: uint8 (1)
  dimensions: uint16 (896)
  chunk_count: uint32
  embedding_model: length-prefixed string

Per chunk:
  filepath: length-prefixed string
  start_line: uint32
  end_line: uint32
  snippet: length-prefixed string (first 200 chars, for display)
  mtime: int64 (unix timestamp)
  vector: [896]float32
```

Stored at `.grove/gf-index.bin` in the project root. Gitignored. Machine-local.

### Building the Index

```
gf ask --index
    │
    ▼
Walk codebase (skip excluded dirs/files)
    │
    ▼
Chunk each file based on size
    │
    ▼
Batch embed via /v1/embeddings
(batch size: 32 chunks per request)
    │
    ▼
Write .grove/gf-index.bin
    │
    ▼
Done. "Indexed 4,832 chunks from 3,291 files in 18.3s"
```

### Incremental Re-indexing

```
gf ask --reindex
    │
    ▼
Load existing index
    │
    ▼
Walk codebase, compare mtimes
    │
    ├── File unchanged → keep existing chunks
    ├── File modified  → re-chunk, re-embed, replace
    ├── File deleted   → remove chunks
    └── File new       → chunk, embed, add
    │
    ▼
Write updated index
    │
    ▼
Done. "Re-indexed 47 chunks from 12 changed files in 2.1s"
```

### Querying

```go
func QueryIndex(index *Index, queryVec []float32, topN int) []SearchResult {
    // Cosine similarity against all chunks
    // Return top N sorted by score
}

type SearchResult struct {
    FilePath  string
    StartLine int
    EndLine   int
    Snippet   string
    Score     float32  // 0.0 to 1.0
}
```

Pure Go cosine similarity. No external libraries. For 7000 chunks with 896-dim vectors, this takes <5ms.

---

## The Hybrid Search Flow

This replaces the previous pure-agentic loop.

```
Query: "where are the payment webhooks"
           │
           ▼
    ┌──────────────┐
    │ Embed query   │  (1 API call, ~10ms)
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐
    │ Vector search │  (cosine sim, <5ms)
    │ top 20 chunks │
    └──────┬───────┘
           │
           │  Candidates:
           │  1. libs/engine/src/lib/payments/webhook-handler.ts  (0.87)
           │  2. workers/webhook-cleanup/src/index.ts             (0.84)
           │  3. libs/engine/src/lib/payments/stripe.ts           (0.81)
           │  4. docs/specs/payment-webhooks-spec.md              (0.79)
           │  5. ... (16 more)
           │
           ▼
    ┌──────────────┐
    │ Agent prompt  │  "Here are the top search results for the query.
    │ + candidates  │   Which files best match? You can use grep_search
    │ + codebase    │   or list_directory to refine."
    │   map         │
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐
    │ LLM decides: │  Round 1: grep_search("webhook", path: "libs/engine/src/lib/payments")
    │ refine       │  Round 2: "stop" — found the answer
    └──────┬───────┘
           │
           ▼
    Answer: libs/engine/src/lib/payments/webhook-handler.ts
            workers/webhook-cleanup/src/index.ts
            "Payment webhooks are handled in two places..."
```

### Why This Works

The old flow required the agent to *discover* files through blind search. The new flow hands the agent 20 pre-ranked candidates and asks it to *choose* from them. Choosing from a list is trivially easy for even a 1.2B model.

The refinement tools (grep, list_dir) still exist for when the agent wants to peek inside a file or explore a directory it saw in the candidates. But the heavy lifting is done by vectors.

---

## Tool Definitions

Four tools. Down from five (removed `find_files` and `find_by_glob`, added `vector_search`).

### `vector_search`

Semantic search against the pre-built index.

```json
{
  "type": "function",
  "function": {
    "name": "vector_search",
    "description": "Semantic search across the codebase. Returns the most relevant files ranked by similarity to your query. This is your primary search tool.",
    "parameters": {
      "type": "object",
      "properties": {
        "query": {
          "type": "string",
          "description": "Natural language description of what you are looking for"
        },
        "top_n": {
          "type": "integer",
          "description": "Number of results to return (default: 20)"
        }
      },
      "required": ["query"]
    }
  }
}
```

**Maps to:** Embed query via `/v1/embeddings`, then `index.QueryIndex()`. Returns file paths with similarity scores and snippets.

**This is the primary tool.** The agent should call this first on every query. The results give it a map of the most relevant code to work with.

### `grep_search`

Search file contents using ripgrep. For targeted refinement after vector_search narrows the field.

```json
{
  "type": "function",
  "function": {
    "name": "grep_search",
    "description": "Search file contents for a regex pattern. Returns matching lines with file paths and line numbers. Use this to refine after vector_search.",
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

**Maps to:** `search.RunRg(pattern, opts...)` with result truncation.

### `list_directory`

List the contents of a directory (one level deep).

```json
{
  "type": "function",
  "function": {
    "name": "list_directory",
    "description": "List files and subdirectories in a directory (one level). Use this to explore directories found by vector_search.",
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

**Maps to:** `os.ReadDir()` on the resolved path. Capped at 100 entries.

### `give_up`

Signal that the search cannot find what the user described.

```json
{
  "type": "function",
  "function": {
    "name": "give_up",
    "description": "Call this when you cannot find what the user described after reviewing vector results and trying refinement searches.",
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

---

## System Prompt

The system prompt changes significantly. The agent is no longer searching blindly. It receives vector candidates and interprets them.

### Template (~250 tokens)

```
You are a codebase search assistant for a TypeScript/Svelte monorepo called Lattice.

The user asked: "{query}"

Below are the top search results from semantic vector search, ranked by relevance.
Review these results and identify which files best match the user's query.

You can use these tools to refine:
- grep_search: search inside files for specific patterns
- list_directory: explore a directory's contents
- give_up: if nothing matches after reviewing results

RULES:
1. Start by reviewing the vector search results below. Most answers are in there.
2. Use grep_search to verify or drill into specific files from the results.
3. Use list_directory to explore directories that appear in the results.
4. Respond with ONLY file paths and a brief description. Do not guess paths.

VECTOR SEARCH RESULTS:
{top 20 results with scores and snippets}

CODEBASE MAP:
{dynamic codebase map}
```

The key difference: the agent starts with context, not a blank slate. The vector results are baked into the first message. The agent's job is interpretation, not discovery.

---

## The Agentic Loop (Updated)

### Flow

1. **Embed the query** via `/v1/embeddings` (single API call)
2. **Vector search** against the index → top 20 candidates
3. **Build the system prompt** with candidates + codebase map
4. **Enter agent loop** (max 14 rounds, but typically 1-3 now)
5. Agent reviews candidates, optionally uses grep/list_dir to refine
6. Agent returns answer with file paths

### Loop Rules

1. **Max 14 rounds.** After round 14, forced summarization. In practice, with vector candidates pre-loaded, most queries resolve in 1-3 rounds.

2. **Minimum 2 tool calls before give_up.** The agent should at least review vectors and try one refinement before surrendering.

3. **Duplicate detection.** Same as before. If the model repeats a call, inject a hint.

4. **Auto vector_search on round 1.** If the agent doesn't call vector_search in round 1, the system automatically injects vector results. This handles cases where the model skips the tool and tries to answer from the codebase map alone.

5. **No index, no problem.** If the vector index doesn't exist, fall back to the pure agentic approach (grep_search + list_directory). Print a hint: "Run `gf ask --index` for faster, smarter search."

### Convergence Guarantee

The loop always terminates via one of:
- Model returns `finish_reason: "stop"` (natural answer)
- Model calls `give_up` tool (explicit surrender)
- Round counter exceeds 14 (forced summarization)
- HTTP error or timeout (error path)

---

## LM Studio Lifecycle Management

### Models Required

`gf ask` needs two models loaded in LM Studio:

| Model | Purpose | Size | Config |
|-------|---------|------|--------|
| `liquid/lfm2.5-1.2b` | Chat/reasoning | ~1.2B params | `GF_LLM_MODEL` |
| `jina-code-embeddings-0.5b` | Embeddings | ~500M params | `GF_EMBED_MODEL` |

Both run simultaneously. Total VRAM usage: ~2-3GB.

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
    ▼                         Check both models loaded
which lms                         │
    │                         ┌────┴─────────────┐
    ├── not found             │                  │
    │     → Error:          Both              Missing
    │       "LM Studio       loaded            model(s)
    │        required"        │                  │
    │                         │                  ▼
    ▼                         │    lms load <missing-model>
lms server start              │      --gpu max
    │                         │      │
    Poll /v1/models           │      Poll /v1/models
    every 1s, up to 10s       │      every 2s, up to 30s
    │                         │      │
    ├── success ──────────────┤      ├── success
    │                         │      │
    └── timeout               ▼      └── timeout
          → Error:         Ready!          → Error:
            "Could not                       "Model failed
             start server"                    to load"
```

### Auto-start Behavior

Auto-start is **on by default**. The `--no-autostart` flag disables it. When auto-start is disabled and the server isn't running, `gf ask` exits with a clear message.

---

## Configuration

### Config Fields

```go
type Config struct {
    // ... existing fields ...

    LLMEndpoint  string // env: GF_LLM_ENDPOINT,  default: http://localhost:1234/v1
    LLMModel     string // env: GF_LLM_MODEL,     default: liquid/lfm2.5-1.2b
    EmbedModel   string // env: GF_EMBED_MODEL,   default: jina-code-embeddings-0.5b
    LLMTimeout   int    // env: GF_LLM_TIMEOUT,   default: 30 (seconds)
}
```

### Flags

**Persistent (all commands):**

| Flag | Env Var | Default | Description |
|------|---------|---------|-------------|
| `--llm-endpoint` | `GF_LLM_ENDPOINT` | `http://localhost:1234/v1` | LM Studio API endpoint |
| `--llm-model` | `GF_LLM_MODEL` | `liquid/lfm2.5-1.2b` | Chat model |
| `--embed-model` | `GF_EMBED_MODEL` | `jina-code-embeddings-0.5b` | Embedding model |

**Ask-specific:**

| Flag | Default | Description |
|------|---------|-------------|
| `-i`, `--interactive` | `false` | Launch interactive TUI mode |
| `--no-autostart` | `false` | Skip LM Studio auto-start |
| `--max-rounds` | `14` | Maximum agentic loop iterations |
| `--index` | `false` | Build/rebuild the vector index |
| `--reindex` | `false` | Incrementally update the index |
| `--no-vectors` | `false` | Skip vector search, use pure agent mode |

---

## Output

### Single-shot Mode (default)

**Success:**

```
  Searching: "where are the payment webhooks"

  ◐ Searching index... (4,832 chunks)
  ◐ Found 20 candidates
  ◐ Refining... grep_search("webhook", path: "libs/engine/src/lib/payments")  (round 1/14)

  Found it!

  libs/engine/src/lib/payments/webhook-handler.ts
  workers/webhook-cleanup/src/index.ts

  Payment webhooks are handled in two places:
  webhook-handler.ts processes incoming Stripe/LemonSqueezy events.
  webhook-cleanup runs as a scheduled worker to retry failed deliveries.
```

**No index (fallback):**

```
  Searching: "where are the payment webhooks"

  ⚠ No vector index found. Run `gf ask --index` for faster search.
  ◐ Thinking... (round 1/14)
  ...
```

**Index build:**

```
  gf ask --index

  Building vector index...
  ◐ Scanning files... 3,291 files found
  ◐ Chunking... 4,832 chunks
  ◐ Embedding... [████████████████████████] 4,832/4,832
  ◐ Writing .grove/gf-index.bin (22.4 MB)

  Index built in 18.3s
  4,832 chunks from 3,291 files
```

**JSON mode** (`--json`):

```json
{
  "command": "ask",
  "query": "where are the payment webhooks",
  "rounds": 2,
  "vector_candidates": 20,
  "answer": "Payment webhooks are handled in two places...",
  "files": [
    "libs/engine/src/lib/payments/webhook-handler.ts",
    "workers/webhook-cleanup/src/index.ts"
  ],
  "tool_calls": [
    {"tool": "vector_search", "args": {"query": "payment webhooks"}, "result_count": 20},
    {"tool": "grep_search", "args": {"pattern": "webhook", "path": "libs/engine/src/lib/payments"}, "result_count": 5}
  ]
}
```

### Interactive TUI Mode

Same Bubble Tea program as before, with an added index status indicator:

```
┌──────────────────────────────────────────────────────────┐
│  gf ask -i                                               │
│                                                          │
│  ▸ vector_search("payment webhooks") → 20 candidates     │
│  ▸ grep_search("webhook", path: "payments/") → 5 results │
│                                                          │
│  ───────────────────────────────────────────────────────  │
│                                                          │
│  Found it!                                               │
│                                                          │
│    libs/engine/src/lib/payments/webhook-handler.ts       │
│    workers/webhook-cleanup/src/index.ts                  │
│                                                          │
│  Payment webhooks are handled in two places:             │
│  webhook-handler.ts processes incoming Stripe events.    │
│  webhook-cleanup retries failed deliveries.              │
│                                                          │
│  ↑↓ scroll  q quit  r retry  n new query  c copy path   │
└──────────────────────────────────────────────────────────┘
```

---

## OpenAI-Compatible Client

Same raw `net/http` client as before, extended with an embedding method.

### Extended Client

```go
type Client struct {
    endpoint   string
    model      string        // chat model
    embedModel string        // embedding model
    httpClient *http.Client
}

func NewClient(endpoint, model, embedModel string, timeout time.Duration) *Client

// Existing
func (c *Client) ChatCompletion(ctx context.Context, req ChatRequest) (*ChatResponse, error)
func (c *Client) ListModels(ctx context.Context) ([]string, error)
func (c *Client) IsHealthy(ctx context.Context) bool

// New
func (c *Client) Embed(ctx context.Context, texts []string) ([][]float32, error)
```

### Embedding Types

```go
// EmbedRequest is the POST body for /v1/embeddings.
type EmbedRequest struct {
    Model string   `json:"model"`
    Input []string `json:"input"`
}

// EmbedResponse is the response from /v1/embeddings.
type EmbedResponse struct {
    Data []EmbedData `json:"data"`
}

// EmbedData holds one embedding result.
type EmbedData struct {
    Embedding []float32 `json:"embedding"`
    Index     int       `json:"index"`
}
```

The `Embed` method sends batches of texts and returns their vector representations. Batch size capped at 32 to avoid overwhelming the embedding model.

---

## Security Considerations

- **Local only.** All traffic goes to `localhost`. No data leaves the machine.
- **No secrets in prompts.** The codebase map contains only directory names. Search results pass through the model ephemerally.
- **No arbitrary code execution.** Tools are limited to read-only operations (grep, list_dir, vector lookup).
- **Path traversal prevention.** All path arguments are resolved relative to GroveRoot and validated.
- **Index is read-only at query time.** The index file is only written during explicit `--index` or `--reindex` operations.
- **Index is machine-local.** Gitignored. Contains code snippets but never leaves the local filesystem.

---

## Error Handling

### Error Catalog

| Code | Condition | User Message |
|------|-----------|-------------|
| `GF-ASK-001` | LM Studio not running, `lms` not found | "LM Studio is required for gf ask. Install from lmstudio.ai" |
| `GF-ASK-002` | LM Studio not running, auto-start failed | "Could not start LM Studio. Start it manually and try again." |
| `GF-ASK-003` | Server running, model failed to load | "Could not load model. Run: lms load {model} --gpu max" |
| `GF-ASK-004` | Request timeout | "Model took too long to respond." |
| `GF-ASK-005` | Model returned unparseable response | "Unexpected response. Retrying..." (retry once) |
| `GF-ASK-006` | Max rounds exceeded | (not an error, forced summarization) |
| `GF-ASK-007` | No vector index | Warning + fallback to pure agent mode |
| `GF-ASK-008` | Index corrupt or wrong version | "Index file is corrupted. Run `gf ask --index` to rebuild." |
| `GF-ASK-009` | Embedding model not loaded | "Embedding model required. Run: lms load jina-code-embeddings-0.5b" |

---

## Testing Strategy

| File | Approach | What It Covers |
|------|----------|----------------|
| `client_test.go` | `httptest.NewServer` | Chat completion, embedding, error handling, timeout |
| `index_test.go` | Temp dir + mock embeddings | Chunking, index build/load/query, incremental update, cosine similarity |
| `chunk_test.go` | Unit tests on chunking logic | Size thresholds, boundary detection, path tagging |
| `tools_test.go` | Unit tests on tool executor | vector_search dispatch, grep_search, list_dir, give_up |
| `codemap_test.go` | `os.MkdirTemp` | Map generation, skip rules, format |
| `agent_test.go` | Mock HTTP server | Loop termination, vector-first flow, fallback to pure agent |
| `server_test.go` | Mock `exec.Command` | lms detection, dual model loading |

---

## Implementation Checklist

### Phase 1: Vector Index (NEW)

- [ ] `internal/nlp/chunk.go` — File walking, size-based chunking, boundary detection
- [ ] `internal/nlp/chunk_test.go` — Chunking unit tests
- [ ] `internal/nlp/index.go` — Index build, load, save, query (cosine similarity)
- [ ] `internal/nlp/index_test.go` — Index lifecycle tests with mock embeddings
- [ ] `client.go` — Add `Embed()` method and types
- [ ] `client_test.go` — Add embedding endpoint tests
- [ ] `cmd/ask.go` — Add `--index`, `--reindex` flags and index build flow
- [ ] `config.go` — Add `EmbedModel` field
- [ ] Manual test: build index, verify file count and size

### Phase 2: Hybrid Agent

- [ ] `tools.go` — Replace find_files/find_by_glob with vector_search tool
- [ ] `agent.go` — Rewrite loop: embed query → vector search → agent refines
- [ ] `agent_test.go` — Update tests for vector-first flow
- [ ] System prompt rewrite for interpreter role (not searcher role)
- [ ] Fallback to pure agent mode when no index exists
- [ ] Manual E2E test with real LM Studio (both models loaded)

### Phase 3: Polish

- [ ] Tune vector result count (top N) based on real usage
- [ ] Add progress bar for index building
- [ ] Incremental re-index via `--reindex`
- [ ] Git hook integration docs (post-commit re-index)
- [ ] `--verbose` output showing vector scores and tool call details
- [ ] Document in `gf --help` and `AGENT.md`

### Already Complete (from v1)

- [x] `internal/nlp/client.go` — OpenAI-compatible HTTP client
- [x] `internal/nlp/codemap.go` — Dynamic codebase map
- [x] `internal/nlp/server.go` — LM Studio lifecycle
- [x] `internal/asktui/tui.go` — Bubble Tea interactive mode
- [x] `cmd/ask.go` — Cobra command, flag wiring, output rendering
- [x] `cmd/root.go` — Register askCmd, persistent LLM flags
- [x] `internal/config/config.go` — LLM config fields
- [x] `internal/tools/tools.go` — lms binary discovery

---

*You already know where everything is. You just forgot the name. The forest remembers.*
