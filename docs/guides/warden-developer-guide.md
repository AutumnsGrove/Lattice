---
title: "Warden Developer Guide"
description: "How the credential gateway works, how to integrate with it, and how to add new services."
category: guides
guideCategory: infrastructure
lastUpdated: "2026-03-12"
aliases: []
tags:
  - warden
  - security
  - credentials
  - api-gateway
  - cloudflare-workers
---

# Warden Developer Guide

Warden is Grove's external API gateway. Every outbound request to a third-party service passes through it: GitHub, Stripe, Tavily, Cloudflare, and the rest. Agents describe what they need (a service, an action, parameters). Warden authenticates the caller, checks permissions, resolves the right credential, executes the upstream request, scrubs the response, and logs the whole thing. Raw API keys never leave the vault.

This guide covers the architecture, authentication paths, credential resolution, the scope system, rate limiting, audit logging, and how to add a new service integration.

## How Warden Works

The request lifecycle follows a fixed pipeline:

1. **Authenticate** the caller (API key or challenge-response)
2. **Validate** the service, action, and scope permissions
3. **Rate-check** against per-agent and per-service limits
4. **Validate parameters** via the action's Zod schema
5. **Resolve credentials** (per-tenant first, then global fallback)
6. **Execute** the upstream HTTP request with injected credentials
7. **Scrub** the response to strip any leaked secrets
8. **Log** the audit event and update agent usage stats

Warden is a Hono app deployed as a Cloudflare Worker. It uses `groveInfraMiddleware` from `@autumnsgrove/infra/cloudflare` for its primary D1 database binding, and accesses a secondary `TENANT_DB` plus two KV namespaces (`NONCES`, `RATE_LIMITS`) as raw bindings.

### Routes

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `GET` | `/health` | None | Health check, lists registered services |
| `POST` | `/nonce` | None | Request a single-use nonce for challenge-response auth |
| `POST` | `/request` | Dual | Proxied API request (the main endpoint) |
| `POST` | `/resolve` | API key only | Return a raw credential to an internal worker |
| `POST` | `/admin/agents` | Admin | Register a new agent |
| `GET` | `/admin/agents` | Admin | List all agents |
| `DELETE` | `/admin/agents/:id` | Admin | Revoke (disable) an agent |
| `GET` | `/admin/logs` | Admin | Query audit log |

## Authentication Paths

Warden supports two authentication methods. The `dualAuth` middleware in `auth/dual-auth.ts` checks for both and attaches the authenticated agent to the Hono context.

### Path 1: API Key (Service Binding)

Internal workers that call Warden over a Cloudflare service binding send an `X-API-Key` header. Warden SHA-256 hashes the key and looks it up in the `warden_agents` table.

```
POST /request
X-API-Key: wdn_sk_abc123...
Content-Type: application/json

{
  "service": "github",
  "action": "list_repos",
  "params": { "owner": "autumnsgrove" }
}
```

This is the simpler path. The caller must be a registered, enabled agent with a valid secret. The auth method is recorded as `"service_binding"` in audit logs.

### Path 2: Challenge-Response (HMAC Signature)

External agents that can't use service bindings authenticate with a nonce-based HMAC flow:

1. Agent calls `POST /nonce` with `{ "agentId": "wdn_..." }` to get a single-use nonce (30-second TTL, stored in KV).
2. Agent computes `HMAC-SHA256(secret, nonce)` and sends the hex signature in the request body.
3. Warden validates the nonce (consuming it on read), verifies the HMAC signature, and authenticates.

```json
{
  "service": "tavily",
  "action": "search",
  "params": { "query": "solarpunk architecture" },
  "agent": {
    "id": "wdn_a1b2c3d4e5f6...",
    "nonce": "550e8400-e29b-41d4-a716-446655440000",
    "signature": "f4c3b2a1..."
  }
}
```

Nonces are single-use and expire after 30 seconds. Reuse attempts are logged as `nonce_reuse` audit events. Signature verification uses Web Crypto's HMAC-SHA256 with timing-safe comparison from `@autumnsgrove/lattice/utils`.

### The `/resolve` Restriction

The `/resolve` endpoint only accepts API key auth. Challenge-response callers are explicitly rejected with `AUTH_METHOD_DENIED`. This is intentional: `/resolve` returns raw credentials, so only trusted internal workers should be able to call it. External agents should use `/request`, which executes on their behalf without exposing the credential.

