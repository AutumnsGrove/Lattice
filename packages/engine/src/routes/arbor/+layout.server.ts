import { redirect, isRedirect } from "@sveltejs/kit";
import {
  getEnabledGrafts,
  isInGreenhouse,
  type GraftsRecord,
} from "$lib/feature-flags";
import { emailsMatch, normalizeEmail } from "$lib/utils/user.js";
import { loadChannelMessages } from "$lib/server/services/messages.js";
import { getTenantDb } from "$lib/server/services/database.js";
import { getPendingCount } from "$lib/server/services/reeds.js";
import type { LayoutServerLoad } from "./$types";

// Demo mode secret key for local development and screenshots
// Falls back to a dev-only default; production MUST set DEMO_MODE_SECRET env var
const DEMO_MODE_SECRET_FALLBACK = "glimpse-demo-2026-dev";

interface DemoUser {
  id: string;
  email: string;
  name: string;
  picture: string;
  isAdmin: boolean;
}

interface DemoTenant {
  id: string;
  subdomain: string;
  displayName: string;
}

// Check if request is in demo mode
function isDemoRequest(url: URL, envSecret?: string): boolean {
  const demoKey = url.searchParams.get("demo");
  const secret = envSecret || DEMO_MODE_SECRET_FALLBACK;
  return demoKey === secret;
}

// Get demo user for screenshots and exploration
function getDemoUser(): DemoUser {
  return {
    id: "demo-user-001",
    email: "demo@grove.place",
    name: "Demo Explorer",
    picture: "https://cdn.grove.place/assets/default-avatar.png",
    isAdmin: true,
  };
}

// Get demo tenant for screenshots
function getDemoTenant(): DemoTenant {
  return {
    id: "demo-tenant-001",
    subdomain: "demo",
    displayName: "Demo Grove",
  };
}

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

  // Check for demo mode (for screenshots and development)
  const isDemoMode = isDemoRequest(url, platform?.env?.DEMO_MODE_SECRET);

  // SECURITY: Example tenant admin is publicly accessible for demos (S2-F2 documented risk)
  // This allows visitors to explore the admin panel without signing in.
  // Risk accepted: demo data only, queries still scoped to example tenant.
  // TODO: Consider making example tenant read-only or gating behind feature flag
  const isExampleTenant = locals.tenantId === "example-tenant-001";

  // Demo mode or example tenant bypasses authentication
  if (!locals.user && !isExampleTenant && !isDemoMode) {
    throw redirect(
      302,
      `/auth/login?redirect=${encodeURIComponent(url.pathname)}`,
    );
  }

  // Set up demo user/tenant if in demo mode
  let demoUser: DemoUser | null = null;
  let demoTenant: DemoTenant | null = null;

  if (isDemoMode) {
    demoUser = getDemoUser();
    demoTenant = getDemoTenant();
    // Set demo user on locals so downstream code can access it
    locals.user = demoUser;
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
      // CRITICAL: Re-throw SvelteKit redirects (e.g. ownership mismatch at line 136).
      // In SvelteKit 2.x, redirect() throws a Redirect object, NOT a Response.
      // Using `instanceof Response` silently swallowed the redirect, allowing
      // any logged-in user to access any tenant's arbor panel.
      if (isRedirect(error)) {
        throw error;
      }
      console.error("[Admin Layout] Failed to load tenant:", error);
    }
  }

  // Use demo tenant if in demo mode (no database required)
  if (isDemoMode && !tenant) {
    tenant = demoTenant;
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
  const messages = platform?.env?.DB
    ? await loadChannelMessages(platform.env.DB, "arbor").catch(() => [])
    : [];

  // Pending comment count for nav activity indicator (only when reeds graft is on)
  let pendingCommentCount = 0;
  if (grafts.reeds_comments && platform?.env?.DB && locals.tenantId) {
    try {
      const tenantDb = getTenantDb(platform.env.DB, {
        tenantId: locals.tenantId,
      });
      pendingCommentCount = await getPendingCount(tenantDb);
    } catch {
      // Non-critical — continue without count
    }
  }

  return {
    ...parentData,
    user: locals.user,
    tenant,
    grafts,
    isBeta,
    isDemoMode,
    csrfToken: locals.csrfToken,
    messages,
    pendingCommentCount,
  };
};
