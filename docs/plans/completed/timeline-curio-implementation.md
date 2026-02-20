# Timeline Curio - Developer Curios Implementation Plan

## Overview

Transform the existing Timeline page from AutumnsGrove into the **first Developer Curio** - a reusable, configurable tool that any developer can enable on their Grove site to get AI-generated daily summaries of their GitHub activity.

**Key Decisions:**

- **Hosting**: Grove-hosted (primary) + self-deploy template (power users)
- **AI Provider**: OpenRouter (BYOK - Bring Your Own Key)
- **Voice System**: 5 presets + custom prompt option
- **Config Location**: Arbor admin panel (under Pages/Curios)

---

## Phase 1: OpenRouter Provider Integration

**Goal:** Add OpenRouter as the AI provider, replacing current Anthropic/Cloudflare setup.

### Files to Create/Modify

1. **Create** `workers/daily-summary/providers/openrouter.js`
   - OpenRouter API integration
   - Model selection support (user picks their model)
   - Response parsing for various model formats

2. **Modify** `workers/daily-summary/providers.js`
   - Add OpenRouter to provider list
   - Make it the default/only provider for Curios
   - Keep Anthropic/CF for AutumnsGrove's own timeline (backwards compat)

### OpenRouter Config Pattern

```javascript
{
  provider: 'openrouter',
  model: 'anthropic/claude-3.5-haiku', // User-configurable
  apiKey: 'sk-or-...' // User's BYOK key
}
```

---

## Phase 2: Voice Presets System

**Goal:** Create 5 voice presets + custom prompt support.

### Files to Create

1. **Create** `services/daily-summary/voices/index.js`
   - Export all voice presets
   - Voice selector utility function

2. **Create** `services/daily-summary/voices/presets/`
   - `professional.js` - Clean, technical (current AutumnsGrove style)
   - `quest.js` - RPG/adventure style ("Day 3 of the Great Refactoring Quest...")
   - `casual.js` - Friendly, conversational ("Hey! Pretty productive day...")
   - `poetic.js` - Lyrical, contemplative ("In the quiet hours, code took shape...")
   - `minimal.js` - Just the facts, bullet points only

3. **Modify** `services/daily-summary/prompts.js`
   - Accept voice preset as parameter
   - Support custom prompt override
   - Maintain backward compatibility with current system

### Voice Preset Interface

```javascript
{
  id: 'quest',
  name: 'Quest Mode',
  description: 'Turn your coding into an RPG adventure',
  systemPrompt: '...',
  summaryStyle: '...',
  gutterStyle: '...' // How margin comments are written
}
```

---

## Phase 3: Database Schema Updates

**Goal:** Support multi-tenant Timeline Curios with per-user config.

### Migration Files to Create

1. **Create** `libs/engine/migrations/0XX_timeline_curio_settings.sql`

```sql
-- Timeline curio configuration per tenant
CREATE TABLE IF NOT EXISTS timeline_curio_config (
  tenant_id TEXT PRIMARY KEY,
  enabled INTEGER DEFAULT 0,
  github_username TEXT,
  github_token_encrypted TEXT,  -- Encrypted at rest
  openrouter_key_encrypted TEXT, -- Encrypted at rest
  openrouter_model TEXT DEFAULT 'anthropic/claude-3.5-haiku',
  voice_preset TEXT DEFAULT 'professional',
  custom_prompt TEXT,  -- NULL unless voice_preset = 'custom'
  repos_include TEXT,  -- JSON array, NULL = all repos
  repos_exclude TEXT,  -- JSON array of repos to skip
  timezone TEXT DEFAULT 'America/New_York',
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER DEFAULT (strftime('%s', 'now')),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- Timeline summaries (adapted from AutumnsGrove, now multi-tenant)
CREATE TABLE IF NOT EXISTS timeline_summaries (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  summary_date TEXT NOT NULL,
  brief_summary TEXT,
  detailed_timeline TEXT,
  gutter_content TEXT,
  commit_count INTEGER DEFAULT 0,
  repos_active TEXT,  -- JSON array
  total_additions INTEGER DEFAULT 0,
  total_deletions INTEGER DEFAULT 0,
  ai_model TEXT,
  voice_preset TEXT,
  created_at INTEGER DEFAULT (strftime('%s', 'now')),
  UNIQUE(tenant_id, summary_date),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

CREATE INDEX idx_timeline_summaries_tenant_date
ON timeline_summaries(tenant_id, summary_date DESC);
```

---

## Phase 4: Admin UI (Arbor)

**Goal:** Add Timeline Curio configuration to the admin panel.

### Files to Create

1. **Create** `libs/engine/src/routes/admin/curios/+page.svelte`
   - Curios overview page (list of available curios)
   - Shows which curios are enabled
   - Tier-based limits display

