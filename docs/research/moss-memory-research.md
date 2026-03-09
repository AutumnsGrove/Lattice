# Moss: Grove's AI Memory System

## Research & Architecture Document

**Date:** March 9, 2026
**Status:** Research Complete → Ready for Spec Development
**Author:** Autumn (via research session with Claude)
**Location in Grove:** Module inside Lumen (AI Gateway)

---

## Table of Contents

- [Executive Summary](#executive-summary)
- [Part 1: Memvid Research — What We Learned](#part-1-memvid-research)
- [Part 2: Why Memvid Doesn't Fit Grove](#part-2-why-memvid-doesnt-fit-grove)
- [Part 3: Industry Memory Patterns](#part-3-industry-memory-patterns)
- [Part 4: Moss Architecture](#part-4-moss-architecture)
- [Part 5: Retrieval Pattern Design](#part-5-retrieval-pattern-design)
- [Part 6: Write-Back & Memory Extraction](#part-6-write-back--memory-extraction)
- [Part 7: Portability & Export](#part-7-portability--export)
- [Part 8: Cloudflare Infrastructure Mapping](#part-8-cloudflare-infrastructure-mapping)
- [Part 9: Implementation Roadmap](#part-9-implementation-roadmap)
- [Part 10: Open Questions](#part-10-open-questions)
- [Appendix: Key Sources](#appendix-key-sources)

---

## Executive Summary

Moss is Grove's AI memory system — a per-tenant conversational memory layer that gives Grove's AI agents persistent, personalized context across sessions. It lives as a module inside Lumen (Grove's AI gateway) and is built entirely on Cloudflare-native primitives.

The name comes from how forests remember: moss grows slowly, persistently, on everything it touches. It's always there. Moss remembers what the forest has seen.

### Key Decisions Made

- **Name:** Moss (repurposed from prior agent spec, which will be renamed)
- **Architecture:** Module inside Lumen, not a standalone service
- **Storage:** D1 (structured facts) + Vectorize (semantic search) + Workers AI (embeddings)
- **Coordination:** MossDO — a Loom-pattern Durable Object per user
- **Retrieval:** Three-layer system (warm context → sliding window → model tool)
- **Write-back:** Async extraction on conversation idle via DO alarms
- **Export:** Human-readable markdown + ingestion prompt, separate from .grove content export
- **No external dependencies:** No Memvid, no Mem0, no external vector databases

### How We Got Here

Research began with tracking down Memvid — an open-source project that encodes AI memory into video files via QR codes. The project evolved significantly from a Reddit proof-of-concept into a legitimate Rust-based memory system with a custom `.mv2` binary format. However, deep compatibility analysis revealed it cannot run on Cloudflare Workers due to Tantivy (its full-text search engine) being synchronous and requiring memory-mapped files, plus WASM binary size constraints. This led to the decision to build a Grove-native solution using Cloudflare primitives that achieve the same goals.

---

## Part 1: Memvid Research

### Origin Story

**Creator:** Saleban Olow (GitHub: Olow304), a full-stack developer at WhenIWork and graduate student at University of St. Thomas.

**Timeline:**
- **~May 2025:** V1 posted on Reddit. Encoded text chunks as QR codes inside MP4 video frames. Used FAISS for vector search with a sidecar JSON index. Pitched as "SQLite for AI memory."
- **June 2025:** Received significant criticism on Lobsters and Hacker News. Critics pointed out the QR-in-video approach had no technical benefit over simpler formats, and the implementation fell back to loading text from JSON when QR decoding failed.
- **June 13, 2025:** Froze V1 development entirely. Announced ground-up rewrite as Memvid 2.0.
- **January 4, 2026:** V2 launched. Complete Rust rewrite with custom `.mv2` binary format. QR codes fully removed.
- **March 2026 (current):** Active development. ~13.3K GitHub stars. Dedicated org (github.com/memvid). Full documentation site at docs.memvid.com.

### V1 Architecture (Deprecated)

```
Text → chunk → embed → QR code image
QR frames → stitched into MP4 (H.264/H.265)
Index → FAISS vectors + metadata JSON
Search → embed(query) → cosine in FAISS → frame seek → decode QR → return text
```

**Problems:** Slow QR decoding, platform-dependent video codec behavior, no crash recovery, vector-only search (no full-text), Python-only, JSON fallback undermined the entire premise.

### V2 Architecture (Current)

The `.mv2` file format is a purpose-built binary container:

- **Header:** First 4,096 bytes. Magic bytes (`MV2\0`), version numbers, section pointers.
- **Embedded WAL:** Write-ahead log directly in the file (1MB–64MB scaling with file size). Every mutation hits WAL first. Crash recovery replays from last checkpoint.
- **Data Segments:** Compressed frame payloads. Frames are append-only and immutable. Updates mark old versions as superseded.
- **Search Indices:** HNSW for vector similarity (with optional product quantization) + embedded Tantivy index for BM25 full-text ranking.
- **Security:** Blake3 checksums, Ed25519 signatures, optional AES-256-GCM encryption.

**No external files** — no `.wal`, `.lock`, `.shm` sidecars. Everything in one file.

**SDKs:** Rust (core), Node.js (`@memvid/sdk`), Python (`memvid-sdk`), CLI (`memvid-cli`).

**Benchmarks (claimed):** 0.025ms P50 / 0.075ms P99 retrieval latency. +35% SOTA on LoCoMo. +76% multi-hop reasoning vs industry average.

### What Memvid Got Right (Insights We're Adopting)

1. **Selective retrieval over full-context dumping.** Don't inject all memories — inject only what's relevant to the current query.
2. **Structured facts over raw transcripts.** Store "user prefers dark mode" not "user said 'yeah I like dark mode better.'"
3. **Four-operation update pattern:** add, update, delete, no-op. Every candidate memory gets compared against existing memories.
4. **Hybrid search.** BM25 (keyword) + vector (semantic) combined. Sometimes you need exact match, sometimes you need vibes.
5. **Per-user isolation as architecture, not policy.** When each user's memory is physically separate, tenant isolation is guaranteed by design.
6. **Portability as a feature.** Users should be able to take their memory data and leave.

---

## Part 2: Why Memvid Doesn't Fit Grove

### The Cloudflare Compatibility Wall

Grove runs entirely on Cloudflare infrastructure (Workers, D1, R2, KV, Durable Objects). Memvid's core is written in Rust and would need to compile to WASM to run in Workers. This doesn't work for multiple reasons:

1. **Tantivy is synchronous.** Cloudflare Workers don't support synchronous I/O. Grafbase specifically attempted running Tantivy on Workers and confirmed it doesn't work.
2. **Tantivy uses memory-mapped files (memmap).** WASM environments don't have filesystem access in the way memmap requires.
3. **WASM binary size.** Tantivy alone compiles to ~15MB WASM (4MB gzipped) in debug mode. With the full memvid-core (HNSW, WAL, embeddings), this would be much larger. Large WASM modules cause severe cold-start latency in Workers due to V8 compilation overhead.
4. **No Tokio/async_std.** The workers-rs crate explicitly states no threaded async runtime support. Memvid-core relies on Tokio.

### Alternative Deployment Considered

Running Memvid on a separate compute instance (Hetzner VPS) with a Worker as a thin API gateway was considered. This was rejected because:

- Adds an external dependency outside Cloudflare's network
- Introduces a network hop for every memory operation
- Complicates deployment and monitoring (already have Vista for CF-native services)
- Defeats the "everything on Cloudflare" architecture principle
- The actual features needed are achievable with CF-native primitives

---

## Part 3: Industry Memory Patterns

### Mem0

**Approach:** Dedicated memory layer with extraction and update phases. Stores memories across three backends: vector store (semantic), key-value store (fast lookups), and graph database (relational queries). Hierarchical memory at user, session, and agent levels.

**Key insight:** Selective memory retrieval that dynamically identifies and retrieves only the most salient information rather than fixed-size chunks. Achieves 90% reduction in token consumption (~1.8K tokens vs 26K for full-context methods).

**Pipeline:** Two-phase — extraction (LLM distills conversation into candidate facts using rolling summary + recent messages) and update (candidates compared against stored memories → add/update/delete/no-op). Background job asynchronously refreshes long-term summary.

**Latency:** p50 0.148s search, p50 0.708s total end-to-end (including LLM generation).

### Letta (MemGPT)

**Approach:** OS-inspired "virtual memory" for LLM agents. Dual-layer architecture:

- **In-context memory:** System instructions, readable/writable memory blocks, current conversation. Always in the prompt.
- **Out-of-context memory:** Long-term storage for conversation history and external knowledge. Retrieved on demand.

When context window fills, system automatically compresses conversation history into recursive summaries. Agents manage their own memory through tool calls: `core_memory_append`, `core_memory_replace`, `recall`.

**Key insight:** Memory as something the agent actively manages, not just retrieves. The agent can edit its own memory blocks.

### Claude (Anthropic)

**Approach:** Pre-load a block of memories at conversation start. Memories are extracted from past conversations periodically in the background. Users can edit memories directly. Recently launched a memory import tool that gives users a prompt to extract memories from other services (ChatGPT) and import them.

**Key insight:** The import prompt approach — letting an LLM on the other end do the work of parsing and ingesting. We're flipping this for export.

### Common Patterns Across All

1. Store insights/facts, not raw transcripts
2. Async extraction — don't block the conversation to process memories
3. Selective retrieval — don't dump everything into context
4. User-scoped isolation — memories are per-user
5. Some form of importance/relevance scoring at retrieval time

---

## Part 4: Moss Architecture

### Overview

Moss is a module inside Lumen (Grove's AI gateway built on OpenRouter). It provides per-tenant, per-user conversational memory that persists across sessions and can be selectively retrieved to enrich AI inference requests.

```
┌─────────────────────────────────────────────────────┐
│  Lumen (AI Gateway Worker)                          │
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────┐  │
│  │ Songbird │  │   Moss   │  │  OpenRouter      │  │
│  │ (prompt  │  │ (memory) │  │  forwarding      │  │
│  │  safety) │  │          │  │                  │  │
│  └──────────┘  └──────────┘  └──────────────────┘  │
│                     │                               │
│              ┌──────┴──────┐                        │
│              │   MossDO    │  (Loom-pattern DO)     │
│              │  per-user   │                        │
│              └──────┬──────┘                        │
│                     │                               │
│         ┌───────────┼───────────┐                   │
│         │           │           │                   │
│     ┌───┴───┐  ┌────┴────┐ ┌───┴────┐              │
│     │  D1   │  │Vectorize│ │Workers │              │
│     │(facts)│  │(vectors)│ │AI(emb) │              │
│     └───────┘  └─────────┘ └────────┘              │
│                                                     │
│  ┌──────────┐                                       │
│  │   R2     │  (memory export files)                │
│  └──────────┘                                       │
└─────────────────────────────────────────────────────┘
```

### Storage Layer

**D1 — Structured Memory Store**

Each tenant has a D1 database (existing multi-tenant pattern). Moss adds a `memories` table:

```sql
CREATE TABLE memories (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  fact TEXT NOT NULL,
  category TEXT,                    -- e.g., 'preference', 'context', 'personal', 'project'
  source_conversation_id TEXT,
  importance_score REAL DEFAULT 0.5,
  access_count INTEGER DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  superseded_by TEXT,               -- ID of newer memory that replaced this one
  is_active INTEGER DEFAULT 1
);

CREATE INDEX idx_memories_user ON memories(user_id, is_active);
CREATE INDEX idx_memories_category ON memories(user_id, category, is_active);
CREATE INDEX idx_memories_importance ON memories(user_id, importance_score DESC);
```

FTS5 for keyword search:

```sql
CREATE VIRTUAL TABLE memories_fts USING fts5(
  fact,
  category,
  content=memories,
  content_rowid=rowid
);
```

**Vectorize — Semantic Search**

Each memory's `fact` text gets embedded via Workers AI and stored in a Vectorize index. Metadata includes the D1 record ID, user_id, category, and importance_score. Queries embed the user's message and retrieve top-K most similar memories filtered by user_id.

**Workers AI — Embeddings**

Model: `bge-base-en-v1.5` or equivalent available on Workers AI. Runs on Cloudflare's edge — no external API call. Used for both indexing (when memories are created) and querying (when memories are retrieved).

### MossDO — The Coordination Layer

A Loom-pattern Durable Object per user. Responsibilities:

1. **Warm context cache:** Maintains the user's top 10-20 most important/recent/frequent memories in-memory. Updated periodically, not on every conversation.
2. **Write coordination:** Serializes memory writes to prevent race conditions from concurrent conversations.
3. **Idle detection:** Sets DO alarms. When a conversation goes idle (configurable, default 30 minutes), triggers the async memory extraction job.
4. **Topic tracking:** Maintains a rolling topic vector for the active conversation to power the sliding window retrieval trigger.

---

## Part 5: Retrieval Pattern Design

### Three-Layer Retrieval

Retrieval is layered from cheapest/always-on to most expensive/on-demand:

#### Layer 1 — Warm Context (Free, Always On)

The MossDO maintains a cached set of the user's most important memories (10-20 facts). These are injected into the system prompt at conversation start. No embedding call. No database query. They're just there.

**Selection criteria for warm set:**
- Highest importance score
- Most recently updated
- Most frequently accessed
- Category diversity (don't load 15 preferences and 0 project context)

**Update frequency:** When new memories are extracted (post-conversation), the warm set gets re-evaluated. Not on every turn.

**Expected coverage:** ~60-70% of conversations. Most people talk about the things they usually talk about.

#### Layer 2 — Sliding Window Gate (Cheap, Automatic)

Lumen tracks a rolling topic vector for the conversation. On each turn:

1. Embed the new user message via Workers AI (may already be happening for other purposes)
2. Compare cosine similarity between new message embedding and recent conversation topic vector
3. If similarity drops below threshold (topic shift detected), query Vectorize for top 5-8 cold memories relevant to the NEW topic
4. Inject retrieved memories into the next request's context
5. If topic is stable, this layer does nothing

**Cost:** One embedding per turn (cheap on Workers AI), occasional Vectorize query.

**Threshold tuning:** Start conservative (e.g., cosine similarity < 0.7 triggers retrieval). Tune based on real usage data.

#### Layer 3 — Model Tool (On-Demand, Explicit)

The model receives two tools:

**`recall_memory(query: string)`** — Explicitly search cold storage. Returns top-K results from Vectorize + D1 hydration. Use case: model senses it's missing context, user references something specific from the past.

**`save_memory(fact: string, category?: string)`** — Write a memory directly from the conversation. Use case: user says "actually, I switched to Porkbun for domains" and the model can update that fact in real-time without waiting for the idle extraction.

**Cost:** Only fires when the model decides to use it. Should be rare if layers 1 and 2 are working.

### Token Budget

Target: inject no more than ~1.5-2K tokens of memory context per request. This aligns with Mem0's findings that selective retrieval at this scale achieves near-SOTA accuracy while keeping costs manageable.

- Warm context: ~500-800 tokens (10-20 concise facts)
- Sliding window retrieval: ~500-800 tokens (5-8 additional facts when triggered)
- Tool retrieval: ~300-500 tokens (on-demand, additive)

---

## Part 6: Write-Back & Memory Extraction

### Async Extraction on Conversation Idle

The MossDO sets a DO alarm when a conversation is active. When no new message arrives within the idle timeout (default: 30 minutes):

1. **Retrieve conversation history** from the session
2. **Send to extraction model** — a cheap, fast model (Workers AI or a low-cost OpenRouter tier). Not the main inference model.
3. **Extraction prompt** asks the model to output structured candidate facts:
   ```
   Extract key facts, preferences, and context from this conversation.
   Output as JSON array: [{ "fact": "...", "category": "...", "importance": 0.0-1.0 }]
   Only extract facts worth remembering long-term. Ignore pleasantries and transient context.
   ```
4. **Compare candidates against existing memories:**
   - **New fact:** Embed and add to D1 + Vectorize
   - **Update to existing fact:** Update D1 record, re-embed in Vectorize, set `superseded_by` on old version
   - **Contradicts existing fact:** Update with newer version, timestamp the change
   - **Noise/duplicate:** Discard
5. **Re-evaluate warm context set** if new memories were added
6. **Reset alarm** — if user returns, the pipeline restarts

### Edge Cases

- **User returns before timer fires:** Cancel alarm, reset timer. Extraction happens later.
- **Very long conversation:** Could extract incrementally at natural breakpoints (e.g., every 20 turns) rather than waiting for full idle. Future enhancement.
- **Multiple concurrent conversations:** MossDO serializes writes. Each conversation's extraction is queued.

---

## Part 7: Portability & Export

### Export Strategy

Memory export is a **separate download** from the `.grove` content export. Cleanest boundary — content is what you created, memory is what the platform learned about you. Different privacy implications, different use cases.

### Export Format

Two files:

**1. `grove-memory-export.md`** — Human-readable markdown containing all active memories, organized by category:

```markdown
# Your Grove Memory Export
Exported: March 9, 2026 | User: autumn | Tenant: autumnsgrove

## Preferences
- Prefers dark mode interfaces
- Likes nature-themed naming conventions
- Prefers concise, direct communication

## Projects
- Building a photography portfolio on Grove
- Working on custom domain setup for autumn.grove.place
- Interested in adding a blog series about birdwatching

## Context
- Lives in the Atlanta area
- Frequently works from Smyrna Library
- Has a background in IT/Cybersecurity

## Technical
- Prefers Svelte for frontend work
- Uses Cloudflare Workers extensively
- Familiar with D1, R2, KV, Durable Objects

[... all active memories ...]
```

**2. `IMPORT-MEMORY.md`** — An ingestion prompt the user can paste into any other AI service:

```markdown
# Import Your Memories

To bring your Grove memories into another AI service, paste the following
prompt along with the contents of `grove-memory-export.md`:

---

"I'm importing my personal context from another AI service. Below is a
structured export of facts and preferences that were learned about me over
time. Please read through them and incorporate them into your memory/context
system so that future conversations can reference this information.

The facts are organized by category. Each one represents something I shared
or that was observed during conversations. Please treat them as established
context about me, not as things I'm telling you for the first time.

[Paste contents of grove-memory-export.md here]"

---

This approach is inspired by Anthropic's memory import tool but works in
reverse — instead of extracting FROM another service, this helps you bring
your context INTO any service.
```

### Relationship to .grove Format

The `.grove` content export manifest can include an optional flag:

```json
{
  "memoryExportAvailable": true,
  "memoryExportVersion": "1.0.0"
}
```

This tells a receiving Grove instance that a companion memory export exists and can be imported separately. The memory data itself is never bundled inside the `.grove` ZIP to prevent accidental publication of private context when deploying portable exports as static sites.

---

## Part 8: Cloudflare Infrastructure Mapping

### Primitives Used

| Component | CF Primitive | Purpose |
|-----------|-------------|---------|
| Structured memory store | D1 (SQLite) | Facts, categories, metadata, FTS5 |
| Semantic search | Vectorize | HNSW vector similarity search |
| Embeddings | Workers AI | `bge-base-en-v1.5` or equivalent |
| Per-user coordination | Durable Object | MossDO (Loom pattern) |
| Export storage | R2 | Memory export files, signed URLs |
| Hot memory cache | DO in-memory / KV | Warm context per user |
| Orchestration | Lumen Worker | Request pipeline integration |

### Why This Works on Cloudflare

- **No WASM required.** Everything is TypeScript running on V8 isolates.
- **No external services.** All primitives are Cloudflare-native.
- **No synchronous I/O.** All operations are async-native.
- **Existing patterns.** D1 multi-tenancy, Loom DOs, Workers AI — all things Grove already uses.
- **Cost-effective.** D1 is cheap for structured data. Vectorize is priced per query. Workers AI embeddings are pennies. No infrastructure to maintain.

### What Cloudflare Provides Natively (MCP Support)

Cloudflare's Agents SDK supports building remote MCP servers on Workers:

- `createMcpHandler()` for stateless MCP servers
- `McpAgent` for Durable Object-backed MCP with per-session state
- Streamable HTTP transport (current MCP spec standard)
- Built-in OAuth provider library for authenticated MCP

This means: if Grove ever wants to expose Moss as an MCP server (e.g., for external agents to query a user's memory with permission), the infrastructure is ready. Not a priority now, but the path exists.

---

## Part 9: Implementation Roadmap

### Phase 1: Foundation (Week 1-2)

- [ ] Define D1 schema for `memories` table + FTS5 virtual table
- [ ] Create MossDO skeleton in Loom pattern (alarm handling, warm cache)
- [ ] Set up Vectorize index for memory embeddings
- [ ] Implement basic memory CRUD: create, read, update, soft-delete
- [ ] Implement embedding pipeline: fact → Workers AI → Vectorize
- [ ] Write integration tests for D1 ↔ Vectorize consistency

### Phase 2: Retrieval Layers (Week 2-3)

- [ ] Implement warm context loading (MossDO → system prompt injection)
- [ ] Implement sliding window topic tracking (per-conversation embedding comparison)
- [ ] Implement Vectorize cold retrieval with D1 hydration
- [ ] Implement `recall_memory` tool definition for model exposure
- [ ] Implement `save_memory` tool definition for model exposure
- [ ] Integrate retrieval pipeline into Lumen's request flow (pre-OpenRouter)
- [ ] Add token budget enforcement (cap injected memory tokens)

### Phase 3: Write-Back (Week 3-4)

- [ ] Implement DO alarm-based idle detection
- [ ] Build extraction prompt + cheap model pipeline
- [ ] Implement candidate comparison logic (new/update/contradict/noise)
- [ ] Implement warm context re-evaluation after extraction
- [ ] Handle edge cases: user returns before timer, concurrent conversations

### Phase 4: Export (Week 4)

- [ ] Build markdown export generator
- [ ] Build ingestion prompt generator (IMPORT-MEMORY.md)
- [ ] Implement R2 storage + signed URL generation for downloads
- [ ] Add export trigger to user settings/account management
- [ ] Add `memoryExportAvailable` flag to .grove manifest schema

### Phase 5: Testing & Tuning (Week 5)

- [ ] Load test: simulate 6 months of user conversations, measure memory growth
- [ ] Tune sliding window threshold (cosine similarity cutoff)
- [ ] Tune warm context selection criteria
- [ ] Tune extraction prompt for fact quality
- [ ] Tune importance scoring
- [ ] Measure TTFT impact of memory injection at various token budgets
- [ ] Test export/import round-trip

---

## Part 10: Open Questions

### Technical

1. **Vectorize index per tenant or shared?** Per-tenant is cleaner isolation but more indices to manage. Shared with user_id filtering is simpler but requires careful metadata filtering.
2. **Embedding model selection.** `bge-base-en-v1.5` is available on Workers AI. Is it good enough for memory-scale semantic search? May need benchmarking.
3. **Warm context staleness.** How often should the warm set be re-evaluated? On every extraction? On a time interval? When the user explicitly edits a memory?
4. **Memory limits.** Should there be a cap on total memories per user? Per category? What happens when someone has 10,000 memories — does retrieval quality degrade?
5. **Extraction model.** Which model is cheapest/fastest for structured fact extraction? Workers AI local model vs. cheap OpenRouter tier?

### Product

6. **User visibility.** Should users be able to see and edit their memories directly (like Claude's memory UI)? Or is it behind-the-scenes only?
7. **Memory opt-out.** Users should be able to disable memory entirely. What does the UX look like?
8. **Cross-agent memory.** If a user talks to different Grove AI agents (e.g., a blog helper vs. a code helper), do they share memory? Separate memory pools?
9. **Memory in Meadow.** If Meadow (social) features involve AI, do those conversations contribute to memory? Privacy implications.

### Philosophical

10. **How much should the AI remember?** There's a line between "helpful personalization" and "unsettlingly omniscient." Where is it for Grove's audience?
11. **Memory decay.** Should old, unused memories lose importance over time? Or is everything preserved indefinitely?
12. **The Anthropic parallel.** Claude's memory system (what this conversation is happening inside of right now) uses a similar approach. What can we learn from being on the receiving end of it?

---

## Appendix: Key Sources

### Memvid

- **Original repo (V1):** https://github.com/Olow304/memvid (~10.4K stars)
- **Current repo (V2):** https://github.com/memvid/memvid (~13.3K stars)
- **V1 deprecation notice:** https://docs.memvid.com/memvid-v1-deprecation
- **V2 announcement blog:** https://memvid.com/blog/introducing-memvid-v2-portable-deterministic-memory-for-ai
- **Documentation:** https://docs.memvid.com
- **Rust crate:** https://crates.io/crates/memvid-core
- **Rust reimplementation (community):** https://github.com/AllenDang/memvid-rs
- **Creator GitHub:** https://github.com/Olow304 (Saleban Olow)

### Industry Memory Systems

- **Mem0:** https://mem0.ai — Dedicated memory layer, $24M raised. Selective retrieval, graph memory.
- **Mem0 paper:** https://arxiv.org/pdf/2504.19413 — Benchmarks, architecture details, LoCoMo evaluation.
- **Letta (MemGPT):** https://letta.com — OS-inspired virtual memory, $10M raised. Self-editing memory blocks.
- **Zep:** Temporal knowledge graph, tracks how facts change over time.
- **LangMem:** Memory within LangGraph, JSON documents in structured store.

### Cloudflare Infrastructure

- **Workers WASM docs:** https://developers.cloudflare.com/workers/runtime-apis/webassembly/
- **workers-rs (Rust on Workers):** https://github.com/cloudflare/workers-rs — Limitations: no Tokio, must target wasm32-unknown-unknown.
- **Remote MCP servers on CF:** https://developers.cloudflare.com/agents/guides/remote-mcp-server/
- **Agents SDK:** createMcpHandler(), McpAgent for DO-backed MCP.
- **Grafbase Tantivy analysis:** https://grafbase.com/blog/serverless-search-in-rust — Confirmed Tantivy incompatibility with Workers.

### Memory Architecture Research

- **Agent memory overview:** https://www.letsdatascience.com/blog/ai-agent-memory-architecture
- **Memory problem analysis:** https://medium.com/data-unlocked/the-memory-problem-in-ai-agents-is-half-solved-heres-the-other-half
- **Top 10 memory products 2026:** https://medium.com/@bumurzaqov2/top-10-ai-memory-products-2026
- **Mem0 + Groq case study:** https://groq.com/customer-stories/mem0-redefines-ai-memory-with-real-time-performance-on-groqcloud

---

*Moss grows slowly. It's always there. It remembers what the forest has seen.* 🌿
