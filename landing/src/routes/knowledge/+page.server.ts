import { specs, helpArticles, legalDocs, marketingDocs } from "$lib/data/knowledge-base";

export async function load() {
  return {
    specs,
    helpArticles,
    legalDocs,
    marketingDocs,
  };
}