2. **Create** `libs/engine/src/routes/admin/curios/timeline/+page.svelte`
   - Timeline configuration form
   - GitHub token input (with secure storage)
   - OpenRouter key input
   - Model selector dropdown
   - Voice preset selector (with previews!)
   - Custom prompt editor (shown when voice = 'custom')
   - Repos include/exclude configuration
   - Test button ("Generate today's summary")

3. **Create** `libs/engine/src/routes/admin/curios/timeline/+page.server.ts`
   - Load current config
   - Save config (with encryption for tokens)
   - Validate inputs

### Files to Modify

1. **Modify** `libs/engine/src/routes/admin/+layout.svelte`
   - Add "Curios" section to sidebar navigation
   - Icon: Sparkles or similar

---

## Phase 5: API Endpoints

**Goal:** Create APIs for Timeline Curio functionality.

### Files to Create

1. **Create** `libs/engine/src/routes/api/curios/timeline/+server.ts`
   - GET: Fetch timeline summaries (paginated)
   - Public read access (for embedding)

2. **Create** `libs/engine/src/routes/api/curios/timeline/config/+server.ts`
   - GET: Fetch current config (admin only)
   - PUT: Update config (admin only)
   - Handles encryption/decryption of tokens

3. **Create** `libs/engine/src/routes/api/curios/timeline/generate/+server.ts`
   - POST: Manually trigger summary generation (admin only)
   - For testing and on-demand generation

4. **Create** `libs/engine/src/routes/api/curios/timeline/activity/+server.ts`
   - GET: Fetch activity heatmap data
   - Cached for performance

---

## Phase 6: Multi-Tenant Worker

**Goal:** Adapt the daily-summary worker to process all enabled tenants.

### Files to Modify

1. **Modify** `workers/daily-summary/index.js`
   - Add multi-tenant processing mode
   - Iterate over all enabled tenants
   - Use per-tenant config (API keys, voice, etc.)
   - Error isolation (one tenant's failure doesn't stop others)

2. **Create** `workers/daily-summary/tenant-processor.js`
   - Process a single tenant's daily summary
   - Fetch commits using tenant's GitHub token
   - Generate summary using tenant's OpenRouter key + voice
   - Store in tenant-scoped table

### Cron Strategy

```javascript
// Option A: Single cron, process all tenants
scheduled: async (event, env) => {
	const enabledTenants = await getEnabledTenants(env.DB);
	for (const tenant of enabledTenants) {
		await processTenantSummary(tenant, env);
	}
};

// Option B: Per-tenant scheduling (respects timezone)
// More complex but better for different timezones
```

---

## Phase 7: Frontend Component & Route

**Goal:** Create the embeddable Timeline component and public route.

### Files to Create

1. **Create** `libs/engine/src/lib/curios/Timeline/Timeline.svelte`
   - Main timeline component (adapted from AutumnsGrove)
   - Accepts tenant context
   - Configurable styling
   - Responsive design

2. **Create** `libs/engine/src/lib/curios/Timeline/index.ts`
   - Export component and types

3. **Create** `libs/engine/src/routes/(site)/timeline/+page.svelte`
   - Public timeline page
   - Uses Timeline component
   - Loads data from API

4. **Create** `libs/engine/src/routes/(site)/timeline/+page.server.ts`
   - Load timeline data for current tenant
   - Handle 404 if timeline not enabled

### Component Props

```typescript
interface TimelineProps {
	summaries: TimelineSummary[];
	activity?: ActivityData;
	voicePreset?: string;
	showActivity?: boolean;
	limit?: number;
}
```

---

## Phase 8: Self-Deploy Template (Future)

**Goal:** Package for power users who want full control.

### Deliverables

1. **Create** `templates/timeline-curio/`
   - Standalone Cloudflare Worker
   - wrangler.toml template
   - README with setup instructions
   - Environment variable documentation

2. **Documentation**
   - Step-by-step deployment guide
   - Cloudflare account setup
   - D1 database creation
   - Secrets configuration

---

## Critical Files Summary

| Category       | Files                                                        |
| -------------- | ------------------------------------------------------------ |
| **OpenRouter** | `workers/daily-summary/providers/openrouter.js`              |
| **Voices**     | `workers/daily-summary/voices/*.js`                          |
| **Database**   | `libs/engine/migrations/0XX_timeline_curio_settings.sql` |
| **Admin UI**   | `libs/engine/src/routes/admin/curios/**`                 |
| **API**        | `libs/engine/src/routes/api/curios/timeline/**`          |
| **Worker**     | `workers/daily-summary/index.js`, `tenant-processor.js`      |
| **Component**  | `libs/engine/src/lib/curios/Timeline/**`                 |
| **Route**      | `libs/engine/src/routes/(site)/timeline/**`              |

