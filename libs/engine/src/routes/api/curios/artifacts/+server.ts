/**
 * Weird Artifacts Curio API — List & Create
 *
 * GET  — Get all artifacts (public)
 * POST — Add an artifact (admin)
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { API_ERRORS, throwGroveError, logGroveError } from "$lib/errors";
import {
  generateArtifactId,
  isValidArtifactType,
  isValidPlacement,
  sanitizeConfig,
  MAX_CONFIG_SIZE,
  MAX_ARTIFACTS_PER_TENANT,
} from "$lib/curios/artifacts";

interface ArtifactRow {
  id: string;
  tenant_id: string;
  artifact_type: string;
  placement: string;
  config: string;
  sort_order: number;
  created_at: string;
}

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
      `SELECT id, artifact_type, placement, config, sort_order
       FROM artifacts WHERE tenant_id = ?
       ORDER BY sort_order ASC, created_at ASC LIMIT 500`,
    )
    .bind(tenantId)
    .all<ArtifactRow>();

  const artifacts = result.results.map((row) => ({
    id: row.id,
    artifactType: row.artifact_type,
    placement: row.placement,
    config: sanitizeConfig(row.config),
  }));

  return json(
    { artifacts },
    {
      headers: {
        "Cache-Control": "public, max-age=60, stale-while-revalidate=120",
      },
    },
  );
};

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

  const artifactType = body.artifactType as string;
  if (!artifactType || !isValidArtifactType(artifactType)) {
    throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API");
  }

  const placement = isValidPlacement(body.placement as string)
    ? (body.placement as string)
    : "right-vine";

  const configStr = body.config ? JSON.stringify(body.config) : "{}";
  if (configStr.length > MAX_CONFIG_SIZE) {
    throwGroveError(400, API_ERRORS.CONTENT_TOO_LARGE, "API");
  }

  const id = generateArtifactId();

  // Enforce per-tenant artifact limit
  const countResult = await db
    .prepare(`SELECT COUNT(*) as count FROM artifacts WHERE tenant_id = ?`)
    .bind(tenantId)
    .first<{ count: number }>();
  if ((countResult?.count ?? 0) >= MAX_ARTIFACTS_PER_TENANT) {
    throwGroveError(400, API_ERRORS.RATE_LIMITED, "API");
  }

  try {
    const maxSort = await db
      .prepare(
        `SELECT COALESCE(MAX(sort_order), -1) as max_sort FROM artifacts WHERE tenant_id = ?`,
      )
      .bind(tenantId)
      .first<{ max_sort: number }>();

    const sortOrder = (maxSort?.max_sort ?? -1) + 1;

    await db
      .prepare(
        `INSERT INTO artifacts (id, tenant_id, artifact_type, placement, config, sort_order)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .bind(id, tenantId, artifactType, placement, configStr, sortOrder)
      .run();

    return json({ success: true, id }, { status: 201 });
  } catch (error) {
    logGroveError("API", API_ERRORS.OPERATION_FAILED, {
      detail: "Artifact create failed",
      cause: error,
    });
    throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API");
  }
};
