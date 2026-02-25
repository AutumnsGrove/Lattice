---
aliases: []
date created: Sunday, February 22nd 2026
date modified: Sunday, February 22nd 2026
tags:
  - infrastructure
  - sdk
  - cloudflare-workers
  - portability
type: tech-spec
lastUpdated: "2026-02-22"
---

```
               🌲         🌲         🌲         🌲
                │           │           │           │
                │     ╭─────┴─────╮     │           │
                │     │ Interface │     │           │
                │     ╰─────┬─────╯     │           │
                │           │           │           │
          ┌─────┴───────────┴───────────┴───────────┴─────┐
          │            ░░░░░░░░░░░░░░░░░░░░░              │
          │          ░  GROVE INFRA SDK ░░░                │
          │            ░░░░░░░░░░░░░░░░░░░░░              │
          ├───────────────────────────────────────────────┤
          │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ │
          │  │   D1   │ │   R2   │ │   KV   │ │  Cron  │ │
          │  └───┬────┘ └───┬────┘ └───┬────┘ └───┬────┘ │
          │      │          │          │          │      │
          └──────┼──────────┼──────────┼──────────┼──────┘
                 │          │          │          │
          ═══════╧══════════╧══════════╧══════════╧═══════
                      ▒▒▒ bedrock ▒▒▒

         The roots run deep. The tree stands anywhere.
```

> _The roots run deep. The tree stands anywhere._

# Infra SDK: Infrastructure Abstraction Layer

> _The roots run deep. The tree stands anywhere._

The Infra SDK is the bedrock beneath every Grove service. It wraps each infrastructure primitive (database, storage, key-value, scheduling, service calls) in a clean TypeScript interface. Today, Cloudflare adapters power everything. Tomorrow, the same application code could run on any cloud. The interface stays the same. Only the roots change.

**Public Name:** Infra SDK
**Internal Name:** GroveInfra
**Package:** `@autumnsgrove/infra`
**Location:** `libs/infra/`
**Exports:** `@autumnsgrove/infra` (primary), re-exported via `@autumnsgrove/lattice/infra`
**Last Updated:** February 2026

Trees grow where their roots can find water. Move the roots to different soil, and the tree still grows. The Infra SDK is that root system: a layer of abstraction between application code and the ground it runs on. Cloudflare is fertile soil today. If the soil changes, we transplant the roots, not the tree.

---

## Overview

### What This Is

A TypeScript package that provides generic interfaces for every infrastructure service Grove uses. Each interface has a Cloudflare adapter as its primary implementation. Application code imports the interface. The adapter gets wired at startup. If you need to migrate, you swap the adapter, keep everything else.

### Goals

- Abstract all Cloudflare service interactions behind generic interfaces
- Enable infrastructure migration through adapter swaps, not rewrites
- Follow the same SDK philosophy as Loom (DOs), Threshold (rate limiting), and Firefly (ephemeral compute)
- Integrate with Signpost error codes (`SRV-*` prefix)
- Provide a migration path that's incremental, not big-bang

### Non-Goals (Out of Scope)

- Replacing Loom's Durable Object abstraction. Loom stays. Server SDK integrates with it.
- Over-abstracting things that are naturally Cloudflare-specific (Workers runtime, edge routing)
- Building adapters for AWS/GCP/Vercel today. The interfaces enable them. Implementation waits for need.
- Abstracting the development workflow (wrangler, miniflare). That stays CF-native.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Application Code                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │   Engine     │  │   Amber      │  │   Shade      │  ... all apps │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘               │
└─────────┼─────────────────┼─────────────────┼───────────────────────┘
          │                 │                 │
          │  imports interfaces only          │
          ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Infra SDK Interfaces                            │
│                                                                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │ Database │ │ Storage  │ │ KeyValue │ │ Scheduler│ │ Service  │  │
│  │          │ │          │ │          │ │          │ │ Comms    │  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘  │
│       │             │            │             │            │        │
│       ▼             ▼            ▼             ▼            ▼        │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │                   Adapter Layer                                 │ │
│  │  CloudflareDatabase  CloudflareStorage  CloudflareKV  ...      │ │
│  └─────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
          │                 │                 │
          ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Infrastructure Layer                               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │    D1    │ │    R2    │ │    KV    │ │   Cron   │ │ Service  │  │
│  │ (SQLite) │ │(S3-compat)│ │          │ │ Triggers │ │ Bindings │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### Tech Stack

