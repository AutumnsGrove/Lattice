# Journey Curio - Repository Evolution Tracker

## Overview

Journey Curio is the **second Developer Curio** for Grove. It tracks a GitHub repository's evolution over time, showing code composition, growth metrics, and AI-generated release summaries.

**Key Difference from Timeline:**

- **Timeline** = Daily commit activity summaries (uses GitHub Events API)
- **Journey** = Periodic repo snapshots with full code analysis (needs git clone)

**Design Decisions:**

- **Scope**: Single repo per tenant (v1), multi-repo later (v2)
- **Compute**: Firefly (ephemeral VPS) for git clone + analysis
- **Orchestration**: Loom (Durable Objects) for state tracking
- **AI**: OpenRouter BYOK for release summaries (both tagged releases AND periodic snapshots)
- **Reliability**: Firefly over GitHub API for accurate, consistent results

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          JOURNEY CURIO ARCHITECTURE                              │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   USER TRIGGER                                                                   │
│   ┌──────────────────────────────────────────────────────────────────────────┐  │
│   │  Admin UI "Analyze Repo"  OR  Scheduled (weekly/monthly)  OR  Webhook    │  │
│   └─────────────────────────────────────────┬────────────────────────────────┘  │
│                                             │                                    │
│                                             ▼                                    │
│   ORCHESTRATION LAYER (Loom)                                                     │
│   ┌──────────────────────────────────────────────────────────────────────────┐  │
│   │  JourneyDO (Durable Object)                                               │  │
│   │  • Tracks analysis state (pending → running → complete)                   │  │
│   │  • Manages job queue                                                      │  │
│   │  • Stores progress for UI polling                                         │  │
│   │  • Coordinates Firefly lifecycle                                          │  │
│   └─────────────────────────────────────────┬────────────────────────────────┘  │
│                                             │                                    │
│                                             ▼                                    │
│   COMPUTE LAYER (Firefly)                                                        │
│   ┌──────────────────────────────────────────────────────────────────────────┐  │
│   │  Ephemeral Hetzner VPS (CX22: 2 vCPU, 4GB RAM)                            │  │
│   │                                                                           │  │
│   │  IGNITE (45s)          ILLUMINATE (5-15min)         FADE (30s)           │  │
│   │  ┌─────────────┐       ┌─────────────────────┐      ┌─────────────┐      │  │
│   │  │ Provision   │──────▶│ git clone --depth=1 │─────▶│ Sync to R2  │      │  │
│   │  │ cloud-init  │       │ Analyze repo stats  │      │ Terminate   │      │  │
│   │  │ Pull tools  │       │ Count lines by lang │      │ Log metrics │      │  │
│   │  └─────────────┘       │ Generate AI summary │      └─────────────┘      │  │
│   │                        │ POST results to API │                            │  │
│   │                        └─────────────────────┘                            │  │
│   └──────────────────────────────────────────────────────────────────────────┘  │
│                                             │                                    │
│                                             ▼                                    │
│   STORAGE LAYER                                                                  │
│   ┌────────────────────┐  ┌────────────────────┐  ┌────────────────────┐        │
│   │ D1 (Metadata)      │  │ R2 (Artifacts)     │  │ DO SQLite (State)  │        │
│   │ • journey_config   │  │ • Analysis cache   │  │ • Job progress     │        │
│   │ • journey_snapshots│  │ • Repo snapshots   │  │ • Active jobs      │        │
│   │ • journey_summaries│  │ • Large results    │  │ • Error tracking   │        │
│   └────────────────────┘  └────────────────────┘  └────────────────────┘        │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## Why Firefly Over GitHub API

| Concern             | GitHub API                     | Firefly                        |
| ------------------- | ------------------------------ | ------------------------------ |
| **Line counts**     | Not available (only file list) | Exact counts via `wc -l`       |
| **Rate limits**     | 5,000 req/hr, often hit        | None (our own VPS)             |
| **Reliability**     | 502s, timeouts, inconsistent   | Rock solid (Hetzner 99.9% SLA) |
| **Historical data** | 90-day event limit             | Full git history               |
| **Cost**            | Free but unreliable            | ~$0.002 per analysis           |

**Fallback**: GitHub API mode for users who don't want to wait for Firefly boot time (~45s).

---

## Tag-Walking Analysis Strategy

