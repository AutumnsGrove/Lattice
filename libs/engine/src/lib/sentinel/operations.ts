/**
 * Sentinel Operation Generators
 *
 * Generate realistic database, KV, and R2 operations for stress testing.
 * Operations are designed to mimic real Grove usage patterns.
 */

import type {
  TargetSystem,
  OperationResult,
  D1Database,
  KVNamespace,
  R2Bucket,
} from "./types.js";

// =============================================================================
// OPERATION REGISTRY
// =============================================================================

export type OperationFn = (
  db: D1Database,
  kv: KVNamespace,
  r2: R2Bucket,
  tenantId: string,
  index: number,
) => Promise<OperationResult>;

const operationRegistry: Map<TargetSystem, OperationFn[]> = new Map();

/**
 * Get a random operation for a given target system
 */
export function getOperation(system: TargetSystem): OperationFn | null {
  const operations = operationRegistry.get(system);
  if (!operations || operations.length === 0) return null;
  return operations[Math.floor(Math.random() * operations.length)];
}

/**
 * Execute an operation and measure timing
 */
export async function executeOperation(
  system: TargetSystem,
  db: D1Database,
  kv: KVNamespace,
  r2: R2Bucket,
  tenantId: string,
  index: number,
): Promise<OperationResult> {
  const operation = getOperation(system);
  if (!operation) {
    return {
      success: false,
      latencyMs: 0,
      operationName: "unknown",
      errorMessage: `No operations registered for system: ${system}`,
      errorCode: "NO_OPERATION",
    };
  }

  const start = performance.now();
  try {
    const result = await operation(db, kv, r2, tenantId, index);
    const latencyMs = performance.now() - start;
    return {
      ...result,
      latencyMs,
    };
  } catch (error) {
    const latencyMs = performance.now() - start;
    return {
      success: false,
      latencyMs,
      operationName: "unknown",
      errorMessage: error instanceof Error ? error.message : String(error),
      errorCode: error instanceof Error ? error.name : "UNKNOWN_ERROR",
    };
  }
}

// =============================================================================
// D1 WRITE OPERATIONS
// =============================================================================

// Sentinel test table prefix to avoid polluting production data
const SENTINEL_PREFIX = "sentinel_test_";

operationRegistry.set("d1_writes", [
  // Insert a test record
  async (db, _kv, _r2, tenantId, index): Promise<OperationResult> => {
    const id = `${SENTINEL_PREFIX}${tenantId}_${Date.now()}_${index}`;
    const start = performance.now();

    try {
      const result = await db
        .prepare(
          `INSERT INTO sentinel_test_data (id, tenant_id, data, created_at)
           VALUES (?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET data = excluded.data, created_at = excluded.created_at`,
        )
        .bind(
          id,
          tenantId,
          JSON.stringify({ index, timestamp: Date.now() }),
          Math.floor(Date.now() / 1000),
        )
        .run();

      return {
        success: result.success,
        latencyMs: performance.now() - start,
        operationName: "insert_test_record",
        rowsAffected: result.meta?.changes ?? 1,
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes("no such table")) {
        throw new Error(
          "sentinel_test_data table missing — run migration 032_sentinel.sql",
        );
      }
      throw error;
    }
  },

  // Update a test record
  async (db, _kv, _r2, tenantId, index): Promise<OperationResult> => {
    const start = performance.now();

    try {
      const result = await db
        .prepare(
          `UPDATE sentinel_test_data
           SET data = ?, created_at = ?
           WHERE tenant_id = ?
           LIMIT 1`,
        )
        .bind(
          JSON.stringify({ index, timestamp: Date.now(), updated: true }),
          Math.floor(Date.now() / 1000),
          tenantId,
        )
        .run();

      return {
        success: true,
        latencyMs: performance.now() - start,
        operationName: "update_test_record",
        rowsAffected: result.meta?.changes ?? 0,
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes("no such table")) {
        // Table doesn't exist, but that's OK for updates
        return {
          success: true,
          latencyMs: performance.now() - start,
          operationName: "update_test_record_no_table",
          rowsAffected: 0,
        };
      }
      throw error;
    }
  },

  // Batch insert (uses Loom pattern)
  async (db, _kv, _r2, tenantId, index): Promise<OperationResult> => {
    const batchSize = 5;
    const start = performance.now();

    try {
      const statements = [];
      for (let i = 0; i < batchSize; i++) {
        const id = `${SENTINEL_PREFIX}${tenantId}_batch_${Date.now()}_${index}_${i}`;
        statements.push(
          db
            .prepare(
              `INSERT INTO sentinel_test_data (id, tenant_id, data, created_at)
             VALUES (?, ?, ?, ?)
             ON CONFLICT(id) DO UPDATE SET data = excluded.data`,
            )
            .bind(
              id,
              tenantId,
              JSON.stringify({ batch: index, item: i }),
              Math.floor(Date.now() / 1000),
            ),
        );
      }

      const results = await db.batch(statements);
      const allSuccess = results.every((r) => r.success);

      return {
        success: allSuccess,
        latencyMs: performance.now() - start,
        operationName: "batch_insert",
        rowsAffected: batchSize,
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes("no such table")) {
        throw new Error(
          "sentinel_test_data table missing — run migration 032_sentinel.sql",
        );
      }
      throw error;
    }
  },
]);

