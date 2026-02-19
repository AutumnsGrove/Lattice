import { error, fail, type Actions } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

interface FeedbackRow {
  id: string;
  source: "web" | "email";
  name: string | null;
  email: string | null;
  subject: string | null;
  message: string;
  sentiment: "positive" | "negative" | "neutral" | null;
  ip_address: string | null;
  user_agent: string | null;
  status: "new" | "read" | "archived";
  read_at: number | null;
  archived_at: number | null;
  admin_notes: string | null;
  created_at: number;
  updated_at: number;
}

interface FeedbackStats {
  total: number;
  new_count: number;
  web_count: number;
  email_count: number;
}

export const load: PageServerLoad = async ({ parent, platform }) => {
  // Auth is handled by parent /arbor layout
  const parentData = await parent();

  if (!platform?.env?.DB) {
    throw error(500, "Database not available");
  }

  const { DB } = platform.env;

  // Run queries in parallel
  const [feedbackResult, statsResult] = await Promise.all([
    // Get all feedback ordered by created_at DESC
    DB.prepare("SELECT * FROM feedback ORDER BY created_at DESC")
      .all<FeedbackRow>()
      .catch((err) => {
        console.error("Failed to load feedback:", err);
        return { results: [] };
      }),

    // Get stats
    DB.prepare(
      `
			SELECT
				COUNT(*) as total,
				SUM(CASE WHEN status = 'new' THEN 1 ELSE 0 END) as new_count,
				SUM(CASE WHEN source = 'web' THEN 1 ELSE 0 END) as web_count,
				SUM(CASE WHEN source = 'email' THEN 1 ELSE 0 END) as email_count
			FROM feedback
		`,
    )
      .first<FeedbackStats>()
      .catch((err) => {
        console.error("Failed to load feedback stats:", err);
        return { total: 0, new_count: 0, web_count: 0, email_count: 0 };
      }),
  ]);

  return {
    feedback: feedbackResult.results || [],
    stats: statsResult || {
      total: 0,
      new_count: 0,
      web_count: 0,
      email_count: 0,
    },
    user: parentData.user,
  };
};

export const actions: Actions = {
  markRead: async ({ request, platform, locals }) => {
    if (!locals.user?.is_admin) {
      return fail(403, { error: "Admin access required" });
    }
    if (!platform?.env?.DB) {
      return fail(500, { error: "Database not available" });
    }

    const formData = await request.formData();
    const id = formData.get("id") as string;

    if (!id) {
      return fail(400, { error: "Missing feedback ID" });
    }

    const now = Math.floor(Date.now() / 1000);

    try {
      await platform.env.DB.prepare(
        "UPDATE feedback SET status = ?, read_at = ?, updated_at = ? WHERE id = ?",
      )
        .bind("read", now, now, id)
        .run();

      return { success: true };
    } catch (err) {
      console.error("Failed to mark feedback as read:", err);
      return fail(500, { error: "Failed to update feedback status" });
    }
  },

  archive: async ({ request, platform, locals }) => {
    if (!locals.user?.is_admin) {
      return fail(403, { error: "Admin access required" });
    }
    if (!platform?.env?.DB) {
      return fail(500, { error: "Database not available" });
    }

    const formData = await request.formData();
    const id = formData.get("id") as string;

    if (!id) {
      return fail(400, { error: "Missing feedback ID" });
    }

    const now = Math.floor(Date.now() / 1000);

    try {
      await platform.env.DB.prepare(
        "UPDATE feedback SET status = ?, archived_at = ?, updated_at = ? WHERE id = ?",
      )
        .bind("archived", now, now, id)
        .run();

      return { success: true };
    } catch (err) {
      console.error("Failed to archive feedback:", err);
      return fail(500, { error: "Failed to archive feedback" });
    }
  },

  saveNotes: async ({ request, platform, locals }) => {
    if (!locals.user?.is_admin) {
      return fail(403, { error: "Admin access required" });
    }
    if (!platform?.env?.DB) {
      return fail(500, { error: "Database not available" });
    }

    const formData = await request.formData();
    const id = formData.get("id") as string;
    const notes = (formData.get("notes") as string)?.trim() || null;

    if (!id) {
      return fail(400, { error: "Missing feedback ID" });
    }

    const now = Math.floor(Date.now() / 1000);

    try {
      await platform.env.DB.prepare(
        "UPDATE feedback SET admin_notes = ?, updated_at = ? WHERE id = ?",
      )
        .bind(notes, now, id)
        .run();

      return { success: true };
    } catch (err) {
      console.error("Failed to save notes:", err);
      return fail(500, { error: "Failed to save notes" });
    }
  },
};
