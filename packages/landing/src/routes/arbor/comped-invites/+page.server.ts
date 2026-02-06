/**
 * Comped Invites Admin Page Server (Landing)
 *
 * Allows the Wayfinder to manage comped invites - pre-approving
 * users by email to skip payment and receive a free premium tier.
 * All changes are logged to the audit table for compliance.
 */

import { error, fail } from "@sveltejs/kit";
import type { PageServerLoad, Actions } from "./$types";
import { sendInviteEmail } from "$lib/server/invite-email";

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

// The Wayfinder (platform owner) has access to all admin features
// Must match +layout.server.ts - duplicated here for action access
const WAYFINDER_EMAILS = ["autumn@grove.place", "autumnbrown23@pm.me"];

export const load: PageServerLoad = async ({ parent, platform, url }) => {
  const { isWayfinder, user } = await parent();

  // Only Wayfinder can access this page
  if (!isWayfinder) {
    throw error(403, "Access denied. This page is for the Wayfinder only.");
  }

  if (!platform?.env?.DB) {
    throw error(500, "Database not available");
  }

  const { DB } = platform.env;

  // Pagination
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
  const pageSize = 50;
  const offset = (page - 1) * pageSize;

  // Filter
  const statusFilter = url.searchParams.get("status") || "";
  const typeFilter = url.searchParams.get("type") || "";
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

    // Build count query
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
        DB.prepare(query)
          .bind(...params)
          .all<CompedInvite>(),
        DB.prepare(countQuery)
          .bind(...countParams)
          .first<{ count: number }>(),
        DB.prepare(
          `SELECT * FROM comped_invites_audit ORDER BY created_at DESC LIMIT 20`,
        ).all<AuditLogEntry>(),
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
    console.error("[Comped Invites] Error loading data:", err);
    throw error(500, "Failed to load comped invites");
  }
};

export const actions: Actions = {
  create: async ({ request, locals, platform }) => {
    // Actions can't use parent() - must check locals directly
    const user = locals.user;
    if (!user) {
      return fail(403, { error: "Not authenticated" });
    }
    const isWayfinder = WAYFINDER_EMAILS.includes(user.email.toLowerCase());
    if (!isWayfinder) {
      return fail(403, { error: "Access denied" });
    }

    if (!platform?.env?.DB) {
      return fail(500, { error: "Database not available" });
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

    if (!email || !email.includes("@")) {
      return fail(400, { error: "Please enter a valid email address" });
    }

    if (!tier || !VALID_TIERS.includes(tier)) {
      return fail(400, { error: "Please select a valid tier" });
    }

    if (!VALID_INVITE_TYPES.includes(inviteType)) {
      return fail(400, { error: "Please select a valid invite type" });
    }

    let step = "init";
    try {
      step = "check-existing";
      const existing = await DB.prepare(
        "SELECT id, used_at FROM comped_invites WHERE email = ?",
      )
        .bind(email)
        .first<{ id: string; used_at: number | null }>();

      if (existing) {
        if (existing.used_at) {
          return fail(400, {
            error: `${email} has already used their comped invite`,
          });
        }
        return fail(400, {
          error: `${email} already has a pending comped invite`,
        });
      }

      step = "check-tenant";
      const existingTenant = await DB.prepare(
        `SELECT subdomain FROM tenants WHERE email = ?`,
      )
        .bind(email)
        .first<{ subdomain: string }>();

      if (existingTenant) {
        return fail(400, {
          error: `${email} is already a Grove user (${existingTenant.subdomain}.grove.place)`,
        });
      }

      step = "insert-invite";
      const inviteId = crypto.randomUUID();
      const inviteToken = crypto.randomUUID();
      await DB.prepare(
        `INSERT INTO comped_invites (id, email, tier, invite_type, custom_message, invited_by, invite_token, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, unixepoch())`,
      )
        .bind(
          inviteId,
          email,
          tier,
          inviteType,
          customMessage,
          user.email,
          inviteToken,
        )
        .run();

      step = "insert-audit";
      const auditId = crypto.randomUUID();
      await DB.prepare(
        `INSERT INTO comped_invites_audit (id, action, invite_id, email, tier, invite_type, actor_email, notes, created_at)
         VALUES (?, 'create', ?, ?, ?, ?, ?, ?, unixepoch())`,
      )
        .bind(auditId, inviteId, email, tier, inviteType, user.email, notes)
        .run();

      // Send the invite email via Zephyr
      step = "send-email";
      const zephyrApiKey =
        platform?.env?.ZEPHYR_API_KEY || platform?.env?.RESEND_API_KEY;
      if (zephyrApiKey) {
        const emailResult = await sendInviteEmail({
          email,
          tier,
          inviteType,
          customMessage,
          inviteToken,
          invitedBy: user.email,
          zephyrApiKey,
          zephyrUrl: platform?.env?.ZEPHYR_URL,
        });

        if (emailResult.success) {
          await DB.prepare(
            `UPDATE comped_invites SET email_sent_at = unixepoch() WHERE id = ?`,
          )
            .bind(inviteId)
            .run();
        } else {
          console.error(
            `[Comped Invites] Email send failed for ${email}:`,
            emailResult.error,
          );
          // Invite was created but email failed — don't fail the whole action
        }
      } else {
        console.warn(
          "[Comped Invites] No ZEPHYR_API_KEY configured — invite created but email not sent",
        );
      }

      const typeLabel = inviteType === "beta" ? "beta" : "comped";
      const emailSent = zephyrApiKey ? " and email sent" : " (email not configured)";
      return {
        success: true,
        message: `Created ${typeLabel} invite for ${email} (${tier} tier)${emailSent}`,
      };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unknown database error";
      console.error(`[Comped Invites] Error at step "${step}":`, message, err);
      // Surface D1 error details to admin for debugging
      return fail(500, {
        error: `Failed to create comped invite (${step}): ${message}`,
      });
    }
  },

  revoke: async ({ request, locals, platform }) => {
    // Actions can't use parent() - must check locals directly
    const user = locals.user;
    if (!user) {
      return fail(403, { error: "Not authenticated" });
    }
    const isWayfinder = WAYFINDER_EMAILS.includes(user.email.toLowerCase());
    if (!isWayfinder) {
      return fail(403, { error: "Access denied" });
    }

    if (!platform?.env?.DB) {
      return fail(500, { error: "Database not available" });
    }

    const { DB } = platform.env;
    const formData = await request.formData();
    const inviteId = formData.get("invite_id")?.toString();
    const notes = formData.get("notes")?.toString().trim() || null;

    if (!inviteId) {
      return fail(400, { error: "Invite ID is required" });
    }

    try {
      const invite = await DB.prepare(
        "SELECT id, email, tier, invite_type, used_at FROM comped_invites WHERE id = ?",
      )
        .bind(inviteId)
        .first<CompedInvite>();

      if (!invite) {
        return fail(404, { error: "Invite not found" });
      }

      if (invite.used_at) {
        return fail(400, {
          error: "Cannot revoke an invite that has already been used",
        });
      }

      await DB.prepare("DELETE FROM comped_invites WHERE id = ?")
        .bind(inviteId)
        .run();

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
          user.email,
          notes,
        )
        .run();

      return {
        success: true,
        message: `Revoked comped invite for ${invite.email}`,
      };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unknown database error";
      console.error("[Comped Invites] Error revoking invite:", message, err);
      return fail(500, {
        error: `Failed to revoke comped invite: ${message}`,
      });
    }
  },
};
