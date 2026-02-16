import { describe, it, expect } from "vitest";
import {
  ENDPOINT_RATE_LIMITS,
  ENDPOINT_MAP,
  getEndpointLimit,
  getEndpointLimitByKey,
} from "./config.js";

describe("config", () => {
  describe("ENDPOINT_RATE_LIMITS", () => {
    it("has a default entry", () => {
      expect(ENDPOINT_RATE_LIMITS.default).toEqual({
        limit: 100,
        windowSeconds: 60,
      });
    });

    it("has auth/token at 20 per minute (bumped from 10)", () => {
      expect(ENDPOINT_RATE_LIMITS["auth/token"]).toEqual({
        limit: 20,
        windowSeconds: 60,
      });
    });

    it("includes Heartwood-originated endpoints", () => {
      expect(ENDPOINT_RATE_LIMITS["auth/magic-link"]).toBeDefined();
      expect(ENDPOINT_RATE_LIMITS["session/validate"]).toBeDefined();
      expect(ENDPOINT_RATE_LIMITS["device/init"]).toBeDefined();
      expect(ENDPOINT_RATE_LIMITS["auth/passkey-register"]).toBeDefined();
      expect(ENDPOINT_RATE_LIMITS["check/username"]).toBeDefined();
      expect(ENDPOINT_RATE_LIMITS["og/generate"]).toBeDefined();
    });

    it("all entries have valid limit and windowSeconds", () => {
      for (const [key, config] of Object.entries(ENDPOINT_RATE_LIMITS)) {
        expect(config.limit).toBeGreaterThan(0);
        expect(config.windowSeconds).toBeGreaterThan(0);
      }
    });
  });

  describe("ENDPOINT_MAP", () => {
    it("maps POST /api/auth/login to auth/login", () => {
      expect(ENDPOINT_MAP["POST:/api/auth/login"]).toBe("auth/login");
    });

    it("maps legacy /api/posts to posts/* keys", () => {
      expect(ENDPOINT_MAP["POST:/api/posts"]).toBe("posts/create");
      expect(ENDPOINT_MAP["PUT:/api/posts"]).toBe("posts/update");
    });

    it("maps new /api/blooms paths", () => {
      expect(ENDPOINT_MAP["POST:/api/blooms"]).toBe("posts/create");
      expect(ENDPOINT_MAP["PATCH:/api/blooms"]).toBe("posts/update");
    });

    it("maps check-username", () => {
      expect(ENDPOINT_MAP["GET:/api/check-username"]).toBe("check/username");
    });

    it("all values are valid EndpointKeys", () => {
      for (const value of Object.values(ENDPOINT_MAP)) {
        expect(ENDPOINT_RATE_LIMITS[value]).toBeDefined();
      }
    });
  });

  describe("getEndpointLimit", () => {
    it("returns correct config for mapped endpoint", () => {
      const config = getEndpointLimit("POST", "/api/auth/login");
      expect(config).toEqual({ limit: 5, windowSeconds: 300 });
    });

    it("returns default for unmapped endpoint", () => {
      const config = getEndpointLimit("GET", "/api/unknown");
      expect(config).toEqual({ limit: 100, windowSeconds: 60 });
    });
  });

  describe("getEndpointLimitByKey", () => {
    it("returns config for known key", () => {
      const config = getEndpointLimitByKey("auth/login");
      expect(config.limit).toBe(5);
    });

    it("returns default for unknown key", () => {
      const config = getEndpointLimitByKey("default");
      expect(config.limit).toBe(100);
    });
  });
});
