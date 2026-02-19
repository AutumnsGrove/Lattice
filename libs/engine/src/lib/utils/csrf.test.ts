/**
 * CSRF Protection Tests
 *
 * Tests CSRF token generation, validation, origin-based same-origin policies,
 * session-bound HMAC tokens, and fail-closed behavior when Origin is absent.
 *
 * NOTE: validateCSRF tests use mockRequest() instead of new Request() because
 * happy-dom's Request implementation strips custom headers (origin, host, etc.)
 * like a real browser would. Since validateCSRF runs server-side, we need to
 * test with headers that are actually preserved.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  generateCSRFToken,
  generateSessionCSRFToken,
  validateSessionCSRFToken,
  validateCSRFToken,
  validateCSRF,
} from "./csrf";

/**
 * Create a mock request with preserved headers for testing validateCSRF.
 * Happy-dom's Request strips origin/host headers, so we use a plain object.
 */
function mockRequest(headers: Record<string, string>): Request {
  const headerMap = new Map(
    Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]),
  );
  return {
    headers: {
      get: (name: string) => headerMap.get(name.toLowerCase()) ?? null,
    },
  } as unknown as Request;
}

describe("CSRF Protection Tests", () => {
  // ==========================================================================
  // generateCSRFToken Tests
  // ==========================================================================

  describe("generateCSRFToken", () => {
    it("returns a non-empty string", () => {
      const token = generateCSRFToken();
      expect(typeof token).toBe("string");
      expect(token.length).toBeGreaterThan(0);
    });

    it("generates UUID format tokens (36 characters with dashes)", () => {
      const token = generateCSRFToken();
      expect(token).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
      );
    });

    it("generates unique tokens on each call", () => {
      const token1 = generateCSRFToken();
      const token2 = generateCSRFToken();
      const token3 = generateCSRFToken();

      expect(token1).not.toBe(token2);
      expect(token2).not.toBe(token3);
      expect(token1).not.toBe(token3);
    });

    it("generates tokens with sufficient entropy (100 unique tokens)", () => {
      const tokens = new Set();
      for (let i = 0; i < 100; i++) {
        tokens.add(generateCSRFToken());
      }
      expect(tokens.size).toBe(100);
    });
  });

  // ==========================================================================
  // generateSessionCSRFToken / validateSessionCSRFToken Tests
  // ==========================================================================

  describe("Session-bound CSRF tokens (HMAC)", () => {
    const testSecret = "test-csrf-secret-key-for-hmac";
    const testSession = "session-abc-123";

    it("generates a hex string token", async () => {
      const token = await generateSessionCSRFToken(testSession, testSecret);
      expect(token).toMatch(/^[0-9a-f]{64}$/);
    });

    it("generates deterministic tokens for same session+secret", async () => {
      const token1 = await generateSessionCSRFToken(testSession, testSecret);
      const token2 = await generateSessionCSRFToken(testSession, testSecret);
      expect(token1).toBe(token2);
    });

    it("generates different tokens for different sessions", async () => {
      const token1 = await generateSessionCSRFToken("session-1", testSecret);
      const token2 = await generateSessionCSRFToken("session-2", testSecret);
      expect(token1).not.toBe(token2);
    });

    it("generates different tokens for different secrets", async () => {
      const token1 = await generateSessionCSRFToken(testSession, "secret-a");
      const token2 = await generateSessionCSRFToken(testSession, "secret-b");
      expect(token1).not.toBe(token2);
    });

    it("validates correct session token", async () => {
      const token = await generateSessionCSRFToken(testSession, testSecret);
      const valid = await validateSessionCSRFToken(
        token,
        testSession,
        testSecret,
      );
      expect(valid).toBe(true);
    });

    it("rejects token from different session", async () => {
      const token = await generateSessionCSRFToken("other-session", testSecret);
      const valid = await validateSessionCSRFToken(
        token,
        testSession,
        testSecret,
      );
      expect(valid).toBe(false);
    });

    it("rejects token with wrong secret", async () => {
      const token = await generateSessionCSRFToken(testSession, "wrong-secret");
      const valid = await validateSessionCSRFToken(
        token,
        testSession,
        testSecret,
      );
      expect(valid).toBe(false);
    });

    it("rejects empty inputs", async () => {
      expect(await validateSessionCSRFToken("", testSession, testSecret)).toBe(
        false,
      );
      expect(await validateSessionCSRFToken("abc", "", testSecret)).toBe(false);
      expect(await validateSessionCSRFToken("abc", testSession, "")).toBe(
        false,
      );
    });
  });

  // ==========================================================================
  // validateCSRFToken Tests
  // ==========================================================================

  describe("validateCSRFToken", () => {
    let validToken: string;
    let validRequest: Request;

    beforeEach(() => {
      validToken = generateCSRFToken();
      validRequest = mockRequest({ "x-csrf-token": validToken });
    });

    describe("Session token validation", () => {
      it("rejects empty session token", () => {
        expect(validateCSRFToken(validRequest, "")).toBe(false);
      });

      it("rejects null/falsy session token", () => {
        expect(validateCSRFToken(validRequest, null as any)).toBe(false);
        expect(validateCSRFToken(validRequest, undefined as any)).toBe(false);
      });

      it("rejects whitespace-only session token", () => {
        expect(validateCSRFToken(validRequest, "   ")).toBe(false);
      });
    });

    describe("x-csrf-token header validation", () => {
      it("accepts request with matching x-csrf-token header", () => {
        expect(validateCSRFToken(validRequest, validToken)).toBe(true);
      });

      it("rejects request with mismatched x-csrf-token header", () => {
        expect(validateCSRFToken(validRequest, generateCSRFToken())).toBe(
          false,
        );
      });

      it("rejects request with missing x-csrf-token header", () => {
        const req = mockRequest({});
        expect(validateCSRFToken(req, validToken)).toBe(false);
      });
    });

    describe("csrf-token header fallback", () => {
      it("accepts matching csrf-token fallback header when x-csrf-token absent", () => {
        const req = mockRequest({ "csrf-token": validToken });
        expect(validateCSRFToken(req, validToken)).toBe(true);
      });

      it("rejects mismatched csrf-token fallback header", () => {
        const req = mockRequest({ "csrf-token": generateCSRFToken() });
        expect(validateCSRFToken(req, validToken)).toBe(false);
      });

      it("accepts either x-csrf-token or csrf-token header", () => {
        const primaryToken = generateCSRFToken();
        const fallbackToken = generateCSRFToken();
        const req = mockRequest({
          "x-csrf-token": primaryToken,
          "csrf-token": fallbackToken,
        });
        expect(validateCSRFToken(req, primaryToken)).toBe(true);
        expect(validateCSRFToken(req, fallbackToken)).toBe(true);
      });
    });

    describe("case sensitivity", () => {
      it("treats tokens as case-sensitive string comparison", () => {
        const token = generateCSRFToken();
        const req = mockRequest({ "x-csrf-token": token });
        expect(validateCSRFToken(req, token.toUpperCase())).toBe(false);
      });
    });

    describe("stress testing", () => {
      it("handles multiple concurrent validations", () => {
        const token1 = generateCSRFToken();
        const token2 = generateCSRFToken();
        const req1 = mockRequest({ "x-csrf-token": token1 });
        const req2 = mockRequest({ "x-csrf-token": token2 });
        expect(validateCSRFToken(req1, token1)).toBe(true);
        expect(validateCSRFToken(req2, token2)).toBe(true);
        expect(validateCSRFToken(req1, token2)).toBe(false);
        expect(validateCSRFToken(req2, token1)).toBe(false);
      });
    });
  });

  // ==========================================================================
  // validateCSRF Tests (Origin-based validation)
  // Uses mockRequest() because happy-dom strips origin/host headers
  // ==========================================================================

  describe("validateCSRF", () => {
    describe("Request object validation", () => {
      it("rejects null/undefined request", () => {
        expect(validateCSRF(null as any)).toBe(false);
        expect(validateCSRF(undefined as any)).toBe(false);
      });

      it("rejects non-object request", () => {
        expect(validateCSRF("string" as any)).toBe(false);
        expect(validateCSRF(123 as any)).toBe(false);
        expect(validateCSRF(true as any)).toBe(false);
      });

      it("rejects request without headers object", () => {
        expect(validateCSRF({} as any)).toBe(false);
      });

      it("rejects request with non-function headers.get", () => {
        expect(
          validateCSRF({ headers: { get: "not-a-function" } } as any),
        ).toBe(false);
      });
    });

    describe("No origin header handling (fail-closed)", () => {
      it("rejects request without origin header (no token fallback)", () => {
        const req = mockRequest({ host: "localhost:3000" });
        expect(validateCSRF(req)).toBe(false);
      });

      it("rejects request without both origin and host headers", () => {
        const req = mockRequest({});
        expect(validateCSRF(req)).toBe(false);
      });

      it("allows request without origin when valid CSRF token provided", () => {
        const token = "test-csrf-token-123";
        const req = mockRequest({ host: "localhost:3000" });
        expect(
          validateCSRF(req, false, {
            csrfToken: token,
            expectedToken: token,
          }),
        ).toBe(true);
      });

      it("rejects request without origin when CSRF token mismatches", () => {
        const req = mockRequest({ host: "localhost:3000" });
        expect(
          validateCSRF(req, false, {
            csrfToken: "wrong-token",
            expectedToken: "expected-token",
          }),
        ).toBe(false);
      });
    });

    describe("Protocol validation with proper host header", () => {
      it("validates http protocol with localhost", () => {
        const req = mockRequest({
          origin: "http://localhost:3000",
          host: "localhost:3000",
        });
        expect(validateCSRF(req)).toBe(true);
      });

      it("validates https protocol", () => {
        const req = mockRequest({
          origin: "https://example.com",
          host: "example.com",
        });
        expect(validateCSRF(req)).toBe(true);
      });

      it("handles invalid/malformed origin protocol gracefully", () => {
        const req = mockRequest({
          origin: "not a valid url :::",
          host: "localhost",
        });
        expect(validateCSRF(req)).toBe(false);
      });

      it("handles javascript: protocol safely", () => {
        const req = mockRequest({
          origin: "javascript:alert(1)",
          host: "localhost",
        });
        expect(validateCSRF(req)).toBe(false);
      });

      it("validates against dangerous protocols (data:)", () => {
        const req = mockRequest({
          origin: "data:text/html,<script>alert(1)</script>",
          host: "localhost",
        });
        expect(validateCSRF(req)).toBe(false);
      });

      it("validates against file: protocol", () => {
        const req = mockRequest({
          origin: "file:///etc/passwd",
          host: "localhost",
        });
        expect(validateCSRF(req)).toBe(false);
      });
    });

    describe("Localhost handling", () => {
      it("allows localhost with http", () => {
        const req = mockRequest({
          origin: "http://localhost:3000",
          host: "localhost:3000",
        });
        expect(validateCSRF(req)).toBe(true);
      });

      it("allows localhost with https", () => {
        const req = mockRequest({
          origin: "https://localhost:3000",
          host: "localhost:3000",
        });
        expect(validateCSRF(req)).toBe(true);
      });

      it("allows 127.0.0.1 with http", () => {
        const req = mockRequest({
          origin: "http://127.0.0.1:3000",
          host: "127.0.0.1:3000",
        });
        expect(validateCSRF(req)).toBe(true);
      });
    });

    describe("HTTPS requirement for non-localhost", () => {
      it("rejects http for non-localhost domains", () => {
        const req = mockRequest({
          origin: "http://example.com",
          host: "example.com",
        });
        expect(validateCSRF(req)).toBe(false);
      });

      it("allows https for non-localhost domains with matching host", () => {
        const req = mockRequest({
          origin: "https://example.com",
          host: "example.com",
        });
        expect(validateCSRF(req)).toBe(true);
      });

      it("allows https for non-localhost subdomains", () => {
        const req = mockRequest({
          origin: "https://api.example.com",
          host: "api.example.com",
        });
        expect(validateCSRF(req)).toBe(true);
      });
    });

    describe("Same-origin validation with matching host", () => {
      it("allows requests with identical origin and host", () => {
        const pairs = [
          ["https://example.com", "example.com"],
          ["https://app.grove.place", "app.grove.place"],
          ["https://api.prod.example.org", "api.prod.example.org"],
          ["http://localhost:8080", "localhost:8080"],
        ];

        for (const [origin, host] of pairs) {
          const req = mockRequest({ origin, host });
          expect(validateCSRF(req)).toBe(true);
        }
      });
    });

    describe("Port matching validation", () => {
      it("validates matching explicit ports", () => {
        const req = mockRequest({
          origin: "https://example.com:8443",
          host: "example.com:8443",
        });
        expect(validateCSRF(req)).toBe(true);
      });

      it("treats missing port as default for protocol", () => {
        const req = mockRequest({
          origin: "https://example.com:443",
          host: "example.com",
        });
        expect(validateCSRF(req)).toBe(true);
      });

      it("validates http default port (80)", () => {
        const req = mockRequest({
          origin: "http://localhost:80",
          host: "localhost",
        });
        expect(validateCSRF(req)).toBe(true);
      });
    });

    describe("X-Forwarded-Host header support", () => {
      it("prefers x-forwarded-host over host header", () => {
        const req = mockRequest({
          origin: "https://forwarded.example.com",
          "x-forwarded-host": "forwarded.example.com",
          host: "internal.local:3000",
        });
        expect(validateCSRF(req)).toBe(true);
      });

      it("uses host when x-forwarded-host is missing", () => {
        const req = mockRequest({
          origin: "https://example.com",
          host: "example.com",
        });
        expect(validateCSRF(req)).toBe(true);
      });

      it("supports proxy setup with x-forwarded-host", () => {
        const req = mockRequest({
          origin: "https://user.grove.place",
          "x-forwarded-host": "user.grove.place",
          host: "grove-internal:3000",
        });
        expect(validateCSRF(req)).toBe(true);
      });
    });

    describe("Edge cases with empty/malformed headers", () => {
      it("rejects empty origin string (fail-closed, no token fallback)", () => {
        const req = mockRequest({ origin: "", host: "example.com" });
        // Empty origin is falsy — fails closed without token fallback
        expect(validateCSRF(req)).toBe(false);
      });

      it("handles origin with spaces gracefully", () => {
        const req = mockRequest({
          origin: "https://exa mple.com",
          host: "example.com",
        });
        expect(validateCSRF(req)).toBe(false);
      });
    });

    describe("Real-world scenarios", () => {
      it("handles production grove.place multi-tenant setup", () => {
        const req = mockRequest({
          origin: "https://user.grove.place",
          host: "user.grove.place",
        });
        expect(validateCSRF(req)).toBe(true);
      });

      it("allows local development with localhost", () => {
        const req = mockRequest({
          origin: "http://localhost:3000",
          host: "localhost:3000",
        });
        expect(validateCSRF(req)).toBe(true);
      });

      it("validates same-origin for multiple grove instances", () => {
        const instances = [
          ["https://alice.grove.place", "alice.grove.place"],
          ["https://bob.grove.place", "bob.grove.place"],
          ["https://charlie.grove.place", "charlie.grove.place"],
        ];

        for (const [origin, host] of instances) {
          const req = mockRequest({ origin, host });
          expect(validateCSRF(req)).toBe(true);
        }
      });

      it("rejects cross-tenant requests (origin != host)", () => {
        const req = mockRequest({
          origin: "https://evil.grove.place",
          host: "victim.grove.place",
        });
        expect(validateCSRF(req)).toBe(false);
      });
    });

    describe("Case sensitivity in hostname comparison", () => {
      it("normalizes hostnames to lowercase for comparison", () => {
        const req = mockRequest({
          origin: "https://EXAMPLE.COM",
          host: "example.com",
        });
        expect(validateCSRF(req)).toBe(true);
      });

      it("normalizes protocols to lowercase for comparison", () => {
        const req = mockRequest({
          origin: "HTTPS://example.com",
          host: "example.com",
        });
        expect(validateCSRF(req)).toBe(true);
      });
    });
  });
});
