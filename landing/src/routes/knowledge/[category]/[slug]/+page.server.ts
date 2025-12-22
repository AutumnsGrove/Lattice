import { loadDocBySlug } from "$lib/utils/docs-loader";
import { allDocs } from "$lib/data/knowledge-base";
import { error } from "@sveltejs/kit";
import type { PageServerLoad, EntryGenerator } from "./$types";

// Prerender all knowledge base articles at build time
// This is required because Cloudflare Workers don't have filesystem access at runtime
export const prerender = true;

// Generate entries for all known documents
export const entries: EntryGenerator = () => {
  return allDocs.map((doc) => ({
    category: doc.category === "help" ? "help" : doc.category === "specs" ? "specs" : "legal",
    slug: doc.slug,
  }));
};

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
