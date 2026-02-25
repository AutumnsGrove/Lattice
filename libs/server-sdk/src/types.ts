/**
 * Grove Server SDK — Interface Definitions
 *
 * The roots run deep. The tree stands anywhere.
 *
 * Every infrastructure primitive has a clean TypeScript interface.
 * Today, Cloudflare adapters power everything. Tomorrow, the same
 * application code could run on any cloud. The interface stays the same.
 * Only the roots change.
 *
 * @module @autumnsgrove/server-sdk
 */

// =============================================================================
// DATABASE
// =============================================================================

/**
 * Abstract database interface wrapping SQL operations.
 * D1 today, portable to Turso/PlanetScale/Neon/LibSQL tomorrow.
 */
export interface GroveDatabase {
	/** Execute a SQL statement with optional bound parameters. */
	execute(sql: string, params?: unknown[]): Promise<QueryResult>;

	/** Execute a batch of SQL statements in a transaction. */
	batch(statements: BoundStatement[]): Promise<QueryResult[]>;

	/** Prepare a statement for repeated execution with different params. */
	prepare(sql: string): PreparedStatement;

	/** Run a function inside a transaction. */
	transaction<T>(fn: (tx: GroveTransaction) => Promise<T>): Promise<T>;

	/** Get raw connection info for diagnostics. */
	info(): DatabaseInfo;
}

export interface PreparedStatement {
	bind(...params: unknown[]): BoundStatement;
}

export interface BoundStatement {
	first<T = Record<string, unknown>>(column?: string): Promise<T | null>;
	all<T = Record<string, unknown>>(): Promise<QueryResult<T>>;
	run(): Promise<QueryMeta>;
	raw<T = unknown[]>(): Promise<T[]>;
}

export interface QueryResult<T = Record<string, unknown>> {
	results: T[];
	meta: QueryMeta;
}

export interface QueryMeta {
	changes: number;
	duration: number;
	last_row_id: number;
	rows_read: number;
	rows_written: number;
}

export interface GroveTransaction {
	execute(sql: string, params?: unknown[]): Promise<QueryResult>;
	prepare(sql: string): PreparedStatement;
}

export interface DatabaseInfo {
	/** Provider identifier (e.g. "cloudflare-d1", "turso", "libsql") */
	provider: string;
	/** Database name or identifier */
	database: string;
	/** Whether this connection is read-only */
	readonly: boolean;
}

// =============================================================================
// OBJECT STORAGE
// =============================================================================

/**
 * Abstract object storage interface for blob/file operations.
 * R2 today, portable to S3/Backblaze B2/GCS/MinIO tomorrow.
 */
export interface GroveStorage {
	/** Upload an object. */
	put(
		key: string,
		data: ReadableStream | ArrayBuffer | string,
		options?: PutOptions,
	): Promise<StorageObject>;

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

export interface PutOptions {
	contentType?: string;
	contentDisposition?: string;
	cacheControl?: string;
	metadata?: Record<string, string>;
}

export interface StorageObject {
	key: string;
	body: ReadableStream;
	size: number;
	etag: string;
	contentType: string;
	lastModified: Date;
	metadata: Record<string, string>;
}

export interface StorageObjectMeta {
	key: string;
	size: number;
	etag: string;
	contentType: string;
	lastModified: Date;
	metadata: Record<string, string>;
}

export interface ListOptions {
	prefix?: string;
	cursor?: string;
	limit?: number;
	delimiter?: string;
}

export interface StorageListResult {
	objects: StorageObjectMeta[];
	cursor?: string;
	truncated: boolean;
}

export interface PresignOptions {
	action: "get" | "put";
	/** Expiry in seconds */
	expiresIn: number;
	contentType?: string;
}

export interface StorageInfo {
	/** Provider identifier (e.g. "cloudflare-r2", "aws-s3", "backblaze-b2") */
	provider: string;
	/** Bucket name */
	bucket: string;
	/** Region, if applicable */
	region?: string;
}

// =============================================================================
// KEY-VALUE STORE
// =============================================================================

/**
 * Abstract key-value store for ephemeral or semi-persistent data.
 * Workers KV today, portable to Redis/Upstash/DynamoDB tomorrow.
 */
export interface GroveKV {
	/** Get a value by key. */
	get<T = string>(key: string, options?: KVGetOptions): Promise<T | null>;

	/** Set a value with optional TTL. */
	put(
		key: string,
		value: string | ArrayBuffer | ReadableStream,
		options?: KVPutOptions,
	): Promise<void>;

	/** Delete a key. */
	delete(key: string): Promise<void>;

	/** List keys with optional prefix. */
	list(options?: KVListOptions): Promise<KVListResult>;