The magic of Journey is seeing the **historical progression** across ALL version tags. This requires walking through every tag, not just analyzing the latest code.

### The Algorithm

```
┌─────────────────────────────────────────────────────────────────┐
│  1. FULL CLONE                                                  │
│     git clone --mirror https://github.com/user/repo             │
│     (includes ALL history and tags)                             │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. DISCOVER TAGS                                               │
│     git tag --sort=version:refname                              │
│     → v0.1.0, v0.2.0, v0.3.0 ... v0.9.6                        │
│     → Example: 30 tags to process                               │
└───────────────────────────────┬─────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. FOR EACH TAG (sequentially):                                │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ v0.6.1                                                   │   │
│  │ 1. git checkout v0.6.1                                   │   │
│  │ 2. Count lines per language → 60,021 total              │   │
│  │ 3. git log v0.6.0..v0.6.1 → 12 commits since last tag   │   │
│  │ 4. AI: "Summarize these 12 commits" → narrative         │   │
│  │ 5. Store snapshot + summary to results                   │   │
│  │ 6. Report progress: "4/30 tags complete"                 │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ v0.6.2                                                   │   │
│  │ 1. git checkout v0.6.2                                   │   │
│  │ 2. Count lines → 63,538 total (+3,517 from v0.6.1)      │   │
│  │ 3. git log v0.6.1..v0.6.2 → 8 commits                   │   │
│  │ 4. AI: "Summarize these 8 commits" → narrative          │   │
│  │ 5. Store snapshot + summary                              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ... repeat for all tags ...                                   │
│                                                                 │
│  ⏱️ Total time: ~30-45 minutes for 30 tags                     │
│  💰 Server cost: ~€0.01 (Hetzner)                              │
│  💰 AI cost: ~$0.05-0.30 depending on model                    │
└─────────────────────────────────────────────────────────────────┘
```

### Why Tag-Walking Works

| Problem                         | Solution                                                |
| ------------------------------- | ------------------------------------------------------- |
| **2M lines would blow up AI**   | We only send 8-20 commits per tag, not the whole repo   |
| **Need historical progression** | Walking tags gives us snapshots at each version         |
| **Token limits**                | Each summary is ~500 tokens in, ~300 out. Tiny.         |
| **Server time**                 | 30 tags × 1 min each = 30 min. We pay €0.004. Worth it. |

### AI Prompt Per Tag (Scoped to Delta)

```
You're summarizing version v0.9.6 of Lattice.

Commits since v0.9.5 (11 commits):
- feat: add Curios cabinet for visitor experience
- feat: migrate payment system to Lemon Squeezy
- fix: correct LineSquiggle icon name
- fix: cast SDK attributes for TypeScript
- docs: add legal pages to knowledge base
...

Stats: +13,000 lines added, -11,925 lines removed

Write a 2-3 sentence narrative summary, then list top features and fixes.
```

**This is manageable.** 11 commits = ~200 tokens. The AI isn't overwhelmed.

---

## AI Models (via OpenRouter BYOK)

Users bring their own OpenRouter key. These models are optimized for code summarization:

| Model                        | Input $/1M | Output $/1M | Context | Notes                          |
| ---------------------------- | ---------- | ----------- | ------- | ------------------------------ |
| **DeepSeek V3.2** ⭐ DEFAULT | $0.25      | $0.38       | 164K    | Best value, excellent at code  |
| Kimi K2                      | $0.39      | $1.90       | 262K    | Great reasoning, huge context  |
| MiniMax M2.1                 | $0.27      | $1.12       | 197K    | Fast, good quality             |
| Claude Haiku 4.5             | $1.00      | $5.00       | 200K    | Premium quality                |
| GPT-OSS 120B                 | $0.04      | $0.19       | 131K    | Ultra cheap                    |
| Qwen3 235B                   | $0.07      | $0.46       | 262K    | Large context, budget friendly |
| Llama 3.3 70B                | $0.10      | $0.32       | 131K    | Open source, reliable          |
| GLM 4.7                      | $0.40      | $1.50       | 203K    | Good multilingual              |
| Llama 4 Maverick             | $0.15      | $0.60       | **1M**  | Massive context window         |

### Cost Estimate for 30-Tag Analysis

