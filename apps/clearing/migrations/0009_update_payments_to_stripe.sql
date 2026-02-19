-- Update Payments component from LemonSqueezy to Stripe
-- Grove has been approved by Stripe! 🎉
-- This migration switches the payment provider and marks payments as operational.

UPDATE status_components
SET
  description = 'Stripe integration for subscriptions',
  current_status = 'operational',
  updated_at = CURRENT_TIMESTAMP
WHERE id = 'comp_payments';
