import type { PageServerLoad } from "./$types";

// Auth is handled by the parent /admin layout - no duplicate check needed here
export const load: PageServerLoad = async () => {
  // Return empty data (no page to load for creation)
  return {};
};
