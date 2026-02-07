/**
 * Comped Invites Admin Page Server
 *
 * Allows Grove administrators to manage comped invites - pre-approving
 * users by email to skip payment and receive a free premium tier.
 * All changes are logged to the audit table for compliance.
 */

import { error, fail } from "@sveltejs/kit";
import { validateEmail } from "$lib/utils/validation.js";
import { ARBOR_ERRORS, throwGroveError, logGroveError } from "$lib/errors";
import type { PageServerLoad, Actions } from "./$types";

interface CompedInvite {
  id: string;
  email: string;
  tier: string;
  invite_type: "comped" | "beta";
  custom_message: string | null;
  invited_by: string;
  created_at: number;
  used_at: number | null;
  used_by_tenant_id: string | null;
}

interface AuditLogEntry {
  id: string;
  action: string;
  invite_id: string;
  email: string;
  tier: string;
  invite_type: "comped" | "beta";
  actor_email: string;
  notes: string | null;
  created_at: number;
}

// Valid tiers for comped accounts
const VALID_TIERS = ["seedling", "sapling", "oak", "evergreen"] as const;
type CompedTier = (typeof VALID_TIERS)[number];

// Valid invite types
const VALID_INVITE_TYPES = ["comped", "beta"] as const;
type InviteType = (typeof VALID_INVITE_TYPES)[number];

// List of admin emails who can manage comped invites
// In production, this would come from a config or database
const ADMIN_EMAILS = ["autumn@grove.place", "admin@grove.place"];

