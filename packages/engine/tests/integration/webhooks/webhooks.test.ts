/**
 * Webhook Endpoint Tests
 *
 * Tests for POST /api/shop/webhooks which handles Stripe webhook events:
 * - Environment configuration validation (STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, DB)
 * - Webhook signature verification
 * - Idempotency (duplicate event detection via webhook_events table)
 * - Subscription event processing (subscription.created, subscription.updated, subscription.canceled)
 * - Shop e-commerce event handling (disabled, logged but acknowledged)
 * - Unknown event handling (logged but acknowledged)
 * - Error handling (non-recoverable errors return 200, 400 status errors re-thrown)
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { POST } from "../../../src/routes/api/shop/webhooks/+server.js";
import {
  createMockRequestEvent,
  createMockD1,
  seedMockD1,
} from "../helpers/index.js";

// ============================================================================
// Mock Setup
// ============================================================================

// Mock the payments module
vi.mock("$lib/payments", () => ({
  createPaymentProvider: vi.fn(() => ({
    handleWebhook: vi.fn(),
  })),
}));

// Mock the shop payments utilities
vi.mock("$lib/payments/shop", () => ({
  getOrderBySessionId: vi.fn(),
  updateOrderStatus: vi.fn(),
  updateCustomer: vi.fn(),
  getOrCreateCustomer: vi.fn(),
}));

import { createPaymentProvider } from "$lib/payments";
import type { HttpError } from "@sveltejs/kit";

// ============================================================================
// Test Setup
// ============================================================================

beforeEach(() => {
  vi.clearAllMocks();
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a base webhook request event with proper environment setup
 */
function createWebhookEvent(
  overrides: {
    env?: Record<string, unknown>;
    body?: Record<string, unknown>;
  } = {},
) {
  const db = createMockD1();
  const event = createMockRequestEvent({
    url: "https://grove.place/api/shop/webhooks",
    method: "POST",
    platform: {
      env: {
        DB: db,
        STRIPE_SECRET_KEY: "sk_test_stripe_key",
        STRIPE_WEBHOOK_SECRET: "whsec_test_webhook_secret",
        ...overrides.env,
      },
    },
    body: overrides.body,
  });

  return { event, db };
}

/**
 * Create a mock webhook response from handleWebhook
 */
function mockWebhookSuccess(eventType: string, providerId: string = "evt_1") {
  return {
    received: true,
    event: {
      id: "internal-" + crypto.randomUUID(),
      type: eventType,
      providerEventId: providerId,
      data: {
        id: providerId,
        object: eventType.split(".")[0],
        status: "active",
      },
    },
  };
}

/**
 * Create a mock webhook error response
 */
function mockWebhookFailure(error: string) {
  return {
    received: false,
    error,
  };
}

// ============================================================================
// Configuration Validation Tests
// ============================================================================

describe("Webhook Endpoint - Configuration Validation", () => {
  it("should return 500 when STRIPE_SECRET_KEY is missing", async () => {
    const { event } = createWebhookEvent({
      env: { STRIPE_SECRET_KEY: undefined },
    });

    try {
      await POST(event as any);
      expect.fail("Should have thrown an error");
    } catch (err) {
      const error = err as HttpError;
      expect(error.status).toBe(500);
      expect((error.body as any).message).toContain(
        "Payment provider not configured",
      );
    }
  });

  it("should return 500 when STRIPE_WEBHOOK_SECRET is missing", async () => {
    const { event } = createWebhookEvent({
      env: { STRIPE_WEBHOOK_SECRET: undefined },
    });

    try {
      await POST(event as any);
      expect.fail("Should have thrown an error");
    } catch (err) {
      const error = err as HttpError;
      expect(error.status).toBe(500);
      expect((error.body as any).message).toContain(
        "Webhook secret not configured",
      );
    }
  });

  it("should return 500 when DB is missing", async () => {
    const { event } = createWebhookEvent({
      env: { DB: undefined },
    });

    try {
      await POST(event as any);
      expect.fail("Should have thrown an error");
    } catch (err) {
      const error = err as HttpError;
      expect(error.status).toBe(500);
      expect((error.body as any).message).toContain("Database not configured");
    }
  });
});

// ============================================================================
// Webhook Verification Tests
// ============================================================================

