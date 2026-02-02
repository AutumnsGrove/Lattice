-- Add index on email_signups.email for faster unsubscribe checks
-- This optimizes the checkUnsubscribed() query in Zephyr worker
-- which looks up emails by the email column

CREATE INDEX IF NOT EXISTS idx_email_signups_email ON email_signups(email);
