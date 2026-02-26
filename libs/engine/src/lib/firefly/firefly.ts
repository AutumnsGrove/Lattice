/**
 * Firefly SDK — Core Orchestrator
 *
 * A brief light in the darkness. It appears, does its work, and fades away.
 *
 * The Firefly class composes a provider, state store, sync layer, and idle
 * detector into the three-phase lifecycle: ignite → illuminate → fade.
 *
 * @module @autumnsgrove/lattice/firefly
 */

import type {
	FireflyConfig,
	FireflyProvider,
	FireflyStateStore,
	FireflyEvent,
	FireflyEventHandler,
	FireflySession,
	IdleConfig,
	IdleDetector,
	IgniteOptions,
	ServerConfig,
	ServerInstance,
	StateSyncConfig,
} from "./types.js";
import { FireflyError, FLY_ERRORS } from "./errors.js";
import { MemoryFireflyStore } from "./stores/memory.js";
import { FireflyIdleDetector } from "./idle/detector.js";

export class Firefly {
	private readonly provider: FireflyProvider;
	private readonly store: FireflyStateStore;
	private readonly sync?: StateSyncConfig;
	private readonly idle?: IdleDetector;
	private readonly idleConfig?: IdleConfig;
	private readonly maxLifetime?: number;
	private readonly readyTimeout: number;
	private readonly defaultTags: string[];
	private readonly consumer: string;
	private readonly onIgnite?: (instance: ServerInstance) => Promise<void>;
	private readonly onFade?: (instance: ServerInstance) => Promise<void>;
	private readonly onOrphanFound?: (instance: ServerInstance) => Promise<void>;
	private readonly onEvent?: FireflyEventHandler;

	constructor(config: FireflyConfig) {
		this.provider = config.provider;
		this.store = config.store ?? new MemoryFireflyStore();
		this.sync = config.sync;
		this.maxLifetime = config.maxLifetime;
		this.readyTimeout = config.readyTimeout ?? 300_000; // 5 min default
		this.defaultTags = config.tags ?? [];
		this.consumer = config.consumer ?? "unknown";
		this.onIgnite = config.onIgnite;
		this.onFade = config.onFade;
		this.onOrphanFound = config.onOrphanFound;
		this.onEvent = config.onEvent;

		if (config.idle) {
			this.idleConfig = config.idle;
			const detector = new FireflyIdleDetector();
			detector.onIdleThreshold((instanceId) => {
				this.handleIdleThreshold(instanceId);
			});
			this.idle = detector;
		}
	}

	// ─── Lifecycle ───────────────────────────────────────────────

