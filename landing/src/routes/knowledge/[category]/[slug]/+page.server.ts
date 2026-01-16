import { loadDocBySlug } from "$lib/utils/docs-loader";
import { allDocs } from "$lib/data/knowledge-base";
import type { Doc, DocCategory } from "$lib/types/docs";
import { error } from "@sveltejs/kit";
import type { PageServerLoad, EntryGenerator } from "./$types";

// Prerender all knowledge base articles at build time
// This is required because Cloudflare Workers don't have filesystem access at runtime
// The docs-loader uses Node.js fs APIs which only work during the build process
export const prerender = true;

// Generate entries for all known documents
export const entries: EntryGenerator = () => {
  return allDocs.map((doc) => ({
    category: doc.category,
    slug: doc.slug,
  }));
};

const validCategories: DocCategory[] = [
  "specs",
  "help",
  "legal",
  "marketing",
  "patterns",
  "philosophy",
  "design",
  "developer",
];

export const load: PageServerLoad = async ({ params }) => {
  const { category, slug } = params;

  // Validate category
  if (!validCategories.includes(category as DocCategory)) {
    throw error(404, "Category not found");
  }

  const doc = loadDocBySlug(slug, category as DocCategory);

  if (!doc) {
    throw error(404, "Document not found");
  }

  // Resolve related articles by slug (limit to 3 for clean presentation)
  let relatedArticles: Doc[] = [];
  if (doc.related && doc.related.length > 0) {
    relatedArticles = doc.related
      .slice(0, 3)
      .map((relatedSlug) => allDocs.find((d) => d.slug === relatedSlug))
      .filter((d): d is Doc => d !== undefined);
  }

  return {
    doc,
    relatedArticles,
  };
};
