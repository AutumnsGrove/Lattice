/**
 * Firefly SDK — Memory State Store
 *
 * Map-based in-memory store. Default fallback when no persistent
 * store is configured. Useful for testing and short-lived Workers
 * where state doesn't need to survive restarts.
 *
 * @module @autumnsgrove/lattice/firefly
 */

import type { FireflyStateStore, ServerInstance, ServerStatus, FireflySession } from "../types.js";

export class MemoryFireflyStore implements FireflyStateStore {
	private instances = new Map<string, ServerInstance>();
	private sessions: FireflySession[] = [];

	initialize(): void {
		// No-op for memory store
	}

	saveInstance(instance: ServerInstance): void {
		this.instances.set(instance.id, { ...instance });
	}

	updateStatus(instanceId: string, status: ServerStatus): void {
		const instance = this.instances.get(instanceId);
		if (instance) {
			instance.status = status;
		}
	}

	updateIp(instanceId: string, publicIp: string): void {
		const instance = this.instances.get(instanceId);
		if (instance) {
			instance.publicIp = publicIp;
		}
	}

	getInstance(instanceId: string): ServerInstance | null {
		return this.instances.get(instanceId) ?? null;
	}

	getActiveInstances(): ServerInstance[] {
		return Array.from(this.instances.values()).filter((i) => i.status !== "terminated");
	}

	logSession(session: FireflySession): void {
		this.sessions.push({ ...session });
	}

	getRecentSessions(limit: number): FireflySession[] {
		return this.sessions.slice(-limit).reverse();
	}
}
