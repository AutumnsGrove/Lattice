/**
 * Firefly SDK — Ephemeral Server Provisioning
 *
 * A brief light in the darkness. It appears, does its work, and fades away.
 *
 * Core barrel export. Consumers import from @autumnsgrove/lattice/firefly.
 *
 * @example
 * ```typescript
 * import { Firefly, HetznerProvider, MemoryFireflyStore } from '@autumnsgrove/lattice/firefly';
 *
 * const firefly = new Firefly({
 *   provider: new HetznerProvider({ token: env.HETZNER_TOKEN }),
 *   idle: { checkInterval: 30_000, idleThreshold: 300_000, activitySignals: ['ci_job_running'] },
 * });
 *
 * const instance = await firefly.ignite({ size: 'cx22', region: 'fsn1', image: 'ubuntu-24.04' });
 * // ... work happens ...
 * await firefly.fade(instance.id);
 * ```
 *
 * @module @autumnsgrove/lattice/firefly
 */

// ─── Core Types ──────────────────────────────────────────────
export type {
	FireflyProviderName,
	ServerConfig,
	ServerInstance,
	ServerStatus,
	FireflyProvider,
	ProviderConfig,
	HetznerProviderConfig,
	FlyProviderConfig,
	FireflyStateStore,
	FireflySession,
	StateSynchronizer,
	ConflictResult,
	StateSyncConfig,
	IdleDetector,
	IdleConfig,
	ActivitySignal,
	RemoteExecutor,
	ExecutionResult,
	FireflyEvent,
	FireflyEventHandler,
	FireflyTrigger,
	FireflyConfig,
	IgniteOptions,
	ConsumerPreset,
} from "./types.js";

// ─── Orchestrator ────────────────────────────────────────────
export { Firefly, createFirefly } from "./firefly.js";

// ─── Errors ──────────────────────────────────────────────────
export { FLY_ERRORS, FireflyError } from "./errors.js";
export type { FireflyErrorKey } from "./errors.js";

// ─── Providers ───────────────────────────────────────────────
export { FireflyProviderBase } from "./providers/base.js";
export { HetznerProvider } from "./providers/hetzner.js";
export { FlyProvider } from "./providers/fly.js";
export { RailwayProvider } from "./providers/railway.js";
export { DigitalOceanProvider } from "./providers/digitalocean.js";

// ─── State Stores ────────────────────────────────────────────
export { MemoryFireflyStore } from "./stores/memory.js";
export { LoomFireflyStore } from "./stores/loom.js";
export { D1FireflyStore } from "./stores/d1.js";

// ─── Sync ────────────────────────────────────────────────────
export { R2StateSynchronizer } from "./sync/r2-sync.js";
export type { R2SyncConfig } from "./sync/r2-sync.js";

// ─── Idle Detection ──────────────────────────────────────────
export { FireflyIdleDetector } from "./idle/detector.js";

// ─── Executors ───────────────────────────────────────────────
export { WebhookExecutor } from "./executors/webhook.js";
export type { WebhookExecutorConfig } from "./executors/webhook.js";
export { SSHExecutor } from "./executors/ssh.js";

// ─── Consumer Presets ────────────────────────────────────────
export { QUEEN_CI_DEFAULTS } from "./consumers/queen-ci.js";
export { LOFT_DEFAULTS } from "./consumers/loft.js";
export { OUTPOST_DEFAULTS } from "./consumers/outpost.js";
