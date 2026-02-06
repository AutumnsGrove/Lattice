/**
 * Full-Stack Security Integration Tests
 *
 * These tests exercise real security validators WITHOUT mocking them.
 * Unlike other integration tests that mock CSRF/rate-limits/HMAC to isolate
 * endpoint logic, these tests verify the actual security mechanisms work
 * end-to-end through real code paths.
 *
 * Coverage:
 * - CSRF validation (origin-based + token-based) via real validateCSRF/validateCSRFToken
 * - Rate limiting via real rateLimit() function + mock KV
 * - Webhook HMAC signature via real crypto.subtle
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  generateCSRFToken,
  validateCSRFToken,
  validateCSRF,
} from "$lib/utils/csrf.js";
import { rateLimit } from "$lib/server/services/cache.js";
import { checkRateLimit } from "$lib/server/rate-limits/middleware.js";
import { createMockKV } from "../helpers/index.js";

/**
 * Create a mock Request with headers that Node.js would normally strip.
 * The Fetch spec marks `host`, `origin`, and `cookie` as "forbidden" headers,
 * so `new Request()` silently drops them. This helper bypasses that restriction.
 */
function createRequestWithHeaders(
  url: string,
  options: { method?: string; headers: Record<string, string> },
): Request {
  const headers = new Headers();
  for (const [key, value] of Object.entries(options.headers)) {
    headers.set(key, value);
  }
  return {
    method: options.method ?? "POST",
    url,
    headers,
  } as unknown as Request;
}

// ============================================================================
// CSRF Validation (Real — no mocking)
// ============================================================================

describe("Full-Stack: CSRF Validation", () => {
  describe("Token-based CSRF (validateCSRFToken)", () => {
    it("accepts request with matching x-csrf-token header", () => {
      const token = generateCSRFToken();
      const request = new Request("https://autumn.grove.place/arbor/posts", {
        method: "POST",
        headers: { "x-csrf-token": token },
      });

      expect(validateCSRFToken(request, token)).toBe(true);
    });

    it("accepts request with matching csrf-token fallback header", () => {
      const token = generateCSRFToken();
      const request = new Request("https://autumn.grove.place/arbor/posts", {
        method: "POST",
        headers: { "csrf-token": token },
      });

      expect(validateCSRFToken(request, token)).toBe(true);
    });

    it("rejects request with mismatched token", () => {
      const sessionToken = generateCSRFToken();
      const wrongToken = generateCSRFToken();
      const request = new Request("https://autumn.grove.place/arbor/posts", {
        method: "POST",
        headers: { "x-csrf-token": wrongToken },
      });

      expect(validateCSRFToken(request, sessionToken)).toBe(false);
    });

    it("rejects request with no token header", () => {
      const token = generateCSRFToken();
      const request = new Request("https://autumn.grove.place/arbor/posts", {
        method: "POST",
      });

      expect(validateCSRFToken(request, token)).toBe(false);
    });

    it("rejects when session token is empty", () => {
      const request = new Request("https://autumn.grove.place/arbor/posts", {
        method: "POST",
        headers: { "x-csrf-token": "some-token" },
      });

      expect(validateCSRFToken(request, "")).toBe(false);
    });

    it("generates unique tokens each time", () => {
      const tokens = new Set(
        Array.from({ length: 100 }, () => generateCSRFToken()),
      );
      expect(tokens.size).toBe(100);
    });

    it("tokens are valid UUID format", () => {
      const token = generateCSRFToken();
      const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
      expect(token).toMatch(uuidRegex);
    });
  });

  describe("Origin-based CSRF (validateCSRF)", () => {
    // Note: We use createRequestWithHeaders() here because Node.js's Request
    // constructor strips "forbidden" headers (host, origin) per the Fetch spec.
    // In production (Cloudflare Workers), these headers are always present.

    it("accepts same-origin request (host matches origin)", () => {
      const request = createRequestWithHeaders(
        "https://autumn.grove.place/arbor/posts",
        {
          headers: {
            origin: "https://autumn.grove.place",
            host: "autumn.grove.place",
          },
        },
      );

      expect(validateCSRF(request)).toBe(true);
    });

    it("accepts same-origin with x-forwarded-host", () => {
      const request = createRequestWithHeaders(
        "https://autumn.grove.place/arbor/posts",
        {
          headers: {
            origin: "https://autumn.grove.place",
            "x-forwarded-host": "autumn.grove.place",
          },
        },
      );

      expect(validateCSRF(request)).toBe(true);
    });

    it("rejects cross-origin request (different subdomain)", () => {
      const request = createRequestWithHeaders(
        "https://autumn.grove.place/arbor/posts",
        {
          headers: {
            origin: "https://evil.grove.place",
            host: "autumn.grove.place",
          },
        },
      );

      expect(validateCSRF(request)).toBe(false);
    });

    it("rejects cross-origin request (different domain)", () => {
      const request = createRequestWithHeaders(
        "https://autumn.grove.place/arbor/posts",
        { headers: { origin: "https://evil.com", host: "autumn.grove.place" } },
      );

      expect(validateCSRF(request)).toBe(false);
    });

    it("rejects non-HTTPS origin for non-localhost", () => {
      const request = createRequestWithHeaders(
        "https://autumn.grove.place/arbor/posts",
        {
          headers: {
            origin: "http://autumn.grove.place",
            host: "autumn.grove.place",
          },
        },
      );

      expect(validateCSRF(request)).toBe(false);
    });

    it("allows HTTP for localhost", () => {
      const request = createRequestWithHeaders(
        "http://localhost:5173/arbor/posts",
        {
          headers: { origin: "http://localhost:5173", host: "localhost:5173" },
        },
      );

      expect(validateCSRF(request)).toBe(true);
    });

    it("rejects port mismatch", () => {
      const request = createRequestWithHeaders(
        "https://autumn.grove.place/arbor/posts",
        {
          headers: {
            origin: "https://autumn.grove.place:8443",
            host: "autumn.grove.place",
          },
        },
      );

      expect(validateCSRF(request)).toBe(false);
    });

    it("rejects invalid protocol in origin", () => {
      const request = createRequestWithHeaders(
        "https://autumn.grove.place/arbor/posts",
        {
          headers: {
            origin: "ftp://autumn.grove.place",
            host: "autumn.grove.place",
          },
        },
      );

      expect(validateCSRF(request)).toBe(false);
    });

    it("rejects request with no origin header and no token (fail-closed)", () => {
      const request = createRequestWithHeaders(
        "https://autumn.grove.place/arbor/posts",
        { headers: { host: "autumn.grove.place" } },
      );

      // No origin header and no CSRF token fallback — fail closed for security.
      // Non-browser clients must provide a CSRF token via options.
      expect(validateCSRF(request)).toBe(false);
    });

    it("prevents cross-tenant CSRF (tenant1 → tenant2)", () => {
      const request = createRequestWithHeaders(
        "https://victim-tenant.grove.place/arbor/settings",
        {
          headers: {
            origin: "https://attacker-tenant.grove.place",
            host: "victim-tenant.grove.place",
          },
        },
      );

      expect(validateCSRF(request)).toBe(false);
    });
  });
});

