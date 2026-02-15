# Curio: Polls

> *I'm curious what you think.*

**Priority:** Tier 2 — Build Next
**Complexity:** Medium
**Category:** Interactive
**Placement:** Dedicated page (`/polls/`), right-vine (active poll), inline (in blog posts)

---

## What

Run interactive polls on your site — ask visitors questions, see live results. Twitter/X made polls mainstream. Having them as a curio means the data stays on YOUR site.

## Why

Your friend Arturo asked about polls, and he's not wrong. Polls are one of the most engaging interactive elements on the web. They give visitors a low-friction way to participate. They generate conversation. And unlike social media polls, these live on the Wanderer's own site.

---

## Database Schema

### Migration: `{next}_poll_curio.sql`

```sql
CREATE TABLE IF NOT EXISTS polls (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  question TEXT NOT NULL,
  description TEXT DEFAULT NULL,
  poll_type TEXT NOT NULL DEFAULT 'single',
  options TEXT NOT NULL DEFAULT '[]',
  show_results TEXT NOT NULL DEFAULT 'after_vote',
  allow_change INTEGER NOT NULL DEFAULT 0,
  close_at TEXT DEFAULT NULL,
  is_pinned INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS poll_votes (
  id TEXT PRIMARY KEY,
  poll_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  option_index INTEGER NOT NULL,
  voter_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (poll_id) REFERENCES polls(id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  UNIQUE(poll_id, voter_hash)
);

CREATE INDEX idx_polls_tenant ON polls(tenant_id);
CREATE INDEX idx_polls_active ON polls(tenant_id, close_at);
CREATE INDEX idx_poll_votes_poll ON poll_votes(poll_id);
CREATE INDEX idx_poll_votes_hash ON poll_votes(poll_id, voter_hash);
```

---

## Components

| Component | Purpose |
|-----------|---------|
| `Poll.svelte` | Main poll display (question + options + results) |
| `PollOptions.svelte` | Render options with radio/checkbox inputs |
| `PollResults.svelte` | Bar chart results view with percentages |
| `PollMini.svelte` | Vine-compatible (shows pinned/latest poll question + vote button) |
| `PollEmbed.svelte` | Inline version for embedding in blog posts |
| `PollAdmin.svelte` | Create/edit/close polls |
| `PollList.svelte` | Archive of past polls with results |

---

## Poll Types

- **Single choice** — Pick one option
- **Multiple choice** — Pick up to N options
- **Ranked** — Drag to rank (stretch goal, Oak+ only)

## Results Visibility

- **Always** — Results visible before voting
- **After voting** — See results only after casting your vote (default)
- **After close** — Results hidden until poll closes
- **Admin only** — Results visible only in admin panel

---

## API Endpoints

| Method | Route | Purpose | Auth |
|--------|-------|---------|------|
| `GET` | `/api/curios/polls` | List polls (active + recent) | Public |
| `GET` | `/api/curios/polls/[id]` | Get poll with results | Public |
| `POST` | `/api/curios/polls/[id]/vote` | Cast vote | Public (rate-limited) |
| `POST` | `/api/curios/polls` | Create poll | Admin |
| `PUT` | `/api/curios/polls/[id]` | Update poll | Admin |
| `DELETE` | `/api/curios/polls/[id]` | Delete poll | Admin |

---

## Key Implementation Details

- **One vote per visitor:** `voter_hash = sha256(poll_id + ip + user_agent)` — prevents double-voting without storing PII
- **No login required** to vote (low friction)
- **Options stored as JSON array** in `options` field: `["Option A", "Option B", "Option C"]`
- **Results cached in KV** — updated on each vote, expire after 60s (fast reads, eventual consistency)
- **Animated result bars** — CSS transitions on width percentage
- **Close date** — Optional. Auto-closes poll, shows final results.
- **Pinned poll** — One poll can be pinned to appear in vine slots
- **Inline embedding** — Author can place `<Poll id="xyz" />` in blog post markdown (parsed at render)
- **Poll archive** — `/polls/` page shows all past polls with results

### Inline Placement (Content Exception)

Polls are one of the few curios that can go inside content. When an author explicitly places a poll in a blog post, it IS content — they're asking their readers a question as part of the post. The vine placement shows the latest/pinned poll. The inline placement is author-directed.

---

## Tier Logic

| Tier | Active Polls | Types | Features |
|------|-------------|-------|----------|
| Seedling | 1 | Single choice | Basic |
| Sapling | 5 | Single + Multiple | Inline embeds, close dates |
| Oak+ | Unlimited | All types | Ranked choice, custom styling |

---

## Implementation Steps

1. Migration + types in `index.ts`
2. `PollOptions.svelte` — vote interface
3. `PollResults.svelte` — bar chart display
4. `Poll.svelte` — full poll component
5. Vote API with hash-based dedup
6. KV result caching
7. `PollMini.svelte` — vine component
8. `PollEmbed.svelte` — inline blog component
9. Admin page (create/edit/close)
10. Poll archive page at `/(site)/polls/`
11. Markdown embed parser for inline polls
12. Register in curio registry
13. Tests

---

*A question hangs in the air. The visitors answer.*
