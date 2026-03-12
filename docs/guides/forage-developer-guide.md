---
title: "Forage Developer Guide"
description: "How Forage orchestrates AI agents and RDAP lookups to find available domain names for Wanderers."
category: guides
guideCategory: infrastructure
lastUpdated: "2026-03-12"
aliases: []
tags:
  - forage
  - domain-search
  - availability
  - rdap
  - durable-objects
  - ai-agents
---

# Forage Developer Guide

Forage is Grove's domain discovery service. A Wanderer describes what they need, and Forage runs an AI-powered search pipeline in the background: generating candidate domain names, evaluating them for quality, checking availability through RDAP, looking up pricing, and delivering a curated shortlist. The whole process runs on a Cloudflare Worker backed by a Durable Object, and it costs nothing beyond AI API calls.

The name fits. Before you can plant, you have to search.

## How It Works

Forage has two entry paths and one core loop.

### Entry Paths

**Structured search** (`POST /api/search`): The Wanderer fills out a quiz with business name, vibe, TLD preferences, and optional keywords. This goes straight into the pipeline.

**Vibe search** (`POST /api/vibe`): The Wanderer writes a freeform description (minimum 5 words). Forage sends this to an AI provider to extract structured parameters (business name, vibe, keywords, TLD preferences), then feeds those into the same pipeline. If the AI can't extract a business name, it defaults to "My Project".

Both paths create a `SearchJobDO` Durable Object instance keyed by a random UUID. The DO stores all state in its local SQLite database.

### The Batch Loop

Once a job starts, the DO schedules an immediate alarm. Each alarm runs one batch:

1. **Driver agent** generates ~50 domain candidates using the configured AI provider. The prompt includes the Wanderer's quiz answers, batch-specific guidelines (batch 1 starts obvious, batch 6 tries creative long shots), and a summary of what previous batches already tried.

2. **Swarm agent** evaluates candidates in parallel. Domains get scored 0-1 on pronounceability, memorability, brand fit, and email-friendliness. Anything scoring below 0.8 or flagged as not worth checking gets filtered out.

3. **RDAP checker** queries domain availability for the surviving candidates. Traditional RDAP hits the IANA bootstrap to find the right server per TLD, then checks each domain. A 404 means available; a 200 with registration data means taken. There is also an experimental Cerebras path that asks an AI model to guess availability (toggled by `USE_CEREBRAS_RDAP`), though this trades accuracy for speed.

4. **Pricing lookup** fetches registration costs from `cfdomainpricing.com` for available domains. Prices are cached in memory for 24 hours. Domains are bucketed into tiers: bundled ($30/yr or less), recommended ($30-50/yr), and premium (over $50/yr).

5. **Persistence**: all results go into the DO's SQLite `domain_results` table. A batch report artifact is saved too.

After each batch, the DO checks progress:
- If good results (available + score >= 0.8) hit the target (default 25), the job completes. Results email goes out via Zephyr, and DO storage gets cleaned up.
- If the batch limit (default 6) is hit without enough results, the job moves to `needs_followup`. A follow-up quiz is generated and emailed.
- Otherwise, another alarm fires in 10 seconds.

### Authentication

All API requests require a valid Better Auth session. The worker forwards the request's cookies to `auth-api.grove.place/api/auth/session` and validates the response. The Wanderer's email becomes the `client_id`.

### The Job Index

Durable Objects are hard to list. Each DO lives at its own address, and there is no built-in "give me all DOs" query. Forage solves this with a D1 `job_index` table that mirrors key metadata (status, batch count, domains checked, token usage). The index gets updated on status checks and can be bulk-refreshed by querying DOs in parallel via `/api/jobs/refresh`.

## AI Providers

Forage supports two providers, both using the OpenAI-compatible chat completions API:

| Provider | Default Model | Role | Notes |
|----------|---------------|------|-------|
| `openrouter` | `deepseek/deepseek-v3.2` | Primary | ZDR (zero data retention) compliant |
| `deepseek` | `deepseek-chat` | Fallback | Direct API, same pricing |

Both cost $0.28/M input tokens and $0.42/M output tokens. OpenRouter is primary because it provides zero data retention guarantees.

