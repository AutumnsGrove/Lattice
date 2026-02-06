/**
 * Tests for validation schemas and helpers
 */

import { describe, it, expect } from "vitest";
import {
  tokenRequestSchema,
  tokenRevokeSchema,
  deviceCodeInitSchema,
  deviceAuthorizeSchema,
  isValidEmail,
  isValidUrl,
  parseFormData,
} from "./validation.js";

// =============================================================================
// tokenRequestSchema
// =============================================================================

describe("tokenRequestSchema", () => {
  it("accepts valid authorization_code grant", () => {
    const result = tokenRequestSchema.safeParse({
      grant_type: "authorization_code",
      code: "auth-code-123",
      redirect_uri: "https://app.example.com/callback",
      client_id: "test-app",
      client_secret: "secret-123",
      code_verifier: "verifier-value",
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid refresh_token grant", () => {
    const result = tokenRequestSchema.safeParse({
      grant_type: "refresh_token",
      client_id: "test-app",
      client_secret: "secret-123",
      refresh_token: "refresh-token-value",
    });
    expect(result.success).toBe(true);
  });

  it("rejects authorization_code grant without code", () => {
    const result = tokenRequestSchema.safeParse({
      grant_type: "authorization_code",
      redirect_uri: "https://app.example.com/callback",
      client_id: "test-app",
      client_secret: "secret-123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects authorization_code grant without redirect_uri", () => {
    const result = tokenRequestSchema.safeParse({
      grant_type: "authorization_code",
      code: "auth-code-123",
      client_id: "test-app",
      client_secret: "secret-123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects refresh_token grant without refresh_token", () => {
    const result = tokenRequestSchema.safeParse({
      grant_type: "refresh_token",
      client_id: "test-app",
      client_secret: "secret-123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects unsupported grant_type", () => {
    const result = tokenRequestSchema.safeParse({
      grant_type: "client_credentials",
      client_id: "test-app",
      client_secret: "secret-123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing client_id", () => {
    const result = tokenRequestSchema.safeParse({
      grant_type: "refresh_token",
      client_secret: "secret-123",
      refresh_token: "refresh-token-value",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing client_secret", () => {
    const result = tokenRequestSchema.safeParse({
      grant_type: "refresh_token",
      client_id: "test-app",
      refresh_token: "refresh-token-value",
    });
    expect(result.success).toBe(false);
  });
});

// =============================================================================
// tokenRevokeSchema
// =============================================================================

describe("tokenRevokeSchema", () => {
  it("accepts valid revoke request", () => {
    const result = tokenRevokeSchema.safeParse({
      token: "some-token-value",
      client_id: "test-app",
      client_secret: "secret-123",
    });
    expect(result.success).toBe(true);
  });

  it("accepts optional token_type_hint", () => {
    const result = tokenRevokeSchema.safeParse({
      token: "some-token-value",
      token_type_hint: "refresh_token",
      client_id: "test-app",
      client_secret: "secret-123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid token_type_hint", () => {
    const result = tokenRevokeSchema.safeParse({
      token: "some-token-value",
      token_type_hint: "invalid_type",
      client_id: "test-app",
      client_secret: "secret-123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing token", () => {
    const result = tokenRevokeSchema.safeParse({
      client_id: "test-app",
      client_secret: "secret-123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty token", () => {
    const result = tokenRevokeSchema.safeParse({
      token: "",
      client_id: "test-app",
      client_secret: "secret-123",
    });
    expect(result.success).toBe(false);
  });
});

// =============================================================================
// deviceCodeInitSchema
// =============================================================================

describe("deviceCodeInitSchema", () => {
  it("accepts valid request with just client_id", () => {
    const result = deviceCodeInitSchema.safeParse({
      client_id: "cli-app",
    });
    expect(result.success).toBe(true);
  });

  it("accepts optional scope", () => {
    const result = deviceCodeInitSchema.safeParse({
      client_id: "cli-app",
      scope: "openid email profile",
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing client_id", () => {
    const result = deviceCodeInitSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("rejects empty client_id", () => {
    const result = deviceCodeInitSchema.safeParse({
      client_id: "",
    });
    expect(result.success).toBe(false);
  });
});

// =============================================================================
// deviceAuthorizeSchema
// =============================================================================

describe("deviceAuthorizeSchema", () => {
  it("accepts approve action", () => {
    const result = deviceAuthorizeSchema.safeParse({
      user_code: "ABCD-EFGH",
      action: "approve",
    });
    expect(result.success).toBe(true);
  });

  it("accepts deny action", () => {
    const result = deviceAuthorizeSchema.safeParse({
      user_code: "ABCD-EFGH",
      action: "deny",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid action", () => {
    const result = deviceAuthorizeSchema.safeParse({
      user_code: "ABCD-EFGH",
      action: "cancel",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing user_code", () => {
    const result = deviceAuthorizeSchema.safeParse({
      action: "approve",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty user_code", () => {
    const result = deviceAuthorizeSchema.safeParse({
      user_code: "",
      action: "approve",
    });
    expect(result.success).toBe(false);
  });
});

// =============================================================================
// isValidEmail
// =============================================================================

describe("isValidEmail", () => {
  it("accepts valid email", () => {
    expect(isValidEmail("user@example.com")).toBe(true);
  });

  it("accepts email with subdomain", () => {
    expect(isValidEmail("user@mail.example.com")).toBe(true);
  });

  it("accepts email with plus addressing", () => {
    expect(isValidEmail("user+tag@example.com")).toBe(true);
  });

  it("rejects missing @", () => {
    expect(isValidEmail("userexample.com")).toBe(false);
  });

  it("rejects missing domain", () => {
    expect(isValidEmail("user@")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isValidEmail("")).toBe(false);
  });
});

// =============================================================================
// isValidUrl
// =============================================================================

describe("isValidUrl", () => {
  it("accepts HTTPS URL", () => {
    expect(isValidUrl("https://example.com")).toBe(true);
  });

  it("accepts HTTP URL", () => {
    expect(isValidUrl("http://localhost:3000")).toBe(true);
  });

  it("accepts URL with path", () => {
    expect(isValidUrl("https://example.com/callback")).toBe(true);
  });

  it("rejects bare domain", () => {
    expect(isValidUrl("example.com")).toBe(false);
  });

  it("rejects empty string", () => {
    expect(isValidUrl("")).toBe(false);
  });

  it("rejects random text", () => {
    expect(isValidUrl("not a url at all")).toBe(false);
  });
});

// =============================================================================
// parseFormData
// =============================================================================

describe("parseFormData", () => {
  it("parses simple key-value pairs", () => {
    const result = parseFormData(
      "grant_type=authorization_code&client_id=test",
    );
    expect(result).toEqual({
      grant_type: "authorization_code",
      client_id: "test",
    });
  });

  it("handles URL-encoded values", () => {
    const result = parseFormData(
      "redirect_uri=https%3A%2F%2Fexample.com%2Fcallback",
    );
    expect(result).toEqual({
      redirect_uri: "https://example.com/callback",
    });
  });

  it("handles empty string", () => {
    const result = parseFormData("");
    expect(result).toEqual({});
  });

  it("handles value with equals sign", () => {
    const result = parseFormData("code=abc=def");
    expect(result.code).toBe("abc=def");
  });

  it("handles empty value", () => {
    const result = parseFormData("key=");
    expect(result).toEqual({ key: "" });
  });

  it("last value wins for duplicate keys", () => {
    const result = parseFormData("key=first&key=second");
    expect(result.key).toBe("second");
  });
});
