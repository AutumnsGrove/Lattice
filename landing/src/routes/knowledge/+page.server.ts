import { specs, helpArticles, legalDocs } from "$lib/data/knowledge-base";

export async function load() {
  return {
    specs,
    helpArticles,
    legalDocs,
  };
}
