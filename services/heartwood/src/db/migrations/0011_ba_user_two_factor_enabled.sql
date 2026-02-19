-- Migration: Add two_factor_enabled column to ba_user
-- Date: 2026-02-07
--
-- The twoFactor plugin requires a `two_factor_enabled` column on the user table.
-- This was missed when the ba_two_factor table was created in migration 006.
-- Without this column, Better Auth throws "twoFactorEnabled does not exist in
-- the ba_user Drizzle schema" when creating new users.
--
-- Run with: wrangler d1 execute groveauth --remote --file=./src/db/migrations/0011_ba_user_two_factor_enabled.sql

ALTER TABLE ba_user ADD COLUMN two_factor_enabled INTEGER DEFAULT 0;