| Component | Technology | Why |
|-----------|-----------|-----|
| Language | TypeScript | Type safety, matches all Grove packages |
| Primary Runtime | Cloudflare Workers | Current infrastructure |
| Database | D1 (SQLite) | SQL interface is naturally portable |
| Object Storage | R2 (S3-compatible) | S3 API is industry standard |
| Key-Value | Workers KV | Simple get/set/list maps anywhere |
| Coordination | Durable Objects via Loom | Loom handles this. SDK integrates. |
| Package Manager | pnpm workspace | Matches monorepo tooling |

### Relationship to Existing SDKs

```
┌─────────────────────────────────────────────────────────┐
│                    SDK Ecosystem                          │
│                                                          │
│  Infra SDK ──── foundation layer                        │
│       │                                                  │
│       ├── Loom ──── Durable Object coordination          │
│       │    └── SessionDO, TenantDO, PostDO               │
│       │                                                  │
│       ├── Threshold ──── rate limiting                    │
│       │    └── uses Infra SDK's KV + Loom's DOs         │
│       │                                                  │
│       ├── Firefly ──── ephemeral compute                 │
│       │    └── uses Infra SDK's Storage for state sync  │
│       │                                                  │
│       └── Amber SDK ──── unified storage management      │
│            └── built on Infra SDK's Storage + Database  │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

Loom, Threshold, and Firefly currently talk to Cloudflare services directly. Over time, they migrate to use Infra SDK interfaces. This is incremental. No big bang.

---

## Core Interfaces

### Database

The database interface wraps SQL operations. D1 is SQLite under the hood, so the interface stays SQLite-compatible. This is the easiest to port: Turso, PlanetScale, Neon, LibSQL, or raw SQLite all speak the same language.

```typescript
interface GroveDatabase {
  /** Execute a SQL statement with optional bound parameters. */
  execute(sql: string, params?: unknown[]): Promise<QueryResult>;

  /** Execute a batch of SQL statements in a transaction. */
  batch(statements: PreparedStatement[]): Promise<QueryResult[]>;

  /** Prepare a statement for repeated execution with different params. */
  prepare(sql: string): PreparedStatement;

  /** Run a function inside a transaction. */
  transaction<T>(fn: (tx: GroveTransaction) => Promise<T>): Promise<T>;

  /** Get raw connection info for diagnostics. */
  info(): DatabaseInfo;
}

interface PreparedStatement {
  bind(...params: unknown[]): BoundStatement;
}

interface BoundStatement {
  first<T = Record<string, unknown>>(column?: string): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<QueryResult<T>>;
  run(): Promise<QueryMeta>;
  raw<T = unknown[]>(): Promise<T[]>;
}

interface QueryResult<T = Record<string, unknown>> {
  results: T[];
  meta: QueryMeta;
}

interface QueryMeta {
  changes: number;
  duration: number;
  last_row_id: number;
  rows_read: number;
  rows_written: number;
}

interface GroveTransaction {
  execute(sql: string, params?: unknown[]): Promise<QueryResult>;
  prepare(sql: string): PreparedStatement;
}

interface DatabaseInfo {
  provider: string;      // "cloudflare-d1" | "turso" | "libsql" | ...
  database: string;      // Database name or identifier
  readonly: boolean;
}
```

**Cloudflare adapter:**

```typescript
class CloudflareDatabase implements GroveDatabase {
  constructor(private d1: D1Database) {}

  async execute(sql: string, params?: unknown[]): Promise<QueryResult> {
    const stmt = params?.length
      ? this.d1.prepare(sql).bind(...params)
      : this.d1.prepare(sql);
    return stmt.all();
  }

  async batch(statements: PreparedStatement[]): Promise<QueryResult[]> {
    return this.d1.batch(statements);
  }

  prepare(sql: string): PreparedStatement {
    return this.d1.prepare(sql);
  }

  async transaction<T>(fn: (tx: GroveTransaction) => Promise<T>): Promise<T> {
    // D1 doesn't support interactive transactions.
    // Use batch() with BEGIN/COMMIT wrapping.
    // For true transaction support, consumers should use Loom DOs.
    throw new GroveError(SRV_ERRORS.TRANSACTIONS_NOT_SUPPORTED);
  }

  info(): DatabaseInfo {
    return { provider: "cloudflare-d1", database: "grove", readonly: false };
  }
}
```

### Object Storage

The storage interface wraps blob/file operations. R2 is S3-compatible, which means S3, Backblaze B2, GCS, and MinIO all fit behind this interface.

```typescript
interface GroveStorage {
  /** Upload an object. */
  put(key: string, data: ReadableStream | ArrayBuffer | string, options?: PutOptions): Promise<StorageObject>;

  /** Download an object. */
  get(key: string): Promise<StorageObject | null>;

  /** Check if an object exists without downloading it. */
  head(key: string): Promise<StorageObjectMeta | null>;

