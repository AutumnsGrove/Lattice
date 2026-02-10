/**
 * Stripe API Client for Cloudflare Workers
 *
 * A lightweight, fetch-based Stripe client that works in edge environments.
 * Does not depend on the Node.js Stripe SDK.
 */

const STRIPE_API_VERSION = "2024-11-20.acacia";
const STRIPE_API_BASE = "https://api.stripe.com/v1";

export interface StripeClientConfig {
  secretKey: string;
  apiVersion?: string;
}

export interface StripeRequestOptions {
  method?: "GET" | "POST" | "DELETE";
  params?: Record<string, unknown>;
  idempotencyKey?: string;
  stripeAccount?: string; // For Connect requests
}

export interface StripeError {
  type: string;
  code?: string;
  message: string;
  param?: string;
  decline_code?: string;
}

export class StripeAPIError extends Error {
  public readonly type: string;
  public readonly code?: string;
  public readonly param?: string;
  public readonly statusCode: number;

  constructor(error: StripeError, statusCode: number) {
    super(error.message);
    this.name = "StripeAPIError";
    this.type = error.type;
    this.code = error.code;
    this.param = error.param;
    this.statusCode = statusCode;
  }
}

/**
 * Stripe API Client
 *
 * Usage:
 * ```ts
 * const stripe = new StripeClient({ secretKey: 'sk_test_...' });
 * const session = await stripe.request('checkout/sessions', {
 *   method: 'POST',
 *   params: { mode: 'payment', ... }
 * });
 * ```
 */
export class StripeClient {
  private readonly secretKey: string;
  private readonly apiVersion: string;

  constructor(config: StripeClientConfig) {
    this.secretKey = config.secretKey;
    this.apiVersion = config.apiVersion || STRIPE_API_VERSION;
  }

