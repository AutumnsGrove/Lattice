---
title: Warden — External API Gateway
description: Secure credential injection for agent-initiated external API requests
category: specs
specCategory: operations
icon: vault
lastUpdated: "2026-02-17"
aliases: []
tags:
  - api-gateway
  - infrastructure
  - cloudflare-workers
  - agent-security
  - sdk
---

# Warden — External API Gateway

```
                    ┌─────────────────────────┐
                    │    ╭───────────────╮    │
                    │    │   🔑  🔑  🔑  │    │
                    │    │   🔑  🔑  🔑  │    │
                    │    ╰───────────────╯    │
                    │           ║             │
                    │           ║             │
                    │     ┌─────╨─────┐       │
                    │     │  WARDEN   │       │
                    │     │    ◈◈◈    │       │
                    │     └─────┬─────┘       │
                    │           │             │
                    └───────────┼─────────────┘
                          ══════╧══════
                               ╱ ╲
                              ╱   ╲
                             ╱     ╲
                          agents enter
                          keys stay home

                    The one who holds the keys.
```

> _The one who holds the keys._

Grove's external API gateway. Every outbound request to third-party services passes through Warden: GitHub operations, search queries, Cloudflare management, external integrations. Agents describe what they need. Warden executes with injected credentials. Keys never leave the vault.

**Public Name:** Warden
**Internal Name:** GroveWarden
**Domain:** `warden.grove.place`
**Worker:** `workers/warden/`
**SDK:** `@autumnsgrove/lattice/warden` (in `libs/engine/src/lib/warden/`)
**Last Updated:** February 2026

A warden guards what matters. In Grove, that's your secrets. Agents operating in environments you don't control (remote servers, third-party platforms, training pipelines) can't be trusted with raw credentials. Warden stands at the gate: agents request actions, Warden validates, injects the key, executes, and returns results. The agent gets what it asked for. The key never travels.

---

## Overview

Warden is Grove's unified external API gateway: a single interface that proxies all third-party API requests, handles credential injection, validates permissions, normalizes responses, and logs usage.

**The problem it solves:**

- Agents need API access but can't be trusted with keys
- Credentials stored in agent memory can be exfiltrated, logged, or trained on
- No unified way to scope, rotate, or audit external API usage
- Each integration requires separate auth handling

**The solution:**

```typescript
// Before: Agent holds the key (dangerous)
const response = await fetch("https://api.github.com/repos", {
	headers: { Authorization: `Bearer ${GITHUB_TOKEN}` }, // 💀 exposed
});

// After: Agent describes intent, Warden executes
const issue = await warden.github.createIssue({
	owner: "autumnsgrove",
	repo: "grove-engine",
	title: "Bug: Login redirect fails",
	body: "Steps to reproduce...",
	labels: ["bug", "auth"],
});

// Or via generic interface for dynamic usage
const result = await warden.request({
	service: "github",
	action: "create_issue",
	params: { owner: "autumnsgrove", repo: "grove-engine", title: "Bug fix" },
});
```

**One sentence:** _"Agents talk to the outside world through Warden."_

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              CONSUMERS                                   │
│                                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐  │
│  │  Lattice     │  │  Queen CI    │  │  MCP Tools   │  │  gw CLI     │  │
│  │  (routes)    │  │  (Firefly)   │  │  (servers)   │  │  (Python)   │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬──────┘  │
│         │                 │                 │                  │         │
│    service binding   service binding      HTTPS             HTTPS       │
│    (X-API-Key)       (X-API-Key)       (challenge)       (challenge)    │
│         │                 │                 │                  │         │
└─────────┼─────────────────┼─────────────────┼──────────────────┼────────┘
          │                 │                 │                  │
          └─────────────────┴────────┬────────┴──────────────────┘
                                     │
┌────────────────────────────────────┴────────────────────────────────────┐
│                      WARDEN (Cloudflare Worker)                         │
│                      workers/warden/                                    │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                        Authentication                             │  │
│  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐       │  │
│  │  │ Dual Auth      │  │ Permission     │  │ Rate Limiter   │       │  │
│  │  │ • API Key      │  │ Scope Check    │  │ per-agent +    │       │  │
│  │  │ • Challenge    │  │                │  │ per-service    │       │  │
│  │  └────────────────┘  └────────────────┘  └────────────────┘       │  │
│  └──────────────────────────────┬────────────────────────────────────┘  │
│                                  │                                      │
│  ┌──────────────────────────────┴────────────────────────────────────┐  │
│  │                       Service Router                              │  │
│  │                                                                   │  │
│  │   service: "github"       → GitHub REST/GraphQL API               │  │
│  │   service: "cloudflare"   → Cloudflare API                        │  │
│  │   service: "tavily"       → Tavily Search API                     │  │
│  │   service: "exa"          → Exa Search API                        │  │
│  │   service: "resend"       → Resend Email API                      │  │
│  │   service: "lemonsqueezy" → Lemon Squeezy API (read-only)         │  │
│  └──────────────────────────────┬────────────────────────────────────┘  │
│                                  │                                      │
│  ┌──────────────────────────────┴────────────────────────────────────┐  │
│  │                    Credential Injection                           │  │
│  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐       │  │
│  │  │ Fetch Key      │  │ Build Auth     │  │ Execute        │       │  │
│  │  │ (env secrets   │  │ Headers        │  │ Request        │       │  │
│  │  │  or tenant     │  │                │  │                │       │  │
│  │  │  SecretsManager│  │                │  │                │       │  │
│  │  │  envelope enc) │  │                │  │                │       │  │
│  │  └────────────────┘  └────────────────┘  └────────────────┘       │  │
│  └──────────────────────────────┬────────────────────────────────────┘  │
│                                  │                                      │
│  ┌──────────────────────────────┴────────────────────────────────────┐  │
│  │                      Post-Processing                              │  │
│  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐       │  │
│  │  │ Normalize      │  │ Scrub          │  │ Log Usage      │       │  │
│  │  │ Response       │  │ Sensitive      │  │ (agent,        │       │  │
│  │  │                │  │ Data           │  │  action, cost)  │       │  │
│  │  └────────────────┘  └────────────────┘  └────────────────┘       │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
┌────────────────────────────────────┴────────────────────────────────────┐
│                          EXTERNAL SERVICES                               │
│                                                                          │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐              │
│  │     GitHub     │  │   Cloudflare   │  │    Tavily      │              │
│  │  repos, issues │  │  workers, kv   │  │  search, crawl │              │
│  │  prs, actions  │  │  d1, r2        │  │  extract       │              │
│  └────────────────┘  └────────────────┘  └────────────────┘              │
│                                                                          │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐              │
│  │      Exa       │  │    Resend      │  │ Lemon Squeezy  │              │
│  │  search, find  │  │  send email    │  │  read billing  │              │
│  │  similar       │  │  (templated)   │  │  (no writes)   │              │
│  └────────────────┘  └────────────────┘  └────────────────┘              │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