// =============================================================================
// D1 READ OPERATIONS
// =============================================================================

operationRegistry.set("d1_reads", [
  // Simple select
  async (db, _kv, _r2, tenantId, _index): Promise<OperationResult> => {
    const start = performance.now();

    try {
      const result = await db
        .prepare(
          `SELECT * FROM sentinel_test_data WHERE tenant_id = ? LIMIT 10`,
        )
        .bind(tenantId)
        .all();

      return {
        success: true,
        latencyMs: performance.now() - start,
        operationName: "select_test_records",
        rowsAffected: result.results.length,
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes("no such table")) {
        return {
          success: true,
          latencyMs: performance.now() - start,
          operationName: "select_test_records_no_table",
          rowsAffected: 0,
        };
      }
      throw error;
    }
  },

  // Count query
  async (db, _kv, _r2, tenantId, _index): Promise<OperationResult> => {
    const start = performance.now();

    try {
      const result = await db
        .prepare(
          `SELECT COUNT(*) as count FROM sentinel_test_data WHERE tenant_id = ?`,
        )
        .bind(tenantId)
        .first<{ count: number }>();

      return {
        success: true,
        latencyMs: performance.now() - start,
        operationName: "count_test_records",
        rowsAffected: result?.count ?? 0,
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes("no such table")) {
        return {
          success: true,
          latencyMs: performance.now() - start,
          operationName: "count_test_records_no_table",
          rowsAffected: 0,
        };
      }
      throw error;
    }
  },

  // Join-like query (simulates post listing with metadata)
  async (db, _kv, _r2, tenantId, _index): Promise<OperationResult> => {
    const start = performance.now();

    try {
      // Try to query posts table if it exists
      const result = await db
        .prepare(
          `SELECT p.id, p.title, p.slug, p.status
           FROM posts p
           WHERE p.tenant_id = ?
           ORDER BY p.created_at DESC
           LIMIT 20`,
        )
        .bind(tenantId)
        .all();

      return {
        success: true,
        latencyMs: performance.now() - start,
        operationName: "select_posts_listing",
        rowsAffected: result.results.length,
      };
    } catch (error) {
      // Fall back to test table
      if (error instanceof Error && error.message.includes("no such table")) {
        return {
          success: true,
          latencyMs: performance.now() - start,
          operationName: "select_posts_listing_fallback",
          rowsAffected: 0,
        };
      }
      throw error;
    }
  },
]);

// =============================================================================
// KV GET OPERATIONS
// =============================================================================

