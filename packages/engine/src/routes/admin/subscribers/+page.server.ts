import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

interface Subscriber {
  id: number;
  email: string;
  created_at: string;
  unsubscribed_at: string | null;
}

interface CountResult {
  count: number;
}

export const load: PageServerLoad = async ({ locals, platform }) => {
  if (!locals.user) {
    throw error(401, "Unauthorized");
  }

  if (!platform?.env?.DB) {
    throw error(500, "Database not available");
  }

  const tenantId = locals.tenantId;
  if (!tenantId) {
    throw error(400, "Tenant context required");
  }

  const { DB } = platform.env;

  try {
    // Run both queries in parallel (100-300ms savings)
    // SECURITY: Filter by tenant_id to prevent cross-tenant data leakage
    const [activeSubscribers, unsubscribedCount] = await Promise.all([
      DB.prepare(
        `SELECT id, email, created_at, unsubscribed_at
				 FROM email_signups
				 WHERE tenant_id = ? AND unsubscribed_at IS NULL
				 ORDER BY created_at DESC
				 LIMIT 1000`,
      )
        .bind(tenantId)
        .all<Subscriber>(),

      DB.prepare(
        `SELECT COUNT(*) as count
				 FROM email_signups
				 WHERE tenant_id = ? AND unsubscribed_at IS NOT NULL`,
      )
        .bind(tenantId)
        .first<CountResult>(),
    ]);

    return {
      subscribers: activeSubscribers.results || [],
      totalActive: activeSubscribers.results?.length || 0,
      totalUnsubscribed: unsubscribedCount?.count || 0,
    };
  } catch (err) {
    console.error("[Subscribers Error]", err);
    throw error(500, "Failed to load subscribers");
  }
};
