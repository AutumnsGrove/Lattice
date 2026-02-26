/**
 * Firefly SDK — Type Definitions
 *
 * A brief light in the darkness. It appears, does its work, and fades away.
 *
 * All public interfaces for ephemeral server provisioning.
 * Consumers import these to configure their own Firefly lifecycle.
 *
 * @module @autumnsgrove/lattice/firefly
 */

// =============================================================================
// PROVIDER NAMES
// =============================================================================

/** Supported cloud providers. */
export type FireflyProviderName = "hetzner" | "fly" | "railway" | "digitalocean";

// =============================================================================
// SERVER CONFIG & INSTANCE
// =============================================================================

/** What to provision. Provider-agnostic fields plus a providerOptions escape hatch. */
export interface ServerConfig {
	provider: FireflyProviderName;
	/** Server size identifier (e.g. "cx22", "shared-cpu-1x") */
	size: string;
	/** Datacenter region (e.g. "fsn1", "iad") */
	region: string;
	/** OS image, snapshot, or container identifier */
	image: string;
	/** Cloud-init or startup script */
	userData?: string;
	/** SSH key IDs or fingerprints */
	sshKeys?: string[];
	/** Tags for organization and orphan cleanup */
	tags?: string[];
	/** Hard cap on session duration (ms) */
	maxLifetime?: number;
	/** Provider-specific tuning options */
	providerOptions?: Record<string, unknown>;
}

/** A running (or recently terminated) server instance. */
export interface ServerInstance {
	/** SDK-assigned UUID */
	id: string;
	/** Provider's native ID (Hetzner server ID, Fly machine ID) */
	providerServerId: string;
	/** Which provider created this */
	provider: FireflyProviderName;
	/** Public IPv4 address */
	publicIp: string;
	/** Private IP if available */
	privateIp?: string;
	/** Current lifecycle status */
	status: ServerStatus;
	/** Unix timestamp (ms) */
	createdAt: number;
	/** Arbitrary consumer-defined metadata */
	metadata: Record<string, unknown>;
}

/** Server lifecycle states. */
export type ServerStatus = "provisioning" | "ready" | "running" | "terminating" | "terminated";

// =============================================================================
// PROVIDER
// =============================================================================

/** The abstraction layer over cloud APIs. */
export interface FireflyProvider {
	/** The provider identifier. */
	readonly name: FireflyProviderName;

	/** Create a new server instance. */
	provision(config: ServerConfig): Promise<ServerInstance>;

	/** Wait for a provisioned server to become ready. */
	waitForReady(instance: ServerInstance, timeoutMs: number): Promise<boolean>;

	/** Terminate a server and release all resources. */
	terminate(instance: ServerInstance): Promise<void>;

	/** List all active instances managed by this provider. */
	listActive(tags?: string[]): Promise<ServerInstance[]>;
}

/** Configuration for constructing a provider. */
export interface ProviderConfig {
	/** API token for the provider */
	token: string;
	/** Default region when not specified per-ignite */
	defaultRegion?: string;
	/** Default server size when not specified per-ignite */
	defaultSize?: string;
}

/** Hetzner-specific provider configuration. */
export interface HetznerProviderConfig extends ProviderConfig {
	/** SSH key names registered in Hetzner */
	sshKeyIds?: string[];
	/** Label selector prefix for organizing servers */
	labelPrefix?: string;
}

/** Fly.io-specific provider configuration. */
export interface FlyProviderConfig extends ProviderConfig {
	/** Fly.io organization slug */
	org: string;
	/** Fly app name to create machines in */
	app?: string;
}

// =============================================================================
// STATE STORE
// =============================================================================

/** Persistence layer for tracking Firefly instances and sessions. */
export interface FireflyStateStore {
	/** Initialize schema (idempotent). */
	initialize(): void | Promise<void>;

	/** Save a new instance record. */
	saveInstance(instance: ServerInstance): void | Promise<void>;

	/** Update instance status. */
	updateStatus(instanceId: string, status: ServerStatus): void | Promise<void>;

	/** Update instance IP after provisioning. */
	updateIp(instanceId: string, publicIp: string): void | Promise<void>;

	/** Get an instance by SDK ID. */
	getInstance(instanceId: string): ServerInstance | null | Promise<ServerInstance | null>;

	/** Get all active (non-terminated) instances. */
	getActiveInstances(): ServerInstance[] | Promise<ServerInstance[]>;

	/** Log a completed session for billing/analytics. */
	logSession(session: FireflySession): void | Promise<void>;

	/** Get recent sessions. */
	getRecentSessions(limit: number): FireflySession[] | Promise<FireflySession[]>;
}

// =============================================================================
// SESSION TRACKING
// =============================================================================

/** A completed session record for billing and analytics. */
export interface FireflySession {
	id: string;
	instanceId: string;
	consumer: string;
	provider: FireflyProviderName;
	size?: string;
	region?: string;
	startedAt: number;
	endedAt?: number;
	durationSec?: number;
	cost?: number;
	status: "completed" | "failed" | "orphaned";
}

// =============================================================================
// STATE SYNCHRONIZATION
// =============================================================================

/** Handles persisting server state to durable storage and restoring it on ignite. */
export interface StateSynchronizer {
	/** Pull state from storage to server. */
	hydrate(instance: ServerInstance, stateKey: string): Promise<void>;

	/** Push state from server to storage. */
	persist(instance: ServerInstance, stateKey: string): Promise<void>;

	/** Check for state conflicts before hydration. */
	checkConflicts(stateKey: string): Promise<ConflictResult>;
}

