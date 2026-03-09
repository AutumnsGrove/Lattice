---
title: Moss — AI Memory System
description: Per-tenant conversational memory layer for persistent, personalized AI context across sessions
category: specs
specCategory: operations
icon: leaf
lastUpdated: "2026-03-09"
aliases: []
tags:
  - ai-integration
  - memory
  - cloudflare-workers
  - durable-objects
  - vectorize
type: tech-spec
---

# Moss — AI Memory System

```
              .  · .    . · .  .    . · .
           .  · . · .  · . · . · .  · . · .
          · . · . · . · . · . · . · . · . · .
         . · . · . · . · . · . · . · . · . · .
        · . · . · . · . · . · . · . · . · . · .
         · . · . · . · . · . · . · . · . · . ·
          · . · . · . · . · . · . · . · . · .
           · . · . · . · . · . · . · . · . ·
            · . · . · . · . · . · . · . · .
             · . · . · . · . · . · . · . ·
              . · . · . · . · . · . · . .
                 .  · .    . · .  .

     It grows where the forest has walked before.
     Layer by layer. Always there when you look.
```

> _The forest remembers through its moss._

Grove's per-tenant AI memory system. Moss gives every AI agent persistent, personalized context that carries across sessions. It stores structured facts, retrieves them selectively, and lets users export everything they've shared. A module inside Lumen, built on Cloudflare primitives.

**Public Name:** Moss
**Internal Name:** GroveMoss
**Domain:** _(module inside Lumen)_
**Repository:** `AutumnsGrove/Lattice` (workers/lumen, libs/engine)
**GitHub Issue:** #1436
**Last Updated:** March 2026

Moss grows on the surfaces the forest touches most. It doesn't announce itself. It accumulates, layer by layer, until the forest floor is softened by what came before. The name reflects how the system works: every conversation leaves a thin layer of context. Over time, those layers build into something the AI can draw on without being asked.

The research that led here is documented in `docs/research/moss-memory-research.md`. It covers the Memvid evaluation, industry memory patterns (Mem0, Letta/MemGPT, Claude), and the architectural decisions that shaped this spec.

---

## Overview

### What This Is

Moss is a memory module inside Lumen that stores, retrieves, and manages per-user conversational context across all Grove AI services. When a user tells Fireside Chat they prefer dark mode, Reverie already knows. When they mention a project in Porch, Lantern Chat can reference it later.

Every memory is a structured fact, not a raw transcript. "User prefers dark mode" instead of "user said 'yeah I like dark mode better.'" This keeps the memory store small, relevant, and portable.

### Goals

- Give Grove AI agents persistent memory across sessions and services
- Store structured facts, not raw conversation logs
- Retrieve selectively. Inject only what matters for the current conversation
- Let users export their entire memory as a portable artifact
- Build on Cloudflare-native primitives. No external dependencies
- Protect memory operations with Songbird prompt injection defense

### Non-Goals (Out of Scope)

- Conversation history storage (Moss stores distilled facts, not transcripts)
- Graph-based relational memory (Mem0-style knowledge graphs are a future consideration)
- Cross-tenant memory sharing (memories are strictly per-user, per-tenant)
- Real-time memory streaming to external services
- Group/shared memory pools

---

## Architecture

Moss lives inside the Lumen Worker, alongside Songbird (prompt safety) and the OpenRouter forwarding layer. It coordinates through MossDO, a Loom-pattern Durable Object per user.

