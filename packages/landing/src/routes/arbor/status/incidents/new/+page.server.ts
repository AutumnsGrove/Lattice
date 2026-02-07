/**
 * New Incident Form - Create a new status incident
 *
 * Loads available components for multi-select, handles incident creation
 * with initial update and component status cascading.
 */

import { redirect, fail } from "@sveltejs/kit";
import type { PageServerLoad, Actions } from "./$types";

interface Component {
  id: string;
  name: string;
  slug: string;
  current_status: string;
}

const WAYFINDER_EMAILS = ["autumn@grove.place", "autumnbrown23@pm.me"];

function slugify(title: string): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") +
    "-" +
    Date.now().toString(36).slice(-6)
  );
}

export const load: PageServerLoad = async ({ parent, platform }) => {
  const parentData = await parent();
  if (!parentData.isWayfinder) {
    throw redirect(302, "/arbor");
  }

  let components: Component[] = [];

  if (platform?.env?.DB) {
    try {
      const result = await platform.env.DB.prepare(
        "SELECT id, name, slug, current_status FROM status_components ORDER BY display_order",
      ).all<Component>();
      components = result.results || [];
    } catch (err) {
      console.error("[Status] Failed to load components:", err);
    }
  }

  return { components };
};

export const actions: Actions = {
  default: async ({ request, locals, platform }) => {
    const user = locals.user;
    if (!user) return fail(403, { error: "Not authenticated" });
    if (!WAYFINDER_EMAILS.includes(user.email.toLowerCase()))
      return fail(403, { error: "Access denied" });

    if (!platform?.env?.DB)
      return fail(500, { error: "Database not available" });
    const DB = platform.env.DB;

    const formData = await request.formData();
    const title = formData.get("title")?.toString().trim();
    const type = formData.get("type")?.toString();
    const impact = formData.get("impact")?.toString();
    const initialStatus = formData.get("status")?.toString();
    const initialMessage = formData.get("message")?.toString().trim();
    const componentIds = formData.getAll("components").map(String);

    if (!title || !type || !impact || !initialStatus || !initialMessage) {
      return fail(400, { error: "All fields are required" });
    }

    if (componentIds.length === 0) {
      return fail(400, { error: "Select at least one affected component" });
    }

    try {
      const incidentId = `inc_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
      const slug = slugify(title);
      const now = new Date().toISOString();

      // Insert incident
      await DB.prepare(
        `INSERT INTO status_incidents (id, title, slug, status, impact, type, started_at, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
        .bind(
          incidentId,
          title,
          slug,
          initialStatus,
          impact,
          type,
          now,
          now,
          now,
        )
        .run();

      // Insert initial update
      const updateId = `upd_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
      await DB.prepare(
        `INSERT INTO status_updates (id, incident_id, status, message, created_at)
         VALUES (?, ?, ?, ?, ?)`,
      )
        .bind(updateId, incidentId, initialStatus, initialMessage, now)
        .run();

      // Link affected components and update their status
      for (const componentId of componentIds) {
        await DB.prepare(
          `INSERT INTO status_incident_components (incident_id, component_id)
           VALUES (?, ?)`,
        )
          .bind(incidentId, componentId)
          .run();

        const componentStatus =
          impact === "critical"
            ? "major_outage"
            : impact === "major"
              ? "partial_outage"
              : "degraded";

        await DB.prepare(
          "UPDATE status_components SET current_status = ?, updated_at = ? WHERE id = ?",
        )
          .bind(componentStatus, now, componentId)
          .run();
      }

      throw redirect(302, `/arbor/status/incidents/${incidentId}`);
    } catch (err) {
      // Re-throw redirects
      if (
        err &&
        typeof err === "object" &&
        "status" in err &&
        (err as any).status === 302
      ) {
        throw err;
      }
      console.error("[Status] Failed to create incident:", err);
      return fail(500, { error: "Failed to create incident" });
    }
  },
};
