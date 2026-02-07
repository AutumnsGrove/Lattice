import { error } from "@sveltejs/kit";
import { ARBOR_ERRORS, throwGroveError } from "$lib/errors";
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
  // Auth is handled by the parent /admin layout - no duplicate check needed here

  if (!platform?.env?.DB) {
    throwGroveError(500, ARBOR_ERRORS.DB_NOT_AVAILABLE, "Arbor");
  }

  const tenantId = locals.tenantId;
  if (!tenantId) {
    throwGroveError(400, ARBOR_ERRORS.TENANT_CONTEXT_REQUIRED, "Arbor");
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
    throwGroveError(500, ARBOR_ERRORS.LOAD_FAILED, "Arbor", { cause: err });
  }
};
