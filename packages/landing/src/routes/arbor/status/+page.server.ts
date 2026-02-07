/**
 * Status Dashboard - Service status management
 *
 * Direct D1 queries to status_incidents, status_components, status_scheduled
 * tables in ENGINE_DB. Wayfinder-only access.
 */

import { redirect, fail } from "@sveltejs/kit";
import type { PageServerLoad, Actions } from "./$types";

interface Incident {
  id: string;
  title: string;
  slug: string;
  status: string;
  impact: string;
  type: string;
  started_at: string;
  resolved_at: string | null;
}

interface Component {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  current_status: string;
  display_order: number;
}

interface ScheduledMaintenance {
  id: string;
  title: string;
  description: string | null;
  scheduled_start: string;
  scheduled_end: string;
  status: string;
}

const WAYFINDER_EMAILS = ["autumn@grove.place", "autumnbrown23@pm.me"];

export const load: PageServerLoad = async ({ parent, platform }) => {
  const parentData = await parent();
  if (!parentData.isWayfinder) {
    throw redirect(302, "/arbor");
  }

  let incidents: Incident[] = [];
  let components: Component[] = [];
  let scheduled: ScheduledMaintenance[] = [];

  if (platform?.env?.DB) {
    const DB = platform.env.DB;

    const [incidentsResult, componentsResult, scheduledResult] =
      await Promise.all([
        DB.prepare(
          `SELECT id, title, slug, status, impact, type, started_at, resolved_at
           FROM status_incidents
           WHERE resolved_at IS NULL
           ORDER BY started_at DESC
           LIMIT 50`,
        )
          .all<Incident>()
          .catch((err) => {
            console.error("[Status] Failed to load incidents:", err);
            return { results: [] as Incident[] };
          }),
        DB.prepare("SELECT * FROM status_components ORDER BY display_order")
          .all<Component>()
          .catch((err) => {
            console.error("[Status] Failed to load components:", err);
            return { results: [] as Component[] };
          }),
        DB.prepare(
          `SELECT * FROM status_scheduled
           WHERE scheduled_start > datetime('now', '-7 days')
           ORDER BY scheduled_start`,
        )
          .all<ScheduledMaintenance>()
          .catch((err) => {
            console.error("[Status] Failed to load scheduled:", err);
            return { results: [] as ScheduledMaintenance[] };
          }),
      ]);

    incidents = incidentsResult.results || [];
    components = componentsResult.results || [];
    scheduled = scheduledResult.results || [];
  }

  const allOperational =
    components.length > 0 &&
    components.every((c) => c.current_status === "operational");

  return {
    incidents,
    components,
    scheduled,
    allOperational,
  };
};

export const actions: Actions = {
  updateComponentStatus: async ({ request, locals, platform }) => {
    const user = locals.user;
    if (!user) return fail(403, { error: "Not authenticated" });
    if (!WAYFINDER_EMAILS.includes(user.email.toLowerCase()))
      return fail(403, { error: "Access denied" });

    if (!platform?.env?.DB)
      return fail(500, { error: "Database not available" });
    const DB = platform.env.DB;

    const formData = await request.formData();
    const slug = formData.get("slug")?.toString();
    const status = formData.get("status")?.toString();

    if (!slug || !status) {
      return fail(400, { error: "Missing slug or status" });
    }

    const validStatuses = [
      "operational",
      "degraded",
      "partial_outage",
      "major_outage",
      "maintenance",
    ];
    if (!validStatuses.includes(status)) {
      return fail(400, { error: "Invalid status" });
    }

    try {
      const now = new Date().toISOString();
      await DB.prepare(
        "UPDATE status_components SET current_status = ?, updated_at = ? WHERE slug = ?",
      )
        .bind(status, now, slug)
        .run();

      return { success: true };
    } catch (err) {
      console.error("[Status] Failed to update component:", err);
      return fail(500, { error: "Failed to update component status" });
    }
  },
};
