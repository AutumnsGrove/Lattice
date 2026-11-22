-- Migration 126: give email_verifications a foreign key that points somewhere
-- Database: D1 (SQLite) - grove-engine-db
--
-- 108_slim_user_onboarding.sql rebuilds `user_onboarding` as
-- `user_onboarding_new` and renames it back. Whether SQLite rewrites the
-- `REFERENCES user_onboarding_new(id)` clause in this table during that rename
-- depends on the SQLite build, so a from-empty bootstrap ends up with a
-- foreign key pointing at a table that no longer exists — on some machines.
-- Production has the correct shape because 108 was hand-applied there long
-- before the rename dance.
--
-- It surfaced as the one entry in migration-drift's baseline that diverged on
-- macOS and did not on the CI runner, which is precisely the kind of
-- environment-dependent "known difference" a baseline should not contain.
--
-- Safe to rebuild: zero rows, and nothing references `email_verifications`.
-- Verified against production before writing it.

CREATE TABLE email_verifications_new (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES user_onboarding(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  created_at INTEGER DEFAULT (unixepoch()),
  expires_at INTEGER NOT NULL,
  verified_at INTEGER,
  attempts INTEGER DEFAULT 0
);

INSERT INTO email_verifications_new (
  id, user_id, email, code, created_at, expires_at, verified_at, attempts
)
SELECT
  id, user_id, email, code, created_at, expires_at, verified_at, attempts
FROM email_verifications;

DROP TABLE email_verifications;

ALTER TABLE email_verifications_new RENAME TO email_verifications;

-- DROP TABLE takes this with it. 108 created it, and losing it is exactly the
-- trap 116 fell into (a rebuild that forgets the indexes underneath).
CREATE INDEX IF NOT EXISTS idx_email_verifications_user_id
  ON email_verifications(user_id);