| Model            | Est. Total Cost |
| ---------------- | --------------- |
| GPT-OSS 120B     | ~$0.02          |
| DeepSeek V3.2    | ~$0.05          |
| Qwen3 235B       | ~$0.06          |
| Llama 3.3 70B    | ~$0.08          |
| MiniMax M2.1     | ~$0.15          |
| Claude Haiku 4.5 | ~$0.40          |

**Recommended for bulk processing:** DeepSeek V3.2 (default) or GPT-OSS 120B (budget)

---

## Database Schema

```sql
-- Migration: 021_journey_curio.sql

-- =============================================================================
-- Journey Curio Configuration
-- =============================================================================

CREATE TABLE IF NOT EXISTS journey_curio_config (
    tenant_id TEXT PRIMARY KEY,
    enabled INTEGER DEFAULT 0,

    -- Repository settings
    github_repo_url TEXT,                   -- Full URL: https://github.com/user/repo
    github_username TEXT,                   -- Extracted from URL
    github_repo_name TEXT,                  -- Extracted from URL
    display_name TEXT,                      -- "Lattice" (for UI)

    -- Credentials (encrypted at rest)
    github_token_encrypted TEXT,            -- For private repos
    openrouter_key_encrypted TEXT,          -- For AI summaries
    openrouter_model TEXT DEFAULT 'anthropic/claude-3.5-haiku',

    -- Analysis settings
    snapshot_frequency TEXT DEFAULT 'release',  -- 'release', 'weekly', 'monthly', 'manual'
    auto_generate_summaries INTEGER DEFAULT 1,
    analyze_on_release INTEGER DEFAULT 1,       -- Webhook trigger

    -- Display settings
    show_language_chart INTEGER DEFAULT 1,
    show_growth_chart INTEGER DEFAULT 1,
    show_milestones INTEGER DEFAULT 1,
    show_doc_stats INTEGER DEFAULT 1,
    primary_languages TEXT,                     -- JSON array for highlighting

    -- Ingestion mode
    ingestion_mode TEXT DEFAULT 'firefly',      -- 'firefly', 'api', 'manual'

    created_at INTEGER DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER DEFAULT (strftime('%s', 'now')),

    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

-- =============================================================================
-- Journey Snapshots (periodic code analysis)
-- =============================================================================

CREATE TABLE IF NOT EXISTS journey_snapshots (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,

    -- Snapshot identification
    snapshot_date TEXT NOT NULL,            -- YYYY-MM-DD
    label TEXT,                             -- "v1.0.0" or "weekly-2024-01-15"
    git_hash TEXT,                          -- Commit SHA at snapshot

    -- Code metrics (flexible for any language)
    total_code_lines INTEGER DEFAULT 0,
    language_breakdown TEXT,                -- JSON: { "TypeScript": { lines: 5000, pct: 45 }, ... }

    -- Documentation metrics
    doc_words INTEGER DEFAULT 0,
    doc_lines INTEGER DEFAULT 0,

    -- File metrics
    total_files INTEGER DEFAULT 0,
    directories INTEGER DEFAULT 0,

    -- Git metrics
    total_commits INTEGER DEFAULT 0,
    commits_since_last INTEGER DEFAULT 0,

    -- Test metrics
    test_files INTEGER DEFAULT 0,
    test_lines INTEGER DEFAULT 0,

    -- Token estimation (for AI context)
    estimated_tokens INTEGER DEFAULT 0,

    -- Build metrics (optional)
    bundle_size_kb INTEGER DEFAULT 0,

    -- Source tracking
    ingestion_source TEXT DEFAULT 'firefly',  -- 'firefly', 'api', 'manual'
    firefly_job_id TEXT,                      -- Link to Firefly session

    created_at INTEGER DEFAULT (strftime('%s', 'now')),

    UNIQUE(tenant_id, snapshot_date, label),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_journey_snapshots_tenant_date
ON journey_snapshots(tenant_id, snapshot_date DESC);

-- =============================================================================
-- Journey AI Summaries (for releases/milestones)
-- =============================================================================

CREATE TABLE IF NOT EXISTS journey_summaries (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    snapshot_id TEXT NOT NULL,

    -- Version info
    version TEXT NOT NULL,                  -- "v1.0.0"
    summary_date TEXT NOT NULL,

    -- AI-generated content
    summary TEXT,                           -- 2-3 sentence narrative
    highlights_features TEXT,               -- JSON array
    highlights_fixes TEXT,                  -- JSON array

    -- Commit stats breakdown
    stats_features INTEGER DEFAULT 0,
    stats_fixes INTEGER DEFAULT 0,
    stats_refactoring INTEGER DEFAULT 0,
    stats_docs INTEGER DEFAULT 0,
    stats_tests INTEGER DEFAULT 0,
    stats_performance INTEGER DEFAULT 0,
    stats_total_commits INTEGER DEFAULT 0,

    -- AI metadata
    ai_model TEXT,
    ai_cost_usd REAL DEFAULT 0,

    created_at INTEGER DEFAULT (strftime('%s', 'now')),

    UNIQUE(tenant_id, version),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (snapshot_id) REFERENCES journey_snapshots(id) ON DELETE CASCADE
);

-- =============================================================================
-- Journey Jobs (Firefly task tracking)
-- =============================================================================

CREATE TABLE IF NOT EXISTS journey_jobs (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,

    -- Job info
    job_type TEXT NOT NULL,                 -- 'snapshot', 'backfill', 'summary'
    status TEXT DEFAULT 'pending',          -- 'pending', 'running', 'completed', 'failed'

    -- Firefly info
    firefly_instance_id TEXT,
    firefly_region TEXT,

    -- Progress
    progress REAL DEFAULT 0,                -- 0.0 to 1.0
    progress_message TEXT,

    -- Timing
    started_at INTEGER,
    completed_at INTEGER,

    -- Results
    result_snapshot_id TEXT,
    error_message TEXT,

    created_at INTEGER DEFAULT (strftime('%s', 'now')),

    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_journey_jobs_tenant_status
ON journey_jobs(tenant_id, status, created_at DESC);
```

