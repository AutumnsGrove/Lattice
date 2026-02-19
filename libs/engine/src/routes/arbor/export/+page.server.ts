import { ARBOR_ERRORS, throwGroveError } from "$lib/errors";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals, platform, parent }) => {
  const parentData = await parent();

  if (!locals.tenantId) {
    throwGroveError(400, ARBOR_ERRORS.TENANT_CONTEXT_REQUIRED, "Arbor");
  }
  if (!platform?.env?.DB) {
    throwGroveError(500, ARBOR_ERRORS.DB_NOT_AVAILABLE, "Arbor");
  }

  // Fetch past exports, content counts, and storage size in parallel
  const [exportsResult, postCount, pageCount, mediaCount, storageResult] =
    await Promise.all([
      platform.env.DB.prepare(
        `SELECT id, status, progress, include_images, delivery_method, file_size_bytes, item_counts, error_message, created_at, completed_at, expires_at
       FROM storage_exports WHERE tenant_id = ?
       ORDER BY created_at DESC LIMIT 10`,
      )
        .bind(locals.tenantId)
        .all<{
          id: string;
          status: string;
          progress: number;
          include_images: number;
          delivery_method: string;
          file_size_bytes: number | null;
          item_counts: string | null;
          error_message: string | null;
          created_at: number;
          completed_at: number | null;
          expires_at: number | null;
        }>(),
      platform.env.DB.prepare(
        "SELECT COUNT(*) as count FROM posts WHERE tenant_id = ?",
      )
        .bind(locals.tenantId)
        .first<{ count: number }>(),
      platform.env.DB.prepare(
        "SELECT COUNT(*) as count FROM pages WHERE tenant_id = ?",
      )
        .bind(locals.tenantId)
        .first<{ count: number }>(),
      platform.env.DB.prepare(
        "SELECT COUNT(*) as count FROM media WHERE tenant_id = ?",
      )
        .bind(locals.tenantId)
        .first<{ count: number }>(),
      platform.env.DB.prepare(
        "SELECT COALESCE(SUM(COALESCE(stored_size_bytes, 0)), 0) as total_bytes FROM image_hashes WHERE tenant_id = ?",
      )
        .bind(locals.tenantId)
        .first<{ total_bytes: number }>()
        .catch(() => null),
    ]);

  const now = Math.floor(Date.now() / 1000);
  const pastExports = (exportsResult.results || []).map((exp) => {
    // Safely parse item_counts JSON
    let itemCounts = null;
    if (exp.item_counts) {
      try {
        itemCounts = JSON.parse(exp.item_counts);
      } catch {
        // If JSON parsing fails, leave as null rather than exposing error
        itemCounts = null;
      }
    }

    return {
      id: exp.id,
      status:
        exp.status === "complete" && exp.expires_at && exp.expires_at < now
          ? "expired"
          : exp.status,
      progress: exp.progress,
      includeImages: exp.include_images === 1,
      deliveryMethod: exp.delivery_method,
      fileSize: exp.file_size_bytes,
      itemCounts,
      error: exp.error_message,
      createdAt: new Date(exp.created_at * 1000).toISOString(),
      completedAt: exp.completed_at
        ? new Date(exp.completed_at * 1000).toISOString()
        : null,
      expiresAt: exp.expires_at
        ? new Date(exp.expires_at * 1000).toISOString()
        : null,
    };
  });

  // Find any active export (for resuming progress display)
  const activeExport = pastExports.find((e) =>
    ["pending", "querying", "assembling", "uploading", "notifying"].includes(
      e.status,
    ),
  );

  return {
    ...parentData,
    pastExports,
    activeExport: activeExport || null,
    counts: {
      posts: postCount?.count ?? 0,
      pages: pageCount?.count ?? 0,
      media: mediaCount?.count ?? 0,
    },
    estimatedImageSize: storageResult?.total_bytes ?? 0,
  };
};
