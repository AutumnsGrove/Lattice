/**
 * UpgradesGraft API Tests
 *
 * Tests for cultivation, garden tending, and growth status APIs.
 */

import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";

// Mock dependencies before imports
vi.mock("$lib/errors", () => ({
  throwGroveError: vi
    .fn()
    .mockImplementation((status, error, prefix, context) => {
      throw Object.assign(new Error(error.userMessage), {
        status,
        code: error.code,
        category: error.category,
      });
    }),
  API_ERRORS: {
    UNAUTHORIZED: {
      code: "UNAUTHORIZED",
      message: "Unauthorized",
      category: "auth",
    },
    INVALID_ORIGIN: {
      code: "INVALID_ORIGIN",
      message: "Invalid origin",
      category: "security",
    },
    DB_NOT_CONFIGURED: {
      code: "DB_NOT_CONFIGURED",
      message: "DB not configured",
      category: "config",
    },
    PAYMENT_PROVIDER_NOT_CONFIGURED: {
      code: "PAYMENT_PROVIDER_NOT_CONFIGURED",
      message: "Payment provider not configured",
      category: "config",
    },
    TENANT_REQUIRED: {
      code: "TENANT_REQUIRED",
      message: "Tenant required",
      category: "validation",
    },
    INVALID_REQUEST: {
      code: "INVALID_REQUEST",
      message: "Invalid request",
      category: "validation",
    },
    RESOURCE_NOT_FOUND: {
      code: "RESOURCE_NOT_FOUND",
      message: "Resource not found",
      category: "not_found",
    },
    PAYMENT_PROVIDER_ERROR: {
      code: "PAYMENT_PROVIDER_ERROR",
      message: "Payment provider error",
      category: "external",
    },
    INTERNAL_ERROR: {
      code: "INTERNAL_ERROR",
      message: "Internal error",
      category: "server",
    },
  },
  throwError: vi.fn(),
  logGroveError: vi.fn(),
}));

vi.mock("$lib/auth/session", () => ({
  getVerifiedTenantId: vi.fn(),
}));

vi.mock("$lib/server/rate-limits", () => ({
  checkRateLimit: vi.fn(),
}));

vi.mock("$lib/payments", () => ({
  createPaymentProvider: vi.fn(),
}));

vi.mock("$lib/server/billing", () => ({
  logBillingAudit: vi.fn(),
  isCompedAccount: vi.fn(),
}));

// Import mocked modules
import { throwGroveError, API_ERRORS } from "$lib/errors";
import { getVerifiedTenantId } from "$lib/auth/session";
import { checkRateLimit } from "$lib/server/rate-limits";
import { createPaymentProvider } from "$lib/payments";
import { logBillingAudit, isCompedAccount } from "$lib/server/billing";

// Import after mocking
const { POST: cultivatePOST } = await import("./server/api/cultivate");
const { POST: tendPOST } = await import("./server/api/tend");
const { GET: growthGET } = await import("./server/api/growth");

// Helper to create mock DB
function createMockDB(mockData: Record<string, unknown> = {}) {
  return {
    prepare: vi.fn().mockReturnValue({
      bind: vi.fn().mockReturnValue({
        first: vi.fn().mockResolvedValue(mockData),
      }),
    }),
    ...mockData,
  };
}