---

## Verification Plan

### 1. OpenRouter Integration

```bash
# Test OpenRouter provider directly
curl -X POST https://openrouter.ai/api/v1/chat/completions \
  -H "Authorization: Bearer $OPENROUTER_KEY" \
  -d '{"model": "anthropic/claude-3.5-haiku", "messages": [...]}'
```

### 2. Voice Presets

- Generate test summaries with each voice preset
- Compare output tone and style
- Verify gutter comments match voice

### 3. Admin UI

- Enable Timeline Curio in Arbor
- Configure GitHub token + OpenRouter key
- Select voice preset
- Test "Generate Now" button

### 4. Multi-Tenant Worker

- Create test tenant with Timeline enabled
- Trigger manual generation
- Verify summary appears in database
- Check no cross-tenant data leakage

### 5. Public Route

- Visit `/timeline` on test site
- Verify summaries render correctly
- Test pagination
- Check mobile responsiveness

### 6. End-to-End

- Full flow: Enable curio → Configure → Generate → View
- Wait for scheduled cron (or trigger manually)
- Verify daily summary appears next day

---

## Implementation Order

1. **Phase 1**: OpenRouter provider (foundation for AI)
2. **Phase 2**: Voice presets (needed for testing)
3. **Phase 3**: Database migrations (data layer)
4. **Phase 4**: Admin UI (configuration interface)
5. **Phase 5**: API endpoints (data access)
6. **Phase 6**: Multi-tenant worker (generation engine)
7. **Phase 7**: Frontend component & route (user-facing)
8. **Phase 8**: Self-deploy template (power users, future)

---

## Notes

- **Encryption**: GitHub tokens and OpenRouter keys must be encrypted at rest
- **Rate Limiting**: Use existing engine RateLimiter for API endpoints
- **Caching**: Cache timeline data in KV (5-10 min TTL)
- **Error Handling**: Graceful degradation if API keys are invalid
- **Backwards Compat**: AutumnsGrove's existing timeline should continue working

---

## v1.1 Roadmap: Robust Backfill with Queues + Loom

The current backfill endpoint works but has limitations (Worker timeout, no progress tracking).
For v1.1, implement a robust backfill system using **Cloudflare Queues** + **Loom (Durable Objects)**:

### Architecture

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ Admin UI    │────▶│ Backfill API     │────▶│ Cloudflare      │
│ "Backfill"  │     │ (enqueue dates)  │     │ Queue           │
└─────────────┘     └──────────────────┘     └────────┬────────┘
                                                      │
                                                      ▼
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ Progress UI │◀────│ Loom DO          │◀────│ Queue Consumer  │
│ (polling)   │     │ (tracks state)   │     │ (processes)     │
└─────────────┘     └──────────────────┘     └─────────────────┘
```

### Components

1. **BackfillQueueProducer** (API endpoint)
   - Receives date range request (e.g., "2023-01-01" to "2024-01-01")
   - Splits into monthly chunks
   - Enqueues each chunk as a message

2. **BackfillQueueConsumer** (Queue handler)
   - Processes one month at a time
   - Fetches commits via Commits API
   - Stores in `timeline_activity` table
   - Reports progress to Loom DO

3. **BackfillLoomDO** (Durable Object)
   - State: `{ status, totalChunks, completedChunks, errors, startedAt }`
   - Provides progress endpoint for UI polling
   - Handles retries for failed chunks

### Benefits

- **No timeout issues**: Each queue message is a small chunk
- **Resumable**: Failed chunks retry automatically
- **Progress visibility**: Real-time progress in admin UI
- **Rate limit friendly**: Natural throttling via queue processing

### API Design

```typescript
// Start backfill
POST /api/curios/timeline/backfill/start
{ startDate: "2023-01-01", endDate: "2024-01-01" }
// Returns: { jobId: "bf-abc123" }

// Check progress
GET /api/curios/timeline/backfill/status/:jobId
// Returns: { status: "processing", progress: 0.67, errors: [] }

// Cancel backfill
POST /api/curios/timeline/backfill/cancel/:jobId
```

### Files to Create (v1.1)

- `libs/engine/src/lib/curios/timeline/backfill/queue-producer.ts`
- `libs/engine/src/lib/curios/timeline/backfill/queue-consumer.ts`
- `libs/engine/src/lib/curios/timeline/backfill/loom-do.ts`
- `libs/engine/src/routes/api/curios/timeline/backfill/start/+server.ts`
- `libs/engine/src/routes/api/curios/timeline/backfill/status/[jobId]/+server.ts`
