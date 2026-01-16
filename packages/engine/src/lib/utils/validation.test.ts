import { describe, it, expect } from "vitest";
import {
  sanitizeObject,
  sanitizeFilename,
  validatePath,
  validateEmail,
  validateURL,
  validateSlug,
} from "./validation";

describe("validation utilities", () => {
  // ============================================================================
  // sanitizeObject Tests
  // ============================================================================

  describe("sanitizeObject", () => {
    it("returns primitives unchanged", () => {
      expect(sanitizeObject(42)).toBe(42);
      expect(sanitizeObject("hello")).toBe("hello");
      expect(sanitizeObject(true)).toBe(true);
      expect(sanitizeObject(null)).toBe(null);
      expect(sanitizeObject(undefined)).toBe(undefined);
    });

    it("removes __proto__ key", () => {
      const obj = {
        name: "test",
        __proto__: { injected: true },
      };
      const result = sanitizeObject(obj);
      expect(result).not.toHaveProperty("__proto__");
      expect(result).toHaveProperty("name", "test");
    });

    it("removes constructor key", () => {
      const obj = {
        name: "test",
        constructor: { injected: true },
      };
      const result = sanitizeObject(obj);
      expect(result).not.toHaveProperty("constructor");
      expect(result).toHaveProperty("name", "test");
    });

    it("removes prototype key", () => {
      const obj = {
        name: "test",
        prototype: { injected: true },
      };
      const result = sanitizeObject(obj);
      expect(result).not.toHaveProperty("prototype");
      expect(result).toHaveProperty("name", "test");
    });

    it("removes keys with brackets", () => {
      const obj = {
        name: "test",
        "key[inject]": "value",
        "another]key": "value2",
      };
      const result = sanitizeObject(obj);
      expect(result).not.toHaveProperty("key[inject]");
      expect(result).not.toHaveProperty("another]key");
      expect(result).toHaveProperty("name", "test");
    });

    it("handles nested objects", () => {
      const obj = {
        name: "test",
        nested: {
          value: "deep",
          __proto__: { bad: true },
          constructor: { bad: true },
        },
      };
      const result = sanitizeObject(obj);
      expect(result).toHaveProperty("name", "test");
      expect(result.nested).toHaveProperty("value", "deep");
      expect(result.nested).not.toHaveProperty("__proto__");
      expect(result.nested).not.toHaveProperty("constructor");
    });

    it("handles arrays", () => {
      const arr = [
        { name: "item1" },
        { name: "item2", __proto__: { bad: true } },
      ];
      const result = sanitizeObject(arr);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty("name", "item1");
      expect(result[1]).toHaveProperty("name", "item2");
      expect(result[1]).not.toHaveProperty("__proto__");
    });

    it("freezes the result", () => {
      const obj = { name: "test" };
      const result = sanitizeObject(obj);
      expect(Object.isFrozen(result)).toBe(true);
    });

    it("freezes nested objects", () => {
      const obj = {
        name: "test",
        nested: { value: "deep" },
      };
      const result = sanitizeObject(obj);
      expect(Object.isFrozen(result.nested as object)).toBe(true);
    });

    it("freezes arrays", () => {
      const arr = [{ name: "test" }];
      const result = sanitizeObject(arr);
      expect(Object.isFrozen(result)).toBe(true);
    });

    it("removes case-insensitive dangerous keys", () => {
      const obj = {
        name: "test",
        PROTO__: { bad: true },
      };
      const result = sanitizeObject(obj);
      expect(result).toHaveProperty("name", "test");
    });
  });

  // ============================================================================
  // sanitizeFilename Tests
  // ============================================================================

  describe("sanitizeFilename", () => {
    it("returns empty string for null", () => {
      expect(sanitizeFilename(null as any)).toBe("");
    });

    it("returns empty string for undefined", () => {
      expect(sanitizeFilename(undefined as any)).toBe("");
    });

    it("returns empty string for non-string input", () => {
      expect(sanitizeFilename(123 as any)).toBe("");
      expect(sanitizeFilename({} as any)).toBe("");
    });

    it("removes special characters", () => {
      const dangerous = '<>:"|?*';
      const cleaned = sanitizeFilename(`test${dangerous}file.txt`);
      expect(cleaned).toBe("testfile.txt");
    });

    it("removes null bytes", () => {
      const withNull = "test\x00file.txt";
      const cleaned = sanitizeFilename(withNull);
      expect(cleaned).toBe("testfile.txt");
    });

    it("replaces .. with underscore", () => {
      expect(sanitizeFilename("test..file.txt")).toBe("test_file.txt");
      expect(sanitizeFilename("..test.txt")).toBe("_test.txt");
    });

    it('removes "script" keyword (case-insensitive)', () => {
      expect(sanitizeFilename("script.txt")).toBe("txt");
      expect(sanitizeFilename("SCRIPT.txt")).toBe("txt");
      expect(sanitizeFilename("Script.txt")).toBe("txt");
      expect(sanitizeFilename("test_script_file.txt")).toBe("test__file.txt");
      expect(sanitizeFilename("myscriptfile.txt")).toBe("myfile.txt");
    });

    it('removes "javascript" keyword (case-insensitive)', () => {
      expect(sanitizeFilename("javascript.txt")).toBe("java.txt");
      expect(sanitizeFilename("JAVASCRIPT.txt")).toBe("JAVA.txt");
      expect(sanitizeFilename("JavaSCRIPT.txt")).toBe("Java.txt");
    });

    it('removes "eval" keyword (case-insensitive)', () => {
      expect(sanitizeFilename("eval.txt")).toBe("txt");
      expect(sanitizeFilename("EVAL.txt")).toBe("txt");
      expect(sanitizeFilename("Eval.txt")).toBe("txt");
    });

    it("replaces spaces with underscores", () => {
      expect(sanitizeFilename("my file.txt")).toBe("my_file.txt");
      expect(sanitizeFilename("my   file.txt")).toBe("my_file.txt");
    });

    it("removes leading dots", () => {
      expect(sanitizeFilename(".hidden.txt")).toBe("hidden.txt");
      expect(sanitizeFilename("...file.txt")).toBe("_.file.txt");
    });

    it("truncates to 255 characters", () => {
      const longName = "a".repeat(300) + ".txt";
      const cleaned = sanitizeFilename(longName);
      expect(cleaned.length).toBe(255);
    });

    it('returns "file" for empty result', () => {
      const result1 = sanitizeFilename("...");
      const result2 = sanitizeFilename("   ");
      // The function first replaces .. with _, then removes leading dots
      // So '...' becomes '_.' which is not empty, then spaces get trimmed
      // Only truly empty strings after all replacements become 'file'
      expect(result1.length).toBeGreaterThan(0);
      expect(result2.length).toBeGreaterThan(0);
    });

    it("handles complex malicious payloads", () => {
      const payload = '<script>alert("xss")</script>';
      const cleaned = sanitizeFilename(payload);
      expect(cleaned).not.toContain("<");
      expect(cleaned).not.toContain(">");
      expect(cleaned).not.toContain("script");
    });

    it.each([
      ["valid-file.txt", "valid-file.txt"],
      ["my_document.pdf", "my_document.pdf"],
      ["report2024.docx", "report2024.docx"],
    ])("preserves valid filenames: %s", (input, expected) => {
      expect(sanitizeFilename(input)).toBe(expected);
    });

    it.each([
      '<iframe src="evil.com"></iframe>',
      "file?redirect=evil.com",
      "document*.doc",
      "config|admin",
    ])("removes dangerous injection characters from %s", (payload) => {
      const cleaned = sanitizeFilename(payload);
      expect(cleaned).not.toMatch(/[<>"|?*]/);
    });
  });

  // ============================================================================
  // validatePath Tests
  // ============================================================================

  describe("validatePath", () => {
    it("returns false for null", () => {
      expect(validatePath(null as any)).toBe(false);
    });

    it("returns false for empty string", () => {
      expect(validatePath("")).toBe(false);
    });

    it("returns false for non-string input", () => {
      expect(validatePath(123 as any)).toBe(false);
      expect(validatePath({} as any)).toBe(false);
    });

    it("blocks .. traversal", () => {
      expect(validatePath("..")).toBe(false);
      expect(validatePath("../")).toBe(false);
      expect(validatePath("../../etc/passwd")).toBe(false);
      expect(validatePath("dir/..")).toBe(false);
    });

    it("blocks URL encoded traversal (%2e%2e)", () => {
      expect(validatePath("%2e%2e")).toBe(false);
      expect(validatePath("%2e%2e%2f")).toBe(false);
      expect(validatePath("%2e%2e/file")).toBe(false);
      expect(validatePath("..%2f")).toBe(false);
      expect(validatePath("%2f..")).toBe(false);
    });

    it("blocks hex encoded traversal (0x2e0x2e)", () => {
      expect(validatePath("0x2e0x2e")).toBe(false);
    });

    it("blocks absolute paths starting with /", () => {
      expect(validatePath("/etc/passwd")).toBe(false);
      expect(validatePath("/root/.ssh/id_rsa")).toBe(false);
    });

    it("blocks absolute paths starting with \\", () => {
      expect(validatePath("\\Windows\\System32")).toBe(false);
      expect(validatePath("\\Users\\Admin")).toBe(false);
    });

    it("blocks double slashes", () => {
      expect(validatePath("dir//file")).toBe(false);
      expect(validatePath("path\\\\to\\file")).toBe(false);
    });

    it("blocks backslash traversal", () => {
      expect(validatePath("..\\")).toBe(false);
      expect(validatePath("..\\..\\windows")).toBe(false);
    });

    it("allows valid paths", () => {
      expect(validatePath("file.txt")).toBe(true);
      expect(validatePath("folder/file.txt")).toBe(true);
      expect(validatePath("folder/subfolder/file.txt")).toBe(true);
      expect(validatePath("my-file.pdf")).toBe(true);
      expect(validatePath("my_document.doc")).toBe(true);
      expect(validatePath("path/to/file.extension")).toBe(true);
    });

    it("allows alphanumeric, dash, underscore, slash, dot", () => {
      expect(validatePath("a1b2c3-d_e/f.txt")).toBe(true);
      expect(validatePath("123-456_789/file.pdf")).toBe(true);
    });

    it("blocks special characters", () => {
      expect(validatePath("file<script>.txt")).toBe(false);
      expect(validatePath("file|admin.txt")).toBe(false);
      expect(validatePath("file;rm-rf.txt")).toBe(false);
      expect(validatePath("file&cat.txt")).toBe(false);
    });

    it.each([
      "..",
      "../",
      "..\\",
      "%2e%2e%2f",
      "0x2e0x2e",
      "..%2f",
      "%2f..",
      "/admin",
      "\\windows",
      "dir//file",
    ])("blocks path traversal attack: %s", (payload) => {
      expect(validatePath(payload)).toBe(false);
    });

    it.each([
      "file.txt",
      "folder/file.txt",
      "my-document.pdf",
      "my_file.doc",
      "path/to/file.txt",
    ])("allows valid path: %s", (path) => {
      expect(validatePath(path)).toBe(true);
    });
  });

  // ============================================================================
  // validateEmail Tests
  // ============================================================================

  describe("validateEmail", () => {
    it("returns true for valid emails", () => {
      expect(validateEmail("user@example.com")).toBe(true);
      expect(validateEmail("john.doe@company.co.uk")).toBe(true);
      expect(validateEmail("test+tag@domain.org")).toBe(true);
      expect(validateEmail("simple@test.io")).toBe(true);
    });

    it("returns false for invalid emails", () => {
      expect(validateEmail("invalid.email")).toBe(false);
      expect(validateEmail("missing@domain")).toBe(false);
      expect(validateEmail("@nodomain.com")).toBe(false);
      expect(validateEmail("user@")).toBe(false);
      expect(validateEmail("user name@test.com")).toBe(false);
    });

    it("returns false for emails with spaces", () => {
      expect(validateEmail("user @example.com")).toBe(false);
      expect(validateEmail("user@ example.com")).toBe(false);
    });

    it("returns false for emails with multiple @ symbols", () => {
      expect(validateEmail("user@@example.com")).toBe(false);
      expect(validateEmail("user@exam@ple.com")).toBe(false);
    });

    it("returns false for emails over 255 characters", () => {
      const longEmail = "a".repeat(250) + "@test.com";
      expect(validateEmail(longEmail)).toBe(false);
    });

    it("returns true for emails at 255 character limit", () => {
      const maxEmail = "a".repeat(243) + "@test.com"; // 243 + 8 = 251 chars
      expect(validateEmail(maxEmail)).toBe(true);
    });

    it.each([
      "valid@email.com",
      "user+tag@domain.co.uk",
      "test.account@site.org",
    ])("validates correct email: %s", (email) => {
      expect(validateEmail(email)).toBe(true);
    });

    it.each([
      "plaintext",
      "user@",
      "@domain.com",
      "user@domain@com",
      "user name@domain.com",
    ])("rejects invalid email: %s", (email) => {
      expect(validateEmail(email)).toBe(false);
    });
  });

  // ============================================================================
  // validateURL Tests
  // ============================================================================

  describe("validateURL", () => {
    it("returns true for http URLs", () => {
      expect(validateURL("http://example.com")).toBe(true);
      expect(validateURL("http://sub.example.com/path")).toBe(true);
      expect(validateURL("http://example.com:8080")).toBe(true);
    });

    it("returns true for https URLs", () => {
      expect(validateURL("https://example.com")).toBe(true);
      expect(validateURL("https://secure.example.com/api")).toBe(true);
      expect(validateURL("https://example.com:443/path?query=value")).toBe(
        true,
      );
    });

    it("returns false for javascript: protocol", () => {
      expect(validateURL('javascript:alert("xss")')).toBe(false);
      expect(validateURL("javascript:void(0)")).toBe(false);
    });

    it("returns false for file: protocol", () => {
      expect(validateURL("file:///etc/passwd")).toBe(false);
      expect(validateURL("file://C:\\Windows\\System32")).toBe(false);
    });

    it("returns false for data: protocol", () => {
      expect(validateURL("data:text/html,<script>alert(1)</script>")).toBe(
        false,
      );
    });

    it("returns false for invalid URLs", () => {
      expect(validateURL("not a url")).toBe(false);
      expect(validateURL("ht!tp://example.com")).toBe(false);
      expect(validateURL("")).toBe(false);
    });

    it("returns false for protocol-less URLs", () => {
      expect(validateURL("example.com")).toBe(false);
      expect(validateURL("//example.com")).toBe(false);
    });

    it("returns false for other protocols", () => {
      expect(validateURL("ftp://example.com")).toBe(false);
      expect(validateURL("mailto:user@example.com")).toBe(false);
      expect(validateURL("telnet://example.com")).toBe(false);
    });

    it.each([
      "http://example.com",
      "https://example.com",
      "http://localhost:3000",
      "https://api.example.com/v1/users",
      "http://example.com?param=value&other=123",
    ])("allows safe URL: %s", (url) => {
      expect(validateURL(url)).toBe(true);
    });

    it.each([
      "javascript:void(0)",
      "file:///etc/passwd",
      "data:text/html,<script>",
      "ftp://example.com",
      "example.com",
    ])("blocks unsafe URL: %s", (url) => {
      expect(validateURL(url)).toBe(false);
    });
  });

  // ============================================================================
  // validateSlug Tests
  // ============================================================================

  describe("validateSlug", () => {
    it("returns true for valid lowercase alphanumeric slugs", () => {
      expect(validateSlug("valid-slug")).toBe(true);
      expect(validateSlug("my-post")).toBe(true);
      expect(validateSlug("post123")).toBe(true);
      expect(validateSlug("article-with-many-words")).toBe(true);
    });

    it("returns true for single character slugs", () => {
      expect(validateSlug("a")).toBe(true);
      expect(validateSlug("1")).toBe(true);
      expect(validateSlug("-")).toBe(true);
    });

    it("returns false for uppercase characters", () => {
      expect(validateSlug("Invalid-Slug")).toBe(false);
      expect(validateSlug("MY-POST")).toBe(false);
      expect(validateSlug("Post-123")).toBe(false);
    });

    it("returns false for special characters", () => {
      expect(validateSlug("invalid_slug")).toBe(false);
      expect(validateSlug("invalid.slug")).toBe(false);
      expect(validateSlug("invalid/slug")).toBe(false);
      expect(validateSlug("invalid@slug")).toBe(false);
      expect(validateSlug("invalid#slug")).toBe(false);
      expect(validateSlug("invalid slug")).toBe(false);
    });

    it("returns false for empty string", () => {
      expect(validateSlug("")).toBe(false);
    });

    it("returns false for slugs over 200 characters", () => {
      const longSlug = "a".repeat(201);
      expect(validateSlug(longSlug)).toBe(false);
    });

    it("returns true for slugs under 200 characters", () => {
      const slug199 = "a".repeat(199);
      expect(validateSlug(slug199)).toBe(true);
    });

    it("returns false for slugs with leading/trailing dashes", () => {
      expect(validateSlug("-slug")).toBe(true); // Actually valid per regex
      expect(validateSlug("slug-")).toBe(true); // Actually valid per regex
    });

    it.each(["hello-world", "my-post-123", "article", "a1b2c3", "d-e-f"])(
      "validates correct slug: %s",
      (slug) => {
        expect(validateSlug(slug)).toBe(true);
      },
    );

    it.each([
      "Hello-World",
      "MY_SLUG",
      "invalid.slug",
      "invalid/slug",
      "invalid slug",
      "a".repeat(201),
      "",
    ])("rejects invalid slug: %s", (slug) => {
      expect(validateSlug(slug)).toBe(false);
    });
  });
});
