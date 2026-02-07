/**
 * Integration tests for CDN routes
 * Tests POST /cdn/upload, GET /cdn/files, GET /cdn/folders,
 * DELETE /cdn/files/:id, GET /cdn/audit, POST /cdn/migrate
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import type { Env } from "../types.js";
import {
  createMockEnv,
  createMockDb,
  createSequentialMockDb,
} from "../test-helpers.js";

// Mock database queries
vi.mock("../db/queries.js", () => ({
  isUserAdmin: vi.fn(),
  checkRateLimit: vi.fn(),
}));

// Mock db session
vi.mock("../db/session.js", () => ({
  createDbSession: vi.fn().mockImplementation((env: Env) => createMockDb()),
}));

// Mock JWT verification
vi.mock("../services/jwt.js", () => ({
  verifyAccessToken: vi.fn(),
}));

// Mock bearer auth middleware
vi.mock("../middleware/bearerAuth.js", () => ({
  extractBearerToken: vi.fn(),
}));

import cdnRoutes from "./cdn.js";
import { isUserAdmin } from "../db/queries.js";
import { verifyAccessToken } from "../services/jwt.js";
import { extractBearerToken } from "../middleware/bearerAuth.js";
import { createDbSession } from "../db/session.js";

// Create test app
function createApp() {
  const app = new Hono<{ Bindings: Env }>();
  app.route("/cdn", cdnRoutes);
  return app;
}

let mockEnv: Env;

beforeEach(() => {
  vi.clearAllMocks();
  mockEnv = createMockEnv({
    CDN_BUCKET: {
      put: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      list: vi.fn().mockResolvedValue({ objects: [] }),
      head: vi
        .fn()
        .mockResolvedValue({ httpMetadata: { contentType: "image/png" } }),
    } as unknown as R2Bucket,
  });
});

// =============================================================================
// AUTH MIDDLEWARE TESTS
// =============================================================================

describe("CDN Auth Middleware", () => {
  it("returns 401 when no token is provided", async () => {
    vi.mocked(extractBearerToken).mockReturnValue(null);

    const app = createApp();
    const res = await app.request("/cdn/files", { method: "GET" }, mockEnv);

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("unauthorized");
  });

  it("returns 401 when token is invalid", async () => {
    vi.mocked(extractBearerToken).mockReturnValue("invalid-token");
    vi.mocked(verifyAccessToken).mockResolvedValue(null);

    const app = createApp();
    const res = await app.request("/cdn/files", { method: "GET" }, mockEnv);

    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("invalid_token");
  });

  it("returns 403 when user is not admin", async () => {
    vi.mocked(extractBearerToken).mockReturnValue("valid-token");
    vi.mocked(verifyAccessToken).mockResolvedValue({ sub: "user-123" });
    vi.mocked(isUserAdmin).mockResolvedValue(false);

    const app = createApp();
    const res = await app.request("/cdn/files", { method: "GET" }, mockEnv);

    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toBe("forbidden");
  });

  it("allows request when token is valid and user is admin", async () => {
    vi.mocked(extractBearerToken).mockReturnValue("valid-token");
    vi.mocked(verifyAccessToken).mockResolvedValue({ sub: "admin-user-123" });
    vi.mocked(isUserAdmin).mockResolvedValue(true);

    const app = createApp();
    const res = await app.request("/cdn/files", { method: "GET" }, mockEnv);

    // Should not be 401 or 403 (auth middleware passed)
    expect(res.status).not.toBe(401);
    expect(res.status).not.toBe(403);
  });
});

// =============================================================================
// POST /cdn/upload TESTS
// =============================================================================

describe("POST /cdn/upload", () => {
  beforeEach(() => {
    // Setup successful auth for all upload tests
    vi.mocked(extractBearerToken).mockReturnValue("valid-token");
    vi.mocked(verifyAccessToken).mockResolvedValue({ sub: "admin-user-123" });
    vi.mocked(isUserAdmin).mockResolvedValue(true);
  });

  it("returns 400 when no file is provided", async () => {
    const formData = new FormData();
    formData.append("folder", "images");

    const app = createApp();
    const res = await app.request(
      "/cdn/upload",
      { method: "POST", body: formData },
      mockEnv,
    );

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("no_file");
  });

  it("returns 400 when file type is not allowed", async () => {
    const formData = new FormData();
    formData.append(
      "file",
      new File(["test"], "test.exe", { type: "application/x-msdownload" }),
    );
    formData.append("folder", "uploads");

    const app = createApp();
    const res = await app.request(
      "/cdn/upload",
      { method: "POST", body: formData },
      mockEnv,
    );

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("invalid_file_type");
  });

  it("accepts image files", async () => {
    const mockDb = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          run: vi.fn().mockResolvedValue({ success: true }),
        }),
      }),
    };
    vi.mocked(createDbSession).mockReturnValue(mockDb as any);

    const formData = new FormData();
    formData.append(
      "file",
      new File(["test"], "test.png", { type: "image/png" }),
    );
    formData.append("folder", "images");

    const app = createApp();
    const res = await app.request(
      "/cdn/upload",
      { method: "POST", body: formData },
      mockEnv,
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.file).toBeDefined();
    expect(json.file.content_type).toBe("image/png");
  });

  it("accepts video files", async () => {
    const mockDb = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          run: vi.fn().mockResolvedValue({ success: true }),
        }),
      }),
    };
    vi.mocked(createDbSession).mockReturnValue(mockDb as any);

    const formData = new FormData();
    formData.append(
      "file",
      new File(["test"], "test.mp4", { type: "video/mp4" }),
    );
    formData.append("folder", "videos");

    const app = createApp();
    const res = await app.request(
      "/cdn/upload",
      { method: "POST", body: formData },
      mockEnv,
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.file.content_type).toBe("video/mp4");
  });

  it("accepts audio files", async () => {
    const mockDb = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          run: vi.fn().mockResolvedValue({ success: true }),
        }),
      }),
    };
    vi.mocked(createDbSession).mockReturnValue(mockDb as any);

    const formData = new FormData();
    formData.append(
      "file",
      new File(["test"], "test.mp3", { type: "audio/mpeg" }),
    );
    formData.append("folder", "audio");

    const app = createApp();
    const res = await app.request(
      "/cdn/upload",
      { method: "POST", body: formData },
      mockEnv,
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.file.content_type).toBe("audio/mpeg");
  });

  it("accepts font files", async () => {
    const mockDb = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          run: vi.fn().mockResolvedValue({ success: true }),
        }),
      }),
    };
    vi.mocked(createDbSession).mockReturnValue(mockDb as any);

    const formData = new FormData();
    formData.append(
      "file",
      new File(["test"], "font.woff2", { type: "font/woff2" }),
    );
    formData.append("folder", "fonts");

    const app = createApp();
    const res = await app.request(
      "/cdn/upload",
      { method: "POST", body: formData },
      mockEnv,
    );

    expect(res.status).toBe(200);
  });

  it("rejects files larger than 50MB", async () => {
    const formData = new FormData();
    // Create a large file (51MB)
    const largeFile = new File(
      [new ArrayBuffer(51 * 1024 * 1024)],
      "large.png",
      {
        type: "image/png",
      },
    );
    Object.defineProperty(largeFile, "size", { value: 51 * 1024 * 1024 });

    formData.append("file", largeFile);
    formData.append("folder", "images");

    const app = createApp();
    const res = await app.request(
      "/cdn/upload",
      { method: "POST", body: formData },
      mockEnv,
    );

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("file_too_large");
  });

  it("rejects folder with path traversal (..)", async () => {
    const formData = new FormData();
    formData.append(
      "file",
      new File(["test"], "test.png", { type: "image/png" }),
    );
    formData.append("folder", "../../../etc/passwd");

    const app = createApp();
    const res = await app.request(
      "/cdn/upload",
      { method: "POST", body: formData },
      mockEnv,
    );

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("invalid_folder");
  });

  it("rejects folder with backslashes", async () => {
    const formData = new FormData();
    formData.append(
      "file",
      new File(["test"], "test.png", { type: "image/png" }),
    );
    formData.append("folder", "images\\windows");

    const app = createApp();
    const res = await app.request(
      "/cdn/upload",
      { method: "POST", body: formData },
      mockEnv,
    );

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("invalid_folder");
  });

  it("rejects folder with null byte", async () => {
    const formData = new FormData();
    formData.append(
      "file",
      new File(["test"], "test.png", { type: "image/png" }),
    );
    formData.append("folder", "images\0evil");

    const app = createApp();
    const res = await app.request(
      "/cdn/upload",
      { method: "POST", body: formData },
      mockEnv,
    );

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("invalid_folder");
  });

  it("rejects folder with double slashes", async () => {
    const formData = new FormData();
    formData.append(
      "file",
      new File(["test"], "test.png", { type: "image/png" }),
    );
    formData.append("folder", "images//evil");

    const app = createApp();
    const res = await app.request(
      "/cdn/upload",
      { method: "POST", body: formData },
      mockEnv,
    );

    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("invalid_folder");
  });

  it("uploads file and returns CDN URL", async () => {
    const mockDb = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          run: vi.fn().mockResolvedValue({ success: true }),
        }),
      }),
    };
    vi.mocked(createDbSession).mockReturnValue(mockDb as any);

    const formData = new FormData();
    formData.append(
      "file",
      new File(["test content"], "test.png", { type: "image/png" }),
    );
    formData.append("folder", "images");
    formData.append("alt_text", "A test image");

    const app = createApp();
    const res = await app.request(
      "/cdn/upload",
      { method: "POST", body: formData },
      mockEnv,
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.file.id).toBeDefined();
    expect(json.file.filename).toBeDefined();
    expect(json.file.original_filename).toBe("test.png");
    expect(json.file.key).toBeDefined();
    expect(json.file.key).toContain("images/");
    expect(json.file.url).toContain("https://cdn.grove.place/");
    expect(json.file.alt_text).toBe("A test image");
    expect(json.file.uploaded_by).toBe("admin-user-123");
  });

  it("calls R2 bucket put with correct metadata", async () => {
    const mockDb = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          run: vi.fn().mockResolvedValue({ success: true }),
        }),
      }),
    };
    vi.mocked(createDbSession).mockReturnValue(mockDb as any);

    const mockR2Put = vi.fn().mockResolvedValue(undefined);
    mockEnv.CDN_BUCKET = {
      put: mockR2Put,
      delete: vi.fn(),
      list: vi.fn(),
      head: vi.fn(),
    } as unknown as R2Bucket;

    const formData = new FormData();
    formData.append(
      "file",
      new File(["test"], "test.png", { type: "image/png" }),
    );
    formData.append("folder", "images");

    const app = createApp();
    await app.request(
      "/cdn/upload",
      { method: "POST", body: formData },
      mockEnv,
    );

    expect(mockR2Put).toHaveBeenCalled();
    const callArgs = mockR2Put.mock.calls[0];
    expect(callArgs[0]).toContain("images/"); // Key should contain folder
    expect(callArgs[2]).toHaveProperty("httpMetadata");
    expect(callArgs[2]?.httpMetadata?.contentType).toBe("image/png");
  });

  it("stores file metadata in database", async () => {
    const mockRun = vi.fn().mockResolvedValue({ success: true });
    const mockDb = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          run: mockRun,
        }),
      }),
    };
    vi.mocked(createDbSession).mockReturnValue(mockDb as any);

    const formData = new FormData();
    formData.append(
      "file",
      new File(["test"], "test.png", { type: "image/png" }),
    );
    formData.append("folder", "images");

    const app = createApp();
    await app.request(
      "/cdn/upload",
      { method: "POST", body: formData },
      mockEnv,
    );

    expect(mockRun).toHaveBeenCalled();
    const insertQuery = mockDb.prepare.mock.calls[0][0] as string;
    expect(insertQuery).toContain("INSERT INTO cdn_files");
  });
});

// =============================================================================
// GET /cdn/files TESTS
// =============================================================================

describe("GET /cdn/files", () => {
  beforeEach(() => {
    vi.mocked(extractBearerToken).mockReturnValue("valid-token");
    vi.mocked(verifyAccessToken).mockResolvedValue({ sub: "admin-user-123" });
    vi.mocked(isUserAdmin).mockResolvedValue(true);
  });

  it("returns empty file list when no files exist", async () => {
    const mockDb = createSequentialMockDb([
      { all: { results: [] } }, // SELECT * FROM cdn_files ...
      { first: { total: 0 } }, // SELECT COUNT(*) ...
    ]);
    vi.mocked(createDbSession).mockReturnValue(mockDb as any);

    const app = createApp();
    const res = await app.request("/cdn/files", { method: "GET" }, mockEnv);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.files).toEqual([]);
    expect(json.total).toBe(0);
    expect(json.limit).toBe(50);
    expect(json.offset).toBe(0);
  });

  it("returns files with CDN URLs", async () => {
    const mockFiles = [
      {
        id: "file-1",
        filename: "test-image.png",
        original_filename: "test.png",
        key: "images/test-image.png",
        content_type: "image/png",
        size_bytes: 1024,
        folder: "images",
        alt_text: "Test image",
        uploaded_by: "admin-user-123",
        created_at: "2025-01-01T00:00:00Z",
        updated_at: "2025-01-01T00:00:00Z",
      },
    ];

    const mockDb = createSequentialMockDb([
      { all: { results: mockFiles } }, // SELECT * FROM cdn_files ...
      { first: { total: 1 } }, // SELECT COUNT(*) ...
    ]);
    vi.mocked(createDbSession).mockReturnValue(mockDb as any);

    const app = createApp();
    const res = await app.request("/cdn/files", { method: "GET" }, mockEnv);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.files).toHaveLength(1);
    expect(json.files[0].url).toBe(
      "https://cdn.grove.place/images/test-image.png",
    );
  });

  it("respects limit query parameter", async () => {
    const mockDb = createSequentialMockDb([
      { all: { results: [] } },
      { first: { total: 0 } },
    ]);
    vi.mocked(createDbSession).mockReturnValue(mockDb as any);

    const app = createApp();
    const res = await app.request(
      "/cdn/files?limit=10",
      { method: "GET" },
      mockEnv,
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.limit).toBe(10);
  });

  it("respects offset query parameter", async () => {
    const mockDb = createSequentialMockDb([
      { all: { results: [] } },
      { first: { total: 0 } },
    ]);
    vi.mocked(createDbSession).mockReturnValue(mockDb as any);

    const app = createApp();
    const res = await app.request(
      "/cdn/files?offset=25",
      { method: "GET" },
      mockEnv,
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.offset).toBe(25);
  });

  it("filters files by folder", async () => {
    const mockDb = createSequentialMockDb([
      { all: { results: [] } },
      { first: { total: 0 } },
    ]);
    vi.mocked(createDbSession).mockReturnValue(mockDb as any);

    const app = createApp();
    const res = await app.request(
      "/cdn/files?folder=images",
      { method: "GET" },
      mockEnv,
    );

    expect(res.status).toBe(200);
    const prepareCall = mockDb.prepare.mock.calls[0][0] as string;
    expect(prepareCall).toContain("WHERE folder = ?");
  });

  it("includes pagination metadata", async () => {
    const mockDb = createSequentialMockDb([
      { all: { results: [] } },
      { first: { total: 100 } },
    ]);
    vi.mocked(createDbSession).mockReturnValue(mockDb as any);

    const app = createApp();
    const res = await app.request(
      "/cdn/files?limit=25&offset=50",
      { method: "GET" },
      mockEnv,
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.total).toBe(100);
    expect(json.limit).toBe(25);
    expect(json.offset).toBe(50);
  });
});

// =============================================================================
// GET /cdn/folders TESTS
// =============================================================================

describe("GET /cdn/folders", () => {
  beforeEach(() => {
    vi.mocked(extractBearerToken).mockReturnValue("valid-token");
    vi.mocked(verifyAccessToken).mockResolvedValue({ sub: "admin-user-123" });
    vi.mocked(isUserAdmin).mockResolvedValue(true);
  });

  it("returns empty array when no folders exist", async () => {
    const mockDb = {
      prepare: vi.fn().mockReturnValue({
        all: vi.fn().mockResolvedValue({ results: [] }),
      }),
    };
    vi.mocked(createDbSession).mockReturnValue(mockDb as any);

    const app = createApp();
    const res = await app.request("/cdn/folders", { method: "GET" }, mockEnv);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.folders).toEqual([]);
  });

  it("returns unique folders", async () => {
    const mockDb = {
      prepare: vi.fn().mockReturnValue({
        all: vi.fn().mockResolvedValue({
          results: [
            { folder: "images" },
            { folder: "videos" },
            { folder: "fonts" },
          ],
        }),
      }),
    };
    vi.mocked(createDbSession).mockReturnValue(mockDb as any);

    const app = createApp();
    const res = await app.request("/cdn/folders", { method: "GET" }, mockEnv);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.folders).toEqual(["images", "videos", "fonts"]);
  });

  it("queries DISTINCT folders from database", async () => {
    const mockDb = {
      prepare: vi.fn().mockReturnValue({
        all: vi.fn().mockResolvedValue({ results: [] }),
      }),
    };
    vi.mocked(createDbSession).mockReturnValue(mockDb as any);

    const app = createApp();
    await app.request("/cdn/folders", { method: "GET" }, mockEnv);

    const query = mockDb.prepare.mock.calls[0][0] as string;
    expect(query).toContain("DISTINCT folder");
  });
});

// =============================================================================
// DELETE /cdn/files/:id TESTS
// =============================================================================

describe("DELETE /cdn/files/:id", () => {
  beforeEach(() => {
    vi.mocked(extractBearerToken).mockReturnValue("valid-token");
    vi.mocked(verifyAccessToken).mockResolvedValue({ sub: "admin-user-123" });
    vi.mocked(isUserAdmin).mockResolvedValue(true);
  });

  it("returns 404 when file not found", async () => {
    const mockDb = {
      prepare: vi.fn().mockReturnValue({
        bind: vi.fn().mockReturnValue({
          first: vi.fn().mockResolvedValue(null),
        }),
      }),
    };
    vi.mocked(createDbSession).mockReturnValue(mockDb as any);

    const app = createApp();
    const res = await app.request(
      "/cdn/files/nonexistent-id",
      { method: "DELETE" },
      mockEnv,
    );

    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe("not_found");
  });

  it("deletes file from R2 and database", async () => {
    const mockR2Delete = vi.fn().mockResolvedValue(undefined);
    const mockDbRun = vi.fn().mockResolvedValue({ success: true });

    const mockDb = {
      prepare: vi.fn().mockReturnValue({
        bind: vi
          .fn()
          .mockReturnValueOnce({
            first: vi.fn().mockResolvedValue({
              id: "file-1",
              key: "images/test-image.png",
            }),
          })
          .mockReturnValueOnce({
            run: mockDbRun,
          }),
      }),
    };
    vi.mocked(createDbSession).mockReturnValue(mockDb as any);

    mockEnv.CDN_BUCKET = {
      delete: mockR2Delete,
    } as unknown as R2Bucket;

    const app = createApp();
    const res = await app.request(
      "/cdn/files/file-1",
      { method: "DELETE" },
      mockEnv,
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(mockR2Delete).toHaveBeenCalledWith("images/test-image.png");
    expect(mockDbRun).toHaveBeenCalled();
  });

  it("returns success message when file is deleted", async () => {
    const mockDb = {
      prepare: vi.fn().mockReturnValue({
        bind: vi
          .fn()
          .mockReturnValueOnce({
            first: vi.fn().mockResolvedValue({
              id: "file-1",
              key: "test.png",
            }),
          })
          .mockReturnValueOnce({
            run: vi.fn().mockResolvedValue({ success: true }),
          }),
      }),
    };
    vi.mocked(createDbSession).mockReturnValue(mockDb as any);

    const app = createApp();
    const res = await app.request(
      "/cdn/files/file-1",
      { method: "DELETE" },
      mockEnv,
    );

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.message).toBe("File deleted");
  });
});

// =============================================================================
// GET /cdn/audit TESTS
// =============================================================================

describe("GET /cdn/audit", () => {
  beforeEach(() => {
    vi.mocked(extractBearerToken).mockReturnValue("valid-token");
    vi.mocked(verifyAccessToken).mockResolvedValue({ sub: "admin-user-123" });
    vi.mocked(isUserAdmin).mockResolvedValue(true);
  });

  it("returns audit summary with zeros when everything is in sync", async () => {
    const mockDb = {
      prepare: vi.fn().mockReturnValue({
        all: vi.fn().mockResolvedValue({ results: [] }),
      }),
    };
    vi.mocked(createDbSession).mockReturnValue(mockDb as any);

    const mockR2List = vi.fn().mockResolvedValue({ objects: [] });
    mockEnv.CDN_BUCKET = {
      list: mockR2List,
    } as unknown as R2Bucket;

    const app = createApp();
    const res = await app.request("/cdn/audit", { method: "GET" }, mockEnv);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.summary).toEqual({
      total_r2_objects: 0,
      total_db_entries: 0,
      untracked_in_r2: 0,
      orphaned_in_db: 0,
    });
  });

  it("identifies untracked files in R2", async () => {
    const mockDb = {
      prepare: vi.fn().mockReturnValue({
        all: vi.fn().mockResolvedValue({ results: [] }),
      }),
    };
    vi.mocked(createDbSession).mockReturnValue(mockDb as any);

    const mockR2List = vi.fn().mockResolvedValue({
      objects: [
        {
          key: "untracked.png",
          size: 1024,
          uploaded: new Date("2025-01-01"),
        },
      ],
    });
    mockEnv.CDN_BUCKET = {
      list: mockR2List,
    } as unknown as R2Bucket;

    const app = createApp();
    const res = await app.request("/cdn/audit", { method: "GET" }, mockEnv);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.untracked_files).toHaveLength(1);
    expect(json.untracked_files[0].key).toBe("untracked.png");
    expect(json.untracked_files[0].url).toContain("https://cdn.grove.place/");
  });

  it("identifies orphaned entries in database", async () => {
    const mockDb = {
      prepare: vi.fn().mockReturnValue({
        all: vi.fn().mockResolvedValue({
          results: [{ key: "orphaned.png" }],
        }),
      }),
    };
    vi.mocked(createDbSession).mockReturnValue(mockDb as any);

    const mockR2List = vi.fn().mockResolvedValue({ objects: [] });
    mockEnv.CDN_BUCKET = {
      list: mockR2List,
    } as unknown as R2Bucket;

    const app = createApp();
    const res = await app.request("/cdn/audit", { method: "GET" }, mockEnv);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.orphaned_db_entries).toHaveLength(1);
    expect(json.orphaned_db_entries[0]).toBe("orphaned.png");
  });

  it("returns detailed untracked file info", async () => {
    const mockDb = {
      prepare: vi.fn().mockReturnValue({
        all: vi.fn().mockResolvedValue({ results: [] }),
      }),
    };
    vi.mocked(createDbSession).mockReturnValue(mockDb as any);

    const uploadDate = new Date("2025-01-15T12:30:00Z");
    const mockR2List = vi.fn().mockResolvedValue({
      objects: [
        {
          key: "images/test.png",
          size: 2048,
          uploaded: uploadDate,
        },
      ],
    });
    mockEnv.CDN_BUCKET = {
      list: mockR2List,
    } as unknown as R2Bucket;

    const app = createApp();
    const res = await app.request("/cdn/audit", { method: "GET" }, mockEnv);

    const json = await res.json();
    expect(json.untracked_files[0]).toHaveProperty("key");
    expect(json.untracked_files[0]).toHaveProperty("size");
    expect(json.untracked_files[0]).toHaveProperty("uploaded");
    expect(json.untracked_files[0]).toHaveProperty("url");
    expect(json.untracked_files[0].size).toBe(2048);
  });
});

// =============================================================================
// POST /cdn/migrate TESTS
// =============================================================================

describe("POST /cdn/migrate", () => {
  beforeEach(() => {
    vi.mocked(extractBearerToken).mockReturnValue("valid-token");
    vi.mocked(verifyAccessToken).mockResolvedValue({ sub: "admin-user-123" });
    vi.mocked(isUserAdmin).mockResolvedValue(true);
  });

  it("returns zero migrated when no untracked files", async () => {
    const mockDb = createSequentialMockDb([
      { all: { results: [] } }, // SELECT key FROM cdn_files
    ]);
    vi.mocked(createDbSession).mockReturnValue(mockDb as any);

    const mockR2List = vi.fn().mockResolvedValue({ objects: [] });
    mockEnv.CDN_BUCKET = {
      list: mockR2List,
    } as unknown as R2Bucket;

    const app = createApp();
    const res = await app.request("/cdn/migrate", { method: "POST" }, mockEnv);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.migrated).toBe(0);
  });

  it("migrates untracked R2 files to database", async () => {
    const mockDb = createSequentialMockDb([
      { all: { results: [] } }, // SELECT key FROM cdn_files
      { run: { success: true } }, // INSERT INTO cdn_files ...
    ]);
    vi.mocked(createDbSession).mockReturnValue(mockDb as any);

    const mockR2List = vi.fn().mockResolvedValue({
      objects: [
        {
          key: "images/test.png",
          size: 1024,
          uploaded: new Date("2025-01-01"),
        },
      ],
    });

    const mockR2Head = vi.fn().mockResolvedValue({
      httpMetadata: { contentType: "image/png" },
    });

    mockEnv.CDN_BUCKET = {
      list: mockR2List,
      head: mockR2Head,
    } as unknown as R2Bucket;

    const app = createApp();
    const res = await app.request("/cdn/migrate", { method: "POST" }, mockEnv);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.migrated).toBe(1);
    expect(mockR2Head).toHaveBeenCalledWith("images/test.png");
  });

  it("calls R2 head to get content type", async () => {
    const mockDb = createSequentialMockDb([
      { all: { results: [] } }, // SELECT key FROM cdn_files
      { run: { success: true } }, // INSERT INTO cdn_files ...
    ]);
    vi.mocked(createDbSession).mockReturnValue(mockDb as any);

    const mockR2Head = vi.fn().mockResolvedValue({
      httpMetadata: { contentType: "image/jpeg" },
    });

    const mockR2List = vi.fn().mockResolvedValue({
      objects: [
        {
          key: "test.jpg",
          size: 512,
          uploaded: new Date(),
        },
      ],
    });

    mockEnv.CDN_BUCKET = {
      list: mockR2List,
      head: mockR2Head,
    } as unknown as R2Bucket;

    const app = createApp();
    await app.request("/cdn/migrate", { method: "POST" }, mockEnv);

    expect(mockR2Head).toHaveBeenCalledWith("test.jpg");
  });

  it("inserts migrated file with correct metadata", async () => {
    const mockDb = createSequentialMockDb([
      { all: { results: [] } }, // SELECT key FROM cdn_files
      { run: { success: true } }, // INSERT INTO cdn_files ...
    ]);
    vi.mocked(createDbSession).mockReturnValue(mockDb as any);

    const mockR2List = vi.fn().mockResolvedValue({
      objects: [
        {
          key: "images/test.png",
          size: 1024,
          uploaded: new Date("2025-01-01T12:00:00Z"),
        },
      ],
    });

    mockEnv.CDN_BUCKET = {
      list: mockR2List,
      head: vi
        .fn()
        .mockResolvedValue({ httpMetadata: { contentType: "image/png" } }),
    } as unknown as R2Bucket;

    const app = createApp();
    const res = await app.request("/cdn/migrate", { method: "POST" }, mockEnv);

    expect(res.status).toBe(200);

    // Verify INSERT was called (second prepare() call, after the SELECT)
    const insertQuery = mockDb.prepare.mock.calls[1]?.[0] as string;
    expect(insertQuery).toContain("INSERT INTO cdn_files");
  });

  it("handles migration errors gracefully", async () => {
    let callIndex = 0;
    const mockDb = {
      prepare: vi.fn().mockImplementation(() => {
        callIndex++;
        if (callIndex === 1) {
          // First call: SELECT key FROM cdn_files
          return {
            bind: vi.fn().mockReturnValue({
              first: vi.fn().mockResolvedValue(null),
              all: vi.fn().mockResolvedValue({ results: [] }),
              run: vi.fn().mockResolvedValue({ success: true }),
            }),
            first: vi.fn().mockResolvedValue(null),
            all: vi.fn().mockResolvedValue({ results: [] }),
            run: vi.fn().mockResolvedValue({ success: true }),
          };
        }
        // Subsequent calls: INSERT — make .run() reject
        return {
          bind: vi.fn().mockReturnValue({
            first: vi.fn().mockResolvedValue(null),
            all: vi.fn().mockResolvedValue({ results: [] }),
            run: vi.fn().mockRejectedValue(new Error("DB error")),
          }),
          first: vi.fn().mockResolvedValue(null),
          all: vi.fn().mockResolvedValue({ results: [] }),
          run: vi.fn().mockRejectedValue(new Error("DB error")),
        };
      }),
      withSession: vi.fn().mockReturnThis(),
    };
    vi.mocked(createDbSession).mockReturnValue(mockDb as any);

    const mockR2List = vi.fn().mockResolvedValue({
      objects: [
        {
          key: "test.png",
          size: 1024,
          uploaded: new Date(),
        },
      ],
    });

    mockEnv.CDN_BUCKET = {
      list: mockR2List,
      head: vi
        .fn()
        .mockResolvedValue({ httpMetadata: { contentType: "image/png" } }),
    } as unknown as R2Bucket;

    const app = createApp();
    const res = await app.request("/cdn/migrate", { method: "POST" }, mockEnv);

    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.errors).toBeDefined();
  });
});
