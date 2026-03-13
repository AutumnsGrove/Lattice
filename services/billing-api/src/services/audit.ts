/**
 * Billing Audit Logging
 *
 * Non-blocking audit log entries for billing actions.
 * Adapted from libs/engine/src/lib/server/billing.ts logBillingAudit().
 */

// =============================================================================
// TYPES
// =============================================================================

export interface AuditLogEntry {
	tenantId: string;
	action: string;
	details: Record<string, unknown>;
	userEmail?: string;
}

// =============================================================================
// AUDIT LOGGING
// =============================================================================

/**
 * Log a billing action to the audit log.
 * Non-blocking with graceful failure — never blocks user operations.
 */
export async function logBillingAudit(db: D1Database, entry: AuditLogEntry): Promise<void> {
	try {
		await db
			.prepare(
				`INSERT INTO audit_log (id, tenant_id, category, action, details, user_email, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
			)
			.bind(
				crypto.randomUUID(),
				entry.tenantId,
				"billing",
				entry.action,
				JSON.stringify(entry.details),
				entry.userEmail || null,
				Math.floor(Date.now() / 1000),
			)
			.run();
	} catch (e) {
		console.error("[Billing Audit] Failed to log billing action:", {
			error: e instanceof Error ? e.message : String(e),
			action: entry.action,
			tenantId: entry.tenantId,
		});
	}
}