/** Result of a conflict check. */
export interface ConflictResult {
	hasConflict: boolean;
	localVersion?: string;
	remoteVersion?: string;
	resolution?: "use_local" | "use_remote" | "manual";
}

/** Configuration for state synchronization. */
export interface StateSyncConfig {
	synchronizer: StateSynchronizer;
	/** Sync after each activity report */
	syncOnActivity?: boolean;
	/** Periodic sync interval (ms) */
	syncInterval?: number;
}

// =============================================================================
// IDLE DETECTION
// =============================================================================

/** Monitors server activity and triggers fade when idle. */
export interface IdleDetector {
	/** Start monitoring for idle state. */
	startMonitoring(instanceId: string, config: IdleConfig): void;

	/** Manually report activity (resets idle timer). */
	reportActivity(instanceId: string): void;

	/** Check current idle duration (ms). */
	getIdleDuration(instanceId: string): number;

	/** Stop monitoring for an instance. */
	stopMonitoring(instanceId: string): void;

	/** Register callback for idle threshold reached. */
	onIdleThreshold(callback: (instanceId: string) => void): void;
}

/** Configuration for idle detection. */
export interface IdleConfig {
	/** How often to check (ms). Default: 30_000 */
	checkInterval: number;
	/** How long before considered idle (ms). Default: 300_000 */
	idleThreshold: number;
	/** Activity signals to monitor */
	activitySignals: ActivitySignal[];
	/** Warn before fade (ms before threshold). Optional. */
	warningAt?: number;
}

/** Types of activity signals that reset the idle timer. */
export type ActivitySignal =
	| "ssh_session_active"
	| "process_cpu_above_threshold"
	| "network_traffic"
	| "player_connected"
	| "agent_task_running"
	| "ci_job_running";

// =============================================================================
// REMOTE EXECUTION
// =============================================================================

/** Interface for executing commands on provisioned servers. */
export interface RemoteExecutor {
	/** Execute a command on a server. */
	execute(instance: ServerInstance, command: string): Promise<ExecutionResult>;

	/** Check if the executor can reach the server. */
	isReachable(instance: ServerInstance): Promise<boolean>;
}

/** Result of a remote command execution. */
export interface ExecutionResult {
	exitCode: number;
	stdout: string;
	stderr: string;
}

// =============================================================================
// EVENTS
// =============================================================================

/** Structured event emitted by the SDK for observability. */
export interface FireflyEvent {
	type:
		| "ignite"
		| "ready"
		| "fade"
		| "orphan_detected"
		| "orphan_terminated"
		| "idle_warning"
		| "idle_triggered"
		| "sync_started"
		| "sync_completed"
		| "sync_failed"
		| "error";
	instanceId?: string;
	provider?: FireflyProviderName;
	consumer?: string;
	timestamp: number;
	durationMs?: number;
	metadata?: Record<string, unknown>;
}

/** Callback type for event listeners. */
export type FireflyEventHandler = (event: FireflyEvent) => void;

// =============================================================================
// TRIGGER
// =============================================================================

/** What initiates the Firefly lifecycle. Consumers define their own trigger logic. */
export interface FireflyTrigger {
	type: "webhook" | "schedule" | "queue" | "manual";
	/** Where the trigger originated */
	source: string;
	/** Trigger-specific data */
	metadata: Record<string, unknown>;
	priority?: "low" | "normal" | "high";
	/** Max session duration (ms) */
	timeout?: number;
}

// =============================================================================
// TOP-LEVEL CONFIG
// =============================================================================

/** Top-level configuration for a Firefly orchestrator instance. */
export interface FireflyConfig {
	/** The cloud provider to use */
	provider: FireflyProvider;
	/** Optional state store (defaults to MemoryFireflyStore) */
	store?: FireflyStateStore;
	/** Optional state synchronization (R2, etc.) */
	sync?: StateSyncConfig;
	/** Optional idle detection configuration */
	idle?: IdleConfig;
	/** Default max session duration (ms), overridable per-ignite */
	maxLifetime?: number;
	/** Default tags applied to all instances */
	tags?: string[];
	/** Consumer name for session logging */
	consumer?: string;
	/** Callback after successful ignite */
	onIgnite?: (instance: ServerInstance) => Promise<void>;
	/** Callback after successful fade */
	onFade?: (instance: ServerInstance) => Promise<void>;
	/** Callback when an orphan is detected */
	onOrphanFound?: (instance: ServerInstance) => Promise<void>;
	/** Event handler for observability */
	onEvent?: FireflyEventHandler;
}

/** Options for a single ignite call (overrides defaults). */
export interface IgniteOptions {
	/** Server size override */
	size?: string;
	/** Region override */
	region?: string;
	/** OS image override */
	image?: string;
	/** Cloud-init data */
	userData?: string;
	/** SSH key IDs */
	sshKeys?: string[];
	/** Instance-specific tags (merged with defaults) */
	tags?: string[];
	/** Max lifetime override (ms) */
	maxLifetime?: number;
	/** Instance metadata */
	metadata?: Record<string, unknown>;
	/** State key for R2 sync */
	stateKey?: string;
	/** Provider-specific options */
	providerOptions?: Record<string, unknown>;
}

// =============================================================================
// CONSUMER PRESETS
// =============================================================================

/** A preset configuration for a specific consumer workload. */
export interface ConsumerPreset {
	/** Consumer name */
	name: string;
	/** Default server size */
	defaultSize: string;
	/** Default region */
	defaultRegion: string;
	/** Default image */
	defaultImage: string;
	/** Idle detection configuration */
	idle: IdleConfig;
	/** Max session lifetime (ms) */
	maxLifetime: number;
	/** Default tags */
	tags: string[];
}
