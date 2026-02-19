import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

interface Visit {
  id: string;
  visit_number: string;
  user_id: string | null;
  guest_email: string | null;
  guest_name: string | null;
  category: string;
  subject: string;
  status: string;
  created_at: number;
  updated_at: number;
  message_count: number;
}

interface Stats {
  open: number;
  pending: number;
  resolved: number;
}

export const load: PageServerLoad = async ({ parent, platform }) => {
  // Auth is handled by parent layout - just check Wayfinder access
  const parentData = await parent();
  if (!parentData.isWayfinder) {
    throw redirect(302, "/arbor");
  }

  let visits: Visit[] = [];
  let stats: Stats = { open: 0, pending: 0, resolved: 0 };

  if (platform?.env?.DB) {
    try {
      // Load visits with message counts
      const result = await platform.env.DB.prepare(
        `SELECT
					v.id, v.visit_number, v.user_id, v.guest_email, v.guest_name,
					v.category, v.subject, v.status, v.created_at, v.updated_at,
					(SELECT COUNT(*) FROM porch_messages WHERE visit_id = v.id) as message_count
				 FROM porch_visits v
				 ORDER BY
					CASE v.status WHEN 'open' THEN 0 WHEN 'pending' THEN 1 ELSE 2 END,
					v.updated_at DESC
				 LIMIT 100`,
      ).all<Visit>();

      visits = result.results || [];

      // Get stats
      const statsResult = await platform.env.DB.prepare(
        `SELECT
					SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open,
					SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
					SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved
				 FROM porch_visits`,
      ).first<Stats>();

      if (statsResult) {
        stats = {
          open: statsResult.open || 0,
          pending: statsResult.pending || 0,
          resolved: statsResult.resolved || 0,
        };
      }
    } catch (err) {
      console.error("Failed to load visits:", err);
    }
  }

  return {
    visits,
    stats,
  };
};