The provider for the driver and swarm can be set independently via `DRIVER_PROVIDER` and `SWARM_PROVIDER` env vars, or overridden per-job in the start request.

### Tool Calling

Both agents define tool schemas (`generate_domain_candidates` for the driver, `evaluate_domains` for the swarm). If the provider supports tools, Forage sends them via `generateWithTools()` and parses the structured tool call response. If tool calling fails or the provider doesn't support it, Forage falls back to JSON-in-prompt: the same system/user prompts, but the model returns raw JSON that gets regex-extracted and parsed.

The `tools.ts` file includes converters for three tool formats: Anthropic (`toAnthropicTool`), OpenAI/DeepSeek (`toOpenAITool`), and Cloudflare Workers AI (`toCloudflareTools`). Only the OpenAI format is actively used by the current providers.

### Quick Evaluation Fallback

If AI evaluation fails entirely, the swarm falls back to `quickEvaluate()`, a heuristic scorer. It checks domain length, TLD desirability, consonant clusters, and whether the name contains numbers or hyphens. This keeps the pipeline moving even when the AI layer is down.

## RDAP: How Availability Checking Works

RDAP (Registration Data Access Protocol) is the IETF standard replacement for WHOIS. No API keys needed.

The flow:

1. Forage fetches the IANA bootstrap file (`data.iana.org/rdap/dns.json`) once and caches it in memory. This maps TLDs to their RDAP server URLs.
2. For each domain, it resolves the TLD to the right RDAP server.
3. It sends `GET {server}/domain/{domain}` with an `application/rdap+json` accept header.
4. HTTP 404 = available. HTTP 200 = registered (Forage extracts registrar name, creation date, and expiration from the vCard and events in the response). HTTP 429 = rate limited, try later.

Parallel checking uses `checkDomainsParallel()` with configurable concurrency (default 5) and a delay between batches (default 500ms). The 10-second timeout per request keeps things from hanging.

### Cerebras RDAP (Experimental)

When `USE_CEREBRAS_RDAP` is `"true"`, Forage uses a Cerebras model through OpenRouter to guess domain availability instead of making real RDAP queries. This batches 10 domains at a time and asks the model to classify each as available, registered, or unknown. The accuracy is lower than real RDAP, but it avoids rate limiting concerns entirely. Default model: `cerebras/btlm-3b-8k-base`.

## Pricing

Domain pricing comes from `cfdomainpricing.com`, a third-party endpoint that tracks Cloudflare Registrar prices. Cloudflare uses fixed TLD-based pricing with no premium domain markups, so knowing the TLD is enough.

The pricing module caches the full TLD price map in memory with a 24-hour TTL. If a refresh fails and stale data exists, it keeps using the stale cache rather than failing.

Price categories:

| Category | Range | Meaning |
|----------|-------|---------|
| `bundled` | <= $30/yr | Included in Grove packages at no extra cost |
| `recommended` | $30-50/yr | Worth considering, moderate cost |
| `premium` | > $50/yr | Expensive, flagged for Wanderer awareness |

## Email

