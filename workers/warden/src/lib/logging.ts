/**
 * Audit Logging
 *
 * Writes to warden_audit_log in D1. Column names are aligned with
 * the Vista warden-aggregator so the dashboard auto-populates.
 */

import type { GroveDatabase } from "@autumnsgrove/infra";
import type { AuditLogEntry } from "../types";

/** Write an audit log entry to D1 */
export async function logAuditEvent(
	db: GroveDatabase,
	entry: Omit<AuditLogEntry, "id" | "created_at">,
): Promise<void> {
	try {
		await db.execute(
			`INSERT INTO warden_audit_log
			(agent_id, agent_name, target_service, action, auth_method, auth_result, event_type, tenant_id, latency_ms, error_code)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			[
				entry.agent_id,
				entry.agent_name,
				entry.target_service,
				entry.action,
				entry.auth_method,
				entry.auth_result,
				entry.event_type,
				entry.tenant_id,
				entry.latency_ms,
				entry.error_code,
			],
		);
	} catch (err) {
		// Audit logging should never break the request flow
		console.error("[Warden] Audit log write failed:", err);
	}
}

/** Update agent usage stats (last_used_at, request_count) */
export async function updateAgentUsage(db: GroveDatabase, agentId: string): Promise<void> {
	try {
		await db.execute(
			`UPDATE warden_agents
			SET last_used_at = datetime('now'), request_count = request_count + 1
			WHERE id = ?`,
			[agentId],
		);
	} catch (err) {
		console.error("[Warden] Agent usage update failed:", err);
	}
}