operationRegistry.set("kv_get", [
  // Simple get
  async (_db, kv, _r2, tenantId, index): Promise<OperationResult> => {
    const key = `${SENTINEL_PREFIX}${tenantId}_${index % 100}`;
    const start = performance.now();

    try {
      const value = await kv.get(key);
      return {
        success: true,
        latencyMs: performance.now() - start,
        operationName: "kv_get_simple",
        bytesTransferred: value
          ? new TextEncoder().encode(String(value)).length
          : 0,
      };
    } catch (error) {
      throw error;
    }
  },

  // Get with JSON parsing
  async (_db, kv, _r2, tenantId, index): Promise<OperationResult> => {
    const key = `${SENTINEL_PREFIX}${tenantId}_json_${index % 50}`;
    const start = performance.now();

    try {
      const value = await kv.get(key, { type: "json" });
      return {
        success: true,
        latencyMs: performance.now() - start,
        operationName: "kv_get_json",
        bytesTransferred: value ? JSON.stringify(value).length : 0,
      };
    } catch (error) {
      throw error;
    }
  },

  // List keys
  async (_db, kv, _r2, tenantId, _index): Promise<OperationResult> => {
    const start = performance.now();

    try {
      const result = await kv.list({
        prefix: `${SENTINEL_PREFIX}${tenantId}_`,
        limit: 20,
      });
      return {
        success: true,
        latencyMs: performance.now() - start,
        operationName: "kv_list",
        rowsAffected: result.keys.length,
      };
    } catch (error) {
      throw error;
    }
  },
]);

// =============================================================================
// KV PUT OPERATIONS
// =============================================================================

operationRegistry.set("kv_put", [
  // Simple put
  async (_db, kv, _r2, tenantId, index): Promise<OperationResult> => {
    const key = `${SENTINEL_PREFIX}${tenantId}_${index % 100}`;
    const value = JSON.stringify({
      index,
      timestamp: Date.now(),
      random: Math.random(),
    });
    const start = performance.now();

    try {
      await kv.put(key, value, { expirationTtl: 3600 }); // 1 hour TTL
      return {
        success: true,
        latencyMs: performance.now() - start,
        operationName: "kv_put_simple",
        bytesTransferred: new TextEncoder().encode(value).length,
      };
    } catch (error) {
      throw error;
    }
  },

  // Put with metadata
  async (_db, kv, _r2, tenantId, index): Promise<OperationResult> => {
    const key = `${SENTINEL_PREFIX}${tenantId}_meta_${index % 50}`;
    const value = JSON.stringify({
      index,
      timestamp: Date.now(),
      data: Array(100).fill("x").join(""), // ~100 bytes
    });
    const start = performance.now();

    try {
      await kv.put(key, value, {
        expirationTtl: 3600,
        metadata: { createdBy: "sentinel", index: String(index) },
      });
      return {
        success: true,
        latencyMs: performance.now() - start,
        operationName: "kv_put_with_metadata",
        bytesTransferred: new TextEncoder().encode(value).length,
      };
    } catch (error) {
      throw error;
    }
  },
]);

// =============================================================================
// R2 UPLOAD OPERATIONS
// =============================================================================

operationRegistry.set("r2_upload", [
  // Small file upload
  async (_db, _kv, r2, tenantId, index): Promise<OperationResult> => {
    const key = `${SENTINEL_PREFIX}${tenantId}/small_${index}.txt`;
    const content = `Sentinel test file ${index} - ${new Date().toISOString()}\n${"x".repeat(1000)}`;
    const start = performance.now();

    try {
      await r2.put(key, content, {
        httpMetadata: { contentType: "text/plain" },
        customMetadata: { sentinelTest: "true", index: String(index) },
      });
      return {
        success: true,
        latencyMs: performance.now() - start,
        operationName: "r2_upload_small",
        bytesTransferred: new TextEncoder().encode(content).length,
      };
    } catch (error) {
      throw error;
    }
  },

  // Medium file upload (~10KB)
  async (_db, _kv, r2, tenantId, index): Promise<OperationResult> => {
    const key = `${SENTINEL_PREFIX}${tenantId}/medium_${index}.json`;
    const content = JSON.stringify({
      index,
      timestamp: Date.now(),
      data: Array(100)
        .fill(null)
        .map((_, i) => ({
          id: i,
          value: `item_${i}_${"x".repeat(50)}`,
        })),
    });
    const start = performance.now();

    try {
      await r2.put(key, content, {
        httpMetadata: { contentType: "application/json" },
        customMetadata: { sentinelTest: "true", index: String(index) },
      });
      return {
        success: true,
        latencyMs: performance.now() - start,
        operationName: "r2_upload_medium",
        bytesTransferred: new TextEncoder().encode(content).length,
      };
    } catch (error) {
      throw error;
    }
  },
]);

