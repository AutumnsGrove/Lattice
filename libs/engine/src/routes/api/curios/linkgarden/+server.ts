/**
 * Link Gardens Curio API — Gardens
 *
 * GET  — Fetch all gardens with links (public)
 * POST — Create a new garden (admin)
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { API_ERRORS, throwGroveError, logGroveError } from "$lib/errors";
import {
  generateGardenId,
  isValidGardenStyle,
  sanitizeTitle,
  sanitizeText,
  toDisplayGarden,
  MAX_DESCRIPTION_LENGTH,
  MAX_LINK_GARDENS_PER_TENANT,
  type LinkGardenRecord,
  type LinkItemRecord,
} from "$lib/curios/linkgarden";

interface GardenRow {
  id: string;
  tenant_id: string;
  title: string;
  description: string | null;
  style: string;
  created_at: string;
  updated_at: string;
}

interface LinkRow {
  id: string;
  garden_id: string;
  tenant_id: string;
  url: string;
  title: string;
  description: string | null;
  favicon_url: string | null;
  button_image_url: string | null;
  category: string | null;
  sort_order: number;
  added_at: string;
}

function rowToGarden(row: GardenRow): LinkGardenRecord {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    title: row.title,
    description: row.description,
    style: row.style as LinkGardenRecord["style"],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToLink(row: LinkRow): LinkItemRecord {
  return {
    id: row.id,
    gardenId: row.garden_id,
    tenantId: row.tenant_id,
    url: row.url,
    title: row.title,
    description: row.description,
    faviconUrl: row.favicon_url,
    buttonImageUrl: row.button_image_url,
    category: row.category,
    sortOrder: row.sort_order,
    addedAt: row.added_at,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// GET — Fetch all gardens with links (public)
// ─────────────────────────────────────────────────────────────────────────────

export const GET: RequestHandler = async ({ platform, locals }) => {
  const db = platform?.env?.DB;
  const tenantId = locals.tenantId;

  if (!db) {
    throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
  }

  if (!tenantId) {
    throwGroveError(400, API_ERRORS.TENANT_CONTEXT_REQUIRED, "API");
  }

  try {
    const [gardensResult, linksResult] = await Promise.all([
      db
        .prepare(
          `SELECT id, tenant_id, title, description, style, created_at, updated_at
           FROM link_gardens
           WHERE tenant_id = ?
           ORDER BY created_at ASC LIMIT 500`,
        )
        .bind(tenantId)
        .all<GardenRow>(),
      db
        .prepare(
          `SELECT id, garden_id, tenant_id, url, title, description, favicon_url, button_image_url, category, sort_order, added_at
           FROM link_garden_items
           WHERE tenant_id = ?
           ORDER BY sort_order ASC LIMIT 500`,
        )
        .bind(tenantId)
        .all<LinkRow>(),
    ]);

    const gardens = gardensResult.results.map(rowToGarden);
    const links = linksResult.results.map(rowToLink);

    // Group links by garden
    const linksByGarden = new Map<string, LinkItemRecord[]>();
    for (const link of links) {
      const existing = linksByGarden.get(link.gardenId) ?? [];
      existing.push(link);
      linksByGarden.set(link.gardenId, existing);
    }

    const displayGardens = gardens.map((garden) =>
      toDisplayGarden(garden, linksByGarden.get(garden.id) ?? []),
    );

    return json(
      { gardens: displayGardens },
      {
        headers: {
          "Cache-Control": "public, max-age=60, stale-while-revalidate=120",
        },
      },
    );
  } catch (err) {
    logGroveError("API", API_ERRORS.OPERATION_FAILED, {
      detail: "Link gardens fetch failed",
      cause: err,
    });
    throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API");
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST — Create a new garden (admin)
// ─────────────────────────────────────────────────────────────────────────────

export const POST: RequestHandler = async ({ request, platform, locals }) => {
  const db = platform?.env?.DB;
  const tenantId = locals.tenantId;

  if (!db) {
    throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
  }

  if (!tenantId) {
    throwGroveError(400, API_ERRORS.TENANT_CONTEXT_REQUIRED, "API");
  }

  if (!locals.user) {
    throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    throwGroveError(400, API_ERRORS.INVALID_REQUEST_BODY, "API");
  }

  const title = sanitizeTitle(body.title as string | null);
  const description = sanitizeText(
    body.description as string | null,
    MAX_DESCRIPTION_LENGTH,
  );
  const style = isValidGardenStyle(String(body.style ?? "list"))
    ? String(body.style)
    : "list";

  const id = generateGardenId();

  // Enforce per-tenant garden limit
  const countResult = await db
    .prepare(`SELECT COUNT(*) as count FROM link_gardens WHERE tenant_id = ?`)
    .bind(tenantId)
    .first<{ count: number }>();
  if ((countResult?.count ?? 0) >= MAX_LINK_GARDENS_PER_TENANT) {
    throwGroveError(400, API_ERRORS.RATE_LIMITED, "API");
  }

  try {
    await db
      .prepare(
        `INSERT INTO link_gardens (id, tenant_id, title, description, style)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .bind(id, tenantId, title, description, style)
      .run();
  } catch (err) {
    logGroveError("API", API_ERRORS.OPERATION_FAILED, {
      detail: "Link garden create failed",
      cause: err,
    });
    throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API");
  }

  return json(
    { success: true, garden: { id, title, description, style } },
    { status: 201 },
  );
};