  /**
   * Make a request to the Stripe API
   */
  async request<T>(
    endpoint: string,
    options: StripeRequestOptions = {},
  ): Promise<T> {
    const { method = "GET", params, idempotencyKey, stripeAccount } = options;

    const url = new URL(`${STRIPE_API_BASE}/${endpoint}`);

    // For GET requests, append params as query string
    if (method === "GET" && params) {
      this.appendSearchParams(url.searchParams, params);
    }

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.secretKey}`,
      "Stripe-Version": this.apiVersion,
    };

    // For POST requests, encode params as form data
    let body: string | undefined;
    if (method === "POST" && params) {
      headers["Content-Type"] = "application/x-www-form-urlencoded";
      body = this.encodeParams(params);
    }

    // Idempotency key for POST requests
    if (idempotencyKey) {
      headers["Idempotency-Key"] = idempotencyKey;
    }

    // Stripe Connect: make request on behalf of connected account
    if (stripeAccount) {
      headers["Stripe-Account"] = stripeAccount;
    }

    const response = await fetch(url.toString(), {
      method,
      headers,
      body,
    });

    const data = (await response.json()) as { error?: StripeError };

    if (!response.ok) {
      throw new StripeAPIError(
        data.error || { type: "api_error", message: "Unknown error" },
        response.status,
      );
    }

    return data as T;
  }

  /**
   * Encode parameters for application/x-www-form-urlencoded
   * Handles nested objects and arrays
   */
  private encodeParams(params: Record<string, unknown>, prefix = ""): string {
    const parts: string[] = [];

    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null) continue;

      const fullKey = prefix ? `${prefix}[${key}]` : key;

      if (Array.isArray(value)) {
        value.forEach((item, index) => {
          if (typeof item === "object" && item !== null) {
            parts.push(
              this.encodeParams(
                item as Record<string, unknown>,
                `${fullKey}[${index}]`,
              ),
            );
          } else {
            parts.push(
              `${encodeURIComponent(`${fullKey}[${index}]`)}=${encodeURIComponent(String(item))}`,
            );
          }
        });
      } else if (typeof value === "object") {
        parts.push(
          this.encodeParams(value as Record<string, unknown>, fullKey),
        );
      } else {
        parts.push(
          `${encodeURIComponent(fullKey)}=${encodeURIComponent(String(value))}`,
        );
      }
    }

    return parts.filter(Boolean).join("&");
  }

  /**
   * Append params to URLSearchParams for GET requests
   */
  private appendSearchParams(
    searchParams: URLSearchParams,
    params: Record<string, unknown>,
    prefix = "",
  ): void {
    for (const [key, value] of Object.entries(params)) {
      if (value === undefined || value === null) continue;

      const fullKey = prefix ? `${prefix}[${key}]` : key;

      if (Array.isArray(value)) {
        value.forEach((item, index) => {
          if (typeof item === "object" && item !== null) {
            this.appendSearchParams(
              searchParams,
              item as Record<string, unknown>,
              `${fullKey}[${index}]`,
            );
          } else {
            searchParams.append(`${fullKey}[${index}]`, String(item));
          }
        });
      } else if (typeof value === "object") {
        this.appendSearchParams(
          searchParams,
          value as Record<string, unknown>,
          fullKey,
        );
      } else {
        searchParams.append(fullKey, String(value));
      }
    }
  }

  /**
   * Verify a webhook signature
   *
   * @param payload - Raw request body as string
   * @param signature - Stripe-Signature header value
   * @param secret - Webhook signing secret
   * @param tolerance - Max age of event in seconds (default 300)
   */
  async verifyWebhookSignature(
    payload: string,
    signature: string,
    secret: string,
    tolerance = 300,
  ): Promise<{ valid: boolean; event?: unknown; error?: string }> {
    try {
      // Parse the signature header
      const parts = signature.split(",").reduce(
        (acc, part) => {
          const [key, value] = part.split("=");
          if (key && value) {
            acc[key] = value;
          }
          return acc;
        },
        {} as Record<string, string>,
      );

      const timestamp = parts["t"];
      const v1Signature = parts["v1"];

      if (!timestamp || !v1Signature) {
        return { valid: false, error: "Invalid signature format" };
      }

      // Check timestamp tolerance
      const timestampSeconds = parseInt(timestamp, 10);
      const now = Math.floor(Date.now() / 1000);

      if (now - timestampSeconds > tolerance) {
        return { valid: false, error: "Webhook timestamp too old" };
      }

      // Compute expected signature
      const signedPayload = `${timestamp}.${payload}`;
      const encoder = new TextEncoder();

      const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"],
      );

      const signatureBytes = await crypto.subtle.sign(
        "HMAC",
        key,
        encoder.encode(signedPayload),
      );

      const expectedSignature = Array.from(new Uint8Array(signatureBytes))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("");

      // Constant-time comparison
      if (!this.secureCompare(expectedSignature, v1Signature)) {
        return { valid: false, error: "Signature mismatch" };
      }

      // Parse and return the event
      const event = JSON.parse(payload);
      return { valid: true, event };
    } catch (err) {
      return { valid: false, error: `Verification failed: ${err}` };
    }
  }

  /**
   * Constant-time string comparison to prevent timing attacks
   */
  private secureCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false;
    }

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }
}

// =============================================================================
// STRIPE RESOURCE TYPES
// =============================================================================

export interface StripeProduct {
  id: string;
  object: "product";
  active: boolean;
  name: string;
  description?: string;
  images: string[];
  metadata: Record<string, string>;
  default_price?: string;
  created: number;
  updated: number;
}

export interface StripePrice {
  id: string;
  object: "price";
  active: boolean;
  product: string;
  currency: string;
  unit_amount: number;
  type: "one_time" | "recurring";
  recurring?: {
    interval: "day" | "week" | "month" | "year";
    interval_count: number;
  };
  metadata: Record<string, string>;
  created: number;
}

export interface StripeCheckoutSession {
  id: string;
  object: "checkout.session";
  url: string;
  status: "open" | "complete" | "expired";
  mode: "payment" | "subscription" | "setup";
  customer?: string;
  customer_email?: string;
  amount_total: number;
  currency: string;
  payment_status: "unpaid" | "paid" | "no_payment_required";
  payment_intent?: string;
  subscription?: string;
  metadata: Record<string, string>;
  expires_at: number;
  client_reference_id?: string;
}

export interface StripeCustomer {
  id: string;
  object: "customer";
  email?: string;
  name?: string;
  phone?: string;
  address?: StripeAddress;
  metadata: Record<string, string>;
  created: number;
}

export interface StripeAddress {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
}

export interface StripePaymentIntent {
  id: string;
  object: "payment_intent";
  amount: number;
  currency: string;
  status:
    | "requires_payment_method"
    | "requires_confirmation"
    | "requires_action"
    | "processing"
    | "requires_capture"
    | "canceled"
    | "succeeded";
  customer?: string;
  metadata: Record<string, string>;
  latest_charge?: string;
  created: number;
}

export interface StripeSubscription {
  id: string;
  object: "subscription";
  status:
    | "incomplete"
    | "incomplete_expired"
    | "trialing"
    | "active"
    | "past_due"
    | "canceled"
    | "unpaid"
    | "paused";
  customer: string;
  items: {
    data: Array<{
      id: string;
      price: StripePrice;
      quantity: number;
    }>;
  };
  current_period_start: number;
  current_period_end: number;
  cancel_at_period_end: boolean;
  canceled_at?: number;
  metadata: Record<string, string>;
  created: number;
}

export interface StripeRefund {
  id: string;
  object: "refund";
  amount: number;
  currency: string;
  status: "pending" | "succeeded" | "failed" | "canceled";
  payment_intent?: string;
  reason?: "duplicate" | "fraudulent" | "requested_by_customer";
  metadata: Record<string, string>;
  created: number;
}

export interface StripeAccount {
  id: string;
  object: "account";
  type: "standard" | "express" | "custom";
  email?: string;
  country?: string;
  default_currency?: string;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  details_submitted: boolean;
  capabilities?: Record<string, "active" | "inactive" | "pending">;
  requirements?: {
    currently_due: string[];
    eventually_due: string[];
    past_due: string[];
  };
  created: number;
}

export interface StripeAccountLink {
  object: "account_link";
  url: string;
  expires_at: number;
  created: number;
}

export interface StripeLoginLink {
  object: "login_link";
  url: string;
  created: number;
}

export interface StripeBillingPortalSession {
  id: string;
  object: "billing_portal.session";
  url: string;
  customer: string;
  return_url: string;
  created: number;
}

export interface StripeEvent {
  id: string;
  object: "event";
  type: string;
  data: {
    object: unknown;
    previous_attributes?: Record<string, unknown>;
  };
  account?: string; // For Connect events
  created: number;
  livemode: boolean;
}