---

## Implementation Phases

### Phase 1: Firefly Core Infrastructure

**Goal**: Build the shared Firefly library for ephemeral VPS management.

**Files to Create**:

```
packages/firefly/
├── src/
│   ├── index.ts                    # Main exports
│   ├── types.ts                    # TypeScript interfaces
│   ├── provisioner/
│   │   ├── index.ts                # Provider interface
│   │   └── hetzner.ts              # Hetzner Cloud implementation
│   ├── state/
│   │   ├── index.ts                # State sync interface
│   │   └── r2-sync.ts              # R2 implementation
│   ├── idle-detector.ts            # Activity monitoring
│   └── orphan-sweep.ts             # Cost safety cron
├── package.json
└── tsconfig.json
```

**Key Components**:

1. **ServerProvisioner** - Hetzner API abstraction (create/destroy VPS)
2. **StateSynchronizer** - R2 state management (hydrate/persist)
3. **IdleDetector** - Monitor activity, trigger shutdown
4. **OrphanSweep** - Cron to terminate forgotten VPS

---

### Phase 2: JourneyDO (Durable Object Orchestrator)

**Goal**: Create the Loom DO for coordinating Journey analysis jobs.

**Files to Create**:

```
services/durable-objects/src/
├── JourneyDO.ts                    # Job orchestration DO
```

**JourneyDO Responsibilities**:

- Track active analysis jobs per tenant
- Coordinate Firefly provisioning
- Store progress for UI polling
- Handle job retries on failure
- Manage job queue (one active job per tenant)

**State Schema**:

```typescript
interface JourneyDOState {
  activeJob: {
    id: string;
    status: "provisioning" | "analyzing" | "generating" | "complete" | "failed";
    progress: number;
    message: string;
    fireflyInstanceId?: string;
    startedAt: number;
  } | null;
  jobHistory: Array<{
    id: string;
    status: string;
    completedAt: number;
  }>;
}
```

---

### Phase 3: Journey Analysis Worker

**Goal**: Build the analysis script that runs on Firefly VPS.

**Files to Create**:

```
workers/journey-analyzer/
├── src/
│   ├── index.ts                    # Main entry point
│   ├── clone.ts                    # Git clone logic
│   ├── analyze.ts                  # Code analysis (line counts, languages)
│   ├── summarize.ts                # AI summary generation
│   └── upload.ts                   # POST results to Grove API
├── package.json
└── Dockerfile                      # For Hetzner image
```

**Analysis Flow**:

