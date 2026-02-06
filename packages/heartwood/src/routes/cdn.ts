/**
 * CDN Routes - File upload and management for cdn.grove.place
 * All routes require admin access
 */

import { Hono } from "hono";
import type { Env } from "../types.js";
import { verifyAccessToken } from "../services/jwt.js";
import { isUserAdmin } from "../db/queries.js";
import { createDbSession } from "../db/session.js";

// Define context variables for type-safe c.set()/c.get()
type Variables = {
  userId: string;
};

const cdn = new Hono<{ Bindings: Env; Variables: Variables }>();

// Allowed MIME types (expanded from images-only to support all web assets)
const ALLOWED_TYPES = [
  // Images
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "image/avif",
  "image/bmp",
  "image/x-icon",
  // Videos
  "video/mp4",
  "video/webm",
  "video/ogg",
  "video/quicktime",
  // Audio
  "audio/mpeg",
  "audio/ogg",
  "audio/wav",
  "audio/webm",
  // Fonts
  "font/ttf",
  "font/otf",
  "font/woff",
  "font/woff2",
  "application/font-woff",
  "application/font-woff2",
  // Documents
  "application/pdf",
  // Web assets
  "text/css",
  "text/javascript",
  "application/javascript",
  "application/json",
  // Archives (for font packages, etc)
  "application/zip",
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

/**
 * Middleware: Verify admin access
 */
cdn.use("/*", async (c, next) => {
  const authHeader = c.req.header("Authorization");

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return c.json(
      { error: "unauthorized", error_description: "Missing or invalid token" },
      401,
    );
  }

  const token = authHeader.substring(7);
  const payload = await verifyAccessToken(c.env, token);

  if (!payload) {
    return c.json(
      {
        error: "invalid_token",
        error_description: "Token is invalid or expired",
      },
      401,
    );
  }

  const db = createDbSession(c.env);
  const isAdmin = await isUserAdmin(db, payload.sub);
  if (!isAdmin) {
    return c.json(
      { error: "forbidden", error_description: "Admin access required" },
      403,
    );
  }

  // Store user ID for later use
  c.set("userId", payload.sub);

  await next();
});

/**
 * Generate a unique ID for files
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Sanitize filename for safe storage
 */
function sanitizeFilename(filename: string): string {
  // Get extension
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  const baseName = filename.substring(0, filename.length - ext.length - 1);

  // Sanitize base name
  const clean = baseName
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .substring(0, 100); // Limit length

  // Add timestamp to prevent collisions
  const timestamp = Date.now().toString(36);

  return `${clean}-${timestamp}.${ext}`;
}

/**
 * Validate folder path for safe storage (prevent path traversal)
 */
function validateFolder(folder: string): {
  valid: boolean;
  normalized: string;
} {
  // Reject dangerous patterns
  if (
    folder.includes("..") ||
    folder.includes("\\") ||
    folder.includes("\0") ||
    folder.includes("//")
  ) {
    return { valid: false, normalized: "" };
  }

  // Only allow alphanumeric, dash, underscore, dot, and forward slash
  if (!/^[a-zA-Z0-9._\/-]*$/.test(folder)) {
    return { valid: false, normalized: "" };
  }

  // Normalize: remove leading/trailing slashes
  const normalized = folder.replace(/^\/+|\/+$/g, "");

  return { valid: true, normalized };
}

/**
 * POST /cdn/upload - Upload a file to the CDN
 */