### Relationship to Existing Systems

Warden integrates with two existing secrets systems:

**SecretsManager (Envelope Encryption):** Per-tenant API keys stored in D1 with envelope encryption (KEK → DEK → secrets). When a request arrives with a `tenantId`, Warden uses `SecretsManager.getSecret(tenantId, keyName)` to fetch the credential. The key is decrypted only for the microseconds of the proxy call.

**gw Secrets Vault (Local):** Agent credentials (Warden agent ID and secret) are stored in the encrypted local vault at `~/.grove/secrets.enc`. The `gw warden` commands manage agent registration and store credentials agent-safely.

```
┌─────────────────────────────────────────────────────────────┐
│                    SECRETS LANDSCAPE                          │
│                                                              │
│  LOCAL (developer machine)          CLOUD (Cloudflare)       │
│  ┌─────────────────────┐           ┌─────────────────────┐  │
│  │  gw Secrets Vault   │           │  Worker Env Secrets  │  │
│  │  ~/.grove/secrets   │  deploy   │  (wrangler secret)   │  │
│  │  .enc               │ ────────► │                      │  │
│  │                     │           │  GITHUB_TOKEN        │  │
│  │  WARDEN_AGENT_ID    │           │  TAVILY_API_KEY      │  │
│  │  WARDEN_AGENT_SECRET│           │  WARDEN_SIGNING_KEY  │  │
│  │  GITHUB_TOKEN       │           │  GROVE_KEK           │  │
│  │  TAVILY_API_KEY     │           └──────────┬──────────┘  │
│  └─────────────────────┘                      │             │
│                                               │             │
│                              ┌────────────────▼──────────┐  │
│                              │  SecretsManager           │  │
│                              │  (Envelope Encryption)    │  │
│                              │                           │  │
│                              │  KEK (from env)           │  │
│                              │    └── DEK (per-tenant)   │  │
│                              │         └── tenant keys   │  │
│                              │             github_token  │  │
│                              │             tavily_key    │  │
│                              └───────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Dual Authentication

Warden uses two authentication paths, chosen automatically based on how the caller connects.

### Path 1: Service Binding (Internal)

For Worker-to-Worker calls via Cloudflare service bindings. Trusted, fast, no nonce overhead.

```
┌──────────────┐                        ┌──────────────┐
│   Consumer   │                        │   Warden     │
│  (Worker)    │                        │   Worker     │
└──────┬───────┘                        └──────┬───────┘
       │                                       │
       │  env.WARDEN.fetch('/request', {       │
       │    headers: { 'X-API-Key': key },     │
       │    body: { service, action, params }  │
       │  })                                   │
       │ ─────────────────────────────────────►│
       │                                       │
       │     Verify API key                    │
       │     Check scopes                      │
       │     Execute + respond                 │
       │                                       │
       │  Response (credentials stripped)       │
       │ ◄─────────────────────────────────────│
```

**Why this works:** Service bindings use Cloudflare's internal network. The request never traverses the public internet. The API key authenticates the calling Worker, and Cloudflare's infrastructure guarantees the binding can't be spoofed.

**Who uses this:** Lattice routes, Queen Firefly, Bloom agents, any Worker in the Grove ecosystem.

### Path 2: Challenge-Response (External)

For external callers over HTTPS. Nonce-based to prevent replay attacks and credential exfiltration.

```
┌──────────────┐                        ┌──────────────┐
│    Agent     │                        │   Warden     │
│  (external)  │                        │   Worker     │
└──────┬───────┘                        └──────┬───────┘
       │                                       │
       │  1. POST /nonce                       │
       │     { agentId }                       │
       │ ─────────────────────────────────────►│
       │                                       │
       │  2. { nonce } (single-use, 30s TTL)   │
       │ ◄─────────────────────────────────────│
       │                                       │
       │  3. POST /request                     │
       │     {                                 │
       │       agent: {                        │
       │         id, nonce,                    │
       │         signature: HMAC(secret,nonce) │
       │       },                              │
       │       service, action, params         │
       │     }                                 │
       │ ─────────────────────────────────────►│
       │                                       │
       │     4. Verify HMAC signature          │
       │     5. Invalidate nonce               │
       │     6. Check scopes                   │
       │     7. Execute with injected creds    │
       │                                       │
       │  8. Response (credentials stripped)    │
       │ ◄─────────────────────────────────────│
```

**Why this works:**

- The `agent_secret` is stored by the agent but never transmitted
- The HMAC changes every request (nonce is unique)
- Intercepting the signature is useless (nonce is invalidated after use)
- Even if an attacker captures the signature, they can't replay it

**Who uses this:** `gw` CLI, MCP servers running on remote machines, third-party integrations.

### SDK Auto-Detection

The SDK automatically selects the auth path based on configuration:

```typescript
// Service binding available → API key auth (fast path)
const warden = createWardenClient({
	WARDEN: env.WARDEN, // Service binding present
	WARDEN_API_KEY: env.WARDEN_API_KEY,
});

// No service binding → challenge-response auth
const warden = createWardenClient({
	WARDEN_URL: "https://warden.grove.place",
	WARDEN_AGENT_ID: env.WARDEN_AGENT_ID,
	WARDEN_AGENT_SECRET: env.WARDEN_AGENT_SECRET,
});
```

### Agent Registration

Agents are registered via the Warden Worker's admin API (authenticated via Heartwood cookie or admin API key):

```typescript
// POST /admin/agents (admin-only)
{
  name: "Claude MCP Server",
  owner: "autumn",
  scopes: ["github:read", "github:write", "tavily:search"],
  rateLimit: { rpm: 60, daily: 1000 },
}

