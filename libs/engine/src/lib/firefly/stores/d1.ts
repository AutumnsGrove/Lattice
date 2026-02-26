/**
 * Firefly SDK — D1 State Store
 *
 * For standalone Workers that don't run inside a Durable Object.
 * Uses D1 prepared statements instead of DO SQLite.
 *
 * @module @autumnsgrove/lattice/firefly
 */

import type { FireflyStateStore, ServerInstance, ServerStatus, FireflySession } from "../types.js";

export class D1FireflyStore implements FireflyStateStore {
	private readonly db: D1Database;

	constructor(db: D1Database) {
		this.db = db;
	}

	async initialize(): Promise<void> {
		await this.db.batch([
			this.db.prepare(`
				CREATE TABLE IF NOT EXISTS firefly_instances (
					id TEXT PRIMARY KEY,
					provider_server_id TEXT NOT NULL,
					provider TEXT NOT NULL,
					public_ip TEXT,
					status TEXT NOT NULL DEFAULT 'provisioning',
					created_at INTEGER NOT NULL,
					metadata TEXT DEFAULT '{}'
				)
			`),
			this.db.prepare(`
				CREATE TABLE IF NOT EXISTS firefly_sessions (
					id TEXT PRIMARY KEY,
					instance_id TEXT NOT NULL,
					consumer TEXT NOT NULL,
					provider TEXT NOT NULL,
					size TEXT,
					region TEXT,
					started_at INTEGER NOT NULL,
					ended_at INTEGER,
					duration_sec INTEGER,
					cost REAL,
					status TEXT NOT NULL
				)
			`),
		]);
	}

	async saveInstance(instance: ServerInstance): Promise<void> {
		await this.db
			.prepare(
				`INSERT OR REPLACE INTO firefly_instances
				 (id, provider_server_id, provider, public_ip, status, created_at, metadata)
				 VALUES (?, ?, ?, ?, ?, ?, ?)`,
			)
			.bind(
				instance.id,
				instance.providerServerId,
				instance.provider,
				instance.publicIp,
				instance.status,
				instance.createdAt,
				JSON.stringify(instance.metadata),
			)
			.run();
	}

	async updateStatus(instanceId: string, status: ServerStatus): Promise<void> {
		await this.db
			.prepare(`UPDATE firefly_instances SET status = ? WHERE id = ?`)
			.bind(status, instanceId)
			.run();
	}

	async updateIp(instanceId: string, publicIp: string): Promise<void> {
		await this.db
			.prepare(`UPDATE firefly_instances SET public_ip = ? WHERE id = ?`)
			.bind(publicIp, instanceId)
			.run();
	}

	async getInstance(instanceId: string): Promise<ServerInstance | null> {
		const row = await this.db
			.prepare(`SELECT * FROM firefly_instances WHERE id = ?`)
			.bind(instanceId)
			.first<{
				id: string;
				provider_server_id: string;
				provider: string;
				public_ip: string;
				status: string;
				created_at: number;
				metadata: string;
			}>();

		if (!row) return null;
		return this.rowToInstance(row);
	}

	async getActiveInstances(): Promise<ServerInstance[]> {
		const result = await this.db
			.prepare(`SELECT * FROM firefly_instances WHERE status != 'terminated'`)
			.all<{
				id: string;
				provider_server_id: string;
				provider: string;
				public_ip: string;
				status: string;
				created_at: number;
				metadata: string;
			}>();

		return (result.results ?? []).map((row) => this.rowToInstance(row));
	}

	async logSession(session: FireflySession): Promise<void> {
		await this.db
			.prepare(
				`INSERT INTO firefly_sessions
				 (id, instance_id, consumer, provider, size, region, started_at, ended_at, duration_sec, cost, status)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			)
			.bind(
				session.id,
				session.instanceId,
				session.consumer,
				session.provider,
				session.size ?? null,
				session.region ?? null,
				session.startedAt,
				session.endedAt ?? null,
				session.durationSec ?? null,
				session.cost ?? null,
				session.status,
			)
			.run();
	}

	async getRecentSessions(limit: number): Promise<FireflySession[]> {
		const result = await this.db
			.prepare(`SELECT * FROM firefly_sessions ORDER BY started_at DESC LIMIT ?`)
			.bind(limit)
			.all<{
				id: string;
				instance_id: string;
				consumer: string;
				provider: string;
				size: string | null;
				region: string | null;
				started_at: number;
				ended_at: number | null;
				duration_sec: number | null;
				cost: number | null;
				status: string;
			}>();

		return (result.results ?? []).map((row) => ({
			id: row.id,
			instanceId: row.instance_id,
			consumer: row.consumer,
			provider: row.provider as ServerInstance["provider"],
			size: row.size ?? undefined,
			region: row.region ?? undefined,
			startedAt: row.started_at,
			endedAt: row.ended_at ?? undefined,
			durationSec: row.duration_sec ?? undefined,
			cost: row.cost ?? undefined,
			status: row.status as FireflySession["status"],
		}));
	}

	private rowToInstance(row: {
		id: string;
		provider_server_id: string;
		provider: string;
		public_ip: string;
		status: string;
		created_at: number;
		metadata: string;
	}): ServerInstance {
		let metadata: Record<string, unknown> = {};
		try {
			metadata = JSON.parse(row.metadata);
		} catch {
			// Fallback to empty metadata
		}

		return {
			id: row.id,
			providerServerId: row.provider_server_id,
			provider: row.provider as ServerInstance["provider"],
			publicIp: row.public_ip,
			status: row.status as ServerInstance["status"],
			createdAt: row.created_at,
			metadata,
		};
	}
}