```
┌─────────────────────────────────────────────────────────────────┐
│  Lumen (AI Gateway Worker)                                      │
│                                                                 │
│  ┌────────────┐  ┌────────────┐  ┌────────────────────────┐    │
│  │  Songbird  │  │    Moss    │  │  OpenRouter Forwarding │    │
│  │  (safety)  │  │  (memory)  │  │                        │    │
│  └────────────┘  └─────┬──────┘  └────────────────────────┘    │
│                        │                                        │
│                 ┌──────┴──────┐                                  │
│                 │   MossDO    │  Loom-pattern DO                 │
│                 │  (per-user) │  warm cache + write coordinator  │
│                 └──────┬──────┘                                  │
│                        │                                        │
│          ┌─────────────┼─────────────┐                          │
│          │             │             │                          │
│      ┌───┴───┐   ┌─────┴─────┐  ┌───┴────┐                    │
│      │  D1   │   │ Vectorize │  │Workers │                    │
│      │(facts)│   │ (vectors) │  │AI(emb) │                    │
│      └───────┘   └───────────┘  └────────┘                    │
│                                                                 │
│  ┌────────────┐                                                 │
│  │     R2     │  memory export files                            │
│  └────────────┘                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Consumers

Every Grove AI service that routes through Lumen gets Moss for free.

| Consumer | How It Uses Moss |
|----------|-----------------|
| Fireside Chat | Warm context in conversation, idle extraction after session |
| Reverie | Remember site preferences and past configuration requests |
| Porch Chat | Recall project context shared in previous conversations |
| Lantern Chat | Memory-informed content discovery ("you mentioned birdwatching") |
| Future DMs | If AI-assisted, memory enriches suggestions |

### Tech Stack

| Component | Technology | Why |
|-----------|-----------|-----|
| Structured storage | D1 (SQLite) | Facts, categories, metadata, FTS5 keyword search |
| Semantic search | Vectorize | HNSW vector similarity, filtered by user_id |
| Embeddings | Workers AI | `bge-base-en-v1.5` on the edge, no external calls |
| Coordination | Durable Object | MossDO per user, Loom pattern, alarm-based extraction |
| Export storage | R2 | Memory export files with signed URLs |
| Prompt safety | Songbird | Protects memory tool calls from injection |
| Orchestration | Lumen Worker | Memory retrieval integrated into request pipeline |

---

## Storage

### D1 Schema

Each tenant's D1 database gets a `memories` table. Facts are stored as concise, structured statements.

```sql
CREATE TABLE memories (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  fact TEXT NOT NULL,
  category TEXT,                    -- 'preference', 'context', 'personal', 'project'
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

### Vectorize Index

Each memory's `fact` text gets embedded via Workers AI and stored in a Vectorize index. Metadata on each vector includes the D1 record ID, `user_id`, `category`, and `importance_score`.

Queries embed the user's current message and retrieve top-K most similar memories, filtered by `user_id`.

**Index configuration:**

| Setting | Value | Rationale |
|---------|-------|-----------|
| Dimensions | 768 | BGE-base-en-v1.5 output size |
| Metric | Cosine | Standard for text similarity |
| Metadata filtering | `user_id` | Tenant isolation at the vector level |

**Open question:** Single shared Vectorize index with `user_id` metadata filtering, or per-tenant indices? Shared is simpler to manage. Per-tenant is cleaner isolation. Start shared, evaluate if filtering performance degrades at scale.

### Workers AI Embeddings

Model: `@cf/baai/bge-base-en-v1.5` (or equivalent available on Workers AI).

Runs on Cloudflare's edge. No external API call needed. Used for both indexing (when memories are created) and querying (when memories are retrieved).

If Lumen already embeds the user's message for other purposes (e.g., Songbird analysis or content discovery), the same embedding can be reused for Moss retrieval. One embedding, two purposes.

---

## MossDO — Coordination Layer

A Loom-pattern Durable Object, one per user. It handles four responsibilities.

### 1. Warm Context Cache

MossDO maintains the user's top 10-20 most important memories in-memory. These get injected into every conversation's system prompt at session start. No embedding call. No database query. They're just there.

**Selection criteria for the warm set:**

- Highest importance score
- Most recently updated
- Most frequently accessed
- Category diversity (don't load 15 preferences and 0 project context)

**Update frequency:** Re-evaluated when new memories are extracted (post-conversation). Not on every turn.

**Expected coverage:** ~60-70% of conversations. Most people talk about the things they usually talk about.

### 2. Write Coordination

Serializes memory writes to prevent race conditions when multiple conversations are active. Each conversation's extraction is queued and processed in order.

### 3. Idle Detection

Sets DO alarms when a conversation is active. When no new message arrives within the idle timeout (default: 30 minutes), triggers the async memory extraction job. If the user returns before the timer fires, the alarm is cancelled and reset.

### 4. Topic Tracking

Maintains a rolling topic vector for the active conversation. Powers the sliding window retrieval trigger (Layer 2). Updated on each user message.

---

## Retrieval

Three layers, ordered from cheapest to most expensive. Each layer adds context only when the previous layer doesn't cover it.

```
 User message arrives
        │
        ▼
 ┌──────────────────────┐
 │  Layer 1: Warm       │  Always on. Free.
 │  10-20 facts from    │  Injected at session start.
 │  MossDO cache        │  ~500-800 tokens.
 └──────────┬───────────┘
            │
            ▼
 ┌──────────────────────┐
 │  Layer 2: Sliding    │  Automatic. Cheap.
 │  Window Gate         │  Triggers on topic shift.
 │  5-8 cold facts      │  One embedding + Vectorize query.
 │  from Vectorize      │  ~500-800 tokens.
 └──────────┬───────────┘
            │
            ▼
 ┌──────────────────────┐
 │  Layer 3: Model      │  On-demand. Explicit.
 │  Tool Calls          │  Model decides to recall
 │  recall_memory()     │  or save a memory.
 │  save_memory()       │  ~300-500 tokens.
 └──────────────────────┘
```

### Layer 1 — Warm Context (Free, Always On)

The warm set is pre-loaded into every conversation's system prompt. This is the cheapest possible retrieval: zero latency, zero cost, always present.

**Token budget:** ~500-800 tokens for 10-20 concise facts.

**Injection format:**

```
<moss>
You have the following context about this user from previous conversations:
- Prefers dark mode interfaces
- Building a photography portfolio on Grove
- Lives in the Atlanta area
- Prefers Svelte for frontend work
- Working on custom domain setup for autumn.grove.place
</moss>
```

### Layer 2 — Sliding Window Gate (Cheap, Automatic)

Lumen tracks a rolling topic vector for the conversation. On each turn:

1. Embed the new user message via Workers AI
2. Compare cosine similarity against the recent conversation topic vector
3. If similarity drops below threshold (topic shift detected), query Vectorize for top 5-8 cold memories relevant to the NEW topic
4. Inject retrieved memories into the next request's context
5. If the topic is stable, this layer does nothing

**Threshold:** Start conservative at cosine similarity < 0.7. Tune based on real usage data.

**Cost:** One embedding per turn (cheap on Workers AI), occasional Vectorize query only on topic shift.

### Layer 3 — Model Tool Calls (On-Demand, Explicit)

The model receives two tools via Lumen's tool-calling system:

**`recall_memory(query: string)`**

Search cold storage explicitly. Returns top-K results from Vectorize, hydrated with full fact data from D1. The model uses this when it senses missing context or the user references something specific from the past.

```typescript
// Tool definition exposed to the model
{
  name: "recall_memory",
  description: "Search your memory for facts about this user from previous conversations. Use when the user references something from the past or you need additional context.",
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "What to search for in memory"
      }
    },
    required: ["query"]
  }
}
```

**`save_memory(fact: string, category?: string)`**

Write a memory in real-time without waiting for idle extraction. The model uses this when the user shares something worth remembering immediately. ("Actually, I switched to Porkbun for domains.")

```typescript
{
  name: "save_memory",
  description: "Save an important fact about this user for future conversations. Use for preferences, corrections, or significant context the user shares.",
  parameters: {
    type: "object",
    properties: {
      fact: {
        type: "string",
        description: "A concise, structured fact to remember"
      },
      category: {
        type: "string",
        enum: ["preference", "context", "personal", "project"],
        description: "Category for this memory"
      }
    },
    required: ["fact"]
  }
}
```

Both tools are protected by Songbird. The Kestrel context for memory tools validates that tool calls are genuine memory operations, not injection attempts disguised as memory writes.

### Token Budget

Total memory injection per request: no more than ~1.5-2K tokens. This aligns with Mem0's findings that selective retrieval at this scale achieves near-SOTA accuracy.

| Layer | Budget | Content |
|-------|--------|---------|
| Warm context | ~500-800 tokens | 10-20 concise facts |
| Sliding window | ~500-800 tokens | 5-8 additional facts on topic shift |
| Tool retrieval | ~300-500 tokens | On-demand, additive |
| **Total ceiling** | **~2,000 tokens** | **Selective, not exhaustive** |

---

## Write-Back — Memory Extraction

Memories are extracted asynchronously after conversations go idle. The conversation is never blocked by memory processing.

### Extraction Pipeline

```
 Conversation active
        │
        ├── User sends message → MossDO resets alarm (30 min)
        │
        ├── User sends message → MossDO resets alarm (30 min)
        │
        └── 30 minutes of silence
                │
                ▼
        ┌───────────────────┐
        │  DO alarm fires   │
        │  Retrieve session │
        │  history          │
        └────────┬──────────┘
                 │
                 ▼
        ┌───────────────────┐
        │  Send to cheap    │
        │  extraction model │  Workers AI or low-cost OpenRouter tier
        │  (not main model) │
        └────────┬──────────┘
                 │
                 ▼
        ┌───────────────────┐
        │  Candidate facts  │  JSON array of {fact, category, importance}
        └────────┬──────────┘
                 │
                 ▼
        ┌───────────────────┐
        │  Compare against  │
        │  existing memories│
        └────────┬──────────┘
                 │
     ┌───────┬───┴───┬──────────┐
     │       │       │          │
     ▼       ▼       ▼          ▼
   New    Update  Contradict  Noise
   fact   existing  existing   discard
     │       │       │
     ▼       ▼       ▼
   Add to  Update   Replace
   D1 +    D1, re-  with newer
   Vectorize embed   version
                 │
                 ▼
        ┌───────────────────┐
        │  Re-evaluate warm │
        │  context set      │
        └───────────────────┘
```

### Extraction Prompt

The extraction model receives a structured prompt:

```
Extract key facts, preferences, and context from this conversation.
Output as JSON array: [{ "fact": "...", "category": "...", "importance": 0.0-1.0 }]

Categories: preference, context, personal, project

Only extract facts worth remembering long-term.
Ignore pleasantries, transient context, and small talk.
Write each fact as a concise, present-tense statement.

Good: "Prefers dark mode interfaces"
Bad:  "User said they like dark mode better in their last message"
```

### Candidate Comparison

Each candidate fact is compared against existing active memories:

| Comparison | Action |
|-----------|--------|
| New fact, no match | Embed and add to D1 + Vectorize |
| Updates existing fact | Update D1 record, re-embed in Vectorize, set `superseded_by` on old version |
| Contradicts existing fact | Replace with newer version, timestamp the change |
| Duplicate or noise | Discard |

### Edge Cases

- **User returns before timer fires.** Cancel alarm, reset timer. Extraction happens later.
- **Very long conversation.** Future enhancement: extract incrementally at natural breakpoints (e.g., every 20 turns) rather than waiting for full idle.
- **Multiple concurrent conversations.** MossDO serializes writes. Each conversation's extraction is queued.

---

## Portability and Export

Memory export is separate from the `.grove` content export. Content is what you created. Memory is what the platform learned about you. Different privacy implications, different use cases.

### Export Files

Two files are generated:

**1. `grove-memory-export.md`** — Human-readable markdown with all active memories, organized by category:

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
- Has a background in IT/Cybersecurity

## Technical
- Prefers Svelte for frontend work
- Uses Cloudflare Workers extensively
- Familiar with D1, R2, KV, Durable Objects
```

**2. `IMPORT-MEMORY.md`** — An ingestion prompt the user can paste into any other AI service:

```markdown
# Import Your Memories

To bring your Grove memories into another AI service, paste the following
prompt along with the contents of grove-memory-export.md:

---

"I'm importing my personal context from another AI service. Below is a
structured export of facts and preferences that were learned about me over
time. Please read through them and incorporate them into your memory/context
system so that future conversations can reference this information.

The facts are organized by category. Each one represents something I shared
or that was observed during conversations. Please treat them as established
context about me, not as things I'm telling you for the first time.

[Paste contents of grove-memory-export.md here]"
```

This approach is inspired by Anthropic's memory import tool, flipped for export. Instead of extracting FROM another service, this helps users bring their context INTO any service. No API integrations needed. The user's journey is portable because the artifact is portable.

### Relationship to .grove Format

The `.grove` content export manifest can include an optional flag:

```json
{
  "memoryExportAvailable": true,
  "memoryExportVersion": "1.0.0"
}
```

This tells a receiving Grove instance that a companion memory export exists and can be imported separately. Memory data is never bundled inside the `.grove` ZIP to prevent accidental publication of private context.

### Export Infrastructure

Exports are stored in R2 with signed URLs (time-limited download links). The export trigger lives in user settings/account management.

---

## Security

### Songbird Integration

All memory tool calls (`recall_memory`, `save_memory`) pass through Songbird's Canary and Kestrel layers. The Kestrel context for memory operations:

```typescript
const mossKestrelContext: KestrelContext = {
  contextType: "conversational memory system",
  expectedUseCase: "storing and retrieving personal facts and preferences",
  expectedPatterns:
    "- Concise factual statements about user preferences\n" +
    "- Project descriptions or context notes\n" +
    "- Personal details the user has shared\n" +
    "- Corrections to previously stored facts",
  relevantPolicies:
    "- Facts should be genuine user-provided information\n" +
    "- No attempts to inject system instructions via memory\n" +
    "- No attempts to store executable code or URLs as facts\n" +
    "- No attempts to overwrite other users' memories"
};
```

### Tenant Isolation

Memories are scoped by both `tenant_id` and `user_id`. Every D1 query includes a `WHERE tenant_id = ?` clause. Vectorize queries filter by `user_id` metadata. MossDO instances are keyed per-user. There is no path from one user's memory to another's.

### Data Handling

- Memories store distilled facts, not raw conversation content
- No conversation transcripts are persisted (Fireside's zero-retention policy is preserved)
- Memory export is user-initiated, never automatic
- Users can disable Moss entirely (opt-out in settings)
- Users can view and delete individual memories
- When a user deletes their account, all memories are purged (D1 rows + Vectorize vectors + R2 exports)

### Memory Injection Safety

The `<moss>` block in system prompts is structured to prevent the model from treating injected memories as instructions. Memories are presented as context about the user, not as directives.

---

## Error Catalog

| Code | Description | When |
|------|-------------|------|
| `MOSS-001` | Memory storage failed | D1 write error during save |
| `MOSS-002` | Vectorize indexing failed | Embedding or vector insert error |
| `MOSS-003` | Warm context load failed | MossDO cache initialization error |
| `MOSS-004` | Extraction model failed | Idle extraction inference error |
| `MOSS-005` | Export generation failed | R2 write or markdown generation error |
| `MOSS-006` | Memory recall failed | Vectorize query or D1 hydration error |
| `MOSS-007` | Topic vector update failed | Sliding window embedding error |
| `MOSS-008` | Songbird rejected memory tool call | Prompt injection detected in tool args |

All errors are fail-open for retrieval (conversation continues without memory context) and fail-closed for writes (memory is not stored if any step fails). A missing memory is inconvenient. A corrupted memory is dangerous.

---

## User Experience

### Memory Settings

```
┌─────────────────────────────────────────────────────────────────┐
│  ✧ Memory                                                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Moss remembers what you share across conversations so your     │
│  Grove AI agents can provide personalized responses.            │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │  [✓] Enable Moss memory                                 │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  Your memories (23 facts)                          [ View All ] │
│                                                                 │
│  Recent:                                                        │
│  · Prefers dark mode interfaces              [edit] [delete]    │
│  · Building a photography portfolio          [edit] [delete]    │
│  · Lives in the Atlanta area                 [edit] [delete]    │
│                                                                 │
│  ─────────────────────────────────────────────────────────────  │
│                                                                 │
│  [ Export Memories ]              [ Delete All Memories ]       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Memory View (Full List)

```
┌─────────────────────────────────────────────────────────────────┐
│  ✧ Your Memories                                         [×]    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ▶ Preferences (8)                                              │
│    · Prefers dark mode interfaces                               │
│    · Likes nature-themed naming conventions                     │
│    · Prefers concise, direct communication                      │
│    · ...                                                        │
│                                                                 │
│  ▶ Projects (5)                                                 │
│    · Building a photography portfolio on Grove                  │
│    · Working on custom domain setup                             │
│    · ...                                                        │
│                                                                 │
│  ▶ Context (6)                                                  │
│    · Lives in the Atlanta area                                  │
│    · Has a background in IT/Cybersecurity                       │
│    · ...                                                        │
│                                                                 │
│  ▶ Technical (4)                                                │
│    · Prefers Svelte for frontend work                           │
│    · Uses Cloudflare Workers extensively                        │
│    · ...                                                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Cost Analysis

### Per-Request Costs

| Operation | Cost | When |
|-----------|------|------|
| Warm context injection | Free | Every conversation start |
| Sliding window embedding | ~$0.00001 | Every user message |
| Vectorize query | ~$0.00001 | Only on topic shift (~30% of turns) |
| Memory extraction (idle) | ~$0.001-0.003 | Once per conversation |
| Memory embedding (write) | ~$0.00001 | Per new fact extracted |

### Monthly Projections

| Scale | Conversations/mo | Est. Cost |
|-------|------------------|-----------|
| Early (50 users) | ~500 | < $1/mo |
| Growing (500 users) | ~5,000 | ~$5-15/mo |
| Mature (5,000 users) | ~50,000 | ~$50-150/mo |

### Vectorize Storage

- 100K vectors free tier
- $0.040 per 1K vectors after that
- At 20 facts per user average: 5,000 users = 100K vectors (within free tier)

---

## Implementation Phases

### Phase 1: Foundation (Week 1-2)

- [ ] D1 migration for `memories` table + FTS5 virtual table
- [ ] MossDO skeleton in Loom pattern (alarm handling, warm cache)
- [ ] Vectorize index creation and binding in wrangler config
- [ ] Basic memory CRUD: create, read, update, soft-delete
- [ ] Embedding pipeline: fact → Workers AI → Vectorize
- [ ] Integration tests for D1/Vectorize consistency

### Phase 2: Retrieval Layers (Week 2-3)

- [ ] Warm context loading (MossDO → system prompt injection)
- [ ] Sliding window topic tracking (per-conversation embedding comparison)
- [ ] Vectorize cold retrieval with D1 hydration
- [ ] `recall_memory` tool definition for model exposure
- [ ] `save_memory` tool definition for model exposure
- [ ] Integrate retrieval pipeline into Lumen's request flow (pre-OpenRouter)
- [ ] Token budget enforcement (cap injected memory tokens)

### Phase 3: Write-Back (Week 3-4)

- [ ] DO alarm-based idle detection
- [ ] Extraction prompt + cheap model pipeline
- [ ] Candidate comparison logic (new/update/contradict/noise)
- [ ] Warm context re-evaluation after extraction
- [ ] Edge case handling: user returns before timer, concurrent conversations

### Phase 4: Export (Week 4)

- [ ] Markdown export generator
- [ ] Ingestion prompt generator (IMPORT-MEMORY.md)
- [ ] R2 storage + signed URL generation for downloads
- [ ] Export trigger in user settings/account management
- [ ] `memoryExportAvailable` flag in .grove manifest schema

### Phase 5: UX and Settings (Week 4-5)

- [ ] Memory settings panel (enable/disable, view, edit, delete)
- [ ] Full memory list view with category grouping
- [ ] Individual memory edit and delete
- [ ] "Delete All Memories" with confirmation
- [ ] Export download button with signed URL

### Phase 6: Testing and Tuning (Week 5)

- [ ] Load test: simulate 6 months of user conversations, measure memory growth
- [ ] Tune sliding window threshold (cosine similarity cutoff)
- [ ] Tune warm context selection criteria
- [ ] Tune extraction prompt for fact quality
- [ ] Tune importance scoring
- [ ] Measure TTFT impact of memory injection at various token budgets
- [ ] Test export/import round-trip

---

## Open Questions

### Technical

1. **Vectorize index isolation.** Shared index with `user_id` filtering or per-tenant indices? Start shared, evaluate at scale.
2. **Embedding model.** `bge-base-en-v1.5` on Workers AI. Good enough for memory-scale search? Benchmark against alternatives.
3. **Warm context staleness.** Re-evaluate on every extraction? On a time interval? When the user edits a memory? Start with post-extraction, add interval if needed.
4. **Memory limits.** Cap per user? Per category? At 10,000 memories, does retrieval quality degrade? Monitor and set bounds.
5. **Extraction model.** Workers AI local model or cheap OpenRouter tier? Workers AI is free but may produce lower-quality extractions.

### Product

6. **Cross-agent memory.** If a user talks to different AI agents (blog helper vs. code helper), do they share memory? Start with shared, consider scoping later.
7. **Memory in Meadow.** If social features involve AI, do those conversations contribute to memory? Privacy implications need thought.
8. **Memory decay.** Should old, unused memories lose importance over time? Or preserve indefinitely? Start with indefinite, add decay as an option.

---

## Related Specs and Docs

| Document | Relevance |
|----------|-----------|
| `docs/research/moss-memory-research.md` | Full research document with Memvid analysis, industry patterns, and architectural decisions |
| `docs/specs/lumen-spec.md` | Parent system. Moss is a module inside Lumen |
| `docs/specs/lumen-tool-calling-spec.md` | Tool-calling infrastructure that powers `recall_memory` and `save_memory` |
| `docs/patterns/songbird-pattern.md` | Prompt injection defense that protects memory tool calls |
| `docs/specs/wisp-spec.md` | Fireside Chat. First consumer of Moss |
| `docs/specs/grove-agent-spec.md` | GroveAgent SDK. Agents that will use Moss |
| `docs/plans/features/planning/natural-language-search.md` | Content discovery index. Shares Vectorize infrastructure |

---

*Layer by layer. The forest remembers.*
