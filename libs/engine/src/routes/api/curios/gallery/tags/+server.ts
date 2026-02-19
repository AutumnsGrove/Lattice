/**
 * Gallery Tags API
 *
 * Manage tags for the gallery curio.
 */

import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import {
  generateGalleryId,
  generateSlug,
  DEFAULT_TAG_COLOR,
  MAX_GALLERY_TAGS_PER_TENANT,
} from "$lib/curios/gallery";
import { API_ERRORS, throwGroveError, logGroveError } from "$lib/errors";

interface TagRow {
  id: string;
  name: string;
  slug: string;
  color: string;
  description: string | null;
  sort_order: number;
}

// GET - List all tags
export const GET: RequestHandler = async ({ platform, locals }) => {
  const db = platform?.env?.DB;
  const tenantId = locals.tenantId;

  if (!db) {
    throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
  }

  if (!tenantId) {
    throwGroveError(400, API_ERRORS.TENANT_CONTEXT_REQUIRED, "API");
  }

  const result = await db
    .prepare(
      `SELECT id, name, slug, color, description, sort_order
       FROM gallery_tags
       WHERE tenant_id = ?
       ORDER BY sort_order, name LIMIT 500`,
    )
    .bind(tenantId)
    .all<TagRow>();

  return json(
    {
      success: true,
      tags: result.results,
    },
    {
      headers: {
        "Cache-Control": "public, max-age=60, stale-while-revalidate=120",
      },
    },
  );
};

// POST - Create a new tag
export const POST: RequestHandler = async ({ request, platform, locals }) => {
  const db = platform?.env?.DB;
  const tenantId = locals.tenantId;

  // Check authentication
  if (!locals.user) {
    throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");
  }

  if (!db) {
    throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
  }

  if (!tenantId) {
    throwGroveError(400, API_ERRORS.TENANT_CONTEXT_REQUIRED, "API");
  }

  const body = (await request.json()) as {
    name: string;
    color?: string;
    description?: string;
  };
  const { name, color, description } = body;

  if (!name || typeof name !== "string") {
    throwGroveError(400, API_ERRORS.MISSING_REQUIRED_FIELDS, "API");
  }

  // Enforce per-tenant tag limit
  const countResult = await db
    .prepare(`SELECT COUNT(*) as count FROM gallery_tags WHERE tenant_id = ?`)
    .bind(tenantId)
    .first<{ count: number }>();
  if ((countResult?.count ?? 0) >= MAX_GALLERY_TAGS_PER_TENANT) {
    throwGroveError(400, API_ERRORS.RATE_LIMITED, "API");
  }

  const slug = generateSlug(name);
  const tagId = generateGalleryId();

  try {
    await db
      .prepare(
        `INSERT INTO gallery_tags (id, tenant_id, name, slug, color, description)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        tagId,
        tenantId,
        name.trim(),
        slug,
        color || DEFAULT_TAG_COLOR,
        description?.trim() || null,
      )
      .run();

    return json({
      success: true,
      tag: {
        id: tagId,
        name: name.trim(),
        slug,
        color: color || DEFAULT_TAG_COLOR,
        description: description?.trim() || null,
      },
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message?.includes("UNIQUE constraint")) {
      throwGroveError(409, API_ERRORS.SLUG_CONFLICT, "API");
    }
    logGroveError("API", API_ERRORS.OPERATION_FAILED, { cause: err });
    throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API", { cause: err });
  }
};

// DELETE - Delete a tag
export const DELETE: RequestHandler = async ({ url, platform, locals }) => {
  const db = platform?.env?.DB;
  const tenantId = locals.tenantId;

  // Check authentication
  if (!locals.user) {
    throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");
  }

  if (!db) {
    throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
  }

  if (!tenantId) {
    throwGroveError(400, API_ERRORS.TENANT_CONTEXT_REQUIRED, "API");
  }

  const tagId = url.searchParams.get("id");

  if (!tagId) {
    throwGroveError(400, API_ERRORS.MISSING_REQUIRED_FIELDS, "API");
  }

  try {
    // Verify tag belongs to this tenant
    const tag = await db
      .prepare(`SELECT id FROM gallery_tags WHERE id = ? AND tenant_id = ?`)
      .bind(tagId, tenantId)
      .first();

    if (!tag) {
      throwGroveError(404, API_ERRORS.RESOURCE_NOT_FOUND, "API");
    }

    // Delete the tag (cascades to gallery_image_tags)
    await db
      .prepare(`DELETE FROM gallery_tags WHERE id = ? AND tenant_id = ?`)
      .bind(tagId, tenantId)
      .run();

    return json({ success: true });
  } catch (err) {
    if (err instanceof Error && "status" in err) {
      throw err;
    }
    logGroveError("API", API_ERRORS.OPERATION_FAILED, { cause: err });
    throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API", { cause: err });
  }
};

// PATCH - Update a tag
export const PATCH: RequestHandler = async ({ request, platform, locals }) => {
  const db = platform?.env?.DB;
  const tenantId = locals.tenantId;

  // Check authentication
  if (!locals.user) {
    throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");
  }

  if (!db) {
    throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
  }

  if (!tenantId) {
    throwGroveError(400, API_ERRORS.TENANT_CONTEXT_REQUIRED, "API");
  }

  const body = (await request.json()) as {
    id: string;
    name?: string;
    color?: string;
    description?: string;
    sortOrder?: number;
  };
  const { id, name, color, description, sortOrder } = body;

  if (!id) {
    throwGroveError(400, API_ERRORS.MISSING_REQUIRED_FIELDS, "API");
  }

  // Verify tag belongs to this tenant
  const tag = await db
    .prepare(`SELECT id FROM gallery_tags WHERE id = ? AND tenant_id = ?`)
    .bind(id, tenantId)
    .first();

  if (!tag) {
    throwGroveError(404, API_ERRORS.RESOURCE_NOT_FOUND, "API");
  }

  // Build update query dynamically
  const updates: string[] = [];
  const params: (string | number)[] = [];

  if (name !== undefined) {
    updates.push("name = ?", "slug = ?");
    params.push(name.trim(), generateSlug(name));
  }

  if (color !== undefined) {
    updates.push("color = ?");
    params.push(color);
  }

  if (description !== undefined) {
    updates.push("description = ?");
    params.push(description?.trim() || "");
  }

  if (sortOrder !== undefined) {
    updates.push("sort_order = ?");
    params.push(sortOrder);
  }

  if (updates.length === 0) {
    throwGroveError(400, API_ERRORS.MISSING_REQUIRED_FIELDS, "API");
  }

  params.push(id, tenantId);

  try {
    await db
      .prepare(
        `UPDATE gallery_tags SET ${updates.join(", ")} WHERE id = ? AND tenant_id = ?`,
      )
      .bind(...params)
      .run();

    return json({ success: true });
  } catch (err: unknown) {
    if (err instanceof Error && err.message?.includes("UNIQUE constraint")) {
      throwGroveError(409, API_ERRORS.SLUG_CONFLICT, "API");
    }
    logGroveError("API", API_ERRORS.OPERATION_FAILED, { cause: err });
    throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API", { cause: err });
  }
};