// Response (show once, agent must store):
{
  agentId: "agent_abc123",
  secret: "sec_xxxxxx",
  scopes: ["github:read", "github:write", "tavily:search"],
}
```

Agent records are stored in D1:

```sql
CREATE TABLE warden_agents (
  id TEXT PRIMARY KEY,             -- 'agent_abc123'
  name TEXT NOT NULL,              -- 'Claude MCP Server'
  owner TEXT NOT NULL,             -- 'autumn'
  secret_hash TEXT NOT NULL,       -- bcrypt hash of the secret
  scopes TEXT NOT NULL,            -- JSON array: '["github:read","github:write"]'
  rate_limit_rpm INTEGER DEFAULT 60,
  rate_limit_daily INTEGER DEFAULT 1000,
  enabled INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  last_used_at TEXT,
  request_count INTEGER DEFAULT 0
);
```

---

## Service Registry

Each external service is defined with its authentication method, available actions, and permission scopes.

### Service Definitions

| Service      | Auth Method    | Base URL               | Scopes                              |
| ------------ | -------------- | ---------------------- | ----------------------------------- |
| github       | Bearer token   | `api.github.com`       | `read`, `write`, `admin`, `actions` |
| cloudflare   | Bearer token   | `api.cloudflare.com`   | `read`, `write`, `workers`, `dns`   |
| tavily       | API key header | `api.tavily.com`       | `search`, `crawl`, `extract`        |
| exa          | API key header | `api.exa.ai`           | `search`, `contents`, `similar`     |
| resend       | Bearer token   | `api.resend.com`       | `send` (templated only)             |
| lemonsqueezy | Bearer token   | `api.lemonsqueezy.com` | `read` (no write operations)        |

### Action Mapping

Actions map to specific API endpoints with Zod validation:

```typescript
const serviceActions = {
	github: {
		list_repos: {
			method: "GET",
			path: "/user/repos",
			scope: "read",
			params: z.object({
				type: z.enum(["all", "owner", "member"]).optional(),
				sort: z.enum(["created", "updated", "pushed", "full_name"]).optional(),
			}),
		},
		create_issue: {
			method: "POST",
			path: "/repos/{owner}/{repo}/issues",
			scope: "write",
			params: z.object({
				owner: z.string(),
				repo: z.string(),
				title: z.string(),
				body: z.string().optional(),
				labels: z.array(z.string()).optional(),
			}),
		},
		// ... more actions
	},

	tavily: {
		search: {
			method: "POST",
			path: "/search",
			scope: "search",
			params: z.object({
				query: z.string(),
				search_depth: z.enum(["basic", "advanced"]).optional(),
				max_results: z.number().max(20).optional(),
			}),
		},
		// ... more actions
	},
};
```

### Adding New Services

New services are added by defining a service handler:

```typescript
// workers/warden/src/services/newservice.ts
import { defineService } from "../lib/service";

export const newService = defineService({
	name: "newservice",
	baseUrl: "https://api.newservice.com",
	authMethod: "bearer", // or "api-key-header", "basic"
	credentialKey: "NEWSERVICE_TOKEN", // Worker env secret name

	actions: {
		some_action: {
			method: "POST",
			path: "/v1/action",
			scope: "write",
			params: z.object({
				/* ... */
			}),
		},
	},
});
```

---

## SDK Design

The Warden SDK lives in the engine, following the same pattern as Zephyr and Firefly.

### Package Location

```
libs/engine/src/lib/warden/
├── index.ts              # Barrel exports
├── types.ts              # All interfaces and type definitions
├── client.ts             # WardenClient class
├── factory.ts            # createWardenClient() factory
├── crypto.ts             # HMAC signature generation (challenge-response)
├── services/
│   ├── github.ts         # Type-safe GitHub service methods
│   ├── cloudflare.ts     # Type-safe Cloudflare service methods
│   ├── tavily.ts         # Type-safe Tavily service methods
│   ├── exa.ts            # Type-safe Exa service methods
│   ├── resend.ts         # Type-safe Resend service methods
│   └── lemonsqueezy.ts   # Type-safe Lemon Squeezy service methods
└── __tests__/
    ├── client.test.ts
    └── crypto.test.ts
```

Exported as `@autumnsgrove/lattice/warden` through the engine's `package.json` exports map.

### Core Types

```typescript
// types.ts

// ─── Auth ──────────────────────────────────────────────────────────

export type WardenAuthMode = "service-binding" | "challenge-response";

export interface WardenConfig {
	/** Warden Worker URL (for external auth). */
	baseUrl?: string;

	/** API key for service binding auth (internal). */
	apiKey?: string;

	/** Agent ID for challenge-response auth (external). */
	agentId?: string;

	/** Agent secret for challenge-response auth (external). Never transmitted. */
	agentSecret?: string;

	/** Service binding for Worker-to-Worker calls. */
	fetcher?: {
		fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
	};
}

// ─── Request / Response ────────────────────────────────────────────

export type ServiceType = "github" | "cloudflare" | "tavily" | "exa" | "resend" | "lemonsqueezy";

export interface WardenRequest {
	service: ServiceType;
	action: string;
	params?: Record<string, unknown>;
	/** Optional tenant context for per-tenant credential lookup. */
	tenantId?: string;
}

export interface WardenResponse<T = unknown> {
	success: boolean;
	data?: T;
	error?: WardenError;
	metadata: {
		service: string;
		action: string;
		latencyMs: number;
		rateLimitRemaining?: number;
	};
}

// ─── Errors ────────────────────────────────────────────────────────

export type WardenErrorCode =
	| "AUTH_FAILED"
	| "INVALID_NONCE"
	| "SCOPE_DENIED"
	| "RATE_LIMITED"
	| "SERVICE_ERROR"
	| "INVALID_ACTION"
	| "VALIDATION_ERROR"
	| "NETWORK_ERROR"
	| "INTERNAL_ERROR";

export interface WardenError {
	code: WardenErrorCode;
	message: string;
	service?: string;
	scope?: string;
	retryAfter?: number;
}
```

### Client Class

```typescript
// client.ts

import type { WardenConfig, WardenRequest, WardenResponse, WardenAuthMode } from "./types";
import { generateSignature } from "./crypto";
import { GitHubService } from "./services/github";
import { TavilyService } from "./services/tavily";
import { ExaService } from "./services/exa";
import { CloudflareService } from "./services/cloudflare";
import { ResendService } from "./services/resend";
import { LemonSqueezyService } from "./services/lemonsqueezy";

export class WardenClient {
	private baseUrl: string;
	private authMode: WardenAuthMode;
	private apiKey?: string;
	private agentId?: string;
	private agentSecret?: string;
	private fetcher?: WardenConfig["fetcher"];

	// ─── Type-Safe Service Accessors ───────────────────────────────
	readonly github: GitHubService;
	readonly cloudflare: CloudflareService;
	readonly tavily: TavilyService;
	readonly exa: ExaService;
	readonly resend: ResendService;
	readonly lemonsqueezy: LemonSqueezyService;

	constructor(config: WardenConfig) {
		this.baseUrl = (config.baseUrl || "https://warden.grove.place").replace(/\/$/, "");
		this.apiKey = config.apiKey;
		this.agentId = config.agentId;
		this.agentSecret = config.agentSecret;
		this.fetcher = config.fetcher;

		// Auto-detect auth mode
		this.authMode = config.fetcher || config.apiKey ? "service-binding" : "challenge-response";

		// Initialize per-service accessors (pass `this.request` as the executor)
		const executor = this.request.bind(this);
		this.github = new GitHubService(executor);
		this.cloudflare = new CloudflareService(executor);
		this.tavily = new TavilyService(executor);
		this.exa = new ExaService(executor);
		this.resend = new ResendService(executor);
		this.lemonsqueezy = new LemonSqueezyService(executor);
	}