  /** Delete an object. */
  delete(key: string): Promise<void>;

  /** Delete multiple objects. */
  deleteMany(keys: string[]): Promise<void>;

  /** List objects with a prefix. */
  list(options?: ListOptions): Promise<StorageListResult>;

  /** Generate a presigned URL for direct upload/download. */
  presignedUrl(key: string, options: PresignOptions): Promise<string>;

  /** Get storage provider info. */
  info(): StorageInfo;
}

interface PutOptions {
  contentType?: string;
  contentDisposition?: string;
  cacheControl?: string;
  metadata?: Record<string, string>;
}

interface StorageObject {
  key: string;
  body: ReadableStream;
  size: number;
  etag: string;
  contentType: string;
  lastModified: Date;
  metadata: Record<string, string>;
}

interface StorageObjectMeta {
  key: string;
  size: number;
  etag: string;
  contentType: string;
  lastModified: Date;
  metadata: Record<string, string>;
}

interface ListOptions {
  prefix?: string;
  cursor?: string;
  limit?: number;
  delimiter?: string;
}

interface StorageListResult {
  objects: StorageObjectMeta[];
  cursor?: string;
  truncated: boolean;
}

interface PresignOptions {
  action: "get" | "put";
  expiresIn: number;   // seconds
  contentType?: string;
}

interface StorageInfo {
  provider: string;    // "cloudflare-r2" | "aws-s3" | "backblaze-b2" | ...
  bucket: string;
  region?: string;
}
```

**Cloudflare adapter:**

```typescript
class CloudflareStorage implements GroveStorage {
  constructor(private r2: R2Bucket) {}

  async put(key: string, data: ReadableStream | ArrayBuffer | string, options?: PutOptions): Promise<StorageObject> {
    const obj = await this.r2.put(key, data, {
      httpMetadata: {
        contentType: options?.contentType,
        contentDisposition: options?.contentDisposition,
        cacheControl: options?.cacheControl,
      },
      customMetadata: options?.metadata,
    });
    return this.toStorageObject(obj, key);
  }

  async get(key: string): Promise<StorageObject | null> {
    const obj = await this.r2.get(key);
    if (!obj) return null;
    return this.toStorageObject(obj, key);
  }

  // ... remaining methods follow R2 API mapping
}
```

### Key-Value Store

Simple get/set/list for ephemeral or semi-persistent data. Used by Threshold for rate limit counters, by Shade for crawler fingerprints, and anywhere else that needs fast key-value access without SQL overhead.

```typescript
interface GroveKV {
  /** Get a value by key. */
  get<T = string>(key: string, options?: KVGetOptions): Promise<T | null>;

  /** Set a value with optional TTL. */
  put(key: string, value: string | ArrayBuffer | ReadableStream, options?: KVPutOptions): Promise<void>;

  /** Delete a key. */
  delete(key: string): Promise<void>;

  /** List keys with optional prefix. */
  list(options?: KVListOptions): Promise<KVListResult>;

  /** Get value with metadata. */
  getWithMetadata<T = string, M = Record<string, string>>(key: string): Promise<KVValueMeta<T, M> | null>;

  /** Get provider info. */
  info(): KVInfo;
}

interface KVGetOptions {
  type?: "text" | "json" | "arrayBuffer" | "stream";
}

interface KVPutOptions {
  expirationTtl?: number;   // seconds
  expiration?: number;       // unix timestamp
  metadata?: Record<string, string>;
}

interface KVListOptions {
  prefix?: string;
  cursor?: string;
  limit?: number;
}

interface KVListResult {
  keys: KVKey[];
  cursor?: string;
  list_complete: boolean;
}

interface KVKey {
  name: string;
  expiration?: number;
  metadata?: Record<string, string>;
}

interface KVValueMeta<T, M> {
  value: T;
  metadata: M | null;
}

interface KVInfo {
  provider: string;    // "cloudflare-kv" | "redis" | "upstash" | ...
  namespace: string;
}
```

### Service Communication

Inter-service calls. Today these are Cloudflare service bindings (zero-latency, same-network). The interface wraps this as generic RPC so it can fall back to HTTP calls if services run on different platforms.

```typescript
interface GroveServiceBus {
  /** Call a service by name. */
  call<T = unknown>(service: string, request: ServiceRequest): Promise<ServiceResponse<T>>;

  /** Check if a service is available. */
  ping(service: string): Promise<boolean>;

  /** List available services. */
  services(): string[];

  /** Get bus info. */
  info(): ServiceBusInfo;
}

interface ServiceRequest {
  method: string;
  path: string;
  headers?: Record<string, string>;
  body?: unknown;
}

