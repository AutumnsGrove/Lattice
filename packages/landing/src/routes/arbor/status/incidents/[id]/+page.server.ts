/**
 * Incident Detail Page - View and manage a specific incident
 *
 * Shows full timeline, affected components, allows posting updates
 * and resolving the incident.
 */

import { redirect, fail, error } from "@sveltejs/kit";
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
  created_at: string;
  updated_at: string;
}

interface Update {
  id: string;
  incident_id: string;
  status: string;
  message: string;
  created_at: string;
}

interface AffectedComponent {
  name: string;
  slug: string;
}

const WAYFINDER_EMAILS = ["autumn@grove.place", "autumnbrown23@pm.me"];

export const load: PageServerLoad = async ({ parent, platform, params }) => {
  const parentData = await parent();
  if (!parentData.isWayfinder) {
    throw redirect(302, "/arbor");
  }

  if (!platform?.env?.DB) {
    throw error(500, "Database not available");
  }

  const DB = platform.env.DB;
  const { id } = params;

  const incident = await DB.prepare(
    "SELECT * FROM status_incidents WHERE id = ?",
  )
    .bind(id)
    .first<Incident>();

  if (!incident) {
    throw error(404, "Incident not found");
  }

  const [updatesResult, componentsResult] = await Promise.all([
    DB.prepare(
      `SELECT id, incident_id, status, message, created_at
       FROM status_updates
       WHERE incident_id = ?
       ORDER BY created_at DESC`,
    )
      .bind(id)
      .all<Update>(),
    DB.prepare(
      `SELECT c.name, c.slug
       FROM status_components c
       JOIN status_incident_components ic ON c.id = ic.component_id
       WHERE ic.incident_id = ?`,
    )
      .bind(id)
      .all<AffectedComponent>(),
  ]);

  return {
    incident,
    updates: updatesResult.results || [],
    affectedComponents: componentsResult.results || [],
  };
};

export const actions: Actions = {
  addUpdate: async ({ request, locals, platform, params }) => {
    const user = locals.user;
    if (!user) return fail(403, { error: "Not authenticated" });
    if (!WAYFINDER_EMAILS.includes(user.email.toLowerCase()))
      return fail(403, { error: "Access denied" });

    if (!platform?.env?.DB)
      return fail(500, { error: "Database not available" });
    const DB = platform.env.DB;

    const formData = await request.formData();
    const status = formData.get("status")?.toString();
    const message = formData.get("message")?.toString().trim();

    if (!status || !message) {
      return fail(400, { error: "Status and message are required" });
    }

    try {
      const updateId = `upd_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
      const now = new Date().toISOString();

      await DB.prepare(
        `INSERT INTO status_updates (id, incident_id, status, message, created_at)
         VALUES (?, ?, ?, ?, ?)`,
      )
        .bind(updateId, params.id, status, message, now)
        .run();

      // Update incident status
      await DB.prepare(
        "UPDATE status_incidents SET status = ?, updated_at = ? WHERE id = ?",
      )
        .bind(status, now, params.id)
        .run();

      return { success: true };
    } catch (err) {
      console.error("[Status] Failed to add update:", err);
      return fail(500, { error: "Failed to post update" });
    }
  },

  resolve: async ({ locals, platform, params }) => {
    const user = locals.user;
    if (!user) return fail(403, { error: "Not authenticated" });
    if (!WAYFINDER_EMAILS.includes(user.email.toLowerCase()))
      return fail(403, { error: "Access denied" });

    if (!platform?.env?.DB)
      return fail(500, { error: "Database not available" });
    const DB = platform.env.DB;

    try {
      const now = new Date().toISOString();

      // Resolve the incident
      await DB.prepare(
        "UPDATE status_incidents SET status = 'resolved', resolved_at = ?, updated_at = ? WHERE id = ?",
      )
        .bind(now, now, params.id)
        .run();

      // Add resolution update
      const updateId = `upd_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
      await DB.prepare(
        `INSERT INTO status_updates (id, incident_id, status, message, created_at)
         VALUES (?, ?, 'resolved', 'This incident has been resolved.', ?)`,
      )
        .bind(updateId, params.id, now)
        .run();

      // Reset affected component statuses to operational
      await DB.prepare(
        `UPDATE status_components
         SET current_status = 'operational', updated_at = ?
         WHERE id IN (
           SELECT component_id FROM status_incident_components WHERE incident_id = ?
         )`,
      )
        .bind(now, params.id)
        .run();

      return { success: true, resolved: true };
    } catch (err) {
      console.error("[Status] Failed to resolve incident:", err);
      return fail(500, { error: "Failed to resolve incident" });
    }
  },
};
