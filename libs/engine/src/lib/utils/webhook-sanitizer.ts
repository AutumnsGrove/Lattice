/**
 * Webhook Payload Sanitizer
 *
 * Strips PII from webhook payloads before storing them in the database.
 * Uses a whitelist approach - only explicitly allowed fields are kept.
 *
 * This is critical for:
 * - GDPR compliance (minimizing stored personal data)
 * - PCI DSS compliance (not storing card details)
 * - Defense-in-depth (reducing data breach impact)
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Sanitized webhook payload - only contains safe, non-PII fields
 */
export interface SanitizedWebhookPayload {
  meta: {
    event_name: string;
    test_mode: boolean;
    custom_data?: Record<string, unknown>;
  };
  data: {
    id: string;
    type: string;
    attributes: SanitizedAttributes;
  };
}

/**
 * Sanitized attributes - PII stripped
 */
export interface SanitizedAttributes {
  // Identifiers (safe - not PII)
  customer_id?: number;
  product_id?: number;
  variant_id?: number;
  order_id?: number;
  subscription_id?: number;

  // Status fields (safe)
  status?: string;
  payment_status?: string;

  // Product info (safe - not user data)
  product_name?: string;
  variant_name?: string;

  // Timestamps (safe)
  created_at?: string;
  updated_at?: string;
  renews_at?: string;
  ends_at?: string | null;
  cancelled_at?: string | null;
  pause_starts_at?: string | null;
  pause_resumes_at?: string | null;

  // Financial (safe - no card details)
  total?: number;
  subtotal?: number;
  tax?: number;
  currency?: string;
  currency_rate?: number;

  // Subscription metadata (safe)
  billing_anchor?: number;
  first_subscription_item?: {
    id: number;
    price_id: number;
    quantity: number;
  };
}

// =============================================================================
// Whitelist Configuration
// =============================================================================

/**
 * Fields to keep in meta object
 */
const META_WHITELIST = new Set([
  "event_name",
  "test_mode",
  "custom_data",
  "webhook_id",
]);

/**
 * Fields to keep in data object (top level)
 */
const DATA_WHITELIST = new Set(["id", "type", "attributes"]);

/**
 * Fields to keep in attributes
 * Using a whitelist approach - anything not listed is stripped
 */
const ATTRIBUTES_WHITELIST = new Set([
  // Identifiers
  "customer_id",
  "product_id",
  "variant_id",
  "order_id",
  "subscription_id",
  "store_id",

  // Status
  "status",
  "payment_status",
  "status_formatted",

  // Product info
  "product_name",
  "variant_name",

  // Timestamps
  "created_at",
  "updated_at",
  "renews_at",
  "ends_at",
  "cancelled_at",
  "pause_starts_at",
  "pause_resumes_at",

  // Financial (no card details)
  "total",
  "subtotal",
  "tax",
  "currency",
  "currency_rate",
  "total_formatted",
  "subtotal_formatted",
  "tax_formatted",

  // Subscription metadata
  "billing_anchor",
  "first_subscription_item",

  // Order items (safe - product info only)
  "order_number",
  "identifier",

  // Test mode indicator
  "test_mode",
]);

/**
 * Fields that are explicitly PII and should NEVER be stored
 * This list is for documentation and validation purposes
 */
const PII_FIELDS = new Set([
  // User identity
  "user_email",
  "user_name",
  "customer_email",
  "customer_name",

  // Payment details (PCI DSS)
  "card_brand",
  "card_last_four",

  // Address data (GDPR)
  "billing_address",
  "city",
  "region",
  "country",
  "zip",
  "state",
  "country_formatted",

  // URLs that might contain PII
  "urls",
  "receipt_url",
  "update_payment_method_url",
  "customer_portal_url",
]);

// =============================================================================
// Sanitization Functions
// =============================================================================

/**
 * Sanitize a LemonSqueezy webhook payload by stripping PII.
 *
 * @param payload - Raw webhook payload (parsed JSON)
 * @returns Sanitized payload with PII removed
 *
 * @example
 * const rawPayload = JSON.parse(webhookBody);
 * const sanitized = sanitizeWebhookPayload(rawPayload);
 * await db.prepare("INSERT INTO webhook_events ... VALUES (?, ?, ?)")
 *   .bind(eventId, eventType, JSON.stringify(sanitized))
 *   .run();
 */
export function sanitizeWebhookPayload(
  payload: unknown,
): SanitizedWebhookPayload | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const raw = payload as Record<string, unknown>;

  // Validate basic structure
  if (!raw.meta || !raw.data) {
    return null;
  }

  const meta = raw.meta as Record<string, unknown>;
  const data = raw.data as Record<string, unknown>;

  // Validate critical field types
  if (typeof meta.event_name !== "string") {
    return null; // Invalid payload structure - event_name must be string
  }
  if (!data.id || typeof data.id !== "string") {
    return null; // Invalid payload structure - data.id must be string
  }
  if (!data.type || typeof data.type !== "string") {
    return null; // Invalid payload structure - data.type must be string
  }

  // Sanitize meta
  const sanitizedMeta: Record<string, unknown> = {};
  for (const key of META_WHITELIST) {
    if (key in meta) {
      sanitizedMeta[key] = meta[key];
    }
  }

  // Sanitize data (top level)
  const sanitizedData: Record<string, unknown> = {};
  for (const key of DATA_WHITELIST) {
    if (key in data && key !== "attributes") {
      sanitizedData[key] = data[key];
    }
  }

  // Sanitize attributes
  const attributes = data.attributes as Record<string, unknown> | undefined;
  if (attributes) {
    const sanitizedAttributes: Record<string, unknown> = {};
    for (const key of ATTRIBUTES_WHITELIST) {
      if (key in attributes) {
        // Special handling for nested objects
        if (key === "first_subscription_item") {
          const item = attributes[key] as Record<string, unknown> | undefined;
          if (item) {
            sanitizedAttributes[key] = {
              id: item.id,
              price_id: item.price_id,
              quantity: item.quantity,
            };
          }
        } else {
          sanitizedAttributes[key] = attributes[key];
        }
      }
    }
    sanitizedData.attributes = sanitizedAttributes;
  }

  return {
    meta: sanitizedMeta,
    data: sanitizedData,
  } as SanitizedWebhookPayload;
}

/**
 * Check if a payload contains any PII fields (for testing/validation)
 *
 * @param payload - Payload to check
 * @returns Array of PII field names found
 */
export function detectPiiFields(payload: unknown): string[] {
  const found: string[] = [];

  function scan(obj: unknown, path: string = ""): void {
    if (!obj || typeof obj !== "object") return;

    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      const fullPath = path ? `${path}.${key}` : key;

      if (PII_FIELDS.has(key)) {
        found.push(fullPath);
      }

      if (value && typeof value === "object") {
        scan(value, fullPath);
      }
    }
  }

  scan(payload);
  return found;
}

/**
 * Calculate retention expiry timestamp (120 days from now)
 *
 * @returns Unix timestamp for when the webhook should be deleted
 */
export function calculateWebhookExpiry(): number {
  const RETENTION_DAYS = 120;
  const now = Math.floor(Date.now() / 1000);
  return now + RETENTION_DAYS * 24 * 60 * 60;
}
