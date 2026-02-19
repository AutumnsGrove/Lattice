-- Remove Meadow component (not live yet) and set Payments to maintenance mode
-- Meadow is a future feature (Phase 5: Grove Social)
-- Payments is awaiting LemonSqueezy store verification

DELETE FROM status_components WHERE id = 'comp_meadow';

UPDATE status_components
SET current_status = 'maintenance',
    description = 'LemonSqueezy integration for subscriptions — awaiting verification',
    updated_at = CURRENT_TIMESTAMP
WHERE id = 'comp_payments';
