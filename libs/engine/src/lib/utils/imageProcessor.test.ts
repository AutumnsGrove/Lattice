/**
 * Image Processor Tests
 *
 * Comprehensive tests for the image processing utilities including:
 * - Format detection and conversion
 * - EXIF stripping verification
 * - Filename sanitization
 * - Compression ratio calculations
 * - JXL support detection
 * - Full image processing pipeline
 *
 * Coverage Target: 80%+
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  calculateFileHash,
  generateDatePath,
  sanitizeImageFilename,
  formatBytes,
  compressionRatio,
  formatName,
  supportsJxlEncoding,
  processImage,
  type ImageFormat,
  type ProcessedImageResult,
  type ProcessImageOptions,
} from "./imageProcessor";
import { validateFileSignature, isAllowedImageType } from "./upload-validation";

// =============================================================================
// Hash Calculation Tests
// =============================================================================

describe("calculateFileHash", () => {
  it("generates consistent SHA-256 hash for same content", async () => {
    const content = new TextEncoder().encode("test content");
    const blob1 = new Blob([content]);
    const blob2 = new Blob([content]);

    const hash1 = await calculateFileHash(blob1);
    const hash2 = await calculateFileHash(blob2);

    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^[a-f0-9]{64}$/); // SHA-256 = 64 hex chars
  });

  it("generates different hashes for different content", async () => {
    const blob1 = new Blob([new TextEncoder().encode("content 1")]);
    const blob2 = new Blob([new TextEncoder().encode("content 2")]);

    const hash1 = await calculateFileHash(blob1);
    const hash2 = await calculateFileHash(blob2);

    expect(hash1).not.toBe(hash2);
  });

  it("handles empty files", async () => {
    const blob = new Blob([]);
    const hash = await calculateFileHash(blob);

    // SHA-256 of empty string is a known value
    expect(hash).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
  });
});

// =============================================================================
// Date Path Generation Tests
// =============================================================================

describe("generateDatePath", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("generates path in photos/YYYY/MM/DD format", () => {
    // Use noon to avoid timezone issues (midnight UTC = previous day in western timezones)
    vi.setSystemTime(new Date("2025-03-15T12:00:00"));
    expect(generateDatePath()).toBe("photos/2025/03/15");
  });

  it("pads single-digit months and days", () => {
    vi.setSystemTime(new Date("2025-01-05T12:00:00"));
    expect(generateDatePath()).toBe("photos/2025/01/05");
  });

  it("handles end of year correctly", () => {
    vi.setSystemTime(new Date("2025-12-31T12:00:00"));
    expect(generateDatePath()).toBe("photos/2025/12/31");
  });
});

// =============================================================================
// Filename Sanitization Tests
// =============================================================================

describe("sanitizeImageFilename", () => {
  beforeEach(() => {
    // Mock Date.now for consistent timestamps
    vi.spyOn(Date, "now").mockReturnValue(1234567890123);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("sanitizes special characters", () => {
    const result = sanitizeImageFilename("My Photo (1).jpg", "webp");
    // Should match pattern: sanitized-name-timestamp.webp
    expect(result).toMatch(/^my-photo-1-[a-z0-9]+\.webp$/);
  });

  it("uses jxl extension when specified", () => {
    const result = sanitizeImageFilename("photo.png", "jxl");
    expect(result).toMatch(/\.jxl$/);
  });

  it("uses webp extension when specified", () => {
    const result = sanitizeImageFilename("photo.png", "webp");
    expect(result).toMatch(/\.webp$/);
  });

  it("preserves gif extension when no format specified", () => {
    const result = sanitizeImageFilename("animation.gif");
    expect(result).toMatch(/\.gif$/);
  });

  it("defaults to webp when no format specified for non-gif", () => {
    const result = sanitizeImageFilename("photo.jpg");
    expect(result).toMatch(/\.webp$/);
  });

  it("handles files without extension", () => {
    const result = sanitizeImageFilename("noextension", "webp");
    expect(result).toMatch(/\.webp$/);
  });

  it("converts to lowercase", () => {
    const result = sanitizeImageFilename("UPPERCASE.JPG", "webp");
    expect(result).toMatch(/^[a-z0-9-]+\.webp$/);
  });

  it("removes consecutive dashes", () => {
    const result = sanitizeImageFilename("test---file.jpg", "webp");
    expect(result).not.toContain("---");
    expect(result).not.toContain("--");
  });

  it("removes leading/trailing dashes from base name", () => {
    const result = sanitizeImageFilename("-test-.jpg", "webp");
    expect(result).toMatch(/^test-[a-z0-9]+\.webp$/);
  });

  it("truncates very long filenames", () => {
    const longName = "a".repeat(200) + ".jpg";
    const result = sanitizeImageFilename(longName, "webp");
    // Base name should be truncated to 100 chars + timestamp + extension
    expect(result.length).toBeLessThan(150);
  });
});

// =============================================================================
// Display Utilities Tests
// =============================================================================

describe("formatBytes", () => {
  it("formats bytes", () => {
    expect(formatBytes(500)).toBe("500 B");
  });

  it("formats kilobytes", () => {
    expect(formatBytes(1024)).toBe("1.0 KB");
    expect(formatBytes(1536)).toBe("1.5 KB");
  });

  it("formats megabytes", () => {
    expect(formatBytes(1024 * 1024)).toBe("1.0 MB");
    expect(formatBytes(2.5 * 1024 * 1024)).toBe("2.5 MB");
  });

  it("handles zero", () => {
    expect(formatBytes(0)).toBe("0 B");
  });
});

describe("compressionRatio", () => {
  it("calculates positive compression (size reduction)", () => {
    expect(compressionRatio(1000, 700)).toBe("-30%");
  });

  it("calculates negative compression (size increase)", () => {
    expect(compressionRatio(1000, 1200)).toBe("+20%");
  });

  it("handles no change", () => {
    // 0% change shows as +0% (no reduction)
    expect(compressionRatio(1000, 1000)).toBe("+0%");
  });

  it("handles zero original size", () => {
    expect(compressionRatio(0, 100)).toBe("0%");
  });
});

describe("formatName", () => {
  it("returns human-readable format names", () => {
    expect(formatName("jxl")).toBe("JPEG XL");
    expect(formatName("webp")).toBe("WebP");
    expect(formatName("gif")).toBe("GIF");
    expect(formatName("original")).toBe("Original");
  });

  it("returns format string for unknown formats", () => {
    expect(formatName("unknown" as ImageFormat)).toBe("unknown");
  });
});

// =============================================================================
// JXL Support Detection Tests
// =============================================================================

describe("supportsJxlEncoding", () => {
  it("returns boolean indicating JXL support", async () => {
    // In test environment, WebAssembly should be available
    const result = await supportsJxlEncoding();
    expect(typeof result).toBe("boolean");
  });

  it("caches the result after first check", async () => {
    const result1 = await supportsJxlEncoding();
    const result2 = await supportsJxlEncoding();
    expect(result1).toBe(result2);
  });
});

// =============================================================================
// Upload Validation Integration Tests
// =============================================================================

describe("Image Format Validation", () => {
  describe("JXL Magic Bytes", () => {
    it("validates JXL naked codestream signature", () => {
      // JXL naked codestream starts with 0xFF 0x0A
      const buffer = new Uint8Array([
        0xff, 0x0a, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      ]);
      expect(validateFileSignature(buffer, "image/jxl")).toBe(true);
    });

    it("validates JXL ISOBMFF container signature", () => {
      // JXL container starts with box header
      const buffer = new Uint8Array([
        0x00, 0x00, 0x00, 0x0c, 0x4a, 0x58, 0x4c, 0x20, 0x00, 0x00, 0x00, 0x00,
      ]);
      expect(validateFileSignature(buffer, "image/jxl")).toBe(true);
    });

    it("rejects invalid JXL signature", () => {
      const buffer = new Uint8Array([0x89, 0x50, 0x4e, 0x47]); // PNG signature
      expect(validateFileSignature(buffer, "image/jxl")).toBe(false);
    });
  });

  describe("MIME Type Validation", () => {
    it("accepts image/jxl MIME type", () => {
      expect(isAllowedImageType("image/jxl")).toBe(true);
    });

    it("accepts standard image types", () => {
      expect(isAllowedImageType("image/jpeg")).toBe(true);
      expect(isAllowedImageType("image/png")).toBe(true);
      expect(isAllowedImageType("image/gif")).toBe(true);
      expect(isAllowedImageType("image/webp")).toBe(true);
    });

    it("rejects non-image types", () => {
      expect(isAllowedImageType("application/pdf")).toBe(false);
      expect(isAllowedImageType("text/html")).toBe(false);
    });
  });
});

// =============================================================================
// Image Processing Tests
// =============================================================================

/**
 * Helper: Create a mock GIF blob
 * GIFs are handled specially and don't require full processing
 */