	/**
	 * Generic request interface.
	 * Use for dynamic/runtime-determined service calls.
	 * For static usage, prefer the type-safe service accessors.
	 */
	async request<T = unknown>(req: WardenRequest): Promise<WardenResponse<T>> {
		try {
			if (this.authMode === "service-binding") {
				return await this.executeServiceBinding<T>(req);
			} else {
				return await this.executeChallengeResponse<T>(req);
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			return {
				success: false,
				error: {
					code: "NETWORK_ERROR",
					message: `Warden request failed: ${message}`,
				},
				metadata: {
					service: req.service,
					action: req.action,
					latencyMs: 0,
				},
			};
		}
	}

	/**
	 * Check Warden health and service status.
	 */
	async health(): Promise<{
		status: string;
		services: string[];
		agents: number;
	} | null> {
		try {
			const doFetch = this.fetcher?.fetch ?? fetch;
			const response = await doFetch(`${this.baseUrl}/health`);
			if (!response.ok) return null;
			return (await response.json()) as {
				status: string;
				services: string[];
				agents: number;
			};
		} catch {
			return null;
		}
	}

	// ─── Internal: Service Binding Auth ────────────────────────────

	private async executeServiceBinding<T>(req: WardenRequest): Promise<WardenResponse<T>> {
		const doFetch = this.fetcher?.fetch ?? fetch;
		const response = await doFetch(`${this.baseUrl}/request`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-API-Key": this.apiKey || "",
			},
			body: JSON.stringify(req),
		});

		return (await response.json()) as WardenResponse<T>;
	}

	// ─── Internal: Challenge-Response Auth ─────────────────────────

	private async executeChallengeResponse<T>(req: WardenRequest): Promise<WardenResponse<T>> {
		if (!this.agentId || !this.agentSecret) {
			return {
				success: false,
				error: {
					code: "AUTH_FAILED",
					message: "Agent ID and secret required for challenge-response auth",
				},
				metadata: { service: req.service, action: req.action, latencyMs: 0 },
			};
		}

		// Step 1: Fetch nonce
		const nonceResponse = await fetch(`${this.baseUrl}/nonce`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ agentId: this.agentId }),
		});

		if (!nonceResponse.ok) {
			return {
				success: false,
				error: { code: "AUTH_FAILED", message: "Failed to obtain nonce" },
				metadata: { service: req.service, action: req.action, latencyMs: 0 },
			};
		}

		const { nonce } = (await nonceResponse.json()) as { nonce: string };

		// Step 2: Generate HMAC signature
		const signature = await generateSignature(this.agentSecret, nonce);

		// Step 3: Execute authenticated request
		const response = await fetch(`${this.baseUrl}/request`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				...req,
				agent: {
					id: this.agentId,
					nonce,
					signature,
				},
			}),
		});

		return (await response.json()) as WardenResponse<T>;
	}
}
```

### Factory Function

Following the Zephyr pattern — auto-configures from `platform.env`:

````typescript
// factory.ts

import { WardenClient } from "./client";

const DEFAULT_WARDEN_URL = "https://warden.grove.place";

/**
 * Create a WardenClient from platform environment variables.
 *
 * When a WARDEN Service Binding is available (deployed on Cloudflare),
 * requests route directly through internal networking (API key auth).
 * Otherwise, falls back to challenge-response auth over HTTPS.
 *
 * @example
 * ```typescript
 * import { createWardenClient } from '@autumnsgrove/lattice/warden';
 *
 * // In a SvelteKit server route:
 * const warden = createWardenClient(platform.env);
 * const repos = await warden.github.listRepos({ type: 'owner' });
 *
 * // In gw CLI or MCP server (no service binding):
 * const warden = createWardenClient({
 *   WARDEN_URL: 'https://warden.grove.place',
 *   WARDEN_AGENT_ID: process.env.WARDEN_AGENT_ID,
 *   WARDEN_AGENT_SECRET: process.env.WARDEN_AGENT_SECRET,
 * });
 * ```
 */
export function createWardenClient(env: {
	WARDEN_URL?: string;
	WARDEN_API_KEY?: string;
	WARDEN_AGENT_ID?: string;
	WARDEN_AGENT_SECRET?: string;
	WARDEN?: {
		fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
	};
}): WardenClient {
	return new WardenClient({
		baseUrl: env.WARDEN_URL || DEFAULT_WARDEN_URL,
		apiKey: env.WARDEN_API_KEY,
		agentId: env.WARDEN_AGENT_ID,
		agentSecret: env.WARDEN_AGENT_SECRET,
		fetcher: env.WARDEN,
	});
}
````

### Type-Safe Service Methods

Each service exposes typed methods that delegate to `client.request()`:

```typescript
// services/github.ts

import type { WardenRequest, WardenResponse } from "../types";

type RequestExecutor = <T>(req: WardenRequest) => Promise<WardenResponse<T>>;

export class GitHubService {
	constructor(private execute: RequestExecutor) {}

	async listRepos(params?: {
		type?: "all" | "owner" | "member";
		sort?: "created" | "updated" | "pushed" | "full_name";
	}) {
		return this.execute({
			service: "github",
			action: "list_repos",
			params,
		});
	}

	async createIssue(params: {
		owner: string;
		repo: string;
		title: string;
		body?: string;
		labels?: string[];
		assignees?: string[];
	}) {
		return this.execute({
			service: "github",
			action: "create_issue",
			params,
		});
	}

	async getIssue(params: { owner: string; repo: string; issue_number: number }) {
		return this.execute({
			service: "github",
			action: "get_issue",
			params,
		});
	}

	async createComment(params: { owner: string; repo: string; issue_number: number; body: string }) {
		return this.execute({
			service: "github",
			action: "create_comment",
			params,
		});
	}

	async listWorkflowRuns(params: {
		owner: string;
		repo: string;
		workflow_id?: string;
		status?: "queued" | "in_progress" | "completed";
	}) {
		return this.execute({
			service: "github",
			action: "list_workflow_runs",
			params,
		});
	}

	async triggerWorkflow(params: {
		owner: string;
		repo: string;
		workflow_id: string;
		ref: string;
		inputs?: Record<string, string>;
	}) {
		return this.execute({
			service: "github",
			action: "trigger_workflow",
			params,
		});
	}
}

// services/tavily.ts

export class TavilyService {
	constructor(private execute: RequestExecutor) {}