describe("Webhook Endpoint - Verification", () => {
  it("should return 400 when webhook verification fails", async () => {
    const { event } = createWebhookEvent();
    const mockHandleWebhook = vi.fn();

    vi.mocked(createPaymentProvider).mockReturnValue({
      handleWebhook: mockHandleWebhook,
    } as any);

    mockHandleWebhook.mockResolvedValue(
      mockWebhookFailure("Invalid signature"),
    );

    try {
      await POST(event as any);
      expect.fail("Should have thrown an error");
    } catch (err) {
      const error = err as HttpError;
      expect(error.status).toBe(400);
      // SvelteKit error() wraps message in { message: string }
      expect((error.body as any).message).toContain("Invalid signature");
    }
  });
});

// ============================================================================
// Idempotency Tests
// ============================================================================

describe("Webhook Endpoint - Idempotency", () => {
  it("should return 200 with 'Already processed' for duplicate events", async () => {
    const { event, db } = createWebhookEvent();

    // Pre-seed the webhook_events table with an existing event
    seedMockD1(db, "webhook_events", [
      {
        id: "evt-existing",
        provider: "stripe",
        provider_event_id: "stripe-evt-1",
        event_type: "subscription.created",
        payload: '{"id":"stripe-evt-1"}',
        created_at: Math.floor(Date.now() / 1000),
        processed: 1,
        processed_at: Math.floor(Date.now() / 1000),
      },
    ]);

    const mockHandleWebhook = vi.fn();
    vi.mocked(createPaymentProvider).mockReturnValue({
      handleWebhook: mockHandleWebhook,
    } as any);

    // Return the existing event
    mockHandleWebhook.mockResolvedValue(
      mockWebhookSuccess("subscription.created", "stripe-evt-1"),
    );

    const response = await POST(event as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.received).toBe(true);
    expect(data.message).toBe("Already processed");
  });
});

// ============================================================================
// Subscription Event Tests
// ============================================================================

describe("Webhook Endpoint - Subscription Events", () => {
  it("should process subscription.created event", async () => {
    const { event, db } = createWebhookEvent();

    const mockHandleWebhook = vi.fn();
    vi.mocked(createPaymentProvider).mockReturnValue({
      handleWebhook: mockHandleWebhook,
    } as any);

    mockHandleWebhook.mockResolvedValue(
      mockWebhookSuccess("subscription.created", "stripe-sub-1"),
    );

    const response = await POST(event as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.received).toBe(true);

    // Verify webhook_events table was created and populated
    const webhookEvents = db._tables.get("webhook_events") || [];
    expect(webhookEvents.length).toBe(1);
    expect(webhookEvents[0].provider_event_id).toBe("stripe-sub-1");
    expect(webhookEvents[0].event_type).toBe("subscription.created");
  });

  it("should process subscription.updated event", async () => {
    const { event, db } = createWebhookEvent();

    const mockHandleWebhook = vi.fn();
    vi.mocked(createPaymentProvider).mockReturnValue({
      handleWebhook: mockHandleWebhook,
    } as any);

    mockHandleWebhook.mockResolvedValue(
      mockWebhookSuccess("subscription.updated", "stripe-sub-2"),
    );

    const response = await POST(event as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.received).toBe(true);

    // Verify webhook was recorded
    const webhookEvents = db._tables.get("webhook_events") || [];
    expect(webhookEvents.length).toBe(1);
    expect(webhookEvents[0].event_type).toBe("subscription.updated");
  });

  it("should process subscription.canceled event", async () => {
    const { event, db } = createWebhookEvent();

    const mockHandleWebhook = vi.fn();
    vi.mocked(createPaymentProvider).mockReturnValue({
      handleWebhook: mockHandleWebhook,
    } as any);

    mockHandleWebhook.mockResolvedValue(
      mockWebhookSuccess("subscription.canceled", "stripe-sub-3"),
    );

    const response = await POST(event as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.received).toBe(true);

    const webhookEvents = db._tables.get("webhook_events") || [];
    expect(webhookEvents.length).toBe(1);
    expect(webhookEvents[0].event_type).toBe("subscription.canceled");
  });
});

// ============================================================================
// Shop E-commerce Event Tests (Disabled)
// ============================================================================