## Credential Resolution

When Warden needs a credential for a service, `lib/credentials.ts` resolves it through a two-tier system.

### Resolution Order

1. **Per-tenant credential** (if `tenant_id` is provided): Looks up the key in SecretsManager using `TENANT_DB` and `GROVE_KEK` for envelope decryption. Each service has an alias chain (canonical name first, then legacy names) so keys saved under different naming conventions are found without migration.

2. **Global credential** (fallback): Falls through to the environment variable for that service (e.g., `GITHUB_TOKEN`, `STRIPE_SECRET_KEY`).

If neither exists, Warden returns a `NO_CREDENTIAL` error with HTTP 503.

### Alias Chains

Some services have multiple key names because different parts of the system saved credentials under different names historically. For example, OpenRouter checks `openrouter_api_key` first, then `timeline_openrouter_key`. The alias chain in `TENANT_CREDENTIAL_ALIASES` handles this transparently.

### Global Credential Map

Every `WardenService` maps to exactly one environment variable:

| Service | Env Variable |
|---------|-------------|
| `github` | `GITHUB_TOKEN` |
| `tavily` | `TAVILY_API_KEY` |
| `cloudflare` | `CLOUDFLARE_API_TOKEN` |
| `exa` | `EXA_API_KEY` |
| `resend` | `RESEND_API_KEY` |
| `stripe` | `STRIPE_SECRET_KEY` |
| `openrouter` | `OPENROUTER_API_KEY` |
| `hetzner` | `HETZNER_API_TOKEN` |
| `fly` | `FLY_API_TOKEN` |

## Permission Scopes

Agents are granted scopes when registered. Scopes follow the format `service:permission`, where `permission` is a category of actions. The scope system lives in `auth/scopes.ts`.

### Scope Format

- `github:read` grants access to GitHub read actions (list_repos, get_repo, get_issue, list_issues)
- `github:write` grants access to write actions (create_issue, create_comment)
- `github:actions` grants access to CI actions (list_workflow_runs, trigger_workflow)
- `github:*` grants access to all GitHub actions
- `*:*` grants access to everything (admin-level)

### Action-to-Permission Mapping

Each action maps to a permission category. Here are the current mappings:

**GitHub**: `read` (list_repos, get_repo, get_issue, list_issues), `write` (create_issue, create_comment), `actions` (list_workflow_runs, trigger_workflow), `admin`

**Tavily**: `read` (search, crawl, extract)

**Cloudflare**: `read` (list_workers, get_worker, list_kv_namespaces, list_d1_databases), `dns` (list_dns_records, create_dns_record), `write` (purge_cache)

**Exa**: `search`, `similar` (find_similar), `contents` (get_contents)

**Resend**: `send` (send_email)

**Stripe**: `read` (all actions, read-only)

**OpenRouter**: `inference` (chat_completion), `read` (list_models, get_generation)

**Hetzner/Fly**: `api` (passthrough)

### How Validation Works

When a request arrives, Warden parses the agent's stored scopes (JSON array), then checks if any scope grants the required permission:

```
agent scopes: ["github:read", "tavily:*"]
request: service=github, action=list_repos
required permission: github:read
result: allowed (exact match on "github:read")
```

The `/resolve` endpoint uses a lighter check: the caller just needs any scope on the requested service (any permission level counts).

## Adding a New Service

To add a new external service integration, you need to touch four files.

### Step 1: Define the Service

Create a new file in `services/`. Each service file is self-contained: it defines actions with Zod schemas and `buildRequest` functions, then self-registers by calling `registerService()`.

```typescript
// services/acme.ts
import { z } from "zod";
import { registerService } from "./registry";
import type { ServiceAction } from "./registry";

const BASE_URL = "https://api.acme.com/v1";

const actions: Record<string, ServiceAction> = {
  list_widgets: {
    schema: z.object({
      limit: z.number().int().min(1).max(100).default(20),
    }),
    buildRequest: (params, token) => ({
      url: `${BASE_URL}/widgets?limit=${params.limit}`,
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }),
  },
};

registerService({
  name: "acme",
  baseUrl: BASE_URL,
  auth: { type: "bearer" },
  actions,
});
```