	/**
	 * Ignite — Phase 1: Provision a server and prepare it for work.
	 *
	 * 1. provider.provision(config)     → create server
	 * 2. store.saveInstance(instance)    → persist state
	 * 3. provider.waitForReady(timeout)  → poll until ready
	 * 4. sync?.hydrate(instance, key)    → restore state from R2
	 * 5. store.updateStatus("running")   → mark active
	 * 6. idle?.startMonitoring()         → begin idle detection
	 * 7. config.onIgnite?.(instance)     → consumer callback
	 * 8. emit FireflyEvent("ignite")     → observability
	 */
	async ignite(options: IgniteOptions = {}): Promise<ServerInstance> {
		const startTime = Date.now();

		const serverConfig: ServerConfig = {
			provider: this.provider.name,
			size: options.size ?? "",
			region: options.region ?? "",
			image: options.image ?? "",
			userData: options.userData,
			sshKeys: options.sshKeys,
			tags: [...this.defaultTags, ...(options.tags ?? [])],
			maxLifetime: options.maxLifetime ?? this.maxLifetime,
			providerOptions: options.providerOptions,
		};

		// 1. Provision
		let instance: ServerInstance;
		try {
			instance = await this.provider.provision(serverConfig);
		} catch (err) {
			this.emit({
				type: "error",
				provider: this.provider.name,
				consumer: this.consumer,
				timestamp: Date.now(),
				metadata: {
					phase: "ignite",
					error: err instanceof Error ? err.message : String(err),
				},
			});
			throw err;
		}

		// Merge consumer metadata
		if (options.metadata) {
			instance.metadata = { ...instance.metadata, ...options.metadata };
		}

		// 2. Persist state
		try {
			await this.store.saveInstance(instance);
		} catch (err) {
			// Best-effort: try to terminate the orphaned server
			try {
				await this.provider.terminate(instance);
			} catch {
				// Ignore cleanup failure
			}
			throw new FireflyError(
				FLY_ERRORS.STORE_WRITE_FAILED,
				err instanceof Error ? err.message : String(err),
			);
		}

		// 3. Wait for ready (separate from maxLifetime — a 5min boot timeout
		// is very different from a 12hr session cap)
		const readyTimeoutMs = options.readyTimeout ?? this.readyTimeout;
		const ready = await this.provider.waitForReady(instance, readyTimeoutMs);
		if (!ready) {
			await this.store.updateStatus(instance.id, "terminated");
			try {
				await this.provider.terminate(instance);
			} catch {
				// Ignore cleanup failure
			}
			throw new FireflyError(FLY_ERRORS.READY_TIMEOUT);
		}

		// 4. State hydration
		if (this.sync?.synchronizer && options.stateKey) {
			try {
				await this.sync.synchronizer.hydrate(instance, options.stateKey);
				this.emit({
					type: "sync_completed",
					instanceId: instance.id,
					provider: this.provider.name,
					consumer: this.consumer,
					timestamp: Date.now(),
					metadata: { direction: "hydrate", stateKey: options.stateKey },
				});
			} catch (err) {
				this.emit({
					type: "sync_failed",
					instanceId: instance.id,
					provider: this.provider.name,
					consumer: this.consumer,
					timestamp: Date.now(),
					metadata: {
						direction: "hydrate",
						error: err instanceof Error ? err.message : String(err),
					},
				});
				// Non-fatal: server is still usable without state
			}
		}

		// 5. Mark running
		await this.store.updateStatus(instance.id, "running");
		instance.status = "running";

		// 6. Start idle detection
		if (this.idle && this.idleConfig) {
			this.idle.startMonitoring(instance.id, this.idleConfig);
		}

		// 7. Consumer callback
		if (this.onIgnite) {
			await this.onIgnite(instance);
		}

		// 8. Emit event
		this.emit({
			type: "ignite",
			instanceId: instance.id,
			provider: this.provider.name,
			consumer: this.consumer,
			timestamp: Date.now(),
			durationMs: Date.now() - startTime,
			metadata: {
				size: serverConfig.size,
				region: serverConfig.region,
				publicIp: instance.publicIp,
			},
		});

		return instance;
	}

	/**
	 * Fade — Phase 3: Gracefully shut down a server.
	 *
	 * 1. idle?.stopMonitoring()          → stop idle checks
	 * 2. sync?.persist(instance, key)    → final state save to R2
	 * 3. provider.terminate(instance)    → delete server
	 * 4. store.updateStatus("terminated")
	 * 5. store.logSession(session)       → record with duration, cost
	 * 6. config.onFade?.(instance)       → consumer callback
	 * 7. emit FireflyEvent("fade")       → observability
	 */
	async fade(instanceId: string, options?: { stateKey?: string }): Promise<void> {
		const startTime = Date.now();

		const instance = await this.store.getInstance(instanceId);
		if (!instance) {
			throw new FireflyError(FLY_ERRORS.INSTANCE_NOT_FOUND);
		}

		if (instance.status === "terminated") {
			return; // Already faded
		}

		// Mark terminating
		await this.store.updateStatus(instanceId, "terminating");

		// 1. Stop idle detection
		if (this.idle) {
			this.idle.stopMonitoring(instanceId);
		}

		// 2. Final state sync
		if (this.sync?.synchronizer && options?.stateKey) {
			try {
				this.emit({
					type: "sync_started",
					instanceId,
					provider: this.provider.name,
					consumer: this.consumer,
					timestamp: Date.now(),
					metadata: { direction: "persist", stateKey: options.stateKey },
				});
				await this.sync.synchronizer.persist(instance, options.stateKey);
				this.emit({
					type: "sync_completed",
					instanceId,
					provider: this.provider.name,
					consumer: this.consumer,
					timestamp: Date.now(),
					metadata: { direction: "persist", stateKey: options.stateKey },
				});
			} catch (err) {
				this.emit({
					type: "sync_failed",
					instanceId,
					provider: this.provider.name,
					consumer: this.consumer,
					timestamp: Date.now(),
					metadata: {
						direction: "persist",
						error: err instanceof Error ? err.message : String(err),
					},
				});
				// Non-fatal: we still need to terminate
			}
		}

		// 3. Terminate
		try {
			await this.provider.terminate(instance);
		} catch (err) {
			this.emit({
				type: "error",
				instanceId,
				provider: this.provider.name,
				consumer: this.consumer,
				timestamp: Date.now(),
				metadata: {
					phase: "fade",
					error: err instanceof Error ? err.message : String(err),
				},
			});
			throw err;
		}

		// 4. Mark terminated
		await this.store.updateStatus(instanceId, "terminated");

		// 5. Log session
		const durationSec = Math.floor((Date.now() - instance.createdAt) / 1000);
		const session: FireflySession = {
			id: crypto.randomUUID(),
			instanceId: instance.id,
			consumer: this.consumer,
			provider: instance.provider,
			size: instance.metadata.size as string | undefined,
			region: instance.metadata.region as string | undefined,
			startedAt: instance.createdAt,
			endedAt: Date.now(),
			durationSec,
			status: "completed",
		};
		await this.store.logSession(session);

		// 6. Consumer callback
		if (this.onFade) {
			await this.onFade(instance);
		}

		// 7. Emit event
		this.emit({
			type: "fade",
			instanceId,
			provider: this.provider.name,
			consumer: this.consumer,
			timestamp: Date.now(),
			durationMs: Date.now() - startTime,
			metadata: { sessionDurationSec: durationSec },
		});
	}

