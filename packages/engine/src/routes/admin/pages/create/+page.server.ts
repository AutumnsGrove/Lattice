import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ locals }) => {
  // Auth check - ensure user is logged in
  if (!locals.user) {
    throw redirect(302, "/auth/login");
  }

  // Return empty data (no page to load for creation)
  return {};
};
