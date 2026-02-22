---
title: "Natural Language Cross-Site Search Plan"
status: planning
category: features
---

# Natural Language Cross-Site Search Plan

## Overview

Grove will enable natural language search across all blogs in the network — not just "find posts with the word 'grove'" but "find posts about loss and grief" or "show me writing about starting over."

**The Vision:**
Right now, each blog has its own search. But Grove isn't just isolated sites — it's a community. Wanderers should be able to discover stories, ideas, and voices across the entire network. Natural language search makes that discovery feel _human_ rather than mechanical.

**Key Decisions Made:**

- ✅ **Architecture:** Orama hybrid search (Option C) from the start
- ✅ **Privacy Model:** Opt-IN by default (NOT discoverable unless you enable it)
- ✅ **Gating:** Two levels - account opt-out + per-post frontmatter
- ✅ **Naming:** `discover.grove.place`
- ✅ **Design:** Glassmorphism for search results
- ✅ **Infrastructure:** Route through Lumen (AI gateway) for automatic tracking

**Related Goals:**

- Make Grove content discoverable beyond individual blogs
- Enable thematic exploration ("grief," "queer joy," "building in public")
- Create paths for wanderers to find their people
- Stay true to Grove values: warm, owned, not extractive

---

## The Problem We're Solving

### Current State

Each blog has local search:

- Works well for "I know this blog has something about X"
- Fast, client-side, zero infrastructure cost
- But isolated — you can't discover content across blogs

### What We Want

"Find posts about starting over" should return:

- Your friend's post about moving cities after a breakup
- Someone's essay about pivoting their career
- A poem about spring and renewal
- A technical post about rewriting a codebase

**This isn't keyword matching** — it's understanding _meaning_ and _theme_.

---

## Architecture: Orama Hybrid Search (Option C)

**Decision:** Build with Orama from day one. No migration needed.

### ~~Option A: Client-Side Aggregated Index~~ (Not chosen)

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Grove Discovery (discover.grove.place)            │
├─────────────────────────────────────────────────────────────────────┤
│  SvelteKit Frontend: /search, /explore, /browse                      │
│                              │                                       │
│  On page load: Fetch aggregated index from KV/R2                     │
│         ┌────────────────────┼────────────────────┐                 │
│         ▼                    ▼                    ▼                  │
│  FlexSearch/Orama Client │ Embeddings (optional) │ Filters (tags)    │
└─────────────────────────────────────────────────────────────────────┘
│
│  Background Worker (Cron, every 15 min):
│    - Poll opted-in blog RSS feeds
│    - Update master index in R2
│    - Generate embeddings for semantic search (if using Orama + vectors)
└─────────────────────────────────────────────────────────────────────┘
```

**Pros:**

- Zero per-search cost (client does the work)
- Privacy-friendly (searches happen locally)
- Fast response times
- Aligns with Grove's indie web values

**Cons:**

- Large initial download (index size grows with content)
- Limited semantic search quality without server-side embeddings
- Re-indexing lag (15-30 min for new posts to appear)

**Estimated Cost:** ~$0-5/month (R2 storage + Worker cron)

---

### ~~Option B: Cloudflare AI Search (Managed)~~ (Not chosen)

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Grove Discovery (discover.grove.place)            │
├─────────────────────────────────────────────────────────────────────┤
│  SvelteKit Frontend: /search, /explore                               │
│                              │                                       │
│  Server-Side Search Handler                                          │
│         ┌────────────────────┼────────────────────┐                 │
│         ▼                    ▼                    ▼                  │
│  Cloudflare AI Search │ Workers Binding │ Streaming Results           │
└─────────────────────────────────────────────────────────────────────┘
│
│  Indexing (Background):
│    - Automatic crawling of sitemaps OR
│    - Manual index updates via API
│    - Path filtering (only /garden/* routes)
│    - AI-powered semantic understanding built-in
└─────────────────────────────────────────────────────────────────────┘
```

**Pros:**

- Fully managed (zero infrastructure work)
- Native Cloudflare integration
- Built-in semantic search and AI ranking
- Stream results as they arrive (good UX)
- Automatic re-indexing

**Cons:**

- **Pricing unclear** (needs evaluation)
- Less control over indexing and ranking
- Newer service (beta/early adoption phase)
- Vendor lock-in