	async search(params: {
		query: string;
		searchDepth?: "basic" | "advanced";
		maxResults?: number;
		includeDomains?: string[];
		excludeDomains?: string[];
	}) {
		return this.execute({
			service: "tavily",
			action: "search",
			params,
		});
	}

	async extract(params: { urls: string[]; format?: "markdown" | "text" }) {
		return this.execute({
			service: "tavily",
			action: "extract",
			params,
		});
	}

	async crawl(params: { url: string; maxDepth?: number; maxBreadth?: number; limit?: number }) {
		return this.execute({
			service: "tavily",
			action: "crawl",
			params,
		});
	}
}

// Similar patterns for ExaService, CloudflareService,
// ResendService, LemonSqueezyService
```

### Barrel Exports

```typescript
// index.ts

export { WardenClient } from "./client";
export { createWardenClient } from "./factory";
export type {
	WardenConfig,
	WardenRequest,
	WardenResponse,
	WardenError,
	WardenErrorCode,
	WardenAuthMode,
	ServiceType,
} from "./types";
```

### Usage Examples

```typescript
import { createWardenClient } from "@autumnsgrove/lattice/warden";

// ─── In a SvelteKit server route (service binding) ────────────────

export const POST: RequestHandler = async ({ platform }) => {
	const warden = createWardenClient(platform.env);

	// Type-safe: full autocomplete on params
	const issue = await warden.github.createIssue({
		owner: "autumnsgrove",
		repo: "grove-engine",
		title: "Automated: weekly dependency audit",
		labels: ["maintenance"],
	});

	if (!issue.success) {
		return json({ error: issue.error }, { status: 500 });
	}

	return json({ issueUrl: issue.data.html_url });
};

// ─── In Queen Firefly (service binding) ───────────────────────────

const warden = createWardenClient(env);
const runs = await warden.github.listWorkflowRuns({
	owner: "autumnsgrove",
	repo: "grove-engine",
	status: "completed",
});

// ─── In gw CLI (challenge-response) ──────────────────────────────

const warden = createWardenClient({
	WARDEN_URL: "https://warden.grove.place",
	WARDEN_AGENT_ID: agentId,
	WARDEN_AGENT_SECRET: agentSecret,
});

const results = await warden.tavily.search({
	query: "cloudflare workers durable objects patterns",
	maxResults: 10,
});

// ─── Generic interface for dynamic usage ─────────────────────────

const result = await warden.request({
	service: "github",
	action: "create_issue",
	params: { owner, repo, title, body },
});
```

---

## Permission Scopes

Scopes control what actions an agent can perform. Granular by service and operation type.

### Scope Hierarchy

```
github:*           → All GitHub operations
github:read        → Read repos, issues, PRs, etc.
github:write       → Create/update issues, PRs, comments
github:admin       → Manage repo settings, collaborators
github:actions     → Trigger and manage workflow runs

cloudflare:*       → All Cloudflare operations
cloudflare:read    → List workers, KV namespaces, etc.
cloudflare:write   → Deploy workers, write KV
cloudflare:workers → Worker-specific operations
cloudflare:dns     → DNS record management

tavily:*           → All Tavily operations
tavily:search      → Web search
tavily:crawl       → Site crawling
tavily:extract     → Content extraction

exa:*              → All Exa operations
exa:search         → Semantic search
exa:contents       → Full content retrieval
exa:similar        → Find similar pages

resend:send        → Send emails (templated only)

lemonsqueezy:read  → View billing, subscriptions, orders
```

### Scope Validation

```typescript
function validateScope(agentScopes: string[], service: string, action: string): boolean {
	const requiredScope = serviceActions[service][action].scope;
	const fullScope = `${service}:${requiredScope}`;
	const wildcardScope = `${service}:*`;

	return agentScopes.includes(fullScope) || agentScopes.includes(wildcardScope);
}
```

For service binding auth (internal), scopes are still checked — the API key maps to a registered agent with its own scope set. The only difference is the auth mechanism, not the authorization model.

---

## Key Management

### Credential Sources

Warden fetches credentials from two places depending on context:

**Global credentials (Worker env secrets):** For Grove-wide API keys. Set via `gw secret apply` or `wrangler secret put`. Used when no `tenantId` is provided in the request.

```bash
# Set via gw (agent-safe: value never shown)
gw secret apply GITHUB_TOKEN --worker grove-warden
gw secret apply TAVILY_API_KEY --worker grove-warden
gw secret apply EXA_API_KEY --worker grove-warden
```

**Per-tenant credentials (SecretsManager envelope encryption):** For tenant-specific API keys stored in D1. Used when the request includes a `tenantId`. Decrypted on the fly via the existing `SecretsManager`.

```typescript
// Warden credential resolution
async function resolveCredential(
	service: ServiceType,
	tenantId: string | undefined,
	env: Env,
): Promise<string> {
	if (tenantId) {
		// Per-tenant: use envelope encryption
		const secrets = await createSecretsManager(env);
		const key = await secrets.getSecret(tenantId, `${service}_token`);
		if (key) return key;
		// Fall through to global if tenant has no override
	}

	// Global: from worker env secrets
	const envKey = SERVICE_CREDENTIAL_MAP[service];
	return env[envKey];
}
```

### Key Rotation

Keys can be rotated without agent disruption:

```typescript
// Warden supports multiple active keys per service during rotation
const serviceKeys = {
	github: {
		primary: env.GITHUB_TOKEN,
		secondary: env.GITHUB_TOKEN_ROTATING, // Optional, used during rotation
	},
};

// If primary fails with 401, try secondary
async function executeWithFallback(service: string, request: Request) {
	try {
		return await execute(serviceKeys[service].primary, request);
	} catch (e) {
		if (e.status === 401 && serviceKeys[service].secondary) {
			return await execute(serviceKeys[service].secondary, request);
		}
		throw e;
	}
}
```

### Audit Trail

Every credential access is logged (without the credential itself):

```typescript
await auditLog({
	agentId: agent.id,
	service: "github",
	action: "create_issue",
	timestamp: Date.now(),
	success: true,
	latencyMs: 234,
	authMode: "service-binding", // or "challenge-response"
	tenantId: request.tenantId || null,
});
```

---

## Rate Limiting

### Per-Agent Limits

```typescript
const defaultLimits = {
	rpm: 60, // Requests per minute
	daily: 1000, // Requests per day
	concurrent: 5, // Max concurrent requests
};

