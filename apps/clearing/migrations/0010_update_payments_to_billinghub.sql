-- Update Payments component description to reflect BillingHub centralization
-- Payment processing moved from Plant to billing.grove.place (BillingHub)

UPDATE status_components
SET
  description = 'BillingHub — centralized payment processing via Stripe',
  updated_at = CURRENT_TIMESTAMP
WHERE id = 'comp_payments';