interface ServiceResponse<T = unknown> {
  status: number;
  headers: Record<string, string>;
  data: T;
}

interface ServiceBusInfo {
  provider: string;    // "cloudflare-bindings" | "http" | "grpc" | ...
  services: string[];
}
```

**Cloudflare adapter:**

```typescript
class CloudflareServiceBus implements GroveServiceBus {
  constructor(private bindings: Record<string, Fetcher>) {}

  async call<T>(service: string, request: ServiceRequest): Promise<ServiceResponse<T>> {
    const binding = this.bindings[service];
    if (!binding) {
      throw new GroveError(SRV_ERRORS.SERVICE_NOT_FOUND, { service });
    }

    const response = await binding.fetch(
      new Request(`https://${service}${request.path}`, {
        method: request.method,
        headers: request.headers,
        body: request.body ? JSON.stringify(request.body) : undefined,
      })
    );

    return {
      status: response.status,
      headers: Object.fromEntries(response.headers),
      data: await response.json() as T,
    };
  }

  ping(service: string): Promise<boolean> {
    return !!this.bindings[service];
  }

  services(): string[] {
    return Object.keys(this.bindings);
  }
}
```

### Scheduler

Cron-triggered and time-based operations. Today these are Cloudflare Cron Triggers. The interface wraps scheduling as a generic concept.

```typescript
interface GroveScheduler {
  /** Register a handler for a named schedule. */
  on(name: string, handler: ScheduleHandler): void;

  /** List registered schedules. */
  schedules(): ScheduleInfo[];

  /** Get scheduler info. */
  info(): SchedulerInfo;
}

type ScheduleHandler = (event: ScheduleEvent) => Promise<void>;

interface ScheduleEvent {
  name: string;
  scheduledTime: Date;
  cron?: string;
}

interface ScheduleInfo {
  name: string;
  cron: string;
  lastRun?: Date;
  nextRun?: Date;
}

interface SchedulerInfo {
  provider: string;    // "cloudflare-cron" | "node-cron" | ...
}
```

### Secrets and Configuration

Environment variables and secrets, abstracted for different runtime environments. Not every runtime surfaces secrets the same way. Workers use `env` bindings. Node uses `process.env`. This normalizes access.

```typescript
interface GroveConfig {
  /** Get a required config value. Throws if missing. */
  require(key: string): string;

  /** Get an optional config value. */
  get(key: string): string | undefined;

  /** Get a config value with a default. */
  getOrDefault(key: string, defaultValue: string): string;

  /** Check if a config key exists. */
  has(key: string): boolean;

  /** Get config provider info. */
  info(): ConfigInfo;
}

interface ConfigInfo {
  provider: string;    // "cloudflare-env" | "process-env" | "dotenv" | ...
}
```

**Cloudflare adapter:**

```typescript
class CloudflareConfig implements GroveConfig {
  constructor(private env: Record<string, string>) {}

  require(key: string): string {
    const value = this.env[key];
    if (value === undefined) {
      throw new GroveError(SRV_ERRORS.CONFIG_MISSING, { key });
    }
    return value;
  }

  get(key: string): string | undefined {
    return this.env[key];
  }

  getOrDefault(key: string, defaultValue: string): string {
    return this.env[key] ?? defaultValue;
  }

  has(key: string): boolean {
    return key in this.env;
  }
}
```

---

## The Context Object

Every Grove request handler receives a `GroveContext` that bundles all infrastructure services together. This is the single entry point for all SDK access.

```typescript
interface GroveContext {
  db: GroveDatabase;
  storage: GroveStorage;
  kv: GroveKV;
  services: GroveServiceBus;
  scheduler: GroveScheduler;
  config: GroveConfig;
}
```

### Creating Context (Cloudflare)

```typescript
import { createCloudflareContext } from "@autumnsgrove/infra/cloudflare";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const ctx = createCloudflareContext({
      db: env.DB,
      storage: env.STORAGE,
      kv: env.CACHE_KV,
      services: {
        auth: env.AUTH,
        amber: env.AMBER,
        shade: env.SHADE,
      },
      env,
    });

    return handleRequest(request, ctx);
  }
};

// Application code only ever sees GroveContext
async function handleRequest(request: Request, ctx: GroveContext): Promise<Response> {
  const posts = await ctx.db.execute("SELECT * FROM posts WHERE tenant_id = ?", [tenantId]);
  const avatar = await ctx.storage.get(`${tenantId}/avatar.webp`);
  const cached = await ctx.kv.get(`cache:${tenantId}:settings`);
  // ...
}
```

### Creating Context (Future: Node.js)

```typescript
import { createNodeContext } from "@autumnsgrove/infra/node";