// Custom limits set at agent registration
// Stored in warden_agents.rate_limit_rpm / rate_limit_daily
```

### Per-Service Limits

Respects upstream API limits:

```typescript
const serviceLimits = {
	github: { rpm: 5000, daily: null }, // GitHub's own limits
	tavily: { rpm: 100, daily: 1000 }, // Based on plan
	exa: { rpm: 60, daily: 500 }, // Based on plan
	cloudflare: { rpm: 1200, daily: null }, // CF API limits
	resend: { rpm: 100, daily: null }, // Based on plan
	lemonsqueezy: { rpm: 60, daily: null },
};
```

### Rate Limit Storage

Nonces stored in KV with TTL. Rate limit counters stored in KV with minute/day windows:

```typescript
// KV key patterns
`nonce:${nonceId}` → TTL 30s
`rate:agent:${agentId}:min:${minuteKey}` → TTL 120s
`rate:agent:${agentId}:day:${dayKey}` → TTL 86400s
`rate:service:${service}:min:${minuteKey}` → TTL 120s
```

### Rate Limit Response

```typescript
{
  success: false,
  error: {
    code: "RATE_LIMITED",
    message: "Agent rate limit exceeded",
    retryAfter: 32,
  },
  metadata: {
    service: "github",
    action: "create_issue",
    latencyMs: 2,
    rateLimitRemaining: 0,
  },
}
```

---

## Error Handling

### Error Types

```typescript
type WardenErrorCode =
	| "AUTH_FAILED" // Invalid signature, expired nonce, bad API key
	| "INVALID_NONCE" // Nonce expired, already used, or malformed
	| "SCOPE_DENIED" // Agent lacks required scope for this action
	| "RATE_LIMITED" // Agent or service rate limit exceeded
	| "SERVICE_ERROR" // Upstream API returned an error (sanitized)
	| "INVALID_ACTION" // Unknown service or action name
	| "VALIDATION_ERROR" // Request params failed Zod validation
	| "NETWORK_ERROR" // SDK couldn't reach Warden
	| "INTERNAL_ERROR"; // Unexpected server error
```

### Error Responses

The SDK never throws. All errors are returned as `WardenResponse` with `success: false`:

```typescript
// Scope denial
{
  success: false,
  error: {
    code: "SCOPE_DENIED",
    message: "Agent lacks required scope",
    service: "github",
    scope: "admin",
  },
  metadata: { service: "github", action: "manage_collaborators", latencyMs: 3 },
}

// Upstream error (sanitized — no credential leakage)
{
  success: false,
  error: {
    code: "SERVICE_ERROR",
    message: "GitHub API error: Repository not found",
    service: "github",
  },
  metadata: { service: "github", action: "create_issue", latencyMs: 456 },
}

// Validation error
{
  success: false,
  error: {
    code: "VALIDATION_ERROR",
    message: "Invalid params: 'owner' is required",
  },
  metadata: { service: "github", action: "create_issue", latencyMs: 1 },
}
```

---

## Response Scrubbing

Responses are sanitized before returning to agents:

### Credential Stripping

```typescript
function scrubResponse(response: unknown, service: string): unknown {
	const sensitiveFields = [
		"token",
		"api_key",
		"apiKey",
		"secret",
		"password",
		"authorization",
		"x-api-key",
	];

	return deepOmit(response, sensitiveFields);
}
```

### URL Sanitization

```typescript
// Remove any URLs that might contain tokens
function sanitizeUrls(data: unknown): unknown {
	const tokenPatterns = [/[?&]token=[^&]+/gi, /[?&]api_key=[^&]+/gi, /[?&]access_token=[^&]+/gi];

	return deepReplace(data, tokenPatterns, "[REDACTED]");
}
```

---

## Lumen vs Warden

Two gateways, distinct domains:

```
┌─────────────────────────────────────────────────────────────────┐
│                          GROVE                                   │
│                                                                  │
│    ┌─────────────────────┐     ┌─────────────────────┐           │
│    │       LUMEN         │     │       WARDEN        │           │
│    │                     │     │                     │           │
│    │   AI Inference      │     │   External APIs     │           │
│    │                     │     │                     │           │
│    │   • OpenRouter      │     │   • GitHub          │           │
│    │   • Anthropic       │     │   • Cloudflare      │           │
│    │   • Workers AI      │     │   • Tavily / Exa    │           │
│    │   • Transcription   │     │   • Resend          │           │
│    │                     │     │   • Lemon Squeezy   │           │
│    │   task-based        │     │   action-based      │           │
│    │   routing           │     │   routing           │           │
│    │                     │     │                     │           │
│    │   tenant auth       │     │   dual auth         │           │
│    │   (Heartwood)       │     │   (binding + HMAC)  │           │
│    │                     │     │                     │           │
│    └─────────────────────┘     └─────────────────────┘           │
│                                                                  │
│    "Grove talks to AI         "Agents talk to the                │
│     through Lumen."            outside world through Warden."    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

| Aspect         | Lumen                    | Warden                      |
| -------------- | ------------------------ | --------------------------- |
| Purpose        | AI model inference       | External API proxy          |
| Consumer       | Grove services           | Agents, CLI, Workers        |
| Auth           | Tenant via Heartwood     | Dual: binding + HMAC        |
| Routing        | Task-based (moderation)  | Action-based (create_issue) |
| Keys protected | OpenRouter, Anthropic    | GitHub, Tavily, etc.        |
| Threat model   | Cost control, rate limit | Agent credential exfil      |
| SDK location   | `@lattice/lumen`         | `@lattice/warden`           |

---

## gw CLI Integration

Warden is deeply integrated with the `gw` CLI. The existing `gw secret` commands manage the local vault. New `gw warden` commands manage the gateway itself.

### Command Overview

```
gw warden
├── status              # Gateway health check
├── test <service>      # Test connectivity to a specific service
├── logs                # Recent audit log entries
└── agent
    ├── register        # Register a new agent
    ├── list            # List all registered agents
    ├── revoke <id>     # Revoke an agent's credentials
    └── scopes <id>     # View/update agent scopes
```

### `gw warden status`

```bash
$ gw warden status

✓ Warden: healthy (warden.grove.place)
  Uptime: 14d 6h
  Services: 6 configured
  Agents: 3 active, 1 revoked
  Requests (24h): 847
  Errors (24h): 3 (0.35%)
```

### `gw warden test <service>`

Tests connectivity through Warden using the configured agent credentials:

```bash
$ gw warden test github

✓ GitHub API: 200 OK (234ms)
  Rate limit: 4,892 / 5,000 remaining
  Scopes: repo, read:org

$ gw warden test tavily

✓ Tavily API: 200 OK (189ms)
  Plan: researcher
  Credits remaining: 847
```

### `gw warden agent register`

Registers a new agent and stores credentials in the local vault:

```bash
$ gw warden agent register \
    --name "Claude MCP Server" \
    --scopes github:read,github:write,tavily:search

✓ Agent registered: agent_abc123
✓ Credentials stored in vault:
  WARDEN_AGENT_ID_CLAUDE_MCP → agent_abc123
  WARDEN_AGENT_SECRET_CLAUDE_MCP → stored (never shown)

  Apply to a worker:
  gw secret apply WARDEN_AGENT_ID_CLAUDE_MCP --worker <name>
  gw secret apply WARDEN_AGENT_SECRET_CLAUDE_MCP --worker <name>
```

