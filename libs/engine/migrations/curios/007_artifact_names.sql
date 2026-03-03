-- Migration 007: Add name column to artifacts
-- Allows artifacts to be named for inline syntax resolution (::artifacts[My Candle]::)
ALTER TABLE artifacts ADD COLUMN name TEXT NOT NULL DEFAULT '';
