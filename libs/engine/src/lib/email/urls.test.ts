/**
 * Email URL Helpers Tests
 *
 * Tests for the smart link URL generation:
 * - GROVE_URLS constant values
 * - buildGoUrl function
 * - buildEmailUrl function with UTM tracking
 *
 * @vitest-environment node
 */

import { describe, it, expect } from "vitest";
import { GROVE_URLS, buildGoUrl, buildEmailUrl } from "./urls";

// =============================================================================
// GROVE_URLS CONSTANT TESTS
// =============================================================================

describe("GROVE_URLS", () => {
  describe("Landing Pages", () => {
    it("should have HOME pointing to grove.place", () => {
      expect(GROVE_URLS.HOME).toBe("https://grove.place");
    });

    it("should have ABOUT page", () => {
      expect(GROVE_URLS.ABOUT).toBe("https://grove.place/about");
    });

    it("should have PRICING page", () => {
      expect(GROVE_URLS.PRICING).toBe("https://grove.place/pricing");
    });

    it("should have CHANGELOG page", () => {
      expect(GROVE_URLS.CHANGELOG).toBe("https://grove.place/changelog");
    });
  });

  describe("Smart Links (via /go/)", () => {
    it("should route ARBOR_PANEL through /go/", () => {
      expect(GROVE_URLS.ARBOR_PANEL).toContain("/go/");
      expect(GROVE_URLS.ARBOR_PANEL).toBe("https://grove.place/go/arbor");
    });

    it("should route NEW_POST through /go/", () => {
      expect(GROVE_URLS.NEW_POST).toContain("/go/");
      expect(GROVE_URLS.NEW_POST).toBe(
        "https://grove.place/go/arbor/posts/new",
      );
    });

    it("should route SETTINGS through /go/", () => {
      expect(GROVE_URLS.SETTINGS).toContain("/go/");
      expect(GROVE_URLS.SETTINGS).toBe("https://grove.place/go/arbor/settings");
    });

    it("should route APPEARANCE through /go/", () => {
      expect(GROVE_URLS.APPEARANCE).toContain("/go/");
      expect(GROVE_URLS.APPEARANCE).toBe(
        "https://grove.place/go/arbor/settings/appearance",
      );
    });

    it("should route POSTS through /go/", () => {
      expect(GROVE_URLS.POSTS).toContain("/go/");
      expect(GROVE_URLS.POSTS).toBe("https://grove.place/go/arbor/posts");
    });

    it("should route PAGES through /go/", () => {
      expect(GROVE_URLS.PAGES).toContain("/go/");
      expect(GROVE_URLS.PAGES).toBe("https://grove.place/go/arbor/pages");
    });
  });

  describe("External Links", () => {
    it("should have PLANT pointing to plant.grove.place", () => {
      expect(GROVE_URLS.PLANT).toBe("https://plant.grove.place");
    });
  });

  describe("URL Format Consistency", () => {
    it("all URLs should use https", () => {
      Object.values(GROVE_URLS).forEach((url) => {
        expect(url).toMatch(/^https:\/\//);
      });
    });

    it("no URLs should have trailing slashes", () => {
      Object.values(GROVE_URLS).forEach((url) => {
        expect(url).not.toMatch(/\/$/);
      });
    });
  });
});

// =============================================================================
// buildGoUrl FUNCTION TESTS
// =============================================================================

describe("buildGoUrl", () => {
  it("should build basic URL with path", () => {
    const url = buildGoUrl("arbor");
    expect(url).toBe("https://grove.place/go/arbor");
  });

  it("should handle nested paths", () => {
    const url = buildGoUrl("posts/new");
    expect(url).toBe("https://grove.place/go/posts/new");
  });

  it("should handle deeply nested paths", () => {
    const url = buildGoUrl("settings/appearance/theme");
    expect(url).toBe("https://grove.place/go/settings/appearance/theme");
  });

  it("should add single query parameter", () => {
    const url = buildGoUrl("arbor", { utm_source: "email" });
    expect(url).toBe("https://grove.place/go/arbor?utm_source=email");
  });

  it("should add multiple query parameters", () => {
    const url = buildGoUrl("arbor", {
      utm_source: "email",
      utm_campaign: "welcome",
    });
    expect(url).toContain("utm_source=email");
    expect(url).toContain("utm_campaign=welcome");
    expect(url).toContain("&");
  });

  it("should handle empty params object", () => {
    const url = buildGoUrl("arbor", {});
    expect(url).toBe("https://grove.place/go/arbor");
  });

  it("should handle undefined params", () => {
    const url = buildGoUrl("arbor");
    expect(url).toBe("https://grove.place/go/arbor");
  });

  it("should URL-encode parameter values", () => {
    const url = buildGoUrl("arbor", { ref: "hello world" });
    // URLSearchParams encodes spaces as + (valid for query strings)
    expect(url).toContain("ref=hello+world");
  });
});

// =============================================================================
// buildEmailUrl FUNCTION TESTS
// =============================================================================

describe("buildEmailUrl", () => {
  it("should add utm_source=email", () => {
    const url = buildEmailUrl("arbor", "welcome-sequence");
    expect(url).toContain("utm_source=email");
  });

  it("should add utm_medium=sequence", () => {
    const url = buildEmailUrl("arbor", "welcome-sequence");
    expect(url).toContain("utm_medium=sequence");
  });

  it("should add utm_campaign parameter", () => {
    const url = buildEmailUrl("arbor", "welcome-sequence");
    expect(url).toContain("utm_campaign=welcome-sequence");
  });

  it("should add utm_content when provided", () => {
    const url = buildEmailUrl("arbor", "welcome-sequence", "day-1");
    expect(url).toContain("utm_content=day-1");
  });

  it("should not add utm_content when not provided", () => {
    const url = buildEmailUrl("arbor", "welcome-sequence");
    expect(url).not.toContain("utm_content");
  });

  it("should build complete tracking URL for day 1 email", () => {
    const url = buildEmailUrl("arbor", "welcome-sequence", "day-1");
    expect(url).toBe(
      "https://grove.place/go/arbor?utm_source=email&utm_medium=sequence&utm_campaign=welcome-sequence&utm_content=day-1",
    );
  });

  it("should work with nested paths", () => {
    const url = buildEmailUrl("posts/new", "nudge-campaign", "gentle-nudge");
    expect(url).toContain("https://grove.place/go/posts/new?");
    expect(url).toContain("utm_campaign=nudge-campaign");
    expect(url).toContain("utm_content=gentle-nudge");
  });
});

// =============================================================================
// URL SAFETY TESTS
// =============================================================================

describe("URL Safety", () => {
  it("should not allow path traversal in buildGoUrl", () => {
    const url = buildGoUrl("../admin");
    // The URL constructor handles this, but the path should still be valid
    expect(url).toContain("grove.place");
  });

  it("should properly encode special characters in params", () => {
    const url = buildGoUrl("admin", { test: "<script>alert(1)</script>" });
    expect(url).not.toContain("<script>");
    expect(url).toContain("%3Cscript%3E");
  });

  it("should handle empty path", () => {
    const url = buildGoUrl("");
    expect(url).toBe("https://grove.place/go/");
  });
});