The `ServiceAction` interface requires:
- `schema`: A Zod schema that validates incoming params. Warden calls `safeParse` before building the request.
- `buildRequest`: Takes validated params and the resolved credential string, returns the full HTTP request (url, method, headers, optional body). The credential is already decrypted; you just put it where the upstream API expects it.

The `auth` field on `ServiceDefinition` describes the injection pattern (`bearer`, `header`, `query`, `body`). This is metadata for documentation/tooling. The actual injection happens inside your `buildRequest` function.

### Step 2: Register the Import

Add the import to `services/index.ts`:

```typescript
import "./acme";
```

Services self-register as a side effect of being imported, so this single line is all it takes.

### Step 3: Add Types and Credentials

In `types.ts`, add the service name to the `WardenService` union:

```typescript
export type WardenService =
  | "github"
  | "tavily"
  // ...existing services...
  | "acme";
```

In `lib/credentials.ts`, add the global credential mapping and tenant aliases:

```typescript
const GLOBAL_CREDENTIAL_MAP: Record<WardenService, keyof Env> = {
  // ...existing entries...
  acme: "ACME_API_KEY",
};

const TENANT_CREDENTIAL_ALIASES: Record<WardenService, string[]> = {
  // ...existing entries...
  acme: ["acme_api_key"],
};
```

And add the environment binding in the `Env` interface:

```typescript
ACME_API_KEY: string;
```

### Step 4: Add Scopes

In `auth/scopes.ts`, add the action-to-permission mapping:

```typescript
const SERVICE_SCOPES: Record<string, Record<string, string>> = {
  // ...existing entries...
  acme: {
    list_widgets: "read",
  },
};
```

### Step 5: Add the Zod Enum

If the service is used by `/resolve`, add it to the `resolveBodySchema` enum in `routes/resolve.ts`. This is a Zod enum of valid service names, separate from the TypeScript union.

### Optionally: Add Service Rate Limits

In `middleware/rate-limit.ts`, add a global rate limit for the upstream API:

```typescript
const SERVICE_LIMITS: Record<string, { rpm: number; daily: number | null }> = {
  // ...existing entries...
  acme: { rpm: 200, daily: null },
};
```

Services without an entry in `SERVICE_LIMITS` are uncapped at the service level (per-agent limits still apply).

## Rate Limiting

Rate limiting operates at two levels, both using KV counters.

### Per-Agent Limits

Each agent has `rate_limit_rpm` (requests per minute) and `rate_limit_daily` (requests per day) fields set during registration. Defaults are 60 RPM and 1,000 daily. KV keys follow the pattern:

- Minute: `rl:{agentId}:{service}:min:{minuteEpoch}`
- Daily: `rl:{agentId}:daily:{dayEpoch}`

Counters auto-expire via KV TTLs (120s for minute, 172800s for daily).

### Per-Service Limits

Global caps prevent all agents collectively from exceeding upstream API limits. These are hardcoded in `SERVICE_LIMITS`:

| Service | RPM | Daily |
|---------|-----|-------|
| GitHub | 5,000 | unlimited |
| Cloudflare | 1,200 | unlimited |
| Tavily | 100 | 1,000 |
| Exa | 60 | 500 |
| Resend | 100 | unlimited |
| Stripe | 100 | unlimited |

KV keys: `rl:svc:{service}:min:{minuteEpoch}` and `rl:svc:{service}:daily:{dayEpoch}`

Both checks run before credential resolution and upstream execution. When a limit is hit, Warden returns HTTP 429 with remaining count and reset timestamp.

## Response Scrubbing

After executing an upstream request, Warden scrubs the response before returning it to the caller. The scrubber in `middleware/scrub.ts` does three things:

1. **Redacts sensitive keys**: Fields named `authorization`, `x-api-key`, `api_key`, `secret`, `token`, `password`, `access_token`, or `refresh_token` are replaced with `[REDACTED]` regardless of their value.

2. **Pattern-matches credential formats**: GitHub tokens (`ghp_`, `gho_`, `github_pat_`), Stripe keys (`sk_live_`, `sk_test_`), Cloudflare tokens (`v1.`), Resend keys (`re_`), Tavily keys (`tvly-`), Exa keys (`exa-`), and generic key patterns are all caught by regex.

3. **Sanitizes URLs**: Query parameters named `token`, `api_key`, `access_token`, `secret`, `key`, or `apikey` are replaced with `[REDACTED]` in any URL found in response strings.

