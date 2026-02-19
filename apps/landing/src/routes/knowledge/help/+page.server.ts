import { scanDocsCategory } from "$lib/server/docs-scanner";
import { helpSections } from "$lib/data/category-metadata";

export const prerender = true;

export async function load() {
  const helpArticles = scanDocsCategory("help");
  return {
    helpArticles,
    helpSections,
  };
}