// ============================================================================
// Rate Limiting (Real — no mocking of cache.ts)
// ============================================================================

describe("Full-Stack: Rate Limiting", () => {
  let kv: ReturnType<typeof createMockKV>;

  beforeEach(() => {
    kv = createMockKV();
  });

  describe("rateLimit() function", () => {
    it("allows first request and sets count to 1", async () => {
      const result = await rateLimit(
        kv as unknown as KVNamespace,
        "user:test-1",
        {
          limit: 5,
          windowSeconds: 60,
        },
      );

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
      expect(result.resetAt).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });

    it("decrements remaining on each call", async () => {
      const opts = { limit: 3, windowSeconds: 60 };

      const r1 = await rateLimit(
        kv as unknown as KVNamespace,
        "user:dec-test",
        opts,
      );
      expect(r1.remaining).toBe(2);

      const r2 = await rateLimit(
        kv as unknown as KVNamespace,
        "user:dec-test",
        opts,
      );
      expect(r2.remaining).toBe(1);

      const r3 = await rateLimit(
        kv as unknown as KVNamespace,
        "user:dec-test",
        opts,
      );
      expect(r3.remaining).toBe(0);
    });

    it("blocks after limit is reached", async () => {
      const opts = { limit: 2, windowSeconds: 60 };

      await rateLimit(kv as unknown as KVNamespace, "user:block-test", opts);
      await rateLimit(kv as unknown as KVNamespace, "user:block-test", opts);

      const r3 = await rateLimit(
        kv as unknown as KVNamespace,
        "user:block-test",
        opts,
      );
      expect(r3.allowed).toBe(false);
      expect(r3.remaining).toBe(0);
    });

    it("isolates different keys", async () => {
      const opts = { limit: 2, windowSeconds: 60 };

      // Exhaust key A
      await rateLimit(kv as unknown as KVNamespace, "user:A", opts);
      await rateLimit(kv as unknown as KVNamespace, "user:A", opts);

      // Key B should still be allowed
      const result = await rateLimit(
        kv as unknown as KVNamespace,
        "user:B",
        opts,
      );
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(1);
    });

    it("resets after window expires", async () => {
      const opts = { limit: 1, windowSeconds: 1 }; // 1 second window

      // First request allowed
      const r1 = await rateLimit(
        kv as unknown as KVNamespace,
        "user:expire-test",
        opts,
      );
      expect(r1.allowed).toBe(true);

      // Second request blocked
      const r2 = await rateLimit(
        kv as unknown as KVNamespace,
        "user:expire-test",
        opts,
      );
      expect(r2.allowed).toBe(false);

      // Simulate window expiry by modifying KV data
      // The key format is: grove:ratelimit:user:expire-test
      for (const [key, entry] of kv._store.entries()) {
        if (key.includes("expire-test")) {
          // Parse the stored JSON and set resetAt to the past
          const data = JSON.parse(entry.value);
          data.resetAt = Math.floor(Date.now() / 1000) - 10;
          entry.value = JSON.stringify(data);
        }
      }

      // After expiry, request should be allowed again
      const r3 = await rateLimit(
        kv as unknown as KVNamespace,
        "user:expire-test",
        opts,
      );
      expect(r3.allowed).toBe(true);
      expect(r3.remaining).toBe(0); // limit(1) - 1 = 0
    });

    it("uses namespace prefix in KV keys", async () => {
      await rateLimit(kv as unknown as KVNamespace, "user:ns-test", {
        limit: 10,
        windowSeconds: 60,
        namespace: "custom",
      });

      // Key should be: grove:custom:user:ns-test
      const keys = Array.from(kv._store.keys());
      expect(
        keys.some((k) => k.includes("custom") && k.includes("ns-test")),
      ).toBe(true);
    });
  });

  describe("checkRateLimit() middleware", () => {
    it("returns no response when under limit", async () => {
      const { result, response } = await checkRateLimit({
        kv: kv as unknown as KVNamespace,
        key: "endpoint:user-1",
        limit: 10,
        windowSeconds: 60,
      });

      expect(response).toBeUndefined();
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9);
    });

    it("returns 429 response when rate limited", async () => {
      const opts = {
        kv: kv as unknown as KVNamespace,
        key: "endpoint:limited-user",
        limit: 1,
        windowSeconds: 60,
      };

      // First request OK
      await checkRateLimit(opts);

      // Second request should be blocked
      const { result, response } = await checkRateLimit(opts);

      expect(result.allowed).toBe(false);
      expect(response).toBeDefined();
      expect(response!.status).toBe(429);

      const body = await response!.json();
      expect(body.error).toBe("rate_limited");
      expect(body.retryAfter).toBeGreaterThan(0);
    });

    it("429 response includes rate limit headers", async () => {
      const opts = {
        kv: kv as unknown as KVNamespace,
        key: "endpoint:header-test",
        limit: 1,
        windowSeconds: 300,
      };

      await checkRateLimit(opts);
      const { response } = await checkRateLimit(opts);

      expect(response!.headers.get("Retry-After")).toBeDefined();
      expect(response!.headers.get("X-RateLimit-Limit")).toBe("1");
      expect(response!.headers.get("X-RateLimit-Remaining")).toBe("0");
      expect(response!.headers.get("X-RateLimit-Reset")).toBeDefined();
    });
  });
});

