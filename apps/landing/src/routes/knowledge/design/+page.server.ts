import { scanDocsCategory } from "$lib/server/docs-scanner";

export const prerender = true;

export async function load() {
  const designDocs = scanDocsCategory("design");
  return {
    designDocs,
  };
}
