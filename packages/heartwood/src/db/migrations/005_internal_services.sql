-- Migration 005: Internal Services Support
-- Adds flag to identify trusted internal Grove services (like Mycelium)
-- that can receive session tokens instead of auth codes

ALTER TABLE clients ADD COLUMN is_internal_service INTEGER DEFAULT 0;

-- Mark Mycelium as an internal service
UPDATE clients SET is_internal_service = 1 WHERE client_id = 'mycelium';