	// ─── Orphan Detection ────────────────────────────────────────

	/**
	 * Sweep for orphaned instances — running servers with no
	 * corresponding state store entry.
	 */
	async sweepOrphans(tags?: string[]): Promise<ServerInstance[]> {
		const cloudInstances = await this.provider.listActive(tags);
		const tracked = await this.store.getActiveInstances();
		const trackedIds = new Set(tracked.map((t) => t.providerServerId));

		const orphans: ServerInstance[] = [];
		for (const cloud of cloudInstances) {
			if (!trackedIds.has(cloud.providerServerId)) {
				orphans.push(cloud);
				this.emit({
					type: "orphan_detected",
					instanceId: cloud.id,
					provider: this.provider.name,
					consumer: this.consumer,
					timestamp: Date.now(),
					metadata: { providerServerId: cloud.providerServerId },
				});

				if (this.onOrphanFound) {
					await this.onOrphanFound(cloud);
				}

				// Terminate orphan
				try {
					await this.provider.terminate(cloud);
					this.emit({
						type: "orphan_terminated",
						instanceId: cloud.id,
						provider: this.provider.name,
						consumer: this.consumer,
						timestamp: Date.now(),
					});
				} catch {
					// Log but don't throw — continue sweeping
				}
			}
		}

		return orphans;
	}

	// ─── Activity Reporting ──────────────────────────────────────

	/** Report activity on an instance (resets idle timer). */
	reportActivity(instanceId: string): void {
		if (this.idle) {
			this.idle.reportActivity(instanceId);
		}
	}

	/** Get idle duration for an instance (ms). */
	getIdleDuration(instanceId: string): number {
		if (!this.idle) return 0;
		return this.idle.getIdleDuration(instanceId);
	}

	// ─── State Access ────────────────────────────────────────────

	/** Get an instance by ID. */
	async getInstance(instanceId: string): Promise<ServerInstance | null> {
		return this.store.getInstance(instanceId);
	}

	/** Get all active instances. */
	async getActiveInstances(): Promise<ServerInstance[]> {
		return this.store.getActiveInstances();
	}

	/** Get recent sessions. */
	async getRecentSessions(limit = 10): Promise<FireflySession[]> {
		return this.store.getRecentSessions(limit);
	}

	// ─── Private ─────────────────────────────────────────────────

	private handleIdleThreshold(instanceId: string): void {
		this.emit({
			type: "idle_triggered",
			instanceId,
			provider: this.provider.name,
			consumer: this.consumer,
			timestamp: Date.now(),
		});

		// Auto-fade on idle
		this.fade(instanceId).catch(() => {
			// Fade failure already emits an error event
		});
	}

	private emit(event: FireflyEvent): void {
		if (this.onEvent) {
			try {
				this.onEvent(event);
			} catch {
				// Never let event handler errors bubble up
			}
		}
	}
}

/**
 * Factory function for creating a Firefly orchestrator.
 * Convenience wrapper for `new Firefly(config)`.
 */
export function createFirefly(config: FireflyConfig): Firefly {
	return new Firefly(config);
}
