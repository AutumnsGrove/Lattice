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
// Production MUST set DEMO_MODE_SECRET env var; demo mode is off without it

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

// Check if request is in demo mode (off by default unless DEMO_MODE_SECRET is set)
function isDemoRequest(url: URL, envSecret?: string): boolean {
  if (!envSecret) return false;
  const demoKey = url.searchParams.get("demo");
  return demoKey === envSecret;
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

  // SECURITY: Example tenant bypass removed for launch (tracked in #1120)
  // const isExampleTenant = locals.tenantId === "example-tenant-001";

  // Demo mode bypasses authentication (requires DEMO_MODE_SECRET env var)
  if (!locals.user && !isDemoMode) {
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

  // PERFORMANCE: Run independent queries in parallel to reduce navigation latency.
  // Previously sequential awaits stacked D1 latency (100-300ms each = 1-3s total).
  // Now: tenant, greenhouse+grafts, beta, and messages all run concurrently.
  // Only getPendingCount depends on grafts result, so it runs after.

  const db = platform?.env?.DB;
  const kv = platform?.env?.CACHE_KV;
  const tenantId = locals.tenantId;

  // Phase 1: Run all independent queries in parallel
  const [tenantResult, graftsResult, betaResult, messagesResult] =
    await Promise.all([
      // Tenant data + ownership verification
      tenantId && db
        ? db
            .prepare(
              `SELECT id, subdomain, display_name, email FROM tenants WHERE id = ?`,
            )
            .bind(tenantId)
            .first<TenantRow>()
            .catch((err) => {
              console.error("[Admin Layout] Failed to load tenant:", err);
              return null;
            })
        : Promise.resolve(null),

      // Grafts: greenhouse check + flag evaluation (has internal dependency)
      tenantId && db && kv
        ? (async () => {
            try {
              const flagsEnv = { DB: db, FLAGS_KV: kv };
              const inGreenhouse = await isInGreenhouse(tenantId, flagsEnv);
              const grafts = await getEnabledGrafts(
                { tenantId, inGreenhouse },
                flagsEnv,
              );
              return { grafts, inGreenhouse };
            } catch (error) {
              console.error("[Admin Layout] Failed to load grafts:", error);
              return { grafts: {} as GraftsRecord, inGreenhouse: false };
            }
          })()
        : Promise.resolve({ grafts: {} as GraftsRecord, inGreenhouse: false }),

      // Beta invite check
      tenantId && db
        ? db
            .prepare(
              `SELECT id FROM comped_invites WHERE used_by_tenant_id = ? AND invite_type = 'beta'`,
            )
            .bind(tenantId)
            .first()
            .catch((err) => {
              const errMsg = err instanceof Error ? err.message : String(err);
              console.warn(
                "[Admin Layout] Failed to check beta status:",
                errMsg,
              );
              return null;
            })
        : Promise.resolve(null),

      // Channel messages
      db
        ? loadChannelMessages(db, "arbor").catch(() => [])
        : Promise.resolve([]),
    ]);

  // Process tenant result with ownership verification
  let tenant: TenantInfo | null = null;
  if (tenantResult) {
    const tenantEmail = tenantResult.email;
    const userEmail = locals.user?.email;
    const match = emailsMatch(tenantEmail, userEmail);

    if (!match && !isDemoMode) {
      console.warn("[Admin Auth] Ownership mismatch", {
        tenantId,
        tenantEmail: normalizeEmail(tenantEmail),
        userEmail: normalizeEmail(userEmail),
      });
      throw redirect(302, "/");
    }

    tenant = {
      id: tenantResult.id,
      subdomain: tenantResult.subdomain,
      displayName: tenantResult.display_name,
    };
  }

  // Use demo tenant if in demo mode (no database required)
  if (isDemoMode && !tenant) {
    tenant = demoTenant;
  }

  const { grafts, inGreenhouse } = graftsResult;
  const isBeta = !!betaResult;
  const messages = messagesResult;

  // Phase 2: Pending comment count depends on grafts result
  let pendingCommentCount = 0;
  if (grafts.reeds_comments && db && tenantId) {
    try {
      const tenantDb = getTenantDb(db, { tenantId });
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
    inGreenhouse,
    isBeta,
    isDemoMode,
    csrfToken: locals.csrfToken,
    messages,
    pendingCommentCount,
  };
};
