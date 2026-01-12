import { philosophyDocs } from "$lib/data/knowledge-base";

export async function load() {
  return {
    philosophyDocs,
  };
}