// =============================================================================
// R2 DOWNLOAD OPERATIONS
// =============================================================================

operationRegistry.set("r2_download", [
  // Download existing file
  async (_db, _kv, r2, tenantId, index): Promise<OperationResult> => {
    const key = `${SENTINEL_PREFIX}${tenantId}/small_${index % 100}.txt`;
    const start = performance.now();

    try {
      const object = await r2.get(key);
      let bytesTransferred = 0;

      if (object) {
        const content = await object.text();
        bytesTransferred = new TextEncoder().encode(content).length;
      }

      return {
        success: true,
        latencyMs: performance.now() - start,
        operationName: "r2_download",
        bytesTransferred,
      };
    } catch (error) {
      throw error;
    }
  },

  // List objects
  async (_db, _kv, r2, tenantId, _index): Promise<OperationResult> => {
    const start = performance.now();

    try {
      const result = await r2.list({
        prefix: `${SENTINEL_PREFIX}${tenantId}/`,
        limit: 20,
      });
      return {
        success: true,
        latencyMs: performance.now() - start,
        operationName: "r2_list",
        rowsAffected: result.objects.length,
      };
    } catch (error) {
      throw error;
    }
  },
]);

// =============================================================================
// AUTH FLOW OPERATIONS
// =============================================================================

operationRegistry.set("auth_flows", [
  // Simulate session lookup
  async (db, kv, _r2, tenantId, index): Promise<OperationResult> => {
    const sessionId = `sentinel_session_${tenantId}_${index % 50}`;
    const start = performance.now();

    try {
      // First check KV for session
      const kvSession = await kv.get(`session:${sessionId}`);

      if (!kvSession) {
        // Fall back to DB
        await db
          .prepare(`SELECT * FROM sessions WHERE id = ? AND tenant_id = ?`)
          .bind(sessionId, tenantId)
          .first();
      }

      return {
        success: true,
        latencyMs: performance.now() - start,
        operationName: "session_lookup",
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes("no such table")) {
        return {
          success: true,
          latencyMs: performance.now() - start,
          operationName: "session_lookup_no_table",
        };
      }
      throw error;
    }
  },

  // Simulate rate limit check
  async (_db, kv, _r2, tenantId, index): Promise<OperationResult> => {
    const ip = `192.168.${index % 256}.${(index * 7) % 256}`;
    const key = `rate_limit:${tenantId}:${ip}`;
    const start = performance.now();

    try {
      const current = (await kv.get(key, { type: "json" })) as {
        count: number;
      } | null;
      const count = (current?.count ?? 0) + 1;
      await kv.put(key, JSON.stringify({ count, timestamp: Date.now() }), {
        expirationTtl: 60,
      });

      return {
        success: true,
        latencyMs: performance.now() - start,
        operationName: "rate_limit_check",
      };
    } catch (error) {
      throw error;
    }
  },
]);

// =============================================================================
// POST CRUD OPERATIONS
// =============================================================================