const ctx = createNodeContext({
  db: { type: "libsql", url: process.env.DATABASE_URL },
  storage: { type: "s3", bucket: process.env.S3_BUCKET, region: "us-east-1" },
  kv: { type: "redis", url: process.env.REDIS_URL },
  env: process.env,
});
```

Same `GroveContext` type. Same application code. Different roots.

---

## Signpost Error Catalog

The Infra SDK uses the `SRV` prefix for all error codes. Error types import from `@autumnsgrove/lattice/errors`.

```typescript
import type { GroveErrorDef } from "@autumnsgrove/lattice/errors";

export const SRV_ERRORS = {
  // Infrastructure (001-019)
  DB_NOT_AVAILABLE: {
    code: "SRV-001",
    category: "admin" as const,
    userMessage: "We're having trouble reaching our database. Please try again.",
    adminMessage: "Database binding not available. Check GroveContext initialization.",
  },
  STORAGE_NOT_AVAILABLE: {
    code: "SRV-002",
    category: "admin" as const,
    userMessage: "Storage service is temporarily unavailable.",
    adminMessage: "Object storage binding not available. Check R2/S3 configuration.",
  },
  KV_NOT_AVAILABLE: {
    code: "SRV-003",
    category: "admin" as const,
    userMessage: "We're having trouble reaching a required service.",
    adminMessage: "Key-value store binding not available. Check KV namespace.",
  },
  SERVICE_NOT_FOUND: {
    code: "SRV-004",
    category: "admin" as const,
    userMessage: "A required service is unavailable.",
    adminMessage: "Service binding not found. Check service name in GroveServiceBus.",
  },
  CONFIG_MISSING: {
    code: "SRV-005",
    category: "admin" as const,
    userMessage: "The service is not properly configured.",
    adminMessage: "Required configuration key missing from environment.",
  },
  CONTEXT_INIT_FAILED: {
    code: "SRV-006",
    category: "bug" as const,
    userMessage: "Something went wrong starting the service.",
    adminMessage: "GroveContext initialization failed. Check all bindings.",
  },

  // Auth & Sessions (020-039) — reserved for future use
  // Server SDK doesn't handle auth directly (Heartwood does)

  // Business Logic (040-059)
  QUERY_FAILED: {
    code: "SRV-040",
    category: "bug" as const,
    userMessage: "We had trouble processing your request.",
    adminMessage: "Database query execution failed.",
  },
  STORAGE_UPLOAD_FAILED: {
    code: "SRV-041",
    category: "bug" as const,
    userMessage: "Upload failed. Please try again.",
    adminMessage: "Object storage put operation failed.",
  },
  STORAGE_DOWNLOAD_FAILED: {
    code: "SRV-042",
    category: "bug" as const,
    userMessage: "We couldn't retrieve the requested file.",
    adminMessage: "Object storage get operation failed.",
  },
  KV_OPERATION_FAILED: {
    code: "SRV-043",
    category: "bug" as const,
    userMessage: "We had trouble processing your request.",
    adminMessage: "Key-value store operation failed.",
  },
  SERVICE_CALL_FAILED: {
    code: "SRV-044",
    category: "bug" as const,
    userMessage: "A required service didn't respond.",
    adminMessage: "Inter-service call failed. Check target service health.",
  },
  TRANSACTIONS_NOT_SUPPORTED: {
    code: "SRV-045",
    category: "admin" as const,
    userMessage: "This operation is not supported.",
    adminMessage: "Interactive transactions not supported by this database adapter. Use batch() or Loom DOs.",
  },
  PRESIGNED_URL_FAILED: {
    code: "SRV-046",
    category: "bug" as const,
    userMessage: "We couldn't generate an upload link.",
    adminMessage: "Presigned URL generation failed. Check storage adapter configuration.",
  },

  // Rate Limiting (060-079) — reserved for Threshold integration

  // Internal (080-099)
  ADAPTER_ERROR: {
    code: "SRV-080",
    category: "bug" as const,
    userMessage: "Something unexpected happened.",
    adminMessage: "Infrastructure adapter threw an unexpected error.",
  },
  SERIALIZATION_ERROR: {
    code: "SRV-081",
    category: "bug" as const,
    userMessage: "Something went wrong processing data.",
    adminMessage: "Failed to serialize/deserialize data for storage.",
  },
  TIMEOUT: {
    code: "SRV-082",
    category: "bug" as const,
    userMessage: "The request took too long. Please try again.",
    adminMessage: "Infrastructure operation exceeded timeout threshold.",
  },
} satisfies Record<string, GroveErrorDef>;
```

### Error Code Summary

| Code | Key | Category | When It Fires |
|------|-----|----------|---------------|
| `SRV-001` | DB_NOT_AVAILABLE | admin | Database binding missing from context |
| `SRV-002` | STORAGE_NOT_AVAILABLE | admin | Object storage binding missing |
| `SRV-003` | KV_NOT_AVAILABLE | admin | KV namespace binding missing |
| `SRV-004` | SERVICE_NOT_FOUND | admin | Service binding not registered |
| `SRV-005` | CONFIG_MISSING | admin | Required env/secret not set |
| `SRV-006` | CONTEXT_INIT_FAILED | bug | GroveContext creation failed |
| `SRV-040` | QUERY_FAILED | bug | SQL execution error |
| `SRV-041` | STORAGE_UPLOAD_FAILED | bug | Object put failed |
| `SRV-042` | STORAGE_DOWNLOAD_FAILED | bug | Object get failed |
| `SRV-043` | KV_OPERATION_FAILED | bug | KV get/put/delete failed |
| `SRV-044` | SERVICE_CALL_FAILED | bug | Inter-service fetch failed |
| `SRV-045` | TRANSACTIONS_NOT_SUPPORTED | admin | Adapter lacks transaction support |
| `SRV-046` | PRESIGNED_URL_FAILED | bug | Presigned URL generation failed |
| `SRV-080` | ADAPTER_ERROR | bug | Unhandled adapter exception |
| `SRV-081` | SERIALIZATION_ERROR | bug | Data serialization failed |
| `SRV-082` | TIMEOUT | bug | Operation timed out |

---

## Integration with Existing SDKs

### Loom (Durable Objects)

Loom stays independent. Durable Objects are irreplaceable. No other serverless platform offers single-threaded, globally-unique, stateful compute instances with WebSocket support. Abstracting them would mean losing what makes them valuable.

Infra SDK integrates with Loom through the service bus:

```typescript
// Calling a Loom DO through the service bus
const session = await ctx.services.call("auth", {
  method: "GET",
  path: `/session/${sessionId}`,
});
```

And by providing Loom's underlying storage needs:

```typescript
// Loom DOs can use Infra SDK for their D1 writes
class TenantDO {
  constructor(private ctx: GroveContext) {}

