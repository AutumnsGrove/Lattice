/**
 * Vista Observability — Types, Interfaces, and Service Registry
 *
 * Central type system for all platform metrics collection and reporting.
 * All timestamps are Unix epoch seconds (INTEGER in D1, Math.floor(Date.now() / 1000) in TS).
 *
 * @module server/observability/types
 */

// =============================================================================
// Core Metric Types
// =============================================================================

/** Worker request/error/latency metrics (from Cloudflare Analytics GraphQL API) */
export interface WorkerMetrics {
	name: string;
	requests: {
		total: number;
		success: number;
		error: number;
	};
	errorRate: number;
	latency: {
		p50: number;
		p95: number;
		p99: number;
	};
	cpuTimeAvg: number;
	durationAvg: number;
	/** Unix epoch seconds for when these metrics were collected */
	collectedAt: number;
}

/** D1 database size and operation metrics */
export interface D1Metrics {
	name: string;
	databaseId: string;
	sizeBytes: number;
	rowsRead: number;
	rowsWritten: number;
	queryCount: number;
	collectedAt: number;
}

/** R2 bucket storage and operation metrics */
export interface R2Metrics {
	bucket: string;
	objectCount: number;
	totalSizeBytes: number;
	/** PUT/POST/LIST operations — more expensive tier */
	classAOps: number;
	/** GET operations — cheaper tier */
	classBOps: number;
	collectedAt: number;
}

/** KV namespace operation counts and health status */
export interface KVMetrics {
	namespace: string;
	namespaceId: string;
	reads: number;
	writes: number;
	deletes: number;
	lists: number;
	/** Result of the active KV health check (read/write/delete cycle) */
	healthStatus: "healthy" | "degraded" | "unavailable" | "unknown";
	healthCheckedAt: number | null;
	collectedAt: number;
}

/** Durable Object class aggregate metrics (self-reported via /do-metrics endpoint) */
export interface DurableObjectMetrics {
	className: string;
	activeInstances: number;
	hibernatingInstances: number;
	totalAlarms: number;
	storageBytes: number;
	instrumentationStatus: "reporting" | "awaiting_instrumentation" | "unavailable";
	collectedAt: number;
}

/** Per-instance DO metrics (reported by individual DO instances) */
export interface DOInstanceMetrics {
	className: string;
	instanceId: string;
	isActive: boolean;
	isHibernating: boolean;
	storageBytes: number;
	lastAlarmAt: number | null;
	uptimeMs: number;
}

// =============================================================================
// Health Check Types
// =============================================================================

/** HTTP health check classification by response time */
export type HealthStatus =
	| "operational" // < 500ms
	| "degraded" // 500–1500ms
	| "partial_outage" // 1500–3000ms
	| "major_outage" // > 3000ms or error
	| "unknown"; // not yet checked

export interface HealthCheckResult {
	endpoint: string;
	workerName: string;
	statusCode: number | null;
	responseTimeMs: number | null;
	isHealthy: boolean;
	status: HealthStatus;
	errorMessage: string | null;
	checkedAt: number;
}

// =============================================================================
// Cost Types
// =============================================================================

/** Full cost breakdown by Cloudflare service type */
export interface CostBreakdown {
	workers: number;
	d1: {
		reads: number;
		writes: number;
		storage: number;
		total: number;
	};
	r2: {
		storage: number;
		classA: number;
		classB: number;
		egress: number;
		total: number;
	};
	kv: {
		reads: number;
		writes: number;
		storage: number;
		total: number;
	};
	durableObjects: {
		requests: number;
		duration: number;
		storage: number;
		total: number;
	};
	ai: {
		neurons: number;
		total: number;
	};
	total: number;
	period: "daily" | "monthly";
	/** ISO date string for the period (YYYY-MM-DD for daily, YYYY-MM for monthly) */
	periodLabel: string;
	pricingVersion: string;
}

// =============================================================================
// Alert Types
// =============================================================================

export type AlertSeverity = "info" | "warning" | "critical";

export interface AlertThreshold {
	id: number;
	serviceName: string;
	metricType: string;
	operator: "gt" | "lt" | "gte" | "lte" | "eq";
	thresholdValue: number;
	severity: AlertSeverity;
	enabled: boolean;
	createdAt: number;
	updatedAt: number;
}