operationRegistry.set("post_crud", [
  // Simulate post creation
  async (db, _kv, _r2, tenantId, index): Promise<OperationResult> => {
    const id = `${SENTINEL_PREFIX}post_${tenantId}_${Date.now()}_${index}`;
    const slug = `sentinel-test-post-${index}-${Date.now()}`;
    const start = performance.now();

    try {
      const result = await db
        .prepare(
          `INSERT INTO posts (id, tenant_id, title, slug, markdown_content, html_content, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET updated_at = excluded.updated_at`,
        )
        .bind(
          id,
          tenantId,
          `Sentinel Test Post ${index}`,
          slug,
          `# Test Post\n\nThis is a sentinel test post created at ${new Date().toISOString()}`,
          `<h1>Test Post</h1><p>This is a sentinel test post.</p>`,
          "draft",
          Math.floor(Date.now() / 1000),
          Math.floor(Date.now() / 1000),
        )
        .run();

      return {
        success: result.success,
        latencyMs: performance.now() - start,
        operationName: "create_post",
        rowsAffected: result.meta?.changes ?? 1,
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes("no such table")) {
        return {
          success: true,
          latencyMs: performance.now() - start,
          operationName: "create_post_no_table",
          rowsAffected: 0,
        };
      }
      throw error;
    }
  },

  // Simulate post read
  async (db, _kv, _r2, tenantId, _index): Promise<OperationResult> => {
    const start = performance.now();

    try {
      const result = await db
        .prepare(
          `SELECT id, title, slug, status, created_at
           FROM posts
           WHERE tenant_id = ? AND status = 'published'
           ORDER BY created_at DESC
           LIMIT 20`,
        )
        .bind(tenantId)
        .all();

      return {
        success: true,
        latencyMs: performance.now() - start,
        operationName: "list_posts",
        rowsAffected: result.results.length,
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes("no such table")) {
        return {
          success: true,
          latencyMs: performance.now() - start,
          operationName: "list_posts_no_table",
          rowsAffected: 0,
        };
      }
      throw error;
    }
  },
]);

// =============================================================================
// MEDIA OPERATIONS
// =============================================================================

operationRegistry.set("media_ops", [
  // Simulate media metadata lookup
  async (db, _kv, _r2, tenantId, _index): Promise<OperationResult> => {
    const start = performance.now();

    try {
      const result = await db
        .prepare(
          `SELECT id, filename, r2_key, mime_type, size, created_at
           FROM media
           WHERE tenant_id = ?
           ORDER BY created_at DESC
           LIMIT 50`,
        )
        .bind(tenantId)
        .all();

      return {
        success: true,
        latencyMs: performance.now() - start,
        operationName: "list_media",
        rowsAffected: result.results.length,
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes("no such table")) {
        return {
          success: true,
          latencyMs: performance.now() - start,
          operationName: "list_media_no_table",
          rowsAffected: 0,
        };
      }
      throw error;
    }
  },
]);

// =============================================================================
// CLEANUP OPERATIONS
// =============================================================================

/**
 * Clean up all sentinel test data
 * Should be called after tests complete
 */
export async function cleanupSentinelData(
  db: D1Database,
  kv: KVNamespace,
  r2: R2Bucket,
  tenantId: string,
): Promise<{ d1Deleted: number; kvDeleted: number; r2Deleted: number }> {
  let d1Deleted = 0;
  let kvDeleted = 0;
  let r2Deleted = 0;

  // Clean D1 test data
  try {
    const result = await db
      .prepare(`DELETE FROM sentinel_test_data WHERE tenant_id = ?`)
      .bind(tenantId)
      .run();
    d1Deleted = result.meta?.changes ?? 0;
  } catch {
    // Table may not exist
  }

  // Clean D1 test posts
  try {
    const result = await db
      .prepare(`DELETE FROM posts WHERE tenant_id = ? AND id LIKE ?`)
      .bind(tenantId, `${SENTINEL_PREFIX}%`)
      .run();
    d1Deleted += result.meta?.changes ?? 0;
  } catch {
    // Table may not exist
  }

  // Clean KV test data
  try {
    let cursor: string | undefined;
    do {
      const result = await kv.list({
        prefix: `${SENTINEL_PREFIX}${tenantId}_`,
        limit: 1000,
        cursor,
      });

      for (const key of result.keys) {
        await kv.delete(key.name);
        kvDeleted++;
      }

      cursor = result.cursor;
    } while (cursor);
  } catch {
    // KV cleanup errors
  }

  // Clean R2 test data
  try {
    let cursor: string | undefined;
    do {
      const result = await r2.list({
        prefix: `${SENTINEL_PREFIX}${tenantId}/`,
        limit: 1000,
        cursor,
      });

      const keys = result.objects.map((obj) => obj.key);
      if (keys.length > 0) {
        await r2.delete(keys);
        r2Deleted += keys.length;
      }

      cursor = result.cursor;
    } while (cursor);
  } catch {
    // R2 cleanup errors
  }

  return { d1Deleted, kvDeleted, r2Deleted };
}
