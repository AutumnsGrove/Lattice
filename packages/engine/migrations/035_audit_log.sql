-- Generic audit log for billing, data export, and other sensitive operations.
-- Code in api/billing and api/export already inserts into this table
-- (wrapped in try/catch), so this migration activates existing audit trails.

CREATE TABLE IF NOT EXISTS audit_log (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    category TEXT NOT NULL,
    action TEXT NOT NULL,
    details TEXT,
    user_email TEXT,
    created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_log_tenant ON audit_log(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_category ON audit_log(category, created_at DESC);