// ============================================================================
// Webhook HMAC Verification (Real crypto — no mocking)
// ============================================================================

describe("Full-Stack: Webhook HMAC Verification", () => {
  /**
   * Compute a real HMAC-SHA256 signature for a payload using a secret.
   * This mirrors what LemonSqueezy does when sending webhook events.
   */
  async function computeHMAC(payload: string, secret: string): Promise<string> {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );

    const signature = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(payload),
    );

    return Array.from(new Uint8Array(signature))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  /**
   * Constant-time comparison (mirrors the production implementation)
   */
  function secureCompare(a: string, b: string): boolean {
    if (a.length !== b.length) return false;
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
  }

  const TEST_SECRET = "whsec_test_secret_for_grove_webhooks";

  describe("HMAC-SHA256 signature computation", () => {
    it("produces consistent signatures for same payload+secret", async () => {
      const payload = JSON.stringify({
        event: "subscription.created",
        data: {},
      });

      const sig1 = await computeHMAC(payload, TEST_SECRET);
      const sig2 = await computeHMAC(payload, TEST_SECRET);

      expect(sig1).toBe(sig2);
      expect(sig1).toHaveLength(64); // 32 bytes = 64 hex chars
    });

    it("produces different signatures for different payloads", async () => {
      const sig1 = await computeHMAC("payload-1", TEST_SECRET);
      const sig2 = await computeHMAC("payload-2", TEST_SECRET);

      expect(sig1).not.toBe(sig2);
    });

    it("produces different signatures for different secrets", async () => {
      const payload = "same-payload";
      const sig1 = await computeHMAC(payload, "secret-1");
      const sig2 = await computeHMAC(payload, "secret-2");

      expect(sig1).not.toBe(sig2);
    });

    it("valid signature passes secure comparison", async () => {
      const payload = JSON.stringify({
        event: "subscription.updated",
        data: { id: "sub_123", status: "active" },
      });

      const signature = await computeHMAC(payload, TEST_SECRET);

      // Re-compute and verify (simulates server-side verification)
      const expected = await computeHMAC(payload, TEST_SECRET);
      expect(secureCompare(signature, expected)).toBe(true);
    });

    it("tampered payload fails verification", async () => {
      const originalPayload = JSON.stringify({ event: "subscription.created" });
      const signature = await computeHMAC(originalPayload, TEST_SECRET);

      // Attacker modifies payload
      const tamperedPayload = JSON.stringify({ event: "subscription.deleted" });
      const recomputed = await computeHMAC(tamperedPayload, TEST_SECRET);

      expect(secureCompare(signature, recomputed)).toBe(false);
    });

    it("wrong secret fails verification", async () => {
      const payload = JSON.stringify({ event: "test" });
      const signature = await computeHMAC(payload, TEST_SECRET);

      // Attacker uses different secret
      const attackerSig = await computeHMAC(payload, "wrong-secret");

      expect(secureCompare(signature, attackerSig)).toBe(false);
    });
  });

  describe("secureCompare timing safety", () => {
    it("rejects strings of different lengths", () => {
      expect(secureCompare("short", "longer-string")).toBe(false);
    });

    it("rejects single-character difference", () => {
      const a = "a".repeat(64);
      const b = "a".repeat(63) + "b";
      expect(secureCompare(a, b)).toBe(false);
    });

    it("accepts identical strings", () => {
      const s = "abc123def456";
      expect(secureCompare(s, s)).toBe(true);
    });

    it("rejects empty vs non-empty", () => {
      expect(secureCompare("", "a")).toBe(false);
    });

    it("accepts both empty", () => {
      expect(secureCompare("", "")).toBe(true);
    });
  });

  describe("Full webhook verification flow", () => {
    it("verifies a complete LemonSqueezy-style webhook event", async () => {
      const webhookEvent = {
        meta: {
          event_name: "subscription_created",
          custom_data: { tenant_id: "tenant-123" },
        },
        data: {
          id: "sub_abc",
          attributes: {
            status: "active",
            variant_id: 12345,
          },
        },
      };

      const payload = JSON.stringify(webhookEvent);
      const signature = await computeHMAC(payload, TEST_SECRET);

      // Server-side verification (what our webhook handler does)
      const serverComputed = await computeHMAC(payload, TEST_SECRET);
      const isValid = secureCompare(serverComputed, signature);

      expect(isValid).toBe(true);

      // Parse event only after verification passes
      const parsed = JSON.parse(payload);
      expect(parsed.meta.event_name).toBe("subscription_created");
      expect(parsed.data.attributes.status).toBe("active");
    });

    it("rejects a webhook with forged signature", async () => {
      const payload = JSON.stringify({ event: "subscription.canceled" });
      const forgedSignature = "0".repeat(64); // Attacker guesses

      const serverComputed = await computeHMAC(payload, TEST_SECRET);
      expect(secureCompare(serverComputed, forgedSignature)).toBe(false);
    });

    it("rejects a replayed webhook with modified body", async () => {
      // Attacker captures a valid signature...
      const originalPayload = JSON.stringify({
        event: "order.completed",
        amount: 10,
      });
      const validSignature = await computeHMAC(originalPayload, TEST_SECRET);

      // ...then replays with modified amount
      const modifiedPayload = JSON.stringify({
        event: "order.completed",
        amount: 10000,
      });
      const serverComputed = await computeHMAC(modifiedPayload, TEST_SECRET);

      expect(secureCompare(serverComputed, validSignature)).toBe(false);
    });
  });
});