describe("UpgradesGraft API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: rate limit passes
    vi.mocked(checkRateLimit).mockResolvedValue({
      result: { allowed: true },
      response: null,
    });
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  describe("Cultivate API", () => {
    it("should return 401 when user is not authenticated", async () => {
      const mockRequest = {
        json: vi.fn().mockResolvedValue({ targetStage: "seedling" }),
        headers: new Headers({ origin: "https://grove.place" }),
      } as unknown as Request;

      const mockLocals = {
        user: null,
        tenantId: "tenant-123",
        origin: "https://grove.place",
      };
      const mockPlatform = {
        env: { DB: {}, STRIPE_SECRET_KEY: "sk_test_123" },
      };

      await expect(
        cultivatePOST({
          request: mockRequest,
          locals: mockLocals,
          platform: mockPlatform,
        } as any),
      ).rejects.toThrow();

      expect(vi.mocked(throwGroveError)).toHaveBeenCalledWith(
        401,
        API_ERRORS.UNAUTHORIZED,
        "API",
      );
    });

    it("should return 403 for invalid origin", async () => {
      const mockRequest = {
        json: vi.fn().mockResolvedValue({ targetStage: "seedling" }),
        headers: new Headers({ origin: "https://evil.com" }),
      } as unknown as Request;

      const mockLocals = {
        user: { email: "test@example.com" },
        tenantId: "tenant-123",
        origin: "https://grove.place",
      };
      const mockPlatform = {
        env: { DB: {}, STRIPE_SECRET_KEY: "sk_test_123" },
      };

      await expect(
        cultivatePOST({
          request: mockRequest,
          locals: mockLocals,
          platform: mockPlatform,
        } as any),
      ).rejects.toThrow();

      expect(vi.mocked(throwGroveError)).toHaveBeenCalledWith(
        403,
        API_ERRORS.INVALID_ORIGIN,
        "API",
      );
    });

    it("should return 400 for invalid target stage", async () => {
      const mockRequest = {
        json: vi.fn().mockResolvedValue({ targetStage: "invalid_stage" }),
        headers: new Headers({ origin: "https://grove.place" }),
      } as unknown as Request;

      const mockLocals = {
        user: { email: "test@example.com" },
        tenantId: "tenant-123",
        origin: "https://grove.place",
      };
      const mockPlatform = {
        env: { DB: {}, STRIPE_SECRET_KEY: "sk_test_123" },
      };

      vi.mocked(getVerifiedTenantId).mockResolvedValue("tenant-123");

      await expect(
        cultivatePOST({
          request: mockRequest,
          locals: mockLocals,
          platform: mockPlatform,
        } as any),
      ).rejects.toThrow();

      expect(vi.mocked(throwGroveError)).toHaveBeenCalledWith(
        400,
        API_ERRORS.INVALID_REQUEST_BODY,
        "API",
      );
    });

    it("should create cultivation session for valid request", async () => {
      const mockRequest = {
        json: vi.fn().mockResolvedValue({
          targetStage: "seedling",
          billingCycle: "monthly",
        }),
        headers: new Headers({ origin: "https://grove.place" }),
      } as unknown as Request;

      const mockLocals = {
        user: { email: "test@example.com" },
        tenantId: "tenant-123",
        origin: "https://grove.place",
      };
      const mockPlatform = {
        env: {
          DB: createMockDB({ provider_customer_id: "cus_123" }),
          STRIPE_SECRET_KEY: "sk_test_123",
          STRIPE_PLANT_SEEDLING_MONTHLY:
            "https://checkout.stripe.com/p/seedling_monthly",
          STRIPE_PLANT_SEEDLING_YEARLY:
            "https://checkout.stripe.com/p/seedling_yearly",
          STRIPE_PLANT_SAPLING_MONTHLY:
            "https://checkout.stripe.com/p/sapling_monthly",
          STRIPE_PLANT_SAPLING_YEARLY:
            "https://checkout.stripe.com/p/sapling_yearly",
          STRIPE_PLANT_OAK_MONTHLY: "https://checkout.stripe.com/p/oak_monthly",
          STRIPE_PLANT_OAK_YEARLY: "https://checkout.stripe.com/p/oak_yearly",
          STRIPE_PLANT_EVERGREEN_MONTHLY:
            "https://checkout.stripe.com/p/evergreen_monthly",
          STRIPE_PLANT_EVERGREEN_YEARLY:
            "https://checkout.stripe.com/p/evergreen_yearly",
          APP_URL: "https://grove.place",
        },
      };

      vi.mocked(getVerifiedTenantId).mockResolvedValue("tenant-123");
      vi.mocked(isCompedAccount).mockResolvedValue({ isComped: false });
      vi.mocked(createPaymentProvider).mockReturnValue({
        createCheckoutSession: vi.fn().mockResolvedValue({
          id: "cs_test_123",
          url: "https://checkout.stripe.com/...",
        }),
      });
      vi.mocked(logBillingAudit).mockResolvedValue(undefined);

      const response = await cultivatePOST({
        request: mockRequest,
        locals: mockLocals,
        platform: mockPlatform,
      } as any);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData).toHaveProperty("plantingUrl");
      expect(responseData).toHaveProperty("sessionId");
    });

    it("should redirect when already at or above target stage", async () => {
      const mockRequest = {
        json: vi
          .fn()
          .mockResolvedValue({ targetStage: "oak", billingCycle: "monthly" }),
        headers: new Headers({ origin: "https://grove.place" }),
      } as unknown as Request;

      const mockLocals = {
        user: { email: "test@example.com" },
        tenantId: "tenant-123",
        origin: "https://grove.place",
      };
      const mockPlatform = {
        env: {
          // Mock DB returns plan=oak (same as target), so should redirect
          DB: createMockDB({ plan: "oak", provider_customer_id: "cus_123" }),
          STRIPE_SECRET_KEY: "sk_test_123",
          STRIPE_PLANT_SEEDLING_MONTHLY:
            "https://checkout.stripe.com/p/seedling_monthly",
          STRIPE_PLANT_SEEDLING_YEARLY:
            "https://checkout.stripe.com/p/seedling_yearly",
          STRIPE_PLANT_SAPLING_MONTHLY:
            "https://checkout.stripe.com/p/sapling_monthly",
          STRIPE_PLANT_SAPLING_YEARLY:
            "https://checkout.stripe.com/p/sapling_yearly",
          STRIPE_PLANT_OAK_MONTHLY: "https://checkout.stripe.com/p/oak_monthly",
          STRIPE_PLANT_OAK_YEARLY: "https://checkout.stripe.com/p/oak_yearly",
          STRIPE_PLANT_EVERGREEN_MONTHLY:
            "https://checkout.stripe.com/p/evergreen_monthly",
          STRIPE_PLANT_EVERGREEN_YEARLY:
            "https://checkout.stripe.com/p/evergreen_yearly",
          APP_URL: "https://grove.place",
        },
      };

      vi.mocked(getVerifiedTenantId).mockResolvedValue("tenant-123");

      // SvelteKit redirect() throws a Redirect object
      await expect(
        cultivatePOST({
          request: mockRequest,
          locals: mockLocals,
          platform: mockPlatform,
        } as any),
      ).rejects.toMatchObject({
        status: 302,
        location: "/garden?returnTo=%2Fgarden",
      });
    });
  });

  describe("Tend API", () => {
    it("should return 401 when user is not authenticated", async () => {
      const mockRequest = {
        json: vi.fn().mockResolvedValue({}),
        headers: new Headers({ origin: "https://grove.place" }),
      } as unknown as Request;

      const mockLocals = {
        user: null,
        tenantId: "tenant-123",
        origin: "https://grove.place",
      };
      const mockPlatform = {
        env: { DB: {}, STRIPE_SECRET_KEY: "sk_test_123" },
      };

      await expect(
        tendPOST({
          request: mockRequest,
          locals: mockLocals,
          platform: mockPlatform,
        } as any),
      ).rejects.toThrow();

      expect(vi.mocked(throwGroveError)).toHaveBeenCalledWith(
        401,
        API_ERRORS.UNAUTHORIZED,
        "API",
      );
    });

    it("should create portal session for valid request", async () => {
      const mockRequest = {
        json: vi.fn().mockResolvedValue({ returnTo: "/garden" }),
        headers: new Headers({ origin: "https://grove.place" }),
      } as unknown as Request;

      const mockLocals = {
        user: { email: "test@example.com" },
        tenantId: "tenant-123",
        origin: "https://grove.place",
      };
      const mockPlatform = {
        env: {
          DB: createMockDB({ provider_customer_id: "cus_123" }),
          STRIPE_SECRET_KEY: "sk_test_123",
          APP_URL: "https://grove.place",
        },
      };

      vi.mocked(getVerifiedTenantId).mockResolvedValue("tenant-123");
      vi.mocked(createPaymentProvider).mockReturnValue({
        createBillingPortalSession: vi.fn().mockResolvedValue({
          id: "bps_123",
          url: "https://billing.stripe.com/...",
        }),
      });
      vi.mocked(logBillingAudit).mockResolvedValue(undefined);

      const response = await tendPOST({
        request: mockRequest,
        locals: mockLocals,
        platform: mockPlatform,
      } as any);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData).toHaveProperty("shedUrl");
    });
  });

  describe("Growth API", () => {
    it("should return 401 when user is not authenticated", async () => {
      const mockLocals = { user: null, tenantId: "tenant-123" };
      const mockPlatform = { env: { DB: {} } };

      await expect(
        growthGET({ locals: mockLocals, platform: mockPlatform } as any),
      ).rejects.toThrow();

      expect(vi.mocked(throwGroveError)).toHaveBeenCalledWith(
        401,
        API_ERRORS.UNAUTHORIZED,
        "API",
      );
    });

    it("should return growth status for valid request", async () => {
      const mockLocals = {
        user: { email: "test@example.com" },
        tenantId: "tenant-123",
      };
      const mockPlatform = {
        env: {
          DB: createMockDB({
            plan: "seedling",
            status: "active",
            current_period_start: 1700000000,
            current_period_end: 1702592000,
            cancel_at_period_end: 0,
            payment_method_last4: "4242",
            payment_method_brand: "visa",
          }),
        },
      };

      vi.mocked(getVerifiedTenantId).mockResolvedValue("tenant-123");
      vi.mocked(isCompedAccount).mockResolvedValue({ isComped: false });

      const response = await growthGET({
        locals: mockLocals,
        platform: mockPlatform,
      } as any);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData).toHaveProperty("currentStage", "seedling");
      expect(responseData).toHaveProperty("flourishState", "active");
      expect(responseData).toHaveProperty("wateringMethod");
      expect(responseData.wateringMethod).toHaveProperty("lastDigits", "4242");
    });
  });
});
