import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { isWayfinder } from "@autumnsgrove/lattice/config";

export const load: PageServerLoad = async ({ parent }) => {
  const parentData = await parent();
  if (!parentData.isWayfinder) {
    throw redirect(302, "/arbor");
  }

  // Data is fetched client-side via the API endpoint
  return {};
};
