/**
 * Firefly SDK — Idle Detector
 *
 * Timer-based, Map-backed idle tracking. Monitors server activity
 * and triggers a callback when the idle threshold is reached.
 * Consumers report activity via reportActivity() to reset the timer.
 *
 * @module @autumnsgrove/lattice/firefly
 */

import type { IdleConfig, IdleDetector } from "../types.js";

interface IdleEntry {
	lastActivity: number;
	config: IdleConfig;
	intervalId: ReturnType<typeof setInterval> | null;
	warned: boolean;
}

export class FireflyIdleDetector implements IdleDetector {
	private entries = new Map<string, IdleEntry>();
	private callbacks: Array<(instanceId: string) => void> = [];
	private warningCallbacks: Array<(instanceId: string) => void> = [];

	startMonitoring(instanceId: string, config: IdleConfig): void {
		// Clear any existing monitoring for this instance
		this.stopMonitoring(instanceId);

		const entry: IdleEntry = {
			lastActivity: Date.now(),
			config,
			intervalId: null,
			warned: false,
		};

		// Guard: setInterval is only available in Durable Objects, not standard Workers.
		// In standard Workers, idle detection must be driven externally (e.g., via alarm()).
		if (typeof setInterval === "undefined") {
			console.warn(
				"[Firefly] setInterval not available — idle detection requires a Durable Object runtime.",
			);
			this.entries.set(instanceId, entry);
			return;
		}

		entry.intervalId = setInterval(() => {
			this.check(instanceId);
		}, config.checkInterval);

		this.entries.set(instanceId, entry);
	}

	reportActivity(instanceId: string): void {
		const entry = this.entries.get(instanceId);
		if (entry) {
			entry.lastActivity = Date.now();
			entry.warned = false;
		}
	}

	getIdleDuration(instanceId: string): number {
		const entry = this.entries.get(instanceId);
		if (!entry) return 0;
		return Date.now() - entry.lastActivity;
	}

	stopMonitoring(instanceId: string): void {
		const entry = this.entries.get(instanceId);
		if (entry?.intervalId) {
			clearInterval(entry.intervalId);
		}
		this.entries.delete(instanceId);
	}

	onIdleThreshold(callback: (instanceId: string) => void): void {
		this.callbacks.push(callback);
	}

	/** Register callback for idle warning (before threshold). */
	onIdleWarning(callback: (instanceId: string) => void): void {
		this.warningCallbacks.push(callback);
	}

	/** Stop all monitoring (cleanup). */
	destroy(): void {
		for (const [id] of this.entries) {
			this.stopMonitoring(id);
		}
		this.callbacks = [];
		this.warningCallbacks = [];
	}

	private check(instanceId: string): void {
		const entry = this.entries.get(instanceId);
		if (!entry) return;

		const idle = Date.now() - entry.lastActivity;

		// Warning check
		if (entry.config.warningAt && !entry.warned && idle >= entry.config.warningAt) {
			entry.warned = true;
			for (const cb of this.warningCallbacks) {
				try {
					cb(instanceId);
				} catch {
					// Never let callback errors break the detector
				}
			}
		}

		// Threshold check
		if (idle >= entry.config.idleThreshold) {
			this.stopMonitoring(instanceId);
			for (const cb of this.callbacks) {
				try {
					cb(instanceId);
				} catch {
					// Never let callback errors break the detector
				}
			}
		}
	}
}
