import { redirect } from "@sveltejs/kit";

export async function load({ locals }) {
  // Auth check - ensure user is logged in
  if (!locals.user) {
    throw redirect(302, "/auth/login");
  }

  // Return empty data (no page to load for creation)
  return {};
}