cdn.post("/upload", async (c) => {
  const userId = c.get("userId");
  const db = createDbSession(c.env);

  try {
    const formData = await c.req.formData();
    const file = formData.get("file") as File | null;
    const folder = (formData.get("folder") as string) || "";
    const altText = (formData.get("alt_text") as string) || null;

    // Validate folder for path traversal
    const validation = validateFolder(folder);
    if (!validation.valid) {
      return c.json(
        {
          error: "invalid_folder",
          error_description: "Folder contains invalid characters",
        },
        400,
      );
    }

    if (!file) {
      return c.json({ error: "No file provided" }, 400);
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return c.json(
        {
          error: `Invalid file type: ${file.type}. Allowed types: images, videos, audio, fonts, PDFs, CSS, JS`,
        },
        400,
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return c.json({ error: `File too large. Maximum size is 50MB` }, 400);
    }

    const originalFilename = file.name;
    const sanitizedFilename = sanitizeFilename(originalFilename);

    // Build R2 key: folder/filename (using validated and normalized folder)
    const key = validation.normalized
      ? `${validation.normalized}/${sanitizedFilename}`
      : sanitizedFilename;

    // Upload to R2
    const arrayBuffer = await file.arrayBuffer();

    const customMetadata: Record<string, string> = {
      originalFilename,
      uploadedBy: userId,
    };
    if (altText) {
      customMetadata.altText = altText;
    }

    await c.env.CDN_BUCKET.put(key, arrayBuffer, {
      httpMetadata: {
        contentType: file.type,
        cacheControl: "public, max-age=31536000, immutable",
      },
      customMetadata,
    });

    // Store metadata in database
    const fileId = generateId();
    const now = new Date().toISOString();

    await db
      .prepare(
        `INSERT INTO cdn_files (id, filename, original_filename, key, content_type, size_bytes, folder, alt_text, uploaded_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        fileId,
        sanitizedFilename,
        originalFilename,
        key,
        file.type,
        file.size,
        folder,
        altText,
        userId,
        now,
        now,
      )
      .run();

    const cdnUrl = `${c.env.CDN_URL}/${key}`;

    return c.json({
      success: true,
      file: {
        id: fileId,
        filename: sanitizedFilename,
        original_filename: originalFilename,
        key,
        content_type: file.type,
        size_bytes: file.size,
        folder,
        alt_text: altText,
        uploaded_by: userId,
        created_at: now,
        url: cdnUrl,
      },
    });
  } catch (error) {
    console.error("[CDN Upload Error]", error);
    return c.json({ error: "Failed to upload file" }, 500);
  }
});

/**
 * GET /cdn/files - List files with pagination and filtering
 */
cdn.get("/files", async (c) => {
  const db = createDbSession(c.env);

  try {
    const limit = parseInt(c.req.query("limit") || "50");
    const offset = parseInt(c.req.query("offset") || "0");
    const folder = c.req.query("folder") || null;

    let query = "SELECT * FROM cdn_files";
    const params: (string | number)[] = [];

    if (folder) {
      query += " WHERE folder = ?";
      params.push(folder);
    }

    query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
    params.push(limit, offset);

    const result = await db
      .prepare(query)
      .bind(...params)
      .all();

    // Get total count
    let countQuery = "SELECT COUNT(*) as total FROM cdn_files";
    const countParams: string[] = [];
    if (folder) {
      countQuery += " WHERE folder = ?";
      countParams.push(folder);
    }
    const countResult = await db
      .prepare(countQuery)
      .bind(...countParams)
      .first<{ total: number }>();
    const total = countResult?.total || 0;

    // Add URLs to files
    const files = (result.results || []).map((file: any) => ({
      ...file,
      url: `${c.env.CDN_URL}/${file.key}`,
    }));

    return c.json({
      files,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error("[CDN List Error]", error);
    return c.json({ error: "Failed to list files" }, 500);
  }
});

/**
 * GET /cdn/folders - List all unique folders
 */
cdn.get("/folders", async (c) => {
  const db = createDbSession(c.env);

  try {
    const result = await db
      .prepare("SELECT DISTINCT folder FROM cdn_files ORDER BY folder")
      .all();

    const folders = (result.results || []).map((row: any) => row.folder);

    return c.json({ folders });
  } catch (error) {
    console.error("[CDN Folders Error]", error);
    return c.json({ error: "Failed to list folders" }, 500);
  }
});

/**
 * DELETE /cdn/files/:id - Delete a file
 */
cdn.delete("/files/:id", async (c) => {
  const db = createDbSession(c.env);
  const fileId = c.req.param("id");

  try {
    // Get file metadata
    const file = await db
      .prepare("SELECT * FROM cdn_files WHERE id = ?")
      .bind(fileId)
      .first<{
        id: string;
        key: string;
      }>();

    if (!file) {
      return c.json({ error: "File not found" }, 404);
    }

    // Delete from R2
    await c.env.CDN_BUCKET.delete(file.key);

    // Delete from database
    await db.prepare("DELETE FROM cdn_files WHERE id = ?").bind(fileId).run();

    return c.json({ success: true, message: "File deleted" });
  } catch (error) {
    console.error("[CDN Delete Error]", error);
    return c.json({ error: "Failed to delete file" }, 500);
  }
});

/**
 * GET /cdn/audit - Check for discrepancies between R2 and database
 * Admin-only endpoint to identify files in R2 that aren't tracked in the database
 */
cdn.get("/audit", async (c) => {
  const db = createDbSession(c.env);

  try {
    // List all objects in R2
    const r2Objects = await c.env.CDN_BUCKET.list();

    // Get all keys from database
    const dbResult = await db.prepare("SELECT key FROM cdn_files").all();
    const dbKeys = new Set((dbResult.results || []).map((row: any) => row.key));

    // Find objects in R2 but not in database
    const untracked = r2Objects.objects
      .filter((obj) => !dbKeys.has(obj.key))
      .map((obj) => ({
        key: obj.key,
        size: obj.size,
        uploaded: obj.uploaded.toISOString(),
        url: `${c.env.CDN_URL}/${obj.key}`,
      }));

    // Find entries in database but not in R2
    const r2Keys = new Set(r2Objects.objects.map((obj) => obj.key));
    const orphaned = (dbResult.results || [])
      .filter((row: any) => !r2Keys.has(row.key))
      .map((row: any) => row.key);

    return c.json({
      summary: {
        total_r2_objects: r2Objects.objects.length,
        total_db_entries: dbResult.results?.length || 0,
        untracked_in_r2: untracked.length,
        orphaned_in_db: orphaned.length,
      },
      untracked_files: untracked,
      orphaned_db_entries: orphaned,
    });
  } catch (error) {
    console.error("[CDN Audit Error]", error);
    return c.json({ error: "Failed to audit CDN" }, 500);
  }
});

/**
 * POST /cdn/migrate - Migrate untracked R2 files into the database
 * Admin-only endpoint to import existing R2 files that were uploaded before the CDN manager
 */
cdn.post("/migrate", async (c) => {
  const userId = c.get("userId");
  const db = createDbSession(c.env);

  try {
    // List all objects in R2
    const r2Objects = await c.env.CDN_BUCKET.list();

    // Get all keys from database
    const dbResult = await db.prepare("SELECT key FROM cdn_files").all();
    const dbKeys = new Set((dbResult.results || []).map((row: any) => row.key));

    // Find untracked files
    const untracked = r2Objects.objects.filter((obj) => !dbKeys.has(obj.key));

    if (untracked.length === 0) {
      return c.json({ message: "No untracked files to migrate", migrated: 0 });
    }

    const now = new Date().toISOString();
    let migratedCount = 0;
    const errors: string[] = [];

    // Import each untracked file
    for (const obj of untracked) {
      try {
        // Get metadata from R2
        const r2Obj = await c.env.CDN_BUCKET.head(obj.key);
        const contentType =
          r2Obj?.httpMetadata?.contentType || "application/octet-stream";

        // Parse folder from key
        const lastSlash = obj.key.lastIndexOf("/");
        const folder =
          lastSlash > 0 ? "/" + obj.key.substring(0, lastSlash) : "/";
        const filename =
          lastSlash > 0 ? obj.key.substring(lastSlash + 1) : obj.key;

        const fileId = generateId();

        await db
          .prepare(
            `INSERT INTO cdn_files (id, filename, original_filename, key, content_type, size_bytes, folder, alt_text, uploaded_by, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          )
          .bind(
            fileId,
            filename,
            filename, // original_filename same as filename for migrated files
            obj.key,
            contentType,
            obj.size,
            folder,
            null, // No alt text for migrated files
            userId,
            obj.uploaded.toISOString(),
            now,
          )
          .run();

        migratedCount++;
      } catch (err) {
        errors.push(`Failed to migrate ${obj.key}: ${err}`);
      }
    }

    return c.json({
      success: true,
      migrated: migratedCount,
      total_untracked: untracked.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("[CDN Migrate Error]", error);
    return c.json({ error: "Failed to migrate files" }, 500);
  }
});

export default cdn;
