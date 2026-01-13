-- Update payments component description from Stripe to Lemon Squeezy
-- This migration updates the seed data from 0001_status_tables.sql

UPDATE status_components
SET description = 'Lemon Squeezy integration for subscriptions'
WHERE id = 'comp_payments';
