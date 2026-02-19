# Durable Object Workflow for AI Agent Orchestration

## Overview

This document describes a Cloudflare Workers-based architecture for orchestrating multi-step AI agent workflows using Durable Objects (DO) with SQLite persistence and Alarm API for chained execution. The pattern is designed for long-running, stateful tasks that involve multiple asynchronous steps (e.g., generating candidates, evaluating them, checking external APIs, and iterating until a goal is met). It's used in Forage to search for available domain names, but can be adapted to any similar workflow (product search, content generation, data analysis, etc.).

## Core Architecture

### 1. Durable Object as Stateful Worker

- Each job is represented by a Durable Object instance identified by a unique job ID.
- The DO stores its state in SQLite (built-in, free tier) with tables for job metadata, results, and artifacts.
- The DO's `fetch` method handles HTTP requests (start, status, results, cancel, etc.).
- The `alarm` method drives the batch processing loop, triggered after each batch completion.

### 2. SQLite Persistence

- Each DO has its own SQLite database (via `state.storage.sql`).
- Tables are created on first access (`ensureSchema`).
- Stores job state, batch results, and any intermediate artifacts.
- Enables the DO to survive restarts and continue where it left off.

### 3. Alarm API for Chained Execution

- After each batch, the DO schedules an alarm with a delay (e.g., 10 seconds) using `state.storage.setAlarm(time)`.
- When the alarm fires, the `alarm` method is invoked, which processes the next batch.
- This creates a loop that continues until a termination condition (success, failure, or max batches).
- Advantages over queues: no extra cost, built-in retries, and simplicity.

### 4. D1 Database for Job Index (Optional)

- A separate D1 database provides a global view of all jobs.
- Used for listing, filtering, and quick status queries without hitting each DO.
- The DO updates the index after each batch (via `updateJobIndex`).
- This is a secondary pattern; the DO remains the source of truth.

### 5. AI Provider Abstraction

- Multiple AI providers (Claude, DeepSeek, Kimi, Cloudflare AI) are abstracted behind a common interface.
- Each provider implements `generate` and `generateWithTools` methods.
- Tool calling is used where supported, with fallback to JSON prompts.
- Provider selection can be per‑job via request parameters.

## Workflow Pattern

### Step‑by‑Step Orchestration

1. **Job Creation**
   - Client POSTs to `/api/search` with initial parameters (business name, preferences, etc.).
   - Worker generates a job ID, creates a Durable Object stub, and forwards the request to the DO's `/start` endpoint.
   - DO initializes SQLite tables, stores job metadata, and schedules the first alarm (delay 0).

2. **Batch Processing Loop (in `alarm`)**
   - DO retrieves job state from SQLite.
   - Executes a batch of work (e.g., generate candidates → evaluate → check availability → price lookup).
   - Saves results to SQLite.
   - Evaluates termination conditions:
     - If target results reached → mark job as `complete`, send notification.
     - If max batches reached but target not met → mark as `needs_followup`, generate follow‑up quiz.
     - Otherwise, schedule next alarm (with a delay to respect rate limits).
   - Updates D1 job index with fresh status.

3. **Real‑time Updates**
   - Clients can poll `/api/status` or connect to `/api/stream` (Server‑Sent Events) for live progress.
   - The stream endpoint returns recent results, counts, and domain‑idea status.

4. **Follow‑up & Resumption**
   - When a job is `needs_followup`, the frontend can fetch a dynamically generated quiz (`/api/followup`).
   - Client submits answers via `/api/resume`, which moves the job back to `running` and schedules a new alarm.

5. **Completion & Cleanup**
   - On `complete`, optional email notifications are sent.
   - The DO remains alive (can be queried for results) but no further alarms are scheduled.
   - No automatic deletion; results are kept indefinitely (SQLite persistence).

## Key Code Components

### Durable Object Class Skeleton

```typescript
export class SearchJobDO implements DurableObject {
	private state: DurableObjectState;
	private sql: SqlStorage;
	private env: Env;

	constructor(state: DurableObjectState, env: Env) {
		this.state = state;
		this.sql = state.storage.sql;
		this.env = env;
	}

	async fetch(request: Request): Promise<Response> {
		// Route to handlers: /start, /status, /results, /cancel, /stream, /followup, /resume
	}

	async alarm(): Promise<void> {
		// Main batch processing logic
	}

	private async processBatch(job: SearchJob): Promise<BatchResult> {
		// 1. Generate candidates (Driver agent)
		// 2. Evaluate candidates (Swarm agent)
		// 3. Check availability (RDAP)
		// 4. Get pricing
		// 5. Store results
		// 6. Return batch summary
	}

	private async ensureSchema(): Promise<void> {
		// Create SQLite tables if not exists
	}

	// Helper methods for SQL operations, token tracking, etc.
}
```

### SQLite Schema Example

