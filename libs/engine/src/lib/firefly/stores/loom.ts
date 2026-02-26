/**
 * Firefly SDK — Loom State Store
 *
 * Wraps SqlHelper from the Loom DO framework for Durable Object consumers.
 * Queen DO passes `this.sql` and gets zero-network-hop state persistence
 * in DO-local SQLite.
 *
 * @module @autumnsgrove/lattice/firefly
 */

import type { SqlHelper } from "../../loom/storage.js";
import type { FireflyStateStore, ServerInstance, ServerStatus, FireflySession } from "../types.js";

export class LoomFireflyStore implements FireflyStateStore {
	private readonly sql: SqlHelper;

	constructor(sql: SqlHelper) {
		this.sql = sql;
	}

	initialize(): void {
		this.sql.exec(`
			CREATE TABLE IF NOT EXISTS firefly_instances (
				id TEXT PRIMARY KEY,
				provider_server_id TEXT NOT NULL,
				provider TEXT NOT NULL,
				public_ip TEXT,
				status TEXT NOT NULL DEFAULT 'provisioning',
				created_at INTEGER NOT NULL,
				metadata TEXT DEFAULT '{}'
			)
		`);

		this.sql.exec(`
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
		`);
	}

	saveInstance(instance: ServerInstance): void {
		this.sql.exec(
			`INSERT OR REPLACE INTO firefly_instances
			 (id, provider_server_id, provider, public_ip, status, created_at, metadata)
			 VALUES (?, ?, ?, ?, ?, ?, ?)`,
			instance.id,
			instance.providerServerId,
			instance.provider,
			instance.publicIp,
			instance.status,
			instance.createdAt,
			JSON.stringify(instance.metadata),
		);
	}

	updateStatus(instanceId: string, status: ServerStatus): void {
		this.sql.exec(`UPDATE firefly_instances SET status = ? WHERE id = ?`, status, instanceId);
	}

	updateIp(instanceId: string, publicIp: string): void {
		this.sql.exec(`UPDATE firefly_instances SET public_ip = ? WHERE id = ?`, publicIp, instanceId);
	}

	getInstance(instanceId: string): ServerInstance | null {
		const row = this.sql.queryOne<{
			id: string;
			provider_server_id: string;
			provider: string;
			public_ip: string;
			status: string;
			created_at: number;
			metadata: string;
		}>(`SELECT * FROM firefly_instances WHERE id = ?`, instanceId);

		if (!row) return null;
		return this.rowToInstance(row);
	}

	getActiveInstances(): ServerInstance[] {
		const rows = this.sql.queryAll<{
			id: string;
			provider_server_id: string;
			provider: string;
			public_ip: string;
			status: string;
			created_at: number;
			metadata: string;
		}>(`SELECT * FROM firefly_instances WHERE status != 'terminated'`);

		return rows.map((row) => this.rowToInstance(row));
	}

	logSession(session: FireflySession): void {
		this.sql.exec(
			`INSERT INTO firefly_sessions
			 (id, instance_id, consumer, provider, size, region, started_at, ended_at, duration_sec, cost, status)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
		);
	}

	getRecentSessions(limit: number): FireflySession[] {
		return this.sql
			.queryAll<{
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
			}>(`SELECT * FROM firefly_sessions ORDER BY started_at DESC LIMIT ?`, limit)
			.map((row) => ({
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
