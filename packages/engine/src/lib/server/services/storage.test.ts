/**
 * Storage Service Tests
 *
 * Tests for R2 + D1 storage abstraction layer covering:
 * - File upload with metadata
 * - File retrieval and deletion
 * - File validation (size, type)
 * - Metadata operations (list, update)
 * - HTTP response helpers (headers, 304)
 * - Error handling
 * - Cleanup on failure
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  createMockD1,
  createMockR2,
  seedMockD1,
  clearMockD1,
} from "./__mocks__/cloudflare";
import {
  // Types
  StorageError,
  type StorageFile,
  type UploadOptions,
  // Validation
  validateFile,
  isAllowedContentType,
  // Operations
  uploadFile,
  getFile,
  deleteFile,
  fileExists,
  // Metadata operations
  getFileMetadata,
  getFileRecord,
  getFileRecordByKey,
  listFiles,
  listAllFiles,
  listFolders,
  updateAltText,
  // Response helpers
  buildFileHeaders,
  shouldReturn304,
  // Constants
  STORAGE_DEFAULTS,
} from "./storage";

describe("Storage Service", () => {
  let db: ReturnType<typeof createMockD1>;
  let bucket: ReturnType<typeof createMockR2>;

  beforeEach(() => {
    db = createMockD1();
    bucket = createMockR2();
    clearMockD1(db);
  });

  // ==========================================================================
  // Validation
  // ==========================================================================

  describe("validateFile", () => {
    it("should accept valid file", () => {
      const data = new ArrayBuffer(1024);
      expect(() => validateFile(data, "image/png")).not.toThrow();
    });

    it("should reject file exceeding size limit", () => {
      const data = new ArrayBuffer(STORAGE_DEFAULTS.MAX_FILE_SIZE + 1);
      expect(() => validateFile(data, "image/png")).toThrow(StorageError);
    });

    it("should accept file within custom size limit", () => {
      const data = new ArrayBuffer(100 * 1024 * 1024); // 100MB
      expect(() =>
        validateFile(data, "image/png", { maxFileSize: 200 * 1024 * 1024 }),
      ).not.toThrow();
    });

    it("should reject file exceeding custom size limit", () => {
      const data = new ArrayBuffer(100 * 1024 * 1024); // 100MB
      expect(() =>
        validateFile(data, "image/png", { maxFileSize: 50 * 1024 * 1024 }),
      ).toThrow(StorageError);
    });

    it("should reject disallowed content type", () => {
      const data = new ArrayBuffer(1024);
      expect(() => validateFile(data, "application/x-executable")).toThrow(
        StorageError,
      );
    });

    it("should accept additional content types", () => {
      const data = new ArrayBuffer(1024);
      expect(() =>
        validateFile(data, "application/custom-type", {
          additionalContentTypes: ["application/custom-type"],
        }),
      ).not.toThrow();
    });

    it("should include size in error message", () => {
      const data = new ArrayBuffer(STORAGE_DEFAULTS.MAX_FILE_SIZE + 1);
      try {
        validateFile(data, "image/png");
      } catch (err) {
        expect((err as StorageError).message).toContain("MB");
      }
    });

    it("should use FILE_TOO_LARGE error code", () => {
      const data = new ArrayBuffer(STORAGE_DEFAULTS.MAX_FILE_SIZE + 1);
      try {
        validateFile(data, "image/png");
      } catch (err) {
        expect((err as StorageError).code).toBe("FILE_TOO_LARGE");
      }
    });

    it("should use INVALID_TYPE error code", () => {
      const data = new ArrayBuffer(100);
      try {
        validateFile(data, "application/x-evil");
      } catch (err) {
        expect((err as StorageError).code).toBe("INVALID_TYPE");
      }
    });
  });

  describe("isAllowedContentType", () => {
    it("should allow common image types", () => {
      expect(isAllowedContentType("image/png")).toBe(true);
      expect(isAllowedContentType("image/jpeg")).toBe(true);
      expect(isAllowedContentType("image/gif")).toBe(true);
      expect(isAllowedContentType("image/webp")).toBe(true);
    });

    it("should block SVG due to XSS risk", () => {
      expect(isAllowedContentType("image/svg+xml")).toBe(false);
    });

    it("should allow video types", () => {
      expect(isAllowedContentType("video/mp4")).toBe(true);
      expect(isAllowedContentType("video/webm")).toBe(true);
    });

    it("should allow audio types", () => {
      expect(isAllowedContentType("audio/mpeg")).toBe(true);
      expect(isAllowedContentType("audio/wav")).toBe(true);
    });

    it("should allow document types", () => {
      expect(isAllowedContentType("application/pdf")).toBe(true);
      expect(isAllowedContentType("application/json")).toBe(true);
      expect(isAllowedContentType("text/css")).toBe(true);
      expect(isAllowedContentType("text/javascript")).toBe(true);
    });

    it("should reject unknown types", () => {
      expect(isAllowedContentType("application/x-executable")).toBe(false);
      expect(isAllowedContentType("application/octet-stream")).toBe(false);
    });

    it("should accept additional types", () => {
      expect(
        isAllowedContentType("application/custom", ["application/custom"]),
      ).toBe(true);
    });
  });

  // ==========================================================================
  // Upload Operations
  // ==========================================================================

  describe("uploadFile", () => {
    it("should upload file to R2 and store metadata in D1", async () => {
      const data = new TextEncoder().encode("test content").buffer;
      const options: UploadOptions = {
        data,
        filename: "test.json",
        contentType: "application/json",
        folder: "documents",
        uploadedBy: "user-123",
      };

      const result = await uploadFile(bucket, db, options);

      expect(result.id).toBeDefined();
      expect(result.filename).toContain("test");
      expect(result.filename).toContain(".json");
      expect(result.originalFilename).toBe("test.json");
      // Folder is normalized with leading slash
      expect(result.folder).toMatch(/\/?documents/);
      expect(result.contentType).toBe("application/json");
      expect(result.sizeBytes).toBe(data.byteLength);
      expect(result.uploadedBy).toBe("user-123");

      // Verify R2 was called
      expect(bucket.put).toHaveBeenCalled();
    });

    it("should generate unique filename", async () => {
      const data = new ArrayBuffer(10);
      const results = await Promise.all([
        uploadFile(bucket, db, {
          data,
          filename: "same.png",
          contentType: "image/png",
          folder: "images",
          uploadedBy: "user",
        }),
        uploadFile(bucket, db, {
          data,
          filename: "same.png",
          contentType: "image/png",
          folder: "images",
          uploadedBy: "user",
        }),
      ]);

      expect(results[0].filename).not.toBe(results[1].filename);
    });

    it("should store alt text", async () => {
      const data = new ArrayBuffer(10);
      const result = await uploadFile(bucket, db, {
        data,
        filename: "image.png",
        contentType: "image/png",
        folder: "images",
        uploadedBy: "user",
        altText: "A beautiful sunset",
      });

      expect(result.altText).toBe("A beautiful sunset");
    });

    it("should use custom max file size", async () => {
      const largeData = new ArrayBuffer(60 * 1024 * 1024); // 60MB

      // Should fail with default limit
      await expect(
        uploadFile(bucket, db, {
          data: largeData,
          filename: "large.bin",
          contentType: "application/pdf",
          folder: "files",
          uploadedBy: "user",
        }),
      ).rejects.toThrow(StorageError);

      // Should succeed with increased limit
      const result = await uploadFile(bucket, db, {
        data: largeData,
        filename: "large.bin",
        contentType: "application/pdf",
        folder: "files",
        uploadedBy: "user",
        maxFileSize: 100 * 1024 * 1024,
      });

      expect(result.sizeBytes).toBe(largeData.byteLength);
    });

    it("should reject invalid content type", async () => {
      const data = new ArrayBuffer(10);

      await expect(
        uploadFile(bucket, db, {
          data,
          filename: "malware.exe",
          contentType: "application/x-msdownload",
          folder: "files",
          uploadedBy: "user",
        }),
      ).rejects.toThrow(StorageError);
    });

    it("should cleanup R2 on metadata failure", async () => {
      const data = new ArrayBuffer(10);

      // Make D1 insert fail
      db.prepare = vi.fn(() => ({
        bind: () => ({
          run: vi.fn(async () => {
            throw new Error("D1 failure");
          }),
        }),
      }));

      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      await expect(
        uploadFile(bucket, db, {
          data,
          filename: "test.png",
          contentType: "image/png",
          folder: "images",
          uploadedBy: "user",
        }),
      ).rejects.toThrow(StorageError);

      // Verify cleanup was attempted
      expect(bucket.delete).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it("should log cleanup errors", async () => {
      const data = new ArrayBuffer(10);

      // Make D1 insert fail
      db.prepare = vi.fn(() => ({
        bind: () => ({
          run: vi.fn(async () => {
            throw new Error("D1 failure");
          }),
        }),
      }));

      // Make R2 delete also fail
      bucket.delete = vi.fn(async () => {
        throw new Error("R2 cleanup failed");
      });

      const consoleSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      await expect(
        uploadFile(bucket, db, {
          data,
          filename: "test.png",
          contentType: "image/png",
          folder: "images",
          uploadedBy: "user",
        }),
      ).rejects.toThrow(StorageError);

      // Verify cleanup error was logged
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("[Storage]"),
        expect.any(Error),
      );
      consoleSpy.mockRestore();
    });
  });

  // ==========================================================================
  // Get Operations
  // ==========================================================================

  describe("getFile", () => {
    it("should return file with body and metadata", async () => {
      const content = new TextEncoder().encode("file content");

      // Add file to R2
      await bucket.put("images/test.png", content.buffer, {
        httpMetadata: { contentType: "image/png" },
      });

      const result = await getFile(bucket, "images/test.png");

      expect(result).not.toBeNull();
      expect(result?.contentType).toBe("image/png");
      expect(result?.body).toBeDefined();
      expect(result?.etag).toBeDefined();
    });

    it("should return null for non-existent file", async () => {
      const result = await getFile(bucket, "nonexistent/path");
      expect(result).toBeNull();
    });

    it("should include cache control header", async () => {
      await bucket.put("images/test.png", new ArrayBuffer(10), {
        httpMetadata: { contentType: "image/png" },
      });

      const result = await getFile(bucket, "images/test.png");
      expect(result?.cacheControl).toBeDefined();
    });
  });

  describe("getFileMetadata", () => {
    it("should return metadata without body", async () => {
      await bucket.put("images/test.png", new ArrayBuffer(10), {
        httpMetadata: { contentType: "image/png" },
      });

      const result = await getFileMetadata(bucket, "images/test.png");

      expect(result).not.toBeNull();
      expect(result?.contentType).toBe("image/png");
      expect(result?.size).toBeDefined();
      // Should not have body property
      expect(result).not.toHaveProperty("body");
    });

    it("should return null for non-existent file", async () => {
      const result = await getFileMetadata(bucket, "nonexistent");
      expect(result).toBeNull();
    });
  });

  describe("fileExists", () => {
    it("should return true for existing file", async () => {
      await bucket.put("exists/file.png", new ArrayBuffer(10));

      const result = await fileExists(bucket, "exists/file.png");
      expect(result).toBe(true);
    });

    it("should return false for non-existent file", async () => {
      const result = await fileExists(bucket, "does-not-exist");
      expect(result).toBe(false);
    });
  });

  // ==========================================================================
  // Delete Operations
  // ==========================================================================

  describe("deleteFile", () => {
    it("should delete from both R2 and D1", async () => {
      // Setup file in R2
      await bucket.put("images/delete-me.png", new ArrayBuffer(10));

      // Setup metadata in D1 and mock the query
      seedMockD1(db, "cdn_files", [
        {
          id: "del-1",
          key: "images/delete-me.png",
          filename: "delete-me.png",
          original_filename: "delete-me.png",
          content_type: "image/png",
          size_bytes: 10,
          folder: "images",
          uploaded_by: "user",
          created_at: new Date().toISOString(),
        },
      ]);

      // Mock the D1 queries for deleteFile
      db.prepare = vi.fn((sql: string) => ({
        bind: () => ({
          first: vi.fn(async () => ({
            id: "del-1",
            key: "images/delete-me.png",
          })),
          run: vi.fn(async () => ({ meta: { changes: 1 } })),
        }),
      }));

      await deleteFile(bucket, db, "images/delete-me.png");

      expect(bucket.delete).toHaveBeenCalledWith("images/delete-me.png");
    });

    it("should throw when file does not exist", async () => {
      // deleteFile throws FILE_NOT_FOUND when the file doesn't exist in D1
      seedMockD1(db, "cdn_files", []);

      await expect(deleteFile(bucket, db, "nonexistent/path")).rejects.toThrow(
        StorageError,
      );
    });
  });

  // ==========================================================================
  // D1 Record Operations
  // ==========================================================================

  describe("getFileRecord", () => {
    it("should return file record by ID", async () => {
      seedMockD1(db, "cdn_files", [
        {
          id: "file-123",
          filename: "test.png",
          original_filename: "test.png",
          key: "images/test.png",
          content_type: "image/png",
          size_bytes: 1024,
          folder: "images",
          alt_text: "Test",
          uploaded_by: "user-1",
          created_at: "2024-01-01T00:00:00Z",
        },
      ]);

      const result = await getFileRecord(db, "file-123");

      expect(result).not.toBeNull();
      expect(result?.id).toBe("file-123");
    });

    it("should return null for non-existent ID", async () => {
      seedMockD1(db, "cdn_files", []);

      const result = await getFileRecord(db, "nonexistent");
      expect(result).toBeNull();
    });
  });

  describe("getFileRecordByKey", () => {
    it("should return file record by key", async () => {
      seedMockD1(db, "cdn_files", [
        {
          id: "file-123",
          filename: "test.png",
          original_filename: "test.png",
          key: "images/test.png",
          content_type: "image/png",
          size_bytes: 1024,
          folder: "images",
          alt_text: null,
          uploaded_by: "user-1",
          created_at: "2024-01-01T00:00:00Z",
        },
      ]);

      const result = await getFileRecordByKey(db, "images/test.png");

      expect(result).not.toBeNull();
      expect(result?.key).toBe("images/test.png");
    });
  });

  describe("listFiles", () => {
    it("should list files in a folder", async () => {
      const mockFiles = [
        {
          id: "1",
          folder: "images",
          filename: "a.png",
          key: "images/a.png",
          content_type: "image/png",
          size_bytes: 100,
          original_filename: "a.png",
          uploaded_by: "user",
          created_at: "2024-01-01",
        },
        {
          id: "2",
          folder: "images",
          filename: "b.png",
          key: "images/b.png",
          content_type: "image/png",
          size_bytes: 200,
          original_filename: "b.png",
          uploaded_by: "user",
          created_at: "2024-01-02",
        },
      ];

      // Mock both queries: file list and count
      let callCount = 0;
      db.prepare = vi.fn(() => {
        callCount++;
        return {
          bind: () => ({
            all: vi.fn(async () => ({ results: mockFiles })),
            first: vi.fn(async () => ({ count: 2 })),
          }),
        };
      });

      const result = await listFiles(db, "images");

      expect(result.files).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it("should return total count", async () => {
      db.prepare = vi.fn(() => ({
        bind: () => ({
          all: vi.fn(async () => ({ results: [] })),
          first: vi.fn(async () => ({ count: 10 })),
        }),
      }));

      const result = await listFiles(db, "images");
      expect(result.total).toBe(10);
    });
  });

  describe("listAllFiles", () => {
    it("should list all files regardless of folder", async () => {
      const mockFiles = [
        {
          id: "1",
          folder: "images",
          filename: "a.png",
          key: "images/a.png",
          content_type: "image/png",
          size_bytes: 100,
          original_filename: "a.png",
          uploaded_by: "user",
          created_at: "2024-01-01",
        },
        {
          id: "2",
          folder: "docs",
          filename: "b.pdf",
          key: "docs/b.pdf",
          content_type: "application/pdf",
          size_bytes: 200,
          original_filename: "b.pdf",
          uploaded_by: "user",
          created_at: "2024-01-02",
        },
      ];

      // Mock to return a statement object with proper methods
      db.prepare = vi.fn((sql: string) => {
        if (sql.includes("COUNT")) {
          return {
            first: vi.fn(async () => ({ count: 2 })),
          };
        }
        return {
          bind: () => ({
            all: vi.fn(async () => ({ results: mockFiles })),
          }),
        };
      });

      const result = await listAllFiles(db);

      expect(result.files).toHaveLength(2);
      expect(result.total).toBe(2);
    });
  });

  describe("listFolders", () => {
    it("should return unique folder names", async () => {
      // Mock distinct query - note: listFolders doesn't use bind()
      db.prepare = vi.fn(() => ({
        all: vi.fn(async () => ({
          results: [
            { folder: "images" },
            { folder: "docs" },
            { folder: "videos" },
          ],
        })),
      }));

      const folders = await listFolders(db);

      expect(folders).toContain("images");
      expect(folders).toContain("docs");
      expect(folders).toContain("videos");
      expect(folders).toHaveLength(3);
    });
  });

  describe("updateAltText", () => {
    it("should update alt text for a file", async () => {
      seedMockD1(db, "cdn_files", [
        { id: "upd-1", key: "images/test.png", alt_text: "Old text" },
      ]);

      // Mock the update query
      db.prepare = vi.fn(() => ({
        bind: () => ({
          run: vi.fn(async () => ({ meta: { changes: 1 } })),
        }),
      }));

      await updateAltText(db, "images/test.png", "New alt text");

      expect(db.prepare).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Response Helpers
  // ==========================================================================

  describe("buildFileHeaders", () => {
    it("should set content-type header", () => {
      const file = {
        contentType: "image/png",
        cacheControl: "public, max-age=31536000, immutable",
        etag: '"abc123"',
        size: 1024,
      };

      const headers = buildFileHeaders(file);

      expect(headers.get("Content-Type")).toBe("image/png");
    });

    it("should set etag header", () => {
      const file = {
        contentType: "image/png",
        cacheControl: "public, max-age=31536000, immutable",
        etag: '"abc123"',
        size: 1024,
      };

      const headers = buildFileHeaders(file);

      expect(headers.get("ETag")).toBe('"abc123"');
    });

    it("should set cache-control header", () => {
      const file = {
        contentType: "image/png",
        cacheControl: "public, max-age=31536000, immutable",
        etag: '"abc123"',
        size: 1024,
      };

      const headers = buildFileHeaders(file);

      expect(headers.get("Cache-Control")).toBe(
        "public, max-age=31536000, immutable",
      );
    });

    it("should set CORS headers for fonts", () => {
      const file = {
        contentType: "font/woff2",
        cacheControl: "public, max-age=31536000, immutable",
        etag: '"abc123"',
        size: 1024,
      };

      const headers = buildFileHeaders(file);

      expect(headers.get("Access-Control-Allow-Origin")).toBe("*");
    });

    it("should set CORS headers when enableCors is true", () => {
      const file = {
        contentType: "image/png",
        cacheControl: "public, max-age=31536000",
        etag: '"abc123"',
        size: 1024,
      };

      const headers = buildFileHeaders(file, { enableCors: true });

      expect(headers.get("Access-Control-Allow-Origin")).toBe("*");
    });
  });

  describe("shouldReturn304", () => {
    it("should return true when etag matches", () => {
      const request = new Request("https://example.com/file", {
        headers: { "If-None-Match": '"abc123"' },
      });

      expect(shouldReturn304(request, '"abc123"')).toBe(true);
    });

    it("should return false when etag does not match", () => {
      const request = new Request("https://example.com/file", {
        headers: { "If-None-Match": '"old-etag"' },
      });

      expect(shouldReturn304(request, '"new-etag"')).toBe(false);
    });

    it("should return false when no If-None-Match header", () => {
      const request = new Request("https://example.com/file");

      expect(shouldReturn304(request, '"abc123"')).toBe(false);
    });
  });

  // ==========================================================================
  // Error Handling
  // ==========================================================================

  describe("Error Handling", () => {
    it("should preserve original error as cause", async () => {
      const originalError = new Error("R2 network error");
      bucket.put = vi.fn(async () => {
        throw originalError;
      });

      try {
        await uploadFile(bucket, db, {
          data: new ArrayBuffer(10),
          filename: "test.png",
          contentType: "image/png",
          folder: "images",
          uploadedBy: "user",
        });
      } catch (err) {
        expect(err).toBeInstanceOf(StorageError);
        expect((err as StorageError).cause).toBe(originalError);
      }
    });
  });

  // ==========================================================================
  // Constants
  // ==========================================================================

  describe("Constants", () => {
    it("should export default max file size (10MB for security)", () => {
      expect(STORAGE_DEFAULTS.MAX_FILE_SIZE).toBe(10 * 1024 * 1024);
    });
  });
});
