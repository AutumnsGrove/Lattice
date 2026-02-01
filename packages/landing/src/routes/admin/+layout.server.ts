import { redirect, error } from "@sveltejs/kit";
import type { LayoutServerLoad } from "./$types";

/**
 * Admin Layout Server
 *
 * Handles authentication once for all /admin/* routes.
 * Child pages can access user data via `await parent()`.
 *
 * Wayfinder-only pages (greenhouse, porch) should check
 * `parentData.isWayfinder` before allowing access.
 */

// The Wayfinder (platform owner) has access to all admin features
const WAYFINDER_EMAIL = "autumn@grove.place";

export const load: LayoutServerLoad = async ({ locals }) => {
  // Auth check - redirect to login if not authenticated
  if (!locals.user) {
    throw redirect(302, "/admin/login");
  }

  // Admin check - only admins can access /admin/*
  if (!locals.user.is_admin) {
    throw error(403, "Admin access required");
  }

  // Determine if user is the Wayfinder (has access to greenhouse, porch, etc.)
  const isWayfinder = locals.user.email.toLowerCase() === WAYFINDER_EMAIL;

  return {
    user: locals.user,
    isWayfinder,
  };
};