function isAdmin(email: string | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

export const load: PageServerLoad = async ({ locals, platform, url }) => {
  if (!locals.user) {
    throwGroveError(401, ARBOR_ERRORS.UNAUTHORIZED, "Arbor");
  }

  // Check if user is a Grove admin
  if (!isAdmin(locals.user.email)) {
    throwGroveError(403, ARBOR_ERRORS.ACCESS_DENIED, "Arbor");
  }

  if (!platform?.env?.DB) {
    throwGroveError(500, ARBOR_ERRORS.DB_NOT_AVAILABLE, "Arbor");
  }

  const { DB } = platform.env;

  // Pagination
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
  const pageSize = 50;
  const offset = (page - 1) * pageSize;

  // Filter
  const statusFilter = url.searchParams.get("status") || ""; // "used", "pending", ""
  const typeFilter = url.searchParams.get("type") || ""; // "comped", "beta", ""
  const search = url.searchParams.get("search") || "";

  try {
    // Build query with optional filters
    let query = "SELECT * FROM comped_invites";
    const params: (string | number)[] = [];
    const conditions: string[] = [];

    if (search) {
      conditions.push("email LIKE ?");
      params.push(`%${search}%`);
    }

    if (statusFilter === "used") {
      conditions.push("used_at IS NOT NULL");
    } else if (statusFilter === "pending") {
      conditions.push("used_at IS NULL");
    }

    if (typeFilter === "comped" || typeFilter === "beta") {
      conditions.push("invite_type = ?");
      params.push(typeFilter);
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
    params.push(pageSize, offset);

    // Build count query (same conditions, no LIMIT/OFFSET)
    let countQuery = "SELECT COUNT(*) as count FROM comped_invites";
    const countParams: string[] = [];
    if (conditions.length > 0) {
      countQuery += " WHERE " + conditions.join(" AND ");
      if (search) countParams.push(`%${search}%`);
      if (typeFilter === "comped" || typeFilter === "beta")
        countParams.push(typeFilter);
    }

    // Run all queries in parallel
    const [invitesResult, countResult, auditResult, statsResult] =
      await Promise.all([
        // Get invites with pagination
        DB.prepare(query)
          .bind(...params)
          .all<CompedInvite>(),

        // Get total count for pagination
        DB.prepare(countQuery)
          .bind(...countParams)
          .first<{ count: number }>(),

        // Get recent audit log entries
        DB.prepare(
          `SELECT * FROM comped_invites_audit
           ORDER BY created_at DESC
           LIMIT 20`,
        ).all<AuditLogEntry>(),

        // Get statistics (including by type)
        DB.prepare(
          `SELECT
             COUNT(*) as total,
             COUNT(CASE WHEN used_at IS NOT NULL THEN 1 END) as used,
             COUNT(CASE WHEN used_at IS NULL THEN 1 END) as pending,
             COUNT(CASE WHEN invite_type = 'beta' THEN 1 END) as beta,
             COUNT(CASE WHEN invite_type = 'comped' THEN 1 END) as comped
           FROM comped_invites`,
        ).first<{
          total: number;
          used: number;
          pending: number;
          beta: number;
          comped: number;
        }>(),
      ]);

    return {
      invites: invitesResult.results || [],
      auditLog: auditResult.results || [],
      stats: {
        total: statsResult?.total || 0,
        used: statsResult?.used || 0,
        pending: statsResult?.pending || 0,
        beta: statsResult?.beta || 0,
        comped: statsResult?.comped || 0,
      },
      pagination: {
        page,
        pageSize,
        total: countResult?.count || 0,
        totalPages: Math.ceil((countResult?.count || 0) / pageSize),
      },
      filters: {
        search,
        status: statusFilter,
        type: typeFilter,
      },
      validTiers: VALID_TIERS,
      validInviteTypes: VALID_INVITE_TYPES,
    };
  } catch (err) {
    throwGroveError(500, ARBOR_ERRORS.LOAD_FAILED, "Arbor", { cause: err });
  }
};

export const actions: Actions = {
  /**
   * Create a new comped invite
   */
  create: async ({ request, locals, platform }) => {
    if (!locals.user || !isAdmin(locals.user.email)) {
      return fail(403, {
        error: ARBOR_ERRORS.ACCESS_DENIED.userMessage,
        error_code: ARBOR_ERRORS.ACCESS_DENIED.code,
      });
    }

    if (!platform?.env?.DB) {
      return fail(500, {
        error: ARBOR_ERRORS.DB_NOT_AVAILABLE.userMessage,
        error_code: ARBOR_ERRORS.DB_NOT_AVAILABLE.code,
      });
    }

    const { DB } = platform.env;
    const formData = await request.formData();
    const email = formData.get("email")?.toString().toLowerCase().trim();
    const tier = formData.get("tier")?.toString() as CompedTier;
    const inviteType =
      (formData.get("invite_type")?.toString() as InviteType) || "beta";
    const customMessage =
      formData.get("custom_message")?.toString().trim() || null;
    const notes = formData.get("notes")?.toString().trim() || null;

    // Validate email
    if (!email || !validateEmail(email)) {
      return fail(400, {
        error: ARBOR_ERRORS.INVALID_INPUT.userMessage,
        error_code: ARBOR_ERRORS.INVALID_INPUT.code,
      });
    }

    // Validate tier
    if (!tier || !VALID_TIERS.includes(tier)) {
      return fail(400, {
        error: ARBOR_ERRORS.INVALID_INPUT.userMessage,
        error_code: ARBOR_ERRORS.INVALID_INPUT.code,
      });
    }

    // Validate invite type
    if (!VALID_INVITE_TYPES.includes(inviteType)) {
      return fail(400, {
        error: ARBOR_ERRORS.INVALID_INPUT.userMessage,
        error_code: ARBOR_ERRORS.INVALID_INPUT.code,
      });
    }

    let step = "init";
    try {
      // Check if invite already exists
      step = "check-existing";
      const existing = await DB.prepare(
        "SELECT id, used_at FROM comped_invites WHERE email = ?",
      )
        .bind(email)
        .first<{ id: string; used_at: number | null }>();

      if (existing) {
        if (existing.used_at) {
          return fail(409, {
            error: ARBOR_ERRORS.CONFLICT.userMessage,
            error_code: ARBOR_ERRORS.CONFLICT.code,
          });
        }
        return fail(409, {
          error: ARBOR_ERRORS.CONFLICT.userMessage,
          error_code: ARBOR_ERRORS.CONFLICT.code,
        });
      }

      // Check if email is already a tenant owner
      step = "check-tenant";
      const existingTenant = await DB.prepare(
        `SELECT subdomain FROM tenants WHERE email = ?`,
      )
        .bind(email)
        .first<{ subdomain: string }>();

      if (existingTenant) {
        return fail(409, {
          error: ARBOR_ERRORS.CONFLICT.userMessage,
          error_code: ARBOR_ERRORS.CONFLICT.code,
        });
      }

      // Create the invite
      step = "insert-invite";
      const inviteId = crypto.randomUUID();
      await DB.prepare(
        `INSERT INTO comped_invites (id, email, tier, invite_type, custom_message, invited_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, unixepoch())`,
      )
        .bind(
          inviteId,
          email,
          tier,
          inviteType,
          customMessage,
          locals.user.email,
        )
        .run();

      // Log the action
      step = "insert-audit";
      const auditId = crypto.randomUUID();
      await DB.prepare(
        `INSERT INTO comped_invites_audit (id, action, invite_id, email, tier, invite_type, actor_email, notes, created_at)
         VALUES (?, 'create', ?, ?, ?, ?, ?, ?, unixepoch())`,
      )
        .bind(
          auditId,
          inviteId,
          email,
          tier,
          inviteType,
          locals.user.email,
          notes,
        )
        .run();

      const typeLabel = inviteType === "beta" ? "beta" : "comped";
      return {
        success: true,
        message: `Created ${typeLabel} invite for ${email} (${tier} tier)`,
      };
    } catch (err) {
      logGroveError("Arbor", ARBOR_ERRORS.OPERATION_FAILED, { cause: err });
      return fail(500, {
        error: ARBOR_ERRORS.OPERATION_FAILED.userMessage,
        error_code: ARBOR_ERRORS.OPERATION_FAILED.code,
      });
    }
  },

  /**
   * Revoke a comped invite (only if not yet used)
   */
  revoke: async ({ request, locals, platform }) => {
    if (!locals.user || !isAdmin(locals.user.email)) {
      return fail(403, {
        error: ARBOR_ERRORS.ACCESS_DENIED.userMessage,
        error_code: ARBOR_ERRORS.ACCESS_DENIED.code,
      });
    }

    if (!platform?.env?.DB) {
      return fail(500, {
        error: ARBOR_ERRORS.DB_NOT_AVAILABLE.userMessage,
        error_code: ARBOR_ERRORS.DB_NOT_AVAILABLE.code,
      });
    }

    const { DB } = platform.env;
    const formData = await request.formData();
    const inviteId = formData.get("invite_id")?.toString();
    const notes = formData.get("notes")?.toString().trim() || null;

    if (!inviteId) {
      return fail(400, {
        error: ARBOR_ERRORS.FIELD_REQUIRED.userMessage,
        error_code: ARBOR_ERRORS.FIELD_REQUIRED.code,
      });
    }

    try {
      // Check if invite exists and is not used
      const invite = await DB.prepare(
        "SELECT id, email, tier, invite_type, used_at FROM comped_invites WHERE id = ?",
      )
        .bind(inviteId)
        .first<CompedInvite>();

      if (!invite) {
        return fail(404, {
          error: ARBOR_ERRORS.RESOURCE_NOT_FOUND.userMessage,
          error_code: ARBOR_ERRORS.RESOURCE_NOT_FOUND.code,
        });
      }

      if (invite.used_at) {
        return fail(400, {
          error: ARBOR_ERRORS.CANNOT_MODIFY.userMessage,
          error_code: ARBOR_ERRORS.CANNOT_MODIFY.code,
        });
      }

      // Delete the invite
      await DB.prepare("DELETE FROM comped_invites WHERE id = ?")
        .bind(inviteId)
        .run();

      // Log the action
      const auditId = crypto.randomUUID();
      await DB.prepare(
        `INSERT INTO comped_invites_audit (id, action, invite_id, email, tier, invite_type, actor_email, notes, created_at)
         VALUES (?, 'revoke', ?, ?, ?, ?, ?, ?, unixepoch())`,
      )
        .bind(
          auditId,
          inviteId,
          invite.email,
          invite.tier,
          invite.invite_type,
          locals.user.email,
          notes,
        )
        .run();

      return {
        success: true,
        message: `Revoked comped invite for ${invite.email}`,
      };
    } catch (err) {
      logGroveError("Arbor", ARBOR_ERRORS.OPERATION_FAILED, { cause: err });
      return fail(500, {
        error: ARBOR_ERRORS.OPERATION_FAILED.userMessage,
        error_code: ARBOR_ERRORS.OPERATION_FAILED.code,
      });
    }
  },
};