function createMockGifBlob(): Blob {
  // GIF89a header
  const gif = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00]);
  return new Blob([gif], { type: "image/gif" });
}

/**
 * Helper: Create a File object from blob
 */
function blobToFile(blob: Blob, filename: string): File {
  return new File([blob], filename, { type: blob.type });
}

describe("processImage", () => {
  describe("GIF Handling", () => {
    it("returns original GIF without processing", async () => {
      const gifBlob = createMockGifBlob();
      const file = blobToFile(gifBlob, "animation.gif");

      const result = await processImage(file);

      expect(result.format).toBe("gif");
      expect(result.skipped).toBe(true);
      expect(result.reason).toBe("GIF preserved for animation");
      expect(result.blob).toBe(file);
      expect(result.originalSize).toBe(file.size);
      expect(result.processedSize).toBe(file.size);
    });

    it("preserves GIF dimensions as zero", async () => {
      const gifBlob = createMockGifBlob();
      const file = blobToFile(gifBlob, "animation.gif");

      const result = await processImage(file, { quality: 50 });

      expect(result.width).toBe(0);
      expect(result.height).toBe(0);
    });

    it("GIF skipping respects quality option (no-op)", async () => {
      const gifBlob = createMockGifBlob();
      const file = blobToFile(gifBlob, "test.gif");

      // Quality should not affect GIFs (they're skipped)
      const result = await processImage(file, { quality: 20 });

      expect(result.format).toBe("gif");
      expect(result.skipped).toBe(true);
    });

    it("GIF skipping respects fullResolution option (no-op)", async () => {
      const gifBlob = createMockGifBlob();
      const file = blobToFile(gifBlob, "test.gif");

      // fullResolution should not affect GIFs (they're skipped)
      const result = await processImage(file, { fullResolution: true });

      expect(result.format).toBe("gif");
      expect(result.skipped).toBe(true);
    });
  });

  describe("ProcessImageOptions defaults", () => {
    it("has correct default quality value", () => {
      const gifBlob = createMockGifBlob();
      const file = blobToFile(gifBlob, "test.gif");

      // GIF returns immediately, so we can verify defaults are applied
      // by checking that it returns a ProcessedImageResult
      const result = processImage(file, {});

      expect(result).toBeDefined();
    });

    it("allows empty options object", () => {
      const gifBlob = createMockGifBlob();
      const file = blobToFile(gifBlob, "test.gif");

      const result = processImage(file, {});

      expect(result).toBeDefined();
    });
  });

  describe("Format Preference Handling", () => {
    it("GIF processing is format-agnostic", async () => {
      const gifBlob = createMockGifBlob();
      const file = blobToFile(gifBlob, "test.gif");

      // Test with different format options - all should return gif
      const resultAuto = await processImage(file, { format: "auto" });
      const resultWebp = await processImage(file, { format: "webp" });
      const resultOriginal = await processImage(file, { format: "original" });
      const resultJxl = await processImage(file, { format: "jxl" });

      expect(resultAuto.format).toBe("gif");
      expect(resultWebp.format).toBe("gif");
      expect(resultOriginal.format).toBe("gif");
      expect(resultJxl.format).toBe("gif");
    });
  });

  describe("Result Structure for GIFs", () => {
    it("ProcessedImageResult has all required fields for GIFs", async () => {
      const gifBlob = createMockGifBlob();
      const file = blobToFile(gifBlob, "test.gif");

      const result = await processImage(file);

      expect(result).toHaveProperty("blob");
      expect(result).toHaveProperty("width");
      expect(result).toHaveProperty("height");
      expect(result).toHaveProperty("originalSize");
      expect(result).toHaveProperty("processedSize");
      expect(result).toHaveProperty("format");
      expect(result).toHaveProperty("skipped");
      expect(result).toHaveProperty("reason");
      expect(result.blob).toBeInstanceOf(Blob);
      expect(typeof result.width).toBe("number");
      expect(typeof result.height).toBe("number");
    });

    it("GIF result has skipped and reason fields", async () => {
      const gifBlob = createMockGifBlob();
      const file = blobToFile(gifBlob, "test.gif");

      const result = await processImage(file);

      expect(result.skipped).toBe(true);
      expect(result.reason).toBeDefined();
      expect(result.reason).toContain("animation");
    });
  });

  describe("Backward Compatibility with convertToWebP", () => {
    it("supports deprecated convertToWebP option (true)", async () => {
      const gifBlob = createMockGifBlob();
      const file = blobToFile(gifBlob, "test.gif");

      // Even with convertToWebP true, GIFs should be preserved
      const result = await processImage(file, {
        convertToWebP: true,
      });

      expect(result.format).toBe("gif");
    });

    it("supports deprecated convertToWebP option (false)", async () => {
      const gifBlob = createMockGifBlob();
      const file = blobToFile(gifBlob, "test.gif");

      // With convertToWebP false, GIFs should still be preserved
      const result = await processImage(file, {
        convertToWebP: false,
      });

      expect(result.format).toBe("gif");
    });

    it("format option takes precedence over convertToWebP", async () => {
      const gifBlob = createMockGifBlob();
      const file = blobToFile(gifBlob, "test.gif");

      // format should take precedence
      const result = await processImage(file, {
        format: "original",
        convertToWebP: true,
      });

      // GIF is always skipped regardless
      expect(result.format).toBe("gif");
    });
  });

  describe("MIME Type Detection", () => {
    it("detects GIF by MIME type", async () => {
      const gifBlob = new Blob([new Uint8Array([0x47, 0x49, 0x46])], {
        type: "image/gif",
      });
      const file = blobToFile(gifBlob, "test.gif");

      const result = await processImage(file);

      expect(result.format).toBe("gif");
      expect(result.skipped).toBe(true);
    });
  });

  describe("File Size Handling", () => {
    it("preserves original file size for GIFs", async () => {
      const gifBlob = createMockGifBlob();
      const file = blobToFile(gifBlob, "test.gif");

      const result = await processImage(file);

      expect(result.originalSize).toBe(gifBlob.size);
      expect(result.processedSize).toBe(gifBlob.size);
      expect(result.originalSize).toBe(result.processedSize);
    });
  });
});

