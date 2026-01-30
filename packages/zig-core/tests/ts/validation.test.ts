import { describe, it, expect } from "vitest";
import {
  validateEmailSync,
  validateURLSync,
  validateSlugSync,
  slugifySync,
  validatePathSync,
} from "../../lib/validation.js";

describe("Email Validation (JS fallback)", () => {
  it("validates correct emails", () => {
    expect(validateEmailSync("test@example.com")).toBe(true);
    expect(validateEmailSync("user.name@domain.org")).toBe(true);
    expect(validateEmailSync("user+tag@sub.domain.co.uk")).toBe(true);
  });

  it("rejects invalid emails", () => {
    expect(validateEmailSync("")).toBe(false);
    expect(validateEmailSync("notanemail")).toBe(false);
    expect(validateEmailSync("@domain.com")).toBe(false);
    expect(validateEmailSync("user@")).toBe(false);
    expect(validateEmailSync("user@domain")).toBe(false); // Missing TLD
  });

  it("rejects oversized emails", () => {
    const longEmail = "a".repeat(250) + "@example.com";
    expect(validateEmailSync(longEmail)).toBe(false);
  });
});

describe("URL Validation (JS fallback)", () => {
  it("validates http and https URLs", () => {
    expect(validateURLSync("https://example.com")).toBe(true);
    expect(validateURLSync("http://example.com")).toBe(true);
    expect(validateURLSync("https://sub.domain.example.com/path")).toBe(true);
    expect(validateURLSync("http://localhost:3000")).toBe(true);
  });

  it("rejects non-http protocols", () => {
    expect(validateURLSync("ftp://example.com")).toBe(false);
    expect(validateURLSync("file:///etc/passwd")).toBe(false);
    expect(validateURLSync("javascript:alert(1)")).toBe(false);
  });

  it("rejects invalid URLs", () => {
    expect(validateURLSync("")).toBe(false);
    expect(validateURLSync("not a url")).toBe(false);
    expect(validateURLSync("example.com")).toBe(false);
  });
});

describe("Slug Validation (JS fallback)", () => {
  it("validates correct slugs", () => {
    expect(validateSlugSync("hello-world")).toBe(true);
    expect(validateSlugSync("my-post-123")).toBe(true);
    expect(validateSlugSync("a")).toBe(true);
  });

  it("rejects invalid slugs", () => {
    expect(validateSlugSync("")).toBe(false);
    expect(validateSlugSync("Hello-World")).toBe(false); // Uppercase
    expect(validateSlugSync("hello_world")).toBe(false); // Underscore
    expect(validateSlugSync("hello world")).toBe(false); // Space
  });
});

describe("Slugify (JS fallback)", () => {
  it("converts strings to slugs", () => {
    expect(slugifySync("Hello World")).toBe("hello-world");
    expect(slugifySync("My Post Title!")).toBe("my-post-title");
    expect(slugifySync("UPPERCASE")).toBe("uppercase");
  });

  it("handles special characters", () => {
    expect(slugifySync("hello@world")).toBe("helloworld");
    expect(slugifySync("test   multiple   spaces")).toBe(
      "test-multiple-spaces",
    );
    expect(slugifySync("  leading and trailing  ")).toBe(
      "leading-and-trailing",
    );
  });
});

describe("Path Validation (JS fallback)", () => {
  it("allows safe paths", () => {
    expect(validatePathSync("images/photo.jpg")).toBe(true);
    expect(validatePathSync("path/to/file.txt")).toBe(true);
    expect(validatePathSync("simple-file.md")).toBe(true);
  });

  it("blocks directory traversal", () => {
    expect(validatePathSync("../secret")).toBe(false);
    expect(validatePathSync("path/../../../etc/passwd")).toBe(false);
    expect(validatePathSync("foo/..")).toBe(false);
  });

  it("blocks encoded traversal attacks", () => {
    expect(validatePathSync("%2e%2e/secret")).toBe(false);
    expect(validatePathSync("..%2f..%2fetc")).toBe(false);
    expect(validatePathSync("0x2e0x2e/etc")).toBe(false);
  });

  it("blocks absolute paths", () => {
    expect(validatePathSync("/etc/passwd")).toBe(false);
    expect(validatePathSync("\\Windows\\System32")).toBe(false);
  });

  it("blocks invalid characters", () => {
    expect(validatePathSync("path<script>")).toBe(false);
    expect(validatePathSync("file:name")).toBe(false);
  });
});