  async syncToDatabase(data: TenantState): Promise<void> {
    await this.ctx.db.execute(
      "UPDATE tenants SET settings = ? WHERE id = ?",
      [JSON.stringify(data.settings), data.tenantId]
    );
  }
}
```

### Threshold (Rate Limiting)

Threshold currently reads/writes rate limit counters directly through KV. With Infra SDK, it uses the `GroveKV` interface:

```typescript
// Before (direct CF)
const count = await env.CACHE_KV.get(`rate:${userId}:${endpoint}`);

// After (Infra SDK)
const count = await ctx.kv.get(`rate:${userId}:${endpoint}`);
```

Same behavior. Same performance. The KV adapter adds zero overhead on Cloudflare (it's a thin wrapper). On another platform, the same code works with Redis, Upstash, or DynamoDB.

### Firefly (Ephemeral Compute)

Firefly uses R2 for state synchronization. With Infra SDK, the `R2StateSynchronizer` becomes a `StorageSynchronizer` that uses `GroveStorage`:

```typescript
class StorageSynchronizer implements StateSynchronizer {
  constructor(private storage: GroveStorage) {}

  async hydrate(instance: ServerInstance, stateKey: string): Promise<void> {
    const state = await this.storage.get(`${stateKey}/latest.tar.gz`);
    if (state) {
      await uploadToInstance(instance, state.body);
    }
  }

  async persist(instance: ServerInstance, stateKey: string): Promise<void> {
    const archive = await downloadFromInstance(instance);
    await this.storage.put(`${stateKey}/latest.tar.gz`, archive);
  }
}
```

### Amber SDK

Amber (unified storage management) builds on top of Infra SDK's `GroveStorage` and `GroveDatabase` interfaces. The Amber SDK is a higher-level abstraction that adds quota tracking, export processing, and add-on management. Infra SDK provides the primitives. Amber orchestrates them.

```
GroveStorage (Infra SDK)
    │
    └── Amber SDK
         ├── Quota tracking (via GroveDatabase)
         ├── File organization (via GroveStorage)
         ├── Export processing (via Loom DOs)
         └── Add-on management (via GroveDatabase)