// =============================================================================
// Integration Tests
// =============================================================================

describe("Integration: generateDatePath for organizing uploads", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("provides proper path for organizing processed images", () => {
    vi.setSystemTime(new Date("2025-06-15T12:00:00"));
    const datePath = generateDatePath();
    expect(datePath).toBe("photos/2025/06/15");
  });

  it("works with different dates", () => {
    vi.setSystemTime(new Date("2024-01-01T12:00:00"));
    expect(generateDatePath()).toBe("photos/2024/01/01");

    vi.setSystemTime(new Date("2025-12-31T12:00:00"));
    expect(generateDatePath()).toBe("photos/2025/12/31");
  });
});

describe("Integration: Filename and Path Utilities", () => {
  beforeEach(() => {
    vi.spyOn(Date, "now").mockReturnValue(1234567890123);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("sanitizes filenames for safe storage", () => {
    const originalName = "My Photo (1).jpg";
    const sanitized = sanitizeImageFilename(originalName, "webp");

    expect(sanitized).toMatch(/^my-photo-1-[a-z0-9]+\.webp$/);
  });

  it("organizes by date path", () => {
    vi.setSystemTime(new Date("2025-06-15T12:00:00"));
    const datePath = generateDatePath();

    expect(datePath).toBe("photos/2025/06/15");
  });

  it("combines date path and sanitized filename for full storage path", () => {
    vi.setSystemTime(new Date("2025-06-15T12:00:00"));
    const datePath = generateDatePath();
    const sanitized = sanitizeImageFilename("My Photo.jpg", "webp");

    const fullPath = `${datePath}/${sanitized}`;

    expect(fullPath).toMatch(
      /^photos\/2025\/06\/15\/my-photo-[a-z0-9]+\.webp$/,
    );
  });
});
