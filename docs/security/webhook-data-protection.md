# Webhook Data Protection

> **Last Updated:** January 2026
> **Status:** Implemented
> **PR:** #391

This document describes Grove's approach to protecting user data in webhook payloads from payment providers like LemonSqueezy.

---

## Overview

When Grove receives webhooks from payment providers, the raw payloads contain sensitive PII (Personally Identifiable Information) that we don't need to store for business operations. Our data protection strategy follows three principles:

1. **Data Minimization** - Only store what's needed (GDPR Article 5)
2. **Defense in Depth** - Multiple layers of protection
3. **Automatic Cleanup** - Time-limited retention

---

## What Gets Stripped (PII Fields)

The webhook sanitizer uses a **whitelist approach** - only explicitly allowed fields are kept. Everything else is stripped.

### Explicitly Blocked (Never Stored)

| Category            | Fields                                                            | Risk Level     |
| ------------------- | ----------------------------------------------------------------- | -------------- |
| **User Identity**   | `user_email`, `user_name`, `customer_email`, `customer_name`      | High           |
| **Payment Details** | `card_brand`, `card_last_four`                                    | High (PCI DSS) |
| **Address Data**    | `billing_address`, `city`, `region`, `country`, `zip`, `state`    | High (GDPR)    |
| **Sensitive URLs**  | `receipt_url`, `update_payment_method_url`, `customer_portal_url` | Medium         |

### What We Keep (Safe Fields)

| Category         | Fields                                                                   | Why Safe              |
| ---------------- | ------------------------------------------------------------------------ | --------------------- |
| **Identifiers**  | `customer_id`, `product_id`, `variant_id`, `order_id`, `subscription_id` | Internal IDs, not PII |
| **Status**       | `status`, `payment_status`                                               | Business logic needed |
| **Product Info** | `product_name`, `variant_name`                                           | Not user data         |
| **Timestamps**   | `created_at`, `updated_at`, `renews_at`, `ends_at`                       | Audit trail           |
| **Financial**    | `total`, `subtotal`, `tax`, `currency`                                   | No card details       |

---

## Implementation

### Sanitizer Location

```
libs/engine/src/lib/utils/webhook-sanitizer.ts
```

### Key Functions

```typescript
// Strip PII from webhook payload before storage
sanitizeWebhookPayload(payload: unknown): SanitizedWebhookPayload | null

// Detect PII in payload (for testing/validation)
detectPiiFields(payload: unknown): string[]

// Calculate 120-day retention expiry timestamp
calculateWebhookExpiry(): number
```

### Usage in Webhook Handler

```typescript
// In libs/plant/src/routes/api/webhooks/lemonsqueezy/+server.ts

const sanitizedPayload = sanitizeWebhookPayload(event);

// If sanitization fails, log and preserve minimal safe data
if (!sanitizedPayload) {
	console.warn("[Webhook] PII sanitization failed for event:", eventName);
}

const payloadToStore = sanitizedPayload
	? JSON.stringify(sanitizedPayload)
	: JSON.stringify({
			meta: { event_name: eventName, test_mode: event.meta?.test_mode },
			data: { id: event.data?.id, type: event.data?.type },
			_sanitization_failed: true,
		});
```

---

## Retention Policy

| Aspect               | Value                   | Rationale                                             |
| -------------------- | ----------------------- | ----------------------------------------------------- |
| **Retention Period** | 120 days                | Balance between debugging needs and data minimization |
| **Cleanup Schedule** | Daily at 3:00 AM UTC    | Low-traffic period                                    |
| **Cleanup Worker**   | `grove-webhook-cleanup` | Dedicated Cloudflare Worker                           |

### Why 120 Days?

- **Chargeback window**: Most payment disputes must be filed within 90 days
- **Debugging buffer**: Additional 30 days for investigating edge cases
- **GDPR alignment**: Demonstrates active data lifecycle management

---

## Compliance Mapping

### GDPR (General Data Protection Regulation)

| Principle                       | How We Comply                                        |
| ------------------------------- | ---------------------------------------------------- |
| **Data Minimization** (Art. 5)  | Whitelist-only approach strips unnecessary data      |
| **Storage Limitation** (Art. 5) | 120-day automatic deletion                           |
| **Purpose Limitation** (Art. 5) | Only store what's needed for subscription management |

### PCI DSS (Payment Card Industry)

| Requirement                 | How We Comply                                     |
| --------------------------- | ------------------------------------------------- |
| **Don't store card data**   | `card_brand`, `card_last_four` explicitly blocked |
| **Minimize data retention** | Automatic 120-day cleanup                         |

---

## Security Considerations

### Threat Model

| Threat                   | Mitigation                                          |
| ------------------------ | --------------------------------------------------- |
| **Data breach**          | PII already stripped; blast radius minimized        |
| **Malformed webhook**    | `safeJsonParse` prevents crashes; graceful fallback |
| **Schema changes**       | Type validation for critical fields; warning logs   |
| **Retention violations** | Automatic cleanup with indexed queries              |

### Monitoring

When sanitization fails, a warning is logged:

```
[Webhook] PII sanitization failed for event: subscription_created
```

**If you see this frequently**, LemonSqueezy may have changed their webhook schema. Check:

1. Their changelog for API updates
2. The sanitizer's type validation logic
3. Test with a sample webhook to identify the issue

---

## Testing

### Unit Tests

```bash
pnpm test:run -- src/lib/utils/webhook-sanitizer.test.ts
```

25 tests cover:

- PII detection for all sensitive fields
- Whitelist preservation logic
- Edge cases (null, undefined, invalid input)
- Expiry calculation

### Manual Verification

To verify a webhook is properly sanitized:

```sql
-- Check a recent webhook event
SELECT id, event_type, payload, expires_at
FROM webhook_events
ORDER BY created_at DESC
LIMIT 1;
```

The `payload` should NOT contain any fields from the "Explicitly Blocked" list above.

---

## Adding New Whitelisted Fields

If LemonSqueezy adds new fields you need to preserve:

1. **Evaluate the field** - Is it PII? Could it identify a user?
2. **Add to whitelist** in `webhook-sanitizer.ts`:
   ```typescript
   const ATTRIBUTES_WHITELIST = new Set([
   	// ... existing fields
   	"new_safe_field",
   ]);
   ```
3. **Update types** in `SanitizedAttributes` interface
4. **Add tests** for the new field
5. **Document** why the field is safe

**When in doubt, don't whitelist it.** It's safer to strip a field and add it later than to accidentally store PII.

---

## Related Documentation

- [Webhook Cleanup Operations](../infrastructure/webhook-cleanup-operations.md)
- [Security Model](./SECURITY_MODEL.md)
- [Cloudflare Architecture](../infrastructure/cloudflare-architecture-guide.md)
