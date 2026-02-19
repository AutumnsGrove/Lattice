import { scanDocsCategory } from "$lib/server/docs-scanner";

export const prerender = true;

export async function load() {
  const patterns = scanDocsCategory("patterns");
  return {
    patterns,
  };
}
