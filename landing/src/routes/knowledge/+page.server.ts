import {
  specs,
  helpArticles,
  legalDocs,
  marketingDocs,
  patterns,
  philosophyDocs,
  designDocs,
  developerDocs,
} from "$lib/data/knowledge-base";

export async function load() {
  return {
    specs,
    helpArticles,
    legalDocs,
    marketingDocs,
    patterns,
    philosophyDocs,
    designDocs,
    developerDocs,
  };
}
