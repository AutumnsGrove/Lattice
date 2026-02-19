import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ parent }) => {
  // Auth is handled by the parent /arbor layout
  const parentData = await parent();

  return {
    user: parentData.user,
    isWayfinder: parentData.isWayfinder,
  };
};