```

---

## GW CLI Integration

The `gw` CLI currently uses wrangler commands directly for infrastructure operations. Infra SDK can simplify this by providing a CLI adapter:

```
┌──────────────────────────────────────────────────┐
│  gw CLI                                           │
│                                                   │
│  gw d1 query "SELECT ..."  ──→  GroveDatabase    │
│  gw kv get "key"           ──→  GroveKV          │
│  gw r2 list "prefix/"     ──→  GroveStorage     │
│  gw services ping auth     ──→  GroveServiceBus  │
│                                                   │
│  Same interfaces. Same error codes.               │
│  CLI just wires local adapters instead of CF.     │
└──────────────────────────────────────────────────┘
```

This lets `gw` infrastructure commands work against local SQLite, local filesystem, and HTTP endpoints during development. No wrangler dependency required for basic operations.

---

## Migration Strategy

Migration from direct Cloudflare calls to Infra SDK is incremental. No service needs to migrate all at once.

### Migration Flow

```
Phase 1: Publish SDK          Phase 2: Wrap existing       Phase 3: Replace direct
(new package, no consumers)   (thin wrappers, same calls)  (pure SDK, no CF imports)

  ┌─────────┐                 ┌─────────┐                  ┌─────────┐
  │ app.ts  │                 │ app.ts  │                  │ app.ts  │
  │         │                 │         │                  │         │
  │ env.DB  │                 │ ctx.db  │──wraps──→ env.DB │ ctx.db  │
  │ env.R2  │                 │ ctx.stor│──wraps──→ env.R2 │ ctx.stor│
  │ env.KV  │                 │ env.KV  │ (not yet)        │ ctx.kv  │
  └─────────┘                 └─────────┘                  └─────────┘
  direct CF calls             mixed (some wrapped)         fully abstracted
```

### Step-by-Step Migration for a Service

1. **Add dependency.** `pnpm add @autumnsgrove/infra` in the app.
2. **Create context.** Add `createCloudflareContext()` in the Worker entry point.
3. **Pass context.** Thread `GroveContext` through to handlers.
4. **Replace one binding at a time.** Start with the simplest (KV get/set, then R2, then D1).
5. **Remove direct `env.*` access.** Once all calls go through the context, the app is fully abstracted.

### Migration Priority

| Service | Bindings Used | Complexity | Priority |
|---------|--------------|------------|----------|
| Shade | KV (rate limiting, crawler lists) | Low | First |
| Vista | KV (analytics), D1 (queries) | Low | Second |
| Amber | R2 (storage), D1 (quotas) | Medium | Third |
| Engine | D1, R2, KV, DOs, Service bindings | High | Last |

Start with services that use only one or two binding types. Build confidence. Then tackle the engine.

---

## Testing Strategy

### Unit Tests

Each adapter gets its own test suite. Mock the underlying CF/cloud API.

```typescript
describe("CloudflareDatabase", () => {
  it("should execute a query", async () => {
    const mockD1 = createMockD1();
    mockD1.prepare.mockReturnValue({
      all: () => Promise.resolve({ results: [{ id: 1 }], meta: {} }),
    });

    const db = new CloudflareDatabase(mockD1);
    const result = await db.execute("SELECT * FROM posts");
    expect(result.results).toHaveLength(1);
  });
});
```

### Integration Tests

Run against real Cloudflare services in a staging environment. Each interface has a conformance test suite that any adapter must pass.

```typescript
// Conformance test: any GroveStorage implementation must pass this
export function storageConformanceTests(createStorage: () => GroveStorage) {
  it("should put and get an object", async () => {
    const storage = createStorage();
    await storage.put("test/file.txt", "hello world", { contentType: "text/plain" });
    const obj = await storage.get("test/file.txt");
    expect(obj).not.toBeNull();
    expect(await streamToText(obj!.body)).toBe("hello world");
  });

  it("should return null for missing objects", async () => {
    const storage = createStorage();
    const obj = await storage.get("does-not-exist");
    expect(obj).toBeNull();
  });

  it("should list objects by prefix", async () => {
    const storage = createStorage();
    await storage.put("prefix/a.txt", "a");
    await storage.put("prefix/b.txt", "b");
    await storage.put("other/c.txt", "c");

    const result = await storage.list({ prefix: "prefix/" });
    expect(result.objects).toHaveLength(2);
  });

  // ... more conformance tests
}
```

### Local Development

Miniflare provides local D1/R2/KV for development. The Server SDK wraps miniflare the same way it wraps production bindings. No separate local adapter needed for the Cloudflare path.

---

## File Structure

```
libs/infra/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts                    # Barrel exports (interfaces only)
│   ├── types.ts                    # All interface definitions
│   ├── errors.ts                   # SRV_ERRORS catalog
│   ├── context.ts                  # GroveContext type
│   │
│   ├── cloudflare/
│   │   ├── index.ts                # createCloudflareContext + CF exports
│   │   ├── database.ts             # CloudflareDatabase adapter
│   │   ├── storage.ts              # CloudflareStorage adapter
│   │   ├── kv.ts                   # CloudflareKV adapter
│   │   ├── service-bus.ts          # CloudflareServiceBus adapter
│   │   ├── scheduler.ts            # CloudflareScheduler adapter
│   │   └── config.ts               # CloudflareConfig adapter
│   │
│   └── testing/
│       ├── index.ts                # Test utilities export
│       ├── mock-database.ts        # In-memory GroveDatabase for tests
│       ├── mock-storage.ts         # In-memory GroveStorage for tests
│       ├── mock-kv.ts              # In-memory GroveKV for tests
│       └── conformance/            # Conformance test suites
│           ├── database.test.ts
│           ├── storage.test.ts
│           └── kv.test.ts
│
├── tests/
│   ├── cloudflare/
│   │   ├── database.test.ts
│   │   ├── storage.test.ts
│   │   ├── kv.test.ts
│   │   └── service-bus.test.ts
│   └── integration/
│       └── context.test.ts
│
└── README.md
```

### Package Exports

```json
{
  "name": "@autumnsgrove/infra",
  "exports": {
    ".": "./src/index.ts",
    "./cloudflare": "./src/cloudflare/index.ts",
    "./testing": "./src/testing/index.ts"
  }
}
```

Consumers import interfaces from the root. Adapter wiring comes from the platform-specific subpath.

```typescript
// Interfaces (platform-agnostic)
import type { GroveDatabase, GroveStorage, GroveKV, GroveContext } from "@autumnsgrove/infra";

