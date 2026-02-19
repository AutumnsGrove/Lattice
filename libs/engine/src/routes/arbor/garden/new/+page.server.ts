import { loadCurioStatus } from "$lib/server/curio-status";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ platform, locals }) => {
  // Auth is handled by the parent /admin layout
  let curios: Awaited<ReturnType<typeof loadCurioStatus>> = [];

  if (platform?.env?.DB) {
    curios = await loadCurioStatus(platform.env.DB, locals.tenantId);
  }

  return { curios };
};