Forage sends two types of email through Zephyr (Grove's email worker) using a Worker-to-Worker service binding:

**Results email**: Sent when a search completes. Groups domains by pricing tier in a monospace, terminal-aesthetic layout using a dark theme (Tokyo Night colors). Links to a results page and booking page.

**Follow-up email**: Sent when the search exhausts its batches without finding enough good results. Includes a link to a follow-up quiz.

Both templates are rendered as inline HTML. The `from` address is `domains@grove.place`. Emails require both the `ZEPHYR` service binding and `ZEPHYR_API_KEY` secret to be configured. If either is missing, the email step silently skips.

## Adding a New Provider

1. Create `src/providers/yourprovider.ts` implementing the `AIProvider` interface. You need `generate()` and `generateWithTools()` methods. Follow the pattern in `deepseek.ts` or `openrouter.ts`.

2. Add your provider name to the `ProviderName` union type in `src/providers/types.ts`.

3. Add a case to the `getProvider()` factory in `src/providers/index.ts`.

4. Add default model and cost info to `PROVIDER_DEFAULTS` and `PROVIDER_COSTS`.

5. If your provider uses a different tool format, add a converter in `src/providers/tools.ts`.

6. Set the API key as a Wrangler secret: `wrangler secret put YOUR_PROVIDER_API_KEY`.

The `AIProvider` interface has three key properties:
- `name`: string identifier
- `defaultModel`: used when no model override is provided
- `supportsTools`: boolean, controls whether `generateWithTools()` gets called or falls back to JSON prompt

## Modifying the Batch Pipeline

The batch logic lives in `SearchJobDO.processBatch()` in `src/durable-object.ts`. The five steps (generate, evaluate, check, price, persist) run sequentially within a single alarm invocation. Each alarm has a 30-second CPU limit, but fetch calls (RDAP queries, AI calls) count as I/O time, not CPU time, so the effective runtime is much longer.

To change batch behavior:
- **Candidate count**: modify the `count` parameter passed to `generateCandidates()` (default 50)
- **Evaluation threshold**: change the `minScore` parameter in `filterWorthChecking()` (default 0.8)
- **Good result threshold**: the count query uses `score >= 0.8` in `getGoodResultsCount()`
- **RDAP concurrency**: the third argument to `checkDomainsParallel()` (default 5 concurrent, 500ms delay)
- **Batch count/target**: controlled by `MAX_BATCHES` and `TARGET_RESULTS` env vars

### Prompt Engineering

All prompts live in `src/prompts.ts`. The driver prompt is templated with batch-specific guidelines (stored in `BATCH_GUIDELINES`). Each batch number 1-6 gets different instructions pushing the model from obvious names toward increasingly creative suggestions.

The `diverseTlds` flag (set automatically for vibe searches) adds instructions telling the model to spread suggestions across at least 3-4 different TLDs and avoid putting more than 30% in any single TLD.

## Why It Breaks

**"FORAGE-001: Provider API key not configured"**: The provider constructor throws immediately if the API key env var is missing. Check that `OPENROUTER_API_KEY` (or `DEEPSEEK_API_KEY`) is set via `wrangler secret put`.

**Jobs stuck in "running" forever**: The alarm chain breaks if an unhandled exception occurs outside the try/catch in `onAlarm()`. Check the DO logs in the Cloudflare dashboard (observability is enabled in wrangler.toml). A stuck job can be force-cancelled via `POST /api/cancel?job_id=xxx`.

**RDAP rate limiting**: Some TLD servers are aggressive about 429 responses. If a batch returns many "unknown" results with rate limit errors, the domains just get skipped. There is no automatic backoff per RDAP server. Consider increasing the delay between batches or reducing concurrency.

**Empty candidate lists**: If the AI returns content that doesn't parse as JSON and doesn't contain domain-like strings, the driver returns zero candidates. The batch still counts, burning one of the 6 allowed iterations. Check the batch report artifact in the DO's `search_artifacts` table.

**"Job not found" after completion**: When a job completes, fails, or is cancelled, the DO calls `state.storage.deleteAll()` to clean up. After that, the DO's SQLite tables are gone. Status queries will return 404. The D1 job index retains the last known metadata.

**Pricing returns null**: If `cfdomainpricing.com` is down and no cached data exists, pricing lookups return null. Domains still get recorded as available, they just lack price information. The search continues.

**Auth failures on every request**: Forage validates sessions by calling `auth-api.grove.place`. If that service is down, all API requests return 401. The health endpoint (`/` or `/health`) does not require auth and can be used to verify the worker itself is running.

## Architecture Notes

**Two storage layers, different purposes**: The DO's SQLite stores detailed per-domain results during a search. D1 stores the job index for discoverability across all jobs. The DO is the source of truth while a job is active. After completion, DO storage is deleted and only the D1 index remains.

**Why Durable Objects instead of Queues**: DOs with alarm chaining provide the same async processing pattern as a queue, but DOs with SQLite storage are free on Cloudflare. Each alarm resets the 30-second CPU timer. The DO is the queue.

**CORS configuration**: The worker allows credentials (`Access-Control-Allow-Credentials: true`) with a dynamic origin (reads the request's `origin` header, falls back to `https://forage.grove.place`). This is needed because auth uses session cookies.

**Token tracking**: Every AI call's input/output token counts are accumulated in the DO's `search_job` table and synced to the D1 index on status checks. This makes cost monitoring possible without querying each DO.

**Service bindings**: Forage connects to two other workers via service bindings. `AUTH` points to `groveauth` (Better Auth validation). `ZEPHYR` points to `grove-zephyr` (email delivery). These are Worker-to-Worker calls with no public internet round-trip.

## Error System

Forage uses structured error codes following the `FORAGE-NNN` format with the same `GroveErrorDef` shape as the engine.

| Range | Category |
|-------|----------|
| 001-019 | Infrastructure and configuration |
| 020-039 | Auth and routing |
| 040-059 | Validation and business logic |
| 060-079 | Rate limiting and security |
| 080-099 | Internal and catch-all |

Every error has a `userMessage` (safe to show Wanderers) and an `adminMessage` (for logs). The `buildForageErrorResponse()` helper returns `{ errorCode, errorMessage }` using the user-facing message.

## Key Files

| File | Purpose |
|------|---------|
| `src/index.ts` | Worker entry point, API routing, CORS |
| `src/durable-object.ts` | `SearchJobDO` with alarm-based batch loop, all route handlers |
| `src/agents/driver.ts` | Candidate generation via AI, domain validation |
| `src/agents/swarm.ts` | Parallel evaluation, quick-eval fallback |
| `src/rdap.ts` | IANA bootstrap, RDAP availability checking |
| `src/cerebras-rdap.ts` | Experimental AI-based availability checker |
| `src/pricing.ts` | Cloudflare Registrar price lookup and caching |
| `src/prompts.ts` | All prompt templates for driver, swarm, and vibe parsing |
| `src/providers/types.ts` | `AIProvider` interface and shared types |
| `src/providers/deepseek.ts` | DeepSeek direct API provider |
| `src/providers/openrouter.ts` | OpenRouter proxy provider (primary) |
| `src/providers/tools.ts` | Tool definitions and format converters |
| `src/auth.ts` | Better Auth session validation |
| `src/email.ts` | Terminal-aesthetic email templates, Zephyr integration |
| `src/job-index.ts` | D1 job index CRUD operations |
| `src/errors.ts` | Error catalog (FORAGE-001 through FORAGE-099) |
| `src/types.ts` | All TypeScript type definitions |
| `wrangler.toml` | Worker config, bindings, env vars |
| `migrations/` | D1 schema migrations for job index |

## API Reference

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/health` | GET | No | Health check |
| `/api/search` | POST | Yes | Start structured search |
| `/api/vibe` | POST | Yes | Start vibe-based search |
| `/api/status?job_id=` | GET | Yes | Get job status |
| `/api/results?job_id=` | GET | Yes | Get available domains |
| `/api/followup?job_id=` | GET | Yes | Get follow-up quiz |
| `/api/resume?job_id=` | POST | Yes | Resume with follow-up answers |
| `/api/cancel?job_id=` | POST | Yes | Cancel a running job |
| `/api/stream?job_id=` | GET | Yes | SSE progress updates |
| `/api/jobs/list` | GET | Yes | Paginated job listing |
| `/api/jobs/recent` | GET | Yes | Recent jobs shortcut |
| `/api/jobs/refresh` | GET | Yes | Sync DO status to D1 index |
| `/api/jobs` | POST | Yes | Query multiple jobs by ID |
| `/api/backfill` | POST | Yes | Backfill D1 index from DOs |

## Checklist

When working on Forage, run through these:

- [ ] `wrangler dev` starts without binding errors
- [ ] Health endpoint returns `{"status":"ok"}`
- [ ] API key secrets are set for the configured provider
- [ ] D1 migrations are applied (`wrangler d1 migrations apply forage-jobs`)
- [ ] Changes to prompts are tested with at least one real search
- [ ] New error codes follow the FORAGE-NNN format and range conventions
- [ ] Token usage is tracked (call `addTokenUsage()` after every AI call)
- [ ] DO storage cleanup happens on all terminal states (complete, failed, cancelled)
- [ ] Email sending degrades gracefully when Zephyr is unavailable