export interface ObservabilityAlert {
	id: number;
	serviceName: string;
	severity: AlertSeverity;
	title: string;
	description: string | null;
	metricType: string | null;
	metricValue: number | null;
	thresholdValue: number | null;
	triggeredAt: number;
	resolvedAt: number | null;
	acknowledged: boolean;
}

// =============================================================================
// Collector/Aggregator Result Types
// =============================================================================

/** Result from a single collector run */
export interface CollectorResult {
	name: string;
	status: "success" | "partial" | "error" | "unavailable";
	itemsCollected: number;
	durationMs: number;
	error?: string;
	/** True when the collector returned data from cache/stale state */
	stale?: boolean;
}

/** Full result from a complete collection run (all collectors + aggregators) */
export interface CollectionResult {
	startedAt: number;
	completedAt: number;
	durationMs: number;
	trigger: "cron" | "manual";
	collectors: Record<string, CollectorResult>;
	alertsTriggered: number;
	alertsResolved: number;
	errors: string[];
}

// =============================================================================
// Aggregator Result Types (existing data from D1 tables)
// =============================================================================

export interface LumenAggregateResult {
	/** Total cost in USD for the last 24 hours */
	cost24h: number;
	/** Total cost in USD for the last 30 days */
	cost30d: number;
	/** Total tokens (input + output) in the last 24 hours */
	tokens24h: { input: number; output: number };
	/** Cost breakdown by provider for the last 30 days */
	byProvider: Array<{ provider: string; count: number; totalCost: number }>;
	/** Cost breakdown by model for the last 30 days */
	byModel: Array<{ model: string; count: number; totalCost: number }>;
	/** Total requests in the last 24 hours */
	requests24h: number;
	/** Average latency in ms over the last 24 hours */
	avgLatencyMs24h: number;
	collectedAt: number;
}

export interface ModerationAggregateResult {
	/** Petal image moderation */
	petal: {
		blockRate24h: number;
		totalChecks24h: number;
		totalBlocked24h: number;
		ncmecQueueDepth: number;
		pendingFlagReviews: number;
		recentBlocks: Array<{ category: string; count: number }>;
	};
	/** Thorn text moderation */
	thorn: {
		actionCounts24h: { allowed: number; warned: number; flagged: number; blocked: number };
		flaggedQueueDepth: number;
		byCategory: Array<{ category: string; count: number }>;
	};
	collectedAt: number;
}

export interface SentinelAggregateResult {
	latestRun: {
		id: string;
		name: string;
		status: string;
		startedAt: number;
		completedAt: number | null;
		durationMs: number | null;
	} | null;
	recentRuns: Array<{
		id: string;
		name: string;
		status: string;
		startedAt: number;
		durationMs: number | null;
	}>;
	latestMetrics: {
		throughputRps: number | null;
		p50LatencyMs: number | null;
		p95LatencyMs: number | null;
		errorRate: number | null;
	};
	collectedAt: number;
}

export interface ClearingAggregateResult {
	components: Array<{
		id: string;
		name: string;
		slug: string;
		currentStatus: string;
	}>;
	openIncidents: number;
	allOperational: boolean;
	collectedAt: number;
}

export interface WardenAggregateResult {
	available: boolean;
	requestVolume24h: number;
	authFailureRate24h: number;
	authBreakdown24h: {
		serviceBinding: number;
		challengeResponse: number;
		failed: number;
	};
	/** Per-service latency averages (last 24h) */
	perServiceLatency: Array<{ service: string; avgMs: number; count: number }>;
	/** Nonce reuse attempts (security signal) */
	nonceReuseAttempts24h: number;
	/** Rate limit hits across all services (last 24h) */
	rateLimitHits24h: number;
	/** Scope denial count (last 24h) */
	scopeDenials24h: number;
	collectedAt: number;
}

export interface MeadowAggregateResult {
	available: boolean;
	postCreationRate24h: number;
	totalPosts: number;
	engagement24h: {
		votes: number;
		reactions: number;
	};
	reportQueueDepth: number;
	rateLimitHits24h: number;
	collectedAt: number;
}

export interface FireflyAggregateResult {
	available: boolean;
	/** Active (running) server count */
	activeRunners: number;
	/** Queued jobs waiting for a runner */
	queuedJobs: number;
	/** Total jobs completed in last 24h */
	completedJobs24h: number;
	/** Average session duration in seconds */
	avgSessionDurationSec: number | null;
	collectedAt: number;
}

