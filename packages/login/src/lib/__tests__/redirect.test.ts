/**
 * Redirect URL Validation Tests
 *
 * Security-critical: These tests ensure we never redirect to untrusted origins.
 * An open redirect on an auth hub is a high-severity vulnerability.
 */

import { describe, it, expect } from "vitest";
import { validateRedirectUrl, DEFAULT_REDIRECT } from "../redirect";

describe("validateRedirectUrl", () => {
  // ─── Valid redirect URLs ─────────────────────────────────────────────

  describe("allows grove.place subdomains", () => {
    it("allows plant.grove.place", () => {
      expect(
        validateRedirectUrl("https://plant.grove.place/auth/callback"),
      ).toBe("https://plant.grove.place/auth/callback");
    });

    it("allows any subdomain of grove.place", () => {
      expect(validateRedirectUrl("https://autumn.grove.place/arbor")).toBe(
        "https://autumn.grove.place/arbor",
      );
    });

    it("allows bare grove.place", () => {
      expect(validateRedirectUrl("https://grove.place/pricing")).toBe(
        "https://grove.place/pricing",
      );
    });

    it("allows login.grove.place", () => {
      expect(validateRedirectUrl("https://login.grove.place/callback")).toBe(
        "https://login.grove.place/callback",
      );
    });
  });

  describe("allows autumnsgrove.com", () => {
    it("allows autumnsgrove.com paths", () => {
      expect(validateRedirectUrl("https://autumnsgrove.com/blog")).toBe(
        "https://autumnsgrove.com/blog",
      );
    });
  });

  describe("allows relative URLs", () => {
    it("allows simple relative paths", () => {
      expect(validateRedirectUrl("/arbor")).toBe("/arbor");
    });

    it("allows nested relative paths", () => {
      expect(validateRedirectUrl("/auth/callback?returnTo=/arbor")).toBe(
        "/auth/callback?returnTo=/arbor",
      );
    });
  });

  // ─── Blocked redirect URLs ───────────────────────────────────────────

  describe("blocks dangerous URLs", () => {
    it("blocks javascript: URIs", () => {
      expect(validateRedirectUrl("javascript:alert(1)")).toBe(DEFAULT_REDIRECT);
    });

    it("blocks JavaScript: (case-insensitive)", () => {
      expect(validateRedirectUrl("JavaScript:alert(1)")).toBe(DEFAULT_REDIRECT);
    });

    it("blocks data: URIs", () => {
      expect(validateRedirectUrl("data:text/html,<h1>evil</h1>")).toBe(
        DEFAULT_REDIRECT,
      );
    });

    it("blocks vbscript: URIs", () => {
      expect(validateRedirectUrl("vbscript:msgbox")).toBe(DEFAULT_REDIRECT);
    });

    it("blocks protocol-relative URLs (//evil.com)", () => {
      expect(validateRedirectUrl("//evil.com/path")).toBe(DEFAULT_REDIRECT);
    });
  });

  describe("blocks external domains", () => {
    it("blocks non-grove domains", () => {
      expect(validateRedirectUrl("https://evil.com/phish")).toBe(
        DEFAULT_REDIRECT,
      );
    });

    it("blocks look-alike domains", () => {
      expect(validateRedirectUrl("https://grove.place.evil.com/")).toBe(
        DEFAULT_REDIRECT,
      );
    });

    it("blocks http grove.place (production requires https)", () => {
      // grove.place regex requires https://
      expect(validateRedirectUrl("http://grove.place/")).toBe(DEFAULT_REDIRECT);
    });

    it("blocks ftp scheme", () => {
      expect(validateRedirectUrl("ftp://grove.place/file")).toBe(
        DEFAULT_REDIRECT,
      );
    });
  });

  describe("handles edge cases", () => {
    it("returns default for null", () => {
      expect(validateRedirectUrl(null)).toBe(DEFAULT_REDIRECT);
    });

    it("returns default for undefined", () => {
      expect(validateRedirectUrl(undefined)).toBe(DEFAULT_REDIRECT);
    });

    it("returns default for empty string", () => {
      expect(validateRedirectUrl("")).toBe(DEFAULT_REDIRECT);
    });

    it("returns default for malformed URLs", () => {
      expect(validateRedirectUrl("not a url at all")).toBe(DEFAULT_REDIRECT);
    });
  });

  // ─── Dev mode ────────────────────────────────────────────────────────

  describe("dev mode", () => {
    it("allows localhost in dev mode", () => {
      expect(validateRedirectUrl("http://localhost:5173/callback", true)).toBe(
        "http://localhost:5173/callback",
      );
    });

    it("allows 127.0.0.1 in dev mode", () => {
      expect(validateRedirectUrl("http://127.0.0.1:5173/callback", true)).toBe(
        "http://127.0.0.1:5173/callback",
      );
    });

    it("blocks localhost in production mode", () => {
      expect(validateRedirectUrl("http://localhost:5173/callback", false)).toBe(
        DEFAULT_REDIRECT,
      );
    });
  });
});
