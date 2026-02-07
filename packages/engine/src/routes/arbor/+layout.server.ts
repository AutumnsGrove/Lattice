import { redirect } from "@sveltejs/kit";
import {
  getEnabledGrafts,
  isInGreenhouse,
  type GraftsRecord,
} from "$lib/feature-flags";
import { emailsMatch, normalizeEmail } from "$lib/utils/user.js";
import type { LayoutServerLoad } from "./$types";

// Disable prerendering for all admin routes
// Admin pages require authentication and should be server-rendered at request time
export const prerender = false;

interface TenantInfo {
  id: string;
  subdomain: string;
  displayName: string;
}

interface TenantRow {
  id: string;
  subdomain: string;
  display_name: string;
  email: string;
}

export const load: LayoutServerLoad = async ({
  locals,
  url,
  platform,
  parent,
}) => {
  // Get parent layout data (includes navPages, siteSettings, context)
  const parentData = await parent();
  // SECURITY: Example tenant admin is publicly accessible for demos (S2-F2 documented risk)
  // This allows visitors to explore the admin panel without signing in.
  // Risk accepted: demo data only, queries still scoped to example tenant.
  // TODO: Consider making example tenant read-only or gating behind feature flag
  const isExampleTenant = locals.tenantId === "example-tenant-001";

  if (!locals.user && !isExampleTenant) {
    throw redirect(
      302,
      `/auth/login?redirect=${encodeURIComponent(url.pathname)}`,
    );
  }

  // Load tenant data for the admin panel
  // PERFORMANCE: Combined ownership verification and tenant data into single query
  // Previously: two separate queries to `tenants` table (one for email, one for data)
  // Now: single query fetches all fields, ownership verified in-memory
  let tenant: TenantInfo | null = null;
  if (locals.tenantId && platform?.env?.DB) {
    try {
      const result = await platform.env.DB.prepare(
        `SELECT id, subdomain, display_name, email FROM tenants WHERE id = ?`,
      )
        .bind(locals.tenantId)
        .first<TenantRow>();

      if (result) {
        // Skip ownership verification for example tenant (public demo)
        if (!isExampleTenant) {
          // Verify ownership in-memory instead of separate query
          const tenantEmail = result.email;
          const userEmail = locals.user?.email;
          const match = emailsMatch(tenantEmail, userEmail);

          if (!match) {
            console.warn("[Admin Auth] Ownership mismatch", {
              tenantId: locals.tenantId,
              tenantEmail: normalizeEmail(tenantEmail),
              userEmail: normalizeEmail(userEmail),
            });
            throw redirect(302, "/");
          }
        }

        tenant = {
          id: result.id,
          subdomain: result.subdomain,
          displayName: result.display_name,
        };
      }
    } catch (error) {
      if (error instanceof Response) {
        throw error;
      }
      console.error("[Admin Layout] Failed to load tenant:", error);
    }
  }

  // Load ALL grafts for this tenant (engine-first approach)
  // Grafts cascade to all child pages — no per-page flag checking needed
  let grafts: GraftsRecord = {};
  if (platform?.env?.DB && platform?.env?.CACHE_KV && locals.tenantId) {
    try {
      // Check if tenant is in greenhouse (for greenhouse-only flags)
      const inGreenhouse = await isInGreenhouse(locals.tenantId, {
        DB: platform.env.DB,
        FLAGS_KV: platform.env.CACHE_KV,
      });

      grafts = await getEnabledGrafts(
        { tenantId: locals.tenantId, inGreenhouse },
        { DB: platform.env.DB, FLAGS_KV: platform.env.CACHE_KV },
      );
    } catch (error) {
      console.error("[Admin Layout] Failed to load grafts:", error);
      // Continue with empty grafts - features will be disabled
    }
  }

  // Check if this tenant was created through a beta invite
  let isBeta = false;
  if (tenant && platform?.env?.DB) {
    try {
      const betaInvite = await platform.env.DB.prepare(
        `SELECT id FROM comped_invites WHERE used_by_tenant_id = ? AND invite_type = 'beta'`,
      )
        .bind(tenant.id)
        .first();
      isBeta = !!betaInvite;
    } catch (error) {
      // Non-critical — continue without beta status.
      // Common cause: comped_invites table missing if migration hasn't run yet.
      const errMsg = error instanceof Error ? error.message : String(error);
      console.warn("[Admin Layout] Failed to check beta status:", errMsg);
    }
  }

  // Fetch arbor-channel messages for wanderer notifications
  type MessageType = "info" | "warning" | "celebration" | "update";
  let messages: Array<{
    id: string;
    title: string;
    body: string;
    message_type: MessageType;
    pinned: boolean;
    created_at: string;
  }> = [];

  if (platform?.env?.DB) {
    try {
      const result = await platform.env.DB.prepare(
        `SELECT id, title, body, message_type, pinned, created_at
         FROM grove_messages
         WHERE channel = 'arbor' AND published = 1
           AND (expires_at IS NULL OR expires_at > datetime('now'))
         ORDER BY pinned DESC, created_at DESC
         LIMIT 5`,
      ).all<{
        id: string;
        title: string;
        body: string;
        message_type: string;
        pinned: number;
        created_at: string;
      }>();
      messages = (result.results || []).map((m) => ({
        id: m.id,
        title: m.title,
        body: m.body,
        message_type: m.message_type as MessageType,
        pinned: !!m.pinned,
        created_at: m.created_at,
      }));
    } catch {
      // grove_messages table may not exist yet — that's fine
    }
  }

  return {
    ...parentData,
    user: locals.user,
    tenant,
    grafts,
    isBeta,
    csrfToken: locals.csrfToken,
    messages,
  };
};
