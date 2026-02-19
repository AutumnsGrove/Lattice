/**
 * Tests for SSRF (Server-Side Request Forgery) validation
 *
 * Security-critical tests that ensure the OG worker can't be abused
 * to access internal/private resources. These protect against:
 * - Cloud metadata endpoint access (AWS/GCP/Azure instance data)
 * - Internal network scanning
 * - Localhost service access
 */
import { describe, it, expect } from "vitest";
import { isAllowedUrl, isBlockedExternalUrl } from "../src/pure-functions";

describe("isAllowedUrl (OG image generation allowlist)", () => {
  describe("allowed domains", () => {
    it("should allow grove.place", () => {
      expect(isAllowedUrl("https://grove.place/some-path")).toBe(true);
    });

    it("should allow cdn.grove.place", () => {
      expect(isAllowedUrl("https://cdn.grove.place/fonts/Lexend.ttf")).toBe(
        true,
      );
    });

    it("should allow imagedelivery.net (Cloudflare Images)", () => {
      expect(isAllowedUrl("https://imagedelivery.net/abc123/image.jpg")).toBe(
        true,
      );
    });

    it("should allow subdomains of grove.place", () => {
      expect(isAllowedUrl("https://autumn.grove.place/blog/post")).toBe(true);
      expect(isAllowedUrl("https://test.grove.place/")).toBe(true);
      expect(isAllowedUrl("https://deep.nested.grove.place/path")).toBe(true);
    });
  });

  describe("blocked private IPs (RFC 1918)", () => {
    it("should block 127.0.0.1 (localhost)", () => {
      expect(isAllowedUrl("https://127.0.0.1/arbor")).toBe(false);
    });

    it("should block 192.168.x.x (private network)", () => {
      expect(isAllowedUrl("https://192.168.1.1/router")).toBe(false);
      expect(isAllowedUrl("https://192.168.0.1/")).toBe(false);
      expect(isAllowedUrl("https://192.168.255.255/")).toBe(false);
    });

    it("should block 10.x.x.x (private network)", () => {
      expect(isAllowedUrl("https://10.0.0.1/internal")).toBe(false);
      expect(isAllowedUrl("https://10.255.255.255/")).toBe(false);
    });

    it("should block 172.x.x.x (private network - checks prefix only)", () => {
      // Note: The current implementation blocks all 172.* which is overly broad
      // but safe (true 172.16-31 range blocking would be more precise)
      expect(isAllowedUrl("https://172.16.0.1/")).toBe(false);
      expect(isAllowedUrl("https://172.31.255.255/")).toBe(false);
    });
  });

  describe("blocked localhost variations", () => {
    it("should block localhost by name", () => {
      expect(isAllowedUrl("https://localhost/api")).toBe(false);
    });

    it("should block .local domains", () => {
      expect(isAllowedUrl("https://server.local/arbor")).toBe(false);
      expect(isAllowedUrl("https://anything.local/")).toBe(false);
    });
  });

  describe("protocol restrictions", () => {
    it("should block non-HTTPS URLs", () => {
      expect(isAllowedUrl("http://grove.place/")).toBe(false);
    });

    it("should block file:// protocol", () => {
      expect(isAllowedUrl("file:///etc/passwd")).toBe(false);
    });

    it("should block javascript: protocol", () => {
      expect(isAllowedUrl("javascript:alert(1)")).toBe(false);
    });

    it("should block data: protocol", () => {
      expect(isAllowedUrl("data:text/html,<script>alert(1)</script>")).toBe(
        false,
      );
    });
  });

  describe("external domains (not in allowlist)", () => {
    it("should block arbitrary external domains", () => {
      expect(isAllowedUrl("https://example.com/")).toBe(false);
      expect(isAllowedUrl("https://google.com/")).toBe(false);
      expect(isAllowedUrl("https://evil.site/ssrf")).toBe(false);
    });

    it("should block domains that look like grove.place but aren't", () => {
      expect(isAllowedUrl("https://fakegrove.place/")).toBe(false);
      expect(isAllowedUrl("https://grove.place.evil.com/")).toBe(false);
      expect(isAllowedUrl("https://not-grove.place/")).toBe(false);
    });
  });

  describe("invalid URLs", () => {
    it("should return false for malformed URLs", () => {
      expect(isAllowedUrl("not-a-url")).toBe(false);
      expect(isAllowedUrl("")).toBe(false);
      expect(isAllowedUrl("://missing-protocol")).toBe(false);
    });
  });
});