// Cloudflare adapter (platform-specific, only in entry point)
import { createCloudflareContext } from "@autumnsgrove/infra/cloudflare";

// Test mocks
import { createMockContext } from "@autumnsgrove/infra/testing";
```

---

## Security Considerations

- **Adapter boundaries.** Each adapter validates inputs before passing to the underlying service. No raw user input reaches CF APIs without sanitization.
- **Credential isolation.** The `GroveConfig` interface treats all values as strings. No structured credential objects leak through the interface boundary.
- **Error masking.** Signpost errors always surface warm `userMessage` values to visitors. Internal details stay in `adminMessage` for logs only.
- **No credential logging.** Adapters must never log config values, API keys, or tokens. Even in error paths.
- **Tenant isolation.** The SDK doesn't enforce tenant isolation itself. That's the application layer's job. The SDK provides the tools. The app provides the policy.

---

## Implementation Checklist

### Phase 1: Foundation (Week 1-2)

- [ ] Create `libs/server-sdk/` package structure
- [ ] Define all interfaces in `types.ts`
- [ ] Define `GroveContext` in `context.ts`
- [ ] Create `SRV_ERRORS` catalog in `errors.ts`
- [ ] Add error entries to `signpost-error-codes.md`
- [ ] Configure package.json with exports map
- [ ] Set up tsconfig extending workspace config

### Phase 2: Cloudflare Adapters (Week 2-3)

- [ ] Implement `CloudflareDatabase` wrapping D1
- [ ] Implement `CloudflareStorage` wrapping R2
- [ ] Implement `CloudflareKV` wrapping Workers KV
- [ ] Implement `CloudflareServiceBus` wrapping service bindings
- [ ] Implement `CloudflareScheduler` wrapping cron triggers
- [ ] Implement `CloudflareConfig` wrapping env bindings
- [ ] Implement `createCloudflareContext()` factory function
- [ ] Build and verify TypeScript compilation

### Phase 3: Testing (Week 3-4)

- [ ] Write conformance test suites for each interface
- [ ] Create in-memory mock implementations for testing
- [ ] Unit test all Cloudflare adapters
- [ ] Integration test with miniflare
- [ ] Add `@autumnsgrove/server-sdk/testing` exports

### Phase 4: First Consumer (Week 4-5)

- [ ] Migrate Shade to use Server SDK (KV only, simplest case)
- [ ] Validate no performance regression
- [ ] Document migration steps and patterns
- [ ] Update `gw` CLI to optionally use SDK interfaces

### Phase 5: Rollout (Week 5+)

- [ ] Migrate Vista (KV + D1)
- [ ] Migrate Amber (R2 + D1)
- [ ] Migrate Engine (all bindings, final boss)
- [ ] Update Firefly to use `GroveStorage` instead of direct R2
- [ ] Update Threshold to use `GroveKV` instead of direct KV

---

*The roots run deep. The tree stands anywhere.*
