-- Ivy Indexes

-- Email lookups by user, sorted by date
CREATE INDEX IF NOT EXISTS idx_emails_user_created
ON ivy_emails(user_id, created_at DESC);

-- Queue processing - find pending emails ready to send
CREATE INDEX IF NOT EXISTS idx_queue_pending
ON ivy_email_queue(status, scheduled_send_at);

-- Queue lookups by user
CREATE INDEX IF NOT EXISTS idx_queue_user
ON ivy_email_queue(user_id, status);

-- Webhook buffer processing
CREATE INDEX IF NOT EXISTS idx_buffer_pending
ON ivy_webhook_buffer(status, received_at);

-- Contact form processing
CREATE INDEX IF NOT EXISTS idx_contact_pending
ON ivy_contact_form_buffer(status, created_at);

-- Contact form rate limiting by IP
CREATE INDEX IF NOT EXISTS idx_contact_ip
ON ivy_contact_form_buffer(source_ip_hash, created_at);

-- Newsletter tracking by user
CREATE INDEX IF NOT EXISTS idx_newsletter_user
ON ivy_newsletter_sends(user_id, sent_at DESC);

-- Audit log lookups
CREATE INDEX IF NOT EXISTS idx_audit_user
ON ivy_admin_audit_log(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_admin
ON ivy_admin_audit_log(admin_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_action
ON ivy_admin_audit_log(action_type, created_at DESC);

-- Rate limit lookups
CREATE INDEX IF NOT EXISTS idx_rate_limits_user_action
ON ivy_rate_limits(user_id, action, timestamp);