describe("Webhook Endpoint - Shop Events (Disabled)", () => {
  it("should skip checkout.session.completed but return 200", async () => {
    const { event, db } = createWebhookEvent();

    const mockHandleWebhook = vi.fn();
    vi.mocked(createPaymentProvider).mockReturnValue({
      handleWebhook: mockHandleWebhook,
    } as any);

    mockHandleWebhook.mockResolvedValue(
      mockWebhookSuccess("checkout.session.completed", "stripe-checkout-1"),
    );

    const response = await POST(event as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.received).toBe(true);

    // Event should still be recorded for audit trail
    const webhookEvents = db._tables.get("webhook_events") || [];
    expect(webhookEvents.length).toBe(1);
    expect(webhookEvents[0].event_type).toBe("checkout.session.completed");
  });

  it("should skip checkout.session.expired but return 200", async () => {
    const { event } = createWebhookEvent();

    const mockHandleWebhook = vi.fn();
    vi.mocked(createPaymentProvider).mockReturnValue({
      handleWebhook: mockHandleWebhook,
    } as any);

    mockHandleWebhook.mockResolvedValue(
      mockWebhookSuccess("checkout.session.expired", "stripe-checkout-2"),
    );

    const response = await POST(event as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.received).toBe(true);
  });

  it("should skip payment.succeeded but return 200", async () => {
    const { event } = createWebhookEvent();

    const mockHandleWebhook = vi.fn();
    vi.mocked(createPaymentProvider).mockReturnValue({
      handleWebhook: mockHandleWebhook,
    } as any);

    mockHandleWebhook.mockResolvedValue(
      mockWebhookSuccess("payment.succeeded", "stripe-payment-1"),
    );

    const response = await POST(event as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.received).toBe(true);
  });

  it("should skip payment.failed but return 200", async () => {
    const { event } = createWebhookEvent();

    const mockHandleWebhook = vi.fn();
    vi.mocked(createPaymentProvider).mockReturnValue({
      handleWebhook: mockHandleWebhook,
    } as any);

    mockHandleWebhook.mockResolvedValue(
      mockWebhookSuccess("payment.failed", "stripe-payment-2"),
    );

    const response = await POST(event as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.received).toBe(true);
  });

  it("should skip refund.created but return 200", async () => {
    const { event } = createWebhookEvent();

    const mockHandleWebhook = vi.fn();
    vi.mocked(createPaymentProvider).mockReturnValue({
      handleWebhook: mockHandleWebhook,
    } as any);

    mockHandleWebhook.mockResolvedValue(
      mockWebhookSuccess("refund.created", "stripe-refund-1"),
    );

    const response = await POST(event as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.received).toBe(true);
  });

  it("should skip account.updated but return 200", async () => {
    const { event } = createWebhookEvent();

    const mockHandleWebhook = vi.fn();
    vi.mocked(createPaymentProvider).mockReturnValue({
      handleWebhook: mockHandleWebhook,
    } as any);

    mockHandleWebhook.mockResolvedValue(
      mockWebhookSuccess("account.updated", "stripe-account-1"),
    );

    const response = await POST(event as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.received).toBe(true);
  });
});

// ============================================================================
// Unknown Event Tests
// ============================================================================

describe("Webhook Endpoint - Unknown Events", () => {
  it("should handle unknown event types gracefully", async () => {
    const { event, db } = createWebhookEvent();

    const mockHandleWebhook = vi.fn();
    vi.mocked(createPaymentProvider).mockReturnValue({
      handleWebhook: mockHandleWebhook,
    } as any);

    mockHandleWebhook.mockResolvedValue(
      mockWebhookSuccess("custom.unknown.event", "stripe-unknown-1"),
    );

    const response = await POST(event as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.received).toBe(true);

    // Event should be recorded even if unhandled
    const webhookEvents = db._tables.get("webhook_events") || [];
    expect(webhookEvents.length).toBe(1);
    expect(webhookEvents[0].event_type).toBe("custom.unknown.event");
  });
});

// ============================================================================
// Error Handling Tests
// ============================================================================