The agent secret is generated server-side, returned once, and immediately stored in the local vault. The value is never displayed. This follows the existing `gw secret generate` pattern.

### `gw warden agent list`

```bash
$ gw warden agent list

Registered Agents (3 active)

  Name                  ID              Scopes                          Last Used
  Claude MCP Server     agent_abc123    github:read,write tavily:search  2h ago
  Queen CI Runner       agent_def456    github:*                         15m ago
  Workflow Automation   agent_ghi789    resend:send                      3d ago
```

### `gw warden agent revoke`

```bash
$ gw warden agent revoke agent_abc123

⚠ This will immediately revoke all access for "Claude MCP Server"
  The agent will receive AUTH_FAILED on its next request.
  This action cannot be undone (re-register to restore).

  Continue? [y/N]: y

✓ Agent agent_abc123 revoked
```

### `gw warden logs`

```bash
$ gw warden logs --last 20

Recent Warden Activity

  Time        Agent            Service   Action          Status  Latency
  14:23:01    Claude MCP       github    create_issue    ✓ 200   234ms
  14:22:45    Queen CI         github    trigger_wf      ✓ 200   189ms
  14:22:12    Claude MCP       tavily    search          ✓ 200   567ms
  14:21:58    Workflow Auto    resend    send            ✓ 200   123ms
  14:21:30    Claude MCP       github    create_issue    ✗ 403   45ms
             └─ SCOPE_DENIED: lacks github:admin
```

### Integration with `gw secret`

The existing `gw secret` commands remain unchanged. Warden-specific secrets are just regular vault entries with naming conventions:

```bash
# Global service credentials (deployed to Warden worker)
gw secret set GITHUB_TOKEN
gw secret set TAVILY_API_KEY
gw secret apply GITHUB_TOKEN TAVILY_API_KEY --worker grove-warden

# Agent credentials (stored in vault, deployed to consumer workers)
# These are created automatically by `gw warden agent register`
gw secret apply WARDEN_AGENT_ID_CLAUDE_MCP --worker grove-lattice
gw secret apply WARDEN_AGENT_SECRET_CLAUDE_MCP --worker grove-lattice
```

### Authentication for gw ↔ Warden

The `gw` CLI itself acts as an agent. On first `gw warden` usage:

1. If no Warden agent credentials exist in the vault, `gw` prompts to register
2. Registration requires Heartwood admin auth (cookie or token)
3. Agent credentials are stored in the vault as `GW_WARDEN_AGENT_ID` and `GW_WARDEN_AGENT_SECRET`
4. Subsequent `gw warden` commands use challenge-response auth automatically

```bash
$ gw warden status

No Warden agent credentials found in vault.
Register gw as a Warden agent? [y/N]: y

Authenticating with Heartwood...
✓ Logged in as autumn@grove.place

Registering gw CLI agent with full admin scopes...
✓ Agent registered: agent_gw_cli_abc123
✓ Credentials stored in vault

✓ Warden: healthy (warden.grove.place)
  ...
```

---

## Worker Design

### File Structure

```
workers/warden/
├── src/
│   ├── index.ts              # Worker entry point, Hono router
│   ├── types.ts              # Worker-specific types (Env, etc.)
│   ├── routes/
│   │   ├── health.ts         # GET /health
│   │   ├── nonce.ts          # POST /nonce
│   │   ├── request.ts        # POST /request (main proxy endpoint)
│   │   └── admin.ts          # POST /admin/* (agent management)
│   ├── auth/
│   │   ├── dual-auth.ts      # Middleware: detect + verify auth mode
│   │   ├── nonce.ts          # Nonce generation, storage, validation
│   │   ├── signature.ts      # HMAC verification
│   │   ├── api-key.ts        # API key verification
│   │   └── scopes.ts         # Permission checking
│   ├── services/
│   │   ├── registry.ts       # Service registry + action definitions
│   │   ├── github.ts         # GitHub action handlers
│   │   ├── cloudflare.ts     # Cloudflare action handlers
│   │   ├── tavily.ts         # Tavily action handlers
│   │   ├── exa.ts            # Exa action handlers
│   │   ├── resend.ts         # Resend action handlers
│   │   └── lemonsqueezy.ts   # Lemon Squeezy action handlers
│   ├── middleware/
│   │   ├── rate-limit.ts     # Rate limiting (per-agent, per-service)
│   │   ├── validate.ts       # Request validation (Zod)
│   │   └── scrub.ts          # Response sanitization
│   └── lib/
│       ├── execute.ts        # HTTP execution with credential injection
│       ├── credentials.ts    # Credential resolution (env + SecretsManager)
│       └── logging.ts        # Audit logging to D1
├── wrangler.toml
├── package.json
└── tsconfig.json
```

### Cloudflare Resources

```toml
# wrangler.toml
name = "grove-warden"
main = "src/index.ts"
compatibility_date = "2024-09-23"

[vars]
ENVIRONMENT = "production"

# Nonce storage with TTL
[[kv_namespaces]]
binding = "NONCES"
id = "xxx"

# Rate limit counters
[[kv_namespaces]]
binding = "RATE_LIMITS"
id = "xxx"

# Agent records + audit log
[[d1_databases]]
binding = "DB"
database_name = "grove-warden"
database_id = "xxx"

# Access to tenant secrets (envelope encryption)
[[d1_databases]]
binding = "TENANT_DB"
database_name = "grove-lattice"
database_id = "xxx"

# Service bindings (consumed BY Warden — not needed, Warden calls external APIs)
# Service bindings (consumed FROM other Workers TO Warden)
# Configured in consumer wrangler.toml files:
#
# [[services]]
# binding = "WARDEN"
# service = "grove-warden"
```

### D1 Schema

```sql
-- Agent registry
CREATE TABLE warden_agents (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  owner TEXT NOT NULL,
  secret_hash TEXT NOT NULL,
  scopes TEXT NOT NULL,                -- JSON array
  rate_limit_rpm INTEGER DEFAULT 60,
  rate_limit_daily INTEGER DEFAULT 1000,
  enabled INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  last_used_at TEXT,
  request_count INTEGER DEFAULT 0
);

-- Audit log
CREATE TABLE warden_audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent_id TEXT NOT NULL,
  agent_name TEXT,
  service TEXT NOT NULL,
  action TEXT NOT NULL,
  auth_mode TEXT NOT NULL,             -- 'service-binding' or 'challenge-response'
  tenant_id TEXT,
  success INTEGER NOT NULL,
  error_code TEXT,
  latency_ms INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (agent_id) REFERENCES warden_agents(id)
);

-- Index for recent logs queries
CREATE INDEX idx_audit_created ON warden_audit_log(created_at DESC);
CREATE INDEX idx_audit_agent ON warden_audit_log(agent_id, created_at DESC);
```