```
1. Receive job config (repo URL, tenant ID, API key)
2. git clone --depth=1 <repo>  (or full clone for backfill)
3. Analyze:
   - Count lines per language (using linguist or custom)
   - Count documentation (*.md files)
   - Get commit count from git log
   - Estimate tokens (~4 chars per token)
4. If version tag: generate AI summary via OpenRouter
5. POST results to /api/curios/journey/ingest
6. Signal completion to JourneyDO
```

---

### Phase 4: Database Migration & Core Library

**Goal**: Create the D1 schema and core TypeScript library.

**Files to Create**:

```
libs/engine/migrations/021_journey_curio.sql

libs/engine/src/lib/curios/journey/
├── index.ts                        # Main exports
├── types.ts                        # TypeScript interfaces
├── config.ts                       # Default config, validation
├── summary-prompt.ts               # AI prompt for release summaries
└── language-colors.ts              # GitHub-style language colors
```

---

### Phase 5: API Endpoints

**Goal**: Create REST APIs for Journey Curio.

**Files to Create**:

```
libs/engine/src/routes/api/curios/journey/
├── +server.ts                      # GET snapshots (public)
├── config/+server.ts               # GET/PUT config (admin)
├── analyze/+server.ts              # POST trigger analysis (admin)
├── ingest/+server.ts               # POST receive results from Firefly
├── jobs/+server.ts                 # GET job status (admin)
├── jobs/[id]/+server.ts            # GET specific job progress
├── milestones/+server.ts           # GET version releases only
└── growth/+server.ts               # GET growth metrics
```

**Endpoint Details**:

| Method | Path                             | Auth    | Description             |
| ------ | -------------------------------- | ------- | ----------------------- |
| GET    | `/api/curios/journey`            | Public  | Paginated snapshots     |
| GET    | `/api/curios/journey/config`     | Admin   | Current config          |
| PUT    | `/api/curios/journey/config`     | Admin   | Update config           |
| POST   | `/api/curios/journey/analyze`    | Admin   | Trigger new analysis    |
| POST   | `/api/curios/journey/ingest`     | API Key | Receive Firefly results |
| GET    | `/api/curios/journey/jobs`       | Admin   | List recent jobs        |
| GET    | `/api/curios/journey/jobs/:id`   | Admin   | Job progress            |
| GET    | `/api/curios/journey/milestones` | Public  | Version releases        |
| GET    | `/api/curios/journey/growth`     | Public  | Growth over time        |

---

### Phase 6: Admin UI

**Goal**: Create the Arbor configuration interface.

**Files to Create**:

```
libs/engine/src/routes/admin/curios/journey/
├── +page.svelte                    # Configuration form
└── +page.server.ts                 # Load/save config
```

**Admin UI Sections**:

1. **Enable/Disable** toggle
2. **Repository** - URL input, auto-parse username/repo
3. **Credentials** - GitHub token (for private repos), OpenRouter key
4. **Schedule** - Snapshot frequency (release/weekly/monthly/manual)
5. **Display Options** - Toggle charts, select primary languages
6. **Actions** - "Analyze Now" button, view recent jobs

---

### Phase 7: Svelte Components

**Goal**: Build the visualization components.

**Files to Create**:

```
libs/engine/src/lib/curios/journey/components/
├── Journey.svelte                  # Main component (orchestrates all)
├── GrowthChart.svelte              # Stacked bar chart over time
├── LanguageBar.svelte              # Code composition breakdown
├── MilestoneTimeline.svelte        # Version releases with AI summaries
├── StatsGrid.svelte                # Current stats (lines, docs, commits)
├── DocGrowth.svelte                # Documentation growth chart
└── LanguageEvolution.svelte        # TS vs JS migration chart
```

**Adapt from**: `landing/src/routes/journey/+page.svelte` (existing visualizations)

---

### Phase 8: Public Route

**Goal**: Create the public `/journey` page.

**Files to Create**:

```
libs/engine/src/routes/(site)/journey/
├── +page.svelte                    # Public Journey page
└── +page.server.ts                 # Load snapshots, config
```

---

### Phase 9: Backfill Strategy

**Goal**: Historical data generation for existing repos.

**Two Approaches**:

**A. Full Historical Backfill (Firefly)**

```
1. User clicks "Backfill History" in admin
2. JourneyDO enqueues backfill job
3. Firefly boots with full clone (--depth=0)
4. Walk git tags/commits, generate snapshots
5. Generate AI summaries for each version tag
6. ~30 minutes for large repos
```

