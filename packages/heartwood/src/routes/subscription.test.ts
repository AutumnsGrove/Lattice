/**
 * Integration tests for subscription routes
 * Tests GET /subscription, /subscription/:userId, POST /post-count, PUT /tier
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import type { Env, UserSubscription, SubscriptionStatus } from "../types.js";
import { createMockEnv } from "../test-helpers.js";

// Type-safe response interfaces for tests
interface ErrorResponse {
  error: string;
  error_description?: string;
  retry_after?: number;
}

interface SubscriptionResponse {
  subscription: UserSubscription;
  status: SubscriptionStatus;
}

interface CanPostResponse {
  can_create_post: boolean;
  posts_remaining: number | null;
}

// Mock database queries
vi.mock("../db/queries.js", () => ({
  getUserSubscription: vi.fn(),
  getOrCreateUserSubscription: vi.fn(),
  canUserCreatePost: vi.fn(),
  incrementPostCount: vi.fn(),
  decrementPostCount: vi.fn(),
  setPostCount: vi.fn(),
  updateSubscriptionTier: vi.fn(),
  getSubscriptionStatus: vi.fn(),
  checkRateLimit: vi.fn(),
}));

// Mock db session
vi.mock("../db/session.js", () => ({
  createDbSession: vi.fn().mockReturnValue({}),
}));

// Mock rate limiting to allow all requests by default
vi.mock("../middleware/rateLimit.js", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../middleware/rateLimit.js")>();
  return {
    ...actual,
    checkRouteRateLimit: vi
      .fn()
      .mockResolvedValue({ allowed: true, remaining: 10 }),
  };
});

// Mock bearer auth
vi.mock("../middleware/bearerAuth.js", () => ({
  verifyBearerAuth: vi.fn(),
  extractBearerToken: vi.fn(),
}));

// Mock security utils
vi.mock("../middleware/security.js", () => ({
  getClientIP: vi.fn().mockReturnValue("127.0.0.1"),
}));

import subscriptionRoutes from "./subscription.js";
import {
  getUserSubscription,
  getOrCreateUserSubscription,
  canUserCreatePost,
  incrementPostCount,
  decrementPostCount,
  setPostCount,
  updateSubscriptionTier,
  getSubscriptionStatus,
} from "../db/queries.js";
import { verifyBearerAuth } from "../middleware/bearerAuth.js";
import { checkRouteRateLimit } from "../middleware/rateLimit.js";

// Test data
const TEST_USER_ID = "user-123";
const TEST_TOKEN = "bearer-test-token";

const mockSubscription: UserSubscription = {
  id: "sub-1",
  user_id: TEST_USER_ID,
  tier: "sapling",
  post_limit: 2000,
  post_count: 150,
  grace_period_start: null,
  grace_period_days: 0,
  stripe_customer_id: null,
  stripe_subscription_id: null,
  billing_period_start: null,
  billing_period_end: null,
  custom_domain: null,
  custom_domain_verified: 0,
  created_at: "2025-01-01T00:00:00Z",
  updated_at: "2025-01-01T00:00:00Z",
};

const mockStatus: SubscriptionStatus = {
  tier: "sapling",
  post_count: 150,
  post_limit: 2000,
  posts_remaining: 1850,
  percentage_used: 7.5,
  is_at_limit: false,
  is_in_grace_period: false,
  grace_period_days_remaining: null,
  can_create_post: true,
  upgrade_required: false,
};

// Create test app
function createApp() {
  const app = new Hono<{ Bindings: Env }>();
  app.route("/subscription", subscriptionRoutes);
  return app;
}

const mockEnv = createMockEnv();

beforeEach(() => {
  vi.clearAllMocks();
});

// =============================================================================
// GET /subscription - Get current user's subscription
// =============================================================================

describe("GET /subscription", () => {
  beforeEach(() => {
    (checkRouteRateLimit as ReturnType<typeof vi.fn>).mockResolvedValue({
      allowed: true,
      remaining: 10,
    });
    (verifyBearerAuth as ReturnType<typeof vi.fn>).mockResolvedValue({
      sub: TEST_USER_ID,
    });
    (getOrCreateUserSubscription as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockSubscription,
    );
    (getSubscriptionStatus as ReturnType<typeof vi.fn>).mockReturnValue(
      mockStatus,
    );
  });

  it("returns 401 when no Bearer token", async () => {
    (verifyBearerAuth as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const app = createApp();
    const res = await app.request("/subscription", { method: "GET" }, mockEnv);

    expect(res.status).toBe(401);
    const json = (await res.json()) as ErrorResponse;
    expect(json.error).toBe("unauthorized");
    expect(json.error_description).toContain("Missing or invalid token");
  });

  it("returns 429 when rate limited", async () => {
    (checkRouteRateLimit as ReturnType<typeof vi.fn>).mockResolvedValue({
      allowed: false,
      remaining: 0,
      retryAfter: 30,
    });

    const app = createApp();
    const res = await app.request("/subscription", { method: "GET" }, mockEnv);

    expect(res.status).toBe(429);
    const json = (await res.json()) as ErrorResponse;
    expect(json.error).toBe("rate_limit");
    expect(json.retry_after).toBe(30);
  });

  it("returns current user's subscription and status", async () => {
    const app = createApp();
    const res = await app.request("/subscription", { method: "GET" }, mockEnv);

    expect(res.status).toBe(200);
    const json = (await res.json()) as SubscriptionResponse;
    expect(json.subscription).toEqual(mockSubscription);
    expect(json.status).toEqual(mockStatus);
    expect(
      getOrCreateUserSubscription as ReturnType<typeof vi.fn>,
    ).toHaveBeenCalledWith(expect.anything(), TEST_USER_ID);
  });
});

// =============================================================================
// GET /subscription/:userId - Get specific user's subscription
// =============================================================================

describe("GET /subscription/:userId", () => {
  beforeEach(() => {
    (checkRouteRateLimit as ReturnType<typeof vi.fn>).mockResolvedValue({
      allowed: true,
      remaining: 10,
    });
    (verifyBearerAuth as ReturnType<typeof vi.fn>).mockResolvedValue({
      sub: TEST_USER_ID,
    });
    (getUserSubscription as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockSubscription,
    );
    (getSubscriptionStatus as ReturnType<typeof vi.fn>).mockReturnValue(
      mockStatus,
    );
  });

  it("returns 401 when no Bearer token", async () => {
    (verifyBearerAuth as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const app = createApp();
    const res = await app.request(
      `/subscription/${TEST_USER_ID}`,
      { method: "GET" },
      mockEnv,
    );

    expect(res.status).toBe(401);
    const json = (await res.json()) as ErrorResponse;
    expect(json.error).toBe("unauthorized");
  });

  it("returns 403 when accessing another user's data", async () => {
    const otherUserId = "other-user-456";
    (verifyBearerAuth as ReturnType<typeof vi.fn>).mockResolvedValue({
      sub: TEST_USER_ID,
    });

    const app = createApp();
    const res = await app.request(
      `/subscription/${otherUserId}`,
      { method: "GET" },
      mockEnv,
    );

    expect(res.status).toBe(403);
    const json = (await res.json()) as ErrorResponse;
    expect(json.error).toBe("forbidden");
    expect(json.error_description).toContain("Cannot access other user data");
  });

  it("returns 404 when subscription not found", async () => {
    (getUserSubscription as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const app = createApp();
    const res = await app.request(
      `/subscription/${TEST_USER_ID}`,
      { method: "GET" },
      mockEnv,
    );

    expect(res.status).toBe(404);
    const json = (await res.json()) as ErrorResponse;
    expect(json.error).toBe("not_found");
    expect(json.error_description).toContain("Subscription not found");
  });

  it("returns user's subscription and status", async () => {
    const app = createApp();
    const res = await app.request(
      `/subscription/${TEST_USER_ID}`,
      { method: "GET" },
      mockEnv,
    );

    expect(res.status).toBe(200);
    const json = (await res.json()) as SubscriptionResponse;
    expect(json.subscription).toEqual(mockSubscription);
    expect(json.status).toEqual(mockStatus);
    expect(
      getUserSubscription as ReturnType<typeof vi.fn>,
    ).toHaveBeenCalledWith(expect.anything(), TEST_USER_ID);
  });
});

// =============================================================================
// GET /subscription/:userId/can-post - Check if user can create post
// =============================================================================

describe("GET /subscription/:userId/can-post", () => {
  beforeEach(() => {
    (checkRouteRateLimit as ReturnType<typeof vi.fn>).mockResolvedValue({
      allowed: true,
      remaining: 10,
    });
    (verifyBearerAuth as ReturnType<typeof vi.fn>).mockResolvedValue({
      sub: TEST_USER_ID,
    });
    (canUserCreatePost as ReturnType<typeof vi.fn>).mockResolvedValue({
      can_create_post: true,
      posts_remaining: 1850,
    });
  });

  it("returns 401 when no Bearer token", async () => {
    (verifyBearerAuth as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const app = createApp();
    const res = await app.request(
      `/subscription/${TEST_USER_ID}/can-post`,
      { method: "GET" },
      mockEnv,
    );

    expect(res.status).toBe(401);
  });

  it("returns 403 when accessing another user's data", async () => {
    const otherUserId = "other-user-456";

    const app = createApp();
    const res = await app.request(
      `/subscription/${otherUserId}/can-post`,
      { method: "GET" },
      mockEnv,
    );

    expect(res.status).toBe(403);
    const json = (await res.json()) as ErrorResponse;
    expect(json.error).toBe("forbidden");
  });

  it("returns can_create_post status", async () => {
    const app = createApp();
    const res = await app.request(
      `/subscription/${TEST_USER_ID}/can-post`,
      { method: "GET" },
      mockEnv,
    );

    expect(res.status).toBe(200);
    const json = (await res.json()) as CanPostResponse;
    expect(json.can_create_post).toBe(true);
    expect(json.posts_remaining).toBe(1850);
    expect(canUserCreatePost as ReturnType<typeof vi.fn>).toHaveBeenCalledWith(
      expect.anything(),
      TEST_USER_ID,
    );
  });

  it("returns false when at post limit", async () => {
    (canUserCreatePost as ReturnType<typeof vi.fn>).mockResolvedValue({
      can_create_post: false,
      posts_remaining: 0,
    });

    const app = createApp();
    const res = await app.request(
      `/subscription/${TEST_USER_ID}/can-post`,
      { method: "GET" },
      mockEnv,
    );

    expect(res.status).toBe(200);
    const json = (await res.json()) as CanPostResponse;
    expect(json.can_create_post).toBe(false);
    expect(json.posts_remaining).toBe(0);
  });
});

// =============================================================================
// POST /subscription/:userId/post-count - Update post count
// =============================================================================

describe("POST /subscription/:userId/post-count", () => {
  const updatedSub = { ...mockSubscription, post_count: 151 };

  beforeEach(() => {
    (checkRouteRateLimit as ReturnType<typeof vi.fn>).mockResolvedValue({
      allowed: true,
      remaining: 10,
    });
    (verifyBearerAuth as ReturnType<typeof vi.fn>).mockResolvedValue({
      sub: TEST_USER_ID,
    });
    (getSubscriptionStatus as ReturnType<typeof vi.fn>).mockReturnValue(
      mockStatus,
    );
  });

  it("returns 401 when no Bearer token", async () => {
    (verifyBearerAuth as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const app = createApp();
    const res = await app.request(
      `/subscription/${TEST_USER_ID}/post-count`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "increment" }),
      },
      mockEnv,
    );

    expect(res.status).toBe(401);
  });

  it("returns 403 when accessing another user's data", async () => {
    const otherUserId = "other-user-456";

    const app = createApp();
    const res = await app.request(
      `/subscription/${otherUserId}/post-count`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "increment" }),
      },
      mockEnv,
    );

    expect(res.status).toBe(403);
    const json = (await res.json()) as ErrorResponse;
    expect(json.error).toBe("forbidden");
  });

  it("returns 429 when rate limited", async () => {
    (checkRouteRateLimit as ReturnType<typeof vi.fn>).mockResolvedValue({
      allowed: false,
      remaining: 0,
      retryAfter: 30,
    });

    const app = createApp();
    const res = await app.request(
      `/subscription/${TEST_USER_ID}/post-count`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "increment" }),
      },
      mockEnv,
    );

    expect(res.status).toBe(429);
  });

  it("returns 400 for invalid JSON body", async () => {
    const app = createApp();
    const res = await app.request(
      `/subscription/${TEST_USER_ID}/post-count`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "not valid json",
      },
      mockEnv,
    );

    expect(res.status).toBe(400);
    const json = (await res.json()) as ErrorResponse;
    expect(json.error).toBe("invalid_request");
    expect(json.error_description).toContain("Invalid JSON body");
  });

  it("returns 400 for invalid action", async () => {
    const app = createApp();
    const res = await app.request(
      `/subscription/${TEST_USER_ID}/post-count`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "invalid_action" }),
      },
      mockEnv,
    );

    expect(res.status).toBe(400);
    const json = (await res.json()) as ErrorResponse;
    expect(json.error).toBe("invalid_request");
    expect(json.error_description).toContain(
      'either { action: "increment" | "decrement" } or { count: number }',
    );
  });

  it("increments post count", async () => {
    (incrementPostCount as ReturnType<typeof vi.fn>).mockResolvedValue(
      updatedSub,
    );

    const app = createApp();
    const res = await app.request(
      `/subscription/${TEST_USER_ID}/post-count`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "increment" }),
      },
      mockEnv,
    );

    expect(res.status).toBe(200);
    const json = (await res.json()) as SubscriptionResponse;
    expect(json.subscription.post_count).toBe(151);
    expect(incrementPostCount as ReturnType<typeof vi.fn>).toHaveBeenCalledWith(
      expect.anything(),
      TEST_USER_ID,
    );
  });

  it("decrements post count", async () => {
    const decrementedSub = { ...mockSubscription, post_count: 149 };
    (decrementPostCount as ReturnType<typeof vi.fn>).mockResolvedValue(
      decrementedSub,
    );

    const app = createApp();
    const res = await app.request(
      `/subscription/${TEST_USER_ID}/post-count`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "decrement" }),
      },
      mockEnv,
    );

    expect(res.status).toBe(200);
    const json = (await res.json()) as SubscriptionResponse;
    expect(json.subscription.post_count).toBe(149);
    expect(decrementPostCount as ReturnType<typeof vi.fn>).toHaveBeenCalledWith(
      expect.anything(),
      TEST_USER_ID,
    );
  });

  it("sets post count to specific number", async () => {
    const setCountSub = { ...mockSubscription, post_count: 500 };
    (setPostCount as ReturnType<typeof vi.fn>).mockResolvedValue(setCountSub);

    const app = createApp();
    const res = await app.request(
      `/subscription/${TEST_USER_ID}/post-count`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: 500 }),
      },
      mockEnv,
    );

    expect(res.status).toBe(200);
    const json = (await res.json()) as SubscriptionResponse;
    expect(json.subscription.post_count).toBe(500);
    expect(setPostCount as ReturnType<typeof vi.fn>).toHaveBeenCalledWith(
      expect.anything(),
      TEST_USER_ID,
      500,
    );
  });

  it("returns 404 when subscription not found after increment", async () => {
    (incrementPostCount as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const app = createApp();
    const res = await app.request(
      `/subscription/${TEST_USER_ID}/post-count`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "increment" }),
      },
      mockEnv,
    );

    expect(res.status).toBe(404);
    const json = (await res.json()) as ErrorResponse;
    expect(json.error).toBe("not_found");
  });

  it("returns 404 when subscription not found after set count", async () => {
    (setPostCount as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const app = createApp();
    const res = await app.request(
      `/subscription/${TEST_USER_ID}/post-count`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: 100 }),
      },
      mockEnv,
    );

    expect(res.status).toBe(404);
  });

  it("accepts count as zero", async () => {
    const zeroCountSub = { ...mockSubscription, post_count: 0 };
    (setPostCount as ReturnType<typeof vi.fn>).mockResolvedValue(zeroCountSub);

    const app = createApp();
    const res = await app.request(
      `/subscription/${TEST_USER_ID}/post-count`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: 0 }),
      },
      mockEnv,
    );

    expect(res.status).toBe(200);
    const json = (await res.json()) as SubscriptionResponse;
    expect(json.subscription.post_count).toBe(0);
  });
});

// =============================================================================
// PUT /subscription/:userId/tier - Update subscription tier
// =============================================================================

describe("PUT /subscription/:userId/tier", () => {
  beforeEach(() => {
    (checkRouteRateLimit as ReturnType<typeof vi.fn>).mockResolvedValue({
      allowed: true,
      remaining: 10,
    });
    (verifyBearerAuth as ReturnType<typeof vi.fn>).mockResolvedValue({
      sub: TEST_USER_ID,
    });
    (getOrCreateUserSubscription as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockSubscription,
    );
    (getSubscriptionStatus as ReturnType<typeof vi.fn>).mockReturnValue(
      mockStatus,
    );
  });

  it("returns 401 when no Bearer token", async () => {
    (verifyBearerAuth as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const app = createApp();
    const res = await app.request(
      `/subscription/${TEST_USER_ID}/tier`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: "evergreen" }),
      },
      mockEnv,
    );

    expect(res.status).toBe(401);
  });

  it("returns 403 when accessing another user's data", async () => {
    const otherUserId = "other-user-456";

    const app = createApp();
    const res = await app.request(
      `/subscription/${otherUserId}/tier`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: "evergreen" }),
      },
      mockEnv,
    );

    expect(res.status).toBe(403);
    const json = (await res.json()) as ErrorResponse;
    expect(json.error).toBe("forbidden");
  });

  it("returns 429 when rate limited", async () => {
    (checkRouteRateLimit as ReturnType<typeof vi.fn>).mockResolvedValue({
      allowed: false,
      remaining: 0,
      retryAfter: 30,
    });

    const app = createApp();
    const res = await app.request(
      `/subscription/${TEST_USER_ID}/tier`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: "evergreen" }),
      },
      mockEnv,
    );

    expect(res.status).toBe(429);
  });

  it("returns 400 for invalid JSON body", async () => {
    const app = createApp();
    const res = await app.request(
      `/subscription/${TEST_USER_ID}/tier`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: "not valid json",
      },
      mockEnv,
    );

    expect(res.status).toBe(400);
    const json = (await res.json()) as ErrorResponse;
    expect(json.error).toBe("invalid_request");
    expect(json.error_description).toContain("Invalid JSON body");
  });

  it("returns 400 for missing tier", async () => {
    const app = createApp();
    const res = await app.request(
      `/subscription/${TEST_USER_ID}/tier`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      },
      mockEnv,
    );

    expect(res.status).toBe(400);
    const json = (await res.json()) as ErrorResponse;
    expect(json.error).toBe("invalid_request");
    expect(json.error_description).toContain('tier: "seedling"');
  });

  it("returns 400 for invalid tier", async () => {
    const app = createApp();
    const res = await app.request(
      `/subscription/${TEST_USER_ID}/tier`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: "invalid_tier" }),
      },
      mockEnv,
    );

    expect(res.status).toBe(400);
    const json = (await res.json()) as ErrorResponse;
    expect(json.error).toBe("invalid_request");
  });

  it("upgrades tier to evergreen", async () => {
    const upgradedSub = { ...mockSubscription, tier: "evergreen" };
    (updateSubscriptionTier as ReturnType<typeof vi.fn>).mockResolvedValue(
      upgradedSub,
    );

    const app = createApp();
    const res = await app.request(
      `/subscription/${TEST_USER_ID}/tier`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: "evergreen" }),
      },
      mockEnv,
    );

    expect(res.status).toBe(200);
    const json = (await res.json()) as SubscriptionResponse;
    expect(json.subscription.tier).toBe("evergreen");
    expect(
      updateSubscriptionTier as ReturnType<typeof vi.fn>,
    ).toHaveBeenCalledWith(expect.anything(), TEST_USER_ID, "evergreen");
  });

  it("downgrades tier to seedling", async () => {
    const downgradedSub = { ...mockSubscription, tier: "seedling" };
    (updateSubscriptionTier as ReturnType<typeof vi.fn>).mockResolvedValue(
      downgradedSub,
    );

    const app = createApp();
    const res = await app.request(
      `/subscription/${TEST_USER_ID}/tier`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: "seedling" }),
      },
      mockEnv,
    );

    expect(res.status).toBe(200);
    const json = (await res.json()) as SubscriptionResponse;
    expect(json.subscription.tier).toBe("seedling");
  });

  it("allows all valid tiers", async () => {
    const validTiers = [
      "seedling",
      "sapling",
      "evergreen",
      "canopy",
      "platform",
    ];

    for (const tier of validTiers) {
      vi.clearAllMocks();
      (verifyBearerAuth as ReturnType<typeof vi.fn>).mockResolvedValue({
        sub: TEST_USER_ID,
      });
      (checkRouteRateLimit as ReturnType<typeof vi.fn>).mockResolvedValue({
        allowed: true,
        remaining: 10,
      });
      (
        getOrCreateUserSubscription as ReturnType<typeof vi.fn>
      ).mockResolvedValue(mockSubscription);

      const tierSub = {
        ...mockSubscription,
        tier: tier as typeof mockSubscription.tier,
      };
      (updateSubscriptionTier as ReturnType<typeof vi.fn>).mockResolvedValue(
        tierSub,
      );
      (getSubscriptionStatus as ReturnType<typeof vi.fn>).mockReturnValue(
        mockStatus,
      );

      const app = createApp();
      const res = await app.request(
        `/subscription/${TEST_USER_ID}/tier`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tier }),
        },
        mockEnv,
      );

      expect(res.status).toBe(200);
      const json = (await res.json()) as SubscriptionResponse;
      expect(json.subscription.tier).toBe(tier);
    }
  });

  it("returns 404 when subscription not found after update", async () => {
    (updateSubscriptionTier as ReturnType<typeof vi.fn>).mockResolvedValue(
      null,
    );

    const app = createApp();
    const res = await app.request(
      `/subscription/${TEST_USER_ID}/tier`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: "evergreen" }),
      },
      mockEnv,
    );

    expect(res.status).toBe(404);
    const json = (await res.json()) as ErrorResponse;
    expect(json.error).toBe("not_found");
  });

  it("calls getOrCreateUserSubscription before updating tier", async () => {
    (updateSubscriptionTier as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockSubscription,
    );

    const app = createApp();
    await app.request(
      `/subscription/${TEST_USER_ID}/tier`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: "evergreen" }),
      },
      mockEnv,
    );

    expect(
      getOrCreateUserSubscription as ReturnType<typeof vi.fn>,
    ).toHaveBeenCalledWith(expect.anything(), TEST_USER_ID);
  });
});
