import { scanDocsCategory } from "$lib/server/docs-scanner";
import { specCategories } from "$lib/data/category-metadata";

export const prerender = true;

export async function load() {
  const specs = scanDocsCategory("specs");
  return {
    specs,
    specCategories,
  };
}