**B. CSV Import (Quick)**

```
1. User runs existing repo-snapshot.sh locally
2. Uploads CSV to admin UI
3. API parses and inserts into journey_snapshots
4. Optional: trigger AI summaries for each row
```

---

## Firefly Config for Journey

```typescript
const journeyFireflyConfig: FireflyConfig = {
  trigger: {
    type: "api", // Triggered by JourneyDO
    source: "journey-analyze-queue",
  },
  provisioner: {
    provider: "hetzner",
    size: "cx22", // 2 vCPU, 4GB RAM
    region: "fsn1", // EU (cheapest)
    image: "journey-analyzer-v1",
    maxLifetime: 30 * 60 * 1000, // 30 minutes max
  },
  stateSync: {
    storage: "r2",
    bucket: "journey-workspaces",
    syncOnCompletion: true,
  },
  idle: {
    threshold: 5 * 60 * 1000, // 5 minutes idle
    signals: ["analysis_running"],
  },
};
```

**Cost Estimate**:

- Hetzner CX22: €0.0076/hr
- Typical analysis: 10 minutes
- Cost per analysis: ~€0.0013 (~$0.0015)

---

## Critical Files Summary

| Category            | Files                                                 |
| ------------------- | ----------------------------------------------------- |
| **Firefly Core**    | `packages/firefly/src/*`                              |
| **JourneyDO**       | `services/durable-objects/src/JourneyDO.ts`           |
| **Analyzer Worker** | `workers/journey-analyzer/*`                          |
| **Database**        | `libs/engine/migrations/021_journey_curio.sql`    |
| **Library**         | `libs/engine/src/lib/curios/journey/*`            |
| **API**             | `libs/engine/src/routes/api/curios/journey/*`     |
| **Admin UI**        | `libs/engine/src/routes/admin/curios/journey/*`   |
| **Components**      | `libs/engine/src/lib/curios/journey/components/*` |
| **Public Route**    | `libs/engine/src/routes/(site)/journey/*`         |

---

## Verification Plan

### 1. Firefly Core

```bash
# Test Hetzner provisioner locally
pnpm test:firefly --provisioner

# Verify VPS creation/deletion
# Check orphan sweep cron
```

### 2. JourneyDO

- Create test job via API
- Verify state updates in DO
- Test progress polling endpoint
- Simulate failure and retry

### 3. Analysis Worker

```bash
# Run analyzer locally against test repo
cd workers/journey-analyzer
pnpm dev --repo=https://github.com/AutumnsGrove/Lattice
```

### 4. End-to-End

1. Enable Journey Curio in admin
2. Enter repo URL
3. Click "Analyze Now"
4. Watch progress in UI
5. Verify snapshot appears
6. Check AI summary generated
7. View public `/journey` page

### 5. Backfill

- Test CSV import with existing `history.csv`
- Test full historical backfill via Firefly
- Verify all versions have AI summaries

---

## Implementation Order

1. **Phase 1**: Firefly Core (foundation for compute)
2. **Phase 2**: JourneyDO (orchestration layer)
3. **Phase 3**: Analysis Worker (the actual work)
4. **Phase 4**: Database + Core Library (data layer)
5. **Phase 5**: API Endpoints (data access)
6. **Phase 6**: Admin UI (configuration)
7. **Phase 7**: Svelte Components (visualizations)
8. **Phase 8**: Public Route (user-facing)
9. **Phase 9**: Backfill (historical data)

---

## Security Considerations

1. **API Key for Ingest** - Firefly uses per-tenant API key to POST results
2. **GitHub Token** - Encrypted at rest, only used for private repos
3. **Firefly Network** - VPS only talks to Grove API (no external access)
4. **Orphan Sweep** - Cron every 5 min to terminate forgotten VPS
5. **Max Lifetime** - 30-minute hard cap on any Firefly session

---

## Notes

- **Reuse from Timeline**: OpenRouter integration, admin UI patterns, API structure
- **Existing Visualizations**: Port charts from `landing/src/routes/journey/`
- **Firefly Spec**: Full details in `docs/patterns/firefly-pattern.md`
- **Loom Pattern**: Details in `docs/patterns/loom-durable-objects-pattern.md`