The scrubber recurses through the entire response payload (objects, arrays, strings). It runs on every successful response before the data reaches the caller.

## Audit Logging

Every authenticated request is logged to the `warden_audit_log` table in D1. Columns are aligned with the Vista warden-aggregator dashboard for automatic population.

Each entry records:
- `agent_id` and `agent_name`
- `target_service` and `action`
- `auth_method` (`service_binding` or `challenge_response`)
- `auth_result` (`success` or `failed`)
- `event_type` (`request`, `resolve`, `nonce_reuse`, `rate_limit_hit`, `scope_denial`)
- `tenant_id` (if provided)
- `latency_ms` (upstream request duration)
- `error_code` (null on success)

Audit writes are fire-and-forget via `c.executionCtx.waitUntil()`, so they never block the response. The `updateAgentUsage` function bumps the agent's `last_used_at` and `request_count` in parallel with the audit write.

Admin logs are queryable via `GET /admin/logs` with optional `agent_id`, `service`, `limit` (max 500), and `offset` parameters.

## Agent Management

Agents are registered through the admin API, protected by `WARDEN_ADMIN_KEY` or the `CF-Worker` header (for service binding callers).

### Registering an Agent

```
POST /admin/agents
X-API-Key: {WARDEN_ADMIN_KEY}

{
  "name": "meadow-poller",
  "owner": "grove-infra",
  "scopes": ["github:read", "github:actions"],
  "rate_limit_rpm": 120,
  "rate_limit_daily": 5000
}
```

The response includes the agent ID (`wdn_...`) and a plaintext secret (`wdn_sk_...`). The secret is shown exactly once and stored only as a SHA-256 hash.

### Revoking an Agent

`DELETE /admin/agents/:id` sets `enabled = 0`. The agent record stays in D1 for audit trail purposes, but all auth attempts will fail immediately.

## Key Files

| File | Purpose |
|------|---------|
| `index.ts` | Hono app setup, route mounting, middleware |
| `types.ts` | Env bindings, service type union, request/response types |
| `auth/dual-auth.ts` | Dual-path authentication middleware |
| `auth/api-key.ts` | SHA-256 API key hashing and lookup |
| `auth/nonce.ts` | Nonce generation and single-use validation |
| `auth/signature.ts` | HMAC-SHA256 signature generation and verification |
| `auth/scopes.ts` | Action-to-permission mapping and scope validation |
| `lib/credentials.ts` | Two-tier credential resolution (tenant, global) |
| `lib/execute.ts` | Upstream HTTP execution with latency tracking |
| `lib/logging.ts` | D1 audit log writes and agent usage updates |
| `middleware/rate-limit.ts` | Per-agent and per-service rate limiting via KV |
| `middleware/scrub.ts` | Response scrubbing for leaked credentials |
| `routes/request.ts` | Main proxy endpoint (POST /request) |
| `routes/resolve.ts` | Credential resolution endpoint (POST /resolve) |
| `routes/nonce.ts` | Nonce issuance for challenge-response auth |
| `routes/admin.ts` | Agent CRUD and audit log queries |
| `services/registry.ts` | Service registry (Map-based, with register/get/list) |
| `services/index.ts` | Side-effect imports that register all services |
| `services/{name}.ts` | Individual service definitions (actions + schemas) |

## Quick Checklist

When adding a new service:

- [ ] Create `services/{name}.ts` with Zod schemas and `buildRequest` for each action
- [ ] Add the side-effect import to `services/index.ts`
- [ ] Add the service name to `WardenService` in `types.ts`
- [ ] Add the env binding to the `Env` interface in `types.ts`
- [ ] Add the global credential mapping in `lib/credentials.ts`
- [ ] Add tenant credential aliases in `lib/credentials.ts`
- [ ] Add action-to-permission mappings in `auth/scopes.ts`
- [ ] Add the service to the Zod enum in `routes/resolve.ts` (if applicable)
- [ ] Add service rate limits in `middleware/rate-limit.ts` (if the upstream API has them)
- [ ] Deploy the secret via `gw secret apply --worker grove-warden`

When registering a new agent:

- [ ] Choose scopes following least-privilege (prefer `service:read` over `service:*`)
- [ ] Set rate limits appropriate to the agent's workload
- [ ] Store the returned secret in the calling worker's secrets, never in source
- [ ] Test with a `/request` call before wiring into production flows