### Hono Router

```typescript
// workers/warden/src/index.ts

import { Hono } from "hono";
import { healthRoute } from "./routes/health";
import { nonceRoute } from "./routes/nonce";
import { requestRoute } from "./routes/request";
import { adminRoutes } from "./routes/admin";
import { dualAuth } from "./auth/dual-auth";
import { rateLimit } from "./middleware/rate-limit";

const app = new Hono<{ Bindings: Env }>();

// Health check (no auth)
app.get("/health", healthRoute);

// Nonce endpoint (minimal auth — just validates agentId exists)
app.post("/nonce", nonceRoute);

// Main proxy endpoint (dual auth + rate limiting)
app.post("/request", dualAuth(), rateLimit(), requestRoute);

// Admin endpoints (Heartwood cookie auth)
app.post("/admin/agents", adminRoutes.createAgent);
app.get("/admin/agents", adminRoutes.listAgents);
app.delete("/admin/agents/:id", adminRoutes.revokeAgent);
app.get("/admin/logs", adminRoutes.getLogs);

export default app;
```

---

## Security Considerations

1. **No credential exposure** — Keys never leave Warden, never in responses
2. **Dual auth model** — Service bindings for trusted internal callers, challenge-response for external
3. **Nonce single-use** — Stored in KV with 30s TTL, invalidated after use. Replay attacks impossible.
4. **HMAC signatures** — Agent secrets never transmitted. Signature = HMAC-SHA256(secret, nonce)
5. **Scope enforcement** — Both auth paths check scopes. Internal callers aren't automatically trusted with all scopes.
6. **Response scrubbing** — Any leaked tokens in responses are stripped before returning to agents
7. **Audit trail** — Every request logged to D1 with agent, service, action, auth mode, success/failure
8. **Rate limiting** — Per-agent and per-service limits, stored in KV with minute/day windows
9. **Key rotation** — Primary/secondary credential fallback. Zero-downtime rotation.
10. **Envelope encryption** — Per-tenant API keys encrypted at rest via SecretsManager (KEK → DEK → secrets)
11. **Agent revocation** — Immediate effect via `enabled` flag. No grace period.

---

## Implementation Checklist

### Phase 1: Foundation

- [ ] Create `workers/warden/` with Hono + TypeScript
- [ ] Define `Env` type with all bindings (KV, D1, secrets)
- [ ] Implement `/health` endpoint
- [ ] Set up D1 schema (`warden_agents`, `warden_audit_log`)
- [ ] Deploy initial worker to `warden.grove.place`

### Phase 2: Auth Layer

- [ ] Implement nonce generation/validation (KV with TTL)
- [ ] Implement HMAC signature verification
- [ ] Implement API key verification for service bindings
- [ ] Build `dualAuth()` Hono middleware that auto-detects auth mode
- [ ] Implement scope validation

### Phase 3: Service Router

- [ ] Build `defineService()` helper for service definition
- [ ] Implement GitHub service (read + write actions)
- [ ] Implement Tavily service (search, crawl, extract)
- [ ] Implement Exa service (search, contents, similar)
- [ ] Implement Cloudflare service (workers, KV, D1)
- [ ] Implement Resend service (send, templated)
- [ ] Implement Lemon Squeezy service (read-only)
- [ ] Request validation via Zod schemas per action

### Phase 4: Security Middleware

- [ ] Rate limiting (per-agent + per-service, KV-backed)
- [ ] Response scrubbing (credential stripping, URL sanitization)
- [ ] Credential resolution (env secrets + SecretsManager envelope)
- [ ] Audit logging to D1

### Phase 5: SDK (Engine)

- [ ] Create `libs/engine/src/lib/warden/` directory
- [ ] Define types in `types.ts`
- [ ] Implement `WardenClient` with dual auth auto-detection
- [ ] Implement `generateSignature()` in `crypto.ts`
- [ ] Implement type-safe service classes (GitHub, Tavily, etc.)
- [ ] Implement `createWardenClient()` factory function
- [ ] Barrel exports in `index.ts`
- [ ] Add `warden` to engine `package.json` exports map
- [ ] Build engine and verify TypeScript compilation
- [ ] Write tests for client + crypto

### Phase 6: Admin API

- [ ] `POST /admin/agents` — create agent (requires Heartwood admin)
- [ ] `GET /admin/agents` — list agents
- [ ] `DELETE /admin/agents/:id` — revoke agent
- [ ] `GET /admin/logs` — audit log query

### Phase 7: gw CLI Integration

- [ ] Add `gw warden` command group
- [ ] Implement `gw warden status` (calls `/health`)
- [ ] Implement `gw warden test <service>` (test call through gateway)
- [ ] Implement `gw warden agent register` (calls admin API, stores in vault)
- [ ] Implement `gw warden agent list` (calls admin API)
- [ ] Implement `gw warden agent revoke` (calls admin API, with confirmation)
- [ ] Implement `gw warden logs` (calls admin API)
- [ ] Auto-registration flow on first `gw warden` usage

### Phase 8: Consumer Integration

- [ ] Add `WARDEN` service binding to Lattice (`libs/engine/wrangler.toml`)
- [ ] Add `WARDEN` service binding to Queen Firefly
- [ ] Wire Arbor admin pages to use Warden for GitHub operations
- [ ] Update MCP server configuration to use Warden SDK
- [ ] Add Warden health to Vista monitoring dashboard

---

## Future Considerations

**Short-lived tokens:** Instead of challenge-response per request, Warden could issue short-lived JWTs (5 min TTL) after initial auth. Reduces latency for burst operations from external agents.

**Webhook proxying:** Warden could receive webhooks from external services and forward to Grove, keeping webhook secrets protected. GitHub webhooks, Stripe events, etc.

**Request batching:** For agents making many small requests, batch them into single Warden calls. Reduces nonce overhead for external agents.

**Service plugins:** Allow adding new services without core changes — dynamic service registration via D1 configuration rather than code changes.

**Per-tenant rate limits:** Different tenants get different rate limits based on their plan (seedling/sapling/oak/evergreen). Overlays on top of per-agent limits.

**Cost tracking:** Log estimated API costs per request (GitHub API = free, Tavily = credits, Exa = credits). Surface in Arbor admin dashboard and Vista.

---

_The one who holds the keys._

**Last updated:** February 2026
**Status:** Specification Complete
**Author:** Autumn Brown
