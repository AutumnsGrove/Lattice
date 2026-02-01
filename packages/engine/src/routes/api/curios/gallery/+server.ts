/**
 * Gallery Curio API
 *
 * Public endpoint for fetching gallery images with filtering and pagination.
 */

import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

interface ConfigRow {
  enabled: number;
  cdn_base_url: string | null;
}

interface ImageRow {
  id: string;
  r2_key: string;
  parsed_date: string | null;
  parsed_category: string | null;
  parsed_slug: string | null;
  custom_title: string | null;
  custom_description: string | null;
  custom_date: string | null;
  alt_text: string | null;
  file_size: number | null;
  cdn_url: string | null;
  width: number | null;
  height: number | null;
  is_featured: number;
}

interface ImageTagRow {
  image_id: string;
  tag_id: string;
  tag_name: string;
  tag_slug: string;
  tag_color: string;
}

export const GET: RequestHandler = async ({ url, platform, locals }) => {
  const db = platform?.env?.DB;
  const tenantId = locals.tenantId;

  if (!db) {
    throw error(503, "Database not configured");
  }

  if (!tenantId) {
    throw error(400, "Tenant context required");
  }

  // Check if gallery is enabled
  const config = await db
    .prepare(
      `SELECT enabled, cdn_base_url FROM gallery_curio_config WHERE tenant_id = ?`,
    )
    .bind(tenantId)
    .first<ConfigRow>();

  if (!config?.enabled) {
    throw error(404, "Gallery not enabled for this site");
  }

  const cdnBaseUrl = config.cdn_base_url || "";

  // Parse query params
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "30"), 100);
  const offset = parseInt(url.searchParams.get("offset") ?? "0");
  const category = url.searchParams.get("category");
  const year = url.searchParams.get("year");
  const tag = url.searchParams.get("tag");
  const search = url.searchParams.get("search");

  // Build query with filters
  let whereClause = "WHERE tenant_id = ?";
  const params: (string | number)[] = [tenantId];

  if (category) {
    whereClause += " AND parsed_category = ?";
    params.push(category);
  }

  if (year) {
    whereClause += " AND (custom_date LIKE ? OR parsed_date LIKE ?)";
    params.push(`${year}%`, `${year}%`);
  }

  if (search) {
    whereClause +=
      " AND (custom_title LIKE ? OR parsed_slug LIKE ? OR custom_description LIKE ?)";
    const searchPattern = `%${search}%`;
    params.push(searchPattern, searchPattern, searchPattern);
  }

  if (tag) {
    whereClause += ` AND id IN (
      SELECT git.image_id FROM gallery_image_tags git
      JOIN gallery_tags gt ON git.tag_id = gt.id
      WHERE gt.tenant_id = ? AND gt.slug = ?
    )`;
    params.push(tenantId, tag);
  }

  // Fetch images
  const imagesResult = await db
    .prepare(
      `SELECT
        id, r2_key, parsed_date, parsed_category, parsed_slug,
        custom_title, custom_description, custom_date, alt_text,
        file_size, cdn_url, width, height, is_featured
      FROM gallery_images
      ${whereClause}
      ORDER BY COALESCE(custom_date, parsed_date) DESC, id DESC
      LIMIT ? OFFSET ?`,
    )
    .bind(...params, limit, offset)
    .all<ImageRow>();

  // Get total count (isolated so images still return if count fails)
  let total = 0;
  try {
    const countResult = await db
      .prepare(`SELECT COUNT(*) as total FROM gallery_images ${whereClause}`)
      .bind(...params)
      .first<{ total: number }>();
    total = countResult?.total ?? 0;
  } catch (e) {
    // Count failed but we can still return images
    console.warn("[Gallery] Count query failed:", e);
    total = imagesResult.results.length; // Fallback to current batch size
  }

  // Fetch tags for images
  const imageIds = imagesResult.results.map((img) => img.id);
  const tagsByImageId = new Map<
    string,
    { id: string; name: string; slug: string; color: string }[]
  >();

  if (imageIds.length > 0) {
    const placeholders = imageIds.map(() => "?").join(",");
    const tagsResult = await db
      .prepare(
        `SELECT
          git.image_id,
          gt.id as tag_id,
          gt.name as tag_name,
          gt.slug as tag_slug,
          gt.color as tag_color
        FROM gallery_image_tags git
        JOIN gallery_tags gt ON git.tag_id = gt.id
        WHERE git.image_id IN (${placeholders})`,
      )
      .bind(...imageIds)
      .all<ImageTagRow>();

    for (const row of tagsResult.results) {
      if (!tagsByImageId.has(row.image_id)) {
        tagsByImageId.set(row.image_id, []);
      }
      tagsByImageId.get(row.image_id)!.push({
        id: row.tag_id,
        name: row.tag_name,
        slug: row.tag_slug,
        color: row.tag_color,
      });
    }
  }

  // Transform results
  const images = imagesResult.results.map((row) => ({
    id: row.id,
    r2_key: row.r2_key,
    url: row.cdn_url || `${cdnBaseUrl}/${row.r2_key}`,
    title:
      row.custom_title ||
      (row.parsed_slug
        ? row.parsed_slug
            .split("-")
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(" ")
        : "Untitled"),
    description: row.custom_description,
    date: row.custom_date || row.parsed_date,
    category: row.parsed_category,
    alt_text: row.alt_text,
    file_size: row.file_size,
    width: row.width,
    height: row.height,
    is_featured: Boolean(row.is_featured),
    tags: tagsByImageId.get(row.id) || [],
  }));

  return json(
    {
      images,
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + images.length < total,
      },
    },
    {
      headers: {
        "Cache-Control": "public, max-age=60, stale-while-revalidate=120",
      },
    },
  );
};
