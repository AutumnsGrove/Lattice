import { describe, it, expect } from "vitest";
import {
  generateUploadId,
  isAllowedMimeType,
  isValidFileSize,
  sanitizeFilename,
  buildR2Key,
  buildThumbnailR2Key,
  getExtensionFromMime,
  formatFileSize,
  toDisplayUpload,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
  MAX_DIMENSION,
  THUMBNAIL_SIZE,
  MAX_FILENAME_LENGTH,
  MAX_UPLOADS_PER_TENANT,
  type UploadRecord,
} from "./index";

describe("Custom uploads constants", () => {
  it("allows 3 MIME types (SVG removed for XSS safety)", () => {
    expect(ALLOWED_MIME_TYPES.size).toBe(3);
  });

  it("has sensible limits", () => {
    expect(MAX_FILE_SIZE).toBe(5 * 1024 * 1024);
    expect(MAX_DIMENSION).toBe(512);
    expect(THUMBNAIL_SIZE).toBe(128);
    expect(MAX_FILENAME_LENGTH).toBe(200);
    expect(MAX_UPLOADS_PER_TENANT).toBe(100);
  });
});

describe("generateUploadId", () => {
  it("generates upl-prefixed IDs", () => {
    const id = generateUploadId();
    expect(id).toMatch(/^upl_/);
  });

  it("generates unique IDs", () => {
    const ids = new Set(Array.from({ length: 10 }, () => generateUploadId()));
    expect(ids.size).toBe(10);
  });
});

describe("isAllowedMimeType", () => {
  it("accepts allowed types", () => {
    expect(isAllowedMimeType("image/png")).toBe(true);
    expect(isAllowedMimeType("image/gif")).toBe(true);
    expect(isAllowedMimeType("image/webp")).toBe(true);
  });

  it("rejects disallowed types (including SVG for XSS safety)", () => {
    expect(isAllowedMimeType("image/svg+xml")).toBe(false);
    expect(isAllowedMimeType("image/jpeg")).toBe(false);
    expect(isAllowedMimeType("image/bmp")).toBe(false);
    expect(isAllowedMimeType("text/plain")).toBe(false);
    expect(isAllowedMimeType("")).toBe(false);
  });
});

describe("isValidFileSize", () => {
  it("accepts valid sizes", () => {
    expect(isValidFileSize(1)).toBe(true);
    expect(isValidFileSize(1024)).toBe(true);
    expect(isValidFileSize(MAX_FILE_SIZE)).toBe(true);
  });

  it("rejects zero or negative", () => {
    expect(isValidFileSize(0)).toBe(false);
    expect(isValidFileSize(-1)).toBe(false);
  });

  it("rejects over-limit", () => {
    expect(isValidFileSize(MAX_FILE_SIZE + 1)).toBe(false);
  });
});

describe("sanitizeFilename", () => {
  it("replaces special characters with underscores", () => {
    expect(sanitizeFilename("my file (1).png")).toBe("my_file_1_.png");
  });

  it("collapses consecutive underscores", () => {
    expect(sanitizeFilename("a   b   c")).toBe("a_b_c");
  });

  it("truncates long filenames", () => {
    const long = "a".repeat(300);
    expect(sanitizeFilename(long).length).toBe(MAX_FILENAME_LENGTH);
  });

  it("returns 'upload' for null/undefined/empty", () => {
    expect(sanitizeFilename(null)).toBe("upload");
    expect(sanitizeFilename(undefined)).toBe("upload");
    expect(sanitizeFilename("")).toBe("upload");
  });

  it("preserves allowed characters", () => {
    expect(sanitizeFilename("my-file.name_v2")).toBe("my-file.name_v2");
  });
});

describe("buildR2Key", () => {
  it("builds correct path", () => {
    expect(buildR2Key("tenant1", "upl_123", "png")).toBe(
      "curios/tenant1/uploads/upl_123.png",
    );
  });

  it("handles different extensions", () => {
    expect(buildR2Key("t1", "id1", "webp")).toBe("curios/t1/uploads/id1.webp");
    expect(buildR2Key("t1", "id1", "svg")).toBe("curios/t1/uploads/id1.svg");
  });
});

describe("buildThumbnailR2Key", () => {
  it("builds correct thumbnail path", () => {
    expect(buildThumbnailR2Key("tenant1", "upl_123")).toBe(
      "curios/tenant1/uploads/upl_123_thumb.webp",
    );
  });
});

describe("getExtensionFromMime", () => {
  it("maps known MIME types", () => {
    expect(getExtensionFromMime("image/png")).toBe("png");
    expect(getExtensionFromMime("image/gif")).toBe("gif");
    expect(getExtensionFromMime("image/webp")).toBe("webp");
  });

  it("returns bin for unknown/removed types", () => {
    expect(getExtensionFromMime("image/svg+xml")).toBe("bin");
    expect(getExtensionFromMime("image/jpeg")).toBe("bin");
    expect(getExtensionFromMime("text/plain")).toBe("bin");
  });
});

describe("formatFileSize", () => {
  it("formats bytes", () => {
    expect(formatFileSize(500)).toBe("500 B");
  });

  it("formats kilobytes", () => {
    expect(formatFileSize(1536)).toBe("1.5 KB");
  });

  it("formats megabytes", () => {
    expect(formatFileSize(2.5 * 1024 * 1024)).toBe("2.5 MB");
  });

  it("formats exactly 1 KB", () => {
    expect(formatFileSize(1024)).toBe("1.0 KB");
  });
});

describe("toDisplayUpload", () => {
  it("transforms record to display", () => {
    const record: UploadRecord = {
      id: "upl_1",
      tenantId: "t1",
      filename: "my_image.png",
      originalFilename: "My Image.png",
      mimeType: "image/png",
      fileSize: 2048,
      width: 256,
      height: 256,
      r2Key: "curios/t1/uploads/upl_1.png",
      thumbnailR2Key: "curios/t1/uploads/upl_1_thumb.webp",
      usageCount: 3,
      uploadedAt: "2025-01-01",
    };
    const display = toDisplayUpload(record);
    expect(display).toEqual({
      id: "upl_1",
      filename: "my_image.png",
      originalFilename: "My Image.png",
      mimeType: "image/png",
      fileSize: 2048,
      width: 256,
      height: 256,
      usageCount: 3,
      uploadedAt: "2025-01-01",
    });
    expect(display).not.toHaveProperty("tenantId");
    expect(display).not.toHaveProperty("r2Key");
    expect(display).not.toHaveProperty("thumbnailR2Key");
  });
});
