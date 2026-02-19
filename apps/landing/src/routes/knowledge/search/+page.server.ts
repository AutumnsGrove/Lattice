import { scanAllDocs } from "$lib/server/docs-scanner";

export const prerender = true;

export async function load() {
  const { allDocs } = scanAllDocs();
  return { allDocs };
}