```sql
CREATE TABLE search_job (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  batch_num INTEGER DEFAULT 0,
  quiz_responses TEXT NOT NULL,
  followup_responses TEXT,
  driver_provider TEXT,
  swarm_provider TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  error TEXT,
  total_input_tokens INTEGER DEFAULT 0,
  total_output_tokens INTEGER DEFAULT 0
);

CREATE TABLE domain_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  batch_num INTEGER NOT NULL,
  domain TEXT NOT NULL UNIQUE,
  tld TEXT NOT NULL,
  status TEXT NOT NULL,
  price_cents INTEGER,
  score REAL DEFAULT 0,
  flags TEXT DEFAULT '[]',
  evaluation_data TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE search_artifacts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  batch_num INTEGER NOT NULL,
  artifact_type TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);
```

### Alarm Scheduling

```typescript
private async scheduleAlarm(delayMs: number): Promise<void> {
  const time = Date.now() + delayMs;
  await this.state.storage.setAlarm(time);
}
```

### Provider Abstraction

```typescript
interface AIProvider {
	supportsTools: boolean;
	generate(options: GenerateOptions): Promise<ProviderResponse>;
	generateWithTools(options: GenerateWithToolsOptions): Promise<ProviderResponse>;
}

function getProvider(name: ProviderName, env: Env): AIProvider {
	switch (name) {
		case "claude":
			return new AnthropicProvider(env);
		case "deepseek":
			return new DeepSeekProvider(env);
		// ...
	}
}
```

## Configuration & Deployment

### Wrangler Configuration (`wrangler.toml`)

```toml
name = "your-worker"
main = "src/index.ts"
compatibility_date = "2024-11-01"

[[durable_objects.bindings]]
name = "SEARCH_JOB"
class_name = "SearchJobDO"

[[migrations]]
tag = "v1"
new_sqlite_classes = ["SearchJobDO"]

[[d1_databases]]
binding = "DB"
database_name = "job-index"
database_id = "..."

[vars]
ENVIRONMENT = "production"
MAX_BATCHES = "6"
TARGET_RESULTS = "25"
DRIVER_PROVIDER = "deepseek"
SWARM_PROVIDER = "deepseek"
```

### Environment Variables (Secrets)

- API keys for AI providers (set via `wrangler secret put`)
- Email API key (optional)
- Any other service credentials

## Adapting to a Different Use Case

Suppose you are building a **shopping assistant** that searches for products, compares prices, and recommends options. The same architecture can be applied:

1. **Job Parameters**: User preferences (budget, categories, brands, etc.)
2. **Batch Steps**:
   - **Driver agent**: Generate search queries or product ideas based on preferences.
   - **Swarm agent**: Evaluate product candidates for relevance, quality, value.
   - **External API**: Check availability, prices, reviews (instead of RDAP).
   - **Pricing**: Aggregate from multiple sources.
3. **Termination Condition**: Find N suitable products, or after M batches.
4. **Follow‑up**: If results are unsatisfactory, ask clarifying questions (size, color, etc.) and resume.

### Required Changes

- Replace domain‑specific logic (RDAP, TLD pricing) with product‑specific APIs.
- Adjust prompts for driver/swarm agents to focus on product attributes.
- Modify SQLite schema to store product results (title, price, link, rating, etc.).
- Update the `processBatch` method accordingly.

## Benefits of This Pattern

- **Cost‑effective**: Uses Cloudflare's free tier (Durable Objects with SQLite, D1, Alarm API).
- **Resilient**: State persists across interruptions; alarms retry on failure.
- **Scalable**: Each job is isolated in its own DO; no shared state conflicts.
- **Real‑time**: SSE streaming provides immediate feedback.
- **Flexible**: Easy to swap AI providers, add new steps, or change termination logic.

## Pitfalls & Considerations

- **Alarm Precision**: Alarms have at least 30‑second granularity; fine‑grained delays may not be exact.
- **SQLite Limits**: Each DO's SQLite is limited to ~2 GB; design schema accordingly.
- **Concurrent Alarms**: Only one alarm can be scheduled at a time; ensure you don't schedule a new one before the previous finishes.
- **Error Handling**: Uncaught exceptions in `alarm` will stop the loop; implement robust try‑catch and status updates.
- **Cost Tracking**: Token usage should be accumulated and exposed for cost estimation.

## Example Deployment Commands

```bash
# Create D1 database for job index
wrangler d1 create job-index

# Deploy worker
wrangler deploy

# Set secrets
wrangler secret put ANTHROPIC_API_KEY
wrangler secret put DEEPSEEK_API_KEY
```

## Conclusion

This Durable Object‑based orchestration pattern is a powerful, production‑ready foundation for any multi‑step AI agent workflow that requires stateful, long‑running execution. By separating concerns (DO for state, Alarm for scheduling, D1 for indexing) and using SQLite for persistence, you get a robust system that is both simple to understand and easy to extend.

For a complete reference, examine the Forage source code (especially `worker/src/durable-object.ts` and `worker/src/index.ts`). Adapt the patterns to your specific domain, and you'll have a scalable background job system running on Cloudflare's global network.