describe("Webhook Endpoint - Error Handling", () => {
  it("should return 200 for non-recoverable errors (prevents retries)", async () => {
    const { event } = createWebhookEvent();

    const mockHandleWebhook = vi.fn();
    vi.mocked(createPaymentProvider).mockReturnValue({
      handleWebhook: mockHandleWebhook,
    } as any);

    mockHandleWebhook.mockResolvedValue(
      mockWebhookSuccess("subscription.created", "stripe-sub-error"),
    );

    // Override the DB prepare mock directly to simulate a database error
    // on the INSERT (second call) while the SELECT (first call) succeeds.
    let callCount = 0;
    vi.mocked(event.platform.env.DB.prepare).mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        // First call: SELECT for existing event — return null (not found)
        return {
          bind: () => ({ first: async () => null }),
        } as any;
      }
      // Second call: INSERT — throw non-recoverable error
      return {
        bind: () => ({
          run: async () => {
            throw new Error("Database constraint violation");
          },
        }),
      } as any;
    });

    const response = await POST(event as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.received).toBe(true);
    expect(data.error).toBeDefined();
  });

  it("should re-throw 400 status errors", async () => {
    const { event } = createWebhookEvent();

    const mockHandleWebhook = vi.fn();
    vi.mocked(createPaymentProvider).mockReturnValue({
      handleWebhook: mockHandleWebhook,
    } as any);

    // Mock a 400 error during processing
    mockHandleWebhook.mockImplementation(() => {
      const err = new Error("Bad request") as any;
      err.status = 400;
      throw err;
    });

    try {
      await POST(event as any);
      expect.fail("Should have thrown a 400 error");
    } catch (err) {
      const error = err as any;
      expect(error.status).toBe(400);
    }
  });
});

// ============================================================================
// Request Parsing Tests
// ============================================================================

describe("Webhook Endpoint - Request Handling", () => {
  it("should call createPaymentProvider with correct configuration", async () => {
    const { event } = createWebhookEvent();

    const mockHandleWebhook = vi.fn();
    vi.mocked(createPaymentProvider).mockReturnValue({
      handleWebhook: mockHandleWebhook,
    } as any);

    mockHandleWebhook.mockResolvedValue(
      mockWebhookSuccess("subscription.created", "stripe-evt-config"),
    );

    await POST(event as any);

    expect(createPaymentProvider).toHaveBeenCalledWith("stripe", {
      secretKey: "sk_test_stripe_key",
      webhookSecret: "whsec_test_webhook_secret",
    });
  });

  it("should pass request object to handleWebhook", async () => {
    const { event } = createWebhookEvent();

    const mockHandleWebhook = vi.fn();
    vi.mocked(createPaymentProvider).mockReturnValue({
      handleWebhook: mockHandleWebhook,
    } as any);

    mockHandleWebhook.mockResolvedValue(
      mockWebhookSuccess("subscription.created", "stripe-evt-request"),
    );

    await POST(event as any);

    expect(mockHandleWebhook).toHaveBeenCalledWith(event.request);
  });
});

// ============================================================================
// Data Persistence Tests
// ============================================================================

describe("Webhook Endpoint - Data Persistence", () => {
  it("should mark webhook events as processed", async () => {
    const { event, db } = createWebhookEvent();

    const mockHandleWebhook = vi.fn();
    vi.mocked(createPaymentProvider).mockReturnValue({
      handleWebhook: mockHandleWebhook,
    } as any);

    const eventId = "internal-test-event-" + crypto.randomUUID();
    mockHandleWebhook.mockResolvedValue({
      received: true,
      event: {
        id: eventId,
        type: "subscription.created",
        providerEventId: "stripe-evt-persist",
        data: { id: "stripe-evt-persist" },
      },
    });

    await POST(event as any);

    // Verify the event was inserted
    const webhookEvents = db._tables.get("webhook_events") || [];
    expect(webhookEvents.length).toBe(1);

    // Verify the UPDATE for marking as processed was called with correct SQL
    const prepareCalls = vi.mocked(db.prepare).mock.calls;
    const updateCall = prepareCalls.find(([sql]) =>
      sql.includes("UPDATE webhook_events SET processed"),
    );
    expect(updateCall).toBeDefined();
    expect(updateCall![0]).toContain("processed = 1");
    expect(updateCall![0]).toContain("processed_at");
  });

  it("should store webhook event payload in database", async () => {
    const { event, db } = createWebhookEvent();

    const mockHandleWebhook = vi.fn();
    vi.mocked(createPaymentProvider).mockReturnValue({
      handleWebhook: mockHandleWebhook,
    } as any);

    const eventData = {
      id: "stripe-sub-5",
      status: "active",
      customer: "cus_123",
      current_period_start: 1234567890,
      current_period_end: 1234654290,
    };

    mockHandleWebhook.mockResolvedValue({
      received: true,
      event: {
        id: "internal-payload-test",
        type: "subscription.created",
        providerEventId: "stripe-evt-payload",
        data: eventData,
      },
    });

    await POST(event as any);

    const webhookEvents = db._tables.get("webhook_events") || [];
    expect(webhookEvents.length).toBe(1);
    expect(webhookEvents[0].payload).toBeDefined();

    const payload = JSON.parse(webhookEvents[0].payload as string);
    expect(payload).toEqual(eventData);
  });
});