	/** Get value with metadata. */
	getWithMetadata<T = string, M = Record<string, string>>(
		key: string,
	): Promise<KVValueMeta<T, M> | null>;

	/** Get provider info. */
	info(): KVInfo;
}

export interface KVGetOptions {
	type?: "text" | "json" | "arrayBuffer" | "stream";
}

export interface KVPutOptions {
	/** Time-to-live in seconds */
	expirationTtl?: number;
	/** Unix timestamp for expiration */
	expiration?: number;
	metadata?: Record<string, string>;
}

export interface KVListOptions {
	prefix?: string;
	cursor?: string;
	limit?: number;
}

export interface KVListResult {
	keys: KVKey[];
	cursor?: string;
	list_complete: boolean;
}

export interface KVKey {
	name: string;
	expiration?: number;
	metadata?: Record<string, string>;
}

export interface KVValueMeta<T, M> {
	value: T;
	metadata: M | null;
}

export interface KVInfo {
	/** Provider identifier (e.g. "cloudflare-kv", "redis", "upstash") */
	provider: string;
	/** Namespace name */
	namespace: string;
}

// =============================================================================
// SERVICE COMMUNICATION
// =============================================================================

/**
 * Abstract inter-service communication bus.
 * Cloudflare service bindings today, portable to HTTP/gRPC tomorrow.
 */
export interface GroveServiceBus {
	/** Call a service by name. */
	call<T = unknown>(service: string, request: ServiceRequest): Promise<ServiceResponse<T>>;

	/** Check if a service is available. */
	ping(service: string): Promise<boolean>;

	/** List available services. */
	services(): string[];

	/** Get bus info. */
	info(): ServiceBusInfo;
}

export interface ServiceRequest {
	method: string;
	path: string;
	headers?: Record<string, string>;
	body?: unknown;
}

export interface ServiceResponse<T = unknown> {
	status: number;
	headers: Record<string, string>;
	data: T;
}

export interface ServiceBusInfo {
	/** Provider identifier (e.g. "cloudflare-bindings", "http", "grpc") */
	provider: string;
	/** Available service names */
	services: string[];
}

// =============================================================================
// SCHEDULER
// =============================================================================

/**
 * Abstract scheduler for cron-triggered and time-based operations.
 * Cloudflare Cron Triggers today, portable to node-cron/Bull/etc tomorrow.
 */
export interface GroveScheduler {
	/** Register a handler for a named schedule. */
	on(name: string, handler: ScheduleHandler): void;

	/** List registered schedules. */
	schedules(): ScheduleInfo[];

	/** Get scheduler info. */
	info(): SchedulerInfo;
}

export type ScheduleHandler = (event: ScheduleEvent) => Promise<void>;

export interface ScheduleEvent {
	name: string;
	scheduledTime: Date;
	cron?: string;
}

export interface ScheduleInfo {
	name: string;
	cron: string;
	lastRun?: Date;
	nextRun?: Date;
}

export interface SchedulerInfo {
	/** Provider identifier (e.g. "cloudflare-cron", "node-cron") */
	provider: string;
}

// =============================================================================
// SECRETS AND CONFIGURATION
// =============================================================================

/**
 * Abstract configuration and secrets access.
 * Workers env bindings today, portable to process.env/dotenv/Vault tomorrow.
 */
export interface GroveConfig {
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

export interface ConfigInfo {
	/** Provider identifier (e.g. "cloudflare-env", "process-env", "dotenv") */
	provider: string;
}

// =============================================================================
// OBSERVABILITY
// =============================================================================

/**
 * Lightweight observer callback for SDK operations.
 *
 * Every adapter emits events when operations complete (success or error).
 * The SDK does not aggregate, buffer, or transmit — it just calls the
 * observer. What happens next is up to the consumer: log to console,
 * write to a D1 table Vista aggregators read, or ignore entirely.
 *
 * @example
 * ```typescript
 * const observer: GroveObserver = (event) => {
 *   console.log(`[${event.service}] ${event.operation} took ${event.durationMs}ms`);
 * };
 * const ctx = createCloudflareContext({ ..., observer });
 * ```
 */
export type GroveObserver = (event: GroveEvent) => void;

/** An operation event emitted by an SDK adapter. */
export interface GroveEvent {
	/** Which infrastructure service: "db", "storage", "kv", "services", "scheduler" */
	service: "db" | "storage" | "kv" | "services" | "scheduler";
	/** The operation name: "execute", "get", "put", "call", "dispatch", etc. */
	operation: string;
	/** Wall-clock duration in milliseconds */
	durationMs: number;
	/** Whether the operation succeeded */
	ok: boolean;
	/** Optional detail (SQL snippet, storage key, service name, etc.) */
	detail?: string;
	/** Error message if ok is false */
	error?: string;
}