describe("isBlockedExternalUrl (external OG fetch blocklist)", () => {
  describe("localhost variations", () => {
    it("should block http://localhost", () => {
      expect(isBlockedExternalUrl("http://localhost/")).toBe(true);
      expect(isBlockedExternalUrl("https://localhost/api")).toBe(true);
    });

    it("should block 127.x.x.x", () => {
      expect(isBlockedExternalUrl("http://127.0.0.1/")).toBe(true);
      expect(isBlockedExternalUrl("https://127.0.0.1:8080/arbor")).toBe(true);
    });

    it("should block 0.x.x.x (any local address)", () => {
      expect(isBlockedExternalUrl("http://0.0.0.0/")).toBe(true);
    });
  });

  describe("private IP ranges (RFC 1918)", () => {
    it("should block 10.x.x.x", () => {
      expect(isBlockedExternalUrl("http://10.0.0.1/")).toBe(true);
      expect(isBlockedExternalUrl("https://10.255.255.255/secret")).toBe(true);
    });

    it("should block 172.16-31.x.x", () => {
      expect(isBlockedExternalUrl("http://172.16.0.1/")).toBe(true);
      expect(isBlockedExternalUrl("http://172.20.0.1/")).toBe(true);
      expect(isBlockedExternalUrl("http://172.31.255.255/")).toBe(true);
    });

    it("should not block 172.32+ (public range)", () => {
      // 172.32+ is public IP space
      expect(isBlockedExternalUrl("http://172.32.0.1/")).toBe(false);
      expect(isBlockedExternalUrl("http://172.15.0.1/")).toBe(false);
    });

    it("should block 192.168.x.x", () => {
      expect(isBlockedExternalUrl("http://192.168.1.1/")).toBe(true);
      expect(isBlockedExternalUrl("https://192.168.0.1/router")).toBe(true);
    });
  });

  describe("link-local addresses (RFC 3927)", () => {
    it("should block 169.254.x.x", () => {
      expect(isBlockedExternalUrl("http://169.254.1.1/")).toBe(true);
    });
  });

  describe("cloud metadata endpoints (critical security)", () => {
    it("should block AWS/GCP/Azure metadata endpoint 169.254.169.254", () => {
      expect(
        isBlockedExternalUrl("http://169.254.169.254/latest/meta-data/"),
      ).toBe(true);
      expect(
        isBlockedExternalUrl(
          "http://169.254.169.254/computeMetadata/v1/instance",
        ),
      ).toBe(true);
    });

    it("should block metadata.* hostnames", () => {
      expect(isBlockedExternalUrl("http://metadata.google.internal/")).toBe(
        true,
      );
      expect(isBlockedExternalUrl("https://metadata.azure.com/")).toBe(true);
    });

    it("should block metadata-* hostnames", () => {
      expect(isBlockedExternalUrl("http://metadata-server.internal/")).toBe(
        true,
      );
    });
  });

  describe("IPv6 blocking", () => {
    it("should block IPv6 localhost (::1)", () => {
      expect(isBlockedExternalUrl("http://[::1]/")).toBe(true);
    });

    it("should block IPv6 link-local (fe80::)", () => {
      expect(isBlockedExternalUrl("http://[fe80::1]/")).toBe(true);
      expect(isBlockedExternalUrl("http://[FE80::1]/")).toBe(true);
    });

    it("should block IPv6 unique local addresses (fc00::/7)", () => {
      expect(isBlockedExternalUrl("http://[fc00::1]/")).toBe(true);
      expect(isBlockedExternalUrl("http://[fd00::1]/")).toBe(true);
    });
  });

  describe("dangerous protocols", () => {
    it("should block file:// protocol", () => {
      expect(isBlockedExternalUrl("file:///etc/passwd")).toBe(true);
      expect(isBlockedExternalUrl("file:///C:/Windows/System32/")).toBe(true);
    });

    it("should block data: protocol", () => {
      expect(
        isBlockedExternalUrl("data:text/html,<script>alert(1)</script>"),
      ).toBe(true);
    });
  });

  describe("allowed public URLs", () => {
    it("should allow normal HTTPS URLs", () => {
      expect(isBlockedExternalUrl("https://example.com/")).toBe(false);
      expect(isBlockedExternalUrl("https://github.com/")).toBe(false);
      expect(isBlockedExternalUrl("https://twitter.com/user")).toBe(false);
    });

    it("should allow normal HTTP URLs (for external fetch)", () => {
      // External fetch allows HTTP (just not for OG image source)
      expect(isBlockedExternalUrl("http://example.com/")).toBe(false);
    });
  });
});
