import { loadDocBySlug } from "$lib/utils/docs-loader";
import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params }) => {
  const { category, slug } = params;

  // Validate category
  if (!["specs", "help", "legal"].includes(category)) {
    throw error(404, "Category not found");
  }

  const doc = loadDocBySlug(slug, category as "specs" | "help" | "legal");

  if (!doc) {
    throw error(404, "Document not found");
  }

  return {
    doc,
  };
};
