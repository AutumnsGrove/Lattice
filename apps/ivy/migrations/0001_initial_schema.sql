-- Ivy Initial Schema
-- All TIMESTAMP fields are UTC

-- User email settings
CREATE TABLE IF NOT EXISTS ivy_settings (
  user_id TEXT PRIMARY KEY,
  email_address TEXT UNIQUE NOT NULL,
  email_selected_at TEXT NOT NULL,
  email_locked_at TEXT NOT NULL,
  encrypted_email_key TEXT NOT NULL,
  unsend_delay_minutes INTEGER DEFAULT 2,
  encrypted_signature TEXT,
  recovery_phrase_downloaded INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Webhook buffer (for reliability)
CREATE TABLE IF NOT EXISTS ivy_webhook_buffer (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  raw_payload TEXT NOT NULL,
  webhook_signature TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  received_at TEXT DEFAULT (datetime('now')),
  processed_at TEXT
);

-- Encrypted email envelopes
CREATE TABLE IF NOT EXISTS ivy_emails (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  encrypted_envelope TEXT NOT NULL,
  r2_content_key TEXT NOT NULL,
  is_draft INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Outgoing email queue (for delayed sending)
CREATE TABLE IF NOT EXISTS ivy_email_queue (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  encrypted_email_data TEXT NOT NULL,
  scheduled_send_at TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  cancelled_at TEXT,
  sent_at TEXT,
  error_message TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Contact form submissions buffer
CREATE TABLE IF NOT EXISTS ivy_contact_form_buffer (
  id TEXT PRIMARY KEY,
  recipient_user_id TEXT NOT NULL,
  encrypted_submission TEXT NOT NULL,
  source_blog TEXT,
  source_ip_hash TEXT,
  status TEXT DEFAULT 'pending',
  created_at TEXT DEFAULT (datetime('now'))
);

-- Newsletter send tracking
CREATE TABLE IF NOT EXISTS ivy_newsletter_sends (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  recipient_count INTEGER NOT NULL,
  sent_at TEXT DEFAULT (datetime('now')),
  postmark_message_id TEXT
);

-- Admin audit log
CREATE TABLE IF NOT EXISTS ivy_admin_audit_log (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  admin_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  reason TEXT NOT NULL,
  ticket_id TEXT,
  ip_address_hash TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Rate limiting (can also use KV, but D1 provides durability)
CREATE TABLE IF NOT EXISTS ivy_rate_limits (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  timestamp TEXT DEFAULT (datetime('now'))
);