**Estimated Cost:** TBD (Cloudflare hasn't published pricing yet — needs research in Q2 2026)

---

### ✅ Chosen Architecture: Orama Hybrid Search (Client + Server)

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Grove Discovery (discover.grove.place)            │
├─────────────────────────────────────────────────────────────────────┤
│  SvelteKit Frontend: /search                                         │
│                              │                                       │
│  Hybrid Search:                                                      │
│    - Fast keywords → Client-side Orama (<2KB core)                   │
│    - Semantic queries → Server-side embeddings + vector search       │
│         ┌────────────────────┼────────────────────┐                 │
│         ▼                    ▼                    ▼                  │
│  Orama Client Index │ Workers AI Embeddings │ Vector KV Store        │
└─────────────────────────────────────────────────────────────────────┘
│
│  Background Indexing Worker:
│    - Poll RSS feeds every 15 min
│    - Build text index for client (stored in R2)
│    - Generate embeddings for semantic search (Workers AI)
│    - Store vectors in KV or Vectorize
└─────────────────────────────────────────────────────────────────────┘
```

**Pros:**

- Best of both worlds: fast keywords + deep semantic search
- Modern, future-proof technology
- Small client bundle (<2KB + index)
- Full control over indexing and ranking
- Could enable RAG features later ("summarize posts about X")

**Cons:**

- More complex implementation
- Workers AI usage costs (embedding generation)
- Need to build and maintain indexing pipeline

**Estimated Cost:** $0-5/month initially (very few posts), scaling to $10-30/month at 500+ posts

**Why This Choice:**

- No need to migrate later from keyword-only to semantic
- CF embedding pricing is incredibly cheap
- Fallback: Can run embeddings on own hardware if costs grow
- With Lumen (AI gateway already built), all usage is automatically tracked via LangFuse
- OpenRouter already configured as fallback
- Small initial dataset = near-zero cost to start

---

## Technology Deep Dive

### For Full-Text Search (Keywords)

**Recommended: FlexSearch or Orama**

| Feature       | FlexSearch         | Orama                     |
| ------------- | ------------------ | ------------------------- |
| Bundle Size   | ~35KB              | <2KB core                 |
| Fuzzy Search  | ✅ Excellent       | ✅ Good                   |
| Ranking       | Good               | Excellent                 |
| Vector Search | ❌ No              | ✅ Yes (hybrid)           |
| Maintenance   | Active (2026)      | Very Active (2026)        |
| Grove Fit     | Great for keywords | Great for future-proofing |

**Decision Point:** Use **FlexSearch** for MVP, migrate to **Orama** when adding semantic search.

---

### For Semantic Search (Meaning)

**Recommended: Orama + Workers AI Embeddings**

**How it works:**

1. User searches: "posts about grief and healing"
2. Server generates embedding for query (Workers AI: `@cf/baai/bge-base-en-v1.5`)
3. Find similar embeddings in vector store (Vectorize or KV)
4. Return semantically related posts

**Alternative: Cloudflare AI Search**

- Fully managed, but pricing unclear
- Wait for Q2 2026 pricing announcement
- Evaluate against self-hosted Orama

---

## User Experience

### Search Interface (Grove-themed)

```
┌─────────────────────────────────────────────────────────────────────┐
│  🌲 Discover the Grove                                               │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  What are you looking for?                                     │  │
│  │  [Try: "posts about starting over" or "queer joy"]              │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                                                                       │
│  🔍 Recent Searches                                                   │
│  - posts about grief and healing                                     │
│  - building in public                                                │
│  - cozy game recommendations                                         │
│                                                                       │
│  🏷️ Explore by Theme                                                 │
│  [Queer] [Tech] [Art] [Writing] [Mental Health] [Building]          │
└─────────────────────────────────────────────────────────────────────┘
```

**Search Results:**

- Show blog name + author (with avatar if available)
- Excerpt highlighting relevant section
- Date + tags
- "Read on [Blog Name]" link
- Respect blog accent colors in results

**Privacy:**

- Only index opted-in blogs (default: off)
- Show "public" badge on discoverable blogs
- Allow per-post opt-out (frontmatter: `discoverable: false`)

---

## Infrastructure: Lumen Integration

**Decision:** Route ALL embeddings through Lumen (Grove's AI gateway).

**Why:**

- Already built and deployed
- Already supports embeddings
- Automatic usage tracking via LangFuse
- OpenRouter already configured as fallback
- Zero additional monitoring work needed

**Lumen Endpoint:**

```typescript
POST https://lumen.grove.place/api/embed
{
  "model": "text-embedding-3-small",
  "input": "Find posts about grief and healing"
}

Response:
{
  "embedding": [0.123, -0.456, ...],  // 1536 dimensions
  "model": "text-embedding-3-small",
  "usage": { "tokens": 8 }
}
```

**Tracking:**

- All embedding calls logged in LangFuse
- Cost tracking per operation
- Usage alerts if costs spike
- Automatic fallback to OpenRouter if primary fails

---

## Implementation Phases

### Phase 0: Planning & Research (Current - Q1 2026)

**Deliverables:**

- ✅ This document (decisions made!)
- ✅ Architecture chosen (Orama + Workers AI via Lumen)
- ✅ Privacy model defined (opt-out by default)
- ✅ Design system chosen (glassmorphism)
- ✅ Infrastructure chosen (route through Lumen)
- Prototype Orama with small dataset
- Test embedding quality via Lumen
- Design search UI mockups

**Status:** ✅ Complete — Ready to build!

---

### Phase 1: Hybrid Search Foundation (Q2 2026)

**Goal:** Build discover.grove.place with full keyword + semantic search from day one.

**Implementation: Orama Hybrid Search (No migration needed!)**

#### 1.1 Discovery Opt-Out System

**Database Schema** (`libs/engine/migrations/XXX_discovery_settings.sql`):

```sql
CREATE TABLE IF NOT EXISTS discovery_settings (
  tenant_id TEXT PRIMARY KEY,
  discoverable INTEGER DEFAULT 0,  -- 0 = NOT discoverable by default (opt-in model)
  indexed_at TEXT,
  last_sync TEXT,
  post_count INTEGER DEFAULT 0
);
```

**Admin UI** (`libs/engine/src/routes/arbor/settings/discovery/+page.svelte`):

```svelte
<Glass variant="card" class="p-6">
  <h2 class="text-xl font-semibold mb-4">Grove Discovery</h2>

  <p class="text-foreground-secondary mb-6">
    Your blog is currently <strong>{discoverable ? 'discoverable' : 'private'}</strong>.
    {#if discoverable}
      Wanderers can find your posts on <a href="https://discover.grove.place">discover.grove.place</a>.
    {:else}
      Your posts are private and won't appear in cross-site search.
    {/if}
  </p>

  {#if !discoverable}
    <div class="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
      <p class="text-sm font-medium mb-2">Want to be found?</p>
      <p class="text-sm text-foreground-muted">
        Enable Grove Discovery to let wanderers find your writing across the network.
        You can always change this later, and exclude specific posts using frontmatter.
      </p>
    </div>
  {/if}

  <!-- Toggle -->
  <label class="flex items-center gap-3 cursor-pointer">
    <input
      type="checkbox"
      bind:checked={discoverable}
      onchange={handleToggle}
      class="w-5 h-5"
    />
    <span>Enable Grove Discovery (make my blog searchable)</span>
  </label>

  {#if discoverable}
    <div class="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
      <p class="text-sm">
        ✓ Your public posts will appear in search results
      </p>
      <p class="text-sm text-foreground-muted mt-2">
        To exclude specific posts, add <code>discoverable: false</code> to frontmatter.
      </p>
    </div>
  {/if}
</Glass>
```

#### 1.2 RSS Polling & Orama Indexing

**Background Worker** (`packages/discovery/src/workers/indexer.ts`):

```typescript
// Cron: Every 15 minutes
export default {
  async scheduled(event: ScheduledEvent, env: Env) {
    // 1. Get all discoverable tenants
    const tenants = await env.DB.prepare(
      "SELECT tenant_id, subdomain FROM discovery_settings WHERE discoverable = 1",
    ).all();

    // 2. Poll RSS feeds
    for (const tenant of tenants.results) {
      const rssUrl = `https://${tenant.subdomain}.grove.place/feed.xml`;
      const posts = await fetchAndParseRSS(rssUrl);

      // 3. For each post: generate embedding via Lumen
      for (const post of posts) {
        const embedding = await generateEmbedding(post.content, env);

        // 4. Store in index
        await env.DB.prepare(
          `
          INSERT OR REPLACE INTO discovery_index (
            post_id, tenant_id, title, description, content_preview,
            embedding, tags, date, url
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        )
          .bind(
            post.id,
            tenant.tenant_id,
            post.title,
            post.description,
            post.content.slice(0, 500),
            JSON.stringify(embedding),
            JSON.stringify(post.tags),
            post.date,
            post.url,
          )
          .run();
      }
    }
  },
};

async function generateEmbedding(text: string, env: Env): Promise<number[]> {
  const response = await fetch("https://lumen.grove.place/api/embed", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: text.slice(0, 8000), // Limit to ~8k chars
    }),
  });

  const data = await response.json();
  return data.embedding;
}
```

**Index Schema** (`packages/discovery/migrations/001_search_index.sql`):

```sql
CREATE TABLE IF NOT EXISTS discovery_index (
  post_id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  content_preview TEXT,
  embedding TEXT,  -- JSON array of floats
  tags TEXT,  -- JSON array of strings
  date TEXT NOT NULL,
  url TEXT NOT NULL,
  indexed_at TEXT DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (tenant_id) REFERENCES discovery_settings(tenant_id)
);

CREATE INDEX idx_discovery_tenant ON discovery_index(tenant_id);
CREATE INDEX idx_discovery_date ON discovery_index(date DESC);
```

#### 1.3 Discovery Frontend with Orama

**New Property:** `packages/discovery/` (SvelteKit)

**Route:** `discover.grove.place/`

**Search Handler** (`packages/discovery/src/routes/api/search/+server.ts`):

```typescript
import { create, insert, search } from "@orama/orama";

export async function POST({ request, locals }) {
  const { query, mode } = await request.json(); // mode: 'keyword' | 'semantic'

  if (mode === "semantic") {
    // Generate query embedding via Lumen
    const embedding = await generateEmbedding(query);

    // Vector search in D1
    const results = await locals.db
      .prepare(
        `
      SELECT post_id, title, description, content_preview, url, date, tags,
        -- Cosine similarity
        (1 - (embedding_distance(embedding, ?) / 2)) AS similarity
      FROM discovery_index
      WHERE similarity > 0.7
      ORDER BY similarity DESC
      LIMIT 20
    `,
      )
      .bind(JSON.stringify(embedding))
      .all();

    return json({ results: results.results });
  } else {
    // Keyword search with Orama client-side (fetch index)
    const allPosts = await locals.db
      .prepare("SELECT * FROM discovery_index ORDER BY date DESC")
      .all();

    // Return for client-side Orama
    return json({ posts: allPosts.results });
  }
}
```

**Timeline:** 6-8 weeks

**Success Metrics:**

- Keyword search: <500ms response
- Semantic search: <1s response (including embedding)
- "Posts about grief" returns thematically related content
- Index size manageable (<5MB with 1000 posts)
- Embedding cost: <$5/month initially

---

### Phase 2: Discovery Features (Q3-Q4 2026)

**Goal:** Make search feel like _exploration_, not just retrieval.

#### 3.1 Thematic Collections

- Auto-generated collections based on clustering
- "Posts about..." pages
- Seasonal roundups ("Spring Reflections")

#### 3.2 "More Like This"

- Per-post recommendations
- Find similar writing across blogs
- "If you liked this, you might enjoy..."

#### 3.3 Trending & Popular

- Track search queries
- Surface popular topics
- Weekly digest: "What the Grove is writing about"

#### 3.4 Author Discovery

- "Find other writers who explore similar themes"
- Cross-blog conversation discovery

**Timeline:** 6-8 weeks

---

## Privacy & Consent

### Tenant Controls

**Default: Opt-IN (NOT Discoverable by Default)**

**Why opt-in is privacy-first:**

- New blogs start private — no surprises
- Wanderers explicitly choose to be discovered
- Clear call-to-action in Arbor: "Want to be found? Enable Grove Discovery"
- No indexing happens unless you say yes
- Respects privacy by default

**Important:** This is privacy-first. We never index without explicit permission.

**Two-Level Gating System:**

**Level 1: Account-Level Opt-Out**

- Tenant can disable discovery entirely in settings
- When opted out: ALL posts excluded from index, immediately purged
- Clear toggle in Arbor settings

**Level 2: Per-Post Opt-Out**

- Frontmatter flag: `discoverable: false`
- Even if account opted in, this post won't be searchable
- Useful for personal/private posts you don't want surfaced

```yaml
---
title: Private Thoughts
discoverable: false
---
```

**How the gates work together:**

- Account NOT opted in → No posts indexed, frontmatter ignored (default)
- Account opted IN + post `discoverable: false` → This post excluded
- Account opted IN + no frontmatter → Post is searchable

**Respect Robots.txt:**

- Check `robots.txt` before indexing
- Honor `Disallow: /garden/*` directives

### What Gets Indexed

**Public Only:**

- Only content visible without authentication
- No draft posts
- No password-protected pages

**Respects Deletion:**

- If post deleted → remove from index within 15 min
- If blog opts out → purge all content immediately

---

## Technical Considerations

### Bundle Size Budget

**Discovery Frontend:**

- FlexSearch: ~35KB
- Orama: <2KB
- Index: Target <2MB (paginated if needed)
- Total initial load: <3MB acceptable

**Strategy:** Progressive loading

- Load basic UI immediately
- Fetch index in background
- Show "Loading search index..." with progress

### Performance Targets

- **First paint:** <1s
- **Index ready:** <3s
- **Search results:** <500ms (keywords), <1s (semantic)
- **Result rendering:** <100ms

### Scaling Considerations

**Index Size:**

- Assume 100 blogs × 20 posts average = 2000 posts
- ~1KB per post metadata = ~2MB index
- At 500 blogs × 50 posts = 25,000 posts = ~25MB
  - **Solution:** Paginated index or shard by date

**Embedding Storage:**

- Vectorize: 100K vectors free, then $0.040 per 1K
- Alternative: Store in KV (cheaper but slower search)

---

## Open Questions & Decisions Needed

### 1. Should semantic search be MVP or Phase 2?

**Arguments for MVP:**

- Semantic search is the differentiator
- "Find posts about X" is the killer feature
- Workers AI makes it feasible

**Arguments for Phase 2:**

- Keyword search alone is valuable
- Test opt-in adoption first
- Reduce initial complexity

**Recommendation:** Start with keywords (Phase 1), add semantic in Phase 2. This validates the opt-in model and keeps initial build focused.

---

### 2. Client-side vs server-side search?

**Client-side (Option A):**

- Free per-search
- Privacy-friendly
- Fast response

**Server-side (Option B/C):**

- Better semantic search
- Smaller initial bundle
- Pay per query

**Recommendation:** Hybrid

- Client-side for keyword queries (<2MB index)
- Server-side for semantic queries (embeddings)
- Best of both worlds

---

### 3. Cloudflare AI Search vs self-hosted?

**Wait for pricing clarity.**

- Cloudflare AI Search is promising but unproven
- Self-hosted Orama gives full control
- Decision gate: Q2 2026 when pricing announced

**Action:** Build with Orama, keep architecture flexible to swap in Cloudflare AI Search if it's cost-effective.

---

## Success Metrics

### Adoption

- % of tenants opted in to discovery
- Target: 30% by end of Q2, 50% by end of Q3

### Usage

- Searches per day
- Click-through rate on results
- "More like this" engagement

### Quality

- Search satisfaction (feedback widget)
- Result relevance (manual spot checks)
- False positive rate

---

## Naming

**Property Name:** `discover.grove.place` or `search.grove.place`

**Feature Name:** "Grove Discovery" or "Cross-Site Search"

**In UI:**

- "Discover the Grove"
- "Explore writing across the network"
- "Find your people"

---

## Next Steps

1. **Immediate:**
   - ✅ Complete this planning document
   - Share with community for feedback
   - Create wireframes for search UI

2. **Q1 2026:**
   - Monitor Cloudflare AI Search pricing announcements
   - Prototype Orama + Workers AI embeddings
   - Design opt-in UI in Arbor settings

3. **Q2 2026:**
   - Build Phase 1 (keyword search)
   - Soft launch with beta tenants
   - Gather feedback

4. **Q3 2026:**
   - Add Phase 2 (semantic search)
   - Public launch

---

## Related Reading

- [Orama Documentation](https://docs.oramasearch.com/)
- [Cloudflare AI Search Docs](https://developers.cloudflare.com/ai-search/)
- [Workers AI Embeddings](https://developers.cloudflare.com/workers-ai/models/text-embeddings/)
- [Vectorize Documentation](https://developers.cloudflare.com/vectorize/)
- FlexSearch vs Orama comparison (research notes)

---

_This is a living document. Update as we learn more about technology tradeoffs, user needs, and infrastructure costs._

_Last updated: 2026-02-11 by Claude (tag search investigation)_