// =============================================================================
// Service Registry
// =============================================================================

export interface WorkerRegistryEntry {
	name: string;
	/** Cloudflare Worker script name */
	scriptName: string;
	/** Full URL for health checks */
	healthCheckUrl: string | null;
	/** Path to ping (e.g., '/health', '/api/health') */
	healthPath: string | null;
	/** Whether this worker has an HTTP interface we can ping */
	hasHttp: boolean;
	description: string;
}

export interface D1RegistryEntry {
	name: string;
	databaseId: string;
	description: string;
}

export interface R2RegistryEntry {
	name: string;
	description: string;
}

export interface KVRegistryEntry {
	name: string;
	namespaceId: string;
	description: string;
}

export interface DORegistryEntry {
	className: string;
	workerScriptName: string;
	description: string;
	/** Whether this DO class has implemented reportMetrics() */
	instrumented: boolean;
}

/** Complete service registry — the source of truth for all known Grove infrastructure */
export const SERVICE_REGISTRY = {
	workers: [
		{
			name: "grove-engine",
			scriptName: "grove-engine",
			healthCheckUrl: "https://engine.grove.place/api/health",
			healthPath: "/api/health",
			hasHttp: true,
			description: "Main multi-tenant blog engine — serves all tenant sites",
		},
		{
			name: "grove-heartwood",
			scriptName: "grove-heartwood",
			healthCheckUrl: "https://auth.grove.place/health",
			healthPath: "/health",
			hasHttp: true,
			description: "Authentication service (Better Auth + Hono)",
		},
		{
			name: "grove-meadow",
			scriptName: "grove-meadow",
			healthCheckUrl: "https://meadow.grove.place/health",
			healthPath: "/health",
			hasHttp: true,
			description: "Community feed — notes, votes, reactions",
		},
		{
			name: "grove-meadow-poller",
			scriptName: "grove-meadow-poller",
			healthCheckUrl: null,
			healthPath: null,
			hasHttp: false,
			description: "RSS/feed poller cron worker for Meadow",
		},
		{
			name: "grove-warden",
			scriptName: "grove-warden",
			healthCheckUrl: "https://warden.grove.place/health",
			healthPath: "/health",
			hasHttp: true,
			description: "API gateway — credential injection, nonce auth, rate limiting, audit logging",
		},
		{
			name: "grove-cdn",
			scriptName: "grove-cdn",
			healthCheckUrl: "https://cdn.grove.place/health",
			healthPath: "/health",
			hasHttp: true,
			description: "Asset CDN — image serving and transformation",
		},
		{
			name: "grove-payments",
			scriptName: "grove-payments",
			healthCheckUrl: "https://payments.grove.place/health",
			healthPath: "/health",
			hasHttp: true,
			description: "Payment webhooks and subscription management (LemonSqueezy)",
		},
		{
			name: "grove-durable-objects",
			scriptName: "grove-durable-objects",
			healthCheckUrl: "https://do.grove.place/health",
			healthPath: "/health",
			hasHttp: true,
			description: "Durable Objects worker — hosts TenantDO, ThresholdDO, etc.",
		},
		{
			name: "grove-queen",
			scriptName: "grove-queen",
			healthCheckUrl: "https://queen.grove.place/health",
			healthPath: "/health",
			hasHttp: true,
			description: "Queen Firefly — ephemeral server management (provider-agnostic SDK)",
		},
		{
			name: "grove-clearing-monitor",
			scriptName: "grove-clearing-monitor",
			healthCheckUrl: null,
			healthPath: null,
			hasHttp: false,
			description: "Clearing status page health monitor (cron only)",
		},
		{
			name: "grove-vista-collector",
			scriptName: "grove-vista-collector",
			healthCheckUrl: null,
			healthPath: null,
			hasHttp: false,
			description: "Vista observability metrics collector (cron only)",
		},
	] as WorkerRegistryEntry[],

	databases: [
		{
			name: "grove-engine-db",
			databaseId: "a6394da2-b7a6-48ce-b7fe-b1eb3e730e68",
			description: "Primary engine database — tenants, posts, auth, observability",
		},
		{
			name: "grove-heartwood-db",
			databaseId: "heartwood-db-id",
			description: "Heartwood auth database — sessions, users, rate limits",
		},
		{
			name: "grove-meadow-db",
			databaseId: "meadow-db-id",
			description: "Meadow community database — posts, votes, reactions, reports",
		},
		{
			name: "grove-warden-db",
			databaseId: "warden-db-id",
			description: "Warden API gateway — audit log, credential store",
		},
		{
			name: "grove-queen-db",
			databaseId: "queen-db-id",
			description: "Queen Firefly — jobs, runners, provider configs",
		},
		{
			name: "grove-cdn-db",
			databaseId: "cdn-db-id",
			description: "CDN metadata database",
		},
		{
			name: "grove-clearing-db",
			databaseId: "clearing-db-id",
			description: "Clearing status page — components, incidents, uptime history",
		},
		{
			name: "grove-payments-db",
			databaseId: "payments-db-id",
			description: "Payment records and subscription data",
		},
		{
			name: "grove-lattice-db",
			databaseId: "lattice-db-id",
			description: "Lattice tenant secrets (used by Warden for credential injection)",
		},
	] as D1RegistryEntry[],

	buckets: [
		{
			name: "grove-assets",
			description: "Tenant uploaded images and media",
		},
		{
			name: "grove-backups",
			description: "Database backups and exports",
		},
		{
			name: "grove-cdn-cache",
			description: "CDN processed image cache",
		},
		{
			name: "grove-email-assets",
			description: "Email template images and attachments",
		},
		{
			name: "amber-grove-place",
			description: "Queen Firefly state sync — Bloom workspaces, Outpost worlds, CI cache",
		},
		{
			name: "grove-sentinel",
			description: "Sentinel load test reports and baseline snapshots",
		},
	] as R2RegistryEntry[],

	kvNamespaces: [
		{
			name: "RATE_LIMITER",
			namespaceId: "82d6537525d345f1981924bfd082248f",
			description: "Global rate limiting counters (fail-open when unavailable — M-5 audit finding)",
		},
		{
			name: "SESSION_CACHE",
			namespaceId: "session-cache-id",
			description: "Session data cache for engine workers",
		},
		{
			name: "FEATURE_FLAGS",
			namespaceId: "feature-flags-id",
			description: "Feature flag values and rollout percentages",
		},
		{
			name: "CDN_CACHE_META",
			namespaceId: "cdn-cache-meta-id",
			description: "CDN asset metadata and transformation cache",
		},
		{
			name: "WARDEN_NONCES",
			namespaceId: "warden-nonces-id",
			description: "Warden one-time nonce storage for challenge-response auth",
		},
		{
			name: "WARDEN_RATE_LIMITS",
			namespaceId: "warden-rate-limits-id",
			description: "Warden per-agent rate limit counters",
		},
		{
			name: "MEADOW_CACHE",
			namespaceId: "meadow-cache-id",
			description: "Meadow feed cache and poll state",
		},
		{
			name: "MONITOR_KV",
			namespaceId: "monitor-kv-id",
			description: "Clearing Monitor consecutive failure tracking",
		},
	] as KVRegistryEntry[],

	durableObjects: [
		{
			className: "TenantDO",
			workerScriptName: "grove-durable-objects",
			description: "Per-tenant state, session management, real-time features",
			instrumented: false,
		},
		{
			className: "ThresholdDO",
			workerScriptName: "grove-durable-objects",
			description: "Rate limiting coordinator — consistent distributed rate limits",
			instrumented: false,
		},
		{
			className: "PostMetaDO",
			workerScriptName: "grove-durable-objects",
			description: "Per-post metadata and reaction counts",
			instrumented: false,
		},
		{
			className: "PresenceDO",
			workerScriptName: "grove-durable-objects",
			description: "Real-time user presence tracking",
			instrumented: false,
		},
		{
			className: "LoomDO",
			workerScriptName: "grove-queen",
			description: "Queen Firefly session coordinator — manages ephemeral server lifecycle",
			instrumented: false,
		},
		{
			className: "UserFeedDO",
			workerScriptName: "grove-meadow",
			description: "Meadow per-user feed state (planned, not yet deployed)",
			instrumented: false,
		},
		{
			className: "PostMetaMeadowDO",
			workerScriptName: "grove-meadow",
			description: "Meadow per-post engagement metadata (planned, not yet deployed)",
			instrumented: false,
		},
	] as DORegistryEntry[],
} as const;
